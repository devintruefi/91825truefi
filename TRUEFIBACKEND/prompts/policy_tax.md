# Tax Assumption Policy

## Purpose
Guide the Financial Modeling Agent in determining appropriate tax rates and assumptions when exact user location or tax data is unavailable.

## Tax Estimation Framework

### When Location is Known
If user provides city/state or it's available in profile:
1. **Estimate effective tax band** based on:
   - Federal tax brackets for given income level
   - State income tax (if applicable)
   - Local/city tax (if applicable)
   - Standard deductions and typical credits
   
2. **Express as a range**, not a fixed rate:
   - Example: "Effective tax rate 27-33% for NYC resident earning $120k"
   - Example: "Effective tax rate 22-28% for Texas resident (no state tax)"

3. **Log in assumptions**:
   - `effective_tax_rate_range: [lower_bound, upper_bound]`
   - `tax_jurisdiction: city, state`
   - `rationale: "Based on federal+state+local for income band"`

### When Location is Unknown
1. **Use conservative US-wide estimates**:
   - Income < $50k: 15-20% effective
   - Income $50k-$100k: 20-25% effective
   - Income $100k-$200k: 25-30% effective
   - Income > $200k: 30-35% effective

2. **Mark as data gap**:
   - Add to `data_gaps`: ["user_location_for_tax_precision"]
   
3. **Use midpoint of range for calculations**, document variance

### Property Tax Assumptions
- Known location: Use actual rates (research via context)
- Unknown location: Use US median 1.1% unless specified
- Always log source and assumptions

### Insurance and Cost Multipliers
- High-cost areas (if known): 1.1-1.3x multiplier
- Standard areas: 1.0x baseline
- Unknown: Use 1.0x and note in assumptions

## Output Requirements
Every tax calculation must include:
- Tax rate range (not single fixed percentage)
- Jurisdiction or "US_average" if unknown
- Rationale for the selected range
- Confidence level (high/medium/low)

## Never Do
- Never hardcode specific user names or IDs
- Never assume a single city/state for all users
- Never use fixed tax percentages without ranges
- Never fail to document tax assumptions