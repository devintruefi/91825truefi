#!/usr/bin/env python3
import os
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database connection
DATABASE_URL = os.getenv('DATABASE_URL')

def check_user_goals():
    try:
        # Connect to database
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        # First, find the user by email
        cur.execute("""
            SELECT id, email, first_name, last_name 
            FROM users 
            WHERE email = %s
        """, ('devinpatel_18@yahoo.com',))
        
        user = cur.fetchone()
        if not user:
            print("User not found!")
            return
            
        user_id, email, first_name, last_name = user
        print(f"Found user: {first_name} {last_name} ({email}) with ID: {user_id}")
        
        # Check if user has any goals
        cur.execute("""
            SELECT id, name, description, target_amount, current_amount, target_date, priority, is_active
            FROM goals 
            WHERE user_id = %s
        """, (user_id,))
        
        goals = cur.fetchall()
        
        if not goals:
            print("\nNo goals found for this user!")
            
            # Check if user has onboarding responses
            cur.execute("""
                SELECT question, answer 
                FROM user_onboarding_responses 
                WHERE user_id = %s 
                AND question IN ('life_goals', 'life_events', 'financial_freedom_vision')
                ORDER BY question
            """, (user_id,))
            
            onboarding_responses = cur.fetchall()
            
            if onboarding_responses:
                print("\nOnboarding responses that could be converted to goals:")
                for question, answer in onboarding_responses:
                    print(f"  {question}: {answer}")
            else:
                print("\nNo relevant onboarding responses found either.")
        else:
            print(f"\nFound {len(goals)} goals:")
            for goal in goals:
                goal_id, name, description, target_amount, current_amount, target_date, priority, is_active = goal
                print(f"  - {name}: ${target_amount} (Current: ${current_amount or 0})")
                if description:
                    print(f"    Description: {description}")
                if target_date:
                    print(f"    Target Date: {target_date}")
                print(f"    Active: {is_active}")
                print()
        
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_user_goals() 