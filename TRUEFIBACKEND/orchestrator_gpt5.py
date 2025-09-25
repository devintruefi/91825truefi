# TRUEFIBACKEND/orchestrator_gpt5.py
# Simplified GPT-5-centric orchestrator

import time
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

from agents.gpt5_unified_agent import GPT5UnifiedAgent
from profile_pack import ProfilePackBuilder
from agent_logging.logger import agent_logger
from config import config

logger = logging.getLogger(__name__)

# Memory support (optional, default disabled for simplicity)
try:
    from memory import MemoryManager, ContextBuilder
    MEMORY_MODULE_AVAILABLE = True
except ImportError:
    MEMORY_MODULE_AVAILABLE = False
    logger.info("Memory system not available, proceeding without it")


class GPT5Orchestrator:
    """
    Simplified orchestrator that relies on GPT-5 for everything
    Only uses SQL agent when GPT-5 requests transaction data
    """

    def __init__(self):
        self.gpt5_agent = GPT5UnifiedAgent()
        self.profile_builder = ProfilePackBuilder()

        # Optional memory support
        use_memory = config.MEMORY_ENABLED and MEMORY_MODULE_AVAILABLE
        if use_memory:
            self.memory_manager = MemoryManager()
            self.context_builder = ContextBuilder(self.memory_manager)
        else:
            self.memory_manager = None
            self.context_builder = None

    async def process_question(
        self,
        user_id: str,
        question: str,
        conversation_history: Optional[List[Dict]] = None,
        session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Process a question using GPT-5 as the primary intelligence
        Much simpler than the original orchestrator
        """
        start_time = time.time()

        try:
            logger.info(f"GPT-5 Orchestrator processing question for user {user_id}")

            # Step 1: Build comprehensive profile pack
            # This has ALL the user's financial data except detailed transactions
            profile_pack = self.profile_builder.build(user_id, force_refresh=False)
            logger.info(f"Profile pack built for user {user_id}")

            # Step 2: Build session context if memory is available
            session_context = None
            if self.context_builder and session_id:
                try:
                    # Store user message
                    await self.memory_manager.store_message(
                        session_id=session_id,
                        user_id=user_id,
                        role='user',
                        content=question
                    )

                    # Build context for GPT-5
                    session_context = await self.context_builder.build_agent_context(
                        user_id=user_id,
                        session_id=session_id,
                        current_question=question,
                        profile_pack=profile_pack
                    )
                    logger.info(f"Session context built with {len(session_context)} components")
                except Exception as e:
                    logger.warning(f"Failed to build session context: {e}")

            # Step 3: Let GPT-5 handle EVERYTHING
            # It will determine if it needs transaction data and fetch it if necessary
            result = await self.gpt5_agent.process_request(
                user_id=user_id,
                question=question,
                profile_pack=profile_pack,
                session_context=session_context
            )

            # Step 4: Store response in memory if available
            if self.context_builder and session_id and result.get('answer_markdown'):
                try:
                    await self.memory_manager.store_message(
                        session_id=session_id,
                        user_id=user_id,
                        role='assistant',
                        content=result['answer_markdown'],
                        metadata={
                            'ui_blocks': len(result.get('ui_blocks', [])),
                            'computations': len(result.get('computations', []))
                        }
                    )
                except Exception as e:
                    logger.warning(f"Failed to store response in memory: {e}")

            # Calculate execution time
            execution_time = (time.time() - start_time) * 1000

            # Log the execution
            agent_logger().log_agent_execution(
                user_id=user_id,
                agent_name="gpt5_orchestrator",
                input_data={'question': question, 'user_id': user_id},
                output_data=result,
                execution_time_ms=execution_time
            )

            # Return comprehensive response
            return {
                'result': result,
                'execution_time_ms': execution_time,
                'profile_summary': self._summarize_profile(profile_pack),
                'powered_by': 'GPT-5',
                'logs': []
            }

        except Exception as e:
            error_msg = f"GPT-5 Orchestrator error: {str(e)}"
            logger.error(error_msg)

            # Log error
            agent_logger().log_agent_execution(
                user_id=user_id,
                agent_name="gpt5_orchestrator",
                input_data={'question': question, 'user_id': user_id},
                error_message=error_msg,
                execution_time_ms=(time.time() - start_time) * 1000
            )

            return {'error': error_msg}

    def _summarize_profile(self, profile_pack: Dict[str, Any]) -> Dict[str, Any]:
        """Quick profile summary"""
        return {
            'user_id': profile_pack.get('user_core', {}).get('user_id'),
            'net_worth': profile_pack.get('derived_metrics', {}).get('net_worth', 0),
            'accounts': len(profile_pack.get('accounts', [])),
            'goals': len(profile_pack.get('goals', [])),
            'investments': len(profile_pack.get('holdings', []))
        }
