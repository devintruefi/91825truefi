# TRUEFIBACKEND/agents/router.py
# Intent classification and routing for SQL queries
import re
from typing import Tuple, Dict, Any
from .intents import Intent, INTENT_TO_ALLOWED

def classify_intent(question: str) -> Intent:
    """
    Classify user question into a specific intent for table routing.
    This is deterministic pattern matching to avoid LLM confusion.
    """
    q = question.lower()

    # Greetings and casual conversation - HIGHEST PRIORITY
    if re.search(r'^\s*(hi|hello|hey|good\s+(morning|afternoon|evening)|howdy|greetings?)\s*([!.]|\s+\w+)?\s*$', q):
        return Intent.GREETING

    # Casual conversation patterns
    if re.search(r'^\s*(how\s+are\s+you|what\'?s\s+up|whatsup|sup|how\'?s\s+it\s+going|how\s+you\s+doing)\s*[?!.]?\s*$', q):
        return Intent.CASUAL_CONVERSATION

    # Additional spending pattern
    if re.search(r'\b(show.*spend|spending|spent.*me)\b', q):
        return Intent.SPEND_BY_TIME

    # Net worth queries
    if re.search(r'\b(net\s*worth|what\s+am\s+i\s+worth|overall\s+wealth|total\s+value|assets.*liabilities)\b', q):
        return Intent.NET_WORTH

    # Account balance queries - HIGHEST PRIORITY
    if re.search(r'\b(balance|how much.*(?:money|cash|have|in.*account)|total.*account|account.*total|cash\s+on\s+hand|available\s+cash)\b', q):
        return Intent.ACCOUNT_BALANCES

    # All accounts breakdown
    if re.search(r'\b(all\s+accounts|list.*accounts|show.*accounts|accounts\s+breakdown)\b', q):
        return Intent.BALANCES_BY_ACCOUNT

    # Top merchants
    if re.search(r'\b(top\s+merchant|most\s+spent|where.*spend.*most|frequent.*merchant)\b', q):
        return Intent.TOP_MERCHANTS

    # Month over month comparison
    if re.search(r'\b(month\s+over\s+month|mom|compared?.*last\s+month|vs\s+last\s+month|spending.*change)\b', q):
        return Intent.SPENDING_MOM_DELTA

    # Spending by category
    if re.search(r'\b(category|categories|breakdown|by type|where.*spend)\b', q):
        return Intent.SPEND_BY_CATEGORY

    # Time-based spending (last month, this year, etc)
    if re.search(r'\b(spending|spent|expenses?).*(?:last|this|previous).*(?:month|year|week|quarter)\b', q):
        return Intent.SPEND_BY_TIME

    # Recent transactions
    if re.search(r'\b(recent|latest|last.*transaction|transaction.*history|charges?|purchases?)\b', q):
        return Intent.RECENT_TRANSACTIONS

    # Cash flow analysis
    if re.search(r'\b(cash\s*flow|income.*expense|burn\s*rate|net\s+income|inflow.*outflow|money\s+in.*out)\b', q):
        return Intent.CASHFLOW_SUMMARY

    # Savings rate
    if re.search(r'\b(savings?\s*rate|how much.*saving|save.*percentage)\b', q):
        return Intent.SAVINGS_RATE

    # Investment positions (current holdings)
    if re.search(r'\b(investment|portfolio|holdings?|positions?|stocks?|securities|ticker)\b', q) and not re.search(r'\b(should|advice|recommend|what.*invest|types?.*invest|best.*invest)\b', q):
        return Intent.INVESTMENT_POSITIONS

    # Investment advice/analysis
    if re.search(r'\b(what.*invest|should.*invest|investment.*advice|investment.*recommend|types?.*invest|best.*invest|companies.*invest|sectors.*invest|what.*companies.*invest|types.*companies.*invest|etfs?.*fit)', q):
        return Intent.INVESTMENT_ANALYSIS

    # Goals tracking
    if re.search(r'\b(goals?|target|progress|achieving)\b', q):
        return Intent.GOALS_STATUS

    # Budget analysis
    if re.search(r'\b(budget|over\s*budget|under\s*budget|allocation)\b', q):
        return Intent.BUDGET_UTILIZATION

    # Recurring transactions
    if re.search(r'\b(recurring|subscription|regular|repeated)\b', q):
        return Intent.RECURRING_TRANSACTIONS

    # Transaction search - natural language search queries
    # Look for: specific merchants, "all X purchases", "transactions at Y", search phrases
    if re.search(r'\b(all.*(?:purchases?|transactions?|charges?)|transactions?\s+at|find.*transactions?|search|show.*(?:coffee|uber|amazon|grocery|gas))\b', q):
        return Intent.TRANSACTION_SEARCH

    # Also trigger search for questions with amount filters
    if re.search(r'\b(?:over|under|above|below|between|around)\s*\$?\d+', q):
        return Intent.TRANSACTION_SEARCH

    # Default spending query if contains spending keywords but no specific time
    if re.search(r'\b(spend|spent|expense|cost|pay|paid)\b', q):
        return Intent.SPEND_BY_TIME

    return Intent.UNKNOWN


def get_time_range(question: str) -> Dict[str, str]:
    """Extract time range from question for SQL parameters."""
    q = question.lower()

    # Last month
    if 'last month' in q:
        return {
            "start_date": "DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')",
            "end_date": "DATE_TRUNC('month', CURRENT_DATE)"
        }

    # This month
    if 'this month' in q or 'current month' in q:
        return {
            "start_date": "DATE_TRUNC('month', CURRENT_DATE)",
            "end_date": "CURRENT_DATE"
        }

    # Last year
    if 'last year' in q:
        return {
            "start_date": "DATE_TRUNC('year', CURRENT_DATE - INTERVAL '1 year')",
            "end_date": "DATE_TRUNC('year', CURRENT_DATE)"
        }

    # This year / YTD
    if 'this year' in q or 'ytd' in q.lower() or 'year to date' in q:
        return {
            "start_date": "DATE_TRUNC('year', CURRENT_DATE)",
            "end_date": "CURRENT_DATE"
        }

    # Last N days
    days_match = re.search(r'last\s+(\d+)\s+days?', q)
    if days_match:
        days = days_match.group(1)
        return {
            "start_date": f"CURRENT_DATE - INTERVAL '{days} days'",
            "end_date": "CURRENT_DATE"
        }

    # Last N months
    months_match = re.search(r'last\s+(\d+)\s+months?', q)
    if months_match:
        months = months_match.group(1)
        return {
            "start_date": f"CURRENT_DATE - INTERVAL '{months} months'",
            "end_date": "CURRENT_DATE"
        }

    # Last quarter / Q1-Q4
    if re.search(r'last\s+quarter|q[1-4]|quarter', q):
        return {
            "start_date": "DATE_TRUNC('quarter', CURRENT_DATE - INTERVAL '3 months')",
            "end_date": "DATE_TRUNC('quarter', CURRENT_DATE)"
        }

    # Last 90 days
    if re.search(r'last\s+90\s+days|ninety\s+days|3\s+months', q):
        return {
            "start_date": "CURRENT_DATE - INTERVAL '90 days'",
            "end_date": "CURRENT_DATE"
        }

    # Default to last 30 days
    return {
        "start_date": "CURRENT_DATE - INTERVAL '30 days'",
        "end_date": "CURRENT_DATE"
    }


def intent_contract(question: str) -> Tuple[Intent, Dict[str, Any]]:
    """
    Determine intent and return contract with allowed tables, columns, and template SQL.
    This ensures the SQL Agent can only use appropriate tables.
    """
    intent = classify_intent(question)
    contract = INTENT_TO_ALLOWED.get(intent, {
        "tables": [],
        "columns": [],
        "notes": "Unknown intent - please rephrase your question",
        "template_sql": None
    })

    # Add time range to contract if relevant
    if intent in [Intent.RECENT_TRANSACTIONS, Intent.SPEND_BY_CATEGORY,
                  Intent.SPEND_BY_TIME, Intent.CASHFLOW_SUMMARY]:
        time_range = get_time_range(question)
        contract["time_range"] = time_range

    return intent, contract


def validate_sql_tables(sql: str, allowed_tables: list) -> Tuple[bool, str]:
    """
    Validate that SQL only uses allowed tables.
    Returns (is_valid, error_message).
    """
    sql_lower = sql.lower()

    # Extract all table references (simple pattern matching)
    # Look for FROM and JOIN clauses
    table_pattern = r'(?:from|join)\s+([a-z_]+)'
    found_tables = re.findall(table_pattern, sql_lower)

    # Check each found table
    disallowed = []
    for table in found_tables:
        # Remove any alias or schema prefix
        table_name = table.split('.')[-1].strip()
        if table_name and table_name not in allowed_tables:
            disallowed.append(table_name)

    if disallowed:
        return False, f"Query uses disallowed tables: {', '.join(disallowed)}"

    return True, ""


def enhance_sql_with_intent(sql: str, intent: Intent) -> str:
    """
    Enhance SQL with intent-specific optimizations and safety checks.
    """
    # Always ensure user_id filter for security
    if 'user_id' not in sql:
        return None  # Reject queries without user_id filter

    # For transaction queries, ensure COALESCE is used
    if intent in [Intent.RECENT_TRANSACTIONS, Intent.SPEND_BY_CATEGORY,
                  Intent.SPEND_BY_TIME, Intent.CASHFLOW_SUMMARY]:
        # Replace any direct posted_datetime references with COALESCE
        sql = re.sub(
            r'\bposted_datetime\b(?!\s*,)',
            'COALESCE(posted_datetime, date::timestamptz)',
            sql
        )

    # Add LIMIT if not present (safety)
    if 'limit' not in sql.lower() and intent != Intent.ACCOUNT_BALANCES:
        sql = sql.rstrip(';') + ' LIMIT 1000;'

    return sql