# Affordability Policy

## Purpose
Guide consistent affordability calculations across all users, with clear handling of missing data and assumptions.

## Core Affordability Framework

### Housing Affordability (Purchase)
1. **Calculate maximum affordable price** based on:
   - Gross monthly income (from all sources)
   - Target DTI ratios:
     - Housing DTI (PITI): ≤ 28% of gross income
     - Total DTI: ≤ 43% of gross income (or custom limit)
   - Down payment available
   - Current interest rates
   - PMI requirements (if down payment < 20%)

2. **Include all housing costs**:
   - Principal & Interest (P&I)
   - Property taxes (use location-specific or national median)
   - Homeowners insurance
   - PMI (if applicable)
   - HOA fees (if known or estimated)
   - Maintenance reserve (1-2% of home value annually)

3. **Emergency fund requirements**:
   - Minimum 3-6 months expenses after down payment
   - Never deplete emergency fund for purchase

### Rental Affordability
1. **Maximum safe rent** = Lesser of:
   - 30% of gross monthly income
   - Amount that keeps total DTI ≤ 36%
   - Amount allowing target savings rate

2. **Consider total housing costs**:
   - Base rent
   - Utilities (if not included)
   - Renter's insurance
   - Parking (if applicable)

### When Income Data is Incomplete
1. **If recurring_income missing**:
   - Estimate from transaction deposits if available
   - Use conservative assumptions
   - Mark in data_gaps
   - Lower completeness_score

2. **If side gig/variable income**:
   - Use 6-month average if stable
   - Exclude if highly variable (CV > 50%)
   - Document assumption

### When Expense Data is Incomplete
1. **Essential expenses estimation**:
   - From transactions: Food, Utilities, Transportation, Insurance
   - If missing: Use percentage of income (40-50% typical)
   - Always document method in assumptions

2. **Debt service estimation**:
   - From manual_liabilities: Calculate minimum payments
   - Credit cards: 2% of balance or $25 minimum
   - Installment loans: Use standard amortization
   - If missing rates: Use conservative estimates

## Output Requirements
Every affordability calculation must include:
- Assumptions made (list all)
- Data gaps identified
- Confidence score (0.0-1.0)
- Sensitivity analysis (if requested)
- Verdict: PASS|NEEDS_DATA|WARN

## Never Do
- Never use hardcoded income for specific users
- Never assume zero expenses if data missing
- Never ignore emergency fund requirements
- Never calculate without documenting assumptions

## Auto-Generated Clarification (2025-08-11T21:18:38.648045)
### reserves_and_emergency_funds
When evaluating affordability, explicitly account for required cash reserves (e.g., months of essential expenses) separately from emergency funds, ensuring neither is reduced below the stated thresholds. Include PMI costs in monthly obligations if down payment is below standard thresholds.
