# TRUEFIBACKEND/agents/calculation_router.py
# Intelligent routing to appropriate calculations based on user profile and question

from typing import List, Dict, Any, Optional
import re
import logging
from agents.intents import Intent

logger = logging.getLogger(__name__)

class CalculationRouter:
    """Routes to appropriate calculations based on user profile and question context"""

    def __init__(self):
        self.calculation_map = self._build_calculation_map()
        self.keyword_map = self._build_keyword_map()

    def _build_calculation_map(self) -> Dict[str, List[str]]:
        """Build mapping of intents to calculation types"""
        return {
            Intent.SPENDING_ANALYSIS.value: [
                'spending_flexibility',
                'seasonal_patterns',
                'true_savings_capacity',
                'after_tax_income'
            ],
            Intent.SAVINGS_ANALYSIS.value: [
                'true_savings_capacity',
                'after_tax_income',
                'retirement_runway',
                'portfolio_projection'
            ],
            Intent.BUDGET_ANALYSIS.value: [
                'spending_flexibility',
                'true_savings_capacity',
                'seasonal_patterns'
            ],
            Intent.INVESTMENT_ANALYSIS.value: [
                'portfolio_projection',
                'expected_returns',
                'tax_efficient_withdrawal',
                'retirement_runway'
            ],
            Intent.DEBT_ANALYSIS.value: [
                'debt_strategies',
                'optimal_payoff',
                'after_tax_income'
            ],
            Intent.TAX_PLANNING.value: [
                'after_tax_income',
                'quarterly_taxes',
                'tax_efficient_withdrawal'
            ],
            Intent.RETIREMENT_PLANNING.value: [
                'retirement_runway',
                'social_security',
                'portfolio_projection',
                'tax_efficient_withdrawal'
            ],
            Intent.GOAL_PLANNING.value: [
                'portfolio_projection',
                'college_savings',
                'retirement_runway',
                'true_savings_capacity'
            ],
            Intent.NET_WORTH_ANALYSIS.value: [
                'portfolio_projection',
                'debt_strategies',
                'after_tax_income'
            ]
        }

    def _build_keyword_map(self) -> Dict[str, List[str]]:
        """Build mapping of keywords to calculation types"""
        return {
            'tax': ['after_tax_income', 'quarterly_taxes', 'tax_efficient_withdrawal'],
            'taxes': ['after_tax_income', 'quarterly_taxes', 'tax_efficient_withdrawal'],
            'after-tax': ['after_tax_income'],
            'quarterly': ['quarterly_taxes'],
            'retirement': ['retirement_runway', 'social_security', 'portfolio_projection'],
            'retire': ['retirement_runway', 'social_security', 'portfolio_projection'],
            '401k': ['retirement_runway', 'portfolio_projection', 'tax_efficient_withdrawal'],
            'ira': ['retirement_runway', 'portfolio_projection', 'tax_efficient_withdrawal'],
            'social security': ['social_security'],
            'college': ['college_savings'],
            'education': ['college_savings'],
            '529': ['college_savings'],
            'debt': ['debt_strategies', 'optimal_payoff'],
            'loan': ['debt_strategies', 'optimal_payoff'],
            'credit card': ['debt_strategies', 'optimal_payoff'],
            'payoff': ['debt_strategies', 'optimal_payoff'],
            'avalanche': ['debt_strategies'],
            'snowball': ['debt_strategies'],
            'invest': ['portfolio_projection', 'expected_returns'],
            'portfolio': ['portfolio_projection', 'expected_returns'],
            'growth': ['portfolio_projection'],
            'return': ['expected_returns', 'portfolio_projection'],
            'spending': ['spending_flexibility', 'seasonal_patterns', 'true_savings_capacity'],
            'expense': ['spending_flexibility', 'true_savings_capacity'],
            'save': ['true_savings_capacity', 'retirement_runway'],
            'savings': ['true_savings_capacity', 'retirement_runway'],
            'emergency': ['spending_flexibility', 'true_savings_capacity'],
            'seasonal': ['seasonal_patterns'],
            'holiday': ['seasonal_patterns'],
            'withdraw': ['tax_efficient_withdrawal'],
            'withdrawal': ['tax_efficient_withdrawal'],
            'scenario': ['financial_scenario'],
            'what if': ['financial_scenario'],
            'job loss': ['financial_scenario'],
            'raise': ['financial_scenario'],
            'salary increase': ['financial_scenario'],
            'buy house': ['financial_scenario'],
            'buy car': ['financial_scenario'],
            'major purchase': ['financial_scenario']
        }

    def get_relevant_calculations(self, question: str, profile: Dict[str, Any], intent: Optional[Intent] = None) -> List[str]:
        """
        Determine which calculations are relevant based on question and user profile

        Args:
            question: User's question
            profile: User profile pack
            intent: Classified intent (optional)

        Returns:
            List of calculation types to perform
        """
        calculations = set(['basic_metrics'])  # Always include basic metrics

        # Add calculations based on intent
        if intent:
            intent_calcs = self.calculation_map.get(intent.value, [])
            calculations.update(intent_calcs)

        # Add calculations based on keywords in question
        question_lower = question.lower()
        for keyword, calc_types in self.keyword_map.items():
            if keyword in question_lower:
                calculations.update(calc_types)

        # Add profile-based calculations
        profile_calculations = self._get_profile_based_calculations(profile)
        calculations.update(profile_calculations)

        # Add scenario calculations if needed
        if self._needs_scenario_analysis(question_lower):
            calculations.add('financial_scenario')

        # Convert to list and prioritize
        calculation_list = list(calculations)
        return self._prioritize_calculations(calculation_list, profile)

    def _get_profile_based_calculations(self, profile: Dict[str, Any]) -> List[str]:
        """Get calculations based on user profile characteristics"""
        calculations = []
        user_core = profile.get('user_core', {})

        # Age-based calculations
        age = user_core.get('age')
        if age:
            try:
                age_int = int(age) if isinstance(age, str) else age
                if age_int > 50:
                    calculations.extend(['retirement_runway', 'social_security', 'tax_efficient_withdrawal'])
                elif age_int < 35:
                    calculations.extend(['debt_strategies', 'true_savings_capacity'])
                else:
                    calculations.extend(['portfolio_projection', 'college_savings'])
            except:
                pass

        # Life stage based
        life_stage = user_core.get('life_stage', '').lower()
        if life_stage:
            if 'early' in life_stage:
                calculations.extend(['debt_strategies', 'true_savings_capacity'])
            elif 'mid' in life_stage:
                calculations.extend(['college_savings', 'portfolio_projection'])
            elif 'late' in life_stage or 'retire' in life_stage:
                calculations.extend(['retirement_runway', 'tax_efficient_withdrawal', 'social_security'])

        # Family status based
        dependents = user_core.get('dependents', 0)
        if dependents > 0:
            calculations.append('college_savings')

        marital_status = user_core.get('marital_status', '').lower()
        if 'married' in marital_status:
            calculations.append('after_tax_income')  # Joint tax considerations

        # Financial status based
        if profile.get('manual_liabilities'):
            calculations.append('debt_strategies')

        if profile.get('holdings'):
            calculations.extend(['portfolio_projection', 'expected_returns'])

        # Tax profile based
        if user_core.get('federal_rate') or user_core.get('state_rate'):
            calculations.append('after_tax_income')

        # Risk profile based
        risk_tolerance = user_core.get('risk_tolerance')
        if risk_tolerance:
            calculations.append('expected_returns')

        return calculations

    def _needs_scenario_analysis(self, question_lower: str) -> bool:
        """Determine if scenario analysis is needed"""
        scenario_triggers = [
            'what if', 'what would happen', 'if i', 'should i',
            'considering', 'thinking about', 'planning to',
            'want to buy', 'want to purchase', 'lose my job',
            'get a raise', 'salary increase', 'change job',
            'have a baby', 'get married', 'retire early'
        ]
        return any(trigger in question_lower for trigger in scenario_triggers)

    def _prioritize_calculations(self, calculations: List[str], profile: Dict[str, Any]) -> List[str]:
        """Prioritize calculations based on importance and dependencies"""
        # Define calculation priorities (lower number = higher priority)
        priority_map = {
            'basic_metrics': 1,
            'after_tax_income': 2,
            'true_savings_capacity': 3,
            'spending_flexibility': 4,
            'debt_strategies': 5,
            'retirement_runway': 6,
            'portfolio_projection': 7,
            'college_savings': 8,
            'expected_returns': 9,
            'social_security': 10,
            'tax_efficient_withdrawal': 11,
            'quarterly_taxes': 12,
            'optimal_payoff': 13,
            'seasonal_patterns': 14,
            'financial_scenario': 15
        }

        # Sort by priority
        sorted_calcs = sorted(calculations, key=lambda x: priority_map.get(x, 99))

        # Limit to top 8 calculations to avoid overwhelming
        return sorted_calcs[:8]

    def get_calculation_context(self, calculation_type: str, profile: Dict[str, Any]) -> Dict[str, Any]:
        """Get context and parameters for a specific calculation type"""
        context = {
            'calculation_type': calculation_type,
            'user_context': {}
        }

        user_core = profile.get('user_core', {})

        # Add relevant context based on calculation type
        if calculation_type in ['retirement_runway', 'social_security']:
            context['user_context']['age'] = user_core.get('age')
            context['user_context']['retirement_accounts'] = len([a for a in profile.get('accounts', [])
                                                                 if a.get('type') == 'retirement'])

        elif calculation_type == 'college_savings':
            context['user_context']['dependents'] = user_core.get('dependents', 0)
            context['user_context']['ages_of_children'] = []  # Would need to track this

        elif calculation_type in ['after_tax_income', 'quarterly_taxes', 'tax_efficient_withdrawal']:
            context['user_context']['filing_status'] = user_core.get('filing_status')
            context['user_context']['federal_rate'] = user_core.get('federal_rate')
            context['user_context']['state_rate'] = user_core.get('state_rate')

        elif calculation_type in ['debt_strategies', 'optimal_payoff']:
            context['user_context']['has_debt'] = bool(profile.get('manual_liabilities'))
            context['user_context']['debt_count'] = len(profile.get('manual_liabilities', []))

        elif calculation_type in ['portfolio_projection', 'expected_returns']:
            context['user_context']['risk_tolerance'] = user_core.get('risk_tolerance')
            context['user_context']['investment_horizon'] = user_core.get('investment_horizon')
            context['user_context']['has_investments'] = bool(profile.get('holdings'))

        elif calculation_type in ['spending_flexibility', 'seasonal_patterns', 'true_savings_capacity']:
            context['user_context']['has_budget'] = bool(profile.get('budgets'))
            context['user_context']['income_level'] = user_core.get('household_income')

        return context

    def format_calculation_request(self, calculation_types: List[str], profile: Dict[str, Any]) -> Dict[str, Any]:
        """Format a complete calculation request for the modeling agent"""
        request = {
            'requested_calculations': calculation_types,
            'calculation_contexts': {},
            'profile_summary': self._create_profile_summary(profile)
        }

        # Add context for each calculation
        for calc_type in calculation_types:
            request['calculation_contexts'][calc_type] = self.get_calculation_context(calc_type, profile)

        return request

    def _create_profile_summary(self, profile: Dict[str, Any]) -> Dict[str, Any]:
        """Create a summary of relevant profile information"""
        user_core = profile.get('user_core', {})

        return {
            'demographics': {
                'age': user_core.get('age'),
                'life_stage': user_core.get('life_stage'),
                'marital_status': user_core.get('marital_status'),
                'dependents': user_core.get('dependents', 0)
            },
            'financial': {
                'income': user_core.get('household_income'),
                'net_worth': profile.get('derived_metrics', {}).get('net_worth'),
                'has_debt': bool(profile.get('manual_liabilities')),
                'has_investments': bool(profile.get('holdings')),
                'has_retirement': bool([a for a in profile.get('accounts', []) if a.get('type') == 'retirement'])
            },
            'preferences': {
                'risk_tolerance': user_core.get('risk_tolerance'),
                'investment_horizon': user_core.get('investment_horizon')
            },
            'tax': {
                'filing_status': user_core.get('filing_status'),
                'federal_rate': user_core.get('federal_rate'),
                'state_rate': user_core.get('state_rate')
            }
        }

    def should_include_life_scenarios(self, question: str, profile: Dict[str, Any]) -> bool:
        """Determine if life scenario calculations should be included"""
        # Check for life scenario keywords
        life_keywords = [
            'life', 'future', 'scenario', 'plan', 'planning',
            'years from now', 'when i', 'if i', 'should i',
            'retire', 'married', 'children', 'house', 'career'
        ]

        question_lower = question.lower()
        has_life_keywords = any(keyword in question_lower for keyword in life_keywords)

        # Check if user is at a life transition point
        user_core = profile.get('user_core', {})
        age = user_core.get('age')
        life_stage = user_core.get('life_stage', '').lower()

        at_transition = False
        if age:
            try:
                age_int = int(age) if isinstance(age, str) else age
                # Common transition ages
                transition_ages = [25, 30, 35, 40, 50, 60, 65]
                at_transition = any(abs(age_int - t_age) <= 2 for t_age in transition_ages)
            except:
                pass

        # Check if life stage suggests planning needs
        planning_stages = ['early_career', 'mid_career', 'late_career']
        needs_planning = any(stage in life_stage for stage in planning_stages)

        return has_life_keywords or at_transition or needs_planning

    def should_include_investment_scenarios(self, question: str, profile: Dict[str, Any]) -> bool:
        """Determine if investment scenario calculations should be included"""
        # Check for investment scenario keywords
        invest_keywords = [
            'invest', 'portfolio', 'stock', 'bond', 'etf', '401k', 'ira',
            'retirement account', 'brokerage', 'market', 'return',
            'risk', 'allocation', 'rebalance', 'diversify'
        ]

        question_lower = question.lower()
        has_invest_keywords = any(keyword in question_lower for keyword in invest_keywords)

        # Check if user has investments
        has_investments = bool(profile.get('holdings')) or \
                         bool([a for a in profile.get('accounts', []) if a.get('type') in ['investment', 'retirement']])

        # Check risk profile
        user_core = profile.get('user_core', {})
        has_risk_profile = bool(user_core.get('risk_tolerance'))

        return has_invest_keywords or (has_investments and has_risk_profile)