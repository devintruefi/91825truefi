# TRUEFIBACKEND/profile_pack/schema_card.py
# Schema card generator for database tables

from typing import Dict, Any, List

class TransactionSchemaCard:
    """Generates schema card for database tables"""

    @staticmethod
    def generate() -> Dict[str, Any]:
        """Generate complete schema card for database tables"""
        return {
            # Primary table info for backward compatibility
            "table": "public.transactions, public.accounts",

            # All available tables
            "available_tables": {
                "accounts": {
                    "description": "User account balances and information",
                    "columns": {
                        "id": "uuid",
                        "user_id": "uuid",
                        "name": "text",
                        "type": "text",
                        "balance": "numeric",
                        "available_balance": "numeric",
                        "institution_name": "text",
                        "is_active": "boolean",
                        "currency": "text"
                    },
                    "use_for": ["account balances", "total cash", "net worth", "money in accounts"]
                },
                "transactions": {
                    "description": "Transaction history and spending data",
                    "columns": {
                        "id": "uuid",
                        "user_id": "uuid",
                        "account_id": "uuid",
                        "amount": "numeric",
                        "date": "date",
                        "posted_datetime": "timestamptz",
                        "merchant_name": "text",
                        "category": "text",
                        "pfc_primary": "text",
                        "pfc_detailed": "text",
                        "pending": "boolean"
                    },
                    "use_for": ["spending", "expenses", "income", "transaction history"]
                }
            },

            # Transaction columns for backward compatibility
            "columns": {
                "id": "uuid",
                "user_id": "uuid",
                "account_id": "uuid",
                "plaid_transaction_id": "text",
                "amount": "numeric",
                "date": "date",
                "posted_datetime": "timestamptz",
                "authorized_datetime": "timestamptz",
                "name": "text",
                "merchant_name": "text",
                "payment_channel": "text",
                "primary_category": "text",
                "detailed_category": "text",
                "category": "text",
                "pfc_primary": "text",
                "pfc_detailed": "text",
                "location_address": "text",
                "location_city": "text",
                "location_region": "text",
                "location_postal_code": "text",
                "location_country": "text",
                "location_lat": "numeric",
                "location_lon": "numeric",
                "payment_meta": "jsonb",
                "pending": "boolean",
                "is_recurring": "boolean",
                "created_at": "timestamptz",
                "updated_at": "timestamptz",
                "category_confidence": "text"
            },

            "notes": {
                "CRITICAL_TABLE_SELECTION": "For 'money in accounts', 'balance', 'cash' queries: MUST use accounts table, NOT transactions",
                "amount_sign": "Negative amounts represent expenses/outflows, positive amounts represent income/inflows",
                "date_preference": "ALWAYS use COALESCE(posted_datetime, date::timestamptz) for date filters",
                "pending_default": "Exclude pending transactions unless specifically requested",
                "user_filter": "Always filter by user_id for security",
                "time_zone": "All timestamps are in UTC"
            },

            "safe_filters": [
                "user_id = %(user_id)s",
                "pending = false",
                "amount < 0  -- for expenses",
                "amount > 0  -- for income",
                "COALESCE(posted_datetime, date::timestamptz) >= %(start_date)s",
                "COALESCE(posted_datetime, date::timestamptz) <= %(end_date)s",
                "pfc_primary IN (%(categories)s)",
                "merchant_name ILIKE %(merchant_pattern)s"
            ],

            "examples": [
                {
                    "description": "Total account balance (CORRECT for 'money in accounts')",
                    "sql": """
                        SELECT SUM(balance) AS total_balance
                        FROM accounts
                        WHERE user_id = %(user_id)s
                            AND is_active = true
                    """
                },
                {
                    "description": "Monthly spending by category",
                    "sql": """
                        SELECT
                            DATE_TRUNC('month', COALESCE(posted_datetime, date::timestamptz)) AS month,
                            pfc_primary AS category,
                            SUM(ABS(amount)) AS total_spent
                        FROM transactions
                        WHERE user_id = %(user_id)s
                            AND amount < 0
                            AND pending = false
                            AND COALESCE(posted_datetime, date::timestamptz) >= %(start_date)s
                        GROUP BY 1, 2
                        ORDER BY 1 DESC, 3 DESC
                    """
                },
                {
                    "description": "Top merchants by transaction count",
                    "sql": """
                        SELECT
                            merchant_name,
                            COUNT(*) AS transaction_count,
                            SUM(ABS(amount)) AS total_amount
                        FROM transactions
                        WHERE user_id = %(user_id)s
                            AND amount < 0
                            AND pending = false
                        GROUP BY merchant_name
                        ORDER BY transaction_count DESC
                        LIMIT 20
                    """
                },
                {
                    "description": "Daily spending trend",
                    "sql": """
                        SELECT
                            DATE(COALESCE(posted_datetime, date::timestamptz)) AS day,
                            SUM(ABS(amount)) AS daily_spend
                        FROM transactions
                        WHERE user_id = %(user_id)s
                            AND amount < 0
                            AND pending = false
                            AND COALESCE(posted_datetime, date::timestamptz) >= CURRENT_DATE - INTERVAL '30 days'
                        GROUP BY 1
                        ORDER BY 1
                    """
                }
            ],

            "category_mappings": {
                "pfc_primary": [
                    "Food and Drink", "Shops", "Transportation", "Travel",
                    "Entertainment", "Bills and Utilities", "Healthcare",
                    "Education", "Personal", "Home", "Investments", "Taxes"
                ],
                "common_merchants": {
                    "subscription_services": [
                        "Netflix", "Spotify", "Amazon Prime", "Disney+",
                        "Apple Music", "YouTube Premium"
                    ],
                    "food_delivery": [
                        "DoorDash", "Uber Eats", "Grubhub", "Postmates"
                    ],
                    "rideshare": [
                        "Uber", "Lyft", "Via"
                    ],
                    "groceries": [
                        "Whole Foods", "Trader Joe's", "Kroger", "Safeway"
                    ]
                }
            }
        }