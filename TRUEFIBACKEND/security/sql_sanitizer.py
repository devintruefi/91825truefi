# TRUEFIBACKEND/security/sql_sanitizer.py
# SQL sanitizer to prevent malicious queries

import re
from typing import Tuple, Optional

class SQLSanitizer:
    """SQL query sanitizer to prevent DDL and dangerous operations"""

    # Dangerous keywords that should not appear in queries
    DANGEROUS_KEYWORDS = [
        'DROP', 'ALTER', 'TRUNCATE', 'INSERT', 'UPDATE', 'DELETE',
        'CREATE', 'GRANT', 'REVOKE', 'EXECUTE', 'EXEC', 'CALL',
        'MERGE', 'REPLACE', 'RENAME', 'BACKUP', 'RESTORE'
    ]

    # Dangerous patterns
    DANGEROUS_PATTERNS = [
        r';',                    # Multiple statements
        r'--',                   # SQL comment
        r'/\*',                  # Block comment start
        r'\*/',                  # Block comment end
        r'xp_',                  # Extended stored procedures
        r'sp_',                  # System stored procedures
        r'0x[0-9A-Fa-f]+',      # Hex literals (potential injection)
        r'CHAR\s*\(',           # CHAR function (potential obfuscation)
        r'NCHAR\s*\(',          # NCHAR function
        r'INTO\s+OUTFILE',      # File operations
        r'INTO\s+DUMPFILE',     # File operations
    ]

    @classmethod
    def sanitize(cls, sql: str) -> Tuple[bool, Optional[str]]:
        """
        Sanitize SQL query
        Returns (is_safe, error_message)
        """
        if not sql:
            return False, "Empty SQL query"

        # Remove leading/trailing whitespace
        sql = sql.strip()

        # Check for multiple statements (semicolon not at end)
        if ';' in sql and not sql.rstrip().endswith(';'):
            return False, "Multiple statements detected"

        # Remove trailing semicolon for checking
        sql_check = sql.rstrip(';')

        # Check for dangerous keywords
        sql_upper = sql_check.upper()
        for keyword in cls.DANGEROUS_KEYWORDS:
            # Check for whole word match
            pattern = r'\b' + keyword + r'\b'
            if re.search(pattern, sql_upper):
                return False, f"Dangerous keyword '{keyword}' detected"

        # Check for dangerous patterns
        for pattern in cls.DANGEROUS_PATTERNS:
            if re.search(pattern, sql_check, re.IGNORECASE):
                return False, f"Dangerous pattern detected: {pattern}"

        # Check for valid SELECT statement
        if not sql_upper.startswith('WITH') and not sql_upper.startswith('SELECT'):
            return False, "Query must start with SELECT or WITH (CTE)"

        # Check for required user_id filter
        if 'user_id' not in sql.lower():
            return False, "Query must filter by user_id"

        # Additional checks for common injection patterns
        if re.search(r'UNION\s+(ALL\s+)?SELECT', sql_upper):
            # Allow UNION but verify it's not trying to access system tables
            if re.search(r'information_schema|pg_|sys\.|mysql\.', sql.lower()):
                return False, "Attempted access to system tables"

        return True, None

    @classmethod
    def add_safety_wrapper(cls, sql: str, user_id: str, max_rows: int = 1000) -> str:
        """Add safety wrapper to SQL query"""
        # Remove any existing LIMIT clause
        sql = re.sub(r'\s+LIMIT\s+\d+', '', sql, flags=re.IGNORECASE)

        # Ensure user_id parameter is used
        if ':user_id' not in sql and '%(user_id)s' not in sql:
            # Add user_id filter if not present
            if 'WHERE' in sql.upper():
                sql = sql.replace('WHERE', f"WHERE user_id = %(user_id)s AND", 1)
            else:
                # Find the FROM clause and add WHERE after it
                from_match = re.search(r'FROM\s+\S+', sql, re.IGNORECASE)
                if from_match:
                    insert_pos = from_match.end()
                    sql = sql[:insert_pos] + f" WHERE user_id = %(user_id)s" + sql[insert_pos:]

        # Add LIMIT clause
        sql = f"{sql.rstrip(';')} LIMIT {max_rows}"

        return sql