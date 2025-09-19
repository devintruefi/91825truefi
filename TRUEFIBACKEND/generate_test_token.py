#!/usr/bin/env python3
"""Generate a test JWT token for testing"""

import jwt
from datetime import datetime, timedelta

# This should match your JWT secret from config
SECRET_KEY = "6f7b0f47c27a44b0a0fc781c2e3e84b50a0f6f7a1c9d8c25b7d0fa492ce2a35b"
ALGORITHM = "HS256"

def generate_test_token():
    """Generate a test token for devinpatel_18@yahoo.com"""

    payload = {
        "user_id": "136e2d19-e31d-4691-94cb-1729585a340f",
        "username": "devinpatel_18@yahoo.com",
        "exp": datetime.utcnow() + timedelta(days=30)  # Valid for 30 days
    }

    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

    print(f"Generated token (valid for 30 days):")
    print(token)
    print(f"\nUser ID: {payload['user_id']}")
    print(f"Username: {payload['username']}")
    print(f"Expires: {payload['exp']}")

    return token

if __name__ == "__main__":
    generate_test_token()