# TrueFi AI Agentic Framework - Complete System Architecture

## Architecture Overview

The TrueFi AI Financial Advisor employs a sophisticated multi-agent orchestration system that processes user queries through specialized AI agents, each with distinct responsibilities and capabilities. This document provides a comprehensive technical overview of the entire agentic framework.

```
User Query → Authentication → Orchestrator → Agent Pipeline → Response Generation
                                    ↓
                            Profile Pack Builder
                                    ↓
                            Intent Classification
                                    ↓
                            Agent Routing & Execution
                                    ↓
                            Validation & Critique
                                    ↓
                            Response Formatting
```

## Core System Components

### 1. FastAPI Backend Entry Point (`main.py`)

**Location**: `/TRUEFIBACKEND/main.py`

**Responsibilities**:
- HTTP request handling and routing
- JWT authentication and session management
- Database connection pooling
- OpenAI client initialization
- CORS middleware for frontend communication

**Key Configuration**:
```python
# Database Pool Configuration
ThreadedConnectionPool(
    minconn=1,
    maxconn=10,
    keepalives_idle=30,
    keepalives_interval=10,
    keepalives_count=5
)

# OpenAI Async Client
client = openai.AsyncOpenAI(api_key=OPENAI_API_KEY)
```

**Input/Output**:
- **Input**: HTTP POST request with message, session_id, conversation_history
- **Output**: JSON response with AI-generated answer, UI blocks, computations

### 2. Agent Orchestrator (`orchestrator.py`)

**Location**: `/TRUEFIBACKEND/orchestrator.py`

**Purpose**: Central coordinator that manages the entire agent pipeline execution

**Key Components**:
```python
class AgentOrchestrator:
    - sql_agent: SQL query generation
    - modeling_agent: Financial analysis and response generation
    - critique_agent: Validation and quality control
    - profile_builder: User context aggregation
    - memory_manager: Conversation history and context
    - pattern_detector: User behavior analysis
```

**Execution Flow**:
1. Intent detection and classification
2. Profile pack construction
3. Memory context building
4. SQL generation loop (if needed)
5. Modeling and analysis loop
6. Final critique and validation
7. Response storage in memory

**Loop Controls**:
- Maximum SQL revisions: 3
- Maximum model revisions: 2
- Timeout: 30 seconds per agent

## Agent Framework Components

### 3. Profile Pack Builder (`profile_pack/builder.py`)

**Purpose**: Constructs comprehensive user financial context

**Data Collection Limits**:
```python
LIMITS = {
    'accounts': 200,
    'holdings': 500,
    'manual_assets': 100,
    'manual_liabilities': 100,
    'goals': 50,
    'recurring_income': 20,
    'budgets': 10,
    'transactions_sample': 10
}
```

**Profile Pack Structure**:
```json
{
    "user_core": {
        "user_id": "uuid",
        "demographics": {},
        "preferences": {},
        "tax_profile": {}
    },
    "accounts": [],
    "holdings": [],
    "manual_assets": [],
    "goals": [],
    "budgets": [],
    "derived_metrics": {
        "net_worth": 0,
        "monthly_income": 0,
        "monthly_expenses": 0,
        "savings_rate": 0
    }
}
```

**Intent-Based Optimization**:
- Lightweight intents skip heavy data loading
- Caching with 15-minute TTL
- Conditional component loading based on query type

### 4. Intent Classification System (`agents/router.py`)

**Intent Categories**:

```python
class Intent(Enum):
    # Analytical Intents
    ACCOUNT_BALANCES = "account_balances"
    NET_WORTH = "net_worth"
    SPENDING_ANALYSIS = "spending_analysis"
    BUDGET_STATUS = "budget_status"
    SAVINGS_RATE = "savings_rate"
    INVESTMENT_PERFORMANCE = "investment_performance"

    # Planning Intents
    GOAL_PROGRESS = "goal_progress"
    RETIREMENT_PLANNING = "retirement_planning"
    SCENARIO_MODELING = "scenario_modeling"

    # Transactional Intents
    TRANSACTION_SEARCH = "transaction_search"
    RECENT_TRANSACTIONS = "recent_transactions"

    # Conversational Intents
    FINANCIAL_EDUCATION = "financial_education"
    GENERAL_ADVICE = "general_advice"
```

**Intent Contract Structure**:
```json
{
    "intent": "spending_analysis",
    "tables": ["transactions", "accounts"],
    "time_bounds": "3_months",
    "aggregation": "category",
    "skip_sql": false,
    "conversational": false,
    "requires_modeling": true
}
```

### 5. SQL Agent (`agents/sql_agent.py` / `sql_agent_enhanced.py`)

**Purpose**: Generates optimized SQL queries for data retrieval

**Input Structure**:
```json
{
    "kind": "sql_request",
    "question": "user question",
    "schema_card": {},
    "context": {
        "user_id": "uuid",
        "time_range": "3_months"
    },
    "constraints": {
        "max_rows": 5000,
        "exclude_pending": true,
        "prefer_monthly_bins": true
    }
}
```

**SQL Generation Process**:
1. Schema analysis and table selection
2. Intent-based query optimization
3. Security sanitization
4. Parameter binding
5. Query execution with timeout

**Security Features**:
- SQL injection prevention
- Parameterized queries only
- Table access control
- Row limit enforcement

### 6. Modeling Agent (`agents/modeling_agent.py`)

**Purpose**: Transforms raw data into insights and formatted responses

**Capabilities**:
- Financial calculations (net worth, ratios, trends)
- Natural language generation
- Chart/visualization generation
- Scenario modeling
- Personalized recommendations

**Input**:
```json
{
    "kind": "model_request",
    "question": "user question",
    "profile_pack": {},
    "sql_result": {
        "data": [],
        "row_count": 0
    },
    "context": {}
}
```

**Output**:
```json
{
    "answer_markdown": "formatted response",
    "ui_blocks": [
        {
            "type": "chart",
            "data": {},
            "config": {}
        }
    ],
    "computations": [
        {
            "name": "net_worth",
            "result": "$125,000"
        }
    ],
    "confidence_score": 0.95
}
```

### 7. Critique Agent (`agents/critique_agent.py`)

**Purpose**: Validates and improves agent outputs

**Validation Stages**:
1. **Pre-SQL**: Validates question understanding
2. **Post-SQL**: Checks query correctness and results
3. **Post-Model**: Validates answer quality and completeness

**Critique Criteria**:
- Factual accuracy
- Completeness
- Relevance to question
- Data freshness
- Calculation correctness
- Response clarity

**Output**:
```json
{
    "status": "approve|revise|reject",
    "issues": [],
    "suggestions": [],
    "confidence": 0.85
}
```

## Memory System (`memory/`)

### Components:

1. **MemoryManager**: Stores and retrieves conversation history
2. **ContextBuilder**: Constructs relevant context for agents
3. **PatternDetector**: Identifies user behavior patterns

### Memory Storage Structure:
```sql
-- Conversation Memory
chat_messages:
  - session_id
  - role (user/assistant)
  - content
  - intent
  - entities
  - sql_executed
  - execution_time_ms

-- Context Storage
conversation_context:
  - context_type
  - context_value
  - relevance_score
  - ttl_minutes
```

## Database Access Layer

### Connection Management:
- Thread-safe connection pooling
- Automatic reconnection on failure
- Query timeout enforcement (5 seconds default)
- Transaction isolation

### Query Execution:
```python
def execute_safe_query(query, params, timeout=5000):
    - Parameter sanitization
    - Query logging
    - Performance monitoring
    - Error handling with rollback
```

## Prompt Engineering System

### System Prompts Structure:

```python
# Base Financial Advisor Prompt
SYSTEM_PROMPT = """
You are Penny, TrueFi's AI financial advisor.
You provide personalized, actionable financial guidance.

User Context:
{profile_pack}

Conversation History:
{conversation_history}

Current Question:
{question}

Guidelines:
- Be conversational yet professional
- Use specific numbers from user data
- Provide actionable next steps
- Explain financial concepts simply
"""
```

### Dynamic Context Injection:
1. User financial state
2. Recent transactions
3. Goals and progress
4. Risk profile
5. Conversation history
6. Detected patterns

## Agent Communication Protocol

### Inter-Agent Message Format:
```json
{
    "agent_from": "orchestrator",
    "agent_to": "sql_agent",
    "message_type": "request",
    "payload": {},
    "metadata": {
        "timestamp": "2024-01-01T00:00:00Z",
        "request_id": "uuid",
        "user_id": "uuid"
    }
}
```

### Agent Capabilities Matrix:

| Agent | Database Access | LLM Access | Memory Access | External APIs |
|-------|----------------|------------|---------------|---------------|
| Orchestrator | Read | No | Read/Write | No |
| SQL Agent | Read | Yes (GPT-4) | Read | No |
| Modeling Agent | No | Yes (GPT-4) | Read | No |
| Critique Agent | No | Yes (GPT-4) | Read | No |
| Profile Builder | Read | No | No | No |

## Performance Optimizations

### Caching Strategy:
- Profile Pack: 15-minute TTL
- SQL Results: Request-level cache
- LLM Responses: No caching (real-time)
- User Preferences: 60-minute TTL

### Parallel Processing:
- Concurrent database queries where possible
- Async OpenAI API calls
- Parallel agent execution for independent tasks

### Resource Limits:
- Max execution time: 30 seconds
- Max memory per request: 512MB
- Max SQL result rows: 5000
- Max response tokens: 4096

## Error Handling & Recovery

### Error Categories:
1. **Database Errors**: Connection retry with exponential backoff
2. **LLM Errors**: Fallback to simpler prompts
3. **Timeout Errors**: Graceful degradation with partial results
4. **Validation Errors**: Agent revision loops

### Recovery Strategies:
```python
try:
    # Primary execution path
except DatabaseError:
    # Use cached data if available
except LLMError:
    # Fallback to rule-based response
except TimeoutError:
    # Return partial results with explanation
finally:
    # Log execution metrics
```

## Monitoring & Observability

### Logging Levels:
- **INFO**: Request/response flow
- **DEBUG**: Agent decisions and data
- **WARNING**: Performance issues, fallbacks
- **ERROR**: Failures requiring attention

### Metrics Tracked:
- Request latency (p50, p95, p99)
- Agent execution times
- Database query performance
- LLM token usage
- Error rates by type
- User satisfaction scores

### Audit Trail:
```sql
agent_run_log:
  - agent_name
  - input_data
  - output_data
  - sql_queries
  - api_calls
  - execution_time_ms
  - error_message
```

## Security Architecture

### Authentication Flow:
1. JWT token validation
2. User ID extraction
3. Permission checking
4. Session validation

### Data Access Control:
- Row-level security (user_id filtering)
- Column-level masking (PII protection)
- API rate limiting
- Request signing

### Encryption:
- At-rest: AES-256
- In-transit: TLS 1.3
- Secrets: Environment variables
- Tokens: JWT with RS256

## Scalability Design

### Horizontal Scaling:
- Stateless agents
- Distributed caching (Redis)
- Load balancer ready
- Database read replicas

### Vertical Scaling:
- Connection pool sizing
- Memory allocation tuning
- Query optimization
- Index management

## Future Architecture Enhancements

### Planned Improvements:
1. **Multi-Model Support**: Claude, Gemini integration
2. **Streaming Responses**: Real-time answer generation
3. **Autonomous Agents**: Proactive insights and alerts
4. **Federated Learning**: Cross-user pattern learning
5. **Edge Deployment**: Local processing for sensitive data

### Architecture Evolution:
- Microservices migration
- Event-driven architecture
- GraphQL API layer
- Real-time WebSocket updates

---

**Next Document**: [03_AGENT_ORCHESTRATION.md](./03_AGENT_ORCHESTRATION.md) - Detailed orchestration flow and agent coordination