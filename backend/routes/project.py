import uuid
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

router = APIRouter()

# Will be set from server.py
db = None

# ==================== MODELS ====================

class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1)
    data_source: str = Field(..., pattern="^(upload|existing|internet)$")
    
class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    dataset_id: Optional[str] = None
    target_column: Optional[str] = None
    feature_columns: Optional[List[str]] = None
    task_type: Optional[str] = None  # classification, regression, clustering
    
class DatasetLinkRequest(BaseModel):
    dataset_id: str

# ==================== PROJECT CRUD ====================

@router.post("/")
async def create_project(project: ProjectCreate):
    """Create a new AutoML project"""
    
    project_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    project_doc = {
        "id": project_id,
        "name": project.name,
        "description": project.description,
        "data_source": project.data_source,
        "status": "created",  # created, dataset_linked, analyzing, preprocessing, training, completed, failed
        "dataset_id": None,
        "target_column": None,
        "feature_columns": [],
        "task_type": None,  # Will be auto-detected or user-specified
        "analysis_results": None,
        "preprocessing_config": None,
        "training_config": None,
        "model_id": None,
        "created_at": now,
        "updated_at": now
    }
    
    await db.projects.insert_one(project_doc)
    project_doc.pop("_id", None)
    
    return project_doc

@router.get("/")
async def list_projects(
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0)
):
    """List all projects with optional filtering"""
    
    query = {}
    if status:
        query["status"] = status
    
    projects = await db.projects.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.projects.count_documents(query)
    
    return {
        "projects": projects,
        "total": total,
        "limit": limit,
        "skip": skip
    }

@router.get("/{project_id}")
async def get_project(project_id: str):
    """Get a single project by ID"""
    
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return project

@router.patch("/{project_id}")
async def update_project(project_id: str, update: ProjectUpdate):
    """Update project details"""
    
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.projects.update_one({"id": project_id}, {"$set": update_data})
    
    updated_project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    return updated_project

@router.delete("/{project_id}")
async def delete_project(project_id: str):
    """Delete a project"""
    
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    await db.projects.delete_one({"id": project_id})
    
    return {"message": "Project deleted successfully", "id": project_id}

# ==================== DATASET LINKING ====================

@router.post("/{project_id}/link-dataset")
async def link_dataset_to_project(project_id: str, request: DatasetLinkRequest):
    """Link a dataset to a project"""
    
    # Check project exists
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check dataset exists
    dataset = await db.datasets.find_one({"id": request.dataset_id}, {"_id": 0})
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    # Update project with dataset
    await db.projects.update_one(
        {"id": project_id},
        {
            "$set": {
                "dataset_id": request.dataset_id,
                "status": "dataset_linked",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    updated_project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    return {
        "message": "Dataset linked successfully",
        "project": updated_project,
        "dataset": dataset
    }

@router.get("/{project_id}/dataset")
async def get_project_dataset(project_id: str):
    """Get the dataset linked to a project"""
    
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if not project.get("dataset_id"):
        raise HTTPException(status_code=404, detail="No dataset linked to this project")
    
    dataset = await db.datasets.find_one({"id": project["dataset_id"]}, {"_id": 0})
    if not dataset:
        raise HTTPException(status_code=404, detail="Linked dataset not found")
    
    return dataset

# ==================== PROJECT STATS ====================

@router.get("/stats/summary")
async def get_projects_summary():
    """Get summary statistics for all projects"""
    
    total = await db.projects.count_documents({})
    
    # Count by status
    pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    status_counts = await db.projects.aggregate(pipeline).to_list(None)
    status_dict = {item["_id"]: item["count"] for item in status_counts}
    
    # Count by task type
    pipeline = [
        {"$match": {"task_type": {"$ne": None}}},
        {"$group": {"_id": "$task_type", "count": {"$sum": 1}}}
    ]
    task_counts = await db.projects.aggregate(pipeline).to_list(None)
    task_dict = {item["_id"]: item["count"] for item in task_counts}
    
    return {
        "total_projects": total,
        "by_status": status_dict,
        "by_task_type": task_dict
    }
