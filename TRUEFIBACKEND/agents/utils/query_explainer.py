"""
Query Explainer - Generates clear explanations of what queries did and why
Helps users understand adaptations and results
"""
import logging
import json
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)

class QueryExplainer:
    """
    Explains query processing, adaptations, and results in user-friendly language.
    This transparency builds trust and helps users understand the system.
    """
    
    def __init__(self, openai_client):
        self.client = openai_client
        
    async def generate_explanation(self,
                                 original_query: str,
                                 sql_executed: str,
                                 results: Dict[str, Any],
                                 adaptations: Optional[Dict[str, Any]] = None,
                                 validation: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Generate a comprehensive explanation of the query processing.
        """
        
        system_prompt = """You are a friendly financial assistant explaining query results.
Your job is to create clear, concise explanations that help users understand:
1. What their query was interpreted as
2. What data was searched
3. Any adaptations made and why
4. What the results mean

Return JSON with:
{
    "summary": "1-2 sentence summary of what happened",
    "interpretation": "what we understood you wanted",
    "data_searched": "which accounts/transactions/time periods were included",
    "adaptations": [
        {
            "what": "what was changed",
            "why": "reason for the change",
            "impact": "how it affected results"
        }
    ],
    "results_explanation": "what the numbers mean in context",
    "suggestions": ["helpful follow-up queries or actions"],
    "confidence_level": "high|medium|low"
}

Guidelines:
- Use simple, non-technical language
- Be transparent about any limitations or adaptations
- Focus on what matters to the user
- Suggest next steps when helpful
"""

        # Build context for explanation
        explanation_context = self._build_explanation_context(
            original_query, sql_executed, results, adaptations, validation
        )
        
        user_prompt = f"""Generate an explanation for this query:

Original Query: {original_query}
SQL Executed: {sql_executed[:500]}...
Results Summary: {self._summarize_results(results)}
Adaptations Made: {json.dumps(adaptations, indent=2) if adaptations else 'None'}
Validation Status: {validation.get('validation_status', 'Not validated') if validation else 'Not validated'}

Create a clear, helpful explanation for the user."""

        try:
            response = await self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"},
                max_tokens=600,
                temperature=0.4
            )
            
            explanation = json.loads(response.choices[0].message.content)
            return explanation
            
        except Exception as e:
            logger.error(f"Failed to generate explanation: {e}")
            return self._fallback_explanation(original_query, results)
    
    def _build_explanation_context(self,
                                 original_query: str,
                                 sql_executed: str,
                                 results: Dict[str, Any],
                                 adaptations: Optional[Dict[str, Any]],
                                 validation: Optional[Dict[str, Any]]) -> str:
        """Build context for generating explanations."""
        parts = []
        
        # Query info
        parts.append(f"Query: {original_query}")
        
        # Results info
        if results.get('success'):
            data = results.get('data', [])
            parts.append(f"Results: {len(data)} rows returned")
            
            # Sample of data
            if data and len(data) > 0:
                if len(data) == 1:
                    parts.append(f"Data: {json.dumps(data[0], default=str)}")
                else:
                    parts.append(f"Sample: {json.dumps(data[0], default=str)}")
        else:
            parts.append(f"Error: {results.get('error_message', 'Query failed')}")
        
        # Adaptations
        if adaptations and adaptations.get('changes_made'):
            parts.append(f"Adapted: {', '.join(adaptations['changes_made'])}")
        
        # Validation issues
        if validation and validation.get('issues_found'):
            issues = [issue['description'] for issue in validation['issues_found']]
            parts.append(f"Issues: {', '.join(issues)}")
        
        return "\n".join(parts)
    
    def _summarize_results(self, results: Dict[str, Any]) -> str:
        """Create a brief summary of results."""
        if not results.get('success'):
            return f"Query failed: {results.get('error_message', 'Unknown error')}"
        
        data = results.get('data', [])
        if not data:
            return "No data returned"
        
        if len(data) == 1:
            # Single row - likely an aggregate
            row = data[0]
            summaries = []
            for key, value in row.items():
                if value is not None:
                    if isinstance(value, (int, float)):
                        summaries.append(f"{key}: ${value:,.2f}" if 'balance' in key or 'amount' in key else f"{key}: {value}")
                    else:
                        summaries.append(f"{key}: {value}")
            return ", ".join(summaries[:3])  # First 3 values
        else:
            return f"{len(data)} records found"
    
    def _fallback_explanation(self, query: str, results: Dict[str, Any]) -> Dict[str, Any]:
        """Provide a basic explanation when AI fails."""
        return {
            "summary": f"Processed your query: '{query}'",
            "interpretation": query,
            "data_searched": "Your financial data",
            "adaptations": [],
            "results_explanation": self._summarize_results(results),
            "suggestions": [],
            "confidence_level": "low"
        }
    
    def format_explanation_for_response(self, explanation: Dict[str, Any], include_technical: bool = False) -> str:
        """
        Format the explanation into natural language for the final response.
        """
        parts = []
        
        # Summary
        if explanation.get('summary'):
            parts.append(explanation['summary'])
        
        # Adaptations (if any)
        if explanation.get('adaptations'):
            adaptation_texts = []
            for adapt in explanation['adaptations']:
                adaptation_texts.append(f"• {adapt['what']} because {adapt['why']}")
            
            if adaptation_texts:
                parts.append("\n**What I did differently:**")
                parts.extend(adaptation_texts)
        
        # Results explanation
        if explanation.get('results_explanation'):
            parts.append(f"\n**What this means:** {explanation['results_explanation']}")
        
        # Suggestions
        if explanation.get('suggestions'):
            parts.append("\n**You might also want to know:**")
            for suggestion in explanation['suggestions']:
                parts.append(f"• {suggestion}")
        
        # Technical details (if requested)
        if include_technical:
            parts.append(f"\n**Technical details:**")
            parts.append(f"• Data searched: {explanation.get('data_searched', 'Not specified')}")
            parts.append(f"• Confidence: {explanation.get('confidence_level', 'Not specified')}")
        
        return "\n".join(parts)
    
    async def explain_zero_results(self, query: str, user_context: Dict[str, Any]) -> str:
        """
        Special explanation for when queries return zero/no results.
        """
        system_prompt = """Generate a helpful explanation for why a query returned no results.
Be empathetic and suggest alternatives. Keep it brief and actionable."""

        context_summary = self._summarize_user_context(user_context)
        
        user_prompt = f"""Query: {query}
Result: No data / $0.00 returned

User's actual data:
{context_summary}

Explain why this might have happened and what they can try instead."""

        try:
            response = await self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=200,
                temperature=0.4
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Failed to explain zero results: {e}")
            return "The query returned no results. This might be because the specific accounts or data you're looking for aren't in your profile. Try searching for 'all accounts' or checking what account types you have."
    
    def _summarize_user_context(self, context: Dict[str, Any]) -> str:
        """Summarize user context for explanations."""
        parts = []
        
        accounts = context.get('account_details', [])
        if accounts:
            account_types = set(acc.get('type', 'unknown') for acc in accounts)
            parts.append(f"Account types: {', '.join(account_types)}")
        
        categories = context.get('top_categories', [])
        if categories:
            parts.append(f"Has transactions in {len(categories)} categories")
        
        return "\n".join(parts) if parts else "Limited data available"
    
    async def explain_for_user(self,
                              query: str,
                              response: str,
                              metadata: Dict[str, Any],
                              user_name: str = "User") -> Dict[str, Any]:
        """
        Generate a user-safe explanation of what happened, with PII redaction.
        This is the public-facing mirror that can be safely shown to users.
        
        Args:
            query: Original user query
            response: Final response given to user
            metadata: Processing metadata (routing, validation, etc.)
            user_name: User's name for personalization
            
        Returns:
            User-safe explanation with PII redacted
        """
        
        system_prompt = f"""You are explaining to {user_name} how their financial question was processed.
Create a transparent but user-friendly explanation that builds trust.

IMPORTANT RULES:
1. Never mention internal system details (agent names, database queries, routing decisions)
2. Never expose technical metadata or validation scores
3. Focus on what matters to the user: accuracy, completeness, assumptions
4. Use warm, encouraging language
5. Redact any PII or sensitive technical details

Structure your explanation to help the user understand:
- How their question was interpreted
- What data was analyzed
- Any assumptions made
- Why certain recommendations were given
- What they might want to explore next

Return a JSON object with these fields:
{{
    "interpretation": "How we understood your question",
    "data_analyzed": "What financial information was reviewed", 
    "key_assumptions": ["List of assumptions made in the analysis"],
    "confidence_level": "High/Medium/Low based on data completeness",
    "why_this_answer": "Brief explanation of the reasoning approach",
    "next_steps": ["Suggested follow-up questions or actions"],
    "limitations": ["Any important caveats or limitations to note"]
}}

Be helpful and educational, but never overwhelm with technical details."""

        # Extract relevant metadata in user-friendly terms
        routing_info = metadata.get('routing', {})
        validation_info = metadata.get('response_validation', {})
        
        # Build context for the explanation
        context_parts = []
        context_parts.append(f"Original question: {query}")
        context_parts.append(f"Response provided: {response[:500]}...")  # Truncate for context
        
        # Add routing information in user-friendly terms
        if routing_info.get('used_sql'):
            context_parts.append("Data source: Your transaction history and account information")
        if routing_info.get('used_modeling'):
            context_parts.append("Analysis type: Financial modeling and calculations")
        
        # Add quality information
        if validation_info.get('quality_score'):
            quality = validation_info['quality_score']
            if quality > 0.8:
                context_parts.append("Response quality: High confidence")
            elif quality > 0.6:
                context_parts.append("Response quality: Medium confidence")
            else:
                context_parts.append("Response quality: Lower confidence due to data limitations")
        
        # Add execution time if reasonable
        execution_time = metadata.get('execution_time', 0)
        if execution_time > 0:
            context_parts.append(f"Processing time: {execution_time:.1f} seconds")
        
        context = "\\n".join(context_parts)
        
        user_prompt = f"""Please explain this financial analysis interaction:

{context}

Focus on being helpful and transparent while keeping the explanation accessible."""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        try:
            response_obj = await self.client.chat.completions.create(
                model="gpt-4o",
                messages=messages,
                response_format={"type": "json_object"},
                max_tokens=1000,
                temperature=0.3
            )
            
            explanation = json.loads(response_obj.choices[0].message.content)
            
            # Add metadata about the explanation generation
            explanation['generated_at'] = logger.info("Generated user explanation")
            explanation['explanation_type'] = 'user_safe_mirror'
            explanation['contains_pii'] = False  # Should be redacted
            
            return explanation
            
        except Exception as e:
            logger.error(f"Error generating user explanation: {e}")
            # Return a safe fallback explanation
            return {
                "interpretation": "We analyzed your financial question using your account and transaction data.",
                "data_analyzed": "Your recent financial activity and account balances",
                "key_assumptions": ["Standard financial calculation methods were used"],
                "confidence_level": "Medium",
                "why_this_answer": "Our analysis followed established financial planning principles.",
                "next_steps": ["Consider reviewing the specific numbers mentioned", "Ask follow-up questions if anything needs clarification"],
                "limitations": ["Results depend on the completeness and accuracy of your financial data"],
                "generated_at": "Error fallback",
                "explanation_type": "user_safe_mirror",
                "contains_pii": False,
                "error": "Explanation generation failed, using fallback"
            }
    
    def redact_pii_from_explanation(self, explanation: Dict[str, Any]) -> Dict[str, Any]:
        """
        Additional PII redaction pass for explanations.
        
        Args:
            explanation: Explanation dictionary
            
        Returns:
            PII-redacted explanation
        """
        import re
        
        # PII patterns to redact
        pii_patterns = [
            (r'\b\d{3}-\d{2}-\d{4}\b', '[SSN]'),  # SSN
            (r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b', '[CARD]'),  # Credit card
            (r'\b\d{9}\b', '[ACCOUNT]'),  # Account numbers
            (r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', '[EMAIL]'),  # Email
            (r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b', '[PHONE]'),  # Phone numbers
            (r'\b\d{1,5}\s+\w+\s+(Street|St|Avenue|Ave|Road|Rd|Lane|Ln|Drive|Dr|Court|Ct|Circle|Cir|Boulevard|Blvd)\b', '[ADDRESS]'),  # Addresses
        ]
        
        redacted_explanation = explanation.copy()
        
        # Redact PII from string fields
        for key, value in redacted_explanation.items():
            if isinstance(value, str):
                for pattern, replacement in pii_patterns:
                    value = re.sub(pattern, replacement, value, flags=re.IGNORECASE)
                redacted_explanation[key] = value
            elif isinstance(value, list):
                redacted_list = []
                for item in value:
                    if isinstance(item, str):
                        for pattern, replacement in pii_patterns:
                            item = re.sub(pattern, replacement, item, flags=re.IGNORECASE)
                    redacted_list.append(item)
                redacted_explanation[key] = redacted_list
        
        redacted_explanation['pii_redacted'] = True
        return redacted_explanation