"""
Test script for Tags API endpoints
Tests POST /api/tags/store and GET /api/tags/location/{location_name}
"""
import requests
import json
from typing import Dict, Any

BASE_URL = "http://localhost:8000"

def test_store_tags():
    """Test storing tags"""
    print("=" * 60)
    print("TEST 1: Store Tags")
    print("=" * 60)
    
    payload = {
        "location_name": "Clemson University",
        "lat": 34.6834,
        "lon": -82.8374,
        "tags": [
            {
                "type": "Ramp",
                "lat": 34.6835,
                "lon": -82.8375,
                "source": "user",
                "address": "Cooper Library - Main Entrance"
            },
            {
                "type": "Elevator",
                "lat": 34.6840,
                "lon": -82.8380,
                "source": "osm",
                "osm_id": "node/123456",
                "address": "Brackett Hall"
            },
            {
                "type": "Entrance",
                "lat": 34.6845,
                "lon": -82.8385,
                "source": "model",
                "confidence": 0.92,
                "address": "Student Union"
            },
            {
                "type": "Tactile Path",
                "lat": 34.6838,
                "lon": -82.8372,
                "source": "user",
                "address": "Library Walk",
                "notes": "Tactile paving along main walkway"
            }
        ]
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/tags/store", json=payload)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 201:
            data = response.json()
            print("✓ SUCCESS")
            print(f"Message: {data['message']}")
            print(f"Tags Stored: {data['tags_stored']}")
            print(f"Tag IDs: {data['tag_ids']}")
        else:
            print(f"✗ FAILED: {response.text}")
        
        print()
        return response.status_code == 201
    
    except Exception as e:
        print(f"✗ ERROR: {e}")
        return False

def test_get_tags():
    """Test retrieving tags"""
    print("=" * 60)
    print("TEST 2: Get Tags by Location")
    print("=" * 60)
    
    location_name = "Clemson University"
    
    try:
        response = requests.get(f"{BASE_URL}/api/tags/location/{location_name}")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✓ SUCCESS")
            print(f"Location: {data['location_name']}")
            print(f"Coordinates: ({data['lat']}, {data['lon']})")
            print(f"Total Tags: {data['total_tags']}")
            print()
            print("Tags by Source:")
            print(f"  • User Tags: {len(data['tags']['user'])}")
            print(f"  • OSM Tags: {len(data['tags']['osm'])}")
            print(f"  • Model Tags: {len(data['tags']['model'])}")
            print()
            
            # Show first tag from each source
            for source in ['user', 'osm', 'model']:
                if data['tags'][source]:
                    tag = data['tags'][source][0]
                    print(f"  Example {source.upper()} tag:")
                    print(f"    - ID: {tag['id']}")
                    print(f"    - Type: {tag['type']}")
                    print(f"    - Location: ({tag['lat']}, {tag['lon']})")
                    print(f"    - Address: {tag.get('address', 'N/A')}")
                    if tag.get('confidence'):
                        print(f"    - Confidence: {tag['confidence']}")
                    if tag.get('osm_id'):
                        print(f"    - OSM ID: {tag['osm_id']}")
                    print()
        else:
            print(f"✗ FAILED: {response.text}")
        
        print()
        return response.status_code == 200
    
    except Exception as e:
        print(f"✗ ERROR: {e}")
        return False

def test_list_locations():
    """Test listing all locations"""
    print("=" * 60)
    print("TEST 3: List All Locations")
    print("=" * 60)
    
    try:
        response = requests.get(f"{BASE_URL}/api/tags/locations")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✓ SUCCESS")
            print(f"Total Locations: {len(data)}")
            print()
            
            for loc in data:
                print(f"  • {loc['location_name']}")
                print(f"    Coordinates: ({loc['lat']}, {loc['lon']})")
                print(f"    Tags: {loc['tag_count']}")
                print()
        else:
            print(f"✗ FAILED: {response.text}")
        
        print()
        return response.status_code == 200
    
    except Exception as e:
        print(f"✗ ERROR: {e}")
        return False

def test_statistics():
    """Test getting statistics"""
    print("=" * 60)
    print("TEST 4: Get Statistics")
    print("=" * 60)
    
    try:
        response = requests.get(f"{BASE_URL}/api/tags/statistics")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✓ SUCCESS")
            print(f"Total Tags: {data['total_tags']}")
            print()
            print("By Source:")
            for source, count in data['by_source'].items():
                print(f"  • {source}: {count}")
            print()
            print("By Type:")
            for tag_type, count in data['by_type'].items():
                print(f"  • {tag_type}: {count}")
        else:
            print(f"✗ FAILED: {response.text}")
        
        print()
        return response.status_code == 200
    
    except Exception as e:
        print(f"✗ ERROR: {e}")
        return False

def test_invalid_request():
    """Test error handling with invalid data"""
    print("=" * 60)
    print("TEST 5: Invalid Request (Error Handling)")
    print("=" * 60)
    
    # Missing required fields
    payload = {
        "location_name": "Test Location",
        "tags": []  # Empty tags array should fail
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/tags/store", json=payload)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 422:  # Validation error
            print("✓ SUCCESS - Validation working correctly")
            error = response.json()
            print(f"Error: {error.get('detail', 'No detail')}")
        else:
            print(f"✗ UNEXPECTED: Expected 422, got {response.status_code}")
        
        print()
        return response.status_code == 422
    
    except Exception as e:
        print(f"✗ ERROR: {e}")
        return False

def run_all_tests():
    """Run all tests"""
    print("\n" + "=" * 60)
    print("ACCESSIBILITY TAGS API TEST SUITE")
    print("=" * 60 + "\n")
    
    results = []
    
    # Run tests
    results.append(("Store Tags", test_store_tags()))
    results.append(("Get Tags", test_get_tags()))
    results.append(("List Locations", test_list_locations()))
    results.append(("Statistics", test_statistics()))
    results.append(("Error Handling", test_invalid_request()))
    
    # Summary
    print("=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status}: {test_name}")
    
    print()
    print(f"Results: {passed}/{total} tests passed")
    print("=" * 60)

if __name__ == "__main__":
    run_all_tests()
