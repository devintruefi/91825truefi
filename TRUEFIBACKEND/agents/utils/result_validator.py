"""
Result Validator - Intelligently validates query results against context
Detects anomalies and suggests corrections without hardcoding rules
"""
import logging
import json
from typing import Dict, List, Any, Optional
from decimal import Decimal

logger = logging.getLogger(__name__)

class ResultValidator:
    """
    Validates SQL query results against user context to detect issues.
    Uses intelligent heuristics rather than hard-coded rules.
    """
    
    def __init__(self, openai_client):
        self.client = openai_client
        
    async def validate_result(self,
                            query: str,
                            sql_result: Dict[str, Any],
                            user_context: Dict[str, Any],
                            semantic_interpretation: Optional[Dict[str, Any]] = None,
                            plan: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Validate query results using AI-powered analysis.
        Returns validation status and any issues found.
        Now plan-aware to detect data source mismatches.
        """
        
        # Quick checks first
        basic_validation = self._basic_validation(sql_result, user_context, plan)
        if not basic_validation['needs_deep_validation']:
            return basic_validation
        
        # AI-powered validation for complex cases
        from datetime import datetime
        current_date = datetime.now().strftime('%Y-%m-%d')
        
        system_prompt = f"""You are a financial data validation expert.
Your job is to determine if query results make sense given the user's context.

TODAY'S DATE: {current_date}

Analyze the query, results, and context to identify:
1. Logical inconsistencies (e.g., $0 balance when accounts exist)
2. Potential data quality issues
3. Mismatches between intent and results
4. Suggestions for better queries

Return JSON:
{{
    "validation_status": "valid|warning|invalid",
    "confidence": 0.0-1.0,
    "issues_found": [
        {{
            "type": "zero_result|inconsistency|mismatch|data_quality",
            "description": "what's wrong",
            "severity": "low|medium|high",
            "user_impact": "how this affects the user"
        }}
    ],
    "suggestions": [
        {{
            "issue": "what issue this addresses",
            "suggestion": "what to do instead",
            "explanation": "why this would help"
        }}
    ],
    "summary": "brief explanation for the user"
}}

Common patterns to check:
- Zero results when context shows data exists
- Totals that don't match sum of parts
- Missing data that should be included
- Time period mismatches
- Category/type filtering issues
"""

        # Prepare context for validation
        validation_context = self._prepare_validation_context(
            query, sql_result, user_context, semantic_interpretation
        )
        
        user_prompt = f"""Validate these query results:

Query: {query}
SQL Result: {json.dumps(sql_result.get('data', []), indent=2)[:1000]}
Result Metadata: Success={sql_result.get('success')}, Rows={len(sql_result.get('data', []))}

User Context Summary:
{validation_context}

Semantic Interpretation:
{json.dumps(semantic_interpretation, indent=2) if semantic_interpretation else 'Not provided'}

Determine if these results make sense given what the user asked for and what data they have."""

        try:
            response = await self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"},
                max_tokens=600,
                temperature=0.3
            )
            
            validation = json.loads(response.choices[0].message.content)
            logger.info(f"Validation result: {validation['validation_status']} - {validation.get('summary', '')}")
            
            return validation
            
        except Exception as e:
            logger.error(f"AI validation failed: {e}")
            return {
                "validation_status": "error",
                "confidence": 0,
                "issues_found": [{"type": "error", "description": str(e)}],
                "suggestions": [],
                "summary": "Validation error occurred"
            }
    
    def _basic_validation(self, sql_result: Dict[str, Any], user_context: Dict[str, Any], 
                         plan: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Perform basic validation checks that don't need AI.
        Now checks if plan's data sources were actually used.
        """
        validation = {
            "validation_status": "valid",
            "confidence": 1.0,
            "issues_found": [],
            "suggestions": [],
            "needs_deep_validation": False,
            "regeneration_hint": None
        }
        
        # Check if query failed
        if not sql_result.get('success'):
            validation['validation_status'] = 'invalid'
            validation['issues_found'].append({
                "type": "query_error",
                "description": sql_result.get('error_message', 'Query failed'),
                "severity": "high"
            })
            return validation
        
        data = sql_result.get('data', [])
        
        # Check for suspicious zero results
        if self._is_zero_result(data):
            # Check if user has any data at all
            if self._user_has_financial_data(user_context):
                validation['needs_deep_validation'] = True
                validation['validation_status'] = 'warning'
                validation['confidence'] = 0.7
                validation['issues_found'].append({
                    "type": "zero_result",
                    "description": "Query returned zero/empty results but user has financial data",
                    "severity": "medium"
                })
        
        # Plan-aware validation: check if required data sources were used
        if plan:
            required_sources = plan.get('data_sources', [])
            sql_query = sql_result.get('sql_query', '').lower()
            
            # Check for budget mismatch
            if 'budgets' in required_sources and 'budgets' not in sql_query:
                validation['validation_status'] = 'warning'
                validation['issues_found'].append({
                    "type": "data_source_mismatch",
                    "description": "Plan required budgets table but SQL didn't use it",
                    "severity": "high"
                })
                validation['regeneration_hint'] = "Include budgets table with active budget for the target month, join budget_categories if present, and map transaction categories appropriately"
            
            # Check for missing pending exclusion
            if 'transactions' in required_sources and plan.get('intent') in ['aggregate', 'rank', 'compare']:
                if 'pending' not in sql_query:
                    validation['validation_status'] = 'warning'
                    validation['issues_found'].append({
                        "type": "missing_filter",
                        "description": "Spending calculations should exclude pending transactions",
                        "severity": "medium"
                    })
                    if not validation.get('regeneration_hint'):
                        validation['regeneration_hint'] = "Add 'AND pending = false' to exclude pending transactions from spending calculations"
        
        # Check for extremely large results that might indicate missing filters
        elif len(data) > 500:
            validation['validation_status'] = 'warning'
            validation['issues_found'].append({
                "type": "large_result_set",
                "description": f"Query returned {len(data)} rows - might be missing filters",
                "severity": "low"
            })
            validation['suggestions'].append({
                "issue": "Large result set",
                "suggestion": "Consider adding time period or category filters",
                "explanation": "This will make results more manageable and relevant"
            })
        
        return validation
    
    def _is_zero_result(self, data: List[Dict]) -> bool:
        """Check if result is effectively zero/empty."""
        if not data:
            return True
            
        if len(data) == 1:
            row = data[0]
            # Check common aggregate columns
            zero_indicators = ['total', 'sum', 'balance', 'amount', 'count', 'total_balance']
            for key in row.keys():
                if any(indicator in key.lower() for indicator in zero_indicators):
                    value = row[key]
                    if value == 0 or value == 0.0 or value == Decimal('0') or value is None:
                        return True
        
        return False
    
    def _user_has_financial_data(self, context: Dict[str, Any]) -> bool:
        """Check if user has any financial data in their context."""
        # Check for accounts
        if context.get('account_details'):
            return True
        
        # Check for transactions (via categories or merchants)
        if context.get('top_categories') or context.get('top_merchants'):
            return True
            
        # Check for assets/liabilities
        if context.get('manual_assets') or context.get('manual_liabilities'):
            return True
            
        # Check financial summary
        summary = context.get('financial_summary', {})
        if summary.get('net_worth', 0) != 0 or summary.get('total_assets', 0) != 0:
            return True
            
        return False
    
    def _prepare_validation_context(self, 
                                  query: str,
                                  sql_result: Dict[str, Any],
                                  user_context: Dict[str, Any],
                                  semantic_interpretation: Optional[Dict[str, Any]]) -> str:
        """Prepare a concise context string for validation."""
        parts = []
        
        # Account summary
        accounts = user_context.get('account_details', [])
        if accounts:
            total_balance = sum(acc.get('balance', 0) for acc in accounts)
            account_types = set(acc.get('type', 'unknown') for acc in accounts)
            parts.append(f"User has {len(accounts)} accounts ({', '.join(account_types)}) totaling ${total_balance:,.2f}")
        else:
            parts.append("User has no accounts")
        
        # Transaction activity
        categories = user_context.get('top_categories', [])
        if categories:
            parts.append(f"User has transactions in {len(categories)} categories")
        
        # Assets/Liabilities
        assets = user_context.get('manual_assets', [])
        liabilities = user_context.get('manual_liabilities', [])
        if assets or liabilities:
            parts.append(f"User has {len(assets)} assets and {len(liabilities)} liabilities")
        
        # Goals and budgets
        goals = user_context.get('goals', [])
        budgets = user_context.get('budgets', [])
        if goals or budgets:
            parts.append(f"User has {len(goals)} goals and {len(budgets)} budgets")
        
        # Add query intent if available
        if semantic_interpretation:
            intent = semantic_interpretation.get('semantic_intent', {})
            if intent.get('primary_goal'):
                parts.append(f"Query intent: {intent['primary_goal']}")
        
        return "\n".join(parts)
    
    async def suggest_query_improvements(self,
                                       query: str,
                                       validation_result: Dict[str, Any],
                                       user_context: Dict[str, Any]) -> List[Dict[str, str]]:
        """
        Suggest improved queries based on validation results.
        """
        if validation_result['validation_status'] == 'valid':
            return []
        
        improvements = []
        
        for issue in validation_result.get('issues_found', []):
            if issue['type'] == 'zero_result':
                # Suggest broader queries
                improvements.append({
                    'original_issue': 'Query returned no results',
                    'improved_query': self._suggest_broader_query(query, user_context),
                    'explanation': 'Broadened search criteria to match your available data'
                })
            elif issue['type'] == 'mismatch':
                # Suggest more specific queries
                improvements.append({
                    'original_issue': 'Results don\'t match query intent',
                    'improved_query': self._suggest_specific_query(query, user_context),
                    'explanation': 'Made query more specific to your data structure'
                })
        
        return improvements
    
    def _suggest_broader_query(self, query: str, context: Dict[str, Any]) -> str:
        """Suggest a broader version of the query."""
        # This is a simplified example - in practice, use LLM for better suggestions
        if 'checking' in query.lower() or 'savings' in query.lower():
            return query.replace('checking and savings', 'all active accounts')
        return query
    
    def _suggest_specific_query(self, query: str, context: Dict[str, Any]) -> str:
        """Suggest a more specific version of the query."""
        # This is a simplified example - in practice, use LLM for better suggestions
        return query + " in the last 3 months"