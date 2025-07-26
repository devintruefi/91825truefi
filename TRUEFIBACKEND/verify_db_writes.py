#!/usr/bin/env python3
"""
Verify database writes are working
"""

import psycopg2
import jwt
import uuid
from datetime import datetime
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key")
TEST_USER_ID = "127df54c-bbbd-47ff-a147-c8f8c65c69b2"

def verify_db_writes():
    print("Verifying database writes...")
    
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    # Check recent chat sessions
    cur.execute("""
        SELECT id, session_id, title, created_at 
        FROM chat_sessions 
        WHERE user_id = %s 
        ORDER BY created_at DESC 
        LIMIT 5
    """, (TEST_USER_ID,))
    
    sessions = cur.fetchall()
    print(f"Found {len(sessions)} recent chat sessions:")
    for session in sessions:
        print(f"  - {session[2]} (created: {session[3]})")
        
        # Check messages for this session
        cur.execute("""
            SELECT message_type, content, created_at 
            FROM chat_messages 
            WHERE session_id = %s 
            ORDER BY turn_number
        """, (session[0],))
        
        messages = cur.fetchall()
        print(f"    Messages: {len(messages)}")
        for msg in messages[:2]:  # Show first 2 messages
            print(f"      {msg[0]}: {msg[1][:50]}...")
    
    # Check recent analyses
    cur.execute("""
        SELECT summary, created_at 
        FROM chat_session_analyses 
        WHERE user_id = %s 
        ORDER BY created_at DESC 
        LIMIT 3
    """, (TEST_USER_ID,))
    
    analyses = cur.fetchall()
    print(f"\nFound {len(analyses)} recent session analyses:")
    for analysis in analyses:
        print(f"  - {analysis[0][:100]}... (created: {analysis[1]})")
    
    cur.close()
    conn.close()

if __name__ == "__main__":
    verify_db_writes()