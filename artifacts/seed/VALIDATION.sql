-- VALIDATION.sql - Post-seed verification queries
-- Run after seeding to verify data integrity and consistency
-- Usage: psql -h localhost -p 5433 -U truefi_user -d truefi_app_data -f VALIDATION.sql

\echo '==============================================='
\echo 'TrueFi Data Validation Report'
\echo 'Target User: Devin Patel (136e2d19-e31d-4691-94cb-1729585a340e)'
\echo '==============================================='
\echo ''

-- Set formatting
\pset border 2
\pset format aligned

-- User ID variable
\set user_id '136e2d19-e31d-4691-94cb-1729585a340e'

-- =========================================
-- 1. NULL VALUE CHECKS
-- =========================================
\echo '1. NULL VALUE VALIDATION'
\echo '-------------------------'

SELECT
    'user_demographics' as table_name,
    COUNT(*) as total_rows,
    SUM(CASE WHEN age IS NULL THEN 1 ELSE 0 END) as age_nulls,
    SUM(CASE WHEN household_income IS NULL THEN 1 ELSE 0 END) as income_nulls,
    CASE
        WHEN SUM(CASE WHEN age IS NULL OR household_income IS NULL THEN 1 ELSE 0 END) = 0
        THEN '✓ PASS'
        ELSE '✗ FAIL'
    END as status
FROM user_demographics
WHERE user_id = :'user_id';

SELECT
    'tax_profile' as table_name,
    COUNT(*) as total_rows,
    SUM(CASE WHEN federal_rate IS NULL THEN 1 ELSE 0 END) as federal_nulls,
    SUM(CASE WHEN state_rate IS NULL THEN 1 ELSE 0 END) as state_nulls,
    CASE
        WHEN SUM(CASE WHEN federal_rate IS NULL OR state_rate IS NULL THEN 1 ELSE 0 END) = 0
        THEN '✓ PASS'
        ELSE '✗ FAIL'
    END as status
FROM tax_profile
WHERE user_id = :'user_id';

SELECT
    'accounts' as table_name,
    COUNT(*) as total_accounts,
    SUM(CASE WHEN available_balance IS NULL THEN 1 ELSE 0 END) as available_balance_nulls,
    SUM(CASE WHEN updated_at IS NULL THEN 1 ELSE 0 END) as updated_at_nulls,
    CASE
        WHEN SUM(CASE WHEN available_balance IS NULL THEN 1 ELSE 0 END) = 0
        THEN '✓ PASS'
        ELSE '✗ FAIL'
    END as status
FROM accounts
WHERE user_id = :'user_id';

\echo ''

-- =========================================
-- 2. USER PROFILE VALIDATION
-- =========================================
\echo '2. USER PROFILE DETAILS'
\echo '------------------------'

SELECT
    u.first_name || ' ' || u.last_name as full_name,
    ud.age,
    ud.household_income,
    ud.marital_status,
    ud.dependents,
    tp.filing_status,
    tp.state,
    ROUND(tp.federal_rate * 100, 1) || '%' as federal_tax_rate,
    ROUND(tp.state_rate * 100, 1) || '%' as state_tax_rate
FROM users u
LEFT JOIN user_demographics ud ON u.id = ud.user_id
LEFT JOIN tax_profile tp ON u.id = tp.user_id
WHERE u.id = :'user_id';

\echo ''

-- =========================================
-- 3. ACCOUNT SUMMARY
-- =========================================
\echo '3. ACCOUNT SUMMARY'
\echo '------------------'

SELECT
    type,
    subtype,
    name,
    TO_CHAR(balance, '$999,999,999.99') as balance,
    TO_CHAR(available_balance, '$999,999,999.99') as available_balance,
    CASE WHEN is_active THEN 'Active' ELSE 'Inactive' END as status,
    DATE(balances_last_updated) as last_updated
FROM accounts
WHERE user_id = :'user_id'
ORDER BY type, subtype;

SELECT
    'TOTAL' as category,
    TO_CHAR(SUM(CASE WHEN type IN ('depository', 'investment') THEN balance ELSE 0 END), '$999,999,999.99') as assets,
    TO_CHAR(SUM(CASE WHEN type = 'credit' THEN balance ELSE 0 END), '$999,999,999.99') as credit_balances
FROM accounts
WHERE user_id = :'user_id';

\echo ''

-- =========================================
-- 4. TRANSACTION ANALYSIS
-- =========================================
\echo '4. TRANSACTION ANALYSIS (Last 6 Months)'
\echo '----------------------------------------'

WITH monthly_summary AS (
    SELECT
        TO_CHAR(date, 'YYYY-MM') as month,
        COUNT(*) as transaction_count,
        SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END) as income,
        SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as expenses
    FROM transactions
    WHERE user_id = :'user_id'
    AND date >= NOW() - INTERVAL '6 months'
    AND pending = false
    GROUP BY TO_CHAR(date, 'YYYY-MM')
    ORDER BY month DESC
)
SELECT
    month,
    transaction_count as txn_count,
    TO_CHAR(income, '$999,999.99') as income,
    TO_CHAR(expenses, '$999,999.99') as expenses,
    TO_CHAR(income - expenses, '$999,999.99') as net_savings
FROM monthly_summary;

\echo ''
\echo 'Transaction Categories (Top 10 by Amount):'

SELECT
    COALESCE(pfc_primary, category, 'Unknown') as category,
    COUNT(*) as count,
    TO_CHAR(SUM(amount), '$999,999.99') as total_amount,
    TO_CHAR(AVG(amount), '$999,999.99') as avg_amount
FROM transactions
WHERE user_id = :'user_id'
AND date >= NOW() - INTERVAL '6 months'
AND pending = false
AND amount > 0  -- Expenses only
GROUP BY COALESCE(pfc_primary, category, 'Unknown')
ORDER BY SUM(amount) DESC
LIMIT 10;

\echo ''

-- =========================================
-- 5. BUDGET VALIDATION
-- =========================================
\echo '5. BUDGET VALIDATION'
\echo '--------------------'

SELECT
    b.name as budget_name,
    b.period,
    TO_CHAR(b.amount, '$999,999.99') as total_budget,
    COUNT(bc.id) as category_count,
    TO_CHAR(SUM(bc.amount), '$999,999.99') as categories_sum,
    CASE
        WHEN ABS(b.amount - SUM(bc.amount)) < 0.01 THEN '✓ BALANCED'
        ELSE '✗ MISMATCH'
    END as status
FROM budgets b
LEFT JOIN budget_categories bc ON b.id = bc.budget_id
WHERE b.user_id = :'user_id'
AND b.is_active = true
GROUP BY b.id, b.name, b.period, b.amount;

\echo ''
\echo 'Budget Categories:'

SELECT
    category,
    TO_CHAR(amount, '$999,999.99') as budgeted_amount,
    TO_CHAR(amount / b.amount * 100, '999.9%') as pct_of_budget
FROM budget_categories bc
JOIN budgets b ON bc.budget_id = b.id
WHERE b.user_id = :'user_id'
AND b.is_active = true
ORDER BY amount DESC;

\echo ''

-- =========================================
-- 6. GOALS VALIDATION
-- =========================================
\echo '6. GOALS STATUS'
\echo '---------------'

SELECT
    name,
    TO_CHAR(target_amount, '$999,999') as target,
    TO_CHAR(current_amount, '$999,999') as current,
    TO_CHAR(current_amount / NULLIF(target_amount, 0) * 100, '999%') as progress,
    priority,
    CASE WHEN target_date IS NOT NULL
        THEN TO_CHAR(target_date, 'YYYY-MM-DD')
        ELSE 'Not Set'
    END as target_date,
    CASE WHEN is_active THEN 'Active' ELSE 'Inactive' END as status
FROM goals
WHERE user_id = :'user_id'
ORDER BY priority, target_amount DESC;

\echo ''

-- =========================================
-- 7. INVESTMENT HOLDINGS
-- =========================================
\echo '7. INVESTMENT HOLDINGS'
\echo '----------------------'

SELECT
    s.ticker,
    s.name,
    h.quantity,
    TO_CHAR(h.cost_basis, '$999,999.99') as cost_basis,
    TO_CHAR(h.institution_value, '$999,999.99') as market_value,
    TO_CHAR((h.institution_value - h.cost_basis) / NULLIF(h.cost_basis, 0) * 100, '999.9%') as gain_loss_pct
FROM holdings h
JOIN securities s ON h.security_id = s.id
JOIN accounts a ON h.account_id = a.id
WHERE a.user_id = :'user_id'
ORDER BY h.institution_value DESC;

SELECT
    'TOTAL PORTFOLIO' as summary,
    TO_CHAR(SUM(h.cost_basis), '$999,999.99') as total_cost,
    TO_CHAR(SUM(h.institution_value), '$999,999.99') as total_value,
    TO_CHAR(SUM(h.institution_value - h.cost_basis), '$999,999.99') as total_gain_loss,
    TO_CHAR((SUM(h.institution_value) - SUM(h.cost_basis)) / NULLIF(SUM(h.cost_basis), 0) * 100, '999.9%') as total_return
FROM holdings h
JOIN accounts a ON h.account_id = a.id
WHERE a.user_id = :'user_id';

\echo ''

-- =========================================
-- 8. RECURRING INCOME
-- =========================================
\echo '8. RECURRING INCOME'
\echo '-------------------'

SELECT
    source,
    employer,
    frequency,
    TO_CHAR(gross_monthly, '$999,999.99') as gross_monthly,
    TO_CHAR(net_monthly, '$999,999.99') as net_monthly,
    TO_CHAR((gross_monthly - net_monthly) / NULLIF(gross_monthly, 0) * 100, '999.9%') as tax_rate,
    next_pay_date,
    CASE WHEN is_net THEN 'Net Amount' ELSE 'Gross Amount' END as amount_type
FROM recurring_income
WHERE user_id = :'user_id';

\echo ''

-- =========================================
-- 9. MANUAL ASSETS & LIABILITIES
-- =========================================
\echo '9. MANUAL ASSETS & LIABILITIES'
\echo '-------------------------------'

\echo 'Manual Assets:'
SELECT
    name,
    asset_class,
    TO_CHAR(value, '$999,999,999.99') as value,
    notes
FROM manual_assets
WHERE user_id = :'user_id'
ORDER BY value DESC;

\echo ''
\echo 'Manual Liabilities:'
SELECT
    name,
    liability_class,
    TO_CHAR(balance, '$999,999,999.99') as balance,
    COALESCE(TO_CHAR(interest_rate * 100, '99.99%'), 'N/A') as interest_rate,
    notes
FROM manual_liabilities
WHERE user_id = :'user_id'
ORDER BY balance DESC;

\echo ''

-- =========================================
-- 10. KEY FINANCIAL METRICS
-- =========================================
\echo '10. KEY FINANCIAL METRICS'
\echo '--------------------------'

WITH metrics AS (
    SELECT
        -- Net Worth
        (SELECT COALESCE(SUM(value), 0) FROM manual_assets WHERE user_id = :'user_id') +
        (SELECT COALESCE(SUM(CASE WHEN type IN ('depository', 'investment') THEN balance ELSE 0 END), 0)
         FROM accounts WHERE user_id = :'user_id') as total_assets,

        (SELECT COALESCE(SUM(balance), 0) FROM manual_liabilities WHERE user_id = :'user_id') +
        (SELECT COALESCE(SUM(CASE WHEN type = 'loan' THEN balance ELSE 0 END), 0)
         FROM accounts WHERE user_id = :'user_id') as total_liabilities,

        -- Monthly Income/Expenses (3-month average)
        (SELECT COALESCE(AVG(monthly_income), 0) FROM (
            SELECT SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END) as monthly_income
            FROM transactions
            WHERE user_id = :'user_id'
            AND date >= NOW() - INTERVAL '3 months'
            AND pending = false
            GROUP BY DATE_TRUNC('month', date)
        ) t) as avg_monthly_income,

        (SELECT COALESCE(AVG(monthly_expenses), 0) FROM (
            SELECT SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as monthly_expenses
            FROM transactions
            WHERE user_id = :'user_id'
            AND date >= NOW() - INTERVAL '3 months'
            AND pending = false
            GROUP BY DATE_TRUNC('month', date)
        ) t) as avg_monthly_expenses,

        -- Liquid Reserves
        (SELECT COALESCE(SUM(balance), 0)
         FROM accounts
         WHERE user_id = :'user_id'
         AND type = 'depository') as liquid_reserves
)
SELECT
    TO_CHAR(total_assets, '$999,999,999') as total_assets,
    TO_CHAR(total_liabilities, '$999,999,999') as total_liabilities,
    TO_CHAR(total_assets - total_liabilities, '$999,999,999') as net_worth,
    TO_CHAR(avg_monthly_income, '$999,999') as avg_monthly_income,
    TO_CHAR(avg_monthly_expenses, '$999,999') as avg_monthly_expenses,
    TO_CHAR(avg_monthly_income - avg_monthly_expenses, '$999,999') as avg_monthly_savings,
    TO_CHAR((avg_monthly_income - avg_monthly_expenses) / NULLIF(avg_monthly_income, 0) * 100, '999%') as savings_rate,
    TO_CHAR(liquid_reserves, '$999,999') as liquid_reserves,
    TO_CHAR(liquid_reserves / NULLIF(avg_monthly_expenses, 0), '99.9') || ' months' as months_of_expenses
FROM metrics;

\echo ''

-- =========================================
-- 11. DATA QUALITY CHECKS
-- =========================================
\echo '11. DATA QUALITY SUMMARY'
\echo '-------------------------'

WITH checks AS (
    SELECT
        'Transactions have posted_datetime' as check_name,
        COUNT(*) as total,
        SUM(CASE WHEN posted_datetime IS NOT NULL THEN 1 ELSE 0 END) as passed,
        CASE
            WHEN COUNT(*) = SUM(CASE WHEN posted_datetime IS NOT NULL THEN 1 ELSE 0 END)
            THEN '✓ PASS'
            ELSE '✗ FAIL (' || (COUNT(*) - SUM(CASE WHEN posted_datetime IS NOT NULL THEN 1 ELSE 0 END))::text || ' missing)'
        END as status
    FROM transactions
    WHERE user_id = :'user_id'
    AND date >= NOW() - INTERVAL '6 months'

    UNION ALL

    SELECT
        'Transactions are not pending' as check_name,
        COUNT(*) as total,
        SUM(CASE WHEN pending = false THEN 1 ELSE 0 END) as passed,
        CASE
            WHEN COUNT(*) = SUM(CASE WHEN pending = false THEN 1 ELSE 0 END)
            THEN '✓ PASS'
            ELSE '✗ WARN (' || SUM(CASE WHEN pending = true THEN 1 ELSE 0 END)::text || ' pending)'
        END as status
    FROM transactions
    WHERE user_id = :'user_id'
    AND date >= NOW() - INTERVAL '6 months'

    UNION ALL

    SELECT
        'Budget categories sum equals budget' as check_name,
        1 as total,
        CASE
            WHEN ABS(b.amount - COALESCE(SUM(bc.amount), 0)) < 0.01 THEN 1
            ELSE 0
        END as passed,
        CASE
            WHEN ABS(b.amount - COALESCE(SUM(bc.amount), 0)) < 0.01 THEN '✓ PASS'
            ELSE '✗ FAIL (diff: $' || ABS(b.amount - COALESCE(SUM(bc.amount), 0))::text || ')'
        END as status
    FROM budgets b
    LEFT JOIN budget_categories bc ON b.id = bc.budget_id
    WHERE b.user_id = :'user_id'
    AND b.is_active = true
    GROUP BY b.id, b.amount

    UNION ALL

    SELECT
        'Holdings value matches account balance' as check_name,
        1 as total,
        CASE
            WHEN ABS(COALESCE(h.total_value, 0) - COALESCE(a.balance, 0)) / NULLIF(a.balance, 0) < 0.02
            THEN 1
            ELSE 0
        END as passed,
        CASE
            WHEN ABS(COALESCE(h.total_value, 0) - COALESCE(a.balance, 0)) / NULLIF(a.balance, 0) < 0.02
            THEN '✓ PASS'
            ELSE '✗ WARN (diff: ' || TO_CHAR(ABS(COALESCE(h.total_value, 0) - COALESCE(a.balance, 0)) / NULLIF(a.balance, 0) * 100, '99.9%') || ')'
        END as status
    FROM (
        SELECT SUM(balance) as balance
        FROM accounts
        WHERE user_id = :'user_id'
        AND type = 'investment'
    ) a
    CROSS JOIN (
        SELECT SUM(h.institution_value) as total_value
        FROM holdings h
        JOIN accounts a ON h.account_id = a.id
        WHERE a.user_id = :'user_id'
    ) h
)
SELECT * FROM checks;

\echo ''

-- =========================================
-- 12. INVARIANT CHECKS
-- =========================================
\echo '12. INVARIANT VALIDATION'
\echo '-------------------------'

WITH invariants AS (
    SELECT 'No critical NULLs' as invariant,
           CASE WHEN (
               SELECT COUNT(*) FROM user_demographics
               WHERE user_id = :'user_id'
               AND (age IS NULL OR household_income IS NULL)
           ) = 0 AND (
               SELECT COUNT(*) FROM tax_profile
               WHERE user_id = :'user_id'
               AND (federal_rate IS NULL OR state_rate IS NULL)
           ) = 0 THEN '✓ PASS' ELSE '✗ FAIL' END as result

    UNION ALL
    SELECT 'Positive savings rate' as invariant,
           CASE WHEN (
               SELECT AVG(income - expenses)
               FROM (
                   SELECT
                       SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END) as income,
                       SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as expenses
                   FROM transactions
                   WHERE user_id = :'user_id'
                   AND date >= NOW() - INTERVAL '3 months'
                   AND pending = false
                   GROUP BY DATE_TRUNC('month', date)
               ) t
           ) > 0 THEN '✓ PASS' ELSE '✗ FAIL' END as result

    UNION ALL
    SELECT '4-6 months emergency fund' as invariant,
           CASE WHEN (
               SELECT liquid_reserves / NULLIF(avg_expenses, 0)
               FROM (
                   SELECT
                       (SELECT SUM(balance) FROM accounts
                        WHERE user_id = :'user_id' AND type = 'depository') as liquid_reserves,
                       (SELECT AVG(monthly_exp) FROM (
                           SELECT SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as monthly_exp
                           FROM transactions
                           WHERE user_id = :'user_id'
                           AND date >= NOW() - INTERVAL '3 months'
                           AND pending = false
                           GROUP BY DATE_TRUNC('month', date)
                       ) t) as avg_expenses
               ) calc
           ) BETWEEN 4 AND 6 THEN '✓ PASS'
           ELSE '✗ WARN (adjust target)' END as result

    UNION ALL
    SELECT 'All transactions settled' as invariant,
           CASE WHEN (
               SELECT COUNT(*)
               FROM transactions
               WHERE user_id = :'user_id'
               AND date >= NOW() - INTERVAL '1 month'
               AND pending = true
           ) = 0 THEN '✓ PASS' ELSE '✗ WARN' END as result
)
SELECT * FROM invariants;

\echo ''
\echo '==============================================='
\echo 'Validation Complete'
\echo '==============================================='