#!/usr/bin/env python3
"""
Optimized async testing script for TrueFi Chatbot Backend
Uses parallel async calls to avoid timeout issues
"""

import asyncio
import json
import requests
import psycopg2
import jwt
import time
import uuid
from datetime import datetime
from dotenv import load_dotenv
import os

load_dotenv()

# Configuration
FASTAPI_URL = "http://localhost:8000"
DATABASE_URL = os.getenv("DATABASE_URL")
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Test user data
TEST_USER_ID = "127df54c-bbbd-47ff-a147-c8f8c65c69b2"
TEST_USER_EMAIL = "devinpatel_18@yahoo.com"

async def async_post(url, headers, data):
    """Async HTTP POST request with timeout"""
    try:
        import aiohttp
        timeout = aiohttp.ClientTimeout(total=60)  # 60 second timeout
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.post(url, headers=headers, json=data) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    return {"error": f"HTTP {response.status}", "text": await response.text()}
    except ImportError:
        # Fallback to requests if aiohttp not available
        response = requests.post(url, headers=headers, json=data, timeout=60)
        if response.status_code == 200:
            return response.json()
        else:
            return {"error": f"HTTP {response.status_code}", "text": response.text}
    except Exception as e:
        return {"error": str(e)}

class AsyncChatbotTester:
    def __init__(self):
        self.session_id = None
        self.auth_token = None
        self.test_results = []
        
    def log(self, message, level="INFO"):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
        
    def create_test_token(self):
        """Create a JWT token for testing"""
        payload = {
            "userId": TEST_USER_ID,
            "email": TEST_USER_EMAIL,
            "exp": datetime.utcnow().timestamp() + 3600
        }
        self.auth_token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")
        self.log(f"Created test JWT token for user: {TEST_USER_ID}")
        
    def test_database_connection(self):
        """Test database connection and basic queries"""
        self.log("Testing database connection...")
        try:
            conn = psycopg2.connect(DATABASE_URL)
            cur = conn.cursor()
            
            cur.execute("SELECT COUNT(*) FROM users")
            user_count = cur.fetchone()[0]
            self.log(f"Database connection successful. Found {user_count} users")
            
            cur.execute("SELECT first_name, last_name FROM users WHERE id = %s", (TEST_USER_ID,))
            user_data = cur.fetchone()
            if user_data:
                self.log(f"Found test user: {user_data[0]} {user_data[1]}")
            else:
                self.log(f"Warning: Test user {TEST_USER_ID} not found in database", "WARNING")
            
            cur.execute("SELECT COUNT(*) FROM accounts WHERE user_id = %s", (TEST_USER_ID,))
            account_count = cur.fetchone()[0]
            self.log(f"Found {account_count} accounts for test user")
            
            cur.execute("SELECT COUNT(*) FROM transactions WHERE user_id = %s", (TEST_USER_ID,))
            transaction_count = cur.fetchone()[0]
            self.log(f"Found {transaction_count} transactions for test user")
            
            cur.close()
            conn.close()
            self.test_results.append(("Database Connection", "PASS"))
            return True
            
        except Exception as e:
            self.log(f"Database connection failed: {str(e)}", "ERROR")
            self.test_results.append(("Database Connection", "FAIL"))
            return False
    
    def test_fastapi_health(self):
        """Test if FastAPI server is running"""
        self.log("Testing FastAPI server health...")
        try:
            response = requests.get(f"{FASTAPI_URL}/docs", timeout=5)
            if response.status_code == 200:
                self.log("FastAPI server is running and accessible")
                self.test_results.append(("FastAPI Health", "PASS"))
                return True
            else:
                self.log(f"FastAPI server responded with status: {response.status_code}", "WARNING")
                self.test_results.append(("FastAPI Health", "WARNING"))
                return False
        except requests.exceptions.RequestException as e:
            self.log(f"FastAPI server not accessible: {str(e)}", "ERROR")
            self.test_results.append(("FastAPI Health", "FAIL"))
            return False
    
    def test_authentication(self):
        """Test JWT authentication"""
        self.log("Testing JWT authentication...")
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            response = requests.post(
                f"{FASTAPI_URL}/chat",
                headers=headers,
                json={"message": "test", "session_id": str(uuid.uuid4())}
            )
            
            if response.status_code == 200:
                self.log("JWT authentication successful")
                self.test_results.append(("JWT Authentication", "PASS"))
                return True
            else:
                self.log(f"JWT authentication failed: {response.status_code} - {response.text}", "ERROR")
                self.test_results.append(("JWT Authentication", "FAIL"))
                return False
                
        except Exception as e:
            self.log(f"JWT authentication test failed: {str(e)}", "ERROR")
            self.test_results.append(("JWT Authentication", "FAIL"))
            return False
    
    async def test_chat_functionality(self):
        """Test chat functionality with parallel async calls"""
        self.log("Testing chat functionality asynchronously...")
        
        test_questions = [
            "What's my current financial situation?",
            "How much am I spending on food and dining?",
            "What are my savings goals and progress?",
            "Can you analyze my investment portfolio?",
            "What recommendations do you have for improving my budget?"
        ]
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        session_id = str(uuid.uuid4())
        
        # Create tasks for parallel execution
        tasks = []
        for question in test_questions:
            data = {
                "message": question,
                "session_id": session_id,
                "conversation_history": []
            }
            tasks.append(async_post(f"{FASTAPI_URL}/chat", headers, data))
        
        # Execute all requests in parallel
        self.log(f"Executing {len(tasks)} chat requests in parallel...")
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        
        success_count = 0
        for i, resp in enumerate(responses, 1):
            if isinstance(resp, Exception):
                self.log(f"❌ Question {i} failed: {str(resp)}", "ERROR")
            elif "error" in resp:
                self.log(f"❌ Question {i} failed: {resp['error']}", "ERROR")
            else:
                self.log(f"✅ Question {i} success: {resp.get('message', '')[:100]}...")
                success_count += 1
                
                # Store session ID for analysis test
                if not self.session_id:
                    self.session_id = resp.get('session_id')
        
        self.log(f"✅ {success_count}/{len(test_questions)} questions completed successfully")
        self.test_results.append(("Chat Functionality", "PASS" if success_count > 0 else "FAIL"))
        return success_count > 0
    
    async def test_session_analysis(self):
        """Test session end and analysis functionality"""
        if not self.session_id:
            self.log("No session ID available for analysis test", "WARNING")
            self.test_results.append(("Session Analysis", "SKIP"))
            return False
            
        self.log("Testing session analysis...")
        
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            response = await async_post(
                f"{FASTAPI_URL}/end-session",
                headers,
                {"session_id": self.session_id}
            )
            
            if "error" not in response:
                self.log("✅ Session analysis completed successfully")
                
                if response.get('summary'):
                    self.log(f"✅ Analysis summary generated: {len(response['summary'])} chars")
                
                if response.get('insights'):
                    self.log(f"✅ Generated {len(response['insights'])} insights")
                
                self.test_results.append(("Session Analysis", "PASS"))
                return True
            else:
                self.log(f"❌ Session analysis failed: {response['error']}", "ERROR")
                self.test_results.append(("Session Analysis", "FAIL"))
                return False
                
        except Exception as e:
            self.log(f"❌ Session analysis test failed: {str(e)}", "ERROR")
            self.test_results.append(("Session Analysis", "FAIL"))
            return False
    
    async def test_database_writes(self):
        """Test that messages are actually stored in database"""
        self.log("Testing database writes...")
        
        # Use the session from the actual chat test
        session_id = str(uuid.uuid4())
        
        # Send a test message
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        data = {
            "message": "Test database write",
            "session_id": session_id,
            "conversation_history": []
        }
        
        response = requests.post(f"{FASTAPI_URL}/chat", headers=headers, json=data)
        if response.status_code != 200:
            self.log(f"❌ Failed to send test message: {response.status_code}", "ERROR")
            return False
        
        # Check if message was stored
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        # Get the chat_sessions.id for this session_id
        cur.execute("SELECT id FROM chat_sessions WHERE session_id = %s", (session_id,))
        session_row = cur.fetchone()
        
        if session_row:
            chat_session_id = session_row[0]
            cur.execute("SELECT COUNT(*) FROM chat_messages WHERE session_id = %s", (chat_session_id,))
            message_count = cur.fetchone()[0]
            
            if message_count >= 2:  # Should have both user and assistant messages
                self.log(f"✅ Found {message_count} messages in database")
                cur.close()
                conn.close()
                return True
            else:
                self.log(f"❌ Only found {message_count} messages, expected at least 2", "ERROR")
        else:
            self.log("❌ Session not found in database", "ERROR")
        
        cur.close()
        conn.close()
        return False
    
    def print_summary(self):
        """Print test summary"""
        self.log("=" * 60)
        self.log("TEST SUMMARY")
        self.log("=" * 60)
        
        passed = sum(1 for _, status in self.test_results if status == "PASS")
        total = len(self.test_results)
        
        for test_name, status in self.test_results:
            status_icon = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
            self.log(f"{status_icon} {test_name}: {status}")
        
        self.log("=" * 60)
        self.log(f"Overall: {passed}/{total} tests passed")
        
        if passed == total:
            self.log("🎉 All tests passed! Backend is working correctly.")
        else:
            self.log("❌ Some tests failed. Please check the configuration.")
    
    async def run_all_tests(self):
        """Run all tests"""
        self.log("Starting optimized async chatbot backend tests...")
        self.log("=" * 60)
        
        # Create test token
        self.create_test_token()
        
        # Run synchronous tests
        self.test_database_connection()
        self.test_fastapi_health()
        self.test_authentication()
        
        # Run async tests
        await self.test_chat_functionality()
        await self.test_session_analysis()
        
        # Run database write test
        self.test_database_writes()
        
        # Print summary
        self.print_summary()

async def main():
    tester = AsyncChatbotTester()
    await tester.run_all_tests()

if __name__ == "__main__":
    asyncio.run(main()) 