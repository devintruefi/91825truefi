# TrueFi Database Schema Audit

## Executive Summary
Comprehensive analysis of the TrueFi PostgreSQL database schema for personal finance management.
Generated: 2025-01-20

## 1. Core Tables Overview

### User Tables
- **users**: Core user identity and auth
- **user_demographics**: Age, income, marital status
- **user_preferences**: Theme, notifications, timezone
- **user_identity**: Full name, address, contact info
- **tax_profile**: Federal/state rates, filing status

### Financial Tables
- **accounts**: Bank/investment accounts via Plaid
- **transactions**: Transaction history with categories
- **budgets**: Monthly/periodic spending plans
- **budget_categories**: Category allocations within budgets
- **budget_spending**: Actual spend tracking per category
- **goals**: Financial goals with targets

### Investment Tables
- **holdings**: Historical positions
- **holdings_current**: Current investment positions
- **securities**: Security master data

### Manual Entry Tables
- **manual_assets**: Non-Plaid assets (home, car)
- **manual_liabilities**: Non-Plaid debts (mortgage, loans)
- **recurring_income**: Income streams

### Integration Tables
- **plaid_connections**: Plaid API connections
- **institutions**: Financial institution metadata
- **transaction_categories**: Category taxonomy

### Chat/AI Tables
- **chat_sessions**: Conversation sessions
- **chat_messages**: Message history

## 2. Detailed Schema Analysis

### 2.1 users Table
```sql
PRIMARY KEY: id (uuid)
UNIQUE: email
NOT NULL: id, email, first_name, last_name, password_hash, is_active, is_advisor, created_at, updated_at
DEFAULTS:
  - default_checking_buffer: 2000.00
  - auto_allocation_enabled: true
  - allocation_refresh_frequency: 'daily'
  - currency_preference: 'USD'
  - country_code: 'US'
```

### 2.2 accounts Table
```sql
PRIMARY KEY: id (uuid)
FOREIGN KEYS:
  - user_id → users.id
  - plaid_connection_id → plaid_connections.id
  - institution_id → institutions.id
NOT NULL: id, user_id, plaid_account_id, name, type
NULLABLE ISSUES:
  - available_balance (critical for cash flow)
  - updated_at (freshness tracking)
  - balances_last_updated (stale detection)
```

### 2.3 transactions Table
```sql
PRIMARY KEY: id (uuid)
FOREIGN KEYS:
  - user_id → users.id
  - account_id → accounts.id
  - category_uuid → transaction_categories.id
NOT NULL: id, user_id, account_id, plaid_transaction_id, amount, currency_code, date, name, pending, created_at
NULLABLE ISSUES:
  - posted_datetime (needed for accurate timing)
  - merchant_name (UX/categorization)
  - category (spend analysis)
CONVENTIONS:
  - Expenses: POSITIVE amounts
  - Income: NEGATIVE amounts (Plaid convention)
```

### 2.4 budgets & budget_categories Tables
```sql
budgets:
  PRIMARY KEY: id (uuid)
  FOREIGN KEY: user_id → users.id
  NOT NULL: id, user_id, name, amount, start_date

budget_categories:
  PRIMARY KEY: id (uuid)
  FOREIGN KEY: budget_id → budgets.id
  NOT NULL: id, budget_id, category, amount

INTEGRITY: Sum(budget_categories.amount) should = budgets.amount
```

### 2.5 goals Table
```sql
PRIMARY KEY: id (uuid)
FOREIGN KEY: user_id → users.id
NOT NULL: id, user_id, name, target_amount
DEFAULTS:
  - allocation_method: 'auto'
  - checking_buffer_amount: 2000.00
  - allocation_priority: 5
```

### 2.6 holdings_current Table
```sql
PRIMARY KEY: id (uuid)
FOREIGN KEYS:
  - account_id → accounts.id
  - security_id → securities.id
NOT NULL: id, account_id, security_id, quantity, as_of_date
NOTE: No direct user_id; must join through accounts
```

### 2.7 tax_profile Table
```sql
PRIMARY KEY: user_id (uuid)
FOREIGN KEY: user_id → users.id
NULLABLE ISSUES:
  - federal_rate (breaks tax calculations)
  - state_rate (breaks tax calculations)
  - state (needed for state tax)
  - filing_status (tax bracket determination)
```

### 2.8 user_demographics Table
```sql
PRIMARY KEY: user_id (uuid)
FOREIGN KEY: user_id → users.id
NULLABLE ISSUES:
  - age (segmentation/advice)
  - household_income (critical for modeling)
DEFAULTS:
  - created_at: CURRENT_TIMESTAMP
  - updated_at: CURRENT_TIMESTAMP
```

## 3. Foreign Key Relationship Map

```
users (id)
├─> user_demographics (user_id)
├─> user_preferences (user_id)
├─> user_identity (user_id)
├─> tax_profile (user_id)
├─> accounts (user_id)
│   ├─> transactions (account_id)
│   │   └─> transaction_categories (category_uuid)
│   ├─> holdings (account_id)
│   │   └─> securities (security_id)
│   └─> holdings_current (account_id)
│       └─> securities (security_id)
├─> budgets (user_id)
│   └─> budget_categories (budget_id)
│       └─> budget_spending (category_id)
├─> goals (user_id)
├─> recurring_income (user_id)
├─> manual_assets (user_id)
├─> manual_liabilities (user_id)
├─> plaid_connections (user_id)
│   └─> accounts (plaid_connection_id)
└─> chat_sessions (user_id)
    └─> chat_messages (session_id)
```

## 4. Critical Read Paths

### 4.1 Dashboard Net Worth Calculation
```sql
-- Path: users → accounts → manual_assets → manual_liabilities
SELECT
  COALESCE(SUM(CASE WHEN a.type IN ('depository','investment') THEN a.balance END), 0) +
  COALESCE((SELECT SUM(value) FROM manual_assets WHERE user_id = u.id), 0) -
  COALESCE(SUM(CASE WHEN a.type = 'loan' THEN a.balance END), 0) -
  COALESCE((SELECT SUM(balance) FROM manual_liabilities WHERE user_id = u.id), 0) as net_worth
FROM users u
LEFT JOIN accounts a ON u.id = a.user_id
WHERE u.id = :user_id
GROUP BY u.id;
```

### 4.2 Monthly Cash Flow Analysis
```sql
-- Path: users → accounts → transactions
SELECT
  DATE_TRUNC('month', COALESCE(t.posted_datetime, t.date)) as month,
  SUM(CASE WHEN t.amount < 0 THEN -t.amount END) as income,
  SUM(CASE WHEN t.amount > 0 THEN t.amount END) as expenses
FROM transactions t
JOIN accounts a ON t.account_id = a.id
WHERE a.user_id = :user_id
  AND t.pending = false
GROUP BY 1;
```

### 4.3 Budget vs Actual Spending
```sql
-- Path: budgets → budget_categories → transactions (via category matching)
SELECT
  bc.category,
  bc.amount as budgeted,
  COALESCE(SUM(t.amount), 0) as actual
FROM budget_categories bc
JOIN budgets b ON bc.budget_id = b.id
LEFT JOIN transactions t ON
  t.user_id = b.user_id
  AND t.category = bc.category
  AND DATE_TRUNC('month', t.date) = DATE_TRUNC('month', CURRENT_DATE)
  AND t.pending = false
WHERE b.user_id = :user_id
  AND b.is_active = true
GROUP BY bc.id, bc.category, bc.amount;
```

### 4.4 Investment Portfolio Composition
```sql
-- Path: accounts → holdings_current → securities
SELECT
  s.ticker,
  s.name,
  hc.quantity,
  hc.market_value,
  hc.cost_basis_total,
  (hc.market_value - hc.cost_basis_total) as gain_loss
FROM holdings_current hc
JOIN accounts a ON hc.account_id = a.id
JOIN securities s ON hc.security_id = s.id
WHERE a.user_id = :user_id
  AND a.type = 'investment';
```

## 5. Data Integrity Constraints

### Missing But Critical Constraints
1. **CHECK constraint**: budgets.amount > 0
2. **CHECK constraint**: goals.target_amount > 0
3. **CHECK constraint**: transactions.amount != 0
4. **CHECK constraint**: tax_profile.federal_rate BETWEEN 0 AND 1
5. **CHECK constraint**: tax_profile.state_rate BETWEEN 0 AND 1
6. **CHECK constraint**: user_demographics.age BETWEEN 18 AND 120
7. **UNIQUE constraint**: plaid_connections(plaid_item_id)
8. **UNIQUE constraint**: securities(ticker) or securities(cusip)

### Referential Integrity Gaps
1. transactions.account_id should CASCADE on DELETE
2. budget_categories.budget_id should CASCADE on DELETE
3. holdings_current.account_id should CASCADE on DELETE

## 6. Performance Considerations

### Missing Indexes (Recommended)
```sql
-- High-frequency query paths
CREATE INDEX idx_transactions_user_date ON transactions(user_id, date DESC) WHERE pending = false;
CREATE INDEX idx_transactions_account_date ON transactions(account_id, date DESC);
CREATE INDEX idx_transactions_posted ON transactions(posted_datetime DESC) WHERE posted_datetime IS NOT NULL;
CREATE INDEX idx_accounts_user_active ON accounts(user_id) WHERE is_active = true;
CREATE INDEX idx_budgets_user_active ON budgets(user_id) WHERE is_active = true;
CREATE INDEX idx_holdings_current_account ON holdings_current(account_id);
CREATE INDEX idx_budget_categories_budget ON budget_categories(budget_id);
```

## 7. Data Quality Risk Assessment

### HIGH RISK (Breaks Core Functionality)
- **user_demographics.age**: NULL → modeling failures
- **user_demographics.household_income**: NULL → advice engine failures
- **tax_profile.federal_rate**: NULL → tax calculation errors
- **tax_profile.state_rate**: NULL → tax calculation errors
- **accounts.available_balance**: NULL → cash flow analysis broken
- **transactions.posted_datetime**: NULL → timing analysis degraded

### MEDIUM RISK (Degrades UX)
- **transactions.merchant_name**: NULL → poor categorization
- **transactions.category**: NULL → budget tracking fails
- **accounts.updated_at**: NULL → freshness unknown
- **goals.target_date**: NULL → timeline planning broken

### LOW RISK (Minor Issues)
- **accounts.mask**: NULL → display issues
- **securities.ticker**: NULL → display issues
- **user_preferences**: Missing row → defaults used

## 8. Application-Specific Conventions

### Transaction Amount Signs (Plaid Convention)
- **Expenses/Outflows**: POSITIVE amounts
- **Income/Inflows**: NEGATIVE amounts
- **Internal Transfers**: Paired positive/negative

### Account Type Hierarchy
```
depository
├── checking (primary transaction account)
├── savings (emergency fund, short-term goals)
└── cash management

investment
├── brokerage (taxable)
├── 401k
├── ira
└── manual

credit (credit cards)
loan (mortgages, auto, student)
```

### Category Taxonomy
Primary categories used in budgets and transactions:
- Income
- Housing / Bills and Utilities
- Food / Groceries / Food and Drink
- Transportation / Travel
- Shopping / Shops
- Entertainment / Recreation
- Healthcare / Medical
- Insurance / Financial
- Transfer (internal movements)

## 9. Data Freshness Requirements

### Real-time (< 1 hour)
- accounts.balance
- accounts.available_balance
- transactions (pending = true)

### Daily Updates
- transactions (pending = false)
- holdings_current
- goals.current_amount

### Weekly Updates
- budget_spending aggregations
- user_demographics

### Monthly Updates
- tax_profile (annual, but checked monthly)
- recurring_income

## 10. Recommendations Summary

### Critical Fixes Needed
1. Add NOT NULL constraints to demographic/tax fields
2. Ensure posted_datetime is populated for all transactions
3. Add CHECK constraints for valid ranges
4. Create missing indexes for performance

### Schema Enhancements
1. Add transaction_enriched view with COALESCE logic
2. Add budget_performance view for variance analysis
3. Add cash_flow_monthly materialized view
4. Consider partitioning transactions by year

### Data Governance
1. Implement fixture tagging for test data
2. Add audit columns (created_by, updated_by)
3. Version control for category taxonomy
4. Backup strategy for manual entries