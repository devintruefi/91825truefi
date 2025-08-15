"""
Observability Helper - Structured JSON logging for all agents
"""
import json
import logging
import uuid
from datetime import datetime
from typing import Dict, Any, Optional, List
import sys

def build_request_id() -> str:
    """Generate a unique request ID if not provided."""
    return str(uuid.uuid4())[:8]

def json_log(logger: logging.Logger, 
             level: str,
             request_id: Optional[str] = None,
             **fields) -> None:
    """
    Emit structured JSON log with standard schema.
    
    Standard fields:
    - ts: ISO8601 timestamp
    - level: INFO|WARN|ERROR
    - agent: SimpleSupervisorAgent|SimpleSQLAgent|FinancialModelingAgent
    - request_id: Unique request identifier
    - scenario: Optional test scenario name
    - routing_decision: ModelingOnly|SQL+Modeling|N/A
    - required_agents: List of required agents
    - sql_brief_used: Whether SQL cashflow brief was used
    - sources_used: Data sources utilized
    - assumptions: List of assumptions made
    - data_gaps: List of missing data
    - completeness_score: 0.0-1.0
    - verdict: PASS|NEEDS_DATA|WARN
    - notes: Short descriptive text
    """
    # Build log entry
    log_entry = {
        "ts": datetime.now().isoformat(),
        "level": level.upper(),
        "request_id": request_id or build_request_id()
    }
    
    # Add all provided fields
    log_entry.update(fields)
    
    # Ensure lists are properly formatted
    list_fields = ['required_agents', 'sources_used', 'assumptions', 'data_gaps']
    for field in list_fields:
        if field in log_entry and log_entry[field] is not None:
            if not isinstance(log_entry[field], list):
                log_entry[field] = [log_entry[field]]
    
    # Emit as JSON string
    json_str = json.dumps(log_entry, default=str)
    
    # Log at appropriate level
    if level.upper() == "ERROR":
        logger.error(json_str)
    elif level.upper() == "WARN":
        logger.warning(json_str)
    else:
        logger.info(json_str)
    
    # Also write to JSONL file if in test mode
    if 'scenario' in fields and fields['scenario']:
        write_to_jsonl(log_entry)

def write_to_jsonl(log_entry: Dict[str, Any]) -> None:
    """Write log entry to JSONL file for test scenarios."""
    try:
        # Get scenario name and create path
        scenario = log_entry.get('scenario', 'unknown')
        logs_dir = f"logs/benchmark_{datetime.now().strftime('%Y%m%d')}"
        scenario_dir = f"{logs_dir}/{scenario}"
        
        # Create directories if needed
        import os
        os.makedirs(scenario_dir, exist_ok=True)
        
        # Write to agents.jsonl
        jsonl_path = f"{scenario_dir}/agents.jsonl"
        with open(jsonl_path, 'a') as f:
            f.write(json.dumps(log_entry, default=str) + '\n')
    except Exception as e:
        # Silently fail - don't break main flow for logging issues
        pass

class ObservabilityContext:
    """Context manager for structured logging within a request."""
    
    def __init__(self, agent_name: str, request_id: Optional[str] = None, scenario: Optional[str] = None):
        self.agent_name = agent_name
        self.request_id = request_id or build_request_id()
        self.scenario = scenario
        self.start_time = datetime.now()
        self.fields = {
            'agent': agent_name,
            'request_id': self.request_id
        }
        if scenario:
            self.fields['scenario'] = scenario
    
    def log(self, logger: logging.Logger, level: str, **extra_fields) -> None:
        """Log with context fields automatically included."""
        fields = {**self.fields, **extra_fields}
        # Don't pass request_id separately since it's in fields
        json_log(logger, level, **fields)
    
    def set_routing(self, routing_decision: str, required_agents: List[str], 
                    sources_used: List[str], sql_brief_used: bool = False) -> None:
        """Set routing-related fields."""
        self.fields.update({
            'routing_decision': routing_decision,
            'required_agents': required_agents,
            'sources_used': sources_used,
            'sql_brief_used': sql_brief_used
        })
    
    def set_provenance(self, assumptions: List[str], data_gaps: List[str],
                      completeness_score: float, verdict: str) -> None:
        """Set provenance-related fields."""
        self.fields.update({
            'assumptions': assumptions,
            'data_gaps': data_gaps,
            'completeness_score': completeness_score,
            'verdict': verdict
        })
    
    def set_math_checks(self, **math_fields) -> None:
        """Set mathematical validation fields."""
        self.fields.update(math_fields)

# Validation helpers for mathematical checks
def validate_dti(gross_income: float, housing_payment: float, total_debt: float) -> Dict[str, Any]:
    """Validate DTI calculations."""
    if gross_income <= 0:
        return {'dti_valid': False, 'dti_error': 'Invalid income'}
    
    dti_gross = housing_payment / gross_income
    dti_total = total_debt / gross_income
    
    return {
        'dti_gross': round(dti_gross, 4),
        'dti_total': round(dti_total, 4),
        'dti_valid': True,
        'dti_gross_ok': dti_gross <= 0.28,
        'dti_total_ok': dti_total <= 0.43
    }

def validate_housing_costs(home_price: float, down_payment_pct: float, 
                          rate: float, property_tax_rate: float = 0.011,
                          insurance_multiplier: float = 1.0) -> Dict[str, Any]:
    """Validate housing cost calculations with configurable rates."""
    loan_amount = home_price * (1 - down_payment_pct)
    
    # Monthly payment calculation (30-year)
    monthly_rate = rate / 12
    n_payments = 360
    if monthly_rate > 0:
        pi = loan_amount * (monthly_rate * (1 + monthly_rate)**n_payments) / ((1 + monthly_rate)**n_payments - 1)
    else:
        pi = loan_amount / n_payments
    
    # Property tax (configurable rate)
    p_tax = home_price * property_tax_rate / 12
    
    # Insurance (configurable multiplier)
    base_insurance = home_price * 0.0035 / 12  # 0.35% annually
    insurance = base_insurance * insurance_multiplier
    
    # PMI if down payment < 20%
    pmi = 0
    pmi_used = False
    if down_payment_pct < 0.20:
        pmi = loan_amount * 0.005 / 12  # 0.5% of loan annually
        pmi_used = True
    
    # HOA estimate (national median)
    hoa = 200  # Conservative estimate
    
    total_housing = pi + p_tax + insurance + pmi + hoa
    
    return {
        'loan_amount': round(loan_amount, 2),
        'pi': round(pi, 2),
        'p_tax': round(p_tax, 2),
        'insurance': round(insurance, 2),
        'pmi': round(pmi, 2),
        'pmi_used': pmi_used,
        'hoa': round(hoa, 2),
        'total_housing': round(total_housing, 2),
        'configurable_rates_applied': True
    }

def check_liquid_vs_retirement(assets: Dict[str, Any]) -> Dict[str, Any]:
    """Ensure retirement funds are not counted as liquid."""
    liquid = assets.get('cash_depository', 0) + assets.get('taxable_investments', 0)
    retirement = assets.get('retirement_balances', 0)
    
    # Check for common errors
    errors = []
    if 'liquid_total' in assets and assets['liquid_total'] > liquid + 1000:  # Small tolerance
        if abs(assets['liquid_total'] - (liquid + retirement)) < 1000:
            errors.append('retirement_counted_as_liquid')
    
    if assets.get('cc_total_balance', 0) < 0:  # Credit should be positive debt
        errors.append('credit_sign_error')
    
    return {
        'liquid_correct': liquid,
        'retirement_separate': retirement,
        'validation_errors': errors,
        'liquid_valid': len(errors) == 0
    }

def check_anomalous_budgets(budgets: List[Dict[str, Any]], threshold: float = 10000) -> Dict[str, Any]:
    """Check for anomalous budget values."""
    anomalous = []
    for budget in budgets:
        if budget.get('amount', 0) > threshold:
            anomalous.append({
                'name': budget.get('name'),
                'amount': budget.get('amount'),
                'flagged': True
            })
    
    return {
        'budgets_flagged_bad': len(anomalous) > 0,
        'anomalous_budgets': anomalous,
        'budgets_validation': 'ignored' if anomalous else 'used'
    }