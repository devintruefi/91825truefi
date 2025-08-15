"""
Currency-Neutral Context Formatter
Provides currency-neutral formatting for agent context building
"""
import logging
from typing import Dict, Any, Optional, Union, List
from decimal import Decimal

logger = logging.getLogger(__name__)

class CurrencyNeutralFormatter:
    """
    Formats financial context without assuming any specific currency.
    """
    
    def __init__(self, user_currency_hint: Optional[str] = None):
        """
        Initialize with optional currency hint from user profile.
        """
        self.user_currency_hint = user_currency_hint
    
    def format_balance(self, amount: Union[float, int, Decimal], 
                      account_currency: Optional[str] = None) -> str:
        """
        Format balance without assuming currency symbol.
        """
        if account_currency:
            return f"{amount:,.2f} {account_currency}"
        elif self.user_currency_hint:
            return f"{amount:,.2f} {self.user_currency_hint}"
        else:
            return f"{amount:,.2f}"
    
    def format_amount(self, amount: Union[float, int, Decimal], 
                     context: Optional[str] = None) -> str:
        """
        Format amount with optional context.
        """
        if context:
            return f"{amount:,.2f} ({context})"
        else:
            return f"{amount:,.2f}"
    
    def format_percentage(self, value: Union[float, Decimal], decimals: int = 1) -> str:
        """
        Format percentage consistently.
        """
        return f"{value:.{decimals}f}%"
    
    def build_currency_neutral_context(self, db_context: Dict[str, Any], user_name: str) -> str:
        """
        Build financial context string without currency assumptions.
        """
        context_parts = [f"User: {user_name}"]
        
        # Get user's preferred currency if available
        user_currency = db_context.get('user_currency') or self.user_currency_hint
        currency_suffix = f" {user_currency}" if user_currency else ""
        
        # Accounts - currency neutral
        accounts = db_context.get('account_details', [])
        if accounts:
            context_parts.append("\nAccounts:")
            for acc in accounts[:20]:
                balance_str = f"{acc['balance']:,.2f}{currency_suffix}"
                context_parts.append(f"- {acc['name']}: {balance_str} ({acc['type']})")
        
        # Assets
        assets = db_context.get('manual_assets', [])
        if assets:
            context_parts.append("\nAssets:")
            for asset in assets[:10]:
                value_str = f"{asset['value']:,.2f}{currency_suffix}"
                context_parts.append(f"- {asset['name']}: {value_str}")
        
        # Liabilities
        liabilities = db_context.get('manual_liabilities', [])
        if liabilities:
            context_parts.append("\nLiabilities:")
            for liability in liabilities[:10]:
                balance_str = f"{liability['balance']:,.2f}{currency_suffix}"
                context_parts.append(f"- {liability['name']}: {balance_str}")
        
        # Goals
        goals = db_context.get('goals', [])
        if goals:
            context_parts.append("\nGoals:")
            for goal in goals[:10]:
                progress = (goal['current_amount'] / goal['target_amount'] * 100) if goal['target_amount'] > 0 else 0
                current_str = f"{goal['current_amount']:,.2f}{currency_suffix}"
                target_str = f"{goal['target_amount']:,.2f}{currency_suffix}"
                context_parts.append(f"- {goal['name']}: {current_str} / {target_str} ({progress:.1f}%)")
        
        # Budgets
        budgets = db_context.get('budgets', [])
        budget_categories = db_context.get('budget_categories', [])
        
        if budgets:
            context_parts.append("\nBudgets:")
            for budget in budgets[:10]:
                amount_str = f"{budget['amount']:,.2f}{currency_suffix}"
                context_parts.append(f"- {budget['name']}: {amount_str} per {budget['period']}")
                # Add budget categories if available
                budget_cats = [cat for cat in budget_categories if cat.get('budget_id') == budget.get('id')]
                if budget_cats:
                    for cat in budget_cats[:5]:
                        limit_str = f"{cat.get('limit', 0):,.2f}{currency_suffix}"
                        context_parts.append(f"  • {cat.get('category', 'Unknown')}: {limit_str}")
        
        # Recurring Income
        income = db_context.get('recurring_income', [])
        if income:
            context_parts.append("\nRecurring Income:")
            for inc in income[:5]:
                monthly_str = f"{inc['gross_monthly']:,.2f}{currency_suffix}"
                context_parts.append(f"- {inc['source']}: {monthly_str}/month")
        
        # Top Categories (last 6 months)
        categories = db_context.get('top_categories', [])
        if categories:
            context_parts.append("\nTop Spending Categories:")
            for cat in categories[:10]:
                spent_str = f"{abs(cat['total_spent']):,.2f}{currency_suffix}"
                context_parts.append(f"- {cat['category']}: {spent_str}")
        
        # Top Merchants (last 6 months)
        merchants = db_context.get('top_merchants', [])
        if merchants:
            context_parts.append("\nTop Merchants:")
            for merchant in merchants[:10]:
                spent_str = f"{abs(merchant['total_spent']):,.2f}{currency_suffix}"
                context_parts.append(f"- {merchant['merchant']}: {spent_str}")
        
        # Net Worth calculation
        financial_summary = db_context.get('financial_summary', {})
        if financial_summary and 'net_worth' in financial_summary:
            net_worth = financial_summary['net_worth']
        else:
            # Fallback calculation
            total_assets = sum(acc['balance'] for acc in accounts) + sum(a['value'] for a in assets)
            total_liabilities = sum(l['balance'] for l in liabilities)
            net_worth = total_assets - total_liabilities
        
        net_worth_str = f"{net_worth:,.2f}{currency_suffix}"
        context_parts.append(f"\nNet Worth: {net_worth_str}")
        
        return '\n'.join(context_parts)


def create_currency_neutral_formatter(user_context: Optional[Dict[str, Any]] = None) -> CurrencyNeutralFormatter:
    """
    Create currency neutral formatter from user context.
    """
    user_currency = None
    if user_context:
        user_currency = user_context.get('currency_preference') or user_context.get('user_currency')
    
    return CurrencyNeutralFormatter(user_currency)