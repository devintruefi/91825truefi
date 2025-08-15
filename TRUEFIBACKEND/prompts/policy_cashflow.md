# Cash Flow Policy

## Purpose
Define how to handle cash flow analysis, liquidity classification, and retirement/credit account treatment.

## Liquidity Classification

### Liquid Assets (Available for immediate use)
- Cash and checking accounts
- Savings accounts  
- Money market accounts
- Taxable investment accounts (with liquidity discount)
- Crypto (with high volatility discount)

### Semi-Liquid Assets (Available with penalties/time)
- CDs (with early withdrawal penalty)
- Precious metals
- Real estate (very illiquid, long timeline)
- Collectibles (highly variable liquidity)

### Non-Liquid Assets (Not for immediate use)
- **401(k) accounts** - NEVER count as liquid
- **IRA accounts** - NEVER count as liquid
- **Retirement accounts** - NEVER count as liquid
- Pensions
- Annuities
- Life insurance cash value (unless explicitly borrowable)

### Liabilities (Never count as assets)
- **Credit card balances** - These are DEBTS, not cash
- Lines of credit - Available credit is not an asset
- HELOC - Available credit is not an asset

## Cash Flow Analysis

### Income Recognition
1. **Regular income**: Salary, wages, consistent sources
2. **Variable income**: Bonuses, commissions, gig work
   - Use 6-month average for stable (CV < 30%)
   - Use 3-month average for moderate (CV 30-50%)
   - Exclude if highly variable (CV > 50%)

### Expense Categorization
1. **Essential expenses**:
   - Housing (rent/mortgage)
   - Utilities
   - Food/groceries
   - Transportation
   - Insurance
   - Minimum debt payments

2. **Discretionary expenses**:
   - Entertainment
   - Dining out
   - Shopping
   - Hobbies
   - Non-essential subscriptions

### Budget Anomaly Detection
If budget values appear unrealistic (e.g., >$10,000/month for groceries):
1. Flag as `budgets_flagged_bad: true`
2. Use transaction-based estimates instead
3. Document in assumptions
4. Lower completeness score

## SQL Brief Interpretation
When receiving CashFlow Brief from SQL:
- `cash_depository`: Liquid funds
- `taxable_investments`: Liquid with discount
- `retirement_balances`: NON-LIQUID, for info only
- `cc_total_balance`: DEBT, not assets
- `essentials_avg_6m`: Use as baseline for expenses

## Output Requirements
Every cash flow analysis must clearly separate:
- Liquid vs non-liquid assets
- Gross vs net income
- Essential vs discretionary expenses
- One-time vs recurring items

## Never Do
- Never count retirement as liquid cash
- Never count credit card available balance as an asset
- Never use debt as positive cash flow
- Never ignore budget anomalies without flagging

## Auto-Generated Clarification (2025-08-11T21:18:38.658718)
### income_volatility_handling
For income sources marked as volatile, use historical variability (e.g., last 6 months) to adjust projected monthly income conservatively. Ensure that affordability calculations reflect reduced reliability of volatile income streams.
