# Prompt Engineering & LLM Interaction System

## Overview

The TrueFi prompt engineering system orchestrates all interactions with Large Language Models (primarily OpenAI GPT-4o) to generate SQL queries, financial analysis, and personalized advice. This document details every prompt template, context injection mechanism, and LLM interaction pattern.

## Core LLM Configuration

### OpenAI Client Setup
```python
# Async OpenAI client initialization
client = openai.AsyncOpenAI(
    api_key=OPENAI_API_KEY,
    timeout=30.0,
    max_retries=3
)

# Model configuration
MODEL_CONFIG = {
    'primary_model': 'gpt-4-0125-preview',
    'fallback_model': 'gpt-4-1106-preview',
    'temperature': 0.7,
    'max_tokens': 4096,
    'top_p': 0.95,
    'frequency_penalty': 0.2,
    'presence_penalty': 0.1
}
```

## System Prompts

### 1. Base Financial Advisor Persona

```python
BASE_SYSTEM_PROMPT = """
You are Penny, TrueFi's AI-powered financial advisor. You provide personalized,
actionable financial guidance based on each user's complete financial picture.

Core Principles:
- Accuracy: Use exact numbers from user data, never approximate
- Clarity: Explain complex concepts in simple terms
- Actionability: Always provide specific next steps
- Empathy: Be supportive and non-judgmental
- Privacy: Never mention specific account numbers or full names

Communication Style:
- Professional yet conversational
- Encouraging and supportive
- Clear and concise
- Use analogies to explain complex concepts
- Format responses with headers and bullet points for clarity

You have access to the user's complete financial profile including:
- All bank and investment accounts
- Transaction history
- Budgets and goals
- Investment holdings
- Demographic information
- Tax situation

Always base your advice on this actual data, not generic rules.
"""
```

### 2. SQL Generation Prompt

```python
SQL_GENERATION_PROMPT = """
You are a SQL expert specializing in financial data queries.
Generate PostgreSQL queries to answer user questions about their finances.

Database Schema:
{schema_card}

User Question: {question}

Requirements:
1. ALWAYS filter by user_id = '{user_id}'
2. Use parameter placeholders ($1, $2, etc.) for values
3. Limit results appropriately (max 5000 rows)
4. Use efficient JOINs and indexes
5. Handle NULL values gracefully
6. Use window functions for running totals/comparisons
7. Aggregate data when appropriate

Security Rules:
- Never expose other users' data
- Use parameterized queries only
- No dynamic SQL construction
- No system table access

Output Format:
Return a JSON object with:
- intent: The detected intent
- sql: The SQL query
- parameters: Array of parameter values
- explanation: Brief explanation of the query
- estimated_rows: Expected result count
"""
```

### 3. Modeling Agent Prompt

```python
MODELING_AGENT_PROMPT = """
You are a financial analysis expert. Transform raw financial data into
clear, actionable insights for the user.

User Profile:
{profile_pack}

User Question: {question}

SQL Query Results:
{sql_results}

Your Task:
1. Analyze the data to answer the user's question
2. Identify patterns, trends, and anomalies
3. Generate personalized recommendations
4. Create appropriate visualizations
5. Calculate additional metrics if needed

Response Requirements:
- Start with a direct answer to the question
- Use specific numbers from the data
- Highlight important trends or changes
- Provide 2-3 actionable recommendations
- Suggest relevant follow-up questions

Formatting:
- Use markdown headers (##, ###)
- Bold important numbers (**$1,234**)
- Use bullet points for lists
- Include emoji sparingly for emphasis (📈 📊 💡)

Tone: {user_tone_preference}
Detail Level: {user_detail_preference}
"""
```

### 4. Critique Agent Prompt

```python
CRITIQUE_AGENT_PROMPT = """
You are a quality control specialist reviewing financial analysis outputs.

Stage: {stage}
Original Question: {question}
{stage_specific_content}

Evaluate the following criteria:
1. Accuracy: Are calculations correct? Do numbers match source data?
2. Completeness: Is the question fully answered?
3. Relevance: Does the response address what was asked?
4. Clarity: Is the explanation clear and understandable?
5. Actionability: Are next steps specific and achievable?

For SQL Queries, also check:
- Correct user_id filtering
- Appropriate time ranges
- Efficient query structure
- Index usage

For Model Outputs, also check:
- Personalization to user's situation
- Appropriate visualizations
- Reasonable recommendations

Return:
{
    "status": "approve" | "revise" | "reject",
    "confidence": 0.0-1.0,
    "issues": [...],
    "suggestions": [...]
}
"""
```

## Dynamic Context Injection

### 1. Profile Pack Injection

```python
def inject_profile_context(prompt: str, profile_pack: Dict) -> str:
    """Inject user financial profile into prompt"""

    profile_summary = f"""
    User Financial Profile:
    - Net Worth: ${profile_pack['derived_metrics']['net_worth']:,.2f}
    - Monthly Income: ${profile_pack['derived_metrics']['monthly_income']:,.2f}
    - Monthly Expenses: ${profile_pack['derived_metrics']['monthly_expenses']:,.2f}
    - Savings Rate: {profile_pack['derived_metrics']['savings_rate']:.1%}
    - Number of Accounts: {len(profile_pack['accounts'])}
    - Number of Goals: {len(profile_pack['goals'])}

    Life Context:
    - Age: {profile_pack['user_core']['age']}
    - Life Stage: {profile_pack['user_core']['life_stage']}
    - Dependents: {profile_pack['user_core']['dependents']}
    - Risk Tolerance: {profile_pack['user_core']['risk_tolerance']}
    """

    return prompt.replace('{profile_pack}', profile_summary)
```

### 2. Conversation History Injection

```python
def inject_conversation_context(prompt: str, history: List[Dict]) -> str:
    """Inject recent conversation history"""

    # Format last 3 exchanges
    context_window = []
    for msg in history[-6:]:  # Last 3 Q&A pairs
        if msg['role'] == 'user':
            context_window.append(f"User: {msg['content']}")
        else:
            # Truncate long responses
            content = msg['content'][:200] + "..." if len(msg['content']) > 200 else msg['content']
            context_window.append(f"Assistant: {content}")

    history_text = "\n".join(context_window)

    return prompt.replace('{conversation_history}', history_text)
```

### 3. Time Context Injection

```python
def inject_time_context(prompt: str, user_timezone: str) -> str:
    """Inject current time and date context"""

    user_tz = pytz.timezone(user_timezone)
    current_time = datetime.now(user_tz)

    time_context = f"""
    Current Date/Time: {current_time.strftime('%B %d, %Y at %I:%M %p %Z')}
    Day of Week: {current_time.strftime('%A')}
    Day of Month: {current_time.day}
    Days Until Month End: {(current_time.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)).day - current_time.day}
    Quarter: Q{(current_time.month - 1) // 3 + 1}
    """

    return prompt.replace('{time_context}', time_context)
```

### 4. Schema Card Injection

```python
def inject_schema_context(prompt: str) -> str:
    """Inject database schema information"""

    schema_card = {
        'transactions': {
            'columns': [
                'id (uuid)',
                'user_id (uuid)',
                'account_id (uuid)',
                'date (timestamp)',
                'amount (decimal)',
                'merchant_name (text)',
                'category (text)',
                'pending (boolean)'
            ],
            'indexes': [
                'idx_user_date',
                'idx_category',
                'idx_merchant'
            ],
            'common_filters': [
                "date >= CURRENT_DATE - INTERVAL '30 days'",
                "pending = false",
                "amount < 0  -- expenses"
            ]
        },
        'accounts': {
            'columns': [
                'id (uuid)',
                'user_id (uuid)',
                'name (text)',
                'type (text)',
                'balance (decimal)',
                'institution_name (text)'
            ]
        }
        # ... more tables
    }

    return prompt.replace('{schema_card}', json.dumps(schema_card, indent=2))
```

## Intent-Specific Prompt Templates

### 1. Spending Analysis

```python
SPENDING_ANALYSIS_PROMPT = """
Analyze the user's spending patterns and provide insights.

Focus Areas:
- Total spending by category
- Month-over-month changes
- Unusual or high spending areas
- Comparison to budget (if exists)
- Opportunities for savings

{base_context}

Provide:
1. Spending breakdown table/chart
2. Top 3 spending categories with amounts
3. Notable changes from previous period
4. 2-3 specific recommendations to optimize spending
"""
```

### 2. Investment Performance

```python
INVESTMENT_PERFORMANCE_PROMPT = """
Analyze the user's investment portfolio performance.

Focus Areas:
- Total portfolio value and returns
- Performance by account
- Asset allocation
- Individual holding performance
- Risk assessment

{base_context}

Include:
1. Portfolio summary with total value and returns
2. Top performers and underperformers
3. Asset allocation breakdown
4. Rebalancing recommendations if needed
5. Risk-adjusted return metrics
"""
```

### 3. Goal Progress

```python
GOAL_PROGRESS_PROMPT = """
Evaluate progress toward the user's financial goals.

Focus Areas:
- Current progress percentage
- Time remaining vs. required savings rate
- Feasibility assessment
- Recommended adjustments
- Priority optimization

{base_context}

Provide:
1. Goal-by-goal progress summary
2. Monthly contribution needed for each goal
3. Priority recommendations
4. Specific actions to accelerate progress
"""
```

## Advanced Prompt Engineering Techniques

### 1. Chain-of-Thought Prompting

```python
COT_PROMPT_TEMPLATE = """
Let's solve this step-by-step:

Step 1: Understand what the user is asking
{question}

Step 2: Identify the data needed
- Required tables: {required_tables}
- Time period: {time_period}
- Filters: {filters}

Step 3: Generate the SQL query
Think through:
- What JOINs are needed?
- What WHERE clauses?
- What aggregations?

Step 4: Validate the approach
- Will this answer the question?
- Is it efficient?
- Is it secure?

Now generate the final SQL:
```
"""
```

### 2. Few-Shot Examples

```python
FEW_SHOT_SQL_EXAMPLES = """
Example 1:
Question: "How much did I spend on groceries last month?"
SQL:
```sql
SELECT
    SUM(ABS(amount)) as total_spent,
    COUNT(*) as transaction_count,
    AVG(ABS(amount)) as avg_transaction
FROM transactions
WHERE user_id = $1
    AND category = 'Groceries'
    AND date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
    AND date < DATE_TRUNC('month', CURRENT_DATE)
    AND amount < 0
```

Example 2:
Question: "What's my net worth?"
SQL:
```sql
WITH assets AS (
    SELECT SUM(balance) as total
    FROM accounts
    WHERE user_id = $1 AND balance > 0
),
liabilities AS (
    SELECT SUM(ABS(balance)) as total
    FROM accounts
    WHERE user_id = $1 AND balance < 0
)
SELECT
    COALESCE(a.total, 0) as total_assets,
    COALESCE(l.total, 0) as total_liabilities,
    COALESCE(a.total, 0) - COALESCE(l.total, 0) as net_worth
FROM assets a
CROSS JOIN liabilities l
```
"""
```

### 3. Structured Output Formatting

```python
def format_structured_prompt(intent: str, data: Dict) -> str:
    """Create structured prompts for consistent outputs"""

    structure_templates = {
        'spending_analysis': {
            'sections': [
                '## Overview',
                '## Breakdown by Category',
                '## Trends and Patterns',
                '## Recommendations'
            ],
            'required_elements': [
                'total_amount',
                'period',
                'top_categories',
                'comparison_to_average'
            ]
        },
        'net_worth': {
            'sections': [
                '## Net Worth Summary',
                '## Assets Breakdown',
                '## Liabilities Breakdown',
                '## Monthly Changes'
            ],
            'required_elements': [
                'total_net_worth',
                'asset_total',
                'liability_total',
                'month_over_month_change'
            ]
        }
    }

    template = structure_templates.get(intent, {})

    prompt = f"""
    Structure your response with these sections:
    {json.dumps(template.get('sections', []), indent=2)}

    Include these data points:
    {json.dumps(template.get('required_elements', []), indent=2)}

    Data: {json.dumps(data, indent=2)}
    """

    return prompt
```

## LLM Interaction Patterns

### 1. Streaming Response Generation

```python
async def stream_llm_response(prompt: str, system_prompt: str):
    """Stream LLM responses for real-time display"""

    stream = await client.chat.completions.create(
        model=MODEL_CONFIG['primary_model'],
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ],
        temperature=MODEL_CONFIG['temperature'],
        max_tokens=MODEL_CONFIG['max_tokens'],
        stream=True
    )

    async for chunk in stream:
        if chunk.choices[0].delta.content:
            yield chunk.choices[0].delta.content
```

### 2. Retry with Fallback

```python
async def llm_with_fallback(prompt: str, system_prompt: str):
    """Try primary model, fallback to secondary on failure"""

    try:
        response = await client.chat.completions.create(
            model=MODEL_CONFIG['primary_model'],
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            **MODEL_CONFIG
        )
        return response.choices[0].message.content

    except Exception as e:
        logger.warning(f"Primary model failed: {e}, trying fallback")

        response = await client.chat.completions.create(
            model=MODEL_CONFIG['fallback_model'],
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            temperature=0.5  # Lower temperature for fallback
        )
        return response.choices[0].message.content
```

### 3. Token Management

```python
def manage_token_budget(prompt: str, max_tokens: int = 4000) -> str:
    """Ensure prompt fits within token budget"""

    import tiktoken

    encoder = tiktoken.encoding_for_model("gpt-4")
    tokens = encoder.encode(prompt)

    if len(tokens) > max_tokens:
        # Truncate from the middle (keep beginning and end)
        keep_start = max_tokens // 2
        keep_end = max_tokens - keep_start
        truncated = tokens[:keep_start] + tokens[-keep_end:]
        return encoder.decode(truncated)

    return prompt
```

## Prompt Optimization Strategies

### 1. Dynamic Temperature Adjustment

```python
def get_optimal_temperature(intent: str) -> float:
    """Adjust temperature based on task requirements"""

    temperature_map = {
        'sql_generation': 0.3,      # Low - need consistency
        'financial_advice': 0.7,    # Medium - balanced
        'creative_scenarios': 0.9,  # High - more creativity
        'calculations': 0.1,        # Very low - precision needed
        'conversation': 0.8         # High - natural dialogue
    }

    return temperature_map.get(intent, 0.7)
```

### 2. Context Window Optimization

```python
def optimize_context_window(
    base_prompt: str,
    context_items: List[Dict],
    max_tokens: int = 3000
) -> str:
    """Dynamically adjust context based on importance"""

    # Sort context items by relevance score
    sorted_items = sorted(
        context_items,
        key=lambda x: x.get('relevance_score', 0),
        reverse=True
    )

    optimized_prompt = base_prompt
    current_tokens = count_tokens(base_prompt)

    for item in sorted_items:
        item_text = json.dumps(item['content'])
        item_tokens = count_tokens(item_text)

        if current_tokens + item_tokens < max_tokens:
            optimized_prompt += f"\n{item_text}"
            current_tokens += item_tokens
        else:
            break

    return optimized_prompt
```

### 3. Prompt Caching

```python
class PromptCache:
    """Cache computed prompts for similar queries"""

    def __init__(self, ttl_seconds: int = 300):
        self.cache = {}
        self.ttl = ttl_seconds

    def get_or_generate(
        self,
        intent: str,
        user_id: str,
        generator_func: Callable
    ) -> str:
        cache_key = f"{intent}:{user_id}"

        if cache_key in self.cache:
            cached_prompt, timestamp = self.cache[cache_key]
            if time.time() - timestamp < self.ttl:
                return cached_prompt

        # Generate new prompt
        new_prompt = generator_func()
        self.cache[cache_key] = (new_prompt, time.time())
        return new_prompt
```

## Error Handling in LLM Interactions

### 1. Response Validation

```python
def validate_llm_response(response: str, expected_format: str) -> Tuple[bool, str]:
    """Validate LLM response meets expected format"""

    validators = {
        'json': validate_json,
        'sql': validate_sql,
        'markdown': validate_markdown,
        'number': validate_number
    }

    validator = validators.get(expected_format)
    if not validator:
        return True, response

    is_valid, cleaned = validator(response)
    if not is_valid:
        logger.warning(f"Invalid LLM response format: {expected_format}")

    return is_valid, cleaned
```

### 2. Hallucination Detection

```python
def detect_hallucination(
    response: str,
    profile_pack: Dict,
    confidence_threshold: float = 0.8
) -> Tuple[bool, float]:
    """Detect potential hallucinations in financial advice"""

    checks = []

    # Check 1: Mentioned amounts exist in data
    amounts = extract_dollar_amounts(response)
    for amount in amounts:
        exists = check_amount_in_profile(amount, profile_pack)
        checks.append(exists)

    # Check 2: Account names are real
    account_names = extract_account_names(response)
    for name in account_names:
        exists = any(acc['name'] == name for acc in profile_pack['accounts'])
        checks.append(exists)

    # Check 3: Dates are reasonable
    dates = extract_dates(response)
    for date in dates:
        is_reasonable = check_date_reasonable(date)
        checks.append(is_reasonable)

    if not checks:
        return True, 1.0

    confidence = sum(checks) / len(checks)
    is_reliable = confidence >= confidence_threshold

    return is_reliable, confidence
```

## Performance Monitoring

### LLM Metrics Tracking

```python
LLM_METRICS = {
    'prompt_length': Histogram,
    'response_length': Histogram,
    'generation_time_ms': Histogram,
    'temperature_used': Gauge,
    'model_used': Counter,
    'retry_count': Counter,
    'validation_failures': Counter,
    'hallucination_detections': Counter
}
```

### Prompt Quality Scoring

```python
def score_prompt_quality(prompt: str, response: str, user_feedback: Optional[int]) -> float:
    """Score prompt effectiveness for continuous improvement"""

    scores = {
        'response_completeness': assess_completeness(prompt, response),
        'response_accuracy': assess_accuracy(response),
        'response_relevance': assess_relevance(prompt, response),
        'user_satisfaction': user_feedback / 5.0 if user_feedback else 0.5
    }

    weights = {
        'response_completeness': 0.3,
        'response_accuracy': 0.3,
        'response_relevance': 0.2,
        'user_satisfaction': 0.2
    }

    total_score = sum(scores[k] * weights[k] for k in scores)
    return total_score
```

---

**Next Document**: [06_SQL_AGENT.md](./06_SQL_AGENT.md) - Complete SQL generation agent documentation