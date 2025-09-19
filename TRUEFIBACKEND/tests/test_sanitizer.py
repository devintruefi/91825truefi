# TRUEFIBACKEND/tests/test_sanitizer.py
# Test suite for SQL Sanitizer

import pytest
from security.sql_sanitizer import SQLSanitizer

def test_sanitizer_allows_safe_queries():
    """Test that sanitizer allows safe SELECT queries"""
    safe_queries = [
        "SELECT * FROM transactions WHERE user_id = %(user_id)s",
        "WITH monthly AS (SELECT * FROM transactions WHERE user_id = %(user_id)s) SELECT * FROM monthly",
        "SELECT amount, merchant_name FROM transactions WHERE user_id = %(user_id)s AND amount < 0"
    ]

    for query in safe_queries:
        is_safe, error = SQLSanitizer.sanitize(query)
        assert is_safe, f"Query should be safe: {query}, Error: {error}"

def test_sanitizer_blocks_dangerous_queries():
    """Test that sanitizer blocks dangerous queries"""
    dangerous_queries = [
        "DROP TABLE transactions",
        "DELETE FROM transactions WHERE user_id = 'test'",
        "INSERT INTO transactions VALUES (1, 2, 3)",
        "UPDATE transactions SET amount = 0",
        "CREATE TABLE test (id INT)",
        "SELECT * FROM transactions; DROP TABLE users",
        "SELECT * FROM transactions -- comment",
        "SELECT * FROM transactions /* comment */",
        "SELECT * FROM pg_tables"
    ]

    for query in dangerous_queries:
        is_safe, error = SQLSanitizer.sanitize(query)
        assert not is_safe, f"Query should be blocked: {query}"
        assert error is not None

def test_sanitizer_requires_user_id():
    """Test that sanitizer requires user_id filter"""
    queries_without_user_id = [
        "SELECT * FROM transactions",
        "SELECT amount FROM transactions WHERE amount > 0"
    ]

    for query in queries_without_user_id:
        is_safe, error = SQLSanitizer.sanitize(query)
        assert not is_safe
        assert "user_id" in error

def test_sanitizer_safety_wrapper():
    """Test the safety wrapper functionality"""
    query = "SELECT * FROM transactions WHERE amount < 0"
    user_id = "test-user-123"

    wrapped = SQLSanitizer.add_safety_wrapper(query, user_id, 500)

    assert "user_id = %(user_id)s" in wrapped
    assert "LIMIT 500" in wrapped
    assert not wrapped.endswith(';')

def test_sanitizer_blocks_multiple_statements():
    """Test that multiple statements are blocked"""
    query = "SELECT * FROM transactions WHERE user_id = %(user_id)s; SELECT * FROM users"
    is_safe, error = SQLSanitizer.sanitize(query)

    assert not is_safe
    assert "Multiple statements" in error