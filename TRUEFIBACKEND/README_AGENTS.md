# TrueFi Agent Framework v4.0

Production-ready LLM-only agentic framework for financial analysis with three specialized agents: SQL Agent, Financial Modeling Agent, and Critique Agent.

## 🏗️ Architecture

```
User Question
    ↓
[Agent Orchestrator]
    ↓
[Profile Pack Builder] → User Financial Data
    ↓
[SQL Agent] → Generate Query → [Critique Agent] → Validate
    ↓
[Execute SQL] → [SQL Sanitizer] → PostgreSQL
    ↓
[Modeling Agent] → Financial Analysis → [Critique Agent] → Validate
    ↓
Final Response
```

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- PostgreSQL database
- OpenAI API key
- Required Python packages (see requirements below)

### Installation

1. **Configure Environment**
```bash
cp .env.example .env
# Edit .env with your configuration
```

2. **Install Dependencies**
```bash
pip install fastapi openai psycopg2-binary pydantic python-dotenv
```

3. **Initialize Database**
Ensure your PostgreSQL database has the TrueFi schema with these key tables:
- `users`, `accounts`, `transactions`
- `goals`, `budgets`, `manual_assets`
- `agent_run_log` (for logging)

4. **Run the Server**
```bash
python main.py
```

## 🔧 Configuration

### Environment Variables (.env)

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=truefi
DB_USER=postgres
DB_PASSWORD=your_password
DB_SSLMODE=require

# OpenAI
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini
OPENAI_MAX_TOKENS=4000
OPENAI_TEMPERATURE=0.1

# Agent Framework
MAX_SQL_REVISIONS=1
MAX_MODEL_REVISIONS=1
MAX_SQL_ROWS=1000
PROFILE_PACK_CACHE_MINUTES=15

# Logging
LOG_LEVEL=INFO
LOG_FILE=agent_execution.log
LOG_TO_DB=true

# Security
JWT_SECRET=your_jwt_secret
ALLOWED_ORIGINS=http://localhost:3000,https://truefi.ai
```

## 📡 API Usage

### Main Chat Endpoint

**POST** `/chat`

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request:**
```json
{
  "message": "How much did I spend on dining this month?",
  "session_id": "optional-session-id"
}
```

**Response:**
```json
{
  "message": "Based on your transaction data...",
  "session_id": "session-123",
  "agent_used": "orchestrator_v4",
  "metadata": {
    "execution_time_ms": 2500,
    "ui_blocks": [...],
    "computations": [...],
    "assumptions": [...]
  },
  "success": true
}
```

### Example Curl Request

```bash
curl -X POST http://localhost:8080/chat \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is my monthly spending by category?",
    "session_id": "test-session-123"
  }'
```

## 🤖 Agent Framework

### 1. SQL Agent (Planner)
- **Purpose**: Generates safe PostgreSQL queries
- **Input**: Question + Schema Card + User Context
- **Output**: Parameterized SQL with justification
- **Safety**: SQL sanitizer prevents DDL/injection

### 2. Financial Modeling Agent (Reasoner)
- **Purpose**: Analyzes data and provides insights
- **Input**: Question + Profile Pack + SQL Results
- **Output**: Markdown analysis with computations
- **Features**: Shows formulas, assumptions, UI blocks

### 3. Critique Agent (Reviewer)
- **Purpose**: Validates SQL and model outputs
- **Input**: Stage + Question + Payload to review
- **Output**: Approve/Revise decision with feedback
- **Stages**: pre_sql, post_sql, post_model

## 📊 Profile Pack v1

Comprehensive user financial snapshot (cached 15 minutes):

```json
{
  "user_core": {
    "user_id": "uuid",
    "first_name": "John",
    "currency": "USD",
    "timezone": "UTC"
  },
  "accounts": [...],
  "derived_metrics": {
    "net_worth": 75000.0,
    "liquid_reserves_months": 3.2,
    "savings_rate_3m": 15.5
  },
  "transactions_sample": [...], // Max 10 rows
  "schema_excerpt": {...}
}
```

## 🔒 Security Features

### SQL Sanitizer
- Blocks DDL operations (DROP, CREATE, ALTER)
- Prevents multiple statements (semicolon detection)
- Requires user_id filter in all queries
- Removes SQL comments and injection patterns

### Authentication
- JWT token validation
- User context isolation
- Request/response logging
- Rate limiting ready

## 🧪 Testing

### Run Tests
```bash
# Install pytest
pip install pytest pytest-asyncio

# Run all tests
pytest tests/

# Run specific test
pytest tests/test_sql_agent.py -v

# Run with coverage
pytest --cov=agents_v2 tests/
```

### Test Categories
- **SQL Agent**: Query generation and validation
- **Sanitizer**: Security and safety checks
- **Profile Pack**: Data loading and serialization
- **Entity Resolver**: Merchant/category normalization

## 📈 Monitoring & Logging

### Database Logging
All agent executions logged to `agent_run_log` table:
```sql
SELECT agent_name, execution_time_ms, error_message
FROM agent_run_log
WHERE user_id = 'user-uuid'
ORDER BY timestamp DESC;
```

### File Logging
Structured logs in `agent_execution.log`:
```json
{
  "run_id": "uuid",
  "user_id": "uuid",
  "agent_name": "sql_agent",
  "execution_time_ms": 1200,
  "input_data": {...},
  "output_data": {...}
}
```

## 🔄 Loop Control

### SQL Stage (Max 1 Revision)
1. SQL Agent generates query
2. Critique Agent validates (pre_sql)
3. If approved → Execute
4. If rejected → Revise once or fail

### Modeling Stage (Max 1 Revision)
1. Modeling Agent analyzes results
2. Critique Agent validates (post_model)
3. If approved → Return response
4. If rejected → Revise once or fail

## 📋 Example Workflows

### Spending Analysis
```
Question: "How much did I spend on groceries last month?"
↓
SQL Agent: Generates query with date filters and category matching
↓
Critique Agent: Validates user_id filter, date logic, category mapping
↓
Execute SQL: Returns transaction data with ABS(amount) for spending
↓
Modeling Agent: Calculates total, average, compares to budget
↓
Critique Agent: Validates calculations, checks assumptions
↓
Response: "You spent $320 on groceries last month, 15% over your $280 budget..."
```

### Investment Analysis
```
Question: "What's my portfolio performance this year?"
↓
SQL Agent: Queries holdings_current and historical data
↓
Modeling Agent: Calculates returns, risk metrics, allocation
↓
Response: Charts + tables showing performance breakdown
```

## 🚨 Error Handling

### Fallback Hierarchy
1. **New Orchestrator** (Primary)
2. **Legacy Supervisor Agent** (Fallback 1)
3. **Basic OpenAI** (Fallback 2)
4. **Error Handler** (Final fallback)

### Common Issues
- **Database Connection**: Check DATABASE_URL
- **OpenAI API**: Verify OPENAI_API_KEY
- **JWT Validation**: Check JWT_SECRET
- **SQL Errors**: Review sanitizer rules

## 🔮 Production Considerations

### Performance
- Profile Pack caching (15min default)
- Database connection pooling
- Async/await throughout
- Query result limits (1000 rows max)

### Scalability
- Stateless agent design
- Horizontal scaling ready
- Load balancer compatible
- Database read replicas supported

### Security
- SQL injection prevention
- User data isolation
- Audit logging
- Error message sanitization

## 📝 API Reference

### Core Endpoints
- `POST /chat` - Main chat with authentication
- `POST /chat/public` - Demo chat without auth
- `GET /health` - System health check

### Chat Session Management
- `POST /api/chat/sessions` - Create session
- `GET /api/chat/sessions` - List user sessions
- `GET /api/chat/sessions/{id}/messages` - Get session messages

### Agent Testing
- `POST /chat/test-agents` - Test agent framework directly

## 🏁 Next Steps

1. **Deploy to Production**
   - Set up environment variables
   - Configure database connections
   - Set up monitoring and alerting

2. **Monitor Performance**
   - Review execution times in logs
   - Monitor agent success rates
   - Track user satisfaction

3. **Iterate and Improve**
   - Analyze failed queries
   - Refine agent prompts
   - Add new financial capabilities

## 🤝 Contributing

1. Follow the agent behavior rules in `docs/2_AGENT_BEHAVIOR_RULES.md`
2. Test all changes with the test suite
3. Update documentation for new features
4. Ensure security best practices

---

**Built with ❤️ for TrueFi - Making financial advice accessible to everyone**