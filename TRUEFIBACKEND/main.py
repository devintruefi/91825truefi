# TRUEFIBACKEND/main.py
# Enterprise-grade FastAPI backend with Agentic Framework for TrueFi Financial Advisor.
# Features: JWT auth, async OpenAI calls, DB pooling, multi-agent orchestration.
# Scalable: Multi-user, async, expandable agent framework.

import uuid
import logging
import json
import traceback
from datetime import datetime
from typing import Optional, Dict, List
from dotenv import load_dotenv
import os
from fastapi import FastAPI, Request, HTTPException, Depends, status, Body
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
import jwt
from pydantic import BaseModel
import openai
import psycopg2
from psycopg2.pool import ThreadedConnectionPool
import asyncio
import bcrypt
import time # Added for time.time()

# Import the Simplified LLM-driven Agentic Framework v3.0
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from agents.simple_supervisor_agent import SimpleSupervisorAgent
from agents.sql_agent_simple import SimpleSQLAgent
from agents.base_agent import BaseAgent
from agents.utils.schema_registry import SchemaRegistry

load_dotenv()

# Config
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
DATABASE_URL = os.getenv("DATABASE_URL")
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key")

# Enhanced Logging Configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),  # Console output
        logging.FileHandler('agent_execution.log')  # File output
    ]
)
logger = logging.getLogger(__name__)

# Set specific loggers to DEBUG for detailed tracing
logging.getLogger("agents.simple_supervisor_agent").setLevel(logging.DEBUG)
logging.getLogger("agents.sql_agent_simple").setLevel(logging.DEBUG)
logging.getLogger("agents.base_agent").setLevel(logging.DEBUG)

# Async OpenAI
client = openai.AsyncOpenAI(api_key=OPENAI_API_KEY)

# DB pool with better configuration
try:
    db_pool = ThreadedConnectionPool(
        minconn=1,
        maxconn=10,
        dsn=DATABASE_URL,
        keepalives_idle=30,
        keepalives_interval=10,
        keepalives_count=5
    )
    logger.info("Database connection pool initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize database pool: {e}")
    db_pool = None

app = FastAPI(title="TrueFi Chatbot Backend")

# Health check endpoint
@app.get("/health")
async def health_check():
    try:
        if db_pool is None:
            return {"status": "error", "message": "Database pool not initialized"}
        
        conn = db_pool.getconn()
        if conn is None:
            return {"status": "error", "message": "Cannot get database connection"}
        
        cur = conn.cursor()
        cur.execute("SELECT 1")
        cur.fetchone()
        cur.close()
        db_pool.putconn(conn)
        
        # Check if agents are initialized
        agent_status = "not initialized"
        if supervisor_agent is not None:
            agent_status = "simplified-llm-driven"
        
        return {
            "status": "healthy", 
            "database": "connected",
            "agent_system": agent_status,
            "version": "2.0.0"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {"status": "error", "message": str(e)}

# CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://your-domain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer(auto_error=False)  # Make authentication optional

class MessageInput(BaseModel):
    message: str
    session_id: Optional[str] = None
    conversation_history: Optional[List[Dict]] = []

class EndSessionInput(BaseModel):
    session_id: str

class LoginInput(BaseModel):
    email: str
    password: str

# Global agent variables
supervisor_agent = None
sql_agent = None

async def authenticate(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    """Optional authentication - returns user_id if authenticated, None if not"""
    if credentials is None:
        return None
    
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        # Handle both 'userId' and 'user_id' formats
        user_id = payload.get("userId") or payload.get("user_id")
        if user_id is None:
            return None
        return user_id
    except jwt.ExpiredSignatureError:
        return None
    except jwt.JWTError:
        return None

def get_db_cursor():
    """Get database cursor and connection"""
    if db_pool is None:
        raise HTTPException(status_code=500, detail="Database not available")
    
    conn = db_pool.getconn()
    if conn is None:
        raise HTTPException(status_code=500, detail="Cannot get database connection")
    
    cur = conn.cursor()
    return cur, conn

# Traditional system prompt for non-authenticated users
SYSTEM_PROMPT = """You are Penny, a friendly and knowledgeable financial assistant for TrueFi. You help users with general financial questions, budgeting advice, and financial education.

Your role is to:
- Provide clear, helpful financial guidance
- Explain financial concepts in simple terms
- Offer budgeting tips and strategies
- Help users understand their financial situation
- Be encouraging and non-judgmental

Remember: You're here to help users feel more confident about their finances."""

def initialize_agents():
    """Initialize the agentic framework"""
    global supervisor_agent, sql_agent
    
    if supervisor_agent is not None:
        return  # Already initialized
    
    try:
        # Initialize schema registry with db_pool
        schema_registry = SchemaRegistry(db_pool)
        
        # Initialize SQL agent with openai client and db_pool
        sql_agent = SimpleSQLAgent(
            openai_client=client,
            db_pool=db_pool
        )
        
        # Initialize supervisor agent with openai client and db_pool
        supervisor_agent = SimpleSupervisorAgent(
            openai_client=client,
            db_pool=db_pool
        )
        
        logger.info("Agentic framework initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize agents: {e}")
        logger.error(f"Full traceback: {traceback.format_exc()}")
        supervisor_agent = None
        sql_agent = None

# Chat endpoint for non-authenticated users (basic functionality)
@app.post("/chat/public")
async def chat_public(input: MessageInput):
    """Public chat endpoint for non-authenticated users - uses basic OpenAI chat"""
    try:
        # Simple conversation history handling with validation
        conversation_history = input.conversation_history or []
        
        # Validate and clean conversation history
        valid_history = []
        for msg in conversation_history:
            if isinstance(msg, dict) and 'role' in msg and 'content' in msg:
                if msg['role'] in ['user', 'assistant'] and msg['content']:
                    valid_history.append(msg)
        
        # Prepare messages for OpenAI - ensure we always have valid structure
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT}
        ]
        
        # Add valid conversation history
        if valid_history:
            messages.extend(valid_history)
        
        # Add current user message
        messages.append({"role": "user", "content": input.message})

        # Async OpenAI call
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            max_tokens=1800,
            temperature=0.7,
            presence_penalty=0.6,
            frequency_penalty=0.3,
        )
        
        bot_message = response.choices[0].message.content
        
        return {
            "message": bot_message,
            "session_id": input.session_id,
            "agent_used": "basic_openai",
            "requires_auth": False
        }
        
    except Exception as e:
        logger.error(f"Public chat error: {e}")
        raise HTTPException(status_code=500, detail="Chat service temporarily unavailable")

# Chat endpoint using Agentic Framework for authenticated users
@app.post("/chat")
async def chat(input: MessageInput, user_id: Optional[str] = Depends(authenticate), db = Depends(get_db_cursor)):
    """Authenticated chat endpoint with conditional agentic flow"""
    cur, conn = db
    
    # Check if user is authenticated
    if user_id is None:
        # Fall back to basic chat functionality
        return await chat_public(input)
    
    try:
        # Initialize agents if not already done
        initialize_agents()
        
        # Fetch user name and data dump
        user_name = get_user_name(cur, user_id)
        data_dump = get_data_dump(cur, user_id)

        session_id = input.session_id or str(uuid.uuid4())

        # Create session if it doesn't exist
        valid_session_id = create_session(cur, session_id, user_id, conn)

        # Store user message
        store_message(cur, valid_session_id, "user", input.message, conn)

        # Get conversation history
        history = get_history(cur, valid_session_id)
        
        # Convert history to the format expected by the supervisor agent
        conversation_history = []
        for msg in history:
            conversation_history.append({
                'role': msg['role'],
                'content': msg['content']
            })

        # Use the Simplified Supervisor Agent for authenticated users
        logger.info(f"=" * 80)
        logger.info(f"AGENT FRAMEWORK EXECUTION START")
        logger.info(f"User: {user_id} | Name: {user_name} | Session: {session_id}")
        logger.info(f"Query: {input.message}")
        logger.info(f"=" * 80)
        
        try:
            supervisor_result = await supervisor_agent.process(
                query=input.message,
                user_id=user_id,
                user_name=user_name,
                session_id=session_id
            )
            
            # Enhanced logging of results
            logger.info(f"SUPERVISOR RESULT:")
            logger.info(f"  Success: {supervisor_result.get('success')}")
            
            metadata = supervisor_result.get('metadata', {})
            routing_info = metadata.get('routing', {})
            
            logger.info(f"ROUTING DECISION:")
            logger.info(f"  Delegated to: {routing_info.get('delegated_to')}")
            logger.info(f"  Query type: {routing_info.get('query_type')}")
            logger.info(f"  Required agents: {routing_info.get('required_agents')}")
            logger.info(f"  Reasoning: {routing_info.get('reasoning', '')}")
            
            if metadata.get('sql_agent_performance'):
                perf = metadata['sql_agent_performance']
                logger.info(f"SQL AGENT PERFORMANCE:")
                logger.info(f"  Success: {perf.get('success')}")
                logger.info(f"  Row count: {perf.get('row_count')}")
                logger.info(f"  Execution time: {perf.get('execution_time')}s")
            
            if metadata.get('merchant_hints'):
                logger.info(f"ENTITY RESOLUTION:")
                logger.info(f"  Merchant hints: {metadata['merchant_hints']}")
            
            if metadata.get('semantic_interpretation'):
                logger.info(f"SEMANTIC INTERPRETATION: {metadata['semantic_interpretation']}")
            
            logger.info(f"=" * 80)
            logger.info(f"AGENT FRAMEWORK EXECUTION COMPLETE")
            logger.info(f"=" * 80)
            
        except Exception as e:
            logger.error(f"SUPERVISOR AGENT FAILED: {e}")
            logger.error(f"Full traceback: {traceback.format_exc()}")
            # Fallback to traditional OpenAI approach
            supervisor_result = {"success": False, "response": f"Agent error: {str(e)}"}
        
        logger.info(f"Supervisor processed query for user {user_id}")

        # Check if supervisor agent returned results
        if not supervisor_result.get("success"):
            error_msg = supervisor_result.get("response", "An error occurred while processing your request.")
            logger.error(f"Supervisor error for user {user_id}: {error_msg}")
            # Fallback to traditional OpenAI approach
            logger.info("Falling back to traditional OpenAI approach")
            system_content = SYSTEM_PROMPT.format(
                user_name=user_name, 
                data_dump=data_dump, 
                history='\n'.join([f"{msg['role']}: {msg['content']}" for msg in history])
            )
            
            messages = [
                {"role": "system", "content": system_content}
            ] + history + [
                {"role": "user", "content": input.message}
            ]

            # Async OpenAI call
            response = await client.chat.completions.create(
                model="gpt-4o",
                messages=messages,
                max_tokens=1800,
                temperature=0.7,
                presence_penalty=0.6,
                frequency_penalty=0.3,
            )
            
            bot_message = response.choices[0].message.content
        else:
            # Extract the final response from the supervisor
            bot_message = supervisor_result.get("response", "I apologize, but I couldn't generate a response at this time.")
            
            # Log the agent execution for monitoring
            execution_time = supervisor_result.get("metadata", {}).get("execution_time", 0)
            logger.info(f"Dynamic agent execution completed for user {user_id} in {execution_time:.2f}s")

        # Store bot message
        store_message(cur, valid_session_id, "assistant", bot_message, conn)

        # Prepare response with optional metadata
        response_data = {
            "message": bot_message, 
            "session_id": valid_session_id,
            "agent_used": "supervisor_agent" if supervisor_result.get("success") else "fallback_openai",
            "requires_auth": True,
            "user_id": user_id
        }
        
        # Add metadata if available
        if supervisor_result.get("metadata"):
            response_data["metadata"] = supervisor_result["metadata"]
        
        return response_data

    except Exception as e:
        logger.error(f"Chat error for user {user_id}: {e}")
        logger.error(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Chat service temporarily unavailable")
    finally:
        if conn:
            db_pool.putconn(conn)

# End session endpoint using Agentic Framework
@app.post("/end-session")
async def end_session(input: EndSessionInput, user_id: str = Depends(authenticate), db = Depends(get_db_cursor)):
    cur, conn = db
    try:
        # Initialize agents if not already done
        initialize_agents()
        
        session_id = input.session_id
        
        # Get full history
        history = get_history(cur, session_id)
        data_dump = get_data_dump(cur, user_id)
        user_name = get_user_name(cur, user_id)

        # Convert history to the format expected by the supervisor agent
        conversation_history = []
        for msg in history:
            conversation_history.append({
                'role': msg['role'],
                'content': msg['content']
            })

        # Try to use the Dynamic Supervisor Agent for session analysis
        analysis_query = "Analyze this conversation session and provide comprehensive insights about the user's financial situation, key topics discussed, and actionable recommendations."
        
        try:
            supervisor_result = await supervisor_agent.process(
                query=analysis_query,
                user_id=user_id,
                user_name=user_name,
                session_id=session_id
            )
            logger.info(f"Supervisor analyzed session for user {user_id}")

            # Check if dynamic supervisor agent returned results
            if supervisor_result.get("success"):
                # Extract the analysis from the supervisor
                analysis_content = supervisor_result.get("response", "")
                
                # Try to parse structured data from the response
                try:
                    # Try to extract JSON from the analysis if it contains structured data
                    analysis = {
                        "summary": analysis_content[:500] + "..." if len(analysis_content) > 500 else analysis_content,
                        "sentiment_analysis": {"overall": "neutral", "confidence": 0.5},
                        "key_topics": ["financial planning", "session analysis"],
                        "action_items": [],
                        "goals_identified": [],
                        "risk_assessment": "low",
                        "next_steps": "Continue with regular financial planning sessions.",
                        "confidence_score": 0.5
                    }
                except Exception as e:
                    logger.error(f"Failed to parse analysis content: {e}")
                    # Create a fallback analysis
                    analysis = {
                        "summary": analysis_content[:500] + "..." if len(analysis_content) > 500 else analysis_content,
                        "sentiment_analysis": {"overall": "neutral", "confidence": 0.5},
                        "key_topics": ["financial discussion"],
                        "action_items": [],
                        "goals_identified": [],
                        "risk_assessment": "low",
                        "next_steps": "Continue with regular financial planning sessions.",
                        "confidence_score": 0.5
                    }
            else:
                raise Exception("Agent analysis failed")
                
        except Exception as agent_error:
            logger.warning(f"Agent analysis failed, falling back to OpenAI: {agent_error}")
            # Fallback to traditional OpenAI approach
            # Create comprehensive analysis prompt
            analysis_prompt = f"""
Analyze this financial advisor conversation and provide a comprehensive summary:

User: {user_name}
Financial Data: {data_dump}

Conversation:
{chr(10).join([f"{msg['role']}: {msg['content']}" for msg in history])}

Provide your analysis in this exact JSON format:
{{
  "summary": "Overall conversation summary",
  "sentiment_analysis": {{
    "overall_sentiment": "positive/neutral/negative",
    "confidence_levels": ["high", "medium", "low"],
    "emotional_markers": ["anxiety", "optimism", "confusion", etc.]
  }},
  "key_topics": ["topic1", "topic2", "topic3"],
  "action_items": [
    {{
      "item": "action description",
      "priority": "high/medium/low",
      "deadline": "timeline if mentioned"
    }}
  ],
  "goals_identified": [
    {{
      "goal": "goal description",
      "timeline": "short/medium/long term",
      "urgency": "high/medium/low"
    }}
  ],
  "risk_assessment": "low/medium/high",
  "next_steps": "recommended next steps",
  "confidence_score": 0.85
}}
"""

            # Generate analysis
            analysis_response = await client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": analysis_prompt}],
                temperature=0.3,
            )
            
            # Extract the content from the response
            analysis_content = analysis_response.choices[0].message.content
            
            # Check if the response is empty or invalid
            if not analysis_content or analysis_content.strip() == "":
                # Create a fallback analysis
                analysis = {
                    "summary": "Session completed successfully. No detailed analysis available.",
                    "sentiment_analysis": {"overall": "neutral", "confidence": 0.5},
                    "key_topics": ["financial planning", "general discussion"],
                    "action_items": [],
                    "goals_identified": [],
                    "risk_assessment": "low",
                    "next_steps": "Continue with regular financial planning sessions.",
                    "confidence_score": 0.5
                }
            else:
                try:
                    analysis = json.loads(analysis_content)
                except json.JSONDecodeError as e:
                    # If JSON parsing fails, create a fallback analysis
                    analysis = {
                        "summary": f"Session analysis completed. Raw response: {analysis_content[:200]}...",
                        "sentiment_analysis": {"overall": "neutral", "confidence": 0.5},
                        "key_topics": ["financial discussion"],
                        "action_items": [],
                        "goals_identified": [],
                        "risk_assessment": "low",
                        "next_steps": "Continue with regular financial planning sessions.",
                        "confidence_score": 0.5
                    }

        # Store the analysis
        store_session_analysis(cur, session_id, user_id, analysis, conn)

        # Generate individual insights from action items
        insights = []
        for item in analysis.get('action_items', []):
            insight = {
                'id': str(uuid.uuid4()),
                'user_id': user_id,
                'insight_type': 'action_item',
                'title': item['item'],
                'description': f"Priority: {item['priority']}. {item.get('deadline', '')}",
                'severity': item['priority'],
                'data': json.dumps(item),
                'is_read': False,
            }
            insights.append(insight)
            insert_insight(cur, user_id, insight, conn)

        # Mark session as inactive
        cur.execute("""
            UPDATE chat_sessions 
            SET is_active = false, updated_at = now() 
            WHERE session_id = %s
        """, (session_id,))
        
        conn.commit()

        return {
            "summary": analysis['summary'],
            "insights": insights,
            "analysis": analysis
        }
        
    except Exception as e:
        logger.error(f"End session error for user {user_id}: {str(e)}")
        conn.rollback()
        raise HTTPException(status_code=500, detail="End session error")

# DB helpers - aligned with your Prisma schema
def get_user_name(cur, user_id):
    cur.execute("SELECT first_name, last_name FROM users WHERE id = %s", (user_id,))
    row = cur.fetchone()
    return f"{row[0]} {row[1]}" if row else "User"

def get_data_dump(cur, user_id):
    data = ""

    # Accounts
    cur.execute("""
        SELECT name, type, subtype, balance, currency 
        FROM accounts 
        WHERE user_id = %s AND is_active = true
    """, (user_id,))
    accounts = cur.fetchall()
    data += "Accounts:\n" + "".join(f"- {row[0]} ({row[1]}/{row[2]}): {row[3]} {row[4]}\n" for row in accounts) or "No accounts.\n"

    # Manual Assets
    cur.execute("SELECT name, asset_class, value FROM manual_assets WHERE user_id = %s", (user_id,))
    manual_assets = cur.fetchall()
    data += "Manual Assets:\n" + "".join(f"- {row[0]} ({row[1]}): {row[2]}\n" for row in manual_assets) or "No manual assets.\n"

    # Manual Liabilities
    cur.execute("SELECT name, liability_class, balance FROM manual_liabilities WHERE user_id = %s", (user_id,))
    manual_liabilities = cur.fetchall()
    data += "Manual Liabilities:\n" + "".join(f"- {row[0]} ({row[1]}): {row[2]}\n" for row in manual_liabilities) or "No manual liabilities.\n"

    # Transactions (last 10)
    cur.execute("""
        SELECT date, name, amount, category 
        FROM transactions 
        WHERE user_id = %s 
        ORDER BY date DESC LIMIT 10
    """, (user_id,))
    transactions = cur.fetchall()
    data += "Recent Transactions:\n" + "".join(f"- {row[0]}: {row[1]}, {row[2]}, {row[3]}\n" for row in transactions) or "No transactions.\n"

    # Goals
    cur.execute("""
        SELECT name, target_amount, current_amount 
        FROM goals 
        WHERE user_id = %s AND is_active = true
    """, (user_id,))
    goals = cur.fetchall()
    data += "Goals:\n" + "".join(f"- {row[0]}: Target {row[1]}, Current {row[2]}\n" for row in goals) or "No goals.\n"

    # Budgets
    cur.execute("""
        SELECT name, amount, period 
        FROM budgets 
        WHERE user_id = %s AND is_active = true
    """, (user_id,))
    budgets = cur.fetchall()
    data += "Budgets:\n" + "".join(f"- {row[0]}: {row[1]} per {row[2]}\n" for row in budgets) or "No budgets.\n"

    # Insurances
    cur.execute("SELECT type, provider, coverage_amount FROM insurances WHERE user_id = %s AND is_active = true", (user_id,))
    insurances = cur.fetchall()
    data += "Insurances:\n" + "".join(f"- {row[0]} ({row[1]}): {row[2]}\n" for row in insurances) or "No insurances.\n"

    # Recurring Income
    cur.execute("SELECT source, gross_monthly, next_pay_date FROM recurring_income WHERE user_id = %s", (user_id,))
    recurring_income = cur.fetchall()
    data += "Recurring Income:\n" + "".join(f"- {row[0]}: ${row[1]} (Next: {row[2]})\n" for row in recurring_income) or "No recurring income.\n"

    return data

def create_session(cur, session_id, user_id, conn):
    # Handle session_id - if it's not a valid UUID, generate a new one
    try:
        session_uuid = uuid.UUID(session_id) if isinstance(session_id, str) else session_id
    except (ValueError, TypeError):
        # If session_id is not a valid UUID, generate a new one
        session_uuid = uuid.uuid4()
        logger.info(f"Generated new session UUID for invalid session_id: {session_id}")
    
    # Convert user_id to UUID if it's a string, then back to string for PostgreSQL
    try:
        user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
    except (ValueError, TypeError):
        logger.error(f"Invalid user_id format: {user_id}")
        raise Exception(f"Invalid user_id format: {user_id}")
    
    # Check if session already exists
    cur.execute("SELECT id FROM chat_sessions WHERE session_id = %s", (str(session_uuid),))
    existing_session = cur.fetchone()
    
    if not existing_session:
        cur.execute("""
            INSERT INTO chat_sessions (id, user_id, session_id, title, is_active, created_at, updated_at)
            VALUES (%s, %s, %s, %s, true, now(), now())
        """, (str(uuid.uuid4()), str(user_uuid), str(session_uuid), f"Chat Session {datetime.now().strftime('%Y-%m-%d %H:%M')}"))
        conn.commit()
    
    return str(session_uuid)

def get_history(cur, session_id):
    # Handle session_id - if it's not a valid UUID, return empty history
    try:
        session_uuid = uuid.UUID(session_id) if isinstance(session_id, str) else session_id
    except (ValueError, TypeError):
        logger.warning(f"Invalid session_id format: {session_id}, returning empty history")
        return []
    
    # First get the chat_sessions.id for this session_id
    cur.execute("SELECT id FROM chat_sessions WHERE session_id = %s", (str(session_uuid),))
    session_row = cur.fetchone()
    if not session_row:
        return []
    
    chat_session_id = session_row[0]
    
    cur.execute("""
        SELECT message_type, content 
        FROM chat_messages 
        WHERE session_id = %s 
        ORDER BY turn_number
    """, (chat_session_id,))
    return [{"role": row[0], "content": row[1]} for row in cur.fetchall()]

def store_message(cur, session_id, message_type, content, conn):
    # Handle session_id - if it's not a valid UUID, skip storing
    try:
        session_uuid = uuid.UUID(session_id) if isinstance(session_id, str) else session_id
    except (ValueError, TypeError):
        logger.warning(f"Invalid session_id format: {session_id}, skipping message storage")
        return
    
    # First get the chat_sessions.id for this session_id
    cur.execute("SELECT id FROM chat_sessions WHERE session_id = %s", (str(session_uuid),))
    session_row = cur.fetchone()
    if not session_row:
        logger.warning(f"Session {session_id} not found in chat_sessions table")
        return
    
    chat_session_id = session_row[0]
    
    cur.execute("""
        INSERT INTO chat_messages (id, session_id, message_type, content, turn_number, created_at)
        VALUES (%s, %s, %s, %s, (SELECT COALESCE(MAX(turn_number), 0) + 1 FROM chat_messages WHERE session_id = %s), now())
    """, (str(uuid.uuid4()), chat_session_id, message_type, content, chat_session_id))
    conn.commit()

def store_session_analysis(cur, session_id, user_id, analysis, conn):
    # Convert session_id to UUID if it's a string, then back to string for PostgreSQL
    session_uuid = uuid.UUID(session_id) if isinstance(session_id, str) else session_id
    
    # First get the chat_sessions.id for this session_id
    cur.execute("SELECT id FROM chat_sessions WHERE session_id = %s", (str(session_uuid),))
    session_row = cur.fetchone()
    if not session_row:
        raise Exception(f"Session {session_id} not found in chat_sessions table")
    
    chat_session_id = session_row[0]
    
    cur.execute("""
        INSERT INTO chat_session_analyses (
            id, session_id, user_id, summary, sentiment_analysis, key_topics, 
            action_items, goals_identified, risk_assessment, next_steps, confidence_score, created_at
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, now())
    """, (
        str(uuid.uuid4()), chat_session_id, user_id, analysis['summary'],
        json.dumps(analysis.get('sentiment_analysis')),
        json.dumps(analysis.get('key_topics')),
        json.dumps(analysis.get('action_items')),
        json.dumps(analysis.get('goals_identified')),
        analysis.get('risk_assessment'),
        analysis.get('next_steps'),
        analysis.get('confidence_score', 0.8)
    ))
    conn.commit()

def insert_insight(cur, user_id, insight, conn):
    cur.execute("""
        INSERT INTO financial_insights (id, user_id, insight_type, title, description, severity, data, is_read, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, now())
    """, (
        insight['id'], user_id, insight['insight_type'], insight['title'],
        insight['description'], insight['severity'], insight['data'], insight['is_read']
    ))
    conn.commit()

# Agent configuration endpoint
@app.get("/api/agents/config")
async def get_agent_config(user_id: str = Depends(authenticate)):
    """Get current agent configuration and capabilities."""
    try:
        return {
            "agent_type": "simplified-llm-driven",
            "version": "3.0.0",
            "capabilities": {
                "llm_routing": True,
                "natural_language_sql": True,
                "merchant_resolution": True,
                "context_aware": True,
                "minimal_preprocessing": True
            },
            "description": "Simplified LLM-driven architecture with minimal preprocessing"
        }
    except Exception as e:
        logger.error(f"Error getting agent config: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving agent configuration")

# Agent monitoring endpoint
@app.get("/api/agents/logs")
async def get_agent_logs():
    """Get agent execution logs for monitoring and debugging with full detail."""
    try:
        if supervisor_agent is None:
            return {"logs": [], "message": "Agent not initialized"}
        
        logs = BaseAgent.get_agent_logs()
        
        # Enhance logs with additional metadata and full details
        enhanced_logs = []
        for log in logs:
            enhanced_log = log.copy()
            
            # Add execution status
            enhanced_log['status'] = 'success' if not log.get('error_message') else 'error'
            
            # Add agent type classification
            if 'Supervisor' in log.get('agent_name', ''):
                enhanced_log['agent_type'] = 'supervisor'
            elif 'SQL' in log.get('agent_name', ''):
                enhanced_log['agent_type'] = 'sql'
            else:
                enhanced_log['agent_type'] = 'base'
            
            # Add performance metrics
            execution_time = log.get('execution_time_ms', 0)
            if execution_time < 1000:
                enhanced_log['performance'] = 'fast'
            elif execution_time < 5000:
                enhanced_log['performance'] = 'normal'
            else:
                enhanced_log['performance'] = 'slow'
            
            # Extract key information for summary
            input_data = log.get('input_data', {})
            output_data = log.get('output_data', {})
            
            enhanced_log['summary'] = {
                'query': input_data.get('query', '')[:100] + '...' if len(input_data.get('query', '')) > 100 else input_data.get('query', ''),
                'user_id': input_data.get('user_id'),
                'routing_decision': output_data.get('routing', {}),
                'sql_queries_count': len(log.get('sql_queries', [])),
                'api_calls_count': len(log.get('api_calls', [])),
                'response_preview': output_data.get('response', '')[:200] + '...' if len(str(output_data.get('response', ''))) > 200 else output_data.get('response', '')
            }
            
            enhanced_logs.append(enhanced_log)
        
        # Sort by timestamp (most recent first)
        enhanced_logs.sort(key=lambda x: x.get('timestamp', 0), reverse=True)
        
        return {
            "logs": enhanced_logs[:50],  # Return last 50 logs
            "total_executions": len(enhanced_logs),
            "successful_executions": len([l for l in enhanced_logs if l['status'] == 'success']),
            "failed_executions": len([l for l in enhanced_logs if l['status'] == 'error']),
            "agent_type": "simplified-llm-driven",
            "last_updated": time.time(),
            "details": {
                "supervisor_executions": len([l for l in enhanced_logs if l['agent_type'] == 'supervisor']),
                "sql_executions": len([l for l in enhanced_logs if l['agent_type'] == 'sql']),
                "avg_execution_time": sum(l.get('execution_time_ms', 0) for l in enhanced_logs) / len(enhanced_logs) if enhanced_logs else 0
            }
        }
    except Exception as e:
        logger.error(f"Error getting agent logs: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving agent logs")

@app.post("/api/agents/logs/clear")
async def clear_agent_logs():
    """Clear agent execution logs and cache."""
    try:
        if supervisor_agent is None:
            return {"message": "Agent not initialized"}
        
        BaseAgent.clear_agent_logs()
        return {"message": "Agent logs cleared successfully", "timestamp": time.time()}
    except Exception as e:
        logger.error(f"Error clearing agent logs: {e}")
        raise HTTPException(status_code=500, detail="Error clearing agent logs")

@app.get("/api/agents/status")
async def get_agent_status():
    """Get real-time agent system status."""
    try:
        if supervisor_agent is None:
            return {
                "status": "not_initialized",
                "health": "failed",
                "message": "Agent system not initialized"
            }
        
        # Check database connectivity
        db_healthy = False
        try:
            conn = db_pool.getconn()
            cur = conn.cursor()
            cur.execute("SELECT 1")
            db_healthy = True
            cur.close()
            db_pool.putconn(conn)
        except:
            db_healthy = False
        
        # Determine overall health
        if db_healthy:
            health = "healthy"
            status = "operational"
        else:
            health = "degraded"
            status = "database_issues"
        
        return {
            "status": status,
            "health": health,
            "database_connected": db_healthy,
            "agent_count": 3,  # Supervisor, SQL, Base
            "last_health_check": time.time(),
            "version": "1.0.0"
        }
    except Exception as e:
        logger.error(f"Error getting agent status: {e}")
        return {
            "status": "error",
            "health": "failed",
            "error": str(e),
            "last_health_check": time.time()
        }

@app.post("/api/auth/login")
async def login(input: LoginInput = Body(...)):
    try:
        conn = db_pool.getconn()
        cur = conn.cursor()
        cur.execute("SELECT id, email, first_name, last_name, password_hash, is_advisor, created_at FROM users WHERE email = %s AND is_active = true", (input.email,))
        user = cur.fetchone()
        if not user:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        user_id, email, first_name, last_name, password_hash, is_advisor, created_at = user
        
        # Check if password_hash is valid
        if not password_hash or len(password_hash) < 20:
            logger.error(f"Invalid password hash for user {email}")
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        try:
            if not bcrypt.checkpw(input.password.encode(), password_hash.encode()):
                raise HTTPException(status_code=401, detail="Invalid email or password")
        except Exception as e:
            logger.error(f"Bcrypt error for user {email}: {str(e)}")
            raise HTTPException(status_code=401, detail="Invalid email or password")
        # Create JWT
        token = jwt.encode({"userId": user_id}, JWT_SECRET, algorithm="HS256")
        return {
            "id": user_id,
            "email": email,
            "first_name": first_name,
            "last_name": last_name,
            "is_advisor": is_advisor,
            "created_at": created_at.isoformat() if created_at else None,
            "token": token
        }
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(status_code=500, detail="Login error")
    finally:
        try:
            cur.close()
            db_pool.putconn(conn)
        except:
            pass

# Test endpoint for agentic framework (no auth required)
@app.post("/chat/test-agents")
async def test_agents(input: MessageInput):
    """Test endpoint to directly use the agentic framework without authentication"""
    try:
        # Initialize agents if not already done
        initialize_agents()
        
        if supervisor_agent is None:
            return {
                "error": "Agents not initialized",
                "message": "The agentic framework is not properly initialized"
            }
        
        # Use a test user ID
        test_user_id = "00000000-0000-0000-0000-000000000001"  # You should replace with a real user ID from your DB
        
        # Get database connection
        conn = db_pool.getconn()
        cur = conn.cursor()
        
        # Try to find a real user for testing
        cur.execute("SELECT id, first_name, last_name FROM users LIMIT 1")
        user_row = cur.fetchone()
        if user_row:
            test_user_id = user_row[0]
            user_name = f"{user_row[1]} {user_row[2]}"
            logger.info(f"Using test user: {user_name} (ID: {test_user_id})")
        else:
            user_name = "Test User"
            logger.warning("No users found in database, using default test user")
        
        session_id = input.session_id or f"test-session-{int(time.time())}"
        
        logger.info("=" * 80)
        logger.info("TEST AGENT ENDPOINT CALLED")
        logger.info(f"Query: {input.message}")
        logger.info(f"Using User ID: {test_user_id}")
        logger.info("=" * 80)
        
        # Call the supervisor agent directly
        supervisor_result = await supervisor_agent.process(
            query=input.message,
            user_id=test_user_id,
            user_name=user_name,
            session_id=session_id
        )
        
        # Close database connection
        cur.close()
        db_pool.putconn(conn)
        
        return {
            "message": supervisor_result.get("response", "No response generated"),
            "session_id": session_id,
            "agent_used": "supervisor_agent",
            "metadata": supervisor_result.get("metadata", {}),
            "success": supervisor_result.get("success", False),
            "debug_info": {
                "user_id_used": test_user_id,
                "user_name": user_name,
                "agents_initialized": supervisor_agent is not None
            }
        }
        
    except Exception as e:
        logger.error(f"Test agent error: {e}")
        logger.error(f"Full traceback: {traceback.format_exc()}")
        return {
            "error": str(e),
            "message": f"Agent test failed: {str(e)}",
            "traceback": traceback.format_exc()
        }

@app.on_event("shutdown")
def shutdown():
    """Clean shutdown of the application."""
    global supervisor_agent
    
    # Clear agent logs
    BaseAgent.clear_agent_logs()
    
    # Close database pool
    if db_pool:
        db_pool.closeall()
    
    logger.info("Application shutdown complete")

@app.on_event("startup")
async def startup():
    """Initialize agents on startup."""
    logger.info("=" * 80)
    logger.info("TRUEFI BACKEND STARTING UP")
    logger.info("=" * 80)
    
    # Initialize agents
    initialize_agents()
    
    if supervisor_agent and sql_agent:
        logger.info("[SUCCESS] Agentic Framework: INITIALIZED")
        logger.info("  - SimpleSupervisorAgent: READY")
        logger.info("  - SimpleSQLAgent: READY")
        logger.info("  - Schema Registry: LOADED")
        logger.info("  - Entity Resolution: ENABLED")
        logger.info("  - Semantic Interpretation: ENABLED")
        logger.info("  - Result Validation: ENABLED")
        logger.info("  - Query Explanation: ENABLED")
    else:
        logger.warning("[WARNING] Agentic Framework: NOT INITIALIZED")
        logger.warning("  Falling back to basic OpenAI chat")
    
    logger.info("=" * 80)
    logger.info("BACKEND READY - Listening on port 8080")
    logger.info("=" * 80)

if __name__ == "__main__":
    import uvicorn
    # Use reload=True for development, but workers=1 to avoid conflicts
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True, log_level="info") 