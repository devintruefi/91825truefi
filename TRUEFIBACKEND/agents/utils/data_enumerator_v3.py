"""
Data Enumerator v3 - Hardened with SQL injection protection and comprehensive validation
Secure, type-safe enumeration fetching with proper error handling and monitoring
"""
import logging
import json
import time
from typing import Dict, List, Any, Optional, Union, Set
from functools import lru_cache
from dataclasses import dataclass, field
from enum import Enum
import hashlib
from datetime import datetime, timezone
import psycopg2.sql as sql

logger = logging.getLogger(__name__)

class EnumerationScope(Enum):
    """Enumeration scope types."""
    USER_SPECIFIC = "user_specific"
    SYSTEM_WIDE = "system_wide"
    HYBRID = "hybrid"

class CacheStrategy(Enum):
    """Cache strategy options."""
    AGGRESSIVE = "aggressive"  # 15 minutes TTL
    NORMAL = "normal"         # 5 minutes TTL
    CONSERVATIVE = "conservative"  # 1 minute TTL
    DISABLED = "disabled"     # No caching

@dataclass
class EnumerationMetadata:
    """Metadata for enumeration results."""
    user_id: str
    scope: EnumerationScope
    fetched_at: datetime
    cache_key: str
    total_items: int
    query_time_ms: float
    data_freshness_hours: float
    validation_errors: List[str] = field(default_factory=list)

@dataclass
class EnumerationQuery:
    """Type-safe query definition."""
    key: str
    query_template: str
    scope: EnumerationScope
    max_results: int
    validation_rules: List[str] = field(default_factory=list)

class DataEnumeratorV3:
    """
    Hardened data enumerator with SQL injection protection and comprehensive validation.
    Provides secure, type-safe enumeration fetching with monitoring and error handling.
    """
    
    # Predefined secure queries with parameterized statements
    SECURE_QUERIES = {
        'all_account_types': EnumerationQuery(
            key='all_account_types',
            query_template="SELECT DISTINCT type FROM accounts WHERE type IS NOT NULL ORDER BY type",
            scope=EnumerationScope.SYSTEM_WIDE,
            max_results=20,
            validation_rules=['non_empty', 'length_max_50']
        ),
        'all_account_subtypes': EnumerationQuery(
            key='all_account_subtypes', 
            query_template="SELECT DISTINCT subtype FROM accounts WHERE subtype IS NOT NULL ORDER BY subtype",
            scope=EnumerationScope.SYSTEM_WIDE,
            max_results=50,
            validation_rules=['non_empty', 'length_max_50']
        ),
        'all_transaction_categories': EnumerationQuery(
            key='all_transaction_categories',
            query_template="SELECT DISTINCT category FROM transactions WHERE category IS NOT NULL AND category != '' ORDER BY category LIMIT %s",
            scope=EnumerationScope.SYSTEM_WIDE,
            max_results=100,
            validation_rules=['non_empty', 'length_max_100']
        ),
        'user_account_types': EnumerationQuery(
            key='user_account_types',
            query_template="SELECT DISTINCT type FROM accounts WHERE user_id = %s AND type IS NOT NULL ORDER BY type",
            scope=EnumerationScope.USER_SPECIFIC,
            max_results=20,
            validation_rules=['non_empty', 'length_max_50']
        ),
        'user_account_names': EnumerationQuery(
            key='user_account_names',
            query_template="SELECT DISTINCT name FROM accounts WHERE user_id = %s AND name IS NOT NULL AND name != '' AND is_active = true ORDER BY name LIMIT %s",
            scope=EnumerationScope.USER_SPECIFIC,
            max_results=50,
            validation_rules=['non_empty', 'length_max_200']
        ),
        'user_categories': EnumerationQuery(
            key='user_categories',
            query_template="""
                SELECT DISTINCT category 
                FROM transactions 
                WHERE user_id = %s 
                  AND category IS NOT NULL 
                  AND category != '' 
                  AND date >= CURRENT_DATE - INTERVAL '12 months'
                ORDER BY category 
                LIMIT %s
            """,
            scope=EnumerationScope.USER_SPECIFIC,
            max_results=50,
            validation_rules=['non_empty', 'length_max_100']
        ),
        'user_merchants': EnumerationQuery(
            key='user_merchants',
            query_template="""
                SELECT DISTINCT merchant_name 
                FROM transactions 
                WHERE user_id = %s 
                  AND merchant_name IS NOT NULL 
                  AND merchant_name != ''
                  AND date >= CURRENT_DATE - INTERVAL '12 months'
                ORDER BY merchant_name 
                LIMIT %s
            """,
            scope=EnumerationScope.USER_SPECIFIC,
            max_results=100,
            validation_rules=['non_empty', 'length_max_200']
        ),
        'user_budget_names': EnumerationQuery(
            key='user_budget_names',
            query_template="SELECT DISTINCT name FROM budgets WHERE user_id = %s AND name IS NOT NULL AND name != '' ORDER BY name LIMIT %s",
            scope=EnumerationScope.USER_SPECIFIC,
            max_results=30,
            validation_rules=['non_empty', 'length_max_200']
        ),
        'user_budget_categories': EnumerationQuery(
            key='user_budget_categories',
            query_template="""
                SELECT DISTINCT bc.category 
                FROM budget_categories bc 
                JOIN budgets b ON bc.budget_id = b.id 
                WHERE b.user_id = %s 
                  AND bc.category IS NOT NULL 
                  AND bc.category != ''
                ORDER BY bc.category
                LIMIT %s
            """,
            scope=EnumerationScope.USER_SPECIFIC,
            max_results=50,
            validation_rules=['non_empty', 'length_max_100']
        ),
        'user_goal_names': EnumerationQuery(
            key='user_goal_names',
            query_template="SELECT DISTINCT name FROM goals WHERE user_id = %s AND name IS NOT NULL AND name != '' AND is_active = true ORDER BY name LIMIT %s",
            scope=EnumerationScope.USER_SPECIFIC,
            max_results=20,
            validation_rules=['non_empty', 'length_max_200']
        ),
        'user_asset_names': EnumerationQuery(
            key='user_asset_names',
            query_template="SELECT DISTINCT name FROM manual_assets WHERE user_id = %s AND name IS NOT NULL AND name != '' ORDER BY name LIMIT %s",
            scope=EnumerationScope.USER_SPECIFIC,
            max_results=30,
            validation_rules=['non_empty', 'length_max_200']
        ),
        'user_liability_names': EnumerationQuery(
            key='user_liability_names',
            query_template="SELECT DISTINCT name FROM manual_liabilities WHERE user_id = %s AND name IS NOT NULL AND name != '' ORDER BY name LIMIT %s",
            scope=EnumerationScope.USER_SPECIFIC,
            max_results=30,
            validation_rules=['non_empty', 'length_max_200']
        )
    }
    
    def __init__(self, db_pool, cache_strategy: CacheStrategy = CacheStrategy.NORMAL):
        self.db_pool = db_pool
        self.cache_strategy = cache_strategy
        self._cache: Dict[str, Any] = {}
        self._cache_timestamps: Dict[str, float] = {}
        self._cache_metadata: Dict[str, EnumerationMetadata] = {}
        
        # Cache TTL based on strategy
        cache_ttls = {
            CacheStrategy.AGGRESSIVE: 900,    # 15 minutes
            CacheStrategy.NORMAL: 300,        # 5 minutes
            CacheStrategy.CONSERVATIVE: 60,   # 1 minute
            CacheStrategy.DISABLED: 0         # No caching
        }
        self.cache_ttl = cache_ttls[cache_strategy]
        
        # Statistics
        self.stats = {
            'total_queries': 0,
            'cache_hits': 0,
            'cache_misses': 0,
            'validation_errors': 0,
            'query_failures': 0
        }
    
    async def get_user_enumerations(self, user_id: str, 
                                   requested_keys: Optional[List[str]] = None,
                                   force_refresh: bool = False) -> Dict[str, Any]:
        """
        Get secure enumerations for a user with comprehensive validation.
        
        Args:
            user_id: UUID string for the user
            requested_keys: Specific enumeration keys to fetch (None = all)
            force_refresh: Skip cache and force fresh data
            
        Returns:
            Dictionary of enumeration results with metadata
        """
        start_time = time.time()
        
        # Validate user_id
        if not self._validate_user_id(user_id):
            raise ValueError(f"Invalid user_id format: {user_id}")
        
        # Determine which queries to run
        if requested_keys:
            queries_to_run = {k: v for k, v in self.SECURE_QUERIES.items() if k in requested_keys}
        else:
            queries_to_run = self.SECURE_QUERIES
        
        # Check cache if not forcing refresh
        cache_key = self._generate_cache_key(user_id, list(queries_to_run.keys()))
        if not force_refresh and self._is_cache_valid(cache_key):
            self.stats['cache_hits'] += 1
            logger.debug(f"Cache hit for user {user_id[:8]}...")
            return self._cache[cache_key]
        
        self.stats['cache_misses'] += 1
        self.stats['total_queries'] += 1
        
        # Execute queries securely
        enumerations = {}
        metadata_list = []
        
        conn = None
        try:
            conn = self.db_pool.getconn()
            
            for query_key, query_def in queries_to_run.items():
                try:
                    query_start = time.time()
                    results = await self._execute_secure_query(conn, query_def, user_id)
                    query_time = (time.time() - query_start) * 1000
                    
                    # Validate results
                    validated_results, validation_errors = self._validate_results(results, query_def)
                    enumerations[query_key] = validated_results
                    
                    # Create metadata
                    metadata = EnumerationMetadata(
                        user_id=user_id,
                        scope=query_def.scope,
                        fetched_at=datetime.now(timezone.utc),
                        cache_key=cache_key,
                        total_items=len(validated_results),
                        query_time_ms=query_time,
                        data_freshness_hours=self._estimate_data_freshness(query_def),
                        validation_errors=validation_errors
                    )
                    metadata_list.append(metadata)
                    
                    if validation_errors:
                        self.stats['validation_errors'] += len(validation_errors)
                        logger.warning(f"Validation errors in {query_key}: {validation_errors}")
                
                except Exception as e:
                    self.stats['query_failures'] += 1
                    logger.error(f"Query failed for {query_key}: {e}")
                    enumerations[query_key] = []
                    
        except Exception as e:
            logger.error(f"Database connection failed: {e}")
            return self._get_fallback_enumerations(user_id)
            
        finally:
            if conn:
                self.db_pool.putconn(conn)
        
        # Add comprehensive metadata
        enumerations['_metadata'] = {
            'user_id': user_id,
            'cache_key': cache_key,
            'fetched_at': datetime.now(timezone.utc).isoformat(),
            'total_execution_time_ms': (time.time() - start_time) * 1000,
            'cache_strategy': self.cache_strategy.value,
            'queries_executed': list(queries_to_run.keys()),
            'total_items': sum(len(v) for k, v in enumerations.items() if k != '_metadata'),
            'validation_summary': {
                'total_errors': sum(len(m.validation_errors) for m in metadata_list),
                'queries_with_errors': [m.cache_key for m in metadata_list if m.validation_errors]
            },
            'freshness_info': {
                m.cache_key: m.data_freshness_hours for m in metadata_list
            }
        }
        
        # Cache results if caching enabled
        if self.cache_ttl > 0:
            self._cache[cache_key] = enumerations
            self._cache_timestamps[cache_key] = time.time()
            self._cache_metadata[cache_key] = metadata_list[0] if metadata_list else None
        
        logger.info(f"Fetched enumerations for user {user_id[:8]}...: {self._get_summary(enumerations)}")
        
        return enumerations
    
    async def _execute_secure_query(self, conn, query_def: EnumerationQuery, user_id: str) -> List[str]:
        """Execute query with proper parameter binding to prevent SQL injection."""
        with conn.cursor() as cur:
            # Build parameters based on scope
            if query_def.scope == EnumerationScope.SYSTEM_WIDE:
                if query_def.max_results:
                    cur.execute(query_def.query_template, (query_def.max_results,))
                else:
                    cur.execute(query_def.query_template)
            else:  # USER_SPECIFIC
                if query_def.max_results:
                    cur.execute(query_def.query_template, (user_id, query_def.max_results))
                else:
                    cur.execute(query_def.query_template, (user_id,))
            
            results = [row[0] for row in cur.fetchall() if row[0]]
            return results
    
    def _validate_results(self, results: List[str], query_def: EnumerationQuery) -> tuple:
        """Validate enumeration results against defined rules."""
        validated_results = []
        errors = []
        
        for result in results:
            item_errors = []
            
            # Apply validation rules
            for rule in query_def.validation_rules:
                if rule == 'non_empty' and not result.strip():
                    item_errors.append(f"Empty value in {query_def.key}")
                elif rule == 'length_max_50' and len(result) > 50:
                    item_errors.append(f"Value too long (>{50}): {result[:20]}...")
                elif rule == 'length_max_100' and len(result) > 100:
                    item_errors.append(f"Value too long (>{100}): {result[:20]}...")
                elif rule == 'length_max_200' and len(result) > 200:
                    item_errors.append(f"Value too long (>{200}): {result[:20]}...")
            
            # Check for suspicious patterns
            if self._has_suspicious_patterns(result):
                item_errors.append(f"Suspicious pattern detected: {result[:20]}...")
            
            if not item_errors:
                validated_results.append(result)
            else:
                errors.extend(item_errors)
        
        return validated_results, errors
    
    def _has_suspicious_patterns(self, value: str) -> bool:
        """Check for suspicious patterns that might indicate data corruption or injection attempts."""
        suspicious_patterns = [
            r'<script.*?>',  # Script tags
            r'javascript:',  # JavaScript URLs
            r'SELECT.*FROM',  # SQL injection attempts
            r'DROP.*TABLE',  # SQL injection attempts
            r'[\\x00-\\x1f]',  # Control characters
            r'\\\\',  # Excessive backslashes
        ]
        
        for pattern in suspicious_patterns:
            if re.search(pattern, value, re.IGNORECASE):
                return True
        
        return False
    
    def _validate_user_id(self, user_id: str) -> bool:
        """Validate user_id format to prevent injection."""
        import uuid
        try:
            uuid.UUID(user_id)
            return True
        except ValueError:
            return False
    
    def _generate_cache_key(self, user_id: str, query_keys: List[str]) -> str:
        """Generate deterministic cache key."""
        content = f"{user_id}:{':'.join(sorted(query_keys))}"
        return hashlib.md5(content.encode()).hexdigest()
    
    def _is_cache_valid(self, cache_key: str) -> bool:
        """Check if cache entry is valid."""
        if self.cache_ttl == 0:  # Caching disabled
            return False
        
        if cache_key not in self._cache:
            return False
        
        timestamp = self._cache_timestamps.get(cache_key, 0)
        return (time.time() - timestamp) < self.cache_ttl
    
    def _estimate_data_freshness(self, query_def: EnumerationQuery) -> float:
        """Estimate how fresh the data is based on query patterns."""
        # Simple heuristic based on query patterns
        if 'date >=' in query_def.query_template:
            return 1.0  # Data from last period, relatively fresh
        elif query_def.scope == EnumerationScope.USER_SPECIFIC:
            return 24.0  # User data changes less frequently
        else:
            return 168.0  # System-wide data changes even less frequently
    
    def _get_fallback_enumerations(self, user_id: str) -> Dict[str, Any]:
        """Provide safe fallback values when database is unavailable."""
        return {
            'error': 'Database unavailable',
            'all_account_types': ['checking', 'savings', 'credit', 'investment'],
            'user_account_types': [],
            'user_account_names': [],
            '_metadata': {
                'user_id': user_id,
                'fallback': True,
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'error': 'Database connection failed'
            }
        }
    
    def _get_summary(self, enumerations: Dict) -> str:
        """Get summary of enumeration counts for logging."""
        summary = {}
        for key, values in enumerations.items():
            if isinstance(values, list) and not key.startswith('_'):
                summary[key] = len(values)
        return json.dumps(summary)
    
    def get_enumeration_context_string(self, enumerations: Dict[str, Any]) -> str:
        """Convert enumerations to LLM context string with data quality indicators."""
        if enumerations.get('error'):
            return f"ENUMERATION ERROR: {enumerations['error']}"
        
        context_parts = []
        metadata = enumerations.get('_metadata', {})
        
        # Add data quality header
        if metadata.get('validation_summary', {}).get('total_errors', 0) > 0:
            context_parts.append("⚠️ ENUMERATION DATA QUALITY ISSUES DETECTED")
        
        # User-specific values (most important)
        user_keys = [
            ('user_account_names', 'User Accounts'),
            ('user_categories', 'User Categories'),
            ('user_merchants', 'User Merchants'),
            ('user_budget_names', 'User Budgets'),
            ('user_goal_names', 'User Goals')
        ]
        
        for key, label in user_keys:
            values = enumerations.get(key, [])
            if values:
                sample = values[:10]  # Limit sample size
                context_parts.append(f"{label}: {', '.join(sample)}")
                if len(values) > 10:
                    context_parts.append(f"  (+ {len(values) - 10} more)")
        
        # System reference values
        system_keys = [
            ('all_account_types', 'Available Account Types'),
            ('all_transaction_categories', 'System Categories')
        ]
        
        for key, label in system_keys:
            values = enumerations.get(key, [])
            if values:
                context_parts.append(f"{label}: {', '.join(values[:15])}")
        
        # Add metadata footer
        if metadata:
            freshness_hours = min(metadata.get('freshness_info', {}).values(), default=24)
            context_parts.append(f"Data freshness: ~{freshness_hours:.0f} hours")
        
        return "\\n".join(context_parts)
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get enumeration statistics for monitoring."""
        return {
            **self.stats,
            'cache_hit_rate': self.stats['cache_hits'] / max(1, self.stats['cache_hits'] + self.stats['cache_misses']),
            'cache_size': len(self._cache),
            'cache_strategy': self.cache_strategy.value,
            'supported_queries': list(self.SECURE_QUERIES.keys())
        }
    
    def clear_cache(self, user_id: Optional[str] = None):
        """Clear cache entries."""
        if user_id:
            # Clear specific user cache
            keys_to_remove = [k for k in self._cache.keys() if user_id in k]
            for key in keys_to_remove:
                self._cache.pop(key, None)
                self._cache_timestamps.pop(key, None)
                self._cache_metadata.pop(key, None)
        else:
            # Clear all cache
            self._cache.clear()
            self._cache_timestamps.clear()
            self._cache_metadata.clear()
        
        logger.info(f"Cache cleared for user: {'all users' if not user_id else user_id[:8] + '...'}")

def create_hardened_enumerator(db_pool, cache_strategy: CacheStrategy = CacheStrategy.NORMAL) -> DataEnumeratorV3:
    """Factory function to create hardened data enumerator."""
    return DataEnumeratorV3(db_pool, cache_strategy)