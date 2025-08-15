# Routing Policy

## Purpose
Define clear boundaries for when to route to SQL vs Modeling agents, ensuring efficient and accurate processing.

## Core Principles
1. **SQL Agent**: Retrieval-only operations, no calculations or decisions
2. **Financial Modeling Agent**: All calculations, projections, and decision-making
3. **Minimize unnecessary hops**: Only route to SQL when fresh data is truly needed

## Routing Decision Tree

### Route to Modeling-Only When:
- Core financial inputs already available in context:
  - `recurring_income` present
  - `manual_liabilities` present
  - No request for recent transaction aggregates
- Query intent is:
  - Affordability calculation
  - Constraint solving (e.g., max rent given DTI)
  - Scenario planning
  - Projection/forecasting
  - Optimization

### Route to SQL+Modeling When:
- Fresh transaction data explicitly needed:
  - Time-bound aggregates (last N months)
  - Merchant/category breakdowns
  - Recent spending patterns
- Query mentions specific timeframes requiring transaction history
- Budgets comparison needed against actuals
- Account balance verification required

### Route to SQL-Only When:
- Pure data retrieval queries
- List/lookup operations
- No calculations required

## Routing Metadata Requirements
Every routing decision must log:
```json
{
  "routing_decision": "ModelingOnly|SQL+Modeling|SQL-Only",
  "reason": "Clear explanation",
  "required_agents": ["agent_names"],
  "sources_used": ["data_sources"],
  "sql_brief_needed": boolean
}
```

## SQL Brief Usage
When SQL is involved, prefer CashFlow Brief when:
- Standard financial metrics suffice
- No complex transaction filtering needed
- Time window is standard (6 months)

## Never Do
- Never route to SQL "just in case"
- Never have SQL perform calculations
- Never bypass logging routing decisions
- Never make routing decisions based on specific user IDs