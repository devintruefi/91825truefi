# Active Agent Files in Current Production Framework

## Core Agent Files (Actually Used in Frontend)

### 1. Main Entry Points
- **`main.py`** - Imports and initializes SimpleSupervisorAgent
- **`agents/__init__.py`** - Exports the agents

### 2. Primary Agents
- **`agents/simple_supervisor_agent.py`** - The main orchestrator (planner/router)
- **`agents/sql_agent_simple.py`** - SQL generation and execution
- **`agents/base_agent.py`** - Base class with logging

### 3. Active Utility Modules
- **`agents/utils/entity_resolver.py`** - Resolves merchants, categories, accounts
- **`agents/utils/schema_registry.py`** - Database schema catalog
- **`agents/utils/data_enumerator.py`** - Enumerates user data patterns
- **`agents/utils/semantic_interpreter.py`** - Query interpretation (optional, slow)
- **`agents/utils/result_validator.py`** - Validates SQL results
- **`agents/utils/query_explainer.py`** - Generates explanations

## Files NOT Currently Used (Legacy/Alternative Implementations)

### Unused Agent Implementations
- `agents/supervisor_agent.py` - Old pattern-based supervisor
- `agents/supervisor_agent_v2.py` - Previous version
- `agents/dynamic_supervisor_agent.py` - Dynamic routing version (not active)
- `agents/sql_agent.py` - Old SQL agent
- `agents/sql_agent_v2.py` - Previous SQL version
- `agents/plaid_agent.py` - Plaid-specific agent (not integrated)
- `agents/calculation_agent.py` - Calculation agent (not integrated)
- `agents/knowledge_agent.py` - Knowledge agent (planned, not implemented)

### Unused Utilities
- `agents/utils/query_parser.py` - Pattern-based parser (replaced by LLM)
- `agents/utils/dynamic_context_builder.py` - Old context builder
- Other utils in the folder not listed above

## Call Flow

```
main.py
  └─> SimpleSupervisorAgent (orchestrator)
       ├─> entity_resolver (identifies entities)
       ├─> schema_registry (gets DB schema)
       ├─> data_enumerator (gets data patterns)
       ├─> semantic_interpreter (optional, for query adaptation)
       ├─> _plan_route() (LLM planning)
       └─> SimpleSQLAgent (for data queries)
            ├─> schema_registry (gets schema)
            ├─> _generate_sql() (LLM SQL generation)
            └─> _execute_with_retry() (runs SQL)
```

## Configuration to Optimize Performance

### Currently Slow Components
1. **semantic_interpreter** - Takes 3-5 seconds, can be disabled with `skip_validation=True`
2. **result_validator** - Takes 2-3 seconds, can be disabled with `skip_validation=True`
3. **query_explainer** - Takes 2-3 seconds, can be disabled with `skip_validation=True`

### Recommended Production Settings

In `main.py`, when calling the supervisor, add:

```python
supervisor_result = await supervisor_agent.process(
    query=input.message,
    user_id=user_id,
    user_name=user_name,
    session_id=session_id,
    skip_validation=True  # Add this for 10x faster responses
)
```

This will skip the slow validation steps while maintaining core functionality.

## Summary

**Active files: 9 total**
- 3 agent files (base, supervisor, SQL)
- 6 utility files

**Inactive files: 15+ legacy implementations**

The current framework is clean and focused, using only the SimpleSupervisorAgent and SimpleSQLAgent with their essential utilities.