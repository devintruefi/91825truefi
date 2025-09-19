"""
Script to verify that agents are reading database columns correctly for logged-in users
"""

import psycopg2
from config import config
from datetime import datetime
import json
import os

def check_user_data():
    """Verify user data is being read correctly"""

    # Test user ID (Devin Patel)
    user_id = '136e2d19-e31d-4691-94cb-1729585a340e'

    # Get database URL
    database_url = config.get_database_url()
    conn = psycopg2.connect(database_url)
    cur = conn.cursor()

    print("=" * 80)
    print("AGENT DATA VERIFICATION FOR LOGGED-IN USER")
    print("=" * 80)
    print(f"User ID: {user_id}")
    print()

    # 1. Check transaction data availability
    print("1. TRANSACTION DATA CHECK:")
    print("-" * 40)
    cur.execute("""
        SELECT
            COUNT(*) as total_transactions,
            COUNT(DISTINCT date) as unique_dates,
            COUNT(posted_datetime) as has_posted_datetime,
            MIN(date) as earliest_date,
            MAX(date) as latest_date,
            SUM(CASE WHEN amount < 0 THEN 1 ELSE 0 END) as expenses,
            SUM(CASE WHEN amount > 0 THEN 1 ELSE 0 END) as income,
            SUM(CASE WHEN pending = true THEN 1 ELSE 0 END) as pending
        FROM transactions
        WHERE user_id = %s
    """, (user_id,))

    result = cur.fetchone()
    print(f"  Total transactions: {result[0]}")
    print(f"  Unique dates: {result[1]}")
    print(f"  Transactions with posted_datetime: {result[2]}")
    print(f"  Date range: {result[3]} to {result[4]}")
    print(f"  Expense transactions: {result[5]}")
    print(f"  Income transactions: {result[6]}")
    print(f"  Pending transactions: {result[7]}")
    print()

    # 2. Test COALESCE fix for date handling
    print("2. DATE HANDLING TEST (COALESCE Fix):")
    print("-" * 40)

    # August 2025 spending WITH COALESCE (correct)
    cur.execute("""
        SELECT
            COUNT(*) as transaction_count,
            SUM(ABS(amount)) as total_spent
        FROM transactions
        WHERE user_id = %s
            AND amount < 0
            AND pending = false
            AND COALESCE(posted_datetime, date::timestamptz) >= '2025-08-01'
            AND COALESCE(posted_datetime, date::timestamptz) < '2025-09-01'
    """, (user_id,))

    with_coalesce = cur.fetchone()
    print(f"  WITH COALESCE (correct):")
    print(f"    August 2025 transactions: {with_coalesce[0]}")
    print(f"    August 2025 spending: ${with_coalesce[1] if with_coalesce[1] else 0:.2f}")

    # August 2025 spending WITHOUT COALESCE (broken)
    cur.execute("""
        SELECT
            COUNT(*) as transaction_count,
            SUM(ABS(amount)) as total_spent
        FROM transactions
        WHERE user_id = %s
            AND amount < 0
            AND pending = false
            AND posted_datetime >= '2025-08-01'
            AND posted_datetime < '2025-09-01'
    """, (user_id,))

    without_coalesce = cur.fetchone()
    print(f"  WITHOUT COALESCE (broken):")
    print(f"    August 2025 transactions: {without_coalesce[0]}")
    print(f"    August 2025 spending: ${without_coalesce[1] if without_coalesce[1] else 0:.2f}")
    print()

    # 3. Check category data
    print("3. SPENDING BY CATEGORY:")
    print("-" * 40)
    cur.execute("""
        SELECT
            COALESCE(category, 'Uncategorized') as category,
            COUNT(*) as count,
            SUM(ABS(amount)) as total
        FROM transactions
        WHERE user_id = %s
            AND amount < 0
            AND pending = false
        GROUP BY category
        ORDER BY total DESC
        LIMIT 10
    """, (user_id,))

    categories = cur.fetchall()
    for cat, count, total in categories:
        print(f"  {cat:30s}: {count:3d} transactions, ${total:10.2f}")
    print()

    # 4. Check accounts data
    print("4. ACCOUNTS DATA:")
    print("-" * 40)
    cur.execute("""
        SELECT
            name,
            type,
            balance,
            institution_name
        FROM accounts
        WHERE user_id = %s
            AND is_active = true
        ORDER BY balance DESC
    """, (user_id,))

    accounts = cur.fetchall()
    total_balance = 0
    for name, acc_type, balance, institution in accounts:
        print(f"  {name:30s} ({acc_type:10s}): ${balance:12.2f} at {institution}")
        total_balance += balance
    print(f"  {'TOTAL':30s} {'':10s}: ${total_balance:12.2f}")
    print()

    # 5. Check recent transactions sample
    print("5. RECENT TRANSACTIONS (Sample):")
    print("-" * 40)
    cur.execute("""
        SELECT
            COALESCE(posted_datetime, date::timestamptz) as trans_date,
            merchant_name,
            amount,
            category,
            pending
        FROM transactions
        WHERE user_id = %s
        ORDER BY COALESCE(posted_datetime, date::timestamptz) DESC
        LIMIT 10
    """, (user_id,))

    transactions = cur.fetchall()
    for trans_date, merchant, amount, category, pending in transactions:
        status = " (PENDING)" if pending else ""
        print(f"  {trans_date.strftime('%Y-%m-%d')}: {merchant:20s} ${amount:10.2f} [{category}]{status}")
    print()

    # 6. Test the exact SQL that agents would use
    print("6. AGENT SQL QUERY TEST (What was my spending last month?):")
    print("-" * 40)

    # This is the query the SQL Agent should generate with our fix
    current_date = datetime.now()
    cur.execute("""
        SELECT SUM(ABS(amount)) AS total_spent
        FROM transactions
        WHERE user_id = %s
            AND amount < 0
            AND pending = false
            AND COALESCE(posted_datetime, date::timestamptz) >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
            AND COALESCE(posted_datetime, date::timestamptz) < DATE_TRUNC('month', CURRENT_DATE)
    """, (user_id,))

    result = cur.fetchone()[0]
    print(f"  Last month spending (with COALESCE): ${result if result else 0:.2f}")
    print()

    # 7. Profile Pack metrics check
    print("7. PROFILE PACK DERIVED METRICS:")
    print("-" * 40)

    # Monthly average spending (last 3 months)
    cur.execute("""
        SELECT
            AVG(monthly_spend) as avg_monthly_expenses
        FROM (
            SELECT
                DATE_TRUNC('month', COALESCE(posted_datetime, date::timestamptz)) as month,
                SUM(ABS(amount)) as monthly_spend
            FROM transactions
            WHERE user_id = %s
              AND amount < 0
              AND pending = false
              AND COALESCE(posted_datetime, date::timestamptz) >= CURRENT_DATE - INTERVAL '3 months'
            GROUP BY 1
        ) monthly
    """, (user_id,))

    avg_expenses = cur.fetchone()[0]
    print(f"  Average monthly expenses (3 months): ${avg_expenses if avg_expenses else 0:.2f}")

    cur.close()
    conn.close()

    print()
    print("=" * 80)
    print("VERIFICATION COMPLETE")
    print("=" * 80)

if __name__ == "__main__":
    try:
        check_user_data()
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()