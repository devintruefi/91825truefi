# -*- coding: utf-8 -*-
"""
Single source of truth for demo/sample user data
This file mirrors the TypeScript demoData.ts structure for backend consistency
"""

DEMO_DATA = {
    "user": {
        "name": "Sample User",
        "member_since": "January 2024",
        "net_worth": 79107.21,
        "monthly_income": 7000,
        "monthly_savings": 1400,
        "credit_utilization": 0.23  # 23%
    },

    "accounts": [
        {
            "id": "demo-checking-001",
            "name": "Chase Total Checking",
            "balance": 8450.32,
            "type": "checking",
            "institution": "Chase Bank",
            "mask": "4832"
        },
        {
            "id": "demo-savings-001",
            "name": "Ally High Yield Savings",
            "balance": 25000.00,
            "type": "savings",
            "apy": 4.25,
            "institution": "Ally Bank",
            "mask": "9001"
        },
        {
            "id": "demo-401k-001",
            "name": "Fidelity 401(k)",
            "balance": 45230.18,
            "type": "retirement",
            "ytd_return": 12.3,
            "institution": "Fidelity",
            "mask": "7234"
        },
        {
            "id": "demo-brokerage-001",
            "name": "Vanguard Brokerage",
            "balance": 12500.00,
            "type": "investment",
            "ytd_return": 15.2,
            "institution": "Vanguard",
            "mask": "5678"
        },
        {
            "id": "demo-crypto-001",
            "name": "Coinbase Pro",
            "balance": 3420.89,
            "type": "cryptocurrency",
            "ytd_return": 28.5,
            "institution": "Coinbase",
            "mask": "3456"
        },
        {
            "id": "demo-cc-001",
            "name": "Chase Sapphire Preferred",
            "balance": -2341.67,
            "type": "credit",
            "limit": 10000,
            "apr": 24.99,
            "institution": "Chase Bank",
            "mask": "1234"
        },
        {
            "id": "demo-cc-002",
            "name": "Amex Gold Card",
            "balance": -892.34,
            "type": "credit",
            "limit": 8000,
            "apr": 22.99,
            "institution": "American Express",
            "mask": "5678"
        }
    ],

    "key_transactions": [
        {"id": 1, "date": "2024-01-18", "merchant": "Direct Deposit - TechCorp", "amount": 3200.00, "category": "Income", "type": "deposit"},
        {"id": 2, "date": "2024-01-17", "merchant": "Whole Foods Market", "amount": -127.43, "category": "Groceries", "type": "debit"},
        {"id": 3, "date": "2024-01-16", "merchant": "Netflix", "amount": -15.99, "category": "Entertainment", "recurring": True, "type": "debit"},
        {"id": 4, "date": "2024-01-15", "merchant": "Oakwood Apartments", "amount": -1850.00, "category": "Housing", "recurring": True, "type": "ach"},
        {"id": 5, "date": "2024-01-14", "merchant": "Sweetgreen", "amount": -18.75, "category": "Dining", "type": "credit"},
        {"id": 6, "date": "2024-01-13", "merchant": "Con Edison", "amount": -125.00, "category": "Utilities", "recurring": True, "type": "ach"},
        {"id": 7, "date": "2024-01-12", "merchant": "Equinox Gym", "amount": -185.00, "category": "Health & Fitness", "recurring": True, "type": "credit"},
        {"id": 8, "date": "2024-01-11", "merchant": "Amazon", "amount": -87.23, "category": "Shopping", "type": "credit"},
        {"id": 9, "date": "2024-01-10", "merchant": "Shell Gas Station", "amount": -45.00, "category": "Transportation", "type": "credit"},
        {"id": 10, "date": "2024-01-09", "merchant": "Freelance Payment", "amount": 1800.00, "category": "Income", "type": "deposit"},
        {"id": 11, "date": "2024-01-08", "merchant": "Trader Joe's", "amount": -89.50, "category": "Groceries", "type": "debit"},
        {"id": 12, "date": "2024-01-07", "merchant": "Spotify Premium", "amount": -10.99, "category": "Entertainment", "recurring": True, "type": "credit"},
        {"id": 13, "date": "2024-01-06", "merchant": "Uber", "amount": -23.40, "category": "Transportation", "type": "credit"},
        {"id": 14, "date": "2024-01-05", "merchant": "Chipotle", "amount": -14.25, "category": "Dining", "type": "credit"},
        {"id": 15, "date": "2024-01-04", "merchant": "401k Contribution", "amount": -750.00, "category": "Retirement", "type": "deduction"}
    ],

    "insights": {
        "avg_monthly_dining": 847,
        "avg_monthly_groceries": 420,
        "avg_monthly_entertainment": 215,
        "avg_monthly_transportation": 200,
        "savings_rate": 0.20,
        "emergency_months": 4.2,
        "top_spend_category": {"name": "Housing", "amount": 1850, "percent": 26},
        "second_spend_category": {"name": "Food & Dining", "amount": 847, "percent": 12},
        "third_spend_category": {"name": "Shopping", "amount": 423, "percent": 6},
        "total_monthly_expenses": 5600,
        "total_monthly_income": 7000,
        "net_cash_flow": 1400,
        "debt_to_income_ratio": 0.46,
        "investment_growth_ytd": 0.152,
        "suggested_savings": 247  # Potential monthly savings from dining budget
    },

    "goals": [
        {
            "id": "goal-001",
            "name": "Emergency Fund",
            "current": 5000,
            "target": 15000,
            "icon": "🛡️",
            "percent_complete": 33,
            "monthly_contribution": 500,
            "projected_completion": "November 2024"
        },
        {
            "id": "goal-002",
            "name": "Hawaii Vacation",
            "current": 2000,
            "target": 5000,
            "icon": "🏝️",
            "percent_complete": 40,
            "monthly_contribution": 250,
            "projected_completion": "December 2024"
        },
        {
            "id": "goal-003",
            "name": "New Car Down Payment",
            "current": 3000,
            "target": 10000,
            "icon": "🚗",
            "percent_complete": 30,
            "monthly_contribution": 350,
            "projected_completion": "August 2025"
        },
        {
            "id": "goal-004",
            "name": "House Down Payment",
            "current": 12000,
            "target": 60000,
            "icon": "🏠",
            "percent_complete": 20,
            "monthly_contribution": 300,
            "projected_completion": "December 2027"
        }
    ],

    "budget": {
        "monthly": 7000,
        "categories": [
            {"name": "Housing", "allocated": 1850, "spent": 1850, "remaining": 0},
            {"name": "Food & Dining", "allocated": 600, "spent": 847, "remaining": -247},
            {"name": "Transportation", "allocated": 250, "spent": 200, "remaining": 50},
            {"name": "Shopping", "allocated": 400, "spent": 423, "remaining": -23},
            {"name": "Entertainment", "allocated": 200, "spent": 215, "remaining": -15},
            {"name": "Utilities", "allocated": 250, "spent": 225, "remaining": 25},
            {"name": "Health & Fitness", "allocated": 200, "spent": 185, "remaining": 15},
            {"name": "Savings", "allocated": 1400, "spent": 1400, "remaining": 0},
            {"name": "Investments", "allocated": 850, "spent": 850, "remaining": 0}
        ]
    },

    "investments": {
        "total_value": 61151.07,
        "total_cost_basis": 52000,
        "total_gain": 9151.07,
        "total_gain_percent": 17.6,
        "holdings": [
            {"symbol": "VTI", "name": "Vanguard Total Market ETF", "shares": 45, "value": 10125.00, "gain": 1125.00},
            {"symbol": "VXUS", "name": "Vanguard International ETF", "shares": 80, "value": 4800.00, "gain": 320.00},
            {"symbol": "AAPL", "name": "Apple Inc.", "shares": 25, "value": 4825.00, "gain": 825.00},
            {"symbol": "MSFT", "name": "Microsoft Corp", "shares": 10, "value": 4100.00, "gain": 600.00},
            {"symbol": "BTC", "name": "Bitcoin", "quantity": 0.08, "value": 3420.89, "gain": 920.89}
        ]
    },

    "recommendations": [
        "You could save $247/month by sticking to your dining budget",
        "Your emergency fund needs $10,000 more to reach the recommended 6 months of expenses",
        "Consider increasing your 401(k) contribution by 2% to maximize employer match",
        "Your credit utilization is healthy at 23% - keep it below 30%",
        "You're on track to save $16,800 this year - great job!"
    ]
}

# Demo questions based on the data
DEMO_QUESTIONS = [
    f"Why is my dining spending ${DEMO_DATA['insights']['avg_monthly_dining'] - 600} over budget?",
    "How can I reach my 6-month emergency fund goal faster?",
    "Show me my investment portfolio performance",
    "What's my current savings rate and how can I improve it?",
    "Analyze my spending patterns for the last month",
    "Should I pay off my credit cards or invest more?"
]

def format_currency(amount: float) -> str:
    """Format amount as USD currency"""
    if amount < 0:
        return f"-${abs(amount):,.2f}"
    return f"${amount:,.2f}"

def get_demo_account_summary() -> str:
    """Get formatted account summary text"""
    checking = next((a['balance'] for a in DEMO_DATA['accounts'] if a['type'] == 'checking'), 0)
    savings = next((a['balance'] for a in DEMO_DATA['accounts'] if a['type'] == 'savings'), 0)
    retirement = sum(a['balance'] for a in DEMO_DATA['accounts'] if a['type'] == 'retirement')
    credit = sum(a['balance'] for a in DEMO_DATA['accounts'] if a['type'] == 'credit')

    return (f"Checking: {format_currency(checking)}, "
            f"Savings: {format_currency(savings)}, "
            f"Retirement: {format_currency(retirement)}, "
            f"Credit Cards: {format_currency(abs(credit))}")

def get_lean_prompt_facts() -> str:
    """Get lean key facts for the system prompt"""
    insights = DEMO_DATA['insights']
    user = DEMO_DATA['user']

    return f"""KEY FACTS:
- Net Worth: {format_currency(user['net_worth'])}
- Monthly Income: {format_currency(user['monthly_income'])}
- Savings Rate: {insights['savings_rate']:.0%} ({format_currency(user['monthly_savings'])}/month)
- Top Spending: {insights['top_spend_category']['name']} ({format_currency(insights['top_spend_category']['amount'])}), Dining ({format_currency(insights['avg_monthly_dining'])}), Transport ({format_currency(insights['avg_monthly_transportation'])})
- Emergency Fund: {insights['emergency_months']} months (target: 6)
- Credit Utilization: {user['credit_utilization']:.0%}
- Investment YTD Return: {insights['investment_growth_ytd']:.1%}"""