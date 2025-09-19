# TRUEFIBACKEND/profile_pack/entity_resolver.py
# Entity resolver for merchant, category, and time normalization

import re
from datetime import datetime, date, timedelta
from typing import Dict, Any, List, Tuple, Optional
import logging

logger = logging.getLogger(__name__)

class EntityResolver:
    """Resolves and normalizes entities for SQL queries"""

    # Merchant normalization patterns
    MERCHANT_PATTERNS = {
        'netflix': ['NETFLIX*', 'NETFLIX.COM', 'Netflix'],
        'amazon': ['AMAZON*', 'AMZN*', 'Amazon.com', 'AMAZON MKTPLACE'],
        'spotify': ['SPOTIFY*', 'Spotify USA', 'SPOTIFY P'],
        'uber': ['UBER*', 'UBER TRIP', 'Uber Technologies'],
        'lyft': ['LYFT*', 'LYFT RIDE'],
        'doordash': ['DOORDASH*', 'DD *', 'DoorDash'],
        'starbucks': ['STARBUCKS*', 'STARBUCKS STORE', 'Starbucks'],
        'walmart': ['WALMART*', 'WAL-MART', 'Walmart.com'],
        'target': ['TARGET*', 'TARGET.COM', 'Target'],
        'costco': ['COSTCO*', 'COSTCO WHSE', 'Costco'],
        'whole_foods': ['WHOLE FOODS*', 'WHOLEFDS', 'Whole Foods Market']
    }

    # Category mappings
    CATEGORY_HIERARCHY = {
        'Food and Drink': {
            'detailed': ['Restaurants', 'Groceries', 'Coffee Shops', 'Fast Food', 'Bars'],
            'keywords': ['dining', 'restaurant', 'food', 'grocery', 'coffee', 'bar']
        },
        'Transportation': {
            'detailed': ['Rideshare', 'Public Transit', 'Gas', 'Parking', 'Auto Insurance'],
            'keywords': ['uber', 'lyft', 'gas', 'parking', 'transit', 'metro']
        },
        'Shopping': {
            'detailed': ['Clothing', 'Electronics', 'General Merchandise', 'Online Shopping'],
            'keywords': ['amazon', 'walmart', 'target', 'clothing', 'electronics']
        },
        'Entertainment': {
            'detailed': ['Movies', 'Music', 'Games', 'Streaming Services'],
            'keywords': ['netflix', 'spotify', 'movie', 'entertainment', 'gaming']
        },
        'Bills and Utilities': {
            'detailed': ['Internet', 'Phone', 'Electricity', 'Water', 'Rent'],
            'keywords': ['comcast', 'verizon', 'utility', 'rent', 'internet']
        }
    }

    @classmethod
    def normalize_merchant(cls, merchant_name: str) -> Tuple[str, List[str]]:
        """
        Normalize merchant name and return SQL patterns
        Returns (normalized_name, sql_patterns)
        """
        if not merchant_name:
            return merchant_name, []

        # Clean the merchant name
        cleaned = merchant_name.upper().strip()
        cleaned = re.sub(r'\s+', ' ', cleaned)  # Multiple spaces to single
        cleaned = re.sub(r'[#*]+\d+$', '', cleaned)  # Remove trailing #1234

        # Check for known patterns
        for normalized, patterns in cls.MERCHANT_PATTERNS.items():
            for pattern in patterns:
                if pattern.replace('*', '') in cleaned:
                    # Return patterns for SQL ILIKE
                    sql_patterns = [f"%{p}%" for p in patterns]
                    return normalized, sql_patterns

        # Return original with basic pattern
        return merchant_name, [f"%{cleaned}%"]

    @classmethod
    def resolve_category(cls, category_input: str) -> Dict[str, Any]:
        """
        Resolve category to standard format
        Returns dict with primary and detailed categories
        """
        if not category_input:
            return {'primary': None, 'detailed': [], 'sql_filter': None}

        category_lower = category_input.lower()

        # Check each primary category
        for primary, details in cls.CATEGORY_HIERARCHY.items():
            # Check if input matches primary
            if category_lower in primary.lower():
                return {
                    'primary': primary,
                    'detailed': details['detailed'],
                    'sql_filter': f"pfc_primary = '{primary}'"
                }

            # Check detailed categories
            for detailed in details['detailed']:
                if category_lower in detailed.lower():
                    return {
                        'primary': primary,
                        'detailed': [detailed],
                        'sql_filter': f"pfc_detailed = '{detailed}'"
                    }

            # Check keywords
            for keyword in details['keywords']:
                if keyword in category_lower:
                    return {
                        'primary': primary,
                        'detailed': details['detailed'],
                        'sql_filter': f"pfc_primary = '{primary}'"
                    }

        # No match found
        return {
            'primary': category_input,
            'detailed': [],
            'sql_filter': f"(pfc_primary ILIKE '%{category_input}%' OR pfc_detailed ILIKE '%{category_input}%')"
        }

    @classmethod
    def resolve_time_window(cls, time_description: str) -> Dict[str, Any]:
        """
        Convert natural language time to SQL date ranges
        Returns dict with start_date, end_date, and SQL conditions
        """
        today = date.today()
        time_lower = time_description.lower()

        # Common patterns
        patterns = {
            'today': {
                'start': today,
                'end': today
            },
            'yesterday': {
                'start': today - timedelta(days=1),
                'end': today - timedelta(days=1)
            },
            'this week': {
                'start': today - timedelta(days=today.weekday()),
                'end': today
            },
            'last week': {
                'start': today - timedelta(days=today.weekday() + 7),
                'end': today - timedelta(days=today.weekday() + 1)
            },
            'this month': {
                'start': today.replace(day=1),
                'end': today
            },
            'last month': {
                'start': (today.replace(day=1) - timedelta(days=1)).replace(day=1),
                'end': today.replace(day=1) - timedelta(days=1)
            },
            'this year': {
                'start': today.replace(month=1, day=1),
                'end': today
            },
            'ytd': {
                'start': today.replace(month=1, day=1),
                'end': today
            },
            'last year': {
                'start': today.replace(year=today.year - 1, month=1, day=1),
                'end': today.replace(year=today.year - 1, month=12, day=31)
            }
        }

        # Check exact matches
        for pattern, dates in patterns.items():
            if pattern in time_lower:
                return {
                    'start_date': dates['start'].isoformat(),
                    'end_date': dates['end'].isoformat(),
                    'sql_condition': f"COALESCE(posted_datetime, date::timestamptz) BETWEEN '{dates['start'].isoformat()}'::date AND '{dates['end'].isoformat()}'::date + INTERVAL '1 day'"
                }

        # Check for "last N days/weeks/months"
        last_n_match = re.search(r'last (\d+) (day|week|month)', time_lower)
        if last_n_match:
            n = int(last_n_match.group(1))
            unit = last_n_match.group(2)

            if unit == 'day':
                start = today - timedelta(days=n)
            elif unit == 'week':
                start = today - timedelta(weeks=n)
            elif unit == 'month':
                start = today - timedelta(days=n * 30)  # Approximate
            else:
                start = today

            return {
                'start_date': start.isoformat(),
                'end_date': today.isoformat(),
                'sql_condition': f"COALESCE(posted_datetime, date::timestamptz) >= '{start.isoformat()}'::date"
            }

        # Check for "since DATE"
        since_match = re.search(r'since (\d{4}-\d{2}-\d{2}|\w+ \d+)', time_lower)
        if since_match:
            date_str = since_match.group(1)
            try:
                if '-' in date_str:
                    start = datetime.strptime(date_str, '%Y-%m-%d').date()
                else:
                    # Try parsing "January 15" format
                    start = datetime.strptime(f"{date_str} {today.year}", '%B %d %Y').date()
            except:
                start = today - timedelta(days=30)  # Default fallback

            return {
                'start_date': start.isoformat(),
                'end_date': today.isoformat(),
                'sql_condition': f"COALESCE(posted_datetime, date::timestamptz) >= '{start.isoformat()}'::date"
            }

        # Check for quarters
        if 'q1' in time_lower or 'first quarter' in time_lower:
            start = today.replace(month=1, day=1)
            end = today.replace(month=3, day=31)
        elif 'q2' in time_lower or 'second quarter' in time_lower:
            start = today.replace(month=4, day=1)
            end = today.replace(month=6, day=30)
        elif 'q3' in time_lower or 'third quarter' in time_lower:
            start = today.replace(month=7, day=1)
            end = today.replace(month=9, day=30)
        elif 'q4' in time_lower or 'fourth quarter' in time_lower:
            start = today.replace(month=10, day=1)
            end = today.replace(month=12, day=31)
        else:
            # Default to last 30 days
            start = today - timedelta(days=30)
            end = today

        return {
            'start_date': start.isoformat(),
            'end_date': end.isoformat(),
            'sql_condition': f"COALESCE(posted_datetime, date::timestamptz) BETWEEN '{start.isoformat()}'::date AND '{end.isoformat()}'::date + INTERVAL '1 day'"
        }

    @classmethod
    def build_account_filter(cls, account_description: Optional[str]) -> Dict[str, Any]:
        """
        Build account filter from description
        Returns dict with account filters
        """
        if not account_description:
            return {'sql_filter': None, 'account_types': []}

        desc_lower = account_description.lower()

        # Account type mappings
        if any(word in desc_lower for word in ['checking', 'debit']):
            return {
                'sql_filter': "a.type = 'depository' AND a.subtype = 'checking'",
                'account_types': ['checking']
            }
        elif any(word in desc_lower for word in ['savings', 'save']):
            return {
                'sql_filter': "a.type = 'depository' AND a.subtype = 'savings'",
                'account_types': ['savings']
            }
        elif any(word in desc_lower for word in ['credit', 'card']):
            return {
                'sql_filter': "a.type = 'credit'",
                'account_types': ['credit']
            }
        elif any(word in desc_lower for word in ['investment', 'brokerage', '401k', 'ira']):
            return {
                'sql_filter': "a.type = 'investment'",
                'account_types': ['investment']
            }
        elif any(word in desc_lower for word in ['loan', 'mortgage']):
            return {
                'sql_filter': "a.type = 'loan'",
                'account_types': ['loan']
            }
        else:
            # Check for specific account name
            return {
                'sql_filter': f"a.name ILIKE '%{account_description}%'",
                'account_types': []
            }