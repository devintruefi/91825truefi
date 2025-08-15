"""
Calculation Validator - Utilities for validating financial calculations
Enhanced to require explicit locale-specific inputs, no geographic defaults.
"""
import logging
from typing import Dict, Any, Optional, List, Tuple
from decimal import Decimal, getcontext
import math

logger = logging.getLogger(__name__)

# Set precision for financial calculations
getcontext().prec = 10

class CalculationValidator:
    """
    Provides validation utilities for financial calculations.
    """
    
    @staticmethod
    def validate_compound_interest(
        principal: float, 
        rate: float, 
        time: float, 
        n: int = 12
    ) -> Dict[str, Any]:
        """
        Validate compound interest calculation.
        
        Args:
            principal: Initial amount
            rate: Annual interest rate (as decimal, e.g., 0.07 for 7%)
            time: Time period in years
            n: Compounding frequency per year
        
        Returns:
            Dictionary with calculated amount and formula used
        """
        try:
            # Formula: A = P(1 + r/n)^(nt)
            amount = principal * (1 + rate/n) ** (n * time)
            
            return {
                'valid': True,
                'amount': round(amount, 2),
                'formula': 'A = P(1 + r/n)^(nt)',
                'inputs': {
                    'principal': principal,
                    'rate': rate,
                    'time': time,
                    'compounding_frequency': n
                }
            }
        except Exception as e:
            logger.error(f"Compound interest calculation error: {e}")
            return {'valid': False, 'error': str(e)}
    
    @staticmethod
    def validate_loan_payment(
        principal: float,
        rate: float,
        months: int
    ) -> Dict[str, Any]:
        """
        Validate monthly loan payment calculation.
        
        Args:
            principal: Loan amount
            rate: Annual interest rate (as decimal)
            months: Total number of months
        
        Returns:
            Dictionary with monthly payment and total interest
        """
        try:
            if rate == 0:
                # No interest case
                monthly_payment = principal / months
                total_interest = 0
            else:
                # Monthly interest rate
                monthly_rate = rate / 12
                
                # Formula: M = P[r(1+r)^n]/[(1+r)^n-1]
                monthly_payment = principal * (
                    monthly_rate * (1 + monthly_rate)**months
                ) / ((1 + monthly_rate)**months - 1)
                
                total_interest = (monthly_payment * months) - principal
            
            return {
                'valid': True,
                'monthly_payment': round(monthly_payment, 2),
                'total_interest': round(total_interest, 2),
                'total_paid': round(monthly_payment * months, 2),
                'formula': 'M = P[r(1+r)^n]/[(1+r)^n-1]',
                'inputs': {
                    'principal': principal,
                    'annual_rate': rate,
                    'months': months
                }
            }
        except Exception as e:
            logger.error(f"Loan payment calculation error: {e}")
            return {'valid': False, 'error': str(e)}
    
    @staticmethod
    def validate_retirement_target(
        annual_expenses: float,
        withdrawal_rate: float = 0.04
    ) -> Dict[str, Any]:
        """
        Validate retirement target using the 4% rule or custom withdrawal rate.
        
        Args:
            annual_expenses: Annual expenses in retirement
            withdrawal_rate: Safe withdrawal rate (default 4%)
        
        Returns:
            Dictionary with required portfolio size
        """
        try:
            # Portfolio = Annual Expenses / Withdrawal Rate
            required_portfolio = annual_expenses / withdrawal_rate
            
            return {
                'valid': True,
                'required_portfolio': round(required_portfolio, 2),
                'annual_expenses': annual_expenses,
                'withdrawal_rate': withdrawal_rate,
                'withdrawal_rate_percent': withdrawal_rate * 100,
                'formula': 'Portfolio = Annual Expenses / Withdrawal Rate',
                'notes': f"Using {withdrawal_rate*100}% safe withdrawal rate"
            }
        except Exception as e:
            logger.error(f"Retirement target calculation error: {e}")
            return {'valid': False, 'error': str(e)}
    
    @staticmethod
    def validate_future_value(
        monthly_payment: float,
        rate: float,
        years: int
    ) -> Dict[str, Any]:
        """
        Validate future value of regular investments.
        
        Args:
            monthly_payment: Monthly investment amount
            rate: Annual return rate (as decimal)
            years: Investment period in years
        
        Returns:
            Dictionary with future value
        """
        try:
            months = years * 12
            monthly_rate = rate / 12
            
            if monthly_rate == 0:
                # No growth case
                future_value = monthly_payment * months
            else:
                # FV = PMT * [((1 + r)^n - 1) / r]
                future_value = monthly_payment * (
                    ((1 + monthly_rate)**months - 1) / monthly_rate
                )
            
            total_invested = monthly_payment * months
            total_gains = future_value - total_invested
            
            return {
                'valid': True,
                'future_value': round(future_value, 2),
                'total_invested': round(total_invested, 2),
                'total_gains': round(total_gains, 2),
                'formula': 'FV = PMT * [((1 + r)^n - 1) / r]',
                'inputs': {
                    'monthly_payment': monthly_payment,
                    'annual_rate': rate,
                    'years': years
                }
            }
        except Exception as e:
            logger.error(f"Future value calculation error: {e}")
            return {'valid': False, 'error': str(e)}
    
    @staticmethod
    def validate_debt_payoff(
        debts: List[Dict[str, float]],
        extra_payment: float = 0,
        strategy: str = 'avalanche'
    ) -> Dict[str, Any]:
        """
        Validate debt payoff calculations using avalanche or snowball method.
        
        Args:
            debts: List of dicts with 'balance', 'rate', 'minimum_payment'
            extra_payment: Extra amount available for debt payments
            strategy: 'avalanche' (highest rate first) or 'snowball' (lowest balance first)
        
        Returns:
            Dictionary with payoff order and timeline
        """
        try:
            if strategy == 'avalanche':
                # Sort by interest rate (highest first)
                sorted_debts = sorted(debts, key=lambda x: x['rate'], reverse=True)
            else:  # snowball
                # Sort by balance (lowest first)
                sorted_debts = sorted(debts, key=lambda x: x['balance'])
            
            payoff_order = []
            total_interest = 0
            months_to_payoff = 0
            
            for debt in sorted_debts:
                balance = debt['balance']
                rate = debt['rate']
                min_payment = debt['minimum_payment']
                payment = min_payment + extra_payment
                
                # Calculate months to pay off
                if rate == 0:
                    months = math.ceil(balance / payment)
                    interest = 0
                else:
                    monthly_rate = rate / 12
                    if payment <= balance * monthly_rate:
                        # Payment too low
                        months = float('inf')
                        interest = float('inf')
                    else:
                        # Calculate months: n = -log(1 - (P*r)/M) / log(1+r)
                        months = math.ceil(
                            -math.log(1 - (balance * monthly_rate) / payment) / 
                            math.log(1 + monthly_rate)
                        )
                        interest = (payment * months) - balance
                
                payoff_order.append({
                    'debt_name': debt.get('name', 'Debt'),
                    'balance': balance,
                    'rate': rate,
                    'months_to_payoff': months,
                    'total_interest': round(interest, 2)
                })
                
                total_interest += interest
                months_to_payoff = max(months_to_payoff, months)
            
            return {
                'valid': True,
                'strategy': strategy,
                'payoff_order': payoff_order,
                'total_interest': round(total_interest, 2),
                'months_to_freedom': months_to_payoff,
                'extra_payment': extra_payment
            }
        except Exception as e:
            logger.error(f"Debt payoff calculation error: {e}")
            return {'valid': False, 'error': str(e)}
    
    @staticmethod
    def validate_affordability(
        income: float,
        expenses: float,
        new_payment: float,
        emergency_fund: float,
        recommended_buffer: float = 0.2
    ) -> Dict[str, Any]:
        """
        Validate if a new payment is affordable.
        
        Args:
            income: Monthly income
            expenses: Current monthly expenses
            new_payment: New monthly payment to evaluate
            emergency_fund: Current emergency fund balance
            recommended_buffer: Recommended income buffer (default 20%)
        
        Returns:
            Dictionary with affordability assessment
        """
        try:
            current_surplus = income - expenses
            new_surplus = income - expenses - new_payment
            
            # Check various affordability criteria
            can_afford = new_surplus > 0
            maintains_buffer = new_surplus >= (income * recommended_buffer)
            emergency_fund_months = emergency_fund / (expenses + new_payment) if (expenses + new_payment) > 0 else 0
            has_adequate_emergency = emergency_fund_months >= 3
            
            # Calculate debt-to-income ratio
            dti_ratio = (expenses + new_payment) / income if income > 0 else float('inf')
            
            return {
                'valid': True,
                'can_afford': can_afford,
                'maintains_buffer': maintains_buffer,
                'has_adequate_emergency': has_adequate_emergency,
                'current_surplus': round(current_surplus, 2),
                'new_surplus': round(new_surplus, 2),
                'debt_to_income_ratio': round(dti_ratio * 100, 2),
                'emergency_fund_months': round(emergency_fund_months, 1),
                'recommendation': 'Affordable' if (can_afford and maintains_buffer and has_adequate_emergency) else 'Risky',
                'concerns': []
            }
        except Exception as e:
            logger.error(f"Affordability calculation error: {e}")
            return {'valid': False, 'error': str(e)}
    
    @staticmethod
    def validate_percentage_change(
        old_value: float,
        new_value: float
    ) -> Dict[str, Any]:
        """
        Validate percentage change calculation.
        
        Args:
            old_value: Original value
            new_value: New value
        
        Returns:
            Dictionary with percentage change
        """
        try:
            if old_value == 0:
                if new_value == 0:
                    percentage_change = 0
                else:
                    percentage_change = float('inf') if new_value > 0 else float('-inf')
            else:
                percentage_change = ((new_value - old_value) / abs(old_value)) * 100
            
            return {
                'valid': True,
                'old_value': old_value,
                'new_value': new_value,
                'absolute_change': new_value - old_value,
                'percentage_change': round(percentage_change, 2) if not math.isinf(percentage_change) else percentage_change,
                'direction': 'increase' if new_value > old_value else 'decrease' if new_value < old_value else 'no change'
            }
        except Exception as e:
            logger.error(f"Percentage change calculation error: {e}")
            return {'valid': False, 'error': str(e)}