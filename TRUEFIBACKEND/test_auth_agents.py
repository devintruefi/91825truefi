"""
Test the agentic framework with authentication
"""
import requests
import json

# Login credentials
EMAIL = "devinpatel_18@yahoo.com"  # Corrected email
PASSWORD = "truefitest"
BASE_URL = "http://localhost:8080"

print("=" * 80)
print("TESTING AGENTIC FRAMEWORK WITH AUTHENTICATION")
print("=" * 80)

# Step 1: Login to get token
print("\n1. Logging in...")
login_response = requests.post(
    f"{BASE_URL}/api/auth/login",
    json={"email": EMAIL, "password": PASSWORD}
)

if login_response.status_code != 200:
    print(f"Login failed: {login_response.status_code}")
    print(login_response.text)
    exit(1)

login_data = login_response.json()
token = login_data.get("token")
user_id = login_data.get("id")
print(f"✓ Logged in as: {login_data.get('first_name')} {login_data.get('last_name')}")
print(f"  User ID: {user_id}")
print(f"  Token: {token[:20]}...")

# Step 2: Test authenticated chat endpoint with agent framework
print("\n2. Testing chat with question: 'what did i spend at whole foods'")
print("-" * 40)

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

chat_response = requests.post(
    f"{BASE_URL}/chat",
    headers=headers,
    json={
        "message": "what did i spend at whole foods",
        "session_id": f"test-session-auth"
    }
)

if chat_response.status_code == 200:
    chat_data = chat_response.json()
    print(f"✓ Chat response received")
    
    # Check metadata to see if agents were used
    metadata = chat_data.get("metadata", {})
    if metadata:
        print("\nAGENT METADATA:")
        routing = metadata.get("routing", {})
        if routing:
            print(f"  Delegated to: {routing.get('delegated_to')}")
            print(f"  Query type: {routing.get('query_type')}")
            print(f"  Required agents: {routing.get('required_agents')}")
        
        sql_perf = metadata.get("sql_agent_performance")
        if sql_perf:
            print(f"\nSQL AGENT PERFORMANCE:")
            print(f"  Success: {sql_perf.get('success')}")
            print(f"  Row count: {sql_perf.get('row_count')}")
    else:
        print("⚠️ No metadata returned - agents may not have been used")
    
    # Show response
    message = chat_data.get("message", "")
    print(f"\nRESPONSE:")
    print(f"{message[:500]}..." if len(message) > 500 else message)
else:
    print(f"✗ Chat failed: {chat_response.status_code}")
    print(chat_response.text)

# Step 3: Check agent logs
print("\n3. Checking agent logs...")
print("-" * 40)

logs_response = requests.get(
    f"{BASE_URL}/api/agents/logs",
    headers=headers
)

if logs_response.status_code == 200:
    logs_data = logs_response.json()
    print(f"Total agent executions: {logs_data.get('total_executions', 0)}")
    
    logs = logs_data.get("logs", [])
    if logs:
        print(f"Recent logs found: {len(logs)}")
        for log in logs[:3]:
            print(f"\n  Agent: {log.get('agent_name')}")
            print(f"  User: {log.get('user_id')}")
            print(f"  Time: {log.get('execution_time_ms', 0):.2f}ms")
    else:
        print("⚠️ No agent logs found - agents were not executed")
else:
    print(f"Failed to get logs: {logs_response.status_code}")

print("\n" + "=" * 80)
print("TEST COMPLETE")
print("Check the backend console for detailed agent execution logs")
print("=" * 80)