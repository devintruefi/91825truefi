# Profile Pack Construction & Context Building System

## Overview

The Profile Pack Builder and Context Building systems form the foundation of TrueFi's personalized AI responses. They aggregate, organize, and optimize user financial data into a comprehensive context that every agent can access. This document details the complete data collection, processing, and context construction pipeline.

## Profile Pack Builder Architecture

### Core Component
**Location**: `/TRUEFIBACKEND/profile_pack/builder.py`

```python
class ProfilePackBuilder:
    """Constructs comprehensive financial profile with bounded data collection"""

    def __init__(self):
        self.db_pool = get_db_pool()
        self.cache = {}
        self.cache_expiry = {}
```

## Data Collection Limits

The system enforces strict limits to ensure performance:

```python
LIMITS = {
    'accounts': 200,              # Bank, investment, credit accounts
    'holdings': 500,               # Individual investment positions
    'manual_assets': 100,          # User-entered assets
    'manual_liabilities': 100,     # User-entered debts
    'goals': 50,                   # Financial goals
    'allocation_history': 50,      # Goal allocation records
    'recurring_income': 20,        # Income sources
    'budgets': 10,                 # Active budgets
    'budget_categories': 100,      # Category breakdowns
    'budget_spending': 144,        # 12 months of spending data
    'financial_insights': 25,      # AI-generated insights
    'transactions_sample': 10      # Recent transaction context
}
```

## Complete Profile Pack Structure

### 1. User Core Component

**Query**:
```sql
SELECT
    -- Identity
    u.id as user_id,
    u.first_name,
    u.last_name,
    u.email,

    -- Preferences
    u.currency_preference as currency,
    COALESCE(up.timezone, 'UTC') as timezone,
    u.created_at,

    -- Extended Identity
    ui.full_name,
    ui.phone_primary,
    ui.street,
    ui.city,
    ui.state as state_residence,
    ui.postal_code,

    -- Demographics
    ud.age,
    ud.household_income,
    ud.marital_status,
    ud.dependents,
    ud.life_stage,

    -- Financial Preferences
    up.risk_tolerance,
    up.investment_horizon,
    up.financial_goals,
    up.notifications_enabled,

    -- Tax Profile
    tp.filing_status,
    tp.federal_rate,
    tp.state_rate,
    tp.state as tax_state

FROM users u
LEFT JOIN user_identity ui ON u.id = ui.user_id
LEFT JOIN user_demographics ud ON u.id = ud.user_id
LEFT JOIN user_preferences up ON u.id = up.user_id
LEFT JOIN tax_profile tp ON u.id = tp.user_id
WHERE u.id = %(user_id)s
```

**Output Structure**:
```json
{
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@example.com",
    "full_name": "John Michael Doe",
    "age": 35,
    "household_income": 120000,
    "marital_status": "married",
    "dependents": 2,
    "life_stage": "mid_career",
    "risk_tolerance": "moderate",
    "investment_horizon": "long_term",
    "currency": "USD",
    "timezone": "America/New_York",
    "state_residence": "NY",
    "filing_status": "married_filing_jointly",
    "federal_rate": 0.22,
    "state_rate": 0.065,
    "created_at": "2023-01-15T08:00:00Z"
}
```

### 2. Accounts Component

**Query**:
```sql
SELECT
    a.id,
    a.name,
    a.official_name,
    a.type,
    a.subtype,
    a.mask,
    a.institution_name,
    a.balance,
    a.available_balance,
    a.limit_amount,
    a.currency,
    a.is_active,
    a.updated_at,
    a.balances_last_updated,

    -- Plaid metadata
    a.plaid_account_id,
    a.plaid_item_id,
    a.persistent_account_id,

    -- Institution details
    i.name as institution_full_name,
    i.logo_url,
    i.products

FROM accounts a
LEFT JOIN institutions i ON a.institution_id = i.id
WHERE a.user_id = %(user_id)s
    AND a.is_active = true
ORDER BY a.balance DESC
LIMIT 200
```

**Output Structure**:
```json
[
    {
        "id": "acc_001",
        "name": "Chase Total Checking",
        "official_name": "CHASE TOTAL CHECKING ...1234",
        "type": "depository",
        "subtype": "checking",
        "mask": "1234",
        "institution_name": "Chase Bank",
        "balance": 5234.67,
        "available_balance": 5234.67,
        "limit_amount": null,
        "currency": "USD",
        "is_active": true,
        "updated_at": "2024-01-20T15:30:00Z",
        "balances_last_updated": "2024-01-20T15:30:00Z",
        "days_since_update": 0.5
    },
    {
        "id": "acc_002",
        "name": "Sapphire Reserve",
        "type": "credit",
        "subtype": "credit_card",
        "balance": -2345.89,
        "limit_amount": 25000,
        "utilization": 0.094
    }
]
```

### 3. Holdings Component (Investments)

**Query**:
```sql
SELECT
    h.id,
    h.account_id,
    h.security_id,
    h.quantity,
    h.cost_basis,
    h.institution_price,
    h.institution_value,
    h.vested_quantity,
    h.vested_value,

    -- Security details
    s.name as security_name,
    s.ticker,
    s.security_type,
    s.cusip,
    s.is_cash_equivalent,

    -- Account context
    a.name as account_name,
    a.type as account_type

FROM holdings h
JOIN securities s ON h.security_id = s.id
JOIN accounts a ON h.account_id = a.account_id
WHERE a.user_id = %(user_id)s
ORDER BY h.institution_value DESC
LIMIT 500
```

**Output Structure**:
```json
[
    {
        "id": "hold_001",
        "account_id": "acc_003",
        "account_name": "Fidelity 401k",
        "security_name": "Vanguard S&P 500 ETF",
        "ticker": "VOO",
        "security_type": "etf",
        "quantity": 125.5,
        "cost_basis": 38750.00,
        "institution_price": 425.30,
        "institution_value": 53380.15,
        "unrealized_gain": 14630.15,
        "percent_gain": 0.378
    }
]
```

### 4. Goals Component

**Query**:
```sql
SELECT
    g.id,
    g.name,
    g.description,
    g.target_amount,
    g.current_amount,
    g.target_date,
    g.priority,
    g.is_active,
    g.allocation_method,
    g.checking_buffer_amount,
    g.allocation_percentage,

    -- Progress calculations
    CASE
        WHEN g.target_amount > 0
        THEN ROUND((g.current_amount / g.target_amount * 100)::numeric, 2)
        ELSE 0
    END as progress_percentage,

    -- Time calculations
    EXTRACT(DAYS FROM (g.target_date - CURRENT_DATE)) as days_remaining,

    -- Linked accounts
    ARRAY_AGG(
        jsonb_build_object(
            'account_id', ga.account_id,
            'allocation_percentage', ga.allocation_percentage,
            'fixed_amount', ga.fixed_amount
        )
    ) as linked_accounts

FROM goals g
LEFT JOIN goal_accounts ga ON g.id = ga.goal_id
WHERE g.user_id = %(user_id)s
    AND g.is_active = true
GROUP BY g.id
ORDER BY g.priority DESC, g.target_date ASC
LIMIT 50
```

**Output Structure**:
```json
[
    {
        "id": "goal_001",
        "name": "Emergency Fund",
        "description": "6 months of expenses",
        "target_amount": 30000,
        "current_amount": 18500,
        "target_date": "2024-12-31",
        "priority": "high",
        "progress_percentage": 61.67,
        "days_remaining": 345,
        "monthly_required": 1045.45,
        "linked_accounts": [
            {
                "account_id": "acc_004",
                "allocation_percentage": 100
            }
        ]
    }
]
```

### 5. Budgets Component

**Query**:
```sql
WITH budget_actuals AS (
    SELECT
        bc.budget_id,
        bc.id as category_id,
        bc.category,
        bc.amount as budgeted,
        COALESCE(SUM(
            CASE
                WHEN t.date >= DATE_TRUNC('month', CURRENT_DATE)
                AND t.category = bc.category
                THEN ABS(t.amount)
                ELSE 0
            END
        ), 0) as spent
    FROM budget_categories bc
    LEFT JOIN transactions t ON t.user_id = %(user_id)s
    WHERE bc.budget_id IN (
        SELECT id FROM budgets
        WHERE user_id = %(user_id)s AND is_active = true
    )
    GROUP BY bc.budget_id, bc.id, bc.category, bc.amount
)
SELECT
    b.id,
    b.name,
    b.description,
    b.amount as total_budget,
    b.period,
    b.start_date,
    b.end_date,

    -- Aggregated actuals
    SUM(ba.spent) as total_spent,
    b.amount - SUM(ba.spent) as remaining,

    -- Category breakdown
    jsonb_agg(
        jsonb_build_object(
            'category', ba.category,
            'budgeted', ba.budgeted,
            'spent', ba.spent,
            'remaining', ba.budgeted - ba.spent,
            'percent_used',
                CASE
                    WHEN ba.budgeted > 0
                    THEN ROUND((ba.spent / ba.budgeted * 100)::numeric, 2)
                    ELSE 0
                END
        )
    ) as categories

FROM budgets b
JOIN budget_actuals ba ON b.id = ba.budget_id
WHERE b.user_id = %(user_id)s
    AND b.is_active = true
GROUP BY b.id
LIMIT 10
```

**Output Structure**:
```json
[
    {
        "id": "budget_001",
        "name": "Monthly Budget",
        "total_budget": 6000,
        "period": "monthly",
        "total_spent": 4250,
        "remaining": 1750,
        "percent_used": 70.83,
        "categories": [
            {
                "category": "Housing",
                "budgeted": 2000,
                "spent": 2000,
                "remaining": 0,
                "percent_used": 100
            },
            {
                "category": "Groceries",
                "budgeted": 600,
                "spent": 487,
                "remaining": 113,
                "percent_used": 81.17
            }
        ]
    }
]
```

### 6. Recurring Income Component

**Query**:
```sql
SELECT
    ri.id,
    ri.source,
    ri.employer,
    ri.gross_monthly,
    ri.net_monthly,
    ri.frequency,
    ri.next_pay_date,
    ri.effective_from,
    ri.effective_to,
    ri.is_net,
    ri.inflation_adj,

    -- Annual calculations
    CASE ri.frequency
        WHEN 'monthly' THEN ri.gross_monthly * 12
        WHEN 'biweekly' THEN ri.gross_monthly * 26
        WHEN 'weekly' THEN ri.gross_monthly * 52
        ELSE ri.gross_monthly * 12
    END as annual_gross

FROM recurring_income ri
WHERE ri.user_id = %(user_id)s
    AND (ri.effective_to IS NULL OR ri.effective_to > CURRENT_DATE)
ORDER BY ri.gross_monthly DESC
LIMIT 20
```

### 7. Derived Metrics Component

**Calculation Logic**:
```python
def _calculate_derived_metrics(self, user_id: str, lightweight: bool = False):
    metrics = {}

    # Net Worth Calculation
    total_assets = sum([
        sum(acc['balance'] for acc in accounts if acc['balance'] > 0),
        sum(holding['institution_value'] for holding in holdings),
        sum(asset['value'] for asset in manual_assets)
    ])

    total_liabilities = sum([
        abs(sum(acc['balance'] for acc in accounts if acc['balance'] < 0)),
        sum(liability['balance'] for liability in manual_liabilities)
    ])

    metrics['net_worth'] = total_assets - total_liabilities

    # Cash Flow Calculation
    monthly_income = sum(income['net_monthly'] for income in recurring_income)

    # Get last 3 months average spending
    monthly_expenses = calculate_average_monthly_expenses(user_id)

    metrics['monthly_cash_flow'] = monthly_income - monthly_expenses
    metrics['savings_rate'] = (monthly_income - monthly_expenses) / monthly_income if monthly_income > 0 else 0

    # Debt Metrics
    total_debt = total_liabilities
    annual_income = monthly_income * 12
    metrics['debt_to_income'] = total_debt / annual_income if annual_income > 0 else 0

    # Emergency Fund
    liquid_assets = sum(acc['balance'] for acc in accounts
                       if acc['type'] in ['checking', 'savings'])
    metrics['emergency_fund_months'] = liquid_assets / monthly_expenses if monthly_expenses > 0 else 0

    # Investment Metrics (skip if lightweight)
    if not lightweight:
        investment_value = sum(holding['institution_value'] for holding in holdings)
        investment_cost = sum(holding['cost_basis'] for holding in holdings)
        metrics['investment_return'] = (investment_value - investment_cost) / investment_cost if investment_cost > 0 else 0

    return metrics
```

**Output Structure**:
```json
{
    "net_worth": 245000,
    "liquid_net_worth": 45000,
    "monthly_income": 8500,
    "monthly_expenses": 6200,
    "monthly_cash_flow": 2300,
    "savings_rate": 0.27,
    "debt_to_income": 0.35,
    "emergency_fund_months": 7.26,
    "investment_return": 0.23,
    "total_assets": 425000,
    "total_liabilities": 180000,
    "checking_balance": 5234,
    "savings_balance": 40000,
    "investment_balance": 125000,
    "retirement_balance": 185000,
    "credit_card_debt": 5000,
    "mortgage_balance": 175000
}
```

### 8. Transaction Sample Component

**Query**:
```sql
SELECT
    t.id,
    t.date,
    t.amount,
    t.name,
    t.merchant_name,
    t.category,
    t.pending,
    a.name as account_name,
    a.type as account_type
FROM transactions t
JOIN accounts a ON t.account_id = a.id
WHERE t.user_id = %(user_id)s
ORDER BY t.date DESC
LIMIT 10
```

**Purpose**: Provides recent transaction context for conversational relevance

## Intent-Based Optimization

### Lightweight Intent Detection

```python
def _is_lightweight_intent(self, intent: Optional[str]) -> bool:
    """Determine if intent only needs basic data"""

    lightweight_intents = [
        'account_balances',      # Only needs accounts
        'recent_transactions',    # Only needs transactions
        'spend_by_category',      # Only needs transactions
        'spend_by_time',         # Only needs transactions
        'cashflow_summary',      # Needs accounts + transactions
        'transaction_search',    # Only needs transactions
        'savings_rate'           # Needs income + expenses
    ]

    return intent.lower() in lightweight_intents
```

### Heavy Intent Requirements

```python
heavy_intent_requirements = {
    'net_worth': [
        'accounts', 'holdings', 'manual_assets',
        'manual_liabilities', 'real_estate'
    ],
    'investment_performance': [
        'holdings', 'investment_transactions',
        'securities', 'accounts'
    ],
    'retirement_planning': [
        'holdings', 'goals', 'recurring_income',
        'contribution_schedule', 'tax_profile'
    ],
    'tax_optimization': [
        'tax_profile', 'investment_transactions',
        'holdings', 'recurring_income'
    ]
}
```

## Context Building System

### Memory Context Builder

**Location**: `/TRUEFIBACKEND/memory/context_builder.py`

```python
class ContextBuilder:
    """Builds rich context from conversation history and user patterns"""

    async def build_agent_context(
        self,
        user_id: str,
        session_id: str,
        current_question: str,
        intent: str,
        profile_pack: Dict
    ) -> Dict[str, Any]:
```

### Context Components

#### 1. Conversation Summary
```sql
SELECT
    COUNT(*) as message_count,
    MIN(created_at) as conversation_start,
    MAX(created_at) as last_message,
    ARRAY_AGG(DISTINCT intent) as topics_discussed,
    AVG(
        CASE
            WHEN feedback_score IS NOT NULL
            THEN feedback_score
            ELSE NULL
        END
    ) as avg_satisfaction
FROM chat_messages
WHERE session_id = %(session_id)s
```

#### 2. Recent Context Window
```sql
SELECT
    role,
    content,
    intent,
    entities,
    created_at
FROM chat_messages
WHERE session_id = %(session_id)s
ORDER BY created_at DESC
LIMIT 5
```

#### 3. User Preferences
```sql
SELECT
    preference_key,
    preference_value,
    learned_at,
    confidence_score
FROM user_learned_preferences
WHERE user_id = %(user_id)s
    AND confidence_score > 0.7
ORDER BY confidence_score DESC
```

#### 4. Behavioral Patterns
```python
def detect_patterns(self, user_id: str) -> Dict:
    patterns = {
        'query_frequency': self._calculate_query_frequency(user_id),
        'preferred_times': self._get_preferred_query_times(user_id),
        'common_topics': self._get_common_topics(user_id),
        'interaction_style': self._analyze_interaction_style(user_id)
    }
    return patterns
```

### Complete Context Output

```json
{
    "conversation_summary": {
        "has_history": true,
        "message_count": 25,
        "conversation_start": "2024-01-20T09:00:00Z",
        "topics_discussed": ["spending", "budgets", "investments"],
        "sentiment_trend": "positive",
        "avg_satisfaction": 4.2
    },

    "recent_context": [
        {
            "role": "user",
            "content": "How much did I save last month?",
            "intent": "savings_analysis",
            "timestamp": "2024-01-20T14:25:00Z"
        },
        {
            "role": "assistant",
            "content": "You saved $2,300 last month...",
            "timestamp": "2024-01-20T14:25:15Z"
        }
    ],

    "user_preferences": {
        "communication_style": "detailed_explanations",
        "visualization_preference": "charts_over_tables",
        "risk_appetite": "conservative",
        "primary_concerns": ["debt_reduction", "emergency_fund"],
        "avoided_topics": [],
        "preferred_advice_depth": "comprehensive"
    },

    "behavioral_patterns": {
        "query_frequency": "daily",
        "preferred_times": ["09:00-10:00", "20:00-21:00"],
        "device_preference": "mobile",
        "average_session_length": 8.5,
        "follow_up_tendency": 0.65,
        "common_question_types": [
            "spending_analysis",
            "account_balances",
            "budget_status"
        ]
    },

    "personalization_hints": {
        "likely_followup_questions": [
            "How can I save more?",
            "What's my spending trend?",
            "Am I on track for my goals?"
        ],
        "recommended_insights": [
            "monthly_savings_trend",
            "category_spending_comparison",
            "goal_progress_update"
        ],
        "interaction_preferences": {
            "prefers_examples": true,
            "likes_comparisons": true,
            "wants_actionable_steps": true
        }
    },

    "data_freshness": {
        "profile_pack_age_minutes": 5,
        "last_plaid_sync_hours": 2,
        "last_calculation_minutes": 0
    }
}
```

## Performance Optimization Strategies

### 1. Caching Architecture

```python
class ProfilePackCache:
    def __init__(self):
        self.cache = {}
        self.cache_expiry = {}
        self.hit_count = 0
        self.miss_count = 0

    def get(self, key: str) -> Optional[Dict]:
        if self._is_valid(key):
            self.hit_count += 1
            return self.cache[key]
        self.miss_count += 1
        return None

    def set(self, key: str, value: Dict, ttl_seconds: int = 900):
        self.cache[key] = value
        self.cache_expiry[key] = time.time() + ttl_seconds
```

### 2. Parallel Data Loading

```python
async def load_profile_components_parallel(user_id: str):
    tasks = [
        load_accounts(user_id),
        load_holdings(user_id),
        load_goals(user_id),
        load_budgets(user_id),
        load_recurring_income(user_id)
    ]

    results = await asyncio.gather(*tasks, return_exceptions=True)

    return {
        'accounts': results[0] if not isinstance(results[0], Exception) else [],
        'holdings': results[1] if not isinstance(results[1], Exception) else [],
        'goals': results[2] if not isinstance(results[2], Exception) else [],
        'budgets': results[3] if not isinstance(results[3], Exception) else [],
        'recurring_income': results[4] if not isinstance(results[4], Exception) else []
    }
```

### 3. Incremental Loading

```python
def load_profile_incremental(user_id: str, components_needed: List[str]):
    """Load only required components based on intent"""
    profile = {}

    # Always load core
    profile['user_core'] = load_user_core(user_id)

    # Load requested components
    for component in components_needed:
        if component == 'accounts':
            profile['accounts'] = load_accounts(user_id)
        elif component == 'holdings':
            profile['holdings'] = load_holdings(user_id)
        # ... etc

    return profile
```

### 4. Query Optimization

```sql
-- Use CTEs for complex aggregations
WITH account_summary AS (
    SELECT
        user_id,
        COUNT(*) as account_count,
        SUM(CASE WHEN balance > 0 THEN balance ELSE 0 END) as total_assets,
        SUM(CASE WHEN balance < 0 THEN ABS(balance) ELSE 0 END) as total_debt
    FROM accounts
    WHERE user_id = $1 AND is_active = true
    GROUP BY user_id
),
transaction_summary AS (
    SELECT
        user_id,
        AVG(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as avg_expense,
        SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as total_income
    FROM transactions
    WHERE user_id = $1
        AND date >= CURRENT_DATE - INTERVAL '3 months'
    GROUP BY user_id
)
SELECT * FROM account_summary
JOIN transaction_summary USING (user_id);
```

## Error Handling

### Graceful Degradation

```python
def build_profile_with_fallbacks(user_id: str) -> Dict:
    profile = {'user_id': user_id}

    # Core data (required)
    try:
        profile['user_core'] = load_user_core(user_id)
    except Exception as e:
        logger.error(f"Failed to load user core: {e}")
        return {'error': 'User not found'}

    # Optional components with fallbacks
    try:
        profile['accounts'] = load_accounts(user_id)
    except Exception as e:
        logger.warning(f"Failed to load accounts: {e}")
        profile['accounts'] = []
        profile['_warnings'] = profile.get('_warnings', [])
        profile['_warnings'].append('Account data unavailable')

    # Continue for other components...
    return profile
```

### Data Validation

```python
def validate_profile_pack(profile: Dict) -> Tuple[bool, List[str]]:
    """Validate profile pack completeness and quality"""
    issues = []

    # Check required fields
    if 'user_core' not in profile:
        issues.append("Missing user core data")

    # Check data freshness
    if 'accounts' in profile:
        for account in profile['accounts']:
            days_old = (datetime.now() - account['updated_at']).days
            if days_old > 7:
                issues.append(f"Account {account['name']} data is {days_old} days old")

    # Check data consistency
    if 'derived_metrics' in profile:
        recalc_net_worth = calculate_net_worth(profile)
        if abs(recalc_net_worth - profile['derived_metrics']['net_worth']) > 100:
            issues.append("Net worth calculation inconsistency detected")

    return len(issues) == 0, issues
```

## Monitoring & Metrics

### Key Performance Indicators

```python
PROFILE_METRICS = {
    'build_duration_ms': Histogram,
    'cache_hit_rate': Gauge,
    'component_load_time': Histogram,
    'data_freshness_hours': Histogram,
    'profile_size_bytes': Histogram,
    'validation_failures': Counter
}
```

### Logging

```python
logger.info(
    "Profile pack built",
    extra={
        'user_id': user_id,
        'intent': intent,
        'components_loaded': list(profile.keys()),
        'cache_hit': cache_hit,
        'build_time_ms': build_time,
        'profile_size': len(json.dumps(profile))
    }
)
```

---

**Next Document**: [05_PROMPT_ENGINEERING.md](./05_PROMPT_ENGINEERING.md) - Complete prompt engineering and LLM interaction system