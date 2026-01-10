"""
Fully Automated AI AutoML Workflow - No Approvals Needed
Claude analyzes, preprocesses, generates model, iterates for accuracy
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
import asyncio

router = APIRouter()
db = None

EMERGENT_KEY = os.environ.get('EMERGENT_LLM_KEY', 'sk-emergent-59a1cA994F1B401B0E')
client = anthropic.Anthropic(api_key=EMERGENT_KEY)

class AutoMLRequest(BaseModel):
    project_id: str
    user_prompt: str

# ============ FULLY AUTOMATED WORKFLOW ============

@router.post("/auto-build")
async def auto_build_model(request: AutoMLRequest, background_tasks: BackgroundTasks):
    """
    Fully automated: Analyze → Preprocess → Generate Model → Iterate → Complete
    No user approval needed - everything happens automatically
    """
    
    # Update project status
    await db.projects.update_one(
        {"id": request.project_id},
        {"$set": {"status": "ai_building", "workflow_log": []}}
    )
    
    # Run the entire workflow in background
    background_tasks.add_task(run_automated_workflow, request.project_id, request.user_prompt)
    
    return {
        "status": "started",
        "message": "AI is building your model automatically. Check progress in real-time.",
        "project_id": request.project_id
    }


async def run_automated_workflow(project_id: str, user_prompt: str):
    """
    Complete automated workflow with iteration
    """
    workflow_log = []
    
    try:
        # Step 1: Get project and dataset
        workflow_log.append({"step": "initialization", "status": "started", "timestamp": datetime.now().isoformat()})
        
        project = await db.projects.find_one({"id": project_id}, {"_id": 0})
        if not project or not project.get("dataset_id"):
            raise Exception("Project or dataset not found")
        
        dataset = await db.datasets.find_one({"id": project["dataset_id"]}, {"_id": 0})
        if not dataset:
            raise Exception("Dataset not found")
        
        # Get dataset path - check multiple possible field names
        dataset_path = dataset.get("path") or dataset.get("file_path") or dataset.get("filepath")
        if not dataset_path or not os.path.exists(dataset_path):
            raise Exception(f"Dataset file not found at path: {dataset_path}")
        
        df = pd.read_csv(dataset_path)
        workflow_log.append({"step": "initialization", "status": "complete", "details": f"Loaded {len(df)} rows"})
        
        # Update progress
        await db.projects.update_one(
            {"id": project_id},
            {"$set": {"workflow_log": workflow_log, "status": "analyzing"}}
        )
        
        # Step 2: AI Analysis
        workflow_log.append({"step": "analysis", "status": "started", "timestamp": datetime.now().isoformat()})
        analysis_result = await analyze_with_claude(df, user_prompt)
        workflow_log.append({"step": "analysis", "status": "complete", "result": analysis_result})
        
        await db.projects.update_one(
            {"id": project_id},
            {"$set": {
                "workflow_log": workflow_log,
                "ai_analysis": analysis_result,
                "status": "preprocessing",
                "task_type": analysis_result.get("task_type"),
                "target_column": analysis_result.get("target_column")
            }}
        )
        
        # Step 3: Auto Preprocessing
        workflow_log.append({"step": "preprocessing", "status": "started", "timestamp": datetime.now().isoformat()})
        preprocessing_result = await auto_preprocess_data(df, analysis_result, project_id)
        workflow_log.append({"step": "preprocessing", "status": "complete", "result": preprocessing_result})
        
        await db.projects.update_one(
            {"id": project_id},
            {"$set": {
                "workflow_log": workflow_log,
                "preprocessing_results": preprocessing_result,
                "status": "model_generation"
            }}
        )
        
        # Step 4: Generate Initial Model
        workflow_log.append({"step": "model_generation", "status": "started", "timestamp": datetime.now().isoformat()})
        initial_model = await generate_model_with_claude(preprocessing_result, analysis_result, user_prompt)
        workflow_log.append({"step": "model_generation", "status": "complete", "model": initial_model["model_name"]})
        
        await db.projects.update_one(
            {"id": project_id},
            {"$set": {
                "workflow_log": workflow_log,
                "status": "iterating"
            }}
        )
        
        # Step 5: Iterate to Improve Accuracy
        workflow_log.append({"step": "iteration", "status": "started", "timestamp": datetime.now().isoformat()})
        final_model = await iterate_for_accuracy(
            preprocessing_result,
            analysis_result,
            initial_model,
            project_id,
            max_iterations=3
        )
        workflow_log.append({
            "step": "iteration",
            "status": "complete",
            "iterations": final_model.get("iterations", 0),
            "final_score": final_model.get("best_score")
        })
        
        # Step 6: Save Final Model
        await db.projects.update_one(
            {"id": project_id},
            {"$set": {
                "workflow_log": workflow_log,
                "ai_generated_model": final_model,
                "status": "trained",
                "completed_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
    except Exception as e:
        workflow_log.append({"step": "error", "status": "failed", "error": str(e)})
        await db.projects.update_one(
            {"id": project_id},
            {"$set": {
                "workflow_log": workflow_log,
                "status": "failed",
                "error": str(e)
            }}
        )


async def analyze_with_claude(df: pd.DataFrame, user_prompt: str) -> Dict[str, Any]:
    """AI analyzes data and suggests preprocessing"""
    
    data_summary = {
        "shape": df.shape,
        "columns": list(df.columns),
        "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
        "missing_values": {col: int(count) for col, count in df.isnull().sum().items() if count > 0},
        "numeric_stats": {col: stats.to_dict() for col, stats in df.describe().items()}
    }
    
    prompt = f"""Analyze this dataset for machine learning.

User Goal: {user_prompt}

Dataset: {data_summary['shape'][0]} rows, {data_summary['shape'][1]} columns
Columns: {', '.join(data_summary['columns'])}
Types: {json.dumps(data_summary['dtypes'], indent=2)}
Missing: {json.dumps(data_summary['missing_values'], indent=2)}

Return JSON with:
{{
  "task_type": "classification or regression",
  "target_column": "column_name",
  "reasoning": "why this is the target",
  "preprocessing_steps": [
    {{"step": "handle_missing", "columns": ["col1"], "method": "median"}},
    {{"step": "encode_categorical", "columns": ["col2"], "method": "onehot"}},
    {{"step": "scale_features", "columns": ["col3"], "method": "standard"}}
  ],
  "recommended_models": ["model1", "model2"]
}}

Only JSON:"""

    response = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}]
    )
    
    result_text = response.content[0].text
    
    # Parse JSON
    if "```json" in result_text:
        result_text = result_text.split("```json")[1].split("```")[0].strip()
    
    return json.loads(result_text)


async def auto_preprocess_data(df: pd.DataFrame, analysis: Dict, project_id: str) -> Dict[str, Any]:
    """Automatically preprocess data based on AI recommendations"""
    
    from sklearn.preprocessing import StandardScaler, MinMaxScaler, LabelEncoder
    from sklearn.model_selection import train_test_split
    
    target_column = analysis["target_column"]
    
    # Separate target
    if target_column not in df.columns:
        raise Exception(f"Target column '{target_column}' not found")
    
    y = df[target_column]
    X = df.drop(columns=[target_column])
    
    transformers = {}
    
    # Apply preprocessing steps
    for step in analysis.get("preprocessing_steps", []):
        step_name = step["step"]
        columns = step.get("columns", [])
        method = step.get("method", "")
        
        if step_name == "handle_missing" or step_name == "handle_missing_values":
            for col in columns:
                if col in X.columns and X[col].isnull().any():
                    if method == "median" and pd.api.types.is_numeric_dtype(X[col]):
                        X[col].fillna(X[col].median(), inplace=True)
                    elif method == "mode":
                        X[col].fillna(X[col].mode()[0], inplace=True)
                    else:
                        X[col].fillna(X[col].median() if pd.api.types.is_numeric_dtype(X[col]) else X[col].mode()[0], inplace=True)
        
        elif step_name == "encode_categorical":
            for col in columns:
                if col in X.columns:
                    if method == "onehot":
                        dummies = pd.get_dummies(X[col], prefix=col)
                        X = pd.concat([X.drop(columns=[col]), dummies], axis=1)
                    else:
                        le = LabelEncoder()
                        X[col] = le.fit_transform(X[col].astype(str))
                        transformers[f"{col}_encoder"] = le
        
        elif step_name == "scale_features":
            for col in columns:
                if col in X.columns:
                    scaler = StandardScaler() if method == "standard" else MinMaxScaler()
                    X[col] = scaler.fit_transform(X[[col]])
                    transformers[f"{col}_scaler"] = scaler
    
    # Encode target if classification
    if analysis["task_type"] == "classification":
        le = LabelEncoder()
        y = le.fit_transform(y.astype(str))
        transformers["target_encoder"] = le
    
    # Split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Save
    processed_path = f"/app/backend/processed/{project_id}_auto.pkl"
    os.makedirs(os.path.dirname(processed_path), exist_ok=True)
    
    with open(processed_path, 'wb') as f:
        pickle.dump({
            "X_train": X_train,
            "X_test": X_test,
            "y_train": y_train,
            "y_test": y_test,
            "feature_names": list(X.columns),
            "transformers": transformers
        }, f)
    
    return {
        "processed_path": processed_path,
        "feature_names": list(X.columns),
        "n_features": len(X.columns),
        "train_size": len(X_train),
        "test_size": len(X_test)
    }


async def generate_model_with_claude(preprocessing_result: Dict, analysis: Dict, user_prompt: str) -> Dict[str, Any]:
    """Generate and train model with Claude"""
    
    task_type = analysis["task_type"]
    
    prompt = f"""Generate Python ML model code for {task_type}.

User Goal: {user_prompt}
Features: {preprocessing_result['n_features']}
Training Samples: {preprocessing_result['train_size']}

Create the BEST model. Return ONLY Python code that defines:
- model: trained model
- y_pred: predictions
- metrics: dict with metrics
- cv_scores: cross-validation scores

Example:
```python
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, f1_score
from sklearn.model_selection import cross_val_score

model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)
y_pred = model.predict(X_test)
metrics = {{'accuracy': accuracy_score(y_test, y_pred)}}
cv_scores = cross_val_score(model, X_train, y_train, cv=5)
```"""

    response = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}]
    )
    
    code = response.content[0].text
    if "```python" in code:
        code = code.split("```python")[1].split("```")[0].strip()
    
    # Load data and execute
    with open(preprocessing_result["processed_path"], 'rb') as f:
        data = pickle.load(f)
    
    exec_globals = {**data, 'np': np, 'pd': pd}
    exec(code, exec_globals)
    
    model = exec_globals['model']
    metrics = exec_globals.get('metrics', {})
    cv_scores = exec_globals.get('cv_scores', [])
    y_pred = exec_globals.get('y_pred', [])
    
    return {
        "model": model,
        "model_name": type(model).__name__,
        "metrics": metrics,
        "cv_scores": cv_scores.tolist() if hasattr(cv_scores, 'tolist') else list(cv_scores),
        "predictions": y_pred.tolist() if hasattr(y_pred, 'tolist') else list(y_pred),
        "generated_code": code
    }


async def iterate_for_accuracy(
    preprocessing_result: Dict,
    analysis: Dict,
    initial_model: Dict,
    project_id: str,
    max_iterations: int = 3
) -> Dict[str, Any]:
    """Iterate to improve model accuracy"""
    
    best_model = initial_model
    best_score = get_primary_metric(initial_model["metrics"], analysis["task_type"])
    
    for iteration in range(max_iterations):
        # Ask Claude to improve
        prompt = f"""Improve this {analysis['task_type']} model.

Current: {best_model['model_name']}
Score: {best_score}
Metrics: {json.dumps(best_model['metrics'])}

Generate BETTER model code. Try:
- Different algorithm
- Better hyperparameters
- Ensemble methods

Return only Python code:"""

        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}]
        )
        
        code = response.content[0].text
        if "```python" in code:
            code = code.split("```python")[1].split("```")[0].strip()
        
        try:
            # Try new model
            with open(preprocessing_result["processed_path"], 'rb') as f:
                data = pickle.load(f)
            
            exec_globals = {**data, 'np': np, 'pd': pd}
            exec(code, exec_globals)
            
            new_model = exec_globals['model']
            new_metrics = exec_globals.get('metrics', {})
            new_score = get_primary_metric(new_metrics, analysis["task_type"])
            
            # Keep if better
            if new_score > best_score:
                best_score = new_score
                best_model = {
                    "model": new_model,
                    "model_name": type(new_model).__name__,
                    "metrics": new_metrics,
                    "cv_scores": exec_globals.get('cv_scores', []),
                    "predictions": exec_globals.get('y_pred', []),
                    "generated_code": code,
                    "iteration": iteration + 1
                }
        except Exception as e:
            # Skip failed iteration
            continue
    
    # Save best model
    model_path = f"/app/backend/models/{project_id}_final.pkl"
    os.makedirs(os.path.dirname(model_path), exist_ok=True)
    with open(model_path, 'wb') as f:
        pickle.dump(best_model["model"], f)
    
    best_model["model_path"] = model_path
    best_model["best_score"] = float(best_score)
    best_model["iterations"] = max_iterations
    
    # Get test actuals for visualization
    with open(preprocessing_result["processed_path"], 'rb') as f:
        data = pickle.load(f)
    best_model["test_actuals"] = data["y_test"].tolist() if hasattr(data["y_test"], 'tolist') else list(data["y_test"])
    
    return best_model


def get_primary_metric(metrics: Dict, task_type: str) -> float:
    """Get primary metric for comparison"""
    if task_type == "classification":
        return metrics.get("f1_score", metrics.get("accuracy", 0))
    else:
        return metrics.get("r2_score", 1 - metrics.get("mse", 1))


# ============ GET WORKFLOW STATUS ============

@router.get("/{project_id}/workflow-status")
async def get_workflow_status(project_id: str):
    """Get real-time workflow progress"""
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return {
        "status": project.get("status"),
        "workflow_log": project.get("workflow_log", []),
        "current_step": project.get("workflow_log", [])[-1] if project.get("workflow_log") else None
    }


# ============ GET VISUALIZATION DATA ============

@router.get("/{project_id}/visualization-data")
async def get_visualization_data(project_id: str):
    """Get data for model visualization"""
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project or not project.get("ai_generated_model"):
        raise HTTPException(status_code=404, detail="No trained model found")
    
    model_info = project["ai_generated_model"]
    task_type = project.get("task_type")
    
    viz_data = {
        "task_type": task_type,
        "model_name": model_info["model_name"],
        "metrics": model_info["metrics"],
        "best_score": model_info.get("best_score"),
        "iterations": model_info.get("iterations", 0)
    }
    
    if task_type == "regression":
        viz_data["regression_plot"] = {
            "actual": model_info["test_actuals"][:100],
            "predicted": model_info["predictions"][:100]
        }
    elif task_type == "classification":
        from sklearn.metrics import confusion_matrix
        cm = confusion_matrix(model_info["test_actuals"], model_info["predictions"])
        viz_data["confusion_matrix"] = cm.tolist()
    
    return viz_data
