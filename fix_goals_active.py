#!/usr/bin/env python3
import os
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database connection
DATABASE_URL = os.getenv('DATABASE_URL')

def fix_goals_active():
    try:
        # Connect to database
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        # Update all goals to have is_active = true where it's currently null
        cur.execute("""
            UPDATE goals 
            SET is_active = true 
            WHERE is_active IS NULL
        """)
        
        updated_count = cur.rowcount
        print(f"Updated {updated_count} goals to have is_active = true")
        
        # Commit the changes
        conn.commit()
        
        # Verify the update
        cur.execute("""
            SELECT COUNT(*) 
            FROM goals 
            WHERE is_active = true
        """)
        
        active_count = cur.fetchone()[0]
        print(f"Total active goals: {active_count}")
        
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    fix_goals_active() 