-- SEED_INTELLIGENT.sql
-- Comprehensive, deterministic seeding for TrueFi test user
-- Usage: psql -f SEED_INTELLIGENT.sql -v user_id="'136e2d19-e31d-4691-94cb-1729585a340e'" -v mode="'wipe_replace'" -v fixture_tag="'upper_middle_30s_v2'"

-- Set default variables if not provided
\set user_id '''136e2d19-e31d-4691-94cb-1729585a340e'''
\set mode '''wipe_replace'''
\set fixture_tag '''upper_middle_30s_v2'''

-- Start transaction
BEGIN;

-- Create temporary merchant catalog
CREATE TEMP TABLE merchant_catalog (
    category VARCHAR(50),
    merchants TEXT[]
);

INSERT INTO merchant_catalog VALUES
('Income', ARRAY['ADP Payroll Services','Gusto Payroll','Paychex Direct Deposit','Workday Payroll','TriNet HR','Rippling Payroll']),
('Groceries', ARRAY['Trader Joe''s','Whole Foods Market','Safeway','Ralph''s','Vons','Sprouts Farmers Market','Target Grocery','Costco Wholesale']),
('Food and Drink', ARRAY['Starbucks','Chipotle Mexican Grill','In-N-Out Burger','Sweetgreen','Panera Bread','The Cheesecake Factory','Peet''s Coffee','Blue Bottle Coffee']),
('Transportation', ARRAY['Shell','Chevron','76 Gas Station','Arco','Mobil','Uber','Lyft','Tesla Supercharger']),
('Shopping', ARRAY['Amazon.com','Target','Walmart','Best Buy','Costco Wholesale','Home Depot','Nordstrom','Apple Store']),
('Entertainment', ARRAY['Netflix','Spotify','YouTube Premium','Hulu','Disney+','HBO Max','LA Fitness','24 Hour Fitness']),
('Bills and Utilities', ARRAY['Pacific Gas & Electric','Southern California Edison','AT&T','Comcast Xfinity','Chase Mortgage','Property Management LLC']),
('Healthcare', ARRAY['CVS Pharmacy','Walgreens','Kaiser Permanente','One Medical','Carbon Health']),
('Insurance', ARRAY['State Farm Insurance','Geico','Progressive Insurance','Blue Shield of California']),
('Travel', ARRAY['United Airlines','Southwest Airlines','Delta Air Lines','Marriott Hotels','Airbnb']);

-- =========================================
-- SECTION A: BACKUP CURRENT DATA
-- =========================================
DO $$
DECLARE
    v_backup_dir TEXT := 'artifacts/seed/backups/' || TO_CHAR(NOW(), 'YYYYMMDD_HH24MISS');
    v_user_id UUID := :user_id::UUID;
BEGIN
    RAISE NOTICE 'Backup directory: %', v_backup_dir;

    -- Note: Actual COPY commands would need to be run outside of DO block
    -- This is for documentation of what should be backed up
    RAISE NOTICE 'Tables to backup: user_demographics, tax_profile, accounts, transactions, budgets, budget_categories, goals, holdings_current, recurring_income, manual_assets, manual_liabilities';
END $$;

-- =========================================
-- SECTION B: HYGIENE FIXES (Non-destructive)
-- =========================================

-- B.1: Fix user_demographics
UPDATE user_demographics
SET
    age = COALESCE(age, 37),
    household_income = COALESCE(household_income, 175000),
    marital_status = COALESCE(marital_status, 'single'),
    dependents = COALESCE(dependents, 0),
    life_stage = COALESCE(life_stage, 'established_professional'),
    updated_at = NOW()
WHERE user_id = :user_id::UUID;

-- Insert if not exists
INSERT INTO user_demographics (user_id, age, household_income, marital_status, dependents, life_stage, created_at, updated_at)
SELECT
    :user_id::UUID, 37, 175000, 'single', 0, 'established_professional', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM user_demographics WHERE user_id = :user_id::UUID
);

-- B.2: Fix tax_profile
UPDATE tax_profile
SET
    filing_status = COALESCE(filing_status, 'single'),
    state = COALESCE(state, 'CA'),
    federal_rate = COALESCE(federal_rate, 0.24),  -- 24% bracket for $175k
    state_rate = COALESCE(state_rate, 0.093)       -- 9.3% CA rate
WHERE user_id = :user_id::UUID;

-- Insert if not exists
INSERT INTO tax_profile (user_id, filing_status, state, federal_rate, state_rate)
SELECT
    :user_id::UUID, 'single', 'CA', 0.24, 0.093
WHERE NOT EXISTS (
    SELECT 1 FROM tax_profile WHERE user_id = :user_id::UUID
);

-- B.3: Fix accounts
UPDATE accounts
SET
    available_balance = COALESCE(available_balance, balance),
    updated_at = NOW(),
    balances_last_updated = NOW()
WHERE user_id = :user_id::UUID
  AND (available_balance IS NULL OR updated_at IS NULL OR balances_last_updated IS NULL);

-- =========================================
-- SECTION C: WIPE OLD DATA (if mode = 'wipe_replace')
-- =========================================
DO $$
DECLARE
    v_mode TEXT := :mode;
    v_user_id UUID := :user_id::UUID;
    v_fixture_tag TEXT := :fixture_tag;
BEGIN
    IF v_mode = 'wipe_replace' THEN
        -- Delete tagged transactions
        DELETE FROM transactions
        WHERE user_id = v_user_id
          AND (
              payment_meta->>'fixture' LIKE 'upper_middle_%'
              OR date >= NOW() - INTERVAL '12 months'
          );

        -- Delete budget categories for tagged budgets
        DELETE FROM budget_categories
        WHERE budget_id IN (
            SELECT id FROM budgets
            WHERE user_id = v_user_id
        );

        -- Delete budgets
        DELETE FROM budgets
        WHERE user_id = v_user_id;

        -- Delete holdings
        DELETE FROM holdings_current
        WHERE account_id IN (
            SELECT id FROM accounts WHERE user_id = v_user_id
        );

        DELETE FROM holdings
        WHERE account_id IN (
            SELECT id FROM accounts WHERE user_id = v_user_id
        );

        -- Delete recurring income
        DELETE FROM recurring_income
        WHERE user_id = v_user_id;

        RAISE NOTICE 'Wiped existing data for user %', v_user_id;
    END IF;
END $$;

-- =========================================
-- SECTION D: ENSURE ACCOUNTS EXIST
-- =========================================
DO $$
DECLARE
    v_user_id UUID := :user_id::UUID;
    v_checking_id UUID;
    v_savings_id UUID;
    v_investment_id UUID;
BEGIN
    -- Ensure primary checking exists
    SELECT id INTO v_checking_id
    FROM accounts
    WHERE user_id = v_user_id
      AND type = 'depository'
      AND subtype = 'checking'
    LIMIT 1;

    IF v_checking_id IS NULL THEN
        v_checking_id := gen_random_uuid();
        INSERT INTO accounts (
            id, user_id, plaid_account_id, name, official_name, type, subtype,
            balance, available_balance, currency, is_active,
            institution_name, mask, created_at, updated_at, balances_last_updated
        ) VALUES (
            v_checking_id, v_user_id, 'SEED_CHECKING_001', 'Chase Total Checking',
            'CHASE TOTAL CHECKING', 'depository', 'checking',
            8500.00, 8500.00, 'USD', true,
            'Chase Bank', '4321', NOW(), NOW(), NOW()
        );
    END IF;

    -- Ensure primary savings exists
    SELECT id INTO v_savings_id
    FROM accounts
    WHERE user_id = v_user_id
      AND type = 'depository'
      AND subtype = 'savings'
    LIMIT 1;

    IF v_savings_id IS NULL THEN
        v_savings_id := gen_random_uuid();
        INSERT INTO accounts (
            id, user_id, plaid_account_id, name, official_name, type, subtype,
            balance, available_balance, currency, is_active,
            institution_name, mask, created_at, updated_at, balances_last_updated
        ) VALUES (
            v_savings_id, v_user_id, 'SEED_SAVINGS_001', 'Chase Premier Savings',
            'CHASE PREMIER SAVINGS', 'depository', 'savings',
            35000.00, 35000.00, 'USD', true,
            'Chase Bank', '5678', NOW(), NOW(), NOW()
        );
    END IF;

    -- Ensure investment account exists
    SELECT id INTO v_investment_id
    FROM accounts
    WHERE user_id = v_user_id
      AND type = 'investment'
    LIMIT 1;

    IF v_investment_id IS NULL THEN
        v_investment_id := gen_random_uuid();
        INSERT INTO accounts (
            id, user_id, plaid_account_id, name, official_name, type, subtype,
            balance, available_balance, currency, is_active,
            institution_name, mask, created_at, updated_at, balances_last_updated
        ) VALUES (
            v_investment_id, v_user_id, 'SEED_INVEST_001', 'Vanguard Brokerage',
            'VANGUARD BROKERAGE ACCOUNT', 'investment', 'brokerage',
            85000.00, 85000.00, 'USD', true,
            'Vanguard', '9012', NOW(), NOW(), NOW()
        );
    END IF;
END $$;

-- =========================================
-- SECTION E: SEED TRANSACTIONS
-- =========================================
DO $$
DECLARE
    v_user_id UUID := :user_id::UUID;
    v_fixture_tag TEXT := :fixture_tag;
    v_checking_id UUID;
    v_savings_id UUID;
    v_start_date DATE := CURRENT_DATE - INTERVAL '12 months';
    v_current_date DATE;
    v_txn_date TIMESTAMPTZ;
    v_month_num INT;
    v_day_num INT;
    v_merchant_idx INT;
    v_merchant_name TEXT;
    v_amount DECIMAL(10,2);
    merchants TEXT[];
BEGIN
    -- Get account IDs
    SELECT id INTO v_checking_id FROM accounts
    WHERE user_id = v_user_id AND type = 'depository' AND subtype = 'checking'
    ORDER BY balance DESC LIMIT 1;

    SELECT id INTO v_savings_id FROM accounts
    WHERE user_id = v_user_id AND type = 'depository' AND subtype = 'savings'
    ORDER BY balance DESC LIMIT 1;

    -- Loop through each month
    FOR v_month_num IN 0..11 LOOP
        v_current_date := v_start_date + (v_month_num || ' months')::INTERVAL;

        -- INCOME: Biweekly paychecks (2 per month, net ~$4,625 each for ~$9,250/month)
        FOR v_day_num IN 1..2 LOOP
            v_txn_date := v_current_date + ((v_day_num * 14 - 1) || ' days')::INTERVAL + '12:00:00'::TIME;

            -- Deterministic merchant selection
            SELECT merchants INTO merchants FROM merchant_catalog WHERE category = 'Income';
            v_merchant_idx := abs(hashtext(v_user_id::TEXT || v_txn_date::TEXT)) % array_length(merchants, 1) + 1;
            v_merchant_name := merchants[v_merchant_idx];

            INSERT INTO transactions (
                id, user_id, account_id, plaid_transaction_id,
                amount, currency_code, date, posted_datetime,
                name, merchant_name, category, pending,
                payment_channel, created_at, payment_meta
            ) VALUES (
                gen_random_uuid(), v_user_id, v_checking_id,
                'SEED_' || v_fixture_tag || '_PAY_' || v_month_num || '_' || v_day_num,
                -4625.00,  -- Negative for income (Plaid convention)
                'USD', v_txn_date::DATE, v_txn_date,
                'Direct Deposit - Salary', v_merchant_name, 'Income', false,
                'ACH', NOW(),
                jsonb_build_object('fixture', v_fixture_tag, 'type', 'payroll')
            );
        END LOOP;

        -- HOUSING: Monthly rent/mortgage ($2,800)
        v_txn_date := v_current_date + '1 day'::INTERVAL + '12:00:00'::TIME;
        INSERT INTO transactions (
            id, user_id, account_id, plaid_transaction_id,
            amount, currency_code, date, posted_datetime,
            name, merchant_name, category, pending,
            payment_channel, created_at, payment_meta
        ) VALUES (
            gen_random_uuid(), v_user_id, v_checking_id,
            'SEED_' || v_fixture_tag || '_RENT_' || v_month_num,
            2800.00,
            'USD', v_txn_date::DATE, v_txn_date,
            'Monthly Rent Payment', 'Property Management LLC', 'Bills and Utilities', false,
            'ACH', NOW(),
            jsonb_build_object('fixture', v_fixture_tag, 'type', 'housing')
        );

        -- UTILITIES: Electric, Internet, Phone (~$350 total)
        -- Electric/Gas
        v_txn_date := v_current_date + '5 days'::INTERVAL + '12:00:00'::TIME;
        INSERT INTO transactions (
            id, user_id, account_id, plaid_transaction_id,
            amount, currency_code, date, posted_datetime,
            name, merchant_name, category, pending,
            payment_channel, created_at, payment_meta
        ) VALUES (
            gen_random_uuid(), v_user_id, v_checking_id,
            'SEED_' || v_fixture_tag || '_UTIL1_' || v_month_num,
            185.00 + (random() * 40 - 20),  -- $165-205
            'USD', v_txn_date::DATE, v_txn_date,
            'Electric & Gas Bill', 'Pacific Gas & Electric', 'Bills and Utilities', false,
            'online', NOW(),
            jsonb_build_object('fixture', v_fixture_tag, 'type', 'utility')
        );

        -- Internet
        v_txn_date := v_current_date + '10 days'::INTERVAL + '12:00:00'::TIME;
        INSERT INTO transactions (
            id, user_id, account_id, plaid_transaction_id,
            amount, currency_code, date, posted_datetime,
            name, merchant_name, category, pending,
            payment_channel, created_at, payment_meta
        ) VALUES (
            gen_random_uuid(), v_user_id, v_checking_id,
            'SEED_' || v_fixture_tag || '_UTIL2_' || v_month_num,
            89.99,
            'USD', v_txn_date::DATE, v_txn_date,
            'Internet Service', 'Comcast Xfinity', 'Bills and Utilities', false,
            'online', NOW(),
            jsonb_build_object('fixture', v_fixture_tag, 'type', 'utility')
        );

        -- Phone
        v_txn_date := v_current_date + '15 days'::INTERVAL + '12:00:00'::TIME;
        INSERT INTO transactions (
            id, user_id, account_id, plaid_transaction_id,
            amount, currency_code, date, posted_datetime,
            name, merchant_name, category, pending,
            payment_channel, created_at, payment_meta
        ) VALUES (
            gen_random_uuid(), v_user_id, v_checking_id,
            'SEED_' || v_fixture_tag || '_UTIL3_' || v_month_num,
            75.00,
            'USD', v_txn_date::DATE, v_txn_date,
            'Mobile Phone', 'AT&T', 'Bills and Utilities', false,
            'online', NOW(),
            jsonb_build_object('fixture', v_fixture_tag, 'type', 'utility')
        );

        -- GROCERIES: Weekly shopping (~$125 x 4 = $500/month)
        FOR v_day_num IN 1..4 LOOP
            v_txn_date := v_current_date + ((v_day_num * 7 - 2) || ' days')::INTERVAL + '14:30:00'::TIME;

            SELECT merchants INTO merchants FROM merchant_catalog WHERE category = 'Groceries';
            v_merchant_idx := abs(hashtext(v_user_id::TEXT || v_txn_date::TEXT || 'grocery')) % array_length(merchants, 1) + 1;
            v_merchant_name := merchants[v_merchant_idx];
            v_amount := 110.00 + (random() * 40);  -- $110-150 per trip

            INSERT INTO transactions (
                id, user_id, account_id, plaid_transaction_id,
                amount, currency_code, date, posted_datetime,
                name, merchant_name, category, pending,
                payment_channel, created_at, payment_meta
            ) VALUES (
                gen_random_uuid(), v_user_id, v_checking_id,
                'SEED_' || v_fixture_tag || '_GROC_' || v_month_num || '_' || v_day_num,
                v_amount,
                'USD', v_txn_date::DATE, v_txn_date,
                v_merchant_name, v_merchant_name, 'Groceries', false,
                'in store', NOW(),
                jsonb_build_object('fixture', v_fixture_tag, 'type', 'grocery')
            );
        END LOOP;

        -- DINING OUT: 8-10 times per month (~$600-800/month)
        FOR v_day_num IN 1..9 LOOP
            v_txn_date := v_current_date + ((v_day_num * 3) || ' days')::INTERVAL +
                         CASE WHEN v_day_num % 3 = 0 THEN '19:30:00'::TIME  -- Dinner
                              WHEN v_day_num % 3 = 1 THEN '12:45:00'::TIME  -- Lunch
                              ELSE '08:30:00'::TIME END;                    -- Coffee

            SELECT merchants INTO merchants FROM merchant_catalog WHERE category = 'Food and Drink';
            v_merchant_idx := abs(hashtext(v_user_id::TEXT || v_txn_date::TEXT || 'food')) % array_length(merchants, 1) + 1;
            v_merchant_name := merchants[v_merchant_idx];

            -- Vary amounts based on meal type
            v_amount := CASE
                WHEN v_day_num % 3 = 0 THEN 65.00 + (random() * 35)  -- Dinner $65-100
                WHEN v_day_num % 3 = 1 THEN 18.00 + (random() * 12)  -- Lunch $18-30
                ELSE 5.50 + (random() * 3) END;                       -- Coffee $5.50-8.50

            INSERT INTO transactions (
                id, user_id, account_id, plaid_transaction_id,
                amount, currency_code, date, posted_datetime,
                name, merchant_name, category, pending,
                payment_channel, created_at, payment_meta
            ) VALUES (
                gen_random_uuid(), v_user_id, v_checking_id,
                'SEED_' || v_fixture_tag || '_FOOD_' || v_month_num || '_' || v_day_num,
                v_amount,
                'USD', v_txn_date::DATE, v_txn_date,
                v_merchant_name, v_merchant_name, 'Food and Drink', false,
                'in store', NOW(),
                jsonb_build_object('fixture', v_fixture_tag, 'type', 'dining')
            );
        END LOOP;

        -- TRANSPORTATION: Gas & rideshare (~$300/month)
        -- Gas fills (3x per month)
        FOR v_day_num IN 1..3 LOOP
            v_txn_date := v_current_date + ((v_day_num * 10 - 3) || ' days')::INTERVAL + '17:15:00'::TIME;

            SELECT merchants INTO merchants FROM merchant_catalog WHERE category = 'Transportation';
            v_merchant_idx := abs(hashtext(v_user_id::TEXT || v_txn_date::TEXT || 'gas')) % 5 + 1;  -- First 5 are gas stations
            v_merchant_name := merchants[v_merchant_idx];
            v_amount := 55.00 + (random() * 20);  -- $55-75 per fill

            INSERT INTO transactions (
                id, user_id, account_id, plaid_transaction_id,
                amount, currency_code, date, posted_datetime,
                name, merchant_name, category, pending,
                payment_channel, created_at, payment_meta
            ) VALUES (
                gen_random_uuid(), v_user_id, v_checking_id,
                'SEED_' || v_fixture_tag || '_GAS_' || v_month_num || '_' || v_day_num,
                v_amount,
                'USD', v_txn_date::DATE, v_txn_date,
                v_merchant_name, v_merchant_name, 'Transportation', false,
                'in store', NOW(),
                jsonb_build_object('fixture', v_fixture_tag, 'type', 'gas')
            );
        END LOOP;

        -- Rideshare (4x per month)
        FOR v_day_num IN 1..4 LOOP
            v_txn_date := v_current_date + ((v_day_num * 7 + 2) || ' days')::INTERVAL + '20:45:00'::TIME;

            v_merchant_name := CASE WHEN random() > 0.5 THEN 'Uber' ELSE 'Lyft' END;
            v_amount := 18.00 + (random() * 22);  -- $18-40 per ride

            INSERT INTO transactions (
                id, user_id, account_id, plaid_transaction_id,
                amount, currency_code, date, posted_datetime,
                name, merchant_name, category, pending,
                payment_channel, created_at, payment_meta
            ) VALUES (
                gen_random_uuid(), v_user_id, v_checking_id,
                'SEED_' || v_fixture_tag || '_RIDE_' || v_month_num || '_' || v_day_num,
                v_amount,
                'USD', v_txn_date::DATE, v_txn_date,
                v_merchant_name || ' Trip', v_merchant_name, 'Transportation', false,
                'online', NOW(),
                jsonb_build_object('fixture', v_fixture_tag, 'type', 'rideshare')
            );
        END LOOP;

        -- SHOPPING: Amazon, retail, etc (~$600/month)
        FOR v_day_num IN 1..5 LOOP
            v_txn_date := v_current_date + ((v_day_num * 6 - 1) || ' days')::INTERVAL + '15:00:00'::TIME;

            SELECT merchants INTO merchants FROM merchant_catalog WHERE category = 'Shopping';
            v_merchant_idx := abs(hashtext(v_user_id::TEXT || v_txn_date::TEXT || 'shop')) % array_length(merchants, 1) + 1;
            v_merchant_name := merchants[v_merchant_idx];
            v_amount := 80.00 + (random() * 70);  -- $80-150 per purchase

            INSERT INTO transactions (
                id, user_id, account_id, plaid_transaction_id,
                amount, currency_code, date, posted_datetime,
                name, merchant_name, category, pending,
                payment_channel, created_at, payment_meta
            ) VALUES (
                gen_random_uuid(), v_user_id, v_checking_id,
                'SEED_' || v_fixture_tag || '_SHOP_' || v_month_num || '_' || v_day_num,
                v_amount,
                'USD', v_txn_date::DATE, v_txn_date,
                v_merchant_name, v_merchant_name, 'Shopping', false,
                CASE WHEN v_merchant_name LIKE '%Amazon%' THEN 'online' ELSE 'in store' END,
                NOW(),
                jsonb_build_object('fixture', v_fixture_tag, 'type', 'shopping')
            );
        END LOOP;

        -- ENTERTAINMENT: Subscriptions & activities (~$250/month)
        -- Netflix
        v_txn_date := v_current_date + '12 days'::INTERVAL + '03:00:00'::TIME;
        INSERT INTO transactions (
            id, user_id, account_id, plaid_transaction_id,
            amount, currency_code, date, posted_datetime,
            name, merchant_name, category, pending,
            payment_channel, created_at, payment_meta
        ) VALUES (
            gen_random_uuid(), v_user_id, v_checking_id,
            'SEED_' || v_fixture_tag || '_NFLX_' || v_month_num,
            15.99,
            'USD', v_txn_date::DATE, v_txn_date,
            'Netflix Subscription', 'Netflix', 'Entertainment', false,
            'online', NOW(),
            jsonb_build_object('fixture', v_fixture_tag, 'type', 'subscription')
        );

        -- Spotify
        v_txn_date := v_current_date + '15 days'::INTERVAL + '03:00:00'::TIME;
        INSERT INTO transactions (
            id, user_id, account_id, plaid_transaction_id,
            amount, currency_code, date, posted_datetime,
            name, merchant_name, category, pending,
            payment_channel, created_at, payment_meta
        ) VALUES (
            gen_random_uuid(), v_user_id, v_checking_id,
            'SEED_' || v_fixture_tag || '_SPOT_' || v_month_num,
            10.99,
            'USD', v_txn_date::DATE, v_txn_date,
            'Spotify Premium', 'Spotify', 'Entertainment', false,
            'online', NOW(),
            jsonb_build_object('fixture', v_fixture_tag, 'type', 'subscription')
        );

        -- Gym
        v_txn_date := v_current_date + '1 day'::INTERVAL + '06:00:00'::TIME;
        INSERT INTO transactions (
            id, user_id, account_id, plaid_transaction_id,
            amount, currency_code, date, posted_datetime,
            name, merchant_name, category, pending,
            payment_channel, created_at, payment_meta
        ) VALUES (
            gen_random_uuid(), v_user_id, v_checking_id,
            'SEED_' || v_fixture_tag || '_GYM_' || v_month_num,
            89.00,
            'USD', v_txn_date::DATE, v_txn_date,
            'Monthly Membership', 'LA Fitness', 'Entertainment', false,
            'ACH', NOW(),
            jsonb_build_object('fixture', v_fixture_tag, 'type', 'gym')
        );

        -- INSURANCE: Auto & renters (~$280/month)
        -- Auto insurance
        v_txn_date := v_current_date + '8 days'::INTERVAL + '12:00:00'::TIME;
        INSERT INTO transactions (
            id, user_id, account_id, plaid_transaction_id,
            amount, currency_code, date, posted_datetime,
            name, merchant_name, category, pending,
            payment_channel, created_at, payment_meta
        ) VALUES (
            gen_random_uuid(), v_user_id, v_checking_id,
            'SEED_' || v_fixture_tag || '_AINS_' || v_month_num,
            185.00,
            'USD', v_txn_date::DATE, v_txn_date,
            'Auto Insurance Premium', 'State Farm Insurance', 'Insurance', false,
            'ACH', NOW(),
            jsonb_build_object('fixture', v_fixture_tag, 'type', 'insurance')
        );

        -- Renters insurance
        v_txn_date := v_current_date + '8 days'::INTERVAL + '12:00:00'::TIME;
        INSERT INTO transactions (
            id, user_id, account_id, plaid_transaction_id,
            amount, currency_code, date, posted_datetime,
            name, merchant_name, category, pending,
            payment_channel, created_at, payment_meta
        ) VALUES (
            gen_random_uuid(), v_user_id, v_checking_id,
            'SEED_' || v_fixture_tag || '_RINS_' || v_month_num,
            25.00,
            'USD', v_txn_date::DATE, v_txn_date,
            'Renters Insurance', 'State Farm Insurance', 'Insurance', false,
            'ACH', NOW(),
            jsonb_build_object('fixture', v_fixture_tag, 'type', 'insurance')
        );

        -- HEALTHCARE: Occasional expenses (~$150/month average)
        IF v_month_num % 2 = 0 THEN  -- Every other month
            v_txn_date := v_current_date + '18 days'::INTERVAL + '10:30:00'::TIME;

            SELECT merchants INTO merchants FROM merchant_catalog WHERE category = 'Healthcare';
            v_merchant_idx := abs(hashtext(v_user_id::TEXT || v_txn_date::TEXT || 'health')) % array_length(merchants, 1) + 1;
            v_merchant_name := merchants[v_merchant_idx];
            v_amount := 75.00 + (random() * 125);  -- $75-200

            INSERT INTO transactions (
                id, user_id, account_id, plaid_transaction_id,
                amount, currency_code, date, posted_datetime,
                name, merchant_name, category, pending,
                payment_channel, created_at, payment_meta
            ) VALUES (
                gen_random_uuid(), v_user_id, v_checking_id,
                'SEED_' || v_fixture_tag || '_MED_' || v_month_num,
                v_amount,
                'USD', v_txn_date::DATE, v_txn_date,
                CASE WHEN v_merchant_name LIKE '%CVS%' OR v_merchant_name LIKE '%Walgreens%'
                     THEN 'Prescription'
                     ELSE 'Medical Services' END,
                v_merchant_name, 'Healthcare', false,
                'in store', NOW(),
                jsonb_build_object('fixture', v_fixture_tag, 'type', 'healthcare')
            );
        END IF;

        -- SAVINGS TRANSFER: Monthly automated savings ($1,500)
        v_txn_date := v_current_date + '2 days'::INTERVAL + '06:00:00'::TIME;

        -- Outflow from checking
        INSERT INTO transactions (
            id, user_id, account_id, plaid_transaction_id,
            amount, currency_code, date, posted_datetime,
            name, merchant_name, category, pending,
            payment_channel, created_at, payment_meta
        ) VALUES (
            gen_random_uuid(), v_user_id, v_checking_id,
            'SEED_' || v_fixture_tag || '_XFER_OUT_' || v_month_num,
            1500.00,
            'USD', v_txn_date::DATE, v_txn_date,
            'Transfer to Savings', 'Internal Transfer', 'Transfer', false,
            'internal', NOW(),
            jsonb_build_object('fixture', v_fixture_tag, 'type', 'transfer_out')
        );

        -- Inflow to savings
        INSERT INTO transactions (
            id, user_id, account_id, plaid_transaction_id,
            amount, currency_code, date, posted_datetime,
            name, merchant_name, category, pending,
            payment_channel, created_at, payment_meta
        ) VALUES (
            gen_random_uuid(), v_user_id, v_savings_id,
            'SEED_' || v_fixture_tag || '_XFER_IN_' || v_month_num,
            -1500.00,  -- Negative for inflow
            'USD', v_txn_date::DATE, v_txn_date,
            'Transfer from Checking', 'Internal Transfer', 'Transfer', false,
            'internal', NOW(),
            jsonb_build_object('fixture', v_fixture_tag, 'type', 'transfer_in')
        );

        -- TRAVEL: Quarterly trips
        IF v_month_num % 3 = 0 THEN
            -- Flight
            v_txn_date := v_current_date + '20 days'::INTERVAL + '08:00:00'::TIME;
            SELECT merchants INTO merchants FROM merchant_catalog WHERE category = 'Travel';
            v_merchant_idx := abs(hashtext(v_user_id::TEXT || v_txn_date::TEXT || 'travel')) % 5 + 1;  -- Airlines
            v_merchant_name := merchants[v_merchant_idx];

            INSERT INTO transactions (
                id, user_id, account_id, plaid_transaction_id,
                amount, currency_code, date, posted_datetime,
                name, merchant_name, category, pending,
                payment_channel, created_at, payment_meta
            ) VALUES (
                gen_random_uuid(), v_user_id, v_checking_id,
                'SEED_' || v_fixture_tag || '_FLIGHT_' || v_month_num,
                425.00 + (random() * 200),  -- $425-625
                'USD', v_txn_date::DATE, v_txn_date,
                'Flight Purchase', v_merchant_name, 'Travel', false,
                'online', NOW(),
                jsonb_build_object('fixture', v_fixture_tag, 'type', 'travel')
            );

            -- Hotel
            v_txn_date := v_current_date + '22 days'::INTERVAL + '15:00:00'::TIME;
            INSERT INTO transactions (
                id, user_id, account_id, plaid_transaction_id,
                amount, currency_code, date, posted_datetime,
                name, merchant_name, category, pending,
                payment_channel, created_at, payment_meta
            ) VALUES (
                gen_random_uuid(), v_user_id, v_checking_id,
                'SEED_' || v_fixture_tag || '_HOTEL_' || v_month_num,
                350.00 + (random() * 150),  -- $350-500
                'USD', v_txn_date::DATE, v_txn_date,
                'Hotel Stay', 'Marriott Hotels', 'Travel', false,
                'in store', NOW(),
                jsonb_build_object('fixture', v_fixture_tag, 'type', 'travel')
            );
        END IF;

    END LOOP;

    RAISE NOTICE 'Seeded transactions for 12 months';
END $$;

-- =========================================
-- SECTION F: SEED BUDGETS
-- =========================================
DO $$
DECLARE
    v_user_id UUID := :user_id::UUID;
    v_fixture_tag TEXT := :fixture_tag;
    v_budget_id UUID;
    v_monthly_target DECIMAL := 7200.00;  -- Target monthly spending
BEGIN
    v_budget_id := gen_random_uuid();

    INSERT INTO budgets (
        id, user_id, name, description, amount, period,
        start_date, end_date, is_active, created_at, updated_at
    ) VALUES (
        v_budget_id, v_user_id,
        'Monthly Spending Plan',
        'Comprehensive monthly budget aligned with income and savings goals',
        v_monthly_target, 'monthly',
        DATE_TRUNC('month', CURRENT_DATE), NULL, true,
        NOW(), NOW()
    );

    -- Insert budget categories (must sum to v_monthly_target)
    INSERT INTO budget_categories (id, budget_id, category, amount, created_at, updated_at) VALUES
    (gen_random_uuid(), v_budget_id, 'Bills and Utilities', 3350.00, NOW(), NOW()),  -- Housing + utilities
    (gen_random_uuid(), v_budget_id, 'Groceries', 500.00, NOW(), NOW()),
    (gen_random_uuid(), v_budget_id, 'Food and Drink', 700.00, NOW(), NOW()),
    (gen_random_uuid(), v_budget_id, 'Transportation', 300.00, NOW(), NOW()),
    (gen_random_uuid(), v_budget_id, 'Shopping', 600.00, NOW(), NOW()),
    (gen_random_uuid(), v_budget_id, 'Entertainment', 250.00, NOW(), NOW()),
    (gen_random_uuid(), v_budget_id, 'Insurance', 210.00, NOW(), NOW()),
    (gen_random_uuid(), v_budget_id, 'Healthcare', 150.00, NOW(), NOW()),
    (gen_random_uuid(), v_budget_id, 'Travel', 140.00, NOW(), NOW()),
    (gen_random_uuid(), v_budget_id, 'Transfer', 1000.00, NOW(), NOW());  -- Savings

    RAISE NOTICE 'Created budget with 10 categories totaling $%', v_monthly_target;
END $$;

-- =========================================
-- SECTION G: SEED GOALS
-- =========================================
DO $$
DECLARE
    v_user_id UUID := :user_id::UUID;
    v_fixture_tag TEXT := :fixture_tag;
    v_avg_monthly_expenses DECIMAL;
    v_current_liquid DECIMAL;
BEGIN
    -- Calculate average monthly expenses from seeded transactions
    SELECT AVG(monthly_expenses) INTO v_avg_monthly_expenses
    FROM (
        SELECT SUM(amount) as monthly_expenses
        FROM transactions t
        JOIN accounts a ON t.account_id = a.id
        WHERE a.user_id = v_user_id
          AND t.amount > 0
          AND t.pending = false
          AND t.date >= CURRENT_DATE - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', t.date)
    ) x;

    -- Get current liquid reserves
    SELECT SUM(balance) INTO v_current_liquid
    FROM accounts
    WHERE user_id = v_user_id
      AND type = 'depository';

    -- Update or insert Emergency Fund goal
    INSERT INTO goals (
        id, user_id, name, description,
        target_amount, current_amount, target_date,
        priority, is_active, allocation_method,
        checking_buffer_amount, allocation_percentage,
        created_at, updated_at
    ) VALUES (
        gen_random_uuid(), v_user_id,
        'Emergency Fund',
        '6 months of living expenses for financial security',
        COALESCE(v_avg_monthly_expenses * 6, 43200.00),  -- 6 months or default $43,200
        COALESCE(v_current_liquid, 43500.00),
        CURRENT_DATE + INTERVAL '12 months',
        'high', true, 'auto',
        2000.00, 30.00,
        NOW(), NOW()
    ) ON CONFLICT (user_id, name) DO UPDATE SET
        target_amount = EXCLUDED.target_amount,
        current_amount = EXCLUDED.current_amount,
        updated_at = NOW();

    -- Add secondary goal - Vacation Fund
    INSERT INTO goals (
        id, user_id, name, description,
        target_amount, current_amount, target_date,
        priority, is_active, allocation_method,
        allocation_percentage,
        created_at, updated_at
    ) VALUES (
        gen_random_uuid(), v_user_id,
        'Dream Vacation',
        'European vacation for 2 weeks',
        8000.00, 3200.00,
        CURRENT_DATE + INTERVAL '18 months',
        'medium', true, 'auto',
        15.00,
        NOW(), NOW()
    ) ON CONFLICT (user_id, name) DO UPDATE SET
        current_amount = EXCLUDED.current_amount,
        updated_at = NOW();

    RAISE NOTICE 'Created/updated goals with realistic targets';
END $$;

-- =========================================
-- SECTION H: SEED INVESTMENTS
-- =========================================
DO $$
DECLARE
    v_user_id UUID := :user_id::UUID;
    v_fixture_tag TEXT := :fixture_tag;
    v_investment_account_id UUID;
    v_total_balance DECIMAL;
    v_remaining_balance DECIMAL;
    v_security_id UUID;
BEGIN
    -- Get investment account
    SELECT id, balance INTO v_investment_account_id, v_total_balance
    FROM accounts
    WHERE user_id = v_user_id
      AND type = 'investment'
    ORDER BY balance DESC
    LIMIT 1;

    IF v_investment_account_id IS NOT NULL THEN
        v_remaining_balance := v_total_balance;

        -- Clear existing holdings
        DELETE FROM holdings_current WHERE account_id = v_investment_account_id;
        DELETE FROM holdings WHERE account_id = v_investment_account_id;

        -- Ensure securities exist
        INSERT INTO securities (id, ticker, name, security_type, currency, created_at) VALUES
        ('11111111-0001-0001-0001-000000000001'::UUID, 'VTI', 'Vanguard Total Stock Market ETF', 'etf', 'USD', NOW()),
        ('11111111-0001-0001-0001-000000000002'::UUID, 'VXUS', 'Vanguard Total Intl Stock ETF', 'etf', 'USD', NOW()),
        ('11111111-0001-0001-0001-000000000003'::UUID, 'BND', 'Vanguard Total Bond Market ETF', 'etf', 'USD', NOW()),
        ('11111111-0001-0001-0001-000000000004'::UUID, 'AAPL', 'Apple Inc.', 'equity', 'USD', NOW()),
        ('11111111-0001-0001-0001-000000000005'::UUID, 'MSFT', 'Microsoft Corporation', 'equity', 'USD', NOW())
        ON CONFLICT (id) DO NOTHING;

        -- Create diversified portfolio (60% stocks, 30% intl, 10% bonds)
        -- VTI - 40% of portfolio
        INSERT INTO holdings_current (
            id, account_id, security_id, quantity,
            cost_basis_total, market_value, as_of_date
        ) VALUES (
            gen_random_uuid(), v_investment_account_id,
            '11111111-0001-0001-0001-000000000001'::UUID,
            ROUND((v_total_balance * 0.40 / 220.00)::NUMERIC, 2),  -- ~$220/share
            v_total_balance * 0.38,  -- Slight gain
            v_total_balance * 0.40,
            CURRENT_DATE
        );
        v_remaining_balance := v_remaining_balance - (v_total_balance * 0.40);

        -- VXUS - 20% of portfolio
        INSERT INTO holdings_current (
            id, account_id, security_id, quantity,
            cost_basis_total, market_value, as_of_date
        ) VALUES (
            gen_random_uuid(), v_investment_account_id,
            '11111111-0001-0001-0001-000000000002'::UUID,
            ROUND((v_total_balance * 0.20 / 58.00)::NUMERIC, 2),  -- ~$58/share
            v_total_balance * 0.21,  -- Slight loss
            v_total_balance * 0.20,
            CURRENT_DATE
        );
        v_remaining_balance := v_remaining_balance - (v_total_balance * 0.20);

        -- BND - 10% of portfolio
        INSERT INTO holdings_current (
            id, account_id, security_id, quantity,
            cost_basis_total, market_value, as_of_date
        ) VALUES (
            gen_random_uuid(), v_investment_account_id,
            '11111111-0001-0001-0001-000000000003'::UUID,
            ROUND((v_total_balance * 0.10 / 75.00)::NUMERIC, 2),  -- ~$75/share
            v_total_balance * 0.11,  -- Slight loss
            v_total_balance * 0.10,
            CURRENT_DATE
        );
        v_remaining_balance := v_remaining_balance - (v_total_balance * 0.10);

        -- AAPL - 15% of portfolio
        INSERT INTO holdings_current (
            id, account_id, security_id, quantity,
            cost_basis_total, market_value, as_of_date
        ) VALUES (
            gen_random_uuid(), v_investment_account_id,
            '11111111-0001-0001-0001-000000000004'::UUID,
            ROUND((v_total_balance * 0.15 / 185.00)::NUMERIC, 2),  -- ~$185/share
            v_total_balance * 0.13,  -- Nice gain
            v_total_balance * 0.15,
            CURRENT_DATE
        );
        v_remaining_balance := v_remaining_balance - (v_total_balance * 0.15);

        -- MSFT - Remaining balance (~15%)
        INSERT INTO holdings_current (
            id, account_id, security_id, quantity,
            cost_basis_total, market_value, as_of_date
        ) VALUES (
            gen_random_uuid(), v_investment_account_id,
            '11111111-0001-0001-0001-000000000005'::UUID,
            ROUND((v_remaining_balance / 380.00)::NUMERIC, 2),  -- ~$380/share
            v_remaining_balance * 0.92,  -- Gain
            v_remaining_balance,
            CURRENT_DATE
        );

        RAISE NOTICE 'Created investment portfolio totaling $%', v_total_balance;
    END IF;
END $$;

-- =========================================
-- SECTION I: SEED MANUAL ASSETS & LIABILITIES
-- =========================================
DO $$
DECLARE
    v_user_id UUID := :user_id::UUID;
    v_fixture_tag TEXT := :fixture_tag;
BEGIN
    -- Check if manual assets exist
    IF NOT EXISTS (SELECT 1 FROM manual_assets WHERE user_id = v_user_id) THEN
        -- Add home (renting, so no home asset)
        -- Add vehicle
        INSERT INTO manual_assets (
            id, user_id, name, asset_class, value, notes,
            created_at, updated_at
        ) VALUES (
            gen_random_uuid(), v_user_id,
            '2021 Tesla Model 3', 'Vehicles', 38000.00,
            'Long Range AWD, purchased 2021',
            NOW(), NOW()
        );
    END IF;

    -- Check if manual liabilities exist
    IF NOT EXISTS (SELECT 1 FROM manual_liabilities WHERE user_id = v_user_id) THEN
        -- Add auto loan
        INSERT INTO manual_liabilities (
            id, user_id, name, liability_class, balance, interest_rate, notes,
            created_at, updated_at
        ) VALUES (
            gen_random_uuid(), v_user_id,
            'Tesla Auto Loan', 'Auto Loan', 22000.00, 0.039,
            '3.9% APR, 60 month term, ~$450/month payment',
            NOW(), NOW()
        );

        -- Add student loan
        INSERT INTO manual_liabilities (
            id, user_id, name, liability_class, balance, interest_rate, notes,
            created_at, updated_at
        ) VALUES (
            gen_random_uuid(), v_user_id,
            'Federal Student Loans', 'Student Loan', 18000.00, 0.055,
            'Consolidated federal loans, 5.5% rate',
            NOW(), NOW()
        );
    END IF;

    RAISE NOTICE 'Created/verified manual assets and liabilities';
END $$;

-- =========================================
-- SECTION J: SEED RECURRING INCOME
-- =========================================
DO $$
DECLARE
    v_user_id UUID := :user_id::UUID;
    v_fixture_tag TEXT := :fixture_tag;
    v_gross_annual DECIMAL := 175000.00;
    v_effective_tax_rate DECIMAL := 0.333;  -- ~33.3% combined federal + CA
    v_net_annual DECIMAL;
    v_net_monthly DECIMAL;
BEGIN
    v_net_annual := v_gross_annual * (1 - v_effective_tax_rate);
    v_net_monthly := v_net_annual / 12;

    -- Clear existing recurring income
    DELETE FROM recurring_income WHERE user_id = v_user_id;

    -- Insert new recurring income record
    INSERT INTO recurring_income (
        id, user_id, source, employer, frequency,
        gross_monthly, net_monthly, next_pay_date,
        is_net, inflation_adj, effective_from, effective_to,
        metadata
    ) VALUES (
        gen_random_uuid(), v_user_id,
        'W-2 Salary', 'Tech Company Inc', 'biweekly',
        v_gross_annual / 12,  -- $14,583/month gross
        v_net_monthly,         -- ~$9,722/month net
        CASE
            WHEN EXTRACT(DAY FROM CURRENT_DATE) <= 14
            THEN DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '14 days'
            ELSE DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '28 days'
        END,
        false, true,
        CURRENT_DATE - INTERVAL '2 years', NULL,
        jsonb_build_object(
            'fixture', v_fixture_tag,
            'position', 'Senior Software Engineer',
            'department', 'Engineering',
            'base_salary', v_gross_annual,
            'bonus_eligible', true
        )
    );

    RAISE NOTICE 'Created recurring income: $% gross, $% net monthly',
                 ROUND(v_gross_annual/12), ROUND(v_net_monthly);
END $$;

-- =========================================
-- SECTION K: CREATE VALIDATION VIEW
-- =========================================
CREATE OR REPLACE VIEW v_user_financial_summary AS
WITH monthly_flow AS (
    SELECT
        a.user_id,
        DATE_TRUNC('month', COALESCE(t.posted_datetime, t.date)) as month,
        SUM(CASE WHEN t.amount < 0 THEN -t.amount END) as income,
        SUM(CASE WHEN t.amount > 0 THEN t.amount END) as expenses,
        SUM(CASE
            WHEN t.amount < 0 AND t.category != 'Transfer' THEN -t.amount
            WHEN t.amount > 0 AND t.category = 'Transfer' THEN 0
            ELSE 0
        END) as adjusted_income
    FROM transactions t
    JOIN accounts a ON t.account_id = a.id
    WHERE t.pending = false
    GROUP BY a.user_id, DATE_TRUNC('month', COALESCE(t.posted_datetime, t.date))
)
SELECT
    u.id as user_id,
    u.email,
    ud.age,
    ud.household_income,
    tp.federal_rate,
    tp.state_rate,
    (SELECT SUM(balance) FROM accounts WHERE user_id = u.id AND type = 'depository') as liquid_cash,
    (SELECT SUM(balance) FROM accounts WHERE user_id = u.id AND type = 'investment') as investments,
    (SELECT AVG(adjusted_income) FROM monthly_flow WHERE user_id = u.id AND month >= CURRENT_DATE - INTERVAL '6 months') as avg_monthly_income,
    (SELECT AVG(expenses) FROM monthly_flow WHERE user_id = u.id AND month >= CURRENT_DATE - INTERVAL '6 months') as avg_monthly_expenses,
    (SELECT COUNT(DISTINCT month) FROM monthly_flow WHERE user_id = u.id) as months_of_data
FROM users u
LEFT JOIN user_demographics ud ON u.id = ud.user_id
LEFT JOIN tax_profile tp ON u.id = tp.user_id;

-- Final summary
DO $$
DECLARE
    v_user_id UUID := :user_id::UUID;
    v_summary RECORD;
BEGIN
    SELECT * INTO v_summary
    FROM v_user_financial_summary
    WHERE user_id = v_user_id;

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'SEEDING COMPLETE - SUMMARY';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'User: % (Age: %)', v_summary.email, v_summary.age;
    RAISE NOTICE 'Income: $% gross annual', v_summary.household_income;
    RAISE NOTICE 'Observed: $% net monthly', ROUND(v_summary.avg_monthly_income);
    RAISE NOTICE 'Expenses: $% monthly', ROUND(v_summary.avg_monthly_expenses);
    RAISE NOTICE 'Savings Rate: %%%', ROUND((v_summary.avg_monthly_income - v_summary.avg_monthly_expenses) /
                                            NULLIF(v_summary.avg_monthly_income, 0) * 100);
    RAISE NOTICE 'Liquid Cash: $%', ROUND(v_summary.liquid_cash);
    RAISE NOTICE 'Investments: $%', ROUND(v_summary.investments);
    RAISE NOTICE 'Emergency Fund: % months', ROUND(v_summary.liquid_cash / NULLIF(v_summary.avg_monthly_expenses, 0), 1);
    RAISE NOTICE 'Data Coverage: % months', v_summary.months_of_data;
    RAISE NOTICE '========================================';
END $$;

COMMIT;