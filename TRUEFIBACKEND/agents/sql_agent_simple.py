"""
Simplified SQL Agent - LLM-driven SQL generation without rigid patterns
"""
import time
import json
import logging
import re
import hashlib
import uuid
from typing import Dict, Any, List, Optional
from decimal import Decimal
from datetime import datetime
from .base_agent import BaseAgent
from .utils.schema_registry import SchemaRegistry
import psycopg2
from psycopg2.extras import RealDictCursor
import asyncio

logger = logging.getLogger(__name__)

class SimpleSQLAgent(BaseAgent):
    """
    Simplified SQL Agent that uses LLM for natural language to SQL.
    Focuses on:
    1. Understanding the query through LLM
    2. Generating appropriate SQL
    3. Safe execution with parameterization
    4. Returning structured results
    """
    
    # Safety and performance settings
    MAX_RETRIES = 3
    QUERY_TIMEOUT = 30
    MAX_RESULTS = 1000
    CACHE_TTL = 300  # 5 minutes
    
    def __init__(self, openai_client, db_pool):
        super().__init__(openai_client, db_pool)
        self.query_cache = {}
        self.cache_timestamps = {}
        self.schema_registry = SchemaRegistry(db_pool)
        
    async def process(self, query: str, user_id: str, **kwargs) -> Dict[str, Any]:
        """
        Process natural language query to SQL and execute.
        """
        start_time = time.time()
        correlation_id = str(uuid.uuid4())[:8]
        
        try:
            # Get user context, merchant hints, and policy
            user_context = kwargs.get('user_context', '')
            merchant_hints = kwargs.get('merchant_hints', [])
            policy = kwargs.get('policy', {})
            
            logger.info(f"[{correlation_id}] Processing SQL query: {query[:100]}...")
            
            # Check cache first
            cache_key = self._generate_cache_key(query, user_id, user_context, merchant_hints)
            cached_result = self._get_cached_result(cache_key)
            if cached_result is not None:
                logger.info(f"[{correlation_id}] Cache hit")
                return cached_result
            
            # Generate SQL with retry on missing scope
            sql_query = None
            safe_query = None
            params = None
            
            for attempt in range(2):  # Try twice if scoping issue
                try:
                    if attempt == 0:
                        sql_query = await self._generate_sql(query, user_id, user_context, merchant_hints, policy)
                    else:
                        # Regenerate with explicit instruction
                        sql_query = await self._generate_sql(
                            query + " (IMPORTANT: Include explicit user_id = '{user_id}' filter on EVERY base table/CTE.)",
                            user_id, user_context, merchant_hints, policy
                        )
                    
                    # Validate and parameterize the SQL
                    try:
                        safe_query, params = self._prepare_safe_query(sql_query, user_id)
                        logger.info(f"[{correlation_id}] Prepared query with {len(params)} params")
                        # Debug: count %s placeholders
                        placeholder_count = safe_query.count('%s')
                        if placeholder_count != len(params):
                            logger.error(f"[{correlation_id}] MISMATCH: Query has {placeholder_count} placeholders but {len(params)} params")
                            logger.error(f"[{correlation_id}] Safe query: {safe_query[:500]}")
                            logger.error(f"[{correlation_id}] Params: {params}")
                    except Exception as e:
                        logger.error(f"[{correlation_id}] Failed to prepare query: {e}")
                        logger.error(f"[{correlation_id}] SQL was: {sql_query[:500]}")
                        raise
                    break  # Success, exit loop
                    
                except ValueError as e:
                    if 'missing user_id scoping' in str(e).lower() and attempt == 0:
                        logger.warning(f"[{correlation_id}] Missing user_id scope, regenerating...")
                        continue  # Try again with explicit instruction
                    raise  # Re-raise if not a scoping issue or already retried
            
            # Execute with retry logic
            # Ensure params is a list (not None)
            params_list = params if params else []
            result = await self._execute_with_retry(safe_query, params_list, correlation_id)
            
            # Process and cache the result
            processed_result = self._process_result(result)
            
            # Build the complete response structure
            full_response = {
                'success': True,
                'data': processed_result,
                'sql_query': safe_query,  # Include SQL query for transparency
                'sql_queries': [safe_query],  # Add to sql_queries array for logging
                'api_calls': [],  # Add empty api_calls array for logging
                'metadata': {
                    'correlation_id': correlation_id,
                    'row_count': len(processed_result),
                    'execution_time': time.time() - start_time,
                    'cached': False
                }
            }
            
            self._cache_result(cache_key, full_response)
            
            execution_time = time.time() - start_time
            logger.info(f"[{correlation_id}] SQL execution completed in {execution_time:.2f}s")
            
            # Log execution with full details
            self._log_execution(
                {
                    'query': query,
                    'user_id': user_id,
                    'user_context': user_context,
                    'merchant_hints': merchant_hints
                },
                {
                    'success': True,
                    'row_count': len(processed_result),
                    'execution_time': execution_time,
                    'sql_query': safe_query,
                    'sql_queries': [safe_query],
                    'api_calls': [],
                    'cached': False
                },
                execution_time,
                user_id
            )
            
            return full_response
            
        except Exception as e:
            execution_time = time.time() - start_time
            logger.error(f"[{correlation_id}] SQL error: {e}")
            
            # More detailed error logging
            import traceback
            logger.error(f"[{correlation_id}] Traceback: {traceback.format_exc()}")
            
            # Enhanced error response
            error_response = {
                'success': False,
                'error_message': str(e),
                'sql_queries': [sql_query] if sql_query else [],
                'api_calls': [],
                'metadata': {
                    'correlation_id': correlation_id,
                    'execution_time': execution_time
                }
            }
            
            self._log_execution(
                {
                    'query': query,
                    'user_id': user_id,
                    'user_context': user_context,
                    'merchant_hints': merchant_hints
                },
                error_response,
                execution_time,
                user_id
            )
            
            return error_response
    
    async def _generate_sql(self, query: str, user_id: str, 
                           user_context: str, merchant_hints: List[str], 
                           policy: Dict[str, Any] = None) -> str:
        """
        Use LLM to generate SQL from natural language with full context and policy.
        """
        # Build exact candidates string from entity resolution
        exact_candidates_str = "\n== EXACT CANDIDATES FROM ENTITY RESOLUTION ==\n"
        
        # Include all resolved entities, not just merchants
        if merchant_hints:
            escaped_merchants = [m.replace("'", "''") for m in merchant_hints]
            exact_candidates_str += f"MERCHANTS: {json.dumps(escaped_merchants)}\n"
        
        # Add other resolved entities if available in context
        if user_context:
            # Extract resolved entities from context if passed
            import re
            account_match = re.search(r"User's accounts: ([^\n]+)", user_context)
            if account_match:
                accounts = [a.strip() for a in account_match.group(1).split(',')]
                exact_candidates_str += f"ACCOUNTS: {json.dumps(accounts)}\n"
            
            budget_match = re.search(r"User's budget names: ([^\n]+)", user_context)
            if budget_match:
                budgets = [b.strip() for b in budget_match.group(1).split(',')]
                exact_candidates_str += f"BUDGETS: {json.dumps(budgets)}\n"
        
        exact_candidates_str += """
IMPORTANT: Prefer exact matching with these candidates:
- For merchants: Use merchant_name IN ('exact1', 'exact2') when candidates match
- For accounts: Join with accounts table and use name IN (...) when candidates match  
- For budgets: Use name = 'exact_budget' when candidates match
- Only fallback to ILIKE patterns if no exact candidates match the user's query
"""
        
        # Build policy block from planner
        policy_block = self._build_policy_block(policy) if policy else ""
        
        # Get FULL schema (not subset) - this is critical for understanding all available fields
        schema_str = self.schema_registry.get_full_schema_smart()
        
        from datetime import datetime
        current_date = datetime.now().strftime('%Y-%m-%d')
        
        system_message = f"""You are an expert PostgreSQL SQL generator for a financial advisor system.
Generate precise SQL queries based on the user's question and their actual financial data.

TODAY'S DATE: {current_date}
Use CURRENT_DATE in SQL which equals '{current_date}' for all date calculations.

CRITICAL SQL RULES:
1. PostgreSQL reserved keywords (AS, IN, ON, FROM, TO, BY, IS, OR, AND, NOT, ALL, ANY, BETWEEN, CASE, WHEN, THEN, ELSE, END) must NEVER be used as table/column aliases
2. Always use meaningful multi-character aliases for tables and CTEs
3. Common aliases: 'tx' or 'trx' for transactions, 'acc' for accounts, 'bdg' for budgets, 'bcat' for budget_categories, 'asp' for actual_spending
4. When joining CTEs, ensure proper join conditions (use CROSS JOIN or LEFT JOIN with ON clause)

GROUP BY AGGREGATION RULES (CRITICAL):
- NEVER write: COALESCE(SUM(x), y) where y is a column - this will fail with GROUP BY error
- CORRECT patterns for budget amounts:
  Option 1: SUM(COALESCE(bcat.amount, 0)) + MAX(CASE WHEN bcat.id IS NULL THEN bdg.amount ELSE 0 END)
  Option 2: MAX(COALESCE(bcat.amount, bdg.amount)) with proper GROUP BY
  Option 3: Use a subquery to handle the aggregation separately
- When using ANY aggregate function (SUM, MAX, MIN, AVG), ALL non-aggregate columns MUST be in GROUP BY

{schema_str}

USER FINANCIAL CONTEXT:
{user_context}

{exact_candidates_str}

KEY PRINCIPLES:
- The user context above shows their ACTUAL data values (account types, categories, merchants, etc.)
- Use the exact values from the context - don't assume generic terms exist in the database
- For multi-tenant safety: always filter by user_id = '{user_id}' on every base table
- Financial conventions: expenses are negative amounts, income is positive

BUDGET AMOUNT CALCULATION:
When calculating budget amounts where budget_categories may or may not exist:
1. If budget has categories: Use the sum of category amounts
2. If budget has no categories: Use the budget's overall amount
3. Implementation: Use proper aggregation - either GROUP BY bdg.id and use MAX(bdg.amount), or use a subquery
4. NEVER mix column references with aggregate functions in COALESCE

POLICY-DRIVEN SQL REQUIREMENTS:
{policy_block}

CATEGORY CANONICALIZATION (when needed for budgets):
When comparing budget categories to transaction categories, consider these common mappings:
- 'Groceries' or 'Food & Dining' → 'Food and Drink'
- 'Gas' or 'Auto & Transport' → 'Transportation' 
- 'Bills & Utilities' → 'Utilities'
Use CASE statements or CTEs to map as needed.

SQL BEST PRACTICES:
- Follow PostgreSQL GROUP BY rules strictly - all non-aggregate SELECT columns must be in GROUP BY
- When aggregating with COALESCE, structure it properly to avoid GROUP BY conflicts
- For CTEs with aggregates, ensure proper join conditions between result sets
- Consider that budget_categories may be optional - handle NULL cases appropriately

Return ONLY the SQL query, no explanations or markdown."""

        messages = [
            {"role": "system", "content": system_message},
            {"role": "user", "content": f"Generate SQL for: {query}"}
        ]
        
        response = await self.client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            max_tokens=2000,
            temperature=0.3
        )
        
        sql_query = response.choices[0].message.content.strip()
        
        # Clean up the SQL
        sql_query = self._clean_sql(sql_query)
        
        logger.info(f"Generated SQL: {sql_query[:200]}...")
        
        return sql_query
    
    def _build_policy_block(self, policy: Dict[str, Any]) -> str:
        """
        Build policy-driven SQL requirements from the planner's output.
        """
        if not policy:
            return ""
        
        blocks = []
        
        intent = policy.get('intent', '')
        data_sources = policy.get('data_sources', [])
        dimensions = policy.get('dimensions', [])
        metrics = policy.get('metrics', [])
        timeframe = policy.get('timeframe', {})
        filters = policy.get('filters', {})
        
        # Core expense convention - always apply
        blocks.append("- EXPENSE CONVENTION: Always calculate expenses as positive values using SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END) or SUM(-amount) WHERE amount < 0")
        blocks.append("- PENDING EXCLUSION: Always add 'AND pending = false' when calculating actual spending or budget comparisons")
        
        # Budget-specific requirements
        if 'budgets' in data_sources or 'budget' in str(policy).lower():
            blocks.append("\n== BUDGET REQUIREMENTS ==")
            blocks.append("- Find active budgets overlapping the target time period")
            blocks.append("- Handle budget_categories as optional (budgets may have overall amount or category-specific amounts)")
            blocks.append("- Calculate actuals from transactions, excluding pending and transfer-type categories")
            blocks.append("- Map transaction categories to budget categories intelligently (e.g., 'Food and Drink' ↔ 'Food & Dining')")
            blocks.append("- Use proper SQL aggregation patterns that respect GROUP BY rules")
        
        # Calendar month semantics
        if intent in ['trend', 'compare'] or 'month' in str(timeframe).lower():
            blocks.append("\n== CALENDAR MONTH REQUIREMENTS ==")
            blocks.append("- Use DATE_TRUNC('month', date) for month grouping")
            blocks.append("- For MoM % change: Use LAG() window function and NULLIF(prior_value, 0) to avoid division by zero")
            blocks.append("- For gaps in months: Consider using generate_series() to create a complete month series")
            blocks.append("- Example: generate_series(DATE_TRUNC('month', CURRENT_DATE - INTERVAL '6 months'), DATE_TRUNC('month', CURRENT_DATE), '1 month'::interval)")
        
        # Intent-specific requirements
        if intent == 'rank':
            blocks.append("\n== RANKING REQUIREMENTS ==")
            blocks.append("- Use GROUP BY for dimensions, ORDER BY metric DESC")
            if 'sum_spend' in metrics:
                blocks.append("- Allow refunds to reduce totals (net spending)")
            blocks.append("- Apply LIMIT 5-10 unless user specified differently")
        
        if intent == 'compare':
            blocks.append("\n== COMPARISON REQUIREMENTS ==")
            blocks.append("- Include both entities being compared as separate rows or columns")
            blocks.append("- Use consistent time windows for both sides")
        
        if intent == 'trend':
            blocks.append("\n== TREND REQUIREMENTS ==")
            blocks.append("- Group by DATE_TRUNC('month', date) or similar")
            blocks.append("- Include month labels for clarity")
        
        # What-if calculations
        if 'pay' in str(policy).lower() and 'from' in str(policy).lower() and 'to' in str(policy).lower():
            blocks.append("\n== WHAT-IF CALCULATION ==")
            blocks.append("- Read current balances for both accounts")
            blocks.append("- For credit cards: positive balance means debt, so paying reduces (subtracts from) the balance")
            blocks.append("- For checking/savings: subtract payment amount from source account")
            blocks.append("- Include status: 'insufficient_funds' if source < amount, 'account_not_found' if missing")
            blocks.append("- Return both current and hypothetical new balances")
        
        # Timeframe requirements
        if 'transactions' in data_sources:
            window = timeframe.get('window', '')
            if 'this_month' in window or window == 'month_to_date':
                blocks.append("- Timeframe: WHERE DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)")
            elif 'last_month' in window:
                blocks.append("- Timeframe: WHERE DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')")
            elif 'months' in window:
                blocks.append(f"- Timeframe: Use appropriate INTERVAL based on: {window}")
            elif window == 'year_to_date':
                blocks.append("- Timeframe: WHERE date >= DATE_TRUNC('year', CURRENT_DATE)")
        
        # Account scope requirements
        if filters.get('accounts'):
            blocks.append(f"\n- ACCOUNT SCOPE: Filter to specified accounts only")
        else:
            blocks.append("\n- ACCOUNT SCOPE: Include all accounts unless user specified one")
        
        # Transfer exclusion
        if intent in ['rank', 'aggregate'] and 'transactions' in data_sources:
            blocks.append("- Exclude transfers: AND category NOT IN ('Transfer', 'Payment', 'Deposit') unless specifically asked for transfers")
        
        return '\n'.join(blocks) if blocks else "No specific policy requirements"
    
    def _clean_sql(self, sql_query: str) -> str:
        """
        Clean SQL query from any markdown or extra formatting.
        """
        # Strip code fences
        if sql_query.strip().startswith('```'):
            sql_query = re.sub(r'^```(?:sql)?\s*', '', sql_query.strip(), flags=re.IGNORECASE)
            sql_query = re.sub(r'\s*```$', '', sql_query.strip())
        
        s = sql_query.strip().lstrip(';')  # remove leading semicolons
        
        upper = s.upper()
        # Find the first meaningful SQL token start: WITH or SELECT
        idx_with = upper.find('WITH ')
        idx_select = upper.find('SELECT ')
        starts = [i for i in [idx_with, idx_select] if i != -1]
        if starts:
            s = s[min(starts):]
        
        # Drop anything after the first terminating semicolon to avoid multi-statement
        s = s.split(';')[0].strip()
        
        # IMPORTANT: Escape % signs in SQL query for psycopg2
        # This prevents % in LIKE patterns from being interpreted as parameter placeholders
        s = s.replace('%', '%%')
        
        return s
    
    def _prepare_safe_query(self, sql_query: str, user_id: str) -> tuple:
        """
        Validate and parameterize SQL query for safety with stricter scoping.
        """
        sql_upper = sql_query.upper()
        
        # Security checks - allow WITH (CTE) or SELECT
        if not (sql_upper.startswith('SELECT') or sql_upper.startswith('WITH ')):
            raise ValueError("Only SELECT or WITH (CTE) queries are allowed")
        
        dangerous_keywords = ['DROP', 'DELETE', 'INSERT', 'UPDATE', 'ALTER', 'CREATE', 'TRUNCATE']
        for kw in dangerous_keywords:
            if kw in sql_upper:
                raise ValueError(f"Dangerous keyword '{kw}' detected")
        
        # Parameterize explicit user_id literals if present
        param_query = sql_query
        params = []
        pattern = r"user_id\s*=\s*'([^']+)'"
        matches = re.findall(pattern, param_query, re.IGNORECASE)
        
        logger.debug(f"Found {len(matches)} user_id literals to parameterize")
        
        for match in matches:
            # Replace with %s placeholder for parameterization
            param_query = re.sub(r"user_id\s*=\s*'[^']+'", "user_id = %s", param_query, count=1, flags=re.IGNORECASE)
            params.append(user_id)
        
        # Check for user_id scoping using word boundary regex
        has_user_scope = bool(re.search(r'\buser_id\b', param_query, flags=re.IGNORECASE))
        has_complex = bool(re.search(r'\b(join|with)\b', param_query, flags=re.IGNORECASE))
        
        if not has_user_scope and has_complex:
            # Safer than guessing aliases—force regeneration
            raise ValueError("Missing user_id scoping for a multi-table/CTE query. Please regenerate with explicit user_id filters on base tables.")
        
        if not has_user_scope:
            # Single-table or simple query: append filter
            logger.debug(f"No user_id scope found, adding filter")
            if ' where ' in param_query.lower():
                param_query = re.sub(r'\bWHERE\b', 'WHERE user_id = %s AND', param_query, count=1, flags=re.IGNORECASE)
            else:
                # place before ORDER/GROUP/LIMIT if present
                inserted = False
                for clause in ['ORDER BY', 'GROUP BY', 'LIMIT']:
                    idx = param_query.upper().find(clause)
                    if idx != -1:
                        param_query = param_query[:idx] + ' WHERE user_id = %s ' + param_query[idx:]
                        inserted = True
                        break
                if not inserted:
                    param_query += ' WHERE user_id = %s'
            params.append(user_id)
            logger.debug(f"Added user_id parameter, now have {len(params)} params")
        
        # Remove trailing semicolon if present (before adding LIMIT)
        param_query = param_query.rstrip().rstrip(';')
        
        # Ensure no multiple statements
        if ';' in param_query:
            raise ValueError("Multiple statements are not allowed.")
        
        # Add default ordering for transactions if not present
        # But only if it's a direct query on transactions table, not CTEs or aggregations
        has_cte = bool(re.search(r'\bWITH\b', param_query, re.IGNORECASE))
        has_direct_transaction_query = bool(re.search(r'\bFROM\s+transactions\b(?!.*\bWITH\b)', param_query, re.IGNORECASE))
        has_group_by = bool(re.search(r'\bGROUP\s+BY\b', param_query, re.IGNORECASE))
        has_select_star_or_date = bool(re.search(r'SELECT\s+\*|SELECT\s+.*\bdate\b', param_query, re.IGNORECASE))
        
        # Only add ORDER BY date if:
        # 1. It's a direct transaction query
        # 2. No CTE, no GROUP BY, no existing ORDER BY
        # 3. The SELECT includes date or * (so date column exists in result)
        if (has_direct_transaction_query and not has_cte and not has_group_by 
            and 'ORDER BY' not in param_query.upper() and has_select_star_or_date):
            # Add before LIMIT if present, otherwise at end
            if 'LIMIT' in param_query.upper():
                idx = param_query.upper().find('LIMIT')
                param_query = param_query[:idx] + ' ORDER BY date DESC ' + param_query[idx:]
            else:
                param_query += ' ORDER BY date DESC'
        
        # Add result limit if not present
        if 'LIMIT' not in param_query.upper():
            param_query += f' LIMIT {self.MAX_RESULTS}'
        
        # Final debug check
        placeholder_count = param_query.count('%s')
        logger.debug(f"Final query has {placeholder_count} placeholders and {len(params)} params")
        if placeholder_count != len(params):
            logger.error(f"Parameter mismatch! Query: {param_query[:500]}")
            logger.error(f"Params: {params}")
        
        return param_query, params
    
    async def _execute_with_retry(self, query: str, params: list, 
                                  correlation_id: str) -> List[Dict]:
        """
        Execute SQL with retry logic, timeouts, and read-only safety.
        """
        for attempt in range(self.MAX_RETRIES):
            conn = None
            try:
                conn = self.db_pool.getconn()
                
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    # Guard rails for long queries; read-only session
                    cur.execute("SET LOCAL statement_timeout = %s;", (self.QUERY_TIMEOUT * 1000,))
                    cur.execute("SET LOCAL idle_in_transaction_session_timeout = %s;", (self.QUERY_TIMEOUT * 1000,))
                    cur.execute("SET LOCAL transaction_read_only = on;")
                    
                    # Execute the actual query
                    logger.debug(f"[{correlation_id}] Executing query with {len(params)} params: {params}")
                    logger.debug(f"[{correlation_id}] Query (first 500 chars): {query[:500]}")
                    
                    # Execute with proper parameter handling
                    if params and len(params) > 0:
                        # Convert list to tuple for psycopg2
                        params_tuple = tuple(params)
                        logger.debug(f"[{correlation_id}] Params tuple: {params_tuple}")
                        cur.execute(query, params_tuple)
                    else:
                        # No parameters needed
                        logger.debug(f"[{correlation_id}] No params, executing query directly")
                        cur.execute(query)
                    results = cur.fetchall()
                
                return results
                
            except psycopg2.OperationalError as e:
                logger.warning(f"[{correlation_id}] Attempt {attempt + 1} failed: {e}")
                if conn:
                    # Close broken connection
                    self.db_pool.putconn(conn, close=True)
                    conn = None
                if attempt < self.MAX_RETRIES - 1:
                    await asyncio.sleep(0.5 * (2 ** attempt))  # async backoff
                else:
                    raise
            except Exception:
                if conn:
                    self.db_pool.putconn(conn)  # return healthy conn
                    conn = None
                raise
            finally:
                if conn:
                    self.db_pool.putconn(conn)  # happy path return
    
    def _process_result(self, result: List[Dict]) -> List[Dict]:
        """
        Process query results for JSON serialization.
        """
        if not result:
            return []
            
        processed = []
        for row in result:
            processed_row = {}
            for key, value in row.items():
                if isinstance(value, Decimal):
                    processed_row[key] = float(value)
                elif isinstance(value, datetime):
                    processed_row[key] = value.isoformat()
                else:
                    processed_row[key] = value
            processed.append(processed_row)
        return processed
    
    def _generate_cache_key(self, query: str, user_id: str, user_context: str = '', merchant_hints: List[str] = None) -> str:
        """
        Generate cache key for query results including context.
        """
        # Include context and merchant hints for cache stability
        mh = json.dumps(sorted(merchant_hints or []))
        ctx_hash = hashlib.md5((user_context + mh).encode()).hexdigest()[:8]
        key_string = f"{query}:{user_id}:{ctx_hash}"
        return hashlib.md5(key_string.encode()).hexdigest()
    
    def _get_cached_result(self, cache_key: str) -> Optional[Dict]:
        """
        Get cached result if still valid.
        """
        if cache_key in self.query_cache:
            timestamp = self.cache_timestamps.get(cache_key, 0)
            if time.time() - timestamp < self.CACHE_TTL:
                cached = self.query_cache[cache_key]
                # Return a shallow copy with cached flag to avoid mutating the cache
                if isinstance(cached, dict) and 'success' in cached:
                    out = {**cached, 'metadata': {**cached.get('metadata', {}), 'cached': True}}
                    return out
        return None
    
    def _cache_result(self, cache_key: str, result: Any):
        """
        Cache query result.
        """
        self.query_cache[cache_key] = result
        self.cache_timestamps[cache_key] = time.time()
        
        # Limit cache size
        if len(self.query_cache) > 100:
            oldest_key = min(self.cache_timestamps, key=self.cache_timestamps.get)
            del self.query_cache[oldest_key]
            del self.cache_timestamps[oldest_key]