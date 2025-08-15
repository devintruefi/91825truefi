"""
Semantic Interpreter - Understands user intent beyond literal interpretation
Uses LLM to map user requests to available data dynamically
"""
import logging
import json
from typing import Dict, List, Any, Optional, Tuple
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

class SemanticInterpreter:
    """
    Interprets user queries semantically to understand intent beyond literal words.
    This enables intelligent adaptation when exact matches don't exist.
    """
    
    def __init__(self, openai_client: AsyncOpenAI):
        self.client = openai_client
        
    async def interpret_query(self, 
                            query: str, 
                            context: Dict[str, Any],
                            enumerations: Dict[str, Any]) -> Dict[str, Any]:
        """
        Interpret a user query with full context awareness.
        Returns structured interpretation including intent, adaptations needed, etc.
        """
        
        from datetime import datetime
        current_date = datetime.now().strftime('%Y-%m-%d')
        
        system_prompt = f"""You are a semantic interpreter for a financial query system.
Your job is to understand what the user REALLY wants, not just what they literally asked for.

TODAY'S DATE: {current_date}

Given a user query and their available data, provide a semantic interpretation that includes:
1. What they literally asked for
2. What they likely mean given their actual data
3. Any necessary adaptations
4. Potential ambiguities to clarify

Respond in JSON format with this structure:
{{
    "literal_request": {{
        "entities": ["list of specific things mentioned"],
        "action": "what they want to do",
        "filters": {{"time_period": "if any", "account_types": [], "other": {{}}}}
    }},
    "semantic_intent": {{
        "primary_goal": "what they really want to know",
        "alternative_interpretations": ["other possible meanings"],
        "confidence": 0.0-1.0
    }},
    "adaptations_needed": {{
        "mismatch_detected": true/false,
        "reason": "why adaptation is needed",
        "suggested_adaptation": "how to adapt the query",
        "explanation_for_user": "what to tell the user"
    }},
    "clarifications_needed": ["list of ambiguities that could be clarified"],
    "query_complexity": "simple|moderate|complex",
    "requires_calculation": true/false
}}

Examples of semantic interpretation:
- "checking balance" when user has no checking → interpret as "liquid funds" or "cash accounts"
- "last month spending" → interpret with proper date range calculation
- "how much do I owe" → interpret as total liabilities/credit card balances
- "am I on track" → interpret as goal progress or budget adherence
"""

        # Build context string with available data
        context_str = self._build_semantic_context(context, enumerations)
        
        user_prompt = f"""Query: {query}

User's Available Data:
{context_str}

Interpret this query semantically, considering what data the user actually has."""

        try:
            response = await self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"},
                max_tokens=800,
                temperature=0.3
            )
            
            interpretation = json.loads(response.choices[0].message.content)
            logger.info(f"Semantic interpretation: {json.dumps(interpretation, indent=2)}")
            
            return interpretation
            
        except Exception as e:
            logger.error(f"Semantic interpretation failed: {e}")
            # Return a basic interpretation on error
            return {
                "literal_request": {"entities": [], "action": "unknown", "filters": {}},
                "semantic_intent": {"primary_goal": query, "confidence": 0.5},
                "adaptations_needed": {"mismatch_detected": False},
                "error": str(e)
            }
    
    async def generate_adapted_query(self,
                                   original_query: str,
                                   interpretation: Dict[str, Any],
                                   available_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate an adapted query based on semantic interpretation.
        Returns both the adapted query and explanation.
        """
        
        if not interpretation.get('adaptations_needed', {}).get('mismatch_detected'):
            return {
                "adapted_query": original_query,
                "explanation": None,
                "changes_made": []
            }
        
        system_prompt = """You are a query adapter for a financial system.
Given a semantic interpretation and available data, generate an adapted query that will work with the actual data.

Return JSON with:
{{
    "adapted_query": "the new query that matches available data",
    "explanation": "user-friendly explanation of changes",
    "changes_made": ["list of specific adaptations"],
    "confidence": 0.0-1.0
}}

Adaptation principles:
- Preserve user intent while matching available data
- Be explicit about what you're showing instead
- Suggest follow-up queries if needed
"""

        user_prompt = f"""Original Query: {original_query}

Interpretation:
{json.dumps(interpretation, indent=2)}

Available Data Types:
{json.dumps(available_data, indent=2)}

Generate an adapted query that preserves the user's intent but works with their actual data."""

        try:
            response = await self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"},
                max_tokens=400,
                temperature=0.3
            )
            
            return json.loads(response.choices[0].message.content)
            
        except Exception as e:
            logger.error(f"Query adaptation failed: {e}")
            return {
                "adapted_query": original_query,
                "explanation": "Could not adapt query",
                "error": str(e)
            }
    
    def _build_semantic_context(self, context: Dict[str, Any], enumerations: Dict[str, Any]) -> str:
        """Build a context string optimized for semantic interpretation."""
        parts = []
        
        # User's actual data types
        if enumerations.get('user_account_types'):
            parts.append(f"Account types user has: {', '.join(enumerations['user_account_types'])}")
        else:
            parts.append("Account types user has: None found")
            
        if enumerations.get('user_account_names'):
            parts.append(f"User accounts: {', '.join(enumerations['user_account_names'][:5])}")
            
        # Categories and merchants
        if enumerations.get('user_categories'):
            top_categories = enumerations['user_categories'][:10]
            parts.append(f"Transaction categories in use: {', '.join(top_categories)}")
            
        if enumerations.get('user_budget_categories'):
            parts.append(f"Budget categories: {', '.join(enumerations['user_budget_categories'])}")
            
        # System capabilities
        if enumerations.get('all_account_types'):
            parts.append(f"System supports account types: {', '.join(enumerations['all_account_types'])}")
            
        # Financial summary from context
        if context:
            if 'financial_summary' in context:
                summary = context['financial_summary']
                parts.append(f"Net worth: ${summary.get('net_worth', 0):,.2f}")
                parts.append(f"Total assets: ${summary.get('total_assets', 0):,.2f}")
                
        return "\n".join(parts)
    
    async def detect_common_patterns(self, query: str) -> Dict[str, Any]:
        """
        Detect common query patterns that often need adaptation.
        This is a fast, rule-based check before full semantic analysis.
        """
        patterns = {
            'liquid_funds': {
                'triggers': ['checking', 'savings', 'cash', 'liquid', 'available funds'],
                'interpretation': 'User wants to know about readily available money',
                'common_adaptations': ['Show all non-investment accounts', 'Exclude retirement accounts']
            },
            'debt_summary': {
                'triggers': ['owe', 'debt', 'liabilities', 'loans', 'credit card balance'],
                'interpretation': 'User wants to know total debt obligations',
                'common_adaptations': ['Include all credit accounts and loans', 'Show payment schedules']
            },
            'spending_analysis': {
                'triggers': ['spending', 'expenses', 'where money goes', 'biggest expenses'],
                'interpretation': 'User wants spending breakdown',
                'common_adaptations': ['Group by category', 'Show trends over time']
            },
            'savings_progress': {
                'triggers': ['saving', 'am I on track', 'goal progress', 'retirement'],
                'interpretation': 'User wants to know about progress toward goals',
                'common_adaptations': ['Show goal completion percentages', 'Project future values']
            },
            'income_analysis': {
                'triggers': ['income', 'earnings', 'deposits', 'paycheck'],
                'interpretation': 'User wants to understand income patterns',
                'common_adaptations': ['Show recurring deposits', 'Identify income sources']
            }
        }
        
        query_lower = query.lower()
        detected_patterns = []
        
        for pattern_name, pattern_info in patterns.items():
            if any(trigger in query_lower for trigger in pattern_info['triggers']):
                detected_patterns.append({
                    'pattern': pattern_name,
                    'interpretation': pattern_info['interpretation'],
                    'suggested_adaptations': pattern_info['common_adaptations']
                })
        
        return {
            'patterns_detected': detected_patterns,
            'requires_deep_analysis': len(detected_patterns) == 0
        }