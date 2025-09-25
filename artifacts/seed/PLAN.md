# TrueFi Test User Data Seeding Plan

## Executive Summary
Create a complete, realistic financial profile for test user Devin Patel (ID: 136e2d19-e31d-4691-94cb-1729585a340e) with internally consistent data across all financial tables.

## User Persona
- **Name:** Devin Patel
- **Age:** 37 (late 30s professional)
- **Location:** California (America/Los_Angeles timezone)
- **Income:** $160,000 gross annual W-2 income
- **Tax Situation:** Single filer, no dependents
- **Lifestyle:** Upper-middle-class professional with home ownership

## Financial Targets
- **Gross Annual Income:** $160,000
- **Net Monthly Income:** ~$9,200 (after federal 22% + CA 9.3% taxes)
- **Monthly Expenses:** $7,100 (77% spending rate)
- **Monthly Savings:** $2,100 (23% savings rate)
- **Emergency Fund:** 5 months of expenses (~$35,500 in liquid accounts)

## Data Fixes Required

### 1. User Demographics (NULL fixes)
- `age`: NULL → 37
- `household_income`: NULL → 160000
- Row count affected: 1

### 2. Tax Profile (NULL fixes)
- `federal_rate`: NULL → 0.22
- `state_rate`: NULL → 0.093
- Row count affected: 1

### 3. Accounts (7 existing accounts)
- Set `available_balance` = `balance` where NULL
- Set `updated_at` = NOW() where NULL
- Row count affected: 5

### 4. Transactions Seeding (6 months history)
Estimated new transactions: ~420 rows
- **Income:** 12 biweekly paychecks ($6,150 net each)
- **Housing:** Monthly mortgage payments ($2,100)
- **Utilities:** Electric, gas, water, internet (~$350/mo)
- **Insurance:** Auto, homeowners (~$400/mo)
- **Transportation:** Gas, maintenance (~$300/mo)
- **Food:** Groceries + dining (~$900/mo)
- **Shopping:** Amazon, clothing, misc (~$500/mo)
- **Entertainment:** Streaming, events (~$200/mo)
- **Healthcare:** Copays, prescriptions (~$150/mo)
- **Transfers:** Regular savings transfers ($2,000/mo)
- **Loan payments:** Auto ($450/mo), Student ($350/mo)

### 5. Budget Creation
- 1 active monthly budget with 10 categories
- Total: $7,100
- Categories aligned with actual spending patterns
- Row count: 1 budget + 10 budget_categories

### 6. Goals Updates
- Emergency Fund: Update to reflect 5-month target
- New Car Goal: Adjust to realistic progress
- Row count affected: 2

### 7. Investment Holdings
- Add 4-5 ETF/stock positions
- Total value: ~$52,000 (matching investment account balances)
- Row count: ~5 new holdings

### 8. Manual Assets/Liabilities Adjustments
Keep existing but ensure consistency:
- Home: $500,000 (keep)
- Mortgage: $300,000 (keep, add payment transactions)
- Car: $40,000 (keep)
- Auto Loan: $15,000 (keep, add payment transactions)
- Student Loan: $14,000 (keep, add payment transactions)

### 9. Recurring Income
- Add biweekly payroll entry
- Net: $6,150 per paycheck
- Row count: 1

## Implementation Approach

### Phase 1: Backup & Safety
1. Export current user data to CSV
2. Generate rollback SQL
3. Validate connection

### Phase 2: NULL Fixes
1. Update user_demographics
2. Update tax_profile
3. Update accounts

### Phase 3: Transaction Seeding
1. Delete any test/dummy transactions
2. Insert 6 months of realistic transactions
3. Ensure all have posted_datetime and pending=false

### Phase 4: Budget & Goals
1. Create/update active budget
2. Insert budget categories
3. Update goal amounts and dates

### Phase 5: Investments
1. Clear existing holdings for this user
2. Insert diversified portfolio
3. Ensure sum matches account balance

### Phase 6: Validation
1. Run invariant checks
2. Compute derived metrics
3. Generate summary report

## Expected Outcomes

### Key Metrics (Post-Seed)
- **Net Worth:** ~$268,000 (assets - liabilities)
- **Liquid Reserves:** $35,500 (5 months)
- **Monthly Income:** $9,200 observed
- **Monthly Expenses:** $7,100 observed
- **Savings Rate:** 23%
- **Investment Balance:** $52,000
- **Total Debt:** $329,000

### Invariants to Validate
1. No NULLs in critical fields ✓
2. Budget categories sum = total ✓
3. Holdings sum ≈ investment balance (±2%) ✓
4. Positive savings rate ✓
5. 4-6 months liquid reserves ✓
6. All transactions have pending=false ✓

## Files Generated
1. `SCHEMA_REPORT.md` - Database structure documentation
2. `PLAN.md` - This document
3. `SEED.sql` - Pure SQL implementation
4. `seed_user.py` - Python implementation with CLI
5. `VALIDATION.sql` - Post-seed checks
6. `SUMMARY.json` - Final metrics report
7. `ROLLBACK_<timestamp>.sql` - Reversion script
8. `RECOMMENDATIONS.md` - Schema improvement suggestions

## Quick Start

```bash
# Set environment
export PGHOST=localhost
export PGPORT=5433
export PGDATABASE=truefi_app_data
export PGUSER=truefi_user
export PGPASSWORD='truefi.ai101$'

# Dry run (preview changes)
python3 artifacts/seed/seed_user.py --user-id '136e2d19-e31d-4691-94cb-1729585a340e' --dry-run

# Apply changes
python3 artifacts/seed/seed_user.py --user-id '136e2d19-e31d-4691-94cb-1729585a340e' --apply

# Validate
psql -h $PGHOST -U $PGUSER -d $PGDATABASE -f artifacts/seed/VALIDATION.sql
```