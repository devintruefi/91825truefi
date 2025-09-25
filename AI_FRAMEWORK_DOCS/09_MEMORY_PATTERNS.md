# Memory System & Conversation Context Management

## Overview

The Memory System enables TrueFi's AI to maintain conversational continuity, learn from user interactions, detect behavioral patterns, and provide increasingly personalized financial guidance over time. This sophisticated system manages short-term conversation context, long-term user preferences, and pattern recognition.

## Memory System Architecture

### Core Components
**Location**: `/TRUEFIBACKEND/memory/`

```python
class MemoryManager:
    """Central memory management system"""

    def __init__(self):
        self.db_pool = get_db_pool()
        self.cache = ConversationCache()
        self.vector_store = VectorStore()  # For semantic search
        self.pattern_detector = PatternDetector()
        self.preference_learner = PreferenceLearner()
        self.context_window = ContextWindow()
```

## Database Schema for Memory

### 1. Conversation Storage

```sql
-- Chat sessions table
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    session_id VARCHAR(255) UNIQUE,
    title VARCHAR(255),
    summary TEXT,
    intent_sequence JSONB,  -- Array of intents in order
    topic_tags TEXT[],
    sentiment_score FLOAT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    ended_at TIMESTAMP
);

-- Individual messages
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY,
    session_id UUID REFERENCES chat_sessions(id),
    user_id UUID REFERENCES users(id),
    message_type VARCHAR(50),  -- 'user' or 'assistant'
    content TEXT,
    rich_content JSONB,  -- Structured data, charts, etc.
    intent VARCHAR(100),
    entities JSONB,  -- Extracted entities
    confidence_score FLOAT,
    feedback_score INTEGER,  -- User rating 1-5
    sql_executed TEXT,
    query_results JSONB,
    execution_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Conversation context storage
CREATE TABLE conversation_context (
    id UUID PRIMARY KEY,
    session_id UUID REFERENCES chat_sessions(id),
    user_id UUID REFERENCES users(id),
    context_type VARCHAR(50),  -- 'topic', 'preference', 'goal', etc.
    context_key VARCHAR(255),
    context_value JSONB,
    relevance_score FLOAT,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- User learned preferences
CREATE TABLE user_learned_preferences (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    preference_type VARCHAR(100),
    preference_key VARCHAR(255),
    preference_value JSONB,
    confidence_score FLOAT,
    learned_from JSONB,  -- Source messages/sessions
    frequency INTEGER DEFAULT 1,
    last_observed TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Detected patterns
CREATE TABLE user_behavior_patterns (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    pattern_type VARCHAR(100),
    pattern_description TEXT,
    pattern_data JSONB,
    confidence_score FLOAT,
    occurrence_count INTEGER,
    first_detected TIMESTAMP,
    last_detected TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);
```

## Memory Storage Operations

### 1. Message Storage

```python
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
    execution_time_ms: Optional[int] = None
) -> str:
    """Store a conversation message with full context"""

    message_id = str(uuid.uuid4())

    # Store in database
    query = """
        INSERT INTO chat_messages (
            id, session_id, user_id, message_type, content,
            intent, entities, sql_executed, query_results,
            execution_time_ms, created_at
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()
        )
    """

    await self.db_pool.execute(
        query,
        message_id, session_id, user_id, role, content,
        intent, json.dumps(entities) if entities else None,
        sql_executed, json.dumps(query_results) if query_results else None,
        execution_time_ms
    )

    # Update session metadata
    await self.update_session_metadata(session_id, role, content, intent)

    # Extract and store context
    if role == 'user':
        await self.extract_context_from_message(
            session_id, user_id, content, intent, entities
        )

    # Update vector store for semantic search
    if self.vector_store:
        await self.vector_store.add_message(
            message_id, content, session_id, user_id, metadata
        )

    return message_id
```

### 2. Context Extraction

```python
async def extract_context_from_message(
    self,
    session_id: str,
    user_id: str,
    content: str,
    intent: str,
    entities: Dict
) -> None:
    """Extract and store contextual information from messages"""

    contexts = []

    # Extract time context
    time_references = self.extract_time_references(content)
    for time_ref in time_references:
        contexts.append({
            'type': 'time_reference',
            'key': time_ref['type'],
            'value': time_ref,
            'relevance_score': 0.9,
            'ttl_minutes': 60
        })

    # Extract financial amounts
    amounts = self.extract_amounts(content)
    for amount in amounts:
        contexts.append({
            'type': 'amount_reference',
            'key': f"amount_{amount['context']}",
            'value': amount,
            'relevance_score': 0.8,
            'ttl_minutes': 30
        })

    # Extract account/category references
    if entities:
        for entity_type, entity_value in entities.items():
            contexts.append({
                'type': f'entity_{entity_type}',
                'key': entity_type,
                'value': entity_value,
                'relevance_score': 0.85,
                'ttl_minutes': 120
            })

    # Store contexts
    for context in contexts:
        await self.store_conversation_context(
            session_id, user_id,
            context['type'], context['key'], context['value'],
            context['relevance_score'], context['ttl_minutes']
        )
```

## Context Building

### 1. Conversation Context Builder

```python
class ContextBuilder:
    """Build rich context for agent processing"""

    async def build_agent_context(
        self,
        user_id: str,
        session_id: str,
        current_question: str,
        intent: str,
        profile_pack: Dict
    ) -> Dict:
        """Build comprehensive context for agents"""

        context = {
            'conversation_summary': await self.get_conversation_summary(session_id),
            'recent_messages': await self.get_recent_messages(session_id, limit=5),
            'active_contexts': await self.get_active_contexts(session_id),
            'user_preferences': await self.get_user_preferences(user_id),
            'behavioral_patterns': await self.get_behavior_patterns(user_id),
            'related_sessions': await self.find_related_sessions(user_id, current_question),
            'personalization_hints': await self.generate_personalization_hints(
                user_id, intent, profile_pack
            )
        }

        return context

    async def get_conversation_summary(self, session_id: str) -> Dict:
        """Generate conversation summary"""

        query = """
            SELECT
                COUNT(*) as message_count,
                MIN(created_at) as started_at,
                MAX(created_at) as last_message_at,
                ARRAY_AGG(DISTINCT intent) as intents,
                AVG(confidence_score) as avg_confidence,
                AVG(feedback_score) as avg_satisfaction
            FROM chat_messages
            WHERE session_id = $1
        """

        result = await self.db_pool.fetchone(query, session_id)

        return {
            'has_history': result['message_count'] > 0,
            'message_count': result['message_count'],
            'duration_minutes': (
                (result['last_message_at'] - result['started_at']).total_seconds() / 60
                if result['last_message_at'] and result['started_at'] else 0
            ),
            'topics_discussed': result['intents'] or [],
            'avg_confidence': result['avg_confidence'] or 0,
            'satisfaction': result['avg_satisfaction'] or 0,
            'sentiment': self.calculate_sentiment_trend(session_id)
        }

    async def get_recent_messages(self, session_id: str, limit: int = 5) -> List[Dict]:
        """Get recent conversation messages"""

        query = """
            SELECT
                message_type as role,
                content,
                intent,
                entities,
                created_at
            FROM chat_messages
            WHERE session_id = $1
            ORDER BY created_at DESC
            LIMIT $2
        """

        results = await self.db_pool.fetch(query, session_id, limit)

        return [
            {
                'role': row['role'],
                'content': row['content'][:500],  # Truncate long messages
                'intent': row['intent'],
                'entities': row['entities'],
                'timestamp': row['created_at'].isoformat()
            }
            for row in reversed(results)  # Chronological order
        ]
```

### 2. Context Window Management

```python
class ContextWindow:
    """Manage sliding context window for conversations"""

    def __init__(self, max_tokens: int = 2000):
        self.max_tokens = max_tokens
        self.tokenizer = tiktoken.encoding_for_model("gpt-4")

    def build_context_window(
        self,
        messages: List[Dict],
        priority_context: Dict
    ) -> str:
        """Build optimized context window within token limits"""

        # Priority 1: Current question (always included)
        context_parts = []
        token_count = 0

        # Priority 2: Critical context (user preferences, active goals)
        if priority_context:
            critical = self.format_critical_context(priority_context)
            critical_tokens = self.count_tokens(critical)
            if token_count + critical_tokens < self.max_tokens:
                context_parts.append(critical)
                token_count += critical_tokens

        # Priority 3: Recent messages (as many as fit)
        for message in reversed(messages):  # Start with most recent
            formatted = self.format_message(message)
            msg_tokens = self.count_tokens(formatted)

            if token_count + msg_tokens < self.max_tokens:
                context_parts.insert(0, formatted)  # Maintain chronological order
                token_count += msg_tokens
            else:
                break

        # Priority 4: Summary of older context
        if token_count < self.max_tokens * 0.8:  # Leave some room
            summary = self.generate_context_summary(messages[:-len(context_parts)])
            summary_tokens = self.count_tokens(summary)
            if token_count + summary_tokens < self.max_tokens:
                context_parts.insert(0, summary)

        return "\n".join(context_parts)
```

## Pattern Detection

### 1. Behavioral Pattern Detector

```python
class PatternDetector:
    """Detect patterns in user financial behavior"""

    async def detect_patterns(self, user_id: str) -> List[Dict]:
        """Detect various behavioral patterns"""

        patterns = []

        # Query frequency pattern
        query_pattern = await self.detect_query_patterns(user_id)
        if query_pattern:
            patterns.append(query_pattern)

        # Spending concern patterns
        spending_patterns = await self.detect_spending_concerns(user_id)
        patterns.extend(spending_patterns)

        # Goal focus patterns
        goal_patterns = await self.detect_goal_focus(user_id)
        patterns.extend(goal_patterns)

        # Time-of-day patterns
        temporal_patterns = await self.detect_temporal_patterns(user_id)
        patterns.extend(temporal_patterns)

        # Store detected patterns
        for pattern in patterns:
            await self.store_pattern(user_id, pattern)

        return patterns

    async def detect_query_patterns(self, user_id: str) -> Optional[Dict]:
        """Detect patterns in query frequency and types"""

        query = """
            WITH daily_queries AS (
                SELECT
                    DATE(created_at) as query_date,
                    COUNT(*) as query_count,
                    ARRAY_AGG(DISTINCT intent) as intents
                FROM chat_messages
                WHERE user_id = $1
                    AND message_type = 'user'
                    AND created_at >= NOW() - INTERVAL '30 days'
                GROUP BY DATE(created_at)
            )
            SELECT
                AVG(query_count) as avg_daily_queries,
                MODE() WITHIN GROUP (ORDER BY query_count) as typical_daily_queries,
                ARRAY_AGG(DISTINCT intent) as all_intents,
                COUNT(DISTINCT query_date) as active_days
            FROM daily_queries
        """

        result = await self.db_pool.fetchone(query, user_id)

        if result and result['active_days'] >= 7:  # Minimum data requirement
            return {
                'type': 'query_frequency',
                'description': f"User typically asks {result['typical_daily_queries']} questions per day",
                'data': {
                    'avg_daily': float(result['avg_daily_queries']),
                    'typical_daily': result['typical_daily_queries'],
                    'active_days': result['active_days'],
                    'common_intents': self.get_top_items(result['all_intents'], 5)
                },
                'confidence': min(result['active_days'] / 30, 1.0)
            }

        return None

    async def detect_spending_concerns(self, user_id: str) -> List[Dict]:
        """Detect patterns in spending-related queries"""

        query = """
            SELECT
                entities->>'category' as category,
                COUNT(*) as query_count,
                AVG(CAST(entities->>'amount' AS FLOAT)) as avg_amount_concerned,
                ARRAY_AGG(DISTINCT intent) as related_intents
            FROM chat_messages
            WHERE user_id = $1
                AND message_type = 'user'
                AND intent LIKE '%spending%'
                AND entities->>'category' IS NOT NULL
                AND created_at >= NOW() - INTERVAL '60 days'
            GROUP BY entities->>'category'
            HAVING COUNT(*) >= 3
            ORDER BY query_count DESC
        """

        results = await self.db_pool.fetch(query, user_id)

        patterns = []
        for row in results:
            patterns.append({
                'type': 'spending_concern',
                'description': f"Frequently asks about {row['category']} spending",
                'data': {
                    'category': row['category'],
                    'frequency': row['query_count'],
                    'avg_amount': row['avg_amount_concerned'],
                    'related_intents': row['related_intents']
                },
                'confidence': min(row['query_count'] / 10, 1.0)
            })

        return patterns
```

### 2. Learning User Preferences

```python
class PreferenceLearner:
    """Learn and adapt to user preferences"""

    async def learn_preferences(
        self,
        user_id: str,
        interaction: Dict
    ) -> None:
        """Learn from user interactions"""

        # Learn communication preferences
        comm_prefs = self.learn_communication_style(interaction)
        if comm_prefs:
            await self.update_preference(user_id, 'communication', comm_prefs)

        # Learn visualization preferences
        viz_prefs = self.learn_visualization_preferences(interaction)
        if viz_prefs:
            await self.update_preference(user_id, 'visualization', viz_prefs)

        # Learn detail level preferences
        detail_prefs = self.learn_detail_preferences(interaction)
        if detail_prefs:
            await self.update_preference(user_id, 'detail_level', detail_prefs)

        # Learn topic interests
        topic_interests = self.learn_topic_interests(interaction)
        if topic_interests:
            await self.update_preference(user_id, 'topics', topic_interests)

    def learn_communication_style(self, interaction: Dict) -> Optional[Dict]:
        """Learn preferred communication style"""

        indicators = {
            'formal': ['please', 'could you', 'would you mind'],
            'casual': ['hey', 'gonna', 'wanna', 'stuff'],
            'technical': ['ROI', 'APR', 'amortization', 'yield'],
            'simple': ['explain', 'what is', 'how does', 'why']
        }

        question = interaction.get('question', '').lower()
        feedback = interaction.get('feedback_score', 0)

        detected_style = None
        max_matches = 0

        for style, keywords in indicators.items():
            matches = sum(1 for keyword in keywords if keyword in question)
            if matches > max_matches:
                max_matches = matches
                detected_style = style

        if detected_style and feedback >= 4:  # Positive feedback
            return {
                'style': detected_style,
                'confidence': 0.7,
                'learned_from': interaction.get('message_id')
            }

        return None

    async def update_preference(
        self,
        user_id: str,
        preference_type: str,
        preference_data: Dict
    ) -> None:
        """Update or create user preference"""

        # Check if preference exists
        existing = await self.get_existing_preference(
            user_id, preference_type,
            preference_data.get('key', preference_type)
        )

        if existing:
            # Update confidence and frequency
            new_confidence = (
                existing['confidence_score'] * 0.7 +
                preference_data['confidence'] * 0.3
            )
            new_frequency = existing['frequency'] + 1

            query = """
                UPDATE user_learned_preferences
                SET preference_value = $1,
                    confidence_score = $2,
                    frequency = $3,
                    last_observed = NOW(),
                    updated_at = NOW()
                WHERE id = $4
            """

            await self.db_pool.execute(
                query,
                json.dumps(preference_data),
                new_confidence,
                new_frequency,
                existing['id']
            )
        else:
            # Create new preference
            query = """
                INSERT INTO user_learned_preferences (
                    user_id, preference_type, preference_key,
                    preference_value, confidence_score, learned_from
                ) VALUES ($1, $2, $3, $4, $5, $6)
            """

            await self.db_pool.execute(
                query,
                user_id,
                preference_type,
                preference_data.get('key', preference_type),
                json.dumps(preference_data),
                preference_data['confidence'],
                json.dumps({'message_id': preference_data.get('learned_from')})
            )
```

## Semantic Memory Search

### Vector Store Integration

```python
class VectorStore:
    """Semantic search over conversation history"""

    def __init__(self):
        self.embeddings = OpenAIEmbeddings()
        self.index = None
        self.metadata = {}

    async def add_message(
        self,
        message_id: str,
        content: str,
        session_id: str,
        user_id: str,
        metadata: Dict
    ) -> None:
        """Add message to vector store"""

        # Generate embedding
        embedding = await self.embeddings.create_embedding(content)

        # Store in vector index
        if self.index is None:
            self.index = faiss.IndexFlatL2(len(embedding))

        self.index.add(np.array([embedding]))

        # Store metadata
        self.metadata[len(self.metadata)] = {
            'message_id': message_id,
            'session_id': session_id,
            'user_id': user_id,
            'content': content[:500],
            'metadata': metadata
        }

    async def semantic_search(
        self,
        query: str,
        user_id: str,
        limit: int = 5
    ) -> List[Dict]:
        """Search for semantically similar messages"""

        if self.index is None:
            return []

        # Generate query embedding
        query_embedding = await self.embeddings.create_embedding(query)

        # Search index
        distances, indices = self.index.search(
            np.array([query_embedding]), limit * 2  # Get extra for filtering
        )

        # Filter by user and format results
        results = []
        for i, idx in enumerate(indices[0]):
            if idx in self.metadata:
                meta = self.metadata[idx]
                if meta['user_id'] == user_id:
                    results.append({
                        'message_id': meta['message_id'],
                        'content': meta['content'],
                        'similarity_score': 1 / (1 + distances[0][i]),
                        'metadata': meta['metadata']
                    })

            if len(results) >= limit:
                break

        return results
```

## Memory-Aware Response Generation

### 1. Contextual Response Enhancement

```python
async def enhance_response_with_memory(
    self,
    base_response: str,
    memory_context: Dict,
    user_preferences: Dict
) -> str:
    """Enhance response using memory and preferences"""

    enhanced = base_response

    # Add continuity references
    if memory_context.get('recent_messages'):
        enhanced = self.add_continuity_references(enhanced, memory_context['recent_messages'])

    # Apply communication style
    if user_preferences.get('communication_style'):
        enhanced = self.apply_communication_style(
            enhanced,
            user_preferences['communication_style']
        )

    # Add personalized examples
    if memory_context.get('behavioral_patterns'):
        enhanced = self.add_personalized_examples(
            enhanced,
            memory_context['behavioral_patterns']
        )

    # Add follow-up suggestions based on patterns
    if memory_context.get('likely_followups'):
        enhanced = self.add_followup_suggestions(
            enhanced,
            memory_context['likely_followups']
        )

    return enhanced

def add_continuity_references(self, response: str, recent_messages: List[Dict]) -> str:
    """Add references to previous conversation"""

    # Look for opportunities to reference previous discussions
    for message in recent_messages:
        if message['role'] == 'user' and message['intent'] == 'spending_analysis':
            if 'spending' in response.lower():
                response = response.replace(
                    "Your spending",
                    "As we discussed, your spending",
                    1
                )
                break

    return response
```

### 2. Adaptive Learning

```python
class AdaptiveLearning:
    """System that learns and improves from interactions"""

    async def learn_from_feedback(
        self,
        message_id: str,
        feedback_score: int,
        feedback_text: Optional[str] = None
    ) -> None:
        """Learn from user feedback"""

        # Get the interaction context
        interaction = await self.get_interaction_context(message_id)

        if feedback_score >= 4:  # Positive feedback
            # Reinforce patterns that led to this response
            await self.reinforce_positive_patterns(interaction)

        elif feedback_score <= 2:  # Negative feedback
            # Identify what went wrong
            issues = await self.analyze_negative_feedback(interaction, feedback_text)
            await self.adjust_patterns(issues)

        # Update confidence scores
        await self.update_confidence_scores(interaction, feedback_score)

    async def reinforce_positive_patterns(self, interaction: Dict) -> None:
        """Strengthen patterns that led to positive outcomes"""

        # Increase confidence in detected intents
        if interaction['intent']:
            await self.boost_intent_confidence(
                interaction['intent'],
                interaction['question']
            )

        # Reinforce successful query patterns
        if interaction.get('sql_query'):
            await self.store_successful_query_pattern(
                interaction['intent'],
                interaction['sql_query']
            )

        # Strengthen preference signals
        await self.strengthen_preferences(interaction)
```

## Memory Optimization

### 1. Memory Pruning

```python
class MemoryPruner:
    """Manage memory storage efficiently"""

    async def prune_old_memories(self, user_id: str) -> None:
        """Remove or archive old, irrelevant memories"""

        # Archive old conversations
        await self.archive_old_conversations(user_id, days_old=90)

        # Compress message history
        await self.compress_message_history(user_id, days_old=30)

        # Remove expired contexts
        await self.remove_expired_contexts(user_id)

        # Consolidate learned preferences
        await self.consolidate_preferences(user_id)

    async def compress_message_history(self, user_id: str, days_old: int) -> None:
        """Compress old messages into summaries"""

        query = """
            SELECT
                session_id,
                COUNT(*) as message_count,
                MIN(created_at) as start_time,
                MAX(created_at) as end_time,
                ARRAY_AGG(content ORDER BY created_at) as messages
            FROM chat_messages
            WHERE user_id = $1
                AND created_at < NOW() - INTERVAL '%s days'
                AND session_id NOT IN (
                    SELECT session_id FROM compressed_sessions
                )
            GROUP BY session_id
            HAVING COUNT(*) > 10
        """

        sessions_to_compress = await self.db_pool.fetch(query, user_id, days_old)

        for session in sessions_to_compress:
            # Generate summary
            summary = await self.generate_session_summary(session['messages'])

            # Store compressed version
            await self.store_compressed_session(
                session['session_id'],
                summary,
                session['message_count'],
                session['start_time'],
                session['end_time']
            )

            # Remove original messages (keep summary)
            await self.remove_original_messages(session['session_id'])
```

### 2. Memory Cache Management

```python
class ConversationCache:
    """In-memory cache for active conversations"""

    def __init__(self, max_size: int = 1000, ttl_seconds: int = 3600):
        self.cache = OrderedDict()
        self.max_size = max_size
        self.ttl = ttl_seconds
        self.timestamps = {}

    def get(self, key: str) -> Optional[Any]:
        """Get from cache with LRU"""

        if key in self.cache:
            # Check if expired
            if time.time() - self.timestamps[key] > self.ttl:
                del self.cache[key]
                del self.timestamps[key]
                return None

            # Move to end (most recently used)
            self.cache.move_to_end(key)
            return self.cache[key]

        return None

    def set(self, key: str, value: Any) -> None:
        """Set in cache with size limit"""

        # Remove oldest if at capacity
        if len(self.cache) >= self.max_size:
            oldest = next(iter(self.cache))
            del self.cache[oldest]
            del self.timestamps[oldest]

        self.cache[key] = value
        self.timestamps[key] = time.time()
```

## Metrics and Monitoring

### Memory System Metrics

```python
MEMORY_METRICS = {
    'message_storage_time': Histogram,
    'context_extraction_time': Histogram,
    'pattern_detection_count': Counter,
    'preference_updates': Counter,
    'cache_hit_rate': Gauge,
    'memory_size_bytes': Gauge,
    'compression_ratio': Gauge,
    'semantic_search_latency': Histogram
}
```

---

**Next Document**: [10_SECURITY_PERFORMANCE.md](./10_SECURITY_PERFORMANCE.md) - Complete security layers and performance optimization