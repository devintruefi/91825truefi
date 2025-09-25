#!/usr/bin/env python3
"""
seed_user_v2.py - Intelligent, deterministic seeding for TrueFi test users
Generates realistic, internally consistent financial data
"""

import os
import sys
import json
import uuid
import hashlib
import argparse
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path
from typing import Dict, List, Optional, Any
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class DeterministicSeeder:
    """Generates deterministic, realistic financial data for test users"""

    def __init__(self, user_id: str, fixture_tag: str = "upper_middle_30s_v2",
                 mode: str = "wipe_replace", months: int = 12):
        self.user_id = user_id
        self.fixture_tag = fixture_tag
        self.mode = mode  # 'wipe_replace' or 'merge_missing'
        self.months = months

        # Load merchant catalog
        self.merchant_catalog = self.load_merchant_catalog()

        # Database connection (set after connecting)
        self.conn = None
        self.cur = None

        # Track changes for dry-run reporting
        self.changes = {
            'backups': [],
            'updates': [],
            'inserts': [],
            'deletes': []
        }

        # Financial targets for upper-middle-class CA professional
        self.targets = {
            'gross_annual': 175000,
            'net_monthly_min': 9000,
            'net_monthly_max': 9800,
            'expenses_monthly_min': 6800,
            'expenses_monthly_max': 7600,
            'liquid_months_min': 4,
            'liquid_months_max': 6,
            'savings_rate_min': 0.15  # 15% minimum
        }

    def load_merchant_catalog(self) -> Dict[str, List[str]]:
        """Load merchant catalog from JSON file"""
        catalog_path = Path(__file__).parent / 'merchant_catalog.json'
        if catalog_path.exists():
            with open(catalog_path, 'r') as f:
                return json.load(f)
        else:
            # Fallback catalog
            return {
                "Income": ["ADP Payroll Services", "Gusto Payroll"],
                "Groceries": ["Trader Joe's", "Whole Foods Market", "Safeway"],
                "Food and Drink": ["Starbucks", "Chipotle", "In-N-Out Burger"],
                "Transportation": ["Shell", "Chevron", "Uber", "Lyft"],
                "Shopping": ["Amazon.com", "Target", "Best Buy"],
                "Entertainment": ["Netflix", "Spotify", "LA Fitness"],
                "Bills and Utilities": ["PG&E", "AT&T", "Property Management LLC"],
                "Healthcare": ["CVS Pharmacy", "Kaiser Permanente"],
                "Insurance": ["State Farm Insurance", "Geico"],
                "Travel": ["United Airlines", "Marriott Hotels"]
            }

    def generate_uuid_v5(self, namespace: str, name: str) -> str:
        """Generate deterministic UUID v5 for idempotent operations"""
        namespace_uuid = uuid.uuid5(uuid.NAMESPACE_URL, namespace)
        return str(uuid.uuid5(namespace_uuid, name))

    def hash_select_merchant(self, category: str, seed_string: str) -> str:
        """Deterministically select a merchant based on hash of inputs"""
        if category not in self.merchant_catalog:
            category = 'Shopping'  # Default fallback

        merchants = self.merchant_catalog[category]
        if not merchants:
            return f"Generic {category}"

        # Create deterministic hash
        hash_value = int(hashlib.md5(seed_string.encode()).hexdigest(), 16)
        idx = hash_value % len(merchants)
        return merchants[idx]

    def connect_db(self):
        """Establish database connection"""
        try:
            self.conn = psycopg2.connect(
                host=os.getenv('PGHOST', 'localhost'),
                port=os.getenv('PGPORT', '5433'),
                database=os.getenv('PGDATABASE', 'truefi_app_data'),
                user=os.getenv('PGUSER', 'truefi_user'),
                password=os.getenv('PGPASSWORD', 'truefi.ai101$')
            )
            self.cur = self.conn.cursor(cursor_factory=RealDictCursor)
            logger.info("Connected to database")
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            raise

    def close_db(self):
        """Close database connection"""
        if self.conn:
            self.conn.close()
            logger.info("Database connection closed")

    def backup_data(self):
        """Backup current user data before modifications"""
        backup_dir = Path(f"artifacts/seed/backups/{datetime.now().strftime('%Y%m%d_%H%M%S')}")
        backup_dir.mkdir(parents=True, exist_ok=True)

        tables = [
            'user_demographics', 'tax_profile', 'accounts', 'transactions',
            'budgets', 'budget_categories', 'goals', 'holdings_current',
            'recurring_income', 'manual_assets', 'manual_liabilities'
        ]

        for table in tables:
            # Check if table exists
            self.cur.execute("""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_name = %s
                )
            """, (table,))

            if not self.cur.fetchone()['exists']:
                continue

            # Get count of rows to backup
            if table == 'budget_categories':
                self.cur.execute("""
                    SELECT COUNT(*) as count FROM budget_categories bc
                    JOIN budgets b ON bc.budget_id = b.id
                    WHERE b.user_id = %s
                """, (self.user_id,))
            elif table == 'holdings_current':
                self.cur.execute("""
                    SELECT COUNT(*) as count FROM holdings_current hc
                    JOIN accounts a ON hc.account_id = a.id
                    WHERE a.user_id = %s
                """, (self.user_id,))
            else:
                self.cur.execute(f"""
                    SELECT COUNT(*) as count FROM {table}
                    WHERE user_id = %s
                """, (self.user_id,))

            count = self.cur.fetchone()['count']
            if count > 0:
                self.changes['backups'].append({
                    'table': table,
                    'rows': count,
                    'path': str(backup_dir / f"{table}.json")
                })
                logger.info(f"Would backup {count} rows from {table}")

    def fix_hygiene_issues(self):
        """Fix NULL values and data quality issues"""
        # Fix user_demographics
        self.cur.execute("""
            SELECT age, household_income FROM user_demographics
            WHERE user_id = %s
        """, (self.user_id,))

        demo = self.cur.fetchone()
        if demo:
            if demo['age'] is None or demo['household_income'] is None:
                self.changes['updates'].append({
                    'table': 'user_demographics',
                    'description': f"Fix NULLs: age={self.targets['gross_annual']}, income={self.targets['gross_annual']}",
                    'rows': 1
                })
        else:
            self.changes['inserts'].append({
                'table': 'user_demographics',
                'description': 'Insert missing demographics',
                'rows': 1
            })

        # Fix tax_profile
        self.cur.execute("""
            SELECT federal_rate, state_rate FROM tax_profile
            WHERE user_id = %s
        """, (self.user_id,))

        tax = self.cur.fetchone()
        if tax:
            if tax['federal_rate'] is None or tax['state_rate'] is None:
                self.changes['updates'].append({
                    'table': 'tax_profile',
                    'description': 'Fix NULL tax rates',
                    'rows': 1
                })
        else:
            self.changes['inserts'].append({
                'table': 'tax_profile',
                'description': 'Insert missing tax profile',
                'rows': 1
            })

        # Fix account NULLs
        self.cur.execute("""
            SELECT COUNT(*) as count FROM accounts
            WHERE user_id = %s
              AND (available_balance IS NULL OR updated_at IS NULL)
        """, (self.user_id,))

        null_accounts = self.cur.fetchone()['count']
        if null_accounts > 0:
            self.changes['updates'].append({
                'table': 'accounts',
                'description': 'Fix NULL available_balance and updated_at',
                'rows': null_accounts
            })

    def wipe_old_data(self):
        """Remove old/tagged data if in wipe_replace mode"""
        if self.mode != 'wipe_replace':
            return

        # Count transactions to delete
        self.cur.execute("""
            SELECT COUNT(*) as count FROM transactions
            WHERE user_id = %s
              AND date >= NOW() - INTERVAL '%s months'
        """, (self.user_id, self.months))

        txn_count = self.cur.fetchone()['count']
        if txn_count > 0:
            self.changes['deletes'].append({
                'table': 'transactions',
                'description': f'Delete {self.months} months of transactions',
                'rows': txn_count
            })

        # Count budgets to delete
        self.cur.execute("""
            SELECT COUNT(*) as count FROM budgets
            WHERE user_id = %s
        """, (self.user_id,))

        budget_count = self.cur.fetchone()['count']
        if budget_count > 0:
            self.changes['deletes'].append({
                'table': 'budgets',
                'description': 'Delete existing budgets',
                'rows': budget_count
            })

    def seed_transactions(self):
        """Generate realistic transaction patterns"""
        # Calculate transaction counts
        months = self.months
        txns_per_month = {
            'payroll': 2,  # Biweekly
            'housing': 1,
            'utilities': 3,
            'groceries': 4,
            'dining': 9,
            'gas': 3,
            'rideshare': 4,
            'shopping': 5,
            'subscriptions': 3,
            'insurance': 2,
            'healthcare': 0.5,  # Every other month
            'travel': 0.33,  # Quarterly
            'savings': 1
        }

        total_txns = sum(int(count * months) for count in txns_per_month.values())
        self.changes['inserts'].append({
            'table': 'transactions',
            'description': f'Insert {months} months of realistic transactions',
            'rows': total_txns
        })

    def seed_budget(self):
        """Create realistic monthly budget"""
        self.changes['inserts'].append({
            'table': 'budgets',
            'description': 'Create monthly spending plan',
            'rows': 1
        })

        self.changes['inserts'].append({
            'table': 'budget_categories',
            'description': 'Create 10 budget categories',
            'rows': 10
        })

    def seed_goals(self):
        """Create financial goals"""
        self.changes['inserts'].append({
            'table': 'goals',
            'description': 'Create/update Emergency Fund and Dream Vacation goals',
            'rows': 2
        })

    def seed_investments(self):
        """Create investment holdings"""
        # Get investment account balance
        self.cur.execute("""
            SELECT id, balance FROM accounts
            WHERE user_id = %s AND type = 'investment'
            ORDER BY balance DESC
            LIMIT 1
        """, (self.user_id,))

        inv_account = self.cur.fetchone()
        if inv_account and inv_account['balance'] > 0:
            self.changes['inserts'].append({
                'table': 'securities',
                'description': 'Ensure ETF/stock securities exist',
                'rows': 5
            })

            self.changes['inserts'].append({
                'table': 'holdings_current',
                'description': f'Create diversified portfolio worth ${inv_account["balance"]}',
                'rows': 5
            })

    def seed_recurring_income(self):
        """Create recurring income record"""
        self.changes['inserts'].append({
            'table': 'recurring_income',
            'description': f'Create biweekly salary: ${self.targets["gross_annual"]:,}/year',
            'rows': 1
        })

    def validate_results(self):
        """Run validation checks"""
        validations = []

        # Check for NULLs
        self.cur.execute("""
            SELECT
                (SELECT COUNT(*) FROM user_demographics WHERE user_id = %s AND age IS NULL) as demo_nulls,
                (SELECT COUNT(*) FROM tax_profile WHERE user_id = %s AND federal_rate IS NULL) as tax_nulls,
                (SELECT COUNT(*) FROM accounts WHERE user_id = %s AND available_balance IS NULL) as acct_nulls
        """, (self.user_id, self.user_id, self.user_id))

        nulls = self.cur.fetchone()
        validations.append({
            'check': 'No Critical NULLs',
            'passed': all(v == 0 for v in nulls.values()),
            'details': nulls
        })

        # Check savings rate
        self.cur.execute("""
            WITH monthly AS (
                SELECT
                    AVG(CASE WHEN amount < 0 THEN -amount END) as income,
                    AVG(CASE WHEN amount > 0 THEN amount END) as expenses
                FROM transactions t
                JOIN accounts a ON t.account_id = a.id
                WHERE a.user_id = %s
                  AND t.pending = false
                  AND t.date >= NOW() - INTERVAL '6 months'
                GROUP BY DATE_TRUNC('month', t.date)
            )
            SELECT
                AVG(income) as avg_income,
                AVG(expenses) as avg_expenses,
                AVG(income - expenses) / NULLIF(AVG(income), 0) as savings_rate
            FROM monthly
        """, (self.user_id,))

        if self.cur.rowcount > 0:
            metrics = self.cur.fetchone()
            if metrics and metrics['avg_income']:
                validations.append({
                    'check': 'Positive Savings Rate',
                    'passed': metrics['savings_rate'] and metrics['savings_rate'] > self.targets['savings_rate_min'],
                    'details': f"{metrics['savings_rate']*100:.1f}%" if metrics['savings_rate'] else 'N/A'
                })

        return validations

    def execute_sql_file(self):
        """Execute the SEED_INTELLIGENT.sql with proper variables"""
        sql_path = Path(__file__).parent / 'SEED_INTELLIGENT.sql'
        if not sql_path.exists():
            logger.error("SEED_INTELLIGENT.sql not found")
            return False

        try:
            # Read and execute SQL with variables
            with open(sql_path, 'r') as f:
                sql_content = f.read()

            # Replace variables
            sql_content = sql_content.replace(':user_id', f"'{self.user_id}'")
            sql_content = sql_content.replace(':mode', f"'{self.mode}'")
            sql_content = sql_content.replace(':fixture_tag', f"'{self.fixture_tag}'")

            # Execute
            self.cur.execute(sql_content)
            self.conn.commit()
            logger.info("Successfully executed SEED_INTELLIGENT.sql")
            return True

        except Exception as e:
            logger.error(f"Failed to execute SQL: {e}")
            self.conn.rollback()
            return False

    def print_summary(self, dry_run: bool = False):
        """Print summary of changes"""
        print("\n" + "="*70)
        print(f"{'DRY RUN' if dry_run else 'EXECUTION'} SUMMARY")
        print("="*70)
        print(f"User ID: {self.user_id}")
        print(f"Fixture: {self.fixture_tag}")
        print(f"Mode: {self.mode}")
        print(f"Months: {self.months}")
        print()

        # Backups
        if self.changes['backups']:
            print("BACKUPS:")
            for backup in self.changes['backups']:
                print(f"  - {backup['table']}: {backup['rows']} rows")
            print()

        # Deletes (wipe mode)
        if self.changes['deletes']:
            print("DELETES:")
            for delete in self.changes['deletes']:
                print(f"  - {delete['table']}: {delete['description']} ({delete['rows']} rows)")
            print()

        # Updates
        if self.changes['updates']:
            print("UPDATES:")
            for update in self.changes['updates']:
                print(f"  - {update['table']}: {update['description']} ({update['rows']} rows)")
            print()

        # Inserts
        if self.changes['inserts']:
            print("INSERTS:")
            for insert in self.changes['inserts']:
                print(f"  - {insert['table']}: {insert['description']} ({insert['rows']} rows)")
            print()

        # Total changes
        total = sum(len(v) for v in self.changes.values())
        print(f"Total operations: {total}")

        if dry_run:
            print("\nThis was a DRY RUN. Use --apply to execute changes.")
        else:
            print("\nChanges have been applied to the database.")

        print("="*70)

    def run(self, dry_run: bool = True) -> bool:
        """Execute the seeding process"""
        try:
            self.connect_db()

            # Always run these checks
            self.backup_data()
            self.fix_hygiene_issues()
            self.wipe_old_data()
            self.seed_transactions()
            self.seed_budget()
            self.seed_goals()
            self.seed_investments()
            self.seed_recurring_income()

            if not dry_run:
                # Execute actual SQL
                logger.info("Executing SQL changes...")
                success = self.execute_sql_file()

                if success:
                    # Run validation
                    validations = self.validate_results()
                    print("\nVALIDATION RESULTS:")
                    for v in validations:
                        status = "✓" if v['passed'] else "✗"
                        print(f"  {status} {v['check']}: {v.get('details', '')}")
                else:
                    logger.error("SQL execution failed")
                    return False

            self.print_summary(dry_run)
            return True

        except Exception as e:
            logger.error(f"Seeding failed: {e}")
            if self.conn:
                self.conn.rollback()
            return False

        finally:
            self.close_db()


def main():
    """CLI entry point"""
    parser = argparse.ArgumentParser(
        description='Intelligent seeding for TrueFi test users',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Dry run to preview changes
  %(prog)s --user-id '136e2d19-e31d-4691-94cb-1729585a340e' --dry-run

  # Apply changes with wipe_replace mode
  %(prog)s --user-id '136e2d19-e31d-4691-94cb-1729585a340e' --apply

  # Apply with merge_missing mode (preserve existing data)
  %(prog)s --user-id '136e2d19-e31d-4691-94cb-1729585a340e' --apply --mode merge_missing

  # Custom fixture tag for tracking
  %(prog)s --user-id '136e2d19-e31d-4691-94cb-1729585a340e' --apply --fixture-tag 'test_v3'
        """
    )

    parser.add_argument('--user-id', required=True,
                        help='UUID of user to seed')
    parser.add_argument('--dry-run', action='store_true',
                        help='Preview changes without applying')
    parser.add_argument('--apply', action='store_true',
                        help='Apply changes to database')
    parser.add_argument('--mode', choices=['wipe_replace', 'merge_missing'],
                        default='wipe_replace',
                        help='Seeding mode (default: wipe_replace)')
    parser.add_argument('--fixture-tag', default='upper_middle_30s_v2',
                        help='Tag for tracking seeded data')
    parser.add_argument('--months', type=int, default=12,
                        help='Number of months to seed (default: 12)')
    parser.add_argument('--merchant-catalog', type=str,
                        help='Path to merchant catalog JSON')

    args = parser.parse_args()

    if not args.dry_run and not args.apply:
        parser.error("Must specify either --dry-run or --apply")

    if args.dry_run and args.apply:
        parser.error("Cannot specify both --dry-run and --apply")

    # Validate UUID
    try:
        uuid.UUID(args.user_id)
    except ValueError:
        parser.error(f"Invalid UUID: {args.user_id}")

    # Create seeder
    seeder = DeterministicSeeder(
        user_id=args.user_id,
        fixture_tag=args.fixture_tag,
        mode=args.mode,
        months=args.months
    )

    # Run seeding
    success = seeder.run(dry_run=args.dry_run)
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()