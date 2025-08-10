# LLM Call Analysis for Agent Framework

## Transaction Data Provided

Yes, we DO provide sample transaction data:

```python
# From entity_resolver.py get_user_database_context()
sample_transactions = []
if include_sample_transactions:
    sample_trans_query = """
    SELECT date, name, merchant_name, category, amount, pending
    FROM transactions
    WHERE user_id = %s
    ORDER BY date DESC
    LIMIT 5  # ← 5 most recent transactions
    """
```

### What Transaction Data is Provided:
1. **Sample Transactions**: 5 most recent transactions with full details
2. **Top Categories**: Aggregated spending by category (last 6 months)
3. **Top Merchants**: Aggregated spending by merchant (last 6 months)
4. **Financial Summary**: Total transaction count and spending (last 12 months)

### Example Context Provided:
```json
{
  "sample_transactions": [
    {
      "date": "2024-01-15",
      "name": "STARBUCKS COFFEE",
      "merchant_name": "Starbucks",
      "category": "Coffee Shops",
      "amount": -5.75,
      "pending": false
    },
    // ... 4 more recent transactions
  ],
  "top_categories": [
    {"category": "Groceries", "total_spent": -423.18},
    {"category": "Restaurants", "total_spent": -312.45}
  ],
  "top_merchants": [
    {"merchant": "Trader Joe's", "total_spent": -215.32},
    {"merchant": "Target", "total_spent": -187.94}
  ]
}
```

## Supervisor Agent vs Semantic Interpreter

**The Supervisor Agent is STILL the main orchestrator!** The Semantic Interpreter is just one component it uses.

### Architecture:
```
User Query
    ↓
SimpleSupervisorAgent (Main Orchestrator)
    ├── DataEnumerator
    ├── SemanticInterpreter (Component, not replacement)
    ├── SimpleSQLAgent
    ├── ResultValidator
    └── QueryExplainer
```

The Supervisor Agent:
- Coordinates all components
- Makes routing decisions
- Generates final responses
- Handles error cases

## LLM Call Count for Medium Complexity Query

### Example: "How much did I spend at coffee shops last month?"

**Total LLM Calls: 5-6**

1. **Routing Decision** (Supervisor)
   - Determines if SQL is needed
   - Model: gpt-4o, ~200 tokens

2. **Semantic Interpretation** (Semantic Interpreter)
   - Understands intent and detects adaptations needed
   - Model: gpt-4o, ~800 tokens

3. **Query Adaptation** (if needed)
   - Generates adapted query
   - Model: gpt-4o, ~400 tokens

4. **SQL Generation** (SQL Agent)
   - Converts to SQL with full context
   - Model: gpt-4o, ~800 tokens

5. **Result Validation** (Result Validator)
   - Validates results make sense
   - Model: gpt-4o, ~600 tokens

6. **Query Explanation** (Query Explainer)
   - Explains what happened
   - Model: gpt-4o, ~600 tokens

7. **Final Response** (Supervisor)
   - Generates user-facing response
   - Model: gpt-4o, ~1500 tokens

### Optimization Opportunities:

1. **Parallel Calls**: Some can run concurrently
   - Semantic interpretation + Data enumeration
   - Result validation + Query explanation

2. **Conditional Calls**:
   - Query adaptation only if needed
   - Validation can be skipped for simple queries

3. **Caching**:
   - Repeated queries use cached results
   - Enumerations cached for 5 minutes

### Call Breakdown by Query Complexity:

| Query Type | Example | LLM Calls | Notes |
|------------|---------|-----------|-------|
| Simple | "What's my balance?" | 3-4 | Skip semantic interpretation |
| Medium | "Coffee spending last month" | 5-6 | Full pipeline |
| Complex | "Am I saving enough for retirement?" | 7-8 | Multiple validations |
| Multi-step | "Compare my spending to budget and suggest cuts" | 8-10 | Multiple SQL queries |

### Token Usage Estimate (Medium Query):
- Total input tokens: ~3,000-4,000
- Total output tokens: ~1,500-2,000
- Cost estimate: ~$0.10-0.15 per query

## Why This Many Calls?

Each LLM call serves a specific purpose:
1. **Routing**: Decides processing path
2. **Understanding**: Interprets user intent
3. **Adaptation**: Handles mismatches
4. **Execution**: Generates precise SQL
5. **Validation**: Ensures quality
6. **Explanation**: Provides transparency
7. **Response**: Natural language output

This modular approach ensures:
- High accuracy
- Clear explanations
- Graceful error handling
- Scalability

## Optimization Strategies

### Current Optimizations:
1. Sample transactions (5 rows) provide context without overwhelming
2. Aggregated data for categories/merchants
3. Caching for repeated queries
4. Parallel processing where possible

### Future Optimizations:
1. Combine some LLM calls (e.g., validation + explanation)
2. Use smaller models for simple tasks
3. Pre-compute common interpretations
4. Batch similar queries