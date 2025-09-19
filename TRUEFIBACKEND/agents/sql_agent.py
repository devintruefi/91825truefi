# TRUEFIBACKEND/agents/sql_agent.py
# SQL Agent - generates PostgreSQL queries

import openai
from typing import Dict, Any, Optional
import json
import logging
from config import config
from validation.schemas import SQLRequestSchema, SQLResponseSchema
from validation.validate import validate_json

logger = logging.getLogger(__name__)

class SQLAgent:
    """SQL Agent responsible for generating PostgreSQL queries"""

    def __init__(self):
        self.client = openai.AsyncOpenAI(api_key=config.OPENAI_API_KEY)
        self.system_prompt = self._load_system_prompt()

    def _load_system_prompt(self) -> str:
        """Load system prompt from file"""
        try:
            with open('prompts/common_system.md', 'r') as f:
                common = f.read()
            with open('prompts/sql_agent_system.md', 'r') as f:
                specific = f.read()
            return f"{common}\n\n{specific}"
        except Exception as e:
            logger.error(f"Failed to load system prompt: {e}")
            return "You are a SQL agent responsible for generating safe PostgreSQL queries."

    async def generate_query(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Generate SQL query based on request"""
        try:
            # Validate input
            is_valid, validated_request, error = validate_json(request, SQLRequestSchema)
            if not is_valid:
                return {'error': f'Invalid request: {error}'}

            # Build user message
            user_message = self._build_user_message(validated_request)

            # Call OpenAI
            response = await self.client.chat.completions.create(
                model=config.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": user_message}
                ],
                temperature=config.OPENAI_TEMPERATURE,
                max_tokens=config.OPENAI_MAX_TOKENS
            )

            # Parse response
            content = response.choices[0].message.content
            result = self._parse_response(content)

            # Validate output
            is_valid, validated_output, error = validate_json(result, SQLResponseSchema)
            if not is_valid:
                return {'error': f'Invalid agent output: {error}'}

            return validated_output.dict()

        except Exception as e:
            logger.error(f"SQL Agent error: {e}")
            return {'error': str(e)}

    def _build_user_message(self, request: SQLRequestSchema) -> str:
        """Build user message for the LLM"""
        schema_card_json = json.dumps(request.schema_card, indent=2)
        context_json = json.dumps(request.context, indent=2)
        constraints_json = json.dumps(request.constraints, indent=2)

        return f"""
**Question:** {request.question}

**Schema Card:**
```json
{schema_card_json}
```

**Context:**
```json
{context_json}
```

**Constraints:**
```json
{constraints_json}
```

Generate a PostgreSQL query to answer this question. Follow all security rules and always filter by user_id.

Return your response as JSON in the exact format specified in the system prompt.
"""

    def _parse_response(self, content: str) -> Dict[str, Any]:
        """Parse LLM response to extract JSON"""
        try:
            # Try to extract JSON from code blocks
            if '```json' in content:
                start = content.find('```json') + 7
                end = content.find('```', start)
                json_content = content[start:end].strip()
            elif '```' in content:
                start = content.find('```') + 3
                end = content.find('```', start)
                json_content = content[start:end].strip()
            else:
                json_content = content.strip()

            # Parse JSON
            return json.loads(json_content)

        except Exception as e:
            logger.error(f"Failed to parse SQL agent response: {e}")
            # Fallback response
            return {
                'sql': 'SELECT COUNT(*) as error FROM transactions WHERE user_id = %(user_id)s LIMIT 1',
                'params': {'user_id': 'unknown'},
                'justification': f'Failed to parse response: {str(e)}'
            }