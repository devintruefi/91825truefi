# Modeling Agent - Financial Analysis & Insight Generation

## Overview

The Modeling Agent is the analytical brain of TrueFi, transforming raw SQL query results and user context into personalized financial insights, recommendations, and visualizations. It leverages GPT-4's reasoning capabilities combined with financial domain expertise to deliver actionable advice.

## Agent Architecture

### Core Modeling Agent
**Location**: `/TRUEFIBACKEND/agents/modeling_agent.py`

```python
class ModelingAgent:
    """Transforms data into insights and recommendations"""

    def __init__(self):
        self.client = openai.AsyncOpenAI(api_key=OPENAI_API_KEY)
        self.calculator = FinancialCalculator()
        self.visualizer = DataVisualizer()
        self.recommender = RecommendationEngine()
        self.formatter = ResponseFormatter()
        self.confidence_scorer = ConfidenceScorer()
```

## Input Processing

### Complete Input Structure

```json
{
    "kind": "model_request",
    "question": "How is my spending this month compared to my budget?",
    "profile_pack": {
        "user_core": {...},
        "accounts": [...],
        "budgets": [...],
        "goals": [...],
        "derived_metrics": {...}
    },
    "sql_result": {
        "data": [
            {"category": "Groceries", "spent": 487.23, "budgeted": 500},
            {"category": "Dining", "spent": 312.45, "budgeted": 200},
            {"category": "Transportation", "spent": 189.00, "budgeted": 250}
        ],
        "row_count": 3,
        "columns": ["category", "spent", "budgeted"],
        "query_metadata": {
            "execution_time_ms": 45,
            "tables_used": ["transactions", "budgets"]
        }
    },
    "context": {
        "intent": "budget_analysis",
        "conversation_history": [...],
        "user_preferences": {...},
        "time_context": {
            "current_date": "2024-01-20",
            "days_in_month": 31,
            "days_elapsed": 20,
            "days_remaining": 11
        }
    }
}
```

## Analysis Pipeline

### 1. Data Preprocessing

```python
def preprocess_data(self, sql_result: Dict) -> DataFrame:
    """Clean and structure raw SQL results"""

    # Convert to DataFrame for easier manipulation
    df = pd.DataFrame(sql_result['data'])

    # Data cleaning
    df = self.clean_data(df)

    # Type conversion
    df = self.convert_types(df)

    # Add derived columns
    df = self.add_calculations(df)

    return df

def clean_data(self, df: DataFrame) -> DataFrame:
    """Clean and standardize data"""

    # Handle nulls
    df = df.fillna(0)

    # Standardize currency values
    currency_columns = self.identify_currency_columns(df)
    for col in currency_columns:
        df[col] = df[col].apply(lambda x: round(float(x), 2))

    # Standardize dates
    date_columns = self.identify_date_columns(df)
    for col in date_columns:
        df[col] = pd.to_datetime(df[col])

    return df

def add_calculations(self, df: DataFrame) -> DataFrame:
    """Add calculated fields"""

    # Budget variance
    if 'spent' in df.columns and 'budgeted' in df.columns:
        df['variance'] = df['budgeted'] - df['spent']
        df['variance_pct'] = (df['variance'] / df['budgeted'] * 100).round(2)
        df['usage_pct'] = (df['spent'] / df['budgeted'] * 100).round(2)

    # Ranking
    if 'spent' in df.columns:
        df['rank'] = df['spent'].rank(ascending=False, method='dense')

    return df
```

### 2. Statistical Analysis

```python
class FinancialCalculator:
    """Perform financial calculations and statistical analysis"""

    def analyze_spending(self, transactions_df: DataFrame) -> Dict:
        """Comprehensive spending analysis"""

        analysis = {
            'summary_stats': self.calculate_summary_stats(transactions_df),
            'trends': self.identify_trends(transactions_df),
            'patterns': self.detect_patterns(transactions_df),
            'anomalies': self.detect_anomalies(transactions_df),
            'projections': self.project_future(transactions_df)
        }

        return analysis

    def calculate_summary_stats(self, df: DataFrame) -> Dict:
        """Calculate summary statistics"""

        return {
            'total': float(df['amount'].sum()),
            'mean': float(df['amount'].mean()),
            'median': float(df['amount'].median()),
            'std_dev': float(df['amount'].std()),
            'min': float(df['amount'].min()),
            'max': float(df['amount'].max()),
            'count': int(len(df)),
            'percentiles': {
                '25': float(df['amount'].quantile(0.25)),
                '50': float(df['amount'].quantile(0.50)),
                '75': float(df['amount'].quantile(0.75)),
                '90': float(df['amount'].quantile(0.90))
            }
        }

    def identify_trends(self, df: DataFrame) -> Dict:
        """Identify spending trends"""

        if 'date' not in df.columns:
            return {}

        # Group by time period
        daily = df.groupby(pd.Grouper(key='date', freq='D'))['amount'].sum()
        weekly = df.groupby(pd.Grouper(key='date', freq='W'))['amount'].sum()
        monthly = df.groupby(pd.Grouper(key='date', freq='M'))['amount'].sum()

        return {
            'daily_trend': self.calculate_trend(daily),
            'weekly_trend': self.calculate_trend(weekly),
            'monthly_trend': self.calculate_trend(monthly),
            'growth_rate': self.calculate_growth_rate(monthly)
        }

    def calculate_trend(self, series: pd.Series) -> str:
        """Calculate trend direction"""

        if len(series) < 2:
            return 'insufficient_data'

        # Linear regression
        x = np.arange(len(series))
        y = series.values
        slope, intercept = np.polyfit(x, y, 1)

        if slope > 0.05:
            return 'increasing'
        elif slope < -0.05:
            return 'decreasing'
        else:
            return 'stable'

    def detect_anomalies(self, df: DataFrame) -> List[Dict]:
        """Detect spending anomalies using statistical methods"""

        anomalies = []

        # Z-score method
        z_scores = np.abs(stats.zscore(df['amount']))
        threshold = 2.5

        anomaly_indices = np.where(z_scores > threshold)[0]

        for idx in anomaly_indices:
            anomalies.append({
                'date': str(df.iloc[idx]['date']),
                'amount': float(df.iloc[idx]['amount']),
                'category': df.iloc[idx].get('category', 'Unknown'),
                'z_score': float(z_scores[idx]),
                'severity': 'high' if z_scores[idx] > 3 else 'medium'
            })

        return anomalies
```

### 3. Insight Generation

```python
async def generate_insights(self, analysis: Dict, profile_pack: Dict) -> List[Dict]:
    """Generate personalized insights using LLM"""

    prompt = f"""
    Based on the following financial analysis, generate personalized insights:

    User Profile:
    - Monthly Income: ${profile_pack['derived_metrics']['monthly_income']}
    - Monthly Expenses: ${profile_pack['derived_metrics']['monthly_expenses']}
    - Savings Rate: {profile_pack['derived_metrics']['savings_rate']:.1%}
    - Financial Goals: {[g['name'] for g in profile_pack['goals']]}

    Analysis Results:
    {json.dumps(analysis, indent=2)}

    Generate 3-5 specific, actionable insights that:
    1. Highlight important patterns or concerns
    2. Compare to user's goals and budget
    3. Suggest concrete improvements
    4. Include specific dollar amounts and percentages

    Format as JSON array of insights.
    """

    response = await self.client.chat.completions.create(
        model="gpt-4-0125-preview",
        messages=[
            {"role": "system", "content": INSIGHT_GENERATION_PROMPT},
            {"role": "user", "content": prompt}
        ],
        temperature=0.7,
        max_tokens=1500
    )

    insights = json.loads(response.choices[0].message.content)

    # Add confidence scores
    for insight in insights:
        insight['confidence'] = self.calculate_insight_confidence(insight, analysis)

    return insights
```

### 4. Recommendation Engine

```python
class RecommendationEngine:
    """Generate personalized financial recommendations"""

    async def generate_recommendations(
        self,
        question: str,
        analysis: Dict,
        profile_pack: Dict,
        insights: List[Dict]
    ) -> List[Dict]:
        """Generate actionable recommendations"""

        recommendations = []

        # Rule-based recommendations
        rule_based = self.apply_rules(analysis, profile_pack)
        recommendations.extend(rule_based)

        # ML-based recommendations (if patterns detected)
        if 'patterns' in analysis:
            pattern_based = self.pattern_recommendations(analysis['patterns'])
            recommendations.extend(pattern_based)

        # LLM-enhanced recommendations
        llm_enhanced = await self.llm_recommendations(
            question, analysis, profile_pack, insights
        )
        recommendations.extend(llm_enhanced)

        # Rank and filter
        recommendations = self.rank_recommendations(recommendations)

        return recommendations[:5]  # Top 5 recommendations

    def apply_rules(self, analysis: Dict, profile_pack: Dict) -> List[Dict]:
        """Apply financial rules for recommendations"""

        recommendations = []

        # Overspending detection
        if 'budget_analysis' in analysis:
            for category in analysis['budget_analysis']:
                if category['usage_pct'] > 100:
                    recommendations.append({
                        'type': 'budget_alert',
                        'category': category['name'],
                        'title': f"Reduce {category['name']} Spending",
                        'description': f"You're over budget by ${category['variance']:.2f}",
                        'action': f"Try to cut ${abs(category['variance'] * 0.5):.2f} from {category['name']}",
                        'impact': 'high',
                        'effort': 'medium',
                        'priority': 1
                    })

        # Savings opportunity
        savings_rate = profile_pack['derived_metrics']['savings_rate']
        if savings_rate < 0.20:  # Less than 20%
            potential_savings = (0.20 - savings_rate) * profile_pack['derived_metrics']['monthly_income']
            recommendations.append({
                'type': 'savings',
                'title': "Increase Savings Rate",
                'description': "Your savings rate is below recommended 20%",
                'action': f"Try to save an additional ${potential_savings:.2f} monthly",
                'impact': 'high',
                'effort': 'high',
                'priority': 2
            })

        # Emergency fund check
        emergency_months = profile_pack['derived_metrics'].get('emergency_fund_months', 0)
        if emergency_months < 3:
            needed = (3 - emergency_months) * profile_pack['derived_metrics']['monthly_expenses']
            recommendations.append({
                'type': 'emergency_fund',
                'title': "Build Emergency Fund",
                'description': f"You have {emergency_months:.1f} months of expenses saved",
                'action': f"Save ${needed:.2f} to reach 3 months of expenses",
                'impact': 'critical',
                'effort': 'high',
                'priority': 1
            })

        return recommendations
```

### 5. Visualization Generation

```python
class DataVisualizer:
    """Generate chart configurations for UI"""

    def generate_visualizations(self, data: DataFrame, analysis_type: str) -> List[Dict]:
        """Create appropriate visualizations based on data and analysis type"""

        visualizations = []

        if analysis_type == 'spending_by_category':
            visualizations.append(self.create_pie_chart(data))
            visualizations.append(self.create_bar_chart(data))

        elif analysis_type == 'trend_analysis':
            visualizations.append(self.create_line_chart(data))
            visualizations.append(self.create_area_chart(data))

        elif analysis_type == 'budget_comparison':
            visualizations.append(self.create_grouped_bar_chart(data))
            visualizations.append(self.create_bullet_chart(data))

        return visualizations

    def create_pie_chart(self, data: DataFrame) -> Dict:
        """Create pie chart configuration"""

        return {
            'type': 'pie',
            'title': 'Spending by Category',
            'data': {
                'labels': data['category'].tolist(),
                'datasets': [{
                    'data': data['amount'].tolist(),
                    'backgroundColor': self.generate_colors(len(data))
                }]
            },
            'options': {
                'responsive': True,
                'plugins': {
                    'legend': {
                        'position': 'right'
                    },
                    'tooltip': {
                        'callbacks': {
                            'label': 'function(context) { return context.label + ": $" + context.parsed.toFixed(2) }'
                        }
                    }
                }
            }
        }

    def create_line_chart(self, data: DataFrame) -> Dict:
        """Create line chart for trends"""

        return {
            'type': 'line',
            'title': 'Spending Trend',
            'data': {
                'labels': data['date'].dt.strftime('%b %d').tolist(),
                'datasets': [{
                    'label': 'Daily Spending',
                    'data': data['amount'].tolist(),
                    'borderColor': 'rgb(75, 192, 192)',
                    'backgroundColor': 'rgba(75, 192, 192, 0.2)',
                    'tension': 0.4
                }]
            },
            'options': {
                'responsive': True,
                'plugins': {
                    'title': {
                        'display': True,
                        'text': 'Daily Spending Trend'
                    }
                },
                'scales': {
                    'y': {
                        'beginAtZero': True,
                        'ticks': {
                            'callback': 'function(value) { return "$" + value.toFixed(0) }'
                        }
                    }
                }
            }
        }
```

### 6. Natural Language Generation

```python
async def generate_narrative(
    self,
    question: str,
    analysis: Dict,
    insights: List[Dict],
    recommendations: List[Dict],
    visualizations: List[Dict]
) -> str:
    """Generate natural language response"""

    prompt = f"""
    Generate a comprehensive financial analysis response:

    User Question: {question}

    Analysis Summary:
    {json.dumps(analysis['summary'], indent=2)}

    Key Insights:
    {json.dumps(insights, indent=2)}

    Recommendations:
    {json.dumps(recommendations, indent=2)}

    Create a response that:
    1. Directly answers the question first
    2. Highlights the most important findings
    3. Explains trends and patterns in simple terms
    4. Provides specific, actionable next steps
    5. Uses encouraging and supportive language

    Format with markdown headers and bullet points.
    Include specific numbers and percentages.
    Keep paragraphs short and scannable.
    """

    response = await self.client.chat.completions.create(
        model="gpt-4-0125-preview",
        messages=[
            {"role": "system", "content": NARRATIVE_GENERATION_PROMPT},
            {"role": "user", "content": prompt}
        ],
        temperature=0.8,
        max_tokens=2000
    )

    narrative = response.choices[0].message.content

    # Post-process narrative
    narrative = self.enhance_narrative(narrative, analysis)

    return narrative

def enhance_narrative(self, narrative: str, analysis: Dict) -> str:
    """Enhance narrative with dynamic elements"""

    # Add emoji for key metrics
    narrative = self.add_metric_emoji(narrative)

    # Highlight important numbers
    narrative = self.highlight_numbers(narrative)

    # Add comparison context
    narrative = self.add_comparisons(narrative, analysis)

    return narrative
```

## Output Generation

### Complete Output Structure

```json
{
    "answer_markdown": "## Budget Analysis for January\n\nYou've spent **$988.68** out of your **$950** budget this month, putting you **$38.68 over budget** (104% utilization).\n\n### Category Breakdown\n\n📗 **Under Budget:**\n- Groceries: $487.23 / $500 (97% used)\n- Transportation: $189.00 / $250 (76% used)\n\n📕 **Over Budget:**\n- Dining: $312.45 / $200 (156% used) - $112.45 over\n\n### Insights\n\n1. **Dining Overspend**: Your restaurant spending is 56% over budget. This is your biggest budget variance.\n2. **Good Grocery Control**: You're managing grocery spending well, staying just under budget.\n3. **Transportation Savings**: You have $61 remaining in transportation budget.\n\n### Recommendations\n\n1. **Immediate Action**: Avoid dining out for the rest of the month to prevent further overspending.\n2. **Next Month**: Consider increasing dining budget to $250 if this is a regular pattern.\n3. **Opportunity**: Transfer the $61 transportation surplus to cover part of the dining deficit.",

    "ui_blocks": [
        {
            "type": "metric_card",
            "title": "Budget Status",
            "metrics": [
                {
                    "label": "Total Spent",
                    "value": "$988.68",
                    "change": "+$38.68",
                    "change_type": "negative"
                },
                {
                    "label": "Budget",
                    "value": "$950.00",
                    "subtitle": "Monthly limit"
                },
                {
                    "label": "Remaining Days",
                    "value": "11",
                    "subtitle": "Until month end"
                }
            ]
        },
        {
            "type": "progress_bars",
            "title": "Category Budget Usage",
            "items": [
                {
                    "label": "Groceries",
                    "current": 487.23,
                    "target": 500,
                    "percentage": 97,
                    "color": "green"
                },
                {
                    "label": "Dining",
                    "current": 312.45,
                    "target": 200,
                    "percentage": 156,
                    "color": "red"
                },
                {
                    "label": "Transportation",
                    "current": 189,
                    "target": 250,
                    "percentage": 76,
                    "color": "green"
                }
            ]
        },
        {
            "type": "chart",
            "chart_type": "doughnut",
            "title": "Spending Distribution",
            "data": {
                "labels": ["Groceries", "Dining", "Transportation"],
                "datasets": [{
                    "data": [487.23, 312.45, 189.00],
                    "backgroundColor": ["#10B981", "#EF4444", "#3B82F6"]
                }]
            }
        }
    ],

    "computations": [
        {
            "name": "total_spent",
            "value": 988.68,
            "formula": "SUM(all_category_spending)",
            "unit": "USD"
        },
        {
            "name": "budget_variance",
            "value": -38.68,
            "formula": "budget - total_spent",
            "unit": "USD"
        },
        {
            "name": "utilization_rate",
            "value": 104.07,
            "formula": "(total_spent / budget) * 100",
            "unit": "percentage"
        },
        {
            "name": "daily_average",
            "value": 49.43,
            "formula": "total_spent / days_elapsed",
            "unit": "USD"
        },
        {
            "name": "projected_month_end",
            "value": 1533.33,
            "formula": "daily_average * days_in_month",
            "unit": "USD"
        }
    ],

    "insights": [
        {
            "type": "warning",
            "title": "Budget Exceeded",
            "description": "You're over budget with 11 days remaining",
            "severity": "high",
            "confidence": 0.95
        },
        {
            "type": "pattern",
            "title": "Dining Trend",
            "description": "Dining expenses increased 45% from last month",
            "severity": "medium",
            "confidence": 0.88
        },
        {
            "type": "opportunity",
            "title": "Savings Available",
            "description": "$61 unused in transportation budget",
            "severity": "low",
            "confidence": 0.92
        }
    ],

    "recommendations": [
        {
            "priority": 1,
            "type": "immediate",
            "title": "Pause Dining Out",
            "action": "Avoid restaurants for the next 11 days",
            "impact": "Save $112.45",
            "effort": "medium"
        },
        {
            "priority": 2,
            "type": "adjustment",
            "title": "Reallocate Budget",
            "action": "Move $50 from transportation to dining next month",
            "impact": "Better alignment with spending patterns",
            "effort": "low"
        }
    ],

    "confidence_score": 0.94,
    "data_quality": "high",
    "data_completeness": 1.0,
    "caveats": [],

    "metadata": {
        "analysis_timestamp": "2024-01-20T10:30:45Z",
        "model_version": "1.2.0",
        "computation_time_ms": 1523
    }
}
```

## Confidence Scoring

### Confidence Calculation

```python
class ConfidenceScorer:
    """Calculate confidence scores for model outputs"""

    def calculate_confidence(
        self,
        question: str,
        sql_result: Dict,
        analysis: Dict,
        output: Dict
    ) -> float:
        """Calculate overall confidence score"""

        scores = {
            'data_quality': self.assess_data_quality(sql_result),
            'data_completeness': self.assess_completeness(sql_result),
            'analysis_robustness': self.assess_analysis(analysis),
            'output_consistency': self.assess_output(output),
            'temporal_relevance': self.assess_recency(sql_result)
        }

        weights = {
            'data_quality': 0.3,
            'data_completeness': 0.2,
            'analysis_robustness': 0.2,
            'output_consistency': 0.2,
            'temporal_relevance': 0.1
        }

        weighted_score = sum(scores[k] * weights[k] for k in scores)

        return round(weighted_score, 2)

    def assess_data_quality(self, sql_result: Dict) -> float:
        """Assess quality of input data"""

        score = 1.0

        # Penalize for missing data
        if sql_result['row_count'] == 0:
            return 0.0

        # Check for nulls
        null_count = sum(1 for row in sql_result['data']
                        for value in row.values()
                        if value is None)
        null_ratio = null_count / (sql_result['row_count'] * len(sql_result['columns']))
        score -= null_ratio * 0.5

        # Check for data anomalies
        # ... additional checks

        return max(0, score)
```

## Error Handling

### Graceful Degradation

```python
async def handle_modeling_error(self, error: Exception, request: Dict) -> Dict:
    """Handle errors gracefully with fallback responses"""

    error_type = type(error).__name__

    if error_type == 'InsufficientDataError':
        return self.generate_insufficient_data_response(request)

    elif error_type == 'CalculationError':
        return self.generate_calculation_error_response(request, error)

    elif error_type == 'LLMError':
        return self.generate_fallback_response(request)

    else:
        return self.generate_generic_error_response(error)

def generate_insufficient_data_response(self, request: Dict) -> Dict:
    """Generate response when data is insufficient"""

    return {
        'answer_markdown': f"""
        ## Limited Data Available

        I don't have enough data to fully answer your question: "{request['question']}"

        ### What I Found:
        - Data period: Limited or no transactions found
        - You may need to connect more accounts or wait for transactions to sync

        ### What You Can Do:
        1. Make sure all your accounts are connected
        2. Check if transactions are still syncing
        3. Try asking about a different time period

        Would you like me to help you connect accounts or check sync status?
        """,
        'ui_blocks': [],
        'computations': [],
        'confidence_score': 0.3,
        'data_quality': 'insufficient'
    }
```

## Performance Optimization

### Caching Strategy

```python
class ModelingCache:
    """Cache modeling results for performance"""

    def __init__(self, ttl_seconds: int = 300):
        self.cache = {}
        self.ttl = ttl_seconds

    def get_cached_analysis(self, cache_key: str) -> Optional[Dict]:
        """Get cached analysis if available and fresh"""

        if cache_key in self.cache:
            cached_data, timestamp = self.cache[cache_key]
            if time.time() - timestamp < self.ttl:
                return cached_data

        return None

    def cache_analysis(self, cache_key: str, analysis: Dict):
        """Cache analysis results"""

        self.cache[cache_key] = (analysis, time.time())
```

### Parallel Processing

```python
async def process_parallel(self, request: Dict) -> Dict:
    """Process multiple analyses in parallel"""

    tasks = [
        self.analyze_spending(request),
        self.generate_insights(request),
        self.create_visualizations(request),
        self.generate_recommendations(request)
    ]

    results = await asyncio.gather(*tasks, return_exceptions=True)

    return self.merge_results(results)
```

## Advanced Features

### Scenario Modeling

```python
async def model_scenario(self, scenario: Dict, profile_pack: Dict) -> Dict:
    """Model financial scenarios"""

    scenario_types = {
        'budget_change': self.model_budget_change,
        'income_change': self.model_income_change,
        'expense_reduction': self.model_expense_reduction,
        'investment_return': self.model_investment_return,
        'debt_payoff': self.model_debt_payoff
    }

    handler = scenario_types.get(scenario['type'])
    if not handler:
        raise ValueError(f"Unknown scenario type: {scenario['type']}")

    return await handler(scenario, profile_pack)
```

### Predictive Analysis

```python
def predict_future_spending(self, historical_data: DataFrame) -> Dict:
    """Predict future spending using time series analysis"""

    # Prepare time series
    ts = historical_data.set_index('date')['amount']

    # Decompose time series
    decomposition = seasonal_decompose(ts, model='additive', period=30)

    # ARIMA model for prediction
    model = ARIMA(ts, order=(1, 1, 1))
    model_fit = model.fit()

    # Forecast
    forecast = model_fit.forecast(steps=30)

    return {
        'forecast': forecast.tolist(),
        'trend': decomposition.trend.tolist(),
        'seasonal': decomposition.seasonal.tolist(),
        'confidence_interval': model_fit.forecast(steps=30, alpha=0.05)
    }
```

---

**Next Document**: [08_CRITIQUE_VALIDATION.md](./08_CRITIQUE_VALIDATION.md) - Complete critique agent and validation system