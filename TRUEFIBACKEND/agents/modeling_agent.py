# TRUEFIBACKEND/agents/modeling_agent.py
# Modeling Agent - performs financial analysis and reasoning with personalization

import openai
import requests
from typing import Dict, Any, Optional, List
import json
import logging
import asyncio
from decimal import Decimal
from datetime import datetime, date
from config import config
from validation.schemas import ModelRequestSchema, ModelResponseSchema
from validation.validate import validate_json
from agents.calculations import PersonalizedCalculator
from agents.calculation_router import CalculationRouter
from agents.intents import Intent
from agents.router import classify_intent

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
        elif isinstance(obj, (datetime, date)):
            return obj.isoformat()
        return super().default(obj)

class ModelingAgent:
    """Modeling Agent responsible for financial analysis and reasoning with personalization"""

    def __init__(self):
        self.client = openai.AsyncOpenAI(api_key=config.OPENAI_API_KEY)
        # Use advanced model for financial modeling
        self.model = config.ADVANCED_MODEL  # Using most advanced available model
        # Load system prompt after model is set
        self.system_prompt = self._load_system_prompt()
        self.calculation_router = CalculationRouter()

    def _load_system_prompt(self) -> str:
        """Load system prompt from file"""
        try:
            with open('prompts/common_system.md', 'r') as f:
                common = f.read()

            # Use enhanced prompt for advanced models
            if self.model in ["gpt-5", "gpt-4o", "gpt-4-turbo", "gpt-4"]:
                with open('prompts/modeling_agent_gpt5_system.md', 'r') as f:
                    specific = f.read()
                logger.info(f"Loaded enhanced system prompt for {self.model}")
            else:
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

            # Call OpenAI with advanced model
            logger.info(f"Calling OpenAI API with {self.model}")

            # Use responses API for GPT-5, chat completions for others
            if self.model == "gpt-5":
                content = await self._call_gpt5_responses_api(user_message)
            else:
                try:
                    response = await self.client.chat.completions.create(
                        model=self.model,
                        messages=[
                            {"role": "system", "content": self.system_prompt},
                            {"role": "user", "content": user_message}
                        ],
                        timeout=30.0
                    )
                    content = response.choices[0].message.content
                    logger.info(f"{self.model} API call completed")
                except Exception as api_error:
                    logger.warning(f"{self.model} API call failed: {api_error}, falling back to gpt-4o")
                    # Fallback to gpt-4o if model fails
                    response = await asyncio.shield(self.client.chat.completions.create(
                        model="gpt-4o",
                        messages=[
                            {"role": "system", "content": self.system_prompt},
                            {"role": "user", "content": user_message}
                        ]
                    ))
                    content = response.choices[0].message.content
                    logger.info("Fallback to gpt-4o completed")

            # Parse response
            logger.info("Parsing OpenAI response")
            result = self._parse_response(content)
            logger.info("Response parsed successfully")

            # Enhance with personalized calculations
            result = self._enhance_with_calculations(result, personalized_insights)

            # Ensure we have a substantive answer_markdown. If generic/placeholder, synthesize from profile.
            result = self._ensure_answer_markdown(result, validated_request, personalized_insights)

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

        except asyncio.CancelledError:
            logger.error("Modeling Agent request cancelled by client context")
            return {'error': 'Request cancelled'}
        except Exception as e:
            logger.error(f"Modeling Agent error: {e}")
            return {'error': str(e)}

    def _build_user_message(self, request: ModelRequestSchema) -> str:
        """Build user message for the LLM"""
        profile_pack_summary = self._summarize_profile_pack(request.profile_pack)
        sql_plan_json = json.dumps(request.sql_plan, indent=2, cls=DecimalEncoder)
        sql_result_summary = self._summarize_sql_result(request.sql_result)

        # Truncate potentially large SQL results to keep prompt compact
        sql_result_truncated = self._truncate_sql_result(
            request.sql_result,
            max_rows=config.MODELING_MAX_ROWS,
            max_chars=config.MODELING_MAX_CHARS,
        )
        truncated_json = json.dumps(sql_result_truncated, indent=2, cls=DecimalEncoder)

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

**Complete SQL Results Data (truncated for brevity):**
```json
{truncated_json}
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

    def _truncate_sql_result(self, sql_result: Dict[str, Any], max_rows: int = 150, max_chars: int = 15000) -> Dict[str, Any]:
        """Return a truncated copy of sql_result limiting rows and total characters."""
        try:
            result_copy = {
                'columns': sql_result.get('columns', []),
                'rows': sql_result.get('rows', []),
            }

            rows = result_copy.get('rows', [])
            truncated = False
            if isinstance(rows, list) and len(rows) > max_rows:
                result_copy['rows'] = rows[:max_rows]
                truncated = True

            # If still too large, further trim by characters
            result_json = json.dumps(result_copy, cls=DecimalEncoder)
            if len(result_json) > max_chars:
                # Reduce rows until under limit or down to 0
                while len(result_json) > max_chars and result_copy['rows']:
                    result_copy['rows'] = result_copy['rows'][:-max(1, len(result_copy['rows']) // 10)]
                    result_json = json.dumps(result_copy, cls=DecimalEncoder)
                truncated = True

            if truncated:
                result_copy['truncated'] = True
                result_copy['note'] = f"Result truncated to {len(result_copy.get('rows', []))} rows to fit context."

            return result_copy
        except Exception:
            # On any issue, just return a simple summary structure
            return {
                'columns': sql_result.get('columns', []),
                'rows': sql_result.get('rows', [])[:10],
                'truncated': True,
                'note': 'Truncated due to serialization error'
            }

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
                        computations.append(result)

                    elif calc_type == 'retirement_runway':
                        monthly_expenses = profile_pack.get('derived_metrics', {}).get('monthly_expenses_avg', 5000)
                        result = calculator.calculate_retirement_runway(monthly_expenses)
                        computations.append(result)

                    elif calc_type == 'college_savings':
                        result = calculator.calculate_college_savings_need()
                        if result.get('needed', 0) > 0:
                            computations.append(result)

                    elif calc_type == 'portfolio_projection':
                        years = 10  # Default projection
                        monthly_contribution = 500  # Default contribution
                        result = calculator.calculate_portfolio_projection(years, monthly_contribution)
                        computations.append(result)

                    elif calc_type == 'debt_strategies' and profile_pack.get('manual_liabilities'):
                        debts = profile_pack.get('manual_liabilities', [])
                        result = calculator.compare_debt_strategies(debts)
                        computations.append(result)

                    elif calc_type == 'spending_flexibility':
                        # Get recent transactions if available
                        transactions = profile_pack.get('transactions_sample', [])
                        if transactions:
                            result = calculator.analyze_spending_flexibility(transactions)
                            computations.append(result)

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
                        computations.append(result)

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
                        computations.append(result)

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
                        computations.append(result)

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

            # If SQL results include merchant spend, derive spending insights
            sql_result = request.sql_result or {}
            merchant_insights = self._extract_top_merchants(sql_result)
            if merchant_insights:
                computations.append(merchant_insights['computation'])
                ui_blocks.append(merchant_insights['ui_block'])
                assumptions.append("Spending hotspots derived from last 90 days of merchants")

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

        # Add top merchants context if available
        top_merchants = []
        for comp in personalized_insights.get('computations', []):
            if comp.get('name') == 'Top Merchants Spending (90d)' and isinstance(comp.get('result'), dict):
                top_merchants = comp['result'].get('top_merchants', [])
                break
        if top_merchants:
            base_message += "\n**Top Spending Merchants (90d):**\n"
            for m in top_merchants[:5]:
                base_message += f"- {m['merchant']}: ${m['total_spent']:,.2f} ({m['share_pct']:.1f}% of tracked spend)\n"

        # Add constraints to discourage invalid JSON from the model
        base_message += "\n\nConstraints: Return strictly valid JSON only. Do not include inline arithmetic like '27750 + 8400' — compute concrete numbers. No comments in JSON."

        # Optionally include full profile JSON (excluding full transactions)
        if getattr(config, 'MODELING_INCLUDE_FULL_PROFILE_JSON', True):
            profile_json = self._build_profile_snapshot(request.profile_pack, max_chars=getattr(config, 'PROFILE_JSON_MAX_CHARS', 120000))
            if profile_json:
                base_message += "\n\n**Full User Data JSON (bounded, excludes full transactions):**\n```json\n" + profile_json + "\n```"

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
        narrative_only = getattr(config, 'MODELING_NARRATIVE_ONLY', True)

        # Merge assumptions (always keep)
        existing_assumptions = result.get('assumptions', [])
        new_assumptions = personalized_insights.get('assumptions', [])
        result['assumptions'] = list(set(existing_assumptions + new_assumptions))

        # Computations handling
        if narrative_only and not getattr(config, 'MODELING_INCLUDE_COMPUTATIONS', False):
            result['computations'] = []
        else:
            existing_computations = result.get('computations', [])
            new_computations = personalized_insights.get('computations', [])
            result['computations'] = existing_computations + new_computations

        # UI blocks handling
        new_ui_blocks = personalized_insights.get('ui_blocks', [])
        if narrative_only:
            result['ui_blocks'] = new_ui_blocks
        else:
            existing_ui_blocks = result.get('ui_blocks', [])
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

    async def _call_gpt5_responses_api(self, user_message: str) -> str:
        """Call GPT-5 using the new responses API via direct HTTP request"""
        try:
            logger.info("Calling GPT-5 via responses API")

            import aiohttp
            import asyncio
            import json

            url = 'https://api.openai.com/v1/responses'
            headers = {
                'Authorization': f'Bearer {config.OPENAI_API_KEY}',
                'Content-Type': 'application/json'
            }

            # Prepare the request data according to Responses API spec
            # Use lower reasoning effort/verbosity to reduce latency
            data = {
                'model': 'gpt-5',
                'instructions': self.system_prompt,  # System prompt as instructions
                'input': user_message,  # User message as input
                'store': True,  # Store the response for potential follow-ups
                'reasoning': {
                    'effort': getattr(config, 'GPT5_REASONING_EFFORT', 'high')
                },
                'text': {
                    'verbosity': getattr(config, 'GPT5_VERBOSITY', 'high')
                }
            }

            # Make async HTTP request with aiohttp
            timeout_seconds = getattr(config, 'GPT5_TIMEOUT_SECONDS', 240)
            timeout = aiohttp.ClientTimeout(total=timeout_seconds)
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.post(url, headers=headers, json=data) as response:
                    if response.status == 200:
                        response_data = await response.json()

                        # Extract text from the response structure
                        # According to docs: output is an array of Items
                        output_items = response_data.get('output', [])

                        for item in output_items:
                            if item.get('type') == 'message':
                                # Look for output_text in content array
                                content_items = item.get('content', [])
                                for content in content_items:
                                    if content.get('type') == 'output_text':
                                        text = content.get('text', '')
                                        if text:
                                            logger.info("GPT-5 responses API call completed successfully")
                                            return text

                        # If no text found in expected structure, try output_text helper
                        if 'output_text' in response_data:
                            logger.info("GPT-5 responses API call completed successfully (via output_text helper)")
                            return response_data['output_text']

                        # Log the structure if we couldn't find text
                        logger.warning(f"GPT-5 response structure unexpected: {json.dumps(response_data, indent=2)}")
                        return str(response_data)
                    else:
                        error_text = await response.text()
                        raise Exception(f"GPT-5 API error: {response.status} - {error_text}")

        except asyncio.TimeoutError:
            logger.warning("GPT-5 responses API timed out after configured timeout, falling back to gpt-4o")
        except asyncio.CancelledError:
            logger.warning("GPT-5 call cancelled by context; attempting shielded fallback to gpt-4o")
            # Continue to fallback below
        except Exception as e:
            logger.warning(f"GPT-5 responses API failed: {e}, falling back to gpt-4o")

        # Fallback to gpt-4o using existing client with its own timeout
        try:
            response = await asyncio.shield(self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": user_message}
                ],
                timeout=60.0  # 60 second timeout for fallback
            ))
            logger.info("Successfully fell back to gpt-4o")
            return response.choices[0].message.content
        except asyncio.CancelledError:
            logger.error("Fallback to gpt-4o cancelled by context; returning safe error payload")
            return json.dumps({
                "answer_markdown": "The request was cancelled. Please retry your financial model.",
                "assumptions": [],
                "computations": [],
                "ui_blocks": [],
                "next_data_requests": []
            })
        except Exception as fallback_error:
            logger.error(f"Fallback to gpt-4o also failed: {fallback_error}")
            # Return a basic error response that can be parsed
            return json.dumps({
                "answer_markdown": "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.",
                "assumptions": ["Service temporarily unavailable"],
                "computations": [],
                "ui_blocks": [],
                "next_data_requests": []
            })

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

            # Clean up common JSON issues
            json_content = json_content.replace('\n', ' ')  # Remove newlines that might break JSON
            json_content = json_content.replace('\t', ' ')  # Remove tabs

            # Try to parse JSON
            try:
                result = json.loads(json_content)
            except json.JSONDecodeError as e:
                # Attempt a one-pass repair of simple arithmetic and trailing commas
                logger.error(f"JSON parsing error at position {e.pos}: {e.msg}")
                logger.error(f"Content snippet around error: ...{content[max(0,e.pos-50):min(len(content),e.pos+50)]}...")
                repaired = self._repair_json(json_content)
                result = json.loads(repaired)

            # Ensure all required fields exist
            if 'answer_markdown' not in result:
                result['answer_markdown'] = "Financial analysis completed."
            if 'assumptions' not in result:
                result['assumptions'] = []
            if 'computations' not in result:
                result['computations'] = []
            if 'ui_blocks' not in result:
                result['ui_blocks'] = []
            if 'next_data_requests' not in result:
                result['next_data_requests'] = []

            return result

        except json.JSONDecodeError as e:
            # If repair also failed, fallback response
            logger.error(f"JSON parsing failed after repair at position {e.pos}: {e.msg}")
            return {
                'answer_markdown': "I'm working on analyzing your financial data. Let me provide you with key insights based on your profile.",
                'assumptions': ["Analysis based on available financial data", "Standard market assumptions applied"],
                'computations': [],
                'ui_blocks': [],
                'next_data_requests': []
            }
        except Exception as e:
            logger.error(f"Failed to parse modeling agent response: {e}")
            # Fallback response
            return {
                'answer_markdown': "I'm analyzing your financial situation. Based on your profile, here are some insights.",
                'assumptions': ["Analysis based on available data"],
                'computations': [],
                'ui_blocks': [],
                'next_data_requests': []
            }

    def _repair_json(self, text: str) -> str:
        """Repair common JSON issues: simple arithmetic (a/b) and trailing commas, NaN/Infinity."""
        import re
        repaired = text
        # Replace simple numeric divisions like 0.05/12 with computed decimal
        def div_repl(match):
            a = float(match.group(1))
            b = float(match.group(2))
            val = a / b if b != 0 else 0
            return f": {val}"

        repaired = re.sub(r":\s*([0-9]+\.?[0-9]*)\s*/\s*([0-9]+\.?[0-9]*)", div_repl, repaired)
        # Replace simple additions/subtractions like : 27750 + 8400 or : 42110.06 - 36150
        def addsub_repl(match):
            a = float(match.group(1))
            op = match.group(2)
            b = float(match.group(3))
            val = a + b if op == '+' else a - b
            return f": {val}"
        repaired = re.sub(r":\s*([0-9]+\.?[0-9]*)\s*([\+\-])\s*([0-9]+\.?[0-9]*)", addsub_repl, repaired)
        # Remove trailing commas before } or ]
        repaired = re.sub(r",\s*(\}|\])", r"\1", repaired)
        # Replace NaN/Infinity with null
        repaired = repaired.replace("NaN", "null").replace("Infinity", "null").replace("-Infinity", "null")
        return repaired

    def _extract_top_merchants(self, sql_result: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Extract top merchants spending from SQL result into computation + UI block."""
        try:
            columns = sql_result.get('columns') or []
            rows = sql_result.get('rows') or []
            if not columns or not rows:
                return None
            col_map = {c: i for i, c in enumerate(columns)}
            if 'merchant' not in col_map or 'total_spent' not in col_map:
                return None
            items = []
            total = 0.0
            for r in rows:
                merchant = r[col_map['merchant']]
                amount = float(r[col_map['total_spent']] or 0)
                if amount <= 0:
                    continue
                items.append({'merchant': merchant, 'total_spent': amount})
                total += amount
            if not items:
                return None
            # Compute shares and sort
            for it in items:
                it['share_pct'] = (it['total_spent'] / total * 100.0) if total > 0 else 0
            items.sort(key=lambda x: x['total_spent'], reverse=True)

            # Flag common subscription merchants
            subs = {m.lower() for m in ['Netflix', 'Spotify', 'Amazon Prime', 'Disney+', 'Apple Music', 'YouTube Premium', 'Hulu', 'HBOMax', 'Max', 'Comcast Xfinity', 'AT&T Wireless']}
            subscription_hits = [it for it in items if any(s in (it['merchant'] or '').lower() for s in subs)]

            computation = {
                'name': 'Top Merchants Spending (90d)',
                'formula': 'SUM(ABS(amount)) by merchant over last 90 days',
                'inputs': {'merchant_count': len(items), 'total_tracked_spend': total},
                'result': {
                    'top_merchants': items[:10],
                    'subscription_merchants_detected': [it['merchant'] for it in subscription_hits[:5]]
                }
            }

            # Build UI block (bar chart) for top N merchants
            labels = [it['merchant'] for it in items[:10]]
            values = [it['total_spent'] for it in items[:10]]
            ui_block = {
                'type': 'bar_chart',
                'title': 'Top Merchants by Spend (90 days)',
                'data': {
                    'labels': labels,
                    'datasets': [{
                        'label': 'Total Spent ($)',
                        'data': values,
                        'backgroundColor': '#06b6d4'
                    }]
                },
                'metadata': {'y_axis_label': 'Spend ($)', 'source': 'sql_result'}
            }

            return {'computation': computation, 'ui_block': ui_block}
        except Exception:
            return None

    def _build_profile_snapshot(self, profile_pack: Dict[str, Any], max_chars: int) -> Optional[str]:
        """Build a bounded JSON snapshot of the full user profile (excluding full transactions)."""
        try:
            snapshot = dict(profile_pack)
            # Ensure full transactions are not present
            snapshot.pop('transactions', None)
            # Trim non-essential cache metadata
            snapshot.pop('cache_expires_at', None)

            def dump(s):
                return json.dumps(s, indent=2, cls=DecimalEncoder)

            text = dump(snapshot)
            if len(text) <= max_chars:
                return text

            # Iteratively trim largest list sections while preserving breadth
            trim_order = [
                'accounts', 'holdings', 'manual_assets', 'manual_liabilities',
                'goals', 'budgets', 'recurring_income'
            ]

            for key in trim_order:
                if key in snapshot and isinstance(snapshot[key], list) and len(snapshot[key]) > 0:
                    # Trim by 20% steps until under size or minimal
                    while len(snapshot[key]) > 5:
                        new_len = max(5, int(len(snapshot[key]) * 0.8))
                        snapshot[key] = snapshot[key][:new_len]
                        text = dump(snapshot)
                        if len(text) <= max_chars:
                            return text

            # Final minimal snapshot
            minimal = {
                'user_core': snapshot.get('user_core'),
                'derived_metrics': snapshot.get('derived_metrics'),
                'accounts': snapshot.get('accounts', [])[:20],
                'holdings': snapshot.get('holdings', [])[:50],
                'goals': snapshot.get('goals', [])[:20],
                'budgets': snapshot.get('budgets', [])[:10],
                'manual_assets': snapshot.get('manual_assets', [])[:10],
                'manual_liabilities': snapshot.get('manual_liabilities', [])[:10],
                'recurring_income': snapshot.get('recurring_income', [])[:10],
                'transactions_sample': snapshot.get('transactions_sample'),
                'schema_excerpt': snapshot.get('schema_excerpt')
            }
            return dump(minimal)

        except Exception as e:
            logger.warning(f"Failed to build profile snapshot: {e}")
            return None

    def _ensure_answer_markdown(self, result: Dict[str, Any], request: ModelRequestSchema, personalized_insights: Dict) -> Dict[str, Any]:
        """Ensure answer_markdown contains a substantive narrative; synthesize if generic/missing."""
        text = result.get('answer_markdown', '') or ''
        is_generic = (
            len(text.strip()) < 80 or
            text.strip().startswith("I'm working on analyzing your financial data") or
            text.strip().startswith("I'm analyzing your financial situation")
        )
        if not is_generic:
            return result

        metrics = request.profile_pack.get('derived_metrics', {})
        income = float(metrics.get('monthly_income_avg', 0) or 0)
        expenses = float(metrics.get('monthly_expenses_avg', 0) or 0)
        deficit = expenses - income
        runway_months = float(metrics.get('liquid_reserves_months', 0) or 0)
        net_worth = float(metrics.get('net_worth', 0) or 0)

        lines = []
        lines.append("### Executive Summary")
        if deficit > 0:
            lines.append(f"You are running a monthly deficit of {format_currency(deficit)}. Priority is closing the gap and protecting cash reserves (~{runway_months:.1f} months).")
        else:
            lines.append(f"You have a monthly surplus of {format_currency(abs(deficit))}. Focus on allocation and goal funding.")
        lines.append("")
        lines.append("### Your Financial Snapshot")
        lines.append(f"- Net worth: {format_currency(net_worth)}")
        lines.append(f"- Income vs. expenses: {format_currency(income)} vs {format_currency(expenses)}")
        lines.append(f"- Cash runway: ~{runway_months:.1f} months")

        # Add quick insights from computations if present
        comps = result.get('computations', []) or []
        if comps:
            lines.append("")
            lines.append("### Highlights")
            for comp in comps[:4]:
                n = comp.get('name')
                r = comp.get('result')
                if n and r is not None:
                    # Format a few common results nicely
                    if isinstance(r, (int, float)):
                        lines.append(f"- {n}: {format_currency(r) if n.lower().startswith(('after-tax', 'income')) else r}")
                    elif isinstance(r, dict) and 'future_value' in r:
                        lines.append(f"- {n}: FV {format_currency(r['future_value'])}")
                    else:
                        lines.append(f"- {n}: {r}")

        result['answer_markdown'] = "\n".join(lines)
        return result
