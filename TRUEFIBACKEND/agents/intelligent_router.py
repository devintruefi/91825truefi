# TRUEFIBACKEND/agents/intelligent_router.py
# Intelligent intent classification using LLM reasoning instead of regex

from typing import Tuple, Dict, Any, Optional
import logging
from openai import OpenAI
from config import Config
from .intents import Intent, INTENT_TO_ALLOWED
import json

logger = logging.getLogger(__name__)

class IntelligentRouter:
    """Uses LLM reasoning to classify user intents instead of rigid regex patterns"""

    def __init__(self):
        self.client = OpenAI(api_key=Config.OPENAI_API_KEY)

    def classify_intent(self, question: str) -> Tuple[Intent, Dict[str, Any]]:
        """
        Use LLM to intelligently classify the user's intent and extract relevant context
        """
        try:
            # Build the classification prompt
            system_prompt = self._build_system_prompt()
            user_prompt = f"User question: {question}"

            response = self.client.chat.completions.create(
                model=Config.PLANNER_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.1,
                max_tokens=500
            )

            # Parse the response
            content = response.choices[0].message.content.strip()
            result = self._parse_response(content)

            intent = Intent(result.get("intent", "unknown"))
            contract = INTENT_TO_ALLOWED.get(intent, {
                "tables": [],
                "columns": [],
                "notes": "Unknown intent",
                "template_sql": None
            })

            # Add extracted context to contract
            if result.get("time_range"):
                contract["time_range"] = result["time_range"]
            if result.get("merchants"):
                contract["merchants"] = result["merchants"]
            if result.get("categories"):
                contract["categories"] = result["categories"]

            logger.info(f"Intelligently classified intent as {intent} with confidence {result.get('confidence', 0)}")
            return intent, contract

        except Exception as e:
            logger.error(f"Intelligent router failed: {e}, falling back to unknown")
            return Intent.UNKNOWN, {"tables": [], "notes": str(e)}

    def _build_system_prompt(self) -> str:
        """Build system prompt for intelligent intent classification"""
        return """You are an intelligent financial query analyzer. Analyze user questions to determine their true intent.

## Available Intents (use EXACTLY these values):
- account_balances: User wants to know account balances or how much money they have
- recent_transactions: User wants to see recent transaction history
- top_merchants: User wants to know WHERE they spend most (top places/merchants/stores)
- spend_by_category: User wants spending broken down by categories (food, gas, etc.)
- spend_by_time: User wants spending totals over time periods
- transaction_search: User searching for specific transactions or merchants
- cashflow_summary: User wants income vs expense analysis
- net_worth: User wants total assets minus liabilities
- investment_positions: User wants to see investment holdings
- savings_rate: User wants to know their savings rate
- recurring_transactions: User wants to identify recurring charges
- unknown: Cannot determine clear intent

## Your Task:
1. Analyze the semantic meaning of the question
2. Determine the PRIMARY intent (what the user really wants to know)
3. Extract relevant entities (merchants, dates, categories)
4. Consider context and natural language variations

## Output Format (JSON):
{
    "intent": "exact_intent_name_from_list",
    "confidence": 0.0-1.0,
    "reasoning": "brief explanation",
    "time_range": {
        "description": "last 30 days|last month|this year|etc",
        "start": "CURRENT_DATE - INTERVAL '30 days'",
        "end": "CURRENT_DATE"
    },
    "merchants": ["extracted", "merchant", "names"],
    "categories": ["extracted", "categories"],
    "amount_filters": [{"op": "gt|lt|eq", "value": 100}]
}

## Examples of Intent Reasoning:
- "top places I've been spending" -> top_merchants (wants merchant ranking)
- "how much did I spend last month" -> spend_by_time (wants time total)
- "what's my balance" -> account_balances (wants account info)
- "show me Starbucks transactions" -> transaction_search (specific merchant)
- "spending by category" -> spend_by_category (wants category breakdown)

Use semantic understanding, not keyword matching. Consider what the user REALLY wants to know."""

    def _parse_response(self, content: str) -> Dict[str, Any]:
        """Parse LLM response to extract intent and context"""
        try:
            # Try to parse as JSON
            if content.startswith("```json"):
                content = content[7:]
            if content.startswith("```"):
                content = content[3:]
            if content.endswith("```"):
                content = content[:-3]

            return json.loads(content.strip())
        except json.JSONDecodeError:
            logger.warning(f"Failed to parse JSON response: {content[:200]}")
            # Fallback to basic extraction
            return {"intent": "unknown", "confidence": 0.0}


# Global instance for compatibility
_router = None

def get_intelligent_router() -> IntelligentRouter:
    """Get or create the global intelligent router instance"""
    global _router
    if _router is None:
        _router = IntelligentRouter()
    return _router

def intent_contract(question: str) -> Tuple[Intent, Dict[str, Any]]:
    """
    Compatibility wrapper for existing code
    Uses intelligent classification instead of regex
    """
    router = get_intelligent_router()
    return router.classify_intent(question)