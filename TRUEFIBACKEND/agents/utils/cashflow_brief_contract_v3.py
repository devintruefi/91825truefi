"""
CashFlow Brief Contract v3 - Formal contract system with type safety and guarantees
Enhanced with strict validation, versioning, and comprehensive error handling
"""
import logging
from typing import Dict, Any, Optional, List, Union, Protocol, runtime_checkable
from dataclasses import dataclass, field
from decimal import Decimal, ROUND_HALF_UP
from enum import Enum
from datetime import datetime, timezone
import hashlib
import json

logger = logging.getLogger(__name__)

class ContractVersion(Enum):
    """Contract versions for backwards compatibility."""
    V1 = "v1.0"
    V2 = "v2.0"
    V3 = "v3.0"

class ValidationSeverity(Enum):
    """Validation issue severity levels."""
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"

@dataclass
class ValidationIssue:
    """Structured validation issue."""
    severity: ValidationSeverity
    field: Optional[str]
    message: str
    suggested_fix: Optional[str] = None

@dataclass
class ContractMetadata:
    """Metadata for contract compliance."""
    version: ContractVersion
    generated_at: datetime
    user_id: str
    query_hash: str
    time_window_months: int
    data_quality_score: float
    completeness_percentage: float

@runtime_checkable
class CashFlowBriefProtocol(Protocol):
    """Protocol defining the cash flow brief interface."""
    cash_depository: Decimal
    taxable_investments: Decimal
    retirement_balances: Decimal
    cc_total_balance: Decimal
    cc_num_cards: int
    installment_balance: Decimal
    installment_avg_apr: Decimal
    essentials_avg_6m: Decimal

@dataclass(frozen=True)
class CashFlowBriefV3:
    """
    Immutable, type-safe cash flow brief with comprehensive validation.
    All financial amounts use Decimal for precision.
    """
    # Core account balances (required)
    cash_depository: Decimal
    taxable_investments: Decimal
    retirement_balances: Decimal
    
    # Credit card details (required)
    cc_total_balance: Decimal
    cc_num_cards: int
    
    # Installment debt (required)
    installment_balance: Decimal
    installment_avg_apr: Decimal
    
    # Spending patterns (required)
    essentials_avg_6m: Decimal
    
    # Contract metadata
    metadata: ContractMetadata
    
    # Computed fields (automatically calculated)
    total_liquid_assets: Decimal = field(init=False)
    total_debt: Decimal = field(init=False)
    net_worth_estimate: Decimal = field(init=False)
    debt_to_income_ratio: Optional[Decimal] = field(init=False)
    
    # Data quality flags
    quality_flags: Dict[str, bool] = field(default_factory=dict, init=False)
    
    # Contextual notes
    contextual_notes: List[str] = field(default_factory=list, init=False)
    
    def __post_init__(self):
        """Calculate computed fields and generate contextual notes."""
        # Computed financial metrics
        object.__setattr__(self, 'total_liquid_assets', 
                          self.cash_depository + self.taxable_investments)
        object.__setattr__(self, 'total_debt', 
                          self.cc_total_balance + self.installment_balance)
        object.__setattr__(self, 'net_worth_estimate',
                          self.total_liquid_assets + self.retirement_balances - self.total_debt)
        
        # Calculate DTI if we have income data
        if self.essentials_avg_6m > 0:
            # Rough estimate: essential expenses are ~60-70% of total income
            estimated_monthly_income = self.essentials_avg_6m / Decimal('0.65')
            monthly_debt_payments = self._estimate_monthly_debt_payments()
            if estimated_monthly_income > 0:
                object.__setattr__(self, 'debt_to_income_ratio',
                                  monthly_debt_payments / estimated_monthly_income)
        
        # Generate quality flags
        quality_flags = {
            'no_depository_accounts': self.cash_depository == 0,
            'no_retirement_accounts': self.retirement_balances == 0,
            'has_cc_no_balance': self.cc_num_cards > 0 and self.cc_total_balance == 0,
            'no_essential_spending_data': self.essentials_avg_6m == 0,
            'high_debt_load': self.total_debt > self.total_liquid_assets * Decimal('0.5'),
            'low_liquidity': self.total_liquid_assets < self.essentials_avg_6m * 3
        }
        object.__setattr__(self, 'quality_flags', quality_flags)
        
        # Generate contextual notes
        notes = self._generate_contextual_notes()
        object.__setattr__(self, 'contextual_notes', notes)
    
    def _estimate_monthly_debt_payments(self) -> Decimal:
        """Estimate monthly debt payments from balances and rates."""
        cc_min_payment = max(
            self.cc_total_balance * Decimal('0.02'),  # 2% minimum
            Decimal('25') * self.cc_num_cards  # $25 per card
        )
        
        # Rough installment payment estimate (assuming 5-year term if no specific data)
        installment_payment = Decimal('0')
        if self.installment_balance > 0:
            # Simple approximation: balance / 60 months + interest
            monthly_interest = self.installment_avg_apr / Decimal('12')
            installment_payment = (self.installment_balance / Decimal('60')) * (1 + monthly_interest)
        
        return cc_min_payment + installment_payment
    
    def _generate_contextual_notes(self) -> List[str]:
        """Generate contextual notes based on financial profile."""
        notes = []
        
        # Account structure
        if self.quality_flags['no_depository_accounts']:
            notes.append("No depository accounts found - may impact liquidity analysis")
        if self.quality_flags['no_retirement_accounts']:
            notes.append("No retirement accounts detected - consider retirement planning")
        
        # Debt profile
        if self.cc_total_balance > 0:
            monthly_payment = self._estimate_monthly_debt_payments()
            notes.append(f"Estimated CC minimum payments: {monthly_payment:.0f}/month")
        
        if self.installment_balance > 0:
            notes.append(f"Installment debt at {self.installment_avg_apr:.2f}% APR")
        
        # Liquidity analysis
        if self.essentials_avg_6m > 0:
            months_coverage = self.total_liquid_assets / self.essentials_avg_6m
            notes.append(f"Liquid assets cover {months_coverage:.1f} months of essentials")
            
            if months_coverage < 3:
                notes.append("LOW LIQUIDITY WARNING: Less than 3 months coverage")
            elif months_coverage > 12:
                notes.append("High liquidity - consider investment opportunities")
        
        # Debt analysis
        if self.debt_to_income_ratio and self.debt_to_income_ratio > Decimal('0.4'):
            notes.append(f"HIGH DTI WARNING: Estimated {self.debt_to_income_ratio:.1%} debt-to-income")
        
        return notes
    
    def to_dict(self, include_metadata: bool = True) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        result = {
            'cash_depository': float(self.cash_depository),
            'taxable_investments': float(self.taxable_investments),
            'retirement_balances': float(self.retirement_balances),
            'cc_total_balance': float(self.cc_total_balance),
            'cc_num_cards': self.cc_num_cards,
            'installment_balance': float(self.installment_balance),
            'installment_avg_apr': float(self.installment_avg_apr),
            'essentials_avg_6m': float(self.essentials_avg_6m),
            'total_liquid_assets': float(self.total_liquid_assets),
            'total_debt': float(self.total_debt),
            'net_worth_estimate': float(self.net_worth_estimate),
            'debt_to_income_ratio': float(self.debt_to_income_ratio) if self.debt_to_income_ratio else None,
            'quality_flags': self.quality_flags,
            'contextual_notes': self.contextual_notes
        }
        
        if include_metadata:
            result['metadata'] = {
                'version': self.metadata.version.value,
                'generated_at': self.metadata.generated_at.isoformat(),
                'user_id': self.metadata.user_id,
                'query_hash': self.metadata.query_hash,
                'time_window_months': self.metadata.time_window_months,
                'data_quality_score': self.metadata.data_quality_score,
                'completeness_percentage': self.metadata.completeness_percentage
            }
        
        return result
    
    def get_contract_hash(self) -> str:
        """Generate hash for contract verification."""
        contract_data = self.to_dict(include_metadata=False)
        contract_str = json.dumps(contract_data, sort_keys=True, default=str)
        return hashlib.sha256(contract_str.encode()).hexdigest()[:16]

class CashFlowBriefContractV3:
    """
    Formal contract system for CashFlow Brief with strict validation and type safety.
    """
    
    @staticmethod
    def get_contract_compliant_query(time_window_months: int = 6) -> str:
        """
        Get SQL query that guarantees contract compliance.
        
        Args:
            time_window_months: Number of months for spending analysis
            
        Returns:
            SQL query string with parameter placeholders
        """
        return f"""
        WITH contract_params AS (
            SELECT %s::UUID as user_id, {time_window_months}::INTEGER as time_window
        ),
        cash_depository AS (
            SELECT COALESCE(SUM(balance), 0.0)::DECIMAL(15,2) as total
            FROM accounts, contract_params cp
            WHERE accounts.user_id = cp.user_id 
            AND type = 'depository' 
            AND is_active = true
        ),
        taxable_investments AS (
            SELECT COALESCE(SUM(balance), 0.0)::DECIMAL(15,2) as total
            FROM accounts, contract_params cp
            WHERE accounts.user_id = cp.user_id
            AND type = 'investment' 
            AND is_active = true
            AND (name NOT ILIKE '%%401k%%' AND name NOT ILIKE '%%ira%%' AND name NOT ILIKE '%%retirement%%')
        ),
        retirement_balances AS (
            SELECT COALESCE(SUM(balance), 0.0)::DECIMAL(15,2) as total
            FROM accounts, contract_params cp
            WHERE accounts.user_id = cp.user_id
            AND type = 'investment' 
            AND is_active = true
            AND (name ILIKE '%%401k%%' OR name ILIKE '%%ira%%' OR name ILIKE '%%retirement%%')
        ),
        cc_balances AS (
            SELECT 
                COALESCE(SUM(ABS(balance)), 0.0)::DECIMAL(15,2) as total_balance,
                COALESCE(COUNT(*), 0)::INTEGER as num_cards
            FROM accounts, contract_params cp
            WHERE accounts.user_id = cp.user_id 
            AND type = 'credit' 
            AND is_active = true
        ),
        liability_details AS (
            SELECT 
                COALESCE(SUM(balance), 0.0)::DECIMAL(15,2) as total_balance,
                COALESCE(AVG(NULLIF(interest_rate, 0)), 0.0)::DECIMAL(8,4) as avg_apr
            FROM manual_liabilities, contract_params cp
            WHERE manual_liabilities.user_id = cp.user_id
        ),
        transaction_window AS (
            SELECT 
                DATE_TRUNC('month', CURRENT_DATE - INTERVAL '%s months') as start_date,
                DATE_TRUNC('month', CURRENT_DATE) as end_date
        ),
        essential_categories AS (
            SELECT ARRAY['Food and Drink', 'Utilities', 'Transportation', 'Insurance', 
                         'Healthcare', 'Housing', 'Groceries', 'Gas'] as categories
        ),
        monthly_essentials AS (
            SELECT 
                DATE_TRUNC('month', t.date) as month,
                COALESCE(SUM(CASE 
                    WHEN t.amount < 0 AND t.category = ANY(ec.categories)
                    THEN ABS(t.amount) 
                    ELSE 0 
                END), 0.0)::DECIMAL(15,2) as essential_spend
            FROM transactions t, contract_params cp, transaction_window tw, essential_categories ec
            WHERE t.user_id = cp.user_id
            AND t.date >= tw.start_date
            AND t.date < tw.end_date
            AND t.pending = false
            GROUP BY DATE_TRUNC('month', t.date)
        ),
        essentials_avg AS (
            SELECT 
                COALESCE(AVG(essential_spend), 0.0)::DECIMAL(15,2) as avg_essential,
                COALESCE(COUNT(*), 0)::INTEGER as months_with_data,
                COALESCE(STDDEV(essential_spend), 0.0)::DECIMAL(15,2) as spend_volatility
            FROM monthly_essentials
        ),
        data_completeness AS (
            SELECT
                CASE WHEN cd.total > 0 THEN 1 ELSE 0 END +
                CASE WHEN ti.total > 0 OR rb.total > 0 THEN 1 ELSE 0 END +
                CASE WHEN ea.months_with_data >= cp.time_window * 0.5 THEN 1 ELSE 0 END as completeness_score,
                CASE 
                    WHEN ea.months_with_data >= cp.time_window * 0.8 THEN 1.0
                    WHEN ea.months_with_data >= cp.time_window * 0.5 THEN 0.7
                    WHEN ea.months_with_data > 0 THEN 0.4
                    ELSE 0.0 
                END as data_quality_score
            FROM cash_depository cd, taxable_investments ti, retirement_balances rb, 
                 essentials_avg ea, contract_params cp
        )
        SELECT 
            -- CONTRACT REQUIRED FIELDS (all guaranteed non-null)
            COALESCE(cd.total, 0.0)::DECIMAL(15,2) as cash_depository,
            COALESCE(ti.total, 0.0)::DECIMAL(15,2) as taxable_investments,
            COALESCE(rb.total, 0.0)::DECIMAL(15,2) as retirement_balances,
            COALESCE(cc.total_balance, 0.0)::DECIMAL(15,2) as cc_total_balance,
            COALESCE(cc.num_cards, 0)::INTEGER as cc_num_cards,
            COALESCE(ld.total_balance, 0.0)::DECIMAL(15,2) as installment_balance,
            COALESCE(ld.avg_apr, 0.0)::DECIMAL(8,4) as installment_avg_apr,
            COALESCE(ea.avg_essential, 0.0)::DECIMAL(15,2) as essentials_avg_6m,
            
            -- CONTRACT METADATA
            cp.user_id,
            cp.time_window as time_window_months,
            CURRENT_TIMESTAMP as generated_at,
            dc.data_quality_score,
            (dc.completeness_score::DECIMAL / 3.0 * 100.0)::DECIMAL(5,2) as completeness_percentage,
            
            -- ADDITIONAL QUALITY METRICS
            ea.months_with_data,
            ea.spend_volatility,
            
            -- RAW QUERY HASH FOR VERIFICATION
            MD5(
                cp.user_id::TEXT || cp.time_window::TEXT || 
                EXTRACT(epoch FROM DATE_TRUNC('hour', CURRENT_TIMESTAMP))::TEXT
            ) as query_hash
            
        FROM contract_params cp
        CROSS JOIN cash_depository cd
        CROSS JOIN taxable_investments ti
        CROSS JOIN retirement_balances rb  
        CROSS JOIN cc_balances cc
        CROSS JOIN liability_details ld
        CROSS JOIN essentials_avg ea
        CROSS JOIN data_completeness dc
        """
    
    @staticmethod
    def validate_and_create_brief(raw_response: Dict[str, Any], 
                                 strict_mode: bool = True) -> Union[CashFlowBriefV3, Dict[str, Any]]:
        """
        Validate raw database response and create type-safe brief.
        
        Args:
            raw_response: Raw response from database query
            strict_mode: If True, raise errors on validation failures
            
        Returns:
            CashFlowBriefV3 instance or error dict
        """
        validation_issues: List[ValidationIssue] = []
        
        # Required field validation
        required_fields = {
            'cash_depository': Decimal,
            'taxable_investments': Decimal,
            'retirement_balances': Decimal,
            'cc_total_balance': Decimal,
            'cc_num_cards': int,
            'installment_balance': Decimal,
            'installment_avg_apr': Decimal,
            'essentials_avg_6m': Decimal,
            'user_id': str,
            'time_window_months': int,
            'generated_at': datetime,
            'data_quality_score': float,
            'completeness_percentage': Decimal,
            'query_hash': str
        }
        
        # Check for missing fields
        for field, expected_type in required_fields.items():
            if field not in raw_response or raw_response[field] is None:
                validation_issues.append(ValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    field=field,
                    message=f"Required field '{field}' is missing or null",
                    suggested_fix=f"Ensure query includes {field} with COALESCE"
                ))
        
        # Stop if critical errors
        if any(issue.severity == ValidationSeverity.ERROR for issue in validation_issues):
            if strict_mode:
                raise ValueError(f"Contract validation failed: {[i.message for i in validation_issues]}")
            return {
                'valid': False,
                'errors': [i.message for i in validation_issues if i.severity == ValidationSeverity.ERROR],
                'warnings': [i.message for i in validation_issues if i.severity == ValidationSeverity.WARNING]
            }
        
        # Type conversion and cleaning
        try:
            # Convert and validate financial amounts
            cash_depository = Decimal(str(raw_response['cash_depository'])).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            taxable_investments = Decimal(str(raw_response['taxable_investments'])).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            retirement_balances = Decimal(str(raw_response['retirement_balances'])).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            cc_total_balance = Decimal(str(raw_response['cc_total_balance'])).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            cc_num_cards = int(raw_response['cc_num_cards'])
            installment_balance = Decimal(str(raw_response['installment_balance'])).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            installment_avg_apr = Decimal(str(raw_response['installment_avg_apr'])).quantize(Decimal('0.0001'), rounding=ROUND_HALF_UP)
            essentials_avg_6m = Decimal(str(raw_response['essentials_avg_6m'])).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            
            # Validation checks
            if cash_depository < 0:
                validation_issues.append(ValidationIssue(
                    severity=ValidationSeverity.WARNING,
                    field='cash_depository',
                    message="Negative cash depository balance"
                ))
            
            if cc_num_cards < 0:
                validation_issues.append(ValidationIssue(
                    severity=ValidationSeverity.WARNING,
                    field='cc_num_cards',
                    message="Negative credit card count"
                ))
            
            # Create metadata
            metadata = ContractMetadata(
                version=ContractVersion.V3,
                generated_at=raw_response['generated_at'] if isinstance(raw_response['generated_at'], datetime) 
                           else datetime.fromisoformat(str(raw_response['generated_at']).replace('Z', '+00:00')),
                user_id=str(raw_response['user_id']),
                query_hash=str(raw_response['query_hash']),
                time_window_months=int(raw_response['time_window_months']),
                data_quality_score=float(raw_response['data_quality_score']),
                completeness_percentage=float(raw_response['completeness_percentage'])
            )
            
            # Create brief
            brief = CashFlowBriefV3(
                cash_depository=cash_depository,
                taxable_investments=taxable_investments,
                retirement_balances=retirement_balances,
                cc_total_balance=cc_total_balance,
                cc_num_cards=cc_num_cards,
                installment_balance=installment_balance,
                installment_avg_apr=installment_avg_apr,
                essentials_avg_6m=essentials_avg_6m,
                metadata=metadata
            )
            
            # Log validation issues
            if validation_issues:
                logger.warning(f"Contract validation issues for user {metadata.user_id}: "
                             f"{[i.message for i in validation_issues]}")
            
            return brief
            
        except Exception as e:
            error_msg = f"Contract creation failed: {str(e)}"
            logger.error(error_msg)
            if strict_mode:
                raise ValueError(error_msg)
            return {
                'valid': False,
                'errors': [error_msg],
                'warnings': [i.message for i in validation_issues]
            }
    
    @staticmethod
    def verify_contract_integrity(brief: CashFlowBriefV3, 
                                 original_query_params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Verify contract integrity and consistency.
        
        Args:
            brief: CashFlow brief to verify
            original_query_params: Original query parameters
            
        Returns:
            Verification result
        """
        issues = []
        
        # Check computed field consistency
        expected_liquid = brief.cash_depository + brief.taxable_investments
        if abs(brief.total_liquid_assets - expected_liquid) > Decimal('0.01'):
            issues.append("Computed liquid assets field inconsistent")
        
        expected_debt = brief.cc_total_balance + brief.installment_balance
        if abs(brief.total_debt - expected_debt) > Decimal('0.01'):
            issues.append("Computed total debt field inconsistent")
        
        expected_net_worth = (brief.total_liquid_assets + brief.retirement_balances - brief.total_debt)
        if abs(brief.net_worth_estimate - expected_net_worth) > Decimal('0.01'):
            issues.append("Computed net worth field inconsistent")
        
        # Check business logic constraints
        if brief.cc_num_cards > 20:
            issues.append("Unusually high number of credit cards")
        
        if brief.installment_avg_apr > 1.0:  # 100% APR
            issues.append("Unusually high installment loan APR")
        
        # Check query parameter consistency
        if original_query_params.get('user_id') != brief.metadata.user_id:
            issues.append("User ID mismatch between query and result")
        
        return {
            'valid': len(issues) == 0,
            'issues': issues,
            'contract_hash': brief.get_contract_hash(),
            'verification_timestamp': datetime.now(timezone.utc).isoformat()
        }