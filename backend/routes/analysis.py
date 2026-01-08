import os
import uuid
import json
import pandas as pd
import numpy as np
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel

router = APIRouter()

# Will be set from server.py
db = None

UPLOAD_DIR = "/app/backend/uploads"

# ==================== MODELS ====================

class AnalysisRequest(BaseModel):
    project_id: str

class AnalysisResult(BaseModel):
    task_type: str
    confidence: float
    data_quality_score: float
    total_rows: int
    total_columns: int
    column_analysis: List[Dict]
    issues: List[Dict]
    suggestions: List[Dict]
    target_candidates: List[Dict]

# ==================== HELPER FUNCTIONS ====================

def detect_column_type(series: pd.Series) -> Dict[str, Any]:
    """Analyze a single column and return its characteristics"""
    non_null = series.dropna()
    total = len(series)
    missing = series.isna().sum()
    missing_pct = (missing / total) * 100 if total > 0 else 0
    
    result = {
        "name": series.name,
        "dtype": str(series.dtype),
        "missing_count": int(missing),
        "missing_pct": round(missing_pct, 2),
        "unique_count": int(non_null.nunique()),
        "unique_pct": round((non_null.nunique() / len(non_null)) * 100, 2) if len(non_null) > 0 else 0,
    }
    
    # Determine semantic type
    if pd.api.types.is_numeric_dtype(series):
        result["semantic_type"] = "numeric"
        result["min"] = float(non_null.min()) if len(non_null) > 0 else None
        result["max"] = float(non_null.max()) if len(non_null) > 0 else None
        result["mean"] = float(non_null.mean()) if len(non_null) > 0 else None
        result["std"] = float(non_null.std()) if len(non_null) > 0 else None
        result["median"] = float(non_null.median()) if len(non_null) > 0 else None
        
        # Check for outliers using IQR
        if len(non_null) > 4:
            q1 = non_null.quantile(0.25)
            q3 = non_null.quantile(0.75)
            iqr = q3 - q1
            outliers = ((non_null < (q1 - 1.5 * iqr)) | (non_null > (q3 + 1.5 * iqr))).sum()
            result["outlier_count"] = int(outliers)
            result["outlier_pct"] = round((outliers / len(non_null)) * 100, 2)
        else:
            result["outlier_count"] = 0
            result["outlier_pct"] = 0
            
    elif pd.api.types.is_datetime64_any_dtype(series):
        result["semantic_type"] = "datetime"
        result["min"] = str(non_null.min()) if len(non_null) > 0 else None
        result["max"] = str(non_null.max()) if len(non_null) > 0 else None
        
    else:
        # Categorical or text
        unique_ratio = non_null.nunique() / len(non_null) if len(non_null) > 0 else 0
        
        if unique_ratio < 0.05 or non_null.nunique() <= 20:
            result["semantic_type"] = "categorical"
            # Get value counts
            value_counts = non_null.value_counts().head(10).to_dict()
            result["top_values"] = {str(k): int(v) for k, v in value_counts.items()}
        else:
            result["semantic_type"] = "text"
            # Calculate average text length
            if non_null.dtype == object:
                lengths = non_null.astype(str).str.len()
                result["avg_length"] = float(lengths.mean())
                result["max_length"] = int(lengths.max())
    
    return result

def detect_task_type(df: pd.DataFrame, description: str = "") -> Dict[str, Any]:
    """Auto-detect the ML task type based on data characteristics and description"""
    
    description_lower = description.lower()
    
    # Keywords for task detection from description
    classification_keywords = ["classify", "classification", "predict if", "spam", "fraud", "churn", "category", "class", "label", "yes/no", "true/false", "binary"]
    regression_keywords = ["predict", "price", "amount", "value", "forecast", "regression", "continuous", "how much", "estimate"]
    clustering_keywords = ["segment", "cluster", "group", "similar", "pattern", "anomaly", "outlier"]
    
    # Score each task type
    scores = {"classification": 0, "regression": 0, "clustering": 0}
    
    # Check description
    for keyword in classification_keywords:
        if keyword in description_lower:
            scores["classification"] += 2
    for keyword in regression_keywords:
        if keyword in description_lower:
            scores["regression"] += 2
    for keyword in clustering_keywords:
        if keyword in description_lower:
            scores["clustering"] += 2
    
    # Analyze potential target columns (last column or columns with specific patterns)
    target_candidates = []
    
    for col in df.columns:
        col_lower = col.lower()
        series = df[col]
        unique_count = series.nunique()
        unique_ratio = unique_count / len(series) if len(series) > 0 else 0
        
        candidate = {
            "column": col,
            "unique_values": unique_count,
            "score": 0,
            "suggested_task": None
        }
        
        # Check column name patterns
        if any(x in col_lower for x in ["target", "label", "class", "output", "y", "result"]):
            candidate["score"] += 3
        
        # Binary columns suggest classification
        if unique_count == 2:
            candidate["score"] += 2
            candidate["suggested_task"] = "classification"
            scores["classification"] += 1
            
        # Low cardinality categorical suggests classification
        elif unique_count <= 10 and not pd.api.types.is_numeric_dtype(series):
            candidate["score"] += 1
            candidate["suggested_task"] = "classification"
            scores["classification"] += 0.5
            
        # Continuous numeric with high cardinality suggests regression
        elif pd.api.types.is_numeric_dtype(series) and unique_ratio > 0.5:
            candidate["score"] += 1
            candidate["suggested_task"] = "regression"
            scores["regression"] += 0.5
        
        if candidate["score"] > 0:
            target_candidates.append(candidate)
    
    # Sort candidates by score
    target_candidates.sort(key=lambda x: x["score"], reverse=True)
    
    # Determine final task type
    if scores["classification"] >= scores["regression"] and scores["classification"] >= scores["clustering"]:
        task_type = "classification"
    elif scores["regression"] >= scores["clustering"]:
        task_type = "regression"
    else:
        task_type = "clustering"
    
    # Calculate confidence
    total_score = sum(scores.values())
    confidence = scores[task_type] / total_score if total_score > 0 else 0.33
    confidence = min(0.95, max(0.3, confidence))
    
    return {
        "task_type": task_type,
        "confidence": round(confidence, 2),
        "scores": scores,
        "target_candidates": target_candidates[:5]  # Top 5 candidates
    }

def calculate_quality_score(df: pd.DataFrame, column_analysis: List[Dict]) -> float:
    """Calculate overall data quality score (0-100)"""
    scores = []
    
    # Completeness score (based on missing values)
    total_missing = sum(c["missing_pct"] for c in column_analysis)
    avg_missing = total_missing / len(column_analysis) if column_analysis else 0
    completeness = max(0, 100 - avg_missing)
    scores.append(completeness * 0.3)  # 30% weight
    
    # Validity score (based on data types and outliers)
    numeric_cols = [c for c in column_analysis if c["semantic_type"] == "numeric"]
    if numeric_cols:
        avg_outliers = sum(c.get("outlier_pct", 0) for c in numeric_cols) / len(numeric_cols)
        validity = max(0, 100 - avg_outliers * 2)
    else:
        validity = 100
    scores.append(validity * 0.25)  # 25% weight
    
    # Uniqueness score (check for potential duplicates)
    duplicate_ratio = df.duplicated().sum() / len(df) if len(df) > 0 else 0
    uniqueness = max(0, 100 - duplicate_ratio * 100)
    scores.append(uniqueness * 0.2)  # 20% weight
    
    # Consistency score (based on data type consistency)
    consistency = 100  # Start with perfect score
    for col in column_analysis:
        if col["semantic_type"] == "text" and col["unique_pct"] > 90:
            consistency -= 5  # High cardinality text might be inconsistent
    consistency = max(0, consistency)
    scores.append(consistency * 0.15)  # 15% weight
    
    # Size adequacy (based on row count for ML)
    row_count = len(df)
    if row_count >= 10000:
        size_score = 100
    elif row_count >= 1000:
        size_score = 80
    elif row_count >= 100:
        size_score = 60
    else:
        size_score = 40
    scores.append(size_score * 0.1)  # 10% weight
    
    return round(sum(scores), 1)

def generate_issues(df: pd.DataFrame, column_analysis: List[Dict]) -> List[Dict]:
    """Generate list of data issues"""
    issues = []
    
    # Check for high missing values
    for col in column_analysis:
        if col["missing_pct"] > 50:
            issues.append({
                "type": "high_missing",
                "severity": "high",
                "column": col["name"],
                "message": f"Column '{col['name']}' has {col['missing_pct']}% missing values",
                "suggestion": "Consider dropping this column or using advanced imputation"
            })
        elif col["missing_pct"] > 20:
            issues.append({
                "type": "moderate_missing",
                "severity": "medium",
                "column": col["name"],
                "message": f"Column '{col['name']}' has {col['missing_pct']}% missing values",
                "suggestion": "Apply imputation (mean/median for numeric, mode for categorical)"
            })
    
    # Check for outliers
    for col in column_analysis:
        if col["semantic_type"] == "numeric" and col.get("outlier_pct", 0) > 10:
            issues.append({
                "type": "outliers",
                "severity": "medium",
                "column": col["name"],
                "message": f"Column '{col['name']}' has {col['outlier_pct']}% outliers",
                "suggestion": "Consider capping, removing, or transforming outliers"
            })
    
    # Check for high cardinality categorical
    for col in column_analysis:
        if col["semantic_type"] == "categorical" and col["unique_count"] > 100:
            issues.append({
                "type": "high_cardinality",
                "severity": "low",
                "column": col["name"],
                "message": f"Column '{col['name']}' has {col['unique_count']} unique categories",
                "suggestion": "Consider grouping rare categories or using target encoding"
            })
    
    # Check for constant columns
    for col in column_analysis:
        if col["unique_count"] == 1:
            issues.append({
                "type": "constant",
                "severity": "high",
                "column": col["name"],
                "message": f"Column '{col['name']}' has only one value",
                "suggestion": "Remove this column as it provides no information"
            })
    
    # Check dataset size
    if len(df) < 100:
        issues.append({
            "type": "small_dataset",
            "severity": "high",
            "column": None,
            "message": f"Dataset has only {len(df)} rows",
            "suggestion": "Consider collecting more data or using data augmentation"
        })
    elif len(df) < 1000:
        issues.append({
            "type": "moderate_dataset",
            "severity": "medium",
            "column": None,
            "message": f"Dataset has {len(df)} rows which may be insufficient for complex models",
            "suggestion": "Simple models like Logistic Regression or Decision Trees recommended"
        })
    
    # Check for duplicates
    dup_count = df.duplicated().sum()
    if dup_count > 0:
        dup_pct = round((dup_count / len(df)) * 100, 1)
        issues.append({
            "type": "duplicates",
            "severity": "medium" if dup_pct > 5 else "low",
            "column": None,
            "message": f"Dataset has {dup_count} duplicate rows ({dup_pct}%)",
            "suggestion": "Consider removing duplicate rows"
        })
    
    return issues

def generate_suggestions(df: pd.DataFrame, column_analysis: List[Dict], task_type: str, issues: List[Dict]) -> List[Dict]:
    """Generate actionable suggestions for data improvement"""
    suggestions = []
    
    # Preprocessing suggestions based on data types
    numeric_cols = [c for c in column_analysis if c["semantic_type"] == "numeric"]
    categorical_cols = [c for c in column_analysis if c["semantic_type"] == "categorical"]
    
    if numeric_cols:
        suggestions.append({
            "type": "normalization",
            "priority": "recommended",
            "title": "Normalize numeric features",
            "description": f"Apply StandardScaler or MinMaxScaler to {len(numeric_cols)} numeric columns for better model performance",
            "columns": [c["name"] for c in numeric_cols]
        })
    
    if categorical_cols:
        suggestions.append({
            "type": "encoding",
            "priority": "required",
            "title": "Encode categorical features",
            "description": f"Apply One-Hot or Label encoding to {len(categorical_cols)} categorical columns",
            "columns": [c["name"] for c in categorical_cols]
        })
    
    # Task-specific suggestions
    if task_type == "classification":
        suggestions.append({
            "type": "class_balance",
            "priority": "recommended",
            "title": "Check class balance",
            "description": "Verify target classes are balanced. Apply SMOTE or class weights if imbalanced",
            "columns": []
        })
    elif task_type == "regression":
        suggestions.append({
            "type": "target_distribution",
            "priority": "recommended",
            "title": "Check target distribution",
            "description": "Consider log-transform if target is skewed for better model performance",
            "columns": []
        })
    
    # Missing value suggestions
    cols_with_missing = [c["name"] for c in column_analysis if c["missing_pct"] > 0]
    if cols_with_missing:
        suggestions.append({
            "type": "imputation",
            "priority": "required",
            "title": "Handle missing values",
            "description": f"{len(cols_with_missing)} columns have missing values that need imputation",
            "columns": cols_with_missing
        })
    
    # Feature engineering suggestions
    datetime_cols = [c for c in column_analysis if c["semantic_type"] == "datetime"]
    if datetime_cols:
        suggestions.append({
            "type": "feature_engineering",
            "priority": "optional",
            "title": "Extract datetime features",
            "description": "Extract year, month, day, weekday from datetime columns",
            "columns": [c["name"] for c in datetime_cols]
        })
    
    # Data quantity suggestions
    if len(df) < 1000:
        suggestions.append({
            "type": "data_collection",
            "priority": "recommended",
            "title": "Collect more data",
            "description": f"Current dataset has {len(df)} rows. More data would improve model reliability",
            "columns": []
        })
    
    return suggestions

# ==================== API ENDPOINTS ====================

@router.post("/analyze")
async def analyze_dataset(request: AnalysisRequest, background_tasks: BackgroundTasks):
    """Start dataset analysis for a project"""
    
    # Get project
    project = await db.projects.find_one({"id": request.project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if not project.get("dataset_id"):
        raise HTTPException(status_code=400, detail="No dataset linked to this project")
    
    # Get dataset
    dataset = await db.datasets.find_one({"id": project["dataset_id"]})
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    # Update status to analyzing
    await db.projects.update_one(
        {"id": request.project_id},
        {"$set": {"status": "analyzing", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Run analysis in background
    background_tasks.add_task(run_analysis, request.project_id, dataset, project.get("description", ""))
    
    return {"message": "Analysis started", "project_id": request.project_id}

async def run_analysis(project_id: str, dataset: Dict, description: str):
    """Background task to run the actual analysis"""
    try:
        # Load the dataset
        file_path = os.path.join(UPLOAD_DIR, dataset["stored_filename"])
        
        if dataset["category"] == "csv":
            df = pd.read_csv(file_path)
        elif dataset["category"] == "json":
            df = pd.read_json(file_path)
        else:
            raise ValueError(f"Unsupported file type: {dataset['category']}")
        
        # Analyze columns
        column_analysis = []
        for col in df.columns:
            col_info = detect_column_type(df[col])
            column_analysis.append(col_info)
        
        # Detect task type
        task_detection = detect_task_type(df, description)
        
        # Calculate quality score
        quality_score = calculate_quality_score(df, column_analysis)
        
        # Generate issues
        issues = generate_issues(df, column_analysis)
        
        # Generate suggestions
        suggestions = generate_suggestions(df, column_analysis, task_detection["task_type"], issues)
        
        # Build analysis result
        analysis_result = {
            "analyzed_at": datetime.now(timezone.utc).isoformat(),
            "task_type": task_detection["task_type"],
            "task_confidence": task_detection["confidence"],
            "data_quality_score": quality_score,
            "total_rows": len(df),
            "total_columns": len(df.columns),
            "column_analysis": column_analysis,
            "target_candidates": task_detection["target_candidates"],
            "issues": issues,
            "suggestions": suggestions,
            "issue_summary": {
                "high": len([i for i in issues if i["severity"] == "high"]),
                "medium": len([i for i in issues if i["severity"] == "medium"]),
                "low": len([i for i in issues if i["severity"] == "low"])
            }
        }
        
        # Update project with results
        await db.projects.update_one(
            {"id": project_id},
            {
                "$set": {
                    "status": "analyzed",
                    "task_type": task_detection["task_type"],
                    "analysis_results": analysis_result,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
    except Exception as e:
        # Update project with error
        await db.projects.update_one(
            {"id": project_id},
            {
                "$set": {
                    "status": "analysis_failed",
                    "analysis_results": {"error": str(e)},
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )

@router.get("/{project_id}/analysis")
async def get_analysis_results(project_id: str):
    """Get analysis results for a project"""
    
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if not project.get("analysis_results"):
        raise HTTPException(status_code=404, detail="No analysis results available")
    
    return {
        "project_id": project_id,
        "status": project["status"],
        "task_type": project.get("task_type"),
        "analysis": project["analysis_results"]
    }

@router.post("/{project_id}/set-target")
async def set_target_column(project_id: str, target_column: str):
    """Set the target column for a project"""
    
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Verify column exists in analysis
    if project.get("analysis_results"):
        columns = [c["name"] for c in project["analysis_results"].get("column_analysis", [])]
        if target_column not in columns:
            raise HTTPException(status_code=400, detail=f"Column '{target_column}' not found in dataset")
    
    await db.projects.update_one(
        {"id": project_id},
        {
            "$set": {
                "target_column": target_column,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"message": "Target column set", "target_column": target_column}
