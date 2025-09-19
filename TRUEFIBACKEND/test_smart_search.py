#!/usr/bin/env python3
"""Test script for Smart Search functionality"""

import asyncio
import requests
import json

# Test configuration
BASE_URL = "http://localhost:8080"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMTM2ZTJkMTktZTMxZC00NjkxLTk0Y2ItMTcyOTU4NWEzNDBmIiwidXNlcm5hbWUiOiJkZXZpbnBhdGVsXzE4QHlhaG9vLmNvbSIsImV4cCI6MTc2MDc2MTM3OH0.nH-95MmjFRoyi_qt7pcj6QAMPbkUCu1CA9mEachJufs"

def test_smart_search():
    """Test smart search queries"""

    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json"
    }

    # Test queries for smart search
    test_queries = [
        "Show me all coffee purchases over $5 last month",
        "Find all uber transactions above $20",
        "All transactions at starbucks",
        "Show me purchases between $10 and $50 yesterday",
        "Find all grocery shopping expenses in the last 30 days",
        "Show all transactions over $100"
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
                "session_id": f"test_smart_{hash(query)}",
                "conversation_history": []
            }
        )

        if response.status_code == 200:
            result = response.json()
            print(f"[OK] Response received")

            # Check response
            if "message" in result:
                message = result["message"]
                print(f"\nResponse preview: {message[:300]}...")

                # Check if we got transaction results
                if "transaction" in message.lower() or "found" in message.lower():
                    print("[SUCCESS] Smart Search appears to be working!")
                else:
                    print("[WARNING] Response may not be using Smart Search")

            # Check metadata for intent classification
            if "metadata" in result and result["metadata"]:
                metadata = result["metadata"]
                if "intent" in str(metadata):
                    print(f"Intent detected in metadata")
                    if "transaction_search" in str(metadata).lower():
                        print("[SUCCESS] TRANSACTION_SEARCH intent properly classified!")

        else:
            print(f"[ERROR] Status code: {response.status_code}")
            print(response.text[:500])

        # Brief pause between requests
        import time
        time.sleep(1)

if __name__ == "__main__":
    print("Testing Smart Search Functionality")
    print("This will test various natural language transaction searches")
    test_smart_search()