# TRUEFIBACKEND/memory/memory_manager.py
# Central memory management system for conversation history and user insights

import json
import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
from uuid import UUID
import psycopg2.extras
from db import get_db_pool
from agents.router import classify_intent
from agents.search_builder import SearchQueryBuilder

logger = logging.getLogger(__name__)

class MemoryManager:
    """
    Manages conversation memory, user insights, and learning for logged-in users.
    Stores and retrieves conversations from the database, tracks patterns, and
    provides context for agents.
    """

    def __init__(self):
        self.search_builder = SearchQueryBuilder()
        self._init_tables()

    def _init_tables(self):
        """Ensure memory tables exist in the database"""
        try:
            pool = get_db_pool()
            with pool.get_connection() as conn:
                with conn.cursor() as cur:
                    # Check if tables exist, create if not
                    cur.execute("""
                        SELECT EXISTS (
                            SELECT FROM information_schema.tables
                            WHERE table_name = 'chat_messages'
                        )
                    """)
                    if not cur.fetchone()[0]:
                        logger.info("Creating memory tables...")
                        # Tables will be created by migration script
        except Exception as e:
            logger.error(f"Error initializing memory tables: {e}")

    async def store_message(
        self,
        session_id: str,
        user_id: str,
        role: str,
        content: str,
        intent: Optional[str] = None,
        entities: Optional[Dict] = None,
        metadata: Optional[Dict] = None,
        sql_executed: Optional[str] = None,
        query_results: Optional[Dict] = None,
        execution_time_ms: Optional[float] = None
    ) -> str:
        """
        Store a message in the conversation history.

        Args:
            session_id: Chat session ID
            user_id: User ID
            role: 'user', 'assistant', or 'system'
            content: Message content
            intent: Detected intent (for user messages)
            entities: Extracted entities from the message
            metadata: Additional metadata
            sql_executed: SQL query that was executed (for assistant messages)
            query_results: Results from the SQL query
            execution_time_ms: Time taken to process the request

        Returns:
            Message ID
        """
        try:
            pool = get_db_pool()
            with pool.get_connection() as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    # First check if session exists
                    cur.execute("""
                        SELECT session_id FROM chat_sessions
                        WHERE session_id = %s AND user_id = %s::uuid
                    """, (session_id, user_id))

                    if not cur.fetchone():
                        # Create new session
                        cur.execute("""
                            INSERT INTO chat_sessions (id, session_id, user_id, title, is_active, created_at, updated_at)
                            VALUES (gen_random_uuid(), %s, %s::uuid, %s, true, NOW(), NOW())
                            RETURNING session_id
                        """, (session_id, user_id, f"Session {datetime.now().strftime('%Y-%m-%d %H:%M')}"))
                    else:
                        # Update existing session
                        cur.execute("""
                            UPDATE chat_sessions
                            SET updated_at = NOW()
                            WHERE session_id = %s AND user_id = %s::uuid
                            RETURNING session_id
                        """, (session_id, user_id))

                    # Prepare rich_content for chat_messages
                    rich_content = {
                        'intent': intent,
                        'entities': entities or {},
                        'metadata': metadata or {},
                        'sql_executed': sql_executed,
                        'query_results': query_results,
                        'execution_time_ms': execution_time_ms
                    }

                    # Get the current turn number
                    cur.execute("""
                        SELECT COALESCE(MAX(turn_number), 0) as max_turn
                        FROM chat_messages
                        WHERE session_id = (SELECT id FROM chat_sessions WHERE session_id = %s)
                    """, (session_id,))
                    max_turn = cur.fetchone()['max_turn']
                    turn_number = max_turn + 1

                    # Get the internal session id
                    cur.execute("""
                        SELECT id FROM chat_sessions
                        WHERE session_id = %s AND user_id = %s::uuid
                    """, (session_id, user_id))
                    internal_session_id = cur.fetchone()['id']

                    # Store the message
                    cur.execute("""
                        INSERT INTO chat_messages (
                            id, session_id, user_id, message_type, content,
                            rich_content, turn_number, created_at
                        )
                        VALUES (gen_random_uuid(), %s::uuid, %s::uuid, %s, %s, %s, %s, NOW())
                        RETURNING id
                    """, (
                        internal_session_id, user_id, role, content,
                        json.dumps(rich_content),
                        turn_number
                    ))

                    message_id = cur.fetchone()['id']

                    # If this is a user message, extract and store insights
                    if role == 'user':
                        await self._extract_user_insights(user_id, content, intent, entities)

                    logger.info(f"Stored message {message_id} for user {user_id} in session {session_id}")
                    return str(message_id)

        except Exception as e:
            logger.error(f"Error storing message: {e}")
            raise

    async def get_conversation_history(
        self,
        session_id: str,
        user_id: str,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Retrieve conversation history for a session.

        Args:
            session_id: Chat session ID
            user_id: User ID (for security validation)
            limit: Maximum number of messages to retrieve

        Returns:
            List of messages in chronological order
        """
        try:
            pool = get_db_pool()
            with pool.get_connection() as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    # Get internal session id
                    cur.execute("""
                        SELECT id FROM chat_sessions
                        WHERE session_id = %s AND user_id = %s::uuid
                    """, (session_id, user_id))
                    row = cur.fetchone()
                    if not row:
                        return []
                    internal_session_id = row['id']

                    cur.execute("""
                        SELECT
                            id, message_type as role, content, rich_content,
                            turn_number, created_at
                        FROM chat_messages
                        WHERE session_id = %s::uuid AND user_id = %s::uuid
                        ORDER BY turn_number DESC
                        LIMIT %s
                    """, (internal_session_id, user_id, limit))

                    messages = cur.fetchall()
                    # Reverse to get chronological order
                    messages.reverse()

                    # Parse rich_content JSON field
                    for msg in messages:
                        rich_content = json.loads(msg['rich_content']) if msg['rich_content'] else {}
                        msg['intent'] = rich_content.get('intent')
                        msg['entities'] = rich_content.get('entities', {})
                        msg['metadata'] = rich_content.get('metadata', {})
                        msg['sql_executed'] = rich_content.get('sql_executed')
                        msg['query_results'] = rich_content.get('query_results')
                        msg['execution_time_ms'] = rich_content.get('execution_time_ms')
                        msg['created_at'] = msg['created_at'].isoformat() if msg['created_at'] else None
                        del msg['rich_content']  # Remove the raw JSON field

                    return messages

        except Exception as e:
            logger.error(f"Error retrieving conversation history: {e}")
            return []

    async def get_recent_user_conversations(
        self,
        user_id: str,
        limit: int = 5,
        days_back: int = 7,
        exclude_session: str = None
    ) -> List[Dict[str, Any]]:
        """
        Retrieve recent conversations across all sessions for a user.

        Args:
            user_id: User ID
            limit: Maximum number of recent conversations to retrieve
            days_back: Number of days to look back

        Returns:
            List of recent conversation summaries
        """
        try:
            pool = get_db_pool()
            with pool.get_connection() as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    # Get recent sessions with their latest messages
                    if exclude_session:
                        cur.execute("""
                            WITH session_summaries AS (
                                SELECT
                                    cs.session_id,
                                    cs.title,
                                    cs.updated_at as session_date,
                                    COUNT(cm.id) as message_count,
                                    STRING_AGG(
                                        CASE WHEN cm.message_type = 'user' THEN cm.content END,
                                        ' | ' ORDER BY cm.turn_number
                                    ) as user_questions,
                                    STRING_AGG(
                                        CASE WHEN cm.message_type = 'assistant' THEN LEFT(cm.content, 100) END,
                                        ' | ' ORDER BY cm.turn_number
                                    ) as assistant_responses
                                FROM chat_sessions cs
                                LEFT JOIN chat_messages cm ON cs.id = cm.session_id
                                WHERE cs.user_id = %s::uuid
                                    AND cs.updated_at >= CURRENT_DATE - INTERVAL '%s days'
                                    AND cs.session_id != %s  -- Exclude current session
                                GROUP BY cs.session_id, cs.title, cs.updated_at
                                HAVING COUNT(cm.id) > 0
                            )
                            SELECT session_id, title, session_date, message_count, user_questions, assistant_responses
                            FROM session_summaries
                            ORDER BY session_date DESC
                            LIMIT %s
                        """, (user_id, days_back, exclude_session, limit))
                    else:
                        cur.execute("""
                            WITH session_summaries AS (
                                SELECT
                                    cs.session_id,
                                    cs.title,
                                    cs.updated_at as session_date,
                                    COUNT(cm.id) as message_count,
                                    STRING_AGG(
                                        CASE WHEN cm.message_type = 'user' THEN cm.content END,
                                        ' | ' ORDER BY cm.turn_number
                                    ) as user_questions,
                                    STRING_AGG(
                                        CASE WHEN cm.message_type = 'assistant' THEN LEFT(cm.content, 100) END,
                                        ' | ' ORDER BY cm.turn_number
                                    ) as assistant_responses
                                FROM chat_sessions cs
                                LEFT JOIN chat_messages cm ON cs.id = cm.session_id
                                WHERE cs.user_id = %s::uuid
                                    AND cs.updated_at >= CURRENT_DATE - INTERVAL '%s days'
                                GROUP BY cs.session_id, cs.title, cs.updated_at
                                HAVING COUNT(cm.id) > 0
                            )
                            SELECT session_id, title, session_date, message_count, user_questions, assistant_responses
                            FROM session_summaries
                            ORDER BY session_date DESC
                            LIMIT %s
                        """, (user_id, days_back, limit))

                    conversations = cur.fetchall()

                    # Format the results
                    for conv in conversations:
                        conv['session_date'] = conv['session_date'].isoformat() if conv['session_date'] else None

                    return conversations

        except Exception as e:
            logger.error(f"Error retrieving recent user conversations: {e}")
            return []

    async def get_user_insights(
        self,
        user_id: str,
        insight_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Retrieve learned insights about a user.

        Args:
            user_id: User ID
            insight_type: Optional filter by insight type

        Returns:
            List of user insights
        """
        try:
            pool = get_db_pool()
            with pool.get_connection() as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    if insight_type:
                        cur.execute("""
                            SELECT insight_type, insight_key, insight_value,
                                   confidence, frequency, last_seen
                            FROM user_insights
                            WHERE user_id = %s::uuid AND insight_type = %s
                            ORDER BY confidence DESC, frequency DESC
                        """, (user_id, insight_type))
                    else:
                        cur.execute("""
                            SELECT insight_type, insight_key, insight_value,
                                   confidence, frequency, last_seen
                            FROM user_insights
                            WHERE user_id = %s::uuid
                            ORDER BY confidence DESC, frequency DESC
                            LIMIT 20
                        """, (user_id,))

                    insights = cur.fetchall()

                    # Parse JSON fields
                    for insight in insights:
                        insight['insight_value'] = json.loads(insight['insight_value']) if insight['insight_value'] else {}
                        insight['last_seen'] = insight['last_seen'].isoformat() if insight['last_seen'] else None

                    return insights

        except Exception as e:
            logger.error(f"Error retrieving user insights: {e}")
            return []

    async def _extract_user_insights(
        self,
        user_id: str,
        content: str,
        intent: Optional[str],
        entities: Optional[Dict]
    ):
        """
        Extract and store insights from user messages.

        This analyzes user queries to learn preferences and patterns.
        """
        try:
            pool = get_db_pool()
            with pool.get_connection() as conn:
                with conn.cursor() as cur:
                    # Track query patterns
                    if intent:
                        cur.execute("""
                            INSERT INTO user_insights (
                                user_id, insight_type, insight_key, insight_value,
                                confidence, frequency, last_seen
                            )
                            VALUES (%s::uuid, 'query_pattern', %s, %s, 0.7, 1, NOW())
                            ON CONFLICT (user_id, insight_type, insight_key)
                            DO UPDATE SET
                                frequency = user_insights.frequency + 1,
                                confidence = LEAST(user_insights.confidence + 0.05, 1.0),
                                last_seen = NOW(),
                                updated_at = NOW()
                        """, (user_id, intent, json.dumps({'intent': intent})))

                    # Track merchant preferences
                    content_lower = content.lower()
                    for merchant in ['coffee', 'starbucks', 'uber', 'amazon', 'grocery']:
                        if merchant in content_lower:
                            cur.execute("""
                                INSERT INTO user_insights (
                                    user_id, insight_type, insight_key, insight_value,
                                    confidence, frequency, last_seen
                                )
                                VALUES (%s::uuid, 'merchant_preference', %s, %s, 0.5, 1, NOW())
                                ON CONFLICT (user_id, insight_type, insight_key)
                                DO UPDATE SET
                                    frequency = user_insights.frequency + 1,
                                    confidence = LEAST(user_insights.confidence + 0.1, 1.0),
                                    last_seen = NOW(),
                                    updated_at = NOW()
                            """, (user_id, merchant, json.dumps({'merchant': merchant})))

                    # Track time-based patterns
                    hour = datetime.now().hour
                    time_of_day = 'morning' if 5 <= hour < 12 else 'afternoon' if 12 <= hour < 18 else 'evening'
                    cur.execute("""
                        INSERT INTO user_insights (
                            user_id, insight_type, insight_key, insight_value,
                            confidence, frequency, last_seen
                        )
                        VALUES (%s::uuid, 'usage_time', %s, %s, 0.3, 1, NOW())
                        ON CONFLICT (user_id, insight_type, insight_key)
                        DO UPDATE SET
                            frequency = user_insights.frequency + 1,
                            confidence = LEAST(user_insights.confidence + 0.02, 1.0),
                            last_seen = NOW(),
                            updated_at = NOW()
                    """, (user_id, time_of_day, json.dumps({'time_of_day': time_of_day})))

        except Exception as e:
            logger.error(f"Error extracting user insights: {e}")

    async def store_conversation_context(
        self,
        session_id: str,
        user_id: str,
        context_type: str,
        context_value: Dict[str, Any],
        relevance_score: float = 1.0,
        ttl_minutes: int = 30
    ) -> str:
        """
        Store short-term conversation context.

        Args:
            session_id: Chat session ID
            user_id: User ID
            context_type: Type of context (e.g., 'recent_query', 'entity_reference')
            context_value: The context data
            relevance_score: How relevant this context is (0-1)
            ttl_minutes: Time to live in minutes

        Returns:
            Context ID
        """
        try:
            pool = get_db_pool()
            with pool.get_connection() as conn:
                with conn.cursor() as cur:
                    expires_at = datetime.now() + timedelta(minutes=ttl_minutes)

                    # Get internal session id
                    cur.execute("""
                        SELECT id FROM chat_sessions
                        WHERE session_id = %s AND user_id = %s::uuid
                    """, (session_id, user_id))
                    row = cur.fetchone()
                    if not row:
                        logger.error(f"Session {session_id} not found")
                        raise ValueError(f"Session {session_id} not found")
                    internal_session_id = row[0]

                    cur.execute("""
                        INSERT INTO conversation_context (
                            session_id, user_id, context_type, context_value,
                            relevance_score, expires_at
                        )
                        VALUES (%s::uuid, %s::uuid, %s, %s, %s, %s)
                        RETURNING id
                    """, (
                        internal_session_id, user_id, context_type,
                        json.dumps(context_value),
                        relevance_score, expires_at
                    ))

                    context_id = cur.fetchone()[0]

                    return str(context_id)

        except Exception as e:
            logger.error(f"Error storing conversation context: {e}")
            raise

    async def get_active_context(
        self,
        session_id: str,
        user_id: str
    ) -> List[Dict[str, Any]]:
        """
        Retrieve active conversation context for a session.

        Args:
            session_id: Chat session ID
            user_id: User ID

        Returns:
            List of active context items
        """
        try:
            pool = get_db_pool()
            with pool.get_connection() as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    # Get internal session id
                    cur.execute("""
                        SELECT id FROM chat_sessions
                        WHERE session_id = %s AND user_id = %s::uuid
                    """, (session_id, user_id))
                    row = cur.fetchone()
                    if not row:
                        return []
                    internal_session_id = row['id']

                    cur.execute("""
                        SELECT context_type, context_value, relevance_score
                        FROM conversation_context
                        WHERE session_id = %s::uuid
                          AND user_id = %s::uuid
                          AND (expires_at IS NULL OR expires_at > NOW())
                        ORDER BY relevance_score DESC, created_at DESC
                        LIMIT 10
                    """, (internal_session_id, user_id))

                    contexts = cur.fetchall()

                    # Parse JSON fields
                    for ctx in contexts:
                        ctx['context_value'] = json.loads(ctx['context_value']) if ctx['context_value'] else {}

                    return contexts

        except Exception as e:
            logger.error(f"Error retrieving active context: {e}")
            return []

    async def cleanup_expired_context(self):
        """Clean up expired conversation context entries"""
        try:
            pool = get_db_pool()
            with pool.get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        DELETE FROM conversation_context
                        WHERE expires_at < NOW()
                    """)
                    deleted_count = cur.rowcount

                    if deleted_count > 0:
                        logger.info(f"Cleaned up {deleted_count} expired context entries")

        except Exception as e:
            logger.error(f"Error cleaning up expired context: {e}")