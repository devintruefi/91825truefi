"""
Base Agent Class - Enhanced logging and monitoring
"""
import time
import json
import logging
import uuid
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from decimal import Decimal
import openai

logger = logging.getLogger(__name__)

class BaseAgent(ABC):
    """Base class for all agents in the financial advisor framework."""
    
    # Class variable to store all agent logs
    _agent_logs = []
    
    def __init__(self, openai_client: openai.AsyncOpenAI, db_pool=None):
        self.client = openai_client
        self.db_pool = db_pool
        self.name = self.__class__.__name__
    
    @abstractmethod
    async def process(self, query: str, user_id: str, **kwargs) -> Dict[str, Any]:
        """Process the query and return results."""
        pass
    
    async def _call_openai(self, messages: list, model: str = "gpt-4o", **kwargs) -> str:
        """Make OpenAI API call with error handling."""
        try:
            response = await self.client.chat.completions.create(
                model=model,
                messages=messages,
                **kwargs
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"OpenAI API call failed in {self.name}: {e}")
            raise
    
    def _log_execution(self, input_data: Dict, output_data: Dict, execution_time: float, user_id: str):
        """Enhanced logging with full details for debugging."""
        logger.info(f"{self.name} executed in {execution_time:.2f}s for user {user_id}")
        
        # Enhanced logging with full details
        log_entry = {
            'id': str(uuid.uuid4()),
            'agent_name': self.name,
            'user_id': user_id,
            'input_data': input_data,
            'output_data': output_data,
            'sql_queries': output_data.get('sql_queries', []),
            'api_calls': output_data.get('api_calls', []),
            'error_message': output_data.get('error_message'),
            'execution_time_ms': execution_time * 1000,
            'timestamp': time.time()
        }
        
        # Enhanced console logging with clear formatting
        logger.info("=" * 80)
        logger.info(f"AGENT EXECUTION: {self.name}")
        logger.info("=" * 80)
        
        # Input details
        logger.info("INPUT:")
        logger.info(f"  Query: {input_data.get('query', 'N/A')}")
        logger.info(f"  User ID: {user_id}")
        
        if input_data.get('merchant_hints'):
            logger.info(f"  Merchant Hints: {input_data.get('merchant_hints')}")
        
        if input_data.get('resolved_entities'):
            logger.info(f"  Resolved Entities: {json.dumps(input_data.get('resolved_entities'), indent=2)}")
        
        # Routing/Plan information
        if input_data.get('plan'):
            plan = input_data['plan']
            logger.info("PLAN:")
            logger.info(f"  Intent: {plan.get('intent')}")
            logger.info(f"  Data Sources: {plan.get('data_sources')}")
            logger.info(f"  Required Agents: {plan.get('required_agents')}")
            logger.info(f"  Justification: {plan.get('justification')}")
        
        # Output details
        logger.info("OUTPUT:")
        logger.info(f"  Success: {output_data.get('success', False)}")
        logger.info(f"  Execution Time: {execution_time:.2f}s")
        
        if output_data.get('error_message'):
            logger.error(f"  ERROR: {output_data['error_message']}")
        
        # SQL queries executed
        if output_data.get('sql_queries'):
            logger.info(f"SQL QUERIES ({len(output_data['sql_queries'])} executed):")
            for i, query in enumerate(output_data['sql_queries'], 1):
                logger.info(f"  Query {i}:")
                logger.info(f"    {query}")
        
        # Routing information
        if output_data.get('routing'):
            routing = output_data['routing']
            logger.info("ROUTING:")
            logger.info(f"  Delegated To: {routing.get('delegated_to')}")
            logger.info(f"  Query Type: {routing.get('query_type')}")
            logger.info(f"  Reasoning: {routing.get('reasoning')}")
        
        # Results summary
        if 'SimpleSQLAgent' in self.name and output_data.get('success'):
            if output_data.get('data'):
                logger.info(f"  Result Rows: {len(output_data['data'])}")
                if output_data['data']:
                    logger.info(f"  Columns: {list(output_data['data'][0].keys())}")
                    logger.info(f"  Sample Row: {json.dumps(output_data['data'][0], default=str)}")
        
        # Response preview for supervisor
        if 'SimpleSupervisorAgent' in self.name and output_data.get('response'):
            response_preview = str(output_data['response'])[:300]
            if len(str(output_data['response'])) > 300:
                response_preview += "..."
            logger.info(f"  Response Preview: {response_preview}")
        
        logger.info("=" * 80)
        
        BaseAgent._agent_logs.append(log_entry)
        
        # Store in database if available
        if self.db_pool:
            self._store_agent_log(user_id, input_data, output_data, execution_time)
    
    @classmethod
    def get_agent_logs(cls):
        """Get all agent execution logs with enhanced details."""
        return cls._agent_logs.copy()
    
    @classmethod
    def clear_agent_logs(cls):
        """Clear all agent execution logs."""
        cls._agent_logs.clear()
    
    def _store_agent_log(self, user_id: str, input_data: Dict, output_data: Dict, execution_time: float):
        """Store agent execution log in database."""
        try:
            conn = self.db_pool.getconn()
            cur = conn.cursor()
            
            # Helper function to handle datetime serialization
            def serialize_for_json(obj):
                if hasattr(obj, 'isoformat'):  # datetime objects
                    return obj.isoformat()
                elif hasattr(obj, '__dict__'):  # objects with __dict__
                    return str(obj)
                return obj
            
            # Serialize data with datetime handling
            input_json = json.dumps(input_data, default=serialize_for_json)
            output_json = json.dumps(output_data, default=serialize_for_json)
            
            # Extract additional fields for better logging
            sql_queries = output_data.get('sql_queries', [])
            api_calls = output_data.get('api_calls', [])
            error_message = output_data.get('error_message')
            
            cur.execute("""
                INSERT INTO agent_run_log (
                    id, user_id, agent_name, input_data, output_data, 
                    sql_queries, api_calls, error_message, execution_time_ms, timestamp
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, now())
            """, (
                str(uuid.uuid4()),
                user_id,
                self.name,
                input_json,
                output_json,
                json.dumps(sql_queries, default=serialize_for_json),
                json.dumps(api_calls, default=serialize_for_json),
                error_message,
                execution_time * 1000  # Convert to milliseconds
            ))
            
            conn.commit()
            cur.close()
            self.db_pool.putconn(conn)
        except Exception as e:
            logger.error(f"Failed to store agent log: {e}")