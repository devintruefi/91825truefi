"""
Test script for the TrueFi Agentic Framework
This script tests the full agent framework with comprehensive logging
"""

import asyncio
import aiohttp
import json
import time
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

# Configuration
BASE_URL = "http://localhost:8080"
TEST_USER_EMAIL = "test@example.com"  # Update with a real user email
TEST_USER_PASSWORD = "password123"  # Update with the real password

# Test queries to exercise different parts of the framework
TEST_QUERIES = [
    # Basic queries
    "What's my current net worth?",
    "How much did I spend on food last month?",
    "Show me my top 5 spending categories",
    
    # Complex queries requiring SQL agent
    "What merchants did I spend the most at in the last 3 months?",
    "Compare my spending this month vs last month",
    "How much do I have in my checking accounts?",
    
    # Queries with entity resolution
    "How much did I spend at Starbucks?",
    "Show me transactions from my Chase account",
    "What's my progress on my emergency fund goal?",
    
    # Analytical queries
    "Analyze my spending patterns and suggest where I can save money",
    "What's my average monthly spending on entertainment?",
    "Calculate my savings rate for the past 6 months",
]

async def login(session):
    """Login and get authentication token"""
    print("=" * 80)
    print("LOGGING IN")
    print("=" * 80)
    
    login_data = {
        "email": TEST_USER_EMAIL,
        "password": TEST_USER_PASSWORD
    }
    
    async with session.post(f"{BASE_URL}/api/auth/login", json=login_data) as resp:
        if resp.status == 200:
            data = await resp.json()
            token = data.get("token")
            user_id = data.get("id")
            print(f"✅ Login successful")
            print(f"  User ID: {user_id}")
            print(f"  Name: {data.get('first_name')} {data.get('last_name')}")
            return token, user_id
        else:
            print(f"❌ Login failed: {resp.status}")
            text = await resp.text()
            print(f"  Response: {text}")
            return None, None

async def test_chat_query(session, token, query, session_id):
    """Test a single chat query"""
    print("\n" + "-" * 60)
    print(f"QUERY: {query}")
    print("-" * 60)
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    chat_data = {
        "message": query,
        "session_id": session_id,
        "conversation_history": []
    }
    
    start_time = time.time()
    
    async with session.post(f"{BASE_URL}/chat", headers=headers, json=chat_data) as resp:
        elapsed = time.time() - start_time
        
        if resp.status == 200:
            data = await resp.json()
            
            print(f"✅ Response received in {elapsed:.2f}s")
            
            # Check if using agent framework
            agent_used = data.get("agent_used", "unknown")
            print(f"  Agent Used: {agent_used}")
            
            # Display metadata if available
            metadata = data.get("metadata", {})
            if metadata:
                print("\nMETADATA:")
                
                # Routing information
                routing = metadata.get("routing", {})
                if routing:
                    print(f"  Routing:")
                    print(f"    - Delegated to: {routing.get('delegated_to')}")
                    print(f"    - Query type: {routing.get('query_type')}")
                    print(f"    - Required agents: {routing.get('required_agents')}")
                    print(f"    - Reasoning: {routing.get('reasoning', '')[:100]}...")
                
                # SQL performance
                sql_perf = metadata.get("sql_agent_performance")
                if sql_perf:
                    print(f"  SQL Performance:")
                    print(f"    - Success: {sql_perf.get('success')}")
                    print(f"    - Row count: {sql_perf.get('row_count')}")
                    print(f"    - Execution time: {sql_perf.get('execution_time')}s")
                
                # Entity resolution
                if metadata.get("merchant_hints"):
                    print(f"  Entity Resolution:")
                    print(f"    - Merchant hints: {metadata['merchant_hints']}")
                
                # Semantic interpretation
                if metadata.get("semantic_interpretation"):
                    print(f"  Semantic Interpretation: Present")
                
                # Query adaptation
                if metadata.get("query_adapted"):
                    print(f"  Query Adapted: Yes")
                
                # Validation
                if metadata.get("validation_status"):
                    print(f"  Validation: {metadata['validation_status']}")
            
            # Display response preview
            response = data.get("message", data.get("response", ""))
            print(f"\nRESPONSE PREVIEW:")
            print(f"  {response[:300]}..." if len(response) > 300 else f"  {response}")
            
            return True
            
        else:
            print(f"❌ Request failed: {resp.status}")
            text = await resp.text()
            print(f"  Error: {text}")
            return False

async def get_agent_logs(session, token):
    """Retrieve and display agent execution logs"""
    print("\n" + "=" * 80)
    print("AGENT EXECUTION LOGS")
    print("=" * 80)
    
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    async with session.get(f"{BASE_URL}/api/agents/logs", headers=headers) as resp:
        if resp.status == 200:
            data = await resp.json()
            
            print(f"Total Executions: {data.get('total_executions', 0)}")
            print(f"Successful: {data.get('successful_executions', 0)}")
            print(f"Failed: {data.get('failed_executions', 0)}")
            
            details = data.get('details', {})
            if details:
                print(f"\nDetails:")
                print(f"  Supervisor Executions: {details.get('supervisor_executions', 0)}")
                print(f"  SQL Executions: {details.get('sql_executions', 0)}")
                print(f"  Avg Execution Time: {details.get('avg_execution_time', 0):.2f}ms")
            
            # Show recent logs
            logs = data.get('logs', [])
            if logs:
                print(f"\nRecent Logs (showing last 5):")
                for log in logs[:5]:
                    print(f"\n  [{log.get('timestamp', 0)}] {log.get('agent_name')}:")
                    summary = log.get('summary', {})
                    print(f"    Query: {summary.get('query', 'N/A')}")
                    print(f"    Status: {log.get('status')}")
                    print(f"    Performance: {log.get('performance')}")
                    print(f"    Execution Time: {log.get('execution_time_ms', 0):.2f}ms")
                    
                    if log.get('error_message'):
                        print(f"    ERROR: {log['error_message']}")

async def get_agent_status(session, token):
    """Check agent system status"""
    print("\n" + "=" * 80)
    print("AGENT SYSTEM STATUS")
    print("=" * 80)
    
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    async with session.get(f"{BASE_URL}/api/agents/status", headers=headers) as resp:
        if resp.status == 200:
            data = await resp.json()
            
            print(f"Status: {data.get('status')}")
            print(f"Health: {data.get('health')}")
            print(f"Database Connected: {data.get('database_connected')}")
            print(f"Agent Count: {data.get('agent_count')}")
            print(f"Version: {data.get('version')}")

async def clear_agent_logs(session, token):
    """Clear agent logs"""
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    async with session.post(f"{BASE_URL}/api/agents/logs/clear", headers=headers) as resp:
        if resp.status == 200:
            print("✅ Agent logs cleared")

async def main():
    """Main test function"""
    print("=" * 80)
    print("TRUEFI AGENTIC FRAMEWORK TEST")
    print(f"Time: {datetime.now()}")
    print("=" * 80)
    
    # Check if backend is running
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{BASE_URL}/health") as resp:
                if resp.status == 200:
                    health = await resp.json()
                    print(f"✅ Backend is healthy")
                    print(f"  Agent System: {health.get('agent_system')}")
                    print(f"  Database: {health.get('database')}")
                else:
                    print(f"❌ Backend health check failed")
                    return
    except Exception as e:
        print(f"❌ Cannot connect to backend: {e}")
        print("Make sure the FastAPI backend is running on port 8000")
        return
    
    async with aiohttp.ClientSession() as session:
        # Login
        token, user_id = await login(session)
        if not token:
            print("Cannot proceed without authentication")
            return
        
        # Check agent status
        await get_agent_status(session, token)
        
        # Clear previous logs for clean test
        await clear_agent_logs(session, token)
        
        # Create a session ID for this test
        session_id = f"test-session-{int(time.time())}"
        print(f"\nSession ID: {session_id}")
        
        # Test each query
        print("\n" + "=" * 80)
        print("TESTING QUERIES")
        print("=" * 80)
        
        successful = 0
        failed = 0
        
        for i, query in enumerate(TEST_QUERIES, 1):
            print(f"\n[{i}/{len(TEST_QUERIES)}]", end="")
            
            success = await test_chat_query(session, token, query, session_id)
            if success:
                successful += 1
            else:
                failed += 1
            
            # Small delay between queries
            await asyncio.sleep(1)
        
        # Get final logs
        await get_agent_logs(session, token)
        
        # Summary
        print("\n" + "=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)
        print(f"Total Queries: {len(TEST_QUERIES)}")
        print(f"Successful: {successful}")
        print(f"Failed: {failed}")
        print(f"Success Rate: {(successful/len(TEST_QUERIES)*100):.1f}%")
        
        if failed == 0:
            print("\n✅ ALL TESTS PASSED! The agentic framework is working correctly.")
        else:
            print(f"\n⚠️ {failed} tests failed. Check the logs above for details.")

if __name__ == "__main__":
    asyncio.run(main())