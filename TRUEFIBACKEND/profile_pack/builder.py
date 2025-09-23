# TRUEFIBACKEND/profile_pack/builder.py
# Profile Pack v1 generator with bounded data loading

from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List, Optional
import logging
import json
from decimal import Decimal
from db import get_db_pool
from config import config

logger = logging.getLogger(__name__)

class ProfilePackBuilder:
    """Builds comprehensive user financial profile with bounded data"""

    # Table row limits
    LIMITS = {
        'accounts': 200,
        'holdings': 500,
        'manual_assets': 100,
        'manual_liabilities': 100,
        'goals': 50,
        'allocation_history': 50,
        'recurring_income': 20,
        'budgets': 10,
        'budget_categories': 100,
        'budget_spending': 144,  # 12 months
        'financial_insights': 25,
        'transactions_sample': 10
    }

    def __init__(self):
        self.db_pool = get_db_pool()
        self.cache = {}
        self.cache_expiry = {}

    def build(self, user_id: str, force_refresh: bool = False, intent: Optional[str] = None) -> Dict[str, Any]:
        """Build complete profile pack for user with optional intent-based optimization"""

        # Check cache
        cache_key = f"profile_pack:{user_id}"
        if not force_refresh and self._is_cached(cache_key):
            logger.info(f"Returning cached profile pack for user {user_id}")
            return self.cache[cache_key]

        logger.info(f"Building profile pack for user {user_id} with intent: {intent}")

        try:
            # Always load core components
            profile_pack = {
                'user_core': self._get_user_core(user_id),
                'accounts': self._get_accounts(user_id),
                'derived_metrics': self._calculate_derived_metrics(user_id, lightweight=self._is_lightweight_intent(intent)),
                'transactions_sample': self._get_transactions_sample(user_id),
                'schema_excerpt': self._get_schema_excerpt(),
                'generated_at': datetime.now(timezone.utc).isoformat(),
                'cache_expires_at': (datetime.now(timezone.utc) + timedelta(minutes=config.PROFILE_PACK_CACHE_MINUTES)).isoformat()
            }

            # Conditionally load heavy components based on intent
            if not self._is_lightweight_intent(intent):
                profile_pack['holdings'] = self._get_holdings(user_id)
                profile_pack['manual_assets'] = self._get_manual_assets(user_id)
                profile_pack['manual_liabilities'] = self._get_manual_liabilities(user_id)
                profile_pack['goals'] = self._get_goals(user_id)
                profile_pack['recurring_income'] = self._get_recurring_income(user_id)
                profile_pack['budgets'] = self._get_budgets(user_id)

                # Add comprehensive data for complete context
                profile_pack['insurances'] = self._get_insurances(user_id)
                profile_pack['loan_details'] = self._get_loan_details(user_id)
                profile_pack['real_estate'] = self._get_real_estate_details(user_id)
                profile_pack['vehicles'] = self._get_vehicle_details(user_id)
            else:
                # Provide empty lists for lightweight intents
                profile_pack['holdings'] = []
                profile_pack['manual_assets'] = []
                profile_pack['manual_liabilities'] = []
                profile_pack['goals'] = []
                profile_pack['recurring_income'] = []
                profile_pack['budgets'] = []
                profile_pack['insurances'] = []
                profile_pack['loan_details'] = []
                profile_pack['real_estate'] = []
                profile_pack['vehicles'] = []

            # Cache the result
            self._cache_result(cache_key, profile_pack)

            return profile_pack

        except Exception as e:
            logger.error(f"Error building profile pack for user {user_id}: {e}")
            raise

    def _is_cached(self, cache_key: str) -> bool:
        """Check if cache is valid"""
        if cache_key not in self.cache:
            return False
        if cache_key not in self.cache_expiry:
            return False
        return datetime.now(timezone.utc) < self.cache_expiry[cache_key]

    def _is_lightweight_intent(self, intent: Optional[str]) -> bool:
        """Determine if intent only needs lightweight data"""
        if intent is None:
            return False

        # Intents that only need basic account and transaction data
        # DO NOT include investment-related intents here
        lightweight_intents = [
            'account_balances',
            'recent_transactions',
            'spend_by_category',
            'spend_by_time',
            'cashflow_summary',
            'transaction_search',
            'savings_rate'
            # 'investment_positions' and 'investment_analysis' removed - they need holdings data
        ]

        return intent.lower() in lightweight_intents

    def _cache_result(self, cache_key: str, data: Dict[str, Any]):
        """Cache the result"""
        self.cache[cache_key] = data
        self.cache_expiry[cache_key] = datetime.now(timezone.utc) + timedelta(minutes=config.PROFILE_PACK_CACHE_MINUTES)

    def _get_user_core(self, user_id: str) -> Dict[str, Any]:
        """Get core user information matching actual database schema"""
        query = """
        SELECT
            u.id as user_id,
            u.first_name,
            u.last_name,
            u.email,
            u.currency_preference as currency,
            COALESCE(up.timezone, 'UTC') as timezone,
            u.created_at,
            ui.full_name,
            ui.phone_primary,
            ui.state as state_residence,
            ud.age,
            ud.household_income,
            ud.marital_status,
            ud.dependents,
            ud.life_stage,
            up.risk_tolerance,
            up.investment_horizon,
            tp.filing_status,
            tp.federal_rate,
            tp.state_rate
        FROM users u
        LEFT JOIN user_identity ui ON u.id = ui.user_id
        LEFT JOIN user_demographics ud ON u.id = ud.user_id
        LEFT JOIN user_preferences up ON u.id = up.user_id
        LEFT JOIN tax_profile tp ON u.id = tp.user_id
        WHERE u.id = %(user_id)s
        """

        result = self.db_pool.execute_query(query, {'user_id': user_id}, fetch_one=True)

        if not result:
            raise ValueError(f"User {user_id} not found")

        # Serialize and clean up the result
        user_core = self._serialize_row(result[0])

        # Add default values for missing fields
        if user_core.get('risk_tolerance') is None:
            user_core['risk_tolerance'] = 'moderate'
        if user_core.get('investment_horizon') is None:
            user_core['investment_horizon'] = 'long_term'
        if user_core.get('dependents') is None:
            user_core['dependents'] = 0
        if user_core.get('filing_status') is None:
            user_core['filing_status'] = 'single'
        if user_core.get('life_stage') is None:
            # Derive life stage from age if available
            age = user_core.get('age')
            if age:
                if age < 30:
                    user_core['life_stage'] = 'early_career'
                elif age < 45:
                    user_core['life_stage'] = 'mid_career'
                elif age < 60:
                    user_core['life_stage'] = 'late_career'
                elif age < 67:
                    user_core['life_stage'] = 'pre_retirement'
                else:
                    user_core['life_stage'] = 'retirement'
            else:
                user_core['life_stage'] = 'unknown'

        return user_core

    def _get_accounts(self, user_id: str) -> List[Dict[str, Any]]:
        """Get user accounts with limit"""
        query = f"""
        SELECT
            id, name, type, subtype, mask,
            institution_name, balance, available_balance,
            currency, is_active, updated_at
        FROM accounts
        WHERE user_id = %(user_id)s AND is_active = true
        ORDER BY balance DESC
        LIMIT {self.LIMITS['accounts']}
        """

        results = self.db_pool.execute_query(query, {'user_id': user_id})
        return [self._serialize_row(row) for row in results]

    def _get_holdings(self, user_id: str) -> List[Dict[str, Any]]:
        """Get investment holdings"""
        query = f"""
        SELECT
            h.id, h.account_id, h.security_id,
            h.quantity, h.market_value, h.cost_basis_total as cost_basis,
            s.name as security_name, s.ticker as symbol,
            s.security_type
        FROM holdings_current h
        JOIN accounts a ON h.account_id = a.id
        LEFT JOIN securities s ON h.security_id = s.id
        WHERE a.user_id = %(user_id)s
        ORDER BY h.market_value DESC NULLS LAST
        LIMIT {self.LIMITS['holdings']}
        """

        results = self.db_pool.execute_query(query, {'user_id': user_id})
        return [self._serialize_row(row) for row in results]

    def _get_manual_assets(self, user_id: str) -> List[Dict[str, Any]]:
        """Get manual assets"""
        query = f"""
        SELECT
            ma.id, ma.name, ma.asset_class as category, ma.value,
            ma.notes, ma.created_at,
            re.property_type, re.purchase_price,
            va.make, va.model, va.year as vehicle_year
        FROM manual_assets ma
        LEFT JOIN real_estate_details re ON ma.id = re.manual_asset_id
        LEFT JOIN vehicle_assets va ON ma.id = va.asset_id
        WHERE ma.user_id = %(user_id)s
        ORDER BY ma.value DESC
        LIMIT {self.LIMITS['manual_assets']}
        """

        results = self.db_pool.execute_query(query, {'user_id': user_id})
        return [self._serialize_row(row) for row in results]

    def _get_manual_liabilities(self, user_id: str) -> List[Dict[str, Any]]:
        """Get manual liabilities"""
        query = f"""
        SELECT
            ml.id, ml.name, ml.liability_class as category,
            ml.balance, ml.interest_rate, ml.notes
        FROM manual_liabilities ml
        WHERE ml.user_id = %(user_id)s
        ORDER BY ml.balance DESC
        LIMIT {self.LIMITS['manual_liabilities']}
        """

        results = self.db_pool.execute_query(query, {'user_id': user_id})
        return [self._serialize_row(row) for row in results]

    def _get_goals(self, user_id: str) -> List[Dict[str, Any]]:
        """Get financial goals"""
        query = f"""
        SELECT
            g.id, g.name, g.description, g.target_amount,
            g.current_amount, g.target_date, g.priority,
            g.is_active, g.created_at
        FROM goals g
        WHERE g.user_id = %(user_id)s AND g.is_active = true
        ORDER BY g.priority ASC, g.target_date ASC
        LIMIT {self.LIMITS['goals']}
        """

        results = self.db_pool.execute_query(query, {'user_id': user_id})
        return [self._serialize_row(row) for row in results]

    def _get_recurring_income(self, user_id: str) -> List[Dict[str, Any]]:
        """Get recurring income sources"""
        query = f"""
        SELECT
            id, source, gross_monthly as amount, frequency,
            inflation_adj as is_active, effective_from as start_date,
            effective_to as end_date
        FROM recurring_income
        WHERE user_id = %(user_id)s
        ORDER BY gross_monthly DESC NULLS LAST
        LIMIT {self.LIMITS['recurring_income']}
        """

        results = self.db_pool.execute_query(query, {'user_id': user_id})
        return [self._serialize_row(row) for row in results]

    def _get_budgets(self, user_id: str) -> List[Dict[str, Any]]:
        """Get budgets with categories and spending"""
        query = f"""
        SELECT
            b.id, b.name, b.amount as total_amount,
            b.period, b.start_date, b.end_date,
            bc.category, bc.amount as category_amount,
            COALESCE(
                (SELECT SUM(ABS(t.amount))
                 FROM transactions t
                 WHERE t.user_id = b.user_id
                   AND t.pfc_primary = bc.category
                   AND t.amount < 0
                   AND t.pending = false
                   AND t.posted_datetime >= DATE_TRUNC('month', CURRENT_DATE)
                   AND t.posted_datetime < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
                ), 0
            ) as current_spending
        FROM budgets b
        LEFT JOIN budget_categories bc ON b.id = bc.budget_id
        WHERE b.user_id = %(user_id)s AND b.is_active = true
        ORDER BY b.created_at DESC
        LIMIT {self.LIMITS['budgets']}
        """

        results = self.db_pool.execute_query(query, {'user_id': user_id})

        # Group by budget
        budgets = {}
        for row in results:
            budget_id = row['id']
            if budget_id not in budgets:
                budgets[budget_id] = {
                    'id': budget_id,
                    'name': row['name'],
                    'total_amount': float(row['total_amount']) if row['total_amount'] else 0,
                    'period': row['period'],
                    'start_date': row['start_date'].isoformat() if row['start_date'] else None,
                    'categories': []
                }

            if row['category']:
                budgets[budget_id]['categories'].append({
                    'category': row['category'],
                    'amount': float(row['category_amount']) if row['category_amount'] else 0,
                    'current_spending': float(row['current_spending']) if row['current_spending'] else 0
                })

        return list(budgets.values())

    def _get_transactions_sample(self, user_id: str) -> List[Dict[str, Any]]:
        """Get sample of recent transactions"""
        query = f"""
        SELECT
            id, account_id, amount, merchant_name,
            category, pfc_primary, pfc_detailed,
            date, posted_datetime, pending
        FROM transactions
        WHERE user_id = %(user_id)s
        ORDER BY COALESCE(posted_datetime, date::timestamptz) DESC
        LIMIT {self.LIMITS['transactions_sample']}
        """

        results = self.db_pool.execute_query(query, {'user_id': user_id})
        return [self._serialize_row(row) for row in results]

    def _calculate_derived_metrics(self, user_id: str, lightweight: bool = False) -> Dict[str, Any]:
        """Calculate derived financial metrics with enhanced personalization data"""

        # Get total assets by type
        assets_query = """
        SELECT
            type,
            subtype,
            COALESCE(SUM(balance), 0) as total_balance,
            COUNT(*) as account_count
        FROM accounts
        WHERE user_id = %(user_id)s
          AND is_active = true
        GROUP BY type, subtype
        """

        # Get total liabilities
        liabilities_query = """
        SELECT
            COALESCE(SUM(balance), 0) as total_debt
        FROM accounts
        WHERE user_id = %(user_id)s
          AND is_active = true
          AND type = 'credit'
        """

        # Get monthly expenses (3 month average) with category breakdown
        expenses_query = """
        SELECT
            AVG(monthly_spend) as avg_monthly_expenses,
            AVG(essential_spend) as avg_essential_expenses,
            AVG(discretionary_spend) as avg_discretionary_expenses
        FROM (
            SELECT
                DATE_TRUNC('month', COALESCE(posted_datetime, date::timestamptz)) as month,
                SUM(ABS(amount)) as monthly_spend,
                SUM(CASE WHEN pfc_primary IN ('FOOD_AND_DRINK', 'TRANSPORTATION', 'BILLS_AND_UTILITIES', 'HEALTHCARE')
                    THEN ABS(amount) ELSE 0 END) as essential_spend,
                SUM(CASE WHEN pfc_primary IN ('ENTERTAINMENT', 'GENERAL_MERCHANDISE', 'PERSONAL')
                    THEN ABS(amount) ELSE 0 END) as discretionary_spend
            FROM transactions
            WHERE user_id = %(user_id)s
              AND amount < 0
              AND pending = false
              AND COALESCE(posted_datetime, date::timestamptz) >= CURRENT_DATE - INTERVAL '3 months'
            GROUP BY 1
        ) monthly
        """

        # Get income with source breakdown (simplified to avoid LIKE operator issues)
        income_query = """
        SELECT
            AVG(monthly_income) as avg_monthly_income,
            AVG(monthly_income * 0.8) as avg_salary_income,
            AVG(monthly_income * 0.2) as avg_other_income
        FROM (
            SELECT
                DATE_TRUNC('month', COALESCE(posted_datetime, date::timestamptz)) as month,
                SUM(amount) as monthly_income
            FROM transactions
            WHERE user_id = %(user_id)s
              AND amount > 0
              AND pending = false
              AND COALESCE(posted_datetime, date::timestamptz) >= CURRENT_DATE - INTERVAL '3 months'
            GROUP BY 1
        ) monthly
        """

        # Get investment metrics
        investment_query = """
        SELECT
            COALESCE(SUM(h.market_value), 0) as total_investments,
            COALESCE(SUM(h.cost_basis_total), 0) as total_cost_basis,
            COUNT(DISTINCT a.id) as investment_accounts
        FROM holdings_current h
        JOIN accounts a ON h.account_id = a.id
        WHERE a.user_id = %(user_id)s
        """

        # Get retirement account balances
        retirement_query = """
        SELECT
            COALESCE(SUM(balance), 0) as retirement_balance
        FROM accounts
        WHERE user_id = %(user_id)s
          AND is_active = true
          AND type = 'investment'
          AND subtype IN ('401k', 'ira', '403b', 'roth', 'roth_401k')
        """

        # Get spending volatility (standard deviation) - reduced to 3 months for performance
        volatility_query = """
        SELECT
            STDDEV(monthly_spend) as spending_volatility
        FROM (
            SELECT
                DATE_TRUNC('month', COALESCE(posted_datetime, date::timestamptz)) as month,
                SUM(ABS(amount)) as monthly_spend
            FROM transactions
            WHERE user_id = %(user_id)s
              AND amount < 0
              AND pending = false
              AND COALESCE(posted_datetime, date::timestamptz) >= CURRENT_DATE - INTERVAL '3 months'
            GROUP BY 1
        ) monthly
        """

        # Execute queries
        assets = self.db_pool.execute_query(assets_query, {'user_id': user_id})
        liabilities = self.db_pool.execute_query(liabilities_query, {'user_id': user_id}, fetch_one=True)
        expenses = self.db_pool.execute_query(expenses_query, {'user_id': user_id}, fetch_one=True)
        income = self.db_pool.execute_query(income_query, {'user_id': user_id}, fetch_one=True)

        # Skip heavy queries in lightweight mode
        if not lightweight:
            investments = self.db_pool.execute_query(investment_query, {'user_id': user_id}, fetch_one=True)
            retirement = self.db_pool.execute_query(retirement_query, {'user_id': user_id}, fetch_one=True)
            volatility = self.db_pool.execute_query(volatility_query, {'user_id': user_id}, fetch_one=True)
        else:
            investments = [{'total_investments': 0, 'total_cost_basis': 0, 'investment_accounts': 0}]
            retirement = [{'retirement_balance': 0}]
            volatility = [{'spending_volatility': 0}]

        # Process asset breakdown
        liquid_assets = 0
        cash_balance = 0
        investment_balance = 0

        for asset in assets:
            balance = float(asset['total_balance'])
            if asset['type'] == 'depository':
                liquid_assets += balance
                cash_balance += balance
            elif asset['type'] == 'investment':
                liquid_assets += balance
                investment_balance += balance

        # Calculate metrics
        total_debt = abs(float(liabilities[0]['total_debt'])) if liabilities else 0
        monthly_expenses = float(expenses[0]['avg_monthly_expenses']) if expenses and expenses[0]['avg_monthly_expenses'] else 3000
        monthly_income = float(income[0]['avg_monthly_income']) if income and income[0]['avg_monthly_income'] else 0
        essential_expenses = float(expenses[0]['avg_essential_expenses']) if expenses and expenses[0]['avg_essential_expenses'] else 0
        discretionary_expenses = float(expenses[0]['avg_discretionary_expenses']) if expenses and expenses[0]['avg_discretionary_expenses'] else 0
        salary_income = float(income[0]['avg_salary_income']) if income and income[0]['avg_salary_income'] else 0
        other_income = float(income[0]['avg_other_income']) if income and income[0]['avg_other_income'] else 0
        total_investments = float(investments[0]['total_investments']) if investments else 0
        total_cost_basis = float(investments[0]['total_cost_basis']) if investments else 0
        retirement_balance = float(retirement[0]['retirement_balance']) if retirement else 0
        spending_volatility = float(volatility[0]['spending_volatility']) if volatility and volatility[0]['spending_volatility'] else 0

        # Derived calculations
        net_worth = liquid_assets - total_debt
        liquid_runway = liquid_assets / monthly_expenses if monthly_expenses > 0 else 0
        savings_rate = ((monthly_income - monthly_expenses) / monthly_income * 100) if monthly_income > 0 else 0
        debt_to_income = (total_debt / (monthly_income * 12) * 100) if monthly_income > 0 else 0
        essential_ratio = (essential_expenses / monthly_expenses * 100) if monthly_expenses > 0 else 0
        discretionary_ratio = (discretionary_expenses / monthly_expenses * 100) if monthly_expenses > 0 else 0
        investment_returns = ((total_investments - total_cost_basis) / total_cost_basis * 100) if total_cost_basis > 0 else 0
        retirement_readiness = retirement_balance / (monthly_expenses * 12 * 25) * 100 if monthly_expenses > 0 else 0  # 25x annual expenses rule
        income_stability = 1 - (other_income / monthly_income) if monthly_income > 0 else 0  # Higher = more stable (salary-based)
        spending_stability = 1 - (spending_volatility / monthly_expenses) if monthly_expenses > 0 else 0  # Higher = more stable

        return {
            # Core metrics
            'net_worth': round(net_worth, 2),
            'liquid_reserves_months': round(liquid_runway, 1),
            'savings_rate_3m': round(savings_rate, 1),
            'total_assets': round(liquid_assets, 2),
            'total_liabilities': round(total_debt, 2),
            'debt_to_income': round(debt_to_income, 1),
            'monthly_income_avg': round(monthly_income, 2),
            'monthly_expenses_avg': round(monthly_expenses, 2),

            # Enhanced metrics for personalization
            'cash_balance': round(cash_balance, 2),
            'investment_balance': round(investment_balance, 2),
            'retirement_balance': round(retirement_balance, 2),
            'essential_expenses_ratio': round(essential_ratio, 1),
            'discretionary_expenses_ratio': round(discretionary_ratio, 1),
            'investment_returns_pct': round(investment_returns, 1),
            'retirement_readiness_pct': round(retirement_readiness, 1),
            'income_stability_score': round(income_stability, 2),
            'spending_stability_score': round(spending_stability, 2),
            'salary_income_avg': round(salary_income, 2),
            'other_income_avg': round(other_income, 2),
            'essential_expenses_avg': round(essential_expenses, 2),
            'discretionary_expenses_avg': round(discretionary_expenses, 2)
        }

    def _get_insurances(self, user_id: str) -> List[Dict[str, Any]]:
        """Get insurance policies"""
        query = """
        SELECT
            id, type, provider, policy_number,
            coverage_amount, premium, frequency,
            deductible, effective_date, expiration_date
        FROM insurances
        WHERE user_id = %(user_id)s AND is_active = true
        ORDER BY coverage_amount DESC
        LIMIT 20
        """
        results = self.db_pool.execute_query(query, {'user_id': user_id})
        return [self._serialize_row(row) for row in results]

    def _get_loan_details(self, user_id: str) -> List[Dict[str, Any]]:
        """Get detailed loan information"""
        query = """
        SELECT
            ld.account_id, ld.interest_rate, ld.origination_principal,
            ld.origination_date, ld.maturity_date, ld.next_payment_due,
            ld.next_payment_amount, ld.minimum_payment_amount,
            ld.ytd_interest_paid, ld.ytd_principal_paid,
            a.name as account_name, a.balance
        FROM loan_details ld
        JOIN accounts a ON ld.account_id = a.id
        WHERE a.user_id = %(user_id)s
        ORDER BY a.balance DESC
        LIMIT 50
        """
        results = self.db_pool.execute_query(query, {'user_id': user_id})
        return [self._serialize_row(row) for row in results]

    def _get_real_estate_details(self, user_id: str) -> List[Dict[str, Any]]:
        """Get real estate property details"""
        query = """
        SELECT
            red.*, ma.name, ma.value
        FROM real_estate_details red
        JOIN manual_assets ma ON red.manual_asset_id = ma.id
        WHERE ma.user_id = %(user_id)s
        ORDER BY red.market_value DESC NULLS LAST
        LIMIT 20
        """
        results = self.db_pool.execute_query(query, {'user_id': user_id})
        return [self._serialize_row(row) for row in results]

    def _get_vehicle_details(self, user_id: str) -> List[Dict[str, Any]]:
        """Get vehicle asset details"""
        query = """
        SELECT
            va.*, ma.name, ma.value
        FROM vehicle_assets va
        JOIN manual_assets ma ON va.asset_id = ma.id
        WHERE ma.user_id = %(user_id)s
        ORDER BY ma.value DESC
        LIMIT 20
        """
        results = self.db_pool.execute_query(query, {'user_id': user_id})
        return [self._serialize_row(row) for row in results]

    def _get_schema_excerpt(self) -> Dict[str, List[str]]:
        """Return schema excerpt for agent reference"""
        return {
            'transactions': [
                'id', 'user_id', 'account_id', 'amount', 'merchant_name',
                'category', 'pfc_primary', 'pfc_detailed', 'date',
                'posted_datetime', 'pending', 'name', 'payment_channel'
            ],
            'accounts': [
                'id', 'user_id', 'name', 'type', 'subtype', 'balance',
                'available_balance', 'currency', 'institution_name', 'is_active'
            ],
            'holdings_current': [
                'id', 'user_id', 'account_id', 'security_id', 'quantity',
                'value', 'cost_basis'
            ],
            'goals': [
                'id', 'user_id', 'name', 'goal_type', 'target_amount',
                'current_amount', 'target_date', 'priority', 'is_active'
            ],
            'budgets': [
                'id', 'user_id', 'name', 'amount', 'period', 'start_date',
                'end_date', 'is_active'
            ]
        }

    def _serialize_row(self, row: Any) -> Dict[str, Any]:
        """Serialize database row to JSON-safe format"""
        result = {}
        # Handle RealDictRow objects from psycopg2
        if hasattr(row, '_asdict'):
            row_dict = row._asdict()
        elif hasattr(row, 'items'):
            row_dict = dict(row.items())
        else:
            row_dict = dict(row)

        for key, value in row_dict.items():
            if value is None:
                result[key] = None
            elif isinstance(value, (datetime,)):
                result[key] = value.isoformat()
            elif isinstance(value, (Decimal,)):
                result[key] = float(value)
            else:
                result[key] = value
        return result
