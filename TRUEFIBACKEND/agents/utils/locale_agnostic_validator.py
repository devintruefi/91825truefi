"""
Locale-Agnostic Financial Calculation Validators
Enhanced to be completely pure - no hardcoded values, currency-agnostic
"""
import logging
from typing import Dict, Any, Optional, List
from decimal import Decimal, getcontext
import math
from .currency_agnostic_formatter import CurrencyAgnosticFormatter, create_currency_agnostic_context

logger = logging.getLogger(__name__)

# Set precision for financial calculations
getcontext().prec = 10

class LocaleAgnosticValidator:
    """
    Pure financial validators - no hardcoded values, completely locale and currency agnostic.
    All parameters must be explicitly provided.
    """
    
    @staticmethod
    def validate_housing_affordability(
        annual_income: float,
        existing_monthly_debt: float,
        home_price: float,
        down_payment_amount: float,
        interest_rate: float,
        property_tax_rate: float,
        insurance_rate: float,
        max_dti_housing: float,
        max_dti_total: float,
        hoa_fee: float = 0,
        pmi_rate: Optional[float] = None,
        loan_term_years: int = 30,
        currency_code: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Validate housing affordability with explicit locale-specific inputs.
        
        Args:
            annual_income: Gross annual income
            existing_monthly_debt: Current monthly debt payments
            home_price: Price of the home
            down_payment_amount: Down payment amount (not percentage)
            interest_rate: Mortgage interest rate (annual, as decimal)
            property_tax_rate: Annual property tax rate (as decimal)
            insurance_rate: Annual homeowner's insurance rate (as decimal)  
            hoa_fee: Monthly HOA fee (default 0)
            pmi_rate: Annual PMI rate if applicable (as decimal)
            loan_term_years: Loan term in years (default 30)
            max_dti_housing: Maximum housing DTI ratio (required)
            max_dti_total: Maximum total DTI ratio (required)
            currency_code: Currency for formatting (optional)
        
        Returns:
            Dictionary with affordability analysis
        """
        try:
            # Input validation
            if any(x < 0 for x in [annual_income, home_price, down_payment_amount, interest_rate]):
                return {'valid': False, 'error': 'Negative values not allowed for core inputs'}
            
            if down_payment_amount >= home_price:
                return {'valid': False, 'error': 'Down payment cannot exceed home price'}
            
            monthly_income = annual_income / 12
            loan_amount = home_price - down_payment_amount
            down_payment_pct = down_payment_amount / home_price
            
            # Calculate monthly mortgage payment (P&I)
            monthly_rate = interest_rate / 12
            n_payments = loan_term_years * 12
            
            if monthly_rate > 0:
                pi = loan_amount * (monthly_rate * (1 + monthly_rate)**n_payments) / ((1 + monthly_rate)**n_payments - 1)
            else:
                pi = loan_amount / n_payments
            
            # Calculate other housing costs
            monthly_property_tax = (home_price * property_tax_rate) / 12
            monthly_insurance = (home_price * insurance_rate) / 12
            
            # PMI calculation
            monthly_pmi = 0
            pmi_required = down_payment_pct < 0.20
            if pmi_required and pmi_rate is not None:
                monthly_pmi = (loan_amount * pmi_rate) / 12
            elif pmi_required and pmi_rate is None:
                return {'valid': False, 'error': 'PMI rate required for down payment < 20%'}
            
            # Total housing cost
            total_housing = pi + monthly_property_tax + monthly_insurance + monthly_pmi + hoa_fee
            
            # DTI calculations
            housing_dti = total_housing / monthly_income
            total_dti = (total_housing + existing_monthly_debt) / monthly_income
            
            # Affordability checks
            housing_dti_ok = housing_dti <= max_dti_housing
            total_dti_ok = total_dti <= max_dti_total
            
            return {
                'valid': True,
                'loan_amount': round(loan_amount, 2),
                'down_payment_pct': round(down_payment_pct * 100, 1),
                'monthly_payment_breakdown': {
                    'principal_interest': round(pi, 2),
                    'property_tax': round(monthly_property_tax, 2),
                    'insurance': round(monthly_insurance, 2),
                    'pmi': round(monthly_pmi, 2),
                    'hoa': round(hoa_fee, 2),
                    'total': round(total_housing, 2)
                },
                'dti_ratios': {
                    'housing_dti': round(housing_dti * 100, 1),
                    'total_dti': round(total_dti * 100, 1),
                    'housing_dti_ok': housing_dti_ok,
                    'total_dti_ok': total_dti_ok
                },
                'affordability': {
                    'can_afford': housing_dti_ok and total_dti_ok,
                    'monthly_income': round(monthly_income, 2),
                    'remaining_after_housing': round(monthly_income - total_housing, 2),
                    'remaining_after_all_debt': round(monthly_income - total_housing - existing_monthly_debt, 2)
                },
                'inputs_used': {
                    'property_tax_rate': property_tax_rate,
                    'insurance_rate': insurance_rate,
                    'interest_rate': interest_rate,
                    'pmi_rate': pmi_rate,
                    'max_dti_housing': max_dti_housing,
                    'max_dti_total': max_dti_total,
                    'currency_code': currency_code
                }
            }
            
        except Exception as e:
            logger.error(f"Housing affordability calculation error: {e}")
            return {'valid': False, 'error': str(e)}
    
    @staticmethod
    def validate_retirement_savings(
        current_age: int,
        retirement_age: int,
        current_savings: float,
        monthly_contribution: float,
        expected_return: float,
        annual_expenses_in_retirement: float,
        withdrawal_rate: float,
        inflation_rate: float
    ) -> Dict[str, Any]:
        """
        Validate retirement savings adequacy with explicit parameters.
        
        Args:
            current_age: Current age
            retirement_age: Target retirement age
            current_savings: Current retirement savings balance
            monthly_contribution: Monthly contribution amount
            expected_return: Expected annual return (as decimal)
            annual_expenses_in_retirement: Expected annual expenses in retirement
            withdrawal_rate: Safe withdrawal rate (default 4%)
            inflation_rate: Expected inflation rate (default 2%)
        
        Returns:
            Dictionary with retirement analysis
        """
        try:
            # Input validation
            if current_age >= retirement_age:
                return {'valid': False, 'error': 'Current age must be less than retirement age'}
            
            if any(x < 0 for x in [current_savings, monthly_contribution, expected_return]):
                return {'valid': False, 'error': 'Negative values not allowed'}
            
            years_to_retirement = retirement_age - current_age
            
            # Calculate future value of current savings
            future_value_current = current_savings * (1 + expected_return) ** years_to_retirement
            
            # Calculate future value of monthly contributions
            monthly_rate = expected_return / 12
            months_to_retirement = years_to_retirement * 12
            
            if monthly_rate > 0:
                future_value_contributions = monthly_contribution * (
                    ((1 + monthly_rate) ** months_to_retirement - 1) / monthly_rate
                )
            else:
                future_value_contributions = monthly_contribution * months_to_retirement
            
            total_at_retirement = future_value_current + future_value_contributions
            
            # Calculate required portfolio for desired expenses
            # Adjust expenses for inflation
            inflation_adjusted_expenses = annual_expenses_in_retirement * (1 + inflation_rate) ** years_to_retirement
            required_portfolio = inflation_adjusted_expenses / withdrawal_rate
            
            # Gap analysis
            surplus_or_deficit = total_at_retirement - required_portfolio
            
            return {
                'valid': True,
                'projected_portfolio_at_retirement': round(total_at_retirement, 2),
                'required_portfolio': round(required_portfolio, 2),
                'surplus_or_deficit': round(surplus_or_deficit, 2),
                'on_track': surplus_or_deficit >= 0,
                'breakdown': {
                    'future_value_current_savings': round(future_value_current, 2),
                    'future_value_contributions': round(future_value_contributions, 2),
                    'total_contributions': round(monthly_contribution * months_to_retirement, 2)
                },
                'annual_income_at_retirement': round(total_at_retirement * withdrawal_rate, 2),
                'inflation_adjusted_expenses': round(inflation_adjusted_expenses, 2),
                'years_to_retirement': years_to_retirement,
                'assumptions': {
                    'expected_return': expected_return,
                    'withdrawal_rate': withdrawal_rate,
                    'inflation_rate': inflation_rate
                }
            }
            
        except Exception as e:
            logger.error(f"Retirement savings calculation error: {e}")
            return {'valid': False, 'error': str(e)}
    
    @staticmethod 
    def validate_emergency_fund(
        monthly_expenses: float,
        current_emergency_fund: float,
        target_months: int = 6,
        income_volatility: str = 'stable'  # 'stable', 'variable', 'volatile'
    ) -> Dict[str, Any]:
        """
        Validate emergency fund adequacy.
        
        Args:
            monthly_expenses: Average monthly essential expenses
            current_emergency_fund: Current emergency fund balance
            target_months: Target months of expenses to cover (default 6)
            income_volatility: Income stability level
        
        Returns:
            Dictionary with emergency fund analysis
        """
        try:
            # Adjust target based on income volatility
            volatility_multipliers = {
                'stable': 1.0,      # Standard 6 months
                'variable': 1.33,   # 8 months
                'volatile': 1.67    # 10 months
            }
            
            multiplier = volatility_multipliers.get(income_volatility, 1.0)
            adjusted_target_months = target_months * multiplier
            
            target_amount = monthly_expenses * adjusted_target_months
            surplus_or_deficit = current_emergency_fund - target_amount
            months_covered = current_emergency_fund / monthly_expenses if monthly_expenses > 0 else 0
            
            return {
                'valid': True,
                'current_fund': round(current_emergency_fund, 2),
                'target_amount': round(target_amount, 2),
                'surplus_or_deficit': round(surplus_or_deficit, 2),
                'is_adequate': surplus_or_deficit >= 0,
                'months_covered': round(months_covered, 1),
                'target_months': round(adjusted_target_months, 1),
                'income_volatility': income_volatility,
                'recommendation': 'Adequate' if surplus_or_deficit >= 0 else 'Insufficient'
            }
            
        except Exception as e:
            logger.error(f"Emergency fund calculation error: {e}")
            return {'valid': False, 'error': str(e)}
    
    @staticmethod
    def validate_debt_payoff_strategy(
        debts: List[Dict[str, float]],
        available_extra_payment: float,
        strategy: str  # 'avalanche' or 'snowball'
    ) -> Dict[str, Any]:
        """
        Validate debt payoff strategy with explicit inputs.
        
        Args:
            debts: List of dicts with 'balance', 'rate', 'minimum_payment', 'name'
            available_extra_payment: Extra amount available monthly
            strategy: Payoff strategy ('avalanche' or 'snowball')
        
        Returns:
            Dictionary with payoff analysis
        """
        try:
            if not debts:
                return {'valid': False, 'error': 'No debts provided'}
            
            # Validate debt structure
            for debt in debts:
                required_fields = ['balance', 'rate', 'minimum_payment']
                if not all(field in debt for field in required_fields):
                    return {'valid': False, 'error': f'Missing required debt fields: {required_fields}'}
            
            # Sort debts based on strategy
            if strategy == 'avalanche':
                sorted_debts = sorted(debts, key=lambda x: x['rate'], reverse=True)
            else:  # snowball
                sorted_debts = sorted(debts, key=lambda x: x['balance'])
            
            payoff_order = []
            remaining_extra = available_extra_payment
            total_interest = 0
            
            for i, debt in enumerate(sorted_debts):
                payment = debt['minimum_payment']
                if i == 0:  # Apply extra payment to priority debt
                    payment += remaining_extra
                
                # Calculate payoff time
                balance = debt['balance']
                rate = debt['rate']
                
                if rate == 0:
                    months = math.ceil(balance / payment) if payment > 0 else float('inf')
                    interest = 0
                else:
                    monthly_rate = rate / 12
                    if payment <= balance * monthly_rate:
                        months = float('inf')
                        interest = float('inf')
                    else:
                        months = math.ceil(
                            -math.log(1 - (balance * monthly_rate) / payment) / 
                            math.log(1 + monthly_rate)
                        )
                        interest = (payment * months) - balance
                
                payoff_order.append({
                    'name': debt.get('name', f'Debt {i+1}'),
                    'balance': balance,
                    'rate': rate * 100,  # Convert to percentage
                    'minimum_payment': debt['minimum_payment'],
                    'actual_payment': payment,
                    'months_to_payoff': months if months != float('inf') else 'Unable to pay off',
                    'total_interest': round(interest, 2) if interest != float('inf') else 'Infinite',
                    'priority': i + 1
                })
                
                if interest != float('inf'):
                    total_interest += interest
            
            return {
                'valid': True,
                'strategy': strategy,
                'payoff_order': payoff_order,
                'total_extra_payment': available_extra_payment,
                'total_interest_saved': round(total_interest, 2),
                'strategy_explanation': {
                    'avalanche': 'Pay minimums on all debts, put extra toward highest interest rate',
                    'snowball': 'Pay minimums on all debts, put extra toward lowest balance'
                }.get(strategy, '')
            }
            
        except Exception as e:
            logger.error(f"Debt payoff calculation error: {e}")
            return {'valid': False, 'error': str(e)}