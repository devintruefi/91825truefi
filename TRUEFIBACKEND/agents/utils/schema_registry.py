import psycopg2
import json
import time
import re
from functools import lru_cache
from typing import Dict, List, Tuple, Optional
import logging

logger = logging.getLogger(__name__)

class SchemaRegistry:
    """
    - Loads table / column metadata via information_schema once per app boot
    - Stores FK relationships and basic data type
    - Exposes helper to return *subset* of schema relevant to a question
    """
    
    def __init__(self, db_pool):
        self.db_pool = db_pool
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