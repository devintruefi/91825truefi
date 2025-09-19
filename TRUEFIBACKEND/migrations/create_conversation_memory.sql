-- Conversation Memory Tables for TrueFi
-- This migration creates the necessary tables for storing conversation history and user insights

-- 1. Chat Sessions table (stores conversation sessions)
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_message_at TIMESTAMPTZ,
    message_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',

    CONSTRAINT chat_sessions_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE
);

-- 2. Chat Messages table (stores individual messages)
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Store intent classification and entities
    intent TEXT,
    entities JSONB DEFAULT '{}',

    -- Store metadata like tokens, model used, etc.
    metadata JSONB DEFAULT '{}',

    -- For assistant messages, store the query results
    sql_executed TEXT,
    query_results JSONB,

    -- Performance metrics
    execution_time_ms NUMERIC,

    CONSTRAINT chat_messages_session_id_fkey FOREIGN KEY (session_id)
        REFERENCES chat_sessions(id) ON DELETE CASCADE
);

-- 3. User Insights table (learned patterns and preferences)
CREATE TABLE IF NOT EXISTS user_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    insight_type TEXT NOT NULL,
    insight_key TEXT NOT NULL,
    insight_value JSONB NOT NULL,
    confidence NUMERIC DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
    frequency INTEGER DEFAULT 1,
    first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure unique insights per user
    CONSTRAINT user_insights_unique UNIQUE (user_id, insight_type, insight_key),
    CONSTRAINT user_insights_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Conversation Context table (short-term memory for active conversations)
CREATE TABLE IF NOT EXISTS conversation_context (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    context_type TEXT NOT NULL,
    context_value JSONB NOT NULL,
    relevance_score NUMERIC DEFAULT 1.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,

    CONSTRAINT conversation_context_session_id_fkey FOREIGN KEY (session_id)
        REFERENCES chat_sessions(id) ON DELETE CASCADE
);

-- 5. Financial Patterns table (detected spending/income patterns)
CREATE TABLE IF NOT EXISTS financial_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pattern_type TEXT NOT NULL,
    pattern_name TEXT NOT NULL,
    pattern_data JSONB NOT NULL,
    confidence NUMERIC DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
    frequency INTEGER DEFAULT 1,
    amount_range NUMRANGE,
    merchant_list TEXT[],
    category_list TEXT[],
    time_pattern TEXT,
    first_detected TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_detected TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT financial_patterns_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_created_at ON chat_sessions(created_at DESC);
CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX idx_chat_messages_intent ON chat_messages(intent) WHERE intent IS NOT NULL;
CREATE INDEX idx_user_insights_user_id ON user_insights(user_id);
CREATE INDEX idx_user_insights_type ON user_insights(insight_type);
CREATE INDEX idx_conversation_context_session_id ON conversation_context(session_id);
CREATE INDEX idx_conversation_context_expires ON conversation_context(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_financial_patterns_user_id ON financial_patterns(user_id);
CREATE INDEX idx_financial_patterns_type ON financial_patterns(pattern_type);

-- Create update trigger for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chat_sessions_updated_at BEFORE UPDATE ON chat_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_insights_updated_at BEFORE UPDATE ON user_insights
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_financial_patterns_updated_at BEFORE UPDATE ON financial_patterns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample insight types:
-- 'merchant_preference': User's frequently visited merchants
-- 'spending_category': User's primary spending categories
-- 'transaction_time': Preferred transaction times
-- 'query_pattern': Common types of questions asked
-- 'budget_concern': Budget categories user frequently checks
-- 'financial_goal': Inferred financial goals

-- Sample pattern types:
-- 'recurring_expense': Regular subscription or bill
-- 'income_pattern': Regular income deposits
-- 'spending_spike': Unusual high spending periods
-- 'saving_pattern': Regular saving behavior
-- 'category_trend': Changing spending in specific categories