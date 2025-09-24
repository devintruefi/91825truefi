# TRUEFIBACKEND/agents/scenario_analyzer.py
# Scenario comparison and analysis tools for financial planning

from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
import logging

logger = logging.getLogger(__name__)

class ScenarioAnalyzer:
    """Compare different financial scenarios and strategies"""

    def __init__(self, base_profile: Dict[str, Any]):
        """
        Initialize with user's base financial profile

        Args:
            base_profile: User's current financial situation
        """
        self.base_profile = base_profile
        self.current_age = base_profile.get('demographics', {}).get('age', 35)
        self.monthly_income = base_profile.get('derived_metrics', {}).get('monthly_income_avg', 0)
        self.monthly_expenses = base_profile.get('derived_metrics', {}).get('monthly_expenses_avg', 0)
        self.current_savings = base_profile.get('derived_metrics', {}).get('total_assets', 0)
        self.current_debt = base_profile.get('derived_metrics', {}).get('total_liabilities', 0)

    def compare_savings_strategies(
        self,
        strategies: Optional[List[Dict[str, Any]]] = None,
        time_horizon_years: int = 10
    ) -> Dict[str, Any]:
        """
        Compare different savings strategies

        Args:
            strategies: List of strategies to compare (or use defaults)
            time_horizon_years: Years to project

        Returns:
            Comparison results with recommendations
        """
        if strategies is None:
            # Default strategies based on savings rate
            strategies = [
                {
                    'name': 'Conservative',
                    'savings_rate': 0.10,
                    'description': 'Save 10% of income',
                    'investment_return': 0.04
                },
                {
                    'name': 'Moderate',
                    'savings_rate': 0.20,
                    'description': 'Save 20% of income',
                    'investment_return': 0.06
                },
                {
                    'name': 'Aggressive',
                    'savings_rate': 0.30,
                    'description': 'Save 30% of income',
                    'investment_return': 0.08
                },
                {
                    'name': 'FIRE Movement',
                    'savings_rate': 0.50,
                    'description': 'Save 50% of income (Financial Independence)',
                    'investment_return': 0.07
                }
            ]

        results = []
        monthly_income = self.monthly_income

        for strategy in strategies:
            monthly_savings = monthly_income * strategy['savings_rate']
            annual_return = strategy['investment_return']

            # Calculate future value
            months = time_horizon_years * 12
            future_value = self.current_savings

            for month in range(months):
                # Apply monthly return and add savings
                monthly_return = annual_return / 12
                future_value = future_value * (1 + monthly_return) + monthly_savings

            # Calculate lifestyle impact
            discretionary_income = monthly_income - self.monthly_expenses
            lifestyle_impact = 'Minimal' if monthly_savings < discretionary_income * 0.3 else \
                               'Moderate' if monthly_savings < discretionary_income * 0.6 else \
                               'Significant'

            # Calculate years to financial independence (25x annual expenses)
            annual_expenses = self.monthly_expenses * 12
            fi_target = annual_expenses * 25
            years_to_fi = self._calculate_years_to_target(
                current_value=self.current_savings,
                target_value=fi_target,
                monthly_contribution=monthly_savings,
                annual_return=annual_return
            )

            results.append({
                'strategy_name': strategy['name'],
                'description': strategy['description'],
                'monthly_savings': monthly_savings,
                'savings_rate': strategy['savings_rate'] * 100,
                'future_value': future_value,
                'total_saved': monthly_savings * months,
                'investment_gains': future_value - self.current_savings - (monthly_savings * months),
                'lifestyle_impact': lifestyle_impact,
                'years_to_fi': years_to_fi,
                'projected_annual_income_at_retirement': future_value * 0.04  # 4% rule
            })

        # Determine best strategy based on goals
        best_growth = max(results, key=lambda x: x['future_value'])
        best_balanced = min(results, key=lambda x: abs(x['savings_rate'] - 20))
        most_achievable = max(results, key=lambda x: x['monthly_savings'] <= discretionary_income)

        return {
            'scenarios': results,
            'comparison_period': f'{time_horizon_years} years',
            'current_situation': {
                'monthly_income': monthly_income,
                'monthly_expenses': self.monthly_expenses,
                'current_savings': self.current_savings,
                'max_possible_savings': discretionary_income
            },
            'recommendations': {
                'best_growth': best_growth['strategy_name'],
                'best_balanced': best_balanced['strategy_name'],
                'most_achievable': most_achievable['strategy_name']
            },
            'insights': self._generate_savings_insights(results)
        }

    def compare_debt_payoff_strategies(
        self,
        debts: List[Dict[str, Any]],
        extra_payment: float = 0
    ) -> Dict[str, Any]:
        """
        Compare debt payoff strategies (avalanche vs snowball vs minimum)

        Args:
            debts: List of debts with balance, rate, minimum payment
            extra_payment: Additional monthly payment available

        Returns:
            Comparison of different payoff strategies
        """
        strategies = {}

        # Avalanche Method (highest rate first)
        avalanche_debts = sorted(debts, key=lambda x: x['interest_rate'], reverse=True)
        strategies['avalanche'] = self._calculate_debt_payoff(avalanche_debts, extra_payment)

        # Snowball Method (lowest balance first)
        snowball_debts = sorted(debts, key=lambda x: x['balance'])
        strategies['snowball'] = self._calculate_debt_payoff(snowball_debts, extra_payment)

        # Minimum Payments Only
        strategies['minimum'] = self._calculate_debt_payoff(debts, 0)

        # Calculate savings
        avalanche_savings = strategies['minimum']['total_interest'] - strategies['avalanche']['total_interest']
        snowball_savings = strategies['minimum']['total_interest'] - strategies['snowball']['total_interest']

        return {
            'strategies': {
                'avalanche': {
                    **strategies['avalanche'],
                    'description': 'Pay highest interest rate first',
                    'interest_saved': avalanche_savings,
                    'pros': ['Mathematically optimal', 'Lowest total interest paid'],
                    'cons': ['May take longer to see first debt eliminated']
                },
                'snowball': {
                    **strategies['snowball'],
                    'description': 'Pay smallest balance first',
                    'interest_saved': snowball_savings,
                    'pros': ['Quick wins boost motivation', 'Simplifies finances faster'],
                    'cons': ['May pay more interest overall']
                },
                'minimum': {
                    **strategies['minimum'],
                    'description': 'Pay only minimum payments',
                    'interest_saved': 0,
                    'pros': ['Lowest monthly payment'],
                    'cons': ['Highest total cost', 'Longest payoff time']
                }
            },
            'recommendation': 'avalanche' if avalanche_savings > snowball_savings * 1.2 else 'snowball',
            'monthly_payment_comparison': {
                'minimum_only': sum(d['minimum_payment'] for d in debts),
                'with_extra': sum(d['minimum_payment'] for d in debts) + extra_payment
            }
        }

    def compare_investment_allocations(
        self,
        allocations: Optional[List[Dict[str, Any]]] = None,
        time_horizon_years: int = 20
    ) -> Dict[str, Any]:
        """
        Compare different investment allocation strategies

        Args:
            allocations: List of allocation strategies (or use defaults)
            time_horizon_years: Investment time horizon

        Returns:
            Comparison of allocation strategies with risk/return profiles
        """
        if allocations is None:
            allocations = [
                {
                    'name': 'Conservative',
                    'stocks': 0.30,
                    'bonds': 0.60,
                    'cash': 0.10,
                    'expected_return': 0.05,
                    'volatility': 0.08
                },
                {
                    'name': 'Moderate',
                    'stocks': 0.60,
                    'bonds': 0.30,
                    'cash': 0.10,
                    'expected_return': 0.07,
                    'volatility': 0.12
                },
                {
                    'name': 'Aggressive',
                    'stocks': 0.80,
                    'bonds': 0.15,
                    'cash': 0.05,
                    'expected_return': 0.09,
                    'volatility': 0.18
                },
                {
                    'name': 'Age-Based',
                    'stocks': max(0.2, 1 - (self.current_age / 100)),
                    'bonds': min(0.7, self.current_age / 100),
                    'cash': 0.1,
                    'expected_return': 0.07,
                    'volatility': 0.14
                }
            ]

        results = []
        investment_amount = self.current_savings

        for allocation in allocations:
            # Calculate expected outcomes
            expected_return = allocation['expected_return']
            volatility = allocation['volatility']

            # Future value calculations
            future_value_expected = investment_amount * ((1 + expected_return) ** time_horizon_years)

            # Calculate confidence intervals (using 1 and 2 standard deviations)
            # Assuming log-normal distribution for returns
            import math

            # Best case (95th percentile, ~2 std dev up)
            best_case_return = expected_return + (2 * volatility)
            future_value_best = investment_amount * ((1 + best_case_return) ** time_horizon_years)

            # Worst case (5th percentile, ~2 std dev down)
            worst_case_return = expected_return - (2 * volatility)
            future_value_worst = investment_amount * ((1 + max(worst_case_return, -0.5)) ** time_horizon_years)

            # Calculate risk metrics
            sharpe_ratio = (expected_return - 0.02) / volatility  # Assuming 2% risk-free rate
            max_drawdown = -2 * volatility  # Approximation

            # Age appropriateness
            years_to_retirement = max(0, 67 - self.current_age)
            age_appropriate = 'Yes' if (
                (years_to_retirement > 20 and allocation['stocks'] >= 0.6) or
                (10 <= years_to_retirement <= 20 and 0.4 <= allocation['stocks'] <= 0.7) or
                (years_to_retirement < 10 and allocation['stocks'] <= 0.5)
            ) else 'No'

            results.append({
                'allocation_name': allocation['name'],
                'asset_mix': {
                    'stocks': allocation['stocks'] * 100,
                    'bonds': allocation['bonds'] * 100,
                    'cash': allocation.get('cash', 0) * 100
                },
                'expected_return_annual': expected_return * 100,
                'volatility_annual': volatility * 100,
                'future_value_expected': future_value_expected,
                'future_value_range': {
                    'worst_case': future_value_worst,
                    'best_case': future_value_best
                },
                'risk_metrics': {
                    'sharpe_ratio': sharpe_ratio,
                    'max_drawdown_estimate': max_drawdown * 100,
                    'loss_probability_1yr': self._calculate_loss_probability(expected_return, volatility)
                },
                'age_appropriate': age_appropriate
            })

        # Find optimal allocation based on different criteria
        best_return = max(results, key=lambda x: x['expected_return_annual'])
        best_risk_adjusted = max(results, key=lambda x: x['risk_metrics']['sharpe_ratio'])
        most_conservative = min(results, key=lambda x: x['volatility_annual'])

        return {
            'allocations': results,
            'time_horizon': time_horizon_years,
            'recommendations': {
                'highest_return': best_return['allocation_name'],
                'best_risk_adjusted': best_risk_adjusted['allocation_name'],
                'most_conservative': most_conservative['allocation_name']
            },
            'insights': self._generate_allocation_insights(results, years_to_retirement)
        }

    def compare_retirement_scenarios(
        self,
        scenarios: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Compare different retirement scenarios

        Args:
            scenarios: List of retirement scenarios (or use defaults)

        Returns:
            Comparison of retirement outcomes
        """
        if scenarios is None:
            # Default retirement scenarios
            current_age = self.current_age
            scenarios = [
                {
                    'name': 'Early Retirement (55)',
                    'retirement_age': 55,
                    'monthly_savings': self.monthly_income * 0.35,
                    'lifestyle_adjustment': 0.8  # 80% of current expenses
                },
                {
                    'name': 'Standard Retirement (65)',
                    'retirement_age': 65,
                    'monthly_savings': self.monthly_income * 0.20,
                    'lifestyle_adjustment': 0.9  # 90% of current expenses
                },
                {
                    'name': 'Late Retirement (70)',
                    'retirement_age': 70,
                    'monthly_savings': self.monthly_income * 0.15,
                    'lifestyle_adjustment': 1.0  # 100% of current expenses
                },
                {
                    'name': 'Coast FIRE',
                    'retirement_age': 65,
                    'monthly_savings': self.monthly_income * 0.25,
                    'lifestyle_adjustment': 0.7,  # Lower expenses
                    'coast_age': 45  # Stop contributing at 45
                }
            ]

        results = []
        life_expectancy = 85

        for scenario in scenarios:
            retirement_age = scenario['retirement_age']
            years_to_retirement = max(0, retirement_age - self.current_age)
            years_in_retirement = life_expectancy - retirement_age
            monthly_savings = scenario['monthly_savings']
            annual_expenses_retirement = self.monthly_expenses * 12 * scenario['lifestyle_adjustment']

            # Calculate retirement nest egg needed (25x rule)
            retirement_needed = annual_expenses_retirement * 25

            # Project savings at retirement
            if 'coast_age' in scenario:
                # Coast FIRE: stop contributing at coast age
                coast_years = max(0, scenario['coast_age'] - self.current_age)
                coast_value = self._calculate_future_value(
                    present_value=self.current_savings,
                    monthly_payment=monthly_savings,
                    annual_rate=0.07,
                    years=coast_years
                )
                # Then let it grow without contributions
                remaining_years = max(0, retirement_age - scenario['coast_age'])
                projected_savings = coast_value * ((1.07) ** remaining_years)
            else:
                projected_savings = self._calculate_future_value(
                    present_value=self.current_savings,
                    monthly_payment=monthly_savings,
                    annual_rate=0.07,
                    years=years_to_retirement
                )

            # Calculate gap and success probability
            savings_gap = max(0, retirement_needed - projected_savings)
            success_probability = min(100, (projected_savings / retirement_needed) * 100) if retirement_needed > 0 else 100

            # Calculate sustainable withdrawal rate
            if years_in_retirement > 0:
                sustainable_withdrawal = projected_savings / years_in_retirement / 12
            else:
                sustainable_withdrawal = 0

            # Social Security estimate (rough approximation)
            social_security_monthly = 1500 if retirement_age >= 67 else \
                                      1200 if retirement_age >= 62 else 0

            results.append({
                'scenario_name': scenario['name'],
                'retirement_age': retirement_age,
                'years_to_retirement': years_to_retirement,
                'monthly_savings_required': monthly_savings,
                'retirement_nest_egg_needed': retirement_needed,
                'projected_savings_at_retirement': projected_savings,
                'savings_gap': savings_gap,
                'success_probability': success_probability,
                'monthly_retirement_income': {
                    'from_savings': sustainable_withdrawal,
                    'social_security': social_security_monthly,
                    'total': sustainable_withdrawal + social_security_monthly
                },
                'lifestyle_level': scenario['lifestyle_adjustment'] * 100,
                'feasibility': 'High' if success_probability > 80 else 'Medium' if success_probability > 50 else 'Low'
            })

        # Find optimal scenarios
        most_achievable = max(results, key=lambda x: x['success_probability'])
        earliest_retirement = min(results, key=lambda x: x['retirement_age'])
        best_lifestyle = max(results, key=lambda x: x['lifestyle_level'])

        return {
            'scenarios': results,
            'current_trajectory': {
                'current_age': self.current_age,
                'current_savings': self.current_savings,
                'current_monthly_savings': self.monthly_income - self.monthly_expenses
            },
            'recommendations': {
                'most_achievable': most_achievable['scenario_name'],
                'earliest_retirement': earliest_retirement['scenario_name'],
                'best_lifestyle': best_lifestyle['scenario_name']
            },
            'insights': self._generate_retirement_insights(results)
        }

    def _calculate_years_to_target(
        self,
        current_value: float,
        target_value: float,
        monthly_contribution: float,
        annual_return: float
    ) -> float:
        """Calculate years needed to reach a target value"""
        if monthly_contribution <= 0:
            return 999  # Impossible without contributions

        monthly_return = annual_return / 12
        if monthly_return == 0:
            months = (target_value - current_value) / monthly_contribution
        else:
            # Use future value formula solved for time
            import math
            try:
                months = math.log(
                    (target_value * monthly_return + monthly_contribution) /
                    (current_value * monthly_return + monthly_contribution)
                ) / math.log(1 + monthly_return)
            except:
                months = 999 * 12

        return min(months / 12, 999)

    def _calculate_debt_payoff(
        self,
        debts: List[Dict[str, Any]],
        extra_payment: float
    ) -> Dict[str, Any]:
        """Calculate debt payoff timeline and interest"""
        total_months = 0
        total_interest = 0
        payoff_timeline = []

        remaining_extra = extra_payment
        active_debts = debts.copy()

        while active_debts:
            # Apply payments to first debt in list (based on strategy order)
            current_debt = active_debts[0]
            balance = current_debt['balance']
            rate = current_debt['interest_rate'] / 12
            min_payment = current_debt['minimum_payment']

            # Apply extra payment to first debt
            payment = min_payment + remaining_extra
            months_to_pay = 0

            while balance > 0 and months_to_pay < 360:  # Max 30 years
                interest_charge = balance * rate
                principal_payment = min(payment - interest_charge, balance)
                balance -= principal_payment
                total_interest += interest_charge
                months_to_pay += 1

            total_months = max(total_months, months_to_pay)
            payoff_timeline.append({
                'debt_name': current_debt.get('name', f"Debt {len(payoff_timeline) + 1}"),
                'months_to_payoff': months_to_pay,
                'total_interest_paid': total_interest
            })

            # Move to next debt
            active_debts.pop(0)
            if active_debts:
                # Roll over payment to next debt
                remaining_extra = payment

        return {
            'total_months': total_months,
            'total_interest': total_interest,
            'payoff_timeline': payoff_timeline,
            'years_to_freedom': total_months / 12
        }

    def _calculate_loss_probability(
        self,
        expected_return: float,
        volatility: float
    ) -> float:
        """Calculate probability of loss in one year"""
        import math
        try:
            from scipy import stats
        except ImportError:
            # Fallback approximation if scipy not available
            import math
            # Using normal CDF approximation
            def norm_cdf(z):
                return 0.5 * (1 + math.erf(z / math.sqrt(2)))

            class stats:
                class norm:
                    @staticmethod
                    def cdf(z_score):
                        return norm_cdf(z_score)

        # Using normal distribution approximation
        z_score = -expected_return / volatility
        probability = stats.norm.cdf(z_score) * 100

        return probability

    def _calculate_future_value(
        self,
        present_value: float,
        monthly_payment: float,
        annual_rate: float,
        years: int
    ) -> float:
        """Calculate future value with regular contributions"""
        months = years * 12
        monthly_rate = annual_rate / 12

        if monthly_rate == 0:
            return present_value + (monthly_payment * months)

        future_value = present_value * ((1 + monthly_rate) ** months)
        future_value += monthly_payment * (((1 + monthly_rate) ** months - 1) / monthly_rate)

        return future_value

    def _generate_savings_insights(self, results: List[Dict[str, Any]]) -> List[str]:
        """Generate insights from savings comparison"""
        insights = []

        # Compare growth potential
        conservative = next((r for r in results if r['strategy_name'] == 'Conservative'), None)
        aggressive = next((r for r in results if r['strategy_name'] == 'Aggressive'), None)

        if conservative and aggressive:
            extra_value = aggressive['future_value'] - conservative['future_value']
            insights.append(f"Aggressive saving could yield ${extra_value:,.0f} more over the period")

        # FIRE feasibility
        fire = next((r for r in results if 'FIRE' in r['strategy_name']), None)
        if fire and fire['years_to_fi'] < 20:
            insights.append(f"FIRE strategy could achieve financial independence in {fire['years_to_fi']:.1f} years")

        return insights

    def _generate_allocation_insights(
        self,
        results: List[Dict[str, Any]],
        years_to_retirement: int
    ) -> List[str]:
        """Generate insights from allocation comparison"""
        insights = []

        if years_to_retirement > 20:
            insights.append("Long time horizon allows for more aggressive allocation")
        elif years_to_retirement < 10:
            insights.append("Approaching retirement suggests more conservative allocation")

        # Risk vs return trade-off
        for result in results:
            if result['risk_metrics']['sharpe_ratio'] > 0.5:
                insights.append(f"{result['allocation_name']} offers good risk-adjusted returns")

        return insights

    def _generate_retirement_insights(self, results: List[Dict[str, Any]]) -> List[str]:
        """Generate insights from retirement comparison"""
        insights = []

        # Early retirement feasibility
        early = next((r for r in results if 'Early' in r['scenario_name']), None)
        if early and early['success_probability'] > 70:
            insights.append("Early retirement appears achievable with current trajectory")
        elif early:
            gap_monthly = early['savings_gap'] / (early['years_to_retirement'] * 12) if early['years_to_retirement'] > 0 else 0
            insights.append(f"Early retirement needs ${gap_monthly:,.0f}/month additional savings")

        # Coast FIRE analysis
        coast = next((r for r in results if 'Coast' in r['scenario_name']), None)
        if coast and coast['success_probability'] > 80:
            insights.append("Coast FIRE strategy viable - could stop contributing mid-career")

        return insights