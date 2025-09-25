# agents/merchant_resolver.py
"""
Merchant resolver that canonicalizes noisy merchant strings to user's actual merchant names
Uses pg_trgm for fuzzy matching with fallback to ILIKE patterns
"""

import logging
from typing import List, Tuple, Optional
from functools import lru_cache
import psycopg2
from psycopg2.extras import RealDictCursor

logger = logging.getLogger("agents.merchant_resolver")

def resolve_merchants(conn, user_id: str, candidates: List[str], k: int = 3) -> List[str]:
    """
    Return up to k canonical merchant strings drawn from the user's own transactions.
    Each candidate is normalized (lowercased, stripped).

    Args:
        conn: Database connection
        user_id: User ID to search within
        candidates: List of merchant name candidates to resolve
        k: Maximum number of results to return

    Returns:
        List of canonical merchant names from user's data
    """
    normalized = [c.lower().strip() for c in candidates if c and c.strip()]
    if not normalized:
        return []

    # Try pg_trgm first for best quality fuzzy matching
    try:
        with conn.cursor() as cur:
            # Ensure extension exists
            cur.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm;")

            # Build similarity query
            similarity_conditions = []
            similarity_orders = []
            params = {"uid": user_id, "k": k}

            for i, candidate in enumerate(normalized):
                param_name = f"c{i}"
                params[param_name] = candidate
                # Use % operator for similarity threshold (default 0.3)
                similarity_conditions.append(f"merchant % %({param_name})s")
                similarity_orders.append(f"similarity(merchant, %({param_name})s) DESC")

            sql = f"""
                WITH m AS (
                    SELECT DISTINCT LOWER(COALESCE(merchant_name, name)) AS merchant
                    FROM transactions
                    WHERE user_id = %(uid)s
                      AND COALESCE(merchant_name, name) IS NOT NULL
                )
                SELECT merchant
                FROM m
                WHERE {" OR ".join(similarity_conditions)}
                ORDER BY {", ".join(similarity_orders)}
                LIMIT %(k)s
            """

            cur.execute(sql, params)
            rows = [r[0] for r in cur.fetchall()]

            if rows:
                logger.info(f"Resolved merchants via pg_trgm: {candidates} -> {rows}")
                return rows

    except Exception as e:
        logger.info(f"pg_trgm not available or failed, falling back to ILIKE: {e}")

    # ILIKE ANY fallback for broader matching
    try:
        patterns = []
        for c in normalized:
            # Clean up apostrophes and special chars
            base = c.replace("'", "").replace("'", "").replace('"', "")

            # Generate pattern variants
            variants = [
                f"%{base}%",  # Contains
                f"%{base.replace(' ', '')}%",  # No spaces
                f"{base}%",  # Starts with
            ]

            # Special handling for common variations
            if "joe" in base.lower():
                joe_variant = base.replace(' joe', " joe's")
                joes_variant = base.replace(' joes', " joe's")
                variants.append(f"%{joe_variant}%")
                variants.append(f"%{joes_variant}%")
            if "mcdonalds" in base.lower():
                variants.append("%mcdonald's%")
                variants.append("%mcdonald%")

            patterns.extend(variants)

        with conn.cursor() as cur:
            sql = """
                SELECT
                    LOWER(COALESCE(merchant_name, name)) AS merchant,
                    COUNT(*) AS hits
                FROM transactions
                WHERE user_id = %(uid)s
                  AND LOWER(COALESCE(merchant_name, name)) ILIKE ANY(%(pats)s)
                  AND COALESCE(merchant_name, name) IS NOT NULL
                GROUP BY 1
                ORDER BY hits DESC
                LIMIT %(k)s
            """
            cur.execute(sql, {"uid": user_id, "pats": list(set(patterns)), "k": k})
            rows = [r[0] for r in cur.fetchall()]

            if rows:
                logger.info(f"Resolved merchants via ILIKE: {candidates} -> {rows}")
                return rows
            else:
                logger.warning(f"No merchants found for candidates: {candidates}")

    except Exception as e:
        logger.error(f"ILIKE fallback failed: {e}")

        # Log more details about the error for debugging
        if hasattr(e, 'args') and e.args:
            logger.error(f"ILIKE fallback error details: {e.args}")

        # Check if connection is still valid
        try:
            with conn.cursor() as test_cur:
                test_cur.execute("SELECT 1")
                logger.info("Database connection is valid during merchant resolution")
        except Exception as conn_error:
            logger.error(f"Database connection issue during merchant resolution: {conn_error}")

    # If all else fails, return normalized candidates (they may still work)
    logger.warning(f"Merchant resolution failed, returning normalized candidates: {normalized[:k]}")
    return normalized[:k]


@lru_cache(maxsize=100)
def get_user_merchants(conn, user_id: str, limit: int = 100) -> List[str]:
    """
    Cache distinct merchants for a user to enable fast in-memory fuzzy matching.

    Args:
        conn: Database connection
        user_id: User ID
        limit: Maximum number of distinct merchants to cache

    Returns:
        List of distinct merchant names for the user
    """
    try:
        with conn.cursor() as cur:
            sql = """
                SELECT DISTINCT LOWER(COALESCE(merchant_name, name)) AS merchant
                FROM transactions
                WHERE user_id = %(uid)s
                  AND COALESCE(merchant_name, name) IS NOT NULL
                ORDER BY merchant
                LIMIT %(limit)s
            """
            cur.execute(sql, {"uid": user_id, "limit": limit})
            return [r[0] for r in cur.fetchall()]
    except Exception as e:
        logger.error(f"Failed to get user merchants: {e}")
        return []


def resolve_with_context(conn, user_id: str, question: str,
                         candidates: List[str], k: int = 3) -> List[str]:
    """
    Enhanced resolution that considers the full question context.

    Args:
        conn: Database connection
        user_id: User ID
        question: Original user question for context
        candidates: Extracted merchant candidates
        k: Maximum results

    Returns:
        List of resolved merchant names
    """
    # First try standard resolution
    resolved = resolve_merchants(conn, user_id, candidates, k)

    # If no results and we have context clues, try extracting from question
    if not resolved and question:
        import re
        # Look for patterns like "at X" or "from X"
        at_pattern = r'\b(?:at|from|to|with)\s+([A-Z][a-z]+(?:\s+[A-Z]?[a-z]+)*)'
        matches = re.findall(at_pattern, question, re.IGNORECASE)
        if matches:
            additional_candidates = [m for m in matches if m.lower() not in ['the', 'a', 'an']]
            if additional_candidates:
                resolved = resolve_merchants(conn, user_id, additional_candidates, k)

    return resolved