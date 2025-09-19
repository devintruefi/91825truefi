# TRUEFIBACKEND/tests/test_profile_pack.py
# Test suite for Profile Pack Builder

import pytest
from unittest.mock import Mock, patch
from profile_pack.builder import ProfilePackBuilder
from profile_pack.schema_card import TransactionSchemaCard
from profile_pack.entity_resolver import EntityResolver

@pytest.fixture
def mock_db_pool():
    """Mock database pool for testing"""
    mock_pool = Mock()
    mock_pool.execute_query.return_value = [
        {
            'user_id': 'test-user',
            'first_name': 'Test',
            'last_name': 'User',
            'email': 'test@example.com',
            'currency': 'USD',
            'timezone': 'UTC',
            'created_at': '2024-01-01T00:00:00Z'
        }
    ]
    return mock_pool

@pytest.fixture
def profile_builder():
    """Create profile pack builder for testing"""
    return ProfilePackBuilder()

def test_transaction_schema_card():
    """Test transaction schema card generation"""
    schema_card = TransactionSchemaCard.generate()

    assert schema_card["table"] == "public.transactions"
    assert "columns" in schema_card
    assert "user_id" in schema_card["columns"]
    assert "amount" in schema_card["columns"]
    assert "notes" in schema_card
    assert "safe_filters" in schema_card
    assert "examples" in schema_card

def test_entity_resolver_merchant_normalization():
    """Test merchant name normalization"""
    test_cases = [
        ("NETFLIX*", "netflix"),
        ("AMAZON MKTPLACE", "amazon"),
        ("STARBUCKS STORE 123", "starbucks"),
        ("Unknown Merchant", "Unknown Merchant")
    ]

    for input_merchant, expected in test_cases:
        normalized, patterns = EntityResolver.normalize_merchant(input_merchant)
        if expected != input_merchant:
            assert normalized == expected
            assert len(patterns) > 0
        else:
            assert normalized == input_merchant

def test_entity_resolver_category_resolution():
    """Test category resolution"""
    test_cases = [
        ("dining", "Food and Drink"),
        ("grocery", "Food and Drink"),
        ("uber", "Transportation"),
        ("netflix", "Entertainment"),
        ("unknown category", "unknown category")
    ]

    for input_category, expected_primary in test_cases:
        result = EntityResolver.resolve_category(input_category)
        if expected_primary != input_category:
            assert result["primary"] == expected_primary
            assert result["sql_filter"] is not None
        else:
            assert result["primary"] == input_category

def test_entity_resolver_time_windows():
    """Test time window resolution"""
    test_cases = [
        "this month",
        "last month",
        "this year",
        "ytd",
        "last 30 days",
        "last 6 months",
        "since 2024-01-01"
    ]

    for time_desc in test_cases:
        result = EntityResolver.resolve_time_window(time_desc)
        assert "start_date" in result
        assert "end_date" in result
        assert "sql_condition" in result

@patch('profile_pack.builder.get_db_pool')
def test_profile_pack_serialization(mock_get_db_pool, profile_builder):
    """Test profile pack data serialization"""
    from decimal import Decimal
    from datetime import datetime

    test_row = {
        'id': 'test-id',
        'amount': Decimal('100.50'),
        'created_at': datetime.now(),
        'null_field': None,
        'string_field': 'test'
    }

    serialized = profile_builder._serialize_row(test_row)

    assert serialized['id'] == 'test-id'
    assert serialized['amount'] == 100.50
    assert 'T' in serialized['created_at']  # ISO format
    assert serialized['null_field'] is None
    assert serialized['string_field'] == 'test'

def test_profile_pack_limits():
    """Test that profile pack respects row limits"""
    limits = ProfilePackBuilder.LIMITS

    assert limits['accounts'] <= 200
    assert limits['transactions_sample'] == 10
    assert limits['manual_assets'] <= 100
    assert limits['budget_spending'] <= 144  # 12 months max