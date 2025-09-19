#!/usr/bin/env python3
"""Test script to verify enhanced SQL agent with balance queries"""

import asyncio
import requests
import json

# Test configuration
BASE_URL = "http://localhost:8080"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMTM2ZTJkMTktZTMxZC00NjkxLTk0Y2ItMTcyOTU4NWEzNDBmIiwidXNlcm5hbWUiOiJkZXZpbnBhdGVsXzE4QHlhaG9vLmNvbSIsImV4cCI6MTczNzQzNDE1NX0.U4QlJnl_i7X9cIcJxNOQqCcdNUf7bJoZ0nP9zCOiZ6s"

def test_balance_query():
    """Test that balance queries use accounts table"""

    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json"
    }

    # Test query that should trigger account balance intent
    test_queries = [
        "What is my total balance across all accounts?",
        "How much money do I have in my accounts?",
        "What's my current cash balance?"
    ]

    for query in test_queries:
        print(f"\n{'='*60}")
        print(f"Testing: {query}")
        print('='*60)

        response = requests.post(
            f"{BASE_URL}/chat",
            headers=headers,
            json={
                "message": query,
                "session_id": f"test_session_{hash(query)}",
                "conversation_history": []
            }
        )

        if response.status_code == 200:
            result = response.json()
            print(f"✅ Response received")

            # Check if the response contains balance information
            if "message" in result:
                message = result["message"]
                print(f"\nResponse: {message[:500]}...")

                # Check for correct balance amount ($62,432.60)
                if "62,432" in message or "62432" in message:
                    print("✅ CORRECT: Found the right account balance!")
                elif "119,213" in message or "-119213" in message:
                    print("❌ ERROR: Still using transaction sum instead of account balance")
                else:
                    print("⚠️  Could not determine if correct balance was returned")

            # Check metadata if available
            if "metadata" in result and result["metadata"]:
                print(f"\nMetadata: {json.dumps(result['metadata'], indent=2)[:500]}...")

        else:
            print(f"❌ Error: {response.status_code}")
            print(response.text[:500])

if __name__ == "__main__":
    print("Testing Enhanced SQL Agent Balance Queries")
    print("Expected balance: $62,432.60 (from accounts table)")
    print("Wrong balance: -$119,213.19 (from transaction sum)")
    test_balance_query()