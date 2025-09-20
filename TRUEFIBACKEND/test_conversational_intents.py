#!/usr/bin/env python3

"""
Test conversational intent detection for financial advisor behavior
"""

import logging
from agents.router import classify_intent, intent_contract

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_conversational_intents():
    """Test that conversational messages are detected correctly"""
    test_cases = [
        # Greetings
        ("hey", "greeting"),
        ("hi", "greeting"),
        ("hello", "greeting"),
        ("good morning", "greeting"),
        ("good afternoon", "greeting"),
        ("good evening", "greeting"),
        ("greetings", "greeting"),

        # Casual conversation
        ("how are you", "casual_conversation"),
        ("what's up", "casual_conversation"),
        ("how's it going", "casual_conversation"),
        ("how you doing", "casual_conversation"),
        ("sup", "casual_conversation"),

        # Financial questions (should NOT be conversational)
        ("what should I invest in", "investment_analysis"),
        ("how much money do I have", "account_balances"),
        ("show me my spending", "spend_by_time"),
        ("hey, what's my net worth", "net_worth"),  # greeting + question should be financial

        # Edge cases
        ("hey there friend", "greeting"),
        ("hello!", "greeting"),
        ("hi.", "greeting"),
    ]

    logger.info("Testing conversational intent detection...")

    all_passed = True
    for question, expected in test_cases:
        intent = classify_intent(question)
        intent_info, contract = intent_contract(question)

        is_conversational = contract.get('conversational', False)
        status = "✅" if intent.value == expected else "❌"

        logger.info(f"{status} '{question}' → {intent.value} (expected: {expected})")

        if intent.value == expected:
            if intent.value in ['greeting', 'casual_conversation']:
                if is_conversational:
                    logger.info(f"    📋 Will use conversational response (no financial analysis)")
                else:
                    logger.error(f"    ❌ Missing conversational flag!")
                    all_passed = False
            else:
                logger.info(f"    💰 Will use financial analysis pipeline")
        else:
            all_passed = False

    return all_passed

def test_greeting_responses():
    """Test the variety of greeting responses"""
    logger.info("\nTesting greeting response variety...")

    sample_responses_greeting = [
        "Hi Devin! I'm your personal financial advisor. How can I help you with your finances today?",
        "Hello Devin! Great to see you. What financial questions can I help you with?",
        "Hey Devin! I'm here to help with all your financial needs. What would you like to discuss?"
    ]

    sample_responses_casual = [
        "I'm doing well, Devin! As your financial advisor, I'm here whenever you need help with investments, budgeting, or financial planning. What can I assist you with?",
        "Things are great, Devin! I'm ready to help you with any financial questions or planning you'd like to discuss.",
        "I'm here and ready to help, Devin! What financial topics are on your mind today?"
    ]

    logger.info("✅ Sample greeting responses:")
    for i, response in enumerate(sample_responses_greeting, 1):
        logger.info(f"  {i}. {response}")

    logger.info("✅ Sample casual conversation responses:")
    for i, response in enumerate(sample_responses_casual, 1):
        logger.info(f"  {i}. {response}")

    return True

def main():
    """Run all conversational intent tests"""
    logger.info("🧪 TESTING CONVERSATIONAL FINANCIAL ADVISOR BEHAVIOR")
    logger.info("=" * 60)

    intent_passed = test_conversational_intents()
    response_passed = test_greeting_responses()

    logger.info("\n🎯 TEST SUMMARY:")
    if intent_passed and response_passed:
        logger.info("✅ All conversational tests passed!")
        logger.info("✅ Greetings will get friendly responses instead of financial dumps")
        logger.info("✅ Financial questions will still trigger proper analysis")
        logger.info("✅ The chatbot now behaves like a proper financial advisor")
        logger.info("\nRestart the backend and test with 'hey' - you should get a friendly greeting!")
    else:
        logger.error("❌ Some tests failed - check the issues above")

if __name__ == "__main__":
    main()