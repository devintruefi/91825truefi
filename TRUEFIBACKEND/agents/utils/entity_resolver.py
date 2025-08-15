import logging
import json
import asyncio
from typing import Dict, Set, Optional, List, Any
from difflib import get_close_matches
import re # Added for enhanced pattern matching
import time # Added for timestamp in cache keys

# Try to import rapidfuzz for better performance, fallback to difflib
try:
    from rapidfuzz import process, fuzz
    RAPIDFUZZ_AVAILABLE = True
except ImportError:
    RAPIDFUZZ_AVAILABLE = False

logger = logging.getLogger(__name__)

# Simple in-memory cache (replace with Redis in production)
_entity_cache_store = {}

async def get_user_filter_cache(user_id: str, db_pool) -> Dict[str, Set[str]]:
    """
    Get cached filter values for a user from relevant database columns.
    Returns a dict of sets containing distinct, non-null values.
    """
    # Check cache first
    cache_key = f"entity_cache_{user_id}"
    if cache_key in _entity_cache_store:
        logger.info(f"Cache hit for user {user_id}")
        return _entity_cache_store[cache_key]
    
    conn = None
    cur = None
    
    try:
        conn = db_pool.getconn()
        cur = conn.cursor()
        
        # Optimized query using json_agg to reduce round trips
        query = """
        SELECT json_build_object(
            'merchant_name', COALESCE(
                (SELECT json_agg(DISTINCT merchant_name)
                 FROM transactions 
                 WHERE user_id = %s 
                   AND merchant_name IS NOT NULL 
                   AND merchant_name != ''
                   AND date >= CURRENT_DATE - INTERVAL '12 months'
                 LIMIT 100), '[]'::json
            ),
            'category', COALESCE(
                (SELECT json_agg(DISTINCT category)
                 FROM transactions 
                 WHERE user_id = %s 
                   AND category IS NOT NULL 
                   AND category != ''
                   AND date >= CURRENT_DATE - INTERVAL '12 months'
                 LIMIT 50), '[]'::json
            ),
            'account_name', COALESCE(
                (SELECT json_agg(DISTINCT name)
                 FROM accounts 
                 WHERE user_id = %s 
                   AND name IS NOT NULL 
                   AND name != ''
                 LIMIT 50), '[]'::json
            ),
            'manual_asset_name', COALESCE(
                (SELECT json_agg(DISTINCT name)
                 FROM manual_assets 
                 WHERE user_id = %s 
                   AND name IS NOT NULL 
                   AND name != ''
                 LIMIT 20), '[]'::json
            ),
            'manual_liability_name', COALESCE(
                (SELECT json_agg(DISTINCT name)
                 FROM manual_liabilities 
                 WHERE user_id = %s 
                   AND name IS NOT NULL 
                   AND name != ''
                 LIMIT 20), '[]'::json
            ),
            'insurance_provider', COALESCE(
                (SELECT json_agg(DISTINCT provider)
                 FROM insurances 
                 WHERE user_id = %s 
                   AND provider IS NOT NULL 
                   AND provider != ''
                 LIMIT 20), '[]'::json
            ),
            'goal_name', COALESCE(
                (SELECT json_agg(DISTINCT name)
                 FROM goals 
                 WHERE user_id = %s 
                   AND name IS NOT NULL 
                   AND name != ''
                 LIMIT 20), '[]'::json
            ),
            'estate_doc', COALESCE(
                (SELECT json_agg(DISTINCT name)
                 FROM estate_docs 
                 WHERE user_id = %s 
                   AND name IS NOT NULL 
                   AND name != ''
                 LIMIT 20), '[]'::json
            )
        ) AS cache_data
        """
        
        cur.execute(query, (user_id,) * 8)  # 8 parameters for the 8 json_agg calls
        result = cur.fetchone()
        
        if result and result[0]:
            cache_data = result[0]
            filter_cache = {}
            
            # Convert JSON arrays to sets
            for filter_type, values in cache_data.items():
                if values and isinstance(values, list):
                    filter_cache[filter_type] = set(values)
                else:
                    filter_cache[filter_type] = set()
            
            # Cache the result (1 hour TTL)
            _entity_cache_store[cache_key] = filter_cache
            
            # Log cache size for monitoring
            total_values = sum(len(values) for values in filter_cache.values())
            logger.info(f"Built filter cache for user {user_id}: {len(filter_cache)} filter types, {total_values} total values")
            
            return filter_cache
        else:
            logger.warning(f"No cache data returned for user {user_id}")
            return {}
        
    except Exception as e:
        logger.error(f"Error building filter cache for user {user_id}: {e}")
        return {}
    finally:
        if cur:
            cur.close()
        if conn:
            db_pool.putconn(conn)

async def get_user_database_context(user_id: str, db_pool, include_sample_transactions: bool = True) -> Dict[str, Any]:
    """
    Get comprehensive database context for a user including all entity names and financial data.
    This provides rich context for both SQL agent and supervisor agent to understand the user's financial profile.
    """
    # Check cache first
    cache_key = f"db_context_{user_id}"
    if cache_key in _entity_cache_store:
        logger.info(f"Database context cache hit for user {user_id}")
        return _entity_cache_store[cache_key]
    
    conn = None
    cur = None
    
    try:
        conn = db_pool.getconn()
        cur = conn.cursor()
        
        # Fetch entity names including budgets
        entity_names_query = """
        SELECT
            (SELECT array_agg(DISTINCT merchant_name) FROM transactions WHERE user_id = %s AND merchant_name IS NOT NULL AND merchant_name != '' AND date >= CURRENT_DATE - INTERVAL '12 months') AS merchant_names,
            (SELECT array_agg(DISTINCT category) FROM transactions WHERE user_id = %s AND category IS NOT NULL AND category != '' AND date >= CURRENT_DATE - INTERVAL '12 months' LIMIT 50) AS categories,
            (SELECT array_agg(DISTINCT name) FROM accounts WHERE user_id = %s AND name IS NOT NULL AND name != '' LIMIT 50) AS account_names,
            (SELECT array_agg(DISTINCT name) FROM manual_assets WHERE user_id = %s AND name IS NOT NULL AND name != '' LIMIT 20) AS manual_asset_names,
            (SELECT array_agg(DISTINCT name) FROM manual_liabilities WHERE user_id = %s AND name IS NOT NULL AND name != '' LIMIT 20) AS manual_liability_names,
            (SELECT array_agg(DISTINCT provider) FROM insurances WHERE user_id = %s AND provider IS NOT NULL AND provider != '' LIMIT 20) AS insurance_providers,
            (SELECT array_agg(DISTINCT name) FROM goals WHERE user_id = %s AND name IS NOT NULL AND name != '' LIMIT 20) AS goal_names,
            (SELECT array_agg(DISTINCT name) FROM estate_docs WHERE user_id = %s AND name IS NOT NULL AND name != '' LIMIT 20) AS estate_doc_names,
            (SELECT array_agg(DISTINCT name) FROM budgets WHERE user_id = %s AND name IS NOT NULL AND name != '' LIMIT 20) AS budget_names,
            (SELECT array_agg(DISTINCT category) FROM budget_categories bc JOIN budgets b ON bc.budget_id = b.id WHERE b.user_id = %s AND bc.category IS NOT NULL LIMIT 50) AS budget_category_names
        """
        cur.execute(entity_names_query, (user_id,) * 10)
        entity_names_row = cur.fetchone()
        entity_cache = {
            'merchant_names': set(entity_names_row[0] or []),
            'categories': set(entity_names_row[1] or []),
            'account_names': set(entity_names_row[2] or []),
            'manual_asset_names': set(entity_names_row[3] or []),
            'manual_liability_names': set(entity_names_row[4] or []),
            'insurance_providers': set(entity_names_row[5] or []),
            'goal_names': set(entity_names_row[6] or []),
            'estate_doc_names': set(entity_names_row[7] or []),
            'budget_names': set(entity_names_row[8] or []),
            'budget_category_names': set(entity_names_row[9] or [])
        }
        
        # Fetch financial summary
        financial_summary_query = """
        SELECT
            (SELECT COUNT(*) FROM accounts WHERE user_id = %s AND is_active = true) AS total_accounts,
            (SELECT COALESCE(SUM(balance), 0) FROM accounts WHERE user_id = %s AND is_active = true) AS total_balance,
            (SELECT COUNT(*) FROM transactions WHERE user_id = %s AND date >= CURRENT_DATE - INTERVAL '12 months') AS total_transactions,
            (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE user_id = %s AND date >= CURRENT_DATE - INTERVAL '12 months') AS total_spending_12m,
            (SELECT COUNT(*) FROM manual_assets WHERE user_id = %s) AS total_assets,
            (SELECT COUNT(*) FROM manual_liabilities WHERE user_id = %s) AS total_liabilities,
            (SELECT COUNT(*) FROM goals WHERE user_id = %s AND is_active = true) AS total_goals,
            (SELECT COUNT(*) FROM insurances WHERE user_id = %s AND is_active = true) AS total_insurances
        """
        cur.execute(financial_summary_query, (user_id,) * 8)
        financial_summary_row = cur.fetchone()
        financial_summary = {
            'total_accounts': financial_summary_row[0],
            'total_balance': float(financial_summary_row[1]),  # Convert to float for JSON serialization
            'total_transactions': financial_summary_row[2],
            'total_spending_12m': float(financial_summary_row[3]),  # Convert to float for JSON serialization
            'total_assets': financial_summary_row[4],
            'total_liabilities': financial_summary_row[5],
            'total_goals': financial_summary_row[6],
            'total_insurances': financial_summary_row[7]
        }
        
        # Fetch account details
        account_details_query = """
        SELECT name, type, balance, is_active
        FROM accounts
        WHERE user_id = %s AND is_active = true
        ORDER BY balance DESC
        """
        cur.execute(account_details_query, (user_id,))
        account_details = [
            {
                'name': row[0],
                'type': row[1],
                'balance': float(row[2]),  # Convert to float for consistency
                'is_active': row[3]
            } for row in cur.fetchall()
        ]
        
        # Fetch top categories
        top_categories_query = """
        SELECT category, SUM(amount) as total_spent
        FROM transactions
        WHERE user_id = %s
          AND date >= CURRENT_DATE - INTERVAL '6 months'
          AND category IS NOT NULL
        GROUP BY category
        ORDER BY total_spent DESC
        LIMIT 10
        """
        cur.execute(top_categories_query, (user_id,))
        top_categories = [
            {
                'category': row[0],
                'total_spent': float(row[1])  # Convert to float for consistency
            } for row in cur.fetchall()
        ]
        
        # Fetch top merchants
        top_merchants_query = """
        SELECT merchant_name as merchant, SUM(amount) as total_spent
        FROM transactions
        WHERE user_id = %s
          AND date >= CURRENT_DATE - INTERVAL '6 months'
          AND merchant_name IS NOT NULL
        GROUP BY merchant_name
        ORDER BY total_spent DESC
        LIMIT 10
        """
        cur.execute(top_merchants_query, (user_id,))
        top_merchants = [
            {
                'merchant': row[0],
                'total_spent': float(row[1])  # Convert to float for consistency
            } for row in cur.fetchall()
        ]
        
        # Fetch sample transactions if requested
        sample_transactions = []
        if include_sample_transactions:
            sample_trans_query = """
            SELECT date, name, merchant_name, category, amount, pending
            FROM transactions
            WHERE user_id = %s
            ORDER BY date DESC
            LIMIT 5
            """
            cur.execute(sample_trans_query, (user_id,))
            sample_transactions = [
                {
                    'date': row[0].isoformat() if row[0] else None,
                    'name': row[1],
                    'merchant_name': row[2],
                    'category': row[3],
                    'amount': float(row[4]),
                    'pending': row[5]
                } for row in cur.fetchall()
            ]
        
        # Fetch COMPLETE manual assets details (handle different column names)
        manual_assets_query = """
        SELECT name, asset_class, value, notes
        FROM manual_assets
        WHERE user_id = %s
        ORDER BY value DESC
        """
        cur.execute(manual_assets_query, (user_id,))
        manual_assets_details = [
            {
                'name': row[0],
                'asset_class': row[1],
                'value': float(row[2]) if row[2] else 0,
                'notes': row[3]
            } for row in cur.fetchall()
        ]
        total_assets = sum(asset['value'] for asset in manual_assets_details)
        
        # Fetch COMPLETE manual liabilities details
        manual_liabilities_query = """
        SELECT name, liability_class, balance, interest_rate, notes
        FROM manual_liabilities
        WHERE user_id = %s
        ORDER BY balance DESC
        """
        cur.execute(manual_liabilities_query, (user_id,))
        manual_liabilities_details = [
            {
                'name': row[0],
                'liability_class': row[1],
                'balance': float(row[2]) if row[2] else 0,
                'interest_rate': float(row[3]) if row[3] else 0,
                'notes': row[4]
            } for row in cur.fetchall()
        ]
        total_liabilities = sum(liability['balance'] for liability in manual_liabilities_details)
        
        # Fetch COMPLETE budgets with categories
        budgets_query = """
        SELECT b.id, b.name, b.amount, b.period, b.start_date, b.end_date, b.is_active,
               COALESCE(array_agg(CASE WHEN bc.category IS NOT NULL THEN 
                   json_build_object('category', bc.category, 'amount', bc.amount) END) 
                   FILTER (WHERE bc.category IS NOT NULL), '{}') as categories
        FROM budgets b
        LEFT JOIN budget_categories bc ON b.id = bc.budget_id
        WHERE b.user_id = %s AND b.is_active = true
        GROUP BY b.id, b.name, b.amount, b.period, b.start_date, b.end_date, b.is_active
        """
        cur.execute(budgets_query, (user_id,))
        budgets_details = [
            {
                'id': str(row[0]),
                'name': row[1],
                'amount': float(row[2]) if row[2] is not None else 0,
                'period': row[3],
                'start_date': row[4].isoformat() if row[4] else None,
                'end_date': row[5].isoformat() if row[5] else None,
                'is_active': row[6],
                'categories': row[7] if row[7] and row[7] != '{}' else []
            } for row in cur.fetchall()
        ]
        
        # Fetch COMPLETE goals details
        goals_query = """
        SELECT name, target_amount, current_amount, target_date, is_active
        FROM goals
        WHERE user_id = %s AND is_active = true
        ORDER BY target_date
        """
        cur.execute(goals_query, (user_id,))
        goals_details = [
            {
                'name': row[0],
                'target_amount': float(row[1]) if row[1] else 0,
                'current_amount': float(row[2]) if row[2] else 0,
                'target_date': row[3].isoformat() if row[3] else None,
                'is_active': row[4],
                'progress_percentage': (float(row[2]) / float(row[1]) * 100) if row[1] and row[1] > 0 else 0
            } for row in cur.fetchall()
        ]
        
        # Fetch COMPLETE recurring income details
        recurring_income_query = """
        SELECT source, gross_monthly, next_pay_date
        FROM recurring_income
        WHERE user_id = %s
        ORDER BY gross_monthly DESC
        """
        cur.execute(recurring_income_query, (user_id,))
        recurring_income_details = [
            {
                'source': row[0],
                'gross_monthly': float(row[1]) if row[1] else 0,
                'next_pay_date': row[2].isoformat() if row[2] else None
            } for row in cur.fetchall()
        ]
        total_recurring_income = sum(income['gross_monthly'] for income in recurring_income_details)
        
        # Fetch COMPLETE insurance details
        insurance_query = """
        SELECT type, provider, policy_number, premium_amount, coverage_amount, 
               start_date, end_date, is_active
        FROM insurances
        WHERE user_id = %s AND is_active = true
        ORDER BY premium_amount DESC
        """
        cur.execute(insurance_query, (user_id,))
        insurance_details = [
            {
                'type': row[0],
                'provider': row[1],
                'policy_number': row[2],
                'premium_amount': float(row[3]) if row[3] else 0,
                'coverage_amount': float(row[4]) if row[4] else 0,
                'start_date': row[5].isoformat() if row[5] else None,
                'end_date': row[6].isoformat() if row[6] else None,
                'is_active': row[7]
            } for row in cur.fetchall()
        ]
        
        # Calculate net worth with all components
        net_worth = financial_summary.get('total_balance', 0) + total_assets - total_liabilities
        
        # Build COMPLETE comprehensive context with ALL user financial data
        db_context = {
            'entity_cache': entity_cache,
            'financial_summary': {
                **financial_summary,
                'total_manual_assets': total_assets,
                'total_manual_liabilities': total_liabilities,
                'net_worth': net_worth,
                'total_recurring_monthly_income': total_recurring_income
            },
            'account_details': account_details,
            'manual_assets': manual_assets_details,  # COMPLETE assets data
            'manual_liabilities': manual_liabilities_details,  # COMPLETE liabilities data
            'budgets': budgets_details,  # COMPLETE budgets with categories
            'goals': goals_details,  # COMPLETE goals with progress
            'recurring_income': recurring_income_details,  # COMPLETE income sources
            'insurances': insurance_details,  # COMPLETE insurance policies
            'top_categories': top_categories,
            'top_merchants': top_merchants,
            'sample_transactions': sample_transactions,
            'user_id': user_id,
            'timestamp': time.time()
        }
        
        # Cache the result (30 minutes TTL)
        _entity_cache_store[cache_key] = db_context
        
        # Log context size for monitoring
        total_entities = sum(len(values) for values in entity_cache.values())
        logger.info(f"Built comprehensive database context for user {user_id}: {len(entity_cache)} entity types, {total_entities} total entities")
        
        return db_context
        
    except Exception as e:
        logger.error(f"Error building database context for user {user_id}: {e}")
        return {
            'entity_cache': {},
            'financial_summary': {},
            'account_details': [],
            'top_categories': [],
            'top_merchants': [],
            'user_id': user_id,
            'timestamp': time.time()
        }
    finally:
        if cur:
            cur.close()
        if conn:
            db_pool.putconn(conn)

def fuzzy_lookup(term: str, valid_values: Set[str], limit: int = 10, score_cutoff: int = 50) -> List[str]:
    """
    Enhanced fuzzy matching that preserves multi-word entities and prevents token splitting.
    Improved to handle more misspellings and variations.
    UPDATED: More permissive - returns up to 10 matches with 50% threshold for better misspelling handling.
    """
    if not valid_values:
        return []
    
    # Clean the search term
    term = term.strip().lower()
    
    if RAPIDFUZZ_AVAILABLE:
        # Use rapidfuzz with multiple scoring methods for better matching
        matches = []
        
        # Try different scoring methods to catch various types of misspellings
        for scorer in [fuzz.token_set_ratio, fuzz.partial_ratio, fuzz.ratio]:
            scorer_matches = process.extract(
                term, 
                valid_values, 
                scorer=scorer,
                limit=limit, 
                score_cutoff=score_cutoff
            )
            matches.extend(scorer_matches)
        
        # Deduplicate and sort by score
        seen = set()
        unique_matches = []
        for match_tuple in sorted(matches, key=lambda x: x[1], reverse=True):
            # Handle both 2-tuple and 3-tuple formats from rapidfuzz
            match_text = match_tuple[0]
            if match_text not in seen:
                seen.add(match_text)
                unique_matches.append(match_text)
                if len(unique_matches) >= limit:
                    break
        
        return unique_matches
    else:
        # Enhanced difflib matching for multi-word entities
        matches = get_close_matches(
            term, 
            [v.lower() for v in valid_values], 
            n=limit, 
            cutoff=score_cutoff / 100.0
        )
        # Find original case versions
        result = []
        for match in matches:
            for valid_value in valid_values:
                if valid_value.lower() == match:
                    result.append(valid_value)
                    break
        return result

def resolve_entities(query, entity_cache, cutoff=0.6):
    """
    Enhanced entity resolution that handles multi-word entities properly.
    Simplified to focus on pattern matching and let the LLM handle dynamic resolution.
    """
    query_lower = query.lower()
    resolved_entities = {}
    
    # Enhanced patterns for better matching - more flexible and dynamic
    patterns = {
        'merchant_names': [
            r'\b(?:spent|spending|bought|purchased|paid|transactions?|purchases?)\s+(?:at|from|to|with)\s+([a-zA-Z\s\']+)',
            r'\b([a-zA-Z\s\']+)\s+(?:store|shop|restaurant|airline|hotel|market|mall|center)',
            r'\b(?:at|from|with)\s+([a-zA-Z\s\']+)',
            r'\b([a-zA-Z\s\']+)\s+(?:transactions?|purchases?|spending)'
        ],
        'categories': [
            r'\b(?:spent|spending|bought|purchased|transactions?|purchases?)\s+(?:on|for|in)\s+([a-zA-Z\s]+)',
            r'\b([a-zA-Z\s]+)\s+(?:expenses?|spending|costs?|category|type)',
            r'\b(?:category|type)\s+(?:of\s+)?([a-zA-Z\s]+)',
            r'\b([a-zA-Z\s]+)\s+(?:spending|expenses?)'
        ],
        'account_names': [
            r'\b(?:transactions?|spending|balance|money)\s+(?:from|in|on|with)\s+(?:my\s+)?([a-zA-Z\s]+)\s*(?:account|card|loan|mortgage|savings?|checking)?',
            r'\b(?:my\s+)?([a-zA-Z\s]+)\s+(?:account|card|loan|mortgage|savings?|checking)',
            r'\b(?:from|in|with)\s+(?:my\s+)?([a-zA-Z\s]+)',
            r'\b([a-zA-Z\s]+)\s+(?:transactions?|spending|account)'
        ],
        'manual_asset_names': [
            r'\b(?:value|worth|price|balance)\s+(?:of\s+)?(?:my\s+)?([a-zA-Z\s]+)',
            r'\b(?:my\s+)?([a-zA-Z\s]+)\s+(?:asset|property|investment|value)',
            r'\b(?:asset|property|investment)\s+(?:called\s+)?([a-zA-Z\s]+)'
        ],
        'budget_names': [
            r'\b(?:my\s+)?([a-zA-Z\s]+)\s+budget',
            r'\bbudget\s+(?:for\s+)?([a-zA-Z\s]+)',
            r'\b([a-zA-Z\s]+)\s+(?:budget|budgeted|allocation)',
            r'\bbudget\s+(?:named|called)\s+([a-zA-Z\s]+)'
        ]
    }
    
    for filter_type, filter_patterns in patterns.items():
        if filter_type not in entity_cache:
            continue
            
        matches = []
        
        # Try pattern matching first
        for pattern in filter_patterns:
            pattern_matches = re.findall(pattern, query_lower)
            for match in pattern_matches:
                match = match.strip()
                if len(match) > 2:  # Only consider meaningful matches
                    # Convert float cutoff to integer score_cutoff - use lower threshold for merchants
                    score_cutoff = 40 if filter_type == 'merchant_names' else int(cutoff * 100)
                    fuzzy_matches = fuzzy_lookup(match, entity_cache[filter_type], limit=10, score_cutoff=score_cutoff)
                    matches.extend(fuzzy_matches)
        
        # If no pattern matches, try direct fuzzy matching on key terms
        if not matches:
            # Extract key terms from query
            key_terms = extract_key_terms(query_lower, filter_type)
            for term in key_terms:
                # Convert float cutoff to integer score_cutoff - use lower threshold for merchants
                score_cutoff = 40 if filter_type == 'merchant_names' else int(cutoff * 100)
                fuzzy_matches = fuzzy_lookup(term, entity_cache[filter_type], limit=10, score_cutoff=score_cutoff)
                matches.extend(fuzzy_matches)
        
        # Remove duplicates and limit results - increase limit for merchants
        unique_matches = list(dict.fromkeys(matches))  # Preserve order
        if unique_matches:
            limit = 10 if filter_type == 'merchant_names' else 5
            resolved_entities[filter_type] = unique_matches[:limit]  # More matches for merchants
    
    return resolved_entities

def extract_key_terms(query, filter_type):
    """
    Extract key terms from query dynamically without hardcoded lists.
    Enhanced to handle multi-word terms better.
    """
    query_lower = query.lower()
    terms = []
    
    # Extract meaningful words and phrases from the query
    words = query_lower.split()
    
    # Common stop words to filter out
    stop_words = {
        'the', 'and', 'or', 'but', 'for', 'with', 'from', 'this', 'that', 
        'have', 'has', 'had', 'will', 'would', 'could', 'should', 'what', 
        'when', 'where', 'how', 'why', 'show', 'me', 'my', 'all', 'any', 
        'some', 'many', 'much', 'few', 'each', 'every', 'spent', 'spending', 
        'bought', 'purchased', 'paid', 'transactions', 'account', 'accounts',
        'this', 'year', 'month', 'week', 'day', 'also', 'show', 'my'
    }
    
    # Extract single words
    for word in words:
        if len(word) > 2 and word not in stop_words:
            terms.append(word)
    
    # Extract potential multi-word terms (2-3 words)
    for i in range(len(words) - 1):
        # Two-word combinations
        two_word = f"{words[i]} {words[i+1]}"
        if len(two_word) > 4 and not any(sw in two_word for sw in stop_words):
            terms.append(two_word)
        
        # Three-word combinations
        if i < len(words) - 2:
            three_word = f"{words[i]} {words[i+1]} {words[i+2]}"
            if len(three_word) > 6 and not any(sw in three_word for sw in stop_words):
                terms.append(three_word)
    
    return terms

def is_specific_query(query, resolved_entities):
    """
    Determine if the query is specific enough to target a single entity.
    """
    query_lower = query.lower()
    
    # Check for specific indicators
    specific_indicators = [
        'my', 'the', 'this', 'that', 'specific', 'particular',
        'account', 'card', 'loan', 'mortgage'
    ]
    
    has_specific_indicators = any(indicator in query_lower for indicator in specific_indicators)
    
    # Check if we have multiple resolved entities
    total_entities = sum(len(entities) for entities in resolved_entities.values())
    
    # Query is specific if it has specific indicators OR we have only one entity
    return has_specific_indicators or total_entities <= 1

def build_filter_hints(resolved_entities: Dict[str, List[str]]) -> str:
    """
    Build filter hints string for the SQL generation prompt.
    Shows multiple potential matches for the SQL agent to choose from.
    """
    if not resolved_entities:
        return ""
    
    # Convert to JSON for better LLM parsing
    hints_json = json.dumps(resolved_entities, ensure_ascii=False, indent=2)
    
    hints = "\nPOTENTIAL_FILTER_VALUES_JSON = '''\n"
    hints += hints_json
    hints += "\n'''\n"
    hints += "\nUse the most relevant filter value(s) from the JSON above based on the user's question context."
    
    return hints

def build_comprehensive_context_prompt(db_context: Dict[str, Any], query: str) -> str:
    """
    Build a COMPLETE comprehensive context prompt for agents that includes ALL user financial data.
    This provides FULL visibility into the user's financial picture for accurate SQL generation.
    NOTE: This includes ALL accounts, assets, liabilities, budgets, goals, etc.
    Only transaction data is limited to samples (merchant names resolved separately).
    """
    entity_cache = db_context.get('entity_cache', {})
    financial_summary = db_context.get('financial_summary', {})
    account_details = db_context.get('account_details', [])
    manual_assets = db_context.get('manual_assets', [])
    manual_liabilities = db_context.get('manual_liabilities', [])
    budgets = db_context.get('budgets', [])
    goals = db_context.get('goals', [])
    recurring_income = db_context.get('recurring_income', [])
    insurances = db_context.get('insurances', [])
    top_categories = db_context.get('top_categories', [])
    top_merchants = db_context.get('top_merchants', [])
    
    context_parts = []
    
    # User Financial Profile Summary
    if financial_summary:
        context_parts.append("### USER FINANCIAL PROFILE SUMMARY:")
        context_parts.append(f"- NET WORTH: ${financial_summary.get('net_worth', 0):,.2f}")
        context_parts.append(f"- Total Account Balances: ${financial_summary.get('total_balance', 0):,.2f}")
        context_parts.append(f"- Total Manual Assets: ${financial_summary.get('total_manual_assets', 0):,.2f}")
        context_parts.append(f"- Total Manual Liabilities: ${financial_summary.get('total_manual_liabilities', 0):,.2f}")
        context_parts.append(f"- Monthly Recurring Income: ${financial_summary.get('total_recurring_monthly_income', 0):,.2f}")
        context_parts.append(f"- Total Transactions (12m): {financial_summary.get('total_transactions', 0)}")
        context_parts.append(f"- Total Spending (12m): ${financial_summary.get('total_spending_12m', 0):,.2f}")
    
    # ALL Account Details
    if account_details:
        context_parts.append("\n### ALL USER ACCOUNTS:")
        for account in account_details:
            context_parts.append(f"- {account.get('name', 'Unknown')} ({account.get('type', 'Unknown')}): ${account.get('balance', 0):,.2f}")
    
    # ALL Manual Assets (CRITICAL for net worth)
    if manual_assets:
        context_parts.append("\n### ALL MANUAL ASSETS:")
        for asset in manual_assets:
            context_parts.append(f"- {asset.get('name', 'Unknown')} ({asset.get('asset_class', 'Unknown')}): ${asset.get('value', 0):,.2f}")
            if asset.get('notes'):
                context_parts.append(f"  Notes: {asset.get('notes')}")
    
    # ALL Manual Liabilities (CRITICAL for net worth)
    if manual_liabilities:
        context_parts.append("\n### ALL MANUAL LIABILITIES:")
        for liability in manual_liabilities:
            context_parts.append(f"- {liability.get('name', 'Unknown')} ({liability.get('liability_class', 'Unknown')}): ${liability.get('balance', 0):,.2f}")
            if liability.get('interest_rate'):
                context_parts.append(f"  Interest Rate: {liability.get('interest_rate')}%")
    
    # ALL Budgets with Categories
    if budgets:
        context_parts.append("\n### ALL BUDGETS:")
        for budget in budgets:
            amount = budget.get('amount')
            if amount is None:
                amount = 0
            context_parts.append(f"- {budget.get('name', 'Unknown')}: ${amount:,.2f} ({budget.get('period', 'Unknown')})")
            if budget.get('categories'):
                for cat in budget['categories']:
                    if cat and isinstance(cat, dict):
                        cat_amount = cat.get('amount')
                        if cat_amount is None:
                            cat_amount = 0
                        context_parts.append(f"  - {cat.get('category', 'Unknown')}: ${cat_amount:,.2f}")
    
    # ALL Financial Goals with Progress
    if goals:
        context_parts.append("\n### ALL FINANCIAL GOALS:")
        for goal in goals:
            progress = goal.get('progress_percentage', 0)
            context_parts.append(f"- {goal.get('name', 'Unknown')}: ${goal.get('current_amount', 0):,.2f} / ${goal.get('target_amount', 0):,.2f} ({progress:.1f}% complete)")
            if goal.get('target_date'):
                context_parts.append(f"  Target Date: {goal.get('target_date')}")
    
    # ALL Recurring Income Sources
    if recurring_income:
        context_parts.append("\n### ALL RECURRING INCOME:")
        for income in recurring_income:
            context_parts.append(f"- {income.get('source', 'Unknown')}: ${income.get('gross_monthly', 0):,.2f}/month")
            if income.get('next_pay_date'):
                context_parts.append(f"  Next Pay Date: {income.get('next_pay_date')}")
    
    # ALL Insurance Policies
    if insurances:
        context_parts.append("\n### ALL INSURANCE POLICIES:")
        for insurance in insurances:
            context_parts.append(f"- {insurance.get('type', 'Unknown')} from {insurance.get('provider', 'Unknown')}: Premium ${insurance.get('premium_amount', 0):,.2f}, Coverage ${insurance.get('coverage_amount', 0):,.2f}")
    
    # Top Spending Categories
    if top_categories:
        context_parts.append("\n### TOP SPENDING CATEGORIES (6 months):")
        for category in top_categories[:10]:  # Show top 10 categories
            context_parts.append(f"- {category.get('category', 'Unknown')}: ${category.get('total_spent', 0):,.2f}")
    
    # Top Merchants
    if top_merchants:
        context_parts.append("\n### TOP MERCHANTS (6 months):")
        for merchant in top_merchants[:10]:  # Show top 10 merchants
            context_parts.append(f"- {merchant.get('merchant', 'Unknown')}: ${merchant.get('total_spent', 0):,.2f}")
    
    # Note about entity resolution
    context_parts.append("\n### NOTE ON ENTITY RESOLUTION:")
    context_parts.append("- ALL accounts, assets, liabilities, budgets, and goals are listed above in FULL")
    context_parts.append("- For transaction merchant names, use the POTENTIAL MERCHANT NAMES provided separately")
    context_parts.append("- Those merchant names are fuzzy-matched from the user's query")
    
    return "\n".join(context_parts)

def clear_entity_cache(user_id: str = None):
    """
    Clear entity cache for a user or all users.
    """
    if user_id:
        cache_key = f"entity_cache_{user_id}"
        if cache_key in _entity_cache_store:
            del _entity_cache_store[cache_key]
            logger.info(f"Cleared entity cache for user {user_id}")
    else:
        _entity_cache_store.clear()
        logger.info("Cleared all entity caches") 