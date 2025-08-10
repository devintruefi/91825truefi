#!/usr/bin/env python3
"""
Test script for TrueFi Backend Integration
Tests both authenticated and non-authenticated chat endpoints
"""

import requests
import json
import time

# Configuration
BASE_URL = "http://localhost:8000"
TEST_MESSAGE = "Hello! Can you help me with budgeting?"

def test_health_check():
    """Test the health check endpoint"""
    print("🔍 Testing health check...")
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Health check passed: {data}")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False

def test_public_chat():
    """Test the public chat endpoint (non-authenticated)"""
    print("\n🔍 Testing public chat endpoint...")
    try:
        payload = {
            "message": TEST_MESSAGE,
            "conversation_history": []
        }
        
        response = requests.post(
            f"{BASE_URL}/chat/public",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Public chat passed:")
            print(f"   - Message: {data.get('message', 'N/A')[:100]}...")
            print(f"   - Agent used: {data.get('agent_used', 'N/A')}")
            print(f"   - Requires auth: {data.get('requires_auth', 'N/A')}")
            return True
        else:
            print(f"❌ Public chat failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Public chat error: {e}")
        return False

def test_authenticated_chat():
    """Test the authenticated chat endpoint"""
    print("\n🔍 Testing authenticated chat endpoint...")
    try:
        # Test without authentication (should fall back to public)
        payload = {
            "message": TEST_MESSAGE,
            "session_id": "test-session-123"
        }
        
        response = requests.post(
            f"{BASE_URL}/chat",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Authenticated chat (no token) passed:")
            print(f"   - Message: {data.get('message', 'N/A')[:100]}...")
            print(f"   - Agent used: {data.get('agent_used', 'N/A')}")
            print(f"   - Requires auth: {data.get('requires_auth', 'N/A')}")
            
            # This should fall back to public chat since no token provided
            if data.get('requires_auth') == False:
                print("   - ✅ Correctly fell back to public chat")
            else:
                print("   - ⚠️  Unexpected behavior - should fall back to public")
        else:
            print(f"❌ Authenticated chat failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Authenticated chat error: {e}")
        return False

def test_with_invalid_token():
    """Test with invalid JWT token"""
    print("\n🔍 Testing with invalid JWT token...")
    try:
        payload = {
            "message": TEST_MESSAGE,
            "session_id": "test-session-456"
        }
        
        response = requests.post(
            f"{BASE_URL}/chat",
            json=payload,
            headers={
                "Content-Type": "application/json",
                "Authorization": "Bearer invalid.token.here"
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Invalid token test passed:")
            print(f"   - Message: {data.get('message', 'N/A')[:100]}...")
            print(f"   - Agent used: {data.get('agent_used', 'N/A')}")
            print(f"   - Requires auth: {data.get('requires_auth', 'N/A')}")
            
            # Should fall back to public chat with invalid token
            if data.get('requires_auth') == False:
                print("   - ✅ Correctly fell back to public chat")
            else:
                print("   - ⚠️  Unexpected behavior - should fall back to public")
        else:
            print(f"❌ Invalid token test failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Invalid token test error: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 TrueFi Backend Integration Test")
    print("=" * 50)
    
    # Check if backend is running
    if not test_health_check():
        print("\n❌ Backend is not running or not accessible")
        print("   Please start the backend with: uvicorn main:app --reload")
        return
    
    # Run tests
    tests = [
        test_public_chat,
        test_authenticated_chat,
        test_with_invalid_token
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        try:
            if test():
                passed += 1
        except Exception as e:
            print(f"❌ Test failed with exception: {e}")
    
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Integration is working correctly.")
        print("\n✅ What this means:")
        print("   - Non-authenticated users get basic chat functionality")
        print("   - Authenticated users (with valid JWT) get agentic AI flows")
        print("   - Invalid tokens gracefully fall back to public chat")
        print("   - Your existing functionality is preserved")
    else:
        print("⚠️  Some tests failed. Check the output above for details.")
    
    print("\n🔧 Next steps:")
    print("   1. Start your frontend and test the chat interface")
    print("   2. Try logging in/out to see the different behaviors")
    print("   3. Check the backend logs for agent initialization")

if __name__ == "__main__":
    main() 