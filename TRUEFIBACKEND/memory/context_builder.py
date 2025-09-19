# TRUEFIBACKEND/memory/context_builder.py
# Builds relevant context for agents from conversation history and user insights

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from memory.memory_manager import MemoryManager

logger = logging.getLogger(__name__)

class ContextBuilder:
    """
    Intelligently builds context for agents by selecting relevant conversation
    history, user insights, and patterns. This provides agents with the right
    context to give personalized and continuity-aware responses.
    """

    def __init__(self, memory_manager: Optional[MemoryManager] = None):
        self.memory_manager = memory_manager or MemoryManager()

    async def build_agent_context(
        self,
        user_id: str,
        session_id: str,
        current_question: str,
        intent: Optional[str] = None,
        profile_pack: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Build comprehensive context for agents.

        Args:
            user_id: User ID
            session_id: Current session ID
            current_question: The current user question
            intent: Detected intent of current question
            profile_pack: User's profile pack data

        Returns:
            Dictionary containing:
            - conversation_summary: Recent conversation context
            - user_preferences: Learned user preferences
            - relevant_history: Relevant past queries and answers
            - active_context: Current conversation context
            - behavioral_insights: User behavioral patterns
        """
        try:
            context = {
                'conversation_summary': await self._build_conversation_summary(session_id, user_id),
                'cross_session_history': await self._build_cross_session_history(user_id, current_question, session_id),
                'user_preferences': await self._get_user_preferences(user_id),
                'relevant_history': await self._find_relevant_history(user_id, current_question, intent),
                'active_context': await self._get_active_context(session_id, user_id),
                'behavioral_insights': await self._get_behavioral_insights(user_id),
                'personalization_hints': await self._generate_personalization_hints(user_id, intent)
            }

            # Add profile-based context if available
            if profile_pack:
                context['financial_context'] = self._extract_financial_context(profile_pack)

            logger.info(f"Built context for user {user_id} with {len(context)} components")
            return context

        except Exception as e:
            logger.error(f"Error building agent context: {e}")
            return {}

    async def _build_conversation_summary(
        self,
        session_id: str,
        user_id: str,
        max_messages: int = 5
    ) -> Dict[str, Any]:
        """
        Build a summary of recent conversation.

        Returns:
            Summary including recent topics, questions asked, and key information shared
        """
        try:
            # Get recent messages
            messages = await self.memory_manager.get_conversation_history(
                session_id, user_id, limit=max_messages
            )

            if not messages:
                return {'has_history': False}

            # Extract key information
            topics_discussed = set()
            questions_asked = []
            key_entities = {}

            for msg in messages:
                if msg['role'] == 'user':
                    questions_asked.append({
                        'question': msg['content'][:200],  # Truncate long questions
                        'intent': msg.get('intent'),
                        'time': msg.get('created_at')
                    })

                    # Collect entities
                    if msg.get('entities'):
                        for key, value in msg['entities'].items():
                            if key not in key_entities:
                                key_entities[key] = []
                            key_entities[key].append(value)

                # Track topics from intents
                if msg.get('intent'):
                    topics_discussed.add(msg['intent'])

            return {
                'has_history': True,
                'message_count': len(messages),
                'topics_discussed': list(topics_discussed),
                'recent_questions': questions_asked[-3:],  # Last 3 questions
                'key_entities': key_entities,
                'conversation_start': messages[0].get('created_at') if messages else None
            }

        except Exception as e:
            logger.error(f"Error building conversation summary: {e}")
            return {'has_history': False}

    async def _build_cross_session_history(self, user_id: str, current_question: str, session_id: str) -> Dict[str, Any]:
        """
        Build context from previous conversations when user asks about them.

        Args:
            user_id: User ID
            current_question: The question being asked

        Returns:
            Dict containing previous conversation context
        """
        try:
            # Check if user is asking about previous conversations
            question_lower = current_question.lower()
            past_conversation_indicators = [
                'last chat', 'previous conversation', 'we talked about',
                'discussed before', 'earlier chat', 'our last conversation',
                'what did we discuss', 'talked about before'
            ]

            if not any(indicator in question_lower for indicator in past_conversation_indicators):
                return {'has_cross_session_history': False}

            # Get recent conversations from other sessions
            recent_conversations = await self.memory_manager.get_recent_user_conversations(
                user_id=user_id,
                limit=3,
                days_back=7,
                exclude_session=session_id
            )

            if not recent_conversations:
                return {'has_cross_session_history': False}

            # Format the conversation summaries
            conversation_summaries = []
            for conv in recent_conversations:
                summary = {
                    'date': conv['session_date'],
                    'topics': conv['user_questions'][:200] if conv['user_questions'] else 'General discussion',
                    'message_count': conv['message_count']
                }
                conversation_summaries.append(summary)

            return {
                'has_cross_session_history': True,
                'recent_conversations': conversation_summaries,
                'conversation_count': len(conversation_summaries)
            }

        except Exception as e:
            logger.error(f"Error building cross-session history: {e}")
            return {'has_cross_session_history': False, 'error': str(e)}

    async def _get_user_preferences(self, user_id: str) -> Dict[str, Any]:
        """
        Get learned user preferences and patterns.

        Returns:
            Dictionary of user preferences grouped by type
        """
        try:
            insights = await self.memory_manager.get_user_insights(user_id)

            preferences = {
                'merchants': [],
                'query_patterns': [],
                'usage_times': [],
                'spending_categories': [],
                'display_preferences': []
            }

            for insight in insights:
                insight_type = insight.get('insight_type')

                if insight_type == 'merchant_preference':
                    preferences['merchants'].append({
                        'merchant': insight.get('insight_key'),
                        'frequency': insight.get('frequency', 0),
                        'confidence': insight.get('confidence', 0)
                    })
                elif insight_type == 'query_pattern':
                    preferences['query_patterns'].append({
                        'pattern': insight.get('insight_key'),
                        'frequency': insight.get('frequency', 0)
                    })
                elif insight_type == 'usage_time':
                    preferences['usage_times'].append({
                        'time': insight.get('insight_key'),
                        'frequency': insight.get('frequency', 0)
                    })
                elif insight_type == 'spending_category':
                    preferences['spending_categories'].append({
                        'category': insight.get('insight_key'),
                        'frequency': insight.get('frequency', 0)
                    })

            # Sort by frequency/confidence
            for key in preferences:
                if preferences[key]:
                    preferences[key] = sorted(
                        preferences[key],
                        key=lambda x: x.get('frequency', 0) * x.get('confidence', 1),
                        reverse=True
                    )[:5]  # Top 5 for each category

            return preferences

        except Exception as e:
            logger.error(f"Error getting user preferences: {e}")
            return {}

    async def _find_relevant_history(
        self,
        user_id: str,
        current_question: str,
        intent: Optional[str],
        lookback_days: int = 30
    ) -> List[Dict[str, Any]]:
        """
        Find relevant past conversations based on current question.

        Returns:
            List of relevant past Q&A pairs
        """
        try:
            # This would ideally use vector similarity search
            # For now, we'll do simple intent matching
            if not intent:
                return []

            # Get messages with same intent from past sessions
            # (In production, this would query across all sessions)
            relevant_messages = []

            # For now, return empty - would implement cross-session search
            return relevant_messages

        except Exception as e:
            logger.error(f"Error finding relevant history: {e}")
            return []

    async def _get_active_context(
        self,
        session_id: str,
        user_id: str
    ) -> List[Dict[str, Any]]:
        """
        Get active short-term context for the conversation.

        Returns:
            List of active context items
        """
        try:
            contexts = await self.memory_manager.get_active_context(session_id, user_id)

            # Process and prioritize contexts
            processed_contexts = []
            for ctx in contexts:
                context_type = ctx.get('context_type')
                context_value = ctx.get('context_value', {})

                if context_type == 'recent_query':
                    processed_contexts.append({
                        'type': 'previous_question',
                        'value': context_value.get('question'),
                        'result_summary': context_value.get('result_summary'),
                        'relevance': ctx.get('relevance_score', 0)
                    })
                elif context_type == 'entity_reference':
                    processed_contexts.append({
                        'type': 'referenced_entity',
                        'entity': context_value.get('entity'),
                        'entity_type': context_value.get('entity_type'),
                        'relevance': ctx.get('relevance_score', 0)
                    })

            return processed_contexts

        except Exception as e:
            logger.error(f"Error getting active context: {e}")
            return []

    async def _get_behavioral_insights(self, user_id: str) -> Dict[str, Any]:
        """
        Get behavioral insights about the user.

        Returns:
            Dictionary of behavioral patterns
        """
        try:
            # This would query the financial_patterns table
            # For now, return a structure that would be populated
            return {
                'typical_query_time': None,  # e.g., "morning"
                'frequent_topics': [],  # e.g., ["spending", "budget"]
                'spending_concerns': [],  # e.g., ["coffee", "dining"]
                'financial_goals_mentioned': [],  # e.g., ["saving for house"]
                'query_frequency': None  # e.g., "weekly"
            }

        except Exception as e:
            logger.error(f"Error getting behavioral insights: {e}")
            return {}

    async def _generate_personalization_hints(
        self,
        user_id: str,
        intent: Optional[str]
    ) -> Dict[str, Any]:
        """
        Generate hints for personalizing the response.

        Returns:
            Dictionary of personalization suggestions
        """
        try:
            preferences = await self._get_user_preferences(user_id)

            hints = {
                'preferred_detail_level': 'moderate',  # Could be learned over time
                'preferred_visualization': 'table',  # Could be based on past interactions
                'known_concerns': [],
                'likely_followup_questions': []
            }

            # Add merchant-specific hints
            if preferences.get('merchants'):
                top_merchants = [m['merchant'] for m in preferences['merchants'][:3]]
                hints['frequently_mentioned_merchants'] = top_merchants

            # Add query pattern hints
            if preferences.get('query_patterns'):
                common_patterns = [p['pattern'] for p in preferences['query_patterns'][:3]]
                hints['common_query_types'] = common_patterns

                # Suggest likely follow-ups based on patterns
                if intent == 'ACCOUNT_BALANCES' and 'SPEND_BY_CATEGORY' in common_patterns:
                    hints['likely_followup_questions'].append("spending breakdown")
                elif intent == 'RECENT_TRANSACTIONS' and 'TRANSACTION_SEARCH' in common_patterns:
                    hints['likely_followup_questions'].append("search for specific transactions")

            return hints

        except Exception as e:
            logger.error(f"Error generating personalization hints: {e}")
            return {}

    def _extract_financial_context(self, profile_pack: Dict) -> Dict[str, Any]:
        """
        Extract relevant financial context from profile pack.

        Args:
            profile_pack: User's profile pack

        Returns:
            Relevant financial context
        """
        try:
            derived_metrics = profile_pack.get('derived_metrics', {})

            return {
                'net_worth': derived_metrics.get('net_worth'),
                'monthly_expenses_avg': derived_metrics.get('monthly_expenses_avg'),
                'savings_rate': derived_metrics.get('savings_rate_3m'),
                'has_budget': len(profile_pack.get('budgets', [])) > 0,
                'has_goals': len(profile_pack.get('goals', [])) > 0,
                'account_count': len(profile_pack.get('accounts', [])),
                'primary_spending_categories': self._get_top_spending_categories(profile_pack)
            }

        except Exception as e:
            logger.error(f"Error extracting financial context: {e}")
            return {}

    def _get_top_spending_categories(self, profile_pack: Dict, limit: int = 3) -> List[str]:
        """
        Get top spending categories from transactions sample.

        Args:
            profile_pack: User's profile pack
            limit: Number of top categories to return

        Returns:
            List of top spending categories
        """
        try:
            transactions = profile_pack.get('transactions_sample', [])
            if not transactions:
                return []

            category_totals = {}
            for txn in transactions:
                if txn.get('amount', 0) < 0:  # Only expenses
                    category = txn.get('category', 'Unknown')
                    category_totals[category] = category_totals.get(category, 0) + abs(txn['amount'])

            # Sort by total amount and return top categories
            sorted_categories = sorted(
                category_totals.items(),
                key=lambda x: x[1],
                reverse=True
            )

            return [cat[0] for cat in sorted_categories[:limit]]

        except Exception as e:
            logger.error(f"Error getting top spending categories: {e}")
            return []

    async def format_context_for_agent(
        self,
        context: Dict[str, Any],
        agent_type: str = 'sql'
    ) -> str:
        """
        Format context into a string suitable for agent prompts.

        Args:
            context: The context dictionary
            agent_type: Type of agent (sql, modeling, critique)

        Returns:
            Formatted context string
        """
        try:
            formatted_parts = []

            # Add conversation summary if present
            if context.get('conversation_summary', {}).get('has_history'):
                summary = context['conversation_summary']
                formatted_parts.append(
                    f"Recent conversation topics: {', '.join(summary.get('topics_discussed', []))}"
                )

            # Add user preferences
            if context.get('user_preferences', {}).get('merchants'):
                merchants = [m['merchant'] for m in context['user_preferences']['merchants'][:3]]
                formatted_parts.append(f"User frequently asks about: {', '.join(merchants)}")

            # Add active context
            if context.get('active_context'):
                for ctx in context['active_context'][:2]:  # Top 2 contexts
                    if ctx['type'] == 'previous_question':
                        formatted_parts.append(f"Previous question: {ctx['value']}")

            # Add personalization hints
            if context.get('personalization_hints', {}).get('likely_followup_questions'):
                hints = context['personalization_hints']['likely_followup_questions']
                formatted_parts.append(f"User might ask about: {', '.join(hints)}")

            # Join all parts
            if formatted_parts:
                return "Context: " + " | ".join(formatted_parts)
            else:
                return ""

        except Exception as e:
            logger.error(f"Error formatting context for agent: {e}")
            return ""