# TRUEFIBACKEND/agents/search_builder.py
# Smart Search Query Builder for natural language transaction searches

import re
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
import logging

logger = logging.getLogger(__name__)

class SearchQueryBuilder:
    """Build SQL queries from natural language search requests"""

    # Common merchant variations
    MERCHANT_ALIASES = {
        'coffee': ['starbucks', 'dunkin', 'peet', 'coffee', 'cafe', 'espresso', 'java'],
        'uber': ['uber', 'uber eats'],
        'lyft': ['lyft'],
        'amazon': ['amazon', 'amzn'],
        'groceries': ['whole foods', 'trader joe', 'safeway', 'kroger', 'walmart', 'target'],
        'gas': ['shell', 'chevron', 'exxon', 'mobil', 'gas', 'fuel', '76', 'arco'],
        'food delivery': ['doordash', 'uber eats', 'grubhub', 'postmates', 'seamless'],
        'streaming': ['netflix', 'spotify', 'hulu', 'disney+', 'hbo', 'apple music', 'youtube'],
    }

    # Amount patterns
    AMOUNT_PATTERNS = [
        (r'over \$?([\d,]+(?:\.\d{2})?)', 'gt'),
        (r'above \$?([\d,]+(?:\.\d{2})?)', 'gt'),
        (r'more than \$?([\d,]+(?:\.\d{2})?)', 'gt'),
        (r'greater than \$?([\d,]+(?:\.\d{2})?)', 'gt'),
        (r'under \$?([\d,]+(?:\.\d{2})?)', 'lt'),
        (r'below \$?([\d,]+(?:\.\d{2})?)', 'lt'),
        (r'less than \$?([\d,]+(?:\.\d{2})?)', 'lt'),
        (r'between \$?([\d,]+(?:\.\d{2})?) and \$?([\d,]+(?:\.\d{2})?)', 'between'),
        (r'from \$?([\d,]+(?:\.\d{2})?) to \$?([\d,]+(?:\.\d{2})?)', 'between'),
        (r'around \$?([\d,]+(?:\.\d{2})?)', 'around'),
        (r'approximately \$?([\d,]+(?:\.\d{2})?)', 'around'),
        (r'exactly \$?([\d,]+(?:\.\d{2})?)', 'eq'),
        (r'\$?([\d,]+(?:\.\d{2})?) dollars?', 'eq'),
    ]

    # Date patterns
    DATE_PATTERNS = {
        'today': lambda: (datetime.now().date(), datetime.now().date()),
        'yesterday': lambda: ((datetime.now() - timedelta(days=1)).date(), (datetime.now() - timedelta(days=1)).date()),
        'this week': lambda: (
            datetime.now().date() - timedelta(days=datetime.now().weekday()),
            datetime.now().date()
        ),
        'last week': lambda: (
            datetime.now().date() - timedelta(days=datetime.now().weekday() + 7),
            datetime.now().date() - timedelta(days=datetime.now().weekday() + 1)
        ),
        'this month': lambda: (
            datetime.now().replace(day=1).date(),
            datetime.now().date()
        ),
        'last month': lambda: (
            (datetime.now().replace(day=1) - timedelta(days=1)).replace(day=1).date(),
            (datetime.now().replace(day=1) - timedelta(days=1)).date()
        ),
        'this year': lambda: (
            datetime.now().replace(month=1, day=1).date(),
            datetime.now().date()
        ),
        'last year': lambda: (
            datetime(datetime.now().year - 1, 1, 1).date(),
            datetime(datetime.now().year - 1, 12, 31).date()
        ),
    }

    def __init__(self):
        self.query_parts = []
        self.params = {}
        self.param_counter = 0

    def parse_search_query(self, question: str, user_id: str) -> Tuple[str, Dict[str, Any]]:
        """Parse natural language search query into SQL"""
        question_lower = question.lower()

        # Reset state
        self.query_parts = []
        self.params = {'user_id': user_id}
        self.param_counter = 0

        # Always filter by user_id
        self.query_parts.append("user_id = %(user_id)s")

        # Extract search criteria
        merchants = self._extract_merchants(question_lower)
        date_range = self._extract_date_range(question_lower)
        amounts = self._extract_amounts(question_lower)
        categories = self._extract_categories(question_lower)
        transaction_type = self._extract_transaction_type(question_lower)

        # Build merchant conditions
        if merchants:
            merchant_conditions = []
            for i, merchant in enumerate(merchants):
                param_name = f'merchant_{self.param_counter}'
                self.param_counter += 1
                self.params[param_name] = f'%{merchant}%'
                merchant_conditions.append(f"LOWER(merchant_name) LIKE %({param_name})s")
            if merchant_conditions:
                self.query_parts.append(f"({' OR '.join(merchant_conditions)})")

        # Build date conditions
        if date_range:
            start_date, end_date = date_range
            self.params['start_date'] = start_date
            self.params['end_date'] = end_date
            self.query_parts.append("COALESCE(posted_datetime, date::timestamptz) >= %(start_date)s")
            self.query_parts.append("COALESCE(posted_datetime, date::timestamptz) <= %(end_date)s")

        # Build amount conditions
        if amounts:
            amount_conditions = []
            for amount_filter in amounts:
                condition = self._build_amount_condition(amount_filter)
                if condition:
                    amount_conditions.append(condition)
            if amount_conditions:
                self.query_parts.append(f"({' AND '.join(amount_conditions)})")

        # Build category conditions
        if categories:
            category_conditions = []
            for i, category in enumerate(categories):
                param_name = f'category_{self.param_counter}'
                self.param_counter += 1
                self.params[param_name] = f'%{category}%'
                category_conditions.append(f"(LOWER(category) LIKE %({param_name})s OR LOWER(pfc_primary) LIKE %({param_name})s)")
            if category_conditions:
                self.query_parts.append(f"({' OR '.join(category_conditions)})")

        # Add transaction type filter (spending vs income)
        if transaction_type == 'spending':
            self.query_parts.append("amount < 0")
        elif transaction_type == 'income':
            self.query_parts.append("amount > 0")

        # Exclude pending by default unless specifically requested
        if 'pending' not in question_lower:
            self.query_parts.append("pending = false")

        # Build final SQL
        sql = self._build_sql()

        logger.info(f"Built search query: {sql}")
        logger.info(f"With params: {self.params}")

        return sql, self.params

    def _extract_merchants(self, text: str) -> List[str]:
        """Extract merchant names from text"""
        merchants = []

        # Check for merchant aliases
        for alias, variations in self.MERCHANT_ALIASES.items():
            if alias in text:
                merchants.extend(variations)

        # Look for "at <merchant>" pattern
        at_pattern = r'\bat\s+([A-Z][a-zA-Z\s&\']+?)(?:\s|,|$)'
        at_matches = re.finditer(at_pattern, text, re.IGNORECASE)
        for match in at_matches:
            merchant = match.group(1).strip()
            if merchant and len(merchant) > 2:
                merchants.append(merchant.lower())

        # Look for quoted merchants
        quoted_pattern = r'"([^"]+)"'
        quoted_matches = re.finditer(quoted_pattern, text)
        for match in quoted_matches:
            merchants.append(match.group(1).lower())

        return list(set(merchants))  # Remove duplicates

    def _extract_date_range(self, text: str) -> Optional[Tuple[datetime, datetime]]:
        """Extract date range from text"""

        # Check for relative date patterns
        for pattern, date_func in self.DATE_PATTERNS.items():
            if pattern in text:
                return date_func()

        # Check for "last N days/weeks/months" patterns
        last_n_pattern = r'(?:last|past)\s+(\d+)\s+(days?|weeks?|months?)'
        match = re.search(last_n_pattern, text)
        if match:
            n = int(match.group(1))
            unit = match.group(2).rstrip('s')

            if unit == 'day':
                return (
                    (datetime.now() - timedelta(days=n)).date(),
                    datetime.now().date()
                )
            elif unit == 'week':
                return (
                    (datetime.now() - timedelta(weeks=n)).date(),
                    datetime.now().date()
                )
            elif unit == 'month':
                return (
                    (datetime.now() - timedelta(days=n*30)).date(),
                    datetime.now().date()
                )

        # Check for specific month names
        months = {
            'january': 1, 'february': 2, 'march': 3, 'april': 4,
            'may': 5, 'june': 6, 'july': 7, 'august': 8,
            'september': 9, 'october': 10, 'november': 11, 'december': 12
        }

        for month_name, month_num in months.items():
            if month_name in text:
                year = datetime.now().year
                # Check if it's a past month this year or last year
                if month_num > datetime.now().month:
                    year -= 1

                start_date = datetime(year, month_num, 1).date()
                # Get last day of month
                if month_num == 12:
                    end_date = datetime(year, 12, 31).date()
                else:
                    end_date = (datetime(year, month_num + 1, 1) - timedelta(days=1)).date()

                return (start_date, end_date)

        return None

    def _extract_amounts(self, text: str) -> List[Dict[str, Any]]:
        """Extract amount filters from text"""
        amounts = []

        for pattern, operator in self.AMOUNT_PATTERNS:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                if operator == 'between':
                    amounts.append({
                        'operator': 'between',
                        'min': float(match.group(1).replace(',', '')),
                        'max': float(match.group(2).replace(',', ''))
                    })
                elif operator == 'around':
                    value = float(match.group(1).replace(',', ''))
                    amounts.append({
                        'operator': 'between',
                        'min': value * 0.8,
                        'max': value * 1.2
                    })
                else:
                    amounts.append({
                        'operator': operator,
                        'value': float(match.group(1).replace(',', ''))
                    })

        return amounts

    def _extract_categories(self, text: str) -> List[str]:
        """Extract category names from text"""
        categories = []

        # Common category keywords
        category_keywords = [
            'food', 'dining', 'restaurants', 'groceries', 'shopping',
            'transportation', 'travel', 'entertainment', 'bills', 'utilities',
            'healthcare', 'medical', 'education', 'personal', 'home',
            'investments', 'taxes', 'insurance', 'subscription'
        ]

        for category in category_keywords:
            if category in text:
                categories.append(category)

        return categories

    def _extract_transaction_type(self, text: str) -> Optional[str]:
        """Determine if searching for spending or income"""
        spending_keywords = ['spent', 'spending', 'expenses', 'purchases', 'bought', 'paid']
        income_keywords = ['income', 'earned', 'received', 'deposits', 'credits']

        for keyword in spending_keywords:
            if keyword in text:
                return 'spending'

        for keyword in income_keywords:
            if keyword in text:
                return 'income'

        # Default to spending for transaction searches
        return 'spending'

    def _build_amount_condition(self, amount_filter: Dict[str, Any]) -> str:
        """Build SQL condition for amount filter"""
        operator = amount_filter['operator']

        if operator == 'gt':
            param_name = f'amount_{self.param_counter}'
            self.param_counter += 1
            self.params[param_name] = -amount_filter['value']  # Negative for expenses
            return f"amount < %({param_name})s"
        elif operator == 'lt':
            param_name = f'amount_{self.param_counter}'
            self.param_counter += 1
            self.params[param_name] = -amount_filter['value']
            return f"amount > %({param_name})s"
        elif operator == 'eq':
            param_name = f'amount_{self.param_counter}'
            self.param_counter += 1
            self.params[param_name] = -amount_filter['value']
            return f"ABS(amount + %({param_name})s) < 0.01"
        elif operator == 'between':
            min_param = f'amount_min_{self.param_counter}'
            max_param = f'amount_max_{self.param_counter}'
            self.param_counter += 1
            self.params[min_param] = -amount_filter['max']
            self.params[max_param] = -amount_filter['min']
            return f"(amount BETWEEN %({min_param})s AND %({max_param})s)"

        return ""

    def _build_sql(self) -> str:
        """Build final SQL query"""
        base_sql = """
        SELECT
            id,
            date,
            posted_datetime,
            merchant_name,
            name,
            amount,
            category,
            pfc_primary,
            payment_channel,
            pending
        FROM transactions
        WHERE {conditions}
        ORDER BY COALESCE(posted_datetime, date::timestamptz) DESC
        LIMIT 100
        """

        conditions = ' AND '.join(self.query_parts) if self.query_parts else '1=1'
        return base_sql.format(conditions=conditions).strip()