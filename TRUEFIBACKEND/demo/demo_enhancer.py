# -*- coding: utf-8 -*-
"""
Demo response enhancer - adds computed insights without bloating the prompt
"""
import logging
from typing import Dict, Any, List, Optional
from .demo_data import DEMO_DATA, format_currency

logger = logging.getLogger(__name__)

def calculate_spending_insight(data: dict = DEMO_DATA) -> dict:
    """Calculate spending insights from demo data"""
    insights = data['insights']
    budget = data['budget']

    # Find overspending categories
    overspending = []
    for category in budget['categories']:
        if category['remaining'] < 0:
            overspending.append({
                'name': category['name'],
                'over_by': abs(category['remaining']),
                'percent_over': abs(category['remaining']) / category['allocated'] * 100
            })

    # Sort by amount over budget
    overspending.sort(key=lambda x: x['over_by'], reverse=True)

    return {
        'total_spent': insights['total_monthly_expenses'],
        'total_income': insights['total_monthly_income'],
        'net_cash_flow': insights['net_cash_flow'],
        'top_categories': [
            insights['top_spend_category'],
            insights['second_spend_category'],
            insights['third_spend_category']
        ],
        'overspending': overspending[:3],  # Top 3 overspending categories
        'savings_opportunity': insights['suggested_savings']
    }

def calculate_investment_insight(data: dict = DEMO_DATA) -> dict:
    """Calculate investment insights from demo data"""
    investments = data['investments']

    # Group holdings by type
    stocks = [h for h in investments['holdings'] if h['symbol'] in ['AAPL', 'MSFT']]
    etfs = [h for h in investments['holdings'] if 'ETF' in h['name']]
    crypto = [h for h in investments['holdings'] if h['symbol'] == 'BTC']

    return {
        'total_value': investments['total_value'],
        'total_gain': investments['total_gain'],
        'gain_percent': investments['total_gain_percent'],
        'allocation': {
            'stocks': sum(h['value'] for h in stocks),
            'etfs': sum(h['value'] for h in etfs),
            'crypto': sum(h['value'] for h in crypto),
            'retirement': next((a['balance'] for a in data['accounts'] if a['type'] == 'retirement'), 0)
        },
        'top_performer': max(investments['holdings'], key=lambda x: x['gain']),
        'recommendation': "Consider rebalancing - your crypto allocation is only 5.6% of your portfolio"
    }

def calculate_goal_insight(data: dict = DEMO_DATA) -> dict:
    """Calculate goal progress insights"""
    goals = data['goals']
    insights = data['insights']

    # Find emergency fund goal
    emergency_goal = next((g for g in goals if 'Emergency' in g['name']), None)

    # Calculate total needed for all goals
    total_needed = sum(g['target'] - g['current'] for g in goals)
    total_monthly_contribution = sum(g['monthly_contribution'] for g in goals)

    return {
        'total_goals': len(goals),
        'total_needed': total_needed,
        'monthly_contribution': total_monthly_contribution,
        'emergency_status': {
            'current_months': insights['emergency_months'],
            'target_months': 6,
            'amount_needed': emergency_goal['target'] - emergency_goal['current'] if emergency_goal else 10000,
            'months_to_target': (emergency_goal['target'] - emergency_goal['current']) / emergency_goal['monthly_contribution'] if emergency_goal else 20
        },
        'next_milestone': min(goals, key=lambda g: g['target'] - g['current']),
        'longest_goal': max(goals, key=lambda g: g.get('projected_completion', ''))
    }

def calculate_budget_insight(data: dict = DEMO_DATA) -> dict:
    """Calculate budget optimization insights"""
    budget = data['budget']
    insights = data['insights']

    # Find categories with surplus
    surplus_categories = [c for c in budget['categories'] if c['remaining'] > 0]
    deficit_categories = [c for c in budget['categories'] if c['remaining'] < 0]

    total_surplus = sum(c['remaining'] for c in surplus_categories)
    total_deficit = abs(sum(c['remaining'] for c in deficit_categories))

    return {
        'total_budget': budget['monthly'],
        'total_allocated': sum(c['allocated'] for c in budget['categories']),
        'total_spent': sum(c['spent'] for c in budget['categories']),
        'surplus': total_surplus,
        'deficit': total_deficit,
        'optimization_potential': total_deficit,  # Amount that could be saved
        'reallocation_suggestion': f"Move {format_currency(total_deficit)} from overspent categories to savings"
    }

def enhance_demo_response(user_query: str, base_response: str) -> dict:
    """Add computed insights without bloating the prompt"""

    query_lower = user_query.lower()
    rich_content = None

    # Determine what type of insight to provide
    if any(word in query_lower for word in ['spending', 'spend', 'expense', 'bought']):
        spending_insight = calculate_spending_insight()
        rich_content = {
            "type": "spending_breakdown",
            "data": spending_insight,
            "visualization": "pie_chart",
            "title": "Your Monthly Spending Analysis"
        }

        # Add specific insights to the response
        if spending_insight['overspending']:
            top_over = spending_insight['overspending'][0]
            enhanced_msg = (f"{base_response}\n\n💡 **Key Insight**: You're overspending on {top_over['name']} "
                           f"by {format_currency(top_over['over_by'])} ({top_over['percent_over']:.0f}% over budget). "
                           f"This is your biggest savings opportunity!")
        else:
            enhanced_msg = base_response

    elif any(word in query_lower for word in ['invest', 'portfolio', 'stock', 'crypto', '401k']):
        investment_insight = calculate_investment_insight()
        rich_content = {
            "type": "investment_analysis",
            "data": investment_insight,
            "visualization": "portfolio_allocation",
            "title": "Investment Portfolio Performance"
        }
        enhanced_msg = (f"{base_response}\n\n📈 **Portfolio Update**: Your investments are up "
                       f"{investment_insight['gain_percent']:.1f}% YTD ({format_currency(investment_insight['total_gain'])} gain). "
                       f"{investment_insight['recommendation']}")

    elif any(word in query_lower for word in ['goal', 'save', 'saving', 'emergency', 'target']):
        goal_insight = calculate_goal_insight()
        rich_content = {
            "type": "goals_progress",
            "data": goal_insight,
            "visualization": "progress_bars",
            "title": "Financial Goals Tracker"
        }
        emergency = goal_insight['emergency_status']
        enhanced_msg = (f"{base_response}\n\n🎯 **Goal Progress**: You need {format_currency(emergency['amount_needed'])} more "
                       f"for a full 6-month emergency fund. At your current rate, you'll reach it in "
                       f"{emergency['months_to_target']:.0f} months.")

    elif any(word in query_lower for word in ['budget', 'allocation', 'optimize']):
        budget_insight = calculate_budget_insight()
        rich_content = {
            "type": "budget_optimization",
            "data": budget_insight,
            "visualization": "budget_vs_actual",
            "title": "Budget Optimization Analysis"
        }
        enhanced_msg = (f"{base_response}\n\n💰 **Budget Tip**: You could save {format_currency(budget_insight['optimization_potential'])} "
                       f"per month by sticking to your budget. {budget_insight['reallocation_suggestion']}.")

    else:
        # Default enhancement - add a helpful tip
        enhanced_msg = base_response
        tips = [
            "💡 Ask me about your spending patterns to see where you can save!",
            "📊 Try asking about your investment portfolio performance.",
            "🎯 Want to know how to reach your financial goals faster? Just ask!",
            "💳 I can help you optimize your credit card payments.",
            "📈 Ask me to analyze your budget for savings opportunities."
        ]
        import random
        enhanced_msg += f"\n\n{random.choice(tips)}"

    # Log the query type for telemetry
    logger.info(f"DEMO_CHAT: Query type detected - {query_lower[:100]}")

    return {
        "message": enhanced_msg,
        "session_id": None,
        "rich_content": rich_content,
        "demo_mode": True
    }

def get_demo_suggestions(context: str = None) -> List[str]:
    """Get contextual demo suggestions based on current conversation"""

    base_suggestions = [
        "Show me my spending breakdown",
        "How can I save more money?",
        "Analyze my investment portfolio",
        "What's my path to financial independence?",
        "Help me optimize my budget",
        "Should I pay off debt or invest?"
    ]

    if context:
        context_lower = context.lower()
        if 'spending' in context_lower:
            return [
                "Which categories am I overspending in?",
                "How does my spending compare to last month?",
                "Show me my dining expenses trend",
                "What's my biggest expense category?",
                "How can I reduce my monthly spending?",
                "Create a spending reduction plan"
            ]
        elif 'invest' in context_lower:
            return [
                "What's my portfolio allocation?",
                "Show me my YTD investment returns",
                "Should I rebalance my portfolio?",
                "How much should I invest monthly?",
                "What's my risk tolerance score?",
                "Analyze my 401(k) performance"
            ]
        elif 'goal' in context_lower or 'save' in context_lower:
            return [
                "How long until I reach my emergency fund goal?",
                "What's my savings rate trend?",
                "Help me prioritize my financial goals",
                "How can I save for a house down payment?",
                "Calculate my retirement readiness",
                "Show me my goal completion timeline"
            ]

    return base_suggestions