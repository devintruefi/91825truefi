"""Unit tests for markdown sanitization functions"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from main import sanitize_markdown
from agents.gpt5_unified_agent import GPT5UnifiedAgent

class TestMarkdownSanitization:
    """Test the sanitize_markdown function from main.py"""

    def test_zero_width_removal(self):
        """Test that zero-width characters are removed"""
        text = "Hello\u200bWorld\u200c!\u200d\u2060\ufeff"
        result = sanitize_markdown(text)
        assert result == "HelloWorld!"
        assert '\u200b' not in result
        assert '\u200c' not in result
        assert '\u200d' not in result
        assert '\u2060' not in result
        assert '\ufeff' not in result

    def test_soft_linebreak_fix(self):
        """Test fixing soft line breaks in numbers"""
        # Numbers broken across lines
        text1 = "69,\n375.00"
        result1 = sanitize_markdown(text1)
        assert result1 == "69,375.00"

        # Words broken across lines
        text2 = "across\n15\ntransactions"
        result2 = sanitize_markdown(text2)
        assert result2 == "across 15 transactions"

    def test_letters_digits_spacing(self):
        """Test adding spaces between letters and digits"""
        # Letters → digits
        text1 = "avg4,625"
        result1 = sanitize_markdown(text1)
        assert result1 == "avg 4,625"

        # Digits → letters
        text2 = "Form1099"
        result2 = sanitize_markdown(text2)
        assert result2 == "Form 1099"

        # Both directions
        text3 = "spent69,375across15transactions"
        result3 = sanitize_markdown(text3)
        assert "spent 69,375 across 15 transactions" in result3

    def test_spaced_thousands(self):
        """Test fixing spaced thousands separators"""
        text1 = "4, 000.00"
        result1 = sanitize_markdown(text1)
        assert result1 == "4,000.00"

        text2 = "Total: 15, 250"
        result2 = sanitize_markdown(text2)
        assert result2 == "Total: 15,250"

    def test_idempotent_sanitization(self):
        """Test that sanitization is idempotent (running twice gives same result)"""
        text = "69,\n375across15transactions with 4, 000"
        result1 = sanitize_markdown(text)
        result2 = sanitize_markdown(result1)
        assert result1 == result2

    def test_preserve_paragraphs(self):
        """Test that paragraph breaks are preserved"""
        text = "Paragraph 1\n\nParagraph 2\n\n\n\nParagraph 3"
        result = sanitize_markdown(text)
        assert result == "Paragraph 1\n\nParagraph 2\n\nParagraph 3"


class TestGPT5MarkdownFormatting:
    """Test the _fix_markdown_formatting method from GPT-5 agent"""

    def setup_method(self):
        """Set up test agent instance"""
        self.agent = GPT5UnifiedAgent()

    def test_dollar_sign_formatting(self):
        """Test that dollar signs are added to large numbers"""
        text = "spent 15,000 at Amazon"
        result = self.agent._fix_markdown_formatting(text)
        assert result == "spent $15,000 at Amazon"

    def test_escape_italics(self):
        """Test escaping underscores and asterisks in words"""
        text1 = "WELLS_FARGO"
        result1 = self.agent._fix_markdown_formatting(text1)
        assert result1 == "WELLS\\_FARGO"

        text2 = "internal*company*name"
        result2 = self.agent._fix_markdown_formatting(text2)
        assert result2 == "internal\\*company\\*name"

    def test_transaction_patterns(self):
        """Test fixing transaction shorthand"""
        text1 = "$4,200;2txns"
        result1 = self.agent._fix_markdown_formatting(text1)
        assert result1 == "$4,200 (2 transactions)"

        text2 = "$15,000,3txns"
        result2 = self.agent._fix_markdown_formatting(text2)
        assert result2 == "$15,000 (3 transactions)"

    def test_camelcase_spacing(self):
        """Test adding spaces in camelCase"""
        text = "TransfertoSavings"
        result = self.agent._fix_markdown_formatting(text)
        assert "Transfer to Savings" in result

    def test_no_double_dollars(self):
        """Test that existing dollar signs aren't doubled"""
        text = "already $15,000 here"
        result = self.agent._fix_markdown_formatting(text)
        assert result == "already $15,000 here"
        assert "$$" not in result

    def test_complex_formatting(self):
        """Test a complex example with multiple issues"""
        text = "69,375across15transactions at WELLS_FARGO,avg4,625 each"
        result = self.agent._fix_markdown_formatting(text)

        # Check various fixes
        assert "$69,375" in result
        assert "across 15" in result
        assert "WELLS\\_FARGO" in result
        assert "avg 4,625" in result

    def test_preserve_dates_and_percentages(self):
        """Test that dates and percentages aren't incorrectly formatted"""
        text = "In 2024, growth was 95%"
        result = self.agent._fix_markdown_formatting(text)
        assert "2024" in result  # Should not add $ to year
        assert "95%" in result   # Should not add $ before percentage
        assert "$2024" not in result
        assert "$95" not in result


if __name__ == "__main__":
    pytest.main([__file__, "-v"])