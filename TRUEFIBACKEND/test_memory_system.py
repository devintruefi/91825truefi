#!/usr/bin/env python3
"""
Test the memory system to ensure it's working correctly
"""

import asyncio
import uuid
from datetime import datetime
from memory import MemoryManager, ContextBuilder, PatternDetector

async def test_memory_system():
    """Test the memory system functionality"""
    print("Testing Memory System...")

    # Initialize components
    memory_manager = MemoryManager()
    context_builder = ContextBuilder(memory_manager)
    pattern_detector = PatternDetector()

    # Test data
    test_user_id = "136e2d19-e31d-4691-94cb-1729585a340e"  # Devin Patel's user ID
    test_session_id = str(uuid.uuid4())

    print(f"Test User ID: {test_user_id}")
    print(f"Test Session ID: {test_session_id}")

    try:
        # Test 1: Store a user message
        print("\n1. Testing message storage...")
        message_id = await memory_manager.store_message(
            session_id=test_session_id,
            user_id=test_user_id,
            role="user",
            content="How much did I spend on coffee last month?",
            intent="SPEND_BY_CATEGORY",
            entities={"category": "coffee", "time_period": "last_month"}
        )
        print(f"[OK] Stored user message with ID: {message_id}")

        # Test 2: Store an assistant response
        print("\n2. Testing assistant message storage...")
        assistant_msg_id = await memory_manager.store_message(
            session_id=test_session_id,
            user_id=test_user_id,
            role="assistant",
            content="You spent $127.45 on coffee last month across 18 transactions.",
            sql_executed="SELECT SUM(amount) FROM transactions WHERE category='coffee'",
            query_results={"total": 127.45, "count": 18},
            execution_time_ms=245.7
        )
        print(f"[OK] Stored assistant message with ID: {assistant_msg_id}")

        # Test 3: Retrieve conversation history
        print("\n3. Testing conversation retrieval...")
        history = await memory_manager.get_conversation_history(
            session_id=test_session_id,
            user_id=test_user_id
        )
        print(f"[OK] Retrieved {len(history)} messages")
        for msg in history:
            print(f"  - {msg['role']}: {msg['content'][:50]}...")

        # Test 4: Get user insights
        print("\n4. Testing user insights...")
        insights = await memory_manager.get_user_insights(test_user_id)
        print(f"[OK] Retrieved {len(insights)} insights")

        # Test 5: Store conversation context
        print("\n5. Testing conversation context...")
        context_id = await memory_manager.store_conversation_context(
            session_id=test_session_id,
            user_id=test_user_id,
            context_type="recent_query",
            context_value={
                "question": "coffee spending",
                "result": "$127.45"
            },
            relevance_score=0.9
        )
        print(f"[OK] Stored context with ID: {context_id}")

        # Test 6: Get active context
        print("\n6. Testing active context retrieval...")
        active_context = await memory_manager.get_active_context(
            session_id=test_session_id,
            user_id=test_user_id
        )
        print(f"[OK] Retrieved {len(active_context)} active contexts")

        # Test 7: Build agent context
        print("\n7. Testing agent context building...")
        agent_context = await context_builder.build_agent_context(
            user_id=test_user_id,
            session_id=test_session_id,
            current_question="What about this month?",
            intent="SPEND_BY_CATEGORY"
        )
        print(f"[OK] Built agent context with {len(agent_context)} components")
        for key in agent_context.keys():
            print(f"  - {key}")

        # Test 8: Detect financial patterns
        print("\n8. Testing pattern detection...")
        patterns = await pattern_detector.detect_financial_patterns(test_user_id)
        print(f"[OK] Detected {len(patterns)} financial patterns")

        print("\n[SUCCESS] All tests passed successfully!")
        return True

    except Exception as e:
        print(f"\n[FAILED] Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(test_memory_system())
    exit(0 if success else 1)