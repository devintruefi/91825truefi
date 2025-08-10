# Agent Framework Flow Diagram

## Complete Query Processing Flow

```
┌─────────────────┐
│   User Query    │ "What's my checking account balance?"
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│          SUPERVISOR AGENT                    │
│  Orchestrates all components                 │
└────────┬────────────────────────────────────┘
         │
         ├─────────────────────────┬─────────────────────────┬─────────────────────────┐
         ▼                         ▼                         ▼                         ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  DB Context      │    │ Data Enumerator  │    │ Entity Resolver  │    │ Schema Registry  │
│  Fetcher         │    │                  │    │                  │    │                  │
├──────────────────┤    ├──────────────────┤    ├──────────────────┤    ├──────────────────┤
│ • All accounts   │    │ • Account types  │    │ • Merchant names │    │ • Full schema    │
│ • Assets/Liabs   │    │ • Categories     │    │ • Fuzzy matching │    │ • Relationships  │
│ • Goals/Budgets  │    │ • Valid values   │    │                  │    │ • Column types   │
│ • Summaries only │    │ • User-specific  │    │                  │    │                  │
└──────────────────┘    └──────────────────┘    └──────────────────┘    └──────────────────┘
         │                         │                         │                         │
         └─────────────────────────┴─────────────────────────┴─────────────────────────┘
                                                │
                                                ▼
                                   ┌────────────────────────┐
                                   │ SEMANTIC INTERPRETER   │
                                   ├────────────────────────┤
                                   │ Input: Query + Context │
                                   │ • Literal parsing      │
                                   │ • Intent detection     │
                                   │ • Mismatch detection   │
                                   │ • Adaptation needed?   │
                                   └───────────┬────────────┘
                                               │
                           ┌───────────────────┴───────────────────┐
                           ▼                                       ▼
                    [No Adaptation]                         [Adaptation Needed]
                           │                                       │
                           │                              ┌────────────────────┐
                           │                              │ Query Adapter      │
                           │                              │ • Preserve intent  │
                           │                              │ • Match data       │
                           │                              │ • Explain changes  │
                           │                              └────────┬───────────┘
                           │                                       │
                           └───────────────────┬───────────────────┘
                                               ▼
                                   ┌────────────────────────┐
                                   │    SQL AGENT           │
                                   ├────────────────────────┤
                                   │ • Full schema aware    │
                                   │ • Context in prompt    │
                                   │ • Generate SQL         │
                                   │ • Safe execution       │
                                   └───────────┬────────────┘
                                               │
                                               ▼
                                   ┌────────────────────────┐
                                   │  RESULT VALIDATOR      │
                                   ├────────────────────────┤
                                   │ • Basic checks         │
                                   │ • AI validation        │
                                   │ • Anomaly detection    │
                                   │ • Suggestions          │
                                   └───────────┬────────────┘
                                               │
                                               ▼
                                   ┌────────────────────────┐
                                   │  QUERY EXPLAINER       │
                                   ├────────────────────────┤
                                   │ • What happened        │
                                   │ • Why adaptations      │
                                   │ • Result meaning       │
                                   │ • Next steps           │
                                   └───────────┬────────────┘
                                               │
                                               ▼
                                   ┌────────────────────────┐
                                   │  FINAL RESPONSE GEN    │
                                   ├────────────────────────┤
                                   │ • Combine all context  │
                                   │ • Natural language     │
                                   │ • Include explanation  │
                                   │ • Actionable           │
                                   └───────────┬────────────┘
                                               │
                                               ▼
                                   ┌────────────────────────┐
                                   │   User Response        │
                                   └────────────────────────┘
```

## Data Flow for Each Component

### 1. Database Context Flow
```
PostgreSQL ──> get_user_database_context() ──> Structured Dict
                           │
                           ├─> account_details (ALL rows)
                           ├─> manual_assets (ALL rows)
                           ├─> manual_liabilities (ALL rows)
                           ├─> goals (ALL rows)
                           ├─> budgets (ALL rows)
                           ├─> top_categories (aggregated)
                           ├─> top_merchants (aggregated)
                           └─> financial_summary (computed)
```

### 2. Schema Registry Flow
```
PostgreSQL ──> information_schema ──> SchemaRegistry
                                            │
                                            ├─> get_full_schema_smart()
                                            │       │
                                            │       ├─> Regular tables: FULL columns
                                            │       └─> Large tables: KEY columns only
                                            │           - transactions: id, user_id, amount, date...
                                            │           - chat_messages: limited
                                            │           - agent_run_log: limited
                                            │
                                            └─> Relationships + Notes
```

### 3. Transaction Data Strategy
```
User Query ──> Entity Resolver ──> Merchant Hints ──> SQL Agent
                                                          │
                                                          ▼
                                                   SQL Generation
                                                          │
                                                          ▼
                                            WHERE merchant_name = 'exact_match'
                                                          │
                                                          ▼
                                                 Aggregated Results Only
                                                 (Never raw transaction rows)
```

## Example: Checking Account Query

### Input
```
Query: "What's my checking account balance?"
User Reality: Has investment ($45k) and credit (-$1.2k) accounts only
```

### Processing Steps

1. **Data Collection** (Parallel)
   ```
   ├─> DB Context: {accounts: [{type: "investment"}, {type: "credit"}]}
   ├─> Enumerations: {user_account_types: ["investment", "credit"]}
   ├─> Schema: Full accounts table structure
   └─> Merchant Hints: [] (not needed for this query)
   ```

2. **Semantic Interpretation**
   ```json
   {
     "literal_request": {
       "entities": ["checking"],
       "action": "get balance",
       "filters": {"account_types": ["checking"]}
     },
     "semantic_intent": {
       "primary_goal": "know liquid funds balance",
       "confidence": 0.85
     },
     "adaptations_needed": {
       "mismatch_detected": true,
       "reason": "User has no checking accounts",
       "suggested_adaptation": "Show all accounts"
     }
   }
   ```

3. **Query Adaptation**
   ```
   Original: "checking account balance"
   Adapted: "all account balances"
   Explanation: "You don't have checking accounts, showing all accounts"
   ```

4. **SQL Generation**
   ```sql
   -- User asked for checking but only has investment/credit
   SELECT 
       name,
       type,
       balance,
       CASE 
           WHEN type = 'credit' THEN 'Available Credit'
           ELSE 'Balance'
       END as balance_type
   FROM accounts
   WHERE user_id = 'xxx' 
       AND is_active = true
   ORDER BY balance DESC
   ```

5. **Result Validation**
   ```json
   {
     "validation_status": "valid",
     "confidence": 0.9,
     "issues_found": [],
     "summary": "Results match user's actual accounts"
   }
   ```

6. **Final Response**
   ```
   I see you asked about checking accounts. You currently have 
   an investment account and a credit card account. Here's your 
   account summary:

   • Wells Fargo 401k (Investment): $45,000.00
   • BofA Credit Card (Credit): -$1,200.00 (Outstanding balance)

   Total Assets: $43,800.00

   💡 Tip: If you need a checking account for daily transactions, 
   I can help you explore options.
   ```

## Key Design Decisions

### Why Full Schema (except transactions)?
- **Completeness**: Agents understand all relationships
- **Flexibility**: Can join any tables as needed
- **Discovery**: Can suggest features user doesn't know about

### Why Only Transaction Schema, Not Data?
- **Volume**: Thousands of rows would overwhelm context
- **Efficiency**: Most queries need aggregations anyway
- **Precision**: Entity resolver provides exact merchant matches

### Why Separate Components?
- **Modularity**: Each component has single responsibility
- **Testability**: Can test each component independently
- **Scalability**: Can optimize each component separately
- **Maintainability**: Clear boundaries and interfaces