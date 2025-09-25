# agents/planner.py
"""
Lightweight ReAct Planner using GPT-4o for entity extraction and intent classification
"""

from pydantic import BaseModel, Field
from typing import List, Literal, Optional, Dict, Any
import datetime as dt
import logging
import json
from openai import OpenAI
from config import Config

logger = logging.getLogger("agents.planner")

IntentType = Literal[
    "transaction_search", "spend_by_time", "top_merchants",
    "category_breakdown", "balance_lookup", "net_worth", "unknown"
]

class DateRange(BaseModel):
    from_: Optional[str] = Field(default=None, alias="from")
    to: Optional[str] = None
    default: Optional[str] = None  # e.g. "90d"

class Entities(BaseModel):
    merchants: List[str] = []
    categories: List[str] = []
    amount_filters: List[Dict[str, Any]] = []  # [{"op":"gt","value":50}]
    date_range: Optional[DateRange] = None

class ToolCall(BaseModel):
    tool: Literal["merchant_resolver", "search_builder", "sql_agent", "modeling_agent"]
    args: Dict[str, Any] = {}

class PlannerPlan(BaseModel):
    intent: IntentType = "unknown"
    entities: Entities = Field(default_factory=Entities)
    tool_plan: List[ToolCall] = []
    invariants: List[str] = []  # e.g. ["must-filter-merchant","exclude-pending","spend-amount-lt-0"]
    confidence: float = 0.0
    ask_clarifying: bool = False
    feedback: Optional[str] = None  # used for repair round

def _build_system_prompt() -> str:
    return """You are an intelligent financial query analyzer that uses reasoning to understand user intent.

## Your Capabilities:
You analyze financial questions to understand what the user REALLY wants to know, not just matching keywords.
You reason about the semantic meaning and context to determine the true intent.

## Available Intents to Choose From:
- transaction_search: User wants specific transactions (at specific merchants, with filters)
- spend_by_time: User wants spending totals over time periods (monthly, yearly trends)
- top_merchants: User wants to know their TOP PLACES/MERCHANTS where they spend (ranked list)
- category_breakdown: User wants spending by category type (food, gas, entertainment, etc.)
- balance_lookup: User wants account balances or available money
- net_worth: User wants total assets minus liabilities
- unknown: Cannot determine clear intent

## Your Task:
1. Read the user's question carefully
2. Think about what they REALLY want to know (not just keywords)
3. Reason about the context and natural language
4. Extract relevant entities (merchants, dates, categories, amounts)
5. Determine the single best intent that matches their need

## Examples of Reasoning (not patterns to match):
- "where have I been spending" → Think: user wants to see WHICH PLACES, not how much → top_merchants
- "how much did I spend" → Think: user wants TOTAL AMOUNT over time → spend_by_time
- "show me Starbucks" → Think: user wants specific merchant transactions → transaction_search
- "spending breakdown" → Think: user wants categories → category_breakdown

## Entity Extraction:
Extract these if mentioned:
- Merchants: Any business/store/place names (preserve exact wording)
- Date ranges: Convert natural language to specific ranges
- Categories: Types of spending mentioned
- Amounts: Any monetary filters mentioned

## Output Format:
Return clean JSON with your reasoning and classification.

Remember: Use intelligence and reasoning, not pattern matching."""

def _build_user_prompt(question: str, now_utc: dt.datetime, feedback: Optional[str] = None) -> str:
    prompt = f"""Current UTC time: {now_utc.isoformat()}
User question: "{question}"
"""
    if feedback:
        prompt += f"\nPrevious attempt failed with: {feedback}\nPlease fix the plan to address this issue."

    prompt += "\nAnalyze the user's question semantically and return a JSON plan. Use your intelligence to understand intent and extract entities naturally."

    return prompt

def _extract_json_from_response(content: str) -> Dict[str, Any]:
    """
    Robustly extract JSON from LLM response, handling various formats
    """
    import re

    # Remove markdown code blocks
    if content.startswith("```json"):
        content = content[7:]
    elif content.startswith("```"):
        content = content[3:]
    if content.endswith("```"):
        content = content[:-3]

    # Try direct parsing first
    try:
        return json.loads(content.strip())
    except json.JSONDecodeError:
        pass

    # Try to find JSON object in response
    json_pattern = r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}'
    matches = re.findall(json_pattern, content, re.DOTALL)

    for match in matches:
        try:
            return json.loads(match)
        except json.JSONDecodeError:
            continue

    # Last resort: try to extract key components manually
    logger.warning(f"Failed to parse JSON, attempting manual extraction from: {content[:200]}...")

    # Basic fallback extraction
    intent_match = re.search(r'"intent":\s*"([^"]+)"', content)
    merchants_match = re.search(r'"merchants":\s*\[([^\]]*)\]', content)
    confidence_match = re.search(r'"confidence":\s*([0-9.]+)', content)

    fallback_data = {
        "intent": intent_match.group(1) if intent_match else "unknown",
        "entities": {
            "merchants": [],
            "categories": [],
            "amount_filters": [],
            "date_range": {"default": "90d"}
        },
        "invariants": ["exclude-pending", "spend-amount-lt-0"],
        "confidence": float(confidence_match.group(1)) if confidence_match else 0.0,
        "ask_clarifying": False,
        "feedback": None
    }

    # Extract merchants if found
    if merchants_match:
        merchants_str = merchants_match.group(1)
        merchants = re.findall(r'"([^"]+)"', merchants_str)
        fallback_data["entities"]["merchants"] = merchants
        if merchants:
            fallback_data["invariants"].append("must-filter-merchant")

    return fallback_data

def plan_with_4o(question: str, now_utc: dt.datetime = None,
                 default_days: int = 90, feedback: Optional[str] = None) -> PlannerPlan:
    """
    Use GPT-4o to create a plan for handling the user's question
    """
    if now_utc is None:
        now_utc = dt.datetime.utcnow()

    try:
        # Set up OpenAI client
        client = OpenAI(api_key=Config.OPENAI_API_KEY)

        response = client.chat.completions.create(
            model=Config.PLANNER_MODEL,
            messages=[
                {"role": "system", "content": _build_system_prompt()},
                {"role": "user", "content": _build_user_prompt(question, now_utc, feedback)}
            ],
            temperature=0.1,
            max_tokens=500
        )

        # Extract JSON from response
        content = response.choices[0].message.content.strip()

        # Robust JSON extraction
        data = _extract_json_from_response(content)
        plan = PlannerPlan(**data)

        # Apply defaults if merchant is detected but no date range
        if plan.entities.merchants and not plan.entities.date_range:
            plan.entities.date_range = DateRange(default=f"{default_days}d")

        # Ensure invariants are set
        if plan.intent in ["transaction_search", "spend_by_time", "top_merchants"]:
            if "exclude-pending" not in plan.invariants:
                plan.invariants.append("exclude-pending")
            if "spend-amount-lt-0" not in plan.invariants:
                plan.invariants.append("spend-amount-lt-0")
            if plan.entities.merchants and "must-filter-merchant" not in plan.invariants:
                plan.invariants.append("must-filter-merchant")

        logger.info(f"Planner classified intent as {plan.intent} with confidence {plan.confidence}")
        return plan

    except Exception as e:
        logger.error(f"Planner failed: {e}, falling back to conservative plan")
        # Return conservative fallback
        return PlannerPlan(
            intent="unknown",
            entities=Entities(),
            confidence=0.0,
            feedback=str(e) if feedback else None
        )