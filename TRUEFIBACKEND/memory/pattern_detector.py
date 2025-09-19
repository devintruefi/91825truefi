# TRUEFIBACKEND/memory/pattern_detector.py
# Detects and learns user financial patterns and behaviors

import logging
import json
import asyncio
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
from collections import defaultdict
import statistics
import psycopg2.extras
from db import get_db_pool

logger = logging.getLogger(__name__)

class PatternDetector:
    """
    Analyzes user financial data and chat interactions to detect patterns,
    learn behaviors, and provide predictive insights.
    """

    def __init__(self):
        self.pattern_thresholds = {
            'recurring_transaction': 0.7,  # Confidence threshold for recurring detection
            'spending_spike': 2.0,  # Standard deviations for spike detection
            'category_trend': 0.3,  # Minimum change for trend detection
            'saving_pattern': 0.6  # Confidence for saving pattern
        }

    async def detect_financial_patterns(
        self,
        user_id: str,
        lookback_days: int = 90
    ) -> List[Dict[str, Any]]:
        """
        Detect various financial patterns for a user.

        Args:
            user_id: User ID
            lookback_days: Days to look back for pattern detection

        Returns:
            List of detected patterns
        """
        try:
            patterns = []

            # Detect different pattern types
            patterns.extend(await self._detect_recurring_expenses(user_id, lookback_days))
            patterns.extend(await self._detect_spending_spikes(user_id, lookback_days))
            patterns.extend(await self._detect_category_trends(user_id, lookback_days))
            patterns.extend(await self._detect_saving_patterns(user_id, lookback_days))
            patterns.extend(await self._detect_query_patterns(user_id, lookback_days))

            # Store patterns in database
            for pattern in patterns:
                await self._store_financial_pattern(user_id, pattern)

            logger.info(f"Detected {len(patterns)} patterns for user {user_id}")
            return patterns

        except Exception as e:
            logger.error(f"Error detecting financial patterns: {e}")
            return []

    async def _detect_recurring_expenses(
        self,
        user_id: str,
        lookback_days: int
    ) -> List[Dict[str, Any]]:
        """
        Detect recurring transactions (subscriptions, bills, etc.).
        Uses proper date handling with COALESCE(posted_datetime, date).
        """
        def _work():
            pool = get_db_pool()
            with pool.get_connection() as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    # Use proper date handling as per schema invariant
                    cur.execute("""
                        WITH merchant_patterns AS (
                            SELECT
                                merchant_name,
                                ROUND(AVG(ABS(amount)), 2) as avg_amount,
                                STDDEV(ABS(amount)) as amount_stddev,
                                COUNT(*) as transaction_count,
                                ARRAY_AGG(DISTINCT DATE_PART('day', COALESCE(posted_datetime, date::timestamptz))) as days_of_month,
                                MIN(COALESCE(posted_datetime, date::timestamptz)) as first_seen,
                                MAX(COALESCE(posted_datetime, date::timestamptz)) as last_seen
                            FROM transactions
                            WHERE user_id = %s::uuid
                              AND amount < 0
                              AND COALESCE(posted_datetime, date::timestamptz) >= NOW() - (%s || ' days')::interval
                              AND merchant_name IS NOT NULL
                            GROUP BY merchant_name
                            HAVING COUNT(*) >= 2
                        )
                        SELECT * FROM merchant_patterns
                        WHERE transaction_count >= 3
                           OR (transaction_count = 2 AND last_seen - first_seen >= INTERVAL '25 days')
                        ORDER BY transaction_count DESC
                    """, (user_id, lookback_days))

                    recurring_candidates = cur.fetchall()

                patterns = []
                for candidate in recurring_candidates:
                    # Calculate confidence based on regularity
                    confidence = self._calculate_recurrence_confidence(candidate)

                    if confidence >= self.pattern_thresholds['recurring_transaction']:
                        patterns.append({
                            'pattern_type': 'recurring_expense',
                            'pattern_name': f"Recurring: {candidate['merchant_name']}",
                            'pattern_data': {
                                'merchant': candidate['merchant_name'],
                                'avg_amount': float(candidate['avg_amount']),
                                'frequency': self._determine_frequency(candidate),
                                'next_expected': self._predict_next_occurrence(candidate)
                            },
                            'confidence': confidence,
                            'frequency': candidate['transaction_count'],
                            'merchant_list': [candidate['merchant_name']],
                            'amount_range': (
                                float(candidate['avg_amount']) - float(candidate['amount_stddev'] or 0),
                                float(candidate['avg_amount']) + float(candidate['amount_stddev'] or 0)
                            )
                        })

                return patterns

        # Run blocking DB work in thread pool
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, _work)

    async def _detect_spending_spikes(
        self,
        user_id: str,
        lookback_days: int
    ) -> List[Dict[str, Any]]:
        """
        Detect unusual spending spikes or patterns.
        """
        def _work():
            pool = get_db_pool()
            with pool.get_connection() as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    # Get daily spending totals using proper date handling
                    cur.execute("""
                        SELECT
                            DATE(COALESCE(posted_datetime, date::timestamptz)) as spend_date,
                            SUM(ABS(amount)) as daily_total,
                            COUNT(*) as transaction_count,
                            ARRAY_AGG(DISTINCT category) as categories
                        FROM transactions
                        WHERE user_id = %s::uuid
                          AND amount < 0
                          AND COALESCE(posted_datetime, date::timestamptz) >= NOW() - (%s || ' days')::interval
                        GROUP BY DATE(COALESCE(posted_datetime, date::timestamptz))
                        ORDER BY spend_date
                    """, (user_id, lookback_days))

                    daily_spending = cur.fetchall()

                patterns = []
                if len(daily_spending) > 7:  # Need at least a week of data
                    amounts = [float(day['daily_total']) for day in daily_spending]
                    mean_spending = statistics.mean(amounts)
                    std_spending = statistics.stdev(amounts) if len(amounts) > 1 else 0

                    # Detect spikes
                    for day in daily_spending:
                        daily_total = float(day['daily_total'])
                        z_score = (daily_total - mean_spending) / std_spending if std_spending > 0 else 0

                        if z_score > self.pattern_thresholds['spending_spike']:
                            patterns.append({
                                'pattern_type': 'spending_spike',
                                'pattern_name': f"High spending on {day['spend_date']}",
                                'pattern_data': {
                                    'date': str(day['spend_date']),
                                    'amount': daily_total,
                                    'z_score': round(z_score, 2),
                                    'categories': list(day['categories']) if day['categories'] else [],
                                    'transaction_count': day['transaction_count']
                                },
                                'confidence': min(z_score / 3.0, 1.0),  # Normalize confidence
                                'frequency': 1,
                                'category_list': list(day['categories']) if day['categories'] else []
                            })

                return patterns

        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, _work)

    async def _detect_category_trends(
        self,
        user_id: str,
        lookback_days: int
    ) -> List[Dict[str, Any]]:
        """
        Detect trends in spending by category.
        """
        def _work():
            pool = get_db_pool()
            with pool.get_connection() as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    # Get monthly spending by category
                    cur.execute("""
                        SELECT
                            DATE_TRUNC('month', COALESCE(posted_datetime, date::timestamptz)) as month,
                            COALESCE(category, 'Uncategorized') as category,
                            SUM(ABS(amount)) as monthly_total,
                            COUNT(*) as transaction_count
                        FROM transactions
                        WHERE user_id = %s::uuid
                          AND amount < 0
                          AND COALESCE(posted_datetime, date::timestamptz) >= NOW() - (%s || ' days')::interval
                        GROUP BY DATE_TRUNC('month', COALESCE(posted_datetime, date::timestamptz)), category
                        ORDER BY month, category
                    """, (user_id, lookback_days))

                    monthly_categories = cur.fetchall()

                # Analyze trends by category
                category_data = defaultdict(list)
                for row in monthly_categories:
                    category_data[row['category']].append({
                        'month': row['month'],
                        'amount': float(row['monthly_total']),
                        'count': row['transaction_count']
                    })

                patterns = []
                for category, months in category_data.items():
                    if len(months) >= 2:  # Need at least 2 months for a trend
                        amounts = [m['amount'] for m in months]

                        # Calculate trend (simple linear regression slope)
                        trend = self._calculate_trend(amounts)

                        if abs(trend) > self.pattern_thresholds['category_trend']:
                            trend_direction = 'increasing' if trend > 0 else 'decreasing'
                            patterns.append({
                                'pattern_type': 'category_trend',
                                'pattern_name': f"{category} spending {trend_direction}",
                                'pattern_data': {
                                    'category': category,
                                    'trend_direction': trend_direction,
                                    'trend_strength': abs(trend),
                                    'recent_amounts': amounts[-3:] if len(amounts) > 3 else amounts,
                                    'change_percent': round(((amounts[-1] - amounts[0]) / amounts[0]) * 100, 2) if amounts[0] > 0 else 0
                                },
                                'confidence': min(abs(trend), 1.0),
                                'frequency': len(months),
                                'category_list': [category]
                            })

                return patterns

        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, _work)

    async def _detect_saving_patterns(
        self,
        user_id: str,
        lookback_days: int
    ) -> List[Dict[str, Any]]:
        """
        Detect saving or transfer patterns.
        """
        def _work():
            pool = get_db_pool()
            with pool.get_connection() as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    # Look for regular positive transactions (income/transfers)
                    cur.execute("""
                        SELECT
                            DATE_TRUNC('month', COALESCE(posted_datetime, date::timestamptz)) as month,
                            SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as income,
                            SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as expenses
                        FROM transactions
                        WHERE user_id = %s::uuid
                          AND COALESCE(posted_datetime, date::timestamptz) >= NOW() - (%s || ' days')::interval
                        GROUP BY DATE_TRUNC('month', COALESCE(posted_datetime, date::timestamptz))
                        ORDER BY month
                    """, (user_id, lookback_days))

                    monthly_cashflow = cur.fetchall()

                patterns = []
                if monthly_cashflow:
                    savings_rates = []
                    for month in monthly_cashflow:
                        income = float(month['income'])
                        expenses = float(month['expenses'])

                        if income > 0:
                            savings_rate = (income - expenses) / income
                            savings_rates.append(savings_rate)

                    if savings_rates:
                        avg_savings_rate = statistics.mean(savings_rates)

                        if avg_savings_rate > 0.05:  # Saving at least 5%
                            patterns.append({
                                'pattern_type': 'saving_pattern',
                                'pattern_name': 'Consistent Saving',
                                'pattern_data': {
                                    'avg_savings_rate': round(avg_savings_rate * 100, 2),
                                    'monthly_rates': [round(r * 100, 2) for r in savings_rates],
                                    'consistency': self._calculate_consistency(savings_rates)
                                },
                                'confidence': min(avg_savings_rate * 2, 1.0),
                                'frequency': len(savings_rates)
                            })

                return patterns

        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, _work)

    async def _detect_query_patterns(
        self,
        user_id: str,
        lookback_days: int
    ) -> List[Dict[str, Any]]:
        """
        Detect patterns in user's chat queries.
        """
        def _work():
            pool = get_db_pool()
            with pool.get_connection() as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    # Analyze chat message patterns
                    cur.execute("""
                        SELECT
                            intent,
                            COUNT(*) as query_count,
                            ARRAY_AGG(DISTINCT DATE_PART('hour', created_at)) as hours,
                            ARRAY_AGG(DISTINCT DATE_PART('dow', created_at)) as days_of_week,
                            MIN(created_at) as first_asked,
                            MAX(created_at) as last_asked
                        FROM chat_messages
                        WHERE user_id = %s::uuid
                          AND role = 'user'
                          AND intent IS NOT NULL
                          AND created_at >= NOW() - (%s || ' days')::interval
                        GROUP BY intent
                        HAVING COUNT(*) >= 2
                        ORDER BY query_count DESC
                    """, (user_id, lookback_days))

                    query_patterns = cur.fetchall()

                patterns = []
                for pattern in query_patterns:
                    # Determine time preference
                    hours = pattern['hours'] if pattern['hours'] else []
                    time_preference = self._determine_time_preference(hours)

                    patterns.append({
                        'pattern_type': 'query_behavior',
                        'pattern_name': f"Frequently asks about {pattern['intent']}",
                        'pattern_data': {
                            'intent': pattern['intent'],
                            'frequency': pattern['query_count'],
                            'time_preference': time_preference,
                            'days_active': len(pattern['days_of_week']) if pattern['days_of_week'] else 0
                        },
                        'confidence': min(pattern['query_count'] / 10, 1.0),
                        'frequency': pattern['query_count']
                    })

                return patterns

        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, _work)

    async def _store_financial_pattern(
        self,
        user_id: str,
        pattern: Dict[str, Any]
    ):
        """Store detected pattern in the database."""
        def _work():
            pool = get_db_pool()
            with pool.get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO financial_patterns (
                            user_id, pattern_type, pattern_name, pattern_data,
                            confidence, frequency, merchant_list, category_list,
                            last_detected
                        )
                        VALUES (%s::uuid, %s, %s, %s, %s, %s, %s, %s, NOW())
                        ON CONFLICT (user_id, pattern_type, pattern_name)
                        DO UPDATE SET
                            pattern_data = EXCLUDED.pattern_data,
                            confidence = EXCLUDED.confidence,
                            frequency = EXCLUDED.frequency,
                            last_detected = NOW(),
                            updated_at = NOW()
                    """, (
                        user_id,
                        pattern['pattern_type'],
                        pattern['pattern_name'],
                        json.dumps(pattern['pattern_data']),
                        pattern.get('confidence', 0.5),
                        pattern.get('frequency', 1),
                        pattern.get('merchant_list', []),
                        pattern.get('category_list', [])
                    ))

        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, _work)

    def _calculate_recurrence_confidence(self, transaction_data: Dict) -> float:
        """Calculate confidence score for recurring transaction."""
        try:
            count = transaction_data['transaction_count']
            days_span = (transaction_data['last_seen'] - transaction_data['first_seen']).days

            if days_span == 0:
                return 0.3

            # Calculate expected occurrences based on time span
            expected_monthly = days_span / 30
            expected_weekly = days_span / 7
            expected_biweekly = days_span / 14

            # Check which frequency matches best
            monthly_diff = abs(count - expected_monthly)
            weekly_diff = abs(count - expected_weekly)
            biweekly_diff = abs(count - expected_biweekly)

            min_diff = min(monthly_diff, weekly_diff, biweekly_diff)

            # Base confidence on how well it matches expected frequency
            base_confidence = 1.0 - (min_diff / count) if count > 0 else 0

            # Adjust for amount consistency
            amount_stddev = transaction_data.get('amount_stddev', 0)
            avg_amount = transaction_data.get('avg_amount', 1)
            consistency_factor = 1.0 - min((amount_stddev / avg_amount), 0.5) if avg_amount > 0 else 0.5

            return min(base_confidence * consistency_factor, 1.0)

        except Exception as e:
            logger.error(f"Error calculating recurrence confidence: {e}")
            return 0.0

    def _determine_frequency(self, transaction_data: Dict) -> str:
        """Determine the frequency of recurring transactions."""
        try:
            count = transaction_data['transaction_count']
            days_span = (transaction_data['last_seen'] - transaction_data['first_seen']).days

            if days_span == 0:
                return 'one-time'

            avg_days_between = days_span / (count - 1) if count > 1 else days_span

            if avg_days_between <= 8:
                return 'weekly'
            elif avg_days_between <= 16:
                return 'bi-weekly'
            elif avg_days_between <= 35:
                return 'monthly'
            elif avg_days_between <= 95:
                return 'quarterly'
            elif avg_days_between <= 370:
                return 'yearly'
            else:
                return 'irregular'

        except Exception as e:
            logger.error(f"Error determining frequency: {e}")
            return 'unknown'

    def _predict_next_occurrence(self, transaction_data: Dict) -> Optional[str]:
        """Predict when the next occurrence of a recurring transaction might be."""
        try:
            frequency = self._determine_frequency(transaction_data)
            last_seen = transaction_data['last_seen']

            if frequency == 'weekly':
                next_date = last_seen + timedelta(days=7)
            elif frequency == 'bi-weekly':
                next_date = last_seen + timedelta(days=14)
            elif frequency == 'monthly':
                next_date = last_seen + timedelta(days=30)
            elif frequency == 'quarterly':
                next_date = last_seen + timedelta(days=90)
            elif frequency == 'yearly':
                next_date = last_seen + timedelta(days=365)
            else:
                return None

            return next_date.strftime('%Y-%m-%d')

        except Exception as e:
            logger.error(f"Error predicting next occurrence: {e}")
            return None

    def _calculate_trend(self, values: List[float]) -> float:
        """
        Calculate trend using simple linear regression slope.
        Returns the slope normalized by the mean of values.
        """
        try:
            if len(values) < 2:
                return 0.0

            n = len(values)
            x = list(range(n))

            # Calculate slope using least squares
            x_mean = sum(x) / n
            y_mean = sum(values) / n

            numerator = sum((x[i] - x_mean) * (values[i] - y_mean) for i in range(n))
            denominator = sum((x[i] - x_mean) ** 2 for i in range(n))

            if denominator == 0:
                return 0.0

            slope = numerator / denominator

            # Normalize by mean to get percentage-like value
            return slope / y_mean if y_mean != 0 else 0.0

        except Exception as e:
            logger.error(f"Error calculating trend: {e}")
            return 0.0

    def _calculate_consistency(self, values: List[float]) -> float:
        """
        Calculate consistency score (inverse of coefficient of variation).
        Returns a value between 0 and 1.
        """
        try:
            if not values or len(values) < 2:
                return 0.0

            mean_val = statistics.mean(values)
            if mean_val == 0:
                return 0.0

            std_val = statistics.stdev(values)
            cv = std_val / abs(mean_val)

            # Convert to consistency score (0-1, where 1 is most consistent)
            return max(0, min(1, 1 - cv))

        except Exception as e:
            logger.error(f"Error calculating consistency: {e}")
            return 0.0

    def _determine_time_preference(self, hours: List[int]) -> str:
        """Determine user's preferred time of day for queries."""
        try:
            if not hours:
                return 'no_preference'

            morning = sum(1 for h in hours if 5 <= h < 12)
            afternoon = sum(1 for h in hours if 12 <= h < 18)
            evening = sum(1 for h in hours if 18 <= h < 23)
            night = sum(1 for h in hours if h < 5 or h >= 23)

            total = morning + afternoon + evening + night
            if total == 0:
                return 'no_preference'

            # Find dominant time
            times = [
                ('morning', morning),
                ('afternoon', afternoon),
                ('evening', evening),
                ('night', night)
            ]

            dominant = max(times, key=lambda x: x[1])

            # Only return if it's significantly dominant (>40% of queries)
            if dominant[1] / total > 0.4:
                return dominant[0]
            else:
                return 'varied'

        except Exception as e:
            logger.error(f"Error determining time preference: {e}")
            return 'unknown'