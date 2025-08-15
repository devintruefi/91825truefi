"""
Deterministic Router with Full Audit Trails
Enhanced router with complete determinism and comprehensive auditing
"""
import logging
import json
import time
import hashlib
from typing import Dict, Any, List, Tuple, Optional
from enum import Enum
from dataclasses import dataclass, asdict
from datetime import datetime

logger = logging.getLogger(__name__)

class RoutingDecision(Enum):
    """Possible routing decisions with clear semantics."""
    MODELING_ONLY = "ModelingOnly"
    SQL_ONLY = "SQLOnly" 
    SQL_PLUS_MODELING = "SQL+Modeling"
    KNOWLEDGE_ONLY = "KnowledgeOnly"
    UNSUPPORTED = "Unsupported"

class DataSource(Enum):
    """Possible data sources with explicit contracts."""
    SQL_CASHFLOW_BRIEF = "sql_cashflow_brief"
    RECURRING_INCOME = "recurring_income"
    MANUAL_LIABILITIES = "manual_liabilities"
    FULL_DB_DUMP = "full_db_dump"
    ACCOUNT_BALANCES = "account_balances"
    TRANSACTION_HISTORY = "transaction_history"

@dataclass
class RoutingContext:
    """Complete context for routing decision."""
    plan: Dict[str, Any]
    db_context: Dict[str, Any]
    request_id: str
    user_id: str
    timestamp: float
    
    def to_hash(self) -> str:
        """Generate deterministic hash of routing context."""
        # Create deterministic representation
        context_str = json.dumps({
            'plan': self.plan,
            'user_id': self.user_id,
            # Exclude volatile timestamp and request_id for consistency
        }, sort_keys=True, default=str)
        return hashlib.sha256(context_str.encode()).hexdigest()[:16]

@dataclass
class RoutingAuditEntry:
    """Complete audit entry for a routing decision."""
    context_hash: str
    request_id: str
    user_id: str
    timestamp: float
    input_plan: Dict[str, Any]
    routing_decision: str
    data_sources: List[str]
    sql_brief_needed: bool
    decision_tree_path: List[str]  # Gate sequence traversed
    validation_result: Dict[str, Any]
    confidence_score: float
    processing_time_ms: float
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage."""
        return asdict(self)

class DeterministicRouter:
    """
    Fully deterministic router with complete audit trails and reproducible decisions.
    Every routing decision can be explained and reproduced.
    """
    
    def __init__(self):
        self.audit_trail: List[RoutingAuditEntry] = []
        self.routing_stats = {
            'total_routes': 0,
            'by_decision': {},
            'validation_failures': 0,
            'avg_confidence': 0.0,
            'decision_tree_usage': {}
        }
        self.decision_cache = {}  # Cache for identical contexts
    
    def route_request(self, 
                     plan: Dict[str, Any], 
                     db_context: Dict[str, Any],
                     request_id: str,
                     user_id: str) -> Dict[str, Any]:
        """
        Main routing function with full determinism and audit trail.
        
        Args:
            plan: Structured plan from planner
            db_context: Available database context
            request_id: Unique request identifier
            user_id: User identifier
            
        Returns:
            Complete routing result with audit information
        """
        start_time = time.time()
        
        # Create routing context
        context = RoutingContext(
            plan=plan,
            db_context=db_context,
            request_id=request_id,
            user_id=user_id,
            timestamp=start_time
        )
        
        context_hash = context.to_hash()
        
        # Check cache for identical contexts
        if context_hash in self.decision_cache:
            cached_result = self.decision_cache[context_hash].copy()
            cached_result['request_id'] = request_id
            cached_result['cache_hit'] = True
            logger.info(f"[{request_id}] Using cached routing decision for hash {context_hash}")
            return cached_result
        
        # Traverse decision tree with full audit
        decision_tree_path = []
        decision, data_sources, sql_brief_needed, confidence = self._traverse_decision_tree(
            context, decision_tree_path
        )
        
        # Validate decision
        validation = self._validate_routing_decision(decision, plan, db_context)
        
        processing_time = (time.time() - start_time) * 1000
        
        # Create audit entry
        audit_entry = RoutingAuditEntry(
            context_hash=context_hash,
            request_id=request_id,
            user_id=user_id,
            timestamp=start_time,
            input_plan=plan.copy(),
            routing_decision=decision.value,
            data_sources=[ds.value for ds in data_sources],
            sql_brief_needed=sql_brief_needed,
            decision_tree_path=decision_tree_path,
            validation_result=validation,
            confidence_score=confidence,
            processing_time_ms=processing_time
        )
        
        # Store audit entry
        self.audit_trail.append(audit_entry)
        self._update_statistics(audit_entry)
        
        # Build result
        result = {
            'routing_decision': decision.value,
            'data_sources_used': [ds.value for ds in data_sources],
            'sql_brief_needed': sql_brief_needed,
            'validation': validation,
            'confidence_score': confidence,
            'decision_tree_path': decision_tree_path,
            'context_hash': context_hash,
            'audit_entry_id': len(self.audit_trail) - 1,
            'processing_time_ms': processing_time,
            'cache_hit': False,
            'deterministic': True,
            'request_metadata': {
                'request_id': request_id,
                'user_id': user_id,
                'timestamp': start_time
            }
        }
        
        # Cache result (without request-specific data)
        cache_entry = result.copy()
        del cache_entry['request_metadata']
        self.decision_cache[context_hash] = cache_entry
        
        logger.info(f"[{request_id}] Deterministic routing: {decision.value} "
                   f"(confidence: {confidence:.2f}, path: {' -> '.join(decision_tree_path)})")
        
        return result
    
    def _traverse_decision_tree(self, 
                               context: RoutingContext, 
                               path: List[str]) -> Tuple[RoutingDecision, List[DataSource], bool, float]:
        """
        Traverse the decision tree with full audit of each gate.
        
        Returns:
            Tuple of (decision, data_sources, sql_brief_needed, confidence)
        """
        plan = context.plan
        db_context = context.db_context
        request_id = context.request_id
        
        # Gate 1: Knowledge-only check
        path.append("Gate1_KnowledgeCheck")
        if self._is_knowledge_only_query(plan):
            path.append("Gate1_KnowledgeOnly_TRUE")
            logger.debug(f"[{request_id}] Gate 1: Knowledge-only query detected")
            return RoutingDecision.KNOWLEDGE_ONLY, [], False, 0.95
        path.append("Gate1_KnowledgeOnly_FALSE")
        
        # Gate 2: Explicit agent requirements
        path.append("Gate2_ExplicitAgents")
        required_agents = set(plan.get('required_agents', []))
        
        if 'SQL_AGENT' in required_agents and 'FINANCIAL_MODELING_AGENT' in required_agents:
            path.append("Gate2_SQL_AND_MODELING")
            logger.debug(f"[{request_id}] Gate 2: Both SQL and Modeling explicitly required")
            return RoutingDecision.SQL_PLUS_MODELING, [DataSource.SQL_CASHFLOW_BRIEF], True, 0.98
            
        elif 'SQL_AGENT' in required_agents:
            path.append("Gate2_SQL_ONLY")
            logger.debug(f"[{request_id}] Gate 2: SQL-only explicitly required")
            return RoutingDecision.SQL_ONLY, [DataSource.SQL_CASHFLOW_BRIEF], True, 0.96
            
        elif 'FINANCIAL_MODELING_AGENT' in required_agents:
            path.append("Gate2_MODELING_ONLY")
            # Check if sufficient context exists
            if self._has_sufficient_context_for_modeling(db_context):
                path.append("Gate2_MODELING_SUFFICIENT_CONTEXT")
                logger.debug(f"[{request_id}] Gate 2: Modeling-only with sufficient context")
                return (
                    RoutingDecision.MODELING_ONLY,
                    [DataSource.RECURRING_INCOME, DataSource.MANUAL_LIABILITIES],
                    False,
                    0.90
                )
            else:
                path.append("Gate2_MODELING_INSUFFICIENT_CONTEXT")
                logger.debug(f"[{request_id}] Gate 2: Modeling requested but needs SQL for data")
                return RoutingDecision.SQL_PLUS_MODELING, [DataSource.SQL_CASHFLOW_BRIEF], True, 0.85
        
        path.append("Gate2_NO_EXPLICIT_AGENTS")
        
        # Gate 3: Data requirements analysis
        path.append("Gate3_DataRequirements")
        if not self._requires_user_data(plan):
            path.append("Gate3_NO_USER_DATA")
            logger.debug(f"[{request_id}] Gate 3: No user data required -> Knowledge")
            return RoutingDecision.KNOWLEDGE_ONLY, [], False, 0.80
        
        path.append("Gate3_REQUIRES_USER_DATA")
        
        # Gate 4: Transaction data freshness check
        path.append("Gate4_TransactionFreshness")
        if self._needs_fresh_transaction_data(plan):
            path.append("Gate4_NEEDS_FRESH_DATA")
            logger.debug(f"[{request_id}] Gate 4: Requires fresh transaction data -> SQL+Modeling")
            return RoutingDecision.SQL_PLUS_MODELING, [DataSource.SQL_CASHFLOW_BRIEF], True, 0.92
        
        path.append("Gate4_NO_FRESH_DATA_NEEDED")
        
        # Gate 5: Intent-based routing
        path.append("Gate5_IntentAnalysis")
        if self._is_modeling_suited_intent(plan):
            path.append("Gate5_MODELING_SUITED")
            if self._has_sufficient_context_for_modeling(db_context):
                path.append("Gate5_MODELING_SUFFICIENT")
                logger.debug(f"[{request_id}] Gate 5: Modeling-suited with sufficient context")
                return (
                    RoutingDecision.MODELING_ONLY,
                    [DataSource.RECURRING_INCOME, DataSource.MANUAL_LIABILITIES],
                    False,
                    0.88
                )
            else:
                path.append("Gate5_MODELING_INSUFFICIENT")
                logger.debug(f"[{request_id}] Gate 5: Modeling-suited but needs SQL data")
                return RoutingDecision.SQL_PLUS_MODELING, [DataSource.SQL_CASHFLOW_BRIEF], True, 0.83
        
        path.append("Gate5_NOT_MODELING_SUITED")
        
        # Gate 6: Default data routing
        path.append("Gate6_DefaultRouting")
        if self._has_basic_data_context(db_context):
            path.append("Gate6_HAS_BASIC_DATA")
            logger.debug(f"[{request_id}] Gate 6: Basic data available -> SQL+Modeling")
            return RoutingDecision.SQL_PLUS_MODELING, [DataSource.SQL_CASHFLOW_BRIEF], True, 0.75
        
        # Final fallback
        path.append("Gate6_FALLBACK_UNSUPPORTED")
        logger.warning(f"[{request_id}] All gates failed -> Unsupported")
        return RoutingDecision.UNSUPPORTED, [], False, 0.10
    
    def _is_knowledge_only_query(self, plan: Dict[str, Any]) -> bool:
        """Check if this is a knowledge-only query (no user data needed)."""
        intent = plan.get('intent', '')
        data_sources = plan.get('data_sources', [])
        required_agents = plan.get('required_agents', [])
        
        # Knowledge intents that don't require user data
        knowledge_intents = ['explain_general', 'education', 'definition']
        
        # Multiple conditions for knowledge-only
        conditions = [
            intent in knowledge_intents and not data_sources,
            required_agents == ['KNOWLEDGE_AGENT'],
            intent == 'explain_general' and not plan.get('entities_detected', {})
        ]
        
        return any(conditions)
    
    def _requires_user_data(self, plan: Dict[str, Any]) -> bool:
        """Check if the plan involves user-specific data."""
        # Check data sources
        data_sources = plan.get('data_sources', [])
        if data_sources:
            return True
        
        # Check metrics
        metrics = plan.get('metrics', [])
        if metrics:
            return True
        
        # Check intent
        intent = plan.get('intent', '')
        data_intents = {'rank', 'aggregate', 'filter', 'lookup', 'compare', 'trend', 'list',
                       'affordability', 'projection', 'optimization', 'scenario'}
        if intent in data_intents:
            return True
        
        # Check entities
        entities = plan.get('entities_detected', {})
        if any(entities.values()):
            return True
        
        return False
    
    def _needs_fresh_transaction_data(self, plan: Dict[str, Any]) -> bool:
        """Check if the plan requires fresh transaction data."""
        metrics = set(plan.get('metrics', []))
        data_sources = set(plan.get('data_sources', []))
        
        # Direct transaction dependency
        if 'transactions' in data_sources:
            return True
        
        # Transaction-dependent metrics
        transaction_metrics = {
            'sum_spend', 'avg_spend', 'merchant_breakdown', 
            'category_breakdown', 'spending_trends', 'transaction_count'
        }
        if metrics & transaction_metrics:
            return True
        
        # Time-sensitive queries
        timeframe = plan.get('timeframe', {})
        window = timeframe.get('window', '').lower()
        time_indicators = ['last_', 'recent', 'current', 'this_month', 'this_year']
        if any(indicator in window for indicator in time_indicators):
            return True
        
        return False
    
    def _is_modeling_suited_intent(self, plan: Dict[str, Any]) -> bool:
        """Check if the intent is well-suited for modeling."""
        intent = plan.get('intent', '')
        modeling_intents = {
            'affordability', 'projection', 'optimization', 
            'scenario', 'planning', 'forecast'
        }
        return intent in modeling_intents
    
    def _has_sufficient_context_for_modeling(self, db_context: Dict[str, Any]) -> bool:
        """Check if sufficient context exists for modeling-only approach."""
        has_income = bool(db_context.get('recurring_income'))
        has_liabilities = bool(db_context.get('manual_liabilities'))
        has_goals = bool(db_context.get('goals'))
        has_accounts = bool(db_context.get('account_details'))
        has_assets = bool(db_context.get('manual_assets'))
        
        # Require income and at least one other financial component
        return has_income and (has_liabilities or has_accounts or has_assets or has_goals)
    
    def _has_basic_data_context(self, db_context: Dict[str, Any]) -> bool:
        """Check if basic data context exists."""
        return any([
            db_context.get('account_details'),
            db_context.get('manual_assets'),
            db_context.get('manual_liabilities'),
            db_context.get('recurring_income')
        ])
    
    def _validate_routing_decision(self, 
                                  decision: RoutingDecision,
                                  plan: Dict[str, Any],
                                  db_context: Dict[str, Any]) -> Dict[str, Any]:
        """Validate routing decision against inputs."""
        issues = []
        warnings = []
        
        if decision == RoutingDecision.MODELING_ONLY:
            if not self._has_sufficient_context_for_modeling(db_context):
                issues.append("Insufficient context for modeling-only approach")
        
        elif decision == RoutingDecision.SQL_ONLY:
            intent = plan.get('intent', '')
            if intent in ['affordability', 'projection', 'optimization']:
                warnings.append("Complex modeling intent routed to SQL-only")
        
        elif decision == RoutingDecision.KNOWLEDGE_ONLY:
            if self._requires_user_data(plan):
                issues.append("Knowledge-only route but user data indicators present")
        
        elif decision == RoutingDecision.UNSUPPORTED:
            if self._requires_user_data(plan) or plan.get('required_agents'):
                warnings.append("Query appears actionable but routed as unsupported")
        
        return {
            'valid': len(issues) == 0,
            'issues': issues,
            'warnings': warnings,
            'decision': decision.value,
            'validation_score': 1.0 - (len(issues) * 0.5 + len(warnings) * 0.1)
        }
    
    def _update_statistics(self, audit_entry: RoutingAuditEntry):
        """Update routing statistics."""
        self.routing_stats['total_routes'] += 1
        
        # Decision distribution
        decision = audit_entry.routing_decision
        self.routing_stats['by_decision'][decision] = (
            self.routing_stats['by_decision'].get(decision, 0) + 1
        )
        
        # Validation failures
        if not audit_entry.validation_result['valid']:
            self.routing_stats['validation_failures'] += 1
        
        # Average confidence
        total_confidence = (
            self.routing_stats['avg_confidence'] * (self.routing_stats['total_routes'] - 1) +
            audit_entry.confidence_score
        )
        self.routing_stats['avg_confidence'] = total_confidence / self.routing_stats['total_routes']
        
        # Decision tree path usage
        path_key = ' -> '.join(audit_entry.decision_tree_path)
        self.routing_stats['decision_tree_usage'][path_key] = (
            self.routing_stats['decision_tree_usage'].get(path_key, 0) + 1
        )
    
    def get_audit_trail(self, request_id: Optional[str] = None, 
                       user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get audit trail with optional filtering."""
        trails = self.audit_trail
        
        if request_id:
            trails = [t for t in trails if t.request_id == request_id]
        if user_id:
            trails = [t for t in trails if t.user_id == user_id]
        
        return [t.to_dict() for t in trails]
    
    def get_routing_statistics(self) -> Dict[str, Any]:
        """Get comprehensive routing statistics."""
        return {
            **self.routing_stats,
            'cache_size': len(self.decision_cache),
            'audit_entries': len(self.audit_trail),
            'last_updated': time.time()
        }
    
    def explain_routing_decision(self, context_hash: str) -> Optional[Dict[str, Any]]:
        """Explain a specific routing decision by context hash."""
        for entry in self.audit_trail:
            if entry.context_hash == context_hash:
                return {
                    'context_hash': context_hash,
                    'decision': entry.routing_decision,
                    'decision_path': entry.decision_tree_path,
                    'confidence': entry.confidence_score,
                    'validation': entry.validation_result,
                    'input_plan': entry.input_plan,
                    'timestamp': datetime.fromtimestamp(entry.timestamp).isoformat(),
                    'processing_time_ms': entry.processing_time_ms
                }
        return None