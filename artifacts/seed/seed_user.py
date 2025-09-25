#!/usr/bin/env python3
"""
TrueFi Test User Data Seeder
Creates realistic, internally consistent financial data for testing
"""

import os
import sys
import argparse
import psycopg2
from psycopg2.extras import RealDictCursor
import json
import csv
from datetime import datetime, timedelta, timezone
from decimal import Decimal
import uuid
import random
from typing import Dict, List, Any, Optional, Tuple
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class FinancialDataSeeder:
    """Seeds realistic financial data for a test user"""

    def __init__(self, user_id: str, fixture_tag: str = "upper_middle_30s_v1"):
        self.user_id = user_id
        self.fixture_tag = fixture_tag
        self.conn = None
        self.cur = None
        self.dry_run = True
        self.changes = {
            'updates': [],
            'inserts': [],
            'rollback': []
        }
        self.timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    def connect(self):
        """Establish database connection"""
        self.conn = psycopg2.connect(
            host=os.getenv('PGHOST', 'localhost'),
            port=os.getenv('PGPORT', '5433'),
            database=os.getenv('PGDATABASE', 'truefi_app_data'),
            user=os.getenv('PGUSER', 'truefi_user'),
            password=os.getenv('PGPASSWORD', 'truefi.ai101$')
        )
        self.cur = self.conn.cursor(cursor_factory=RealDictCursor)
        logger.info(f"Connected to database")

    def close(self):
        """Close database connection"""
        if self.cur:
            self.cur.close()
        if self.conn:
            self.conn.close()
        logger.info("Database connection closed")

    def backup_current_data(self):
        """Backup current user data before modifications"""
        backup_dir = f"/Users/keanepalmer/91825truefi/artifacts/seed/backups/{self.timestamp}"
        os.makedirs(backup_dir, exist_ok=True)

        tables = [
            'user_demographics', 'tax_profile', 'accounts', 'transactions',
            'budgets', 'budget_categories', 'goals', 'holdings_current',
            'manual_assets', 'manual_liabilities', 'recurring_income'
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

            # Export data - handle special cases
            if table == 'budget_categories':
                # budget_categories doesn't have user_id, join through budgets
                self.cur.execute("""
                    SELECT bc.* FROM budget_categories bc
                    JOIN budgets b ON bc.budget_id = b.id
                    WHERE b.user_id = %s
                """, (self.user_id,))
            elif table == 'holdings_current':
                # holdings_current doesn't have user_id, join through accounts
                self.cur.execute("""
                    SELECT hc.* FROM holdings_current hc
                    JOIN accounts a ON hc.account_id = a.id
                    WHERE a.user_id = %s
                """, (self.user_id,))
            else:
                # Standard tables with user_id
                self.cur.execute(f"""
                    SELECT * FROM {table}
                    WHERE user_id = %s
                """, (self.user_id,))

            rows = self.cur.fetchall()
            if rows:
                filepath = f"{backup_dir}/{table}.json"
                with open(filepath, 'w') as f:
                    json.dump([dict(row) for row in rows], f, default=str, indent=2)
                logger.info(f"Backed up {len(rows)} rows from {table}")

    def fix_user_demographics(self):
        """Fix NULL values in user_demographics"""
        # Check current state
        self.cur.execute("""
            SELECT * FROM user_demographics WHERE user_id = %s
        """, (self.user_id,))

        demo = self.cur.fetchone()

        if demo:
            updates = []
            if demo['age'] is None:
                updates.append("age = 37")
            if demo['household_income'] is None:
                updates.append("household_income = 160000")

            if updates:
                sql = f"""
                    UPDATE user_demographics
                    SET {', '.join(updates)}, updated_at = NOW()
                    WHERE user_id = %s
                """
                self.changes['updates'].append({
                    'table': 'user_demographics',
                    'sql': sql,
                    'params': (self.user_id,),
                    'description': f"Fix NULL values: {', '.join(updates)}"
                })
        else:
            # Insert new record
            sql = """
                INSERT INTO user_demographics (user_id, age, household_income, marital_status, dependents)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (user_id) DO UPDATE
                SET age = EXCLUDED.age,
                    household_income = EXCLUDED.household_income,
                    updated_at = NOW()
            """
            self.changes['inserts'].append({
                'table': 'user_demographics',
                'sql': sql,
                'params': (self.user_id, 37, 160000, 'single', 0),
                'description': 'Insert user demographics'
            })

    def fix_tax_profile(self):
        """Fix NULL values in tax_profile"""
        self.cur.execute("""
            SELECT * FROM tax_profile WHERE user_id = %s
        """, (self.user_id,))

        tax = self.cur.fetchone()

        if tax:
            updates = []
            if tax['federal_rate'] is None:
                updates.append("federal_rate = 0.22")
            if tax['state_rate'] is None:
                updates.append("state_rate = 0.093")
            if tax['state'] is None:
                updates.append("state = 'CA'")

            if updates:
                sql = f"""
                    UPDATE tax_profile
                    SET {', '.join(updates)}
                    WHERE user_id = %s
                """
                self.changes['updates'].append({
                    'table': 'tax_profile',
                    'sql': sql,
                    'params': (self.user_id,),
                    'description': f"Fix NULL values: {', '.join(updates)}"
                })
        else:
            # Insert new record
            sql = """
                INSERT INTO tax_profile (user_id, filing_status, federal_rate, state_rate, state)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (user_id) DO UPDATE
                SET federal_rate = EXCLUDED.federal_rate,
                    state_rate = EXCLUDED.state_rate,
                    state = EXCLUDED.state
            """
            self.changes['inserts'].append({
                'table': 'tax_profile',
                'sql': sql,
                'params': (self.user_id, 'single', 0.22, 0.093, 'CA'),
                'description': 'Insert tax profile'
            })

    def fix_accounts(self):
        """Fix NULL values in accounts"""
        self.cur.execute("""
            SELECT id, balance, available_balance, updated_at
            FROM accounts
            WHERE user_id = %s AND is_active = true
        """, (self.user_id,))

        for account in self.cur.fetchall():
            updates = []
            if account['available_balance'] is None and account['balance'] is not None:
                updates.append(f"available_balance = {account['balance']}")
            if account['updated_at'] is None:
                updates.append("updated_at = NOW()")

            if updates:
                sql = f"""
                    UPDATE accounts
                    SET {', '.join(updates)}
                    WHERE id = %s
                """
                self.changes['updates'].append({
                    'table': 'accounts',
                    'sql': sql,
                    'params': (account['id'],),
                    'description': f"Fix NULL values for account {account['id']}"
                })

    def seed_transactions(self):
        """Seed realistic transactions for 6 months"""
        # Get primary checking account
        self.cur.execute("""
            SELECT id FROM accounts
            WHERE user_id = %s AND type = 'depository' AND subtype = 'checking'
            ORDER BY balance DESC
            LIMIT 1
        """, (self.user_id,))
        checking = self.cur.fetchone()

        if not checking:
            logger.error("No checking account found")
            return

        checking_id = checking['id']

        # Get savings account
        self.cur.execute("""
            SELECT id FROM accounts
            WHERE user_id = %s AND type = 'depository' AND subtype = 'savings'
            ORDER BY balance DESC
            LIMIT 1
        """, (self.user_id,))
        savings = self.cur.fetchone()
        savings_id = savings['id'] if savings else checking_id

        # Clear existing dummy transactions
        sql_clear = """
            DELETE FROM transactions
            WHERE user_id = %s
            AND date >= NOW() - INTERVAL '6 months'
        """
        self.changes['updates'].append({
            'table': 'transactions',
            'sql': sql_clear,
            'params': (self.user_id,),
            'description': 'Clear existing transactions (last 6 months)'
        })

        # Generate 6 months of transactions
        transactions = []
        start_date = datetime.now(timezone.utc) - timedelta(days=180)

        # Biweekly paychecks
        paycheck_date = start_date
        while paycheck_date < datetime.now(timezone.utc):
            transactions.append({
                'id': str(uuid.uuid4()),
                'user_id': self.user_id,
                'account_id': checking_id,
                'amount': Decimal('6150.00'),  # Net after taxes
                'merchant_name': 'ADP Payroll - EMPLOYER INC',
                'category': 'Income',
                'date': paycheck_date,
                'posted_datetime': paycheck_date + timedelta(hours=6),
                'pending': False,
                'name': 'Direct Deposit - Payroll',
                'payment_channel': 'ACH'
            })
            paycheck_date += timedelta(days=14)

        # Monthly expenses
        for month in range(6):
            month_start = start_date + timedelta(days=30*month)

            # Mortgage payment (1st of month)
            transactions.append({
                'id': str(uuid.uuid4()),
                'user_id': self.user_id,
                'account_id': checking_id,
                'amount': Decimal('-2100.00'),
                'merchant_name': 'WELLS FARGO MORTGAGE',
                'category': 'Housing',
                'date': month_start.replace(day=1),
                'posted_datetime': month_start.replace(day=1) + timedelta(hours=8),
                'pending': False,
                'name': 'Mortgage Payment',
                'payment_channel': 'ACH'
            })

            # Auto loan (15th of month)
            transactions.append({
                'id': str(uuid.uuid4()),
                'user_id': self.user_id,
                'account_id': checking_id,
                'amount': Decimal('-450.00'),
                'merchant_name': 'CHASE AUTO FINANCE',
                'category': 'Transportation',
                'date': month_start.replace(day=15),
                'posted_datetime': month_start.replace(day=15) + timedelta(hours=8),
                'pending': False,
                'name': 'Auto Loan Payment',
                'payment_channel': 'ACH'
            })

            # Student loan (20th of month)
            transactions.append({
                'id': str(uuid.uuid4()),
                'user_id': self.user_id,
                'account_id': checking_id,
                'amount': Decimal('-350.00'),
                'merchant_name': 'NELNET',
                'category': 'Education',
                'date': month_start.replace(day=20),
                'posted_datetime': month_start.replace(day=20) + timedelta(hours=8),
                'pending': False,
                'name': 'Student Loan Payment',
                'payment_channel': 'ACH'
            })

            # Utilities
            transactions.extend([
                {
                    'id': str(uuid.uuid4()),
                    'user_id': self.user_id,
                    'account_id': checking_id,
                    'amount': Decimal(f'-{random.randint(80, 120)}.{random.randint(0, 99):02d}'),
                    'merchant_name': 'PG&E',
                    'category': 'Utilities',
                    'date': month_start.replace(day=5),
                    'posted_datetime': month_start.replace(day=5) + timedelta(hours=8),
                    'pending': False,
                    'name': 'Electric Bill',
                    'payment_channel': 'online'
                },
                {
                    'id': str(uuid.uuid4()),
                    'user_id': self.user_id,
                    'account_id': checking_id,
                    'amount': Decimal('-89.99'),
                    'merchant_name': 'COMCAST',
                    'category': 'Utilities',
                    'date': month_start.replace(day=10),
                    'posted_datetime': month_start.replace(day=10) + timedelta(hours=8),
                    'pending': False,
                    'name': 'Internet',
                    'payment_channel': 'online'
                }
            ])

            # Insurance
            transactions.extend([
                {
                    'id': str(uuid.uuid4()),
                    'user_id': self.user_id,
                    'account_id': checking_id,
                    'amount': Decimal('-185.00'),
                    'merchant_name': 'STATE FARM',
                    'category': 'Insurance',
                    'date': month_start.replace(day=8),
                    'posted_datetime': month_start.replace(day=8) + timedelta(hours=8),
                    'pending': False,
                    'name': 'Auto Insurance',
                    'payment_channel': 'ACH'
                },
                {
                    'id': str(uuid.uuid4()),
                    'user_id': self.user_id,
                    'account_id': checking_id,
                    'amount': Decimal('-145.00'),
                    'merchant_name': 'FARMERS INSURANCE',
                    'category': 'Insurance',
                    'date': month_start.replace(day=12),
                    'posted_datetime': month_start.replace(day=12) + timedelta(hours=8),
                    'pending': False,
                    'name': 'Homeowners Insurance',
                    'payment_channel': 'ACH'
                }
            ])

            # Regular savings transfer
            transactions.append({
                'id': str(uuid.uuid4()),
                'user_id': self.user_id,
                'account_id': checking_id,
                'amount': Decimal('-2000.00'),
                'merchant_name': 'Transfer to Savings',
                'category': 'Transfer',
                'date': month_start.replace(day=2),
                'posted_datetime': month_start.replace(day=2) + timedelta(hours=1),
                'pending': False,
                'name': 'Automatic Savings Transfer',
                'payment_channel': 'internal_transfer'
            })

            # Corresponding savings credit
            transactions.append({
                'id': str(uuid.uuid4()),
                'user_id': self.user_id,
                'account_id': savings_id,
                'amount': Decimal('2000.00'),
                'merchant_name': 'Transfer from Checking',
                'category': 'Transfer',
                'date': month_start.replace(day=2),
                'posted_datetime': month_start.replace(day=2) + timedelta(hours=1),
                'pending': False,
                'name': 'Automatic Savings Transfer',
                'payment_channel': 'internal_transfer'
            })

            # Variable expenses throughout the month
            # Groceries (weekly)
            for week in range(4):
                grocery_date = month_start + timedelta(days=7*week+3)
                if grocery_date < datetime.now(timezone.utc):
                    transactions.append({
                        'id': str(uuid.uuid4()),
                        'user_id': self.user_id,
                        'account_id': checking_id,
                        'amount': Decimal(f'-{random.randint(120, 180)}.{random.randint(0, 99):02d}'),
                        'merchant_name': random.choice(['WHOLE FOODS', 'SAFEWAY', 'TRADER JOES']),
                        'category': 'Food',
                        'date': grocery_date,
                        'posted_datetime': grocery_date + timedelta(hours=2),
                        'pending': False,
                        'name': 'Groceries',
                        'payment_channel': 'in_store'
                    })

            # Dining (2-3 times per week)
            for i in range(10):
                dining_date = month_start + timedelta(days=random.randint(1, 28))
                if dining_date < datetime.now(timezone.utc):
                    transactions.append({
                        'id': str(uuid.uuid4()),
                        'user_id': self.user_id,
                        'account_id': checking_id,
                        'amount': Decimal(f'-{random.randint(25, 75)}.{random.randint(0, 99):02d}'),
                        'merchant_name': random.choice([
                            'CHIPOTLE', 'STARBUCKS', 'SWEETGREEN',
                            'LOCAL RESTAURANT', 'UBER EATS', 'DOORDASH'
                        ]),
                        'category': 'Food',
                        'date': dining_date,
                        'posted_datetime': dining_date + timedelta(hours=1),
                        'pending': False,
                        'name': 'Restaurant',
                        'payment_channel': random.choice(['in_store', 'online'])
                    })

            # Gas (twice per month)
            for i in range(2):
                gas_date = month_start + timedelta(days=random.randint(5, 25))
                if gas_date < datetime.now(timezone.utc):
                    transactions.append({
                        'id': str(uuid.uuid4()),
                        'user_id': self.user_id,
                        'account_id': checking_id,
                        'amount': Decimal(f'-{random.randint(45, 65)}.{random.randint(0, 99):02d}'),
                        'merchant_name': random.choice(['CHEVRON', 'SHELL', 'MOBIL']),
                        'category': 'Transportation',
                        'date': gas_date,
                        'posted_datetime': gas_date + timedelta(hours=1),
                        'pending': False,
                        'name': 'Gas',
                        'payment_channel': 'in_store'
                    })

            # Shopping (3-4 times per month)
            for i in range(random.randint(3, 4)):
                shop_date = month_start + timedelta(days=random.randint(1, 28))
                if shop_date < datetime.now(timezone.utc):
                    transactions.append({
                        'id': str(uuid.uuid4()),
                        'user_id': self.user_id,
                        'account_id': checking_id,
                        'amount': Decimal(f'-{random.randint(30, 150)}.{random.randint(0, 99):02d}'),
                        'merchant_name': random.choice(['AMAZON', 'TARGET', 'NORDSTROM', 'BEST BUY']),
                        'category': 'Shopping',
                        'date': shop_date,
                        'posted_datetime': shop_date + timedelta(hours=3),
                        'pending': False,
                        'name': 'Shopping',
                        'payment_channel': 'online'
                    })

        # Subscriptions
        subscriptions = [
            ('NETFLIX', '-17.99', 'Entertainment'),
            ('SPOTIFY', '-10.99', 'Entertainment'),
            ('APPLE ICLOUD', '-9.99', 'Technology'),
            ('GYM MEMBERSHIP', '-89.00', 'Health')
        ]

        for merchant, amount, category in subscriptions:
            for month in range(6):
                sub_date = start_date + timedelta(days=30*month+15)
                if sub_date < datetime.now(timezone.utc):
                    transactions.append({
                        'id': str(uuid.uuid4()),
                        'user_id': self.user_id,
                        'account_id': checking_id,
                        'amount': Decimal(amount),
                        'merchant_name': merchant,
                        'category': category,
                        'date': sub_date,
                        'posted_datetime': sub_date + timedelta(hours=8),
                        'pending': False,
                        'name': 'Subscription',
                        'payment_channel': 'online'
                    })

        # Insert all transactions
        for txn in transactions:
            # Generate a unique plaid_transaction_id for seeded data
            plaid_id = f"SEED_{txn['id'][:8]}_{txn['date'].strftime('%Y%m%d')}"

            sql = """
                INSERT INTO transactions (
                    id, user_id, account_id, plaid_transaction_id, amount,
                    currency_code, merchant_name, category, date, posted_datetime,
                    pending, name, payment_channel, created_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
                ON CONFLICT (id) DO NOTHING
            """
            self.changes['inserts'].append({
                'table': 'transactions',
                'sql': sql,
                'params': (
                    txn['id'], txn['user_id'], txn['account_id'], plaid_id,
                    txn['amount'], 'USD', txn['merchant_name'], txn['category'],
                    txn['date'], txn['posted_datetime'], txn['pending'],
                    txn['name'], txn['payment_channel'], datetime.now(timezone.utc)
                ),
                'description': f"Insert transaction: {txn['merchant_name']} ({txn['amount']})"
            })

        logger.info(f"Prepared {len(transactions)} transactions for insertion")

    def seed_budget(self):
        """Create a realistic monthly budget"""
        # Check for existing budget
        self.cur.execute("""
            SELECT id FROM budgets
            WHERE user_id = %s AND is_active = true
        """, (self.user_id,))

        existing = self.cur.fetchone()

        if existing:
            budget_id = existing['id']
            # Update existing budget
            sql = """
                UPDATE budgets
                SET amount = %s, name = %s, period = %s, updated_at = NOW()
                WHERE id = %s
            """
            self.changes['updates'].append({
                'table': 'budgets',
                'sql': sql,
                'params': (7100, 'Monthly Budget', 'monthly', budget_id),
                'description': 'Update existing budget'
            })
        else:
            budget_id = str(uuid.uuid4())
            # Create new budget
            sql = """
                INSERT INTO budgets (id, user_id, name, amount, period, is_active, start_date, end_date)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """
            self.changes['inserts'].append({
                'table': 'budgets',
                'sql': sql,
                'params': (
                    budget_id, self.user_id, 'Monthly Budget', 7100,
                    'monthly', True, datetime.now(timezone.utc),
                    datetime.now(timezone.utc) + timedelta(days=365)
                ),
                'description': 'Create new budget'
            })

        # Clear existing categories
        sql_clear = """
            DELETE FROM budget_categories
            WHERE budget_id = %s
        """
        self.changes['updates'].append({
            'table': 'budget_categories',
            'sql': sql_clear,
            'params': (budget_id,),
            'description': 'Clear existing budget categories'
        })

        # Add budget categories
        categories = [
            ('Housing', 2100),      # 30% - Mortgage
            ('Transportation', 800), # 11% - Auto loan + gas + maintenance
            ('Food', 900),          # 13% - Groceries + dining
            ('Insurance', 330),     # 5% - Auto + home
            ('Utilities', 250),     # 3.5% - Electric + gas + water + internet
            ('Shopping', 500),      # 7% - Retail + online
            ('Entertainment', 200), # 3% - Subscriptions + events
            ('Healthcare', 150),    # 2% - Copays + prescriptions
            ('Education', 350),     # 5% - Student loan
            ('Personal', 520)       # 7% - Misc + buffer
        ]

        for category, amount in categories:
            cat_id = str(uuid.uuid4())
            sql = """
                INSERT INTO budget_categories (id, budget_id, category, amount)
                VALUES (%s, %s, %s, %s)
            """
            self.changes['inserts'].append({
                'table': 'budget_categories',
                'sql': sql,
                'params': (cat_id, budget_id, category, amount),
                'description': f'Add budget category: {category} (${amount})'
            })

    def update_goals(self):
        """Update existing goals to be realistic"""
        # Emergency Fund
        self.cur.execute("""
            SELECT id FROM goals
            WHERE user_id = %s AND name = 'Emergency Fund'
        """, (self.user_id,))

        emergency = self.cur.fetchone()
        if emergency:
            sql = """
                UPDATE goals
                SET target_amount = %s, current_amount = %s,
                    target_date = %s, priority = %s
                WHERE id = %s
            """
            self.changes['updates'].append({
                'table': 'goals',
                'sql': sql,
                'params': (
                    42600,  # 6 months × $7,100
                    35500,  # Current liquid savings (5 months)
                    datetime.now(timezone.utc) + timedelta(days=365),
                    'high',
                    emergency['id']
                ),
                'description': 'Update Emergency Fund goal'
            })

        # New Car goal
        self.cur.execute("""
            SELECT id FROM goals
            WHERE user_id = %s AND name = 'New Car'
        """, (self.user_id,))

        car = self.cur.fetchone()
        if car:
            sql = """
                UPDATE goals
                SET target_amount = %s, current_amount = %s,
                    target_date = %s, priority = %s
                WHERE id = %s
            """
            self.changes['updates'].append({
                'table': 'goals',
                'sql': sql,
                'params': (
                    50000,
                    12000,
                    datetime.now(timezone.utc) + timedelta(days=730),
                    'medium',
                    car['id']
                ),
                'description': 'Update New Car goal'
            })

    def seed_investments(self):
        """Seed investment holdings"""
        # Get investment account
        self.cur.execute("""
            SELECT id, balance FROM accounts
            WHERE user_id = %s AND type = 'investment'
            ORDER BY balance DESC
            LIMIT 1
        """, (self.user_id,))

        investment = self.cur.fetchone()
        if not investment:
            logger.warning("No investment account found")
            return

        account_id = investment['id']
        total_value = float(investment['balance']) if investment['balance'] else 52000

        # Clear existing holdings
        sql_clear = """
            DELETE FROM holdings_current
            WHERE account_id = %s
        """
        self.changes['updates'].append({
            'table': 'holdings_current',
            'sql': sql_clear,
            'params': (account_id,),
            'description': 'Clear existing holdings'
        })

        # Create diversified portfolio
        holdings = [
            ('VTI', 'Vanguard Total Stock Market ETF', 0.40, 120),  # 40% US stocks
            ('VXUS', 'Vanguard Total International Stock ETF', 0.25, 80),  # 25% International
            ('BND', 'Vanguard Total Bond Market ETF', 0.20, 50),  # 20% Bonds
            ('VNQ', 'Vanguard Real Estate ETF', 0.10, 30),  # 10% Real Estate
            ('AAPL', 'Apple Inc', 0.05, 10)  # 5% Individual stock
        ]

        for ticker, name, allocation, quantity in holdings:
            value = Decimal(str(total_value * allocation))
            price = value / quantity
            cost_basis = value * Decimal('0.85')  # Assume 15% gains

            # Check if security exists
            self.cur.execute("""
                SELECT id FROM securities WHERE ticker = %s
            """, (ticker,))

            security = self.cur.fetchone()
            if security:
                security_id = security['id']
            else:
                security_id = str(uuid.uuid4())
                # Insert security
                sql_sec = """
                    INSERT INTO securities (id, ticker, name, security_type)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (id) DO NOTHING
                """
                self.changes['inserts'].append({
                    'table': 'securities',
                    'sql': sql_sec,
                    'params': (security_id, ticker, name, 'etf' if 'ETF' in name else 'stock'),
                    'description': f'Insert security: {ticker}'
                })

            # Insert holding - holdings_current doesn't have user_id column
            sql = """
                INSERT INTO holdings_current (
                    id, account_id, security_id,
                    quantity, market_value, cost_basis_total, as_of_date
                ) VALUES (%s, %s, %s, %s, %s, %s, %s)
            """
            self.changes['inserts'].append({
                'table': 'holdings_current',
                'sql': sql,
                'params': (
                    str(uuid.uuid4()), account_id, security_id,
                    quantity, value, cost_basis, datetime.now(timezone.utc).date()
                ),
                'description': f'Insert holding: {ticker} ({quantity} shares)'
            })

    def seed_recurring_income(self):
        """Add recurring income record"""
        # Check if table exists
        self.cur.execute("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_name = 'recurring_income'
            )
        """)

        if not self.cur.fetchone()['exists']:
            logger.info("recurring_income table does not exist, skipping")
            return

        # Clear existing
        sql_clear = """
            DELETE FROM recurring_income WHERE user_id = %s
        """
        self.changes['updates'].append({
            'table': 'recurring_income',
            'sql': sql_clear,
            'params': (self.user_id,),
            'description': 'Clear existing recurring income'
        })

        # Insert new recurring income
        sql = """
            INSERT INTO recurring_income (
                id, user_id, source, employer, gross_monthly, net_monthly,
                frequency, next_pay_date, is_net, effective_from
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """

        next_pay = datetime.now(timezone.utc)
        # Find next Friday (typical payday)
        while next_pay.weekday() != 4:  # 4 = Friday
            next_pay += timedelta(days=1)

        self.changes['inserts'].append({
            'table': 'recurring_income',
            'sql': sql,
            'params': (
                str(uuid.uuid4()),
                self.user_id,
                'Salary',
                'EMPLOYER INC',
                13333,  # Monthly gross (160k/12)
                12300,  # Biweekly net × 2
                'biweekly',
                next_pay,
                False,
                datetime.now(timezone.utc) - timedelta(days=365)
            ),
            'description': 'Insert recurring income'
        })

    def generate_rollback_sql(self):
        """Generate SQL to rollback changes"""
        filepath = f"/Users/keanepalmer/91825truefi/artifacts/seed/ROLLBACK_{self.timestamp}.sql"

        with open(filepath, 'w') as f:
            f.write(f"-- Rollback script for seeding operation {self.timestamp}\n")
            f.write(f"-- User ID: {self.user_id}\n\n")

            # Add rollback statements
            f.write("BEGIN;\n\n")

            # Restore from backups would go here
            f.write("-- Rollback commands would restore from backup files\n")
            f.write("-- See backups/{timestamp}/*.json for original data\n\n")

            f.write("COMMIT;\n")

        logger.info(f"Rollback script written to {filepath}")

    def execute_changes(self):
        """Execute all prepared changes"""
        if self.dry_run:
            self.print_dry_run_summary()
            return

        try:
            # Execute updates
            for change in self.changes['updates']:
                self.cur.execute(change['sql'], change['params'])
                logger.info(f"Executed: {change['description']}")

            # Execute inserts
            for change in self.changes['inserts']:
                self.cur.execute(change['sql'], change['params'])
                logger.debug(f"Executed: {change['description']}")

            self.conn.commit()
            logger.info(f"All changes committed successfully")

        except Exception as e:
            self.conn.rollback()
            logger.error(f"Error executing changes: {e}")
            raise

    def print_dry_run_summary(self):
        """Print summary of changes that would be made"""
        print("\n" + "="*80)
        print("DRY RUN SUMMARY")
        print("="*80)

        # Count by table
        table_counts = {}
        for change in self.changes['updates'] + self.changes['inserts']:
            table = change['table']
            if table not in table_counts:
                table_counts[table] = {'updates': 0, 'inserts': 0}

            if change in self.changes['updates']:
                table_counts[table]['updates'] += 1
            else:
                table_counts[table]['inserts'] += 1

        print("\nChanges by table:")
        print(f"{'Table':<25} {'Updates':<10} {'Inserts':<10}")
        print("-"*45)
        for table in sorted(table_counts.keys()):
            counts = table_counts[table]
            print(f"{table:<25} {counts['updates']:<10} {counts['inserts']:<10}")

        print(f"\nTotal changes: {len(self.changes['updates']) + len(self.changes['inserts'])}")
        print("\nUse --apply to execute these changes")

    def validate(self):
        """Run validation checks"""
        validations = []

        # Check no NULLs in critical fields
        self.cur.execute("""
            SELECT
                ud.age, ud.household_income,
                tp.federal_rate, tp.state_rate
            FROM users u
            LEFT JOIN user_demographics ud ON u.id = ud.user_id
            LEFT JOIN tax_profile tp ON u.id = tp.user_id
            WHERE u.id = %s
        """, (self.user_id,))

        result = self.cur.fetchone()
        if result:
            null_checks = all([
                result['age'] is not None,
                result['household_income'] is not None,
                result['federal_rate'] is not None,
                result['state_rate'] is not None
            ])
            validations.append(('No NULLs in critical fields', null_checks))

        # Check budget categories sum
        self.cur.execute("""
            SELECT
                b.amount as total,
                SUM(bc.amount) as category_sum
            FROM budgets b
            LEFT JOIN budget_categories bc ON b.id = bc.budget_id
            WHERE b.user_id = %s AND b.is_active = true
            GROUP BY b.id, b.amount
        """, (self.user_id,))

        budget = self.cur.fetchone()
        if budget:
            budget_match = abs(float(budget['total']) - float(budget['category_sum'])) < 0.01
            validations.append(('Budget categories sum equals total', budget_match))

        # Generate summary
        summary = {
            'user_id': self.user_id,
            'timestamp': self.timestamp,
            'validations': {check: passed for check, passed in validations},
            'all_passed': all(passed for _, passed in validations)
        }

        # Write summary
        with open('/Users/keanepalmer/91825truefi/artifacts/seed/SUMMARY.json', 'w') as f:
            json.dump(summary, f, indent=2, default=str)

        return summary

    def run(self, dry_run=True):
        """Execute the complete seeding process"""
        self.dry_run = dry_run

        try:
            self.connect()

            if not dry_run:
                self.backup_current_data()
                self.generate_rollback_sql()

            # Execute fixes and seeds
            self.fix_user_demographics()
            self.fix_tax_profile()
            self.fix_accounts()
            self.seed_transactions()
            self.seed_budget()
            self.update_goals()
            self.seed_investments()
            self.seed_recurring_income()

            # Execute or preview
            self.execute_changes()

            if not dry_run:
                # Validate
                summary = self.validate()
                if not summary['all_passed']:
                    logger.warning("Some validations failed")
                    return False

            return True

        except Exception as e:
            logger.error(f"Seeding failed: {e}")
            if not dry_run:
                self.conn.rollback()
            raise

        finally:
            self.close()


def main():
    """CLI entry point"""
    parser = argparse.ArgumentParser(description='Seed realistic financial data for test user')
    parser.add_argument('--user-id', required=True, help='User ID to seed data for')
    parser.add_argument('--dry-run', action='store_true', help='Preview changes without applying')
    parser.add_argument('--apply', action='store_true', help='Apply changes to database')
    parser.add_argument('--fixture-tag', default='upper_middle_30s_v1', help='Fixture tag for tracking')

    args = parser.parse_args()

    if not args.dry_run and not args.apply:
        args.dry_run = True  # Default to dry run

    seeder = FinancialDataSeeder(args.user_id, args.fixture_tag)
    success = seeder.run(dry_run=args.dry_run)

    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()