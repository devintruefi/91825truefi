# TRUEFIBACKEND/agents/sql_agent_enhanced.py
# Enhanced SQL Agent with intent routing and better table selection

from openai import AsyncOpenAI
from typing import Dict, Any, Optional, Tuple
import json
import logging
import re
from decimal import Decimal
from config import config
from validation.schemas import SQLRequestSchema, SQLResponseSchema
from validation.validate import validate_json
from agents.router import validate_sql_tables, enhance_sql_with_intent
from agents.intents import Intent
from agents.search_builder import SearchQueryBuilder

logger = logging.getLogger(__name__)

# Use intelligent router instead of regex-based router
try:
    from agents.intelligent_router import intent_contract
    logger.info("Using intelligent router for intent classification")
except ImportError:
    logger.warning("Intelligent router not available, falling back to regex router")
    from agents.router import intent_contract

class EnhancedSQLAgent:
    """Enhanced SQL Agent with deterministic intent routing"""

    def __init__(self):
        self.client = AsyncOpenAI(api_key=config.OPENAI_API_KEY)
        self.system_prompt = self._load_enhanced_system_prompt()
        self.search_builder = SearchQueryBuilder()

    def _load_enhanced_system_prompt(self) -> str:
        """Load enhanced system prompt with strict rules"""
        return """You are a PostgreSQL SQL query generator for a financial application.

CRITICAL RULES:
1. You will receive an intent classification and allowed tables - ONLY use those tables
2. ALWAYS include WHERE user_id = %(user_id)s for user data security
3. For ALL date operations on transactions, use COALESCE(posted_datetime, date::timestamptz)
4. For balance/money questions, MUST query accounts table, NEVER transactions
5. Use parameterized queries with %(param_name)s format
6. Return results that directly answer the question

OUTPUT FORMAT (JSON):
{
  "intent": "<classified_intent>",
  "sql": "<parameterized_sql>",
  "params": {"user_id": "...", ...},
  "justification": "<brief explanation>",
  "expected_columns": ["col1", "col2", ...]
}

SIGN CONVENTIONS:
- In transactions table: negative amounts = expenses, positive = income
- In accounts table: positive balance = money you have
- For spending queries: use ABS(amount) where amount < 0

IMPORTANT TEMPLATES:

For "How much money do I have?" or balance questions:
SELECT SUM(balance) AS total_balance
FROM accounts
WHERE user_id = %(user_id)s AND is_active = true

For spending in a time period:
SELECT SUM(ABS(amount)) AS total_spent
FROM transactions
WHERE user_id = %(user_id)s
  AND amount < 0
  AND pending = false
  AND COALESCE(posted_datetime, date::timestamptz) >= %(start_date)s
  AND COALESCE(posted_datetime, date::timestamptz) < %(end_date)s

For category breakdown:
SELECT category, SUM(ABS(amount)) as spent
FROM transactions
WHERE user_id = %(user_id)s
  AND amount < 0
  AND pending = false
  AND COALESCE(posted_datetime, date::timestamptz) >= %(start_date)s
GROUP BY category
ORDER BY spent DESC"""

    async def generate_query(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Generate SQL query with intent routing"""
        try:
            # Validate input
            is_valid, validated_request, error = validate_json(request, SQLRequestSchema)
            if not is_valid:
                return {'error': f'Invalid request: {error}'}

            # Get intent and contract
            question = validated_request.question
            intent, contract = intent_contract(question)

            logger.info(f"Intent classified as: {intent}")
            logger.info(f"Allowed tables: {contract.get('tables', [])}")

            # Handle TRANSACTION_SEARCH with SearchQueryBuilder
            if intent == Intent.TRANSACTION_SEARCH:
                user_id = validated_request.context.get("user_id")
                sql, params = self.search_builder.parse_search_query(question, user_id)
                return {
                    "intent": Intent.TRANSACTION_SEARCH.value,
                    "sql": sql,
                    "params": params,
                    "justification": "Using Smart Search for natural language transaction query",
                    "tables_used": ["transactions"]
                }

            # Check if we have a template SQL we can use directly
            if contract.get("template_sql") and intent != "unknown":
                # Use the template with minor adjustments
                sql = contract["template_sql"].strip()

                # Extract time range if available
                time_range = contract.get("time_range", {})
                params = {
                    "user_id": validated_request.context.get("user_id"),
                    "limit": validated_request.constraints.get("max_rows", 1000)
                }

                # Add time parameters if needed
                if "start_date" in time_range:
                    # Handle SQL expressions vs literal dates
                    if time_range["start_date"].startswith("DATE_TRUNC") or time_range["start_date"].startswith("CURRENT_DATE"):
                        # Replace in SQL directly
                        sql = sql.replace("%(start_date)s", time_range["start_date"])
                    else:
                        params["start_date"] = time_range["start_date"]

                if "end_date" in time_range:
                    if time_range["end_date"].startswith("DATE_TRUNC") or time_range["end_date"].startswith("CURRENT_DATE"):
                        sql = sql.replace("%(end_date)s", time_range["end_date"])
                    else:
                        params["end_date"] = time_range["end_date"]

                return {
                    "intent": intent.value,
                    "sql": sql,
                    "params": params,
                    "justification": f"Using optimized template for {intent.value}",
                    "tables_used": contract.get("tables", [])
                }

            # Fallback to LLM generation with strict constraints
            user_message = self._build_constrained_message(
                validated_request, intent, contract
            )

            response = await self.client.chat.completions.create(
                model=config.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": user_message}
                ],
                temperature=0.1,  # Lower temperature for consistency
                max_tokens=1000
            )

            content = response.choices[0].message.content
            result = self._parse_response(content)

            # Validate tables used
            if result and "sql" in result:
                is_valid, error_msg = validate_sql_tables(
                    result["sql"],
                    contract.get("tables", [])
                )
                if not is_valid:
                    logger.error(f"SQL validation failed: {error_msg}")
                    # Try to use template as fallback
                    if contract.get("template_sql"):
                        return self._use_template_fallback(validated_request, intent, contract)
                    return {'error': error_msg}

                # Enhance SQL with safety checks
                enhanced_sql = enhance_sql_with_intent(result["sql"], intent)
                if enhanced_sql:
                    result["sql"] = enhanced_sql
                else:
                    return {'error': 'SQL missing required user_id filter'}

            # Validate output schema
            is_valid, validated_output, error = validate_json(result, SQLResponseSchema)
            if not is_valid:
                return {'error': f'Invalid agent output: {error}'}

            validated_output["intent"] = intent.value
            validated_output["tables_used"] = contract.get("tables", [])
            return validated_output.dict()

        except Exception as e:
            logger.error(f"Enhanced SQL Agent error: {e}")
            return {'error': str(e)}

    def _build_constrained_message(self, request: SQLRequestSchema, intent, contract: Dict) -> str:
        """Build user message with intent constraints"""

        tables_str = ", ".join(contract.get("tables", []))
        columns_str = ", ".join(contract.get("columns", []))

        time_range = contract.get("time_range", {})
        time_context = ""
        if time_range:
            time_context = f"""
Time Range Context:
- Start: {time_range.get('start_date', 'Not specified')}
- End: {time_range.get('end_date', 'Not specified')}
"""

        return f"""Question: {request.question}

Intent Classified: {intent.value}
Allowed Tables: {tables_str}
Available Columns: {columns_str}
Special Notes: {contract.get('notes', '')}
{time_context}

User Context:
- user_id: {request.context.get('user_id')}

Constraints:
- Max rows: {request.constraints.get('max_rows', 1000)}
- Exclude pending: {request.constraints.get('exclude_pending', True)}

CRITICAL REMINDERS:
1. ONLY use tables from "Allowed Tables" list
2. For {intent.value}, {contract.get('notes', '')}
3. Include WHERE user_id = %(user_id)s
4. Use COALESCE(posted_datetime, date::timestamptz) for transaction dates
5. For spending: amount < 0 and use ABS(amount)

Generate SQL that directly answers this question."""

    def _use_template_fallback(self, request, intent, contract):
        """Use template SQL as fallback"""
        if not contract.get("template_sql"):
            return {'error': 'No template available for this intent'}

        sql = contract["template_sql"].strip()
        params = {
            "user_id": request.context.get("user_id"),
            "limit": request.constraints.get("max_rows", 1000)
        }

        return {
            "intent": intent.value,
            "sql": sql,
            "params": params,
            "justification": f"Using fallback template for {intent.value}",
            "tables_used": contract.get("tables", [])
        }

    def _parse_response(self, content: str) -> Dict[str, Any]:
        """Parse LLM response to extract JSON"""
        try:
            # Try to extract JSON from code blocks
            if '```json' in content:
                start = content.find('```json') + 7
                end = content.find('```', start)
                json_content = content[start:end].strip()
            elif '```' in content:
                start = content.find('```') + 3
                end = content.find('```', start)
                json_content = content[start:end].strip()
            else:
                json_content = content.strip()

            return json.loads(json_content)
        except Exception as e:
            logger.error(f"Failed to parse SQL agent response: {e}")
            # Try to extract SQL directly
            sql_match = re.search(r'SELECT.*?(?:;|$)', content, re.DOTALL | re.IGNORECASE)
            if sql_match:
                return {
                    'sql': sql_match.group(0),
                    'params': {'user_id': 'to_be_filled'},
                    'justification': 'Extracted from response'
                }
            return None