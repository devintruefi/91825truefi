#!/usr/bin/env python3
"""
Check chat_messages table structure
"""

import os
import psycopg2

# Set environment variables
os.environ['DATABASE_URL'] = 'postgresql://truefi_user:truefi.ai101$@127.0.0.1:5433/truefi_app_data?sslmode=disable'

def check_chat_messages():
    """Check chat_messages table structure"""
    try:
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()
        
        print("=== CHAT_MESSAGES TABLE STRUCTURE ===")
        cur.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'chat_messages'
            ORDER BY ordinal_position
        """)
        columns = cur.fetchall()
        for col in columns:
            print(f"  {col[0]} ({col[1]}) {'NULL' if col[2] == 'YES' else 'NOT NULL'}")
        
        print("\n=== FOREIGN KEY CONSTRAINTS ===")
        cur.execute("""
            SELECT 
                tc.constraint_name, 
                tc.table_name, 
                kcu.column_name, 
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name 
            FROM 
                information_schema.table_constraints AS tc 
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                  AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu
                  ON ccu.constraint_name = tc.constraint_name
                  AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND tc.table_name='chat_messages';
        """)
        constraints = cur.fetchall()
        for constraint in constraints:
            print(f"  {constraint[0]}: {constraint[2]} -> {constraint[3]}.{constraint[4]}")
        
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    check_chat_messages() 