"""
SQL Brief Contract - Ensures deterministic, single-row responses with exact schema
"""
import logging
from typing import Dict, Any, Optional
from dataclasses import dataclass
from decimal import Decimal

logger = logging.getLogger(__name__)

@dataclass
class CashFlowBriefSchema:
    """
    Exact schema for cashflow brief output.
    All fields must be present and have expected types.
    """
    cash_depository: float
    taxable_investments: float 
    retirement_balances: float
    cc_total_balance: float
    cc_num_cards: int
    installment_balance: float
    installment_avg_apr: float
    essentials_avg_6m: float
    time_window: str
    notes: list
    
    # Computed fields
    total_liquid_assets: float = None
    total_debt: float = None
    net_worth_estimate: float = None
    
    def __post_init__(self):
        """Compute derived fields after initialization."""
        self.total_liquid_assets = self.cash_depository + self.taxable_investments
        self.total_debt = self.cc_total_balance + self.installment_balance
        self.net_worth_estimate = (
            self.cash_depository + 
            self.taxable_investments + 
            self.retirement_balances - 
            self.total_debt
        )

class SQLBriefContract:
    """
    Enforces contract compliance for SQL brief responses.
    """
    
    @staticmethod
    def get_enhanced_cashflow_brief_query() -> str:
        """
        Get the enhanced cashflow brief query with guaranteed single row response.
        Uses COALESCE for all numeric outputs and explicit schema.
        """
        return """
        WITH cash_depository AS (
            SELECT COALESCE(SUM(balance), 0.0)::DECIMAL(12,2) as total
            FROM accounts
            WHERE user_id = %s AND type = 'depository' AND is_active = true
        ),
        taxable_investments AS (
            SELECT COALESCE(SUM(balance), 0.0)::DECIMAL(12,2) as total
            FROM accounts
            WHERE user_id = %s 
            AND type = 'investment' 
            AND is_active = true
            AND (name NOT ILIKE '%%401k%%' AND name NOT ILIKE '%%ira%%' AND name NOT ILIKE '%%retirement%%')
        ),
        retirement_balances AS (
            SELECT COALESCE(SUM(balance), 0.0)::DECIMAL(12,2) as total
            FROM accounts
            WHERE user_id = %s 
            AND type = 'investment' 
            AND is_active = true
            AND (name ILIKE '%%401k%%' OR name ILIKE '%%ira%%' OR name ILIKE '%%retirement%%')
        ),
        cc_balances AS (
            SELECT 
                COALESCE(SUM(ABS(balance)), 0.0)::DECIMAL(12,2) as total_balance,
                COALESCE(COUNT(*), 0)::INTEGER as num_cards
            FROM accounts
            WHERE user_id = %s AND type = 'credit' AND is_active = true
        ),
        liability_details AS (
            SELECT 
                COALESCE(SUM(balance), 0.0)::DECIMAL(12,2) as total_balance,
                COALESCE(AVG(interest_rate), 0.0)::DECIMAL(8,4) as avg_apr
            FROM manual_liabilities
            WHERE user_id = %s
        ),
        essentials_monthly AS (
            SELECT 
                DATE_TRUNC('month', date) as month,
                COALESCE(SUM(CASE 
                    WHEN amount < 0 AND category IN ('Food and Drink', 'Utilities', 'Transportation', 'Insurance')
                    THEN ABS(amount) 
                    ELSE 0 
                END), 0.0)::DECIMAL(12,2) as essential_spend
            FROM transactions
            WHERE user_id = %s 
            AND date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '%s months')
            AND date < DATE_TRUNC('month', CURRENT_DATE)
            AND pending = false
            GROUP BY DATE_TRUNC('month', date)
        ),
        month_series AS (
            SELECT generate_series(
                DATE_TRUNC('month', CURRENT_DATE - INTERVAL '%s months'),
                DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month'),
                '1 month'::interval
            ) as month
        ),
        essentials_filled AS (
            SELECT 
                ms.month,
                COALESCE(em.essential_spend, 0.0)::DECIMAL(12,2) as essential_spend
            FROM month_series ms
            LEFT JOIN essentials_monthly em ON ms.month = em.month
        ),
        essential_avg AS (
            SELECT 
                COALESCE(AVG(essential_spend), 0.0)::DECIMAL(12,2) as avg_essential
            FROM essentials_filled
        )
        SELECT 
            -- Core balances (guaranteed non-null via COALESCE)
            COALESCE(cd.total, 0.0)::DECIMAL(12,2) as cash_depository,
            COALESCE(ti.total, 0.0)::DECIMAL(12,2) as taxable_investments,
            COALESCE(rb.total, 0.0)::DECIMAL(12,2) as retirement_balances,
            COALESCE(cc.total_balance, 0.0)::DECIMAL(12,2) as cc_total_balance,
            COALESCE(cc.num_cards, 0)::INTEGER as cc_num_cards,
            COALESCE(ld.total_balance, 0.0)::DECIMAL(12,2) as installment_balance,
            COALESCE(ld.avg_apr, 0.0)::DECIMAL(8,4) as installment_avg_apr,
            COALESCE(ea.avg_essential, 0.0)::DECIMAL(12,2) as essentials_avg_6m,
            
            -- Computed fields
            COALESCE(cd.total + ti.total, 0.0)::DECIMAL(12,2) as total_liquid_assets,
            COALESCE(cc.total_balance + ld.total_balance, 0.0)::DECIMAL(12,2) as total_debt,
            COALESCE(cd.total + ti.total + rb.total - cc.total_balance - ld.total_balance, 0.0)::DECIMAL(12,2) as net_worth_estimate,
            
            -- Metadata
            %s::TEXT as time_window,
            CURRENT_TIMESTAMP as generated_at,
            
            -- Flags for data quality
            CASE WHEN cd.total = 0 THEN true ELSE false END as no_depository_accounts,
            CASE WHEN rb.total = 0 THEN true ELSE false END as no_retirement_accounts,
            CASE WHEN cc.num_cards > 0 AND cc.total_balance = 0 THEN true ELSE false END as has_cc_no_balance,
            CASE WHEN ea.avg_essential = 0 THEN true ELSE false END as no_essential_spending_data
            
        FROM cash_depository cd
        CROSS JOIN taxable_investments ti
        CROSS JOIN retirement_balances rb  
        CROSS JOIN cc_balances cc
        CROSS JOIN liability_details ld
        CROSS JOIN essential_avg ea
        """
    
    @staticmethod
    def validate_brief_response(response: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate that the brief response conforms to the expected contract.
        
        Args:
            response: Raw response from database
            
        Returns:
            Dictionary with validation results and cleaned data
        """
        required_fields = {
            'cash_depository': float,
            'taxable_investments': float,
            'retirement_balances': float,
            'cc_total_balance': float,
            'cc_num_cards': int,
            'installment_balance': float,
            'installment_avg_apr': float,
            'essentials_avg_6m': float,
            'total_liquid_assets': float,
            'total_debt': float,
            'net_worth_estimate': float,
            'time_window': str,
            'generated_at': str,  # Will be datetime in response
            'no_depository_accounts': bool,
            'no_retirement_accounts': bool,
            'has_cc_no_balance': bool,
            'no_essential_spending_data': bool
        }
        
        validation_result = {
            'valid': True,
            'errors': [],
            'warnings': [],
            'cleaned_data': {}
        }
        
        # Check for missing fields
        missing_fields = []
        for field, expected_type in required_fields.items():
            if field not in response:
                missing_fields.append(field)
                validation_result['errors'].append(f"Missing required field: {field}")
        
        if missing_fields:
            validation_result['valid'] = False
            return validation_result
        
        # Type validation and cleaning
        cleaned_data = {}
        for field, expected_type in required_fields.items():
            value = response[field]
            
            try:
                if expected_type == float:
                    # Handle Decimal types from database
                    if isinstance(value, Decimal):
                        cleaned_data[field] = float(value)
                    elif value is None:
                        cleaned_data[field] = 0.0
                        validation_result['warnings'].append(f"NULL value for {field}, defaulted to 0.0")
                    else:
                        cleaned_data[field] = float(value)
                        
                elif expected_type == int:
                    if value is None:
                        cleaned_data[field] = 0
                        validation_result['warnings'].append(f"NULL value for {field}, defaulted to 0")
                    else:
                        cleaned_data[field] = int(value)
                        
                elif expected_type == str:
                    if value is None:
                        cleaned_data[field] = ""
                        validation_result['warnings'].append(f"NULL value for {field}, defaulted to empty string")
                    else:
                        cleaned_data[field] = str(value)
                        
                elif expected_type == bool:
                    if value is None:
                        cleaned_data[field] = False
                        validation_result['warnings'].append(f"NULL value for {field}, defaulted to False")
                    else:
                        cleaned_data[field] = bool(value)
                
            except (ValueError, TypeError) as e:
                validation_result['errors'].append(f"Type conversion error for {field}: {e}")
                validation_result['valid'] = False
        
        # Business logic validation
        if validation_result['valid']:
            # Check for negative balances where inappropriate
            if cleaned_data['cash_depository'] < 0:
                validation_result['warnings'].append("Negative cash depository balance detected")
            
            if cleaned_data['cc_num_cards'] < 0:
                validation_result['warnings'].append("Negative credit card count detected")
            
            # Check for consistency
            if cleaned_data['cc_num_cards'] > 0 and cleaned_data['cc_total_balance'] == 0:
                cleaned_data['has_cc_no_balance'] = True
            
            # Calculate estimated credit card minimum payments
            if cleaned_data['cc_total_balance'] > 0 and cleaned_data['cc_num_cards'] > 0:
                est_min_payment = max(
                    cleaned_data['cc_total_balance'] * 0.02,  # 2% of balance
                    25 * cleaned_data['cc_num_cards']  # $25 per card minimum
                )
                cleaned_data['estimated_cc_min_payment'] = round(est_min_payment, 2)
        
        validation_result['cleaned_data'] = cleaned_data
        return validation_result
    
    @staticmethod
    def add_contextual_notes(cleaned_data: Dict[str, Any]) -> list:
        """
        Add contextual notes based on the data profile.
        
        Args:
            cleaned_data: Validated and cleaned brief data
            
        Returns:
            List of contextual notes
        """
        notes = []
        
        # Account structure notes
        if cleaned_data.get('no_depository_accounts'):
            notes.append("no_depository_accounts_found")
        
        if cleaned_data.get('no_retirement_accounts'):
            notes.append("no_retirement_accounts_found")
        
        # Debt profile notes
        if cleaned_data.get('cc_total_balance', 0) > 0:
            if cleaned_data.get('estimated_cc_min_payment'):
                notes.append(f"cc_min_payments_estimated_at_{cleaned_data['estimated_cc_min_payment']:.0f}")
        
        if cleaned_data.get('installment_balance', 0) > 0:
            apr = cleaned_data.get('installment_avg_apr', 0)
            notes.append(f"installment_debt_avg_apr_{apr:.2f}%")
        
        # Spending profile notes
        if cleaned_data.get('no_essential_spending_data'):
            notes.append("no_essential_spending_data_found")
        elif cleaned_data.get('essentials_avg_6m', 0) > 0:
            notes.append(f"essential_expenses_avg_{cleaned_data['essentials_avg_6m']:.0f}/month")
        
        # Liquidity notes
        liquid_ratio = 0
        if cleaned_data.get('essentials_avg_6m', 0) > 0:
            liquid_ratio = cleaned_data.get('total_liquid_assets', 0) / cleaned_data['essentials_avg_6m']
            notes.append(f"liquid_coverage_{liquid_ratio:.1f}_months")
        
        return notes