"""
Part 8-11: Model Training Routes
Handles automatic model selection, training configuration, and training execution
"""

import os
import uuid
import json
import pickle
import pandas as pd
import numpy as np
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, BackgroundTasks, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from io import StringIO
from sklearn.model_selection import cross_val_score
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score

# Classification models
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, AdaBoostClassifier
from sklearn.svm import SVC
from sklearn.neighbors import KNeighborsClassifier
from sklearn.naive_bayes import GaussianNB

# Regression models
from sklearn.linear_model import LinearRegression, Ridge, Lasso, ElasticNet
from sklearn.tree import DecisionTreeRegressor
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor, AdaBoostRegressor
from sklearn.svm import SVR
from sklearn.neighbors import KNeighborsRegressor

router = APIRouter()

# Will be set from server.py
db = None

PROCESSED_DIR = "/app/backend/processed"
MODELS_DIR = "/app/backend/models"

# Ensure models directory exists
os.makedirs(MODELS_DIR, exist_ok=True)

# ==================== MODEL DEFINITIONS ====================

CLASSIFICATION_MODELS = {
    "logistic_regression": {
        "name": "Logistic Regression",
        "class": LogisticRegression,
        "description": "Fast, interpretable linear model for classification",
        "best_for": ["binary classification", "interpretability", "baseline"],
        "limitations": ["Non-linear relationships", "High-dimensional sparse data"],
        "default_params": {"max_iter": 1000, "random_state": 42},
        "tunable_params": {
            "C": {"type": "float", "default": 1.0, "range": [0.001, 100], "description": "Regularization strength"},
            "penalty": {"type": "choice", "default": "l2", "choices": ["l1", "l2", "elasticnet", "none"], "description": "Penalty type"},
        },
        "complexity": "low",
        "training_speed": "fast",
    },
    "decision_tree": {
        "name": "Decision Tree",
        "class": DecisionTreeClassifier,
        "description": "Tree-based model with high interpretability",
        "best_for": ["interpretability", "feature importance", "non-linear patterns"],
        "limitations": ["Overfitting", "Unstable with small changes"],
        "default_params": {"random_state": 42},
        "tunable_params": {
            "max_depth": {"type": "int", "default": None, "range": [1, 50], "description": "Maximum tree depth"},
            "min_samples_split": {"type": "int", "default": 2, "range": [2, 20], "description": "Minimum samples to split"},
            "min_samples_leaf": {"type": "int", "default": 1, "range": [1, 20], "description": "Minimum samples in leaf"},
        },
        "complexity": "low",
        "training_speed": "fast",
    },
    "random_forest": {
        "name": "Random Forest",
        "class": RandomForestClassifier,
        "description": "Ensemble of decision trees with high accuracy",
        "best_for": ["accuracy", "handling overfitting", "feature importance"],
        "limitations": ["Training time", "Memory usage", "Interpretability"],
        "default_params": {"n_estimators": 100, "random_state": 42, "n_jobs": -1},
        "tunable_params": {
            "n_estimators": {"type": "int", "default": 100, "range": [10, 500], "description": "Number of trees"},
            "max_depth": {"type": "int", "default": None, "range": [1, 50], "description": "Maximum tree depth"},
            "min_samples_split": {"type": "int", "default": 2, "range": [2, 20], "description": "Minimum samples to split"},
        },
        "complexity": "medium",
        "training_speed": "medium",
    },
    "gradient_boosting": {
        "name": "Gradient Boosting",
        "class": GradientBoostingClassifier,
        "description": "Sequential ensemble with strong predictive power",
        "best_for": ["high accuracy", "structured data", "competitions"],
        "limitations": ["Training time", "Hyperparameter sensitivity", "Overfitting"],
        "default_params": {"n_estimators": 100, "random_state": 42},
        "tunable_params": {
            "n_estimators": {"type": "int", "default": 100, "range": [10, 500], "description": "Number of boosting stages"},
            "learning_rate": {"type": "float", "default": 0.1, "range": [0.001, 1.0], "description": "Learning rate"},
            "max_depth": {"type": "int", "default": 3, "range": [1, 20], "description": "Maximum tree depth"},
        },
        "complexity": "high",
        "training_speed": "slow",
    },
    "svm": {
        "name": "Support Vector Machine",
        "class": SVC,
        "description": "Powerful classifier using kernel methods",
        "best_for": ["high-dimensional data", "clear margin of separation"],
        "limitations": ["Large datasets", "Scaling", "Hyperparameter tuning"],
        "default_params": {"random_state": 42, "probability": True},
        "tunable_params": {
            "C": {"type": "float", "default": 1.0, "range": [0.001, 100], "description": "Regularization parameter"},
            "kernel": {"type": "choice", "default": "rbf", "choices": ["linear", "poly", "rbf", "sigmoid"], "description": "Kernel type"},
        },
        "complexity": "high",
        "training_speed": "slow",
    },
    "knn": {
        "name": "K-Nearest Neighbors",
        "class": KNeighborsClassifier,
        "description": "Instance-based learning algorithm",
        "best_for": ["Small datasets", "Multi-class classification"],
        "limitations": ["Large datasets", "High dimensions", "Prediction speed"],
        "default_params": {},
        "tunable_params": {
            "n_neighbors": {"type": "int", "default": 5, "range": [1, 50], "description": "Number of neighbors"},
            "weights": {"type": "choice", "default": "uniform", "choices": ["uniform", "distance"], "description": "Weight function"},
        },
        "complexity": "low",
        "training_speed": "fast",
    },
    "naive_bayes": {
        "name": "Naive Bayes",
        "class": GaussianNB,
        "description": "Probabilistic classifier based on Bayes theorem",
        "best_for": ["Text classification", "Fast predictions", "Baseline"],
        "limitations": ["Feature independence assumption", "Continuous features"],
        "default_params": {},
        "tunable_params": {},
        "complexity": "low",
        "training_speed": "very_fast",
    },
}

REGRESSION_MODELS = {
    "linear_regression": {
        "name": "Linear Regression",
        "class": LinearRegression,
        "description": "Simple linear model for regression",
        "best_for": ["Linear relationships", "Interpretability", "Baseline"],
        "limitations": ["Non-linear relationships", "Outliers"],
        "default_params": {},
        "tunable_params": {},
        "complexity": "low",
        "training_speed": "very_fast",
    },
    "ridge": {
        "name": "Ridge Regression",
        "class": Ridge,
        "description": "Linear regression with L2 regularization",
        "best_for": ["Multicollinearity", "Regularization"],
        "limitations": ["Feature selection"],
        "default_params": {"random_state": 42},
        "tunable_params": {
            "alpha": {"type": "float", "default": 1.0, "range": [0.001, 100], "description": "Regularization strength"},
        },
        "complexity": "low",
        "training_speed": "very_fast",
    },
    "lasso": {
        "name": "Lasso Regression",
        "class": Lasso,
        "description": "Linear regression with L1 regularization",
        "best_for": ["Feature selection", "Sparse solutions"],
        "limitations": ["Correlated features"],
        "default_params": {"random_state": 42},
        "tunable_params": {
            "alpha": {"type": "float", "default": 1.0, "range": [0.001, 100], "description": "Regularization strength"},
        },
        "complexity": "low",
        "training_speed": "very_fast",
    },
    "elastic_net": {
        "name": "Elastic Net",
        "class": ElasticNet,
        "description": "Combines L1 and L2 regularization",
        "best_for": ["Feature selection", "Grouped features"],
        "limitations": ["Hyperparameter tuning"],
        "default_params": {"random_state": 42},
        "tunable_params": {
            "alpha": {"type": "float", "default": 1.0, "range": [0.001, 100], "description": "Regularization strength"},
            "l1_ratio": {"type": "float", "default": 0.5, "range": [0, 1], "description": "L1/L2 mix ratio"},
        },
        "complexity": "low",
        "training_speed": "fast",
    },
    "decision_tree_reg": {
        "name": "Decision Tree Regressor",
        "class": DecisionTreeRegressor,
        "description": "Tree-based regression model",
        "best_for": ["Non-linear patterns", "Interpretability"],
        "limitations": ["Overfitting", "Unstable"],
        "default_params": {"random_state": 42},
        "tunable_params": {
            "max_depth": {"type": "int", "default": None, "range": [1, 50], "description": "Maximum tree depth"},
            "min_samples_split": {"type": "int", "default": 2, "range": [2, 20], "description": "Minimum samples to split"},
        },
        "complexity": "low",
        "training_speed": "fast",
    },
    "random_forest_reg": {
        "name": "Random Forest Regressor",
        "class": RandomForestRegressor,
        "description": "Ensemble of decision trees for regression",
        "best_for": ["Accuracy", "Non-linear patterns", "Feature importance"],
        "limitations": ["Training time", "Memory"],
        "default_params": {"n_estimators": 100, "random_state": 42, "n_jobs": -1},
        "tunable_params": {
            "n_estimators": {"type": "int", "default": 100, "range": [10, 500], "description": "Number of trees"},
            "max_depth": {"type": "int", "default": None, "range": [1, 50], "description": "Maximum tree depth"},
        },
        "complexity": "medium",
        "training_speed": "medium",
    },
    "gradient_boosting_reg": {
        "name": "Gradient Boosting Regressor",
        "class": GradientBoostingRegressor,
        "description": "Sequential ensemble for regression",
        "best_for": ["High accuracy", "Structured data"],
        "limitations": ["Training time", "Hyperparameter sensitivity"],
        "default_params": {"n_estimators": 100, "random_state": 42},
        "tunable_params": {
            "n_estimators": {"type": "int", "default": 100, "range": [10, 500], "description": "Number of boosting stages"},
            "learning_rate": {"type": "float", "default": 0.1, "range": [0.001, 1.0], "description": "Learning rate"},
            "max_depth": {"type": "int", "default": 3, "range": [1, 20], "description": "Maximum tree depth"},
        },
        "complexity": "high",
        "training_speed": "slow",
    },
    "svr": {
        "name": "Support Vector Regressor",
        "class": SVR,
        "description": "SVM for regression tasks",
        "best_for": ["High-dimensional data", "Non-linear patterns"],
        "limitations": ["Large datasets", "Scaling required"],
        "default_params": {},
        "tunable_params": {
            "C": {"type": "float", "default": 1.0, "range": [0.001, 100], "description": "Regularization parameter"},
            "kernel": {"type": "choice", "default": "rbf", "choices": ["linear", "poly", "rbf", "sigmoid"], "description": "Kernel type"},
        },
        "complexity": "high",
        "training_speed": "slow",
    },
    "knn_reg": {
        "name": "K-Nearest Neighbors Regressor",
        "class": KNeighborsRegressor,
        "description": "Instance-based regression",
        "best_for": ["Small datasets", "Local patterns"],
        "limitations": ["Large datasets", "High dimensions"],
        "default_params": {},
        "tunable_params": {
            "n_neighbors": {"type": "int", "default": 5, "range": [1, 50], "description": "Number of neighbors"},
            "weights": {"type": "choice", "default": "uniform", "choices": ["uniform", "distance"], "description": "Weight function"},
        },
        "complexity": "low",
        "training_speed": "fast",
    },
}

# ==================== PYDANTIC MODELS ====================

class ModelSelection(BaseModel):
    model_id: str
    name: str
    selected: bool = True
    priority: int = 1  # 1=high, 2=medium, 3=low
    reason: str = ""
    params: Dict[str, Any] = {}

class ModelSelectionRequest(BaseModel):
    project_id: str

class ModelSelectionResult(BaseModel):
    task_type: str
    recommended_models: List[ModelSelection]
    selection_reasoning: str
    data_characteristics: Dict[str, Any]

class TrainingConfig(BaseModel):
    project_id: str
    models: List[Dict[str, Any]]  # List of model configs with params
    cross_validation: bool = True
    cv_folds: int = 5
    metrics: List[str] = []  # Will auto-select based on task type

class TrainingRequest(BaseModel):
    project_id: str
    config: Optional[TrainingConfig] = None

# ==================== HELPER FUNCTIONS ====================

def select_models_for_task(
    task_type: str,
    data_size: int,
    feature_count: int,
    has_categorical: bool = False,
    has_missing: bool = False,
    quality_score: float = 80.0
) -> List[ModelSelection]:
    """
    Automatically select appropriate models based on task type and data characteristics.
    Returns a prioritized list of model selections.
    """
    
    if task_type == "classification":
        model_catalog = CLASSIFICATION_MODELS
    elif task_type == "regression":
        model_catalog = REGRESSION_MODELS
    else:
        # For clustering or unknown, default to classification models
        model_catalog = CLASSIFICATION_MODELS
    
    selections = []
    
    for model_id, model_info in model_catalog.items():
        selected = True
        priority = 2  # Default medium priority
        reasons = []
        
        # Evaluate model suitability based on data characteristics
        
        # Data size considerations
        if data_size < 100:
            if model_info["complexity"] == "high":
                selected = False
                reasons.append("Dataset too small for complex model")
            elif model_info["training_speed"] in ["very_fast", "fast"]:
                priority = 1
                reasons.append("Fast training suitable for small dataset")
        elif data_size < 1000:
            if model_info["complexity"] == "low":
                priority = 1
                reasons.append("Simple model good for moderate dataset size")
        else:  # Large dataset
            if model_info["complexity"] == "high":
                priority = 1
                reasons.append("Complex model can leverage large dataset")
            if "Large datasets" in model_info.get("limitations", []):
                priority = 3
                reasons.append("May be slow on large datasets")
        
        # Feature count considerations
        if feature_count > 100:
            if "High-dimensional data" in model_info.get("best_for", []):
                priority = min(priority, 1)
                reasons.append("Good for high-dimensional data")
        
        # Always include baseline models with high priority
        if "baseline" in model_info.get("best_for", []) or "Baseline" in model_info.get("best_for", []):
            priority = 1
            reasons.append("Good baseline model")
        
        # High accuracy models
        if "accuracy" in model_info.get("best_for", []) or "high accuracy" in model_info.get("best_for", []):
            if quality_score >= 70:  # Only if data quality is decent
                priority = min(priority, 1)
                reasons.append("Known for high accuracy")
        
        # Interpretability bonus for smaller datasets
        if data_size < 5000 and "interpretability" in model_info.get("best_for", []):
            priority = min(priority, 2)
            reasons.append("Provides interpretable results")
        
        selections.append(ModelSelection(
            model_id=model_id,
            name=model_info["name"],
            selected=selected,
            priority=priority,
            reason="; ".join(reasons) if reasons else "Standard model for this task type",
            params=model_info["default_params"].copy()
        ))
    
    # Sort by priority (1=highest), then by selection status
    selections.sort(key=lambda x: (not x.selected, x.priority))
    
    return selections

def get_model_catalog(task_type: str) -> Dict[str, Any]:
    """Get the full model catalog for a task type"""
    if task_type == "classification":
        return CLASSIFICATION_MODELS
    elif task_type == "regression":
        return REGRESSION_MODELS
    else:
        return CLASSIFICATION_MODELS

# ==================== API ENDPOINTS ====================

@router.post("/select-models")
async def auto_select_models(request: ModelSelectionRequest):
    """
    Part 8: Automatically select suitable ML models based on project analysis.
    Returns a list of recommended models with their configurations.
    """
    
    # Get project
    project = await db.projects.find_one({"id": request.project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Verify prerequisites
    if not project.get("analysis_results"):
        raise HTTPException(status_code=400, detail="Project must be analyzed first")
    
    if not project.get("preprocessing_results"):
        raise HTTPException(status_code=400, detail="Project must be preprocessed first")
    
    analysis = project["analysis_results"]
    preprocessing = project["preprocessing_results"]
    
    task_type = project.get("task_type", analysis.get("task_type", "classification"))
    
    # Extract data characteristics
    data_size = preprocessing["stats"].get("train_samples", 0) + preprocessing["stats"].get("test_samples", 0)
    feature_count = preprocessing["stats"].get("total_features", 0)
    
    # Check for categorical columns in analysis
    has_categorical = any(
        col.get("semantic_type") == "categorical" 
        for col in analysis.get("column_analysis", [])
    )
    
    # Check for missing values
    has_missing = any(
        col.get("missing_pct", 0) > 0 
        for col in analysis.get("column_analysis", [])
    )
    
    quality_score = analysis.get("data_quality_score", 80)
    
    # Select models
    recommended_models = select_models_for_task(
        task_type=task_type,
        data_size=data_size,
        feature_count=feature_count,
        has_categorical=has_categorical,
        has_missing=has_missing,
        quality_score=quality_score
    )
    
    # Generate selection reasoning
    reasoning_parts = []
    reasoning_parts.append(f"Task type: {task_type}")
    reasoning_parts.append(f"Training samples: {data_size}")
    reasoning_parts.append(f"Features: {feature_count}")
    reasoning_parts.append(f"Data quality score: {quality_score}/100")
    
    if data_size < 1000:
        reasoning_parts.append("Small dataset: prioritizing simple, fast models to avoid overfitting")
    elif data_size > 10000:
        reasoning_parts.append("Large dataset: complex ensemble models can be effective")
    
    selection_result = {
        "project_id": request.project_id,
        "task_type": task_type,
        "recommended_models": [m.dict() for m in recommended_models],
        "selection_reasoning": ". ".join(reasoning_parts),
        "data_characteristics": {
            "train_samples": preprocessing["stats"].get("train_samples", 0),
            "test_samples": preprocessing["stats"].get("test_samples", 0),
            "total_features": feature_count,
            "has_categorical": has_categorical,
            "has_missing_values": has_missing,
            "quality_score": quality_score
        }
    }
    
    # Save selection to project
    await db.projects.update_one(
        {"id": request.project_id},
        {
            "$set": {
                "model_selection": selection_result,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return selection_result

@router.get("/{project_id}/model-selection")
async def get_model_selection(project_id: str):
    """Get the current model selection for a project"""
    
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if not project.get("model_selection"):
        raise HTTPException(status_code=404, detail="No model selection available. Call /select-models first")
    
    return project["model_selection"]

@router.get("/catalog/{task_type}")
async def get_model_catalog_endpoint(task_type: str):
    """Get all available models for a task type"""
    
    if task_type not in ["classification", "regression"]:
        raise HTTPException(status_code=400, detail="Task type must be 'classification' or 'regression'")
    
    catalog = get_model_catalog(task_type)
    
    # Return catalog with model info (excluding the class reference)
    result = {}
    for model_id, model_info in catalog.items():
        result[model_id] = {
            "name": model_info["name"],
            "description": model_info["description"],
            "best_for": model_info["best_for"],
            "limitations": model_info["limitations"],
            "tunable_params": model_info["tunable_params"],
            "complexity": model_info["complexity"],
            "training_speed": model_info["training_speed"],
        }
    
    return {"task_type": task_type, "models": result}

@router.post("/{project_id}/update-selection")
async def update_model_selection(project_id: str, models: List[ModelSelection]):
    """Update the model selection for a project (user customization)"""
    
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if not project.get("model_selection"):
        raise HTTPException(status_code=400, detail="No model selection available. Call /select-models first")
    
    # Update the selection
    selection = project["model_selection"]
    selection["recommended_models"] = [m.dict() for m in models]
    selection["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.projects.update_one(
        {"id": project_id},
        {
            "$set": {
                "model_selection": selection,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"message": "Model selection updated", "models_count": len(models)}

@router.post("/start-training")
async def start_training(request: TrainingRequest, background_tasks: BackgroundTasks):
    """
    Part 9: Start model training with selected models.
    Runs training as a background task.
    """
    
    # Get project
    project = await db.projects.find_one({"id": request.project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Verify prerequisites
    if not project.get("preprocessing_results"):
        raise HTTPException(status_code=400, detail="Project must be preprocessed first")
    
    if not project.get("model_selection"):
        raise HTTPException(status_code=400, detail="Models must be selected first. Call /select-models")
    
    # Get models to train (only selected ones)
    selection = project["model_selection"]
    models_to_train = [m for m in selection["recommended_models"] if m.get("selected", True)]
    
    if not models_to_train:
        raise HTTPException(status_code=400, detail="No models selected for training")
    
    # Update status
    await db.projects.update_one(
        {"id": request.project_id},
        {
            "$set": {
                "status": "training",
                "training_started_at": datetime.now(timezone.utc).isoformat(),
                "training_progress": {
                    "total_models": len(models_to_train),
                    "completed_models": 0,
                    "current_model": None,
                    "status": "starting"
                },
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Start background training
    background_tasks.add_task(run_training, request.project_id, models_to_train, selection["task_type"])
    
    return {
        "message": "Training started",
        "project_id": request.project_id,
        "models_count": len(models_to_train)
    }

async def run_training(project_id: str, models_to_train: List[Dict], task_type: str):
    """Background task to train all selected models"""
    
    try:
        # Load preprocessed data
        project = await db.projects.find_one({"id": project_id})
        processed_path = project["preprocessing_results"]["processed_path"]
        
        with open(processed_path, 'rb') as f:
            data = pickle.load(f)
        
        X_train = data["X_train"]
        X_test = data["X_test"]
        y_train = data["y_train"]
        y_test = data["y_test"]
        
        # Get model catalog
        catalog = CLASSIFICATION_MODELS if task_type == "classification" else REGRESSION_MODELS
        
        # Train each model
        training_results = []
        
        for idx, model_config in enumerate(models_to_train):
            model_id = model_config["model_id"]
            
            # Update progress
            await db.projects.update_one(
                {"id": project_id},
                {
                    "$set": {
                        "training_progress.current_model": model_config["name"],
                        "training_progress.completed_models": idx,
                        "training_progress.status": f"Training {model_config['name']}..."
                    }
                }
            )
            
            try:
                # Get model class and params
                model_info = catalog.get(model_id)
                if not model_info:
                    continue
                
                ModelClass = model_info["class"]
                params = {**model_info["default_params"], **model_config.get("params", {})}
                
                # Create and train model
                model = ModelClass(**params)
                model.fit(X_train, y_train)
                
                # Predictions
                y_pred = model.predict(X_test)
                
                # Calculate metrics
                if task_type == "classification":
                    metrics = {
                        "accuracy": float(accuracy_score(y_test, y_pred)),
                        "precision": float(precision_score(y_test, y_pred, average='weighted', zero_division=0)),
                        "recall": float(recall_score(y_test, y_pred, average='weighted', zero_division=0)),
                        "f1_score": float(f1_score(y_test, y_pred, average='weighted', zero_division=0)),
                    }
                    # Try to add AUC if binary classification
                    try:
                        if hasattr(model, 'predict_proba'):
                            y_prob = model.predict_proba(X_test)
                            if y_prob.shape[1] == 2:
                                metrics["auc_roc"] = float(roc_auc_score(y_test, y_prob[:, 1]))
                    except Exception:
                        pass
                else:  # regression
                    metrics = {
                        "mse": float(mean_squared_error(y_test, y_pred)),
                        "rmse": float(np.sqrt(mean_squared_error(y_test, y_pred))),
                        "mae": float(mean_absolute_error(y_test, y_pred)),
                        "r2_score": float(r2_score(y_test, y_pred)),
                    }
                
                # Cross-validation score
                try:
                    cv_scores = cross_val_score(model, X_train, y_train, cv=min(5, len(X_train)), scoring='accuracy' if task_type == 'classification' else 'r2')
                    metrics["cv_mean"] = float(cv_scores.mean())
                    metrics["cv_std"] = float(cv_scores.std())
                except Exception:
                    pass
                
                # Save model
                model_path = os.path.join(MODELS_DIR, f"{project_id}_{model_id}.pkl")
                with open(model_path, 'wb') as f:
                    pickle.dump(model, f)
                
                # Store result
                training_results.append({
                    "model_id": model_id,
                    "model_name": model_config["name"],
                    "status": "completed",
                    "metrics": metrics,
                    "model_path": model_path,
                    "params_used": params,
                    "trained_at": datetime.now(timezone.utc).isoformat()
                })
                
            except Exception as e:
                training_results.append({
                    "model_id": model_id,
                    "model_name": model_config["name"],
                    "status": "failed",
                    "error": str(e),
                    "trained_at": datetime.now(timezone.utc).isoformat()
                })
        
        # Sort results by primary metric
        if task_type == "classification":
            training_results.sort(key=lambda x: x.get("metrics", {}).get("f1_score", 0), reverse=True)
        else:
            training_results.sort(key=lambda x: x.get("metrics", {}).get("r2_score", -999), reverse=True)
        
        # Find best model
        successful_results = [r for r in training_results if r["status"] == "completed"]
        best_model = successful_results[0] if successful_results else None
        
        # Update project with results
        await db.projects.update_one(
            {"id": project_id},
            {
                "$set": {
                    "status": "trained",
                    "training_results": {
                        "completed_at": datetime.now(timezone.utc).isoformat(),
                        "models_trained": len(training_results),
                        "models_successful": len(successful_results),
                        "best_model": best_model,
                        "all_results": training_results
                    },
                    "training_progress": {
                        "total_models": len(models_to_train),
                        "completed_models": len(models_to_train),
                        "current_model": None,
                        "status": "completed"
                    },
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
    except Exception as e:
        await db.projects.update_one(
            {"id": project_id},
            {
                "$set": {
                    "status": "training_failed",
                    "training_results": {"error": str(e)},
                    "training_progress.status": "failed",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )

@router.get("/{project_id}/training-status")
async def get_training_status(project_id: str):
    """Get the current training status and progress"""
    
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return {
        "project_id": project_id,
        "status": project.get("status"),
        "progress": project.get("training_progress"),
        "results": project.get("training_results")
    }

@router.get("/{project_id}/training-results")
async def get_training_results(project_id: str):
    """Get detailed training results for all models"""
    
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if not project.get("training_results"):
        raise HTTPException(status_code=404, detail="No training results available")
    
    return {
        "project_id": project_id,
        "task_type": project.get("task_type"),
        "results": project["training_results"]
    }


# ==================== PART 14: MODEL EXPORT ====================

@router.get("/{project_id}/download-model/{model_id}")
async def download_model(project_id: str, model_id: str):
    """Download a specific trained model as pickle file"""
    
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if not project.get("training_results"):
        raise HTTPException(status_code=404, detail="No training results available")
    
    # Find the model in results
    model_result = None
    for result in project["training_results"].get("all_results", []):
        if result["model_id"] == model_id:
            model_result = result
            break
    
    if not model_result or model_result.get("status") != "completed":
        raise HTTPException(status_code=404, detail="Model not found or training failed")
    
    model_path = model_result.get("model_path")
    if not model_path or not os.path.exists(model_path):
        raise HTTPException(status_code=404, detail="Model file not found")
    
    return FileResponse(
        path=model_path,
        media_type="application/octet-stream",
        filename=f"{model_id}.pkl"
    )

@router.get("/{project_id}/download-pipeline")
async def download_pipeline(project_id: str):
    """Download complete preprocessing + best model pipeline"""
    
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if not project.get("preprocessing_results") or not project.get("training_results"):
        raise HTTPException(status_code=400, detail="Project must have preprocessing and training completed")
    
    # Load preprocessing data
    processed_path = project["preprocessing_results"]["processed_path"]
    with open(processed_path, 'rb') as f:
        preprocessing_data = pickle.load(f)
    
    # Load best model
    best_model_result = project["training_results"].get("best_model")
    if not best_model_result:
        raise HTTPException(status_code=404, detail="No best model found")
    
    model_path = best_model_result.get("model_path")
    if not model_path or not os.path.exists(model_path):
        raise HTTPException(status_code=404, detail="Best model file not found")
    
    with open(model_path, 'rb') as f:
        model = pickle.load(f)
    
    # Create complete pipeline
    pipeline = {
        "project_name": project.get("name"),
        "project_id": project_id,
        "task_type": project.get("task_type"),
        "target_column": project.get("target_column"),
        "feature_names": preprocessing_data["feature_names"],
        "transformers": preprocessing_data["transformers"],
        "model": model,
        "model_name": best_model_result["model_name"],
        "model_metrics": best_model_result.get("metrics", {}),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Save pipeline temporarily
    pipeline_path = os.path.join(MODELS_DIR, f"{project_id}_pipeline.pkl")
    with open(pipeline_path, 'wb') as f:
        pickle.dump(pipeline, f)
    
    return FileResponse(
        path=pipeline_path,
        media_type="application/octet-stream",
        filename=f"automl_pipeline_{project_id}.pkl"
    )

# ==================== PART 15: PREDICTION API ====================

class PredictionRequest(BaseModel):
    data: List[Dict[str, Any]]  # List of records to predict

class PredictionResponse(BaseModel):
    predictions: List[Any]
    feature_names: List[str]
    model_name: str
    prediction_count: int

@router.post("/{project_id}/predict")
async def make_predictions(project_id: str, request: PredictionRequest):
    """Make predictions on new data using the trained best model"""
    
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if not project.get("preprocessing_results") or not project.get("training_results"):
        raise HTTPException(status_code=400, detail="Project must have preprocessing and training completed")
    
    try:
        # Load preprocessing data
        processed_path = project["preprocessing_results"]["processed_path"]
        with open(processed_path, 'rb') as f:
            preprocessing_data = pickle.load(f)
        
        # Load best model
        best_model_result = project["training_results"].get("best_model")
        if not best_model_result:
            raise HTTPException(status_code=404, detail="No best model found")
        
        model_path = best_model_result.get("model_path")
        with open(model_path, 'rb') as f:
            model = pickle.load(f)
        
        # Convert input data to DataFrame
        input_df = pd.DataFrame(request.data)
        
        # Get original columns from analysis
        expected_columns = [col["name"] for col in project["analysis_results"]["column_analysis"]]
        target_column = project.get("target_column")
        
        # Remove target column if present in input
        if target_column and target_column in input_df.columns:
            input_df = input_df.drop(columns=[target_column])
        
        # Apply same preprocessing transformations
        # This is a simplified version - in production, you'd want to properly handle all transformations
        feature_names = preprocessing_data["feature_names"]
        
        # Basic preprocessing to match training features
        # Handle missing columns by adding them with default values
        for col in feature_names:
            if col not in input_df.columns:
                # Check if it's a one-hot encoded column
                original_col = col.split('_')[0] if '_' in col else col
                if original_col not in input_df.columns:
                    input_df[col] = 0
        
        # Ensure columns are in the same order
        try:
            input_df = input_df[feature_names]
        except KeyError:
            # If exact match fails, try to reconstruct
            aligned_df = pd.DataFrame(index=input_df.index, columns=feature_names)
            for col in feature_names:
                if col in input_df.columns:
                    aligned_df[col] = input_df[col]
                else:
                    aligned_df[col] = 0
            input_df = aligned_df.fillna(0)
        
        # Make predictions
        predictions = model.predict(input_df)
        
        # Convert predictions to list
        predictions_list = predictions.tolist()
        
        return {
            "predictions": predictions_list,
            "feature_names": feature_names,
            "model_name": best_model_result["model_name"],
            "prediction_count": len(predictions_list),
            "task_type": project.get("task_type")
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

@router.post("/{project_id}/predict-file")
async def predict_from_file(project_id: str, file: UploadFile = File(...)):
    """Make predictions from an uploaded CSV file"""
    
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if not project.get("preprocessing_results") or not project.get("training_results"):
        raise HTTPException(status_code=400, detail="Project must have preprocessing and training completed")
    
    try:
        # Read uploaded file
        contents = await file.read()
        df = pd.read_csv(StringIO(contents.decode('utf-8')))
        
        # Convert to list of dicts
        data = df.to_dict('records')
        
        # Use the existing predict endpoint logic
        pred_request = PredictionRequest(data=data)
        result = await make_predictions(project_id, pred_request)
        
        # Add predictions to original dataframe
        df['prediction'] = result["predictions"]
        
        # Save result temporarily
        result_path = os.path.join(MODELS_DIR, f"{project_id}_predictions.csv")
        df.to_csv(result_path, index=False)
        
        return {
            **result,
            "download_url": f"/api/training/{project_id}/download-predictions"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File prediction failed: {str(e)}")

@router.get("/{project_id}/download-predictions")
async def download_predictions(project_id: str):
    """Download prediction results as CSV"""
    
    result_path = os.path.join(MODELS_DIR, f"{project_id}_predictions.csv")
    
    if not os.path.exists(result_path):
        raise HTTPException(status_code=404, detail="Prediction results not found")
    
    return FileResponse(
        path=result_path,
        media_type="text/csv",
        filename=f"predictions_{project_id}.csv"
    )
