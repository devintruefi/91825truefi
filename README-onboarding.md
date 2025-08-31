# TrueFi.ai Onboarding - Testing Guide

## Test Mode

When `TEST_MODE=true` is set in your environment variables, the system provides deterministic sandbox data for testing.

### Sandbox Credentials

For Plaid sandbox testing, use these credentials:

- **Username**: `user_good`
- **Password**: `pass_good`
- **MFA Device**: Select "Device" when prompted
- **MFA Code**: `1234`
- **Institution**: Search for "First Platypus Bank" or any Plaid sandbox institution

### Environment Setup

```bash
# .env.local
TEST_MODE=true
PLAID_ENV=sandbox
PLAID_CLIENT_ID=your_sandbox_client_id
PLAID_SECRET=your_sandbox_secret
```

## Running Tests

### Headless Journey Test

Run the complete onboarding flow programmatically:

```bash
npm run test:onboarding:headless
```

This test:
- Drives the API step-by-step using componentResponse
- Verifies progress increments correctly
- Ensures "Coming next" matches the expected next step
- Validates income/budget/debt suggestions appear
- Tests error recovery for stale submissions

### Playwright E2E Test

Run the full UI test:

```bash
npm run test:e2e:onboarding
```

This test verifies:
- Income capture shows "Use detected ~$6,520/mo"
- Budget pie totals to 100% (not 0%)
- Only one debts_detail step appears (no duplicates)
- Emergency fund shows "Current: ~$X (Y months)"
- Plaid card doesn't reappear after successful connection
- Flow completes to celebrate_complete step

## Test Mode Behavior

When TEST_MODE=true:

### Plaid Exchange
- Returns deterministic sandbox accounts
- Auto-generates test transactions for last 90 days
- Creates consistent income pattern ($6,520/mo biweekly)

### Suggestions
Always provides:
```json
{
  "income_capture": {
    "monthly_net_income": 6520,
    "primary_employer": "Acme Inc",
    "pay_frequency": "biweekly",
    "variable_income_pct": 12
  },
  "expenses_capture": {
    "categories": {
      "Housing": 25,
      "Food": 12,
      "Transportation": 8,
      "Bills & Utilities": 6,
      "Insurance & Healthcare": 6,
      "Debt Payments": 8,
      "Savings & Investments": 15,
      "Discretionary": 15,
      "Other": 5
    }
  },
  "debts_detail": {
    "debts": [
      {
        "lender": "Chase Sapphire",
        "type": "credit_card",
        "balance": 2500,
        "apr": 18.99,
        "min_payment": 75
      }
    ]
  },
  "emergency_fund": {
    "current_amount": 8500,
    "current_months": 2.1,
    "recommended_months": 3
  }
}
```

## Onboarding Flow Steps

The canonical order (28 steps total):

1. **consent** - Privacy & consent checkboxes
2. **welcome** - Welcome message with start button
3. **main_goal** - Primary financial goal selection
4. **life_stage** - Current life stage
5. **dependents** - Number of dependents
6. **jurisdiction** - Country and state/province
7. **plaid_connection** - Connect bank accounts
8. **household** - Partner income, shared expenses
9. **income_capture** - Use detected/manual/variable
10. **manual_income** - Enter income details
11. **income_confirmation** - Confirm detected income
12. **pay_structure** - Employment type & variability
13. **benefits_equity** - Benefits checkboxes
14. **expenses_capture** - Budget pie chart
15. **debts_detail** - Consolidated debt entry
16. **housing** - Rent/own/other
17. **insurance** - Coverage checkboxes
18. **emergency_fund** - Months slider
19. **risk_tolerance** - 1-10 slider
20. **risk_capacity** - Short questionnaire
21. **goals_selection** - Pick 1-3 goals
22. **goal_parameters** - Amount/date for each
23. **budget_review** - Final budget adjustment
24. **savings_auto_rules** - Automation preferences
25. **plan_tradeoffs** - Optional tradeoff cards
26. **dashboard_preview** - Preview dashboard
27. **celebrate_complete** - Celebration screen
28. **complete** - Terminal state

## Debugging

### Check Current Step
```sql
SELECT current_step, is_complete 
FROM onboarding_progress 
WHERE user_id = 'YOUR_USER_ID';
```

### View Suggestions
```sql
SELECT rich_content->'suggestions' 
FROM chat_messages 
WHERE session_id = 'YOUR_SESSION_ID' 
AND message_type = 'system';
```

### Reset Onboarding
```sql
UPDATE onboarding_progress 
SET current_step = 'welcome', is_complete = false 
WHERE user_id = 'YOUR_USER_ID';
```

## Common Issues

### "Step stuck at 1 of 9"
- Verify ORDERED_STEPS is being used
- Check calculateProgress implementation

### "Income detection empty"
- Ensure plaidSyncAndSuggest runs after exchange
- Check suggestions endpoint returns data
- Verify TEST_MODE generates suggestions

### "Budget shows 0%"
- Check default categories in generateBudgetBaseline
- Ensure suggestions include expenses_capture data

### "Plaid card reappears"
- Check hasPlaidConnection flag in state
- Verify plaid_connections table has active connection

### "OUT_OF_SYNC errors"
- Ensure nonce/stepInstanceId match in requests
- Client must cancel in-flight requests on new message
- Server validates stepId matches current step