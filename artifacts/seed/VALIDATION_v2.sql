-- VALIDATION_v2.sql
-- Comprehensive validation and assertion checks for seeded data
-- Usage: psql -f VALIDATION_v2.sql -v user_id="'136e2d19-e31d-4691-94cb-1729585a340e'"

\set user_id '''136e2d19-e31d-4691-94cb-1729585a340e'''
\set ON_ERROR_STOP on

-- Set output formatting
\pset border 2
\pset format aligned
\timing on

\echo ''
\echo '================================================'
\echo 'TrueFi Data Validation Suite v2'
\echo 'User: ' :user_id
\echo 'Started:' `date`
\echo '================================================'
\echo ''

-- =========================================
-- ASSERTION 1: No Orphan Transactions
-- =========================================
\echo 'ASSERTION 1: No orphan transactions'

WITH orphan_check AS (
    SELECT
        t.id,
        t.account_id,
        a.user_id as account_user_id
    FROM transactions t
    LEFT JOIN accounts a ON t.account_id = a.id
    WHERE t.user_id = :user_id::UUID
)
SELECT
    CASE
        WHEN COUNT(*) FILTER (WHERE account_user_id IS NULL) = 0
        THEN '✓ PASS: All transactions have valid account_id'
        ELSE '✗ FAIL: ' || COUNT(*) FILTER (WHERE account_user_id IS NULL) || ' orphaned transactions found'
    END as result,
    COUNT(*) as total_transactions,
    COUNT(*) FILTER (WHERE account_user_id IS NOT NULL) as valid_transactions
FROM orphan_check;

-- =========================================
-- ASSERTION 2: Transaction Data Quality
-- =========================================
\echo ''
\echo 'ASSERTION 2: Transaction data quality'

SELECT
    COUNT(*) as total_txns,
    COUNT(*) FILTER (WHERE pending = false) as settled_txns,
    COUNT(*) FILTER (WHERE posted_datetime IS NOT NULL) as has_posted_time,
    COUNT(*) FILTER (WHERE currency_code = 'USD') as usd_currency,
    COUNT(*) FILTER (WHERE merchant_name IS NOT NULL) as has_merchant,
    CASE
        WHEN COUNT(*) = COUNT(*) FILTER (WHERE pending = false AND posted_datetime IS NOT NULL AND currency_code = 'USD')
        THEN '✓ PASS: All transactions properly formatted'
        ELSE '✗ FAIL: ' || (COUNT(*) - COUNT(*) FILTER (WHERE pending = false AND posted_datetime IS NOT NULL AND currency_code = 'USD')) || ' transactions have issues'
    END as result
FROM transactions t
JOIN accounts a ON t.account_id = a.id
WHERE a.user_id = :user_id::UUID
  AND t.date >= CURRENT_DATE - INTERVAL '12 months';

-- =========================================
-- ASSERTION 3: Budget Integrity
-- =========================================
\echo ''
\echo 'ASSERTION 3: Budget categories sum equals total'

WITH budget_check AS (
    SELECT
        b.id,
        b.name,
        b.amount as budget_total,
        SUM(bc.amount) as categories_sum,
        COUNT(bc.id) as category_count,
        ABS(b.amount - SUM(bc.amount)) as difference
    FROM budgets b
    LEFT JOIN budget_categories bc ON b.id = bc.budget_id
    WHERE b.user_id = :user_id::UUID
      AND b.is_active = true
    GROUP BY b.id, b.name, b.amount
)
SELECT
    name as budget_name,
    TO_CHAR(budget_total, '$999,999.99') as total,
    TO_CHAR(categories_sum, '$999,999.99') as sum_of_categories,
    category_count,
    CASE
        WHEN difference < 0.01 THEN '✓ PASS: Budget balanced'
        ELSE '✗ FAIL: Difference of $' || TO_CHAR(difference, '999.99')
    END as result
FROM budget_check;

-- Categories breakdown
SELECT
    bc.category,
    TO_CHAR(bc.amount, '$999,999.99') as amount,
    TO_CHAR(bc.amount / b.amount * 100, '999.9%') as pct_of_budget
FROM budget_categories bc
JOIN budgets b ON bc.budget_id = b.id
WHERE b.user_id = :user_id::UUID
  AND b.is_active = true
ORDER BY bc.amount DESC;

-- =========================================
-- ASSERTION 4: Income Range Check
-- =========================================
\echo ''
\echo 'ASSERTION 4: Observed net monthly income in range [$9,000 - $9,800]'

WITH monthly_income AS (
    SELECT
        DATE_TRUNC('month', COALESCE(t.posted_datetime, t.date)) as month,
        SUM(CASE
            WHEN t.amount < 0 AND t.category != 'Transfer'
            THEN -t.amount
            ELSE 0
        END) as income
    FROM transactions t
    JOIN accounts a ON t.account_id = a.id
    WHERE a.user_id = :user_id::UUID
      AND t.pending = false
      AND t.date >= CURRENT_DATE - INTERVAL '6 months'
    GROUP BY 1
)
SELECT
    TO_CHAR(AVG(income), '$999,999') as avg_monthly_income,
    TO_CHAR(MIN(income), '$999,999') as min_monthly,
    TO_CHAR(MAX(income), '$999,999') as max_monthly,
    COUNT(*) as months_analyzed,
    CASE
        WHEN AVG(income) BETWEEN 9000 AND 9800
        THEN '✓ PASS: Income in target range'
        ELSE '✗ FAIL: Income ' || TO_CHAR(AVG(income), '$999,999') || ' outside [$9,000-$9,800]'
    END as result
FROM monthly_income;

-- =========================================
-- ASSERTION 5: Expense Range Check
-- =========================================
\echo ''
\echo 'ASSERTION 5: Monthly expenses in range [$6,800 - $7,600]'

WITH monthly_expenses AS (
    SELECT
        DATE_TRUNC('month', COALESCE(t.posted_datetime, t.date)) as month,
        SUM(CASE
            WHEN t.amount > 0 AND t.category != 'Transfer'
            THEN t.amount
            ELSE 0
        END) as expenses
    FROM transactions t
    JOIN accounts a ON t.account_id = a.id
    WHERE a.user_id = :user_id::UUID
      AND t.pending = false
      AND t.date >= CURRENT_DATE - INTERVAL '6 months'
    GROUP BY 1
)
SELECT
    TO_CHAR(AVG(expenses), '$999,999') as avg_monthly_expenses,
    TO_CHAR(MIN(expenses), '$999,999') as min_monthly,
    TO_CHAR(MAX(expenses), '$999,999') as max_monthly,
    COUNT(*) as months_analyzed,
    CASE
        WHEN AVG(expenses) BETWEEN 6800 AND 7600
        THEN '✓ PASS: Expenses in target range'
        ELSE '✗ FAIL: Expenses ' || TO_CHAR(AVG(expenses), '$999,999') || ' outside [$6,800-$7,600]'
    END as result
FROM monthly_expenses;

-- =========================================
-- ASSERTION 6: Savings Rate Check
-- =========================================
\echo ''
\echo 'ASSERTION 6: Savings rate > 10%'

WITH monthly_flow AS (
    SELECT
        DATE_TRUNC('month', COALESCE(t.posted_datetime, t.date)) as month,
        SUM(CASE WHEN t.amount < 0 AND t.category != 'Transfer' THEN -t.amount ELSE 0 END) as income,
        SUM(CASE WHEN t.amount > 0 AND t.category != 'Transfer' THEN t.amount ELSE 0 END) as expenses
    FROM transactions t
    JOIN accounts a ON t.account_id = a.id
    WHERE a.user_id = :user_id::UUID
      AND t.pending = false
      AND t.date >= CURRENT_DATE - INTERVAL '6 months'
    GROUP BY 1
)
SELECT
    TO_CHAR(AVG(income), '$999,999') as avg_income,
    TO_CHAR(AVG(expenses), '$999,999') as avg_expenses,
    TO_CHAR(AVG(income - expenses), '$999,999') as avg_savings,
    TO_CHAR(AVG(income - expenses) / NULLIF(AVG(income), 0) * 100, '999.9%') as savings_rate,
    CASE
        WHEN AVG(income - expenses) / NULLIF(AVG(income), 0) > 0.10
        THEN '✓ PASS: Savings rate healthy'
        ELSE '✗ FAIL: Savings rate below 10%'
    END as result
FROM monthly_flow;

-- =========================================
-- ASSERTION 7: Emergency Fund Coverage
-- =========================================
\echo ''
\echo 'ASSERTION 7: Liquid reserves between 4-6 months'

WITH reserves AS (
    SELECT
        (SELECT SUM(balance) FROM accounts WHERE user_id = :user_id::UUID AND type = 'depository') as liquid_cash,
        (SELECT AVG(expenses) FROM (
            SELECT SUM(CASE WHEN amount > 0 AND category != 'Transfer' THEN amount ELSE 0 END) as expenses
            FROM transactions t
            JOIN accounts a ON t.account_id = a.id
            WHERE a.user_id = :user_id::UUID
              AND t.pending = false
              AND t.date >= CURRENT_DATE - INTERVAL '6 months'
            GROUP BY DATE_TRUNC('month', t.date)
        ) x) as avg_monthly_expenses
)
SELECT
    TO_CHAR(liquid_cash, '$999,999') as liquid_reserves,
    TO_CHAR(avg_monthly_expenses, '$999,999') as monthly_expenses,
    TO_CHAR(liquid_cash / NULLIF(avg_monthly_expenses, 0), '999.9') as months_coverage,
    CASE
        WHEN liquid_cash / NULLIF(avg_monthly_expenses, 0) BETWEEN 4 AND 6
        THEN '✓ PASS: Adequate emergency fund'
        WHEN liquid_cash / NULLIF(avg_monthly_expenses, 0) < 4
        THEN '✗ FAIL: Only ' || TO_CHAR(liquid_cash / NULLIF(avg_monthly_expenses, 0), '9.9') || ' months (need 4-6)'
        ELSE '⚠ WARN: ' || TO_CHAR(liquid_cash / NULLIF(avg_monthly_expenses, 0), '9.9') || ' months (excessive cash)'
    END as result
FROM reserves;

-- =========================================
-- ASSERTION 8: Investment Holdings Match
-- =========================================
\echo ''
\echo 'ASSERTION 8: Holdings sum within ±2% of investment balance'

WITH holdings_check AS (
    SELECT
        a.id,
        a.name as account_name,
        a.balance as account_balance,
        COALESCE(SUM(h.market_value), 0) as holdings_sum,
        ABS(a.balance - COALESCE(SUM(h.market_value), 0)) as difference,
        CASE
            WHEN a.balance = 0 THEN 0
            ELSE ABS(a.balance - COALESCE(SUM(h.market_value), 0)) / a.balance * 100
        END as error_pct
    FROM accounts a
    LEFT JOIN holdings_current h ON a.id = h.account_id
    WHERE a.user_id = :user_id::UUID
      AND a.type = 'investment'
    GROUP BY a.id, a.name, a.balance
)
SELECT
    account_name,
    TO_CHAR(account_balance, '$999,999.99') as account_bal,
    TO_CHAR(holdings_sum, '$999,999.99') as holdings_val,
    TO_CHAR(error_pct, '999.9%') as mismatch,
    CASE
        WHEN error_pct <= 2.0 OR account_balance = 0
        THEN '✓ PASS: Holdings aligned'
        ELSE '✗ FAIL: ' || TO_CHAR(error_pct, '999.9%') || ' mismatch'
    END as result
FROM holdings_check;

-- =========================================
-- ASSERTION 9: Account Freshness
-- =========================================
\echo ''
\echo 'ASSERTION 9: All accounts recently updated'

SELECT
    name,
    type || '/' || COALESCE(subtype, 'N/A') as account_type,
    DATE(updated_at) as last_updated,
    CURRENT_DATE - DATE(updated_at) as days_stale,
    CASE
        WHEN updated_at >= CURRENT_DATE - INTERVAL '7 days'
        THEN '✓ Fresh'
        WHEN updated_at >= CURRENT_DATE - INTERVAL '30 days'
        THEN '⚠ Stale'
        ELSE '✗ Very stale'
    END as status
FROM accounts
WHERE user_id = :user_id::UUID
ORDER BY days_stale DESC;

-- =========================================
-- ASSERTION 10: No Critical NULLs
-- =========================================
\echo ''
\echo 'ASSERTION 10: No critical NULL values'

WITH null_checks AS (
    SELECT 'user_demographics.age' as field,
           EXISTS(SELECT 1 FROM user_demographics WHERE user_id = :user_id::UUID AND age IS NULL) as has_null
    UNION ALL
    SELECT 'user_demographics.household_income',
           EXISTS(SELECT 1 FROM user_demographics WHERE user_id = :user_id::UUID AND household_income IS NULL)
    UNION ALL
    SELECT 'tax_profile.federal_rate',
           EXISTS(SELECT 1 FROM tax_profile WHERE user_id = :user_id::UUID AND federal_rate IS NULL)
    UNION ALL
    SELECT 'tax_profile.state_rate',
           EXISTS(SELECT 1 FROM tax_profile WHERE user_id = :user_id::UUID AND state_rate IS NULL)
    UNION ALL
    SELECT 'accounts.available_balance',
           EXISTS(SELECT 1 FROM accounts WHERE user_id = :user_id::UUID AND available_balance IS NULL)
)
SELECT
    field,
    CASE WHEN has_null THEN '✗ NULL' ELSE '✓ OK' END as status
FROM null_checks
ORDER BY has_null DESC, field;

SELECT
    CASE
        WHEN COUNT(*) FILTER (WHERE has_null) = 0
        THEN '✓ PASS: No critical NULLs found'
        ELSE '✗ FAIL: ' || COUNT(*) FILTER (WHERE has_null) || ' critical NULL fields'
    END as overall_result
FROM null_checks;

-- =========================================
-- SUMMARY: Key Performance Indicators
-- =========================================
\echo ''
\echo '================================================'
\echo 'KEY PERFORMANCE INDICATORS'
\echo '================================================'

WITH kpis AS (
    SELECT
        -- Demographics
        (SELECT age FROM user_demographics WHERE user_id = :user_id::UUID) as age,
        (SELECT household_income FROM user_demographics WHERE user_id = :user_id::UUID) as gross_income,

        -- Net Worth
        (SELECT SUM(balance) FROM accounts WHERE user_id = :user_id::UUID AND type IN ('depository', 'investment')) +
        COALESCE((SELECT SUM(value) FROM manual_assets WHERE user_id = :user_id::UUID), 0) -
        COALESCE((SELECT SUM(balance) FROM manual_liabilities WHERE user_id = :user_id::UUID), 0) as net_worth,

        -- Liquid Assets
        (SELECT SUM(balance) FROM accounts WHERE user_id = :user_id::UUID AND type = 'depository') as liquid_cash,
        (SELECT SUM(balance) FROM accounts WHERE user_id = :user_id::UUID AND type = 'investment') as investments,

        -- Cash Flow (6-month average)
        (SELECT AVG(income) FROM (
            SELECT SUM(CASE WHEN amount < 0 AND category != 'Transfer' THEN -amount ELSE 0 END) as income
            FROM transactions t
            JOIN accounts a ON t.account_id = a.id
            WHERE a.user_id = :user_id::UUID AND t.pending = false AND t.date >= CURRENT_DATE - INTERVAL '6 months'
            GROUP BY DATE_TRUNC('month', t.date)
        ) x) as avg_monthly_income,

        (SELECT AVG(expenses) FROM (
            SELECT SUM(CASE WHEN amount > 0 AND category != 'Transfer' THEN amount ELSE 0 END) as expenses
            FROM transactions t
            JOIN accounts a ON t.account_id = a.id
            WHERE a.user_id = :user_id::UUID AND t.pending = false AND t.date >= CURRENT_DATE - INTERVAL '6 months'
            GROUP BY DATE_TRUNC('month', t.date)
        ) x) as avg_monthly_expenses,

        -- Data Coverage
        (SELECT COUNT(DISTINCT DATE_TRUNC('month', date))
         FROM transactions t
         JOIN accounts a ON t.account_id = a.id
         WHERE a.user_id = :user_id::UUID) as months_of_data,

        (SELECT COUNT(*)
         FROM transactions t
         JOIN accounts a ON t.account_id = a.id
         WHERE a.user_id = :user_id::UUID
           AND t.date >= CURRENT_DATE - INTERVAL '30 days') as recent_txn_count
)
SELECT
    '👤 Age' as metric, age::TEXT as value
FROM kpis
UNION ALL
SELECT '💰 Gross Income', TO_CHAR(gross_income, '$999,999')
FROM kpis
UNION ALL
SELECT '📊 Net Worth', TO_CHAR(net_worth, '$999,999')
FROM kpis
UNION ALL
SELECT '💵 Liquid Cash', TO_CHAR(liquid_cash, '$999,999')
FROM kpis
UNION ALL
SELECT '📈 Investments', TO_CHAR(investments, '$999,999')
FROM kpis
UNION ALL
SELECT '⬇️  Monthly Income', TO_CHAR(avg_monthly_income, '$999,999')
FROM kpis
UNION ALL
SELECT '⬆️  Monthly Expenses', TO_CHAR(avg_monthly_expenses, '$999,999')
FROM kpis
UNION ALL
SELECT '💾 Savings Rate', TO_CHAR((avg_monthly_income - avg_monthly_expenses) / NULLIF(avg_monthly_income, 0) * 100, '999%')
FROM kpis
UNION ALL
SELECT '🛡️  Emergency Fund', TO_CHAR(liquid_cash / NULLIF(avg_monthly_expenses, 0), '9.9') || ' months'
FROM kpis
UNION ALL
SELECT '📅 Data Coverage', months_of_data || ' months'
FROM kpis
UNION ALL
SELECT '📝 Recent Transactions', recent_txn_count::TEXT || ' (last 30 days)'
FROM kpis;

-- =========================================
-- DATA READINESS MATRIX
-- =========================================
\echo ''
\echo '================================================'
\echo 'DATA READINESS MATRIX'
\echo '================================================'

WITH readiness AS (
    SELECT
        EXISTS(SELECT 1 FROM user_demographics WHERE user_id = :user_id::UUID AND age IS NOT NULL) as has_demographics,
        EXISTS(SELECT 1 FROM tax_profile WHERE user_id = :user_id::UUID AND federal_rate IS NOT NULL) as has_tax_profile,
        EXISTS(SELECT 1 FROM recurring_income WHERE user_id = :user_id::UUID) as has_income,
        EXISTS(SELECT 1 FROM budgets WHERE user_id = :user_id::UUID AND is_active = true) as has_budget,
        EXISTS(SELECT 1 FROM goals WHERE user_id = :user_id::UUID AND is_active = true) as has_goals,
        EXISTS(SELECT 1 FROM holdings_current h JOIN accounts a ON h.account_id = a.id WHERE a.user_id = :user_id::UUID) as has_investments,
        (SELECT COUNT(DISTINCT DATE_TRUNC('month', date)) FROM transactions t JOIN accounts a ON t.account_id = a.id WHERE a.user_id = :user_id::UUID) >= 6 as has_6mo_txns,
        (SELECT liquid_cash / NULLIF(avg_monthly_expenses, 0) FROM (
            SELECT
                (SELECT SUM(balance) FROM accounts WHERE user_id = :user_id::UUID AND type = 'depository') as liquid_cash,
                (SELECT AVG(expenses) FROM (
                    SELECT SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as expenses
                    FROM transactions t JOIN accounts a ON t.account_id = a.id
                    WHERE a.user_id = :user_id::UUID AND t.pending = false
                    GROUP BY DATE_TRUNC('month', t.date)
                ) x) as avg_monthly_expenses
        ) calc) BETWEEN 4 AND 6 as adequate_reserves,
        (SELECT (avg_income - avg_expenses) / NULLIF(avg_income, 0) FROM (
            SELECT
                AVG(income) as avg_income,
                AVG(expenses) as avg_expenses
            FROM (
                SELECT
                    SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END) as income,
                    SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as expenses
                FROM transactions t JOIN accounts a ON t.account_id = a.id
                WHERE a.user_id = :user_id::UUID AND t.pending = false
                GROUP BY DATE_TRUNC('month', t.date)
            ) x
        ) calc) > 0.10 as positive_savings
)
SELECT
    CASE WHEN has_demographics THEN '✓' ELSE '✗' END || ' Demographics' as component,
    CASE WHEN has_tax_profile THEN '✓' ELSE '✗' END || ' Tax Profile' as tax,
    CASE WHEN has_income THEN '✓' ELSE '✗' END || ' Income' as income,
    CASE WHEN has_budget THEN '✓' ELSE '✗' END || ' Budget' as budget,
    CASE WHEN has_goals THEN '✓' ELSE '✗' END || ' Goals' as goals
FROM readiness;

SELECT
    CASE WHEN has_investments THEN '✓' ELSE '✗' END || ' Investments' as investments,
    CASE WHEN has_6mo_txns THEN '✓' ELSE '✗' END || ' 6mo History' as history,
    CASE WHEN adequate_reserves THEN '✓' ELSE '✗' END || ' Cash Reserve' as reserves,
    CASE WHEN positive_savings THEN '✓' ELSE '✗' END || ' Savings Rate' as savings,
    CASE
        WHEN has_demographics AND has_tax_profile AND has_income AND has_budget
             AND has_goals AND has_investments AND has_6mo_txns
             AND adequate_reserves AND positive_savings
        THEN '✓ READY'
        ELSE '⚠ INCOMPLETE'
    END as overall_status
FROM readiness;

-- =========================================
-- FINAL VERDICT
-- =========================================
\echo ''
\echo '================================================'

WITH all_checks AS (
    SELECT
        (SELECT COUNT(*) = 0 FROM transactions t LEFT JOIN accounts a ON t.account_id = a.id WHERE t.user_id = :user_id::UUID AND a.id IS NULL) as no_orphans,
        (SELECT AVG(income) BETWEEN 9000 AND 9800 FROM (SELECT SUM(CASE WHEN amount < 0 AND category != 'Transfer' THEN -amount ELSE 0 END) as income FROM transactions t JOIN accounts a ON t.account_id = a.id WHERE a.user_id = :user_id::UUID AND pending = false GROUP BY DATE_TRUNC('month', date)) x) as income_ok,
        (SELECT AVG(expenses) BETWEEN 6800 AND 7600 FROM (SELECT SUM(CASE WHEN amount > 0 AND category != 'Transfer' THEN amount ELSE 0 END) as expenses FROM transactions t JOIN accounts a ON t.account_id = a.id WHERE a.user_id = :user_id::UUID AND pending = false GROUP BY DATE_TRUNC('month', date)) x) as expenses_ok,
        (SELECT (AVG(income - expenses) / NULLIF(AVG(income), 0)) > 0.10 FROM (SELECT SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END) as income, SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as expenses FROM transactions t JOIN accounts a ON t.account_id = a.id WHERE a.user_id = :user_id::UUID AND pending = false GROUP BY DATE_TRUNC('month', date)) x) as savings_ok,
        (SELECT COUNT(*) = 0 FROM user_demographics WHERE user_id = :user_id::UUID AND (age IS NULL OR household_income IS NULL)) as no_nulls
)
SELECT
    CASE
        WHEN no_orphans AND income_ok AND expenses_ok AND savings_ok AND no_nulls
        THEN E'\n✅ ALL VALIDATIONS PASSED\n\nData is ready for production use.'
        ELSE E'\n❌ VALIDATION FAILURES DETECTED\n\nPlease review failed assertions above.'
    END as final_verdict
FROM all_checks;

\echo '================================================'
\echo 'Validation completed:' `date`
\echo '================================================'