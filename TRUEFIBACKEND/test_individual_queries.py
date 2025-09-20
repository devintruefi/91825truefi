#!/usr/bin/env python3

"""
Test individual queries to isolate the issue
"""

import logging
from db import DatabasePool

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_individual_queries():
    """Test each query that's failing individually"""
    try:
        # Initialize database pool
        db_pool = DatabasePool()
        test_user_id = "136e2d19-e31d-4691-94cb-1729585a340e"

        # Test 1: Assets query
        assets_query = """
        SELECT
            type,
            subtype,
            COALESCE(SUM(balance), 0) as total_balance,
            COUNT(*) as account_count
        FROM accounts
        WHERE user_id = %(user_id)s
          AND is_active = true
        GROUP BY type, subtype
        """

        logger.info("Testing assets query...")
        assets = db_pool.execute_query(assets_query, {'user_id': test_user_id})
        logger.info(f"✅ Assets query: {len(assets)} results")

        # Test 2: Liabilities query
        liabilities_query = """
        SELECT
            COALESCE(SUM(balance), 0) as total_debt
        FROM accounts
        WHERE user_id = %(user_id)s
          AND is_active = true
          AND type = 'credit'
        """

        logger.info("Testing liabilities query...")
        liabilities = db_pool.execute_query(liabilities_query, {'user_id': test_user_id}, fetch_one=True)
        logger.info(f"✅ Liabilities query: {liabilities}")

        # Test 3: Expenses query (this might be the problematic one)
        expenses_query = """
        SELECT
            AVG(monthly_spend) as avg_monthly_expenses,
            AVG(essential_spend) as avg_essential_expenses,
            AVG(discretionary_spend) as avg_discretionary_expenses
        FROM (
            SELECT
                DATE_TRUNC('month', COALESCE(posted_datetime, date::timestamptz)) as month,
                SUM(ABS(amount)) as monthly_spend,
                SUM(CASE WHEN pfc_primary IN ('FOOD_AND_DRINK', 'TRANSPORTATION', 'BILLS_AND_UTILITIES', 'HEALTHCARE')
                    THEN ABS(amount) ELSE 0 END) as essential_spend,
                SUM(CASE WHEN pfc_primary IN ('ENTERTAINMENT', 'GENERAL_MERCHANDISE', 'PERSONAL')
                    THEN ABS(amount) ELSE 0 END) as discretionary_spend
            FROM transactions
            WHERE user_id = %(user_id)s
              AND amount < 0
              AND pending = false
              AND COALESCE(posted_datetime, date::timestamptz) >= CURRENT_DATE - INTERVAL '3 months'
            GROUP BY 1
        ) monthly
        """

        logger.info("Testing expenses query...")
        expenses = db_pool.execute_query(expenses_query, {'user_id': test_user_id}, fetch_one=True)
        logger.info(f"✅ Expenses query: {expenses}")

        # Test 4: Income query (simplified to avoid LIKE operator issues)
        income_query = """
        SELECT
            AVG(monthly_income) as avg_monthly_income,
            AVG(monthly_income * 0.8) as avg_salary_income,
            AVG(monthly_income * 0.2) as avg_other_income
        FROM (
            SELECT
                DATE_TRUNC('month', COALESCE(posted_datetime, date::timestamptz)) as month,
                SUM(amount) as monthly_income
            FROM transactions
            WHERE user_id = %(user_id)s
              AND amount > 0
              AND pending = false
              AND COALESCE(posted_datetime, date::timestamptz) >= CURRENT_DATE - INTERVAL '3 months'
            GROUP BY 1
        ) monthly
        """

        logger.info("Testing income query...")
        income = db_pool.execute_query(income_query, {'user_id': test_user_id}, fetch_one=True)
        logger.info(f"✅ Income query: {income}")

        logger.info("✅ All individual queries passed!")
        return True

    except Exception as e:
        logger.error(f"❌ Query test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_individual_queries()