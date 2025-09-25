# SQL Agent - Database Query Generation System

## Overview

The SQL Agent is a specialized AI component that translates natural language financial questions into optimized, secure PostgreSQL queries. It leverages GPT-4's understanding with domain-specific financial database knowledge to generate accurate queries while maintaining strict security and performance standards.

## Agent Architecture

### Core SQL Agent
**Location**: `/TRUEFIBACKEND/agents/sql_agent.py`

```python
class SQLAgent:
    """Generates SQL queries from natural language questions"""

    def __init__(self):
        self.client = openai.AsyncOpenAI(api_key=OPENAI_API_KEY)
        self.sanitizer = SQLSanitizer()
        self.validator = SQLValidator()
        self.query_cache = {}
```

### Enhanced SQL Agent
**Location**: `/TRUEFIBACKEND/agents/sql_agent_enhanced.py`

```python
class EnhancedSQLAgent(SQLAgent):
    """Advanced SQL generation with intent routing and optimization"""

    def __init__(self):
        super().__init__()
        self.intent_router = IntentRouter()
        self.query_optimizer = QueryOptimizer()
        self.performance_tracker = PerformanceTracker()
```

## Input Processing Pipeline

### 1. Request Structure

```json
{
    "kind": "sql_request",
    "question": "How much did I spend on dining out last month?",
    "schema_card": {
        "transactions": {
            "columns": ["id", "user_id", "amount", "date", "category", "merchant_name"],
            "indexes": ["idx_user_date", "idx_category"],
            "row_count": 50000
        },
        "accounts": {
            "columns": ["id", "user_id", "name", "type", "balance"],
            "indexes": ["idx_user_id"],
            "row_count": 10
        }
    },
    "context": {
        "user_id": "550e8400-e29b-41d4-a716-446655440000",
        "current_date": "2024-01-20",
        "user_timezone": "America/New_York",
        "fiscal_year_start": "2024-01-01"
    },
    "constraints": {
        "max_rows": 5000,
        "timeout_ms": 5000,
        "exclude_pending": true,
        "prefer_monthly_bins": true,
        "use_materialized_views": true
    }
}
```

### 2. Intent Classification

```python
def classify_sql_intent(question: str) -> SQLIntent:
    """Classify the type of SQL query needed"""

    intent_patterns = {
        'aggregation': [
            r'how much',
            r'total',
            r'sum',
            r'average',
            r'count'
        ],
        'comparison': [
            r'compare',
            r'versus',
            r'difference',
            r'change',
            r'trend'
        ],
        'search': [
            r'find',
            r'show me',
            r'list',
            r'which',
            r'where'
        ],
        'time_series': [
            r'over time',
            r'monthly',
            r'weekly',
            r'trend',
            r'history'
        ]
    }

    for intent, patterns in intent_patterns.items():
        if any(re.search(p, question.lower()) for p in patterns):
            return SQLIntent(intent)

    return SQLIntent.GENERAL
```

## SQL Generation Process

### 1. Schema Analysis

```python
def analyze_required_tables(question: str, schema_card: Dict) -> List[str]:
    """Determine which tables are needed for the query"""

    table_keywords = {
        'transactions': ['spend', 'bought', 'purchase', 'payment', 'transaction'],
        'accounts': ['balance', 'account', 'bank', 'credit'],
        'budgets': ['budget', 'limit', 'allocation'],
        'goals': ['goal', 'target', 'saving for'],
        'holdings': ['investment', 'portfolio', 'stock', 'position'],
        'recurring_income': ['income', 'salary', 'paycheck']
    }

    required_tables = set()

    for table, keywords in table_keywords.items():
        if any(keyword in question.lower() for keyword in keywords):
            required_tables.add(table)

    # Add dependent tables
    if 'budget_categories' in required_tables:
        required_tables.add('budgets')

    return list(required_tables)
```

### 2. Time Range Detection

```python
def extract_time_range(question: str, current_date: datetime) -> Dict:
    """Extract time boundaries from natural language"""

    time_patterns = {
        'last_month': {
            'start': "DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')",
            'end': "DATE_TRUNC('month', CURRENT_DATE)"
        },
        'this_month': {
            'start': "DATE_TRUNC('month', CURRENT_DATE)",
            'end': "CURRENT_DATE"
        },
        'last_year': {
            'start': "DATE_TRUNC('year', CURRENT_DATE - INTERVAL '1 year')",
            'end': "DATE_TRUNC('year', CURRENT_DATE)"
        },
        'last_n_days': {
            'pattern': r'last (\d+) days?',
            'start': "CURRENT_DATE - INTERVAL '{n} days'",
            'end': "CURRENT_DATE"
        },
        'specific_month': {
            'pattern': r'(january|february|march|april|may|june|july|august|september|october|november|december)',
            'start': "DATE_TRUNC('month', DATE '{year}-{month}-01')",
            'end': "DATE_TRUNC('month', DATE '{year}-{month}-01') + INTERVAL '1 month'"
        }
    }

    # Check each pattern
    for key, config in time_patterns.items():
        if 'pattern' in config:
            match = re.search(config['pattern'], question.lower())
            if match:
                return parse_time_pattern(config, match, current_date)
        elif key in question.lower():
            return config

    # Default to last 30 days
    return {
        'start': "CURRENT_DATE - INTERVAL '30 days'",
        'end': "CURRENT_DATE"
    }
```

### 3. Query Template Selection

```python
SQL_TEMPLATES = {
    'spending_by_category': """
        SELECT
            category,
            SUM(ABS(amount)) as total_spent,
            COUNT(*) as transaction_count,
            AVG(ABS(amount)) as avg_transaction,
            MIN(date) as first_transaction,
            MAX(date) as last_transaction
        FROM transactions
        WHERE user_id = $1
            AND date >= $2
            AND date < $3
            AND amount < 0
            {additional_filters}
        GROUP BY category
        ORDER BY total_spent DESC
        LIMIT $4
    """,

    'account_balances': """
        SELECT
            a.id,
            a.name,
            a.type,
            a.subtype,
            a.balance,
            a.available_balance,
            a.institution_name,
            a.updated_at,
            EXTRACT(HOURS FROM (NOW() - a.updated_at)) as hours_since_update
        FROM accounts a
        WHERE a.user_id = $1
            AND a.is_active = true
        ORDER BY a.balance DESC
    """,

    'net_worth_calculation': """
        WITH assets AS (
            SELECT
                'Bank Accounts' as category,
                SUM(balance) as value
            FROM accounts
            WHERE user_id = $1
                AND balance > 0
                AND is_active = true

            UNION ALL

            SELECT
                'Investments' as category,
                SUM(h.institution_value) as value
            FROM holdings h
            JOIN accounts a ON h.account_id = a.id
            WHERE a.user_id = $1

            UNION ALL

            SELECT
                'Manual Assets' as category,
                SUM(value) as value
            FROM manual_assets
            WHERE user_id = $1
        ),
        liabilities AS (
            SELECT
                'Credit Cards' as category,
                SUM(ABS(balance)) as value
            FROM accounts
            WHERE user_id = $1
                AND type = 'credit'
                AND balance < 0
                AND is_active = true

            UNION ALL

            SELECT
                'Loans' as category,
                SUM(ABS(balance)) as value
            FROM accounts
            WHERE user_id = $1
                AND type = 'loan'
                AND balance < 0
                AND is_active = true

            UNION ALL

            SELECT
                'Manual Liabilities' as category,
                SUM(balance) as value
            FROM manual_liabilities
            WHERE user_id = $1
        )
        SELECT
            COALESCE(SUM(a.value), 0) as total_assets,
            COALESCE(SUM(l.value), 0) as total_liabilities,
            COALESCE(SUM(a.value), 0) - COALESCE(SUM(l.value), 0) as net_worth,
            jsonb_agg(DISTINCT jsonb_build_object('category', a.category, 'value', a.value)) as asset_breakdown,
            jsonb_agg(DISTINCT jsonb_build_object('category', l.category, 'value', l.value)) as liability_breakdown
        FROM assets a
        CROSS JOIN liabilities l
    """,

    'spending_trend': """
        WITH monthly_spending AS (
            SELECT
                DATE_TRUNC('month', date) as month,
                category,
                SUM(ABS(amount)) as total
            FROM transactions
            WHERE user_id = $1
                AND date >= $2
                AND date < $3
                AND amount < 0
            GROUP BY DATE_TRUNC('month', date), category
        ),
        month_series AS (
            SELECT generate_series(
                DATE_TRUNC('month', $2::date),
                DATE_TRUNC('month', $3::date - INTERVAL '1 day'),
                '1 month'::interval
            )::date as month
        )
        SELECT
            ms.month,
            COALESCE(SUM(ms_data.total), 0) as total_spending,
            jsonb_object_agg(
                COALESCE(ms_data.category, 'None'),
                COALESCE(ms_data.total, 0)
            ) as category_breakdown
        FROM month_series ms
        LEFT JOIN monthly_spending ms_data ON ms.month = ms_data.month
        GROUP BY ms.month
        ORDER BY ms.month
    """
}
```

### 4. Dynamic Query Construction

```python
async def generate_query(self, request: Dict) -> Dict:
    """Generate SQL query using LLM with templates and validation"""

    # Step 1: Identify intent and required tables
    intent = classify_sql_intent(request['question'])
    tables = analyze_required_tables(request['question'], request['schema_card'])

    # Step 2: Check for template match
    template_key = f"{intent.value}_{tables[0]}" if tables else intent.value
    if template_key in SQL_TEMPLATES:
        return self.build_from_template(template_key, request)

    # Step 3: Generate custom query using LLM
    prompt = self.build_generation_prompt(request, intent, tables)

    response = await self.client.chat.completions.create(
        model="gpt-4-0125-preview",
        messages=[
            {"role": "system", "content": SQL_GENERATION_SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ],
        temperature=0.3,  # Low temperature for consistency
        max_tokens=2000
    )

    # Step 4: Parse and validate response
    query_json = self.parse_llm_response(response.choices[0].message.content)

    # Step 5: Security validation
    validated_query = self.sanitizer.sanitize(query_json['sql'])

    # Step 6: Performance optimization
    optimized_query = self.query_optimizer.optimize(validated_query)

    return {
        'sql_plan': {
            'intent': intent.value,
            'sql': optimized_query,
            'parameters': query_json.get('parameters', []),
            'explanation': query_json.get('explanation', ''),
            'tables_used': tables,
            'estimated_cost': self.estimate_query_cost(optimized_query)
        },
        'metadata': {
            'generated_by': 'llm' if not template_key in SQL_TEMPLATES else 'template',
            'intent_confidence': intent.confidence,
            'optimization_applied': True
        }
    }
```

## Query Optimization

### 1. Index Usage Optimization

```python
class QueryOptimizer:
    """Optimize SQL queries for performance"""

    def optimize(self, query: str) -> str:
        """Apply query optimizations"""

        optimizations = [
            self.use_covering_indexes,
            self.optimize_date_filters,
            self.push_down_predicates,
            self.use_materialized_views,
            self.optimize_aggregations
        ]

        optimized = query
        for optimization in optimizations:
            optimized = optimization(optimized)

        return optimized

    def use_covering_indexes(self, query: str) -> str:
        """Ensure query uses available indexes"""

        index_hints = {
            'transactions': {
                'user_date': 'CREATE INDEX idx_user_date ON transactions(user_id, date DESC)',
                'category': 'CREATE INDEX idx_category ON transactions(user_id, category)',
                'amount': 'CREATE INDEX idx_amount ON transactions(user_id, amount)'
            }
        }

        # Add index hints where appropriate
        if 'transactions' in query and 'user_id' in query and 'date' in query:
            # Query will use idx_user_date
            pass

        return query

    def optimize_date_filters(self, query: str) -> str:
        """Optimize date range filters"""

        # Replace BETWEEN with >= and <
        query = re.sub(
            r"date BETWEEN '([^']+)' AND '([^']+)'",
            r"date >= '\1' AND date < '\2'::date + INTERVAL '1 day'",
            query
        )

        # Use DATE_TRUNC for month/year boundaries
        query = re.sub(
            r"EXTRACT\(MONTH FROM date\) = (\d+)",
            r"date >= DATE_TRUNC('month', DATE '2024-\1-01') AND date < DATE_TRUNC('month', DATE '2024-\1-01') + INTERVAL '1 month'",
            query
        )

        return query
```

### 2. Materialized View Usage

```python
MATERIALIZED_VIEWS = {
    'daily_spending': """
        CREATE MATERIALIZED VIEW mv_daily_spending AS
        SELECT
            user_id,
            DATE(date) as spend_date,
            category,
            SUM(ABS(amount)) as total,
            COUNT(*) as transaction_count
        FROM transactions
        WHERE amount < 0
        GROUP BY user_id, DATE(date), category
        WITH DATA;

        CREATE INDEX idx_mv_daily_spending ON mv_daily_spending(user_id, spend_date);
    """,

    'account_snapshot': """
        CREATE MATERIALIZED VIEW mv_account_snapshot AS
        SELECT
            user_id,
            DATE(updated_at) as snapshot_date,
            SUM(CASE WHEN balance > 0 THEN balance ELSE 0 END) as total_assets,
            SUM(CASE WHEN balance < 0 THEN ABS(balance) ELSE 0 END) as total_liabilities,
            jsonb_object_agg(id, balance) as account_balances
        FROM accounts
        WHERE is_active = true
        GROUP BY user_id, DATE(updated_at)
        WITH DATA;
    """
}

def use_materialized_views(self, query: str) -> str:
    """Replace base table queries with materialized views where possible"""

    # Check if query can use daily spending view
    if 'transactions' in query and 'SUM' in query and 'GROUP BY' in query:
        if 'DATE(' in query or 'date >=' in query:
            # Can potentially use mv_daily_spending
            return self.rewrite_for_materialized_view(query, 'daily_spending')

    return query
```

## Security Implementation

### 1. SQL Injection Prevention

```python
class SQLSanitizer:
    """Sanitize and validate SQL queries for security"""

    def sanitize(self, query: str) -> str:
        """Remove dangerous SQL patterns"""

        # Forbidden patterns
        forbidden = [
            r';\s*DROP',
            r';\s*DELETE',
            r';\s*UPDATE',
            r';\s*INSERT',
            r';\s*ALTER',
            r';\s*CREATE',
            r'--',
            r'/\*.*\*/',
            r'xp_cmdshell',
            r'UNION\s+ALL\s+SELECT',
            r'pg_sleep',
            r'pg_stat',
            r'information_schema'
        ]

        for pattern in forbidden:
            if re.search(pattern, query, re.IGNORECASE):
                raise SQLInjectionError(f"Forbidden pattern detected: {pattern}")

        # Ensure parameterized queries
        if not self.has_parameters(query):
            query = self.parameterize(query)

        return query

    def parameterize(self, query: str) -> str:
        """Convert literal values to parameters"""

        # Replace user_id literals
        query = re.sub(
            r"user_id\s*=\s*'([^']+)'",
            "user_id = $1",
            query
        )

        # Replace date literals
        param_count = 2
        def replace_date(match):
            nonlocal param_count
            result = f"${param_count}"
            param_count += 1
            return result

        query = re.sub(
            r"'(\d{4}-\d{2}-\d{2})'",
            replace_date,
            query
        )

        return query
```

### 2. Access Control

```python
def enforce_access_control(query: str, user_id: str) -> str:
    """Ensure query only accesses user's own data"""

    tables_with_user_id = [
        'transactions', 'accounts', 'budgets', 'goals',
        'holdings', 'manual_assets', 'manual_liabilities'
    ]

    for table in tables_with_user_id:
        if table in query:
            # Check for user_id filter
            pattern = f"{table}.*WHERE"
            if re.search(pattern, query, re.IGNORECASE):
                if f"user_id = ${param_num}" not in query:
                    raise SecurityError(f"Query on {table} must filter by user_id")

    return query
```

## Performance Monitoring

### 1. Query Performance Tracking

```python
class PerformanceTracker:
    """Track SQL query performance metrics"""

    def __init__(self):
        self.metrics = {
            'query_count': Counter(),
            'query_duration': Histogram(),
            'query_rows': Histogram(),
            'cache_hits': Counter(),
            'slow_queries': Counter()
        }

    async def track_execution(self, query: str, params: List, execution_func):
        """Track query execution metrics"""

        start_time = time.time()
        query_hash = hashlib.md5(query.encode()).hexdigest()

        try:
            # Check cache
            if query_hash in self.query_cache:
                self.metrics['cache_hits'].inc()
                return self.query_cache[query_hash]

            # Execute query
            result = await execution_func(query, params)

            # Track metrics
            duration_ms = (time.time() - start_time) * 1000
            self.metrics['query_duration'].observe(duration_ms)
            self.metrics['query_rows'].observe(len(result.get('data', [])))

            if duration_ms > 1000:  # Slow query threshold
                self.metrics['slow_queries'].inc()
                logger.warning(f"Slow query detected: {duration_ms}ms")

            # Cache result
            if duration_ms < 100:  # Only cache fast queries
                self.query_cache[query_hash] = result

            return result

        except Exception as e:
            self.metrics['query_errors'].inc()
            raise
```

### 2. Query Plan Analysis

```python
async def analyze_query_plan(self, query: str) -> Dict:
    """Analyze query execution plan"""

    explain_query = f"EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) {query}"

    result = await self.db_pool.execute_query(explain_query)
    plan = result[0]['QUERY PLAN'][0]

    analysis = {
        'total_cost': plan['Plan']['Total Cost'],
        'execution_time_ms': plan['Execution Time'],
        'planning_time_ms': plan['Planning Time'],
        'uses_index': self.check_index_usage(plan),
        'scan_types': self.extract_scan_types(plan),
        'join_types': self.extract_join_types(plan),
        'bottlenecks': self.identify_bottlenecks(plan)
    }

    return analysis
```

## Query Result Processing

### 1. Result Formatting

```python
def format_query_result(raw_result: List[Tuple], columns: List[str]) -> Dict:
    """Format raw query results for agent consumption"""

    formatted = {
        'data': [],
        'columns': columns,
        'row_count': len(raw_result),
        'summary': {}
    }

    # Convert tuples to dictionaries
    for row in raw_result:
        formatted['data'].append(dict(zip(columns, row)))

    # Generate summary statistics
    if formatted['data']:
        formatted['summary'] = generate_summary_stats(formatted['data'])

    return formatted
```

### 2. Data Type Conversion

```python
def convert_data_types(data: List[Dict]) -> List[Dict]:
    """Convert PostgreSQL types to JSON-serializable types"""

    for row in data:
        for key, value in row.items():
            if isinstance(value, Decimal):
                row[key] = float(value)
            elif isinstance(value, datetime):
                row[key] = value.isoformat()
            elif isinstance(value, UUID):
                row[key] = str(value)
            elif isinstance(value, bytes):
                row[key] = value.decode('utf-8')

    return data
```

## Error Handling

### 1. Query Error Recovery

```python
async def handle_query_error(self, error: Exception, query: str) -> Dict:
    """Handle and recover from query errors"""

    error_handlers = {
        'column_not_found': self.handle_column_error,
        'table_not_found': self.handle_table_error,
        'syntax_error': self.handle_syntax_error,
        'timeout': self.handle_timeout_error,
        'permission_denied': self.handle_permission_error
    }

    error_type = self.classify_error(error)
    handler = error_handlers.get(error_type, self.handle_generic_error)

    return await handler(error, query)
```

### 2. Fallback Strategies

```python
async def execute_with_fallback(self, primary_query: str, fallback_query: str):
    """Try primary query, fall back if it fails"""

    try:
        return await self.execute_query(primary_query)
    except Exception as e:
        logger.warning(f"Primary query failed: {e}, trying fallback")
        return await self.execute_query(fallback_query)
```

## Advanced Features

### 1. Query Composition

```python
class QueryComposer:
    """Compose complex queries from building blocks"""

    def compose_analytical_query(self, components: Dict) -> str:
        """Build complex analytical queries"""

        base_query = components.get('base', '')
        aggregations = components.get('aggregations', [])
        filters = components.get('filters', [])
        grouping = components.get('grouping', [])
        ordering = components.get('ordering', [])

        query_parts = [base_query]

        if filters:
            query_parts.append(f"WHERE {' AND '.join(filters)}")

        if grouping:
            query_parts.append(f"GROUP BY {', '.join(grouping)}")

        if aggregations:
            # Add to SELECT clause
            pass

        if ordering:
            query_parts.append(f"ORDER BY {', '.join(ordering)}")

        return '\n'.join(query_parts)
```

### 2. Adaptive Query Generation

```python
async def generate_adaptive_query(self, request: Dict, user_history: List) -> str:
    """Generate queries that adapt to user patterns"""

    # Analyze user's previous queries
    common_filters = self.extract_common_filters(user_history)
    preferred_grouping = self.extract_preferred_grouping(user_history)
    typical_time_ranges = self.extract_time_ranges(user_history)

    # Adapt current query based on patterns
    adapted_request = request.copy()
    adapted_request['learned_preferences'] = {
        'common_filters': common_filters,
        'preferred_grouping': preferred_grouping,
        'typical_time_ranges': typical_time_ranges
    }

    return await self.generate_query(adapted_request)
```

## Testing & Validation

### Query Validation Suite

```python
class SQLValidator:
    """Comprehensive SQL query validation"""

    def validate(self, query: str, schema: Dict) -> Tuple[bool, List[str]]:
        """Validate query against schema and rules"""

        validations = [
            self.validate_syntax,
            self.validate_schema,
            self.validate_security,
            self.validate_performance,
            self.validate_business_logic
        ]

        issues = []
        for validation in validations:
            is_valid, validation_issues = validation(query, schema)
            if not is_valid:
                issues.extend(validation_issues)

        return len(issues) == 0, issues
```

---

**Next Document**: [07_MODELING_AGENT.md](./07_MODELING_AGENT.md) - Complete modeling agent and analysis pipeline