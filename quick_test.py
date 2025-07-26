#!/usr/bin/env python3
"""
Quick Test Script for TrueFi Chatbot Backend
Run this first to check basic functionality
"""

import requests
import os
from dotenv import load_dotenv

load_dotenv()

def quick_test():
    print("🚀 Quick Test for TrueFi Chatbot Backend")
    print("=" * 50)
    
    # Check environment variables
    print("1. Checking environment variables...")
    required_vars = ["DATABASE_URL", "JWT_SECRET", "OPENAI_API_KEY"]
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        print(f"❌ Missing: {', '.join(missing_vars)}")
        print("Please set these in your .env file")
        return False
    else:
        print("✅ All environment variables set")
    
    # Check Next.js frontend
    print("\n2. Checking Next.js frontend...")
    try:
        response = requests.get("http://localhost:3000", timeout=5)
        if response.status_code == 200:
            print("✅ Next.js frontend is running")
        else:
            print(f"⚠️ Next.js responded with status {response.status_code}")
    except:
        print("❌ Next.js frontend is not running")
        print("   Run: npm run dev")
    
    # Check FastAPI backend
    print("\n3. Checking FastAPI backend...")
    try:
        response = requests.get("http://localhost:8000/docs", timeout=5)
        if response.status_code == 200:
            print("✅ FastAPI backend is running")
        else:
            print(f"⚠️ FastAPI responded with status {response.status_code}")
    except:
        print("❌ FastAPI backend is not running")
        print("   Run: cd TRUEFIBACKEND && uvicorn main:app --reload")
    
    # Test unauthenticated chat
    print("\n4. Testing unauthenticated chat...")
    try:
        response = requests.post(
            "http://localhost:3000/api/chat",
            headers={"Content-Type": "application/json", "Accept": "text/plain"},
            json={"message": "Hello", "conversationHistory": []},
            timeout=10
        )
        if response.status_code == 200:
            print("✅ Unauthenticated chat is working")
        else:
            print(f"❌ Unauthenticated chat failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Unauthenticated chat error: {str(e)}")
    
    print("\n" + "=" * 50)
    print("Quick test completed!")
    print("\nNext steps:")
    print("1. If all checks passed: Run 'python run_comprehensive_tests.py'")
    print("2. If some failed: Check the error messages above")
    print("3. For detailed testing: Follow TESTING_INSTRUCTIONS.md")

if __name__ == "__main__":
    quick_test() 