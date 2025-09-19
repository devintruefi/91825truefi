# TRUEFIBACKEND/db.py
# Database connection and query execution with safety measures

import psycopg2
from psycopg2.pool import ThreadedConnectionPool
from psycopg2.extras import RealDictCursor
from typing import List, Dict, Any, Optional, Tuple
import logging
from contextlib import contextmanager
from config import config

logger = logging.getLogger(__name__)

class DatabasePool:
    """Thread-safe database connection pool"""

    def __init__(self, min_conn=1, max_conn=10):
        """Initialize the database connection pool"""
        self.pool = ThreadedConnectionPool(
            minconn=min_conn,
            maxconn=max_conn,
            host=config.DB_HOST,
            port=config.DB_PORT,
            database=config.DB_NAME,
            user=config.DB_USER,
            password=config.DB_PASSWORD,
            sslmode=config.DB_SSLMODE,
            cursor_factory=RealDictCursor
        )
        logger.info(f"Database pool initialized with {min_conn}-{max_conn} connections")

    @contextmanager
    def get_connection(self):
        """Get a connection from the pool"""
        conn = None
        try:
            conn = self.pool.getconn()
            yield conn
            conn.commit()
        except Exception as e:
            if conn:
                conn.rollback()
            raise e
        finally:
            if conn:
                self.pool.putconn(conn)

    def execute_query(
        self,
        sql: str,
        params: Optional[Dict[str, Any]] = None,
        fetch_one: bool = False
    ) -> List[Dict[str, Any]]:
        """Execute a query and return results"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                # Convert dict params to psycopg2 format
                if params:
                    cursor.execute(sql, params)
                else:
                    cursor.execute(sql)

                if fetch_one:
                    result = cursor.fetchone()
                    return [result] if result else []
                else:
                    return cursor.fetchall()

    def close(self):
        """Close all connections in the pool"""
        self.pool.closeall()
        logger.info("Database pool closed")

# Global database pool instance
db_pool = None

def initialize_db_pool(min_conn=1, max_conn=10):
    """Initialize the global database pool"""
    global db_pool
    if db_pool is None:
        db_pool = DatabasePool(min_conn, max_conn)
    return db_pool

def get_db_pool() -> DatabasePool:
    """Get the global database pool"""
    global db_pool
    if db_pool is None:
        db_pool = initialize_db_pool()
    return db_pool

def execute_safe_query(
    sql: str,
    params: Optional[Dict[str, Any]] = None,
    max_rows: int = 1000
) -> Tuple[List[Dict[str, Any]], Optional[str]]:
    """Execute a query with safety checks"""
    try:
        # Add row limit if not present
        sql_upper = sql.upper()
        if 'LIMIT' not in sql_upper and sql_upper.startswith('SELECT'):
            sql = f"{sql.rstrip(';')} LIMIT {max_rows}"

        pool = get_db_pool()
        results = pool.execute_query(sql, params)

        # Limit results to max_rows
        if len(results) > max_rows:
            results = results[:max_rows]

        return results, None
    except Exception as e:
        logger.error(f"Query execution error: {e}")
        return [], str(e)