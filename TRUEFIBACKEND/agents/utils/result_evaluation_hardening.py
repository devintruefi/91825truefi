"""
Result Evaluation Hardening - Deterministic checks before LLM scoring
Includes forbidden token detection and data quality validation
"""
import logging
import re
from typing import Dict, Any, List, Optional, Tuple
from decimal import Decimal
from datetime import datetime

logger = logging.getLogger(__name__)

class ResultEvaluationHardening:
    """
    Hardened result evaluation with deterministic checks before LLM scoring.
    """
    
    # Forbidden tokens that should never appear in financial responses
    FORBIDDEN_TOKENS = [
        r'\bDevin\b',
        r'Devin\s+Patel',
        r'\bNYC\b',
        r'New\s+York\s+City',
        r'hardcoded.*\w+',
        r'specific.*user',
        r'test.*user',
        r'dummy.*data',
        r'placeholder.*\w+',
        # Financial data patterns that suggest hardcoded values
        r'exactly.*\$12[,.]?345',  # Suspiciously exact test amounts
        r'test.*account.*\d+',
        r'sample.*\w+',
        # Inappropriate content
        r'password|secret|token|api[_-]?key',
        r'localhost|127\.0\.0\.1',
        r'dev.*environment|staging.*environment'
    ]
    
    # Data quality patterns to check
    DATA_QUALITY_PATTERNS = {
        'suspicious_zeros': r'\$0\.00\s+\$0\.00\s+\$0\.00',  # Multiple consecutive zeros
        'unrealistic_precision': r'\$\d+\.\d{5,}',  # More than 2 decimal places
        'currency_formatting': r'\$[\d,]+\.\d{2}',  # Proper currency format
        'negative_balances': r'-\$|\$-',  # Negative amounts
        'percentage_format': r'\d+\.\d+%',  # Percentage format
    }
    
    def __init__(self):
        self.validation_stats = {
            'total_validations': 0,
            'forbidden_token_violations': 0,
            'data_quality_issues': 0,
            'passed_validations': 0
        }
    
    def validate_response_quality(
        self, 
        response: str, 
        context: Dict[str, Any],
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Comprehensive response quality validation.
        
        Args:
            response: The response text to validate
            context: Context about the query and user
            metadata: Additional metadata about the response
            
        Returns:
            Validation result with issues and recommendations
        """
        self.validation_stats['total_validations'] += 1
        
        validation_result = {
            'valid': True,
            'issues': [],
            'warnings': [],
            'score': 1.0,
            'forbidden_tokens_found': [],
            'data_quality_issues': [],
            'recommendations': []
        }
        
        # 1. Forbidden token detection
        forbidden_issues = self._check_forbidden_tokens(response)
        if forbidden_issues:
            validation_result['valid'] = False
            validation_result['forbidden_tokens_found'] = forbidden_issues
            validation_result['issues'].extend([f"Forbidden token detected: {token}" for token in forbidden_issues])
            self.validation_stats['forbidden_token_violations'] += 1
        
        # 2. Data quality checks
        quality_issues = self._check_data_quality(response)
        if quality_issues:
            validation_result['data_quality_issues'] = quality_issues
            validation_result['warnings'].extend(quality_issues)
            if len(quality_issues) > 3:  # Too many quality issues
                validation_result['valid'] = False
                validation_result['issues'].append("Excessive data quality issues detected")
                self.validation_stats['data_quality_issues'] += 1
        
        # 3. Response completeness check
        completeness_issues = self._check_response_completeness(response, context)
        if completeness_issues:
            validation_result['warnings'].extend(completeness_issues)
        
        # 4. Financial calculation validation
        calc_issues = self._validate_financial_calculations(response)
        if calc_issues:
            validation_result['warnings'].extend(calc_issues)
        
        # 5. Provenance footer validation
        provenance_issues = self._validate_provenance_footer(response)
        if provenance_issues:
            validation_result['warnings'].extend(provenance_issues)
        
        # Calculate final score
        validation_result['score'] = self._calculate_quality_score(validation_result)
        
        if validation_result['valid']:
            self.validation_stats['passed_validations'] += 1
        
        # Add recommendations based on issues
        validation_result['recommendations'] = self._generate_recommendations(validation_result)
        
        return validation_result
    
    def _check_forbidden_tokens(self, response: str) -> List[str]:
        """
        Check for forbidden tokens in the response.
        
        Returns:
            List of forbidden tokens found
        """
        found_tokens = []
        
        for pattern in self.FORBIDDEN_TOKENS:
            matches = re.findall(pattern, response, re.IGNORECASE)
            if matches:
                found_tokens.extend(matches)
        
        return found_tokens
    
    def _check_data_quality(self, response: str) -> List[str]:
        """
        Check for data quality issues in the response.
        
        Returns:
            List of data quality issues found
        """
        issues = []
        
        # Check for suspicious patterns
        if re.search(self.DATA_QUALITY_PATTERNS['suspicious_zeros'], response):
            issues.append("Multiple consecutive zero values detected")
        
        if re.search(self.DATA_QUALITY_PATTERNS['unrealistic_precision'], response):
            issues.append("Unrealistic decimal precision in currency amounts")
        
        # Check for missing currency formatting
        currency_matches = len(re.findall(r'\$[\d,]+(?:\.\d{2})?', response))
        number_matches = len(re.findall(r'\b\d{4,}\b', response))
        if number_matches > currency_matches * 2:
            issues.append("Numbers without proper currency formatting")
        
        # Check for negative amounts without proper context
        if re.search(self.DATA_QUALITY_PATTERNS['negative_balances'], response):
            if 'debt' not in response.lower() and 'owe' not in response.lower():
                issues.append("Negative amounts without debt context")
        
        return issues
    
    def _check_response_completeness(self, response: str, context: Dict[str, Any]) -> List[str]:
        """
        Check if the response adequately addresses the query context.
        
        Returns:
            List of completeness issues
        """
        issues = []
        
        # Check for minimum response length
        if len(response.strip()) < 100:
            issues.append("Response too short for financial analysis")
        
        # Check for calculation explanations
        if any(keyword in response.lower() for keyword in ['calculate', 'analysis', 'afford']):
            if not any(math_word in response.lower() for math_word in ['=', 'total', 'sum', 'percent', '%']):
                issues.append("Calculation requested but no mathematical details provided")
        
        # Check for recommendations if advisory query
        if any(keyword in context.get('query', '').lower() for keyword in ['should', 'recommend', 'advice']):
            if not any(rec_word in response.lower() for rec_word in ['recommend', 'suggest', 'should', 'consider']):
                issues.append("Advisory query but no clear recommendations provided")
        
        return issues
    
    def _validate_financial_calculations(self, response: str) -> List[str]:
        """
        Validate financial calculations in the response.
        
        Returns:
            List of calculation issues
        """
        issues = []
        
        # Check for DTI calculations
        dti_mentions = re.findall(r'(\d+(?:\.\d+)?)\s*%\s*DTI', response, re.IGNORECASE)
        for dti in dti_mentions:
            dti_value = float(dti)
            if dti_value > 100:
                issues.append(f"DTI value {dti_value}% exceeds 100%")
            elif dti_value > 80:
                issues.append(f"DTI value {dti_value}% seems unusually high")
        
        # Check for percentage calculations
        percentages = re.findall(r'(\d+(?:\.\d+)?)\s*%', response)
        for pct in percentages:
            pct_value = float(pct)
            if pct_value > 100 and 'increase' not in response.lower():
                issues.append(f"Percentage {pct_value}% exceeds 100% without context")
        
        # Check for interest rate reasonableness
        rate_mentions = re.findall(r'(\d+(?:\.\d+)?)\s*%.*(?:rate|APR|interest)', response, re.IGNORECASE)
        for rate in rate_mentions:
            rate_value = float(rate)
            if rate_value > 50:
                issues.append(f"Interest rate {rate_value}% seems unusually high")
            elif rate_value < 0.1:
                issues.append(f"Interest rate {rate_value}% seems unusually low")
        
        return issues
    
    def _validate_provenance_footer(self, response: str) -> List[str]:
        """
        Validate the provenance footer if present.
        
        Returns:
            List of provenance issues
        """
        issues = []
        
        # Check for provenance footer presence in financial responses
        has_calculation = any(word in response.lower() for word in ['calculate', 'analysis', 'afford', '$'])
        has_provenance = 'PROVENANCE' in response or 'assumptions' in response.lower()
        
        if has_calculation and not has_provenance:
            issues.append("Financial calculation without provenance tracking")
        
        # Validate provenance footer structure if present
        if 'PROVENANCE_FOOTER_V2' in response:
            required_fields = ['assumptions', 'data_gaps', 'sources_used', 'completeness_score', 'verdict']
            for field in required_fields:
                if field not in response:
                    issues.append(f"Missing required provenance field: {field}")
        
        return issues
    
    def _calculate_quality_score(self, validation_result: Dict[str, Any]) -> float:
        """
        Calculate overall quality score based on validation results.
        
        Returns:
            Quality score between 0.0 and 1.0
        """
        base_score = 1.0
        
        # Major deductions for critical issues
        if validation_result['forbidden_tokens_found']:
            base_score -= 0.5  # Forbidden tokens are serious
        
        if validation_result['issues']:
            base_score -= 0.2 * len(validation_result['issues'])
        
        # Minor deductions for warnings
        if validation_result['warnings']:
            base_score -= 0.05 * len(validation_result['warnings'])
        
        # Minimum score
        return max(0.0, base_score)
    
    def _generate_recommendations(self, validation_result: Dict[str, Any]) -> List[str]:
        """
        Generate recommendations based on validation issues.
        
        Returns:
            List of recommendations for improvement
        """
        recommendations = []
        
        if validation_result['forbidden_tokens_found']:
            recommendations.append("Remove all hardcoded references and user-specific data")
        
        if validation_result['data_quality_issues']:
            recommendations.append("Improve data formatting and validation")
        
        if 'Financial calculation without provenance tracking' in validation_result['warnings']:
            recommendations.append("Add provenance footer to all financial calculations")
        
        if any('too short' in issue for issue in validation_result['warnings']):
            recommendations.append("Provide more detailed analysis and explanations")
        
        if validation_result['score'] < 0.7:
            recommendations.append("Review response quality before presenting to user")
        
        return recommendations
    
    def pre_llm_validation(
        self, 
        query: str, 
        data: Dict[str, Any], 
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Perform deterministic validation before LLM processing.
        
        Args:
            query: User query
            data: Financial data to be processed
            context: Additional context
            
        Returns:
            Pre-validation results
        """
        validation = {
            'can_proceed': True,
            'issues': [],
            'data_quality_score': 1.0,
            'recommendations': []
        }
        
        # Check for empty or invalid data
        if not data:
            validation['can_proceed'] = False
            validation['issues'].append("No financial data available for analysis")
            return validation
        
        # Check for data completeness
        critical_fields = ['user_id']
        for field in critical_fields:
            if field not in context:
                validation['issues'].append(f"Missing critical field: {field}")
        
        # Check query for forbidden patterns
        forbidden_in_query = self._check_forbidden_tokens(query)
        if forbidden_in_query:
            validation['can_proceed'] = False
            validation['issues'].append(f"Forbidden tokens in query: {forbidden_in_query}")
        
        # Data sanity checks
        if isinstance(data, dict):
            numeric_fields = [k for k, v in data.items() if isinstance(v, (int, float, Decimal))]
            if numeric_fields:
                extreme_values = []
                for field in numeric_fields:
                    value = float(data[field])
                    if abs(value) > 1e9:  # Extremely large values
                        extreme_values.append(f"{field}: {value}")
                
                if extreme_values:
                    validation['issues'].append(f"Extreme values detected: {extreme_values}")
                    validation['data_quality_score'] *= 0.8
        
        return validation
    
    def get_validation_statistics(self) -> Dict[str, Any]:
        """Get validation statistics for monitoring."""
        stats = self.validation_stats.copy()
        if stats['total_validations'] > 0:
            stats['pass_rate'] = stats['passed_validations'] / stats['total_validations']
            stats['forbidden_token_rate'] = stats['forbidden_token_violations'] / stats['total_validations']
            stats['data_quality_issue_rate'] = stats['data_quality_issues'] / stats['total_validations']
        else:
            stats['pass_rate'] = 0.0
            stats['forbidden_token_rate'] = 0.0
            stats['data_quality_issue_rate'] = 0.0
        
        return stats