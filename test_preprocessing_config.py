#!/usr/bin/env python3
"""
Test script for Part 7: Preprocessing Configuration UI
Tests the AutoML preprocessing pipeline APIs
"""

import requests
import os
import tempfile
import json
import time

# Use external URL for testing
BACKEND_URL = "https://train-genius-2.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

print(f"Testing preprocessing configuration at: {API_BASE}")

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
    project_id2 = None
    dataset_id = None
    
    try:
        # Step 1: Create a new project
        project_data = {
            "name": "Housing Price Prediction",
            "description": "Predict house prices based on features like bedrooms, bathrooms, and location",
            "data_source": "upload"
        }
        response = requests.post(f"{API_BASE}/projects/", json=project_data, timeout=10)
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
        
        # Verify config structure
        columns = config['columns']
        target_found = False
        feature_count = 0
        
        for col in columns:
            if col['role'] == 'target':
                target_found = True
            elif col['role'] == 'feature':
                feature_count += 1
        
        if not target_found:
            print("❌ No target column found in config")
            return False
        
        print(f"✅ Config has target column and {feature_count} feature columns")
        
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
        print(f"   Features: {len(results['feature_names'])} total features")
        
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
        print(f"   Train shape: {shapes.get('X_train')}, Test shape: {shapes.get('X_test')}")
        
        # Step 12: Test custom preprocessing with modified config
        # Create a second project for custom preprocessing test
        project_data2 = {
            "name": "Housing Custom Preprocessing",
            "description": "Test custom preprocessing configuration",
            "data_source": "upload"
        }
        response = requests.post(f"{API_BASE}/projects/", json=project_data2, timeout=10)
        
        if response.status_code != 200:
            print(f"❌ Failed to create second project: {response.text}")
            return False
        
        project_id2 = response.json()["id"]
        print(f"✅ Created second project: {project_id2}")
        
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
                    print("✅ Second project analysis completed")
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
        print(f"   Custom split - Train: {custom_stats['train_samples']}, Test: {custom_stats['test_samples']}, Val: {custom_stats['val_samples']}")
        
        print("\n🎉 All preprocessing configuration tests passed!")
        return True
        
    except Exception as e:
        print(f"❌ Preprocessing configuration test error: {str(e)}")
        import traceback
        traceback.print_exc()
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
        if project_id2:
            try:
                requests.delete(f"{API_BASE}/projects/{project_id2}")
            except:
                pass

if __name__ == "__main__":
    success = test_preprocessing_configuration()
    exit(0 if success else 1)