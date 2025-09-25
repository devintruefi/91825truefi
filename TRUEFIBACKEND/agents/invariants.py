# agents/invariants.py
"""
Invariants checker to ensure SQL queries meet security and correctness requirements
"""

import re
from typing import TYPE_CHECKING, Dict, List, Any

if TYPE_CHECKING:
    from agents.planner import PlannerPlan

class InvariantError(Exception):
    """Raised when SQL violates required invariants"""
    pass

def assert_invariants_or_raise(sql: str, params: Dict, plan: Any):
    """
    Check SQL against required invariants from the plan.

    Args:
        sql: SQL query string
        params: Query parameters
        plan: Planner plan containing invariants to check

    Raises:
        InvariantError: If any invariant is violated
    """
    s = sql.lower()
    inv = set(plan.invariants or [])
    errors = []

    # Check for pending exclusion
    if "exclude-pending" in inv and "pending = false" not in s:
        errors.append("Missing 'pending = false' filter (required for accurate spending)")

    # Check for spend amount filter - handle both old and new flexible patterns
    if "spend-amount-lt-0" in inv:
        has_amount_filter = any([
            "amount < 0" in s,  # Old strict pattern
            "(amount < 0 or (amount > 0 and category not in" in s,  # New flexible pattern
            "abs(amount)" in s  # Amount filtering using absolute values
        ])
        if not has_amount_filter:
            errors.append("Missing spending amount filter (required for spending queries)")

    # Check for merchant filter when merchants are in plan
    if plan.entities.merchants and "must-filter-merchant" in inv:
        # Check for merchant filter patterns
        has_merchant_filter = any([
            "merchant_name" in s and "like" in s,
            "name" in s and "like" in s,
            any(f"%(merchant_{i})s" in s for i in range(10))  # Check for parameterized merchants
        ])

        if not has_merchant_filter:
            merchant_list = ", ".join(plan.entities.merchants[:3])
            if len(plan.entities.merchants) > 3:
                merchant_list += f", and {len(plan.entities.merchants) - 3} more"
            errors.append(f"Missing merchant filter for: {merchant_list}")

    # Check for date coalesce (required for consistent date handling)
    if "coalesce(posted_datetime, date::timestamptz)" not in s and "coalesce" in s:
        errors.append("Using non-standard date coalesce pattern (should be 'COALESCE(posted_datetime, date::timestamptz)')")

    # Check for user_id filter (CRITICAL for security)
    if "user_id" not in s:
        errors.append("CRITICAL: Missing user_id filter (security violation)")

    # Check for SQL injection patterns
    dangerous_patterns = [
        r';\s*drop\s+',
        r';\s*delete\s+',
        r';\s*update\s+',
        r';\s*insert\s+',
        r'--\s*$',
        r'/\*.*\*/'
    ]

    for pattern in dangerous_patterns:
        if re.search(pattern, s, re.IGNORECASE):
            errors.append(f"Potential SQL injection pattern detected")
            break

    # If any errors, raise with detailed message
    if errors:
        error_message = "SQL invariant violations:\n" + "\n".join(f"  - {e}" for e in errors)
        raise InvariantError(error_message)


def validate_sql_safety(sql: str, allowed_tables: List[str]) -> bool:
    """
    Validate that SQL only accesses allowed tables.

    Args:
        sql: SQL query string
        allowed_tables: List of allowed table names

    Returns:
        True if SQL is safe, False otherwise
    """
    s = sql.lower()

    # Extract table references (basic pattern matching)
    table_pattern = r'\bfrom\s+(\w+)|join\s+(\w+)'
    matches = re.findall(table_pattern, s)
    referenced_tables = set()

    for match in matches:
        for table in match:
            if table:
                referenced_tables.add(table)

    # Check if all referenced tables are allowed
    for table in referenced_tables:
        if table not in allowed_tables:
            return False

    return True


def suggest_fixes(sql: str, params: Dict, plan: Any) -> str:
    """
    Suggest fixes for common invariant violations.

    Args:
        sql: SQL query string
        params: Query parameters
        plan: Planner plan

    Returns:
        String with suggested fixes
    """
    suggestions = []
    s = sql.lower()

    if "pending = false" not in s:
        suggestions.append("Add: AND pending = false")

    if plan.intent in ["transaction_search", "spend_by_time"]:
        has_amount_filter = any([
            "amount < 0" in s,
            "(amount < 0 or (amount > 0 and category not in" in s,
            "abs(amount)" in s
        ])
        if not has_amount_filter:
            suggestions.append("Add spending filter: AND (amount < 0 OR (amount > 0 AND category NOT IN ('Transfer', 'Deposit', 'Payroll')))")

    if plan.entities.merchants and "merchant_name" not in s:
        suggestions.append("Add merchant filter: AND (LOWER(merchant_name) LIKE %(merchant_0)s OR LOWER(name) LIKE %(merchant_0)s)")

    if "user_id" not in s:
        suggestions.append("CRITICAL: Add: AND user_id = %(user_id)s")

    return "\n".join(suggestions) if suggestions else "No specific suggestions"