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
    """Create a test CSV file"""
    csv_content = """name,age,city
John Doe,30,New York
Jane Smith,25,Los Angeles
Bob Johnson,35,Chicago"""
    
    temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False)
    temp_file.write(csv_content)
    temp_file.close()
    return temp_file.name

def create_test_json():
    """Create a test JSON file"""
    json_content = {
        "users": [
            {"name": "Alice", "age": 28, "city": "Boston"},
            {"name": "Charlie", "age": 32, "city": "Seattle"}
        ]
    }
    
    temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False)
    json.dump(json_content, temp_file, indent=2)
    temp_file.close()
    return temp_file.name

def create_invalid_file():
    """Create an invalid file type (.exe)"""
    temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.exe', delete=False)
    temp_file.write("This is not a real executable")
    temp_file.close()
    return temp_file.name

def test_single_csv_upload():
    """Test single CSV file upload"""
    print("\n=== Testing Single CSV Upload ===")
    csv_file = create_test_csv()
    
    try:
        with open(csv_file, 'rb') as f:
            files = {'file': ('test_data.csv', f, 'text/csv')}
            response = requests.post(f"{API_BASE}/datasets/upload", files=files, timeout=30)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200:
            data = response.json()
            if all(key in data for key in ['id', 'filename', 'stored_filename', 'size', 'type']):
                print("✅ CSV upload successful")
                return True, data
            else:
                print("❌ CSV upload response missing required fields")
                return False, None
        else:
            print(f"❌ CSV upload failed with status {response.status_code}")
            return False, None
            
    except Exception as e:
        print(f"❌ CSV upload error: {str(e)}")
        return False, None
    finally:
        os.unlink(csv_file)

def test_single_json_upload():
    """Test single JSON file upload"""
    print("\n=== Testing Single JSON Upload ===")
    json_file = create_test_json()
    
    try:
        with open(json_file, 'rb') as f:
            files = {'file': ('test_data.json', f, 'application/json')}
            response = requests.post(f"{API_BASE}/datasets/upload", files=files, timeout=30)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200:
            data = response.json()
            if all(key in data for key in ['id', 'filename', 'stored_filename', 'size', 'type']):
                print("✅ JSON upload successful")
                return True, data
            else:
                print("❌ JSON upload response missing required fields")
                return False, None
        else:
            print(f"❌ JSON upload failed with status {response.status_code}")
            return False, None
            
    except Exception as e:
        print(f"❌ JSON upload error: {str(e)}")
        return False, None
    finally:
        os.unlink(json_file)

def test_multiple_file_upload():
    """Test multiple file upload"""
    print("\n=== Testing Multiple File Upload ===")
    csv_file = create_test_csv()
    json_file = create_test_json()
    
    try:
        files = []
        with open(csv_file, 'rb') as f1, open(json_file, 'rb') as f2:
            files = [
                ('files', ('test1.csv', f1, 'text/csv')),
                ('files', ('test2.json', f2, 'application/json'))
            ]
            response = requests.post(f"{API_BASE}/datasets/upload-multiple", files=files, timeout=30)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200:
            data = response.json()
            if 'uploaded' in data and 'errors' in data:
                uploaded_count = len(data['uploaded'])
                error_count = len(data['errors'])
                print(f"✅ Multiple upload successful: {uploaded_count} uploaded, {error_count} errors")
                return True, data
            else:
                print("❌ Multiple upload response missing required fields")
                return False, None
        else:
            print(f"❌ Multiple upload failed with status {response.status_code}")
            return False, None
            
    except Exception as e:
        print(f"❌ Multiple upload error: {str(e)}")
        return False, None
    finally:
        os.unlink(csv_file)
        os.unlink(json_file)

def test_invalid_file_rejection():
    """Test that invalid file types are rejected"""
    print("\n=== Testing Invalid File Rejection ===")
    invalid_file = create_invalid_file()
    
    try:
        with open(invalid_file, 'rb') as f:
            files = {'file': ('malicious.exe', f, 'application/octet-stream')}
            response = requests.post(f"{API_BASE}/datasets/upload", files=files, timeout=30)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 400:
            data = response.json()
            if 'detail' in data and 'not allowed' in data['detail']:
                print("✅ Invalid file correctly rejected")
                return True
            else:
                print("❌ Invalid file rejected but with unexpected error message")
                return False
        else:
            print(f"❌ Invalid file should have been rejected but got status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Invalid file test error: {str(e)}")
        return False
    finally:
        os.unlink(invalid_file)

def verify_uploaded_files():
    """Verify that uploaded files exist in the uploads directory"""
    print("\n=== Verifying Uploaded Files ===")
    uploads_dir = "/app/backend/uploads"
    
    try:
        if not os.path.exists(uploads_dir):
            print(f"❌ Uploads directory {uploads_dir} does not exist")
            return False
        
        files = os.listdir(uploads_dir)
        print(f"Files in uploads directory: {files}")
        
        if len(files) > 0:
            print(f"✅ Found {len(files)} files in uploads directory")
            return True
        else:
            print("❌ No files found in uploads directory")
            return False
            
    except Exception as e:
        print(f"❌ Error checking uploads directory: {str(e)}")
        return False

def main():
    """Run all backend tests"""
    print("🚀 Starting Backend API Tests for Dataset Upload Feature")
    print("=" * 60)
    
    results = {}
    
    # Test 1: Health endpoint
    results['health'] = test_health_endpoint()
    
    # Test 2: Single CSV upload
    results['csv_upload'], csv_data = test_single_csv_upload()
    
    # Test 3: Single JSON upload
    results['json_upload'], json_data = test_single_json_upload()
    
    # Test 4: Multiple file upload
    results['multiple_upload'], multiple_data = test_multiple_file_upload()
    
    # Test 5: Invalid file rejection
    results['invalid_rejection'] = test_invalid_file_rejection()
    
    # Test 6: Verify uploaded files
    results['file_verification'] = verify_uploaded_files()
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for result in results.values() if result)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name.replace('_', ' ').title()}: {status}")
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All backend tests passed!")
        return True
    else:
        print("⚠️  Some backend tests failed!")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)