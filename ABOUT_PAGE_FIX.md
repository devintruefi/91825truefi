# About Page Field Saving Analysis

## Fields Currently in Form (about-me-form.tsx)

### ✅ SAVED CORRECTLY:
1. **Basic Info** - All saved to `users` table
   - country_code ✅
   - region_code ✅ 
   - first_name ✅
   - last_name ✅
   - default_checking_buffer ✅
   - auto_allocation_enabled ✅

2. **Identity** - Saved to `user_identity` table
   - city ✅
   - postal_code ✅
   - state ✅

3. **Demographics** - Saved to `user_demographics` table
   - marital_status ✅
   - dependents ✅

4. **Tax** - Saved to `tax_profile` table
   - filing_status ✅
   - tax_state ✅

5. **Preferences** - Saved to `user_preferences` table
   - risk_tolerance ✅
   - investment_horizon ✅
   - currency ✅
   - language ✅
   - timezone ✅
   - notifications_enabled ✅

6. **Financial Goals** - Saved to `user_preferences.financial_goals` JSONB
   - pay_schedule ✅
   - paycheck_day (as pay_days[0]) ✅
   - budget_framework ✅
   - target_savings_percent ✅
   - auto_budget_enabled ✅
   - housing_status ✅
   - monthly_housing_payment ✅
   - debt_strategy ✅
   - extra_payment_target ✅
   - student_loan_status ✅
   - prepay_mortgage ✅
   - investing_style ✅
   - account_priority ✅
   - dividend_reinvest ✅
   - rebalance_frequency ✅
   - rebalance_threshold ✅
   - job_stability ✅
   - income_sources ✅
   - liquid_cushion ✅
   - esg_investing ✅
   - crypto_investing ✅
   - real_estate_investing ✅
   - domestic_only_investing ✅

### ❌ NOT BEING SAVED (Missing in API):

1. **allocation_refresh_frequency** - Form field exists but not saved
   - Should be saved to `users` table or `user_preferences`

2. **advice_style** - Form field exists but not saved
   - Should be saved to `user_preferences.financial_goals` JSONB

3. **notification_channels** (email, push, sms) - Form field exists but not saved
   - email/push partially handled but sms missing
   - Should update `user_preferences` table

4. **upcoming_expenses** array - Form field exists but not saved
   - Should be saved to `user_preferences.financial_goals` JSONB

5. **retirement** object (has_401k, target_rate_percent) - Form field exists but not saved
   - Should be saved to `user_preferences.financial_goals` JSONB

## Required Fixes

The API endpoint `/api/profile/about-me` needs to be updated to handle these missing fields:

1. Add `allocation_refresh_frequency` to users table update
2. Add `advice_style` to financial_goals JSONB
3. Add proper handling for `notification_channels.sms`
4. Add `upcoming_expenses` array to financial_goals JSONB
5. Add `retirement` object to financial_goals JSONB