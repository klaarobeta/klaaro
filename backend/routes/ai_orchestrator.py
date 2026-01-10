"""
AI Orchestrator - Coordinates AI-powered AutoML workflow using Claude
Handles: Data analysis, preprocessing suggestions, model generation
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np
import json
import os
import pickle
from datetime import datetime, timezone
import anthropic

router = APIRouter()

# Database will be set from server.py
db = None

# Get Emergent LLM key
EMERGENT_KEY = os.environ.get('EMERGENT_LLM_KEY', 'sk-emergent-59a1cA994F1B401B0E')

# Initialize Anthropic client
client = anthropic.Anthropic(api_key=EMERGENT_KEY)

class DataAnalysisRequest(BaseModel):
    project_id: str
    user_prompt: str

class PreprocessingSuggestionRequest(BaseModel):
    project_id: str
    analysis_result: Dict[str, Any]

class ModelGenerationRequest(BaseModel):
    project_id: str
    user_requirements: str
    approved_preprocessing: Dict[str, Any]

class ApprovalRequest(BaseModel):
    project_id: str
    step: str  # 'analysis', 'preprocessing', 'model'
    approved: bool
    feedback: Optional[str] = None


# ============ STEP 1: AI DATA ANALYSIS ============

@router.post("/analyze-data")
async def analyze_data_with_ai(request: DataAnalysisRequest):
    """
    Claude analyzes the uploaded dataset and suggests preprocessing
    """
    project = await db.projects.find_one({"id": request.project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if not project.get("dataset_id"):
        raise HTTPException(status_code=400, detail="No dataset linked to project")
    
    # Get dataset
    dataset = await db.datasets.find_one({"id": project["dataset_id"]}, {"_id": 0})
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    # Load dataset for analysis
    dataset_path = dataset["path"]
    df = pd.read_csv(dataset_path)
    
    # Prepare data summary for Claude
    data_summary = {
        "shape": df.shape,
        "columns": list(df.columns),
        "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
        "missing_values": df.isnull().sum().to_dict(),
        "numeric_stats": df.describe().to_dict(),
        "sample_data": df.head(5).to_dict('records')
    }
    
    # Create prompt for Claude
    prompt = f"""You are an expert data scientist analyzing a dataset for machine learning.

User's Goal: {request.user_prompt}

Dataset Information:
- Shape: {data_summary['shape'][0]} rows, {data_summary['shape'][1]} columns
- Columns: {', '.join(data_summary['columns'])}
- Data Types: {json.dumps(data_summary['dtypes'], indent=2)}
- Missing Values: {json.dumps(data_summary['missing_values'], indent=2)}

Sample Data (first 5 rows):
{json.dumps(data_summary['sample_data'], indent=2)}

Please analyze this dataset and provide:

1. **Task Type**: Is this a classification or regression problem?
2. **Target Variable**: Which column should be the target/prediction variable?
3. **Data Quality Issues**: What problems exist (missing values, outliers, imbalanced classes)?
4. **Preprocessing Recommendations**: Step-by-step preprocessing needed:
   - Which columns to drop (if any)
   - How to handle missing values
   - Which features need encoding
   - Which features need scaling
   - Feature engineering suggestions

Provide your response in this JSON format:
{{
  "task_type": "classification or regression",
  "target_column": "column_name",
  "confidence": "high/medium/low",
  "reasoning": "brief explanation",
  "data_quality": {{
    "issues": ["list of issues"],
    "severity": "high/medium/low"
  }},
  "preprocessing_steps": [
    {{
      "step": "handle_missing_values",
      "description": "Fill missing values in X with median",
      "columns": ["col1", "col2"],
      "method": "median/mode/drop"
    }},
    {{
      "step": "encode_categorical",
      "description": "One-hot encode categorical features",
      "columns": ["col3"],
      "method": "onehot/label"
    }},
    {{
      "step": "scale_features",
      "description": "Standardize numeric features",
      "columns": ["col4", "col5"],
      "method": "standard/minmax"
    }}
  ],
  "recommended_models": ["model1", "model2", "model3"],
  "next_steps": "What user should do next"
}}

Only return valid JSON, no extra text."""

    try:
        # Call Claude API
        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=2000,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        
        # Extract response
        ai_response = response.content[0].text
        
        # Try to parse JSON
        try:
            analysis_result = json.loads(ai_response)
        except json.JSONDecodeError:
            # If not valid JSON, extract from markdown code block
            if "```json" in ai_response:
                json_str = ai_response.split("```json")[1].split("```")[0].strip()
                analysis_result = json.loads(json_str)
            else:
                raise ValueError("Could not parse AI response as JSON")
        
        # Save analysis to project
        await db.projects.update_one(
            {"id": request.project_id},
            {
                "$set": {
                    "ai_analysis": analysis_result,
                    "ai_analysis_timestamp": datetime.now(timezone.utc).isoformat(),
                    "status": "ai_analyzed"
                }
            }
        )
        
        return {
            "status": "success",
            "analysis": analysis_result,
            "message": "AI analysis complete. Please review and approve preprocessing steps.",
            "awaiting_approval": True
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")


# ============ STEP 2: APPLY PREPROCESSING (after approval) ============

@router.post("/apply-preprocessing")
async def apply_preprocessing(request: ApprovalRequest):
    """
    Apply the preprocessing steps after user approval
    """
    if not request.approved:
        return {"status": "cancelled", "message": "Preprocessing cancelled by user"}
    
    project = await db.projects.find_one({"id": request.project_id}, {"_id": 0})
    if not project or not project.get("ai_analysis"):
        raise HTTPException(status_code=400, detail="No AI analysis found")
    
    analysis = project["ai_analysis"]
    preprocessing_steps = analysis.get("preprocessing_steps", [])
    
    # Get dataset
    dataset = await db.datasets.find_one({"id": project["dataset_id"]}, {"_id": 0})
    df = pd.read_csv(dataset["path"])
    
    # Apply preprocessing steps
    from sklearn.preprocessing import StandardScaler, MinMaxScaler, LabelEncoder
    from sklearn.model_selection import train_test_split
    
    transformers = {}
    preprocessing_log = []
    
    target_column = analysis["target_column"]
    
    # Separate features and target
    if target_column in df.columns:
        y = df[target_column]
        X = df.drop(columns=[target_column])
    else:
        raise HTTPException(status_code=400, detail=f"Target column {target_column} not found")
    
    # Apply each preprocessing step
    for step in preprocessing_steps:
        step_name = step["step"]
        columns = step.get("columns", [])
        method = step.get("method", "")
        
        if step_name == "handle_missing_values":
            for col in columns:
                if col in X.columns:
                    if method == "median":
                        X[col].fillna(X[col].median(), inplace=True)
                    elif method == "mode":
                        X[col].fillna(X[col].mode()[0], inplace=True)
                    elif method == "drop":
                        X.dropna(subset=[col], inplace=True)
            preprocessing_log.append(f"Handled missing values in {len(columns)} columns")
        
        elif step_name == "encode_categorical":
            for col in columns:
                if col in X.columns:
                    if method == "onehot":
                        dummies = pd.get_dummies(X[col], prefix=col)
                        X = pd.concat([X.drop(columns=[col]), dummies], axis=1)
                    elif method == "label":
                        le = LabelEncoder()
                        X[col] = le.fit_transform(X[col].astype(str))
                        transformers[f"{col}_encoder"] = le
            preprocessing_log.append(f"Encoded {len(columns)} categorical columns")
        
        elif step_name == "scale_features":
            for col in columns:
                if col in X.columns:
                    if method == "standard":
                        scaler = StandardScaler()
                        X[col] = scaler.fit_transform(X[[col]])
                        transformers[f"{col}_scaler"] = scaler
                    elif method == "minmax":
                        scaler = MinMaxScaler()
                        X[col] = scaler.fit_transform(X[[col]])
                        transformers[f"{col}_scaler"] = scaler
            preprocessing_log.append(f"Scaled {len(columns)} numeric columns")
    
    # Encode target if classification
    if analysis["task_type"] == "classification":
        le_target = LabelEncoder()
        y = le_target.fit_transform(y.astype(str))
        transformers["target_encoder"] = le_target
    
    # Train-test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    # Save preprocessed data
    processed_dir = "/app/backend/processed"
    os.makedirs(processed_dir, exist_ok=True)
    processed_path = os.path.join(processed_dir, f"{request.project_id}_preprocessed.pkl")
    
    with open(processed_path, 'wb') as f:
        pickle.dump({
            "X_train": X_train,
            "X_test": X_test,
            "y_train": y_train,
            "y_test": y_test,
            "feature_names": list(X.columns),
            "transformers": transformers
        }, f)
    
    # Update project
    await db.projects.update_one(
        {"id": request.project_id},
        {
            "$set": {
                "preprocessing_results": {
                    "processed_path": processed_path,
                    "feature_names": list(X.columns),
                    "n_features": len(X.columns),
                    "train_size": len(X_train),
                    "test_size": len(X_test),
                    "steps_applied": preprocessing_log
                },
                "target_column": target_column,
                "task_type": analysis["task_type"],
                "status": "preprocessed"
            }
        }
    )
    
    return {
        "status": "success",
        "message": "Preprocessing complete!",
        "details": {
            "features_created": len(X.columns),
            "train_samples": len(X_train),
            "test_samples": len(X_test),
            "steps_applied": preprocessing_log
        },
        "awaiting_approval": True,
        "next_step": "model_generation"
    }


# ============ STEP 3: AI MODEL GENERATION ============

@router.post("/generate-model")
async def generate_model_with_ai(request: ModelGenerationRequest):
    """
    Claude generates optimized model code and trains it
    """
    project = await db.projects.find_one({"id": request.project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if not project.get("preprocessing_results"):
        raise HTTPException(status_code=400, detail="Data not preprocessed")
    
    analysis = project.get("ai_analysis", {})
    task_type = project.get("task_type", "classification")
    
    # Load preprocessed data
    processed_path = project["preprocessing_results"]["processed_path"]
    with open(processed_path, 'rb') as f:
        data = pickle.load(f)
    
    X_train, X_test = data["X_train"], data["X_test"]
    y_train, y_test = data["y_train"], data["y_test"]
    
    # Create prompt for Claude to generate model code
    prompt = f"""You are an expert ML engineer. Generate optimal model code for this task.

Task Type: {task_type}
Dataset: {len(X_train)} training samples, {X_train.shape[1]} features
User Requirements: {request.user_requirements}

Recommended Models from Analysis: {analysis.get('recommended_models', [])}

Generate Python code that:
1. Imports necessary libraries (sklearn models)
2. Creates and trains the BEST model for this task
3. Makes predictions on test set
4. Calculates all relevant metrics
5. Returns model, predictions, and metrics

Requirements:
- Choose the most accurate model
- Use appropriate hyperparameters
- Include cross-validation
- Return comprehensive metrics

Return ONLY executable Python code, no explanations. The code should define:
- model: trained sklearn model
- y_pred: predictions on X_test
- metrics: dict with all metrics (accuracy, f1, precision, recall for classification OR mse, rmse, mae, r2 for regression)
- cv_scores: cross-validation scores

Example structure:
```python
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, f1_score
from sklearn.model_selection import cross_val_score
import numpy as np

model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)
y_pred = model.predict(X_test)

metrics = {{
    'accuracy': accuracy_score(y_test, y_pred),
    'f1_score': f1_score(y_test, y_pred, average='weighted')
}}

cv_scores = cross_val_score(model, X_train, y_train, cv=5)
```

Generate the complete code now:"""

    try:
        # Call Claude
        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}]
        )
        
        code = response.content[0].text
        
        # Extract code from markdown if needed
        if "```python" in code:
            code = code.split("```python")[1].split("```")[0].strip()
        
        # Execute the generated code
        exec_globals = {
            'X_train': X_train,
            'X_test': X_test,
            'y_train': y_train,
            'y_test': y_test,
            'np': np,
            'pd': pd
        }
        
        exec(code, exec_globals)
        
        # Extract results
        model = exec_globals.get('model')
        y_pred = exec_globals.get('y_pred')
        metrics = exec_globals.get('metrics', {})
        cv_scores = exec_globals.get('cv_scores', [])
        
        if model is None:
            raise ValueError("Generated code did not create a model")
        
        # Save model
        models_dir = "/app/backend/models"
        os.makedirs(models_dir, exist_ok=True)
        model_path = os.path.join(models_dir, f"{request.project_id}_ai_model.pkl")
        
        with open(model_path, 'wb') as f:
            pickle.dump(model, f)
        
        # Get model name
        model_name = type(model).__name__
        
        # Update project
        await db.projects.update_one(
            {"id": request.project_id},
            {
                "$set": {
                    "ai_generated_model": {
                        "model_name": model_name,
                        "model_path": model_path,
                        "metrics": metrics,
                        "cv_scores": cv_scores.tolist() if hasattr(cv_scores, 'tolist') else list(cv_scores),
                        "generated_code": code,
                        "predictions": y_pred.tolist() if hasattr(y_pred, 'tolist') else list(y_pred),
                        "test_actuals": y_test.tolist() if hasattr(y_test, 'tolist') else list(y_test)
                    },
                    "status": "trained"
                }
            }
        )
        
        return {
            "status": "success",
            "message": f"Model trained successfully: {model_name}",
            "model_name": model_name,
            "metrics": metrics,
            "cv_mean": float(np.mean(cv_scores)) if len(cv_scores) > 0 else None,
            "cv_std": float(np.std(cv_scores)) if len(cv_scores) > 0 else None,
            "generated_code": code
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model generation failed: {str(e)}")


# ============ GET VISUALIZATION DATA ============

@router.get("/{project_id}/visualization-data")
async def get_visualization_data(project_id: str):
    """
    Get data needed for model visualization (regression line, decision boundary, etc.)
    """
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if not project.get("ai_generated_model"):
        raise HTTPException(status_code=400, detail="No trained model found")
    
    model_info = project["ai_generated_model"]
    task_type = project.get("task_type")
    
    # Load preprocessed data for visualization
    processed_path = project["preprocessing_results"]["processed_path"]
    with open(processed_path, 'rb') as f:
        data = pickle.load(f)
    
    X_test = data["X_test"]
    y_test = model_info["test_actuals"]
    y_pred = model_info["predictions"]
    
    # Prepare visualization data based on task type
    viz_data = {
        "task_type": task_type,
        "model_name": model_info["model_name"],
        "metrics": model_info["metrics"]
    }
    
    if task_type == "regression":
        # For regression: actual vs predicted scatter plot
        viz_data["regression_plot"] = {
            "actual": y_test[:100],  # Limit to 100 points for performance
            "predicted": y_pred[:100]
        }
        
        # If single feature, can show regression line
        if X_test.shape[1] == 1:
            viz_data["feature_values"] = X_test.iloc[:100, 0].tolist()
    
    elif task_type == "classification":
        # Confusion matrix data
        from sklearn.metrics import confusion_matrix
        cm = confusion_matrix(y_test, y_pred)
        viz_data["confusion_matrix"] = cm.tolist()
        
        # Class distribution
        unique, counts = np.unique(y_test, return_counts=True)
        viz_data["class_distribution"] = {
            "labels": unique.tolist(),
            "counts": counts.tolist()
        }
    
    return viz_data
