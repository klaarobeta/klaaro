import os
import uuid
import json
import csv
from datetime import datetime, timezone
from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from fastapi.responses import FileResponse
from typing import List, Optional
import aiofiles
from io import StringIO

router = APIRouter()

# Will be set from server.py
db = None

UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "/app/backend/uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# File categories
DATA_EXTENSIONS = {".csv", ".json", ".txt", ".xlsx", ".parquet"}
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".webp"}
ALLOWED_EXTENSIONS = DATA_EXTENSIONS | IMAGE_EXTENSIONS
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB

def get_file_extension(filename: str) -> str:
    return os.path.splitext(filename)[1].lower()

def get_file_category(ext: str) -> str:
    if ext in IMAGE_EXTENSIONS:
        return "image"
    elif ext == ".csv":
        return "csv"
    elif ext == ".json":
        return "json"
    elif ext == ".txt":
        return "text"
    elif ext in {".xlsx", ".parquet"}:
        return "tabular"
    return "unknown"

async def get_csv_stats(file_path: str) -> dict:
    """Get statistics for CSV file"""
    try:
        async with aiofiles.open(file_path, 'r', encoding='utf-8') as f:
            content = await f.read()
        
        reader = csv.DictReader(StringIO(content))
        rows = list(reader)
        
        if not rows:
            return {"row_count": 0, "columns": [], "column_stats": {}}
        
        columns = list(rows[0].keys())
        row_count = len(rows)
        
        # Calculate column statistics
        column_stats = {}
        for col in columns:
            values = [row.get(col, "") for row in rows]
            non_null = [v for v in values if v and v.strip()]
            null_count = len(values) - len(non_null)
            
            # Try to detect numeric columns
            numeric_values = []
            for v in non_null:
                try:
                    numeric_values.append(float(v))
                except:
                    pass
            
            stats = {
                "null_count": null_count,
                "non_null_count": len(non_null),
                "unique_count": len(set(non_null)),
                "type": "numeric" if len(numeric_values) == len(non_null) and numeric_values else "string"
            }
            
            if stats["type"] == "numeric" and numeric_values:
                stats["min"] = min(numeric_values)
                stats["max"] = max(numeric_values)
                stats["mean"] = sum(numeric_values) / len(numeric_values)
            
            column_stats[col] = stats
        
        return {
            "row_count": row_count,
            "column_count": len(columns),
            "columns": columns,
            "column_stats": column_stats
        }
    except Exception as e:
        return {"error": str(e)}

async def get_json_stats(file_path: str) -> dict:
    """Get statistics for JSON file"""
    try:
        async with aiofiles.open(file_path, 'r', encoding='utf-8') as f:
            content = await f.read()
        
        data = json.loads(content)
        
        if isinstance(data, list):
            return {
                "type": "array",
                "item_count": len(data),
                "sample_keys": list(data[0].keys()) if data and isinstance(data[0], dict) else []
            }
        elif isinstance(data, dict):
            return {
                "type": "object",
                "key_count": len(data),
                "keys": list(data.keys())[:20]  # First 20 keys
            }
        else:
            return {"type": type(data).__name__}
    except Exception as e:
        return {"error": str(e)}

# ==================== UPLOAD ENDPOINTS ====================

@router.post("/upload")
async def upload_dataset(file: UploadFile = File(...)):
    """Upload a single dataset file and store metadata in MongoDB"""
    
    ext = get_file_extension(file.filename)
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{ext}' not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    file_id = str(uuid.uuid4())
    safe_filename = f"{file_id}{ext}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)
    
    try:
        content = await file.read()
        
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB"
            )
        
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(content)
        
        # Create dataset document
        dataset_doc = {
            "id": file_id,
            "filename": file.filename,
            "stored_filename": safe_filename,
            "file_path": file_path,
            "size": len(content),
            "type": ext,
            "category": get_file_category(ext),
            "uploaded_at": datetime.now(timezone.utc).isoformat(),
            "status": "uploaded"
        }
        
        # Store in MongoDB
        await db.datasets.insert_one(dataset_doc)
        
        # Remove MongoDB _id before returning
        dataset_doc.pop("_id", None)
        
        return dataset_doc
        
    except HTTPException:
        raise
    except Exception as e:
        # Clean up file if MongoDB fails
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")

@router.post("/upload-multiple")
async def upload_multiple_datasets(files: List[UploadFile] = File(...)):
    """Upload multiple dataset files"""
    results = []
    errors = []
    
    for file in files:
        try:
            ext = get_file_extension(file.filename)
            if ext not in ALLOWED_EXTENSIONS:
                errors.append({"filename": file.filename, "error": f"File type '{ext}' not allowed"})
                continue
            
            file_id = str(uuid.uuid4())
            safe_filename = f"{file_id}{ext}"
            file_path = os.path.join(UPLOAD_DIR, safe_filename)
            
            content = await file.read()
            
            if len(content) > MAX_FILE_SIZE:
                errors.append({"filename": file.filename, "error": "File too large"})
                continue
            
            async with aiofiles.open(file_path, 'wb') as f:
                await f.write(content)
            
            dataset_doc = {
                "id": file_id,
                "filename": file.filename,
                "stored_filename": safe_filename,
                "file_path": file_path,
                "size": len(content),
                "type": ext,
                "category": get_file_category(ext),
                "uploaded_at": datetime.now(timezone.utc).isoformat(),
                "status": "uploaded"
            }
            
            await db.datasets.insert_one(dataset_doc)
            dataset_doc.pop("_id", None)
            results.append(dataset_doc)
            
        except Exception as e:
            errors.append({"filename": file.filename, "error": str(e)})
    
    return {
        "uploaded": results,
        "errors": errors,
        "total_uploaded": len(results),
        "total_errors": len(errors)
    }

# ==================== LIST ENDPOINTS ====================

@router.get("/list")
async def list_datasets(
    category: Optional[str] = Query(None, description="Filter by category: csv, json, image, text, tabular"),
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0)
):
    """List all datasets with optional filtering"""
    
    query = {}
    if category:
        query["category"] = category
    
    datasets = await db.datasets.find(query, {"_id": 0}).sort("uploaded_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.datasets.count_documents(query)
    
    return {
        "datasets": datasets,
        "total": total,
        "limit": limit,
        "skip": skip
    }

@router.get("/{dataset_id}")
async def get_dataset(dataset_id: str):
    """Get a single dataset by ID"""
    
    dataset = await db.datasets.find_one({"id": dataset_id}, {"_id": 0})
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    return dataset

# ==================== PREVIEW ENDPOINTS ====================

@router.get("/{dataset_id}/preview/csv")
async def preview_csv(
    dataset_id: str,
    rows: int = Query(100, ge=1, le=1000, description="Number of rows to preview")
):
    """Preview first N rows of a CSV file"""
    
    dataset = await db.datasets.find_one({"id": dataset_id}, {"_id": 0})
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    if dataset["category"] != "csv":
        raise HTTPException(status_code=400, detail="This endpoint is for CSV files only")
    
    file_path = dataset["file_path"]
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    
    try:
        async with aiofiles.open(file_path, 'r', encoding='utf-8') as f:
            content = await f.read()
        
        reader = csv.DictReader(StringIO(content))
        data = []
        for i, row in enumerate(reader):
            if i >= rows:
                break
            data.append(row)
        
        columns = list(data[0].keys()) if data else []
        
        return {
            "dataset_id": dataset_id,
            "filename": dataset["filename"],
            "columns": columns,
            "rows": data,
            "row_count": len(data),
            "total_rows": sum(1 for _ in csv.DictReader(StringIO(content)))
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to preview CSV: {str(e)}")

@router.get("/{dataset_id}/preview/json")
async def preview_json(
    dataset_id: str,
    max_items: int = Query(100, ge=1, le=1000, description="Max items to preview for arrays")
):
    """Preview JSON file with tree structure"""
    
    dataset = await db.datasets.find_one({"id": dataset_id}, {"_id": 0})
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    if dataset["category"] != "json":
        raise HTTPException(status_code=400, detail="This endpoint is for JSON files only")
    
    file_path = dataset["file_path"]
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    
    try:
        async with aiofiles.open(file_path, 'r', encoding='utf-8') as f:
            content = await f.read()
        
        data = json.loads(content)
        
        # Truncate large arrays for preview
        preview_data = data
        truncated = False
        if isinstance(data, list) and len(data) > max_items:
            preview_data = data[:max_items]
            truncated = True
        
        return {
            "dataset_id": dataset_id,
            "filename": dataset["filename"],
            "data": preview_data,
            "type": "array" if isinstance(data, list) else "object",
            "total_items": len(data) if isinstance(data, list) else len(data.keys()) if isinstance(data, dict) else 1,
            "truncated": truncated
        }
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to preview JSON: {str(e)}")

@router.get("/{dataset_id}/preview/image")
async def preview_image(dataset_id: str):
    """Get image file for preview (returns the actual image)"""
    
    dataset = await db.datasets.find_one({"id": dataset_id}, {"_id": 0})
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    if dataset["category"] != "image":
        raise HTTPException(status_code=400, detail="This endpoint is for image files only")
    
    file_path = dataset["file_path"]
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    
    # Determine media type
    ext = dataset["type"]
    media_types = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".webp": "image/webp"
    }
    
    return FileResponse(
        file_path,
        media_type=media_types.get(ext, "application/octet-stream"),
        filename=dataset["filename"]
    )

# ==================== STATISTICS ENDPOINTS ====================

@router.get("/{dataset_id}/stats")
async def get_dataset_stats(dataset_id: str):
    """Get statistics for a dataset"""
    
    dataset = await db.datasets.find_one({"id": dataset_id}, {"_id": 0})
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    file_path = dataset["file_path"]
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    
    base_stats = {
        "dataset_id": dataset_id,
        "filename": dataset["filename"],
        "size": dataset["size"],
        "size_formatted": format_file_size(dataset["size"]),
        "type": dataset["type"],
        "category": dataset["category"],
        "uploaded_at": dataset["uploaded_at"]
    }
    
    # Get category-specific stats
    if dataset["category"] == "csv":
        csv_stats = await get_csv_stats(file_path)
        base_stats.update(csv_stats)
    elif dataset["category"] == "json":
        json_stats = await get_json_stats(file_path)
        base_stats.update(json_stats)
    elif dataset["category"] == "image":
        try:
            from PIL import Image
            with Image.open(file_path) as img:
                base_stats["width"] = img.width
                base_stats["height"] = img.height
                base_stats["format"] = img.format
                base_stats["mode"] = img.mode
        except:
            base_stats["image_info"] = "Could not read image metadata"
    
    return base_stats

def format_file_size(size: int) -> str:
    """Format file size in human readable format"""
    if size < 1024:
        return f"{size} B"
    elif size < 1024 * 1024:
        return f"{size / 1024:.1f} KB"
    elif size < 1024 * 1024 * 1024:
        return f"{size / (1024 * 1024):.1f} MB"
    return f"{size / (1024 * 1024 * 1024):.1f} GB"

# ==================== DELETE ENDPOINT ====================

@router.delete("/{dataset_id}")
async def delete_dataset(dataset_id: str):
    """Delete a dataset"""
    
    dataset = await db.datasets.find_one({"id": dataset_id})
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    # Delete file from disk
    file_path = dataset.get("file_path")
    if file_path and os.path.exists(file_path):
        os.remove(file_path)
    
    # Delete from MongoDB
    await db.datasets.delete_one({"id": dataset_id})
    
    return {"message": "Dataset deleted successfully", "id": dataset_id}
