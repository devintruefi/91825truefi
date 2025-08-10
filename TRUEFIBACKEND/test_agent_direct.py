"""
Quick test script to test the agentic framework directly
"""
import requests
import json

# Test the agent framework endpoint
url = "http://localhost:8080/chat/test-agents"

test_queries = [
    "What's my current net worth?",
    "How much did I spend on food last month?",
    "Show me my top spending categories",
]

print("=" * 80)
print("TESTING AGENTIC FRAMEWORK DIRECTLY")
print("=" * 80)

for query in test_queries:
    print(f"\nQuery: {query}")
    print("-" * 40)
    
    try:
        response = requests.post(url, json={"message": query})
        data = response.json()
        
        if response.status_code == 200:
            print(f"✓ Success: {data.get('success', False)}")
            print(f"Agent Used: {data.get('agent_used', 'unknown')}")
            
            # Show metadata if available
            metadata = data.get('metadata', {})
            if metadata:
                routing = metadata.get('routing', {})
                if routing:
                    print(f"Routing: {routing.get('delegated_to', 'N/A')}")
                    print(f"Query Type: {routing.get('query_type', 'N/A')}")
            
            # Show response preview
            message = data.get('message', '')
            preview = message[:200] + '...' if len(message) > 200 else message
            print(f"Response: {preview}")
        else:
            print(f"✗ Error: {response.status_code}")
            print(f"Details: {data}")
            
    except Exception as e:
        print(f"✗ Request failed: {e}")
    
    print("-" * 40)

print("\n" + "=" * 80)
print("Test complete! Check the backend console for detailed agent logs.")
print("=" * 80)