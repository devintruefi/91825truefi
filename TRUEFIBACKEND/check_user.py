"""
Check if a user exists in the database
"""
import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
EMAIL = "devinpatel_18@truefi.ai"

print("Checking database for user...")
print(f"Database URL: {DATABASE_URL[:30]}...")
print(f"Looking for email: {EMAIL}")

try:
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    # Check if user exists
    cur.execute("""
        SELECT id, email, first_name, last_name, is_active, password_hash 
        FROM users 
        WHERE email = %s
    """, (EMAIL,))
    
    user = cur.fetchone()
    
    if user:
        print(f"\n✓ User found!")
        print(f"  ID: {user[0]}")
        print(f"  Email: {user[1]}")
        print(f"  Name: {user[2]} {user[3]}")
        print(f"  Active: {user[4]}")
        print(f"  Has password: {'Yes' if user[5] else 'No'}")
    else:
        print(f"\n✗ User not found with email: {EMAIL}")
        
        # List some users to help find the right one
        print("\nListing first 5 users in database:")
        cur.execute("""
            SELECT email, first_name, last_name, is_active 
            FROM users 
            LIMIT 5
        """)
        
        users = cur.fetchall()
        for u in users:
            print(f"  - {u[0]} ({u[1]} {u[2]}) - Active: {u[3]}")
    
    cur.close()
    conn.close()
    
except Exception as e:
    print(f"\n✗ Database error: {e}")
    print("\nMake sure:")
    print("1. PostgreSQL is running")
    print("2. DATABASE_URL is correct in .env")
    print("3. The database exists and is accessible")