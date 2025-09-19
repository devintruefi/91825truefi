#!/usr/bin/env python3
"""
Test the personalized financial calculations and modeling agent enhancements
"""

import asyncio
import json
import logging
from decimal import Decimal
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Import the enhanced components
from agents.modeling_agent import ModelingAgent
from agents.calculations import PersonalizedCalculator
from agents.calculation_router import CalculationRouter
from agents.intents import Intent
from profile_pack.builder import ProfilePackBuilder

def create_test_profile_pack():
    """Create a comprehensive test profile pack with demographics"""
    return {
        'user_core': {
            'user_id': 'test_user_123',
            'first_name': 'John',
            'last_name': 'Doe',
            'age': 35,
            'life_stage': 'mid_career',
            'marital_status': 'married',
            'dependents': 2,
            'household_income': 120000,
            'state_residence': 'CA',
            'risk_tolerance': 'moderate',
            'investment_horizon': 'long_term',
            'filing_status': 'married_filing_jointly',
            'federal_rate': 0.24,
            'state_rate': 0.093  # California
        },
        'derived_metrics': {
            'net_worth': 250000,
            'monthly_income_avg': 10000,
            'monthly_expenses_avg': 7000,
            'savings_rate_3m': 30,
            'liquid_reserves_months': 6,
            'debt_to_income': 25,
            'cash_balance': 42000,
            'investment_balance': 180000,
            'retirement_balance': 95000,
            'essential_expenses_ratio': 65,
            'discretionary_expenses_ratio': 35,
            'investment_returns_pct': 12.5,
            'retirement_readiness_pct': 15,  # Still early
            'income_stability_score': 0.85,
            'spending_stability_score': 0.72
        },
        'accounts': [
            {'name': 'Chase Checking', 'type': 'depository', 'balance': 12000},
            {'name': 'Vanguard 401k', 'type': 'investment', 'subtype': '401k', 'balance': 95000},
            {'name': 'E*Trade Brokerage', 'type': 'investment', 'balance': 85000}
        ],
        'manual_liabilities': [
            {'name': 'Mortgage', 'balance': 350000, 'interest_rate': 0.04},
            {'name': 'Auto Loan', 'balance': 25000, 'interest_rate': 0.05}
        ],
        'goals': [
            {'name': 'Kids College Fund', 'target_amount': 200000, 'current_amount': 15000},
            {'name': 'Retirement', 'target_amount': 2000000, 'current_amount': 95000}
        ],
        'holdings': [
            {'security_name': 'Vanguard S&P 500', 'market_value': 50000, 'cost_basis': 42000},
            {'security_name': 'Apple Inc', 'market_value': 20000, 'cost_basis': 15000}
        ],
        'generated_at': datetime.now().isoformat()
    }

def test_personalized_calculator():
    """Test the PersonalizedCalculator with various scenarios"""
    print("\n" + "="*60)
    print("TESTING PERSONALIZED CALCULATOR")
    print("="*60)

    profile = create_test_profile_pack()
    calc = PersonalizedCalculator(profile)

    # Test 1: After-tax income calculation
    print("\n1. After-Tax Income Calculation:")
    gross_income = 120000
    result = calc.calculate_after_tax_income(gross_income)
    print(f"   Gross Income: ${gross_income:,}")
    print(f"   Federal Tax Rate: {profile['user_core']['federal_rate']:.1%}")
    print(f"   State Tax Rate: {profile['user_core']['state_rate']:.1%}")
    print(f"   After-Tax Income: ${result['result']:,.2f}")
    print(f"   Formula: {result['formula']}")

    # Test 2: Retirement runway
    print("\n2. Retirement Runway Calculation:")
    monthly_expenses = 7000
    result = calc.calculate_retirement_runway(monthly_expenses)
    print(f"   Monthly Expenses: ${monthly_expenses:,}")
    print(f"   Retirement Balance: ${profile['derived_metrics']['retirement_balance']:,}")
    if isinstance(result['result'], dict):
        print(f"   Result: {json.dumps(result['result'], indent=6)}")
    else:
        print(f"   Years Until FI: {result['result']}")

    # Test 3: College savings need
    print("\n3. College Savings Need:")
    result = calc.calculate_college_savings_need()
    print(f"   Number of Children: {profile['user_core']['dependents']}")
    if isinstance(result['result'], (int, float)):
        print(f"   Total College Cost Needed: ${result['result']:,.2f}")
        print(f"   Monthly Savings Required: ${result.get('monthly_required', 0):,.2f}")
    else:
        print(f"   Result: {json.dumps(result['result'], indent=6)}")

    # Test 4: Portfolio projection
    print("\n4. Portfolio Projection (10 years):")
    result = calc.calculate_portfolio_projection(years=10, monthly_contribution=1000)
    print(f"   Current Portfolio: ${profile['derived_metrics']['investment_balance']:,}")
    print(f"   Monthly Contribution: $1,000")
    print(f"   Expected Return: {calc.get_expected_return_rate():.1%}")
    if isinstance(result['result'], (int, float)):
        print(f"   Projected Value: ${result['result']:,.2f}")
    else:
        print(f"   Result: {result['result']}")

    # Test 5: True savings capacity
    print("\n5. True Savings Capacity:")
    expenses_breakdown = {
        'housing': 2500,
        'groceries': 600,
        'transportation': 400,
        'utilities': 200,
        'other': 3300
    }
    result = calc.calculate_true_savings_capacity(10000, expenses_breakdown)
    print(f"   Monthly Income: $10,000")
    if 'essential_expenses' in result:
        print(f"   Essential Expenses: ${result.get('essential_expenses', 0):,.2f}")
    if isinstance(result['result'], (int, float)):
        print(f"   Maximum Savings Potential: ${result['result']:,.2f}")
    else:
        print(f"   Result: {result['result']}")

    # Test 6: Financial scenario - salary increase
    print("\n6. Financial Scenario - 20% Salary Increase:")
    params = {'increase_percent': 20}
    result = calc.simulate_financial_scenario('salary_increase', params)
    if 'inputs' in result and 'new_income' in result['inputs']:
        print(f"   New Annual Income: ${result['inputs']['new_income']:,.2f}")
    if 'inputs' in result and 'additional_annual_savings' in result['inputs']:
        print(f"   Additional Annual Savings: ${result['inputs']['additional_annual_savings']:,.2f}")
    if isinstance(result.get('result'), str):
        print(f"   Impact: {result.get('result', 'N/A')}")
    else:
        print(f"   Result: {result}")

def test_calculation_router():
    """Test the CalculationRouter for intelligent calculation selection"""
    print("\n" + "="*60)
    print("TESTING CALCULATION ROUTER")
    print("="*60)

    profile = create_test_profile_pack()
    router = CalculationRouter()

    test_questions = [
        ("How much can I save for retirement?", Intent.RETIREMENT_PLANNING),
        ("What's my tax liability this year?", Intent.TAX_PLANNING),
        ("Should I pay off my mortgage early?", Intent.DEBT_ANALYSIS),
        ("How much do I need for my kids' college?", Intent.GOAL_PLANNING),
        ("Can I afford to invest more?", Intent.INVESTMENT_ANALYSIS)
    ]

    for question, intent in test_questions:
        print(f"\nQuestion: '{question}'")
        print(f"Intent: {intent.value}")

        calculations = router.get_relevant_calculations(question, profile, intent)
        print(f"Selected Calculations: {calculations[:5]}")  # Show top 5

        # Check if life scenarios should be included
        include_life = router.should_include_life_scenarios(question, profile)
        print(f"Include Life Scenarios: {include_life}")

        # Check if investment scenarios should be included
        include_invest = router.should_include_investment_scenarios(question, profile)
        print(f"Include Investment Scenarios: {include_invest}")

async def test_modeling_agent():
    """Test the enhanced modeling agent with personalization"""
    print("\n" + "="*60)
    print("TESTING ENHANCED MODELING AGENT")
    print("="*60)

    profile = create_test_profile_pack()
    agent = ModelingAgent()

    # Create a sample request
    request = {
        'question': "What's my retirement outlook and how can I improve it?",
        'profile_pack': profile,
        'sql_plan': {
            'sql': "SELECT * FROM transactions WHERE user_id = ?",
            'params': ['test_user_123']
        },
        'sql_result': {
            'columns': ['month', 'income', 'expenses', 'savings'],
            'rows': [
                ['2024-01', 10000, 7000, 3000],
                ['2024-02', 10000, 6500, 3500],
                ['2024-03', 10000, 7500, 2500]
            ]
        }
    }

    print("\nSending request to modeling agent...")
    print(f"Question: {request['question']}")
    print(f"User Profile:")
    print(f"  - Age: {profile['user_core']['age']}")
    print(f"  - Life Stage: {profile['user_core']['life_stage']}")
    print(f"  - Dependents: {profile['user_core']['dependents']}")
    print(f"  - Risk Tolerance: {profile['user_core']['risk_tolerance']}")

    try:
        result = await agent.analyze_data(request)

        if 'error' in result:
            print(f"\nError: {result['error']}")
        else:
            print("\nModeling Agent Response:")
            print(f"Answer: {result.get('answer_markdown', 'No answer')[:200]}...")

            if result.get('computations'):
                print(f"\nPerformed {len(result['computations'])} calculations:")
                for comp in result['computations'][:3]:  # Show first 3
                    print(f"  - {comp.get('name', 'Unnamed')}: {comp.get('result', 'N/A')}")

            if result.get('personalized_context'):
                print(f"\nPersonalized Context ({len(result['personalized_context'])} insights):")
                for ctx in result['personalized_context'][:3]:  # Show first 3
                    print(f"  - {ctx}")

            if result.get('assumptions'):
                print(f"\nAssumptions Made:")
                for assumption in result['assumptions'][:3]:  # Show first 3
                    print(f"  - {assumption}")

    except Exception as e:
        print(f"\nException occurred: {e}")
        import traceback
        traceback.print_exc()

def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("PERSONALIZATION ENHANCEMENT TEST SUITE")
    print("="*60)

    # Test individual components
    test_personalized_calculator()
    test_calculation_router()

    # Test integrated modeling agent
    print("\nRunning async modeling agent test...")
    asyncio.run(test_modeling_agent())

    print("\n" + "="*60)
    print("ALL TESTS COMPLETED")
    print("="*60)

if __name__ == "__main__":
    main()