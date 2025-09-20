# TRUEFIBACKEND/agents/intents.py
# Intent classification for deterministic table routing
from enum import Enum
from typing import Dict, List, Any

class Intent(str, Enum):
    """Financial query intents that map to specific database tables"""
    ACCOUNT_BALANCES = "account_balances"
    RECENT_TRANSACTIONS = "recent_transactions"
    SPEND_BY_CATEGORY = "spend_by_category"
    SPEND_BY_TIME = "spend_by_time"
    CASHFLOW_SUMMARY = "cashflow_summary"
    INVESTMENT_POSITIONS = "investment_positions"
    GOALS_STATUS = "goals_status"
    BUDGET_UTILIZATION = "budget_utilization"
    NET_WORTH = "net_worth"
    RECURRING_TRANSACTIONS = "recurring_transactions"
    SAVINGS_RATE = "savings_rate"
    TRANSACTION_SEARCH = "transaction_search"  # Smart search for transactions

    # Analysis-focused intents for personalized calculations
    SPENDING_ANALYSIS = "spending_analysis"
    SAVINGS_ANALYSIS = "savings_analysis"
    BUDGET_ANALYSIS = "budget_analysis"
    INVESTMENT_ANALYSIS = "investment_analysis"
    DEBT_ANALYSIS = "debt_analysis"
    TAX_PLANNING = "tax_planning"
    RETIREMENT_PLANNING = "retirement_planning"
    GOAL_PLANNING = "goal_planning"
    NET_WORTH_ANALYSIS = "net_worth_analysis"

    # Additional analysis intents
    SPENDING_MOM_DELTA = "spending_mom_delta"  # Month-over-month spending changes
    TOP_MERCHANTS = "top_merchants"  # Top spending merchants
    BALANCES_BY_ACCOUNT = "balances_by_account"  # Account balance breakdown

    # Conversational intents
    GREETING = "greeting"
    CASUAL_CONVERSATION = "casual_conversation"

    UNKNOWN = "unknown"

# Mapping of intents to allowed tables and guidance
INTENT_TO_ALLOWED: Dict[Intent, Dict[str, Any]] = {
    Intent.ACCOUNT_BALANCES: {
        "tables": ["accounts"],
        "columns": ["id", "user_id", "name", "type", "subtype", "balance",
                   "available_balance", "currency", "institution_name", "is_active"],
        "notes": "Use accounts table only. Never query transactions for balance questions.",
        "template_sql": """
            SELECT name, type, balance, available_balance, institution_name
            FROM accounts
            WHERE user_id = %(user_id)s AND is_active = true
            ORDER BY balance DESC
        """
    },
    Intent.RECENT_TRANSACTIONS: {
        "tables": ["transactions", "accounts"],
        "columns": ["id", "user_id", "account_id", "amount", "date", "name",
                   "merchant_name", "category", "pfc_primary", "posted_datetime", "pending"],
        "notes": "Use COALESCE(posted_datetime, date::timestamptz) for all date filtering.",
        "template_sql": """
            SELECT COALESCE(posted_datetime, date::timestamptz) as trans_date,
                   amount, merchant_name, category, pending
            FROM transactions
            WHERE user_id = %(user_id)s
              AND COALESCE(posted_datetime, date::timestamptz) >= %(start_date)s
            ORDER BY COALESCE(posted_datetime, date::timestamptz) DESC
            LIMIT %(limit)s
        """
    },
    Intent.SPEND_BY_CATEGORY: {
        "tables": ["transactions"],
        "columns": ["amount", "date", "posted_datetime", "category", "pfc_primary", "pfc_detailed"],
        "notes": "Aggregate by category. Use COALESCE for dates. Negative amounts = expenses.",
        "template_sql": """
            SELECT COALESCE(pfc_primary, category, 'Uncategorized') as category,
                   SUM(ABS(amount)) as total_spent,
                   COUNT(*) as transaction_count
            FROM transactions
            WHERE user_id = %(user_id)s
              AND amount < 0
              AND pending = false
              AND COALESCE(posted_datetime, date::timestamptz) >= %(start_date)s
              AND COALESCE(posted_datetime, date::timestamptz) <= %(end_date)s
            GROUP BY 1
            ORDER BY total_spent DESC
        """
    },
    Intent.SPEND_BY_TIME: {
        "tables": ["transactions"],
        "columns": ["amount", "date", "posted_datetime"],
        "notes": "Time-based spending aggregation. Use DATE_TRUNC with COALESCE.",
        "template_sql": """
            SELECT DATE_TRUNC('month', COALESCE(posted_datetime, date::timestamptz)) as period,
                   SUM(ABS(amount)) as total_spent
            FROM transactions
            WHERE user_id = %(user_id)s
              AND amount < 0
              AND pending = false
              AND COALESCE(posted_datetime, date::timestamptz) >= %(start_date)s
            GROUP BY 1
            ORDER BY 1 DESC
        """
    },
    Intent.CASHFLOW_SUMMARY: {
        "tables": ["transactions"],
        "columns": ["amount", "date", "posted_datetime"],
        "notes": "Income vs expenses. Positive = income, Negative = expenses.",
        "template_sql": """
            SELECT DATE_TRUNC('month', COALESCE(posted_datetime, date::timestamptz)) as month,
                   SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as income,
                   SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as expenses,
                   SUM(amount) as net_cashflow
            FROM transactions
            WHERE user_id = %(user_id)s
              AND pending = false
              AND COALESCE(posted_datetime, date::timestamptz) >= %(start_date)s
            GROUP BY 1
            ORDER BY 1
        """
    },
    Intent.INVESTMENT_POSITIONS: {
        "tables": ["holdings", "securities", "accounts"],
        "columns": ["account_id", "security_id", "quantity", "cost_basis",
                   "institution_value", "institution_price"],
        "notes": "Use holdings and securities tables. Join accounts for user_id filter.",
        "template_sql": """
            SELECT s.name, s.ticker, h.quantity, h.institution_value as market_value,
                   a.name as account_name
            FROM holdings h
            JOIN securities s ON s.id = h.security_id
            JOIN accounts a ON a.id = h.account_id
            WHERE a.user_id = %(user_id)s AND a.is_active = true
            ORDER BY h.institution_value DESC
        """
    },
    Intent.GOALS_STATUS: {
        "tables": ["goals"],
        "columns": ["name", "target_amount", "current_amount", "target_date",
                   "priority", "is_active"],
        "notes": "Goals progress tracking. Calculate progress percentage.",
        "template_sql": """
            SELECT name, target_amount, current_amount,
                   ROUND((current_amount / NULLIF(target_amount, 0)) * 100, 2) as progress_percent,
                   target_date
            FROM goals
            WHERE user_id = %(user_id)s AND is_active = true
            ORDER BY priority, target_date
        """
    },
    Intent.BUDGET_UTILIZATION: {
        "tables": ["budgets", "budget_categories", "transactions"],
        "columns": ["budget_id", "category", "amount", "month", "year"],
        "notes": "Compare budgeted vs actual spending by category.",
        "template_sql": """
            WITH current_spending AS (
                SELECT category, SUM(ABS(amount)) as spent
                FROM transactions
                WHERE user_id = %(user_id)s
                  AND amount < 0
                  AND pending = false
                  AND DATE_TRUNC('month', COALESCE(posted_datetime, date::timestamptz)) = DATE_TRUNC('month', CURRENT_DATE)
                GROUP BY category
            )
            SELECT bc.category, bc.amount as budgeted,
                   COALESCE(cs.spent, 0) as spent,
                   bc.amount - COALESCE(cs.spent, 0) as remaining
            FROM budget_categories bc
            JOIN budgets b ON b.id = bc.budget_id
            LEFT JOIN current_spending cs ON cs.category = bc.category
            WHERE b.user_id = %(user_id)s AND b.is_active = true
        """
    },
    Intent.NET_WORTH: {
        "tables": ["accounts", "manual_assets", "manual_liabilities"],
        "columns": ["balance", "value", "type"],
        "notes": "Sum all assets minus all liabilities. Include manual entries.",
        "template_sql": """
            WITH assets AS (
                SELECT SUM(balance) as total FROM accounts
                WHERE user_id = %(user_id)s AND is_active = true
                UNION ALL
                SELECT SUM(value) FROM manual_assets WHERE user_id = %(user_id)s
            ),
            liabilities AS (
                SELECT SUM(balance) as total FROM manual_liabilities
                WHERE user_id = %(user_id)s
            )
            SELECT
                COALESCE((SELECT SUM(total) FROM assets), 0) as total_assets,
                COALESCE((SELECT total FROM liabilities), 0) as total_liabilities,
                COALESCE((SELECT SUM(total) FROM assets), 0) -
                COALESCE((SELECT total FROM liabilities), 0) as net_worth
        """
    },
    Intent.RECURRING_TRANSACTIONS: {
        "tables": ["transactions"],
        "columns": ["merchant_name", "amount", "date", "posted_datetime"],
        "notes": "Identify recurring patterns by merchant and amount.",
        "template_sql": """
            SELECT merchant_name,
                   AVG(ABS(amount)) as avg_amount,
                   COUNT(*) as occurrence_count,
                   MAX(COALESCE(posted_datetime, date::timestamptz)) as last_occurrence
            FROM transactions
            WHERE user_id = %(user_id)s
              AND amount < 0
              AND pending = false
            GROUP BY merchant_name
            HAVING COUNT(*) >= 3
            ORDER BY occurrence_count DESC
        """
    },
    Intent.SAVINGS_RATE: {
        "tables": ["transactions"],
        "columns": ["amount", "date", "posted_datetime"],
        "notes": "Calculate savings rate as (income - expenses) / income.",
        "template_sql": """
            WITH monthly_data AS (
                SELECT
                    DATE_TRUNC('month', COALESCE(posted_datetime, date::timestamptz)) as month,
                    SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as income,
                    SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as expenses
                FROM transactions
                WHERE user_id = %(user_id)s
                  AND pending = false
                  AND COALESCE(posted_datetime, date::timestamptz) >= CURRENT_DATE - INTERVAL '3 months'
                GROUP BY 1
            )
            SELECT
                AVG(CASE
                    WHEN income > 0 THEN ((income - expenses) / income) * 100
                    ELSE 0
                END) as avg_savings_rate
            FROM monthly_data
        """
    },
    Intent.TRANSACTION_SEARCH: {
        "tables": ["transactions"],
        "columns": ["id", "date", "posted_datetime", "merchant_name", "name",
                    "amount", "category", "pfc_primary", "payment_channel", "pending"],
        "notes": "Natural language search for transactions. Use SearchQueryBuilder for complex searches.",
        "template_sql": """
            -- This intent uses dynamic SQL built by SearchQueryBuilder
            -- Example: "all coffee purchases over $5 last month"
            -- Will search by merchant, amount, date range, category
        """
    },
    Intent.SPENDING_MOM_DELTA: {
        "tables": ["transactions"],
        "columns": ["amount", "date", "posted_datetime"],
        "notes": "Compare current month spending to last month.",
        "template_sql": """
            WITH monthly_spending AS (
                SELECT
                    DATE_TRUNC('month', COALESCE(posted_datetime, date::timestamptz)) as month,
                    SUM(ABS(amount)) as total_spent
                FROM transactions
                WHERE user_id = %(user_id)s
                  AND amount < 0
                  AND pending = false
                  AND COALESCE(posted_datetime, date::timestamptz) >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
                GROUP BY 1
            )
            SELECT
                month,
                total_spent,
                LAG(total_spent) OVER (ORDER BY month) as last_month_spent,
                total_spent - LAG(total_spent) OVER (ORDER BY month) as delta,
                CASE
                    WHEN LAG(total_spent) OVER (ORDER BY month) > 0
                    THEN ((total_spent - LAG(total_spent) OVER (ORDER BY month)) / LAG(total_spent) OVER (ORDER BY month)) * 100
                    ELSE 0
                END as percent_change
            FROM monthly_spending
            ORDER BY month DESC
            LIMIT 2
        """
    },
    Intent.TOP_MERCHANTS: {
        "tables": ["transactions"],
        "columns": ["merchant_name", "amount"],
        "notes": "Top merchants by spending in time period.",
        "template_sql": """
            SELECT
                COALESCE(merchant_name, name) as merchant,
                SUM(ABS(amount)) as total_spent,
                COUNT(*) as transaction_count,
                AVG(ABS(amount)) as avg_transaction
            FROM transactions
            WHERE user_id = %(user_id)s
              AND amount < 0
              AND pending = false
              AND COALESCE(posted_datetime, date::timestamptz) >= %(start_date)s
            GROUP BY 1
            HAVING SUM(ABS(amount)) > 0
            ORDER BY total_spent DESC
            LIMIT 10
        """
    },
    Intent.BALANCES_BY_ACCOUNT: {
        "tables": ["accounts"],
        "columns": ["name", "balance", "type", "subtype"],
        "notes": "All account balances for the user.",
        "template_sql": """
            SELECT
                name,
                type,
                subtype,
                balance as current_balance,
                available_balance,
                institution_name
            FROM accounts
            WHERE user_id = %(user_id)s
              AND is_active = true
            ORDER BY balance DESC
        """
    },

    # Analysis intents that don't need SQL - they use profile pack data directly
    Intent.INVESTMENT_ANALYSIS: {
        "tables": [],
        "columns": [],
        "notes": "Investment advice and analysis. Uses profile pack data directly, no SQL needed.",
        "template_sql": None,
        "skip_sql": True
    },
    Intent.SPENDING_ANALYSIS: {
        "tables": [],
        "columns": [],
        "notes": "Spending analysis and advice. Uses profile pack data directly, no SQL needed.",
        "template_sql": None,
        "skip_sql": True
    },
    Intent.SAVINGS_ANALYSIS: {
        "tables": [],
        "columns": [],
        "notes": "Savings analysis and advice. Uses profile pack data directly, no SQL needed.",
        "template_sql": None,
        "skip_sql": True
    },
    Intent.BUDGET_ANALYSIS: {
        "tables": [],
        "columns": [],
        "notes": "Budget analysis and advice. Uses profile pack data directly, no SQL needed.",
        "template_sql": None,
        "skip_sql": True
    },
    Intent.DEBT_ANALYSIS: {
        "tables": [],
        "columns": [],
        "notes": "Debt analysis and advice. Uses profile pack data directly, no SQL needed.",
        "template_sql": None,
        "skip_sql": True
    },
    Intent.TAX_PLANNING: {
        "tables": [],
        "columns": [],
        "notes": "Tax planning and advice. Uses profile pack data directly, no SQL needed.",
        "template_sql": None,
        "skip_sql": True
    },
    Intent.RETIREMENT_PLANNING: {
        "tables": [],
        "columns": [],
        "notes": "Retirement planning and advice. Uses profile pack data directly, no SQL needed.",
        "template_sql": None,
        "skip_sql": True
    },
    Intent.GOAL_PLANNING: {
        "tables": [],
        "columns": [],
        "notes": "Goal planning and advice. Uses profile pack data directly, no SQL needed.",
        "template_sql": None,
        "skip_sql": True
    },
    Intent.NET_WORTH_ANALYSIS: {
        "tables": [],
        "columns": [],
        "notes": "Net worth analysis and advice. Uses profile pack data directly, no SQL needed.",
        "template_sql": None,
        "skip_sql": True
    },

    # Conversational intents that need friendly responses, not financial analysis
    Intent.GREETING: {
        "tables": [],
        "columns": [],
        "notes": "Greeting or casual conversation. Respond warmly without financial analysis.",
        "template_sql": None,
        "skip_sql": True,
        "conversational": True
    },
    Intent.CASUAL_CONVERSATION: {
        "tables": [],
        "columns": [],
        "notes": "Casual conversation. Respond appropriately and offer to help with finances.",
        "template_sql": None,
        "skip_sql": True,
        "conversational": True
    }
}