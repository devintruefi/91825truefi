"""
Routing Helper - Deterministic routing logic for the supervisor agent
"""
import logging
from typing import Dict, Any, List, Tuple, Optional
from enum import Enum

logger = logging.getLogger(__name__)

class RoutingDecision(Enum):
    """Possible routing decisions."""
    MODELING_ONLY = "ModelingOnly"
    SQL_ONLY = "SQLOnly" 
    SQL_PLUS_MODELING = "SQL+Modeling"
    KNOWLEDGE_ONLY = "KnowledgeOnly"
    UNSUPPORTED = "Unsupported"

class DataSource(Enum):
    """Possible data sources."""
    SQL_CASHFLOW_BRIEF = "sql_cashflow_brief"
    RECURRING_INCOME = "recurring_income"
    MANUAL_LIABILITIES = "manual_liabilities"
    FULL_DB_DUMP = "full_db_dump"

class RoutingHelper:
    """
    Deterministic routing logic with explicit decision gates.
    """
    
    @staticmethod
    def determine_routing(
        plan: Dict[str, Any], 
        db_context: Dict[str, Any],
        request_id: str
    ) -> Tuple[RoutingDecision, List[DataSource], bool]:
        """
        Determine routing decision based on plan and available context.
        
        Args:
            plan: Plan from the planner
            db_context: Available database context 
            request_id: Request ID for logging
            
        Returns:
            Tuple of (routing_decision, data_sources_used, sql_brief_needed)
        """
        # Extract plan details
        required_agents = plan.get('required_agents', [])
        intent = plan.get('intent', '')
        data_sources = plan.get('data_sources', [])
        
        logger.info(f"[{request_id}] Routing analysis: intent={intent}, required_agents={required_agents}")
        
        # Decision Gate 1: Check if it's a knowledge-only query
        if RoutingHelper._is_knowledge_only_query(plan):
            logger.info(f"[{request_id}] Routing: Knowledge-only query detected")
            return RoutingDecision.KNOWLEDGE_ONLY, [], False
            
        # Decision Gate 2: Check if explicitly requires SQL
        if 'SQL_AGENT' in required_agents:
            if 'FINANCIAL_MODELING_AGENT' in required_agents:
                logger.info(f"[{request_id}] Routing: SQL+Modeling explicitly required")
                return (
                    RoutingDecision.SQL_PLUS_MODELING, 
                    [DataSource.SQL_CASHFLOW_BRIEF], 
                    True
                )
            else:
                logger.info(f"[{request_id}] Routing: SQL-only explicitly required")
                return RoutingDecision.SQL_ONLY, [DataSource.SQL_CASHFLOW_BRIEF], True
                
        # Decision Gate 3: Check if explicitly requires only modeling  
        if 'FINANCIAL_MODELING_AGENT' in required_agents and 'SQL_AGENT' not in required_agents:
            if RoutingHelper._has_sufficient_context_for_modeling(db_context):
                logger.info(f"[{request_id}] Routing: Modeling-only with sufficient context")
                return (
                    RoutingDecision.MODELING_ONLY,
                    [DataSource.RECURRING_INCOME, DataSource.MANUAL_LIABILITIES],
                    False
                )
            else:
                logger.info(f"[{request_id}] Routing: Modeling requested but needs SQL for data")
                return (
                    RoutingDecision.SQL_PLUS_MODELING,
                    [DataSource.SQL_CASHFLOW_BRIEF],
                    True
                )
        
        # Decision Gate 4: Determine based on query characteristics
        if RoutingHelper._requires_user_data(plan):
            if RoutingHelper._needs_fresh_transaction_data(plan):
                logger.info(f"[{request_id}] Routing: Requires fresh transaction data -> SQL+Modeling")
                return (
                    RoutingDecision.SQL_PLUS_MODELING,
                    [DataSource.SQL_CASHFLOW_BRIEF],
                    True
                )
            elif RoutingHelper._is_modeling_suited_intent(plan) and RoutingHelper._has_sufficient_context_for_modeling(db_context):
                logger.info(f"[{request_id}] Routing: Modeling-suited intent with sufficient context")
                return (
                    RoutingDecision.MODELING_ONLY,
                    [DataSource.RECURRING_INCOME, DataSource.MANUAL_LIABILITIES],
                    False
                )
            else:
                logger.info(f"[{request_id}] Routing: Requires user data -> SQL+Modeling")
                return (
                    RoutingDecision.SQL_PLUS_MODELING,
                    [DataSource.SQL_CASHFLOW_BRIEF],
                    True
                )
        
        # Fallback: Unsupported
        logger.warning(f"[{request_id}] Routing: Unsupported query type")
        return RoutingDecision.UNSUPPORTED, [], False
    
    @staticmethod
    def _is_knowledge_only_query(plan: Dict[str, Any]) -> bool:
        """
        Check if this is a knowledge-only query (no user data needed).
        """
        intent = plan.get('intent', '')
        data_sources = plan.get('data_sources', [])
        
        # Knowledge intents that don't require user data
        knowledge_intents = ['explain_general', 'education', 'definition']
        
        # If intent suggests general knowledge and no data sources
        if intent in knowledge_intents and not data_sources:
            return True
            
        # If explicitly routed to knowledge agent
        required_agents = plan.get('required_agents', [])
        if required_agents == ['KNOWLEDGE_AGENT']:
            return True
            
        return False
    
    @staticmethod
    def _requires_user_data(plan: Dict[str, Any]) -> bool:
        """
        Check if the plan involves user-specific data.
        """
        # Check for data sources that indicate user data
        data_sources = plan.get('data_sources', [])
        if data_sources:
            return True
        
        # Check for metrics that indicate calculations on user data
        metrics = plan.get('metrics', [])
        if metrics:
            return True
        
        # Check for intents that involve user data
        intent = plan.get('intent', '')
        data_intents = ['rank', 'aggregate', 'filter', 'lookup', 'compare', 'trend', 'list', 
                       'affordability', 'projection', 'optimization', 'scenario']
        if intent in data_intents:
            return True
        
        # Check if entities were detected (indicates user-specific data)
        entities = plan.get('entities_detected', {})
        if any(entities.values()):
            return True
        
        return False
    
    @staticmethod
    def _needs_fresh_transaction_data(plan: Dict[str, Any]) -> bool:
        """
        Check if the plan requires fresh transaction data or aggregates.
        """
        metrics = set(plan.get('metrics', []))
        data_sources = set(plan.get('data_sources', []))
        
        # Explicit transaction dependency
        if 'transactions' in data_sources:
            return True
            
        # Metrics that require transaction aggregation
        transaction_metrics = {
            'sum_spend', 'avg_spend', 'merchant_breakdown', 
            'category_breakdown', 'gross_monthly', 'spending_trends'
        }
        if metrics & transaction_metrics:
            return True
        
        # Time-based queries often need fresh data
        timeframe = plan.get('timeframe', {})
        window = timeframe.get('window', '')
        if any(keyword in window for keyword in ['last_', 'next_', 'months', 'recent']):
            return True
            
        return False
    
    @staticmethod
    def _is_modeling_suited_intent(plan: Dict[str, Any]) -> bool:
        """
        Check if the intent is well-suited for modeling-only approach.
        """
        intent = plan.get('intent', '')
        modeling_intents = {
            'affordability', 'projection', 'optimization', 
            'scenario', 'constraint', 'planning'
        }
        return intent in modeling_intents
    
    @staticmethod
    def _has_sufficient_context_for_modeling(db_context: Dict[str, Any]) -> bool:
        """
        Check if database context has sufficient information for modeling-only approach.
        """
        # Core requirements for modeling
        has_income = bool(db_context.get('recurring_income'))
        has_liabilities = bool(db_context.get('manual_liabilities'))
        has_goals = bool(db_context.get('goals'))
        has_accounts = bool(db_context.get('account_details'))
        
        # Basic sufficiency check
        core_sufficient = has_income and (has_liabilities or has_accounts)
        
        logger.debug(f"Context check: income={has_income}, liabilities={has_liabilities}, "
                    f"goals={has_goals}, accounts={has_accounts}, sufficient={core_sufficient}")
        
        return core_sufficient
    
    @staticmethod
    def validate_routing_decision(
        decision: RoutingDecision,
        plan: Dict[str, Any],
        db_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Validate that a routing decision makes sense given the inputs.
        
        Returns:
            Dictionary with validation results
        """
        issues = []
        warnings = []
        
        # Check for potential issues
        if decision == RoutingDecision.MODELING_ONLY:
            if not RoutingHelper._has_sufficient_context_for_modeling(db_context):
                issues.append("Modeling-only route chosen but insufficient context available")
                
        elif decision == RoutingDecision.SQL_ONLY:
            intent = plan.get('intent', '')
            if intent in ['affordability', 'projection', 'optimization']:
                warnings.append("SQL-only for modeling-suited intent may be suboptimal")
                
        elif decision == RoutingDecision.KNOWLEDGE_ONLY:
            if RoutingHelper._requires_user_data(plan):
                issues.append("Knowledge-only route but plan indicates user data needed")
        
        return {
            'valid': len(issues) == 0,
            'issues': issues,
            'warnings': warnings,
            'decision': decision.value
        }

class RoutingGate:
    """
    Deterministic routing gate implementation.
    """
    
    def __init__(self):
        self.routing_stats = {
            'total_routes': 0,
            'by_decision': {},
            'validation_failures': 0
        }
    
    def route_request(
        self, 
        plan: Dict[str, Any], 
        db_context: Dict[str, Any],
        request_id: str
    ) -> Dict[str, Any]:
        """
        Main routing function with validation and statistics.
        
        Returns:
            Dictionary with routing decision and metadata
        """
        self.routing_stats['total_routes'] += 1
        
        # Determine routing
        decision, data_sources, sql_brief_needed = RoutingHelper.determine_routing(
            plan, db_context, request_id
        )
        
        # Validate decision
        validation = RoutingHelper.validate_routing_decision(decision, plan, db_context)
        
        if not validation['valid']:
            self.routing_stats['validation_failures'] += 1
            logger.warning(f"[{request_id}] Routing validation failed: {validation['issues']}")
        
        # Update statistics
        decision_key = decision.value
        self.routing_stats['by_decision'][decision_key] = (
            self.routing_stats['by_decision'].get(decision_key, 0) + 1
        )
        
        # Build response
        result = {
            'routing_decision': decision.value,
            'data_sources_used': [ds.value for ds in data_sources],
            'sql_brief_needed': sql_brief_needed,
            'validation': validation,
            'request_id': request_id,
            'gate_stats': {
                'total_routes': self.routing_stats['total_routes'],
                'decision_distribution': self.routing_stats['by_decision'],
                'validation_failure_rate': self.routing_stats['validation_failures'] / self.routing_stats['total_routes']
            }
        }
        
        logger.info(f"[{request_id}] Routing gate result: {decision.value} with {len(data_sources)} sources")
        
        return result
    
    def get_routing_statistics(self) -> Dict[str, Any]:
        """Get routing statistics for monitoring."""
        return self.routing_stats.copy()