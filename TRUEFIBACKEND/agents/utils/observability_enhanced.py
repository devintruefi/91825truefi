"""
Enhanced Observability Helper - Structured JSON logging with PII redaction and provenance
"""
import json
import logging
import re
import uuid
from datetime import datetime
from typing import Dict, Any, Optional, List, Set
import hashlib

class PIIRedactor:
    """
    PII redaction utility for observability logs.
    """
    
    # PII patterns to redact from logs
    PII_PATTERNS = [
        # Financial account numbers
        (r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b', '[CARD-REDACTED]'),
        (r'\b\d{9,17}\b', '[ACCOUNT-REDACTED]'),
        
        # Personal identifiers
        (r'\b\d{3}-\d{2}-\d{4}\b', '[SSN-REDACTED]'),
        (r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b', '[PHONE-REDACTED]'),
        
        # Email addresses
        (r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', '[EMAIL-REDACTED]'),
        
        # Addresses
        (r'\b\d{1,5}\s+\w+\s+(Street|St|Avenue|Ave|Road|Rd|Lane|Ln|Drive|Dr|Court|Ct|Circle|Cir|Boulevard|Blvd)\b', '[ADDRESS-REDACTED]'),
        
        # API keys and tokens
        (r'(?i)(api[_-]?key|token|secret|password)["\']?\s*[:=]\s*["\']?[a-zA-Z0-9]{8,}', '[CREDENTIAL-REDACTED]'),
        
        # Database connection strings
        (r'postgresql://[^"\s]+', '[DB-CONN-REDACTED]'),
        (r'user_id\s*=\s*[\'"][a-f0-9-]{36}[\'"]', 'user_id=[USER-ID-REDACTED]'),
        
        # Specific amounts that might be test data
        (r'\$12[,.]?345(?:\.\d{2})?', '[TEST-AMOUNT-REDACTED]'),
    ]
    
    # Sensitive field names that should be redacted
    SENSITIVE_FIELDS = {
        'password', 'api_key', 'token', 'secret', 'private_key',
        'ssn', 'tax_id', 'account_number', 'routing_number',
        'email', 'phone', 'address', 'zip_code'
    }
    
    @classmethod
    def redact_text(cls, text: str) -> str:
        """
        Redact PII from text content.
        
        Args:
            text: Text to redact
            
        Returns:
            Text with PII redacted
        """
        if not isinstance(text, str):
            return text
        
        redacted = text
        for pattern, replacement in cls.PII_PATTERNS:
            redacted = re.sub(pattern, replacement, redacted, flags=re.IGNORECASE)
        
        return redacted
    
    @classmethod
    def redact_dict(cls, data: Dict[str, Any], deep: bool = True) -> Dict[str, Any]:
        """
        Redact PII from dictionary data.
        
        Args:
            data: Dictionary to redact
            deep: Whether to recursively redact nested structures
            
        Returns:
            Dictionary with PII redacted
        """
        if not isinstance(data, dict):
            return data
        
        redacted = {}
        for key, value in data.items():
            # Check if field name suggests sensitive data
            if key.lower() in cls.SENSITIVE_FIELDS:
                redacted[key] = '[REDACTED]'
            elif isinstance(value, str):
                redacted[key] = cls.redact_text(value)
            elif isinstance(value, dict) and deep:
                redacted[key] = cls.redact_dict(value, deep=True)
            elif isinstance(value, list) and deep:
                redacted[key] = [
                    cls.redact_dict(item, deep=True) if isinstance(item, dict)
                    else cls.redact_text(item) if isinstance(item, str)
                    else item
                    for item in value
                ]
            else:
                redacted[key] = value
        
        return redacted

class ObservabilityContext:
    """
    Enhanced observability context with PII redaction and provenance tracking.
    """
    
    def __init__(self, agent_name: str, request_id: Optional[str] = None, scenario: Optional[str] = None):
        self.agent_name = agent_name
        self.request_id = request_id or self._generate_request_id()
        self.scenario = scenario
        self.start_time = datetime.now()
        
        # Tracking fields
        self.routing_data = {}
        self.data_sources = set()
        self.assumptions = []
        self.data_gaps = []
        self.provenance_chain = []
        self.validation_results = {}
        self.metadata = {}
        
    def _generate_request_id(self) -> str:
        """Generate a unique request ID."""
        return str(uuid.uuid4())[:8]
    
    def set_routing(self, 
                   routing_decision: str,
                   required_agents: List[str],
                   sources_used: List[str],
                   sql_brief_used: bool = False):
        """Set routing information."""
        self.routing_data = {
            'routing_decision': routing_decision,
            'required_agents': required_agents,
            'sources_used': sources_used,
            'sql_brief_used': sql_brief_used
        }
        self.data_sources.update(sources_used)
    
    def add_data_source(self, source: str, metadata: Optional[Dict] = None):
        """Add a data source to tracking."""
        self.data_sources.add(source)
        if metadata:
            self.metadata[f"source_{source}"] = metadata
    
    def add_assumption(self, assumption: str, context: Optional[str] = None):
        """Add an assumption to tracking."""
        assumption_data = {'assumption': assumption}
        if context:
            assumption_data['context'] = context
        self.assumptions.append(assumption_data)
    
    def add_data_gap(self, gap: str, impact: Optional[str] = None):
        """Add a data gap to tracking."""
        gap_data = {'gap': gap}
        if impact:
            gap_data['impact'] = impact
        self.data_gaps.append(gap_data)
    
    def add_provenance_step(self, step: str, agent: str, data: Optional[Dict] = None):
        """Add a step to the provenance chain."""
        provenance_step = {
            'step': step,
            'agent': agent,
            'timestamp': datetime.now().isoformat(),
            'data': PIIRedactor.redact_dict(data) if data else None
        }
        self.provenance_chain.append(provenance_step)
    
    def set_validation_result(self, validation_type: str, result: Dict[str, Any]):
        """Set validation results."""
        self.validation_results[validation_type] = PIIRedactor.redact_dict(result)
    
    def log(self, logger: logging.Logger, level: str, **additional_fields):
        """
        Emit structured JSON log with PII redaction.
        
        Args:
            logger: Logger instance
            level: Log level (INFO, WARN, ERROR)
            **additional_fields: Additional fields to include
        """
        # Build base log entry
        log_entry = {
            "ts": datetime.now().isoformat(),
            "level": level.upper(),
            "agent": self.agent_name,
            "request_id": self.request_id,
            "scenario": self.scenario,
            "execution_time_ms": int((datetime.now() - self.start_time).total_seconds() * 1000)
        }
        
        # Add routing information
        if self.routing_data:
            log_entry.update(self.routing_data)
        
        # Add data sources
        if self.data_sources:
            log_entry["data_sources"] = sorted(list(self.data_sources))
        
        # Add assumptions and gaps
        if self.assumptions:
            log_entry["assumptions"] = self.assumptions
        
        if self.data_gaps:
            log_entry["data_gaps"] = self.data_gaps
        
        # Add provenance chain
        if self.provenance_chain:
            log_entry["provenance_chain"] = self.provenance_chain
        
        # Add validation results
        if self.validation_results:
            log_entry["validation_results"] = self.validation_results
        
        # Add metadata
        if self.metadata:
            log_entry["metadata"] = self.metadata
        
        # Add additional fields
        log_entry.update(additional_fields)
        
        # Redact PII from the entire log entry
        redacted_entry = PIIRedactor.redact_dict(log_entry, deep=True)
        
        # Add redaction marker
        redacted_entry["pii_redacted"] = True
        
        # Log at appropriate level
        log_func = getattr(logger, level.lower(), logger.info)
        log_func(json.dumps(redacted_entry, default=str, separators=(',', ':')))

def build_request_id() -> str:
    """Generate a unique request ID if not provided."""
    return str(uuid.uuid4())[:8]

def json_log(logger: logging.Logger, 
             level: str,
             request_id: Optional[str] = None,
             **fields) -> None:
    """
    Enhanced structured JSON log with PII redaction.
    
    Args:
        logger: Logger instance
        level: Log level
        request_id: Request ID
        **fields: Additional fields to log
    """
    # Build log entry
    log_entry = {
        "ts": datetime.now().isoformat(),
        "level": level.upper(),
        "request_id": request_id or build_request_id()
    }
    
    # Add all provided fields
    log_entry.update(fields)
    
    # Redact PII
    redacted_entry = PIIRedactor.redact_dict(log_entry, deep=True)
    redacted_entry["pii_redacted"] = True
    
    # Log at appropriate level
    log_func = getattr(logger, level.lower(), logger.info)
    log_func(json.dumps(redacted_entry, default=str, separators=(',', ':')))

def log_financial_calculation(
    logger: logging.Logger,
    calculation_type: str,
    inputs: Dict[str, Any],
    outputs: Dict[str, Any],
    assumptions: List[str],
    request_id: Optional[str] = None
):
    """
    Log financial calculations with proper PII handling.
    
    Args:
        logger: Logger instance
        calculation_type: Type of calculation performed
        inputs: Input parameters (will be redacted)
        outputs: Output results (will be redacted)
        assumptions: List of assumptions made
        request_id: Request ID
    """
    log_entry = {
        "ts": datetime.now().isoformat(),
        "level": "INFO",
        "event_type": "financial_calculation",
        "calculation_type": calculation_type,
        "inputs": PIIRedactor.redact_dict(inputs),
        "outputs": PIIRedactor.redact_dict(outputs),
        "assumptions": assumptions,
        "request_id": request_id or build_request_id(),
        "pii_redacted": True
    }
    
    logger.info(json.dumps(log_entry, default=str, separators=(',', ':')))

def log_routing_decision(
    logger: logging.Logger,
    query: str,
    routing_decision: str,
    agents_used: List[str],
    validation_results: Dict[str, Any],
    request_id: Optional[str] = None
):
    """
    Log routing decisions with context.
    
    Args:
        logger: Logger instance
        query: User query (will be redacted)
        routing_decision: Routing decision made
        agents_used: List of agents used
        validation_results: Validation results
        request_id: Request ID
    """
    log_entry = {
        "ts": datetime.now().isoformat(),
        "level": "INFO",
        "event_type": "routing_decision",
        "query_hash": hashlib.md5(query.encode()).hexdigest()[:8],  # Hash instead of full query
        "routing_decision": routing_decision,
        "agents_used": agents_used,
        "validation_results": PIIRedactor.redact_dict(validation_results),
        "request_id": request_id or build_request_id(),
        "pii_redacted": True
    }
    
    logger.info(json.dumps(log_entry, default=str, separators=(',', ':')))

def log_data_access(
    logger: logging.Logger,
    table_accessed: str,
    user_id_hash: str,  # Pre-hashed user ID
    query_type: str,
    row_count: int,
    request_id: Optional[str] = None
):
    """
    Log data access for audit purposes.
    
    Args:
        logger: Logger instance
        table_accessed: Database table accessed
        user_id_hash: Hashed user ID for privacy
        query_type: Type of query (SELECT, etc.)
        row_count: Number of rows returned
        request_id: Request ID
    """
    log_entry = {
        "ts": datetime.now().isoformat(),
        "level": "INFO",
        "event_type": "data_access",
        "table_accessed": table_accessed,
        "user_id_hash": user_id_hash,
        "query_type": query_type,
        "row_count": row_count,
        "request_id": request_id or build_request_id(),
        "pii_redacted": True
    }
    
    logger.info(json.dumps(log_entry, default=str, separators=(',', ':')))

def create_audit_trail(
    agent_name: str,
    user_id: str,
    query: str,
    routing_decision: str,
    data_sources: List[str],
    response_quality_score: float,
    request_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Create a comprehensive audit trail entry.
    
    Args:
        agent_name: Name of the agent
        user_id: User ID (will be hashed)
        query: User query (will be hashed)
        routing_decision: Routing decision made
        data_sources: Data sources accessed
        response_quality_score: Quality score of response
        request_id: Request ID
        
    Returns:
        Audit trail dictionary
    """
    # Hash sensitive data
    user_id_hash = hashlib.sha256(user_id.encode()).hexdigest()[:16]
    query_hash = hashlib.md5(query.encode()).hexdigest()[:8]
    
    audit_trail = {
        "ts": datetime.now().isoformat(),
        "event_type": "agent_interaction",
        "agent_name": agent_name,
        "user_id_hash": user_id_hash,
        "query_hash": query_hash,
        "routing_decision": routing_decision,
        "data_sources": data_sources,
        "response_quality_score": response_quality_score,
        "request_id": request_id or build_request_id(),
        "audit_version": "v2",
        "pii_redacted": True
    }
    
    return audit_trail

# Legacy functions for backward compatibility

def check_anomalous_budgets(amounts: List[float]) -> Dict[str, Any]:
    """Check for anomalous budget amounts (legacy function)."""
    if not amounts:
        return {"anomalous": False, "details": "No amounts to check"}
    
    # Simple anomaly detection
    avg_amount = sum(amounts) / len(amounts)
    max_amount = max(amounts)
    
    # Flag if any amount is more than 10x the average
    anomalous = max_amount > (avg_amount * 10) if avg_amount > 0 else False
    
    return {
        "anomalous": anomalous,
        "details": f"Max: ${max_amount:.2f}, Avg: ${avg_amount:.2f}" if anomalous else "Within normal range"
    }