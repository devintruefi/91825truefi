# TRUEFIBACKEND/agents/calculations.py
# Personalized financial calculations using user profile data

from typing import Dict, Any, List, Optional, Tuple
from decimal import Decimal
from datetime import datetime, timedelta
import logging
from dateutil.relativedelta import relativedelta
import math

logger = logging.getLogger(__name__)

class PersonalizedCalculator:
    """Enhanced financial calculations using user profile data"""

    def __init__(self, profile_pack: Dict[str, Any]):
        """Initialize calculator with user profile data"""
        self.profile_pack = profile_pack
        self.user_data = profile_pack.get('user_core', {})
        self.demographics = self._extract_demographics()
        self.tax_profile = self._extract_tax_profile()
        self.risk_profile = self._extract_risk_profile()
        self.accounts = profile_pack.get('accounts', [])
        self.holdings = profile_pack.get('holdings', [])
        self.goals = profile_pack.get('goals', [])
        self.budgets = profile_pack.get('budgets', [])
        self.liabilities = profile_pack.get('manual_liabilities', [])

    def _extract_demographics(self) -> Dict[str, Any]:
        """Extract demographic information from profile"""
        user_core = self.user_data
        return {
            'age': self._calculate_age(user_core),
            'marital_status': user_core.get('marital_status'),
            'dependents': user_core.get('dependents', 0),
            'life_stage': user_core.get('life_stage'),
            'household_income': user_core.get('household_income')
        }

    def _calculate_age(self, user_core: Dict) -> Optional[int]:
        """Calculate age from birth date or user demographics"""
        # Check if age is directly provided
        if 'age' in user_core:
            return user_core['age']

        # Try to calculate from birth date if available
        if 'birth_date' in user_core:
            try:
                birth_date = datetime.fromisoformat(user_core['birth_date'].replace('Z', '+00:00'))
                today = datetime.now()
                age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
                return age
            except:
                pass

        # Default age assumptions based on life stage
        life_stage_ages = {
            'early_career': 28,
            'mid_career': 40,
            'late_career': 55,
            'retirement': 67
        }
        return life_stage_ages.get(user_core.get('life_stage'), 35)

    def _extract_tax_profile(self) -> Dict[str, Any]:
        """Extract tax information from profile"""
        return {
            'filing_status': self.user_data.get('filing_status', 'single'),
            'federal_rate': float(self.user_data.get('federal_rate', 0.22)),
            'state_rate': float(self.user_data.get('state_rate', 0.05)),
            'effective_rate': None  # Will calculate if needed
        }

    def _extract_risk_profile(self) -> Dict[str, Any]:
        """Extract risk and investment preferences"""
        return {
            'risk_tolerance': self.user_data.get('risk_tolerance', 'moderate'),
            'investment_horizon': self.user_data.get('investment_horizon', 'medium')
        }

    # ==================== TAX-AWARE CALCULATIONS ====================

    def calculate_after_tax_income(self, gross_income: float) -> Dict[str, Any]:
        """Calculate after-tax income using actual tax rates"""
        federal_rate = self.tax_profile['federal_rate']
        state_rate = self.tax_profile['state_rate']

        # Calculate taxes
        federal_tax = gross_income * federal_rate
        state_tax = gross_income * state_rate
        fica_tax = self._calculate_fica_tax(gross_income)

        total_tax = federal_tax + state_tax + fica_tax
        net_income = gross_income - total_tax
        effective_rate = total_tax / gross_income if gross_income > 0 else 0

        return {
            'name': 'After-Tax Income Calculation',
            'formula': 'Gross Income × (1 - (Federal Rate + State Rate + FICA Rate))',
            'inputs': {
                'gross_income': gross_income,
                'federal_rate': federal_rate,
                'state_rate': state_rate,
                'fica_rate': fica_tax / gross_income if gross_income > 0 else 0.0765
            },
            'breakdown': {
                'federal_tax': federal_tax,
                'state_tax': state_tax,
                'fica_tax': fica_tax,
                'total_tax': total_tax
            },
            'result': net_income,
            'effective_rate': effective_rate,
            'monthly_net': net_income / 12
        }

    def _calculate_fica_tax(self, gross_income: float) -> float:
        """Calculate FICA taxes (Social Security + Medicare)"""
        # 2024 rates
        social_security_rate = 0.062
        social_security_cap = 168600
        medicare_rate = 0.0145
        medicare_additional_threshold = 200000
        medicare_additional_rate = 0.009

        # Social Security tax (capped)
        ss_taxable = min(gross_income, social_security_cap)
        ss_tax = ss_taxable * social_security_rate

        # Medicare tax
        medicare_tax = gross_income * medicare_rate

        # Additional Medicare tax for high earners
        if gross_income > medicare_additional_threshold:
            additional_medicare = (gross_income - medicare_additional_threshold) * medicare_additional_rate
            medicare_tax += additional_medicare

        return ss_tax + medicare_tax

    def calculate_tax_efficient_withdrawal(self, withdrawal_amount: float, account_type: str = 'taxable') -> Dict[str, Any]:
        """Calculate tax-efficient withdrawal strategy"""
        tax_impacts = {}

        if account_type == 'traditional_401k' or account_type == 'traditional_ira':
            # Fully taxable as ordinary income
            tax_rate = self.tax_profile['federal_rate'] + self.tax_profile['state_rate']
            tax_owed = withdrawal_amount * tax_rate
            net_withdrawal = withdrawal_amount - tax_owed
            tax_impacts['type'] = 'Ordinary Income'

        elif account_type == 'roth_401k' or account_type == 'roth_ira':
            # Tax-free if qualified
            tax_owed = 0
            net_withdrawal = withdrawal_amount
            tax_impacts['type'] = 'Tax-Free (Qualified)'

        elif account_type == 'taxable':
            # Capital gains tax (simplified)
            capital_gains_rate = 0.15  # Assume long-term capital gains
            if self.demographics.get('household_income', 100000) > 500000:
                capital_gains_rate = 0.20
            elif self.demographics.get('household_income', 100000) < 44625:
                capital_gains_rate = 0.0

            # Assume 50% is cost basis (no tax) and 50% is gains
            gains_portion = withdrawal_amount * 0.5
            tax_owed = gains_portion * capital_gains_rate
            net_withdrawal = withdrawal_amount - tax_owed
            tax_impacts['type'] = 'Capital Gains'
        else:
            # Default to taxable
            tax_rate = self.tax_profile['federal_rate'] + self.tax_profile['state_rate']
            tax_owed = withdrawal_amount * tax_rate
            net_withdrawal = withdrawal_amount - tax_owed
            tax_impacts['type'] = 'Ordinary Income (Default)'

        return {
            'name': 'Tax-Efficient Withdrawal Analysis',
            'formula': 'Withdrawal Amount - (Taxable Portion × Applicable Tax Rate)',
            'inputs': {
                'withdrawal_amount': withdrawal_amount,
                'account_type': account_type,
                'tax_treatment': tax_impacts['type']
            },
            'result': net_withdrawal,
            'tax_owed': tax_owed,
            'effective_tax_rate': tax_owed / withdrawal_amount if withdrawal_amount > 0 else 0
        }

    def estimate_quarterly_taxes(self, quarterly_income: float, is_self_employed: bool = False) -> Dict[str, Any]:
        """Estimate quarterly tax payments"""
        annual_income = quarterly_income * 4

        # Calculate income tax
        federal_tax = annual_income * self.tax_profile['federal_rate']
        state_tax = annual_income * self.tax_profile['state_rate']

        # Self-employment tax if applicable
        self_employment_tax = 0
        if is_self_employed:
            # Self-employment tax is 15.3% (employer + employee portion of FICA)
            self_employment_tax = annual_income * 0.9235 * 0.153  # 92.35% of income subject to SE tax

        total_annual_tax = federal_tax + state_tax + self_employment_tax
        quarterly_payment = total_annual_tax / 4

        # Safe harbor calculation (110% of prior year or 90% of current year)
        safe_harbor_payment = quarterly_payment * 1.1

        return {
            'name': 'Quarterly Tax Estimate',
            'formula': '(Annual Income × Tax Rates) / 4',
            'inputs': {
                'quarterly_income': quarterly_income,
                'annual_income': annual_income,
                'federal_rate': self.tax_profile['federal_rate'],
                'state_rate': self.tax_profile['state_rate'],
                'is_self_employed': is_self_employed
            },
            'breakdown': {
                'federal_quarterly': federal_tax / 4,
                'state_quarterly': state_tax / 4,
                'self_employment_quarterly': self_employment_tax / 4
            },
            'result': quarterly_payment,
            'safe_harbor_amount': safe_harbor_payment,
            'payment_dates': ['April 15', 'June 15', 'September 15', 'January 15']
        }

    # ==================== LIFE-STAGE CALCULATIONS ====================

    def calculate_retirement_runway(self, current_monthly_expenses: float) -> Dict[str, Any]:
        """Calculate years until retirement and retirement readiness"""
        current_age = self.demographics.get('age', 35)
        retirement_age = 67  # Full retirement age for social security

        if current_age >= retirement_age:
            years_to_retirement = 0
            status = "Already at retirement age"
        else:
            years_to_retirement = retirement_age - current_age
            status = f"{years_to_retirement} years until full retirement age"

        # Calculate retirement savings needed (using 4% rule)
        annual_expenses = current_monthly_expenses * 12
        retirement_needed = annual_expenses * 25  # 4% withdrawal rate

        # Get current retirement savings
        retirement_accounts = [acc for acc in self.accounts if acc.get('type') == 'retirement']
        current_retirement_savings = sum(float(acc.get('balance', 0)) for acc in retirement_accounts)

        # Calculate monthly contribution needed
        if years_to_retirement > 0:
            expected_return = self.get_expected_return_rate()
            monthly_rate = expected_return / 12
            months_to_retirement = years_to_retirement * 12

            # Future value of current savings
            future_value_current = current_retirement_savings * ((1 + expected_return) ** years_to_retirement)

            # Additional needed
            additional_needed = max(0, retirement_needed - future_value_current)

            # Monthly contribution needed (PMT formula)
            if monthly_rate > 0:
                monthly_contribution_needed = additional_needed * monthly_rate / ((1 + monthly_rate) ** months_to_retirement - 1)
            else:
                monthly_contribution_needed = additional_needed / months_to_retirement
        else:
            monthly_contribution_needed = 0
            future_value_current = current_retirement_savings
            additional_needed = max(0, retirement_needed - current_retirement_savings)

        # Retirement readiness score (0-100)
        readiness_score = min(100, (current_retirement_savings / retirement_needed * 100)) if retirement_needed > 0 else 0

        return {
            'name': 'Retirement Runway Analysis',
            'formula': '25 × Annual Expenses (4% Rule) - Current Savings',
            'inputs': {
                'current_age': current_age,
                'retirement_age': retirement_age,
                'monthly_expenses': current_monthly_expenses,
                'current_savings': current_retirement_savings,
                'expected_return': expected_return if years_to_retirement > 0 else 0
            },
            'result': {
                'years_to_retirement': years_to_retirement,
                'retirement_needed': retirement_needed,
                'current_savings': current_retirement_savings,
                'savings_gap': additional_needed,
                'monthly_contribution_needed': monthly_contribution_needed,
                'readiness_score': readiness_score,
                'status': status
            }
        }

    def calculate_college_savings_need(self) -> Dict[str, Any]:
        """Calculate college savings needed based on dependents"""
        dependents = self.demographics.get('dependents', 0)

        if dependents == 0:
            return {
                'name': 'College Savings Analysis',
                'result': 'No dependents - college savings not applicable',
                'needed': 0
            }

        # Average college costs (2024 estimates)
        college_costs = {
            'public_in_state': 28000,  # Per year
            'public_out_state': 45000,
            'private': 58000
        }

        # Assume public in-state as default
        annual_college_cost = college_costs['public_in_state']
        years_of_college = 4
        total_per_child = annual_college_cost * years_of_college

        # Adjust for inflation (assume 5% education inflation, 10 years until college)
        years_until_college = 10  # Average assumption
        inflation_rate = 0.05
        future_cost_per_child = total_per_child * ((1 + inflation_rate) ** years_until_college)

        total_needed = future_cost_per_child * dependents

        # Calculate monthly contribution needed
        expected_return = 0.06  # Conservative for education savings
        monthly_rate = expected_return / 12
        months_to_save = years_until_college * 12

        if monthly_rate > 0:
            monthly_contribution = total_needed * monthly_rate / ((1 + monthly_rate) ** months_to_save - 1)
        else:
            monthly_contribution = total_needed / months_to_save

        # Check for existing 529 or education savings
        education_savings = 0  # Would need to identify from accounts

        return {
            'name': 'College Savings Analysis',
            'formula': '(Annual Cost × 4 Years × (1 + Inflation)^Years) × Number of Dependents',
            'inputs': {
                'dependents': dependents,
                'annual_cost': annual_college_cost,
                'years_of_college': years_of_college,
                'years_until_college': years_until_college,
                'inflation_rate': inflation_rate
            },
            'result': {
                'total_needed': total_needed,
                'per_child_cost': future_cost_per_child,
                'current_savings': education_savings,
                'monthly_contribution_needed': monthly_contribution,
                'recommended_vehicle': '529 Education Savings Plan'
            }
        }

    def estimate_social_security_benefit(self) -> Dict[str, Any]:
        """Estimate social security benefits based on age and income"""
        current_age = self.demographics.get('age', 35)
        annual_income = self.demographics.get('household_income', 75000)

        # Simplified SS calculation
        # Average indexed monthly earnings (AIME) - simplified
        monthly_income = annual_income / 12

        # Primary insurance amount (PIA) - 2024 bend points
        if monthly_income <= 1174:
            pia = monthly_income * 0.9
        elif monthly_income <= 7078:
            pia = 1174 * 0.9 + (monthly_income - 1174) * 0.32
        else:
            pia = 1174 * 0.9 + (7078 - 1174) * 0.32 + (monthly_income - 7078) * 0.15

        # Adjust for retirement age
        full_retirement_age = 67
        early_retirement_age = 62

        benefits = {
            'early_retirement': {
                'age': early_retirement_age,
                'monthly_benefit': pia * 0.7,  # 30% reduction for early retirement
                'years_until': max(0, early_retirement_age - current_age)
            },
            'full_retirement': {
                'age': full_retirement_age,
                'monthly_benefit': pia,
                'years_until': max(0, full_retirement_age - current_age)
            },
            'delayed_retirement': {
                'age': 70,
                'monthly_benefit': pia * 1.24,  # 8% increase per year after FRA
                'years_until': max(0, 70 - current_age)
            }
        }

        return {
            'name': 'Social Security Benefit Estimate',
            'formula': 'Based on Primary Insurance Amount (PIA) calculation',
            'inputs': {
                'current_age': current_age,
                'annual_income': annual_income,
                'full_retirement_age': full_retirement_age
            },
            'result': benefits,
            'note': 'Estimates based on current income continuing until retirement'
        }

    # ==================== PERSONALIZED INVESTMENT RETURNS ====================

    def get_expected_return_rate(self) -> float:
        """Get expected return rate based on risk tolerance"""
        risk_tolerance = self.risk_profile.get('risk_tolerance', 'moderate').lower()

        # Return rates based on risk tolerance
        return_rates = {
            'conservative': 0.05,
            'moderate': 0.07,
            'aggressive': 0.09,
            'very_conservative': 0.04,
            'very_aggressive': 0.11
        }

        # Try to parse if risk_tolerance is a number (1-10 scale)
        try:
            risk_number = int(risk_tolerance)
            if risk_number <= 3:
                return return_rates['conservative']
            elif risk_number <= 6:
                return return_rates['moderate']
            else:
                return return_rates['aggressive']
        except:
            pass

        return return_rates.get(risk_tolerance, 0.07)

    def calculate_portfolio_projection(self, years: int, monthly_contribution: float = 0) -> Dict[str, Any]:
        """Project portfolio growth based on personalized return rate"""
        # Get current portfolio value
        investment_accounts = [acc for acc in self.accounts if acc.get('type') in ['investment', 'retirement']]
        current_value = sum(float(acc.get('balance', 0)) for acc in investment_accounts)

        # Add holdings value if available
        holdings_value = sum(float(h.get('market_value', 0)) for h in self.holdings)
        current_value = max(current_value, holdings_value)  # Use the larger value to avoid double-counting

        expected_return = self.get_expected_return_rate()
        monthly_rate = expected_return / 12
        months = years * 12

        # Calculate future value with monthly contributions
        if monthly_rate > 0:
            # FV of current value
            fv_current = current_value * ((1 + expected_return) ** years)

            # FV of monthly contributions (annuity)
            fv_contributions = monthly_contribution * (((1 + monthly_rate) ** months - 1) / monthly_rate) * (1 + monthly_rate)

            future_value = fv_current + fv_contributions
        else:
            future_value = current_value + (monthly_contribution * months)

        total_contributions = current_value + (monthly_contribution * months)
        total_growth = future_value - total_contributions

        # Calculate year-by-year projection
        projections = []
        for year in range(1, years + 1):
            if monthly_rate > 0:
                year_value = current_value * ((1 + expected_return) ** year)
                year_contributions = monthly_contribution * (((1 + monthly_rate) ** (year * 12) - 1) / monthly_rate) * (1 + monthly_rate)
                year_total = year_value + year_contributions
            else:
                year_total = current_value + (monthly_contribution * year * 12)

            projections.append({
                'year': year,
                'value': year_total,
                'contributions': current_value + (monthly_contribution * year * 12),
                'growth': year_total - (current_value + (monthly_contribution * year * 12))
            })

        return {
            'name': 'Portfolio Growth Projection',
            'formula': 'FV = PV × (1 + r)^n + PMT × [((1 + r)^n - 1) / r]',
            'inputs': {
                'current_value': current_value,
                'expected_return': expected_return,
                'years': years,
                'monthly_contribution': monthly_contribution,
                'risk_tolerance': self.risk_profile.get('risk_tolerance')
            },
            'result': {
                'future_value': future_value,
                'total_contributions': total_contributions,
                'total_growth': total_growth,
                'growth_percentage': (total_growth / total_contributions * 100) if total_contributions > 0 else 0,
                'yearly_projections': projections
            }
        }

    # ==================== CASH FLOW INTELLIGENCE ====================

    def analyze_spending_flexibility(self, transactions: List[Dict]) -> Dict[str, Any]:
        """Analyze discretionary vs. non-discretionary spending"""
        if not transactions:
            return {
                'name': 'Spending Flexibility Analysis',
                'result': 'No transaction data available',
                'flexibility_score': 0
            }

        # Essential categories (non-discretionary)
        essential_categories = [
            'housing', 'rent', 'mortgage', 'utilities', 'insurance',
            'healthcare', 'medical', 'pharmacy', 'groceries', 'gas',
            'transportation', 'loan payment', 'minimum payment'
        ]

        total_spending = 0
        essential_spending = 0
        discretionary_spending = 0

        for txn in transactions:
            amount = abs(float(txn.get('amount', 0)))
            category = (txn.get('category', '') or '').lower()

            if amount > 0 and txn.get('amount', 0) < 0:  # Only expenses
                total_spending += amount

                # Check if essential
                is_essential = any(essential in category for essential in essential_categories)
                if is_essential:
                    essential_spending += amount
                else:
                    discretionary_spending += amount

        flexibility_ratio = discretionary_spending / total_spending if total_spending > 0 else 0
        flexibility_score = min(100, flexibility_ratio * 100)

        return {
            'name': 'Spending Flexibility Analysis',
            'formula': 'Discretionary Spending / Total Spending',
            'inputs': {
                'transaction_count': len(transactions),
                'analysis_period': '30 days'
            },
            'result': {
                'total_spending': total_spending,
                'essential_spending': essential_spending,
                'discretionary_spending': discretionary_spending,
                'flexibility_ratio': flexibility_ratio,
                'flexibility_score': flexibility_score,
                'can_reduce': discretionary_spending * 0.3,  # Assume 30% reduction possible
                'recommendation': 'High flexibility - opportunity to increase savings' if flexibility_score > 40
                                else 'Low flexibility - focus on income growth'
            }
        }

    def calculate_true_savings_capacity(self, monthly_income: float, expenses: Dict[str, float]) -> Dict[str, Any]:
        """Calculate true savings capacity after fixed obligations"""
        # Fixed expenses
        fixed_categories = ['housing', 'insurance', 'loan_payments', 'utilities', 'subscriptions']
        fixed_expenses = sum(expenses.get(cat, 0) for cat in fixed_categories)

        # Variable but necessary
        necessary_categories = ['groceries', 'transportation', 'healthcare']
        necessary_expenses = sum(expenses.get(cat, 0) for cat in necessary_categories)

        # Discretionary
        total_expenses = sum(expenses.values())
        discretionary_expenses = total_expenses - fixed_expenses - necessary_expenses

        # Calculate savings capacities
        after_fixed = monthly_income - fixed_expenses
        after_necessary = after_fixed - necessary_expenses
        current_savings = monthly_income - total_expenses

        # Aggressive savings (cutting 50% of discretionary)
        aggressive_savings = current_savings + (discretionary_expenses * 0.5)

        # Moderate savings (cutting 25% of discretionary)
        moderate_savings = current_savings + (discretionary_expenses * 0.25)

        return {
            'name': 'True Savings Capacity Analysis',
            'formula': 'Income - Fixed Expenses - Necessary Expenses - (Discretionary × Adjustment)',
            'inputs': {
                'monthly_income': monthly_income,
                'fixed_expenses': fixed_expenses,
                'necessary_expenses': necessary_expenses,
                'discretionary_expenses': discretionary_expenses
            },
            'result': {
                'current_savings': current_savings,
                'current_rate': (current_savings / monthly_income * 100) if monthly_income > 0 else 0,
                'moderate_savings': moderate_savings,
                'moderate_rate': (moderate_savings / monthly_income * 100) if monthly_income > 0 else 0,
                'aggressive_savings': aggressive_savings,
                'aggressive_rate': (aggressive_savings / monthly_income * 100) if monthly_income > 0 else 0,
                'max_possible_savings': after_necessary,
                'recommendation': self._get_savings_recommendation(current_savings / monthly_income if monthly_income > 0 else 0)
            }
        }

    def _get_savings_recommendation(self, savings_rate: float) -> str:
        """Get personalized savings recommendation"""
        age = self.demographics.get('age', 35)

        if age < 30:
            target_rate = 0.10  # 10% for young adults
        elif age < 40:
            target_rate = 0.15  # 15% for 30s
        elif age < 50:
            target_rate = 0.20  # 20% for 40s
        else:
            target_rate = 0.25  # 25% for 50+

        if savings_rate >= target_rate:
            return f"Excellent! You're exceeding the recommended {target_rate*100:.0f}% for your age group"
        elif savings_rate >= target_rate * 0.75:
            return f"Good progress. Try to reach {target_rate*100:.0f}% to optimize for your age"
        else:
            return f"Consider increasing savings to {target_rate*100:.0f}% recommended for your age group"

    def detect_seasonal_patterns(self, monthly_spending_data: List[float]) -> Dict[str, Any]:
        """Detect seasonal spending patterns"""
        if not monthly_spending_data or len(monthly_spending_data) < 12:
            return {
                'name': 'Seasonal Pattern Analysis',
                'result': 'Insufficient data - need 12 months of history',
                'patterns_detected': False
            }

        # Calculate statistics
        average_spending = sum(monthly_spending_data) / len(monthly_spending_data)
        max_spending = max(monthly_spending_data)
        min_spending = min(monthly_spending_data)

        # Identify high spend months (>15% above average)
        high_spend_months = []
        low_spend_months = []

        month_names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

        for i, amount in enumerate(monthly_spending_data[:12]):
            variance = (amount - average_spending) / average_spending if average_spending > 0 else 0
            if variance > 0.15:
                high_spend_months.append({
                    'month': month_names[i],
                    'amount': amount,
                    'variance': variance
                })
            elif variance < -0.15:
                low_spend_months.append({
                    'month': month_names[i],
                    'amount': amount,
                    'variance': variance
                })

        # Detect patterns
        patterns = []
        if len(high_spend_months) > 0:
            holiday_months = [m for m in high_spend_months if m['month'] in ['Nov', 'Dec', 'Jan']]
            if holiday_months:
                patterns.append('Holiday spending spike detected')

            summer_months = [m for m in high_spend_months if m['month'] in ['Jun', 'Jul', 'Aug']]
            if summer_months:
                patterns.append('Summer vacation spending pattern detected')

        return {
            'name': 'Seasonal Spending Pattern Analysis',
            'formula': 'Variance from Monthly Average',
            'inputs': {
                'months_analyzed': len(monthly_spending_data),
                'average_monthly': average_spending
            },
            'result': {
                'patterns_detected': len(patterns) > 0,
                'patterns': patterns,
                'high_spend_months': high_spend_months,
                'low_spend_months': low_spend_months,
                'max_monthly': max_spending,
                'min_monthly': min_spending,
                'variance_range': max_spending - min_spending,
                'recommendation': 'Plan ahead for high-spend months' if patterns else 'Spending is relatively consistent'
            }
        }

    # ==================== DEBT OPTIMIZATION ====================

    def compare_debt_strategies(self, debts: List[Dict]) -> Dict[str, Any]:
        """Compare avalanche vs. snowball debt payoff strategies"""
        if not debts:
            return {
                'name': 'Debt Strategy Comparison',
                'result': 'No debt data available',
                'recommended_strategy': 'N/A'
            }

        # Prepare debt list with required fields
        debt_list = []
        for debt in debts:
            balance = float(debt.get('balance', 0))
            rate = float(debt.get('interest_rate', 0.10))  # Default 10% if not provided
            min_payment = float(debt.get('minimum_payment', balance * 0.02))  # Default 2% of balance

            if balance > 0:
                debt_list.append({
                    'name': debt.get('name', 'Debt'),
                    'balance': balance,
                    'rate': rate,
                    'min_payment': min_payment
                })

        if not debt_list:
            return {
                'name': 'Debt Strategy Comparison',
                'result': 'No active debts found',
                'recommended_strategy': 'Debt-free!'
            }

        # Extra payment available (assume 10% of income)
        monthly_income = self.demographics.get('household_income', 75000) / 12
        extra_payment = monthly_income * 0.10

        # Calculate avalanche strategy (highest rate first)
        avalanche_order = sorted(debt_list, key=lambda x: x['rate'], reverse=True)
        avalanche_result = self._calculate_debt_payoff(avalanche_order, extra_payment)

        # Calculate snowball strategy (smallest balance first)
        snowball_order = sorted(debt_list, key=lambda x: x['balance'])
        snowball_result = self._calculate_debt_payoff(snowball_order, extra_payment)

        # Compare strategies
        interest_savings = snowball_result['total_interest'] - avalanche_result['total_interest']
        time_difference = snowball_result['months'] - avalanche_result['months']

        # Recommendation based on user profile
        if self.demographics.get('life_stage') == 'early_career':
            recommended = 'snowball'  # Psychological wins important
            reason = 'Building momentum with quick wins is valuable early in your financial journey'
        elif interest_savings > 500:
            recommended = 'avalanche'
            reason = f'Save ${interest_savings:.0f} in interest with mathematical optimization'
        else:
            recommended = 'snowball'
            reason = 'Minimal interest difference - psychological benefits outweigh'

        return {
            'name': 'Debt Strategy Comparison',
            'formula': 'Avalanche (High Interest First) vs. Snowball (Small Balance First)',
            'inputs': {
                'total_debt': sum(d['balance'] for d in debt_list),
                'debt_count': len(debt_list),
                'extra_payment': extra_payment
            },
            'result': f"{recommended.title()} method recommended - {reason}",
            'avalanche': avalanche_result,
            'snowball': snowball_result,
            'comparison': {
                'interest_savings': interest_savings,
                'time_difference_months': time_difference,
                'recommended_strategy': recommended,
                'reason': reason
            }
        }

    def _calculate_debt_payoff(self, debt_order: List[Dict], extra_payment: float) -> Dict[str, Any]:
        """Calculate debt payoff for a given order"""
        total_interest = 0
        months = 0
        debts_remaining = debt_order.copy()
        payoff_schedule = []

        while debts_remaining and months < 360:  # Cap at 30 years
            months += 1
            monthly_interest = 0

            # Apply minimum payments and calculate interest
            for debt in debts_remaining:
                interest = debt['balance'] * (debt['rate'] / 12)
                monthly_interest += interest
                debt['balance'] += interest - debt['min_payment']

            # Apply extra payment to first debt
            if debts_remaining:
                debts_remaining[0]['balance'] -= extra_payment

                # Check if debt is paid off
                if debts_remaining[0]['balance'] <= 0:
                    extra_payment = abs(debts_remaining[0]['balance'])  # Carry over excess
                    payoff_schedule.append({
                        'debt': debts_remaining[0]['name'],
                        'month': months
                    })
                    debts_remaining.pop(0)
                else:
                    extra_payment = 0  # Reset for next month

            total_interest += monthly_interest

        return {
            'months': months,
            'total_interest': total_interest,
            'payoff_schedule': payoff_schedule,
            'years': months / 12
        }

    def calculate_optimal_payoff_order(self, debts: List[Dict]) -> Dict[str, Any]:
        """Calculate optimal debt payoff order considering all factors"""
        if not debts:
            return {
                'name': 'Optimal Debt Payoff Order',
                'result': 'No debts to optimize'
            }

        # Score each debt for priority
        scored_debts = []
        for debt in debts:
            balance = float(debt.get('balance', 0))
            rate = float(debt.get('interest_rate', 0.10))

            # Scoring factors
            rate_score = rate * 100  # Higher rate = higher priority
            balance_score = (1 / balance if balance > 0 else 0) * 1000  # Smaller balance = higher score

            # Type-based scoring
            debt_type = debt.get('type', '').lower()
            type_score = 0
            if 'credit' in debt_type or 'card' in debt_type:
                type_score = 20  # Credit cards high priority
            elif 'student' in debt_type:
                type_score = 5  # Student loans lower priority (potential forgiveness)
            elif 'mortgage' in debt_type:
                type_score = 0  # Mortgage lowest priority (tax deductible)
            else:
                type_score = 10  # Default medium priority

            # Calculate weighted score
            total_score = (rate_score * 0.5) + (balance_score * 0.3) + (type_score * 0.2)

            scored_debts.append({
                'debt': debt,
                'score': total_score,
                'factors': {
                    'rate_impact': rate_score,
                    'balance_impact': balance_score,
                    'type_impact': type_score
                }
            })

        # Sort by score
        optimal_order = sorted(scored_debts, key=lambda x: x['score'], reverse=True)

        return {
            'name': 'Optimal Debt Payoff Order',
            'formula': 'Weighted Score = (Rate × 0.5) + (1/Balance × 0.3) + (Type Priority × 0.2)',
            'result': [
                {
                    'priority': i + 1,
                    'name': item['debt'].get('name', 'Debt'),
                    'balance': item['debt'].get('balance'),
                    'rate': item['debt'].get('interest_rate'),
                    'score': item['score'],
                    'reasoning': self._get_debt_reasoning(item['factors'])
                }
                for i, item in enumerate(optimal_order)
            ]
        }

    def _get_debt_reasoning(self, factors: Dict) -> str:
        """Get reasoning for debt prioritization"""
        if factors['rate_impact'] > factors['balance_impact'] and factors['rate_impact'] > factors['type_impact']:
            return 'High interest rate makes this a priority'
        elif factors['balance_impact'] > factors['rate_impact'] and factors['balance_impact'] > factors['type_impact']:
            return 'Small balance allows for quick payoff win'
        elif factors['type_impact'] > 15:
            return 'Credit card debt should be prioritized'
        else:
            return 'Balanced factors suggest moderate priority'

    # ==================== SCENARIO ANALYSIS ====================

    def simulate_financial_scenario(self, scenario_type: str, parameters: Dict) -> Dict[str, Any]:
        """Simulate various financial scenarios"""
        if scenario_type == 'job_loss':
            return self._simulate_job_loss(parameters)
        elif scenario_type == 'salary_increase':
            return self._simulate_salary_increase(parameters)
        elif scenario_type == 'major_purchase':
            return self._simulate_major_purchase(parameters)
        elif scenario_type == 'investment_change':
            return self._simulate_investment_change(parameters)
        else:
            return {
                'name': 'Scenario Analysis',
                'result': f'Unknown scenario type: {scenario_type}'
            }

    def _simulate_job_loss(self, parameters: Dict) -> Dict[str, Any]:
        """Simulate job loss scenario"""
        monthly_expenses = parameters.get('monthly_expenses', 5000)

        # Calculate emergency fund coverage
        savings_accounts = [acc for acc in self.accounts if acc.get('type') == 'savings']
        emergency_funds = sum(float(acc.get('balance', 0)) for acc in savings_accounts)

        # Add checking buffer
        checking_accounts = [acc for acc in self.accounts if acc.get('type') == 'checking']
        checking_balance = sum(float(acc.get('balance', 0)) for acc in checking_accounts)
        available_funds = emergency_funds + checking_balance

        # Calculate runway
        months_covered = available_funds / monthly_expenses if monthly_expenses > 0 else 0

        # Recommendations based on coverage
        if months_covered >= 6:
            assessment = 'Well prepared - you have 6+ months of expenses covered'
            action_items = ['Focus on job search without financial pressure',
                          'Consider selective opportunities']
        elif months_covered >= 3:
            assessment = 'Moderately prepared - you have 3-6 months covered'
            action_items = ['Begin aggressive job search immediately',
                          'Consider temporary or contract work',
                          'Reduce discretionary spending']
        else:
            assessment = 'Limited preparation - less than 3 months covered'
            action_items = ['Urgent job search required',
                          'Consider any available employment',
                          'Drastically cut all non-essential expenses',
                          'Explore unemployment benefits']

        return {
            'name': 'Job Loss Scenario Analysis',
            'inputs': {
                'monthly_expenses': monthly_expenses,
                'available_funds': available_funds
            },
            'result': {
                'months_covered': months_covered,
                'assessment': assessment,
                'action_items': action_items,
                'daily_burn_rate': monthly_expenses / 30,
                'critical_date': (datetime.now() + timedelta(days=months_covered * 30)).strftime('%Y-%m-%d')
            }
        }

    def _simulate_salary_increase(self, parameters: Dict) -> Dict[str, Any]:
        """Simulate salary increase impact"""
        increase_percent = parameters.get('increase_percent', 10)
        current_income = parameters.get('current_income', self.demographics.get('household_income', 75000))

        new_income = current_income * (1 + increase_percent / 100)
        increase_amount = new_income - current_income

        # Calculate after-tax increase
        tax_on_increase = self.calculate_after_tax_income(increase_amount)
        net_increase_monthly = tax_on_increase['result'] / 12

        # Recommended allocation (50/30/20 on the increase)
        recommended_allocation = {
            'additional_savings': net_increase_monthly * 0.5,
            'lifestyle_improvement': net_increase_monthly * 0.3,
            'emergency_fund_boost': net_increase_monthly * 0.2
        }

        # Long-term impact
        years = 10
        if recommended_allocation['additional_savings'] > 0:
            investment_impact = self.calculate_portfolio_projection(
                years,
                recommended_allocation['additional_savings']
            )
            ten_year_wealth_increase = investment_impact['result']['total_growth']
        else:
            ten_year_wealth_increase = 0

        return {
            'name': 'Salary Increase Impact Analysis',
            'inputs': {
                'current_income': current_income,
                'increase_percent': increase_percent,
                'new_income': new_income
            },
            'result': {
                'gross_increase_annual': increase_amount,
                'net_increase_monthly': net_increase_monthly,
                'recommended_allocation': recommended_allocation,
                'ten_year_wealth_impact': ten_year_wealth_increase,
                'new_savings_rate': ((net_increase_monthly * 0.5) / (new_income / 12)) * 100
            }
        }

    def _simulate_major_purchase(self, parameters: Dict) -> Dict[str, Any]:
        """Simulate major purchase impact (house, car, etc.)"""
        purchase_price = parameters.get('purchase_price', 300000)
        down_payment_percent = parameters.get('down_payment_percent', 20)
        loan_term_years = parameters.get('loan_term_years', 30)
        interest_rate = parameters.get('interest_rate', 0.07)

        down_payment = purchase_price * (down_payment_percent / 100)
        loan_amount = purchase_price - down_payment

        # Calculate monthly payment (PMT formula)
        monthly_rate = interest_rate / 12
        num_payments = loan_term_years * 12

        if monthly_rate > 0:
            monthly_payment = loan_amount * (monthly_rate * (1 + monthly_rate) ** num_payments) / \
                            ((1 + monthly_rate) ** num_payments - 1)
        else:
            monthly_payment = loan_amount / num_payments

        # Total cost
        total_payments = monthly_payment * num_payments
        total_interest = total_payments - loan_amount

        # Affordability check
        monthly_income = self.demographics.get('household_income', 75000) / 12
        payment_to_income_ratio = monthly_payment / monthly_income if monthly_income > 0 else 0

        if payment_to_income_ratio <= 0.28:
            affordability = 'Comfortable - within recommended 28% of income'
        elif payment_to_income_ratio <= 0.36:
            affordability = 'Moderate - approaching upper limit of 36%'
        else:
            affordability = 'Stretched - exceeds recommended debt-to-income ratio'

        return {
            'name': 'Major Purchase Impact Analysis',
            'inputs': {
                'purchase_price': purchase_price,
                'down_payment': down_payment,
                'loan_amount': loan_amount,
                'interest_rate': interest_rate,
                'loan_term_years': loan_term_years
            },
            'result': {
                'monthly_payment': monthly_payment,
                'total_interest': total_interest,
                'total_cost': purchase_price + total_interest,
                'payment_to_income_ratio': payment_to_income_ratio * 100,
                'affordability_assessment': affordability,
                'cash_needed_upfront': down_payment + (purchase_price * 0.03),  # Include closing costs
                'monthly_income_remaining': monthly_income - monthly_payment
            }
        }

    def _simulate_investment_change(self, parameters: Dict) -> Dict[str, Any]:
        """Simulate change in investment contribution"""
        contribution_change = parameters.get('monthly_change', 500)
        years = parameters.get('years', 20)

        # Current projection
        current_projection = self.calculate_portfolio_projection(years, 0)

        # New projection with change
        new_projection = self.calculate_portfolio_projection(years, contribution_change)

        # Calculate difference
        wealth_difference = new_projection['result']['future_value'] - current_projection['result']['future_value']

        # Retirement impact
        retirement_age = self.demographics.get('age', 35) + years
        if retirement_age >= 65:
            retirement_impact = 'This change will directly impact your retirement lifestyle'
        else:
            retirement_impact = f'You\'ll have {65 - retirement_age} more years to grow this wealth before retirement'

        return {
            'name': 'Investment Contribution Change Analysis',
            'inputs': {
                'monthly_change': contribution_change,
                'years': years,
                'expected_return': self.get_expected_return_rate()
            },
            'result': {
                'current_projection': current_projection['result']['future_value'],
                'new_projection': new_projection['result']['future_value'],
                'wealth_increase': wealth_difference,
                'total_additional_contributions': contribution_change * years * 12,
                'growth_on_contributions': wealth_difference - (contribution_change * years * 12),
                'retirement_impact': retirement_impact
            }
        }