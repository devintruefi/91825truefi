# TrueFi Test Data Seeding Suite

## Quick Start

### Prerequisites
- PostgreSQL 12+ with psycopg2
- Python 3.8+ with pip
- Environment variables or .env file with database credentials

### Installation
```bash
# Install Python dependencies
pip install psycopg2-binary

# Set environment variables
export PGHOST=localhost
export PGPORT=5433
export PGDATABASE=truefi_app_data
export PGUSER=truefi_user
export PGPASSWORD='truefi.ai101$'
```

## Usage

### 1. Preview Changes (Dry Run)
Always start with a dry run to see what will be changed:

```bash
python3 artifacts/seed/seed_user_v2.py \
  --user-id '136e2d19-e31d-4691-94cb-1729585a340e' \
  --dry-run
```

### 2. Apply Seeding (Wipe & Replace Mode)
This is the default mode - removes existing test data and creates fresh, consistent data:

```bash
python3 artifacts/seed/seed_user_v2.py \
  --user-id '136e2d19-e31d-4691-94cb-1729585a340e' \
  --apply \
  --mode wipe_replace \
  --fixture-tag 'upper_middle_30s_v2'
```

### 3. Apply Seeding (Merge Missing Mode)
Preserves existing data and only adds missing records:

```bash
python3 artifacts/seed/seed_user_v2.py \
  --user-id '136e2d19-e31d-4691-94cb-1729585a340e' \
  --apply \
  --mode merge_missing \
  --fixture-tag 'upper_middle_30s_v2'
```

### 4. Validate Results
Run comprehensive validation to ensure data integrity:

```bash
psql -h $PGHOST -U $PGUSER -d $PGDATABASE \
  -v user_id="'136e2d19-e31d-4691-94cb-1729585a340e'" \
  -f artifacts/seed/VALIDATION_v2.sql
```

## Seeding Modes

### wipe_replace (Default)
- **Removes**: Transactions from last 12 months, budgets, holdings, recurring income
- **Preserves**: User account, demographics, manual assets/liabilities
- **Creates**: Fresh, internally consistent financial data
- **Use when**: You need clean, predictable test data

### merge_missing
- **Removes**: Nothing
- **Preserves**: All existing data
- **Creates**: Only missing records (demographics, tax profile, etc.)
- **Use when**: You want to fix NULL values without losing transaction history

## What Gets Seeded

### User Profile
- **Demographics**: Age 37, $175k income, single, CA resident
- **Tax Profile**: 24% federal, 9.3% CA state tax rates
- **Preferences**: Timezone, currency, risk tolerance

### Financial Accounts
- **Checking**: Primary transaction account (~$8,500)
- **Savings**: Emergency fund account (~$35,000)
- **Investment**: Brokerage account (~$85,000)

### Transactions (12 months)
- **Income**: Biweekly paychecks ($4,625 net each)
- **Housing**: Monthly rent ($2,800)
- **Utilities**: Electric, internet, phone (~$350/month)
- **Groceries**: Weekly shopping (~$500/month)
- **Dining**: Restaurants & coffee (~$700/month)
- **Transportation**: Gas & rideshare (~$300/month)
- **Shopping**: Amazon, retail (~$600/month)
- **Entertainment**: Subscriptions, gym (~$250/month)
- **Insurance**: Auto, renters (~$210/month)
- **Healthcare**: Occasional medical (~$150/month)
- **Savings**: Monthly transfer ($1,500)
- **Travel**: Quarterly trips

### Budget
- Monthly budget: $7,200
- 10 categories aligned with spending patterns
- Balanced to exactly match total

### Goals
- **Emergency Fund**: 6 months expenses (~$43,200)
- **Dream Vacation**: $8,000 target

### Investments
- Diversified portfolio: 60% stocks, 20% international, 10% bonds, 10% individual stocks
- Holdings: VTI, VXUS, BND, AAPL, MSFT
- Total matches account balance (±2%)

### Income & Liabilities
- **Recurring Income**: Biweekly salary record
- **Assets**: Vehicle ($38,000)
- **Liabilities**: Auto loan ($22,000), Student loan ($18,000)

## Fixture Tags

Fixture tags track which data was seeded for easy cleanup:
- `upper_middle_30s_v2` - Default persona (CA professional)
- Custom tags supported via `--fixture-tag`

All seeded data includes the fixture tag in metadata for tracking.

## Files in This Suite

| File | Purpose |
|------|---------|
| `SCHEMA_AUDIT.md` | Complete database schema analysis |
| `ANOMALY_REPORT.md` | Current data issues and fixes |
| `merchant_catalog.json` | Realistic merchant names by category |
| `SEED_INTELLIGENT.sql` | Core SQL seeding logic |
| `seed_user_v2.py` | Python CLI wrapper with dry-run |
| `VALIDATION_v2.sql` | Comprehensive validation queries |
| `RECOMMENDATIONS.md` | Performance optimization suggestions |
| `README.md` | This file |

## Validation Checks

The validation suite checks:
- ✅ No orphan transactions
- ✅ All transactions have posted_datetime and USD currency
- ✅ Budget categories sum equals total
- ✅ Monthly income in range $9,000-9,800
- ✅ Monthly expenses in range $6,800-7,600
- ✅ Savings rate > 10%
- ✅ Emergency fund 4-6 months
- ✅ Investment holdings match account balance (±2%)
- ✅ No critical NULL values
- ✅ Accounts recently updated

## Troubleshooting

### Connection Issues
```bash
# Test connection
psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -c "SELECT 1"

# Check environment
env | grep PG
```

### Permission Errors
```sql
-- Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO truefi_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO truefi_user;
```

### Rollback Changes
Backups are created in `artifacts/seed/backups/<timestamp>/`

```bash
# List backups
ls -la artifacts/seed/backups/

# Restore from backup (implement as needed)
python3 restore_backup.py --backup-dir artifacts/seed/backups/20250120_140000
```

## Advanced Usage

### Custom Merchant Catalog
```bash
python3 artifacts/seed/seed_user_v2.py \
  --user-id '136e2d19-e31d-4691-94cb-1729585a340e' \
  --apply \
  --merchant-catalog custom_merchants.json
```

### Seed Multiple Months
```bash
python3 artifacts/seed/seed_user_v2.py \
  --user-id '136e2d19-e31d-4691-94cb-1729585a340e' \
  --apply \
  --months 24  # Seed 24 months of data
```

### Different Personas
Modify targets in seed_user_v2.py:
```python
self.targets = {
    'gross_annual': 250000,  # Higher income
    'net_monthly_min': 13000,
    'net_monthly_max': 14500,
    'expenses_monthly_min': 9000,
    'expenses_monthly_max': 10500,
}
```

## Performance Tips

1. **Use wipe_replace for testing** - Ensures consistent, predictable data
2. **Run validation after seeding** - Catches issues immediately
3. **Use fixture tags** - Makes cleanup and tracking easier
4. **Keep backups** - Automatic backups in dry-run show what will be backed up

## Support

For issues or questions:
1. Check `ANOMALY_REPORT.md` for known data issues
2. Review `SCHEMA_AUDIT.md` for schema details
3. See `RECOMMENDATIONS.md` for optimization tips

## License

Internal use only - TrueFi proprietary testing tools.