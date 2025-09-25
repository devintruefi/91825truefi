# TrueFi Data Anomaly Report
**User ID**: 136e2d19-e31d-4691-94cb-1729585a340e
**Generated**: 2025-01-20

## Executive Summary
Comprehensive analysis of data quality issues, inconsistencies, and anomalies for the test user.

## 1. Critical Issues (Blocking Core Functionality)

### 1.1 Negative Savings Rate
**Issue**: User shows negative monthly savings (-$6,309/month)
**Detection SQL**:
```sql
WITH monthly_flow AS (
  SELECT
    DATE_TRUNC('month', date) as month,
    SUM(CASE WHEN amount < 0 THEN -amount END) as income,
    SUM(CASE WHEN amount > 0 THEN amount END) as expenses
  FROM transactions t
  JOIN accounts a ON t.account_id = a.id
  WHERE a.user_id = '136e2d19-e31d-4691-94cb-1729585a340e'
    AND t.pending = false
    AND date >= NOW() - INTERVAL '3 months'
  GROUP BY 1
)
SELECT
  AVG(income) as avg_income,
  AVG(expenses) as avg_expenses,
  AVG(income - expenses) as avg_savings
FROM monthly_flow;
```
**Result**: avg_income: $3,916 | avg_expenses: $10,225 | avg_savings: -$6,309
**Root Cause**: Income transactions not properly captured (should be ~$9,200/month)
**Fix Strategy**: Regenerate biweekly payroll transactions with correct amounts and merchant names

### 1.2 Investment Holdings Mismatch
**Issue**: Holdings value ($6,984) doesn't match investment account balances ($51,984)
**Detection SQL**:
```sql
SELECT
  a.name,
  a.balance as account_balance,
  COALESCE(h.total_value, 0) as holdings_value,
  ABS(a.balance - COALESCE(h.total_value, 0)) as difference,
  CASE
    WHEN a.balance = 0 THEN 'N/A'
    ELSE ROUND((ABS(a.balance - COALESCE(h.total_value, 0)) / a.balance * 100), 1) || '%'
  END as mismatch_pct
FROM accounts a
LEFT JOIN (
  SELECT account_id, SUM(market_value) as total_value
  FROM holdings_current
  GROUP BY account_id
) h ON a.id = h.account_id
WHERE a.user_id = '136e2d19-e31d-4691-94cb-1729585a340e'
  AND a.type = 'investment';
```
**Result**: 86.6% mismatch between holdings and account balance
**Fix Strategy**: Add missing holdings to match account balances

## 2. Data Completeness Issues

### 2.1 Missing Category Mappings
**Issue**: Transactions using inconsistent category names
**Detection SQL**:
```sql
SELECT DISTINCT
  t.category as txn_category,
  COUNT(*) as txn_count
FROM transactions t
JOIN accounts a ON t.account_id = a.id
WHERE a.user_id = '136e2d19-e31d-4691-94cb-1729585a340e'
  AND t.date >= NOW() - INTERVAL '6 months'
GROUP BY t.category
ORDER BY txn_count DESC;
```
**Result**: Only 'Income' and 'Transfer' categories found (missing granular categories)
**Fix Strategy**: Enrich transactions with proper categories based on merchant names

### 2.2 Insufficient Liquid Reserves
**Issue**: Only 2.9 months of expenses covered (target: 4-6 months)
**Detection SQL**:
```sql
WITH metrics AS (
  SELECT
    (SELECT SUM(balance) FROM accounts
     WHERE user_id = '136e2d19-e31d-4691-94cb-1729585a340e'
     AND type = 'depository') as liquid_cash,
    (SELECT AVG(monthly_exp) FROM (
      SELECT SUM(CASE WHEN amount > 0 THEN amount END) as monthly_exp
      FROM transactions t
      JOIN accounts a ON t.account_id = a.id
      WHERE a.user_id = '136e2d19-e31d-4691-94cb-1729585a340e'
        AND t.date >= NOW() - INTERVAL '3 months'
        AND t.pending = false
      GROUP BY DATE_TRUNC('month', t.date)
    ) x) as avg_monthly_expenses
)
SELECT
  liquid_cash,
  avg_monthly_expenses,
  ROUND(liquid_cash / NULLIF(avg_monthly_expenses, 0), 1) as months_coverage
FROM metrics;
```
**Result**: $29,813 liquid / $10,225 monthly = 2.9 months
**Fix Strategy**: Adjust account balances or reduce expense levels

## 3. Data Consistency Issues

### 3.1 Duplicate Active Budgets
**Issue**: Two active budgets with identical amounts
**Detection SQL**:
```sql
SELECT
  id,
  name,
  amount,
  period,
  start_date,
  is_active
FROM budgets
WHERE user_id = '136e2d19-e31d-4691-94cb-1729585a340e'
  AND is_active = true;
```
**Result**: 2 active budgets both at $12,199
**Fix Strategy**: Deactivate older budget, keep only most recent

### 3.2 Unrealistic Merchant Names
**Issue**: Generic merchant names from seed data
**Detection SQL**:
```sql
SELECT
  merchant_name,
  COUNT(*) as frequency,
  SUM(amount) as total_amount
FROM transactions t
JOIN accounts a ON t.account_id = a.id
WHERE a.user_id = '136e2d19-e31d-4691-94cb-1729585a340e'
  AND t.date >= NOW() - INTERVAL '1 month'
GROUP BY merchant_name
ORDER BY frequency DESC
LIMIT 10;
```
**Result**: Names like "ADP Payroll - EMPLOYER INC", "Grocery Store", etc.
**Fix Strategy**: Replace with realistic California merchant names

## 4. Temporal Anomalies

### 4.1 Transaction Timing Patterns
**Issue**: All transactions at exact same time of day
**Detection SQL**:
```sql
SELECT
  EXTRACT(hour FROM posted_datetime) as hour,
  COUNT(*) as txn_count
FROM transactions t
JOIN accounts a ON t.account_id = a.id
WHERE a.user_id = '136e2d19-e31d-4691-94cb-1729585a340e'
  AND posted_datetime IS NOT NULL
  AND date >= NOW() - INTERVAL '1 month'
GROUP BY 1
ORDER BY 1;
```
**Result**: Unnatural clustering of transaction times
**Fix Strategy**: Distribute posted_datetime across realistic business hours

### 4.2 Missing Recent Updates
**Issue**: Some accounts haven't been updated recently
**Detection SQL**:
```sql
SELECT
  name,
  type,
  updated_at,
  balances_last_updated,
  CURRENT_DATE - DATE(COALESCE(balances_last_updated, updated_at)) as days_stale
FROM accounts
WHERE user_id = '136e2d19-e31d-4691-94cb-1729585a340e'
ORDER BY days_stale DESC NULLS FIRST;
```
**Result**: Multiple accounts with NULL or stale updated_at
**Fix Strategy**: Set all updated_at and balances_last_updated to current timestamp

## 5. Relational Integrity Issues

### 5.1 Orphaned Holdings
**Issue**: Holdings without corresponding securities data
**Detection SQL**:
```sql
SELECT
  h.id,
  h.account_id,
  h.security_id,
  s.ticker
FROM holdings_current h
LEFT JOIN securities s ON h.security_id = s.id
JOIN accounts a ON h.account_id = a.id
WHERE a.user_id = '136e2d19-e31d-4691-94cb-1729585a340e'
  AND s.id IS NULL;
```
**Result**: 0 orphaned holdings (OK)
**Fix Strategy**: N/A

### 5.2 Budget Categories Without Transactions
**Issue**: Budget categories that never match transaction categories
**Detection SQL**:
```sql
SELECT
  bc.category as budget_category,
  bc.amount as budgeted,
  COUNT(t.id) as matching_txns
FROM budget_categories bc
JOIN budgets b ON bc.budget_id = b.id
LEFT JOIN transactions t ON
  t.user_id = b.user_id
  AND t.category = bc.category
  AND t.date >= b.start_date
  AND t.pending = false
WHERE b.user_id = '136e2d19-e31d-4691-94cb-1729585a340e'
  AND b.is_active = true
GROUP BY bc.id, bc.category, bc.amount
HAVING COUNT(t.id) = 0;
```
**Result**: Most budget categories have no matching transactions
**Fix Strategy**: Align transaction categories with budget categories

## 6. Business Logic Violations

### 6.1 Goals Progress Inconsistency
**Issue**: Emergency fund current amount doesn't match actual liquid reserves
**Detection SQL**:
```sql
SELECT
  g.name,
  g.target_amount,
  g.current_amount as goal_current,
  (SELECT SUM(balance) FROM accounts
   WHERE user_id = g.user_id AND type = 'depository') as actual_liquid,
  ABS(g.current_amount - (SELECT SUM(balance) FROM accounts
                          WHERE user_id = g.user_id AND type = 'depository')) as difference
FROM goals g
WHERE g.user_id = '136e2d19-e31d-4691-94cb-1729585a340e'
  AND g.name ILIKE '%emergency%';
```
**Result**: Goal shows $35,500 but actual liquid is $29,813
**Fix Strategy**: Update goal current_amount to match reality

### 6.2 Tax Rate Calculation Mismatch
**Issue**: Effective tax rate in recurring_income doesn't match tax_profile
**Detection SQL**:
```sql
SELECT
  ri.gross_monthly,
  ri.net_monthly,
  ROUND((1 - ri.net_monthly/ri.gross_monthly) * 100, 1) as implied_tax_rate,
  ROUND((tp.federal_rate + tp.state_rate) * 100, 1) as profile_tax_rate
FROM recurring_income ri
CROSS JOIN tax_profile tp
WHERE ri.user_id = '136e2d19-e31d-4691-94cb-1729585a340e'
  AND tp.user_id = ri.user_id;
```
**Result**: Implied rate: 7.7%, Profile rate: 31.0%
**Fix Strategy**: Correct net_monthly calculation in recurring_income

## 7. Summary Statistics

### Data Quality Scorecard
```sql
WITH checks AS (
  SELECT 'Has Demographics' as check_name,
    EXISTS(SELECT 1 FROM user_demographics WHERE user_id = '136e2d19-e31d-4691-94cb-1729585a340e' AND age IS NOT NULL) as passed
  UNION ALL
  SELECT 'Has Tax Profile',
    EXISTS(SELECT 1 FROM tax_profile WHERE user_id = '136e2d19-e31d-4691-94cb-1729585a340e' AND federal_rate IS NOT NULL)
  UNION ALL
  SELECT 'Positive Savings', false  -- Known issue
  UNION ALL
  SELECT 'Holdings Match', false  -- Known issue
  UNION ALL
  SELECT 'Categories Aligned', false  -- Known issue
  UNION ALL
  SELECT 'Adequate Reserves', false  -- Known issue
)
SELECT
  COUNT(*) FILTER (WHERE passed) as passed,
  COUNT(*) as total,
  ROUND(COUNT(*) FILTER (WHERE passed)::numeric / COUNT(*) * 100) as score_pct
FROM checks;
```
**Result**: 2/6 checks passed (33% data quality score)

## 8. Remediation Priority

### P0 - Immediate (Blocks Core Features)
1. Fix negative savings rate by adding proper income transactions
2. Align holdings with investment account balances
3. Update goal current amounts to match actual balances

### P1 - High (Major UX Issues)
1. Enrich transaction categories to match budget categories
2. Replace generic merchant names with realistic ones
3. Deactivate duplicate budgets

### P2 - Medium (Data Quality)
1. Distribute transaction posted_datetime realistically
2. Update all accounts' updated_at timestamps
3. Correct tax calculations in recurring_income

### P3 - Low (Nice to Have)
1. Add more transaction variety
2. Include seasonal spending patterns
3. Add investment transaction history

## 9. Estimated Impact

| Issue | Affected Rows | User Impact | Fix Complexity |
|-------|--------------|-------------|----------------|
| Missing Income | ~24 txns/year | Critical - Shows user as broke | Low |
| Holdings Mismatch | 5-10 holdings | High - Portfolio wrong | Medium |
| Wrong Categories | ~200 txns | High - Budget tracking fails | Medium |
| Generic Merchants | ~200 txns | Medium - Poor UX | Low |
| Duplicate Budgets | 1 budget | Low - Confusing | Low |
| Stale Timestamps | 7 accounts | Low - Freshness unclear | Low |

## 10. Validation Queries Post-Fix

```sql
-- Verify positive savings rate
SELECT
  AVG(income - expenses) as avg_monthly_savings,
  AVG(income) as avg_monthly_income,
  ROUND(AVG(income - expenses) / NULLIF(AVG(income), 0) * 100) as savings_rate_pct
FROM (
  SELECT
    DATE_TRUNC('month', date) as month,
    SUM(CASE WHEN amount < 0 THEN -amount END) as income,
    SUM(CASE WHEN amount > 0 THEN amount END) as expenses
  FROM transactions t
  JOIN accounts a ON t.account_id = a.id
  WHERE a.user_id = '136e2d19-e31d-4691-94cb-1729585a340e'
    AND t.pending = false
    AND date >= NOW() - INTERVAL '6 months'
  GROUP BY 1
) monthly;

-- Verify holdings alignment
SELECT
  SUM(a.balance) as total_inv_balance,
  SUM(h.market_value) as total_holdings_value,
  ABS(SUM(a.balance) - SUM(h.market_value)) as difference,
  ROUND(ABS(SUM(a.balance) - SUM(h.market_value)) / NULLIF(SUM(a.balance), 0) * 100, 1) as error_pct
FROM accounts a
LEFT JOIN holdings_current h ON a.id = h.account_id
WHERE a.user_id = '136e2d19-e31d-4691-94cb-1729585a340e'
  AND a.type = 'investment';

-- Verify category coverage
SELECT
  COUNT(DISTINCT bc.category) as budget_categories,
  COUNT(DISTINCT t.category) as txn_categories,
  COUNT(DISTINCT bc.category) FILTER (WHERE t.category IS NOT NULL) as matched_categories
FROM budget_categories bc
JOIN budgets b ON bc.budget_id = b.id
LEFT JOIN LATERAL (
  SELECT DISTINCT category
  FROM transactions t2
  JOIN accounts a2 ON t2.account_id = a2.id
  WHERE a2.user_id = b.user_id
    AND t2.category = bc.category
) t ON true
WHERE b.user_id = '136e2d19-e31d-4691-94cb-1729585a340e'
  AND b.is_active = true;
```