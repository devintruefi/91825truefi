# TRUEFIBACKEND/main.py
# Enterprise-grade FastAPI backend with Agentic Framework for TrueFi Financial Advisor.
# Features: JWT auth, async OpenAI calls, DB pooling, multi-agent orchestration.
# Scalable: Multi-user, async, expandable agent framework.

import uuid
import logging
import json
import traceback
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, List
from dotenv import load_dotenv
import os
from fastapi import FastAPI, Request, HTTPException, Depends, status, Body, Query
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
import secrets # Added for secrets.token_urlsafe

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

# Plaid imports
try:
    import plaid
    from plaid.api import plaid_api
    from plaid.model.link_token_create_request import LinkTokenCreateRequest
    from plaid.model.country_code import CountryCode
    from plaid.model.products import Products
    from plaid.configuration import Configuration
    from plaid.api_client import ApiClient
    PLAID_AVAILABLE = True
except ImportError as e:
    logger.warning(f"Plaid module not available: {e}")
    PLAID_AVAILABLE = False

# Import the Simplified LLM-driven Agentic Framework v3.0
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from agents.simple_supervisor_agent import SimpleSupervisorAgent
from agents.sql_agent_simple import SimpleSQLAgent
from agents.financial_modeling_agent import FinancialModelingAgent
from agents.base_agent import BaseAgent
from agents.utils.schema_registry import SchemaRegistry

load_dotenv()

# Set specific loggers to DEBUG for detailed tracing
logging.getLogger("agents.simple_supervisor_agent").setLevel(logging.DEBUG)
logging.getLogger("agents.sql_agent_simple").setLevel(logging.DEBUG)
logging.getLogger("agents.base_agent").setLevel(logging.DEBUG)

# Import OAuth modules
try:
    from oauth_config import get_oauth_config
    from oauth_auth import google_oauth
    OAUTH_AVAILABLE = True
    logger.info("OAuth modules imported successfully")
except ImportError as e:
    logger.warning(f"OAuth modules not available: {e}")
    OAUTH_AVAILABLE = False

# Config
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
DATABASE_URL = os.getenv("DATABASE_URL")
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key")

# Async OpenAI
client = openai.AsyncOpenAI(api_key=OPENAI_API_KEY)

# Plaid configuration
if PLAID_AVAILABLE:
    PLAID_CLIENT_ID = os.getenv("PLAID_CLIENT_ID")
    PLAID_SECRET = os.getenv("PLAID_SECRET")
    PLAID_ENV = os.getenv("PLAID_ENV", "sandbox")
    
    # Map environment string to Plaid Environment
    env_map = {
        'sandbox': plaid.Environment.sandbox,
        'development': plaid.Environment.development,
        'production': plaid.Environment.production
    } if hasattr(plaid.Environment, 'sandbox') else {
        'sandbox': plaid.Environment.Sandbox,
        'development': plaid.Environment.Development,
        'production': plaid.Environment.Production
    }
    
    # Initialize Plaid client
    default_env = plaid.Environment.Sandbox if hasattr(plaid.Environment, 'Sandbox') else plaid.Environment.sandbox
    plaid_configuration = Configuration(
        host=env_map.get(PLAID_ENV, default_env),
        api_key={
            'clientId': PLAID_CLIENT_ID,
            'secret': PLAID_SECRET,
        }
    )
    plaid_api_client = ApiClient(plaid_configuration)
    plaid_client = plaid_api.PlaidApi(plaid_api_client)
    
    logger.info(f"Plaid client initialized for {PLAID_ENV} environment")
else:
    plaid_client = None
    logger.warning("Plaid client not initialized")

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
    allow_origins=["http://localhost:3000", "https://truefi.ai"],
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

# Data models for chat sessions
class ChatSessionCreate(BaseModel):
    title: Optional[str] = "New Chat"

class ChatMessageCreate(BaseModel):
    session_id: str
    message_type: str  # 'user' or 'assistant'
    content: str
    rich_content: Optional[Dict] = None

# Global agent variables
supervisor_agent = None
sql_agent = None
financial_modeling_agent = None

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

# Chat History Endpoints

@app.post("/api/chat/sessions")
async def create_chat_session(
    session_data: ChatSessionCreate,
    user_id: str = Depends(authenticate),
    db = Depends(get_db_cursor)
):
    """Create a new chat session"""
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    cur, conn = db
    try:
        session_id = str(uuid.uuid4())
        session_identifier = f"session_{int(time.time() * 1000)}"
        
        cur.execute("""
            INSERT INTO chat_sessions (id, user_id, session_id, title, is_active, created_at, updated_at)
            VALUES (%s, %s, %s, %s, true, NOW(), NOW())
            RETURNING id, session_id, title, is_active, created_at
        """, (session_id, user_id, session_identifier, session_data.title))
        
        result = cur.fetchone()
        conn.commit()
        
        return {
            "id": result[0],
            "session_id": result[1],
            "title": result[2],
            "is_active": result[3],
            "created_at": result[4].isoformat() if result[4] else None,
            "message_count": 0
        }
    except Exception as e:
        logger.error(f"Failed to create chat session: {e}")
        conn.rollback()
        raise HTTPException(status_code=500, detail="Failed to create chat session")
    finally:
        if conn:
            db_pool.putconn(conn)

@app.get("/api/chat/sessions")
async def get_chat_sessions(
    user_id: str = Depends(authenticate),
    db = Depends(get_db_cursor)
):
    """Get all chat sessions for a user"""
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    cur, conn = db
    try:
        cur.execute("""
            SELECT 
                cs.id, cs.session_id, cs.title, cs.is_active, cs.created_at,
                COUNT(cm.id) as message_count,
                MAX(cm.content) as last_message
            FROM chat_sessions cs
            LEFT JOIN chat_messages cm ON cs.id = cm.session_id
            WHERE cs.user_id = %s
            GROUP BY cs.id, cs.session_id, cs.title, cs.is_active, cs.created_at
            ORDER BY cs.updated_at DESC
        """, (user_id,))
        
        sessions = []
        for row in cur.fetchall():
            sessions.append({
                "id": row[0],
                "session_id": row[1],
                "title": row[2],
                "is_active": row[3],
                "created_at": row[4].isoformat() if row[4] else None,
                "message_count": row[5] or 0,
                "last_message": row[6] or ""
            })
        
        return sessions
    except Exception as e:
        logger.error(f"Failed to get chat sessions: {e}")
        raise HTTPException(status_code=500, detail="Failed to get chat sessions")
    finally:
        if conn:
            db_pool.putconn(conn)

@app.get("/api/chat/sessions/{session_id}/messages")
async def get_session_messages(
    session_id: str,
    user_id: str = Depends(authenticate),
    db = Depends(get_db_cursor)
):
    """Get all messages for a specific session"""
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    cur, conn = db
    try:
        # Verify session ownership
        cur.execute("""
            SELECT id FROM chat_sessions 
            WHERE id = %s AND user_id = %s
        """, (session_id, user_id))
        
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Get messages
        cur.execute("""
            SELECT id, message_type, content, rich_content, turn_number, created_at
            FROM chat_messages
            WHERE session_id = %s
            ORDER BY turn_number ASC
        """, (session_id,))
        
        messages = []
        for row in cur.fetchall():
            messages.append({
                "id": row[0],
                "message_type": row[1],
                "content": row[2],
                "rich_content": row[3],
                "turn_number": row[4],
                "created_at": row[5].isoformat() if row[5] else None
            })
        
        return messages
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get session messages: {e}")
        raise HTTPException(status_code=500, detail="Failed to get messages")
    finally:
        if conn:
            db_pool.putconn(conn)

@app.patch("/api/chat/sessions/{session_id}")
async def update_session_title(
    session_id: str,
    request: Request,
    user_id: str = Depends(authenticate),
    db = Depends(get_db_cursor)
):
    """Update the title of a chat session"""
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    cur, conn = db
    try:
        body = await request.json()
        new_title = body.get("title")
        
        if not new_title:
            raise HTTPException(status_code=400, detail="Title is required")
        
        # Verify session ownership
        cur.execute("""
            SELECT id FROM chat_sessions 
            WHERE id = %s AND user_id = %s
        """, (session_id, user_id))
        
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Update the title
        cur.execute("""
            UPDATE chat_sessions 
            SET title = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s AND user_id = %s
        """, (new_title, session_id, user_id))
        
        conn.commit()
        
        return {"success": True, "title": new_title}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update session title: {e}")
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail="Failed to update session title")
    finally:
        if conn:
            db_pool.putconn(conn)

@app.post("/api/chat/sessions/{session_id}/messages")
async def save_message(
    session_id: str,
    message_data: ChatMessageCreate,
    user_id: str = Depends(authenticate),
    db = Depends(get_db_cursor)
):
    """Save a message to a session"""
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    cur, conn = db
    try:
        # Verify session ownership
        cur.execute("""
            SELECT id FROM chat_sessions 
            WHERE id = %s AND user_id = %s
        """, (session_id, user_id))
        
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Get next turn number
        cur.execute("""
            SELECT COALESCE(MAX(turn_number), 0) + 1 
            FROM chat_messages 
            WHERE session_id = %s
        """, (session_id,))
        turn_number = cur.fetchone()[0]
        
        # Insert message
        message_id = str(uuid.uuid4())
        cur.execute("""
            INSERT INTO chat_messages (id, session_id, message_type, content, rich_content, turn_number, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, NOW())
            RETURNING id, created_at
        """, (
            message_id, 
            session_id,
            message_data.message_type,
            message_data.content,
            json.dumps(message_data.rich_content) if message_data.rich_content else None,
            turn_number
        ))
        
        result = cur.fetchone()
        
        # Update session updated_at
        cur.execute("""
            UPDATE chat_sessions 
            SET updated_at = NOW() 
            WHERE id = %s
        """, (session_id,))
        
        conn.commit()
        
        return {
            "id": result[0],
            "session_id": session_id,
            "message_type": message_data.message_type,
            "content": message_data.content,
            "rich_content": message_data.rich_content,
            "turn_number": turn_number,
            "created_at": result[1].isoformat() if result[1] else None
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to save message: {e}")
        conn.rollback()
        raise HTTPException(status_code=500, detail="Failed to save message")
    finally:
        if conn:
            db_pool.putconn(conn)

@app.delete("/api/chat/sessions/{session_id}")
async def delete_chat_session(
    session_id: str,
    user_id: str = Depends(authenticate),
    db = Depends(get_db_cursor)
):
    """Delete a chat session and all its messages"""
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    cur, conn = db
    try:
        # Verify session ownership
        cur.execute("""
            SELECT id FROM chat_sessions 
            WHERE id = %s AND user_id = %s
        """, (session_id, user_id))
        
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Delete messages first (foreign key constraint)
        cur.execute("DELETE FROM chat_messages WHERE session_id = %s", (session_id,))
        
        # Delete session
        cur.execute("DELETE FROM chat_sessions WHERE id = %s", (session_id,))
        
        conn.commit()
        
        return {"success": True, "message": "Session deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete session: {e}")
        conn.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete session")
    finally:
        if conn:
            db_pool.putconn(conn)

@app.patch("/api/chat/sessions/{session_id}")
async def update_chat_session(
    session_id: str,
    update_data: Dict,
    user_id: str = Depends(authenticate),
    db = Depends(get_db_cursor)
):
    """Update a chat session (e.g., rename)"""
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    cur, conn = db
    try:
        # Verify session ownership
        cur.execute("""
            SELECT id FROM chat_sessions 
            WHERE id = %s AND user_id = %s
        """, (session_id, user_id))
        
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Update title if provided
        if "title" in update_data:
            cur.execute("""
                UPDATE chat_sessions 
                SET title = %s, updated_at = NOW() 
                WHERE id = %s
                RETURNING title, updated_at
            """, (update_data["title"], session_id))
            
            result = cur.fetchone()
            conn.commit()
            
            return {
                "id": session_id,
                "title": result[0],
                "updated_at": result[1].isoformat() if result[1] else None
            }
        else:
            return {"message": "No updates provided"}
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update session: {e}")
        conn.rollback()
        raise HTTPException(status_code=500, detail="Failed to update session")
    finally:
        if conn:
            db_pool.putconn(conn)

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
    global supervisor_agent, sql_agent, financial_modeling_agent
    
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
        
        # Initialize financial modeling agent with openai client and db_pool
        financial_modeling_agent = FinancialModelingAgent(
            openai_client=client,
            db_pool=db_pool,
            sql_agent=sql_agent
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
        financial_modeling_agent = None

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

        # Create session if it doesn't exist (pass the message for title generation)
        valid_session_id = create_session(cur, session_id, user_id, conn, input.message)

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

def create_session(cur, session_id, user_id, conn, initial_message=None):
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
        # Generate a smart title based on the first message if provided
        if initial_message:
            # Truncate message to first 50 chars for title
            title = initial_message[:50] + ("..." if len(initial_message) > 50 else "")
        else:
            title = f"Chat Session {datetime.now().strftime('%Y-%m-%d %H:%M')}"
        
        cur.execute("""
            INSERT INTO chat_sessions (id, user_id, session_id, title, is_active, created_at, updated_at)
            VALUES (%s, %s, %s, %s, true, now(), now())
        """, (str(uuid.uuid4()), str(user_uuid), str(session_uuid), title))
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

# ============ PLAID ENDPOINTS ============

class PlaidLinkTokenRequest(BaseModel):
    user_id: str
    user_email: str

@app.post("/api/plaid/link-token")
async def create_plaid_link_token(request: PlaidLinkTokenRequest):
    """Create a Plaid Link token for the user."""
    if not PLAID_AVAILABLE or not plaid_client:
        raise HTTPException(status_code=500, detail="Plaid service not available")
    
    try:
        # Create the request object
        link_token_request = LinkTokenCreateRequest(
            products=[Products('transactions')],
            client_name='TrueFi',
            country_codes=[CountryCode('US')],
            language='en',
            user={
                'client_user_id': request.user_id,
                'email_address': request.user_email
            }
        )
        
        # Create link token
        response = plaid_client.link_token_create(link_token_request)
        
        return {
            "link_token": response['link_token'],
            "expiration": response['expiration']
        }
        
    except plaid.ApiException as e:
        logger.error(f"Plaid API error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating Plaid link token: {e}")
        raise HTTPException(status_code=500, detail="Failed to create link token")

class PlaidExchangeRequest(BaseModel):
    public_token: str
    user_id: str

@app.post("/api/plaid/exchange")
async def exchange_public_token(request: PlaidExchangeRequest):
    """Exchange a Plaid public token for an access token."""
    if not PLAID_AVAILABLE or not plaid_client:
        raise HTTPException(status_code=500, detail="Plaid service not available")
    
    try:
        from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
        
        exchange_request = ItemPublicTokenExchangeRequest(
            public_token=request.public_token
        )
        
        response = plaid_client.item_public_token_exchange(exchange_request)
        access_token = response['access_token']
        item_id = response['item_id']
        
        # Store the access token in the database
        conn = db_pool.getconn()
        try:
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO plaid_items (user_id, access_token, item_id, created_at)
                VALUES (%s, %s, %s, NOW())
                ON CONFLICT (item_id) DO UPDATE
                SET access_token = EXCLUDED.access_token
            """, (request.user_id, access_token, item_id))
            conn.commit()
            
            # Fetch accounts for this item
            from plaid.model.accounts_get_request import AccountsGetRequest
            accounts_request = AccountsGetRequest(access_token=access_token)
            accounts_response = plaid_client.accounts_get(accounts_request)
            
            # Store accounts in database
            for account in accounts_response['accounts']:
                cur.execute("""
                    INSERT INTO accounts (
                        user_id, plaid_account_id, plaid_item_id, 
                        name, type, subtype, balance_current, 
                        balance_available, created_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
                    ON CONFLICT (plaid_account_id) DO UPDATE
                    SET balance_current = EXCLUDED.balance_current,
                        balance_available = EXCLUDED.balance_available
                """, (
                    request.user_id,
                    account['account_id'],
                    item_id,
                    account['name'],
                    account['type'],
                    account.get('subtype'),
                    account['balances']['current'],
                    account['balances']['available']
                ))
            
            conn.commit()
            
            return {
                "success": True,
                "item_id": item_id,
                "accounts": len(accounts_response['accounts'])
            }
            
        finally:
            db_pool.putconn(conn)
            
    except plaid.ApiException as e:
        logger.error(f"Plaid API error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error exchanging public token: {e}")
        raise HTTPException(status_code=500, detail="Failed to exchange token")

@app.get("/api/plaid/accounts/{user_id}")
async def get_plaid_accounts(user_id: str):
    """Get all Plaid-linked accounts for a user."""
    try:
        conn = db_pool.getconn()
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT a.*, p.access_token
                FROM accounts a
                JOIN plaid_items p ON a.plaid_item_id = p.item_id
                WHERE a.user_id = %s
            """, (user_id,))
            
            accounts = []
            for row in cur.fetchall():
                accounts.append({
                    "id": row[0],
                    "name": row[4],
                    "type": row[5],
                    "subtype": row[6],
                    "balance_current": float(row[7]) if row[7] else 0,
                    "balance_available": float(row[8]) if row[8] else 0
                })
            
            return {"accounts": accounts}
            
        finally:
            db_pool.putconn(conn)
            
    except Exception as e:
        logger.error(f"Error fetching accounts: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch accounts")

@app.get("/financial-data/{user_id}")
async def get_financial_data(
    user_id: str,
    limit: int = Query(10, description="Number of transactions to return"),
    offset: int = Query(0, description="Offset for pagination"),
    includeTransactions: bool = Query(True, description="Include transactions in response")
):
    """Get comprehensive financial data for a user including accounts, transactions, and goals."""
    logger.info(f"Getting financial data for user: {user_id}")
    try:
        conn = db_pool.getconn()
        try:
            cur = conn.cursor()
            
            # Fetch accounts for the user
            logger.info(f"Fetching accounts for user {user_id}")
            cur.execute("""
                SELECT id, user_id, plaid_account_id, plaid_item_id, name, type, subtype, 
                       balance, available_balance, currency
                FROM accounts
                WHERE user_id = %s
            """, (user_id,))
            
            accounts = []
            account_rows = cur.fetchall()
            logger.info(f"Found {len(account_rows)} accounts")
            for row in account_rows:
                accounts.append({
                    "id": row[0],
                    "name": row[4],
                    "type": row[5],
                    "current_balance": float(row[7]) if row[7] else 0,
                    "available_balance": float(row[8]) if row[8] else 0,
                    "currency": row[9] or "USD"
                })
            
            # Fetch transactions with pagination (only if requested)
            recent_transactions = []
            total_transactions = 0
            
            if includeTransactions:
                # Get total count for pagination info
                cur.execute("""
                    SELECT COUNT(*) FROM transactions WHERE user_id = %s
                """, (user_id,))
                total_transactions = cur.fetchone()[0]
                
                # Fetch paginated transactions
                cur.execute("""
                    SELECT id, amount, name, merchant_name, category, date, pending, currency_code
                    FROM transactions
                    WHERE user_id = %s
                    ORDER BY date DESC
                    LIMIT %s OFFSET %s
                """, (user_id, limit, offset))
                
                for row in cur.fetchall():
                    recent_transactions.append({
                        "id": row[0],
                        "amount": float(row[1]) if row[1] else 0,
                        "name": row[2],
                        "merchant_name": row[3],
                        "category": row[4],
                        "date": row[5].isoformat() if row[5] else None,
                        "pending": row[6],
                        "currency_code": row[7]
                    })
            
            # Fetch goals for the user
            cur.execute("""
                SELECT id, name, description, target_amount, current_amount, target_date, priority, is_active
                FROM goals
                WHERE user_id = %s AND (is_active = true OR is_active IS NULL)
            """, (user_id,))
            
            goals = []
            for row in cur.fetchall():
                goals.append({
                    "id": row[0],
                    "name": row[1],
                    "description": row[2],
                    "target_amount": float(row[3]) if row[3] else 0,
                    "current_amount": float(row[4]) if row[4] else 0,
                    "target_date": row[5].isoformat() if row[5] else None,
                    "priority": row[6],
                    "is_active": row[7]
                })
            
            return {
                "accounts": accounts,
                "recent_transactions": recent_transactions,
                "goals": goals,
                "pagination": {
                    "total": total_transactions,
                    "limit": limit,
                    "offset": offset,
                    "hasMore": offset + limit < total_transactions
                }
            }
            
        finally:
            db_pool.putconn(conn)
            
    except Exception as e:
        logger.error(f"Error fetching financial data: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch financial data: {str(e)}")

# ============ OAUTH ENDPOINTS ============

# OAuth initialization endpoint
@app.post("/api/auth/oauth/init")
async def oauth_init(request: Request):
    """Initialize OAuth flow for Google, Microsoft, or Apple"""
    if not OAUTH_AVAILABLE:
        raise HTTPException(
            status_code=503, 
            detail="OAuth not available. Please check OAuth configuration."
        )
    
    try:
        body = await request.json()
        provider = body.get('provider')
        redirect_uri = body.get('redirect_uri')
        
        if not provider or not redirect_uri:
            raise HTTPException(status_code=400, detail="Provider and redirect_uri are required")
        
        if provider not in ['google', 'microsoft', 'apple']:
            raise HTTPException(status_code=400, detail="Unsupported OAuth provider")
        
        try:
            oauth_config = get_oauth_config(provider)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        
        # Check if OAuth is properly configured
        if provider == 'google' and not oauth_config.get('client_id'):
            raise HTTPException(
                status_code=503, 
                detail="Google OAuth not configured. Please set GOOGLE_CLIENT_ID environment variable."
            )
        
        # Generate OAuth URL
        if provider == 'google':
            oauth_url, state = google_oauth.generate_oauth_url(redirect_uri)
            
            # Store state for verification (in production, use Redis or database)
            # For now, we'll return the state with the URL
            return {
                "auth_url": oauth_url,
                "state": state,
                "provider": provider
            }
        else:
            # For Microsoft and Apple, return the auth URL with parameters
            auth_url = oauth_config['auth_url']
            state = secrets.token_urlsafe(32)
            
            params = {
                'client_id': oauth_config['client_id'],
                'redirect_uri': redirect_uri,
                'scope': ' '.join(oauth_config['scopes']),
                'response_type': 'code',
                'state': state
            }
            
            if provider == 'microsoft':
                params['response_mode'] = 'query'
            
            query_string = '&'.join([f"{k}={v}" for k, v in params.items()])
            full_auth_url = f"{auth_url}?{query_string}"
            
            return {
                "auth_url": full_auth_url,
                "state": state,
                "provider": provider
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OAuth init error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to initialize OAuth")

# OAuth callback endpoint
@app.get("/api/auth/callback/{provider}")
async def oauth_callback(provider: str, code: str, state: str = None):
    """Handle OAuth callback from providers"""
    if not OAUTH_AVAILABLE:
        raise HTTPException(
            status_code=503, 
            detail="OAuth not available. Please check OAuth configuration."
        )
    
    try:
        logger.info(f"OAuth callback received for provider: {provider}")
        logger.info(f"Code length: {len(code) if code else 0}")
        logger.info(f"State: {state}")
        
        if provider not in ['google', 'microsoft', 'apple']:
            raise HTTPException(status_code=400, detail="Unsupported OAuth provider")
        
        if not code:
            raise HTTPException(status_code=400, detail="Authorization code is required")
        
        # For now, we'll focus on Google OAuth
        if provider == 'google':
            # Exchange code for tokens
            redirect_uri = f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/api/auth/callback/{provider}"
            logger.info(f"Exchanging code for tokens with redirect_uri: {redirect_uri}")
            
            token_data = await google_oauth.exchange_code_for_tokens(code, redirect_uri)
            logger.info(f"Token exchange successful. Token data keys: {list(token_data.keys())}")
            
            # Get user info from ID token
            id_token = token_data.get('id_token')
            if not id_token:
                logger.error("No ID token received from Google")
                raise HTTPException(status_code=400, detail="No ID token received")
            
            logger.info(f"ID token received, length: {len(id_token)}")
            
            # Verify ID token and get user info
            user_info = await google_oauth.verify_id_token(id_token)
            logger.info(f"ID token verified. User info: {user_info}")
            
            email = user_info.get('email')
            first_name = user_info.get('given_name', '')
            last_name = user_info.get('family_name', '')
            
            if not email:
                logger.error("No email received from OAuth provider")
                raise HTTPException(status_code=400, detail="No email received from OAuth provider")
            
            logger.info(f"User email: {email}, first_name: {first_name}, last_name: {last_name}")
            
            # Check if user exists, create if not
            conn = db_pool.getconn()
            cur = conn.cursor()
            
            try:
                # Check if user exists
                cur.execute("SELECT id, first_name, last_name, is_active FROM users WHERE email = %s", (email,))
                user = cur.fetchone()
                
                if user:
                    user_id, db_first_name, db_last_name, is_active = user
                    logger.info(f"Existing user found: {user_id}")
                    if not is_active:
                        raise HTTPException(status_code=403, detail="Account is deactivated")
                    
                    # Update user info if needed
                    if first_name and last_name and (db_first_name != first_name or db_last_name != last_name):
                        cur.execute(
                            "UPDATE users SET first_name = %s, last_name = %s WHERE id = %s",
                            (first_name, last_name, user_id)
                        )
                        conn.commit()
                        logger.info("Updated user info")
                else:
                    # Create new user
                    user_id = str(uuid.uuid4())
                    current_time = datetime.now(timezone.utc)
                    # Generate a placeholder password hash for OAuth users (they can set a real password later)
                    placeholder_password_hash = bcrypt.hashpw("oauth_user_placeholder".encode(), bcrypt.gensalt()).decode()
                    
                    cur.execute(
                        "INSERT INTO users (id, email, first_name, last_name, password_hash, is_active, is_advisor, created_at, updated_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
                        (user_id, email, first_name, last_name, placeholder_password_hash, True, False, current_time, current_time)
                    )
                    conn.commit()
                    logger.info(f"Created new user: {user_id}")
                
                # Generate JWT token
                token = jwt.encode({"userId": user_id}, JWT_SECRET, algorithm="HS256")
                
                # Redirect to frontend with token
                frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
                redirect_url = f"{frontend_url}/auth?token={token}&provider={provider}"
                
                logger.info(f"OAuth callback successful for user: {user_id}")
                
                return {
                    "redirect_url": redirect_url,
                    "user_id": user_id,
                    "email": email,
                    "first_name": first_name,
                    "last_name": last_name,
                    "token": token
                }
                
            finally:
                cur.close()
                db_pool.putconn(conn)
        
        else:
            # For Microsoft and Apple, return placeholder
            raise HTTPException(status_code=501, detail=f"{provider.title()} OAuth not yet implemented")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OAuth callback error: {str(e)}")
        logger.error(f"Exception type: {type(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="OAuth callback failed")

# Add these imports at the top if not already present
from typing import Optional, List
from pydantic import BaseModel

# Add these data models
class UserCreate(BaseModel):
    email: str
    first_name: str
    last_name: str
    password: str
    is_advisor: bool = False

class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_active: Optional[bool] = None

# Token validation endpoint
@app.get("/api/auth/validate")
async def validate_token(request: Request):
    """Validate JWT token and return user data"""
    try:
        # Get token from Authorization header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
        
        token = auth_header.split(' ')[1]
        
        # Decode and validate token
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            # Primary key is now userId for consistency
            user_id = payload.get("userId")
            
            if not user_id:
                raise HTTPException(status_code=401, detail="Invalid token payload")
            
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Get user data from database
        conn = db_pool.getconn()
        cur = conn.cursor()
        
        try:
            cur.execute("SELECT id, email, first_name, last_name, is_active, is_advisor, created_at FROM users WHERE id = %s", (user_id,))
            user = cur.fetchone()
            
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            user_id, email, first_name, last_name, is_active, is_advisor, created_at = user
            
            if not is_active:
                raise HTTPException(status_code=403, detail="Account is deactivated")
            
            return {
                "id": user_id,
                "email": email,
                "first_name": first_name,
                "last_name": last_name,
                "is_advisor": is_advisor,
                "created_at": created_at.isoformat() if created_at else None
            }
            
        finally:
            cur.close()
            db_pool.putconn(conn)
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token validation error: {str(e)}")
        raise HTTPException(status_code=500, detail="Token validation failed")

# Add these endpoints after the existing ones

@app.post("/api/users")
async def create_user(user_data: UserCreate):
    """Create a new user"""
    try:
        conn = db_pool.getconn()
        cur = conn.cursor()
        
        # Check if user already exists
        cur.execute("SELECT id FROM users WHERE email = %s", (user_data.email,))
        if cur.fetchone():
            raise HTTPException(status_code=409, detail="User already exists")
        
        # Hash password
        password_hash = bcrypt.hashpw(user_data.password.encode(), bcrypt.gensalt()).decode()
        
        # Create user
        user_id = str(uuid.uuid4())
        current_time = datetime.now(timezone.utc)
        
        cur.execute("""
            INSERT INTO users (id, email, first_name, last_name, password_hash, is_active, is_advisor, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, email, first_name, last_name, is_active, is_advisor, created_at
        """, (
            user_id, user_data.email, user_data.first_name, user_data.last_name,
            password_hash, True, user_data.is_advisor, current_time, current_time
        ))
        
        result = cur.fetchone()
        conn.commit()
        
        # Generate JWT token for the new user
        token_data = {
            "userId": result[0],  # user_id - using userId for consistency with login endpoint
            "email": result[1],
            "first_name": result[2],
            "last_name": result[3],
            "exp": datetime.utcnow() + timedelta(days=7)
        }
        token = jwt.encode(token_data, JWT_SECRET, algorithm="HS256")
        
        return {
            "id": result[0],
            "email": result[1],
            "first_name": result[2],
            "last_name": result[3],
            "is_active": result[4],
            "is_advisor": result[5],
            "created_at": result[6].isoformat() if result[6] else None,
            "token": token  # Include the token in the response
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail="Failed to create user")
    finally:
        if conn:
            db_pool.putconn(conn)

@app.get("/api/users")
async def get_users():
    """Get all users (for admin purposes)"""
    try:
        conn = db_pool.getconn()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT id, email, first_name, last_name, is_active, is_advisor, created_at, updated_at
            FROM users
            ORDER BY created_at DESC
        """)
        
        users = []
        for row in cur.fetchall():
            users.append({
                "id": row[0],
                "email": row[1],
                "first_name": row[2],
                "last_name": row[3],
                "is_active": row[4],
                "is_advisor": row[5],
                "created_at": row[6].isoformat() if row[6] else None,
                "updated_at": row[7].isoformat() if row[7] else None
            })
        
        return {"users": users}
        
    except Exception as e:
        logger.error(f"Error fetching users: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch users")
    finally:
        if conn:
            db_pool.putconn(conn)

@app.get("/api/users/{user_id}")
async def get_user(user_id: str):
    """Get a specific user by ID"""
    try:
        conn = db_pool.getconn()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT id, email, first_name, last_name, is_active, is_advisor, created_at, updated_at
            FROM users
            WHERE id = %s
        """, (user_id,))
        
        user = cur.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {
            "id": user[0],
            "email": user[1],
            "first_name": user[2],
            "last_name": user[3],
            "is_active": user[4],
            "is_advisor": user[5],
            "created_at": user[6].isoformat() if user[6] else None,
            "updated_at": user[7].isoformat() if user[7] else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch user")
    finally:
        if conn:
            db_pool.putconn(conn)

@app.put("/api/users/{user_id}")
async def update_user(user_id: str, user_data: UserUpdate):
    """Update a user"""
    try:
        conn = db_pool.getconn()
        cur = conn.cursor()
        
        # Check if user exists
        cur.execute("SELECT id FROM users WHERE id = %s", (user_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="User not found")
        
        # Build update query dynamically
        update_fields = []
        update_values = []
        
        if user_data.first_name is not None:
            update_fields.append("first_name = %s")
            update_values.append(user_data.first_name)
        
        if user_data.last_name is not None:
            update_fields.append("last_name = %s")
            update_values.append(user_data.last_name)
        
        if user_data.is_active is not None:
            update_fields.append("is_active = %s")
            update_values.append(user_data.is_active)
        
        if not update_fields:
            return {"message": "No updates provided"}
        
        update_fields.append("updated_at = %s")
        update_values.append(datetime.now(timezone.utc))
        update_values.append(user_id)
        
        query = f"""
            UPDATE users 
            SET {', '.join(update_fields)}
            WHERE id = %s
            RETURNING id, email, first_name, last_name, is_active, updated_at
        """
        
        cur.execute(query, update_values)
        result = cur.fetchone()
        conn.commit()
        
        return {
            "id": result[0],
            "email": result[1],
            "first_name": result[2],
            "last_name": result[3],
            "is_active": result[4],
            "updated_at": result[5].isoformat() if result[5] else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user {user_id}: {e}")
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail="Failed to update user")
    finally:
        if conn:
            db_pool.putconn(conn)

@app.delete("/api/users/{user_id}")
async def delete_user(user_id: str):
    """Delete a user (soft delete by setting is_active to false)"""
    try:
        conn = db_pool.getconn()
        cur = conn.cursor()
        
        # Check if user exists
        cur.execute("SELECT id FROM users WHERE id = %s", (user_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="User not found")
        
        # Soft delete by setting is_active to false
        cur.execute("""
            UPDATE users 
            SET is_active = false, updated_at = %s
            WHERE id = %s
        """, (datetime.now(timezone.utc), user_id))
        
        conn.commit()
        
        return {"message": "User deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting user {user_id}: {e}")
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete user")
    finally:
        if conn:
            db_pool.putconn(conn)

# Assets and Liabilities Management Endpoints
class ManualAsset(BaseModel):
    name: str
    asset_class: str
    value: float
    description: Optional[str] = None

class ManualLiability(BaseModel):
    name: str
    liability_class: str
    balance: float
    interest_rate: Optional[float] = None
    minimum_payment: Optional[float] = None
    description: Optional[str] = None

@app.get("/api/assets-liabilities/{user_id}")
async def get_assets_liabilities(user_id: str):
    """Get all assets and liabilities for a user (both from Plaid accounts and manual entries)"""
    try:
        conn = db_pool.getconn()
        cur = conn.cursor()
        
        # Get Plaid-connected accounts (assets and liabilities)
        cur.execute("""
            SELECT 
                account_id, name, institution_name, type, subtype, 
                current_balance, available_balance, currency_code,
                created_at, updated_at
            FROM accounts 
            WHERE user_id = %s
            ORDER BY type, name
        """, (user_id,))
        
        plaid_accounts = []
        for row in cur.fetchall():
            account_type = row[3]
            account_subtype = row[4] or ''
            current_balance = float(row[5] or 0)
            
            # Determine if it's an asset or liability based on account type
            is_asset = account_type in ['investment', 'brokerage'] or \
                      (account_type == 'depository' and account_subtype in ['checking', 'savings', 'cd', 'money market'])
            
            # For credit cards and loans, positive balance means debt (liability)
            # For checking/savings, positive balance means asset
            if account_type in ['credit', 'loan']:
                is_asset = False
                current_balance = abs(current_balance)  # Make sure liabilities show as positive numbers
            
            plaid_accounts.append({
                "id": row[0],
                "name": row[1],
                "institution": row[2],
                "type": account_type,
                "subtype": account_subtype,
                "balance": current_balance,
                "available_balance": float(row[6] or 0),
                "currency": row[7],
                "is_asset": is_asset,
                "source": "plaid",
                "created_at": row[8].isoformat() if row[8] else None,
                "updated_at": row[9].isoformat() if row[9] else None
            })
        
        # Get manual assets
        cur.execute("""
            SELECT 
                id, name, asset_class, value, description,
                created_at, updated_at
            FROM manual_assets 
            WHERE user_id = %s
            ORDER BY asset_class, name
        """, (user_id,))
        
        manual_assets = []
        for row in cur.fetchall():
            manual_assets.append({
                "id": row[0],
                "name": row[1],
                "asset_class": row[2],
                "value": float(row[3] or 0),
                "description": row[4],
                "source": "manual",
                "created_at": row[5].isoformat() if row[5] else None,
                "updated_at": row[6].isoformat() if row[6] else None
            })
        
        # Get manual liabilities
        cur.execute("""
            SELECT 
                id, name, liability_class, balance, interest_rate,
                minimum_payment, description, created_at, updated_at
            FROM manual_liabilities 
            WHERE user_id = %s
            ORDER BY liability_class, name
        """, (user_id,))
        
        manual_liabilities = []
        for row in cur.fetchall():
            manual_liabilities.append({
                "id": row[0],
                "name": row[1],
                "liability_class": row[2],
                "balance": float(row[3] or 0),
                "interest_rate": float(row[4]) if row[4] else None,
                "minimum_payment": float(row[5]) if row[5] else None,
                "description": row[6],
                "source": "manual",
                "created_at": row[7].isoformat() if row[7] else None,
                "updated_at": row[8].isoformat() if row[8] else None
            })
        
        # Combine and categorize
        assets = []
        liabilities = []
        
        # Add Plaid accounts to appropriate category
        for account in plaid_accounts:
            if account["is_asset"]:
                assets.append(account)
            else:
                liabilities.append(account)
        
        # Add manual entries
        assets.extend(manual_assets)
        liabilities.extend(manual_liabilities)
        
        # Calculate totals
        total_assets = sum(a.get("balance", 0) or a.get("value", 0) for a in assets)
        total_liabilities = sum(l.get("balance", 0) for l in liabilities)
        net_worth = total_assets - total_liabilities
        
        return {
            "assets": assets,
            "liabilities": liabilities,
            "total_assets": total_assets,
            "total_liabilities": total_liabilities,
            "net_worth": net_worth,
            "has_plaid_connection": len(plaid_accounts) > 0
        }
        
    except Exception as e:
        logger.error(f"Error fetching assets/liabilities for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch assets and liabilities")
    finally:
        if conn:
            db_pool.putconn(conn)

@app.post("/api/assets/{user_id}")
async def create_manual_asset(user_id: str, asset: ManualAsset):
    """Create a manual asset entry"""
    try:
        conn = db_pool.getconn()
        cur = conn.cursor()
        
        asset_id = str(uuid.uuid4())
        current_time = datetime.now(timezone.utc)
        
        cur.execute("""
            INSERT INTO manual_assets (id, user_id, name, asset_class, value, description, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (asset_id, user_id, asset.name, asset.asset_class, asset.value, asset.description, current_time, current_time))
        
        conn.commit()
        
        return {"id": asset_id, "message": "Asset created successfully"}
        
    except Exception as e:
        logger.error(f"Error creating asset: {e}")
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail="Failed to create asset")
    finally:
        if conn:
            db_pool.putconn(conn)

@app.put("/api/assets/{asset_id}")
async def update_manual_asset(asset_id: str, asset: ManualAsset):
    """Update a manual asset entry"""
    try:
        conn = db_pool.getconn()
        cur = conn.cursor()
        
        cur.execute("""
            UPDATE manual_assets 
            SET name = %s, asset_class = %s, value = %s, description = %s, updated_at = %s
            WHERE id = %s
            RETURNING id
        """, (asset.name, asset.asset_class, asset.value, asset.description, datetime.now(timezone.utc), asset_id))
        
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Asset not found")
        
        conn.commit()
        
        return {"message": "Asset updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating asset: {e}")
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail="Failed to update asset")
    finally:
        if conn:
            db_pool.putconn(conn)

@app.delete("/api/assets/{asset_id}")
async def delete_manual_asset(asset_id: str):
    """Delete a manual asset entry"""
    try:
        conn = db_pool.getconn()
        cur = conn.cursor()
        
        cur.execute("DELETE FROM manual_assets WHERE id = %s RETURNING id", (asset_id,))
        
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Asset not found")
        
        conn.commit()
        
        return {"message": "Asset deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting asset: {e}")
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete asset")
    finally:
        if conn:
            db_pool.putconn(conn)

@app.post("/api/liabilities/{user_id}")
async def create_manual_liability(user_id: str, liability: ManualLiability):
    """Create a manual liability entry"""
    try:
        conn = db_pool.getconn()
        cur = conn.cursor()
        
        liability_id = str(uuid.uuid4())
        current_time = datetime.now(timezone.utc)
        
        cur.execute("""
            INSERT INTO manual_liabilities (id, user_id, name, liability_class, balance, interest_rate, minimum_payment, description, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (liability_id, user_id, liability.name, liability.liability_class, liability.balance, 
              liability.interest_rate, liability.minimum_payment, liability.description, current_time, current_time))
        
        conn.commit()
        
        return {"id": liability_id, "message": "Liability created successfully"}
        
    except Exception as e:
        logger.error(f"Error creating liability: {e}")
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail="Failed to create liability")
    finally:
        if conn:
            db_pool.putconn(conn)

@app.put("/api/liabilities/{liability_id}")
async def update_manual_liability(liability_id: str, liability: ManualLiability):
    """Update a manual liability entry"""
    try:
        conn = db_pool.getconn()
        cur = conn.cursor()
        
        cur.execute("""
            UPDATE manual_liabilities 
            SET name = %s, liability_class = %s, balance = %s, interest_rate = %s, 
                minimum_payment = %s, description = %s, updated_at = %s
            WHERE id = %s
            RETURNING id
        """, (liability.name, liability.liability_class, liability.balance, liability.interest_rate,
              liability.minimum_payment, liability.description, datetime.now(timezone.utc), liability_id))
        
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Liability not found")
        
        conn.commit()
        
        return {"message": "Liability updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating liability: {e}")
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail="Failed to update liability")
    finally:
        if conn:
            db_pool.putconn(conn)

@app.delete("/api/liabilities/{liability_id}")
async def delete_manual_liability(liability_id: str):
    """Delete a manual liability entry"""
    try:
        conn = db_pool.getconn()
        cur = conn.cursor()
        
        cur.execute("DELETE FROM manual_liabilities WHERE id = %s RETURNING id", (liability_id,))
        
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Liability not found")
        
        conn.commit()
        
        return {"message": "Liability deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting liability: {e}")
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete liability")
    finally:
        if conn:
            db_pool.putconn(conn)

# Goals Management Endpoints
class GoalCreate(BaseModel):
    name: str
    description: Optional[str] = None
    target_amount: float
    current_amount: float = 0
    target_date: Optional[str] = None
    priority: Optional[str] = "medium"

class GoalUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    target_amount: Optional[float] = None
    current_amount: Optional[float] = None
    target_date: Optional[str] = None
    priority: Optional[str] = None
    is_active: Optional[bool] = None

@app.post("/api/goals/{user_id}")
async def create_goal(user_id: str, goal: GoalCreate):
    """Create a new financial goal"""
    try:
        conn = db_pool.getconn()
        cur = conn.cursor()
        
        goal_id = str(uuid.uuid4())
        current_time = datetime.now(timezone.utc)
        
        cur.execute("""
            INSERT INTO goals (id, user_id, name, description, target_amount, current_amount, 
                             target_date, priority, is_active, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (goal_id, user_id, goal.name, goal.description, goal.target_amount, 
              goal.current_amount, goal.target_date, goal.priority, True, current_time, current_time))
        
        conn.commit()
        
        return {"id": goal_id, "message": "Goal created successfully"}
        
    except Exception as e:
        logger.error(f"Error creating goal: {e}")
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail="Failed to create goal")
    finally:
        if conn:
            db_pool.putconn(conn)

@app.put("/api/goals/{goal_id}")
async def update_goal(goal_id: str, goal: GoalUpdate):
    """Update a financial goal"""
    try:
        conn = db_pool.getconn()
        cur = conn.cursor()
        
        # Build update query dynamically
        update_fields = []
        update_values = []
        
        if goal.name is not None:
            update_fields.append("name = %s")
            update_values.append(goal.name)
        if goal.description is not None:
            update_fields.append("description = %s")
            update_values.append(goal.description)
        if goal.target_amount is not None:
            update_fields.append("target_amount = %s")
            update_values.append(goal.target_amount)
        if goal.current_amount is not None:
            update_fields.append("current_amount = %s")
            update_values.append(goal.current_amount)
        if goal.target_date is not None:
            update_fields.append("target_date = %s")
            update_values.append(goal.target_date)
        if goal.priority is not None:
            update_fields.append("priority = %s")
            update_values.append(goal.priority)
        if goal.is_active is not None:
            update_fields.append("is_active = %s")
            update_values.append(goal.is_active)
        
        if not update_fields:
            return {"message": "No updates provided"}
        
        update_fields.append("updated_at = %s")
        update_values.append(datetime.now(timezone.utc))
        update_values.append(goal_id)
        
        query = f"""
            UPDATE goals 
            SET {', '.join(update_fields)}
            WHERE id = %s
            RETURNING id
        """
        
        cur.execute(query, update_values)
        
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Goal not found")
        
        conn.commit()
        
        return {"message": "Goal updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating goal: {e}")
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail="Failed to update goal")
    finally:
        if conn:
            db_pool.putconn(conn)

@app.delete("/api/goals/{goal_id}")
async def delete_goal(goal_id: str):
    """Delete a financial goal"""
    try:
        conn = db_pool.getconn()
        cur = conn.cursor()
        
        cur.execute("DELETE FROM goals WHERE id = %s RETURNING id", (goal_id,))
        
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Goal not found")
        
        conn.commit()
        
        return {"message": "Goal deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting goal: {e}")
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete goal")
    finally:
        if conn:
            db_pool.putconn(conn)

# Notifications endpoint
@app.get("/api/notifications/{user_id}")
async def get_notifications(user_id: str):
    """Get user notifications based on their financial data"""
    try:
        conn = db_pool.getconn()
        cur = conn.cursor()
        
        notifications = []
        
        # Check for low balances
        cur.execute("""
            SELECT name, current_balance 
            FROM accounts 
            WHERE user_id = %s AND current_balance < 100
        """, (user_id,))
        
        for row in cur.fetchall():
            notifications.append({
                "type": "warning",
                "title": "Low Balance Alert",
                "message": f"Your {row[0]} has a low balance of ${row[1]:.2f}",
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
        
        # Check for upcoming bills
        cur.execute("""
            SELECT name, amount, due_date 
            FROM bills 
            WHERE user_id = %s AND due_date BETWEEN now() AND now() + interval '7 days'
        """, (user_id,))
        
        for row in cur.fetchall():
            notifications.append({
                "type": "info",
                "title": "Upcoming Bill",
                "message": f"{row[0]} payment of ${row[1]:.2f} due on {row[2]}",
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
        
        # Check for goal progress
        cur.execute("""
            SELECT name, current_amount, target_amount 
            FROM goals 
            WHERE user_id = %s AND is_active = true 
            AND current_amount >= target_amount * 0.9
        """, (user_id,))
        
        for row in cur.fetchall():
            progress = (row[1] / row[2]) * 100
            notifications.append({
                "type": "success",
                "title": "Goal Achievement",
                "message": f"You're {progress:.0f}% towards your {row[0]} goal!",
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
        
        # Check for unusual spending
        cur.execute("""
            SELECT category, SUM(amount) as total
            FROM transactions
            WHERE user_id = %s 
            AND date >= now() - interval '30 days'
            AND amount < 0
            GROUP BY category
            HAVING SUM(amount) < -1000
            ORDER BY total
            LIMIT 3
        """, (user_id,))
        
        for row in cur.fetchall():
            notifications.append({
                "type": "alert",
                "title": "High Spending Alert",
                "message": f"You've spent ${abs(row[1]):.2f} on {row[0]} this month",
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
        
        return {"notifications": notifications}
        
    except Exception as e:
        logger.error(f"Error fetching notifications: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch notifications")
    finally:
        if conn:
            db_pool.putconn(conn)

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