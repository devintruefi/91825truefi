"""
Test script to verify SQL Agent properly queries accounts table for balance questions
"""

import asyncio
import json
from agents.sql_agent import SQLAgent
from profile_pack.schema_card import TransactionSchemaCard

async def test_balance_queries():
    """Test various balance-related queries"""

    sql_agent = SQLAgent()
    schema_card = TransactionSchemaCard.generate()
    user_id = '136e2d19-e31d-4691-94cb-1729585a340e'

    test_queries = [
        "How much money do I have in all of my accounts?",
        "What is my total account balance?",
        "How much cash do I have?",
        "What is my net worth?",
        "Show me my account balances",
        "How much did I spend last month?",  # Should use transactions table
    ]

    print("=" * 80)
    print("SQL AGENT ACCOUNT QUERY TEST")
    print("=" * 80)

    for question in test_queries:
        print(f"\nQuestion: {question}")
        print("-" * 40)

        sql_request = {
            'kind': 'sql_request',
            'question': question,
            'schema_card': schema_card,
            'context': {'user_id': user_id},
            'constraints': {
                'max_rows': 1000,
                'exclude_pending': True,
                'prefer_monthly_bins': True
            }
        }

        try:
            response = await sql_agent.generate_query(sql_request)

            if 'error' in response:
                print(f"  ERROR: {response['error']}")
            else:
                sql = response.get('sql', '')
                table_used = 'accounts' if 'FROM accounts' in sql else 'transactions' if 'FROM transactions' in sql else 'unknown'

                print(f"  Table Used: {table_used}")
                print(f"  SQL: {sql[:200]}{'...' if len(sql) > 200 else ''}")
                print(f"  Justification: {response.get('justification', 'None')}")

                # Check if the right table was used
                if 'balance' in question.lower() or 'money' in question.lower() or 'cash' in question.lower() or 'net worth' in question.lower():
                    if table_used == 'accounts':
                        print("  ✓ CORRECT: Using accounts table for balance query")
                    else:
                        print("  ✗ INCORRECT: Should use accounts table for balance query")
                elif 'spend' in question.lower() or 'spent' in question.lower():
                    if table_used == 'transactions':
                        print("  ✓ CORRECT: Using transactions table for spending query")
                    else:
                        print("  ✗ INCORRECT: Should use transactions table for spending query")

        except Exception as e:
            print(f"  Exception: {e}")

    print("\n" + "=" * 80)
    print("TEST COMPLETE")
    print("=" * 80)

if __name__ == "__main__":
    asyncio.run(test_balance_queries())