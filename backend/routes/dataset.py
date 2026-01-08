import os
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import List
import aiofiles

router = APIRouter()

UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "/app/backend/uploads")

# Ensure upload directory exists
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Allowed file extensions
ALLOWED_EXTENSIONS = {".csv", ".json", ".txt", ".xlsx", ".parquet", ".png", ".jpg", ".jpeg"}
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB

def get_file_extension(filename: str) -> str:
    return os.path.splitext(filename)[1].lower()

@router.post("/upload")
async def upload_dataset(file: UploadFile = File(...)):
    """Upload a single dataset file"""
    
    # Validate file extension
    ext = get_file_extension(file.filename)
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{ext}' not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Generate unique filename
    file_id = str(uuid.uuid4())
    safe_filename = f"{file_id}{ext}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)
    
    # Save file
    try:
        content = await file.read()
        
        # Check file size
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB"
            )
        
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(content)
        
        return {
            "id": file_id,
            "filename": file.filename,
            "stored_filename": safe_filename,
            "size": len(content),
            "type": ext,
            "uploaded_at": datetime.now(timezone.utc).isoformat(),
            "status": "uploaded"
        }
    except HTTPException:
        raise
    except Exception as e:
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
            
            results.append({
                "id": file_id,
                "filename": file.filename,
                "stored_filename": safe_filename,
                "size": len(content),
                "type": ext,
                "uploaded_at": datetime.now(timezone.utc).isoformat(),
                "status": "uploaded"
            })
        except Exception as e:
            errors.append({"filename": file.filename, "error": str(e)})
    
    return {
        "uploaded": results,
        "errors": errors,
        "total_uploaded": len(results),
        "total_errors": len(errors)
    }
