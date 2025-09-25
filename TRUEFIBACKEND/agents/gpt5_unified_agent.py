# TRUEFIBACKEND/agents/gpt5_unified_agent.py
# GPT-5 Unified Financial Advisor Agent - The brain of TrueFi

import json
import logging
import asyncio
import re
from typing import Dict, Any, Optional, List, Tuple
from decimal import Decimal
from datetime import datetime, date
import aiohttp

from config import config
from validation.schemas import ModelResponseSchema
from db import execute_safe_query
from agents.sql_agent import SQLAgent

logger = logging.getLogger(__name__)

def format_currency(amount: float) -> str:
    """Format amount as USD currency"""
    if amount < 0:
        return f"-${abs(amount):,.2f}"
    return f"${amount:,.2f}"

def format_percentage(value: float) -> str:
    """Format value as percentage"""
    return f"{value:.1f}%"

class DecimalEncoder(json.JSONEncoder):
    """Custom JSON encoder for Decimal and datetime objects"""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        elif isinstance(obj, (datetime, date)):
            return obj.isoformat()
        return super().default(obj)

class GPT5UnifiedAgent:
    """
    GPT-5 Unified Agent - The central AI financial advisor
    Handles ALL financial analysis, recommendations, and insights
    Only delegates to SQL agent when transaction data is needed
    """

    def __init__(self):
        self.model = "gpt-5"
        self.sql_agent = SQLAgent()  # Only for transaction queries
        self.system_prompt = self._load_system_prompt()

    def _load_system_prompt(self) -> str:
        """Load the enhanced GPT-5 system prompt"""
        try:
            with open('prompts/gpt5_unified_system.md', 'r') as f:
                return f.read()
        except:
            # Use existing GPT-5 prompt as fallback
            try:
                with open('prompts/modeling_agent_gpt5_system.md', 'r') as f:
                    return f.read()
            except:
                return "You are GPT-5, the most advanced AI financial advisor."

    async def process_request(
        self,
        user_id: str,
        question: str,
        profile_pack: Dict[str, Any],
        session_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Main entry point - GPT-5 handles everything
        Returns comprehensive financial analysis and advice
        """
        try:
            logger.info(f"GPT-5 processing request for user {user_id}")

            # Step 1: Determine if we need transaction data
            needs_transactions = self._needs_transaction_data(question)
            transaction_data = None

            if needs_transactions:
                logger.info("GPT-5 determined transaction data is needed")
                transaction_data = await self._fetch_transaction_data(user_id, question, profile_pack)

            # Step 2: Build the comprehensive message for GPT-5
            user_message = self._build_comprehensive_message(
                question=question,
                profile_pack=profile_pack,
                transaction_data=transaction_data,
                session_context=session_context
            )

            # Step 3: Call GPT-5 with the Responses API
            logger.info("Calling GPT-5 Responses API for comprehensive analysis")
            gpt5_response = await self._call_gpt5_responses_api(user_message)

            # Step 4: Parse and validate response
            result = self._parse_gpt5_response(gpt5_response, profile_pack)

            # Step 5: Ensure high quality output
            result = self._ensure_quality_output(result, profile_pack, question)

            return result

        except Exception as e:
            logger.error(f"GPT-5 Unified Agent error: {e}", exc_info=True)
            return self._generate_fallback_response(question, profile_pack)

    def _needs_transaction_data(self, question: str) -> bool:
        """
        Determine if the question requires transaction data
        GPT-5 can handle most analysis with just the profile pack
        Be selective - only fetch transactions when really needed
        """
        # More specific keywords that definitely need transactions
        transaction_keywords = [
            'transaction', 'what did i buy', 'show me purchases',
            'list my spending', 'itemize', 'each purchase',
            'every transaction', 'all my purchases'
        ]

        # Keywords that might need transactions depending on context
        maybe_keywords = ['merchant', 'where did i spend', 'specific store']

        question_lower = question.lower()

        # Definitely need transactions
        if any(keyword in question_lower for keyword in transaction_keywords):
            return True

        # Check for merchant-specific queries
        if any(keyword in question_lower for keyword in maybe_keywords):
            return True

        # For general spending analysis, profile pack is enough
        # GPT-5 can analyze spending from the derived metrics
        return False

    async def _fetch_transaction_data(
        self,
        user_id: str,
        question: str,
        profile_pack: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Use SQL agent ONLY for fetching transaction data
        Everything else is handled by GPT-5 directly
        """
        try:
            # Build a focused SQL request for transactions
            sql_request = {
                'kind': 'sql_request',
                'question': question,
                'schema_card': self._get_transaction_schema(),
                'context': {'user_id': user_id},
                'constraints': {
                    'max_rows': 100,  # Reasonable limit for GPT-5
                    'exclude_pending': True,
                    'prefer_monthly_bins': True
                }
            }

            # Get SQL from agent
            sql_response = await self.sql_agent.generate_query(sql_request)

            if 'error' in sql_response:
                logger.warning(f"SQL generation failed: {sql_response['error']}")
                return None

            # Execute the query
            sql = sql_response['sql']
            params = sql_response['params']

            # Add safety limit
            if 'LIMIT' not in sql.upper():
                sql += ' LIMIT 100'

            results, error = execute_safe_query(sql, params, 100)

            if error:
                logger.warning(f"SQL execution failed: {error}")
                # Fall back to deterministic merchant aggregates for last 12 months
                fallback = self._fallback_transaction_aggregates(user_id)
                if fallback:
                    return fallback
                return None

            # Format for GPT-5 consumption - properly serialize
            serialized_rows = []
            for row in results:
                serialized_row = {}
                for key, value in row.items():
                    if isinstance(value, Decimal):
                        serialized_row[key] = float(value)
                    elif isinstance(value, (datetime, date)):
                        serialized_row[key] = value.isoformat()
                    else:
                        serialized_row[key] = value
                serialized_rows.append(serialized_row)

            return {
                'query_intent': sql_response.get('justification', 'Transaction data'),
                'columns': list(results[0].keys()) if results else [],
                'rows': serialized_rows,
                'row_count': len(results)
            }

        except Exception as e:
            logger.error(f"Failed to fetch transaction data: {e}")
            # Last-chance fallback
            fallback = self._fallback_transaction_aggregates(user_id)
            return fallback

    def _fallback_transaction_aggregates(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Deterministic fallback: compute top merchants by spend and frequency for the last 12 months.
        Handles sign conventions by trying amount<0 first (expenses as negatives), then amount>0.
        """
        try:
            base_filter = """
                FROM transactions
                WHERE user_id = %(user_id)s
                  AND pending = false
                  AND COALESCE(posted_datetime, date::timestamptz) >= (NOW() - INTERVAL '12 months')
            """
            params = {'user_id': user_id}

            def run_queries(expense_sign_clause: str) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
                top_spend_sql = f"""
                    SELECT merchant_name,
                           COUNT(*) AS txn_count,
                           SUM(ABS(amount)) AS total_spend
                    {base_filter} AND {expense_sign_clause}
                    GROUP BY merchant_name
                    ORDER BY total_spend DESC NULLS LAST
                    LIMIT 10
                """
                top_freq_sql = f"""
                    SELECT merchant_name,
                           COUNT(*) AS txn_count,
                           SUM(ABS(amount)) AS total_spend
                    {base_filter} AND {expense_sign_clause}
                    GROUP BY merchant_name
                    ORDER BY txn_count DESC, total_spend DESC NULLS LAST
                    LIMIT 10
                """
                top_spend_rows, err1 = execute_safe_query(top_spend_sql, params, 100)
                top_freq_rows, err2 = execute_safe_query(top_freq_sql, params, 100)
                if err1:
                    logger.warning(f"Fallback top_spend query error: {err1}")
                if err2:
                    logger.warning(f"Fallback top_freq query error: {err2}")
                return top_spend_rows, top_freq_rows

            # Try expenses as negatives first
            spend_rows, freq_rows = run_queries("amount < 0")
            # If no data, try expenses as positives
            if not spend_rows and not freq_rows:
                spend_rows, freq_rows = run_queries("amount > 0")

            if not spend_rows and not freq_rows:
                return None

            # Serialize for JSON safety
            def serialize(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
                out = []
                for r in rows:
                    out.append({
                        'merchant_name': r.get('merchant_name'),
                        'txn_count': int(r.get('txn_count') or 0),
                        'total_spend': float(r.get('total_spend') or 0.0)
                    })
                return out

            return {
                'query_intent': 'Top merchants aggregates (last 12 months)',
                'aggregates': {
                    'top_by_spend': serialize(spend_rows),
                    'top_by_frequency': serialize(freq_rows),
                    'time_window_months': 12
                },
                'rows': [],
                'columns': [],
                'row_count': 0
            }

        except Exception as e:
            logger.error(f"Fallback transaction aggregates failed: {e}")
            return None

    def _build_comprehensive_message(
        self,
        question: str,
        profile_pack: Dict[str, Any],
        transaction_data: Optional[Dict[str, Any]] = None,
        session_context: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Build a comprehensive message for GPT-5 with all context
        This is where we give GPT-5 everything it needs
        """
        # Start with the question
        message = f"**User Question:** {question}\n\n"

        # Add session context if available
        if session_context:
            message += "**Conversation Context:**\n"
            if session_context.get('recent_topics'):
                message += f"Recent topics: {', '.join(session_context['recent_topics'])}\n"
            if session_context.get('user_preferences'):
                # Serialize preferences safely
                prefs = json.dumps(session_context['user_preferences'], cls=DecimalEncoder)
                message += f"User preferences: {prefs}\n"
            message += "\n"

        # Add comprehensive profile summary
        message += self._build_profile_summary(profile_pack)

        # Add profile JSON but keep it reasonable size to avoid API timeouts
        if config.MODELING_INCLUDE_FULL_PROFILE_JSON:
            profile_json = self._build_profile_json(profile_pack)
            # Limit to 20k chars to avoid overwhelming the API
            if profile_json and len(profile_json) < 20000:
                message += f"\n**Complete User Financial Profile:**\n```json\n{profile_json}\n```\n"
            elif profile_json:
                # Truncate if too large
                truncated = profile_json[:20000] + "\n... [truncated for brevity]"
                message += f"\n**User Financial Profile (truncated):**\n```json\n{truncated}\n```\n"

        # Add transaction data if fetched
        if transaction_data:
            message += f"\n**Transaction Data (last {transaction_data.get('row_count', 0)} transactions):**\n"
            message += f"```json\n{json.dumps(transaction_data, cls=DecimalEncoder, indent=2)}\n```\n"

        # Add instructions for GPT-5
        message += """
**Your Task:**
As the user's AI financial advisor powered by GPT-5, provide:
1. Direct answer to their question
2. Comprehensive financial analysis
3. Personalized recommendations
4. Actionable next steps
5. Risk considerations
6. Long-term strategic advice

Use your advanced capabilities to:
- Perform complex calculations
- Identify patterns and opportunities
- Predict future scenarios
- Optimize financial strategies
- Consider tax implications
- Account for behavioral factors

Return your response in the specified JSON format.
"""

        return message

    def _build_profile_summary(self, profile_pack: Dict[str, Any]) -> str:
        """Build a comprehensive profile summary for GPT-5"""
        user_core = profile_pack.get('user_core', {})
        metrics = profile_pack.get('derived_metrics', {})
        accounts = profile_pack.get('accounts', [])
        goals = profile_pack.get('goals', [])
        holdings = profile_pack.get('holdings', [])
        liabilities = profile_pack.get('manual_liabilities', [])

        # Calculate key metrics
        total_assets = sum(float(a.get('balance', 0)) for a in accounts)
        total_investments = sum(float(h.get('market_value', 0)) for h in holdings)
        total_debt = sum(float(l.get('balance', 0)) for l in liabilities)

        summary = f"""**User Financial Profile:**

**Personal Information:**
- Name: {user_core.get('first_name', 'User')} {user_core.get('last_name', '')}
- Age: {user_core.get('age', 'Unknown')}
- Life Stage: {user_core.get('life_stage', 'Unknown')}
- Location: {user_core.get('state_residence', 'Unknown')}
- Household Income: {format_currency(user_core.get('household_income', 0))}
- Tax Rates: Federal {(user_core.get('federal_rate') or 0.22)*100:.0f}%, State {(user_core.get('state_rate') or 0.09)*100:.0f}%

**Financial Summary:**
- Net Worth: {format_currency(metrics.get('net_worth', 0))}
- Total Assets: {format_currency(total_assets)}
- Total Investments: {format_currency(total_investments)}
- Total Debt: {format_currency(total_debt)}
- Monthly Income: {format_currency(metrics.get('monthly_income_avg', 0))}
- Monthly Expenses: {format_currency(metrics.get('monthly_expenses_avg', 0))}
- Cash Flow: {format_currency(metrics.get('monthly_income_avg', 0) - metrics.get('monthly_expenses_avg', 0))}
- Liquid Reserves: {metrics.get('liquid_reserves_months', 0):.1f} months
- Savings Rate: {format_percentage(metrics.get('savings_rate_3m', 0))}

**Accounts:** {len(accounts)} accounts totaling {format_currency(total_assets)}
**Investments:** {len(holdings)} positions totaling {format_currency(total_investments)}
**Goals:** {len(goals)} active financial goals
**Debts:** {len(liabilities)} liabilities totaling {format_currency(total_debt)}
"""

        return summary

    def _build_profile_json(self, profile_pack: Dict[str, Any]) -> Optional[str]:
        """Build bounded JSON of profile for GPT-5's deep analysis"""
        try:
            # Remove unnecessary metadata
            cleaned_pack = dict(profile_pack)
            cleaned_pack.pop('cache_expires_at', None)
            cleaned_pack.pop('generated_at', None)

            # Convert to JSON with size limit
            json_str = json.dumps(cleaned_pack, cls=DecimalEncoder, indent=2)

            max_chars = config.PROFILE_JSON_MAX_CHARS
            if len(json_str) > max_chars:
                # Truncate intelligently
                cleaned_pack.pop('transactions_sample', None)  # Remove sample if too large
                json_str = json.dumps(cleaned_pack, cls=DecimalEncoder, indent=2)

                if len(json_str) > max_chars:
                    json_str = json_str[:max_chars] + "\n... [truncated]"

            return json_str

        except Exception as e:
            logger.warning(f"Failed to build profile JSON: {e}")
            return None

    async def _call_gpt5_responses_api(self, user_message: str) -> str:
        """
        Call GPT-5 using the Responses API
        This is the core of our financial advisor
        """
        try:
            url = 'https://api.openai.com/v1/responses'
            headers = {
                'Authorization': f'Bearer {config.OPENAI_API_KEY}',
                'Content-Type': 'application/json'
            }

            # Configure GPT-5 for optimal financial analysis
            data = {
                'model': 'gpt-5',
                'instructions': self.system_prompt,
                'input': user_message,
                'store': True,
                'reasoning': {
                    'effort': config.GPT5_REASONING_EFFORT
                },
                'text': {
                    'verbosity': config.GPT5_VERBOSITY
                }
            }

            # Make the request with appropriate timeout
            timeout_seconds = config.GPT5_TIMEOUT_SECONDS
            timeout = aiohttp.ClientTimeout(total=timeout_seconds)

            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.post(url, headers=headers, json=data) as response:
                    if response.status == 200:
                        response_data = await response.json()

                        # Extract text from response
                        output_items = response_data.get('output', [])
                        for item in output_items:
                            if item.get('type') == 'message':
                                content_items = item.get('content', [])
                                for content in content_items:
                                    if content.get('type') == 'output_text':
                                        text = content.get('text', '')
                                        if text:
                                            logger.info("GPT-5 analysis completed successfully")
                                            return text

                        # Fallback to direct output_text
                        if 'output_text' in response_data:
                            logger.info("GPT-5 analysis completed (via output_text)")
                            return response_data['output_text']

                        logger.warning("GPT-5 response structure unexpected")
                        return json.dumps(response_data)

                    else:
                        error_text = await response.text()
                        raise Exception(f"GPT-5 API error: {response.status} - {error_text}")

        except asyncio.TimeoutError:
            logger.error(f"GPT-5 timed out after {timeout_seconds} seconds")
            raise
        except Exception as e:
            logger.error(f"GPT-5 API call failed: {e}")
            raise

    def _parse_gpt5_response(self, content: str, profile_pack: Dict[str, Any]) -> Dict[str, Any]:
        """Parse GPT-5's response into structured format with light repair for minor JSON mistakes."""
        # First handle escaped newlines in the raw JSON string
        if '\\n' in content:
            content = content.replace('\\n', '\n')

        # Fix any broken formatting in the raw response
        content = self._fix_broken_response_formatting(content)

        # 1) Extract JSON block or treat entire content as JSON
        json_str = self._extract_json_block(content)

        if json_str:
            # 2) Try direct parse
            try:
                result = json.loads(json_str)
                return self._normalize_result(result)
            except json.JSONDecodeError:
                # 3) Try to repair common mistakes and parse again
                repaired = self._repair_json_str(json_str)
                try:
                    result = json.loads(repaired)
                    return self._normalize_result(result)
                except json.JSONDecodeError as e:
                    logger.error(f"Failed to parse repaired GPT-5 JSON: {e}")

        # 4) Fallback: return markdown with basic UI from profile metrics
        logger.error("Falling back to markdown-only result due to JSON parse failure")
        fallback = self._fallback_from_profile(content, profile_pack)
        return fallback

    def _fix_broken_response_formatting(self, text: str) -> str:
        """Fix GPT-5 responses where text is broken with characters on individual lines."""
        if not text:
            return text

        # Detect if we have the broken formatting pattern (many single chars on separate lines)
        lines = text.split('\n')
        single_char_lines = sum(1 for line in lines if len(line.strip()) == 1)

        # Lower threshold to 20% and add pattern detection for character-per-line
        if (len(lines) > 10 and single_char_lines / len(lines) > 0.2) or \
           re.search(r'^.\n.\n.\n.\n', text):
            logger.warning(f"Detected broken GPT-5 formatting with {single_char_lines} single-char lines")

            # Process line by line, merging appropriately
            fixed_lines = []
            buffer = []

            for line in lines:
                stripped = line.strip()

                # If it's a single character, add to buffer
                if len(stripped) == 1 and stripped not in [',', '.', ':', ';', '!', '?', '{', '}', '[', ']']:
                    buffer.append(stripped)
                else:
                    # Flush buffer if we have accumulated characters
                    if buffer:
                        fixed_lines.append(''.join(buffer))
                        buffer = []
                    # Add the current line
                    if stripped:
                        fixed_lines.append(line)

            # Don't forget remaining buffer
            if buffer:
                fixed_lines.append(''.join(buffer))

            text = '\n'.join(fixed_lines)
            logger.info("Applied broken formatting fix to GPT-5 response")

        return text

    def _extract_json_block(self, text: str) -> Optional[str]:
        """Extract the JSON code block from a markdown response if present."""
        if not isinstance(text, str):
            return None
        # Prefer ```json code fence
        if '```json' in text:
            start = text.find('```json') + 7
            end = text.find('```', start)
            if end != -1:
                return text[start:end].strip()
        # Fallback to first fenced block
        if '```' in text:
            start = text.find('```') + 3
            end = text.find('```', start)
            if end != -1:
                return text[start:end].strip()
        # As a last resort, if the whole content looks like JSON
        stripped = text.strip()
        if (stripped.startswith('{') and stripped.endswith('}')) or (stripped.startswith('[') and stripped.endswith(']')):
            return stripped
        return None

    def _repair_json_str(self, s: str) -> str:
        """Apply minimal, safe repairs to JSON to handle common LLM glitches without altering meaning."""
        original = s
        # 1) Remove obvious non-JSON tokens like ", - nope" in arrays
        s = re.sub(r",\s*-\s*[A-Za-z_][A-Za-z0-9_]*", "", s)
        # 2) Remove trailing commas before } or ]
        s = re.sub(r",\s*([}\]])", r"\1", s)
        # 3) Remove inline comments (// comment) if any
        s = re.sub(r"//.*", "", s)
        # 4) Remove stray backticks or markdown artifacts
        s = s.replace("`", "")
        # 5) Collapse repeated commas
        s = re.sub(r",\s*,+", ",", s)
        if original != s:
            logger.info("Applied light JSON repair to GPT-5 output")
        return s

    def _normalize_result(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """Ensure required fields are present."""
        if not isinstance(result, dict):
            return {
                'answer_markdown': "Analysis completed.",
                'assumptions': [],
                'computations': [],
                'ui_blocks': [],
                'next_data_requests': []
            }
        result.setdefault('answer_markdown', "Analysis completed.")
        result.setdefault('assumptions', [])
        result.setdefault('computations', [])
        result.setdefault('ui_blocks', [])
        result.setdefault('next_data_requests', [])

        # Normalize UI blocks to match frontend renderer contract
        result['ui_blocks'] = self._normalize_ui_blocks(result['ui_blocks'])
        return result

    def _normalize_ui_blocks(self, blocks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Coerce UI block data into the shapes expected by the frontend renderer."""
        normalized: List[Dict[str, Any]] = []
        for block in blocks or []:
            btype = block.get('type')
            data = block.get('data', {}) or {}
            title = block.get('title')
            metadata = block.get('metadata', {}) or {}

            if btype == 'bar_chart':
                labels = data.get('labels')
                datasets = data.get('datasets')
                # Convert from categories/current/target to labels/datasets
                if labels is None and 'categories' in data:
                    labels = data.get('categories') or []
                    series = []
                    if 'current' in data:
                        series.append({'label': 'Current', 'data': data.get('current') or []})
                    if 'target' in data:
                        series.append({'label': 'Target', 'data': data.get('target') or []})
                    datasets = series
                # Convert from series dict
                if labels is None and 'series' in data and isinstance(data['series'], dict):
                    labels = data.get('x') or []
                    datasets = [{'label': k, 'data': v} for k, v in data['series'].items()]
                block = {
                    'type': 'bar_chart',
                    'title': title or block.get('title', ''),
                    'data': {
                        'labels': labels or [],
                        'datasets': datasets or []
                    },
                    'metadata': metadata
                }

            elif btype == 'line_chart':
                labels = data.get('labels')
                datasets = data.get('datasets')
                avg = data.get('average_line')
                # Convert from x + named series keys to labels/datasets
                if labels is None and 'x' in data:
                    labels = data.get('x') or []
                    series_keys = [k for k in data.keys() if k not in ('x', 'average_line')]
                    datasets = [{'label': key.replace('_', ' ').title(), 'data': data.get(key) or []} for key in series_keys]
                    avg = data.get('average_line')
                block = {
                    'type': 'line_chart',
                    'title': title or block.get('title', ''),
                    'data': {
                        'labels': labels or [],
                        'datasets': datasets or [],
                        'average_line': avg
                    },
                    'metadata': metadata
                }

            elif btype == 'table':
                headers = data.get('headers') or data.get('columns') or []
                rows = data.get('rows') or []
                formatting = data.get('formatting') or {}
                # If rows are objects, convert to array-of-arrays using header order
                if rows and isinstance(rows, list) and isinstance(rows[0], dict):
                    # Derive headers if missing
                    if not headers:
                        # Use keys of first row in stable order
                        headers = list(rows[0].keys())
                    # Build 2D array in header order
                    converted_rows = []
                    for r in rows:
                        converted_rows.append([self._format_table_cell(r.get(h)) for h in headers])
                    rows = converted_rows
                block = {
                    'type': 'table',
                    'title': title or block.get('title', ''),
                    'data': {
                        'headers': headers,
                        'rows': rows,
                        'formatting': formatting
                    },
                    'metadata': metadata
                }

            elif btype == 'pie_chart':
                labels = data.get('labels') or data.get('categories') or []
                values = data.get('values') or data.get('amounts') or []
                colors = data.get('colors') or []
                percentages = data.get('percentages')
                block = {
                    'type': 'pie_chart',
                    'title': title or block.get('title', ''),
                    'data': {
                        'labels': labels,
                        'values': values,
                        'colors': colors,
                        'percentages': percentages
                    },
                    'metadata': metadata
                }

            elif btype == 'kpi_card':
                # Ensure minimum fields present
                value = data.get('value') or 0
                formatted_value = data.get('formatted_value')
                subtitle = data.get('subtitle')
                change = data.get('change')
                change_type = data.get('change_type')
                block = {
                    'type': 'kpi_card',
                    'title': title or block.get('title', ''),
                    'data': {
                        'value': value,
                        'formatted_value': formatted_value,
                        'subtitle': subtitle,
                        'change': change,
                        'change_type': change_type
                    },
                    'metadata': metadata
                }

            normalized.append(block)

        return normalized

    def _format_table_cell(self, v: Any) -> str:
        """Format table cell values as strings appropriate for display."""
        if v is None:
            return ''
        if isinstance(v, (int, float)):
            # Keep raw numeric for renderer to optionally format; but render as string here
            return f"{v}"
        if isinstance(v, (datetime, date)):
            return v.isoformat()
        return str(v)

    def _fallback_from_profile(self, content: str, profile_pack: Dict[str, Any]) -> Dict[str, Any]:
        """Create a visually rich fallback using profile metrics so the UI remains informative."""
        metrics = profile_pack.get('derived_metrics', {})
        net_worth = float(metrics.get('net_worth', 0) or 0)
        monthly_income = float(metrics.get('monthly_income_avg', 0) or 0)
        monthly_expenses = float(metrics.get('monthly_expenses_avg', 0) or 0)
        cash_flow = monthly_income - monthly_expenses
        runway = float(metrics.get('liquid_reserves_months', 0) or 0)

        ui_blocks = [
            {
                "type": "kpi_card",
                "title": "Net Worth",
                "data": {"value": round(net_worth, 2), "unit": "USD", "subtitle": "Derived from accounts and liabilities"},
                "metadata": {"source": "calculation"}
            },
            {
                "type": "kpi_card",
                "title": "Monthly Cash Flow",
                "data": {"value": round(cash_flow, 2), "unit": "USD", "subtitle": "Income minus expenses (avg)"},
                "metadata": {"source": "calculation"}
            },
            {
                "type": "kpi_card",
                "title": "Cash Runway",
                "data": {"value": round(runway, 1), "unit": "months", "subtitle": "Liquid reserves coverage"},
                "metadata": {"source": "calculation"}
            }
        ]

        return {
            'answer_markdown': content if isinstance(content, str) else "Analysis completed.",
            'assumptions': ["Parsed as markdown due to JSON formatting issues from the model"],
            'computations': [],
            'ui_blocks': ui_blocks,
            'next_data_requests': []
        }

    def _fix_markdown_formatting(self, text: str) -> str:
        """Fix markdown formatting issues, especially around dollar amounts and special characters"""
        if not text:
            return text

        # Add missing spaces between letters and digits (both directions)
        text = re.sub(r'([A-Za-z])(\d)', r'\1 \2', text)
        text = re.sub(r'(\d)([A-Za-z])', r'\1 \2', text)

        # Fix spaced thousands
        text = re.sub(r'(\d),\s+(\d{3})', r'\1,\2', text)

        # Escape underscores/asterisks inside words (prevent accidental italics/bold)
        text = re.sub(r'(?<=\w)_(?=\w)', r'\\_', text)
        text = re.sub(r'(?<=\w)\*(?=\w)', r'\\*', text)

        # Fix broken multi-line formatting where each character is on its own line
        # Pattern: single char, newline, single char (repeated)
        # First pass: merge single letters separated by newlines
        text = re.sub(r'(?<=\b)([a-z])\n(?=[a-z]\b)', r'\1', text, flags=re.IGNORECASE)

        # More aggressive: any sequence of single chars separated by newlines
        text = re.sub(r'\b([a-z])\n([a-z])\n([a-z])\n([a-z])\n([a-z])\n([a-z])\n([a-z])\n([a-z])\n([a-z])\b',
                      r'\1\2\3\4\5\6\7\8\9', text, flags=re.IGNORECASE)
        text = re.sub(r'\b([a-z])\n([a-z])\n([a-z])\n([a-z])\n([a-z])\n([a-z])\b',
                      r'\1\2\3\4\5\6', text, flags=re.IGNORECASE)
        text = re.sub(r'\b([a-z])\n([a-z])\n([a-z])\n([a-z])\b', r'\1\2\3\4', text, flags=re.IGNORECASE)
        text = re.sub(r'\b([a-z])\n([a-z])\n([a-z])\b', r'\1\2\3', text, flags=re.IGNORECASE)
        text = re.sub(r'\b([a-z])\n([a-z])\b', r'\1\2', text, flags=re.IGNORECASE)

        # Fix numbers split across lines
        text = re.sub(r'(\d)\n,\n(\d)', r'\1,\2', text)  # Fix "305\n,\n176"
        text = re.sub(r'(\d+)\n(\d+)', r'\1\2', text)  # Merge split numbers

        # Fix patterns like "305,176vs.reported" -> "$305,176 vs. reported"
        text = re.sub(r'(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)([a-z]+)\.', r'$\1 \2. ', text)

        # Fix dash formatting "take-home" split as "take‑home"
        text = text.replace('‑', '-')  # Replace non-breaking hyphen with regular hyphen

        # Fix patterns like "$160,000salary" -> "$160,000 salary"
        text = re.sub(r'(\$[\d,]+(?:\.\d{2})?)([a-zA-Z])', r'\1 \2', text)

        # Fix patterns like "≈$8,180/mo" formatting
        text = re.sub(r'≈\$', r'≈ $', text)

        # Fix parenthetical amounts like "$329,000(Mortgage" -> "$329,000 (Mortgage"
        text = re.sub(r'(\$?[\d,]+(?:\.\d{2})?)\(', r'\1 (', text)

        # Fix "15k@3.3%" patterns -> "15k @ 3.3%"
        text = re.sub(r'(\d+k?)@(\d)', r'\1 @ \2', text)

        # First, ensure dollar signs are properly formatted for large numbers with commas
        # But be careful not to add $ to dates, percentages, or already-dollared amounts
        text = re.sub(r'(?<![$/\d])(\d{1,3}(?:,\d{3})+(?:\.\d{2})?)(?![\d%/@])', r'$\1', text)

        # Add missing spaces for letters→digits and digits→letters (but not in patterns like 401k)
        text = re.sub(r'([A-Za-z])(\d)(?!k\b)', r'\1 \2', text)
        text = re.sub(r'(\d)([A-Za-z])(?![kK%])', r'\1 \2', text)

        # Fix spaced thousands (e.g., "4, 000" -> "4,000")
        text = re.sub(r'(\d),\s+(\d{3})', r'\1,\2', text)

        # Escape underscores/asterisks inside words to avoid accidental italics
        text = re.sub(r'(?<=\w)_(?=\w)', r'\\_', text)
        text = re.sub(r'(?<=\w)\*(?=\w)', r'\\*', text)

        # Fix broken patterns like "69,375across15transactions" -> "$69,375 across 15 transactions"
        # Be more careful not to add $ to the second number
        text = re.sub(r'(\$?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)([a-zA-Z]+)(\d+)', r'\1 \2 \3', text)

        # Fix missing spaces around camelCase
        text = re.sub(r'([a-z])([A-Z])', r'\1 \2', text)  # Add space between lowercase and uppercase

        # Fix patterns like "4,200;2txns" -> "$4,200 (2 transactions)"
        text = re.sub(r'(\$[\d,]+(?:\.\d{2})?)[;,]\s*(\d+)\s*txns?', r'\1 (\2 transactions)', text)

        # Fix missing spaces after closing parenthesis
        text = re.sub(r'\)([A-Z])', r') \1', text)

        # Fix missing spaces before opening parenthesis
        text = re.sub(r'([a-z])\(', r'\1 (', text)

        # Fix semicolons that need spaces (but not in transaction patterns)
        text = re.sub(r';(?!\d+\s*txn)', r'; ', text)

        # Fix double dollar signs that might have been created
        text = re.sub(r'\$\$+', r'$', text)

        # Clean up extra spaces (but preserve line breaks)
        lines = text.split('\n')
        cleaned_lines = []
        for line in lines:
            # Clean up extra spaces within the line
            line = re.sub(r' +', ' ', line)
            cleaned_lines.append(line)

        text = '\n'.join(cleaned_lines)

        # Ensure proper markdown list formatting
        lines = text.split('\n')
        fixed_lines = []
        for line in lines:
            # Fix bullet points that might be malformed
            if line.strip().startswith('-') or line.strip().startswith('*'):
                # Ensure space after bullet
                line = re.sub(r'^(\s*[-*])(\S)', r'\1 \2', line)
            # Fix numbered lists
            elif re.match(r'^\s*\d+\.', line):
                line = re.sub(r'^(\s*\d+\.)(\S)', r'\1 \2', line)
            fixed_lines.append(line)

        return '\n'.join(fixed_lines)

    def _ensure_quality_output(
        self,
        result: Dict[str, Any],
        profile_pack: Dict[str, Any],
        question: str
    ) -> Dict[str, Any]:
        """Ensure GPT-5's output meets quality standards and fix formatting issues"""

        # Fix markdown formatting issues with dollar amounts
        answer = result.get('answer_markdown', '')

        # Fix broken dollar amounts and formatting
        if answer:
            # First, convert literal \n escape sequences to actual newlines
            # This happens when GPT-5 returns JSON with escaped newlines
            if '\\n' in answer:
                answer = answer.replace('\\n', '\n')

            # Replace problematic patterns that break rendering
            answer = self._fix_markdown_formatting(answer)
            result['answer_markdown'] = answer

        # Also fix formatting in UI blocks
        ui_blocks = result.get('ui_blocks', [])
        for block in ui_blocks:
            # Fix table data
            if block.get('type') == 'table' and 'data' in block:
                table_data = block['data']
                if 'rows' in table_data:
                    for i, row in enumerate(table_data['rows']):
                        fixed_row = []
                        for cell in row:
                            if isinstance(cell, str):
                                fixed_row.append(self._fix_markdown_formatting(cell))
                            else:
                                fixed_row.append(cell)
                        table_data['rows'][i] = fixed_row

            # Fix chart labels
            elif block.get('type') in ['line_chart', 'bar_chart', 'pie_chart'] and 'data' in block:
                chart_data = block['data']
                if 'labels' in chart_data:
                    chart_data['labels'] = [
                        self._fix_markdown_formatting(label) if isinstance(label, str) else label
                        for label in chart_data['labels']
                    ]
                # Fix dataset labels
                if 'datasets' in chart_data:
                    for dataset in chart_data['datasets']:
                        if 'label' in dataset and isinstance(dataset['label'], str):
                            dataset['label'] = self._fix_markdown_formatting(dataset['label'])

            # Fix KPI card subtitles and alert messages
            elif block.get('type') in ['kpi_card', 'alert'] and 'data' in block:
                card_data = block['data']
                if 'subtitle' in card_data and isinstance(card_data['subtitle'], str):
                    card_data['subtitle'] = self._fix_markdown_formatting(card_data['subtitle'])
                if 'message' in card_data and isinstance(card_data['message'], str):
                    card_data['message'] = self._fix_markdown_formatting(card_data['message'])
                if 'details' in card_data and isinstance(card_data['details'], str):
                    card_data['details'] = self._fix_markdown_formatting(card_data['details'])

        # Check if answer is substantive
        if len(answer) < 100:
            # GPT-5 should always provide detailed analysis
            metrics = profile_pack.get('derived_metrics', {})
            net_worth = metrics.get('net_worth', 0)
            monthly_income = metrics.get('monthly_income_avg', 0)
            monthly_expenses = metrics.get('monthly_expenses_avg', 0)

            result['answer_markdown'] = f"""### Financial Analysis

Based on your financial profile:
- Net Worth: {format_currency(net_worth)}
- Monthly Income: {format_currency(monthly_income)}
- Monthly Expenses: {format_currency(monthly_expenses)}
- Cash Flow: {format_currency(monthly_income - monthly_expenses)}

{answer}

Please let me know if you need more specific analysis or recommendations."""

        return result

    def _generate_fallback_response(
        self,
        question: str,
        profile_pack: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate a fallback response if GPT-5 fails"""
        metrics = profile_pack.get('derived_metrics', {})

        return {
            'answer_markdown': f"""I apologize, but I'm having difficulty processing your request right now.

Based on your profile, here's a quick summary:
- Net Worth: {format_currency(metrics.get('net_worth', 0))}
- Monthly Cash Flow: {format_currency(metrics.get('monthly_income_avg', 0) - metrics.get('monthly_expenses_avg', 0))}
- Liquid Reserves: {metrics.get('liquid_reserves_months', 0):.1f} months

Please try rephrasing your question or ask me something specific about your finances.""",
            'assumptions': ["Fallback response due to processing error"],
            'computations': [],
            'ui_blocks': [],
            'next_data_requests': []
        }

    def _get_transaction_schema(self) -> Dict[str, Any]:
        """Get simplified schema for transaction queries"""
        return {
            'table': 'public.transactions',
            'columns': {
                'id': 'uuid',
                'user_id': 'uuid',
                'amount': 'numeric',
                'date': 'date',
                'posted_datetime': 'timestamptz',
                'merchant_name': 'text',
                'category': 'text',
                'pending': 'boolean'
            },
            'notes': {
                'amount_sign': 'Negative = expenses, Positive = income',
                'date_handling': 'Use COALESCE(posted_datetime, date::timestamptz)',
                'user_filter': 'Always filter by user_id'
            }
        }

    def _serialize_row(self, row: Dict[str, Any]) -> List[Any]:
        """Serialize database row for JSON"""
        result = []
        for value in row.values():
            if value is None:
                result.append(None)
            elif isinstance(value, datetime):
                result.append(value.isoformat())
            elif isinstance(value, Decimal):
                result.append(float(value))
            else:
                result.append(value)
        return result
