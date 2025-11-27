"""
Test script for the new Voice API endpoint
Demonstrates MP3 generation and download functionality
"""

import requests
import os
from pathlib import Path

# API endpoint
API_BASE = "http://localhost:8000"

def test_voice_generation():
    """Test basic voice generation"""
    print("🎤 Testing voice generation...")
    
    text = "Hello world! This is a test of the AccessAtlas voice API."
    response = requests.get(f"{API_BASE}/voice", params={"text": text})
    
    if response.status_code == 200:
        # Save to file
        output_file = Path("test_voice.mp3")
        output_file.write_bytes(response.content)
        file_size = output_file.stat().st_size
        print(f"✅ Success! Generated: {output_file} ({file_size:,} bytes)")
        print(f"   MIME Type: {response.headers.get('content-type')}")
        print(f"   Filename: {response.headers.get('content-disposition')}")
    else:
        print(f"❌ Failed: {response.status_code} - {response.json()}")

def test_empty_text():
    """Test error handling for empty text"""
    print("\n🚫 Testing empty text validation...")
    
    response = requests.get(f"{API_BASE}/voice", params={"text": ""})
    
    if response.status_code == 400:
        print(f"✅ Correctly rejected: {response.json()['detail']}")
    else:
        print(f"❌ Unexpected response: {response.status_code}")

def test_long_text():
    """Test max length validation"""
    print("\n📏 Testing max length validation...")
    
    text = "a" * 501  # Exceeds 500 char limit
    response = requests.get(f"{API_BASE}/voice", params={"text": text})
    
    if response.status_code == 422:
        print(f"✅ Correctly rejected long text")
    else:
        print(f"❌ Unexpected response: {response.status_code}")

def test_cleanup():
    """Test cleanup endpoint"""
    print("\n🧹 Testing cleanup endpoint...")
    
    response = requests.delete(f"{API_BASE}/voice/cleanup")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Cleanup successful:")
        print(f"   Files cleaned: {data['cleaned']}")
        print(f"   Space freed: {data['size_freed_mb']} MB")
    else:
        print(f"❌ Failed: {response.status_code}")

def test_health():
    """Test health endpoint for TTS availability"""
    print("\n🏥 Checking TTS availability...")
    
    response = requests.get(f"{API_BASE}/health")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Health check:")
        print(f"   Status: {data['status']}")
        print(f"   TTS Available: {data['tts_available']}")
        print(f"   Stack: {data['stack']}")
    else:
        print(f"❌ Failed: {response.status_code}")

def test_multiple_requests():
    """Test multiple concurrent requests"""
    print("\n🔄 Testing multiple requests...")
    
    texts = [
        "First test message",
        "Second test message",
        "Third test message"
    ]
    
    for i, text in enumerate(texts, 1):
        response = requests.get(f"{API_BASE}/voice", params={"text": text})
        if response.status_code == 200:
            filename = f"test_voice_{i}.mp3"
            Path(filename).write_bytes(response.content)
            print(f"✅ Generated {filename} ({len(response.content):,} bytes)")
        else:
            print(f"❌ Failed request {i}: {response.status_code}")

def cleanup_test_files():
    """Remove test MP3 files"""
    print("\n🗑️  Cleaning up test files...")
    
    count = 0
    for file in Path(".").glob("test_voice*.mp3"):
        file.unlink()
        count += 1
    
    print(f"✅ Removed {count} test files")

if __name__ == "__main__":
    print("=" * 60)
    print("Voice API Test Suite")
    print("=" * 60)
    print(f"\nAPI Base: {API_BASE}")
    print("Make sure the backend is running: uvicorn main:app --reload\n")
    
    try:
        # Run tests
        test_health()
        test_voice_generation()
        test_empty_text()
        test_long_text()
        test_multiple_requests()
        test_cleanup()
        
        print("\n" + "=" * 60)
        print("✅ All tests completed!")
        print("=" * 60)
        
        # Cleanup
        cleanup_test_files()
        
    except requests.exceptions.ConnectionError:
        print("\n❌ Error: Cannot connect to API")
        print("   Make sure the backend is running:")
        print("   cd backend && uvicorn main:app --reload")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
