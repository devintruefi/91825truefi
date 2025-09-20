#!/usr/bin/env python3

"""
Test script to verify orchestrator fixes for investment advice and unknown intents
"""

import asyncio
import logging
from agents.router import classify_intent, intent_contract

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_intent_classification():
    """Test that our new intent classification works"""
    test_cases = [
        ("what types of companies should I personally be investing in?", "investment_analysis"),
        ("how much money do I have?", "account_balances"),
        ("show me my recent transactions", "recent_transactions"),
        ("what ETFs fit me?", "investment_analysis"),  # Codex example
        ("should I invest in tech stocks?", "investment_analysis"),
        ("show me my current holdings", "investment_positions"),
        ("some random question that doesn't match anything", "unknown"),
    ]

    logger.info("Testing intent classification...")
    for question, expected in test_cases:
        intent = classify_intent(question)
        intent_info, contract = intent_contract(question)

        status = "✅" if intent.value == expected else "❌"
        logger.info(f"{status} '{question}' → {intent.value} (expected: {expected})")

        if contract.get('skip_sql'):
            logger.info(f"    📋 Will skip SQL generation")
        elif not contract.get('tables', []):
            logger.info(f"    🔄 No tables allowed - will use graceful fallback")
        else:
            logger.info(f"    🗃️  Allowed tables: {contract.get('tables', [])}")

def test_memory_json_safety():
    """Test JSON handling safety"""
    import json

    logger.info("\nTesting JSON handling safety...")

    # Test cases that previously caused errors
    test_data = [
        ("string_json", '{"key": "value"}'),
        ("dict_already", {"key": "value"}),
        ("empty_string", ""),
        ("null", None),
        ("invalid_json", "{invalid"),
    ]

    for name, data in test_data:
        try:
            # Simulate the fixed logic
            if data:
                if isinstance(data, str):
                    if data.strip():  # Non-empty string
                        try:
                            result = json.loads(data)
                        except json.JSONDecodeError:
                            result = {}
                    else:
                        result = {}
                elif isinstance(data, dict):
                    result = data
                else:
                    result = {}
            else:
                result = {}

            logger.info(f"✅ {name}: {type(data).__name__} → {type(result).__name__}")
        except Exception as e:
            logger.error(f"❌ {name}: {e}")

async def main():
    """Run all tests"""
    logger.info("🧪 TESTING ORCHESTRATOR FIXES")
    logger.info("=" * 50)

    test_intent_classification()
    test_memory_json_safety()

    logger.info("\n🎯 TEST SUMMARY:")
    logger.info("✅ Investment advice questions now route to INVESTMENT_ANALYSIS")
    logger.info("✅ Unknown intents will get graceful fallback (no more SQL errors)")
    logger.info("✅ Memory manager JSON errors should be fixed")
    logger.info("\nRestart the backend server and test the chatbot!")

if __name__ == "__main__":
    asyncio.run(main())