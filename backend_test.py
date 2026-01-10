#!/usr/bin/env python3
"""
Backend API Tests for AI/ML Platform Data Management Features (Parts 2-15)
Tests dataset storage, listing, preview, statistics, deletion, exploration, charts, preprocessing, and export functionality.
"""

import requests
import os
import tempfile
import json
from pathlib import Path
from PIL import Image
import io

# Use external URL for testing
BACKEND_URL = "https://promptml.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

print(f"Testing backend at: {API_BASE}")

def test_health_endpoint():
    """Test the health check endpoint"""
    print("\n=== Testing Health Endpoint ===")
    try:
        response = requests.get(f"{API_BASE}/health", timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == "healthy":
                print("✅ Health endpoint working correctly")
                return True
            else:
                print("❌ Health endpoint returned unexpected status")
                return False
        else:
            print(f"❌ Health endpoint failed with status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health endpoint error: {str(e)}")
        return False

def create_test_csv():
    """Create a test CSV file with realistic employee data"""
    csv_content = """name,age,department,salary,city
John Doe,30,Engineering,75000,New York
Jane Smith,25,Marketing,65000,Los Angeles
Bob Johnson,35,Engineering,85000,Chicago
Alice Brown,28,Sales,70000,Boston
Charlie Wilson,32,HR,60000,Seattle"""
    
    temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False)
    temp_file.write(csv_content)
    temp_file.close()
    return temp_file.name

def create_test_json():
    """Create a test JSON file with realistic product data"""
    json_content = {
        "products": [
            {
                "id": 1,
                "name": "Laptop Pro",
                "price": 1299.99,
                "category": "Electronics",
                "specs": {
                    "cpu": "Intel i7",
                    "ram": "16GB",
                    "storage": "512GB SSD"
                }
            },
            {
                "id": 2,
                "name": "Wireless Mouse",
                "price": 29.99,
                "category": "Accessories",
                "specs": {
                    "connectivity": "Bluetooth",
                    "battery": "AA",
                    "dpi": 1600
                }
            }
        ],
        "metadata": {
            "total_count": 2,
            "last_updated": "2024-01-08"
        }
    }
    
    temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False)
    json.dump(json_content, temp_file, indent=2)
    temp_file.close()
    return temp_file.name

def create_test_image():
    """Create a test PNG image"""
    # Create a simple 400x300 colored image
    img = Image.new('RGB', (400, 300), color='lightblue')
    
    temp_file = tempfile.NamedTemporaryFile(suffix='.png', delete=False)
    img.save(temp_file.name, 'PNG')
    temp_file.close()
    return temp_file.name

# ==================== PART 2: DATASET STORAGE TESTS ====================

def test_dataset_storage():
    """Test dataset upload and MongoDB storage verification"""
    print("\n=== PART 2: Testing Dataset Storage ===")
    
    # Upload CSV file
    csv_file = create_test_csv()
    csv_id = None
    
    try:
        with open(csv_file, 'rb') as f:
            files = {'file': ('employees.csv', f, 'text/csv')}
            response = requests.post(f"{API_BASE}/datasets/upload", files=files, timeout=30)
        
        print(f"CSV Upload Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            csv_id = data.get('id')
            print(f"✅ CSV uploaded successfully - ID: {csv_id}")
            
            # Verify required fields
            required_fields = ['id', 'filename', 'stored_filename', 'size', 'type', 'category']
            if all(field in data for field in required_fields):
                print("✅ All required metadata fields present")
                return True, csv_id
            else:
                print("❌ Missing required metadata fields")
                return False, None
        else:
            print(f"❌ CSV upload failed: {response.text}")
            return False, None
            
    except Exception as e:
        print(f"❌ Dataset storage error: {str(e)}")
        return False, None
    finally:
        os.unlink(csv_file)

# ==================== PART 3: DATASET LISTING TESTS ====================

def test_dataset_listing():
    """Test dataset listing with filtering"""
    print("\n=== PART 3: Testing Dataset Listing ===")
    
    results = {}
    
    # Test 1: List all datasets
    try:
        response = requests.get(f"{API_BASE}/datasets/list", timeout=10)
        print(f"List All Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if 'datasets' in data and 'total' in data:
                print(f"✅ List all datasets: {data['total']} total datasets")
                results['list_all'] = True
            else:
                print("❌ List all: Missing required response fields")
                results['list_all'] = False
        else:
            print(f"❌ List all failed: {response.text}")
            results['list_all'] = False
    except Exception as e:
        print(f"❌ List all error: {str(e)}")
        results['list_all'] = False
    
    # Test 2: Filter by CSV
    try:
        response = requests.get(f"{API_BASE}/datasets/list?category=csv", timeout=10)
        print(f"Filter CSV Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            csv_datasets = data.get('datasets', [])
            csv_only = all(d.get('category') == 'csv' for d in csv_datasets)
            if csv_only:
                print(f"✅ CSV filter working: {len(csv_datasets)} CSV datasets")
                results['filter_csv'] = True
            else:
                print("❌ CSV filter returned non-CSV datasets")
                results['filter_csv'] = False
        else:
            print(f"❌ CSV filter failed: {response.text}")
            results['filter_csv'] = False
    except Exception as e:
        print(f"❌ CSV filter error: {str(e)}")
        results['filter_csv'] = False
    
    # Test 3: Filter by JSON
    try:
        response = requests.get(f"{API_BASE}/datasets/list?category=json", timeout=10)
        print(f"Filter JSON Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            json_datasets = data.get('datasets', [])
            json_only = all(d.get('category') == 'json' for d in json_datasets)
            print(f"✅ JSON filter working: {len(json_datasets)} JSON datasets")
            results['filter_json'] = True
        else:
            print(f"❌ JSON filter failed: {response.text}")
            results['filter_json'] = False
    except Exception as e:
        print(f"❌ JSON filter error: {str(e)}")
        results['filter_json'] = False
    
    # Test 4: Filter by Image
    try:
        response = requests.get(f"{API_BASE}/datasets/list?category=image", timeout=10)
        print(f"Filter Image Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            image_datasets = data.get('datasets', [])
            image_only = all(d.get('category') == 'image' for d in image_datasets)
            print(f"✅ Image filter working: {len(image_datasets)} image datasets")
            results['filter_image'] = True
        else:
            print(f"❌ Image filter failed: {response.text}")
            results['filter_image'] = False
    except Exception as e:
        print(f"❌ Image filter error: {str(e)}")
        results['filter_image'] = False
    
    return all(results.values()), results

# ==================== PART 4: CSV PREVIEW TESTS ====================

def test_csv_preview():
    """Test CSV preview functionality"""
    print("\n=== PART 4: Testing CSV Preview ===")
    
    # First get a CSV dataset ID
    try:
        response = requests.get(f"{API_BASE}/datasets/list?category=csv", timeout=10)
        if response.status_code != 200:
            print("❌ Cannot get CSV datasets for preview test")
            return False
        
        csv_datasets = response.json().get('datasets', [])
        if not csv_datasets:
            print("❌ No CSV datasets found for preview test")
            return False
        
        csv_id = csv_datasets[0]['id']
        print(f"Testing CSV preview with ID: {csv_id}")
        
        # Test CSV preview with 3 rows
        response = requests.get(f"{API_BASE}/datasets/{csv_id}/preview/csv?rows=3", timeout=10)
        print(f"CSV Preview Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            required_fields = ['dataset_id', 'filename', 'columns', 'rows', 'row_count']
            
            if all(field in data for field in required_fields):
                print(f"✅ CSV preview working: {len(data['columns'])} columns, {data['row_count']} rows")
                print(f"   Columns: {data['columns']}")
                return True
            else:
                print("❌ CSV preview missing required fields")
                return False
        else:
            print(f"❌ CSV preview failed: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ CSV preview error: {str(e)}")
        return False

# ==================== PART 5: IMAGE PREVIEW TESTS ====================

def test_image_preview():
    """Test image preview functionality"""
    print("\n=== PART 5: Testing Image Preview ===")
    
    # First upload an image for testing
    image_file = create_test_image()
    image_id = None
    
    try:
        # Upload image
        with open(image_file, 'rb') as f:
            files = {'file': ('test_image.png', f, 'image/png')}
            response = requests.post(f"{API_BASE}/datasets/upload", files=files, timeout=30)
        
        if response.status_code != 200:
            print(f"❌ Failed to upload test image: {response.text}")
            return False
        
        image_id = response.json()['id']
        print(f"Uploaded test image with ID: {image_id}")
        
        # Test image preview
        response = requests.get(f"{API_BASE}/datasets/{image_id}/preview/image", timeout=10)
        print(f"Image Preview Status: {response.status_code}")
        
        if response.status_code == 200:
            content_type = response.headers.get('content-type', '')
            if content_type.startswith('image/'):
                print(f"✅ Image preview working: Content-Type: {content_type}")
                print(f"   Image size: {len(response.content)} bytes")
                return True
            else:
                print(f"❌ Image preview returned wrong content type: {content_type}")
                return False
        else:
            print(f"❌ Image preview failed: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Image preview error: {str(e)}")
        return False
    finally:
        os.unlink(image_file)
        # Clean up uploaded image
        if image_id:
            try:
                requests.delete(f"{API_BASE}/datasets/{image_id}")
            except:
                pass

# ==================== PART 6: JSON PREVIEW TESTS ====================

def test_json_preview():
    """Test JSON preview functionality"""
    print("\n=== PART 6: Testing JSON Preview ===")
    
    # First upload a JSON file for testing
    json_file = create_test_json()
    json_id = None
    
    try:
        # Upload JSON
        with open(json_file, 'rb') as f:
            files = {'file': ('products.json', f, 'application/json')}
            response = requests.post(f"{API_BASE}/datasets/upload", files=files, timeout=30)
        
        if response.status_code != 200:
            print(f"❌ Failed to upload test JSON: {response.text}")
            return False
        
        json_id = response.json()['id']
        print(f"Uploaded test JSON with ID: {json_id}")
        
        # Test JSON preview
        response = requests.get(f"{API_BASE}/datasets/{json_id}/preview/json", timeout=10)
        print(f"JSON Preview Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            required_fields = ['dataset_id', 'filename', 'data', 'type', 'total_items']
            
            if all(field in data for field in required_fields):
                print(f"✅ JSON preview working: Type: {data['type']}, Items: {data['total_items']}")
                return True
            else:
                print("❌ JSON preview missing required fields")
                return False
        else:
            print(f"❌ JSON preview failed: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ JSON preview error: {str(e)}")
        return False
    finally:
        os.unlink(json_file)
        # Clean up uploaded JSON
        if json_id:
            try:
                requests.delete(f"{API_BASE}/datasets/{json_id}")
            except:
                pass

# ==================== PART 7: STATISTICS TESTS ====================

def test_dataset_statistics():
    """Test dataset statistics functionality"""
    print("\n=== PART 7: Testing Dataset Statistics ===")
    
    results = {}
    
    # Test CSV statistics
    try:
        response = requests.get(f"{API_BASE}/datasets/list?category=csv", timeout=10)
        if response.status_code == 200:
            csv_datasets = response.json().get('datasets', [])
            if csv_datasets:
                csv_id = csv_datasets[0]['id']
                
                response = requests.get(f"{API_BASE}/datasets/{csv_id}/stats", timeout=10)
                print(f"CSV Stats Status: {response.status_code}")
                
                if response.status_code == 200:
                    data = response.json()
                    csv_fields = ['row_count', 'column_count', 'columns', 'column_stats']
                    if any(field in data for field in csv_fields):
                        print(f"✅ CSV stats working: {data.get('row_count', 'N/A')} rows, {data.get('column_count', 'N/A')} columns")
                        results['csv_stats'] = True
                    else:
                        print("❌ CSV stats missing statistical fields")
                        results['csv_stats'] = False
                else:
                    print(f"❌ CSV stats failed: {response.text}")
                    results['csv_stats'] = False
            else:
                print("⚠️ No CSV datasets for stats test")
                results['csv_stats'] = True  # Skip if no data
    except Exception as e:
        print(f"❌ CSV stats error: {str(e)}")
        results['csv_stats'] = False
    
    # Test JSON statistics
    json_file = create_test_json()
    json_id = None
    
    try:
        # Upload JSON for stats test
        with open(json_file, 'rb') as f:
            files = {'file': ('stats_test.json', f, 'application/json')}
            response = requests.post(f"{API_BASE}/datasets/upload", files=files, timeout=30)
        
        if response.status_code == 200:
            json_id = response.json()['id']
            
            response = requests.get(f"{API_BASE}/datasets/{json_id}/stats", timeout=10)
            print(f"JSON Stats Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                json_fields = ['type', 'item_count', 'key_count']
                if any(field in data for field in json_fields):
                    print(f"✅ JSON stats working: Type: {data.get('type', 'N/A')}")
                    results['json_stats'] = True
                else:
                    print("❌ JSON stats missing statistical fields")
                    results['json_stats'] = False
            else:
                print(f"❌ JSON stats failed: {response.text}")
                results['json_stats'] = False
        else:
            print("❌ Failed to upload JSON for stats test")
            results['json_stats'] = False
            
    except Exception as e:
        print(f"❌ JSON stats error: {str(e)}")
        results['json_stats'] = False
    finally:
        os.unlink(json_file)
        if json_id:
            try:
                requests.delete(f"{API_BASE}/datasets/{json_id}")
            except:
                pass
    
    # Test Image statistics
    image_file = create_test_image()
    image_id = None
    
    try:
        # Upload image for stats test
        with open(image_file, 'rb') as f:
            files = {'file': ('stats_test.png', f, 'image/png')}
            response = requests.post(f"{API_BASE}/datasets/upload", files=files, timeout=30)
        
        if response.status_code == 200:
            image_id = response.json()['id']
            
            response = requests.get(f"{API_BASE}/datasets/{image_id}/stats", timeout=10)
            print(f"Image Stats Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                image_fields = ['width', 'height', 'format']
                if any(field in data for field in image_fields):
                    print(f"✅ Image stats working: {data.get('width', 'N/A')}x{data.get('height', 'N/A')} {data.get('format', 'N/A')}")
                    results['image_stats'] = True
                else:
                    print("❌ Image stats missing statistical fields")
                    results['image_stats'] = False
            else:
                print(f"❌ Image stats failed: {response.text}")
                results['image_stats'] = False
        else:
            print("❌ Failed to upload image for stats test")
            results['image_stats'] = False
            
    except Exception as e:
        print(f"❌ Image stats error: {str(e)}")
        results['image_stats'] = False
    finally:
        os.unlink(image_file)
        if image_id:
            try:
                requests.delete(f"{API_BASE}/datasets/{image_id}")
            except:
                pass
    
    return all(results.values()), results

# ==================== DELETE FUNCTIONALITY TESTS ====================

def test_dataset_deletion():
    """Test dataset deletion functionality"""
    print("\n=== Testing Dataset Deletion ===")
    
    # Upload a temporary file for deletion test
    csv_file = create_test_csv()
    
    try:
        # Upload file
        with open(csv_file, 'rb') as f:
            files = {'file': ('temp_delete.csv', f, 'text/csv')}
            response = requests.post(f"{API_BASE}/datasets/upload", files=files, timeout=30)
        
        if response.status_code != 200:
            print(f"❌ Failed to upload file for deletion test: {response.text}")
            return False
        
        dataset_id = response.json()['id']
        print(f"Uploaded temporary file with ID: {dataset_id}")
        
        # Delete the file
        response = requests.delete(f"{API_BASE}/datasets/{dataset_id}", timeout=10)
        print(f"Delete Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if 'message' in data and dataset_id in str(data):
                print("✅ Dataset deletion successful")
                
                # Verify file is actually deleted
                response = requests.get(f"{API_BASE}/datasets/{dataset_id}", timeout=10)
                if response.status_code == 404:
                    print("✅ Dataset properly removed from database")
                    return True
                else:
                    print("❌ Dataset still exists in database after deletion")
                    return False
            else:
                print("❌ Delete response missing confirmation")
                return False
        else:
            print(f"❌ Dataset deletion failed: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Dataset deletion error: {str(e)}")
        return False
    finally:
        os.unlink(csv_file)

def create_test_csv_with_missing():
    """Create a test CSV file with missing values and mixed data types for preprocessing tests"""
    csv_content = """name,age,department,salary,city,experience
John Doe,30,Engineering,75000,New York,5
Jane Smith,,Marketing,65000,Los Angeles,3
Bob Johnson,35,Engineering,,Chicago,7
Alice Brown,28,Sales,70000,,2
Charlie Wilson,32,HR,60000,Seattle,
Mike Davis,45,Engineering,95000,Boston,10
Sarah Lee,29,,55000,Portland,4
Tom Wilson,,Marketing,68000,Denver,6"""
    
    temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False)
    temp_file.write(csv_content)
    temp_file.close()
    return temp_file.name

# ==================== PART 9: DATA EXPLORATION TESTS ====================

def test_data_exploration():
    """Test data exploration features - filtering, search, unique values"""
    print("\n=== PART 9: Testing Data Exploration ===")
    
    # First get a CSV dataset ID
    try:
        response = requests.get(f"{API_BASE}/datasets/list?category=csv", timeout=10)
        if response.status_code != 200:
            print("❌ Cannot get CSV datasets for exploration test")
            return False
        
        csv_datasets = response.json().get('datasets', [])
        if not csv_datasets:
            # Upload a test CSV for exploration
            csv_file = create_test_csv_with_missing()
            try:
                with open(csv_file, 'rb') as f:
                    files = {'file': ('exploration_test.csv', f, 'text/csv')}
                    response = requests.post(f"{API_BASE}/datasets/upload", files=files, timeout=30)
                
                if response.status_code != 200:
                    print("❌ Failed to upload CSV for exploration test")
                    return False
                
                csv_id = response.json()['id']
            finally:
                os.unlink(csv_file)
        else:
            csv_id = csv_datasets[0]['id']
        
        print(f"Testing data exploration with CSV ID: {csv_id}")
        
        results = {}
        
        # Test 1: Filter data
        try:
            filter_data = [
                {"column": "name", "operator": "contains", "value": "John"}
            ]
            response = requests.post(f"{API_BASE}/datasets/{csv_id}/filter", 
                                   json=filter_data, timeout=10)
            print(f"Filter Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['original_count', 'filtered_count', 'columns', 'rows']
                if all(field in data for field in required_fields):
                    print(f"✅ Data filtering working: {data['filtered_count']} filtered from {data['original_count']}")
                    results['filter'] = True
                else:
                    print("❌ Filter response missing required fields")
                    results['filter'] = False
            else:
                print(f"❌ Data filtering failed: {response.text}")
                results['filter'] = False
        except Exception as e:
            print(f"❌ Data filtering error: {str(e)}")
            results['filter'] = False
        
        # Test 2: Search data
        try:
            response = requests.get(f"{API_BASE}/datasets/{csv_id}/search?q=John", timeout=10)
            print(f"Search Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['query', 'match_count', 'columns', 'rows']
                if all(field in data for field in required_fields):
                    print(f"✅ Data search working: {data['match_count']} matches for '{data['query']}'")
                    results['search'] = True
                else:
                    print("❌ Search response missing required fields")
                    results['search'] = False
            else:
                print(f"❌ Data search failed: {response.text}")
                results['search'] = False
        except Exception as e:
            print(f"❌ Data search error: {str(e)}")
            results['search'] = False
        
        # Test 3: Get unique values
        try:
            response = requests.get(f"{API_BASE}/datasets/{csv_id}/unique/city", timeout=10)
            print(f"Unique Values Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['column', 'unique_count', 'values']
                if all(field in data for field in required_fields):
                    print(f"✅ Unique values working: {data['unique_count']} unique values in '{data['column']}'")
                    results['unique'] = True
                else:
                    print("❌ Unique values response missing required fields")
                    results['unique'] = False
            else:
                print(f"❌ Unique values failed: {response.text}")
                results['unique'] = False
        except Exception as e:
            print(f"❌ Unique values error: {str(e)}")
            results['unique'] = False
        
        return all(results.values()), results
        
    except Exception as e:
        print(f"❌ Data exploration setup error: {str(e)}")
        return False, {}

# ==================== PART 10: CHART DATA TESTS ====================

def test_chart_data():
    """Test chart data generation - histogram, bar, scatter"""
    print("\n=== PART 10: Testing Chart Data Generation ===")
    
    # Get a CSV dataset ID
    try:
        response = requests.get(f"{API_BASE}/datasets/list?category=csv", timeout=10)
        if response.status_code != 200:
            print("❌ Cannot get CSV datasets for chart test")
            return False
        
        csv_datasets = response.json().get('datasets', [])
        if not csv_datasets:
            print("❌ No CSV datasets found for chart test")
            return False
        
        csv_id = csv_datasets[0]['id']
        print(f"Testing chart data with CSV ID: {csv_id}")
        
        results = {}
        
        # Test 1: Histogram data
        try:
            response = requests.get(f"{API_BASE}/datasets/{csv_id}/chart/histogram/age?bins=5", timeout=10)
            print(f"Histogram Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['column', 'total_values', 'min', 'max', 'data']
                if all(field in data for field in required_fields):
                    print(f"✅ Histogram working: {data['total_values']} values, {len(data['data'])} bins")
                    results['histogram'] = True
                else:
                    print("❌ Histogram response missing required fields")
                    results['histogram'] = False
            else:
                print(f"❌ Histogram failed: {response.text}")
                results['histogram'] = False
        except Exception as e:
            print(f"❌ Histogram error: {str(e)}")
            results['histogram'] = False
        
        # Test 2: Bar chart data
        try:
            response = requests.get(f"{API_BASE}/datasets/{csv_id}/chart/bar/department?top_n=5", timeout=10)
            print(f"Bar Chart Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['column', 'total_values', 'unique_count', 'data']
                if all(field in data for field in required_fields):
                    print(f"✅ Bar chart working: {data['unique_count']} unique values, {len(data['data'])} bars")
                    results['bar'] = True
                else:
                    print("❌ Bar chart response missing required fields")
                    results['bar'] = False
            else:
                print(f"❌ Bar chart failed: {response.text}")
                results['bar'] = False
        except Exception as e:
            print(f"❌ Bar chart error: {str(e)}")
            results['bar'] = False
        
        # Test 3: Scatter plot data
        try:
            response = requests.get(f"{API_BASE}/datasets/{csv_id}/chart/scatter?x_column=age&y_column=salary&limit=100", timeout=10)
            print(f"Scatter Plot Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['x_column', 'y_column', 'point_count', 'data']
                if all(field in data for field in required_fields):
                    print(f"✅ Scatter plot working: {data['point_count']} points for {data['x_column']} vs {data['y_column']}")
                    results['scatter'] = True
                else:
                    print("❌ Scatter plot response missing required fields")
                    results['scatter'] = False
            else:
                print(f"❌ Scatter plot failed: {response.text}")
                results['scatter'] = False
        except Exception as e:
            print(f"❌ Scatter plot error: {str(e)}")
            results['scatter'] = False
        
        return all(results.values()), results
        
    except Exception as e:
        print(f"❌ Chart data setup error: {str(e)}")
        return False, {}

# ==================== PART 11: MISSING VALUES TESTS ====================

def test_missing_values_preprocessing():
    """Test missing values preprocessing"""
    print("\n=== PART 11: Testing Missing Values Preprocessing ===")
    
    # Upload a CSV with missing values for testing
    csv_file = create_test_csv_with_missing()
    csv_id = None
    
    try:
        with open(csv_file, 'rb') as f:
            files = {'file': ('missing_values_test.csv', f, 'text/csv')}
            response = requests.post(f"{API_BASE}/datasets/upload", files=files, timeout=30)
        
        if response.status_code != 200:
            print(f"❌ Failed to upload CSV for missing values test: {response.text}")
            return False
        
        csv_id = response.json()['id']
        print(f"Testing missing values with CSV ID: {csv_id}")
        
        results = {}
        
        # Test 1: Drop missing values
        try:
            missing_data = {
                "strategy": "drop",
                "columns": ["age", "salary"]
            }
            response = requests.post(f"{API_BASE}/datasets/{csv_id}/preprocess/missing", 
                                   json=missing_data, timeout=10)
            print(f"Drop Missing Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['original_rows', 'processed_rows', 'removed_rows', 'strategy']
                if all(field in data for field in required_fields):
                    print(f"✅ Drop missing working: {data['removed_rows']} rows removed, {data['processed_rows']} remaining")
                    results['drop'] = True
                else:
                    print("❌ Drop missing response missing required fields")
                    results['drop'] = False
            else:
                print(f"❌ Drop missing failed: {response.text}")
                results['drop'] = False
        except Exception as e:
            print(f"❌ Drop missing error: {str(e)}")
            results['drop'] = False
        
        # Test 2: Fill with mean
        try:
            missing_data = {
                "strategy": "fill_mean",
                "columns": ["age", "salary"]
            }
            response = requests.post(f"{API_BASE}/datasets/{csv_id}/preprocess/missing", 
                                   json=missing_data, timeout=10)
            print(f"Fill Mean Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['original_rows', 'processed_rows', 'strategy']
                if all(field in data for field in required_fields):
                    print(f"✅ Fill mean working: {data['processed_rows']} rows processed")
                    results['fill_mean'] = True
                else:
                    print("❌ Fill mean response missing required fields")
                    results['fill_mean'] = False
            else:
                print(f"❌ Fill mean failed: {response.text}")
                results['fill_mean'] = False
        except Exception as e:
            print(f"❌ Fill mean error: {str(e)}")
            results['fill_mean'] = False
        
        return all(results.values()), results
        
    except Exception as e:
        print(f"❌ Missing values preprocessing error: {str(e)}")
        return False, {}
    finally:
        os.unlink(csv_file)
        # Clean up uploaded dataset
        if csv_id:
            try:
                requests.delete(f"{API_BASE}/datasets/{csv_id}")
            except:
                pass

# ==================== PART 12: NORMALIZATION TESTS ====================

def test_normalization_preprocessing():
    """Test data normalization preprocessing"""
    print("\n=== PART 12: Testing Data Normalization ===")
    
    # Get a CSV dataset ID
    try:
        response = requests.get(f"{API_BASE}/datasets/list?category=csv", timeout=10)
        if response.status_code != 200:
            print("❌ Cannot get CSV datasets for normalization test")
            return False
        
        csv_datasets = response.json().get('datasets', [])
        if not csv_datasets:
            print("❌ No CSV datasets found for normalization test")
            return False
        
        csv_id = csv_datasets[0]['id']
        print(f"Testing normalization with CSV ID: {csv_id}")
        
        results = {}
        
        # Test 1: MinMax normalization
        try:
            norm_data = {
                "method": "minmax",
                "columns": ["age", "salary"]
            }
            response = requests.post(f"{API_BASE}/datasets/{csv_id}/preprocess/normalize", 
                                   json=norm_data, timeout=10)
            print(f"MinMax Normalization Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['method', 'columns', 'parameters', 'processed_dataset']
                if all(field in data for field in required_fields):
                    print(f"✅ MinMax normalization working: {len(data['columns'])} columns normalized")
                    results['minmax'] = True
                else:
                    print("❌ MinMax normalization response missing required fields")
                    results['minmax'] = False
            else:
                print(f"❌ MinMax normalization failed: {response.text}")
                results['minmax'] = False
        except Exception as e:
            print(f"❌ MinMax normalization error: {str(e)}")
            results['minmax'] = False
        
        # Test 2: Z-score normalization
        try:
            norm_data = {
                "method": "zscore",
                "columns": ["age"]
            }
            response = requests.post(f"{API_BASE}/datasets/{csv_id}/preprocess/normalize", 
                                   json=norm_data, timeout=10)
            print(f"Z-Score Normalization Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['method', 'columns', 'parameters', 'processed_dataset']
                if all(field in data for field in required_fields):
                    print(f"✅ Z-score normalization working: {len(data['columns'])} columns normalized")
                    results['zscore'] = True
                else:
                    print("❌ Z-score normalization response missing required fields")
                    results['zscore'] = False
            else:
                print(f"❌ Z-score normalization failed: {response.text}")
                results['zscore'] = False
        except Exception as e:
            print(f"❌ Z-score normalization error: {str(e)}")
            results['zscore'] = False
        
        return all(results.values()), results
        
    except Exception as e:
        print(f"❌ Normalization preprocessing error: {str(e)}")
        return False, {}

# ==================== PART 13: ENCODING TESTS ====================

def test_encoding_preprocessing():
    """Test categorical encoding preprocessing"""
    print("\n=== PART 13: Testing Categorical Encoding ===")
    
    # Get a CSV dataset ID
    try:
        response = requests.get(f"{API_BASE}/datasets/list?category=csv", timeout=10)
        if response.status_code != 200:
            print("❌ Cannot get CSV datasets for encoding test")
            return False
        
        csv_datasets = response.json().get('datasets', [])
        if not csv_datasets:
            print("❌ No CSV datasets found for encoding test")
            return False
        
        csv_id = csv_datasets[0]['id']
        print(f"Testing encoding with CSV ID: {csv_id}")
        
        results = {}
        
        # Test 1: Label encoding
        try:
            encode_data = {
                "method": "label",
                "columns": ["department"]
            }
            response = requests.post(f"{API_BASE}/datasets/{csv_id}/preprocess/encode", 
                                   json=encode_data, timeout=10)
            print(f"Label Encoding Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['method', 'columns', 'encoding_map', 'processed_dataset']
                if all(field in data for field in required_fields):
                    print(f"✅ Label encoding working: {len(data['columns'])} columns encoded")
                    results['label'] = True
                else:
                    print("❌ Label encoding response missing required fields")
                    results['label'] = False
            else:
                print(f"❌ Label encoding failed: {response.text}")
                results['label'] = False
        except Exception as e:
            print(f"❌ Label encoding error: {str(e)}")
            results['label'] = False
        
        # Test 2: One-hot encoding
        try:
            encode_data = {
                "method": "onehot",
                "columns": ["department"]
            }
            response = requests.post(f"{API_BASE}/datasets/{csv_id}/preprocess/encode", 
                                   json=encode_data, timeout=10)
            print(f"One-Hot Encoding Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['method', 'columns', 'encoding_map', 'new_columns', 'processed_dataset']
                if all(field in data for field in required_fields):
                    print(f"✅ One-hot encoding working: {len(data['new_columns'])} new columns created")
                    results['onehot'] = True
                else:
                    print("❌ One-hot encoding response missing required fields")
                    results['onehot'] = False
            else:
                print(f"❌ One-hot encoding failed: {response.text}")
                results['onehot'] = False
        except Exception as e:
            print(f"❌ One-hot encoding error: {str(e)}")
            results['onehot'] = False
        
        return all(results.values()), results
        
    except Exception as e:
        print(f"❌ Encoding preprocessing error: {str(e)}")
        return False, {}

# ==================== PART 14: DATA SPLIT TESTS ====================

def test_data_split():
    """Test train/validation/test data splitting"""
    print("\n=== PART 14: Testing Data Split ===")
    
    # Get a CSV dataset ID
    try:
        response = requests.get(f"{API_BASE}/datasets/list?category=csv", timeout=10)
        if response.status_code != 200:
            print("❌ Cannot get CSV datasets for split test")
            return False
        
        csv_datasets = response.json().get('datasets', [])
        if not csv_datasets:
            print("❌ No CSV datasets found for split test")
            return False
        
        csv_id = csv_datasets[0]['id']
        print(f"Testing data split with CSV ID: {csv_id}")
        
        # Test data splitting
        try:
            split_data = {
                "train_ratio": 0.7,
                "val_ratio": 0.15,
                "test_ratio": 0.15,
                "shuffle": True,
                "random_seed": 42
            }
            response = requests.post(f"{API_BASE}/datasets/{csv_id}/preprocess/split", 
                                   json=split_data, timeout=10)
            print(f"Data Split Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['original_rows', 'ratios', 'splits']
                if all(field in data for field in required_fields):
                    splits = data['splits']
                    total_split_rows = sum(split['rows'] for split in splits.values())
                    print(f"✅ Data split working: {data['original_rows']} → {total_split_rows} total split rows")
                    print(f"   Train: {splits.get('train', {}).get('rows', 0)}, Val: {splits.get('val', {}).get('rows', 0)}, Test: {splits.get('test', {}).get('rows', 0)}")
                    return True
                else:
                    print("❌ Data split response missing required fields")
                    return False
            else:
                print(f"❌ Data split failed: {response.text}")
                return False
        except Exception as e:
            print(f"❌ Data split error: {str(e)}")
            return False
        
    except Exception as e:
        print(f"❌ Data split setup error: {str(e)}")
        return False

# ==================== PART 15: EXPORT TESTS ====================

def test_data_export():
    """Test data export functionality"""
    print("\n=== PART 15: Testing Data Export ===")
    
    # Get a CSV dataset ID
    try:
        response = requests.get(f"{API_BASE}/datasets/list?category=csv", timeout=10)
        if response.status_code != 200:
            print("❌ Cannot get CSV datasets for export test")
            return False
        
        csv_datasets = response.json().get('datasets', [])
        if not csv_datasets:
            print("❌ No CSV datasets found for export test")
            return False
        
        csv_id = csv_datasets[0]['id']
        print(f"Testing data export with CSV ID: {csv_id}")
        
        results = {}
        
        # Test 1: Export as CSV
        try:
            response = requests.get(f"{API_BASE}/datasets/{csv_id}/export?format=csv", timeout=10)
            print(f"CSV Export Status: {response.status_code}")
            
            if response.status_code == 200:
                content_type = response.headers.get('content-type', '')
                if 'text/csv' in content_type and len(response.content) > 0:
                    print(f"✅ CSV export working: {len(response.content)} bytes exported")
                    results['csv'] = True
                else:
                    print(f"❌ CSV export wrong content type or empty: {content_type}")
                    results['csv'] = False
            else:
                print(f"❌ CSV export failed: {response.text}")
                results['csv'] = False
        except Exception as e:
            print(f"❌ CSV export error: {str(e)}")
            results['csv'] = False
        
        # Test 2: Export as JSON
        try:
            response = requests.get(f"{API_BASE}/datasets/{csv_id}/export?format=json", timeout=10)
            print(f"JSON Export Status: {response.status_code}")
            
            if response.status_code == 200:
                content_type = response.headers.get('content-type', '')
                if 'application/json' in content_type and len(response.content) > 0:
                    # Try to parse JSON to verify it's valid
                    json.loads(response.content)
                    print(f"✅ JSON export working: {len(response.content)} bytes exported")
                    results['json'] = True
                else:
                    print(f"❌ JSON export wrong content type or empty: {content_type}")
                    results['json'] = False
            else:
                print(f"❌ JSON export failed: {response.text}")
                results['json'] = False
        except json.JSONDecodeError:
            print("❌ JSON export returned invalid JSON")
            results['json'] = False
        except Exception as e:
            print(f"❌ JSON export error: {str(e)}")
            results['json'] = False
        
        return all(results.values()), results
        
    except Exception as e:
        print(f"❌ Data export setup error: {str(e)}")
        return False, {}

# ==================== PART 7: PREPROCESSING CONFIGURATION TESTS ====================

def create_housing_csv():
    """Create a realistic housing dataset for preprocessing tests"""
    csv_content = """price,bedrooms,bathrooms,sqft_living,sqft_lot,floors,waterfront,view,condition,grade,sqft_above,sqft_basement,yr_built,yr_renovated,zipcode,lat,long,sqft_living15,sqft_lot15
221900,3,1,1180,5650,1,0,0,3,7,1180,0,1955,0,98178,47.5112,-122.257,1340,5650
538000,3,2.25,2570,7242,2,0,0,3,7,2170,400,1951,1991,98125,47.7210,-122.319,1690,7639
180000,2,1,770,10000,1,0,0,3,6,770,0,1933,0,98028,47.7379,-122.233,2720,8062
604000,4,3,1960,5000,1,0,0,5,7,1050,910,1965,0,98136,47.5208,-122.393,1360,5000
510000,3,2,1680,8080,1,0,0,3,8,1680,0,1987,0,98074,47.6168,-122.045,1800,7503
1225000,4,4.5,5420,101930,1,0,0,3,11,3890,1530,2001,0,98053,47.6561,-122.005,4760,101930
257500,3,2.25,1715,6819,2,0,0,3,7,1715,0,1995,0,98003,47.3097,-122.327,2238,6819
291850,3,1.5,1060,9711,1,0,0,3,7,1060,0,1963,0,98198,47.4095,-122.315,1650,9711
229500,3,1,1780,7470,1,0,0,3,7,1050,730,1960,0,98146,47.5123,-122.337,1780,8113
323000,3,2.5,1890,6560,2,0,0,3,7,1890,0,2003,0,98038,47.3684,-122.031,2390,7570"""
    
    temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False)
    temp_file.write(csv_content)
    temp_file.close()
    return temp_file.name

def test_preprocessing_configuration():
    """Test Part 7: Preprocessing Configuration UI APIs"""
    print("\n=== PART 7: Testing Preprocessing Configuration UI ===")
    
    # Create housing dataset
    housing_file = create_housing_csv()
    project_id = None
    dataset_id = None
    
    try:
        # Step 1: Create a new project
        project_data = {
            "name": "Housing Price Prediction",
            "description": "Predict house prices based on features like bedrooms, bathrooms, and location",
            "data_source": "upload"
        }
        response = requests.post(f"{API_BASE}/projects", json=project_data, timeout=10)
        print(f"Create Project Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ Failed to create project: {response.text}")
            return False
        
        project_id = response.json()["id"]
        print(f"✅ Created project: {project_id}")
        
        # Step 2: Upload housing dataset
        with open(housing_file, 'rb') as f:
            files = {'file': ('housing.csv', f, 'text/csv')}
            response = requests.post(f"{API_BASE}/datasets/upload", files=files, timeout=30)
        
        print(f"Upload Dataset Status: {response.status_code}")
        if response.status_code != 200:
            print(f"❌ Failed to upload dataset: {response.text}")
            return False
        
        dataset_id = response.json()["id"]
        print(f"✅ Uploaded dataset: {dataset_id}")
        
        # Step 3: Link dataset to project
        link_data = {"dataset_id": dataset_id}
        response = requests.post(f"{API_BASE}/projects/{project_id}/link-dataset", json=link_data, timeout=10)
        print(f"Link Dataset Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ Failed to link dataset: {response.text}")
            return False
        
        print("✅ Linked dataset to project")
        
        # Step 4: Start analysis
        analysis_data = {"project_id": project_id}
        response = requests.post(f"{API_BASE}/analysis/analyze", json=analysis_data, timeout=10)
        print(f"Start Analysis Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ Failed to start analysis: {response.text}")
            return False
        
        print("✅ Started analysis")
        
        # Step 5: Wait for analysis to complete and check results
        import time
        max_wait = 30
        wait_time = 0
        analysis_complete = False
        
        while wait_time < max_wait:
            time.sleep(2)
            wait_time += 2
            
            response = requests.get(f"{API_BASE}/analysis/{project_id}/analysis", timeout=10)
            if response.status_code == 200:
                analysis_result = response.json()
                if analysis_result.get("status") == "analyzed":
                    analysis_complete = True
                    print("✅ Analysis completed")
                    break
                elif analysis_result.get("status") == "analysis_failed":
                    print(f"❌ Analysis failed: {analysis_result}")
                    return False
        
        if not analysis_complete:
            print("❌ Analysis did not complete in time")
            return False
        
        # Step 6: Set target column
        response = requests.post(f"{API_BASE}/analysis/{project_id}/set-target?target_column=price", timeout=10)
        print(f"Set Target Column Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ Failed to set target column: {response.text}")
            return False
        
        print("✅ Set target column to 'price'")
        
        # Step 7: Test GET /api/preprocessing/{project_id}/config
        response = requests.get(f"{API_BASE}/preprocessing/{project_id}/config", timeout=10)
        print(f"Get Preprocessing Config Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ Failed to get preprocessing config: {response.text}")
            return False
        
        config_data = response.json()
        required_fields = ['project_id', 'config', 'source']
        if not all(field in config_data for field in required_fields):
            print("❌ Preprocessing config missing required fields")
            return False
        
        config = config_data['config']
        if 'columns' not in config or 'split' not in config:
            print("❌ Config missing columns or split settings")
            return False
        
        print(f"✅ Got preprocessing config with {len(config['columns'])} columns")
        
        # Step 8: Test POST /api/preprocessing/auto
        auto_request = {
            "project_id": project_id,
            "test_size": 0.2,
            "validation_size": 0.0
        }
        response = requests.post(f"{API_BASE}/preprocessing/auto", json=auto_request, timeout=10)
        print(f"Auto Preprocessing Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ Failed to start auto preprocessing: {response.text}")
            return False
        
        print("✅ Started auto preprocessing")
        
        # Step 9: Wait for preprocessing to complete
        max_wait = 30
        wait_time = 0
        preprocessing_complete = False
        
        while wait_time < max_wait:
            time.sleep(2)
            wait_time += 2
            
            response = requests.get(f"{API_BASE}/projects/{project_id}", timeout=10)
            if response.status_code == 200:
                project = response.json()
                status = project.get("status")
                if status == "preprocessed":
                    preprocessing_complete = True
                    print("✅ Auto preprocessing completed")
                    break
                elif status == "preprocessing_failed":
                    print(f"❌ Preprocessing failed: {project}")
                    return False
        
        if not preprocessing_complete:
            print("❌ Auto preprocessing did not complete in time")
            return False
        
        # Step 10: Test GET /api/preprocessing/{project_id}/results
        response = requests.get(f"{API_BASE}/preprocessing/{project_id}/results", timeout=10)
        print(f"Get Preprocessing Results Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ Failed to get preprocessing results: {response.text}")
            return False
        
        results_data = response.json()
        required_fields = ['project_id', 'status', 'results']
        if not all(field in results_data for field in required_fields):
            print("❌ Preprocessing results missing required fields")
            return False
        
        results = results_data['results']
        if 'stats' not in results or 'feature_names' not in results:
            print("❌ Results missing stats or feature_names")
            return False
        
        stats = results['stats']
        if 'train_samples' not in stats or 'test_samples' not in stats:
            print("❌ Stats missing train/test sample counts")
            return False
        
        print(f"✅ Got preprocessing results: {stats['train_samples']} train, {stats['test_samples']} test samples")
        
        # Step 11: Test GET /api/preprocessing/{project_id}/preview
        response = requests.get(f"{API_BASE}/preprocessing/{project_id}/preview?rows=5", timeout=10)
        print(f"Preview Preprocessing Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ Failed to get preprocessing preview: {response.text}")
            return False
        
        preview_data = response.json()
        required_fields = ['feature_names', 'shapes']
        if not all(field in preview_data for field in required_fields):
            print("❌ Preview missing required fields")
            return False
        
        feature_names = preview_data['feature_names']
        shapes = preview_data['shapes']
        
        print(f"✅ Got preprocessing preview: {len(feature_names)} features")
        
        # Step 12: Test custom preprocessing with modified config
        # Create a second project for custom preprocessing test
        project_data2 = {
            "name": "Housing Custom Preprocessing",
            "description": "Test custom preprocessing configuration",
            "data_source": "upload"
        }
        response = requests.post(f"{API_BASE}/projects", json=project_data2, timeout=10)
        
        if response.status_code != 200:
            print(f"❌ Failed to create second project: {response.text}")
            return False
        
        project_id2 = response.json()["id"]
        
        # Link same dataset to second project
        link_data2 = {"dataset_id": dataset_id}
        response = requests.post(f"{API_BASE}/projects/{project_id2}/link-dataset", json=link_data2, timeout=10)
        
        if response.status_code != 200:
            print(f"❌ Failed to link dataset to second project: {response.text}")
            return False
        
        # Start analysis for second project
        analysis_data2 = {"project_id": project_id2}
        response = requests.post(f"{API_BASE}/analysis/analyze", json=analysis_data2, timeout=10)
        
        if response.status_code != 200:
            print(f"❌ Failed to start analysis for second project: {response.text}")
            return False
        
        # Wait for analysis
        max_wait = 30
        wait_time = 0
        analysis_complete2 = False
        
        while wait_time < max_wait:
            time.sleep(2)
            wait_time += 2
            
            response = requests.get(f"{API_BASE}/analysis/{project_id2}/analysis", timeout=10)
            if response.status_code == 200:
                analysis_result = response.json()
                if analysis_result.get("status") == "analyzed":
                    analysis_complete2 = True
                    break
        
        if not analysis_complete2:
            print("❌ Second project analysis did not complete in time")
            return False
        
        # Set target column for second project
        response = requests.post(f"{API_BASE}/analysis/{project_id2}/set-target?target_column=price", timeout=10)
        
        if response.status_code != 200:
            print(f"❌ Failed to set target column for second project: {response.text}")
            return False
        
        # Get config for modification
        response = requests.get(f"{API_BASE}/preprocessing/{project_id2}/config", timeout=10)
        
        if response.status_code != 200:
            print(f"❌ Failed to get config for second project: {response.text}")
            return False
        
        config_data2 = response.json()
        custom_config = config_data2['config']
        
        # Modify config - change test size and add validation split
        custom_config['split']['test_size'] = 0.3
        custom_config['split']['validation_size'] = 0.1
        
        # Test POST /api/preprocessing/custom
        custom_request = {
            "project_id": project_id2,
            "config": custom_config
        }
        response = requests.post(f"{API_BASE}/preprocessing/custom", json=custom_request, timeout=10)
        print(f"Custom Preprocessing Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ Failed to start custom preprocessing: {response.text}")
            return False
        
        print("✅ Started custom preprocessing")
        
        # Wait for custom preprocessing to complete
        max_wait = 30
        wait_time = 0
        custom_preprocessing_complete = False
        
        while wait_time < max_wait:
            time.sleep(2)
            wait_time += 2
            
            response = requests.get(f"{API_BASE}/projects/{project_id2}", timeout=10)
            if response.status_code == 200:
                project = response.json()
                status = project.get("status")
                if status == "preprocessed":
                    custom_preprocessing_complete = True
                    print("✅ Custom preprocessing completed")
                    break
                elif status == "preprocessing_failed":
                    print(f"❌ Custom preprocessing failed: {project}")
                    return False
        
        if not custom_preprocessing_complete:
            print("❌ Custom preprocessing did not complete in time")
            return False
        
        # Verify custom preprocessing results
        response = requests.get(f"{API_BASE}/preprocessing/{project_id2}/results", timeout=10)
        
        if response.status_code != 200:
            print(f"❌ Failed to get custom preprocessing results: {response.text}")
            return False
        
        custom_results = response.json()
        custom_stats = custom_results['results']['stats']
        
        # Verify that validation split was created
        if 'val_samples' not in custom_stats or custom_stats['val_samples'] == 0:
            print("❌ Custom preprocessing did not create validation split")
            return False
        
        print(f"✅ Custom preprocessing created validation split: {custom_stats['val_samples']} validation samples")
        
        print("✅ All preprocessing configuration tests passed!")
        return True
        
    except Exception as e:
        print(f"❌ Preprocessing configuration test error: {str(e)}")
        return False
    finally:
        # Cleanup
        os.unlink(housing_file)
        if dataset_id:
            try:
                requests.delete(f"{API_BASE}/datasets/{dataset_id}")
            except:
                pass
        if project_id:
            try:
                requests.delete(f"{API_BASE}/projects/{project_id}")
            except:
                pass

def main():
    """Run all backend tests for AI/ML Platform Data Management Features (Parts 2-15)"""
    print("🚀 Starting Backend API Tests for AI/ML Platform Data Management Features")
    print("=" * 80)
    
    results = {}
    
    # Test health endpoint first
    try:
        response = requests.get(f"{API_BASE}/health", timeout=10)
        if response.status_code == 200:
            print("✅ Backend health check passed")
            results['health'] = True
        else:
            print("❌ Backend health check failed")
            results['health'] = False
    except Exception as e:
        print(f"❌ Backend health check error: {str(e)}")
        results['health'] = False
    
    # Part 2: Dataset Storage
    results['dataset_storage'], csv_id = test_dataset_storage()
    
    # Part 3: Dataset Listing
    results['dataset_listing'], listing_details = test_dataset_listing()
    
    # Part 4: CSV Preview
    results['csv_preview'] = test_csv_preview()
    
    # Part 5: Image Preview
    results['image_preview'] = test_image_preview()
    
    # Part 6: JSON Preview
    results['json_preview'] = test_json_preview()
    
    # Part 7: Dataset Statistics
    results['dataset_statistics'], stats_details = test_dataset_statistics()
    
    # Delete functionality test
    results['dataset_deletion'] = test_dataset_deletion()
    
    # Part 9: Data Exploration
    results['data_exploration'], exploration_details = test_data_exploration()
    
    # Part 10: Chart Data
    results['chart_data'], chart_details = test_chart_data()
    
    # Part 11: Missing Values Preprocessing
    results['missing_values'], missing_details = test_missing_values_preprocessing()
    
    # Part 12: Normalization Preprocessing
    results['normalization'], norm_details = test_normalization_preprocessing()
    
    # Part 13: Encoding Preprocessing
    results['encoding'], encoding_details = test_encoding_preprocessing()
    
    # Part 14: Data Split
    results['data_split'] = test_data_split()
    
    # Part 15: Data Export
    results['data_export'], export_details = test_data_export()
    
    # Part 7: Preprocessing Configuration UI
    results['preprocessing_config'] = test_preprocessing_configuration()
    
    # Summary
    print("\n" + "=" * 80)
    print("📊 TEST SUMMARY - AI/ML Platform Data Management Features")
    print("=" * 80)
    
    passed = sum(1 for result in results.values() if result)
    total = len(results)
    
    # Detailed results
    test_descriptions = {
        'health': 'Backend Health Check',
        'dataset_storage': 'Part 2: Dataset Storage (MongoDB)',
        'dataset_listing': 'Part 3: Dataset Listing & Filtering',
        'csv_preview': 'Part 4: CSV Preview',
        'image_preview': 'Part 5: Image Preview',
        'json_preview': 'Part 6: JSON Preview',
        'dataset_statistics': 'Part 7: Dataset Statistics',
        'dataset_deletion': 'Dataset Deletion',
        'data_exploration': 'Part 9: Data Exploration (Filter/Search/Unique)',
        'chart_data': 'Part 10: Chart Data (Histogram/Bar/Scatter)',
        'missing_values': 'Part 11: Missing Values Preprocessing',
        'normalization': 'Part 12: Data Normalization',
        'encoding': 'Part 13: Categorical Encoding',
        'data_split': 'Part 14: Train/Val/Test Split',
        'data_export': 'Part 15: Data Export (CSV/JSON)',
        'preprocessing_config': 'Part 7: Preprocessing Configuration UI'
    }
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        description = test_descriptions.get(test_name, test_name.replace('_', ' ').title())
        print(f"{description}: {status}")
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All Data Management and Preprocessing features are working correctly!")
        return True
    else:
        print("⚠️  Some Data Management and Preprocessing features have issues!")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)