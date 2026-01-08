import os
import json
import csv
import uuid
from datetime import datetime, timezone
from io import StringIO
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import aiofiles

router = APIRouter()

# Will be set from server.py
db = None

UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "/app/backend/uploads")
PROCESSED_DIR = os.path.join(UPLOAD_DIR, "processed")
os.makedirs(PROCESSED_DIR, exist_ok=True)

# ==================== MODELS ====================

class FilterRequest(BaseModel):
    column: str
    operator: str  # eq, ne, gt, lt, gte, lte, contains, startswith, endswith
    value: str

class MissingValuesRequest(BaseModel):
    strategy: str  # drop, fill_mean, fill_median, fill_mode, fill_value
    columns: Optional[List[str]] = None  # None means all columns
    fill_value: Optional[str] = None

class NormalizationRequest(BaseModel):
    method: str  # minmax, zscore, robust
    columns: List[str]

class EncodingRequest(BaseModel):
    method: str  # onehot, label, ordinal
    columns: List[str]

class SplitRequest(BaseModel):
    train_ratio: float = 0.7
    val_ratio: float = 0.15
    test_ratio: float = 0.15
    shuffle: bool = True
    random_seed: Optional[int] = 42

# ==================== HELPER FUNCTIONS ====================

async def load_csv_data(dataset_id: str) -> tuple:
    """Load CSV data and return (rows, columns)"""
    dataset = await db.datasets.find_one({"id": dataset_id}, {"_id": 0})
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    if dataset["category"] != "csv":
        raise HTTPException(status_code=400, detail="Only CSV datasets are supported")
    
    file_path = dataset["file_path"]
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    
    async with aiofiles.open(file_path, 'r', encoding='utf-8') as f:
        content = await f.read()
    
    reader = csv.DictReader(StringIO(content))
    rows = list(reader)
    columns = list(rows[0].keys()) if rows else []
    
    return rows, columns, dataset

def apply_filter(rows: list, column: str, operator: str, value: str) -> list:
    """Apply a single filter to rows"""
    filtered = []
    for row in rows:
        cell = row.get(column, "")
        try:
            # Try numeric comparison
            cell_num = float(cell) if cell else None
            val_num = float(value)
            
            if operator == "eq" and cell_num == val_num:
                filtered.append(row)
            elif operator == "ne" and cell_num != val_num:
                filtered.append(row)
            elif operator == "gt" and cell_num is not None and cell_num > val_num:
                filtered.append(row)
            elif operator == "lt" and cell_num is not None and cell_num < val_num:
                filtered.append(row)
            elif operator == "gte" and cell_num is not None and cell_num >= val_num:
                filtered.append(row)
            elif operator == "lte" and cell_num is not None and cell_num <= val_num:
                filtered.append(row)
        except (ValueError, TypeError):
            # String comparison
            cell_str = str(cell).lower()
            val_str = str(value).lower()
            
            if operator == "eq" and cell_str == val_str:
                filtered.append(row)
            elif operator == "ne" and cell_str != val_str:
                filtered.append(row)
            elif operator == "contains" and val_str in cell_str:
                filtered.append(row)
            elif operator == "startswith" and cell_str.startswith(val_str):
                filtered.append(row)
            elif operator == "endswith" and cell_str.endswith(val_str):
                filtered.append(row)
    
    return filtered

def get_numeric_values(rows: list, column: str) -> list:
    """Extract numeric values from a column"""
    values = []
    for row in rows:
        try:
            val = float(row.get(column, ""))
            values.append(val)
        except (ValueError, TypeError):
            pass
    return values

# ==================== EXPLORATION ENDPOINTS ====================

@router.post("/{dataset_id}/filter")
async def filter_data(
    dataset_id: str,
    filters: List[FilterRequest],
    limit: int = Query(100, ge=1, le=1000)
):
    """Filter dataset based on conditions"""
    rows, columns, dataset = await load_csv_data(dataset_id)
    
    filtered_rows = rows
    for f in filters:
        if f.column not in columns:
            raise HTTPException(status_code=400, detail=f"Column '{f.column}' not found")
        filtered_rows = apply_filter(filtered_rows, f.column, f.operator, f.value)
    
    return {
        "dataset_id": dataset_id,
        "original_count": len(rows),
        "filtered_count": len(filtered_rows),
        "columns": columns,
        "rows": filtered_rows[:limit],
        "truncated": len(filtered_rows) > limit
    }

@router.get("/{dataset_id}/search")
async def search_data(
    dataset_id: str,
    q: str = Query(..., min_length=1),
    column: Optional[str] = None,
    limit: int = Query(100, ge=1, le=1000)
):
    """Search for text across all columns or specific column"""
    rows, columns, dataset = await load_csv_data(dataset_id)
    
    if column and column not in columns:
        raise HTTPException(status_code=400, detail=f"Column '{column}' not found")
    
    search_columns = [column] if column else columns
    q_lower = q.lower()
    
    matching_rows = []
    for row in rows:
        for col in search_columns:
            if q_lower in str(row.get(col, "")).lower():
                matching_rows.append(row)
                break
    
    return {
        "dataset_id": dataset_id,
        "query": q,
        "column": column,
        "match_count": len(matching_rows),
        "columns": columns,
        "rows": matching_rows[:limit],
        "truncated": len(matching_rows) > limit
    }

@router.get("/{dataset_id}/unique/{column}")
async def get_unique_values(dataset_id: str, column: str):
    """Get unique values for a column"""
    rows, columns, dataset = await load_csv_data(dataset_id)
    
    if column not in columns:
        raise HTTPException(status_code=400, detail=f"Column '{column}' not found")
    
    values = [row.get(column, "") for row in rows]
    unique = list(set(values))
    
    return {
        "column": column,
        "unique_count": len(unique),
        "values": sorted(unique)[:100],  # Limit to 100 unique values
        "truncated": len(unique) > 100
    }

# ==================== CHART DATA ENDPOINTS ====================

@router.get("/{dataset_id}/chart/histogram/{column}")
async def get_histogram_data(
    dataset_id: str,
    column: str,
    bins: int = Query(10, ge=2, le=50)
):
    """Get histogram data for a numeric column"""
    rows, columns, dataset = await load_csv_data(dataset_id)
    
    if column not in columns:
        raise HTTPException(status_code=400, detail=f"Column '{column}' not found")
    
    values = get_numeric_values(rows, column)
    
    if not values:
        raise HTTPException(status_code=400, detail=f"Column '{column}' has no numeric values")
    
    min_val, max_val = min(values), max(values)
    bin_width = (max_val - min_val) / bins if max_val > min_val else 1
    
    histogram = []
    for i in range(bins):
        bin_start = min_val + i * bin_width
        bin_end = bin_start + bin_width
        count = sum(1 for v in values if bin_start <= v < bin_end or (i == bins - 1 and v == max_val))
        histogram.append({
            "bin": f"{bin_start:.2f}-{bin_end:.2f}",
            "start": bin_start,
            "end": bin_end,
            "count": count
        })
    
    return {
        "column": column,
        "total_values": len(values),
        "min": min_val,
        "max": max_val,
        "bins": bins,
        "data": histogram
    }

@router.get("/{dataset_id}/chart/bar/{column}")
async def get_bar_chart_data(
    dataset_id: str,
    column: str,
    top_n: int = Query(10, ge=1, le=50)
):
    """Get bar chart data for categorical column (value counts)"""
    rows, columns, dataset = await load_csv_data(dataset_id)
    
    if column not in columns:
        raise HTTPException(status_code=400, detail=f"Column '{column}' not found")
    
    # Count occurrences
    counts = {}
    for row in rows:
        val = row.get(column, "") or "(empty)"
        counts[val] = counts.get(val, 0) + 1
    
    # Sort by count and take top N
    sorted_counts = sorted(counts.items(), key=lambda x: x[1], reverse=True)[:top_n]
    
    return {
        "column": column,
        "total_values": len(rows),
        "unique_count": len(counts),
        "data": [{"name": k, "count": v} for k, v in sorted_counts]
    }

@router.get("/{dataset_id}/chart/scatter")
async def get_scatter_data(
    dataset_id: str,
    x_column: str,
    y_column: str,
    limit: int = Query(500, ge=1, le=1000)
):
    """Get scatter plot data for two numeric columns"""
    rows, columns, dataset = await load_csv_data(dataset_id)
    
    if x_column not in columns or y_column not in columns:
        raise HTTPException(status_code=400, detail="Column not found")
    
    data = []
    for row in rows[:limit]:
        try:
            x = float(row.get(x_column, ""))
            y = float(row.get(y_column, ""))
            data.append({"x": x, "y": y})
        except (ValueError, TypeError):
            pass
    
    return {
        "x_column": x_column,
        "y_column": y_column,
        "point_count": len(data),
        "data": data
    }

# ==================== PREPROCESSING ENDPOINTS ====================

@router.post("/{dataset_id}/preprocess/missing")
async def handle_missing_values(dataset_id: str, request: MissingValuesRequest):
    """Handle missing values in dataset"""
    rows, columns, dataset = await load_csv_data(dataset_id)
    
    target_columns = request.columns or columns
    for col in target_columns:
        if col not in columns:
            raise HTTPException(status_code=400, detail=f"Column '{col}' not found")
    
    processed_rows = []
    removed_count = 0
    
    # Calculate fill values if needed
    fill_values = {}
    if request.strategy in ["fill_mean", "fill_median", "fill_mode"]:
        for col in target_columns:
            numeric_vals = get_numeric_values(rows, col)
            if request.strategy == "fill_mean" and numeric_vals:
                fill_values[col] = sum(numeric_vals) / len(numeric_vals)
            elif request.strategy == "fill_median" and numeric_vals:
                sorted_vals = sorted(numeric_vals)
                mid = len(sorted_vals) // 2
                fill_values[col] = sorted_vals[mid] if len(sorted_vals) % 2 else (sorted_vals[mid-1] + sorted_vals[mid]) / 2
            elif request.strategy == "fill_mode":
                vals = [row.get(col, "") for row in rows if row.get(col, "").strip()]
                if vals:
                    fill_values[col] = max(set(vals), key=vals.count)
    
    for row in rows:
        has_missing = any(not row.get(col, "").strip() for col in target_columns)
        
        if request.strategy == "drop" and has_missing:
            removed_count += 1
            continue
        
        new_row = row.copy()
        for col in target_columns:
            if not new_row.get(col, "").strip():
                if request.strategy == "fill_value":
                    new_row[col] = request.fill_value or ""
                elif col in fill_values:
                    new_row[col] = str(fill_values[col])
        
        processed_rows.append(new_row)
    
    # Save processed data
    processed_id = str(uuid.uuid4())
    processed_filename = f"{processed_id}_missing.csv"
    processed_path = os.path.join(PROCESSED_DIR, processed_filename)
    
    async with aiofiles.open(processed_path, 'w', encoding='utf-8') as f:
        if processed_rows:
            writer_content = StringIO()
            writer = csv.DictWriter(writer_content, fieldnames=columns)
            writer.writeheader()
            writer.writerows(processed_rows)
            await f.write(writer_content.getvalue())
    
    # Store processed dataset in MongoDB
    processed_doc = {
        "id": processed_id,
        "filename": f"{dataset['filename']}_processed",
        "stored_filename": processed_filename,
        "file_path": processed_path,
        "size": os.path.getsize(processed_path),
        "type": ".csv",
        "category": "csv",
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "status": "processed",
        "source_dataset": dataset_id,
        "preprocessing": {"type": "missing_values", "strategy": request.strategy}
    }
    await db.datasets.insert_one(processed_doc)
    processed_doc.pop("_id", None)
    
    return {
        "original_rows": len(rows),
        "processed_rows": len(processed_rows),
        "removed_rows": removed_count,
        "strategy": request.strategy,
        "processed_dataset": processed_doc
    }

@router.post("/{dataset_id}/preprocess/normalize")
async def normalize_data(dataset_id: str, request: NormalizationRequest):
    """Normalize numeric columns"""
    rows, columns, dataset = await load_csv_data(dataset_id)
    
    for col in request.columns:
        if col not in columns:
            raise HTTPException(status_code=400, detail=f"Column '{col}' not found")
    
    # Calculate normalization parameters
    norm_params = {}
    for col in request.columns:
        values = get_numeric_values(rows, col)
        if not values:
            raise HTTPException(status_code=400, detail=f"Column '{col}' has no numeric values")
        
        if request.method == "minmax":
            norm_params[col] = {"min": min(values), "max": max(values)}
        elif request.method == "zscore":
            mean = sum(values) / len(values)
            std = (sum((x - mean) ** 2 for x in values) / len(values)) ** 0.5
            norm_params[col] = {"mean": mean, "std": std if std > 0 else 1}
        elif request.method == "robust":
            sorted_vals = sorted(values)
            q1 = sorted_vals[len(sorted_vals) // 4]
            q3 = sorted_vals[3 * len(sorted_vals) // 4]
            median = sorted_vals[len(sorted_vals) // 2]
            iqr = q3 - q1 if q3 > q1 else 1
            norm_params[col] = {"median": median, "iqr": iqr}
    
    # Apply normalization
    processed_rows = []
    for row in rows:
        new_row = row.copy()
        for col in request.columns:
            try:
                val = float(row.get(col, ""))
                params = norm_params[col]
                
                if request.method == "minmax":
                    range_val = params["max"] - params["min"]
                    new_val = (val - params["min"]) / range_val if range_val > 0 else 0
                elif request.method == "zscore":
                    new_val = (val - params["mean"]) / params["std"]
                elif request.method == "robust":
                    new_val = (val - params["median"]) / params["iqr"]
                
                new_row[col] = f"{new_val:.6f}"
            except (ValueError, TypeError):
                pass
        processed_rows.append(new_row)
    
    # Save processed data
    processed_id = str(uuid.uuid4())
    processed_filename = f"{processed_id}_normalized.csv"
    processed_path = os.path.join(PROCESSED_DIR, processed_filename)
    
    async with aiofiles.open(processed_path, 'w', encoding='utf-8') as f:
        writer_content = StringIO()
        writer = csv.DictWriter(writer_content, fieldnames=columns)
        writer.writeheader()
        writer.writerows(processed_rows)
        await f.write(writer_content.getvalue())
    
    processed_doc = {
        "id": processed_id,
        "filename": f"{dataset['filename']}_normalized",
        "stored_filename": processed_filename,
        "file_path": processed_path,
        "size": os.path.getsize(processed_path),
        "type": ".csv",
        "category": "csv",
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "status": "processed",
        "source_dataset": dataset_id,
        "preprocessing": {"type": "normalization", "method": request.method, "columns": request.columns}
    }
    await db.datasets.insert_one(processed_doc)
    processed_doc.pop("_id", None)
    
    return {
        "method": request.method,
        "columns": request.columns,
        "parameters": norm_params,
        "processed_dataset": processed_doc
    }

@router.post("/{dataset_id}/preprocess/encode")
async def encode_data(dataset_id: str, request: EncodingRequest):
    """Encode categorical columns"""
    rows, columns, dataset = await load_csv_data(dataset_id)
    
    for col in request.columns:
        if col not in columns:
            raise HTTPException(status_code=400, detail=f"Column '{col}' not found")
    
    new_columns = list(columns)
    processed_rows = []
    encoding_info = {}
    
    if request.method == "label":
        # Label encoding
        for col in request.columns:
            unique_vals = sorted(set(row.get(col, "") for row in rows))
            encoding_info[col] = {val: idx for idx, val in enumerate(unique_vals)}
        
        for row in rows:
            new_row = row.copy()
            for col in request.columns:
                new_row[col] = str(encoding_info[col].get(row.get(col, ""), 0))
            processed_rows.append(new_row)
    
    elif request.method == "onehot":
        # One-hot encoding
        for col in request.columns:
            unique_vals = sorted(set(row.get(col, "") for row in rows))
            encoding_info[col] = unique_vals
            for val in unique_vals:
                new_col = f"{col}_{val}"
                if new_col not in new_columns:
                    new_columns.append(new_col)
        
        for row in rows:
            new_row = {k: v for k, v in row.items() if k not in request.columns}
            for col in request.columns:
                val = row.get(col, "")
                for unique_val in encoding_info[col]:
                    new_row[f"{col}_{unique_val}"] = "1" if val == unique_val else "0"
            processed_rows.append(new_row)
        
        # Remove original columns from new_columns
        new_columns = [c for c in new_columns if c not in request.columns]
    
    elif request.method == "ordinal":
        # Same as label encoding but preserves order
        for col in request.columns:
            unique_vals = sorted(set(row.get(col, "") for row in rows))
            encoding_info[col] = {val: idx for idx, val in enumerate(unique_vals)}
        
        for row in rows:
            new_row = row.copy()
            for col in request.columns:
                new_row[col] = str(encoding_info[col].get(row.get(col, ""), 0))
            processed_rows.append(new_row)
    
    # Save processed data
    processed_id = str(uuid.uuid4())
    processed_filename = f"{processed_id}_encoded.csv"
    processed_path = os.path.join(PROCESSED_DIR, processed_filename)
    
    final_columns = new_columns if request.method == "onehot" else columns
    
    async with aiofiles.open(processed_path, 'w', encoding='utf-8') as f:
        writer_content = StringIO()
        writer = csv.DictWriter(writer_content, fieldnames=final_columns)
        writer.writeheader()
        writer.writerows(processed_rows)
        await f.write(writer_content.getvalue())
    
    processed_doc = {
        "id": processed_id,
        "filename": f"{dataset['filename']}_encoded",
        "stored_filename": processed_filename,
        "file_path": processed_path,
        "size": os.path.getsize(processed_path),
        "type": ".csv",
        "category": "csv",
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "status": "processed",
        "source_dataset": dataset_id,
        "preprocessing": {"type": "encoding", "method": request.method, "columns": request.columns}
    }
    await db.datasets.insert_one(processed_doc)
    processed_doc.pop("_id", None)
    
    return {
        "method": request.method,
        "columns": request.columns,
        "encoding_map": encoding_info,
        "new_columns": final_columns,
        "processed_dataset": processed_doc
    }

@router.post("/{dataset_id}/preprocess/split")
async def split_data(dataset_id: str, request: SplitRequest):
    """Split dataset into train/val/test sets"""
    rows, columns, dataset = await load_csv_data(dataset_id)
    
    if abs(request.train_ratio + request.val_ratio + request.test_ratio - 1.0) > 0.01:
        raise HTTPException(status_code=400, detail="Ratios must sum to 1.0")
    
    import random
    if request.shuffle:
        random.seed(request.random_seed)
        random.shuffle(rows)
    
    n = len(rows)
    train_end = int(n * request.train_ratio)
    val_end = train_end + int(n * request.val_ratio)
    
    splits = {
        "train": rows[:train_end],
        "val": rows[train_end:val_end],
        "test": rows[val_end:]
    }
    
    results = {}
    for split_name, split_rows in splits.items():
        if not split_rows:
            continue
            
        split_id = str(uuid.uuid4())
        split_filename = f"{split_id}_{split_name}.csv"
        split_path = os.path.join(PROCESSED_DIR, split_filename)
        
        async with aiofiles.open(split_path, 'w', encoding='utf-8') as f:
            writer_content = StringIO()
            writer = csv.DictWriter(writer_content, fieldnames=columns)
            writer.writeheader()
            writer.writerows(split_rows)
            await f.write(writer_content.getvalue())
        
        split_doc = {
            "id": split_id,
            "filename": f"{dataset['filename']}_{split_name}",
            "stored_filename": split_filename,
            "file_path": split_path,
            "size": os.path.getsize(split_path),
            "type": ".csv",
            "category": "csv",
            "uploaded_at": datetime.now(timezone.utc).isoformat(),
            "status": "processed",
            "source_dataset": dataset_id,
            "preprocessing": {"type": "split", "split_name": split_name}
        }
        await db.datasets.insert_one(split_doc)
        split_doc.pop("_id", None)
        
        results[split_name] = {
            "rows": len(split_rows),
            "dataset": split_doc
        }
    
    return {
        "original_rows": n,
        "ratios": {
            "train": request.train_ratio,
            "val": request.val_ratio,
            "test": request.test_ratio
        },
        "splits": results
    }

# ==================== EXPORT ENDPOINTS ====================

@router.get("/{dataset_id}/export")
async def export_dataset(
    dataset_id: str,
    format: str = Query("csv", enum=["csv", "json"])
):
    """Export dataset in specified format"""
    rows, columns, dataset = await load_csv_data(dataset_id)
    
    if format == "csv":
        output = StringIO()
        writer = csv.DictWriter(output, fieldnames=columns)
        writer.writeheader()
        writer.writerows(rows)
        content = output.getvalue()
        media_type = "text/csv"
        filename = f"{dataset['filename']}"
    else:
        content = json.dumps(rows, indent=2)
        media_type = "application/json"
        filename = f"{os.path.splitext(dataset['filename'])[0]}.json"
    
    return StreamingResponse(
        iter([content]),
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/{dataset_id}/export/filtered")
async def export_filtered_data(
    dataset_id: str,
    column: str,
    operator: str,
    value: str,
    format: str = Query("csv", enum=["csv", "json"])
):
    """Export filtered dataset"""
    rows, columns, dataset = await load_csv_data(dataset_id)
    
    if column not in columns:
        raise HTTPException(status_code=400, detail=f"Column '{column}' not found")
    
    filtered_rows = apply_filter(rows, column, operator, value)
    
    if format == "csv":
        output = StringIO()
        writer = csv.DictWriter(output, fieldnames=columns)
        writer.writeheader()
        writer.writerows(filtered_rows)
        content = output.getvalue()
        media_type = "text/csv"
        filename = f"{dataset['filename']}_filtered.csv"
    else:
        content = json.dumps(filtered_rows, indent=2)
        media_type = "application/json"
        filename = f"{os.path.splitext(dataset['filename'])[0]}_filtered.json"
    
    return StreamingResponse(
        iter([content]),
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
