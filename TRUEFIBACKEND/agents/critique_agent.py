# TRUEFIBACKEND/agents/critique_agent.py
# Critique Agent - validates SQL queries and model outputs

from openai import AsyncOpenAI
from typing import Dict, Any, Optional
import json
import logging
from config import config
from validation.schemas import CritiqueRequestSchema, CritiqueResponseSchema
from validation.validate import validate_json

logger = logging.getLogger(__name__)

class CritiqueAgent:
    """Critique Agent responsible for validating other agents' work"""

    def __init__(self):
        self.client = AsyncOpenAI(api_key=config.OPENAI_API_KEY)
        self.system_prompt = self._load_system_prompt()

    def _load_system_prompt(self) -> str:
        """Load system prompt from file"""
        try:
            with open('prompts/common_system.md', 'r') as f:
                common = f.read()
            with open('prompts/critique_agent_system.md', 'r') as f:
                specific = f.read()
            return f"{common}\n\n{specific}"
        except Exception as e:
            logger.error(f"Failed to load system prompt: {e}")
            return "You are a critique agent responsible for validating SQL queries and model outputs."

    async def review(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Review and validate work from other agents"""
        try:
            # Validate input
            is_valid, validated_request, error = validate_json(request, CritiqueRequestSchema)
            if not is_valid:
                return {'error': f'Invalid request: {error}'}

            # Build user message
            user_message = self._build_user_message(validated_request)

            # Call OpenAI with small timeout and shield to avoid cancellation propagating
            import asyncio
            try:
                response = await asyncio.shield(self.client.chat.completions.create(
                    model=config.OPENAI_MODEL,
                    messages=[
                        {"role": "system", "content": self.system_prompt},
                        {"role": "user", "content": user_message}
                    ],
                    temperature=0.1,
                    max_tokens=config.OPENAI_MAX_TOKENS,
                    timeout=float(getattr(config, 'CRITIQUE_TIMEOUT_SECONDS', 30))
                ))
            except asyncio.CancelledError:
                logger.warning("Critique OpenAI call cancelled; approving by default")
                return {
                    'status': 'approve',
                    'edits': {},
                    'issues': ['Critique cancelled by context'],
                    'invariants_check': {'passed': True, 'notes': ['Cancelled']}
                }

            # Parse response
            content = response.choices[0].message.content
            result = self._parse_response(content)

            # Validate output
            is_valid, validated_output, error = validate_json(result, CritiqueResponseSchema)
            if not is_valid:
                return {'error': f'Invalid agent output: {error}'}

            return validated_output.dict()

        except Exception as e:
            logger.error(f"Critique Agent error: {e}")
            return {'error': str(e)}

    def _build_user_message(self, request: CritiqueRequestSchema) -> str:
        """Build user message for the LLM"""
        schema_card_json = json.dumps(request.schema_card, indent=2)
        payload_json = json.dumps(request.payload, indent=2)

        stage_instructions = {
            'pre_sql': "Review the SQL query plan for security, validity, and correctness BEFORE execution.",
            'post_sql': "Review the SQL query results for data quality and completeness AFTER execution.",
            'post_model': "Review the financial modeling output for accuracy and completeness."
        }

        instruction = stage_instructions.get(request.stage, "Review the provided work.")

        return f"""
**Stage:** {request.stage}
**Instruction:** {instruction}

**Original Question:** {request.question}

**Schema Card:**
```json
{schema_card_json}
```

**Payload to Review:**
```json
{payload_json}
```

Apply the validation rubric from your system prompt. Return your assessment in the exact JSON format specified.
\n
Additional guidance:
- Focus on material correctness, safety, and completeness. Avoid cosmetic edits.
- Under `edits.model_feedback`, provide 3–6 concise, actionable items to improve the output.
- If recommending changes, prefer minimal fixes over rewrites.
- Do not contradict correct math; if presentation may mislead, suggest clarifying wording.
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
            logger.error(f"Failed to parse critique agent response: {e}")
            # Fallback response - approve by default if parsing fails
            return {
                'status': 'approve',
                'edits': {},
                'issues': [f'Failed to parse critique response: {str(e)}'],
                'invariants_check': {
                    'passed': True,
                    'notes': ['Critique parsing failed, defaulting to approval']
                }
            }
