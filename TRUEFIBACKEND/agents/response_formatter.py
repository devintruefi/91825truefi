# TRUEFIBACKEND/agents/response_formatter.py
# Robust response formatting module that ensures proper text spacing and JSON validity

import re
import json
from typing import Dict, Any, Union, List
import logging

logger = logging.getLogger(__name__)

class ResponseFormatter:
    """Handles all response formatting to ensure production-grade output"""

    @staticmethod
    def ensure_text_spacing(text: str) -> str:
        """Fix text spacing issues in markdown responses"""
        if not text:
            return text

        # Fix currency formatting without spaces
        # Pattern: number followed immediately by text (no space)
        text = re.sub(r'(\$[\d,]+\.?\d*)((?:and|which|that|this|but|however|therefore))', r'\1 \2', text, flags=re.IGNORECASE)
        text = re.sub(r'(\d+\.?\d*%)((?:and|which|that|this|but|however|therefore))', r'\1 \2', text, flags=re.IGNORECASE)

        # Fix currency amounts directly followed by periods and text (e.g., "$42,600.Youhavesaved")
        text = re.sub(r'(\$[\d,]+(?:\.\d{2})?)\.([A-Z])', r'\1. \2', text)

        # Fix missing spaces after periods
        text = re.sub(r'\.([A-Z])', r'. \1', text)

        # Fix missing spaces after commas
        text = re.sub(r',([A-Za-z])', r', \1', text)

        # Fix concatenated words with currency amounts
        # Pattern: word directly attached to currency
        text = re.sub(r'([a-zA-Z])(\$[\d,]+)', r'\1 \2', text)
        text = re.sub(r'(\$[\d,]+\.?\d*)([a-zA-Z])', r'\1 \2', text)

        # Fix specific patterns we've seen
        text = re.sub(r'of\$', r'of $', text, flags=re.IGNORECASE)
        text = re.sub(r'is\$', r'is $', text, flags=re.IGNORECASE)
        text = re.sub(r'are\$', r'are $', text, flags=re.IGNORECASE)
        text = re.sub(r'have\$', r'have $', text, flags=re.IGNORECASE)
        text = re.sub(r'has\$', r'has $', text, flags=re.IGNORECASE)

        # Fix percentage formatting
        text = re.sub(r'(\d+)%([a-z])', r'\1% \2', text, flags=re.IGNORECASE)

        # Ensure proper spacing around common words
        patterns = [
            (r'andexpensesof', r'and expenses of'),
            (r'andincomeof', r'and income of'),
            (r'withmonthly', r'with monthly'),
            (r'yourmonthly', r'your monthly'),
            (r'Thisisconsiderably', r'This is considerably'),
            (r'whichisa', r'which is a'),
            (r'thisisabout', r'this is about'),
            (r'Youhavesaved', r'You have saved'),
            (r'Youhave', r'You have'),
            (r'Ihave', r'I have'),
            (r'havesaved', r'have saved'),
            (r'ofyour', r'of your'),
            (r'inyour', r'in your'),
            (r'foryour', r'for your'),
            (r'withyour', r'with your'),
            (r'onyour', r'on your'),
            (r'fromyour', r'from your'),
        ]

        for pattern, replacement in patterns:
            text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)

        return text

    @staticmethod
    def format_currency(amount: Union[float, int, str]) -> str:
        """Format currency with proper symbols and separators"""
        try:
            # Handle string inputs
            if isinstance(amount, str):
                # Remove existing formatting
                amount = amount.replace('$', '').replace(',', '')
                amount = float(amount)

            # Handle negative values
            if amount < 0:
                return f"-${abs(amount):,.2f}"

            return f"${amount:,.2f}"
        except (ValueError, TypeError):
            return "$0.00"

    @staticmethod
    def format_percentage(value: Union[float, int, str]) -> str:
        """Format percentage with proper symbol"""
        try:
            if isinstance(value, str):
                value = value.replace('%', '')
                value = float(value)

            return f"{value:.1f}%"
        except (ValueError, TypeError):
            return "0.0%"

    @staticmethod
    def validate_and_fix_json(data: Union[Dict, str]) -> Dict[str, Any]:
        """Ensure JSON is valid and fix common issues"""
        if isinstance(data, str):
            try:
                # Try to parse as JSON
                data = json.loads(data)
            except json.JSONDecodeError as e:
                logger.error(f"JSON parsing error: {e}")
                # Try to fix common JSON issues
                fixed_json = ResponseFormatter._fix_common_json_errors(data)
                try:
                    data = json.loads(fixed_json)
                except json.JSONDecodeError:
                    # Return a safe fallback
                    return {
                        'answer_markdown': 'I encountered an error processing the data.',
                        'assumptions': [],
                        'computations': [],
                        'ui_blocks': []
                    }

        # Ensure required fields exist
        if isinstance(data, dict):
            if 'answer_markdown' in data:
                # Fix text spacing in the markdown
                data['answer_markdown'] = ResponseFormatter.ensure_text_spacing(data['answer_markdown'])

            # Process computations to ensure proper formatting
            if 'computations' in data and isinstance(data['computations'], list):
                for comp in data['computations']:
                    if isinstance(comp.get('result'), dict):
                        # Format the result properly
                        comp['result'] = ResponseFormatter._format_computation_result(comp['result'])

        return data

    @staticmethod
    def _fix_common_json_errors(json_str: str) -> str:
        """Fix common JSON syntax errors"""
        # Remove trailing commas
        json_str = re.sub(r',\s*}', '}', json_str)
        json_str = re.sub(r',\s*]', ']', json_str)

        # Fix single quotes to double quotes
        json_str = re.sub(r"'([^']*)'", r'"\1"', json_str)

        # Fix unquoted keys
        json_str = re.sub(r'([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:', r'\1"\2":', json_str)

        # Remove comments
        json_str = re.sub(r'//[^\n]*', '', json_str)
        json_str = re.sub(r'/\*.*?\*/', '', json_str, flags=re.DOTALL)

        return json_str

    @staticmethod
    def _format_computation_result(result: Dict[str, Any]) -> str:
        """Format computation results for display"""
        if 'current_savings' in result:
            # True Savings Capacity Analysis
            current = result.get('current_savings', 0)
            moderate = result.get('moderate_savings', 0)
            aggressive = result.get('aggressive_savings', 0)
            max_possible = result.get('max_possible_savings', 0)

            formatted = f"Current: {ResponseFormatter.format_currency(current)}/mo ({ResponseFormatter.format_percentage(result.get('current_rate', 0))})\n"
            formatted += f"With moderate cuts: {ResponseFormatter.format_currency(moderate)}/mo ({ResponseFormatter.format_percentage(result.get('moderate_rate', 0))})\n"
            formatted += f"With aggressive cuts: {ResponseFormatter.format_currency(aggressive)}/mo ({ResponseFormatter.format_percentage(result.get('aggressive_rate', 0))})\n"
            formatted += f"Maximum possible: {ResponseFormatter.format_currency(max_possible)}/mo"

            if 'recommendation' in result:
                formatted += f"\n{result['recommendation']}"

            return formatted

        elif 'years_to_retirement' in result:
            # Retirement Runway Analysis
            formatted = f"{result.get('status', '')}\n"
            formatted += f"Amount needed: {ResponseFormatter.format_currency(result.get('retirement_needed', 0))}\n"
            formatted += f"Current savings: {ResponseFormatter.format_currency(result.get('current_savings', 0))}\n"
            formatted += f"Savings gap: {ResponseFormatter.format_currency(result.get('savings_gap', 0))}\n"
            formatted += f"Monthly contribution needed: {ResponseFormatter.format_currency(result.get('monthly_contribution_needed', 0))}\n"
            formatted += f"Readiness score: {result.get('readiness_score', 0):.0f}%"
            return formatted

        elif 'future_value' in result:
            # Portfolio Growth Projection
            formatted = f"Future value: {ResponseFormatter.format_currency(result.get('future_value', 0))}\n"
            formatted += f"Total contributions: {ResponseFormatter.format_currency(result.get('total_contributions', 0))}\n"
            formatted += f"Total growth: {ResponseFormatter.format_currency(result.get('total_growth', 0))}\n"
            formatted += f"Growth percentage: {ResponseFormatter.format_percentage(result.get('growth_percentage', 0))}"
            return formatted

        elif 'total_spending' in result:
            # Spending Flexibility Analysis
            formatted = f"Total spending: {ResponseFormatter.format_currency(result.get('total_spending', 0))}\n"
            formatted += f"Essential: {ResponseFormatter.format_currency(result.get('essential_spending', 0))}\n"
            formatted += f"Discretionary: {ResponseFormatter.format_currency(result.get('discretionary_spending', 0))}\n"
            formatted += f"Flexibility score: {result.get('flexibility_score', 0):.0f}%"

            if 'recommendation' in result:
                formatted += f"\n{result['recommendation']}"

            return formatted

        # Default: return as-is if it's a simple value
        if isinstance(result, (int, float)):
            # Check if it looks like a currency amount
            if abs(result) > 100:
                return ResponseFormatter.format_currency(result)
            elif 0 <= result <= 1:
                # Likely a percentage as decimal
                return ResponseFormatter.format_percentage(result * 100)
            else:
                return str(result)

        # Return string representation for other types
        return str(result)

    @staticmethod
    def format_table_data(headers: List[str], rows: List[List[Any]]) -> Dict[str, Any]:
        """Format data for table UI blocks with proper currency formatting"""
        formatted_rows = []

        for row in rows:
            formatted_row = []
            for i, cell in enumerate(row):
                # Check if this is likely a currency column
                if isinstance(cell, (int, float)) and any(word in headers[i].lower() for word in ['amount', 'balance', 'value', 'spent', 'income']):
                    formatted_row.append(ResponseFormatter.format_currency(cell))
                elif isinstance(cell, (int, float)) and any(word in headers[i].lower() for word in ['rate', 'percentage', '%']):
                    formatted_row.append(ResponseFormatter.format_percentage(cell))
                else:
                    formatted_row.append(str(cell))
            formatted_rows.append(formatted_row)

        return {
            'headers': headers,
            'rows': formatted_rows
        }

    @staticmethod
    def clean_response(response: Dict[str, Any]) -> Dict[str, Any]:
        """Clean and format the entire response object"""
        try:
            # Validate and fix JSON structure
            response = ResponseFormatter.validate_and_fix_json(response)

            # Fix text spacing in main answer
            if 'answer_markdown' in response:
                response['answer_markdown'] = ResponseFormatter.ensure_text_spacing(response['answer_markdown'])

            # Process UI blocks
            if 'ui_blocks' in response and isinstance(response['ui_blocks'], list):
                for block in response['ui_blocks']:
                    if block.get('type') == 'table' and 'data' in block:
                        # Format table data
                        if 'headers' in block['data'] and 'rows' in block['data']:
                            block['data'] = ResponseFormatter.format_table_data(
                                block['data']['headers'],
                                block['data']['rows']
                            )

                    # Fix any text in titles
                    if 'title' in block:
                        block['title'] = ResponseFormatter.ensure_text_spacing(block['title'])

            # Process assumptions
            if 'assumptions' in response and isinstance(response['assumptions'], list):
                response['assumptions'] = [
                    ResponseFormatter.ensure_text_spacing(assumption)
                    for assumption in response['assumptions']
                ]

            return response

        except Exception as e:
            logger.error(f"Error cleaning response: {e}")
            return response  # Return original if cleaning fails