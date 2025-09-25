#!/usr/bin/env python3
"""Test the markdown formatting fix"""

import re

def _fix_markdown_formatting(text: str) -> str:
    """Fix markdown formatting issues, especially around dollar amounts and special characters"""
    if not text:
        return text

    # First, ensure dollar signs are properly formatted for large numbers with commas
    # Match patterns like "15,000" that should be "$15,000" when in financial context
    # But be careful not to add $ to dates, percentages, or already-dollared amounts
    text = re.sub(r'(?<![$/\d])(\d{1,3}(?:,\d{3})+(?:\.\d{2})?)(?![\d%])', r'$\1', text)

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


# Test cases
test_cases = [
    # Original broken text from user
    ("69,375across15transactions", "$69,375 across $15 transactions"),
    ("4,200;2txns),TransfertoSavings(", "$4,200 (2 transactions), Transfer to Savings ("),
    ("spent 15,000 at Amazon", "spent $15,000 at Amazon"),
    ("total: 50,000", "total: $50,000"),
    # Edge cases
    ("already $15,000 here", "already $15,000 here"),  # Don't double dollar sign
    ("2024 items", "2024 items"),  # Don't add $ to years
    ("95% complete", "95% complete"),  # Don't add $ before percentages
    # Complex patterns
    ("Amazon($15,000;2txns),Target($4,200;3txns)", "Amazon ($15,000 (2 transactions), Target ($4,200 (3 transactions)"),
]

print("Testing markdown formatting fixes:\n")
for input_text, expected in test_cases:
    result = _fix_markdown_formatting(input_text)
    status = "✓" if result == expected else "✗"
    print(f"{status} Input:    '{input_text}'")
    print(f"  Output:   '{result}'")
    if result != expected:
        print(f"  Expected: '{expected}'")
    print()

# Test a full message
full_message = """Your spending breakdown:
69,375across15transactions
-Amazon:15,000(2txns)
-Target:4,200;3txns
-TransfertoSavings:50,000
-Utilities:175"""

print("Full message test:")
print("BEFORE:")
print(full_message)
print("\nAFTER:")
print(_fix_markdown_formatting(full_message))