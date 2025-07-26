#!/usr/bin/env python3
"""
Check if chat_session_analyses table exists
"""

import psycopg2
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def check_analysis_table():
    """Check if chat_session_analyses table exists"""
    print("Checking if chat_session_analyses table exists...")
    
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        # Check if table exists
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'chat_session_analyses'
            );
        """)
        
        table_exists = cur.fetchone()[0]
        print(f"chat_session_analyses table exists: {table_exists}")
        
        if table_exists:
            # Check table structure
            cur.execute("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'chat_session_analyses'
                ORDER BY ordinal_position;
            """)
            
            columns = cur.fetchall()
            print("\nTable structure:")
            for col in columns:
                print(f"  {col[0]}: {col[1]}")
        
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"Database error: {str(e)}")

if __name__ == "__main__":
    check_analysis_table()