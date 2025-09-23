# TRUEFIBACKEND/agents/modeling_agent.py
# Modeling Agent - performs financial analysis and reasoning with personalization

import openai
from typing import Dict, Any, Optional, List
import json
import logging
from decimal import Decimal
from datetime import datetime
from config import config
from validation.schemas import ModelRequestSchema, ModelResponseSchema
from validation.validate import validate_json
from agents.calculations import PersonalizedCalculator
from agents.calculation_router import CalculationRouter
from agents.intents import Intent
from agents.router import classify_intent
from agents.formatting import format_computation_result

logger = logging.getLogger(__name__)

def format_currency(amount: float) -> str:
    """Format amount as USD currency with proper spacing and separators"""
    if amount < 0:
        return f"-${abs(amount):,.2f}"
    return f"${amount:,.2f}"

def format_percentage(value: float) -> str:
    """Format value as percentage with proper symbol"""
    return f"{value:.1f}%"

class DecimalEncoder(json.JSONEncoder):
    """Custom JSON encoder that handles Decimal and datetime objects"""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        elif isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

class ModelingAgent:
    """Modeling Agent responsible for financial analysis and reasoning with personalization"""

    def __init__(self):
        self.client = openai.AsyncOpenAI(api_key=config.OPENAI_API_KEY)
        self.system_prompt = self._load_system_prompt()
        self.calculation_router = CalculationRouter()

    def _load_system_prompt(self) -> str:
        """Load system prompt from file"""
        try:
            with open('prompts/common_system.md', 'r') as f:
                common = f.read()
            with open('prompts/modeling_agent_system.md', 'r') as f:
                specific = f.read()
            return f"{common}\n\n{specific}"
        except Exception as e:
            logger.error(f"Failed to load system prompt: {e}")
            return "You are a financial modeling agent responsible for analyzing data and providing insights."

    async def analyze_data(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze financial data and provide insights with personalized calculations"""
        try:
            # Validate input
            logger.info("Starting input validation")
            is_valid, validated_request, error = validate_json(request, ModelRequestSchema)
            if not is_valid:
                return {'error': f'Invalid request: {error}'}
            logger.info("Input validation passed")

            # Perform personalized calculations
            logger.info("Performing personalized calculations")
            personalized_insights = self._perform_personalized_calculations(validated_request)
            logger.info(f"Completed {len(personalized_insights.get('computations', []))} personalized calculations")

            # Build user message with personalized context
            logger.info("Building user message with personalized context")
            user_message = self._build_enhanced_user_message(validated_request, personalized_insights)
            logger.info("User message built successfully")

            # Call OpenAI
            logger.info("Calling OpenAI API")
            response = await self.client.chat.completions.create(
                model=config.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": user_message}
                ],
                temperature=config.OPENAI_TEMPERATURE,
                max_tokens=config.OPENAI_MAX_TOKENS
            )
            logger.info("OpenAI API call completed")

            # Parse response
            logger.info("Parsing OpenAI response")
            content = response.choices[0].message.content
            result = self._parse_response(content)
            logger.info("Response parsed successfully")

            # Enhance with personalized calculations
            result = self._enhance_with_calculations(result, personalized_insights)

            # Add life-stage context
            result = self._add_life_stage_context(result, validated_request.profile_pack)

            # Validate output
            logger.info("Starting output validation")
            is_valid, validated_output, error = validate_json(result, ModelResponseSchema)
            if not is_valid:
                # If validation fails, try to fix common issues
                result = self._fix_validation_issues(result)
                is_valid, validated_output, error = validate_json(result, ModelResponseSchema)
                if not is_valid:
                    return {'error': f'Invalid agent output: {error}'}
            logger.info("Output validation passed")

            # Use custom encoder to handle any remaining Decimal objects
            logger.info("Serializing final output")
            return json.loads(json.dumps(validated_output.dict(), cls=DecimalEncoder))

        except Exception as e:
            logger.error(f"Modeling Agent error: {e}")
            return {'error': str(e)}

    def _build_user_message(self, request: ModelRequestSchema) -> str:
        """Build user message for the LLM"""
        profile_pack_summary = self._summarize_profile_pack(request.profile_pack)
        sql_plan_json = json.dumps(request.sql_plan, indent=2, cls=DecimalEncoder)
        sql_result_summary = self._summarize_sql_result(request.sql_result)

        return f"""
**Question:** {request.question}

**User Profile Summary:**
{profile_pack_summary}

**SQL Plan Used:**
```json
{sql_plan_json}
```

**SQL Results Summary:**
{sql_result_summary}

**Complete SQL Results Data:**
```json
{json.dumps(request.sql_result, indent=2, cls=DecimalEncoder)}
```

Analyze this data and provide comprehensive financial insights. Follow the exact JSON format specified in the system prompt.
"""

    def _summarize_profile_pack(self, profile_pack: Dict[str, Any]) -> str:
        """Create a text summary of the profile pack"""
        try:
            user_core = profile_pack.get('user_core', {})
            metrics = profile_pack.get('derived_metrics', {})
            accounts = profile_pack.get('accounts', [])
            goals = profile_pack.get('goals', [])

            summary = f"""
User: {user_core.get('first_name', 'Unknown')} {user_core.get('last_name', '')}
Net Worth: {format_currency(metrics.get('net_worth', 0))}
Monthly Income: {format_currency(metrics.get('monthly_income_avg', 0))}
Monthly Expenses: {format_currency(metrics.get('monthly_expenses_avg', 0))}
Liquid Reserves: {metrics.get('liquid_reserves_months', 0):.1f} months
Savings Rate: {format_percentage(metrics.get('savings_rate_3m', 0))}

Accounts: {len(accounts)} total
Goals: {len(goals)} active goals
"""
            return summary.strip()

        except Exception as e:
            logger.error(f"Failed to summarize profile pack: {e}")
            return "Profile pack summary unavailable"

    def _summarize_sql_result(self, sql_result: Dict[str, Any]) -> str:
        """Create a text summary of SQL results"""
        try:
            columns = sql_result.get('columns', [])
            rows = sql_result.get('rows', [])

            if not rows:
                return "No data returned from query"

            summary = f"""
Columns: {', '.join(columns)}
Rows returned: {len(rows)}
Sample data: {rows[0] if rows else 'None'}
"""
            return summary.strip()

        except Exception as e:
            logger.error(f"Failed to summarize SQL result: {e}")
            return "SQL result summary unavailable"

    def _perform_personalized_calculations(self, request: ModelRequestSchema) -> Dict[str, Any]:
        """Perform personalized financial calculations based on user profile"""
        try:
            profile_pack = request.profile_pack
            question = request.question

            # Initialize calculator
            calculator = PersonalizedCalculator(profile_pack)

            # Detect intent
            intent = classify_intent(question)

            # Get relevant calculations
            calculation_types = self.calculation_router.get_relevant_calculations(
                question,
                profile_pack,
                intent
            )

            computations = []
            ui_blocks = []
            assumptions = []

            # Perform each calculation
            for calc_type in calculation_types:
                try:
                    if calc_type == 'after_tax_income':
                        income = profile_pack.get('user_core', {}).get('household_income', 75000)
                        result = calculator.calculate_after_tax_income(income)
                        computations.append(format_computation_result(result))

                    elif calc_type == 'retirement_runway':
                        monthly_expenses = profile_pack.get('derived_metrics', {}).get('monthly_expenses_avg', 5000)
                        result = calculator.calculate_retirement_runway(monthly_expenses)
                        computations.append(format_computation_result(result))

                    elif calc_type == 'college_savings':
                        result = calculator.calculate_college_savings_need()
                        if result.get('needed', 0) > 0:
                            computations.append(format_computation_result(result))

                    elif calc_type == 'portfolio_projection':
                        years = 10  # Default projection
                        monthly_contribution = 500  # Default contribution
                        result = calculator.calculate_portfolio_projection(years, monthly_contribution)
                        computations.append(format_computation_result(result))

                    elif calc_type == 'debt_strategies' and profile_pack.get('manual_liabilities'):
                        debts = profile_pack.get('manual_liabilities', [])
                        result = calculator.compare_debt_strategies(debts)
                        computations.append(format_computation_result(result))

                    elif calc_type == 'spending_flexibility':
                        # Get recent transactions if available
                        transactions = profile_pack.get('transactions_sample', [])
                        if transactions:
                            result = calculator.analyze_spending_flexibility(transactions)
                            computations.append(format_computation_result(result))

                    elif calc_type == 'true_savings_capacity':
                        income = profile_pack.get('derived_metrics', {}).get('monthly_income_avg', 7000)
                        expenses = {
                            'housing': 1850,
                            'groceries': 400,
                            'transportation': 200,
                            'utilities': 150,
                            'other': 2000
                        }  # Would extract from actual data
                        result = calculator.calculate_true_savings_capacity(income, expenses)
                        computations.append(format_computation_result(result))

                    elif calc_type == 'expected_returns':
                        rate = calculator.get_expected_return_rate()
                        computations.append({
                            'name': 'Expected Return Rate',
                            'formula': 'Based on risk tolerance profile',
                            'inputs': {'risk_tolerance': calculator.risk_profile.get('risk_tolerance')},
                            'result': rate
                        })

                    elif calc_type == 'social_security':
                        result = calculator.estimate_social_security_benefit()
                        computations.append(format_computation_result(result))

                    elif calc_type == 'financial_scenario':
                        # Determine scenario type from question
                        if 'job loss' in question.lower():
                            params = {'monthly_expenses': 5000}
                            result = calculator.simulate_financial_scenario('job_loss', params)
                        elif 'raise' in question.lower() or 'salary increase' in question.lower():
                            params = {'increase_percent': 10}
                            result = calculator.simulate_financial_scenario('salary_increase', params)
                        elif 'house' in question.lower() or 'home' in question.lower():
                            params = {'purchase_price': 400000, 'down_payment_percent': 20}
                            result = calculator.simulate_financial_scenario('major_purchase', params)
                        elif 'invest' in question.lower():
                            params = {'monthly_change': 500, 'years': 20}
                            result = calculator.simulate_financial_scenario('investment_change', params)
                        else:
                            continue
                        computations.append(format_computation_result(result))

                except Exception as e:
                    logger.warning(f"Failed to perform calculation {calc_type}: {e}")
                    continue

            # Add relevant assumptions
            if calculator.tax_profile['federal_rate'] == 0.22:
                assumptions.append("Using standard federal tax rate of 22% (actual rate not provided)")
            if calculator.tax_profile['state_rate'] == 0.05:
                assumptions.append("Using estimated state tax rate of 5% (actual rate not provided)")
            if calculator.demographics.get('age') is None:
                assumptions.append("Age estimated based on life stage")

            # Check for life scenarios
            if self.calculation_router.should_include_life_scenarios(question, profile_pack):
                assumptions.append("Life scenario projections included based on your profile")

            # Check for investment scenarios
            if self.calculation_router.should_include_investment_scenarios(question, profile_pack):
                assumptions.append("Investment scenarios calculated using your risk profile")

            return {
                'computations': computations,
                'ui_blocks': ui_blocks,
                'assumptions': assumptions
            }

        except Exception as e:
            logger.error(f"Failed to perform personalized calculations: {e}")
            return {'computations': [], 'ui_blocks': [], 'assumptions': []}

    def _build_enhanced_user_message(self, request: ModelRequestSchema, personalized_insights: Dict) -> str:
        """Build enhanced user message with personalized context"""
        base_message = self._build_user_message(request)

        # Add personalized calculations summary
        if personalized_insights.get('computations'):
            calc_summary = "\n**Personalized Calculations Performed:**\n"
            for comp in personalized_insights['computations']:
                calc_summary += f"- {comp.get('name', 'Calculation')}\n"
            base_message += calc_summary

        # Add demographic context
        user_core = request.profile_pack.get('user_core', {})
        if user_core:
            context = "\n**User Context:**\n"
            if user_core.get('age'):
                context += f"- Age: {user_core.get('age')}\n"
            if user_core.get('life_stage'):
                context += f"- Life Stage: {user_core.get('life_stage')}\n"
            if user_core.get('dependents'):
                context += f"- Dependents: {user_core.get('dependents')}\n"
            if user_core.get('risk_tolerance'):
                context += f"- Risk Tolerance: {user_core.get('risk_tolerance')}\n"
            base_message += context

        base_message += "\n\nProvide personalized insights based on the user's specific situation and the calculations performed."

        return base_message

    def _enhance_with_calculations(self, result: Dict, personalized_insights: Dict) -> Dict:
        """Enhance the result with personalized calculations"""
        # Merge computations
        existing_computations = result.get('computations', [])
        new_computations = personalized_insights.get('computations', [])
        result['computations'] = existing_computations + new_computations

        # Merge assumptions
        existing_assumptions = result.get('assumptions', [])
        new_assumptions = personalized_insights.get('assumptions', [])
        result['assumptions'] = list(set(existing_assumptions + new_assumptions))  # Remove duplicates

        # Merge UI blocks
        existing_ui_blocks = result.get('ui_blocks', [])
        new_ui_blocks = personalized_insights.get('ui_blocks', [])
        result['ui_blocks'] = existing_ui_blocks + new_ui_blocks

        return result

    def _add_life_stage_context(self, result: Dict, profile_pack: Dict) -> Dict:
        """Add personalized context based on user's life stage"""
        user_core = profile_pack.get('user_core', {})
        life_stage = user_core.get('life_stage', '').lower()
        age = user_core.get('age')
        dependents = user_core.get('dependents', 0)

        context_notes = []

        # Age-based context
        if age:
            try:
                age_int = int(age) if isinstance(age, str) else age
                if age_int < 30:
                    context_notes.append("At your age, focus on building emergency savings and capturing employer 401k match")
                elif age_int < 40:
                    context_notes.append("In your 30s, balance retirement savings with other goals like home ownership")
                elif age_int < 50:
                    context_notes.append("In your 40s, accelerate retirement savings and consider catch-up contributions")
                elif age_int < 60:
                    context_notes.append("In your 50s, maximize retirement contributions and review your asset allocation")
                else:
                    context_notes.append("Approaching or in retirement, focus on tax-efficient withdrawal strategies")
            except:
                pass

        # Life stage context
        if 'early_career' in life_stage:
            context_notes.append("Early in your career, building good financial habits is crucial for long-term success")
        elif 'mid_career' in life_stage:
            context_notes.append("At mid-career, you're in peak earning years - maximize savings and investments")
        elif 'late_career' in life_stage:
            context_notes.append("In late career, shift focus to wealth preservation and retirement planning")
        elif 'retirement' in life_stage:
            context_notes.append("In retirement, focus on sustainable withdrawal rates and tax optimization")

        # Family context
        if dependents > 0:
            context_notes.append(f"With {dependents} dependent(s), consider education savings and adequate life insurance")

        # Add context to the answer if we have any
        if context_notes and 'answer_markdown' in result:
            context_section = "\n\n### Personalized Insights for Your Situation\n" + "\n".join(f"• {note}" for note in context_notes)
            result['answer_markdown'] += context_section

        # Also add to a separate field for frontend use
        result['personalized_context'] = context_notes

        return result

    def _fix_validation_issues(self, result: Dict) -> Dict:
        """Fix common validation issues in the result"""
        # Ensure required fields exist
        if 'answer_markdown' not in result:
            result['answer_markdown'] = "Analysis complete. Please see the details below."

        if 'assumptions' not in result:
            result['assumptions'] = []

        if 'computations' not in result:
            result['computations'] = []

        if 'ui_blocks' not in result:
            result['ui_blocks'] = []

        if 'next_data_requests' not in result:
            result['next_data_requests'] = []

        return result

    def _parse_response(self, content: str) -> Dict[str, Any]:
        """Parse LLM response to extract JSON"""
        try:
            # Try to extract JSON from code blocks
            if '```json' in content:
                start = content.find('```json') + 7
                end = content.find('```', start)
                json_content = content[start:end].strip()
            elif '```' in content:
                start = content.find('```') + 3
                end = content.find('```', start)
                json_content = content[start:end].strip()
            else:
                json_content = content.strip()

            # Parse JSON
            return json.loads(json_content)

        except Exception as e:
            logger.error(f"Failed to parse modeling agent response: {e}")
            # Fallback response
            return {
                'answer_markdown': f"I encountered an error analyzing your data: {str(e)}",
                'assumptions': ["Unable to process data due to parsing error"],
                'computations': [],
                'ui_blocks': [],
                'next_data_requests': []
            }