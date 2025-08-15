"""
Currency-Agnostic Financial Formatter
Provides currency-neutral formatting and calculation utilities
"""
import logging
from typing import Dict, Any, Optional, Union, List
from decimal import Decimal, getcontext
import re

logger = logging.getLogger(__name__)

# Set precision for financial calculations
getcontext().prec = 10

class CurrencyAgnosticFormatter:
    """
    Currency-neutral financial formatter that never assumes USD or any specific locale.
    All operations require explicit currency specification.
    """
    
    # Currency symbols and their decimal precision
    CURRENCY_CONFIGS = {
        'USD': {'symbol': '$', 'decimals': 2, 'decimal_sep': '.', 'thousands_sep': ','},
        'EUR': {'symbol': '€', 'decimals': 2, 'decimal_sep': '.', 'thousands_sep': ','},
        'GBP': {'symbol': '£', 'decimals': 2, 'decimal_sep': '.', 'thousands_sep': ','},
        'JPY': {'symbol': '¥', 'decimals': 0, 'decimal_sep': '.', 'thousands_sep': ','},
        'CAD': {'symbol': 'C$', 'decimals': 2, 'decimal_sep': '.', 'thousands_sep': ','},
        'AUD': {'symbol': 'A$', 'decimals': 2, 'decimal_sep': '.', 'thousands_sep': ','},
        'CHF': {'symbol': 'CHF', 'decimals': 2, 'decimal_sep': '.', 'thousands_sep': ','},
        'CNY': {'symbol': '¥', 'decimals': 2, 'decimal_sep': '.', 'thousands_sep': ','},
        # Generic fallback
        'XXX': {'symbol': '', 'decimals': 2, 'decimal_sep': '.', 'thousands_sep': ','}
    }
    
    def __init__(self, default_currency: Optional[str] = None):
        """
        Initialize with optional default currency.
        If no default is provided, all operations require explicit currency.
        """
        self.default_currency = default_currency
        if default_currency and default_currency not in self.CURRENCY_CONFIGS:
            logger.warning(f"Unknown currency {default_currency}, using generic config")
            self.CURRENCY_CONFIGS[default_currency] = self.CURRENCY_CONFIGS['XXX'].copy()
    
    def format_amount(self, amount: Union[float, Decimal, int], 
                     currency: Optional[str] = None,
                     include_symbol: bool = True,
                     compact: bool = False) -> str:
        """
        Format amount with currency-specific rules.
        
        Args:
            amount: Amount to format
            currency: Currency code (required if no default set)
            include_symbol: Include currency symbol
            compact: Use compact notation (1.2K, 1.5M, etc.)
        
        Returns:
            Formatted string
        """
        if currency is None:
            currency = self.default_currency
        
        if currency is None:
            raise ValueError("Currency must be specified")
        
        config = self.CURRENCY_CONFIGS.get(currency, self.CURRENCY_CONFIGS['XXX'])
        
        # Convert to Decimal for precision
        amount = Decimal(str(amount))
        
        # Handle compact notation
        if compact:
            abs_amount = abs(amount)
            if abs_amount >= Decimal('1000000000'):
                amount_str = f"{amount / Decimal('1000000000'):.1f}B"
            elif abs_amount >= Decimal('1000000'):
                amount_str = f"{amount / Decimal('1000000'):.1f}M"
            elif abs_amount >= Decimal('1000'):
                amount_str = f"{amount / Decimal('1000'):.1f}K"
            else:
                amount_str = f"{amount:.{config['decimals']}f}"
        else:
            # Standard formatting with proper decimal places
            amount_str = f"{amount:,.{config['decimals']}f}"
            
            # Apply locale-specific separators if different
            if config['decimal_sep'] != '.':
                amount_str = amount_str.replace('.', '|TEMP|')
                amount_str = amount_str.replace(',', config['thousands_sep'])
                amount_str = amount_str.replace('|TEMP|', config['decimal_sep'])
        
        # Add currency symbol
        if include_symbol:
            symbol = config['symbol']
            if amount < 0:
                # Handle negative amounts
                if symbol:
                    amount_str = f"-{symbol}{amount_str[1:]}"  # Remove the negative sign and prepend -symbol
                else:
                    amount_str = f"-{amount_str[1:]} {currency}"
            else:
                if symbol:
                    amount_str = f"{symbol}{amount_str}"
                else:
                    amount_str = f"{amount_str} {currency}"
        
        return amount_str
    
    def parse_amount(self, amount_str: str, currency: Optional[str] = None) -> Decimal:
        """
        Parse amount from string, handling various currency formats.
        
        Args:
            amount_str: String representation of amount
            currency: Expected currency (for validation)
            
        Returns:
            Decimal amount
        """
        if currency is None:
            currency = self.default_currency
        
        # Remove whitespace
        amount_str = amount_str.strip()
        
        # Remove currency symbols and codes
        for curr_code, config in self.CURRENCY_CONFIGS.items():
            symbol = config['symbol']
            if symbol and symbol in amount_str:
                amount_str = amount_str.replace(symbol, '')
            if curr_code in amount_str:
                amount_str = amount_str.replace(curr_code, '')
        
        # Handle compact notation
        multipliers = {'K': 1000, 'M': 1000000, 'B': 1000000000}
        for suffix, multiplier in multipliers.items():
            if amount_str.upper().endswith(suffix):
                amount_str = amount_str[:-1]
                try:
                    return Decimal(amount_str) * Decimal(multiplier)
                except:
                    raise ValueError(f"Invalid compact amount format: {amount_str}{suffix}")
        
        # Clean up separators and convert
        # Remove thousands separators, keep decimal separator
        amount_str = re.sub(r'[,\s]', '', amount_str)
        
        try:
            return Decimal(amount_str)
        except:
            raise ValueError(f"Invalid amount format: {amount_str}")
    
    def convert_currency(self, amount: Union[float, Decimal], 
                        from_currency: str, 
                        to_currency: str,
                        exchange_rate: Decimal) -> Decimal:
        """
        Convert between currencies using provided exchange rate.
        
        Args:
            amount: Amount to convert
            from_currency: Source currency
            to_currency: Target currency
            exchange_rate: Exchange rate (to_currency per from_currency)
            
        Returns:
            Converted amount
        """
        amount = Decimal(str(amount))
        return amount * exchange_rate
    
    def format_percentage(self, value: Union[float, Decimal], decimals: int = 1) -> str:
        """
        Format percentage consistently.
        
        Args:
            value: Percentage value (0.1 = 10%)
            decimals: Number of decimal places
            
        Returns:
            Formatted percentage string
        """
        value = Decimal(str(value)) * 100
        return f"{value:.{decimals}f}%"
    
    def create_currency_context(self, primary_currency: str, 
                               secondary_currencies: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Create context for multi-currency operations.
        
        Args:
            primary_currency: Primary currency for calculations
            secondary_currencies: Additional currencies that may appear
            
        Returns:
            Currency context dictionary
        """
        context = {
            'primary': primary_currency,
            'primary_config': self.CURRENCY_CONFIGS.get(primary_currency, self.CURRENCY_CONFIGS['XXX']),
            'secondary': secondary_currencies or [],
            'requires_conversion': len(secondary_currencies or []) > 0,
            'supported_currencies': list(self.CURRENCY_CONFIGS.keys())
        }
        
        return context
    
    def validate_currency_consistency(self, amounts: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate that all amounts use consistent currency or explicit conversions.
        
        Args:
            amounts: Dictionary of amount descriptions and values
            
        Returns:
            Validation result
        """
        detected_currencies = set()
        issues = []
        
        for key, value in amounts.items():
            if isinstance(value, str):
                # Try to detect currency from string
                for curr_code, config in self.CURRENCY_CONFIGS.items():
                    if config['symbol'] and config['symbol'] in value:
                        detected_currencies.add(curr_code)
                        break
                    elif curr_code in value:
                        detected_currencies.add(curr_code)
                        break
        
        if len(detected_currencies) > 1:
            issues.append(f"Multiple currencies detected: {detected_currencies}")
        elif len(detected_currencies) == 0:
            issues.append("No currency symbols detected - currency ambiguous")
        
        return {
            'valid': len(issues) == 0,
            'detected_currencies': list(detected_currencies),
            'issues': issues,
            'primary_currency': list(detected_currencies)[0] if detected_currencies else None
        }

def create_currency_agnostic_context(user_currency: Optional[str] = None,
                                   region_hint: Optional[str] = None) -> Dict[str, Any]:
    """
    Create currency-agnostic context for financial operations.
    
    Args:
        user_currency: User's preferred currency (if known)
        region_hint: Geographic region hint (if available)
        
    Returns:
        Context dictionary for currency operations
    """
    formatter = CurrencyAgnosticFormatter(user_currency)
    
    # Infer currency from region if not explicitly provided
    region_currency_map = {
        'US': 'USD', 'CA': 'CAD', 'GB': 'GBP', 'EU': 'EUR', 
        'JP': 'JPY', 'AU': 'AUD', 'CH': 'CHF', 'CN': 'CNY'
    }
    
    inferred_currency = None
    if region_hint and not user_currency:
        inferred_currency = region_currency_map.get(region_hint.upper())
    
    return {
        'formatter': formatter,
        'user_currency': user_currency,
        'inferred_currency': inferred_currency,
        'region_hint': region_hint,
        'requires_currency_specification': user_currency is None and inferred_currency is None,
        'available_currencies': list(formatter.CURRENCY_CONFIGS.keys()),
        'format_guidance': {
            'always_specify_currency': True,
            'use_explicit_rates_for_conversion': True,
            'validate_consistency': True
        }
    }