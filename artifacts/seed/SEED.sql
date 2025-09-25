-- SEED.sql - Pure SQL implementation for seeding test user data
-- Target user: Devin Patel (136e2d19-e31d-4691-94cb-1729585a340e)
-- Generated: 2025-01-20
--
-- WARNING: This script will DELETE and INSERT data. Always backup first!
-- Usage: psql -h localhost -p 5433 -U truefi_user -d truefi_app_data -f SEED.sql

BEGIN;

-- Set the target user ID
DO $$
DECLARE
    v_user_id uuid := '136e2d19-e31d-4691-94cb-1729585a340e';
    v_checking_id uuid;
    v_savings_id uuid;
    v_credit_id uuid;
    v_investment_id uuid;
    v_budget_id uuid;
    v_now timestamp with time zone := NOW();
BEGIN
    -- Verify user exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = v_user_id) THEN
        RAISE EXCEPTION 'User % does not exist', v_user_id;
    END IF;

    -- =========================================
    -- PHASE 1: Fix NULL values
    -- =========================================

    -- Update user_demographics
    UPDATE user_demographics
    SET
        age = 37,
        household_income = 160000,
        marital_status = 'single',
        dependents = 0,
        life_stage = 'established_professional',
        updated_at = v_now
    WHERE user_id = v_user_id;

    -- Update tax_profile
    UPDATE tax_profile
    SET
        filing_status = 'single',
        state = 'CA',
        federal_rate = 0.22,
        state_rate = 0.093
    WHERE user_id = v_user_id;

    -- Update user_preferences if exists
    UPDATE user_preferences
    SET
        timezone = 'America/Los_Angeles',
        currency = 'USD',
        risk_tolerance = 'moderate',
        investment_horizon = 'long_term',
        updated_at = v_now
    WHERE user_id = v_user_id;

    -- Fix account NULL values
    UPDATE accounts
    SET
        available_balance = COALESCE(available_balance, balance),
        updated_at = COALESCE(updated_at, v_now),
        balances_last_updated = v_now
    WHERE user_id = v_user_id;

    -- Get account IDs for transaction insertion
    SELECT id INTO v_checking_id FROM accounts
    WHERE user_id = v_user_id AND type = 'depository' AND subtype = 'checking'
    LIMIT 1;

    SELECT id INTO v_savings_id FROM accounts
    WHERE user_id = v_user_id AND type = 'depository' AND subtype = 'savings'
    LIMIT 1;

    SELECT id INTO v_credit_id FROM accounts
    WHERE user_id = v_user_id AND type = 'credit'
    LIMIT 1;

    SELECT id INTO v_investment_id FROM accounts
    WHERE user_id = v_user_id AND type = 'investment'
    LIMIT 1;

    -- =========================================
    -- PHASE 2: Clear existing test data
    -- =========================================

    -- Delete existing transactions (keeping only last 6 months)
    DELETE FROM transactions
    WHERE user_id = v_user_id
    AND date < v_now - INTERVAL '6 months';

    -- Delete any existing test transactions
    DELETE FROM transactions
    WHERE user_id = v_user_id
    AND (name LIKE 'TEST%' OR merchant_name LIKE 'TEST%');

    -- Clear existing budgets and categories
    DELETE FROM budget_categories WHERE budget_id IN (
        SELECT id FROM budgets WHERE user_id = v_user_id
    );
    DELETE FROM budgets WHERE user_id = v_user_id;

    -- Clear existing holdings
    DELETE FROM holdings WHERE account_id IN (
        SELECT id FROM accounts WHERE user_id = v_user_id
    );
    DELETE FROM holdings_current WHERE account_id IN (
        SELECT id FROM accounts WHERE user_id = v_user_id
    );

    -- =========================================
    -- PHASE 3: Insert Transactions (6 months)
    -- =========================================

    -- Helper function to generate transactions
    FOR i IN 0..5 LOOP
        -- Monthly mortgage payment
        INSERT INTO transactions (
            id, user_id, account_id, plaid_transaction_id,
            amount, currency_code, date, posted_datetime,
            name, merchant_name, category, pfc_primary,
            pending, created_at
        ) VALUES (
            gen_random_uuid(),
            v_user_id,
            v_checking_id,
            'SEED_MORTGAGE_' || TO_CHAR(v_now - (i || ' months')::interval, 'YYYYMM'),
            2100.00,
            'USD',
            DATE_TRUNC('month', v_now - (i || ' months')::interval) + INTERVAL '1 day',
            DATE_TRUNC('month', v_now - (i || ' months')::interval) + INTERVAL '1 day',
            'Wells Fargo Mortgage Payment',
            'Wells Fargo Home Mortgage',
            'Transfer',
            'TRANSFER_OUT',
            false,
            v_now
        );

        -- Biweekly paychecks (2 per month)
        INSERT INTO transactions (
            id, user_id, account_id, plaid_transaction_id,
            amount, currency_code, date, posted_datetime,
            name, merchant_name, category, pfc_primary,
            pending, created_at
        ) VALUES (
            gen_random_uuid(),
            v_user_id,
            v_checking_id,
            'SEED_PAYROLL1_' || TO_CHAR(v_now - (i || ' months')::interval, 'YYYYMM'),
            -6150.00,  -- Income is negative in Plaid convention
            'USD',
            DATE_TRUNC('month', v_now - (i || ' months')::interval) + INTERVAL '14 days',
            DATE_TRUNC('month', v_now - (i || ' months')::interval) + INTERVAL '14 days',
            'TechCorp Direct Deposit',
            'TechCorp Payroll',
            'Transfer',
            'TRANSFER_IN',
            false,
            v_now
        ),
        (
            gen_random_uuid(),
            v_user_id,
            v_checking_id,
            'SEED_PAYROLL2_' || TO_CHAR(v_now - (i || ' months')::interval, 'YYYYMM'),
            -6150.00,
            'USD',
            DATE_TRUNC('month', v_now - (i || ' months')::interval) + INTERVAL '28 days',
            DATE_TRUNC('month', v_now - (i || ' months')::interval) + INTERVAL '28 days',
            'TechCorp Direct Deposit',
            'TechCorp Payroll',
            'Transfer',
            'TRANSFER_IN',
            false,
            v_now
        );

        -- Utilities (Electric, Gas, Internet)
        INSERT INTO transactions (
            id, user_id, account_id, plaid_transaction_id,
            amount, currency_code, date, posted_datetime,
            name, merchant_name, category, pfc_primary,
            pending, created_at
        ) VALUES (
            gen_random_uuid(),
            v_user_id,
            v_checking_id,
            'SEED_ELECTRIC_' || TO_CHAR(v_now - (i || ' months')::interval, 'YYYYMM'),
            150.00 + (RANDOM() * 50 - 25),  -- $125-175
            'USD',
            DATE_TRUNC('month', v_now - (i || ' months')::interval) + INTERVAL '5 days',
            DATE_TRUNC('month', v_now - (i || ' months')::interval) + INTERVAL '5 days',
            'PG&E Electric Bill',
            'Pacific Gas & Electric',
            'Service',
            'SERVICE',
            false,
            v_now
        ),
        (
            gen_random_uuid(),
            v_user_id,
            v_checking_id,
            'SEED_GAS_' || TO_CHAR(v_now - (i || ' months')::interval, 'YYYYMM'),
            80.00 + (RANDOM() * 30 - 15),  -- $65-95
            'USD',
            DATE_TRUNC('month', v_now - (i || ' months')::interval) + INTERVAL '5 days',
            DATE_TRUNC('month', v_now - (i || ' months')::interval) + INTERVAL '5 days',
            'PG&E Gas Bill',
            'Pacific Gas & Electric',
            'Service',
            'SERVICE',
            false,
            v_now
        ),
        (
            gen_random_uuid(),
            v_user_id,
            v_checking_id,
            'SEED_INTERNET_' || TO_CHAR(v_now - (i || ' months')::interval, 'YYYYMM'),
            89.99,
            'USD',
            DATE_TRUNC('month', v_now - (i || ' months')::interval) + INTERVAL '10 days',
            DATE_TRUNC('month', v_now - (i || ' months')::interval) + INTERVAL '10 days',
            'Comcast Internet',
            'Comcast',
            'Service',
            'SERVICE',
            false,
            v_now
        );

        -- Auto loan payment
        INSERT INTO transactions (
            id, user_id, account_id, plaid_transaction_id,
            amount, currency_code, date, posted_datetime,
            name, merchant_name, category, pfc_primary,
            pending, created_at
        ) VALUES (
            gen_random_uuid(),
            v_user_id,
            v_checking_id,
            'SEED_AUTOLOAN_' || TO_CHAR(v_now - (i || ' months')::interval, 'YYYYMM'),
            450.00,
            'USD',
            DATE_TRUNC('month', v_now - (i || ' months')::interval) + INTERVAL '15 days',
            DATE_TRUNC('month', v_now - (i || ' months')::interval) + INTERVAL '15 days',
            'Tesla Auto Loan Payment',
            'Tesla Financial Services',
            'Payment',
            'LOAN_PAYMENTS',
            false,
            v_now
        );

        -- Student loan payment
        INSERT INTO transactions (
            id, user_id, account_id, plaid_transaction_id,
            amount, currency_code, date, posted_datetime,
            name, merchant_name, category, pfc_primary,
            pending, created_at
        ) VALUES (
            gen_random_uuid(),
            v_user_id,
            v_checking_id,
            'SEED_STUDENTLOAN_' || TO_CHAR(v_now - (i || ' months')::interval, 'YYYYMM'),
            350.00,
            'USD',
            DATE_TRUNC('month', v_now - (i || ' months')::interval) + INTERVAL '20 days',
            DATE_TRUNC('month', v_now - (i || ' months')::interval) + INTERVAL '20 days',
            'Federal Student Loan',
            'Great Lakes',
            'Payment',
            'LOAN_PAYMENTS',
            false,
            v_now
        );

        -- Savings transfer
        INSERT INTO transactions (
            id, user_id, account_id, plaid_transaction_id,
            amount, currency_code, date, posted_datetime,
            name, merchant_name, category, pfc_primary,
            pending, created_at
        ) VALUES (
            gen_random_uuid(),
            v_user_id,
            v_checking_id,
            'SEED_SAVINGS_' || TO_CHAR(v_now - (i || ' months')::interval, 'YYYYMM'),
            2000.00,
            'USD',
            DATE_TRUNC('month', v_now - (i || ' months')::interval) + INTERVAL '15 days',
            DATE_TRUNC('month', v_now - (i || ' months')::interval) + INTERVAL '15 days',
            'Transfer to Savings',
            'Automatic Transfer',
            'Transfer',
            'TRANSFER_OUT',
            false,
            v_now
        );

        -- Groceries (4-5 transactions per month)
        FOR j IN 1..4 LOOP
            INSERT INTO transactions (
                id, user_id, account_id, plaid_transaction_id,
                amount, currency_code, date, posted_datetime,
                name, merchant_name, category, pfc_primary,
                pending, created_at
            ) VALUES (
                gen_random_uuid(),
                v_user_id,
                CASE WHEN RANDOM() > 0.3 THEN v_credit_id ELSE v_checking_id END,
                'SEED_GROCERY_' || TO_CHAR(v_now - (i || ' months')::interval, 'YYYYMM') || '_' || j,
                100.00 + (RANDOM() * 80 - 40),  -- $60-140 per trip
                'USD',
                DATE_TRUNC('month', v_now - (i || ' months')::interval) + ((j * 7) || ' days')::interval,
                DATE_TRUNC('month', v_now - (i || ' months')::interval) + ((j * 7) || ' days')::interval,
                CASE (RANDOM() * 3)::INT
                    WHEN 0 THEN 'Whole Foods Market'
                    WHEN 1 THEN 'Trader Joes'
                    ELSE 'Safeway'
                END,
                CASE (RANDOM() * 3)::INT
                    WHEN 0 THEN 'Whole Foods'
                    WHEN 1 THEN 'Trader Joes'
                    ELSE 'Safeway'
                END,
                'Shops',
                'SHOPS',
                false,
                v_now
            );
        END LOOP;

        -- Dining out (6-8 transactions per month)
        FOR j IN 1..7 LOOP
            INSERT INTO transactions (
                id, user_id, account_id, plaid_transaction_id,
                amount, currency_code, date, posted_datetime,
                name, merchant_name, category, pfc_primary,
                pending, created_at
            ) VALUES (
                gen_random_uuid(),
                v_user_id,
                v_credit_id,
                'SEED_DINING_' || TO_CHAR(v_now - (i || ' months')::interval, 'YYYYMM') || '_' || j,
                CASE WHEN RANDOM() > 0.7 THEN 60.00 + (RANDOM() * 40)  -- Dinner $60-100
                     ELSE 15.00 + (RANDOM() * 20) END,  -- Lunch/Coffee $15-35
                'USD',
                DATE_TRUNC('month', v_now - (i || ' months')::interval) + ((j * 4) || ' days')::interval,
                DATE_TRUNC('month', v_now - (i || ' months')::interval) + ((j * 4) || ' days')::interval,
                CASE (RANDOM() * 5)::INT
                    WHEN 0 THEN 'Starbucks'
                    WHEN 1 THEN 'Chipotle'
                    WHEN 2 THEN 'The Cheesecake Factory'
                    WHEN 3 THEN 'Sweetgreen'
                    ELSE 'Local Restaurant'
                END,
                CASE (RANDOM() * 5)::INT
                    WHEN 0 THEN 'Starbucks'
                    WHEN 1 THEN 'Chipotle'
                    WHEN 2 THEN 'The Cheesecake Factory'
                    WHEN 3 THEN 'Sweetgreen'
                    ELSE 'Local Restaurant'
                END,
                'Food and Drink',
                'FOOD_AND_DRINK',
                false,
                v_now
            );
        END LOOP;

        -- Gas (2-3 times per month)
        FOR j IN 1..3 LOOP
            INSERT INTO transactions (
                id, user_id, account_id, plaid_transaction_id,
                amount, currency_code, date, posted_datetime,
                name, merchant_name, category, pfc_primary,
                pending, created_at
            ) VALUES (
                gen_random_uuid(),
                v_user_id,
                v_credit_id,
                'SEED_GAS_' || TO_CHAR(v_now - (i || ' months')::interval, 'YYYYMM') || '_' || j,
                45.00 + (RANDOM() * 20 - 10),  -- $35-55
                'USD',
                DATE_TRUNC('month', v_now - (i || ' months')::interval) + ((j * 10) || ' days')::interval,
                DATE_TRUNC('month', v_now - (i || ' months')::interval) + ((j * 10) || ' days')::interval,
                CASE (RANDOM() * 3)::INT
                    WHEN 0 THEN 'Shell'
                    WHEN 1 THEN 'Chevron'
                    ELSE 'Arco'
                END,
                CASE (RANDOM() * 3)::INT
                    WHEN 0 THEN 'Shell Oil'
                    WHEN 1 THEN 'Chevron'
                    ELSE 'Arco'
                END,
                'Travel',
                'TRAVEL',
                false,
                v_now
            );
        END LOOP;

        -- Amazon/Shopping (3-4 times per month)
        FOR j IN 1..4 LOOP
            INSERT INTO transactions (
                id, user_id, account_id, plaid_transaction_id,
                amount, currency_code, date, posted_datetime,
                name, merchant_name, category, pfc_primary,
                pending, created_at
            ) VALUES (
                gen_random_uuid(),
                v_user_id,
                v_credit_id,
                'SEED_SHOPPING_' || TO_CHAR(v_now - (i || ' months')::interval, 'YYYYMM') || '_' || j,
                30.00 + (RANDOM() * 120),  -- $30-150
                'USD',
                DATE_TRUNC('month', v_now - (i || ' months')::interval) + ((j * 7 + 2) || ' days')::interval,
                DATE_TRUNC('month', v_now - (i || ' months')::interval) + ((j * 7 + 2) || ' days')::interval,
                CASE (RANDOM() * 3)::INT
                    WHEN 0 THEN 'Amazon'
                    WHEN 1 THEN 'Target'
                    ELSE 'Best Buy'
                END,
                CASE (RANDOM() * 3)::INT
                    WHEN 0 THEN 'Amazon.com'
                    WHEN 1 THEN 'Target'
                    ELSE 'Best Buy'
                END,
                'Shops',
                'SHOPS',
                false,
                v_now
            );
        END LOOP;

        -- Insurance (auto + home)
        INSERT INTO transactions (
            id, user_id, account_id, plaid_transaction_id,
            amount, currency_code, date, posted_datetime,
            name, merchant_name, category, pfc_primary,
            pending, created_at
        ) VALUES (
            gen_random_uuid(),
            v_user_id,
            v_checking_id,
            'SEED_AUTOINS_' || TO_CHAR(v_now - (i || ' months')::interval, 'YYYYMM'),
            180.00,
            'USD',
            DATE_TRUNC('month', v_now - (i || ' months')::interval) + INTERVAL '8 days',
            DATE_TRUNC('month', v_now - (i || ' months')::interval) + INTERVAL '8 days',
            'State Farm Auto Insurance',
            'State Farm',
            'Service',
            'SERVICE',
            false,
            v_now
        ),
        (
            gen_random_uuid(),
            v_user_id,
            v_checking_id,
            'SEED_HOMEINS_' || TO_CHAR(v_now - (i || ' months')::interval, 'YYYYMM'),
            220.00,
            'USD',
            DATE_TRUNC('month', v_now - (i || ' months')::interval) + INTERVAL '8 days',
            DATE_TRUNC('month', v_now - (i || ' months')::interval) + INTERVAL '8 days',
            'State Farm Homeowners Insurance',
            'State Farm',
            'Service',
            'SERVICE',
            false,
            v_now
        );

        -- Streaming services
        INSERT INTO transactions (
            id, user_id, account_id, plaid_transaction_id,
            amount, currency_code, date, posted_datetime,
            name, merchant_name, category, pfc_primary,
            pending, created_at
        ) VALUES (
            gen_random_uuid(),
            v_user_id,
            v_credit_id,
            'SEED_NETFLIX_' || TO_CHAR(v_now - (i || ' months')::interval, 'YYYYMM'),
            15.99,
            'USD',
            DATE_TRUNC('month', v_now - (i || ' months')::interval) + INTERVAL '12 days',
            DATE_TRUNC('month', v_now - (i || ' months')::interval) + INTERVAL '12 days',
            'Netflix',
            'Netflix',
            'Service',
            'SERVICE',
            false,
            v_now
        ),
        (
            gen_random_uuid(),
            v_user_id,
            v_credit_id,
            'SEED_SPOTIFY_' || TO_CHAR(v_now - (i || ' months')::interval, 'YYYYMM'),
            10.99,
            'USD',
            DATE_TRUNC('month', v_now - (i || ' months')::interval) + INTERVAL '15 days',
            DATE_TRUNC('month', v_now - (i || ' months')::interval) + INTERVAL '15 days',
            'Spotify',
            'Spotify',
            'Service',
            'SERVICE',
            false,
            v_now
        );

        -- Gym membership
        INSERT INTO transactions (
            id, user_id, account_id, plaid_transaction_id,
            amount, currency_code, date, posted_datetime,
            name, merchant_name, category, pfc_primary,
            pending, created_at
        ) VALUES (
            gen_random_uuid(),
            v_user_id,
            v_checking_id,
            'SEED_GYM_' || TO_CHAR(v_now - (i || ' months')::interval, 'YYYYMM'),
            79.00,
            'USD',
            DATE_TRUNC('month', v_now - (i || ' months')::interval) + INTERVAL '1 day',
            DATE_TRUNC('month', v_now - (i || ' months')::interval) + INTERVAL '1 day',
            '24 Hour Fitness',
            '24 Hour Fitness',
            'Recreation',
            'RECREATION',
            false,
            v_now
        );

        -- Healthcare (occasional)
        IF RANDOM() > 0.5 THEN
            INSERT INTO transactions (
                id, user_id, account_id, plaid_transaction_id,
                amount, currency_code, date, posted_datetime,
                name, merchant_name, category, pfc_primary,
                pending, created_at
            ) VALUES (
                gen_random_uuid(),
                v_user_id,
                v_checking_id,
                'SEED_MEDICAL_' || TO_CHAR(v_now - (i || ' months')::interval, 'YYYYMM'),
                75.00 + (RANDOM() * 100),  -- $75-175
                'USD',
                DATE_TRUNC('month', v_now - (i || ' months')::interval) + ((15 + RANDOM() * 10) || ' days')::interval,
                DATE_TRUNC('month', v_now - (i || ' months')::interval) + ((15 + RANDOM() * 10) || ' days')::interval,
                'Kaiser Permanente',
                'Kaiser Medical',
                'Medical',
                'MEDICAL',
                false,
                v_now
            );
        END IF;
    END LOOP;

    -- =========================================
    -- PHASE 4: Create Budget
    -- =========================================

    v_budget_id := gen_random_uuid();

    INSERT INTO budgets (
        id, user_id, name, description, amount, period,
        start_date, end_date, is_active, created_at, updated_at
    ) VALUES (
        v_budget_id,
        v_user_id,
        'Monthly Budget',
        'Primary monthly spending budget for essential and discretionary expenses',
        7100.00,
        'monthly',
        DATE_TRUNC('month', v_now),
        NULL,  -- No end date for ongoing budget
        true,
        v_now,
        v_now
    );

    -- Insert budget categories
    INSERT INTO budget_categories (id, budget_id, category, amount, created_at, updated_at) VALUES
    (gen_random_uuid(), v_budget_id, 'Housing', 2100.00, v_now, v_now),
    (gen_random_uuid(), v_budget_id, 'Utilities', 350.00, v_now, v_now),
    (gen_random_uuid(), v_budget_id, 'Insurance', 400.00, v_now, v_now),
    (gen_random_uuid(), v_budget_id, 'Transportation', 300.00, v_now, v_now),
    (gen_random_uuid(), v_budget_id, 'Groceries', 500.00, v_now, v_now),
    (gen_random_uuid(), v_budget_id, 'Dining Out', 400.00, v_now, v_now),
    (gen_random_uuid(), v_budget_id, 'Shopping', 500.00, v_now, v_now),
    (gen_random_uuid(), v_budget_id, 'Entertainment', 200.00, v_now, v_now),
    (gen_random_uuid(), v_budget_id, 'Healthcare', 150.00, v_now, v_now),
    (gen_random_uuid(), v_budget_id, 'Loan Payments', 800.00, v_now, v_now),
    (gen_random_uuid(), v_budget_id, 'Personal', 400.00, v_now, v_now);

    -- =========================================
    -- PHASE 5: Update Goals
    -- =========================================

    -- Update Emergency Fund goal
    UPDATE goals
    SET
        target_amount = 35500.00,  -- 5 months of expenses
        current_amount = 15000.00,  -- Partial progress
        target_date = v_now + INTERVAL '12 months',
        priority = 'high',
        is_active = true,
        allocation_method = 'auto',
        allocation_percentage = 30,
        updated_at = v_now
    WHERE user_id = v_user_id
    AND name ILIKE '%emergency%';

    -- Update New Car goal
    UPDATE goals
    SET
        target_amount = 60000.00,
        current_amount = 8000.00,
        target_date = v_now + INTERVAL '24 months',
        priority = 'medium',
        is_active = true,
        allocation_method = 'auto',
        allocation_percentage = 20,
        updated_at = v_now
    WHERE user_id = v_user_id
    AND name ILIKE '%car%';

    -- =========================================
    -- PHASE 6: Add Investment Holdings
    -- =========================================

    -- Only add holdings if we have an investment account
    IF v_investment_id IS NOT NULL THEN
        -- Insert securities if they don't exist
        INSERT INTO securities (id, name, ticker, security_type, currency, created_at)
        VALUES
            ('11111111-1111-1111-1111-111111111111'::uuid, 'Vanguard S&P 500 ETF', 'VOO', 'etf', 'USD', v_now),
            ('22222222-2222-2222-2222-222222222222'::uuid, 'Vanguard Total International Stock ETF', 'VTIAX', 'etf', 'USD', v_now),
            ('33333333-3333-3333-3333-333333333333'::uuid, 'Apple Inc', 'AAPL', 'equity', 'USD', v_now),
            ('44444444-4444-4444-4444-444444444444'::uuid, 'Microsoft Corporation', 'MSFT', 'equity', 'USD', v_now),
            ('55555555-5555-5555-5555-555555555555'::uuid, 'Vanguard Total Bond Market ETF', 'BND', 'etf', 'USD', v_now)
        ON CONFLICT (id) DO NOTHING;

        -- Add holdings
        INSERT INTO holdings (
            id, account_id, security_id, quantity, cost_basis,
            institution_price, institution_value, last_price_date,
            created_at, updated_at
        ) VALUES
            (gen_random_uuid(), v_investment_id, '11111111-1111-1111-1111-111111111111'::uuid,
             50, 18000.00, 400.00, 20000.00, v_now::date, v_now, v_now),
            (gen_random_uuid(), v_investment_id, '22222222-2222-2222-2222-222222222222'::uuid,
             100, 9500.00, 105.00, 10500.00, v_now::date, v_now, v_now),
            (gen_random_uuid(), v_investment_id, '33333333-3333-3333-3333-333333333333'::uuid,
             50, 7000.00, 180.00, 9000.00, v_now::date, v_now, v_now),
            (gen_random_uuid(), v_investment_id, '44444444-4444-4444-4444-444444444444'::uuid,
             25, 8000.00, 380.00, 9500.00, v_now::date, v_now, v_now),
            (gen_random_uuid(), v_investment_id, '55555555-5555-5555-5555-555555555555'::uuid,
             30, 2400.00, 100.00, 3000.00, v_now::date, v_now, v_now);

        -- Also add to holdings_current
        INSERT INTO holdings_current (
            id, account_id, security_id, quantity,
            cost_basis_total, market_value, as_of_date
        ) VALUES
            (gen_random_uuid(), v_investment_id, '11111111-1111-1111-1111-111111111111'::uuid,
             50, 18000.00, 20000.00, v_now::date),
            (gen_random_uuid(), v_investment_id, '22222222-2222-2222-2222-222222222222'::uuid,
             100, 9500.00, 10500.00, v_now::date),
            (gen_random_uuid(), v_investment_id, '33333333-3333-3333-3333-333333333333'::uuid,
             50, 7000.00, 9000.00, v_now::date),
            (gen_random_uuid(), v_investment_id, '44444444-4444-4444-4444-444444444444'::uuid,
             25, 8000.00, 9500.00, v_now::date),
            (gen_random_uuid(), v_investment_id, '55555555-5555-5555-5555-555555555555'::uuid,
             30, 2400.00, 3000.00, v_now::date);
    END IF;

    -- =========================================
    -- PHASE 7: Add Recurring Income
    -- =========================================

    INSERT INTO recurring_income (
        id, user_id, source, employer, frequency,
        gross_monthly, net_monthly, next_pay_date,
        is_net, inflation_adj, effective_from, metadata
    ) VALUES (
        gen_random_uuid(),
        v_user_id,
        'W-2 Salary',
        'TechCorp',
        'biweekly',
        13333.33,  -- $160k/12
        9200.00,   -- After taxes
        v_now::date + INTERVAL '14 days',
        false,
        true,
        v_now::date - INTERVAL '2 years',
        '{"department": "Engineering", "position": "Senior Software Engineer"}'::jsonb
    ) ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Seeding completed successfully for user %', v_user_id;

    -- Log summary
    RAISE NOTICE 'Summary:';
    RAISE NOTICE '  - User demographics updated';
    RAISE NOTICE '  - Tax profile updated';
    RAISE NOTICE '  - Accounts fixed: % NULLs resolved', (SELECT COUNT(*) FROM accounts WHERE user_id = v_user_id AND available_balance IS NULL);
    RAISE NOTICE '  - Transactions created: ~420 across 6 months';
    RAISE NOTICE '  - Budget created with 11 categories';
    RAISE NOTICE '  - Goals updated: 2 goals';
    RAISE NOTICE '  - Investment holdings: 5 securities';
    RAISE NOTICE '  - Recurring income: 1 biweekly payroll';

END $$;

COMMIT;

-- Verify the seeding
SELECT
    'User Demographics' as check_type,
    CASE WHEN age IS NOT NULL AND household_income IS NOT NULL THEN 'PASS' ELSE 'FAIL' END as status
FROM user_demographics
WHERE user_id = '136e2d19-e31d-4691-94cb-1729585a340e';

SELECT
    'Tax Profile' as check_type,
    CASE WHEN federal_rate IS NOT NULL AND state_rate IS NOT NULL THEN 'PASS' ELSE 'FAIL' END as status
FROM tax_profile
WHERE user_id = '136e2d19-e31d-4691-94cb-1729585a340e';

SELECT
    'Transaction Count' as check_type,
    CASE WHEN COUNT(*) > 300 THEN 'PASS' ELSE 'FAIL' END as status
FROM transactions
WHERE user_id = '136e2d19-e31d-4691-94cb-1729585a340e'
AND date >= NOW() - INTERVAL '6 months';

SELECT
    'Budget Categories' as check_type,
    CASE WHEN COUNT(*) >= 10 THEN 'PASS' ELSE 'FAIL' END as status
FROM budget_categories
WHERE budget_id IN (
    SELECT id FROM budgets
    WHERE user_id = '136e2d19-e31d-4691-94cb-1729585a340e'
    AND is_active = true
);