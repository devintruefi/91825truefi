#!/usr/bin/env python3

"""
Test database connection and simple query
"""

import logging
from db import DatabasePool

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_basic_connection():
    """Test basic database connection and simple query"""
    try:
        logger.info("Testing basic database connection...")

        # Initialize database pool
        db_pool = DatabasePool()

        # Test user ID from the error log
        test_user_id = "136e2d19-e31d-4691-94cb-1729585a340e"

        # Simple query that should work
        simple_query = """
        SELECT
            id, first_name, last_name, email
        FROM users
        WHERE id = %(user_id)s
        """

        logger.info("Testing simple user query...")
        result = db_pool.execute_query(simple_query, {'user_id': test_user_id}, fetch_one=True)

        if result:
            logger.info(f"✅ Simple query worked: {result[0]}")
        else:
            logger.info("❌ No user found")

        # Test a query with aggregation (similar to the failing one)
        agg_query = """
        SELECT
            COUNT(*) as account_count,
            COALESCE(SUM(balance), 0) as total_balance
        FROM accounts
        WHERE user_id = %(user_id)s
          AND is_active = true
        """

        logger.info("Testing aggregation query...")
        agg_result = db_pool.execute_query(agg_query, {'user_id': test_user_id}, fetch_one=True)

        if agg_result:
            logger.info(f"✅ Aggregation query worked: {agg_result[0]}")
        else:
            logger.info("❌ Aggregation query failed")

        logger.info("✅ Database connection tests passed!")
        return True

    except Exception as e:
        logger.error(f"❌ Database test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_basic_connection()