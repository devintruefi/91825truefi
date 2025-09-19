# TRUEFIBACKEND/tests/test_sql_agent.py
# Test suite for SQL Agent

import pytest
import json
from agents.sql_agent import SQLAgent
from validation.schemas import SQLRequestSchema, SQLResponseSchema
from profile_pack.schema_card import TransactionSchemaCard

@pytest.fixture
async def sql_agent():
    """Create SQL agent for testing"""
    return SQLAgent()

@pytest.fixture
def valid_sql_request():
    """Valid SQL request for testing"""
    return {
        "kind": "sql_request",
        "question": "How much did I spend on dining this month?",
        "schema_card": TransactionSchemaCard.generate(),
        "context": {"user_id": "test-user-123"},
        "constraints": {
            "max_rows": 1000,
            "exclude_pending": True,
            "prefer_monthly_bins": True
        }
    }

@pytest.mark.asyncio
async def test_sql_agent_valid_request(sql_agent, valid_sql_request):
    """Test SQL agent with valid request"""
    result = await sql_agent.generate_query(valid_sql_request)

    assert "error" not in result
    assert "sql" in result
    assert "params" in result
    assert "justification" in result
    assert "user_id" in result["params"]

@pytest.mark.asyncio
async def test_sql_agent_invalid_request(sql_agent):
    """Test SQL agent with invalid request"""
    invalid_request = {
        "kind": "invalid_request",
        "question": "",
        "context": {}  # Missing user_id
    }

    result = await sql_agent.generate_query(invalid_request)
    assert "error" in result

def test_sql_request_schema_validation():
    """Test SQL request schema validation"""
    valid_data = {
        "kind": "sql_request",
        "question": "Test question",
        "schema_card": {"table": "transactions"},
        "context": {"user_id": "test"},
        "constraints": {"max_rows": 100}
    }

    # This should not raise an exception
    schema = SQLRequestSchema(**valid_data)
    assert schema.kind == "sql_request"
    assert schema.context["user_id"] == "test"

def test_sql_response_schema_validation():
    """Test SQL response schema validation"""
    valid_response = {
        "sql": "SELECT * FROM transactions WHERE user_id = %(user_id)s",
        "params": {"user_id": "test"},
        "justification": "Query to get user transactions"
    }

    schema = SQLResponseSchema(**valid_response)
    assert "user_id" in schema.params
    assert schema.sql.startswith("SELECT")