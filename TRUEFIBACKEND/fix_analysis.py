#!/usr/bin/env python3
"""
Test and fix the analysis prompt
"""

import requests
import jwt
import uuid
from datetime import datetime
from dotenv import load_dotenv
import os

load_dotenv()

# Configuration
FASTAPI_URL = "http://localhost:8000"
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

def test_simple_analysis():
    """Test a simple analysis without complex JSON parsing"""
    print("Testing simple analysis...")
    
    # Create test token
    auth_token = create_test_token()
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    # Use an existing session
    session_id = "b25766ca-9da7-4dd8-8e2a-02ab81819b43"
    
    try:
        # First, let's test the chat endpoint to make sure it works
        chat_data = {
            "message": "Hello, this is a test for analysis",
            "session_id": session_id,
            "conversation_history": []
        }
        
        print("Sending chat message...")
        chat_response = requests.post(
            f"{FASTAPI_URL}/chat",
            headers=headers,
            json=chat_data,
            timeout=30
        )
        
        if chat_response.status_code == 200:
            print("✅ Chat message sent successfully")
            
            # Now test end-session
            end_session_data = {"session_id": session_id}
            
            print("Testing end-session...")
            end_response = requests.post(
                f"{FASTAPI_URL}/end-session",
                headers=headers,
                json=end_session_data,
                timeout=60
            )
            
            print(f"End-session status: {end_response.status_code}")
            print(f"End-session response: {end_response.text}")
            
        else:
            print(f"❌ Chat failed: {chat_response.status_code} - {chat_response.text}")
            
    except Exception as e:
        print(f"❌ Exception: {str(e)}")

if __name__ == "__main__":
    test_simple_analysis()