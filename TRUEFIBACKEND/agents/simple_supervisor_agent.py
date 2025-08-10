"""
Simple Supervisor Agent - LLM-driven orchestration without rigid patterns
"""
import time
import json
import logging
import uuid
from typing import Dict, Any, List, Optional
from .base_agent import BaseAgent
from .sql_agent_simple import SimpleSQLAgent
from .utils.entity_resolver import get_user_database_context, resolve_entities
from .utils.data_enumerator import DataEnumerator
from .utils.semantic_interpreter import SemanticInterpreter
from .utils.result_validator import ResultValidator
from .utils.query_explainer import QueryExplainer
from .utils.schema_registry import SchemaRegistry

logger = logging.getLogger(__name__)

class SimpleSupervisorAgent(BaseAgent):
    """
    Simple supervisor that uses LLM for intelligent routing without rigid patterns.
    Just a thin orchestrator that:
    1. Gets user financial context
    2. Asks LLM how to handle the query
    3. Routes to appropriate agent(s)
    4. Formats the final response
    """
    
    def __init__(self, openai_client, db_pool):
        super().__init__(openai_client, db_pool)
        self.sql_agent = SimpleSQLAgent(openai_client, db_pool)
        self.data_enumerator = DataEnumerator(db_pool)
        self.semantic_interpreter = SemanticInterpreter(openai_client)
        self.result_validator = ResultValidator(openai_client)
        self.query_explainer = QueryExplainer(openai_client)
        self.schema_registry = SchemaRegistry(db_pool)
        
    async def process(self, query: str, user_id: str, **kwargs) -> Dict[str, Any]:
        """
        Process user query with planning and routing - no direct answers.
        """
        start_time = time.time()
        request_id = str(uuid.uuid4())[:8]
        
        try:
            user_name = kwargs.get('user_name', 'User')
            session_id = kwargs.get('session_id', '')
            
            logger.info(f"[{request_id}] Processing query for user {user_id}: {query[:100]}...")
            
            # Get user's financial context (same context for all agents)
            db_context = await get_user_database_context(user_id, self.db_pool)
            
            # MANDATORY entity resolution before planning
            resolved = resolve_entities(query, db_context.get('entity_cache', {}))
            logger.info(f"[{request_id}] Entity resolution complete: {resolved}")
            
            # Get full schema for planning
            schema_str = self.schema_registry.get_full_schema_smart()
            
            # Get data enumerations - this is critical for understanding what data exists
            logger.info(f"[{request_id}] Getting data enumerations for user")
            enumerations = await self.data_enumerator.get_user_enumerations(user_id)
            
            # Semantic interpretation of the query - understand intent beyond literal words
            # Skip if validation is disabled for performance
            skip_validation = kwargs.get('skip_validation', False)
            semantic_interpretation = {}
            adapted_query_info = None
            
            if not skip_validation:
                logger.info(f"[{request_id}] Performing semantic interpretation")
                semantic_interpretation = await self.semantic_interpreter.interpret_query(
                    query, db_context, enumerations
                )
                
                # Check if query needs adaptation based on semantic understanding
                if semantic_interpretation.get('adaptations_needed', {}).get('mismatch_detected'):
                    logger.info(f"[{request_id}] Query adaptation needed: {semantic_interpretation['adaptations_needed']['reason']}")
                    adapted_query_info = await self.semantic_interpreter.generate_adapted_query(
                        query, semantic_interpretation, enumerations
                    )
                    logger.info(f"[{request_id}] Query adapted: {adapted_query_info.get('adapted_query', query)}")
            
            # Build enhanced context with enumerations (mark as non-authoritative)
            context_str = self._build_context_string(db_context, user_name)
            context_str = "### NON-AUTHORITATIVE PROFILE SUMMARY (for entity hints only):\n" + context_str
            context_str += "\n\n" + self.data_enumerator.get_enumeration_context_string(enumerations)
            
            # Plan and route using the new planner (no direct answers allowed)
            plan = await self._plan_route(query, schema_str, resolved, context_str)
            logger.info(f"[{request_id}] Plan generated: {json.dumps(plan, indent=2)}")
            
            # ENFORCE: If plan touches user data but doesn't route to SQL, override
            if self._requires_user_data(plan) and 'SQL_AGENT' not in plan.get('required_agents', []):
                logger.warning(f"[{request_id}] Plan touches user data but didn't route to SQL. Overriding.")
                plan['required_agents'] = ['SQL_AGENT']
                plan['justification'] = 'Query involves user data - SQL agent required per policy'
            
            # Get all entity hints from resolved entities
            merchant_hints = resolved.get('merchant_names', [])
            # Pass all resolved entities for richer context
            all_resolved_entities = resolved  # This now includes budget_names, account_names, etc.
            
            # Execute based on plan's required agents
            if 'SQL_AGENT' in plan.get('required_agents', []):
                used_sql = True
                # Use adapted query if available, otherwise original
                query_to_execute = adapted_query_info['adapted_query'] if adapted_query_info else query
                
                # Route to SQL Agent with policy from planner
                sql_result = await self.sql_agent.process(
                    query=query_to_execute,
                    user_id=user_id,
                    user_context=context_str,
                    merchant_hints=merchant_hints,
                    policy=plan,  # Pass the plan as policy
                    **kwargs
                )
                
                # Check if SQL agent failed
                if not sql_result.get('success'):
                    logger.error(f"[{request_id}] SQL agent failed: {sql_result.get('error_message', 'Unknown error')}")
                    
                    # Log the supervisor's handling of SQL agent failure
                    failure_execution_time = time.time() - start_time
                    self._log_execution(
                        {
                            'query': query,
                            'user_id': user_id,
                            'user_name': user_name,
                            'session_id': session_id,
                            'plan': plan,
                            'resolved_entities': resolved,
                            'merchant_hints_provided': merchant_hints if merchant_hints else []
                        },
                        {
                            'success': False,
                            'routing': {
                                'used_sql': True,
                                'reasoning': plan.get('justification', ''),
                                'query_type': plan.get('intent', ''),
                                'delegated_to': 'SimpleSQLAgent'
                            },
                            'sql_agent_result': {
                                'success': False,
                                'error': sql_result.get('error_message', 'Unknown error')
                            },
                            'supervisor_action': 'Handled SQL agent failure gracefully',
                            'total_execution_time': failure_execution_time
                        },
                        failure_execution_time,
                        user_id
                    )
                    
                    return {
                        "success": False,
                        "response": f"I couldn't retrieve the data you requested: {sql_result.get('error_message', 'Database error')}",
                        "metadata": {
                            "request_id": request_id,
                            "execution_time": failure_execution_time,
                            "routing": {
                                "attempted": "SimpleSQLAgent",
                                "reasoning": plan.get('justification', ''),
                                "query_type": plan.get('intent', '')
                            },
                            "error_source": "sql_agent",
                            "error": sql_result.get('error_message', 'SQL agent failed')
                        }
                    }
                
                # Optional validation and explanation (can be disabled for performance)
                skip_validation = kwargs.get('skip_validation', False)
                validation = None
                explanation = None
                
                if not skip_validation:
                    # Validate the result against context with plan awareness
                    logger.info(f"[{request_id}] Validating SQL results")
                    validation = await self.result_validator.validate_result(
                        query, sql_result, db_context, semantic_interpretation, plan
                    )
                    
                    # Single regeneration attempt if validation suggests it
                    if validation and validation.get('regeneration_hint') and not kwargs.get('is_regeneration'):
                        logger.info(f"[{request_id}] Validation suggests regeneration: {validation['regeneration_hint']}")
                        # Try once more with the hint
                        regeneration_query = f"{query}. IMPORTANT: {validation['regeneration_hint']}"
                        sql_result = await self.sql_agent.process(
                            query=regeneration_query,
                            user_id=user_id,
                            user_context=context_str,
                            merchant_hints=merchant_hints,
                            policy=plan,
                            is_regeneration=True,  # Prevent infinite loop
                            **kwargs
                        )
                        # Re-validate the regenerated result
                        validation = await self.result_validator.validate_result(
                            query, sql_result, db_context, semantic_interpretation, plan
                        )
                    
                    # Generate query explanation
                    logger.info(f"[{request_id}] Generating query explanation")
                    explanation = await self.query_explainer.generate_explanation(
                        query, 
                        sql_result.get('sql_query', ''),
                        sql_result,
                        adapted_query_info,
                        validation
                    )
                
                # Generate final response using LLM with SQL results and all enhancements
                final_response = await self._generate_final_response(
                    query, context_str, sql_result, user_name, 
                    validation, explanation, adapted_query_info
                )
            elif 'KNOWLEDGE_AGENT' in plan.get('required_agents', []):
                # Knowledge agent not yet available
                used_sql = False
                final_response = "This question requires general financial knowledge explanation. That capability isn't enabled yet - I can only answer questions about your specific financial data right now."
            else:
                # Should not reach here per policy, but handle gracefully
                used_sql = False
                logger.error(f"[{request_id}] Unexpected routing: no valid agent in plan")
                final_response = "I need to route this to the appropriate agent. Please try rephrasing your question about your financial data."
            
            execution_time = time.time() - start_time
            logger.info(f"[{request_id}] Query processed in {execution_time:.2f}s")
            
            # Enhanced logging with full details
            sql_queries = []
            api_calls = []
            
            if used_sql and isinstance(sql_result, dict):
                sql_queries = sql_result.get('sql_queries', [])
                api_calls = sql_result.get('api_calls', [])
            
            # Log execution for monitoring - COMPREHENSIVE logging of all inputs/outputs
            self._log_execution(
                {
                    'query': query,
                    'user_id': user_id,
                    'user_name': user_name,
                    'session_id': session_id,
                    'plan': plan,
                    'resolved_entities': resolved,
                    'merchant_hints_provided': merchant_hints if merchant_hints else [],
                    'context_provided': context_str[:500] + '...' if len(context_str) > 500 else context_str,
                    'sql_agent_input': {
                        'query': query,
                        'user_id': user_id,
                        'user_context': context_str[:300] + '...',
                        'merchant_hints': merchant_hints
                    } if used_sql else None
                },
                {
                    'success': True, 
                    'response_length': len(final_response),
                    'routing': {
                        'used_sql': used_sql,
                        'reasoning': plan.get('justification', ''),
                        'query_type': plan.get('intent', ''),
                        'required_agents': plan.get('required_agents', []),
                        'delegated_to': 'SimpleSQLAgent' if used_sql else 'Direct Response'
                    },
                    'sql_agent_complete_response': sql_result if used_sql and isinstance(sql_result, dict) else None,
                    'sql_agent_summary': {
                        'success': sql_result.get('success') if used_sql and isinstance(sql_result, dict) else None,
                        'row_count': len(sql_result.get('data', [])) if used_sql and isinstance(sql_result, dict) else None,
                        'execution_time': sql_result.get('metadata', {}).get('execution_time') if used_sql and isinstance(sql_result, dict) else None,
                        'sql_query': sql_result.get('sql_query') if used_sql and isinstance(sql_result, dict) else None,
                        'data_preview': sql_result.get('data', [])[:3] if used_sql and isinstance(sql_result, dict) and sql_result.get('data') else None
                    } if used_sql else None,
                    'final_response': final_response[:500] + '...' if len(final_response) > 500 else final_response,
                    'final_response_generated': True,
                    'total_execution_time': execution_time
                },
                execution_time,
                user_id
            )
            
            return {
                "success": True,
                "response": final_response,
                "metadata": {
                    "request_id": request_id,
                    "execution_time": execution_time,
                    "routing": {
                        "used_sql": used_sql,
                        "reasoning": plan.get('justification', ''),
                        "query_type": plan.get('intent', ''),
                        "required_agents": plan.get('required_agents', []),
                        "delegated_to": 'SimpleSQLAgent' if used_sql else 'Direct Response'
                    },
                    "sql_agent_performance": {
                        "success": sql_result.get('success') if used_sql and isinstance(sql_result, dict) else None,
                        "row_count": len(sql_result.get('data', [])) if used_sql and isinstance(sql_result, dict) else None,
                        "execution_time": sql_result.get('execution_time') if used_sql and isinstance(sql_result, dict) else None
                    } if used_sql else None,
                    "merchant_hints": merchant_hints if merchant_hints else [],
                    "semantic_interpretation": semantic_interpretation if 'semantic_interpretation' in locals() else None,
                    "query_adapted": adapted_query_info is not None if 'adapted_query_info' in locals() else False,
                    "validation_status": validation.get('validation_status') if 'validation' in locals() and validation else None,
                    "explanation_generated": explanation is not None if 'explanation' in locals() else False
                }
            }
            
        except Exception as e:
            execution_time = time.time() - start_time
            logger.error(f"[{request_id}] Error: {e}")
            
            # Enhanced error logging
            import traceback
            logger.error(f"[{request_id}] Traceback: {traceback.format_exc()}")
            
            error_response = {
                'success': False,
                'error_message': str(e),
                'routing': {
                    'error_during': 'orchestration',
                    'stage_failed': 'supervisor_processing'
                }
            }
            
            self._log_execution(
                {
                    'query': query,
                    'user_id': user_id,
                    'user_name': kwargs.get('user_name', 'User'),
                    'session_id': kwargs.get('session_id', ''),
                    'error_context': 'Failed during supervisor orchestration'
                },
                error_response,
                execution_time,
                user_id
            )
            
            return {
                "success": False,
                "response": f"I encountered an error processing your request: {str(e)}",
                "metadata": {
                    "request_id": request_id,
                    "error": str(e),
                    "execution_time": execution_time
                }
            }
    
    def _build_context_string(self, db_context: Dict[str, Any], user_name: str) -> str:
        """
        Build a compact but comprehensive financial context string.
        This same context is shared by all agents.
        """
        context_parts = [f"User: {user_name}"]
        
        # Accounts - using correct key 'account_details'
        accounts = db_context.get('account_details', [])
        if accounts:
            context_parts.append("\nAccounts:")
            for acc in accounts[:20]:  # Limit for context size
                context_parts.append(f"- {acc['name']}: ${acc['balance']:,.2f} ({acc['type']})")
        
        # Assets
        assets = db_context.get('manual_assets', [])
        if assets:
            context_parts.append("\nAssets:")
            for asset in assets[:10]:
                context_parts.append(f"- {asset['name']}: ${asset['value']:,.2f}")
        
        # Liabilities
        liabilities = db_context.get('manual_liabilities', [])
        if liabilities:
            context_parts.append("\nLiabilities:")
            for liability in liabilities[:10]:
                context_parts.append(f"- {liability['name']}: ${liability['balance']:,.2f}")
        
        # Goals
        goals = db_context.get('goals', [])
        if goals:
            context_parts.append("\nGoals:")
            for goal in goals[:10]:
                progress = (goal['current_amount'] / goal['target_amount'] * 100) if goal['target_amount'] > 0 else 0
                context_parts.append(f"- {goal['name']}: ${goal['current_amount']:,.2f} / ${goal['target_amount']:,.2f} ({progress:.1f}%)")
        
        # Budgets - Include more detail about budget categories
        budgets = db_context.get('budgets', [])
        budget_categories = db_context.get('budget_categories', [])
        
        if budgets:
            context_parts.append("\nBudgets:")
            for budget in budgets[:10]:
                context_parts.append(f"- {budget['name']}: ${budget['amount']:,.2f} per {budget['period']}")
                # Add budget categories if available
                budget_cats = [cat for cat in budget_categories if cat.get('budget_id') == budget.get('id')]
                if budget_cats:
                    for cat in budget_cats[:5]:
                        context_parts.append(f"  • {cat.get('category', 'Unknown')}: ${cat.get('limit', 0):,.2f}")
        
        # Recurring Income
        income = db_context.get('recurring_income', [])
        if income:
            context_parts.append("\nRecurring Income:")
            for inc in income[:5]:
                context_parts.append(f"- {inc['source']}: ${inc['gross_monthly']:,.2f}/month")
        
        # Top Categories (last 6 months)
        categories = db_context.get('top_categories', [])
        if categories:
            context_parts.append("\nTop Spending Categories:")
            for cat in categories[:10]:
                context_parts.append(f"- {cat['category']}: ${abs(cat['total_spent']):,.2f}")
        
        # Top Merchants (last 6 months)
        merchants = db_context.get('top_merchants', [])
        if merchants:
            context_parts.append("\nTop Merchants:")
            for merchant in merchants[:10]:
                context_parts.append(f"- {merchant['merchant']}: ${abs(merchant['total_spent']):,.2f}")
        
        # Use financial_summary for net worth if available, otherwise calculate
        financial_summary = db_context.get('financial_summary', {})
        if financial_summary and 'net_worth' in financial_summary:
            net_worth = financial_summary['net_worth']
        else:
            # Fallback calculation
            total_assets = sum(acc['balance'] for acc in accounts) + sum(a['value'] for a in assets)
            total_liabilities = sum(l['balance'] for l in liabilities)
            net_worth = total_assets - total_liabilities
        
        context_parts.append(f"\nNet Worth: ${net_worth:,.2f}")
        
        return '\n'.join(context_parts)
    
    def _get_merchant_hints(self, query: str, db_context: Dict[str, Any]) -> List[str]:
        """
        Simple merchant name resolution for hints only.
        """
        try:
            # Get merchant names from entity_cache if available
            entity_cache = db_context.get('entity_cache', {})
            merchant_names = entity_cache.get('merchant_names', set())
            
            # Fallback to top_merchants if entity_cache not available
            if not merchant_names:
                merchant_names = set()
                for merchant in db_context.get('top_merchants', []):
                    if merchant.get('merchant'):
                        merchant_names.add(merchant['merchant'])
            
            # Use entity resolver for fuzzy matching
            if merchant_names:
                resolved = resolve_entities(query, {'merchant_names': merchant_names}, cutoff=0.4)
                return resolved.get('merchant_names', [])
        except Exception as e:
            logger.debug(f"Merchant resolution error: {e}")
        
        return []
    
    async def _plan_route(self, query: str, schema_str: str, resolved: Dict[str, List[str]], context: str) -> Dict[str, Any]:
        """
        Plan and route using capabilities-aware prompt. NO direct answers allowed.
        """
        from datetime import datetime
        current_date = datetime.now().strftime('%Y-%m-%d')
        
        # Build system message with proper string concatenation
        system_message = f"""You are the Orchestrator. You never answer from summaries. You only plan and route.

TODAY'S DATE: {current_date}

CAPABILITIES:
- SQL_AGENT: Authoritative access to user data via SQL (transactions, accounts, budgets, goals, assets, liabilities, insurances, etc.). Can filter by user_id, time, merchants, categories, accounts; can aggregate, rank, compare, and compute metrics. This is REQUIRED for any answer involving user data.
- KNOWLEDGE_AGENT (future): financial textbook knowledge, explanations, education. (Not available now.)
- DIRECT_CONTEXT: DISALLOWED for answers. Context is informational only, not a data source.

POLICY:
- If the question touches user data in any way (lists/values/totals/ranks/filters/metrics/timeframes), you MUST set required_agents = ["SQL_AGENT"].
- Only if the question is purely general knowledge (no user data) would you route to KNOWLEDGE_AGENT, but that agent is not yet available—return that as "unsupported_for_now".

INPUTS PROVIDED:
- FULL (non-row) DB schema catalog (tables & columns).
- Entity resolver output (candidate merchants/categories/accounts).
- A non-authoritative profile summary is provided only to help with entity names; it must NOT be used as a data source.

OUTPUT JSON (MANDATORY):
{{
  "intent": "rank|aggregate|filter|lookup|compare|trend|list|explain_general",
  "data_sources": ["transactions","accounts","goals","budgets","manual_assets","manual_liabilities","insurances", ...],
  "dimensions": ["merchant_name","category","account_name", ...] or [],
  "metrics": ["sum_spend","count_tx","balance","goal_target","goal_current", ...] or [],
  "timeframe": {{"type":"explicit|default","window":"last_12_months|month_to_date|year_to_date|all_time|<iso/interval>"}},
  "filters": {{"user_id":"<required>", "merchants":[], "categories":[], "accounts":[], "amount_sign":"expenses|income|all"}},
  "entities_detected": {{"merchants":[], "categories":[], "accounts":[]}},
  "required_agents": ["SQL_AGENT"] or ["KNOWLEDGE_AGENT"],
  "justification": "Why SQL is required and what will be queried."
}}

Database Schema:
{schema_str}

Entity Resolution Results:
{json.dumps(resolved, indent=2)}

{context}"""

        messages = [
            {"role": "system", "content": system_message},
            {"role": "user", "content": f"Question: {query}"}
        ]
        
        try:
            response = await self.client.chat.completions.create(
                model="gpt-4o",
                messages=messages,
                response_format={"type": "json_object"},
                max_tokens=2000,
                temperature=0.3
            )
            
            plan = json.loads(response.choices[0].message.content)
            
            # Ensure filters always has user_id
            if 'filters' not in plan:
                plan['filters'] = {}
            plan['filters']['user_id'] = '<required>'
            
            return plan
        except Exception as e:
            logger.warning(f"Planning failed, defaulting to SQL: {e}")
            # Minimal fallback plan
            return {
                "intent": "lookup",
                "data_sources": ["transactions"],
                "required_agents": ["SQL_AGENT"],
                "justification": "Default to SQL for safety after planning error",
                "filters": {"user_id": "<required>"}
            }
    
    def _requires_user_data(self, plan: Dict[str, Any]) -> bool:
        """
        Check if the plan involves user data (not just general knowledge).
        """
        # Check for data sources that indicate user data
        data_sources = plan.get('data_sources', [])
        if data_sources:
            return True
        
        # Check for metrics that indicate calculations on user data
        metrics = plan.get('metrics', [])
        if metrics:
            return True
        
        # Check for specific intents that involve user data
        intent = plan.get('intent', '')
        data_intents = ['rank', 'aggregate', 'filter', 'lookup', 'compare', 'trend', 'list']
        if intent in data_intents:
            return True
        
        # Check if entities were detected (indicates user-specific data)
        entities = plan.get('entities_detected', {})
        if any(entities.values()):
            return True
        
        return False
    
    async def _generate_final_response(self, query: str, context: str, 
                                      sql_result: Dict[str, Any], user_name: str,
                                      validation: Optional[Dict[str, Any]] = None,
                                      explanation: Optional[Dict[str, Any]] = None,
                                      adapted_query_info: Optional[Dict[str, Any]] = None) -> str:
        """
        Generate final response using LLM with SQL results.
        """
        # Truncate data to avoid token overflow
        data = sql_result.get('data', []) if sql_result.get('success') else []
        
        # Limit to 50 rows for LLM processing
        truncated_data = data[:50] if isinstance(data, list) else data
        data_summary = ""
        
        if len(data) > 50:
            data_summary = f"\n(Showing first 50 of {len(data)} total results)"
        
        # If data is very large, provide summary statistics instead
        if len(data) > 100:
            # Compute summary statistics
            summary = {
                "total_rows": len(data),
                "showing_first": 50,
                "columns": list(data[0].keys()) if data else []
            }
            
            # Try to compute aggregates for numeric columns
            if data and any('amount' in str(k).lower() for k in data[0].keys()):
                amounts = [row.get('amount', 0) for row in data if isinstance(row.get('amount'), (int, float))]
                if amounts:
                    summary["total_amount"] = sum(amounts)
                    summary["avg_amount"] = sum(amounts) / len(amounts)
                    summary["min_amount"] = min(amounts)
                    summary["max_amount"] = max(amounts)
            
            data_str = json.dumps(summary, indent=2) + "\n\nSample rows:\n" + json.dumps(truncated_data[:10], indent=2)
        else:
            data_str = json.dumps(truncated_data, indent=2) + data_summary
        
        from datetime import datetime
        current_date = datetime.now().strftime('%Y-%m-%d')
        
        system_message = f"""You are Penny, a warm and friendly AI financial advisor for {user_name}.
You have access to their financial data and the results of database queries.

TODAY'S DATE: {current_date}

PERSONALITY & TONE:
- Be warm, encouraging, and supportive - like a knowledgeable friend who cares about their financial wellbeing
- Use a conversational tone while remaining professional
- Occasionally use light encouragement (e.g., "You're doing great with...", "I noticed that...")
- Be empathetic when discussing challenges or overspending

FORMATTING GUIDELINES:
- Be specific and use actual numbers from the data
- Format currency values properly (e.g., $1,234.56)
- NEVER use LaTeX or mathematical notation - write out calculations plainly
- For percentages, simply write "82.42%" not mathematical formulas
- Use bullet points or clear formatting to make information digestible
- Provide actionable insights and gentle recommendations when appropriate

User Financial Context:
{context}

Database Query Results:
{data_str if sql_result.get('success') else 'No data available'}

Validation Status: {validation.get('validation_status', 'unknown') if validation else 'not validated'}
Validation Notes: {validation.get('summary', '') if validation else ''}

Query Processing Explanation:
{json.dumps(explanation, indent=2) if explanation else 'No explanation available'}

Query Adaptation:
{json.dumps(adapted_query_info, indent=2) if adapted_query_info else 'No adaptation needed'}

IMPORTANT INSTRUCTIONS:
1. If the query was adapted, explain why clearly to the user
2. Use the explanation to make your response more helpful
3. If validation found issues, address them in your response
4. Be transparent about any limitations or adaptations
5. Suggest follow-up queries from the explanation if relevant
6. If the result is 0 or empty, check the validation notes - there may be a data mismatch
"""

        messages = [
            {"role": "system", "content": system_message},
            {"role": "user", "content": query}
        ]
        
        response = await self.client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            max_tokens=1500,
            temperature=0.7
        )
        
        return response.choices[0].message.content
    
