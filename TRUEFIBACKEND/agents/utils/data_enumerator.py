"""
Data Enumerator - Dynamically fetches valid values from the database
This ensures the AI agents know what data actually exists without hardcoding
"""
import logging
import json
from typing import Dict, List, Any, Optional
from functools import lru_cache
import time

logger = logging.getLogger(__name__)

class DataEnumerator:
    """
    Dynamically fetches and caches enumerated values from the database.
    This gives agents awareness of what values actually exist in the system.
    """
    
    def __init__(self, db_pool):
        self.db_pool = db_pool
        self._cache = {}
        self._cache_timestamps = {}
        self.cache_ttl = 300  # 5 minutes
        
    async def get_user_enumerations(self, user_id: str) -> Dict[str, Any]:
        """
        Get all relevant enumerations for a specific user.
        This includes both system-wide and user-specific values.
        """
        cache_key = f"user_enum_{user_id}"
        
        # Check cache
        if self._is_cache_valid(cache_key):
            return self._cache[cache_key]
        
        enumerations = {}
        
        try:
            # Fetch all enumerations in parallel for efficiency
            conn = self.db_pool.getconn()
            try:
                with conn.cursor() as cur:
                    # System-wide enumerations
                    enumerations['all_account_types'] = self._fetch_distinct_values(
                        cur, "SELECT DISTINCT type FROM accounts WHERE type IS NOT NULL ORDER BY type"
                    )
                    
                    enumerations['all_account_subtypes'] = self._fetch_distinct_values(
                        cur, "SELECT DISTINCT subtype FROM accounts WHERE subtype IS NOT NULL ORDER BY subtype"
                    )
                    
                    enumerations['all_transaction_categories'] = self._fetch_distinct_values(
                        cur, "SELECT DISTINCT category FROM transactions WHERE category IS NOT NULL ORDER BY category LIMIT 100"
                    )
                    
                    enumerations['all_budget_periods'] = self._fetch_distinct_values(
                        cur, "SELECT DISTINCT period FROM budgets WHERE period IS NOT NULL ORDER BY period"
                    )
                    
                    # User-specific enumerations
                    enumerations['user_account_types'] = self._fetch_distinct_values(
                        cur, f"SELECT DISTINCT type FROM accounts WHERE user_id = '{user_id}' AND type IS NOT NULL ORDER BY type"
                    )
                    
                    enumerations['user_account_names'] = self._fetch_distinct_values(
                        cur, f"SELECT DISTINCT name FROM accounts WHERE user_id = '{user_id}' AND is_active = true ORDER BY name"
                    )
                    
                    enumerations['user_categories'] = self._fetch_distinct_values(
                        cur, f"SELECT DISTINCT category FROM transactions WHERE user_id = '{user_id}' AND category IS NOT NULL ORDER BY category LIMIT 50"
                    )
                    
                    enumerations['user_merchants'] = self._fetch_distinct_values(
                        cur, f"SELECT DISTINCT merchant_name FROM transactions WHERE user_id = '{user_id}' AND merchant_name IS NOT NULL ORDER BY merchant_name LIMIT 100"
                    )
                    
                    enumerations['user_budget_categories'] = self._fetch_distinct_values(
                        cur, f"""
                        SELECT DISTINCT bc.category 
                        FROM budget_categories bc 
                        JOIN budgets b ON bc.budget_id = b.id 
                        WHERE b.user_id = '{user_id}' 
                        ORDER BY bc.category
                        """
                    )
                    
                    # Also get budget names since they might be referenced
                    enumerations['user_budget_names'] = self._fetch_distinct_values(
                        cur, f"SELECT DISTINCT name FROM budgets WHERE user_id = '{user_id}' ORDER BY name"
                    )
                    
                    # Add metadata
                    enumerations['metadata'] = {
                        'fetched_at': time.time(),
                        'user_id': user_id,
                        'cache_ttl': self.cache_ttl
                    }
                    
            finally:
                self.db_pool.putconn(conn)
            
            # Cache the results
            self._cache[cache_key] = enumerations
            self._cache_timestamps[cache_key] = time.time()
            
            logger.info(f"Fetched enumerations for user {user_id}: {self._get_summary(enumerations)}")
            
        except Exception as e:
            logger.error(f"Error fetching enumerations: {e}")
            # Return minimal enumerations on error
            enumerations = {
                'error': str(e),
                'all_account_types': ['checking', 'savings', 'credit', 'investment'],
                'user_account_types': [],
                'metadata': {'error': True}
            }
        
        return enumerations
    
    def _fetch_distinct_values(self, cursor, query: str) -> List[str]:
        """Execute query and return list of distinct values."""
        try:
            cursor.execute(query)
            return [row[0] for row in cursor.fetchall() if row[0]]
        except Exception as e:
            logger.error(f"Error in query: {query}, Error: {e}")
            # Need to rollback on error to continue with other queries
            cursor.connection.rollback()
            return []
    
    def _is_cache_valid(self, cache_key: str) -> bool:
        """Check if cached data is still valid."""
        if cache_key not in self._cache:
            return False
        
        timestamp = self._cache_timestamps.get(cache_key, 0)
        return (time.time() - timestamp) < self.cache_ttl
    
    def _get_summary(self, enumerations: Dict) -> str:
        """Get a summary of enumeration counts for logging."""
        summary = {}
        for key, values in enumerations.items():
            if isinstance(values, list):
                summary[key] = len(values)
        return json.dumps(summary)
    
    def get_enumeration_context_string(self, enumerations: Dict[str, Any]) -> str:
        """
        Convert enumerations to a context string for LLM prompts.
        Provides rich context to help LLM make intelligent decisions.
        """
        context_parts = []
        
        # User-specific values (most important)
        if enumerations.get('user_account_types'):
            context_parts.append(f"User's account types: {', '.join(enumerations['user_account_types'])}")
        
        if enumerations.get('user_account_names'):
            context_parts.append(f"User's accounts: {', '.join(enumerations['user_account_names'][:10])}")
        
        if enumerations.get('user_categories'):
            context_parts.append(f"User's transaction categories: {', '.join(enumerations['user_categories'][:20])}")
        
        if enumerations.get('user_budget_names'):
            context_parts.append(f"User's budget names: {', '.join(enumerations['user_budget_names'][:15])}")
        
        if enumerations.get('user_budget_categories'):
            context_parts.append(f"User's budget categories: {', '.join(enumerations['user_budget_categories'][:15])}")
        
        if enumerations.get('user_merchants'):
            # Show a sample of merchants to give context
            merchants_sample = enumerations['user_merchants'][:15]
            context_parts.append(f"Sample merchants: {', '.join(merchants_sample)}")
        
        # System-wide values for reference
        if enumerations.get('all_account_types'):
            all_types = set(enumerations['all_account_types']) - set(enumerations.get('user_account_types', []))
            if all_types:
                context_parts.append(f"Other possible account types in system: {', '.join(all_types)}")
        
        return "\n".join(context_parts)
    
    def clear_cache(self, user_id: Optional[str] = None):
        """Clear cache for a specific user or all users."""
        if user_id:
            cache_key = f"user_enum_{user_id}"
            self._cache.pop(cache_key, None)
            self._cache_timestamps.pop(cache_key, None)
        else:
            self._cache.clear()
            self._cache_timestamps.clear()