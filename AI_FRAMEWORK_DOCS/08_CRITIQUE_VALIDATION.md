# Critique Agent - Quality Control & Validation System

## Overview

The Critique Agent serves as the quality assurance layer of the TrueFi AI framework, validating outputs from other agents to ensure accuracy, completeness, and relevance. It acts as a sophisticated review system that can approve, request revisions, or reject agent outputs based on comprehensive validation criteria.

## Agent Architecture

### Core Critique Agent
**Location**: `/TRUEFIBACKEND/agents/critique_agent.py`

```python
class CritiqueAgent:
    """Validates and improves agent outputs through systematic review"""

    def __init__(self):
        self.client = openai.AsyncOpenAI(api_key=OPENAI_API_KEY)
        self.validator = OutputValidator()
        self.accuracy_checker = AccuracyChecker()
        self.relevance_scorer = RelevanceScorer()
        self.completeness_checker = CompletenessChecker()
        self.consistency_validator = ConsistencyValidator()
        self.feedback_generator = FeedbackGenerator()
```

## Validation Stages

The Critique Agent operates at three critical stages in the pipeline:

### Stage 1: Pre-SQL Validation

```python
async def validate_pre_sql(self, request: Dict) -> Dict:
    """Validate before SQL execution"""

    validation_result = {
        'stage': 'pre_sql',
        'timestamp': datetime.now().isoformat(),
        'checks': [],
        'issues': [],
        'suggestions': [],
        'status': 'pending'
    }

    # Check 1: Question clarity
    clarity_check = self.check_question_clarity(request['question'])
    validation_result['checks'].append(clarity_check)

    # Check 2: Intent detection accuracy
    intent_check = self.validate_intent_detection(
        request['question'],
        request.get('detected_intent')
    )
    validation_result['checks'].append(intent_check)

    # Check 3: Data availability
    availability_check = self.check_data_availability(
        request['detected_intent'],
        request['schema_card']
    )
    validation_result['checks'].append(availability_check)

    # Check 4: Security concerns
    security_check = self.check_security_concerns(request['question'])
    validation_result['checks'].append(security_check)

    # Determine overall status
    validation_result['status'] = self.determine_status(validation_result['checks'])

    return validation_result
```

### Stage 2: Post-SQL Validation

```python
async def validate_post_sql(self, request: Dict) -> Dict:
    """Validate SQL query and results"""

    validation_result = {
        'stage': 'post_sql',
        'timestamp': datetime.now().isoformat(),
        'checks': [],
        'issues': [],
        'suggestions': [],
        'status': 'pending'
    }

    # Check 1: SQL query structure
    sql_structure_check = self.validate_sql_structure(request['sql_query'])
    validation_result['checks'].append(sql_structure_check)

    # Check 2: User ID filtering
    user_filter_check = self.check_user_id_filter(
        request['sql_query'],
        request['user_id']
    )
    validation_result['checks'].append(user_filter_check)

    # Check 3: Result set quality
    result_quality_check = self.validate_result_quality(request['sql_result'])
    validation_result['checks'].append(result_quality_check)

    # Check 4: Query efficiency
    efficiency_check = await self.check_query_efficiency(
        request['sql_query'],
        request['execution_time_ms']
    )
    validation_result['checks'].append(efficiency_check)

    # Check 5: Data relevance
    relevance_check = self.check_result_relevance(
        request['question'],
        request['sql_result']
    )
    validation_result['checks'].append(relevance_check)

    validation_result['status'] = self.determine_status(validation_result['checks'])

    return validation_result
```

### Stage 3: Post-Model Validation

```python
async def validate_post_model(self, request: Dict) -> Dict:
    """Validate final model output"""

    validation_result = {
        'stage': 'post_model',
        'timestamp': datetime.now().isoformat(),
        'checks': [],
        'issues': [],
        'suggestions': [],
        'status': 'pending',
        'confidence': 0.0
    }

    # Check 1: Answer completeness
    completeness_check = await self.check_answer_completeness(
        request['question'],
        request['answer']
    )
    validation_result['checks'].append(completeness_check)

    # Check 2: Factual accuracy
    accuracy_check = self.verify_factual_accuracy(
        request['answer'],
        request['source_data']
    )
    validation_result['checks'].append(accuracy_check)

    # Check 3: Calculation correctness
    calculation_check = self.verify_calculations(request['computations'])
    validation_result['checks'].append(calculation_check)

    # Check 4: Consistency
    consistency_check = self.check_consistency(
        request['answer'],
        request['profile_pack']
    )
    validation_result['checks'].append(consistency_check)

    # Check 5: Tone and appropriateness
    tone_check = self.validate_tone_appropriateness(
        request['answer'],
        request['user_preferences']
    )
    validation_result['checks'].append(tone_check)

    # Calculate confidence score
    validation_result['confidence'] = self.calculate_confidence(
        validation_result['checks']
    )

    validation_result['status'] = self.determine_status(validation_result['checks'])

    return validation_result
```

## Validation Criteria

### 1. Question Clarity Validation

```python
def check_question_clarity(self, question: str) -> Dict:
    """Assess if question is clear and answerable"""

    check_result = {
        'check_name': 'question_clarity',
        'passed': True,
        'score': 1.0,
        'details': {}
    }

    # Length check
    if len(question) < 5:
        check_result['passed'] = False
        check_result['score'] = 0.3
        check_result['details']['issue'] = 'Question too short'
        check_result['details']['suggestion'] = 'Please provide more detail'

    # Ambiguity detection
    ambiguous_patterns = [
        r'^show me$',
        r'^tell me about$',
        r'^what about$',
        r'^stuff$',
        r'^things$'
    ]

    for pattern in ambiguous_patterns:
        if re.search(pattern, question.lower()):
            check_result['score'] *= 0.7
            check_result['details']['warning'] = 'Question may be ambiguous'

    # Specificity check
    specific_indicators = [
        'how much', 'when', 'what', 'which',
        'last month', 'this year', 'category'
    ]

    specificity_score = sum(1 for indicator in specific_indicators
                           if indicator in question.lower()) / len(specific_indicators)

    check_result['score'] = min(check_result['score'], specificity_score + 0.5)

    return check_result
```

### 2. SQL Query Validation

```python
def validate_sql_structure(self, sql_query: str) -> Dict:
    """Validate SQL query structure and safety"""

    check_result = {
        'check_name': 'sql_structure',
        'passed': True,
        'score': 1.0,
        'details': {}
    }

    # Parse SQL
    try:
        parsed = sqlparse.parse(sql_query)[0]
    except Exception as e:
        check_result['passed'] = False
        check_result['score'] = 0
        check_result['details']['error'] = f"SQL parse error: {str(e)}"
        return check_result

    # Check for required elements
    required_checks = {
        'has_select': 'SELECT' in sql_query.upper(),
        'has_from': 'FROM' in sql_query.upper(),
        'has_where': 'WHERE' in sql_query.upper(),
        'has_user_filter': 'user_id' in sql_query.lower()
    }

    for check_name, check_passed in required_checks.items():
        if not check_passed and check_name in ['has_where', 'has_user_filter']:
            check_result['passed'] = False
            check_result['score'] *= 0.5
            check_result['details'][check_name] = 'Failed'

    # Check for forbidden operations
    forbidden_operations = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'TRUNCATE']
    for op in forbidden_operations:
        if op in sql_query.upper():
            check_result['passed'] = False
            check_result['score'] = 0
            check_result['details']['security_violation'] = f"Forbidden operation: {op}"

    # Check for injection patterns
    injection_patterns = [
        r';\s*--',
        r'UNION\s+SELECT',
        r'OR\s+1\s*=\s*1',
        r'OR\s+\'1\'\s*=\s*\'1\''
    ]

    for pattern in injection_patterns:
        if re.search(pattern, sql_query, re.IGNORECASE):
            check_result['passed'] = False
            check_result['score'] = 0
            check_result['details']['injection_risk'] = 'SQL injection pattern detected'

    return check_result
```

### 3. Result Accuracy Validation

```python
class AccuracyChecker:
    """Verify factual accuracy of outputs"""

    def verify_factual_accuracy(self, answer: str, source_data: Dict) -> Dict:
        """Check if stated facts match source data"""

        check_result = {
            'check_name': 'factual_accuracy',
            'passed': True,
            'score': 1.0,
            'details': {
                'verified_facts': [],
                'unverified_facts': [],
                'incorrect_facts': []
            }
        }

        # Extract claimed facts from answer
        claimed_facts = self.extract_facts(answer)

        for fact in claimed_facts:
            verification = self.verify_fact(fact, source_data)

            if verification['status'] == 'verified':
                check_result['details']['verified_facts'].append(fact)
            elif verification['status'] == 'unverified':
                check_result['details']['unverified_facts'].append(fact)
                check_result['score'] *= 0.9
            else:  # incorrect
                check_result['details']['incorrect_facts'].append({
                    'claimed': fact,
                    'actual': verification['actual']
                })
                check_result['passed'] = False
                check_result['score'] *= 0.5

        return check_result

    def extract_facts(self, text: str) -> List[Dict]:
        """Extract factual claims from text"""

        facts = []

        # Extract monetary values
        money_pattern = r'\$[\d,]+\.?\d*'
        for match in re.finditer(money_pattern, text):
            context_start = max(0, match.start() - 50)
            context_end = min(len(text), match.end() + 50)
            context = text[context_start:context_end]

            facts.append({
                'type': 'monetary',
                'value': match.group(),
                'context': context
            })

        # Extract percentages
        percentage_pattern = r'\d+\.?\d*%'
        for match in re.finditer(percentage_pattern, text):
            context_start = max(0, match.start() - 50)
            context_end = min(len(text), match.end() + 50)
            context = text[context_start:context_end]

            facts.append({
                'type': 'percentage',
                'value': match.group(),
                'context': context
            })

        # Extract dates
        date_patterns = [
            r'\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}',
            r'\d{1,2}/\d{1,2}/\d{2,4}',
            r'\d{4}-\d{2}-\d{2}'
        ]

        for pattern in date_patterns:
            for match in re.finditer(pattern, text):
                facts.append({
                    'type': 'date',
                    'value': match.group(),
                    'context': text[max(0, match.start()-30):min(len(text), match.end()+30)]
                })

        return facts
```

### 4. Calculation Verification

```python
def verify_calculations(self, computations: List[Dict]) -> Dict:
    """Verify all calculations are correct"""

    check_result = {
        'check_name': 'calculation_verification',
        'passed': True,
        'score': 1.0,
        'details': {
            'verified': [],
            'failed': []
        }
    }

    for computation in computations:
        try:
            # Re-calculate based on formula
            recalculated = self.recalculate(computation)

            # Compare with stated value
            stated_value = float(computation['value'])
            tolerance = 0.01  # 1 cent tolerance for currency

            if abs(recalculated - stated_value) <= tolerance:
                check_result['details']['verified'].append(computation['name'])
            else:
                check_result['details']['failed'].append({
                    'name': computation['name'],
                    'stated': stated_value,
                    'calculated': recalculated,
                    'difference': abs(recalculated - stated_value)
                })
                check_result['passed'] = False
                check_result['score'] *= 0.7

        except Exception as e:
            check_result['details']['failed'].append({
                'name': computation['name'],
                'error': str(e)
            })
            check_result['score'] *= 0.9

    return check_result

def recalculate(self, computation: Dict) -> float:
    """Recalculate value based on formula"""

    formula = computation['formula']
    data = computation.get('source_data', {})

    # Simple calculations
    if formula == 'SUM':
        return sum(data.values())
    elif formula == 'AVG':
        return sum(data.values()) / len(data)
    elif formula == 'MAX':
        return max(data.values())
    elif formula == 'MIN':
        return min(data.values())

    # Complex calculations
    elif 'net_worth' in formula:
        assets = data.get('total_assets', 0)
        liabilities = data.get('total_liabilities', 0)
        return assets - liabilities

    elif 'savings_rate' in formula:
        income = data.get('income', 0)
        expenses = data.get('expenses', 0)
        if income > 0:
            return (income - expenses) / income
        return 0

    # Add more formula handlers as needed
    else:
        raise ValueError(f"Unknown formula: {formula}")
```

### 5. Consistency Validation

```python
class ConsistencyValidator:
    """Check for consistency across outputs"""

    def check_consistency(self, answer: str, profile_pack: Dict) -> Dict:
        """Verify answer is consistent with user profile"""

        check_result = {
            'check_name': 'consistency',
            'passed': True,
            'score': 1.0,
            'details': {
                'inconsistencies': []
            }
        }

        # Check currency consistency
        if '$' in answer:
            expected_currency = profile_pack['user_core'].get('currency', 'USD')
            if expected_currency != 'USD' and '$' in answer:
                check_result['details']['inconsistencies'].append({
                    'type': 'currency',
                    'expected': expected_currency,
                    'found': 'USD ($)'
                })
                check_result['score'] *= 0.9

        # Check date format consistency
        user_locale = profile_pack['user_core'].get('locale', 'en-US')
        date_format = self.get_expected_date_format(user_locale)
        if not self.check_date_format_consistency(answer, date_format):
            check_result['details']['inconsistencies'].append({
                'type': 'date_format',
                'expected': date_format,
                'issue': 'Mixed date formats detected'
            })
            check_result['score'] *= 0.95

        # Check numerical precision consistency
        precision_check = self.check_numerical_precision(answer)
        if not precision_check['consistent']:
            check_result['details']['inconsistencies'].append({
                'type': 'numerical_precision',
                'issue': precision_check['issue']
            })
            check_result['score'] *= 0.95

        return check_result
```

## Feedback Generation

### 1. Revision Suggestions

```python
class FeedbackGenerator:
    """Generate actionable feedback for improvements"""

    async def generate_revision_suggestions(
        self,
        validation_result: Dict,
        original_output: Dict
    ) -> List[Dict]:
        """Generate specific suggestions for improvement"""

        suggestions = []

        for check in validation_result['checks']:
            if check['score'] < 0.8:
                suggestion = await self.create_suggestion(check, original_output)
                suggestions.append(suggestion)

        # Prioritize suggestions
        suggestions = sorted(suggestions, key=lambda x: x['priority'])

        return suggestions

    async def create_suggestion(self, check: Dict, output: Dict) -> Dict:
        """Create specific improvement suggestion"""

        suggestion_templates = {
            'question_clarity': {
                'title': 'Clarify Question Interpretation',
                'template': 'The question "{question}" is ambiguous. Consider asking for clarification on: {ambiguous_parts}',
                'priority': 1
            },
            'factual_accuracy': {
                'title': 'Correct Factual Errors',
                'template': 'The following facts need correction: {incorrect_facts}. Actual values: {correct_values}',
                'priority': 1
            },
            'calculation_verification': {
                'title': 'Fix Calculations',
                'template': 'Recalculate {failed_calculations}. Current values are off by {differences}',
                'priority': 1
            },
            'completeness': {
                'title': 'Add Missing Information',
                'template': 'The answer should also address: {missing_topics}',
                'priority': 2
            },
            'consistency': {
                'title': 'Ensure Consistency',
                'template': 'Make the following consistent: {inconsistencies}',
                'priority': 3
            }
        }

        template = suggestion_templates.get(check['check_name'], {})

        return {
            'type': check['check_name'],
            'title': template.get('title', 'Improvement Needed'),
            'description': self.format_suggestion(template, check, output),
            'priority': template.get('priority', 5),
            'specific_actions': self.get_specific_actions(check)
        }
```

### 2. Quality Scoring

```python
def calculate_quality_score(self, validation_results: List[Dict]) -> Dict:
    """Calculate comprehensive quality score"""

    # Aggregate scores by category
    category_scores = {
        'accuracy': [],
        'completeness': [],
        'relevance': [],
        'consistency': [],
        'performance': []
    }

    for result in validation_results:
        for check in result['checks']:
            category = self.categorize_check(check['check_name'])
            category_scores[category].append(check['score'])

    # Calculate weighted average
    weights = {
        'accuracy': 0.35,
        'completeness': 0.25,
        'relevance': 0.20,
        'consistency': 0.15,
        'performance': 0.05
    }

    overall_score = 0
    category_results = {}

    for category, scores in category_scores.items():
        if scores:
            category_avg = sum(scores) / len(scores)
            category_results[category] = category_avg
            overall_score += category_avg * weights[category]

    return {
        'overall_score': round(overall_score, 2),
        'category_scores': category_results,
        'grade': self.score_to_grade(overall_score),
        'recommendation': self.get_score_recommendation(overall_score)
    }

def score_to_grade(self, score: float) -> str:
    """Convert numerical score to letter grade"""

    if score >= 0.95:
        return 'A+'
    elif score >= 0.90:
        return 'A'
    elif score >= 0.85:
        return 'B+'
    elif score >= 0.80:
        return 'B'
    elif score >= 0.75:
        return 'C+'
    elif score >= 0.70:
        return 'C'
    else:
        return 'F'
```

## Approval Decision Logic

### Decision Framework

```python
def determine_status(self, checks: List[Dict]) -> str:
    """Determine overall validation status"""

    # Count check results
    failed_critical = 0
    failed_major = 0
    failed_minor = 0
    warnings = 0

    for check in checks:
        if not check['passed']:
            severity = self.get_check_severity(check['check_name'])
            if severity == 'critical':
                failed_critical += 1
            elif severity == 'major':
                failed_major += 1
            elif severity == 'minor':
                failed_minor += 1
        elif check['score'] < 0.8:
            warnings += 1

    # Decision logic
    if failed_critical > 0:
        return 'reject'
    elif failed_major > 1 or (failed_major == 1 and failed_minor > 2):
        return 'revise'
    elif failed_minor > 3 or warnings > 5:
        return 'revise'
    else:
        return 'approve'

def get_check_severity(self, check_name: str) -> str:
    """Determine severity level of a check"""

    severity_map = {
        'critical': [
            'user_id_filter',
            'security_violation',
            'injection_risk'
        ],
        'major': [
            'factual_accuracy',
            'calculation_verification',
            'completeness'
        ],
        'minor': [
            'consistency',
            'tone_appropriateness',
            'formatting'
        ]
    }

    for severity, checks in severity_map.items():
        if check_name in checks:
            return severity

    return 'minor'
```

## Performance Impact

### Optimization Strategies

```python
class CritiqueOptimizer:
    """Optimize critique performance"""

    def __init__(self):
        self.cache = {}
        self.validation_history = []

    async def smart_critique(self, request: Dict) -> Dict:
        """Perform intelligent critique with optimizations"""

        # Check if similar request was recently validated
        cache_key = self.generate_cache_key(request)
        if cache_key in self.cache:
            cached_result = self.cache[cache_key]
            if self.is_cache_valid(cached_result):
                return cached_result

        # Determine validation depth based on confidence
        validation_depth = self.determine_validation_depth(request)

        # Perform validation
        if validation_depth == 'light':
            result = await self.light_validation(request)
        elif validation_depth == 'standard':
            result = await self.standard_validation(request)
        else:  # deep
            result = await self.deep_validation(request)

        # Cache result
        self.cache[cache_key] = result

        # Learn from history
        self.update_validation_patterns(result)

        return result

    def determine_validation_depth(self, request: Dict) -> str:
        """Determine how deep validation should be"""

        # Factors to consider
        factors = {
            'query_complexity': self.assess_complexity(request.get('sql_query', '')),
            'data_volume': len(request.get('sql_result', {}).get('data', [])),
            'user_history': self.get_user_error_rate(request.get('user_id')),
            'agent_confidence': request.get('confidence_score', 0.5)
        }

        # Calculate validation depth score
        depth_score = (
            factors['query_complexity'] * 0.3 +
            min(factors['data_volume'] / 1000, 1.0) * 0.2 +
            factors['user_history'] * 0.2 +
            (1 - factors['agent_confidence']) * 0.3
        )

        if depth_score < 0.3:
            return 'light'
        elif depth_score < 0.7:
            return 'standard'
        else:
            return 'deep'
```

## Error Recovery

### Critique Failure Handling

```python
async def handle_critique_failure(self, error: Exception, request: Dict) -> Dict:
    """Handle critique agent failures gracefully"""

    # Log the error
    logger.error(f"Critique agent failed: {error}")

    # Return permissive result to avoid blocking
    return {
        'status': 'approve',
        'confidence': 0.5,
        'warning': 'Validation was incomplete due to an error',
        'partial_checks': self.perform_basic_checks(request),
        'error_details': {
            'type': type(error).__name__,
            'message': str(error),
            'fallback_used': True
        }
    }

def perform_basic_checks(self, request: Dict) -> List[Dict]:
    """Perform minimal validation checks"""

    checks = []

    # Basic user_id check
    if 'user_id' in str(request.get('sql_query', '')):
        checks.append({
            'check_name': 'user_id_present',
            'passed': True,
            'score': 1.0
        })

    # Basic result check
    if request.get('sql_result', {}).get('data'):
        checks.append({
            'check_name': 'has_results',
            'passed': True,
            'score': 1.0
        })

    return checks
```

## Monitoring & Metrics

### Critique Performance Metrics

```python
CRITIQUE_METRICS = {
    'validation_time_ms': Histogram,
    'approval_rate': Gauge,
    'revision_rate': Gauge,
    'rejection_rate': Gauge,
    'checks_performed': Counter,
    'issues_found': Counter,
    'suggestions_generated': Counter,
    'cache_hit_rate': Gauge
}
```

### Validation Patterns Analysis

```python
def analyze_validation_patterns(self) -> Dict:
    """Analyze patterns in validation results"""

    patterns = {
        'common_failures': self.identify_common_failures(),
        'agent_performance': self.analyze_agent_performance(),
        'time_patterns': self.analyze_temporal_patterns(),
        'improvement_trends': self.calculate_improvement_trends()
    }

    return patterns
```

---

**Next Document**: [09_MEMORY_PATTERNS.md](./09_MEMORY_PATTERNS.md) - Complete memory system and conversation context