# TRUEFIBACKEND/agents/intelligent_orchestrator.py
# Intelligent orchestrator that uses reasoning to delegate to appropriate agents

import logging
import time
from typing import Dict, Any, List, Optional, Tuple
from openai import OpenAI
from config import Config
import json

logger = logging.getLogger(__name__)

class IntelligentOrchestrator:
    """
    Orchestrator that uses LLM reasoning to understand queries and delegate to appropriate agents
    No regex, no hardcoding - pure reasoning and delegation
    """

    def __init__(self):
        self.client = OpenAI(api_key=Config.OPENAI_API_KEY)
        self.available_agents = self._initialize_agents()

    def _initialize_agents(self) -> Dict[str, Any]:
        """Initialize and register available agents with their capabilities"""
        agents = {}

        # SQL Agent - for database queries
        try:
            from agents.sql_agent_enhanced import EnhancedSQLAgent
            agents['sql'] = {
                'instance': EnhancedSQLAgent(),
                'capabilities': 'Database queries, transaction searches, balance lookups, spending analysis',
                'when_to_use': 'When user needs data from the database'
            }
        except ImportError:
            from agents import SQLAgent
            agents['sql'] = {
                'instance': SQLAgent(),
                'capabilities': 'Basic database queries',
                'when_to_use': 'When user needs data from the database'
            }

        # Modeling Agent - for analysis and insights
        try:
            from agents import ModelingAgent
            agents['modeling'] = {
                'instance': ModelingAgent(),
                'capabilities': 'Financial modeling, projections, personalized insights, calculations',
                'when_to_use': 'When user needs analysis, insights, or calculations based on data'
            }
        except ImportError:
            pass

        # Critique Agent - for validation
        try:
            from agents import CritiqueAgent
            agents['critique'] = {
                'instance': CritiqueAgent(),
                'capabilities': 'Validate responses, check accuracy, ensure quality',
                'when_to_use': 'To validate and improve responses before sending to user'
            }
        except ImportError:
            pass

        # Merchant Resolver - for merchant name normalization
        try:
            from agents.merchant_resolver import resolve_merchants
            agents['merchant_resolver'] = {
                'instance': resolve_merchants,  # Function, not class
                'capabilities': 'Normalize merchant names, fuzzy matching, resolve variations',
                'when_to_use': 'When user mentions specific merchants or stores'
            }
        except ImportError:
            pass

        # Search Builder - for complex transaction searches
        try:
            from agents.search_builder import SearchQueryBuilder
            agents['search_builder'] = {
                'instance': SearchQueryBuilder(),
                'capabilities': 'Build complex SQL for natural language transaction searches',
                'when_to_use': 'When user wants to search for specific transactions with multiple filters'
            }
        except ImportError:
            pass

        logger.info(f"Initialized {len(agents)} agents: {list(agents.keys())}")
        return agents

    async def process_question(
        self,
        user_id: str,
        question: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Process user question by reasoning about it and delegating to appropriate agents
        """
        start_time = time.time()

        try:
            # Step 1: Understand the question and create an execution plan
            execution_plan = await self._create_execution_plan(question, user_id)
            logger.info(f"Execution plan: {execution_plan}")

            # Step 2: Execute the plan by calling appropriate agents in sequence
            result = await self._execute_plan(execution_plan, user_id, question, context)

            # Step 3: Format and return the response
            execution_time = (time.time() - start_time) * 1000
            return {
                'answer': result.get('answer', 'I was unable to process your question'),
                'data': result.get('data'),
                'execution_plan': execution_plan,
                'execution_time_ms': execution_time,
                'confidence': result.get('confidence', 0.8)
            }

        except Exception as e:
            logger.error(f"Intelligent orchestrator error: {e}")
            return {
                'error': str(e),
                'execution_time_ms': (time.time() - start_time) * 1000
            }

    async def _create_execution_plan(self, question: str, user_id: str) -> Dict[str, Any]:
        """
        Use LLM to create an execution plan for the question
        """
        system_prompt = f"""You are an intelligent task planner for a financial assistant system.

## Available Agents and Their Capabilities:
{self._format_agent_capabilities()}

## Your Task:
Analyze the user's question and create an execution plan that:
1. Identifies what the user wants to know (intent)
2. Determines which agents to use and in what order
3. Specifies what each agent should do
4. Identifies any entities that need to be extracted (merchants, dates, amounts)

## Output Format (JSON):
{{
    "intent": "Clear description of what user wants",
    "reasoning": "Your reasoning about the question",
    "steps": [
        {{
            "agent": "agent_name",
            "action": "specific action for this agent",
            "input": "what to pass to the agent",
            "depends_on": "previous_step_id or null"
        }}
    ],
    "entities": {{
        "merchants": ["extracted merchants"],
        "dates": {{"from": "date", "to": "date"}},
        "categories": ["categories"],
        "amounts": [{{"op": "gt/lt/eq", "value": 100}}]
    }},
    "confidence": 0.0-1.0
}}

## Important:
- Think step by step about what needs to happen
- Most queries need: 1) Get data (SQL), 2) Analyze it (Modeling), 3) Validate (Critique)
- For merchant queries, use merchant_resolver first to normalize names
- Be specific about what each agent should do
"""

        user_prompt = f"User question: {question}"

        response = self.client.chat.completions.create(
            model=Config.PLANNER_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.1,
            max_tokens=1000
        )

        content = response.choices[0].message.content.strip()
        return self._parse_json_response(content)

    async def _execute_plan(
        self,
        plan: Dict[str, Any],
        user_id: str,
        question: str,
        context: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Execute the plan by calling agents in sequence
        """
        results = {}

        for step in plan.get('steps', []):
            agent_name = step.get('agent')
            action = step.get('action')

            if agent_name not in self.available_agents:
                logger.warning(f"Agent {agent_name} not available, skipping")
                continue

            agent_info = self.available_agents[agent_name]
            agent = agent_info['instance']

            # Prepare input based on agent type and previous results
            agent_input = self._prepare_agent_input(
                agent_name, action, user_id, question,
                plan.get('entities', {}), results, context
            )

            # Execute agent
            try:
                if agent_name == 'sql':
                    result = await agent.generate_query(agent_input)
                elif agent_name == 'modeling':
                    result = await agent.generate_analysis(agent_input)
                elif agent_name == 'critique':
                    result = await agent.validate_response(agent_input)
                elif agent_name == 'merchant_resolver':
                    # This is a function, not a class method
                    result = agent(agent_input['connection'], user_id, agent_input['merchants'])
                elif agent_name == 'search_builder':
                    result = agent.parse_search_query(question, user_id)
                else:
                    result = {'error': f'Unknown agent execution method for {agent_name}'}

                results[agent_name] = result
                logger.info(f"Executed {agent_name}: {action}")

            except Exception as e:
                logger.error(f"Agent {agent_name} failed: {e}")
                results[agent_name] = {'error': str(e)}

        # Compile final answer from results
        return self._compile_final_answer(results, plan)

    def _prepare_agent_input(
        self,
        agent_name: str,
        action: str,
        user_id: str,
        question: str,
        entities: Dict,
        previous_results: Dict,
        context: Optional[Dict]
    ) -> Dict[str, Any]:
        """
        Prepare appropriate input for each agent based on its requirements
        """
        base_input = {
            'user_id': user_id,
            'question': question,
            'context': context or {}
        }

        if agent_name == 'sql':
            # SQL agent needs schema and context
            base_input['entities'] = entities
            if 'merchant_resolver' in previous_results:
                base_input['resolved_merchants'] = previous_results['merchant_resolver']
        elif agent_name == 'modeling':
            # Modeling agent needs SQL results
            base_input['sql_result'] = previous_results.get('sql', {})
        elif agent_name == 'critique':
            # Critique agent needs both SQL and modeling results
            base_input['sql_result'] = previous_results.get('sql', {})
            base_input['model_result'] = previous_results.get('modeling', {})
        elif agent_name == 'merchant_resolver':
            # Merchant resolver needs connection and merchant list
            base_input['merchants'] = entities.get('merchants', [])
            # Note: connection would need to be provided by context

        return base_input

    def _compile_final_answer(self, results: Dict, plan: Dict) -> Dict[str, Any]:
        """
        Compile the final answer from all agent results
        """
        # Get the final modeling result if available
        if 'modeling' in results and 'answer' in results['modeling']:
            answer = results['modeling']['answer']
        elif 'sql' in results and 'results' in results['sql']:
            # Fallback to raw SQL results
            answer = f"Here are your results: {results['sql']['results']}"
        else:
            answer = "I was unable to process your question completely."

        return {
            'answer': answer,
            'data': results.get('sql', {}).get('results'),
            'insights': results.get('modeling', {}).get('insights'),
            'validation': results.get('critique', {}).get('status'),
            'confidence': plan.get('confidence', 0.8)
        }

    def _format_agent_capabilities(self) -> str:
        """Format agent capabilities for the prompt"""
        lines = []
        for name, info in self.available_agents.items():
            lines.append(f"- {name}: {info['capabilities']}")
            lines.append(f"  Use when: {info['when_to_use']}")
        return "\n".join(lines)

    def _parse_json_response(self, content: str) -> Dict[str, Any]:
        """Parse JSON from LLM response"""
        try:
            if content.startswith("```json"):
                content = content[7:]
            if content.startswith("```"):
                content = content[3:]
            if content.endswith("```"):
                content = content[:-3]
            return json.loads(content.strip())
        except json.JSONDecodeError:
            logger.error(f"Failed to parse JSON: {content[:200]}")
            # Return a basic plan
            return {
                "intent": "unknown",
                "steps": [{"agent": "sql", "action": "get data"}],
                "confidence": 0.5
            }