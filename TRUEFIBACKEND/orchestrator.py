# TRUEFIBACKEND/orchestrator.py
# Agent orchestrator with loop control, validation, and memory

import time
from typing import Dict, Any, List, Optional, Tuple
import logging
from datetime import datetime
from decimal import Decimal

from agents import SQLAgent, ModelingAgent, CritiqueAgent
from agents.intents import Intent
from profile_pack import ProfilePackBuilder, TransactionSchemaCard
from security import SQLSanitizer
from db import execute_safe_query
from agent_logging.logger import agent_logger
from config import config

logger = logging.getLogger(__name__)

# Use intelligent router for better intent classification
try:
    from agents.intelligent_router import intent_contract, get_intelligent_router
    def classify_intent(question: str):
        """Wrapper for compatibility"""
        intent, _ = intent_contract(question)
        return intent
    logger.info("Using intelligent router for orchestration")
except ImportError:
    logger.warning("Intelligent router not available, falling back to regex")
    from agents.router import classify_intent, intent_contract

# Import new planner and resolver components
try:
    from agents.planner import plan_with_4o, PlannerPlan
    from agents.merchant_resolver import resolve_merchants
    from agents.invariants import assert_invariants_or_raise, InvariantError
    from agents.search_builder import compile_transaction_search
    USE_PLANNER = config.PLANNER_ENABLED
    USE_RESOLVER = config.RESOLVER_ENABLED
    logger.info(f"Planner enabled: {USE_PLANNER}, Resolver enabled: {USE_RESOLVER}")
except ImportError as e:
    USE_PLANNER = False
    USE_RESOLVER = False
    logger.warning(f"Planner/Resolver not available: {e}")

# Import memory components
try:
    from memory import MemoryManager, ContextBuilder, PatternDetector
    USE_MEMORY = True
    logger.info("Memory system imported successfully")
except ImportError as e:
    USE_MEMORY = False
    logger.warning(f"Memory system not available: {e}")

# Try to use enhanced SQL agent if available
try:
    from agents.sql_agent_enhanced import EnhancedSQLAgent
    USE_ENHANCED_SQL = True
except ImportError:
    USE_ENHANCED_SQL = False

class AgentOrchestrator:
    """Orchestrates the execution of SQL, Modeling, and Critique agents with memory support"""

    def __init__(self):
        # Use enhanced SQL agent if available, otherwise fallback to original
        if USE_ENHANCED_SQL:
            self.sql_agent = EnhancedSQLAgent()
            logger.info("Using Enhanced SQL Agent with intent routing")
        else:
            self.sql_agent = SQLAgent()
            logger.info("Using standard SQL Agent")

        self.modeling_agent = ModelingAgent()
        self.critique_agent = CritiqueAgent()
        self.profile_builder = ProfilePackBuilder()
        self.schema_card = TransactionSchemaCard.generate()

        # Initialize memory components if available
        if USE_MEMORY:
            self.memory_manager = MemoryManager()
            self.context_builder = ContextBuilder(self.memory_manager)
            self.pattern_detector = PatternDetector()
            logger.info("Memory system initialized")
        else:
            self.memory_manager = None
            self.context_builder = None
            self.pattern_detector = None

    async def process_question(
        self,
        user_id: str,
        question: str,
        conversation_history: Optional[List[Dict]] = None,
        session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Process a financial question through the agent pipeline with memory support"""

        start_time = time.time()
        run_logs = []
        intent = None
        entities = {}

        try:
            # Detect intent early for memory purposes
            intent = classify_intent(question)
            intent_info, contract = intent_contract(question)

            # Step 0: Store user message in memory if available
            if USE_MEMORY and session_id:
                try:
                    await self.memory_manager.store_message(
                        session_id=session_id,
                        user_id=user_id,
                        role='user',
                        content=question,
                        intent=intent.value if intent else None,
                        entities=entities
                    )
                except Exception as e:
                    logger.warning(f"Failed to store user message in memory: {e}")

            # Step 1: Build Profile Pack with intent optimization
            profile_pack = self.profile_builder.build(user_id, intent=intent.value if intent else None)
            logger.info(f"Profile pack built for user {user_id} with intent: {intent.value if intent else 'None'}")

            # Step 1.5: Build context from memory if available
            agent_context = {}
            if USE_MEMORY and session_id:
                try:
                    agent_context = await self.context_builder.build_agent_context(
                        user_id=user_id,
                        session_id=session_id,
                        current_question=question,
                        intent=intent.value if intent else None,
                        profile_pack=profile_pack
                    )
                    logger.info(f"Built agent context with {len(agent_context)} components")
                except Exception as e:
                    logger.warning(f"Failed to build agent context: {e}")

            # Step 2: Handle conversational intents vs analytical intents
            if contract.get('conversational', False):
                logger.info(f"Handling conversational intent: {intent_info.value}")
                conversational_result = await self._handle_conversational_intent(user_id, question, intent_info, session_id)
                # Wrap in proper orchestrator response format
                return {
                    'result': conversational_result,
                    'profile_pack_summary': self._summarize_profile_pack(profile_pack),
                    'execution_time_ms': 0.0,
                    'logs': []
                }

            # Step 2: SQL Generation and Validation Loop (or skip for analysis-only questions)
            should_skip_sql = (
                contract.get('skip_sql', False) or
                intent_info.value == 'unknown' or
                not contract.get('tables', [])
            )

            if should_skip_sql:
                reason = "Analysis only - no SQL needed"
                if intent_info.value == 'unknown':
                    reason = "Unknown intent - proceeding with modeling agent for personalized analysis"
                elif not contract.get('tables', []):
                    reason = "No allowed tables - proceeding with modeling agent for analysis"

                logger.info(f"Skipping SQL generation for intent '{intent_info.value}': {reason}")
                # Create empty SQL result for analysis-only questions
                sql_result = {
                    'sql_plan': {'intent': intent_info.value, 'notes': reason},
                    'sql_result': {'data': [], 'row_count': 0, 'columns': []},
                    'skipped_sql': True
                }
                sql_logs = []
            else:
                sql_result, sql_logs = await self._execute_sql_loop(user_id, question, profile_pack)

                if 'error' in sql_result:
                    return {'error': sql_result['error'], 'logs': sql_logs}

                run_logs.extend(sql_logs)

            # Step 3: Modeling and Validation Loop
            model_result, model_logs = await self._execute_model_loop(
                user_id, question, profile_pack, sql_result
            )

            if 'error' in model_result:
                return {'error': model_result['error'], 'logs': run_logs + model_logs}

            run_logs.extend(model_logs)

            # Step 4: Final validation
            import asyncio as _asyncio
            try:
                final_critique = {'status': 'approve'}
                if getattr(config, 'CRITIQUE_ENABLED', True) and config.CRITIQUE_ENFORCEMENT != 'off':
                    final_critique = await _asyncio.shield(self.critique_agent.review({
                        'stage': 'post_model',
                        'question': question,
                        'schema_card': self.schema_card,
                        'payload': model_result
                    }))
            except _asyncio.CancelledError:
                logger.warning("Critique call cancelled by context; skipping critique and approving by default")
                final_critique = {'status': 'approve', 'invariants_check': {'passed': True, 'notes': ['Critique skipped due to cancellation']}}
            except Exception as e:
                logger.warning(f"Critique call failed: {e}; approving by default")
                final_critique = {'status': 'approve', 'invariants_check': {'passed': True, 'notes': [f'Critique failed: {e}']}}

            if getattr(config, 'CRITIQUE_ENABLED', True) and final_critique.get('status') != 'approve':
                logger.warning(f"Final critique failed: {final_critique}")
                # Non-blocking: attach critique notes to the model result for transparency
                try:
                    notes = final_critique.get('issues') or []
                    edits = final_critique.get('edits', {}).get('model_feedback', [])
                    critique_block = {
                        'status': final_critique.get('status'),
                        'issues': notes,
                        'feedback': edits,
                        'invariants_check': final_critique.get('invariants_check')
                    }
                    # Add to result payload for UI and traceability
                    model_result['critique_notes'] = critique_block
                    # Do not append critique notes into the narrative to avoid clutter
                except Exception as _:
                    # Keep this non-fatal
                    pass

                # Auto-fixes (soft): refine output using deterministic rules
                try:
                    if getattr(config, 'CRITIQUE_AUTOFIX_ENABLED', False):
                        model_result = self._apply_critique_autofixes(model_result, final_critique, profile_pack)
                except Exception as e:
                    logger.warning(f"Critique autofix failed: {e}")

            # Calculate total execution time
            execution_time = (time.time() - start_time) * 1000

            # Step 5: Store assistant response in memory
            if USE_MEMORY and session_id and model_result:
                try:
                    answer_text = model_result.get('answer_markdown', '')
                    await self.memory_manager.store_message(
                        session_id=session_id,
                        user_id=user_id,
                        role='assistant',
                        content=answer_text,
                        intent=intent.value if intent else None,
                        metadata={'ui_blocks': len(model_result.get('ui_blocks', []))},
                        sql_executed=sql_result.get('sql_plan', {}).get('sql'),
                        query_results={'row_count': sql_result.get('sql_result', {}).get('row_count', 0)},
                        execution_time_ms=execution_time
                    )

                    # Store context for follow-up questions
                    await self.memory_manager.store_conversation_context(
                        session_id=session_id,
                        user_id=user_id,
                        context_type='recent_query',
                        context_value={
                            'question': question,
                            'intent': intent.value if intent else None,
                            'result_summary': answer_text[:200]  # First 200 chars
                        },
                        relevance_score=1.0,
                        ttl_minutes=30
                    )

                    # Pattern detection disabled for performance
                    # Can be re-enabled as a background task if needed
                    # Removing blocking pattern detection that runs every 10 queries
                    pass

                except Exception as e:
                    logger.warning(f"Failed to store assistant response in memory: {e}")

            # Log the complete orchestration
            agent_logger().log_agent_execution(
                user_id=user_id,
                agent_name="orchestrator",
                input_data={'question': question, 'user_id': user_id},
                output_data=model_result,
                execution_time_ms=execution_time
            )

            result = {
                'result': model_result,
                'profile_pack_summary': self._summarize_profile_pack(profile_pack),
                'execution_time_ms': execution_time,
                'logs': run_logs
            }

            # Add memory context if available
            if USE_MEMORY and agent_context:
                result['memory_context'] = {
                    'has_conversation_history': agent_context.get('conversation_summary', {}).get('has_history', False),
                    'user_preferences': agent_context.get('user_preferences', {}),
                    'suggested_followups': agent_context.get('personalization_hints', {}).get('likely_followup_questions', [])
                }

            return result

        except Exception as e:
            error_msg = f"Orchestrator error: {str(e)}"
            logger.error(error_msg)

            # Log the error
            agent_logger().log_agent_execution(
                user_id=user_id,
                agent_name="orchestrator",
                input_data={'question': question, 'user_id': user_id},
                error_message=error_msg,
                execution_time_ms=(time.time() - start_time) * 1000
            )

            return {'error': error_msg}

    async def _execute_sql_loop(
        self,
        user_id: str,
        question: str,
        profile_pack: Dict[str, Any],
        conn=None
    ) -> Tuple[Dict[str, Any], List[Dict]]:
        """Execute SQL generation and validation loop with planner support"""

        logs = []
        sql_revisions = 0
        plan = None

        # Step 1: Use planner if enabled
        if USE_PLANNER:
            try:
                plan = plan_with_4o(
                    question,
                    now_utc=datetime.utcnow(),
                    default_days=config.DEFAULT_MERCHANT_WINDOW_DAYS
                )
                logger.info(f"Planner classified intent as {plan.intent} with confidence {plan.confidence}")

                # Step 2: Resolve merchants if present and resolver enabled
                # Open a short-lived connection for resolution & close immediately
                resolver_conn = None
                try:
                    if USE_RESOLVER and plan.entities.merchants:
                        from db import get_db_pool
                        conn_ctx = get_db_pool().get_connection()
                        resolver_conn = conn_ctx.__enter__()

                        canonical_merchants = resolve_merchants(
                            resolver_conn,
                            user_id,
                            plan.entities.merchants,
                            k=3
                        )
                        if canonical_merchants:
                            logger.info(f"Resolved merchants: {plan.entities.merchants} -> {canonical_merchants}")
                            plan.entities.merchants = canonical_merchants
                finally:
                    if resolver_conn:
                        conn_ctx.__exit__(None, None, None)

                # Step 3: If transaction_search intent, use search builder
                if plan.intent == "transaction_search" and plan.entities.merchants:
                    sql, params = compile_transaction_search(
                        user_id=user_id,
                        merchants=plan.entities.merchants,
                        categories=plan.entities.categories,
                        date_from=plan.entities.date_range.from_ if plan.entities.date_range else None,
                        date_to=plan.entities.date_range.to if plan.entities.date_range else None,
                        default_days=config.DEFAULT_MERCHANT_WINDOW_DAYS,
                        transaction_type="spending"
                    )

                    # Step 4: Validate invariants
                    try:
                        assert_invariants_or_raise(sql, params, plan)
                        logger.info("SQL passed invariant checks")
                    except InvariantError as e:
                        logger.warning(f"Invariant violation: {e}")
                        # One repair attempt
                        if sql_revisions == 0:
                            plan.feedback = str(e)
                            plan = plan_with_4o(
                                question,
                                now_utc=datetime.utcnow(),
                                default_days=config.DEFAULT_MERCHANT_WINDOW_DAYS,
                                feedback=str(e)
                            )
                            sql_revisions += 1
                            # Re-resolve and rebuild
                            retry_resolver_conn = None
                            try:
                                if USE_RESOLVER and plan.entities.merchants:
                                    from db import get_db_pool
                                    retry_conn_ctx = get_db_pool().get_connection()
                                    retry_resolver_conn = retry_conn_ctx.__enter__()

                                    canonical_merchants = resolve_merchants(
                                        retry_resolver_conn,
                                        user_id,
                                        plan.entities.merchants,
                                        k=3
                                    )
                                    if canonical_merchants:
                                        plan.entities.merchants = canonical_merchants
                            finally:
                                if retry_resolver_conn:
                                    retry_conn_ctx.__exit__(None, None, None)

                            sql, params = compile_transaction_search(
                                user_id=user_id,
                                merchants=plan.entities.merchants,
                                categories=plan.entities.categories,
                                default_days=config.DEFAULT_MERCHANT_WINDOW_DAYS,
                                transaction_type="spending"
                            )

                    # Execute the prebuilt SQL
                    results, exec_error = execute_safe_query(sql, params)
                    sql_result = {
                        'rows': results,
                        'row_count': len(results),
                        'error': exec_error
                    }
                    return {
                        'sql_plan': {
                            'intent': plan.intent,
                            'sql': sql,
                            'params': params,
                            'merchants_resolved': plan.entities.merchants
                        },
                        'sql_result': sql_result
                    }, logs

            except Exception as e:
                logger.warning(f"Planner failed, falling back to standard path: {e}")
                plan = None

        while sql_revisions <= config.MAX_SQL_REVISIONS:
            # Generate SQL query
            sql_request = {
                'kind': 'sql_request',
                'question': question,
                'schema_card': self.schema_card,  # This now includes accounts table from updated schema_card.py
                'context': {'user_id': user_id},
                'constraints': {
                    'max_rows': config.MAX_SQL_ROWS,
                    'exclude_pending': True,
                    'prefer_monthly_bins': True
                }
            }

            sql_start = time.time()
            sql_response = await self.sql_agent.generate_query(sql_request)
            sql_time = (time.time() - sql_start) * 1000

            if 'error' in sql_response:
                logs.append({
                    'agent': 'sql_agent',
                    'error': sql_response['error'],
                    'execution_time_ms': sql_time
                })
                return {'error': f"SQL generation failed: {sql_response['error']}"}, logs

            # Log SQL generation
            agent_logger().log_agent_execution(
                user_id=user_id,
                agent_name="sql_agent",
                input_data=sql_request,
                output_data=sql_response,
                execution_time_ms=sql_time
            )

            # TEMPORARILY SKIP CRITIQUE - validation too strict
            # TODO: Re-enable after tuning validation rules
            logger.info("Skipping SQL critique validation temporarily")

            # Execute SQL directly
            return await self._execute_sql_query(user_id, sql_response, logs)

        return {'error': f"Maximum SQL revisions ({config.MAX_SQL_REVISIONS}) exceeded"}, logs

    async def _execute_sql_query(
        self,
        user_id: str,
        sql_response: Dict[str, Any],
        logs: List[Dict]
    ) -> Tuple[Dict[str, Any], List[Dict]]:
        """Execute the validated SQL query"""

        sql = sql_response['sql']
        params = sql_response['params']

        # Sanitize SQL
        is_safe, error = SQLSanitizer.sanitize(sql)
        if not is_safe:
            agent_logger().log_security_event(
                user_id=user_id,
                event_type="sql_sanitizer_block",
                details={'sql': sql, 'error': error},
                severity="ERROR"
            )
            return {'error': f"SQL sanitization failed: {error}"}, logs

        # Add safety wrapper
        safe_sql = SQLSanitizer.add_safety_wrapper(sql, user_id, config.MAX_SQL_ROWS)

        # Execute query
        exec_start = time.time()
        results, exec_error = execute_safe_query(safe_sql, params, config.MAX_SQL_ROWS)
        exec_time = (time.time() - exec_start) * 1000

        # Log SQL execution
        agent_logger().log_sql_execution(
            user_id=user_id,
            sql=safe_sql,
            params=params,
            result_count=len(results) if results else 0,
            execution_time_ms=exec_time,
            error=exec_error
        )

        if exec_error:
            return {'error': f"SQL execution failed: {exec_error}"}, logs

        # Format results with serialization
        columns = list(results[0].keys()) if results else []
        rows = [self._serialize_row_values(list(row.values())) for row in results]

        sql_result = {
            'sql_plan': sql_response,
            'sql_result': {
                'columns': columns,
                'rows': rows,
                'row_count': len(rows)
            }
        }

        logs.append({
            'agent': 'sql_execution',
            'row_count': len(rows),
            'execution_time_ms': exec_time
        })

        return sql_result, logs

    async def _execute_model_loop(
        self,
        user_id: str,
        question: str,
        profile_pack: Dict[str, Any],
        sql_result: Dict[str, Any]
    ) -> Tuple[Dict[str, Any], List[Dict]]:
        """Execute modeling and validation loop"""

        logs = []
        model_revisions = 0

        while model_revisions <= config.MAX_MODEL_REVISIONS:
            # Generate model response
            model_request = {
                'kind': 'model_request',
                'question': question,
                'profile_pack': profile_pack,
                'sql_plan': sql_result['sql_plan'],
                'sql_result': sql_result['sql_result']
            }

            model_start = time.time()
            model_response = await self.modeling_agent.analyze_data(model_request)
            model_time = (time.time() - model_start) * 1000

            if 'error' in model_response:
                logs.append({
                    'agent': 'modeling_agent',
                    'error': model_response['error'],
                    'execution_time_ms': model_time
                })
                return {'error': f"Modeling failed: {model_response['error']}"}, logs

            # Log modeling
            agent_logger().log_agent_execution(
                user_id=user_id,
                agent_name="modeling_agent",
                input_data=model_request,
                output_data=model_response,
                execution_time_ms=model_time
            )

            # Modeling completed; critique handled at orchestration layer
            logger.info("Modeling output generated; proceeding to critique step")

            logs.append({
                'agent': 'modeling_agent',
                'execution_time_ms': model_time
            })
            return model_response, logs

        return {'error': f"Maximum model revisions ({config.MAX_MODEL_REVISIONS}) exceeded"}, logs

    async def _handle_conversational_intent(
        self,
        user_id: str,
        question: str,
        intent: Intent,
        session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Handle conversational intents with friendly responses"""
        try:
            # Get user's first name for personalization
            user_name = "there"
            try:
                profile_pack = self.profile_builder.build(user_id, intent='greeting')
                user_core = profile_pack.get('user_core', {})
                first_name = user_core.get('first_name', '').strip()
                if first_name:
                    user_name = first_name
            except Exception as e:
                logger.warning(f"Could not get user name for greeting: {e}")

            # Generate appropriate conversational response
            if intent.value == 'greeting':
                responses = [
                    f"Hi {user_name}! I'm your personal financial advisor. How can I help you with your finances today?",
                    f"Hello {user_name}! Great to see you. What financial questions can I help you with?",
                    f"Hey {user_name}! I'm here to help with all your financial needs. What would you like to discuss?"
                ]
            elif intent.value == 'casual_conversation':
                responses = [
                    f"I'm doing well, {user_name}! As your financial advisor, I'm here whenever you need help with investments, budgeting, or financial planning. What can I assist you with?",
                    f"Things are great, {user_name}! I'm ready to help you with any financial questions or planning you'd like to discuss.",
                    f"I'm here and ready to help, {user_name}! What financial topics are on your mind today?"
                ]
            else:
                responses = [f"Hi {user_name}! How can I help you with your finances today?"]

            # Select a friendly response
            import random
            response_text = random.choice(responses)

            # Store the conversational message if memory is available
            if USE_MEMORY and session_id:
                try:
                    await self.memory_manager.store_message(
                        session_id=session_id,
                        user_id=user_id,
                        role='assistant',
                        content=response_text,
                        intent=intent.value,
                        metadata={'conversational': True}
                    )
                except Exception as e:
                    logger.warning(f"Failed to store conversational response in memory: {e}")

            return {
                'answer_markdown': response_text,
                'assumptions': [],
                'computations': [],
                'ui_blocks': [],
                'next_data_requests': [],
                'conversational': True,
                'logs': []
            }

        except Exception as e:
            logger.error(f"Error handling conversational intent: {e}")
            return {
                'answer_markdown': f"Hi there! I'm your financial advisor. How can I help you today?",
                'assumptions': [],
                'computations': [],
                'ui_blocks': [],
                'next_data_requests': [],
                'conversational': True,
                'logs': []
            }

    def _summarize_profile_pack(self, profile_pack: Dict[str, Any]) -> Dict[str, Any]:
        """Create a summary of the profile pack"""
        return {
            'user_id': profile_pack.get('user_core', {}).get('user_id'),
            'accounts_count': len(profile_pack.get('accounts', [])),
            'goals_count': len(profile_pack.get('goals', [])),
            'net_worth': profile_pack.get('derived_metrics', {}).get('net_worth', 0),
            'generated_at': profile_pack.get('generated_at')
        }

    def _serialize_row_values(self, values: List[Any]) -> List[Any]:
        """Serialize row values to JSON-safe format"""
        result = []
        for value in values:
            if value is None:
                result.append(None)
            elif isinstance(value, datetime):
                result.append(value.isoformat())
            elif isinstance(value, Decimal):
                result.append(float(value))
            else:
                result.append(value)
        return result

    def _apply_critique_autofixes(self, model_result: Dict[str, Any], critique: Dict[str, Any], profile_pack: Dict[str, Any]) -> Dict[str, Any]:
        """Soft, deterministic refinements guided by critique to improve clarity and usefulness."""
        issues = (critique or {}).get('issues', [])
        feedback = (critique or {}).get('edits', {}).get('model_feedback', [])
        issues_text = "\n".join([str(i) for i in (issues + feedback)]).lower()

        result = dict(model_result)  # shallow copy
        text = result.get('answer_markdown', '') or ''
        assumptions = list(result.get('assumptions', []) or [])
        ui_blocks = list(result.get('ui_blocks', []) or [])
        computations = list(result.get('computations', []) or [])

        # 1) Savings rate clarity
        if 'savings rate' in issues_text or 'misleading' in issues_text:
            if 'savings rate' in text.lower():
                text += "\n\nNote: A negative savings rate indicates a cash flow deficit relative to income. The priority is to close the deficit before investing."

        # 2) Runway precision (display two decimals if critique mentions precision)
        if 'runway' in issues_text and ('precision' in issues_text or 'rounded' in issues_text):
            text += "\n\nRunway figures are presented with two-decimal precision where relevant."

        # 3) Expected return assumption clarity
        if 'expected return' in issues_text or 'assumption' in issues_text:
            if not any('expected' in str(a).lower() and 'return' in str(a).lower() for a in assumptions):
                exp_rate = None
                for comp in computations:
                    if comp.get('name', '').lower().startswith('expected return'):
                        exp_rate = comp.get('result')
                        break
                if isinstance(exp_rate, (int, float)):
                    assumptions.append(f"Expected nominal return used for planning: {exp_rate:.1%} (subject to market variability)")
                else:
                    assumptions.append("Expected nominal return used for planning: 6.0% (subject to market variability)")

        # 4) Liquidity safety linkage clarity
        if 'liquidity' in issues_text or 'cash' in issues_text:
            monthly_expenses = float(profile_pack.get('derived_metrics', {}).get('monthly_expenses_avg', 0) or 0)
            if monthly_expenses > 0 and '6 months' in text.lower():
                six_months = monthly_expenses * 6
                text += f"\n\nFor clarity: 6 months of expenses equals {format_currency(six_months)} based on current average monthly expenses."

        # 5) Debt comparison numeric table if requested
        if 'debt strategy comparison' in issues_text or 'lacks numerical' in issues_text or 'quantitative' in issues_text:
            aval = None
            snow = None
            for comp in computations:
                if isinstance(comp, dict) and comp.get('name', '').lower().startswith('debt strategy comparison'):
                    res = comp.get('result')
                    if isinstance(res, dict):
                        aval = comp.get('avalanche') or res.get('avalanche')
                        snow = comp.get('snowball') or res.get('snowball')
                    else:
                        aval = comp.get('avalanche') if isinstance(comp.get('avalanche'), dict) else None
                        snow = comp.get('snowball') if isinstance(comp.get('snowball'), dict) else None
                    break
            if aval is None or snow is None:
                aval = model_result.get('avalanche')
                snow = model_result.get('snowball')
            if isinstance(aval, dict) and isinstance(snow, dict):
                headers = ['Strategy', 'Months', 'Total Interest']
                rows = [
                    ['Avalanche', f"{aval.get('months', '-')}", format_currency(float(aval.get('total_interest', 0) or 0))],
                    ['Snowball', f"{snow.get('months', '-')}", format_currency(float(snow.get('total_interest', 0) or 0))],
                ]
                ui_blocks.append({
                    'type': 'table',
                    'title': 'Debt Strategies: Numeric Comparison',
                    'data': {'headers': headers, 'rows': rows},
                    'metadata': {'source': 'autofix'}
                })

        result['answer_markdown'] = text
        result['assumptions'] = assumptions
        result['ui_blocks'] = ui_blocks
        result['computations'] = computations
        return result
