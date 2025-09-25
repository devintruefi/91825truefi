# tests/test_planner_resolver_search.py
"""
Unit tests for planner, merchant resolver, and search builder
"""

import unittest
from unittest.mock import Mock, patch, MagicMock
import datetime
from agents.planner import plan_with_4o, PlannerPlan, Entities, DateRange
from agents.merchant_resolver import resolve_merchants
from agents.search_builder import compile_transaction_search
from agents.invariants import assert_invariants_or_raise, InvariantError
from agents.router import classify_intent
from agents.intents import Intent


class TestPlannerAgent(unittest.TestCase):
    """Test the planner agent"""

    @patch('agents.planner.openai.ChatCompletion.create')
    def test_trader_joes_happy_path(self, mock_openai):
        """Test that 'trader joes' query is properly classified"""
        # Mock OpenAI response
        mock_openai.return_value = Mock(
            choices=[Mock(
                message=Mock(
                    content='{"intent": "transaction_search", "entities": {"merchants": ["trader joes"], "date_range": {"default": "90d"}}, "invariants": ["exclude-pending", "spend-amount-lt-0", "must-filter-merchant"], "confidence": 0.95}'
                )
            )]
        )

        question = "what have i been spending at trader joes"
        plan = plan_with_4o(question)

        self.assertEqual(plan.intent, "transaction_search")
        self.assertIn("trader joes", plan.entities.merchants)
        self.assertIn("must-filter-merchant", plan.invariants)
        self.assertIn("exclude-pending", plan.invariants)
        self.assertIn("spend-amount-lt-0", plan.invariants)
        self.assertGreaterEqual(plan.confidence, 0.9)

    @patch('agents.planner.openai.ChatCompletion.create')
    def test_generic_spending_query(self, mock_openai):
        """Test that generic spending queries don't trigger merchant search"""
        mock_openai.return_value = Mock(
            choices=[Mock(
                message=Mock(
                    content='{"intent": "spend_by_time", "entities": {"date_range": {"default": "30d"}}, "invariants": ["exclude-pending", "spend-amount-lt-0"], "confidence": 0.9}'
                )
            )]
        )

        question = "how much did i spend last month"
        plan = plan_with_4o(question)

        self.assertEqual(plan.intent, "spend_by_time")
        self.assertEqual(len(plan.entities.merchants), 0)
        self.assertNotIn("must-filter-merchant", plan.invariants)


class TestMerchantResolver(unittest.TestCase):
    """Test merchant resolution"""

    def test_resolve_exact_match(self):
        """Test exact merchant name matching"""
        # Mock database connection
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value.__enter__.return_value = mock_cursor

        # Mock ILIKE query result
        mock_cursor.fetchall.return_value = [("trader joe's",)]

        user_id = "test-user-123"
        candidates = ["trader joes"]

        # Call resolver (will use ILIKE fallback)
        resolved = resolve_merchants(mock_conn, user_id, candidates, k=3)

        # Should return canonical name
        self.assertEqual(resolved, ["trader joe's"])

    def test_resolve_misspelled_merchant(self):
        """Test fuzzy matching for misspelled merchants"""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value.__enter__.return_value = mock_cursor

        # First call fails (pg_trgm), second succeeds (ILIKE)
        mock_cursor.fetchall.side_effect = [
            [],  # pg_trgm returns nothing
            [("trader joe's",), ("whole foods market",)]  # ILIKE returns matches
        ]

        user_id = "test-user-123"
        candidates = ["trader joe", "whole food"]

        resolved = resolve_merchants(mock_conn, user_id, candidates, k=3)

        self.assertIn("trader joe's", resolved)
        self.assertIn("whole foods market", resolved)


class TestSearchBuilder(unittest.TestCase):
    """Test search query builder"""

    def test_compile_merchant_search(self):
        """Test compiling SQL for merchant search"""
        user_id = "test-user-123"
        merchants = ["trader joe's"]

        sql, params = compile_transaction_search(
            user_id=user_id,
            merchants=merchants,
            default_days=90,
            transaction_type="spending"
        )

        # Check SQL contains proper merchant filter
        self.assertIn("merchant_name", sql.lower())
        self.assertIn("name", sql.lower())
        self.assertIn("or", sql.lower())

        # Check required filters
        self.assertIn("pending = false", sql)
        self.assertIn("amount < 0", sql)
        self.assertIn("user_id = %(user_id)s", sql)

        # Check params
        self.assertEqual(params['user_id'], user_id)
        self.assertIn('merchant_0', params)
        self.assertEqual(params['merchant_0'], "%trader joe's%")

    def test_date_range_default(self):
        """Test default date range for merchant queries"""
        user_id = "test-user-123"
        merchants = ["amazon"]

        sql, params = compile_transaction_search(
            user_id=user_id,
            merchants=merchants,
            default_days=90
        )

        # Should have date filters
        self.assertIn("start_date", params)
        self.assertIn("end_date", params)
        self.assertIn("COALESCE(posted_datetime, date::timestamptz)", sql)


class TestInvariants(unittest.TestCase):
    """Test invariant checking"""

    def test_missing_merchant_filter(self):
        """Test detection of missing merchant filter"""
        sql = "SELECT * FROM transactions WHERE user_id = %(user_id)s AND pending = false"
        params = {"user_id": "test-user-123"}

        plan = PlannerPlan(
            intent="transaction_search",
            entities=Entities(merchants=["trader joes"]),
            invariants=["must-filter-merchant", "exclude-pending"]
        )

        with self.assertRaises(InvariantError) as context:
            assert_invariants_or_raise(sql, params, plan)

        self.assertIn("merchant filter", str(context.exception))

    def test_missing_pending_filter(self):
        """Test detection of missing pending filter"""
        sql = "SELECT * FROM transactions WHERE user_id = %(user_id)s"
        params = {"user_id": "test-user-123"}

        plan = PlannerPlan(
            intent="spend_by_time",
            invariants=["exclude-pending", "spend-amount-lt-0"]
        )

        with self.assertRaises(InvariantError) as context:
            assert_invariants_or_raise(sql, params, plan)

        self.assertIn("pending = false", str(context.exception))

    def test_passing_invariants(self):
        """Test SQL that passes all invariants"""
        sql = """
        SELECT * FROM transactions
        WHERE user_id = %(user_id)s
          AND pending = false
          AND amount < 0
          AND (LOWER(merchant_name) LIKE %(merchant_0)s OR LOWER(name) LIKE %(merchant_0)s)
          AND COALESCE(posted_datetime, date::timestamptz) >= %(start_date)s
        """
        params = {
            "user_id": "test-user-123",
            "merchant_0": "%trader joe%",
            "start_date": datetime.datetime.now()
        }

        plan = PlannerPlan(
            intent="transaction_search",
            entities=Entities(merchants=["trader joes"]),
            invariants=["must-filter-merchant", "exclude-pending", "spend-amount-lt-0"]
        )

        # Should not raise
        assert_invariants_or_raise(sql, params, plan)


class TestRouter(unittest.TestCase):
    """Test intent routing"""

    def test_merchant_routing(self):
        """Test merchant queries route to TRANSACTION_SEARCH"""
        test_cases = [
            "what have i been spending at trader joes",
            "spending at Starbucks",
            "purchases at amazon",
            "show me trader joe's transactions",
            "how much at whole foods"
        ]

        for question in test_cases:
            intent = classify_intent(question)
            self.assertEqual(
                intent, Intent.TRANSACTION_SEARCH,
                f"Failed for question: {question}"
            )

    def test_generic_spending_routing(self):
        """Test generic spending queries don't route to transaction search"""
        test_cases = [
            "how much did i spend last month",
            "show me my spending",
            "what are my expenses"
        ]

        for question in test_cases:
            intent = classify_intent(question)
            self.assertNotEqual(
                intent, Intent.TRANSACTION_SEARCH,
                f"Incorrectly routed to TRANSACTION_SEARCH: {question}"
            )


if __name__ == '__main__':
    unittest.main()