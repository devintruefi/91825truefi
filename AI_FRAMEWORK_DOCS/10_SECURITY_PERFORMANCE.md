# Security Layers & Performance Optimization

## Overview

This document details the comprehensive security architecture and performance optimization strategies implemented throughout the TrueFi AI Financial Advisor framework. Security is paramount given the sensitive financial data, while performance ensures real-time, responsive interactions.

## Security Architecture

### Multi-Layer Security Model

```
Layer 1: Network Security (TLS, Firewall, DDoS Protection)
    ↓
Layer 2: Authentication & Authorization (JWT, OAuth, MFA)
    ↓
Layer 3: Application Security (Input Validation, CORS, Rate Limiting)
    ↓
Layer 4: Data Security (Encryption, Row-Level Security, PII Protection)
    ↓
Layer 5: Agent Security (SQL Injection Prevention, Query Sanitization)
    ↓
Layer 6: Audit & Monitoring (Logging, Anomaly Detection, Compliance)
```

## Authentication & Authorization

### 1. JWT Implementation

```python
class JWTManager:
    """Secure JWT token management"""

    def __init__(self):
        self.secret_key = os.getenv("JWT_SECRET")
        self.algorithm = "HS256"
        self.token_expiry = 3600  # 1 hour
        self.refresh_expiry = 604800  # 7 days

    def generate_tokens(self, user_id: str, email: str) -> Dict:
        """Generate access and refresh tokens"""

        # Access token payload
        access_payload = {
            "user_id": user_id,
            "email": email,
            "type": "access",
            "iat": datetime.utcnow(),
            "exp": datetime.utcnow() + timedelta(seconds=self.token_expiry),
            "jti": str(uuid.uuid4())  # Unique token ID for revocation
        }

        # Refresh token payload
        refresh_payload = {
            "user_id": user_id,
            "type": "refresh",
            "iat": datetime.utcnow(),
            "exp": datetime.utcnow() + timedelta(seconds=self.refresh_expiry),
            "jti": str(uuid.uuid4())
        }

        access_token = jwt.encode(access_payload, self.secret_key, self.algorithm)
        refresh_token = jwt.encode(refresh_payload, self.secret_key, self.algorithm)

        # Store token metadata for tracking
        self.store_token_metadata(access_payload['jti'], user_id, 'access')
        self.store_token_metadata(refresh_payload['jti'], user_id, 'refresh')

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "Bearer",
            "expires_in": self.token_expiry
        }

    def verify_token(self, token: str, token_type: str = "access") -> Dict:
        """Verify and decode token"""

        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])

            # Verify token type
            if payload.get("type") != token_type:
                raise InvalidTokenError("Invalid token type")

            # Check if token is revoked
            if self.is_token_revoked(payload.get("jti")):
                raise RevokedTokenError("Token has been revoked")

            return payload

        except jwt.ExpiredSignatureError:
            raise ExpiredTokenError("Token has expired")
        except jwt.InvalidTokenError as e:
            raise InvalidTokenError(f"Invalid token: {str(e)}")
```

### 2. Multi-Factor Authentication

```python
class MFAManager:
    """Multi-factor authentication system"""

    def __init__(self):
        self.totp_issuer = "TrueFi"
        self.backup_codes_count = 10

    def setup_totp(self, user_id: str) -> Dict:
        """Setup TOTP-based 2FA"""

        # Generate secret
        secret = pyotp.random_base32()

        # Create provisioning URI
        user_email = self.get_user_email(user_id)
        provisioning_uri = pyotp.totp.TOTP(secret).provisioning_uri(
            name=user_email,
            issuer_name=self.totp_issuer
        )

        # Generate QR code
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(provisioning_uri)
        qr.make(fit=True)

        # Store encrypted secret
        encrypted_secret = self.encrypt_secret(secret)
        self.store_mfa_secret(user_id, encrypted_secret)

        # Generate backup codes
        backup_codes = self.generate_backup_codes()
        self.store_backup_codes(user_id, backup_codes)

        return {
            "secret": secret,
            "provisioning_uri": provisioning_uri,
            "qr_code": self.qr_to_base64(qr),
            "backup_codes": backup_codes
        }

    def verify_totp(self, user_id: str, code: str) -> bool:
        """Verify TOTP code"""

        # Get encrypted secret
        encrypted_secret = self.get_mfa_secret(user_id)
        if not encrypted_secret:
            return False

        # Decrypt secret
        secret = self.decrypt_secret(encrypted_secret)

        # Verify code with time window
        totp = pyotp.TOTP(secret)
        return totp.verify(code, valid_window=1)  # Allow 30 seconds window
```

### 3. Row-Level Security

```python
class RowLevelSecurity:
    """Enforce data access at row level"""

    def apply_user_filter(self, query: str, user_id: str, table: str) -> str:
        """Add user_id filter to queries"""

        user_tables = {
            'accounts': 'user_id',
            'transactions': 'user_id',
            'budgets': 'user_id',
            'goals': 'user_id',
            'holdings': 'accounts.user_id',
            'manual_assets': 'user_id',
            'manual_liabilities': 'user_id'
        }

        if table not in user_tables:
            return query

        user_column = user_tables[table]

        # Parse query and add WHERE clause
        if 'WHERE' in query.upper():
            # Add to existing WHERE
            query = query.replace(
                'WHERE',
                f"WHERE {user_column} = ${self.get_next_param_num(query)} AND"
            )
        else:
            # Add new WHERE
            from_index = query.upper().find('FROM')
            if from_index >= 0:
                end_of_from = query.find(' ', from_index + 5)
                if end_of_from < 0:
                    end_of_from = len(query)
                query = (
                    query[:end_of_from] +
                    f" WHERE {user_column} = ${self.get_next_param_num(query)}" +
                    query[end_of_from:]
                )

        return query
```

## Data Security

### 1. Encryption at Rest

```python
class DataEncryption:
    """Encrypt sensitive data at rest"""

    def __init__(self):
        self.key = self.load_or_generate_key()
        self.cipher = Fernet(self.key)

    def encrypt_field(self, data: str) -> str:
        """Encrypt a field value"""

        if not data:
            return data

        encrypted = self.cipher.encrypt(data.encode())
        return encrypted.decode()

    def decrypt_field(self, encrypted_data: str) -> str:
        """Decrypt a field value"""

        if not encrypted_data:
            return encrypted_data

        decrypted = self.cipher.decrypt(encrypted_data.encode())
        return decrypted.decode()

    def encrypt_pii_fields(self, record: Dict) -> Dict:
        """Encrypt PII fields in a record"""

        pii_fields = [
            'ssn', 'tax_id', 'bank_account_number',
            'credit_card_number', 'driver_license'
        ]

        encrypted_record = record.copy()

        for field in pii_fields:
            if field in encrypted_record and encrypted_record[field]:
                encrypted_record[field] = self.encrypt_field(encrypted_record[field])

        return encrypted_record
```

### 2. Data Masking

```python
class DataMasking:
    """Mask sensitive data in responses"""

    def mask_response(self, data: Any, user_role: str) -> Any:
        """Apply masking based on user role"""

        if isinstance(data, dict):
            return self.mask_dict(data, user_role)
        elif isinstance(data, list):
            return [self.mask_response(item, user_role) for item in data]
        else:
            return data

    def mask_dict(self, data: Dict, user_role: str) -> Dict:
        """Mask dictionary fields"""

        masked = data.copy()

        # Define masking rules
        masking_rules = {
            'account_number': lambda x: self.mask_account_number(x),
            'ssn': lambda x: self.mask_ssn(x),
            'credit_card': lambda x: self.mask_credit_card(x),
            'email': lambda x: self.mask_email(x) if user_role != 'owner' else x,
            'phone': lambda x: self.mask_phone(x) if user_role != 'owner' else x
        }

        for field, masking_func in masking_rules.items():
            if field in masked and masked[field]:
                masked[field] = masking_func(masked[field])

        return masked

    def mask_account_number(self, account: str) -> str:
        """Mask account number showing only last 4 digits"""
        if len(account) <= 4:
            return account
        return '*' * (len(account) - 4) + account[-4:]

    def mask_ssn(self, ssn: str) -> str:
        """Mask SSN showing only last 4 digits"""
        cleaned = re.sub(r'[^0-9]', '', ssn)
        if len(cleaned) != 9:
            return '***-**-****'
        return f"***-**-{cleaned[-4:]}"
```

## SQL Injection Prevention

### 1. Query Sanitization

```python
class SQLSanitizer:
    """Comprehensive SQL injection prevention"""

    def __init__(self):
        self.forbidden_patterns = [
            r';\s*DROP',
            r';\s*DELETE',
            r';\s*UPDATE',
            r';\s*INSERT',
            r';\s*ALTER',
            r';\s*TRUNCATE',
            r'--',
            r'/\*.*\*/',
            r'UNION\s+ALL\s+SELECT',
            r'OR\s+1\s*=\s*1',
            r"OR\s+'[^']*'\s*=\s*'[^']*'",
            r'xp_cmdshell',
            r'sp_executesql',
            r'EXEC\s*\(',
            r'EXECUTE\s*\('
        ]

    def sanitize_query(self, query: str) -> str:
        """Sanitize SQL query"""

        # Check for forbidden patterns
        for pattern in self.forbidden_patterns:
            if re.search(pattern, query, re.IGNORECASE):
                raise SQLInjectionAttempt(f"Forbidden pattern detected: {pattern}")

        # Ensure parameterized queries
        if self.has_literal_values(query):
            query = self.parameterize_query(query)

        # Validate query structure
        if not self.is_valid_structure(query):
            raise InvalidQueryStructure("Invalid SQL structure")

        return query

    def parameterize_query(self, query: str) -> str:
        """Convert literals to parameters"""

        param_count = 1

        # Replace string literals
        def replace_string(match):
            nonlocal param_count
            result = f"${param_count}"
            param_count += 1
            return result

        query = re.sub(r"'([^']*)'", replace_string, query)

        # Replace numeric literals in WHERE clause
        def replace_number(match):
            nonlocal param_count
            if 'WHERE' in match.group(0):
                result = f"${param_count}"
                param_count += 1
                return match.group(1) + result
            return match.group(0)

        query = re.sub(r'(=\s*)(\d+)', replace_number, query)

        return query
```

### 2. Prepared Statements

```python
class PreparedStatements:
    """Use prepared statements for all queries"""

    def __init__(self):
        self.prepared_statements = {}

    async def prepare_statement(
        self,
        conn: asyncpg.Connection,
        name: str,
        query: str
    ) -> None:
        """Prepare a statement for reuse"""

        if name not in self.prepared_statements:
            await conn.prepare(query)
            self.prepared_statements[name] = query

    async def execute_prepared(
        self,
        conn: asyncpg.Connection,
        name: str,
        *params
    ) -> List[Record]:
        """Execute a prepared statement"""

        if name not in self.prepared_statements:
            raise ValueError(f"Statement {name} not prepared")

        stmt = await conn.prepare(self.prepared_statements[name])
        return await stmt.fetch(*params)
```

## Rate Limiting

### 1. API Rate Limiting

```python
class RateLimiter:
    """Implement rate limiting for API endpoints"""

    def __init__(self):
        self.limits = {
            'default': {'requests': 100, 'window': 60},  # 100 req/min
            'chat': {'requests': 30, 'window': 60},       # 30 req/min
            'sql': {'requests': 10, 'window': 60},        # 10 req/min
            'auth': {'requests': 5, 'window': 300}        # 5 req/5min
        }
        self.cache = {}

    async def check_rate_limit(
        self,
        user_id: str,
        endpoint: str
    ) -> Tuple[bool, Dict]:
        """Check if request is within rate limit"""

        limit_type = self.get_limit_type(endpoint)
        limit_config = self.limits[limit_type]

        key = f"{user_id}:{endpoint}"
        now = time.time()

        # Get or create bucket
        if key not in self.cache:
            self.cache[key] = {
                'requests': [],
                'blocked_until': 0
            }

        bucket = self.cache[key]

        # Check if currently blocked
        if bucket['blocked_until'] > now:
            return False, {
                'blocked': True,
                'retry_after': int(bucket['blocked_until'] - now)
            }

        # Remove old requests outside window
        window_start = now - limit_config['window']
        bucket['requests'] = [
            req_time for req_time in bucket['requests']
            if req_time > window_start
        ]

        # Check limit
        if len(bucket['requests']) >= limit_config['requests']:
            # Block for window duration
            bucket['blocked_until'] = now + limit_config['window']
            return False, {
                'blocked': True,
                'retry_after': limit_config['window']
            }

        # Add current request
        bucket['requests'].append(now)

        return True, {
            'remaining': limit_config['requests'] - len(bucket['requests']),
            'reset_at': int(window_start + limit_config['window'])
        }
```

## Performance Optimization

### 1. Database Query Optimization

```python
class QueryOptimizer:
    """Optimize database queries for performance"""

    def optimize_query(self, query: str, execution_plan: Dict) -> str:
        """Apply query optimizations based on execution plan"""

        optimizations = []

        # Check for missing indexes
        if self.needs_index(execution_plan):
            optimizations.append(self.suggest_index(execution_plan))

        # Check for full table scans
        if self.has_full_scan(execution_plan):
            query = self.add_limit_if_missing(query)
            query = self.optimize_where_clause(query)

        # Check for expensive joins
        if self.has_expensive_joins(execution_plan):
            query = self.optimize_joins(query)

        # Use materialized views where applicable
        query = self.use_materialized_views(query)

        # Add query hints
        query = self.add_query_hints(query, execution_plan)

        return query

    def add_query_hints(self, query: str, plan: Dict) -> str:
        """Add optimizer hints"""

        hints = []

        # Parallel execution for large datasets
        if self.should_parallelize(plan):
            hints.append("/*+ PARALLEL(4) */")

        # Index hints
        if self.should_force_index(plan):
            index_name = self.get_best_index(plan)
            hints.append(f"/*+ INDEX({index_name}) */")

        if hints:
            query = f"{' '.join(hints)} {query}"

        return query
```

### 2. Caching Strategy

```python
class CacheManager:
    """Multi-level caching system"""

    def __init__(self):
        self.memory_cache = MemoryCache(max_size=1000, ttl=300)
        self.redis_cache = RedisCache(ttl=3600)
        self.query_cache = QueryCache(ttl=60)

    async def get_with_cache(
        self,
        key: str,
        fetch_func: Callable,
        cache_level: str = 'all'
    ) -> Any:
        """Get data with multi-level caching"""

        # Level 1: Memory cache
        if cache_level in ['memory', 'all']:
            result = self.memory_cache.get(key)
            if result is not None:
                return result

        # Level 2: Redis cache
        if cache_level in ['redis', 'all']:
            result = await self.redis_cache.get(key)
            if result is not None:
                # Populate memory cache
                self.memory_cache.set(key, result)
                return result

        # Level 3: Query cache
        if cache_level in ['query', 'all']:
            result = self.query_cache.get(key)
            if result is not None:
                # Populate higher caches
                self.memory_cache.set(key, result)
                await self.redis_cache.set(key, result)
                return result

        # Fetch fresh data
        result = await fetch_func()

        # Populate all cache levels
        if cache_level in ['memory', 'all']:
            self.memory_cache.set(key, result)
        if cache_level in ['redis', 'all']:
            await self.redis_cache.set(key, result)
        if cache_level in ['query', 'all']:
            self.query_cache.set(key, result)

        return result
```

### 3. Connection Pooling

```python
class ConnectionPoolManager:
    """Manage database connection pools"""

    def __init__(self):
        self.pools = {}
        self.config = {
            'min_size': 5,
            'max_size': 20,
            'max_queries': 50000,
            'max_inactive_connection_lifetime': 300,
            'command_timeout': 10
        }

    async def create_pool(self, database_url: str) -> asyncpg.Pool:
        """Create optimized connection pool"""

        pool = await asyncpg.create_pool(
            database_url,
            min_size=self.config['min_size'],
            max_size=self.config['max_size'],
            max_queries=self.config['max_queries'],
            max_inactive_connection_lifetime=self.config['max_inactive_connection_lifetime'],
            command_timeout=self.config['command_timeout'],
            init=self.init_connection
        )

        return pool

    async def init_connection(self, conn: asyncpg.Connection) -> None:
        """Initialize connection with optimal settings"""

        # Set statement timeout
        await conn.execute("SET statement_timeout = '10s'")

        # Set work memory for complex queries
        await conn.execute("SET work_mem = '256MB'")

        # Enable query timing
        await conn.execute("SET track_io_timing = ON")

        # Prepare common statements
        await self.prepare_common_statements(conn)
```

### 4. Async Processing

```python
class AsyncProcessor:
    """Asynchronous processing for better performance"""

    async def process_parallel(
        self,
        tasks: List[Callable],
        max_concurrent: int = 10
    ) -> List[Any]:
        """Process tasks in parallel with concurrency limit"""

        semaphore = asyncio.Semaphore(max_concurrent)

        async def bounded_task(task):
            async with semaphore:
                return await task()

        results = await asyncio.gather(
            *[bounded_task(task) for task in tasks],
            return_exceptions=True
        )

        # Handle exceptions
        processed_results = []
        for result in results:
            if isinstance(result, Exception):
                logger.error(f"Task failed: {result}")
                processed_results.append(None)
            else:
                processed_results.append(result)

        return processed_results
```

## Monitoring & Alerting

### 1. Security Monitoring

```python
class SecurityMonitor:
    """Monitor for security threats"""

    def __init__(self):
        self.alert_thresholds = {
            'failed_auth_attempts': 5,
            'sql_injection_attempts': 1,
            'rate_limit_violations': 10,
            'unusual_data_access': 100
        }
        self.alert_manager = AlertManager()

    async def monitor_security_events(self) -> None:
        """Continuously monitor for security events"""

        while True:
            try:
                # Check failed authentication
                failed_auth = await self.check_failed_auth()
                if failed_auth > self.alert_thresholds['failed_auth_attempts']:
                    await self.alert_manager.send_alert(
                        'security',
                        'High failed authentication attempts',
                        {'count': failed_auth}
                    )

                # Check SQL injection attempts
                sql_attempts = await self.check_sql_injection_attempts()
                if sql_attempts > self.alert_thresholds['sql_injection_attempts']:
                    await self.alert_manager.send_alert(
                        'critical',
                        'SQL injection attempts detected',
                        {'count': sql_attempts}
                    )

                # Check unusual data access patterns
                unusual_access = await self.detect_unusual_access()
                if unusual_access:
                    await self.alert_manager.send_alert(
                        'warning',
                        'Unusual data access pattern detected',
                        unusual_access
                    )

                await asyncio.sleep(60)  # Check every minute

            except Exception as e:
                logger.error(f"Security monitoring error: {e}")
```

### 2. Performance Monitoring

```python
class PerformanceMonitor:
    """Monitor system performance"""

    def __init__(self):
        self.metrics = {
            'response_time': Histogram('response_time', 'Response time in ms'),
            'database_pool_usage': Gauge('db_pool_usage', 'Database pool utilization'),
            'cache_hit_rate': Gauge('cache_hit_rate', 'Cache hit rate percentage'),
            'active_connections': Gauge('active_connections', 'Active DB connections'),
            'query_execution_time': Histogram('query_execution_time', 'Query execution time'),
            'agent_processing_time': Histogram('agent_processing_time', 'Agent processing time'),
            'memory_usage': Gauge('memory_usage', 'Memory usage in MB'),
            'cpu_usage': Gauge('cpu_usage', 'CPU usage percentage')
        }

    async def collect_metrics(self) -> Dict:
        """Collect performance metrics"""

        metrics = {
            'timestamp': datetime.utcnow().isoformat(),
            'response_times': {
                'p50': self.metrics['response_time'].quantile(0.5),
                'p95': self.metrics['response_time'].quantile(0.95),
                'p99': self.metrics['response_time'].quantile(0.99)
            },
            'database': {
                'pool_usage': self.get_pool_usage(),
                'active_connections': self.get_active_connections(),
                'slow_queries': await self.get_slow_queries()
            },
            'cache': {
                'hit_rate': self.calculate_cache_hit_rate(),
                'memory_usage': self.get_cache_memory_usage()
            },
            'system': {
                'memory_usage_mb': psutil.Process().memory_info().rss / 1024 / 1024,
                'cpu_percent': psutil.Process().cpu_percent(),
                'thread_count': threading.active_count()
            }
        }

        return metrics
```

## Compliance & Audit

### 1. Audit Logging

```python
class AuditLogger:
    """Comprehensive audit logging"""

    async def log_access(
        self,
        user_id: str,
        resource_type: str,
        resource_id: str,
        action: str,
        result: str,
        metadata: Dict = None
    ) -> None:
        """Log data access for audit trail"""

        audit_entry = {
            'id': str(uuid.uuid4()),
            'timestamp': datetime.utcnow().isoformat(),
            'user_id': user_id,
            'resource_type': resource_type,
            'resource_id': resource_id,
            'action': action,
            'result': result,
            'ip_address': self.get_client_ip(),
            'user_agent': self.get_user_agent(),
            'metadata': metadata or {}
        }

        # Store in audit log
        await self.store_audit_log(audit_entry)

        # Check for suspicious patterns
        if self.is_suspicious_activity(audit_entry):
            await self.flag_suspicious_activity(audit_entry)
```

### 2. Data Retention

```python
class DataRetentionManager:
    """Manage data retention policies"""

    def __init__(self):
        self.retention_policies = {
            'chat_messages': 365,  # Days
            'audit_logs': 2555,     # 7 years
            'user_data': 2555,      # 7 years
            'temporary_data': 7,    # Days
            'cache_data': 1         # Days
        }

    async def enforce_retention(self) -> None:
        """Enforce data retention policies"""

        for data_type, retention_days in self.retention_policies.items():
            await self.cleanup_old_data(data_type, retention_days)

    async def cleanup_old_data(self, data_type: str, retention_days: int) -> None:
        """Clean up data older than retention period"""

        table_map = {
            'chat_messages': 'chat_messages',
            'audit_logs': 'audit_log',
            'temporary_data': 'temp_data',
            'cache_data': 'cache_entries'
        }

        table = table_map.get(data_type)
        if not table:
            return

        query = f"""
            DELETE FROM {table}
            WHERE created_at < NOW() - INTERVAL '{retention_days} days'
            RETURNING COUNT(*)
        """

        deleted_count = await self.db_pool.fetchval(query)

        logger.info(f"Cleaned up {deleted_count} records from {table}")
```

---

## Summary

This completes the comprehensive 10-document series detailing every aspect of the TrueFi AI Financial Advisor's agentic framework. The system implements:

1. **Business Strategy** - Clear vision and objectives
2. **System Architecture** - Robust multi-agent design
3. **Orchestration** - Sophisticated agent coordination
4. **Context Building** - Rich user profiling
5. **Prompt Engineering** - Advanced LLM interactions
6. **SQL Generation** - Secure database queries
7. **Analysis & Modeling** - Comprehensive financial insights
8. **Quality Control** - Multi-stage validation
9. **Memory Management** - Conversational continuity
10. **Security & Performance** - Enterprise-grade protection and optimization

The framework ensures personalized, accurate, secure, and performant AI-driven financial advisory services at scale.