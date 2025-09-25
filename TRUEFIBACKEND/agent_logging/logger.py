# TRUEFIBACKEND/logging/logger.py
# Structured logging with database integration

import logging
import json
import uuid
from datetime import datetime, timezone, date
from decimal import Decimal
from typing import Dict, Any, Optional
from config import config
from db import get_db_pool

class AgentLogger:
    """Centralized logging for agent execution"""

    def __init__(self):
        self.db_pool = get_db_pool() if config.LOG_TO_DB else None
        self.setup_file_logging()

    @staticmethod
    def _json_default(obj):
        """Default serializer for non-JSON types (date, datetime, Decimal)."""
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        if isinstance(obj, Decimal):
            return float(obj)
        return str(obj)

    def _safe_json_dumps(self, obj: Any) -> str:
        return json.dumps(obj, default=self._json_default)

    def setup_file_logging(self):
        """Setup structured file logging"""
        logging.basicConfig(
            level=getattr(logging, config.LOG_LEVEL.upper()),
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.StreamHandler(),
                logging.FileHandler(config.LOG_FILE)
            ]
        )

    def log_agent_execution(
        self,
        user_id: str,
        agent_name: str,
        input_data: Dict[str, Any],
        output_data: Optional[Dict[str, Any]] = None,
        sql_queries: Optional[list] = None,
        api_calls: Optional[list] = None,
        error_message: Optional[str] = None,
        execution_time_ms: Optional[float] = None
    ) -> str:
        """Log agent execution to database and file"""

        run_id = str(uuid.uuid4())

        # Log to file
        log_entry = {
            'run_id': run_id,
            'user_id': user_id,
            'agent_name': agent_name,
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'input_data': input_data,
            'output_data': output_data,
            'sql_queries': sql_queries,
            'api_calls': api_calls,
            'error_message': error_message,
            'execution_time_ms': execution_time_ms
        }

        logger = logging.getLogger(f"agent.{agent_name}")

        if error_message:
            logger.error(f"Agent execution failed: {self._safe_json_dumps(log_entry)}")
        else:
            logger.info(f"Agent execution completed: {self._safe_json_dumps(log_entry)}")

        # Log to database if enabled
        if self.db_pool and config.LOG_TO_DB:
            try:
                self._log_to_database(
                    run_id, user_id, agent_name, input_data, output_data,
                    sql_queries, api_calls, error_message, execution_time_ms
                )
            except Exception as e:
                logger.error(f"Failed to log to database: {e}")

        return run_id

    def _log_to_database(
        self,
        run_id: str,
        user_id: str,
        agent_name: str,
        input_data: Dict[str, Any],
        output_data: Optional[Dict[str, Any]],
        sql_queries: Optional[list],
        api_calls: Optional[list],
        error_message: Optional[str],
        execution_time_ms: Optional[float]
    ):
        """Log to agent_run_log table"""

        query = """
        INSERT INTO agent_run_log (
            id, user_id, agent_name, input_data, output_data,
            sql_queries, api_calls, error_message, execution_time_ms, timestamp
        ) VALUES (
            %(id)s, %(user_id)s, %(agent_name)s, %(input_data)s, %(output_data)s,
            %(sql_queries)s, %(api_calls)s, %(error_message)s, %(execution_time_ms)s, %(timestamp)s
        )
        """

        params = {
            'id': run_id,
            'user_id': user_id,
            'agent_name': agent_name,
            'input_data': self._safe_json_dumps(input_data) if input_data else None,
            'output_data': self._safe_json_dumps(output_data) if output_data else None,
            'sql_queries': self._safe_json_dumps(sql_queries) if sql_queries else None,
            'api_calls': self._safe_json_dumps(api_calls) if api_calls else None,
            'error_message': error_message,
            'execution_time_ms': execution_time_ms,
            'timestamp': datetime.now(timezone.utc)
        }

        self.db_pool.execute_query(query, params)

    def log_sql_execution(
        self,
        user_id: str,
        sql: str,
        params: Dict[str, Any],
        result_count: int,
        execution_time_ms: float,
        error: Optional[str] = None
    ):
        """Log SQL query execution"""

        log_entry = {
            'user_id': user_id,
            'sql': sql,
            'params': params,
            'result_count': result_count,
            'execution_time_ms': execution_time_ms,
            'error': error,
            'timestamp': datetime.now(timezone.utc).isoformat()
        }

        logger = logging.getLogger("sql_execution")

        if error:
            logger.error(f"SQL execution failed: {json.dumps(log_entry, default=str)}")
        else:
            logger.info(f"SQL executed successfully: {json.dumps(log_entry, default=str)}")

    def log_security_event(
        self,
        user_id: str,
        event_type: str,
        details: Dict[str, Any],
        severity: str = "INFO"
    ):
        """Log security-related events"""

        log_entry = {
            'user_id': user_id,
            'event_type': event_type,
            'details': details,
            'severity': severity,
            'timestamp': datetime.now(timezone.utc).isoformat()
        }

        logger = logging.getLogger("security")

        if severity == "ERROR":
            logger.error(f"Security event: {json.dumps(log_entry, default=str)}")
        elif severity == "WARNING":
            logger.warning(f"Security event: {json.dumps(log_entry, default=str)}")
        else:
            logger.info(f"Security event: {json.dumps(log_entry, default=str)}")

# Global logger instance - lazy initialization
_agent_logger = None

def get_agent_logger():
    """Get the global agent logger instance (lazy initialization)"""
    global _agent_logger
    if _agent_logger is None:
        _agent_logger = AgentLogger()
    return _agent_logger

# For backward compatibility
agent_logger = get_agent_logger
