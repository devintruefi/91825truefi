#!/usr/bin/env python3
"""
Create memory system tables in the database
Run this script to set up the conversation memory tables
"""

import psycopg2
from db import get_db_pool
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_memory_tables():
    """Create all memory system tables"""
    try:
        pool = get_db_pool()
        with pool.get_connection() as conn:
            with conn.cursor() as cur:
                # Create chat_sessions table
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS chat_sessions (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        session_name TEXT,
                        last_message_at TIMESTAMPTZ DEFAULT NOW(),
                        message_count INTEGER DEFAULT 0,
                        created_at TIMESTAMPTZ DEFAULT NOW(),
                        updated_at TIMESTAMPTZ DEFAULT NOW()
                    );
                """)
                logger.info("Created chat_sessions table")

                # Create indexes for chat_sessions
                cur.execute("""
                    CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id
                    ON chat_sessions(user_id);
                """)
                cur.execute("""
                    CREATE INDEX IF NOT EXISTS idx_chat_sessions_last_message
                    ON chat_sessions(last_message_at DESC);
                """)

                # Create chat_messages table
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS chat_messages (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
                        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
                        content TEXT NOT NULL,
                        intent TEXT,
                        entities JSONB DEFAULT '{}',
                        metadata JSONB DEFAULT '{}',
                        sql_executed TEXT,
                        query_results JSONB,
                        execution_time_ms FLOAT,
                        created_at TIMESTAMPTZ DEFAULT NOW()
                    );
                """)
                logger.info("Created chat_messages table")

                # Create indexes for chat_messages
                cur.execute("""
                    CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id
                    ON chat_messages(session_id);
                """)
                cur.execute("""
                    CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id
                    ON chat_messages(user_id);
                """)
                cur.execute("""
                    CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at
                    ON chat_messages(created_at DESC);
                """)
                cur.execute("""
                    CREATE INDEX IF NOT EXISTS idx_chat_messages_intent
                    ON chat_messages(intent) WHERE intent IS NOT NULL;
                """)

                # Create user_insights table
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS user_insights (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        insight_type TEXT NOT NULL,
                        insight_key TEXT NOT NULL,
                        insight_value JSONB DEFAULT '{}',
                        confidence FLOAT DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
                        frequency INTEGER DEFAULT 1,
                        last_seen TIMESTAMPTZ DEFAULT NOW(),
                        created_at TIMESTAMPTZ DEFAULT NOW(),
                        updated_at TIMESTAMPTZ DEFAULT NOW(),
                        UNIQUE(user_id, insight_type, insight_key)
                    );
                """)
                logger.info("Created user_insights table")

                # Create indexes for user_insights
                cur.execute("""
                    CREATE INDEX IF NOT EXISTS idx_user_insights_user_id
                    ON user_insights(user_id);
                """)
                cur.execute("""
                    CREATE INDEX IF NOT EXISTS idx_user_insights_type
                    ON user_insights(insight_type);
                """)
                cur.execute("""
                    CREATE INDEX IF NOT EXISTS idx_user_insights_confidence
                    ON user_insights(confidence DESC);
                """)

                # Create conversation_context table
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS conversation_context (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
                        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        context_type TEXT NOT NULL,
                        context_value JSONB NOT NULL,
                        relevance_score FLOAT DEFAULT 1.0 CHECK (relevance_score >= 0 AND relevance_score <= 1),
                        expires_at TIMESTAMPTZ,
                        created_at TIMESTAMPTZ DEFAULT NOW()
                    );
                """)
                logger.info("Created conversation_context table")

                # Create indexes for conversation_context
                cur.execute("""
                    CREATE INDEX IF NOT EXISTS idx_conversation_context_session_id
                    ON conversation_context(session_id);
                """)
                cur.execute("""
                    CREATE INDEX IF NOT EXISTS idx_conversation_context_expires
                    ON conversation_context(expires_at) WHERE expires_at IS NOT NULL;
                """)

                # Create financial_patterns table
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS financial_patterns (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        pattern_type TEXT NOT NULL,
                        pattern_name TEXT NOT NULL,
                        pattern_details JSONB NOT NULL,
                        confidence_score FLOAT DEFAULT 0.5 CHECK (confidence_score >= 0 AND confidence_score <= 1),
                        detected_at TIMESTAMPTZ DEFAULT NOW(),
                        last_occurred TIMESTAMPTZ,
                        occurrence_count INTEGER DEFAULT 1,
                        is_active BOOLEAN DEFAULT TRUE,
                        created_at TIMESTAMPTZ DEFAULT NOW(),
                        updated_at TIMESTAMPTZ DEFAULT NOW()
                    );
                """)
                logger.info("Created financial_patterns table")

                # Create indexes for financial_patterns
                cur.execute("""
                    CREATE INDEX IF NOT EXISTS idx_financial_patterns_user_id
                    ON financial_patterns(user_id);
                """)
                cur.execute("""
                    CREATE INDEX IF NOT EXISTS idx_financial_patterns_type
                    ON financial_patterns(pattern_type);
                """)
                cur.execute("""
                    CREATE INDEX IF NOT EXISTS idx_financial_patterns_active
                    ON financial_patterns(is_active) WHERE is_active = TRUE;
                """)

                conn.commit()
                logger.info("✅ All memory tables created successfully!")

    except Exception as e:
        logger.error(f"❌ Error creating memory tables: {e}")
        raise

if __name__ == "__main__":
    create_memory_tables()