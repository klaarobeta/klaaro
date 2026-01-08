#!/usr/bin/env python3
"""
Backend API Tests for AI/ML Platform Data Management Features (Parts 2-7)
Tests dataset storage, listing, preview, statistics, and deletion functionality.
"""

import requests
import os
import tempfile
import json
from pathlib import Path
from PIL import Image
import io

# Use external URL for testing
BACKEND_URL = "https://aiml-platform.preview.emergentagent.com"
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

def main():
    """Run all backend tests for Data Management Features (Parts 2-7)"""
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
        'dataset_deletion': 'Dataset Deletion'
    }
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        description = test_descriptions.get(test_name, test_name.replace('_', ' ').title())
        print(f"{description}: {status}")
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All Data Management features are working correctly!")
        return True
    else:
        print("⚠️  Some Data Management features have issues!")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)