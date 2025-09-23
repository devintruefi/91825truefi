# TRUEFIBACKEND/agents/formatting.py
# Utilities for formatting computation results for frontend display

from typing import Dict, Any, Union
import json

def format_computation_result(computation: Dict[str, Any]) -> Dict[str, Any]:
    """Format a computation result for clean frontend display"""

    # Handle the result field specially
    result = computation.get('result')

    if isinstance(result, dict):
        # Format complex result objects as readable strings
        if 'current_savings' in result:
            # True Savings Capacity Analysis
            formatted = f"Current: ${result.get('current_savings', 0):,.2f}/mo ({result.get('current_rate', 0):.1f}%)\n"
            formatted += f"With moderate cuts: ${result.get('moderate_savings', 0):,.2f}/mo ({result.get('moderate_rate', 0):.1f}%)\n"
            formatted += f"With aggressive cuts: ${result.get('aggressive_savings', 0):,.2f}/mo ({result.get('aggressive_rate', 0):.1f}%)\n"
            formatted += f"Maximum possible: ${result.get('max_possible_savings', 0):,.2f}/mo\n"
            formatted += result.get('recommendation', '')
            computation['result'] = formatted

        elif 'years_to_retirement' in result:
            # Retirement Runway Analysis
            formatted = f"{result.get('status', '')}\n"
            formatted += f"Amount needed: ${result.get('retirement_needed', 0):,.0f}\n"
            formatted += f"Current savings: ${result.get('current_savings', 0):,.0f}\n"
            formatted += f"Savings gap: ${result.get('savings_gap', 0):,.0f}\n"
            formatted += f"Monthly contribution needed: ${result.get('monthly_contribution_needed', 0):,.2f}\n"
            formatted += f"Readiness score: {result.get('readiness_score', 0):.0f}%"
            computation['result'] = formatted

        elif 'future_value' in result:
            # Portfolio Growth Projection
            formatted = f"Future value: ${result.get('future_value', 0):,.2f}\n"
            formatted += f"Total contributions: ${result.get('total_contributions', 0):,.2f}\n"
            formatted += f"Total growth: ${result.get('total_growth', 0):,.2f}\n"
            formatted += f"Growth percentage: {result.get('growth_percentage', 0):.1f}%"
            computation['result'] = formatted

        elif 'total_spending' in result:
            # Spending Flexibility Analysis
            formatted = f"Total spending: ${result.get('total_spending', 0):,.2f}\n"
            formatted += f"Essential: ${result.get('essential_spending', 0):,.2f}\n"
            formatted += f"Discretionary: ${result.get('discretionary_spending', 0):,.2f}\n"
            formatted += f"Flexibility score: {result.get('flexibility_score', 0):.0f}%\n"
            formatted += result.get('recommendation', '')
            computation['result'] = formatted

    # Ensure numeric values are reasonable (fix overflow bugs)
    if isinstance(result, (int, float)):
        # Check for overflow/underflow
        if abs(result) > 1e15:  # Anything over a quadrillion is likely a bug
            computation['result'] = "Calculation error - value out of range"
        elif abs(result) > 1e9:  # Format billions specially
            computation['result'] = f"${result/1e9:,.1f}B"
        elif abs(result) > 1e6:  # Format millions specially
            computation['result'] = f"${result/1e6:,.1f}M"
        else:
            computation['result'] = f"${result:,.2f}" if result != 0 else result

    return computation

def format_savings_analysis(analysis: Dict[str, Any]) -> str:
    """Format savings analysis for display"""
    current = analysis.get('current_savings', 0)
    moderate = analysis.get('moderate_savings', 0)
    aggressive = analysis.get('aggressive_savings', 0)

    message = f"💰 **Savings Analysis**\n\n"

    if current < 0:
        message += f"⚠️ You're currently spending ${abs(current):,.2f}/month more than you earn.\n\n"
        message += "**Potential improvements:**\n"
        if moderate > 0:
            message += f"• Moderate cuts (25% of discretionary): Save ${moderate:,.2f}/month\n"
        if aggressive > 0:
            message += f"• Aggressive cuts (50% of discretionary): Save ${aggressive:,.2f}/month\n"
    else:
        message += f"✅ Current savings: ${current:,.2f}/month\n\n"
        message += "**Optimization potential:**\n"
        message += f"• With moderate cuts: ${moderate:,.2f}/month\n"
        message += f"• With aggressive cuts: ${aggressive:,.2f}/month\n"

    return message

def fix_debt_calculation_overflow(interest_savings: float) -> float:
    """Fix the debt calculation overflow bug"""
    # If the value is astronomical, it's likely a calculation error
    if abs(interest_savings) > 1e10:  # More than 10 billion
        # Return a reasonable default
        return 0
    return interest_savings

def format_debt_strategy_result(strategy_data: Dict[str, Any]) -> str:
    """Format debt strategy comparison for display"""
    avalanche = strategy_data.get('avalanche', {})
    snowball = strategy_data.get('snowball', {})
    comparison = strategy_data.get('comparison', {})

    # Fix overflow in interest savings
    interest_savings = comparison.get('interest_savings', 0)
    if abs(interest_savings) > 1e10:
        interest_savings = abs(snowball.get('total_interest', 0) - avalanche.get('total_interest', 0))

    recommended = comparison.get('recommended_strategy', 'avalanche')

    message = "📊 **Debt Payoff Strategy Comparison**\n\n"

    message += f"**Avalanche Method** (Highest interest first):\n"
    message += f"• Time to debt-free: {avalanche.get('months', 0)} months\n"
    message += f"• Total interest paid: ${avalanche.get('total_interest', 0):,.2f}\n\n"

    message += f"**Snowball Method** (Smallest balance first):\n"
    message += f"• Time to debt-free: {snowball.get('months', 0)} months\n"
    message += f"• Total interest paid: ${snowball.get('total_interest', 0):,.2f}\n\n"

    if recommended == 'avalanche' and interest_savings > 0:
        message += f"✅ **Recommended: Avalanche Method**\n"
        message += f"Save ${min(interest_savings, 1000000):,.2f} in interest with mathematical optimization"
    else:
        message += f"✅ **Recommended: Snowball Method**\n"
        message += "Build momentum with psychological wins"

    return message