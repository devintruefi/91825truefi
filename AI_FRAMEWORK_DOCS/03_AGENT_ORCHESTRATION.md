# Agent Orchestration & Coordination Flow

## Orchestration Overview

The TrueFi Agent Orchestrator acts as the central nervous system of the AI framework, coordinating multiple specialized agents to transform user questions into comprehensive financial insights. This document details every aspect of the orchestration process, from initial request to final response.

## The Orchestrator Class

```python
class AgentOrchestrator:
    """Master coordinator for the multi-agent financial advisory system"""

    Components:
    - sql_agent: Database query generation
    - modeling_agent: Analysis and insight generation
    - critique_agent: Quality control and validation
    - profile_builder: User context aggregation
    - memory_manager: Conversation state management
    - context_builder: Dynamic context construction
    - pattern_detector: Behavioral pattern recognition
```

## Complete Orchestration Flow

### Phase 1: Request Initialization (0-50ms)

```python
async def process_question(
    user_id: str,
    question: str,
    conversation_history: Optional[List[Dict]] = None,
    session_id: Optional[str] = None
) -> Dict[str, Any]:
```

**Input Validation**:
1. Verify user_id format (UUID)
2. Sanitize question text (XSS prevention)
3. Validate session_id if provided
4. Check conversation_history structure

**Initial Setup**:
```python
start_time = time.time()
run_logs = []
intent = None
entities = {}
```

### Phase 2: Intent Detection (50-150ms)

**Process**:
```python
# Step 1: Classify intent
intent = classify_intent(question)
# Returns: Intent.SPENDING_ANALYSIS, Intent.ACCOUNT_BALANCES, etc.

# Step 2: Get intent contract
intent_info, contract = intent_contract(question)
# Returns detailed execution requirements
```

**Intent Contract Example**:
```json
{
    "intent": "spending_analysis",
    "confidence": 0.92,
    "entities": {
        "time_period": "last 3 months",
        "category": "all"
    },
    "tables": ["transactions", "accounts", "budget_categories"],
    "time_bounds": "3_months",
    "aggregation": "category",
    "skip_sql": false,
    "conversational": false,
    "requires_modeling": true,
    "allowed_calculations": ["total", "average", "trend"],
    "ui_suggestions": ["pie_chart", "trend_line", "table"]
}
```

### Phase 3: Memory Storage (150-200ms)

**User Message Storage**:
```python
if USE_MEMORY and session_id:
    await memory_manager.store_message(
        session_id=session_id,
        user_id=user_id,
        role='user',
        content=question,
        intent=intent.value,
        entities=entities
    )
```

**Memory Record Structure**:
```sql
INSERT INTO chat_messages (
    id, session_id, user_id, message_type,
    content, intent, entities, created_at
) VALUES (
    'uuid', 'session_123', 'user_uuid', 'user',
    'What did I spend on groceries?', 'spending_analysis',
    '{"category": "groceries"}'::jsonb, NOW()
)
```

### Phase 4: Profile Pack Construction (200-500ms)

**Profile Pack Building**:
```python
profile_pack = profile_builder.build(
    user_id,
    intent=intent.value if intent else None
)
```

**Complete Profile Pack Structure**:
```json
{
    "user_core": {
        "user_id": "uuid",
        "first_name": "John",
        "last_name": "Doe",
        "email": "john@example.com",
        "currency": "USD",
        "timezone": "America/New_York",
        "age": 35,
        "household_income": 120000,
        "marital_status": "married",
        "dependents": 2,
        "life_stage": "mid_career",
        "risk_tolerance": "moderate",
        "investment_horizon": "long_term",
        "filing_status": "married_filing_jointly",
        "federal_rate": 0.22,
        "state_rate": 0.06
    },
    "accounts": [
        {
            "id": "acc_1",
            "name": "Chase Checking",
            "type": "checking",
            "balance": 5234.67,
            "available_balance": 5234.67,
            "institution": "Chase Bank"
        },
        {
            "id": "acc_2",
            "name": "Fidelity 401k",
            "type": "investment",
            "balance": 87654.32,
            "institution": "Fidelity"
        }
    ],
    "holdings": [...],
    "goals": [
        {
            "name": "Emergency Fund",
            "target_amount": 30000,
            "current_amount": 15000,
            "target_date": "2024-12-31",
            "priority": "high"
        }
    ],
    "budgets": [...],
    "recurring_income": [
        {
            "source": "Salary",
            "gross_monthly": 10000,
            "net_monthly": 7500,
            "frequency": "biweekly"
        }
    ],
    "derived_metrics": {
        "net_worth": 125000,
        "monthly_income": 7500,
        "monthly_expenses": 5800,
        "savings_rate": 0.227,
        "debt_to_income": 0.35,
        "emergency_fund_months": 2.6
    },
    "transactions_sample": [
        // Last 10 transactions for context
    ]
}
```

### Phase 5: Context Building (500-600ms)

**Agent Context Construction**:
```python
if USE_MEMORY and session_id:
    agent_context = await context_builder.build_agent_context(
        user_id=user_id,
        session_id=session_id,
        current_question=question,
        intent=intent.value,
        profile_pack=profile_pack
    )
```

**Complete Context Structure**:
```json
{
    "conversation_summary": {
        "has_history": true,
        "message_count": 15,
        "topics_discussed": ["budgeting", "investments", "savings"],
        "last_interaction": "2024-01-20T10:30:00Z",
        "sentiment_trend": "positive"
    },
    "recent_context": [
        {
            "question": "How much do I have in savings?",
            "answer_summary": "You have $15,000 in savings",
            "timestamp": "2024-01-20T10:28:00Z"
        }
    ],
    "user_preferences": {
        "communication_style": "detailed",
        "risk_appetite": "conservative",
        "focus_areas": ["debt_reduction", "retirement"],
        "avoided_topics": []
    },
    "personalization_hints": {
        "frequently_asked": ["spending", "budget", "savings"],
        "likely_followup_questions": [
            "How can I reduce my grocery spending?",
            "What's my spending trend?"
        ]
    },
    "behavioral_patterns": {
        "query_frequency": "daily",
        "preferred_time": "morning",
        "device_type": "mobile",
        "interaction_depth": "high"
    }
}
```

### Phase 6: Routing Decision (600-650ms)

**Conversational vs Analytical Routing**:
```python
if contract.get('conversational', False):
    # Route to conversational handler (no SQL needed)
    result = await _handle_conversational_intent(...)
else:
    # Route to analytical pipeline (SQL → Model → Critique)
    result = await _execute_analytical_pipeline(...)
```

### Phase 7A: SQL Generation Loop (650-2000ms)

**SQL Loop Execution**:
```python
async def _execute_sql_loop(user_id, question, profile_pack):
    sql_revisions = 0
    while sql_revisions <= MAX_SQL_REVISIONS:  # Max 3 attempts
```

**SQL Agent Input**:
```json
{
    "kind": "sql_request",
    "question": "What did I spend on groceries last month?",
    "schema_card": {
        "tables": {
            "transactions": {
                "columns": ["id", "user_id", "amount", "date", "category", "merchant_name"],
                "relationships": ["accounts.id = transactions.account_id"],
                "row_count_estimate": 50000
            }
        }
    },
    "context": {
        "user_id": "uuid-123",
        "current_date": "2024-01-20",
        "user_timezone": "America/New_York"
    },
    "constraints": {
        "max_rows": 5000,
        "exclude_pending": true,
        "time_bounds": "last_month",
        "prefer_monthly_bins": true
    }
}
```

**SQL Agent Output**:
```json
{
    "sql_plan": {
        "intent": "spending_by_category",
        "sql": "SELECT category, SUM(amount) as total FROM transactions WHERE user_id = $1 AND date >= $2 AND category = $3 GROUP BY category",
        "parameters": ["uuid-123", "2023-12-20", "groceries"],
        "explanation": "Aggregating grocery transactions for last month"
    },
    "estimated_rows": 1,
    "uses_indices": ["idx_user_date", "idx_category"]
}
```

**Critique Validation**:
```python
critique = await critique_agent.review({
    'stage': 'pre_execution',
    'sql_query': sql_response['sql_plan']['sql'],
    'question': question
})

if critique['status'] == 'approve':
    # Execute query
    sql_result = execute_safe_query(...)
elif critique['status'] == 'revise':
    # Loop with critique feedback
    sql_revisions += 1
```

### Phase 7B: Query Execution (2000-2500ms)

**Safe Query Execution**:
```python
def execute_safe_query(query, params, timeout=5000):
    # Sanitization
    sanitized = SQLSanitizer.sanitize(query)

    # Execution with timeout
    with timeout_context(timeout):
        cursor.execute(sanitized, params)
        results = cursor.fetchall()

    return {
        'data': results,
        'row_count': len(results),
        'execution_time_ms': elapsed
    }
```

### Phase 8: Modeling Agent Loop (2500-4000ms)

**Modeling Agent Input**:
```json
{
    "kind": "model_request",
    "question": "What did I spend on groceries last month?",
    "profile_pack": {...},
    "sql_result": {
        "data": [["groceries", 487.23]],
        "row_count": 1,
        "columns": ["category", "total"]
    },
    "context": {
        "intent": "spending_analysis",
        "user_preferences": {...},
        "conversation_history": [...]
    }
}
```

**Modeling Agent Processing**:
1. **Data Analysis**: Statistical calculations on SQL results
2. **Insight Generation**: Pattern detection and anomaly identification
3. **Personalization**: Contextual recommendations based on user profile
4. **Natural Language Generation**: GPT-4 powered response creation
5. **Visualization Preparation**: Chart data structuring

**Modeling Agent Output**:
```json
{
    "answer_markdown": "## Grocery Spending Analysis\n\nLast month, you spent **$487.23** on groceries, which represents:\n- **12.3%** of your total monthly expenses\n- **$37.23 over** your grocery budget of $450\n- **8.3% increase** from the previous month\n\n### Insights\n- Your grocery spending has been trending upward for 3 months\n- Peak spending days: Saturdays ($156.78 average)\n- Top merchant: Whole Foods ($234.56)",

    "ui_blocks": [
        {
            "type": "metric",
            "title": "Grocery Spending",
            "value": "$487.23",
            "change": "+8.3%",
            "change_type": "increase"
        },
        {
            "type": "chart",
            "chart_type": "line",
            "data": {
                "labels": ["Week 1", "Week 2", "Week 3", "Week 4"],
                "datasets": [{
                    "label": "Grocery Spending",
                    "data": [95.50, 123.45, 98.78, 169.50]
                }]
            }
        }
    ],

    "computations": [
        {
            "name": "total_grocery_spend",
            "value": 487.23,
            "unit": "USD",
            "formula": "SUM(amount WHERE category='groceries')"
        },
        {
            "name": "budget_variance",
            "value": 37.23,
            "unit": "USD",
            "formula": "actual - budget"
        }
    ],

    "recommendations": [
        "Consider shopping at discount stores for non-perishables",
        "Your Saturday shopping trips average 50% more - plan meals ahead",
        "You could save ~$50/month by switching to store brands"
    ],

    "confidence_score": 0.95,
    "data_quality": "high",
    "caveats": []
}
```

### Phase 9: Final Critique (4000-4200ms)

**Post-Model Critique**:
```python
final_critique = await critique_agent.review({
    'stage': 'post_model',
    'question': question,
    'answer': model_result['answer_markdown'],
    'computations': model_result['computations'],
    'profile_pack': profile_pack
})
```

**Critique Evaluation Criteria**:
```json
{
    "accuracy": {
        "calculations_correct": true,
        "data_current": true,
        "facts_verified": true
    },
    "completeness": {
        "question_answered": true,
        "context_included": true,
        "next_steps_provided": true
    },
    "relevance": {
        "on_topic": true,
        "appropriate_depth": true,
        "personalized": true
    },
    "quality": {
        "grammar_correct": true,
        "formatting_proper": true,
        "tone_appropriate": true
    },
    "status": "approve",
    "confidence": 0.94
}
```

### Phase 10: Response Storage & Delivery (4200-4500ms)

**Store Assistant Response**:
```python
if USE_MEMORY and session_id:
    await memory_manager.store_message(
        session_id=session_id,
        user_id=user_id,
        role='assistant',
        content=answer_text,
        intent=intent.value,
        metadata={'ui_blocks': len(ui_blocks)},
        sql_executed=sql_query,
        query_results={'row_count': row_count},
        execution_time_ms=execution_time
    )
```

**Final Response Structure**:
```json
{
    "result": {
        "answer_markdown": "...",
        "ui_blocks": [...],
        "computations": [...],
        "recommendations": [...],
        "confidence_score": 0.95
    },
    "profile_pack_summary": {
        "net_worth": 125000,
        "accounts_count": 5,
        "data_freshness": "current"
    },
    "execution_time_ms": 4487,
    "logs": [
        {
            "agent": "sql_agent",
            "duration_ms": 342,
            "status": "success"
        },
        {
            "agent": "modeling_agent",
            "duration_ms": 1523,
            "status": "success"
        }
    ],
    "memory_context": {
        "has_conversation_history": true,
        "suggested_followups": [
            "How can I reduce my grocery spending?",
            "Compare this month to last month"
        ]
    }
}
```

## Agent Coordination Patterns

### Sequential Execution
```
Intent → Profile → SQL → Model → Critique → Response
```

### Parallel Execution (When Possible)
```
Intent ─┬→ Profile Building ─┐
        └→ Context Building ─┴→ Merge → SQL Generation
```

### Retry Logic with Backoff
```python
async def execute_with_retry(func, max_attempts=3):
    for attempt in range(max_attempts):
        try:
            return await func()
        except Exception as e:
            if attempt == max_attempts - 1:
                raise
            await asyncio.sleep(2 ** attempt)  # Exponential backoff
```

### Circuit Breaker Pattern
```python
class CircuitBreaker:
    def __init__(self, failure_threshold=5, timeout=60):
        self.failure_count = 0
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.last_failure_time = None
        self.state = "closed"  # closed, open, half-open
```

## Error Handling Strategies

### Agent Failure Recovery

**SQL Agent Failure**:
```python
if sql_agent_failed:
    # Fallback to profile-pack-only analysis
    return await modeling_agent.generate_from_profile_only(
        question, profile_pack
    )
```

**Modeling Agent Failure**:
```python
if modeling_agent_failed:
    # Return raw data with basic formatting
    return format_raw_results(sql_result)
```

**Complete Pipeline Failure**:
```python
if complete_failure:
    return {
        "error": "Unable to process request",
        "fallback_response": generate_static_advice(question, intent),
        "suggestions": ["Try rephrasing your question", "Check back later"]
    }
```

## Performance Optimization Techniques

### 1. Intent-Based Loading
```python
# Light intents skip heavy data
if intent in LIGHTWEIGHT_INTENTS:
    skip_components = ['holdings', 'manual_assets', 'goals']
```

### 2. Query Optimization
```python
# Use materialized views for common aggregations
if intent == "net_worth":
    use_materialized_view("mv_user_net_worth")
```

### 3. Caching Strategy
```python
CACHE_CONFIG = {
    'profile_pack': 900,  # 15 minutes
    'user_preferences': 3600,  # 1 hour
    'static_calculations': 300,  # 5 minutes
}
```

### 4. Async Execution
```python
# Parallel independent operations
results = await asyncio.gather(
    get_accounts(user_id),
    get_recent_transactions(user_id),
    get_budget_status(user_id)
)
```

## Monitoring & Observability

### Key Metrics
```python
ORCHESTRATOR_METRICS = {
    'total_requests': Counter,
    'request_duration': Histogram,
    'agent_failures': Counter,
    'intent_distribution': Counter,
    'cache_hit_rate': Gauge,
    'sql_revision_count': Histogram,
    'model_revision_count': Histogram
}
```

### Trace Points
```python
@trace("orchestrator.process_question")
async def process_question(...):
    span.set_tag("user_id", user_id)
    span.set_tag("intent", intent)
    span.set_tag("session_id", session_id)
```

### Audit Logging
```sql
INSERT INTO agent_run_log (
    user_id, agent_name, input_data, output_data,
    sql_queries, execution_time_ms, timestamp
) VALUES (
    $1, 'orchestrator', $2::jsonb, $3::jsonb,
    $4::jsonb, $5, NOW()
);
```

## Advanced Orchestration Features

### Dynamic Agent Selection
```python
def select_agents_for_intent(intent):
    agent_map = {
        'spending_analysis': ['sql_agent', 'modeling_agent'],
        'financial_education': ['modeling_agent'],
        'account_balances': ['sql_agent'],
        'scenario_planning': ['modeling_agent', 'scenario_agent']
    }
    return agent_map.get(intent, ['sql_agent', 'modeling_agent'])
```

### Adaptive Timeout Management
```python
def calculate_timeout(intent, data_volume):
    base_timeout = 5000  # 5 seconds
    if intent in COMPLEX_INTENTS:
        base_timeout *= 2
    if data_volume > 1000:
        base_timeout += (data_volume / 1000) * 1000
    return min(base_timeout, 30000)  # Cap at 30 seconds
```

### Quality Score Calculation
```python
def calculate_quality_score(result):
    scores = {
        'data_completeness': check_data_completeness(result),
        'answer_relevance': check_relevance(result),
        'calculation_accuracy': verify_calculations(result),
        'response_clarity': assess_clarity(result)
    }
    return sum(scores.values()) / len(scores)
```

---

**Next Document**: [04_PROFILE_CONTEXT_BUILDING.md](./04_PROFILE_CONTEXT_BUILDING.md) - Deep dive into profile pack construction and context building