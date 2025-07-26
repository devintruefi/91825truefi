#!/usr/bin/env python3
"""
Script to find a real user ID from the database for testing
"""

import psycopg2
from dotenv import load_dotenv
import os

load_dotenv()

def find_test_user():
    """Find a user with financial data for testing"""
    try:
        conn = psycopg2.connect(os.getenv("DATABASE_URL"))
        cur = conn.cursor()
        
        print("🔍 Searching for users with financial data...")
        print("=" * 50)
        
        # Find users with accounts
        cur.execute("""
            SELECT u.id, u.first_name, u.last_name, u.email, 
                   COUNT(a.id) as account_count,
                   COUNT(t.id) as transaction_count,
                   COUNT(g.id) as goal_count
            FROM users u
            LEFT JOIN accounts a ON u.id = a.user_id
            LEFT JOIN transactions t ON u.id = t.user_id
            LEFT JOIN goals g ON u.id = g.user_id
            GROUP BY u.id, u.first_name, u.last_name, u.email
            ORDER BY account_count DESC, transaction_count DESC
            LIMIT 10
        """)
        
        users = cur.fetchall()
        
        if not users:
            print("❌ No users found in database")
            return None
        
        print("📊 Users with financial data:")
        print("-" * 50)
        
        for i, user in enumerate(users, 1):
            user_id, first_name, last_name, email, accounts, transactions, goals = user
            print(f"{i}. {first_name} {last_name} ({email})")
            print(f"   ID: {user_id}")
            print(f"   📈 Accounts: {accounts} | 💰 Transactions: {transactions} | 🎯 Goals: {goals}")
            print()
        
        # Suggest the best user for testing
        best_user = users[0]
        user_id, first_name, last_name, email, accounts, transactions, goals = best_user
        
        print("🎯 Recommended test user:")
        print(f"   Name: {first_name} {last_name}")
        print(f"   Email: {email}")
        print(f"   User ID: {user_id}")
        print(f"   Financial Data: {accounts} accounts, {transactions} transactions, {goals} goals")
        print()
        
        print("💡 To use this user in testing:")
        print(f"   1. Update TEST_USER_ID in test_backend.py to: '{user_id}'")
        print(f"   2. Update TEST_USER_EMAIL in test_backend.py to: '{email}'")
        print()
        
        cur.close()
        conn.close()
        
        return user_id
        
    except Exception as e:
        print(f"❌ Error finding test user: {str(e)}")
        return None

if __name__ == "__main__":
    find_test_user() 