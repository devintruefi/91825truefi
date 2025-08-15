import psycopg2
import json
import time
import re
import hashlib
from functools import lru_cache, wraps
from typing import Dict, List, Tuple, Optional, Set, Any
import logging

logger = logging.getLogger(__name__)

def memoize_with_ttl(ttl_seconds: int = 300):
    """
    Memoization decorator with TTL (time-to-live) for schema operations.
    """
    def decorator(func):
        cache = {}
        cache_timestamps = {}
        
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Create cache key from function args
            key = hashlib.md5(str((args, kwargs)).encode()).hexdigest()
            current_time = time.time()
            
            # Check if cached and not expired
            if key in cache and (current_time - cache_timestamps[key]) < ttl_seconds:
                return cache[key]
            
            # Execute function and cache result
            result = func(*args, **kwargs)
            cache[key] = result
            cache_timestamps[key] = current_time
            
            # Clean old entries (basic cleanup)
            if len(cache) > 100:  # Arbitrary limit
                oldest_key = min(cache_timestamps, key=cache_timestamps.get)
                del cache[oldest_key]
                del cache_timestamps[oldest_key]
            
            return result
        return wrapper
    return decorator

class SchemaRegistry:
    """
    Enhanced schema registry with memoization and tenant safety.
    - Loads table / column metadata via information_schema once per app boot
    - Stores FK relationships and basic data type
    - Exposes helper to return *subset* of schema relevant to a question
    - Implements caching and tenant filtering for safety
    """
    
    # Tables that must have tenant filtering (user_id column)
    TENANT_FILTERED_TABLES = {
        'accounts', 'transactions', 'budgets', 'budget_categories',
        'manual_liabilities', 'goals', 'recurring_income', 'users'
    }
    
    # Sensitive columns that should be handled carefully
    SENSITIVE_COLUMNS = {
        'password', 'api_key', 'token', 'secret', 'private_key',
        'ssn', 'tax_id', 'account_number'
    }
    
    def __init__(self, db_pool):
        self.db_pool = db_pool
        self._schema_cache = {}
        self._relationship_cache = {}
        self._last_schema_load = 0
        self._full_schema = self._load_schema()
        self._relationships = self._load_relationships()
        logger.info(f"SchemaRegistry initialized with {len(self._full_schema)} tables")
    
    def _load_schema(self) -> Dict[str, List[Tuple[str, str]]]:
        """Load table and column metadata from information_schema."""
        sql = """
        SELECT 
            table_name, 
            column_name, 
            data_type,
            is_nullable,
            column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position;
        """
        
        conn = None
        try:
            conn = self.db_pool.getconn()
            with conn.cursor() as cur:
                cur.execute(sql)
                rows = cur.fetchall()
            
            schema = {}
            for table, col, dtype, nullable, default in rows:
                if table not in schema:
                    schema[table] = []
                schema[table].append((col, dtype, nullable, default))
            
            return schema
            
        except Exception as e:
            logger.error(f"Error loading schema: {e}")
            # Return minimal schema for core tables
            return {
                'accounts': [('id', 'uuid'), ('user_id', 'uuid'), ('name', 'character varying'), ('balance', 'double precision'), ('type', 'character varying')],
                'transactions': [('id', 'uuid'), ('user_id', 'uuid'), ('account_id', 'uuid'), ('amount', 'double precision'), ('date', 'timestamp'), ('merchant_name', 'character varying'), ('category', 'character varying'), ('pending', 'boolean')]
            }
        finally:
            if conn:
                self.db_pool.putconn(conn)
    
    def _load_relationships(self) -> Dict[str, List[str]]:
        """Load foreign key relationships."""
        sql = """
        SELECT 
            tc.table_name, 
            kcu.column_name, 
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_schema = 'public';
        """
        
        conn = None
        try:
            conn = self.db_pool.getconn()
            with conn.cursor() as cur:
                cur.execute(sql)
                rows = cur.fetchall()
            
            relationships = {}
            for table, col, foreign_table, foreign_col in rows:
                if table not in relationships:
                    relationships[table] = []
                relationships[table].append(f"{col} → {foreign_table}.{foreign_col}")
            
            return relationships
            
        except Exception as e:
            logger.error(f"Error loading relationships: {e}")
            return {
                'transactions': ['account_id → accounts.id'],
                'budgets': ['user_id → users.id'],
                'goals': ['user_id → users.id']
            }
        finally:
            if conn:
                self.db_pool.putconn(conn)
    
    @lru_cache(maxsize=512)
    def get_subset(self, keywords: str) -> str:
        """
        Very cheap heuristic: return definitions for tables whose names
        or column names appear in the user question.
        """
        kw = keywords.lower()
        
        # Find relevant tables based on keywords
        relevant = {}
        for table, cols in self._full_schema.items():
            # Check if table name appears in keywords
            if table in kw:
                relevant[table] = cols
                continue
            
            # Check if any column names appear in keywords
            for col, dtype, nullable, default in cols:
                if col in kw:
                    relevant[table] = cols
                    break
        
        # Always include core financial tables
        core_tables = ['accounts', 'transactions', 'budgets', 'goals']
        for table in core_tables:
            if table in self._full_schema and table not in relevant:
                relevant[table] = self._full_schema[table]
        
        # Build compact markdown for the prompt
        lines = []
        lines.append("### DATABASE SCHEMA")
        
        for table, cols in relevant.items():
            # Format columns with data types
            col_str = ", ".join(f"{c} ({d})" for c, d, _, _ in cols[:15])  # clip to 15 columns
            
            # Add relationships if available
            relationships = self._relationships.get(table, [])
            if relationships:
                rel_str = ", ".join(relationships[:3])  # limit to 3 relationships
                lines.append(f"- **{table}**: {col_str}")
                lines.append(f"  - Relationships: {rel_str}")
            else:
                lines.append(f"- **{table}**: {col_str}")
        
        # Add key insights about the schema
        lines.append("\n### KEY INSIGHTS:")
        lines.append("- **Account balances**: Use `accounts.balance` field (current balance)")
        lines.append("- **Transaction amounts**: Use `transactions.amount` field (money spent/received)")
        lines.append("- **Account spending**: Use `SUM(transactions.amount)` with account filter")
        lines.append("- **Account balance**: Use `accounts.balance` directly")
        lines.append("- **Correct JOIN**: `accounts a LEFT JOIN transactions t ON a.id = t.account_id`")
        
        return "\n".join(lines)
    
    def get_full_schema(self) -> str:
        """Get the complete schema for analysis mode."""
        lines = ["### COMPLETE DATABASE SCHEMA"]
        
        for table, cols in self._full_schema.items():
            col_str = ", ".join(f"{c} ({d})" for c, d, _, _ in cols)
            relationships = self._relationships.get(table, [])
            
            lines.append(f"- **{table}**: {col_str}")
            if relationships:
                rel_str = ", ".join(relationships)
                lines.append(f"  - Relationships: {rel_str}")
        
        return "\n".join(lines)
    
    def get_full_schema_smart(self) -> str:
        """Get complete schema but with smart limits for large tables."""
        lines = ["### COMPLETE DATABASE SCHEMA"]
        
        # Tables that can be very large - show only key columns
        large_tables = {'transactions', 'chat_messages', 'agent_run_log'}
        
        for table, cols in self._full_schema.items():
            if table in large_tables:
                # For large tables, only show essential columns
                essential_cols = []
                for col, dtype, nullable, default in cols:
                    # Include key columns for large tables
                    if col in ['id', 'user_id', 'account_id', 'amount', 'date', 'merchant_name', 
                               'category', 'pending', 'description', 'session_id', 'created_at']:
                        essential_cols.append((col, dtype))
                
                if essential_cols:
                    col_str = ", ".join(f"{c} ({d})" for c, d in essential_cols)
                    lines.append(f"- **{table}** (showing key columns only): {col_str}")
            else:
                # For normal tables, show all columns
                col_str = ", ".join(f"{c} ({d})" for c, d, _, _ in cols)
                lines.append(f"- **{table}**: {col_str}")
            
            # Always show relationships
            relationships = self._relationships.get(table, [])
            if relationships:
                rel_str = ", ".join(relationships)
                lines.append(f"  - Relationships: {rel_str}")
        
        # Add important notes about the schema
        lines.append("\n### IMPORTANT SCHEMA NOTES:")
        lines.append("- **accounts.type**: Stores account type (checking, savings, investment, credit, 401k, etc.)")
        lines.append("- **accounts.balance**: Current balance of the account")
        lines.append("- **transactions.amount**: Negative for expenses, positive for income")
        lines.append("- **All tables have user_id**: Always filter by user_id for multi-tenant safety")
        lines.append("- **Use entity resolver for merchants**: Don't guess merchant names, use provided hints")
        
        return "\n".join(lines)
    
    def get_table_info(self, table_name: str) -> Optional[Dict]:
        """Get detailed information about a specific table."""
        if table_name not in self._full_schema:
            return None
        
        columns = self._full_schema[table_name]
        relationships = self._relationships.get(table_name, [])
        
        return {
            'table_name': table_name,
            'columns': [{'name': col, 'type': dtype, 'nullable': nullable, 'default': default} 
                       for col, dtype, nullable, default in columns],
            'relationships': relationships
        }
    
    @memoize_with_ttl(600)  # 10-minute cache for schema operations
    def get_tenant_safe_schema(self, keywords: str, user_context: Optional[Dict] = None) -> str:
        """
        Get schema subset with tenant safety guidance.
        
        Args:
            keywords: Keywords from query to determine relevant tables
            user_context: Context about the user for additional safety
            
        Returns:
            Schema string with tenant filtering guidance
        """
        base_schema = self.get_subset(keywords)
        
        # Add tenant filtering guidance
        guidance_lines = [
            "",
            "### TENANT FILTERING REQUIREMENTS",
            "CRITICAL: Always include user_id filters for these tables:",
        ]
        
        # Check which relevant tables need tenant filtering
        relevant_tables = self._extract_table_names_from_schema(base_schema)
        tenant_filtered_needed = relevant_tables & self.TENANT_FILTERED_TABLES
        
        if tenant_filtered_needed:
            for table in sorted(tenant_filtered_needed):
                guidance_lines.append(f"- {table}: WHERE user_id = %s")
        
        guidance_lines.extend([
            "",
            "### SENSITIVE DATA HANDLING",
            "Never expose these column types in results:",
        ])
        
        # Check for sensitive columns in relevant tables
        sensitive_found = set()
        for table in relevant_tables:
            if table in self._full_schema:
                for col, _, _, _ in self._full_schema[table]:
                    if any(sensitive in col.lower() for sensitive in self.SENSITIVE_COLUMNS):
                        sensitive_found.add(f"{table}.{col}")
        
        if sensitive_found:
            for sensitive in sorted(sensitive_found):
                guidance_lines.append(f"- {sensitive}")
        else:
            guidance_lines.append("- None detected in current query scope")
        
        return base_schema + "\n" + "\n".join(guidance_lines)
    
    def _extract_table_names_from_schema(self, schema_str: str) -> Set[str]:
        """Extract table names from a schema string."""
        tables = set()
        for line in schema_str.split('\n'):
            if line.startswith('**') and '**' in line[2:]:
                # Extract table name from markdown bold text
                table_match = re.search(r'\*\*(\w+)\*\*', line)
                if table_match:
                    tables.add(table_match.group(1))
        return tables
    
    @memoize_with_ttl(900)  # 15-minute cache
    def get_full_schema_with_safety(self) -> str:
        """
        Get full schema with comprehensive safety guidance.
        
        Returns:
            Complete schema with safety annotations
        """
        base_schema = self.get_full_schema_smart()
        
        safety_guidance = [
            "",
            "### COMPREHENSIVE TENANT SAFETY",
            "",
            "#### Multi-Tenant Tables (ALWAYS filter by user_id):",
        ]
        
        for table in sorted(self.TENANT_FILTERED_TABLES):
            if table in self._full_schema:
                safety_guidance.append(f"- {table}: MANDATORY user_id = %s filter")
        
        safety_guidance.extend([
            "",
            "#### Sensitive Columns (NEVER expose in results):",
        ])
        
        for table, columns in self._full_schema.items():
            for col, dtype, _, _ in columns:
                if any(sensitive in col.lower() for sensitive in self.SENSITIVE_COLUMNS):
                    safety_guidance.append(f"- {table}.{col} ({dtype})")
        
        safety_guidance.extend([
            "",
            "#### Query Safety Checklist:",
            "1. Every multi-tenant table has user_id filter",
            "2. No sensitive columns in SELECT clauses",
            "3. Use parameterized queries (not string concatenation)",
            "4. LIMIT clauses to prevent excessive results",
            "5. Read-only operations only (no INSERT/UPDATE/DELETE)",
        ])
        
        return base_schema + "\n" + "\n".join(safety_guidance)
    
    def validate_query_safety(self, sql_query: str) -> Dict[str, Any]:
        """
        Validate SQL query for tenant safety and best practices.
        
        Args:
            sql_query: SQL query to validate
            
        Returns:
            Validation results with safety recommendations
        """
        validation = {
            'safe': True,
            'warnings': [],
            'errors': [],
            'tenant_safety_score': 1.0,
            'recommendations': []
        }
        
        query_upper = sql_query.upper()
        
        # Check for dangerous operations
        dangerous_keywords = ['DROP', 'DELETE', 'INSERT', 'UPDATE', 'ALTER', 'CREATE', 'TRUNCATE']
        for keyword in dangerous_keywords:
            if keyword in query_upper:
                validation['safe'] = False
                validation['errors'].append(f"Dangerous operation detected: {keyword}")
        
        # Check for tenant filtering on multi-tenant tables
        for table in self.TENANT_FILTERED_TABLES:
            if table.upper() in query_upper:
                # Check if user_id filter is present
                if 'USER_ID' not in query_upper:
                    validation['warnings'].append(f"Table {table} accessed without user_id filter")
                    validation['tenant_safety_score'] *= 0.7
        
        # Check for sensitive column exposure
        for table, columns in self._full_schema.items():
            for col, _, _, _ in columns:
                if any(sensitive in col.lower() for sensitive in self.SENSITIVE_COLUMNS):
                    col_pattern = fr'\b{re.escape(col)}\b'
                    if re.search(col_pattern, sql_query, re.IGNORECASE):
                        validation['warnings'].append(f"Sensitive column {table}.{col} may be exposed")
                        validation['tenant_safety_score'] *= 0.8
        
        # Check for SQL injection patterns
        injection_patterns = [
            r"';",  # Statement termination
            r"--",  # Comment injection
            r"/\*.*\*/",  # Block comments
            r"union\s+select",  # Union injection
            r"drop\s+table",  # Table dropping
        ]
        
        for pattern in injection_patterns:
            if re.search(pattern, sql_query, re.IGNORECASE):
                validation['safe'] = False
                validation['errors'].append(f"Potential SQL injection pattern: {pattern}")
        
        # Generate recommendations
        if validation['warnings']:
            validation['recommendations'].append("Review tenant filtering for all multi-tenant tables")
        
        if validation['tenant_safety_score'] < 0.8:
            validation['recommendations'].append("Improve tenant isolation in query")
        
        if not validation['safe']:
            validation['recommendations'].append("Query contains dangerous operations - reject or sanitize")
        
        return validation
    
    def refresh_schema_cache(self) -> bool:
        """
        Refresh the schema cache if it's stale.
        
        Returns:
            True if cache was refreshed, False if still fresh
        """
        current_time = time.time()
        cache_age = current_time - self._last_schema_load
        
        if cache_age > 3600:  # Refresh after 1 hour
            logger.info(f"Refreshing schema cache (age: {cache_age:.0f}s)")
            try:
                self._full_schema = self._load_schema()
                self._relationships = self._load_relationships()
                self._last_schema_load = current_time
                
                # Clear method caches
                self.get_subset.cache_clear()
                
                return True
            except Exception as e:
                logger.error(f"Failed to refresh schema cache: {e}")
                return False
        
        return False
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get caching statistics for monitoring."""
        cache_info = self.get_subset.cache_info()
        
        return {
            'lru_cache_hits': cache_info.hits,
            'lru_cache_misses': cache_info.misses,
            'lru_cache_size': cache_info.currsize,
            'lru_cache_max_size': cache_info.maxsize,
            'schema_age_seconds': time.time() - self._last_schema_load,
            'tables_cached': len(self._full_schema),
            'relationships_cached': len(self._relationships)
        } 