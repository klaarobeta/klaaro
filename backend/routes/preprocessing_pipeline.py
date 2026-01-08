import os
import uuid
import json
import pickle
import pandas as pd
import numpy as np
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, MinMaxScaler, LabelEncoder, OneHotEncoder
from sklearn.impute import SimpleImputer

router = APIRouter()

# Will be set from server.py
db = None

UPLOAD_DIR = "/app/backend/uploads"
PROCESSED_DIR = "/app/backend/processed"

# Ensure processed directory exists
os.makedirs(PROCESSED_DIR, exist_ok=True)

# ==================== MODELS ====================

class ImputationConfig(BaseModel):
    strategy: str = "mean"  # mean, median, most_frequent, constant
    fill_value: Optional[Any] = None

class EncodingConfig(BaseModel):
    method: str = "onehot"  # onehot, label, ordinal
    drop_first: bool = False

class ScalingConfig(BaseModel):
    method: str = "standard"  # standard, minmax, none
    
class SplitConfig(BaseModel):
    test_size: float = Field(0.2, ge=0.1, le=0.5)
    validation_size: float = Field(0.0, ge=0.0, le=0.3)
    random_state: int = 42
    stratify: bool = False

class ColumnConfig(BaseModel):
    name: str
    role: str = "feature"  # feature, target, drop
    imputation: Optional[ImputationConfig] = None
    encoding: Optional[EncodingConfig] = None
    scaling: Optional[ScalingConfig] = None

class PreprocessingConfig(BaseModel):
    columns: List[ColumnConfig]
    split: SplitConfig = SplitConfig()
    remove_duplicates: bool = True
    handle_outliers: bool = False
    outlier_method: str = "clip"  # clip, remove

class PreprocessingRequest(BaseModel):
    project_id: str
    config: PreprocessingConfig

class AutoPreprocessRequest(BaseModel):
    project_id: str
    test_size: float = 0.2
    validation_size: float = 0.0

# ==================== HELPER FUNCTIONS ====================

def generate_auto_config(analysis_results: Dict, target_column: str) -> PreprocessingConfig:
    """Generate automatic preprocessing configuration based on analysis results"""
    columns_config = []
    column_analysis = analysis_results.get("column_analysis", [])
    
    for col in column_analysis:
        col_name = col["name"]
        semantic_type = col["semantic_type"]
        missing_pct = col["missing_pct"]
        
        # Determine role
        if col_name == target_column:
            role = "target"
        elif col_name.lower() in ["id", "index", "row_id", "record_id"]:
            role = "drop"
        else:
            role = "feature"
        
        # Configure imputation for columns with missing values
        imputation = None
        if missing_pct > 0:
            if semantic_type == "numeric":
                imputation = ImputationConfig(strategy="median")
            else:
                imputation = ImputationConfig(strategy="most_frequent")
        
        # Configure encoding for categorical columns
        encoding = None
        if semantic_type == "categorical" and role == "feature":
            unique_count = col.get("unique_count", 0)
            if unique_count <= 10:
                encoding = EncodingConfig(method="onehot", drop_first=True)
            else:
                encoding = EncodingConfig(method="label")
        
        # Configure scaling for numeric columns
        scaling = None
        if semantic_type == "numeric" and role == "feature":
            scaling = ScalingConfig(method="standard")
        
        columns_config.append(ColumnConfig(
            name=col_name,
            role=role,
            imputation=imputation,
            encoding=encoding,
            scaling=scaling
        ))
    
    return PreprocessingConfig(
        columns=columns_config,
        split=SplitConfig(test_size=0.2, validation_size=0.0, random_state=42),
        remove_duplicates=True,
        handle_outliers=False
    )

def apply_preprocessing(df: pd.DataFrame, config: PreprocessingConfig, fit: bool = True) -> Dict[str, Any]:
    """Apply preprocessing transformations to the dataframe"""
    
    result = {
        "X_train": None,
        "X_test": None,
        "X_val": None,
        "y_train": None,
        "y_test": None,
        "y_val": None,
        "feature_names": [],
        "transformers": {},
        "stats": {}
    }
    
    df_processed = df.copy()
    transformers = {}
    
    # Remove duplicates
    if config.remove_duplicates:
        initial_rows = len(df_processed)
        df_processed = df_processed.drop_duplicates()
        result["stats"]["duplicates_removed"] = initial_rows - len(df_processed)
    
    # Identify columns by role
    target_col = None
    feature_cols = []
    drop_cols = []
    
    for col_config in config.columns:
        if col_config.role == "target":
            target_col = col_config.name
        elif col_config.role == "feature":
            feature_cols.append(col_config.name)
        elif col_config.role == "drop":
            drop_cols.append(col_config.name)
    
    # Drop columns
    df_processed = df_processed.drop(columns=[c for c in drop_cols if c in df_processed.columns], errors='ignore')
    
    # Separate features and target
    if target_col and target_col in df_processed.columns:
        y = df_processed[target_col].copy()
        X = df_processed.drop(columns=[target_col])
    else:
        y = None
        X = df_processed
    
    # Apply column-specific transformations
    for col_config in config.columns:
        if col_config.name not in X.columns:
            continue
        
        col_name = col_config.name
        
        # Imputation
        if col_config.imputation and X[col_name].isna().any():
            imputer = SimpleImputer(
                strategy=col_config.imputation.strategy,
                fill_value=col_config.imputation.fill_value
            )
            X[col_name] = imputer.fit_transform(X[[col_name]]).ravel()
            transformers[f"imputer_{col_name}"] = imputer
    
    # Handle categorical encoding
    encoded_dfs = []
    cols_to_drop = []
    
    for col_config in config.columns:
        if col_config.name not in X.columns:
            continue
        if col_config.encoding is None:
            continue
            
        col_name = col_config.name
        
        if col_config.encoding.method == "onehot":
            # One-hot encoding
            dummies = pd.get_dummies(
                X[col_name], 
                prefix=col_name,
                drop_first=col_config.encoding.drop_first
            )
            encoded_dfs.append(dummies)
            cols_to_drop.append(col_name)
            transformers[f"onehot_{col_name}"] = {"columns": list(dummies.columns)}
            
        elif col_config.encoding.method == "label":
            # Label encoding
            le = LabelEncoder()
            X[col_name] = le.fit_transform(X[col_name].astype(str))
            transformers[f"label_{col_name}"] = le
    
    # Drop original categorical columns and add encoded
    X = X.drop(columns=cols_to_drop, errors='ignore')
    if encoded_dfs:
        X = pd.concat([X] + encoded_dfs, axis=1)
    
    # Apply scaling to numeric columns
    for col_config in config.columns:
        if col_config.name not in X.columns:
            continue
        if col_config.scaling is None or col_config.scaling.method == "none":
            continue
            
        col_name = col_config.name
        
        if col_config.scaling.method == "standard":
            scaler = StandardScaler()
            X[col_name] = scaler.fit_transform(X[[col_name]])
            transformers[f"scaler_{col_name}"] = scaler
            
        elif col_config.scaling.method == "minmax":
            scaler = MinMaxScaler()
            X[col_name] = scaler.fit_transform(X[[col_name]])
            transformers[f"scaler_{col_name}"] = scaler
    
    result["feature_names"] = list(X.columns)
    result["transformers"] = transformers
    
    # Train/test/validation split
    if y is not None:
        stratify_col = y if config.split.stratify and y.nunique() < 50 else None
        
        X_temp, X_test, y_temp, y_test = train_test_split(
            X, y,
            test_size=config.split.test_size,
            random_state=config.split.random_state,
            stratify=stratify_col
        )
        
        if config.split.validation_size > 0:
            val_ratio = config.split.validation_size / (1 - config.split.test_size)
            stratify_temp = y_temp if config.split.stratify and y_temp.nunique() < 50 else None
            
            X_train, X_val, y_train, y_val = train_test_split(
                X_temp, y_temp,
                test_size=val_ratio,
                random_state=config.split.random_state,
                stratify=stratify_temp
            )
            result["X_val"] = X_val
            result["y_val"] = y_val
        else:
            X_train, y_train = X_temp, y_temp
        
        result["X_train"] = X_train
        result["X_test"] = X_test
        result["y_train"] = y_train
        result["y_test"] = y_test
    else:
        result["X_train"] = X
    
    # Calculate stats
    result["stats"]["total_features"] = len(result["feature_names"])
    result["stats"]["train_samples"] = len(result["X_train"]) if result["X_train"] is not None else 0
    result["stats"]["test_samples"] = len(result["X_test"]) if result["X_test"] is not None else 0
    result["stats"]["val_samples"] = len(result["X_val"]) if result["X_val"] is not None else 0
    
    return result

# ==================== API ENDPOINTS ====================

@router.post("/auto")
async def auto_preprocess(request: AutoPreprocessRequest, background_tasks: BackgroundTasks):
    """Automatically preprocess dataset based on analysis results"""
    
    # Get project
    project = await db.projects.find_one({"id": request.project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if not project.get("analysis_results"):
        raise HTTPException(status_code=400, detail="Project must be analyzed first")
    
    if not project.get("target_column"):
        raise HTTPException(status_code=400, detail="Target column must be selected first")
    
    # Generate auto config
    config = generate_auto_config(
        project["analysis_results"],
        project["target_column"]
    )
    config.split.test_size = request.test_size
    config.split.validation_size = request.validation_size
    
    # Update status
    await db.projects.update_one(
        {"id": request.project_id},
        {"$set": {"status": "preprocessing", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Run preprocessing in background
    background_tasks.add_task(run_preprocessing, request.project_id, config)
    
    return {
        "message": "Preprocessing started",
        "project_id": request.project_id,
        "config": config.dict()
    }

@router.post("/custom")
async def custom_preprocess(request: PreprocessingRequest, background_tasks: BackgroundTasks):
    """Apply custom preprocessing configuration"""
    
    # Get project
    project = await db.projects.find_one({"id": request.project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if not project.get("dataset_id"):
        raise HTTPException(status_code=400, detail="No dataset linked to project")
    
    # Update status
    await db.projects.update_one(
        {"id": request.project_id},
        {"$set": {"status": "preprocessing", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Run preprocessing in background
    background_tasks.add_task(run_preprocessing, request.project_id, request.config)
    
    return {
        "message": "Preprocessing started",
        "project_id": request.project_id,
        "config": request.config.dict()
    }

async def run_preprocessing(project_id: str, config: PreprocessingConfig):
    """Background task to run preprocessing"""
    try:
        # Get project and dataset
        project = await db.projects.find_one({"id": project_id})
        dataset = await db.datasets.find_one({"id": project["dataset_id"]})
        
        # Load dataset
        file_path = os.path.join(UPLOAD_DIR, dataset["stored_filename"])
        
        if dataset["category"] == "csv":
            df = pd.read_csv(file_path)
        elif dataset["category"] == "json":
            df = pd.read_json(file_path)
        else:
            raise ValueError(f"Unsupported file type: {dataset['category']}")
        
        # Apply preprocessing
        result = apply_preprocessing(df, config)
        
        # Save processed data
        processed_id = str(uuid.uuid4())
        processed_path = os.path.join(PROCESSED_DIR, f"{processed_id}.pkl")
        
        with open(processed_path, 'wb') as f:
            pickle.dump({
                "X_train": result["X_train"],
                "X_test": result["X_test"],
                "X_val": result["X_val"],
                "y_train": result["y_train"],
                "y_test": result["y_test"],
                "y_val": result["y_val"],
                "feature_names": result["feature_names"],
                "transformers": result["transformers"]
            }, f)
        
        # Build preprocessing results
        preprocessing_results = {
            "processed_at": datetime.now(timezone.utc).isoformat(),
            "processed_id": processed_id,
            "processed_path": processed_path,
            "config": config.dict(),
            "stats": result["stats"],
            "feature_names": result["feature_names"],
            "sample_data": {
                "X_train_shape": list(result["X_train"].shape) if result["X_train"] is not None else None,
                "X_test_shape": list(result["X_test"].shape) if result["X_test"] is not None else None,
                "X_val_shape": list(result["X_val"].shape) if result["X_val"] is not None else None,
                "X_train_preview": {str(k): {str(kk): vv for kk, vv in v.items()} for k, v in result["X_train"].head(5).to_dict().items()} if result["X_train"] is not None else None
            }
        }
        
        # Update project
        await db.projects.update_one(
            {"id": project_id},
            {
                "$set": {
                    "status": "preprocessed",
                    "preprocessing_config": config.dict(),
                    "preprocessing_results": preprocessing_results,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
    except Exception as e:
        await db.projects.update_one(
            {"id": project_id},
            {
                "$set": {
                    "status": "preprocessing_failed",
                    "preprocessing_results": {"error": str(e)},
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )

@router.get("/{project_id}/config")
async def get_preprocessing_config(project_id: str):
    """Get preprocessing configuration for a project"""
    
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # If no config exists, generate auto config
    if not project.get("preprocessing_config"):
        if project.get("analysis_results") and project.get("target_column"):
            config = generate_auto_config(
                project["analysis_results"],
                project["target_column"]
            )
            return {"project_id": project_id, "config": config.dict(), "source": "auto"}
        else:
            raise HTTPException(status_code=400, detail="Project must be analyzed with target column selected")
    
    return {
        "project_id": project_id,
        "config": project["preprocessing_config"],
        "source": "saved"
    }

@router.get("/{project_id}/results")
async def get_preprocessing_results(project_id: str):
    """Get preprocessing results for a project"""
    
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if not project.get("preprocessing_results"):
        raise HTTPException(status_code=404, detail="No preprocessing results available")
    
    return {
        "project_id": project_id,
        "status": project["status"],
        "results": project["preprocessing_results"]
    }

@router.get("/{project_id}/preview")
async def preview_preprocessing(project_id: str, rows: int = 10):
    """Preview preprocessed data"""
    
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if not project.get("preprocessing_results") or not project["preprocessing_results"].get("processed_path"):
        raise HTTPException(status_code=404, detail="No processed data available")
    
    # Load processed data
    processed_path = project["preprocessing_results"]["processed_path"]
    
    try:
        with open(processed_path, 'rb') as f:
            data = pickle.load(f)
        
        preview = {
            "feature_names": data["feature_names"],
            "X_train_preview": data["X_train"].head(rows).to_dict() if data["X_train"] is not None else None,
            "y_train_preview": data["y_train"].head(rows).tolist() if data["y_train"] is not None else None,
            "shapes": {
                "X_train": list(data["X_train"].shape) if data["X_train"] is not None else None,
                "X_test": list(data["X_test"].shape) if data["X_test"] is not None else None,
                "y_train": len(data["y_train"]) if data["y_train"] is not None else None,
                "y_test": len(data["y_test"]) if data["y_test"] is not None else None
            }
        }
        
        return preview
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading processed data: {str(e)}")
