# TRUEFIBACKEND/agents/monte_carlo.py
# Monte Carlo simulation engine for investment and financial planning analysis

import numpy as np
from typing import Dict, Any, List, Tuple, Optional
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class MonteCarloEngine:
    """Production-grade Monte Carlo simulation engine for financial analysis"""

    def __init__(self, num_simulations: int = 10000, seed: Optional[int] = None):
        """
        Initialize Monte Carlo engine

        Args:
            num_simulations: Number of simulation runs (default 10,000)
            seed: Random seed for reproducibility
        """
        self.num_simulations = num_simulations
        if seed:
            np.random.seed(seed)

    def simulate_portfolio_returns(
        self,
        initial_value: float,
        years: int,
        expected_return: float,
        volatility: float,
        annual_contribution: float = 0,
        contribution_growth_rate: float = 0.03
    ) -> Dict[str, Any]:
        """
        Simulate portfolio growth using Monte Carlo method

        Args:
            initial_value: Starting portfolio value
            years: Investment horizon in years
            expected_return: Expected annual return (e.g., 0.07 for 7%)
            volatility: Annual volatility/standard deviation (e.g., 0.15 for 15%)
            annual_contribution: Annual contribution amount
            contribution_growth_rate: Annual growth in contributions (inflation adjustment)

        Returns:
            Simulation results with percentiles and statistics
        """
        try:
            # Convert to monthly for more accurate simulation
            monthly_return = expected_return / 12
            monthly_volatility = volatility / np.sqrt(12)
            months = years * 12

            # Initialize results array
            final_values = np.zeros(self.num_simulations)
            paths = np.zeros((self.num_simulations, months + 1))
            paths[:, 0] = initial_value

            for sim in range(self.num_simulations):
                portfolio_value = initial_value
                contribution = annual_contribution / 12

                for month in range(months):
                    # Generate random return
                    random_return = np.random.normal(monthly_return, monthly_volatility)

                    # Update portfolio value
                    portfolio_value = portfolio_value * (1 + random_return) + contribution

                    # Store path
                    paths[sim, month + 1] = portfolio_value

                    # Increase contribution annually (compound growth)
                    if month > 0 and month % 12 == 0:
                        contribution *= (1 + contribution_growth_rate)

                final_values[sim] = portfolio_value

            # Calculate statistics
            percentiles = np.percentile(final_values, [5, 25, 50, 75, 95])

            # Calculate probability of achieving various goals
            probabilities = {
                'double': np.mean(final_values >= initial_value * 2) * 100,
                'triple': np.mean(final_values >= initial_value * 3) * 100,
                'million': np.mean(final_values >= 1_000_000) * 100 if initial_value < 1_000_000 else 100,
                'positive_return': np.mean(final_values > initial_value) * 100
            }

            # Best and worst case scenarios
            best_case_idx = np.argmax(final_values)
            worst_case_idx = np.argmin(final_values)

            return {
                'success': True,
                'statistics': {
                    'mean': float(np.mean(final_values)),
                    'median': float(percentiles[2]),
                    'std_dev': float(np.std(final_values)),
                    'min': float(np.min(final_values)),
                    'max': float(np.max(final_values))
                },
                'percentiles': {
                    'p5': float(percentiles[0]),   # 5th percentile (worst 5%)
                    'p25': float(percentiles[1]),  # 25th percentile
                    'p50': float(percentiles[2]),  # Median
                    'p75': float(percentiles[3]),  # 75th percentile
                    'p95': float(percentiles[4])   # 95th percentile (best 5%)
                },
                'probabilities': probabilities,
                'confidence_intervals': {
                    '90%': (float(percentiles[0]), float(percentiles[4])),
                    '50%': (float(percentiles[1]), float(percentiles[3]))
                },
                'paths': {
                    'best': paths[best_case_idx].tolist(),
                    'worst': paths[worst_case_idx].tolist(),
                    'median': paths[np.argsort(final_values)[self.num_simulations // 2]].tolist()
                },
                'simulation_params': {
                    'initial_value': initial_value,
                    'years': years,
                    'expected_return': expected_return,
                    'volatility': volatility,
                    'annual_contribution': annual_contribution,
                    'num_simulations': self.num_simulations
                }
            }

        except Exception as e:
            logger.error(f"Monte Carlo simulation error: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def simulate_retirement_adequacy(
        self,
        current_age: int,
        retirement_age: int,
        life_expectancy: int,
        current_savings: float,
        monthly_contribution: float,
        annual_expenses_retirement: float,
        pre_retirement_return: float = 0.07,
        post_retirement_return: float = 0.04,
        inflation_rate: float = 0.03,
        volatility_pre: float = 0.15,
        volatility_post: float = 0.08
    ) -> Dict[str, Any]:
        """
        Simulate retirement readiness using Monte Carlo

        Returns:
            Probability of retirement success and related metrics
        """
        try:
            years_to_retirement = retirement_age - current_age
            years_in_retirement = life_expectancy - retirement_age

            if years_to_retirement <= 0:
                return {'success': False, 'error': 'Already at or past retirement age'}

            success_count = 0
            final_balances = []
            depletion_ages = []

            for _ in range(self.num_simulations):
                # Accumulation phase
                balance = current_savings
                contribution = monthly_contribution

                for year in range(years_to_retirement):
                    annual_return = np.random.normal(pre_retirement_return, volatility_pre)
                    balance = balance * (1 + annual_return) + (contribution * 12)
                    contribution *= (1 + inflation_rate)  # Increase contributions with inflation

                retirement_balance = balance

                # Distribution phase
                annual_withdrawal = annual_expenses_retirement
                depleted = False
                depletion_age = life_expectancy

                for year in range(years_in_retirement):
                    if balance <= 0:
                        depleted = True
                        depletion_age = retirement_age + year
                        break

                    annual_return = np.random.normal(post_retirement_return, volatility_post)
                    balance = balance * (1 + annual_return) - annual_withdrawal
                    annual_withdrawal *= (1 + inflation_rate)  # Increase withdrawals with inflation

                if not depleted:
                    success_count += 1

                final_balances.append(max(0, balance))
                depletion_ages.append(depletion_age)

            success_rate = (success_count / self.num_simulations) * 100

            # Calculate safe withdrawal amount (for 95% success rate)
            safe_withdrawal = self._find_safe_withdrawal_rate(
                current_savings=current_savings,
                years_to_retirement=years_to_retirement,
                years_in_retirement=years_in_retirement,
                monthly_contribution=monthly_contribution,
                target_success_rate=95
            )

            return {
                'success': True,
                'success_rate': success_rate,
                'median_final_balance': float(np.median(final_balances)),
                'average_depletion_age': float(np.mean(depletion_ages)),
                'probability_outliving_money': 100 - success_rate,
                'safe_withdrawal_amount': safe_withdrawal,
                'recommended_adjustments': self._get_retirement_recommendations(
                    success_rate,
                    current_age,
                    retirement_age,
                    monthly_contribution
                )
            }

        except Exception as e:
            logger.error(f"Retirement simulation error: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def simulate_goal_achievement(
        self,
        current_value: float,
        target_value: float,
        years: int,
        monthly_contribution: float,
        expected_return: float = 0.07,
        volatility: float = 0.15
    ) -> Dict[str, Any]:
        """
        Simulate probability of achieving a financial goal

        Returns:
            Probability of success and required adjustments
        """
        try:
            success_count = 0
            final_values = []

            for _ in range(self.num_simulations):
                value = current_value
                contribution = monthly_contribution

                # Monthly simulation
                for month in range(years * 12):
                    monthly_return = np.random.normal(expected_return / 12, volatility / np.sqrt(12))
                    value = value * (1 + monthly_return) + contribution

                final_values.append(value)
                if value >= target_value:
                    success_count += 1

            success_rate = (success_count / self.num_simulations) * 100

            # Calculate required monthly contribution for different success rates
            required_contributions = {}
            for target_rate in [50, 75, 90, 95]:
                required = self._find_required_contribution(
                    current_value=current_value,
                    target_value=target_value,
                    years=years,
                    target_success_rate=target_rate,
                    expected_return=expected_return,
                    volatility=volatility
                )
                required_contributions[f'{target_rate}%'] = required

            return {
                'success': True,
                'probability_of_success': success_rate,
                'median_outcome': float(np.median(final_values)),
                'percentile_outcomes': {
                    'p10': float(np.percentile(final_values, 10)),
                    'p50': float(np.percentile(final_values, 50)),
                    'p90': float(np.percentile(final_values, 90))
                },
                'required_monthly_contributions': required_contributions,
                'gap_to_target': max(0, target_value - np.median(final_values))
            }

        except Exception as e:
            logger.error(f"Goal simulation error: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def _find_safe_withdrawal_rate(
        self,
        current_savings: float,
        years_to_retirement: int,
        years_in_retirement: int,
        monthly_contribution: float,
        target_success_rate: float = 95,
        pre_retirement_return: float = 0.07,
        post_retirement_return: float = 0.04,
        inflation_rate: float = 0.03
    ) -> float:
        """Binary search to find safe withdrawal amount"""
        low, high = 0, 500000  # Annual withdrawal range
        tolerance = 100

        while high - low > tolerance:
            mid = (low + high) / 2
            result = self.simulate_retirement_adequacy(
                current_age=30,  # Dummy value
                retirement_age=30 + years_to_retirement,
                life_expectancy=30 + years_to_retirement + years_in_retirement,
                current_savings=current_savings,
                monthly_contribution=monthly_contribution,
                annual_expenses_retirement=mid,
                pre_retirement_return=pre_retirement_return,
                post_retirement_return=post_retirement_return,
                inflation_rate=inflation_rate
            )

            if result['success_rate'] >= target_success_rate:
                low = mid
            else:
                high = mid

        return low

    def _find_required_contribution(
        self,
        current_value: float,
        target_value: float,
        years: int,
        target_success_rate: float,
        expected_return: float,
        volatility: float
    ) -> float:
        """Binary search to find required monthly contribution"""
        low, high = 0, 50000  # Monthly contribution range
        tolerance = 10

        while high - low > tolerance:
            mid = (low + high) / 2
            result = self.simulate_goal_achievement(
                current_value=current_value,
                target_value=target_value,
                years=years,
                monthly_contribution=mid,
                expected_return=expected_return,
                volatility=volatility
            )

            if result['probability_of_success'] >= target_success_rate:
                high = mid
            else:
                low = mid

        return high

    def _get_retirement_recommendations(
        self,
        success_rate: float,
        current_age: int,
        retirement_age: int,
        monthly_contribution: float
    ) -> List[str]:
        """Generate recommendations based on simulation results"""
        recommendations = []

        if success_rate < 50:
            recommendations.append("Critical: Success rate below 50% - major adjustments needed")
            recommendations.append(f"Consider increasing monthly contributions by {monthly_contribution * 0.5:.0f}")
            recommendations.append("Consider delaying retirement by 2-3 years")
            recommendations.append("Review and reduce expected retirement expenses")
        elif success_rate < 75:
            recommendations.append("Warning: Success rate below 75% - adjustments recommended")
            recommendations.append(f"Consider increasing monthly contributions by {monthly_contribution * 0.25:.0f}")
            recommendations.append("Consider delaying retirement by 1-2 years")
        elif success_rate < 90:
            recommendations.append("Good: Success rate above 75% - minor adjustments could help")
            recommendations.append(f"Consider increasing monthly contributions by {monthly_contribution * 0.1:.0f}")
        else:
            recommendations.append("Excellent: Success rate above 90% - on track for retirement")
            recommendations.append("Consider diversifying investments for risk management")

        years_to_retirement = retirement_age - current_age
        if years_to_retirement > 20:
            recommendations.append("Focus on growth-oriented investments given long time horizon")
        elif years_to_retirement > 10:
            recommendations.append("Consider gradually shifting to more conservative allocation")
        else:
            recommendations.append("Prioritize capital preservation as retirement approaches")

        return recommendations

    def stress_test_portfolio(
        self,
        portfolio_value: float,
        asset_allocation: Dict[str, float],
        scenarios: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Stress test portfolio against various market scenarios

        Args:
            portfolio_value: Current portfolio value
            asset_allocation: Dict of asset class to percentage (e.g., {'stocks': 0.6, 'bonds': 0.4})
            scenarios: Custom scenarios or use defaults

        Returns:
            Stress test results
        """
        if scenarios is None:
            # Default stress scenarios based on historical events
            scenarios = [
                {
                    'name': '2008 Financial Crisis',
                    'stocks': -0.37,
                    'bonds': 0.05,
                    'real_estate': -0.20,
                    'commodities': -0.35,
                    'cash': 0.0
                },
                {
                    'name': '2020 COVID Crash',
                    'stocks': -0.34,
                    'bonds': 0.08,
                    'real_estate': -0.15,
                    'commodities': -0.20,
                    'cash': 0.0
                },
                {
                    'name': 'Dot-com Bubble (2000)',
                    'stocks': -0.49,
                    'bonds': 0.11,
                    'real_estate': 0.05,
                    'commodities': 0.10,
                    'cash': 0.0
                },
                {
                    'name': 'Stagflation (1970s style)',
                    'stocks': -0.15,
                    'bonds': -0.10,
                    'real_estate': 0.08,
                    'commodities': 0.25,
                    'cash': -0.08  # Inflation impact
                },
                {
                    'name': 'Rising Rates Environment',
                    'stocks': -0.10,
                    'bonds': -0.15,
                    'real_estate': -0.12,
                    'commodities': 0.05,
                    'cash': 0.02
                }
            ]

        results = []

        for scenario in scenarios:
            portfolio_impact = 0
            for asset_class, allocation in asset_allocation.items():
                if asset_class in scenario:
                    portfolio_impact += allocation * scenario[asset_class]

            new_value = portfolio_value * (1 + portfolio_impact)
            loss = portfolio_value - new_value

            results.append({
                'scenario': scenario['name'],
                'portfolio_impact_pct': portfolio_impact * 100,
                'new_portfolio_value': new_value,
                'loss_amount': loss,
                'recovery_months_estimate': abs(portfolio_impact) * 24 if portfolio_impact < 0 else 0
            })

        # Calculate portfolio risk metrics
        returns = [r['portfolio_impact_pct'] for r in results]

        return {
            'stress_test_results': results,
            'risk_metrics': {
                'worst_case_loss': min(returns),
                'average_loss': np.mean([r for r in returns if r < 0]),
                'value_at_risk_95': np.percentile(returns, 5),
                'max_drawdown': min([r['loss_amount'] for r in results])
            },
            'recommendations': self._get_stress_test_recommendations(results, asset_allocation)
        }

    def _get_stress_test_recommendations(
        self,
        results: List[Dict[str, Any]],
        asset_allocation: Dict[str, float]
    ) -> List[str]:
        """Generate recommendations based on stress test results"""
        recommendations = []

        worst_loss = min([r['portfolio_impact_pct'] for r in results])

        if worst_loss < -30:
            recommendations.append("High Risk: Portfolio could lose over 30% in severe scenarios")
            recommendations.append("Consider reducing equity allocation and adding defensive assets")
        elif worst_loss < -20:
            recommendations.append("Moderate Risk: Portfolio shows significant volatility")
            recommendations.append("Consider adding more diversification across uncorrelated assets")
        else:
            recommendations.append("Conservative: Portfolio shows good resilience to market shocks")

        # Check allocation balance
        equity_allocation = asset_allocation.get('stocks', 0) + asset_allocation.get('real_estate', 0)
        if equity_allocation > 0.8:
            recommendations.append("Very aggressive allocation - consider adding bonds for stability")
        elif equity_allocation < 0.3:
            recommendations.append("Very conservative allocation - may limit long-term growth")

        return recommendations