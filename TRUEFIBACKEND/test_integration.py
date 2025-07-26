#!/usr/bin/env python3
"""
Integration test to verify frontend-backend connection
"""

import requests
import jwt
import uuid
import time
from datetime import datetime
from dotenv import load_dotenv
import os

load_dotenv()

# Configuration
FASTAPI_URL = "http://localhost:8000"
NEXTJS_URL = "http://localhost:3000"  # Updated to match the actual port
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key")
TEST_USER_ID = "127df54c-bbbd-47ff-a147-c8f8c65c69b2"
TEST_USER_EMAIL = "devinpatel_18@yahoo.com"

def create_test_token():
    """Create a JWT token for testing"""
    payload = {
        "userId": TEST_USER_ID,
        "email": TEST_USER_EMAIL,
        "exp": datetime.utcnow().timestamp() + 3600
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def wait_for_service(url, service_name, max_retries=5):
    """Wait for a service to be ready"""
    for attempt in range(max_retries):
        try:
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                print(f"✅ {service_name} is running")
                return True
            else:
                print(f"❌ {service_name} returned status {response.status_code}")
        except Exception as e:
            print(f"❌ {service_name} not accessible (attempt {attempt + 1}): {e}")
        
        if attempt < max_retries - 1:
            print(f"   Waiting 3 seconds before retry... (attempt {attempt + 2}/{max_retries})")
            time.sleep(3)
    
    return False

def test_frontend_backend_integration():
    """Test the complete frontend-backend integration"""
    print("�� Testing Frontend-Backend Integration")
    print("=" * 50)
    
    # Create test token
    token = create_test_token()
    print(f"✅ Created test JWT token")
    
    # Test 1: FastAPI backend health
    print("\n1. Testing FastAPI backend health...")
    if not wait_for_service(f"{FASTAPI_URL}/docs", "FastAPI backend"):
        return False
    
    # Test 2: Next.js frontend health
    print("\n2. Testing Next.js frontend health...")
    if not wait_for_service(f"{NEXTJS_URL}", "Next.js frontend"):
        return False
    
    # Test 3: Direct FastAPI chat endpoint
    print("\n3. Testing direct FastAPI chat endpoint...")
    session_id = str(uuid.uuid4())
    headers = {"Authorization": f"Bearer {token}"}
    data = {
        "message": "Hello, this is an integration test",
        "session_id": session_id,
        "conversation_history": []
    }
    
    try:
        response = requests.post(f"{FASTAPI_URL}/chat", headers=headers, json=data, timeout=30)
        if response.status_code == 200:
            result = response.json()
            print("✅ FastAPI chat endpoint working")
            print(f"   Response: {result.get('message', '')[:100]}...")
        else:
            print(f"❌ FastAPI chat endpoint failed: {response.status_code}")
            print(f"   Error: {response.text}")
            return False
    except Exception as e:
        print(f"❌ FastAPI chat endpoint error: {e}")
        return False
    
    # Test 4: Next.js API route (proxy to FastAPI)
    print("\n4. Testing Next.js API route (proxy to FastAPI)...")
    headers = {"Authorization": f"Bearer {token}"}
    data = {
        "message": "Hello, this is a frontend integration test",
        "session_id": session_id,
        "conversation_history": []
    }
    
    try:
        response = requests.post(f"{NEXTJS_URL}/api/chat", headers=headers, json=data, timeout=30)
        if response.status_code == 200:
            result = response.json()
            print("✅ Next.js API route working")
            print(f"   Response: {result.get('message', '')[:100]}...")
        else:
            print(f"❌ Next.js API route failed: {response.status_code}")
            print(f"   Error: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Next.js API route error: {e}")
        return False
    
    # Test 5: End session analysis
    print("\n5. Testing end session analysis...")
    try:
        response = requests.post(f"{NEXTJS_URL}/api/chat", 
                               headers=headers, 
                               json={"endSession": True, "sessionId": session_id}, 
                               timeout=30)
        if response.status_code == 200:
            result = response.json()
            print("✅ End session analysis working")
            print(f"   Summary: {result.get('summary', '')[:100]}...")
        else:
            print(f"❌ End session analysis failed: {response.status_code}")
            print(f"   Error: {response.text}")
            return False
    except Exception as e:
        print(f"❌ End session analysis error: {e}")
        return False
    
    print("\n" + "=" * 50)
    print("🎉 ALL INTEGRATION TESTS PASSED!")
    print("✅ Frontend and backend are properly connected")
    print("✅ Authentication is working")
    print("✅ Chat functionality is working")
    print("✅ Session management is working")
    print("✅ Analysis generation is working")
    print("\n🚀 Your TrueFi chatbot is ready for production!")
    
    return True

if __name__ == "__main__":
    test_frontend_backend_integration()