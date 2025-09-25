#!/usr/bin/env python3
"""
Schema Discovery for TrueFi Database
Inspects the database schema to understand table structures
"""

import os
import psycopg2
from psycopg2.extras import RealDictCursor
import json
from datetime import datetime

def get_connection():
    """Create database connection from environment variables"""
    return psycopg2.connect(
        host=os.getenv('PGHOST', 'localhost'),
        port=os.getenv('PGPORT', '5433'),
        database=os.getenv('PGDATABASE', 'truefi_app_data'),
        user=os.getenv('PGUSER', 'truefi_user'),
        password=os.getenv('PGPASSWORD', 'truefi.ai101$')
    )

def discover_schema():
    """Discover all relevant tables and their structures"""
    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    # Get all user-related tables
    relevant_tables = [
        'users', 'user_demographics', 'user_identity', 'user_preferences',
        'tax_profile', 'accounts', 'transactions', 'holdings_current', 'holdings',
        'securities', 'goals', 'budgets', 'budget_categories', 'budget_spending',
        'manual_assets', 'manual_liabilities', 'recurring_income',
        'plaid_connections', 'chat_sessions', 'chat_messages'
    ]

    schema_info = {}

    for table in relevant_tables:
        # Check if table exists
        cur.execute("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = %s
            )
        """, (table,))

        if not cur.fetchone()['exists']:
            print(f"Table {table} does not exist")
            continue

        # Get column information
        cur.execute("""
            SELECT
                column_name,
                data_type,
                character_maximum_length,
                is_nullable,
                column_default
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = %s
            ORDER BY ordinal_position
        """, (table,))

        columns = cur.fetchall()

        # Get primary key
        cur.execute("""
            SELECT a.attname
            FROM pg_index i
            JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
            WHERE i.indrelid = %s::regclass AND i.indisprimary
        """, (table,))

        primary_keys = [row['attname'] for row in cur.fetchall()]

        # Get foreign keys
        cur.execute("""
            SELECT
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
                AND tc.table_name = %s
        """, (table,))

        foreign_keys = cur.fetchall()

        schema_info[table] = {
            'columns': columns,
            'primary_keys': primary_keys,
            'foreign_keys': foreign_keys
        }

    conn.close()
    return schema_info

def write_schema_report(schema_info):
    """Write the schema report to markdown"""
    with open('/Users/keanepalmer/91825truefi/artifacts/seed/SCHEMA_REPORT.md', 'w') as f:
        f.write("# TrueFi Database Schema Report\n\n")
        f.write(f"Generated: {datetime.now().isoformat()}\n\n")

        for table, info in sorted(schema_info.items()):
            f.write(f"## Table: `{table}`\n\n")

            # Primary Keys
            if info['primary_keys']:
                f.write(f"**Primary Keys:** {', '.join(info['primary_keys'])}\n\n")

            # Columns
            f.write("### Columns\n\n")
            f.write("| Column | Type | Nullable | Default |\n")
            f.write("|--------|------|----------|----------|\n")

            for col in info['columns']:
                col_type = col['data_type']
                if col['character_maximum_length']:
                    col_type += f"({col['character_maximum_length']})"
                default = col['column_default'] if col['column_default'] else ''
                f.write(f"| {col['column_name']} | {col_type} | {col['is_nullable']} | {default} |\n")

            # Foreign Keys
            if info['foreign_keys']:
                f.write("\n### Foreign Keys\n\n")
                f.write("| Column | References |\n")
                f.write("|--------|------------|\n")
                for fk in info['foreign_keys']:
                    f.write(f"| {fk['column_name']} | {fk['foreign_table_name']}.{fk['foreign_column_name']} |\n")

            f.write("\n---\n\n")

if __name__ == "__main__":
    print("Discovering schema...")
    schema = discover_schema()
    write_schema_report(schema)
    print(f"Schema report written to SCHEMA_REPORT.md")
    print(f"Found {len(schema)} tables")