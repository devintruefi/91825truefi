# Plaid Auto-Detection Summary

## What Gets Automatically Detected When You Connect Plaid

### 1. 📊 **Assets (Auto-Calculated)**
When you connect your accounts, the system automatically detects:

- **Checking Accounts** - Balance from all checking accounts
- **Savings Accounts** - Including high-yield savings and HSAs
- **Investment Accounts** - Brokerage and investment account balances
- **Retirement Accounts** - 401(k), IRA, Roth IRA balances
- **Other Deposits** - CDs, money market accounts

**Total Assets** = Sum of all above

### 2. 💳 **Liabilities (Auto-Calculated)**
The system automatically identifies:

- **Credit Card Debt** - Current balances on all credit cards
- **Mortgage** - Outstanding mortgage balance
- **Auto Loans** - Car loan balances
- **Student Loans** - Education debt
- **Other Loans** - Personal loans, lines of credit

**Total Liabilities** = Sum of all above

### 3. 💰 **Monthly Income (Smart Detection)**
Advanced transaction analysis to find:

- **Payroll Deposits** - Detects salary, wages, direct deposits
- **Recurring Income** - Identifies regular income patterns
- **Frequency Detection**:
  - Bi-weekly pay (26 times/year) → Monthly calculation
  - Monthly pay → Direct monthly amount
  - Weekly/Other → Averaged to monthly
- **Keywords Searched**: payroll, salary, direct dep, wages, income, employer, pay, commission, bonus

### 4. 📈 **Net Worth (Auto-Calculated)**
**Net Worth = Total Assets - Total Liabilities**

### 5. 🎯 **Smart Flow Optimization**
- If Plaid is connected and assets/liabilities are detected:
  - **SKIPS** manual asset input step
  - **SKIPS** manual liability input step
  - Goes directly to dashboard preview after goals

## Flow Comparison

### With Plaid Connected:
1. Main Goal → 2. Life Stage → 3. **Connect Plaid** ✅ → 4. Income Confirmation → 5. Risk Tolerance → 6. Goals → 7. **Dashboard Preview** (with real data)

### Without Plaid:
1. Main Goal → 2. Life Stage → 3. Skip Plaid → 4. Manual Income → 5. Manual Expenses → 6. Risk Tolerance → 7. Goals → 8. **Manual Assets** → 9. **Manual Liabilities** → 10. Dashboard Preview

## Data Used in Dashboard Preview

When you reach the dashboard preview, it shows:
- **Net Worth**: Calculated from actual account balances
- **Monthly Income**: Detected from transaction patterns
- **Monthly Expenses**: Analyzed from spending patterns
- **Savings Rate**: (Income - Expenses) / Income
- **Account Count**: Number of connected accounts
- **Goals Progress**: Based on current balances vs targets

## Important Notes

### Sandbox Limitations:
- Plaid sandbox accounts have unrealistic data
- Income defaults to $5000 if detection fails
- Real production accounts will have accurate detection

### Manual Override Options:
- You can still adjust detected income if needed
- Additional assets (real estate, vehicles) can be added manually
- Non-bank liabilities can be added manually

## Testing in Sandbox

Use these Plaid sandbox credentials:
- Username: `user_good`
- Password: `pass_good`

This connects 10 sample accounts including:
- Checking, Savings, CD
- Credit Card
- IRA, 401k
- Student Loan, Mortgage
- HSA
- Business Credit Card

The system will automatically categorize and calculate your complete financial picture!