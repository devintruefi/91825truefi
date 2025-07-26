# TRUEFIBACKEND/main.py
# Enterprise-grade FastAPI backend for authenticated chatbot.
# Features: JWT auth, async OpenAI calls, DB pooling, comprehensive session analysis.
# Scalable: Multi-user, async, expandable for agents/model.

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

load_dotenv()

# Config
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
DATABASE_URL = os.getenv("DATABASE_URL")
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key")

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
        
        return {"status": "healthy", "database": "connected"}
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

security = HTTPBearer()

class MessageInput(BaseModel):
    message: str
    session_id: Optional[str] = None
    conversation_history: Optional[List[Dict]] = []

class EndSessionInput(BaseModel):
    session_id: str

class LoginInput(BaseModel):
    email: str
    password: str

# Auth - align with your existing JWT structure
async def authenticate(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user_id = payload.get('userId') or payload.get('sub')  # Handle both formats
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        return user_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

# DB cursor dependency with better error handling
def get_db_cursor():
    conn = None
    cur = None
    try:
        conn = db_pool.getconn()
        if conn is None:
            raise HTTPException(status_code=500, detail="Database connection failed")
        
        # Test connection
        conn.autocommit = False
        cur = conn.cursor()
        
        yield cur, conn
    except psycopg2.OperationalError as e:
        logger.error(f"Database connection error: {e}")
        if conn:
            try:
                conn.rollback()
            except:
                pass
        raise HTTPException(status_code=500, detail="Database connection error")
    except Exception as e:
        logger.error(f"Database error: {e}")
        if conn:
            try:
                conn.rollback()
            except:
                pass
        raise HTTPException(status_code=500, detail="Database error")
    finally:
        if cur:
            try:
                cur.close()
            except:
                pass
        if conn:
            try:
                db_pool.putconn(conn)
            except:
                pass

# Enhanced System Prompt with your existing formatting
SYSTEM_PROMPT = """
You are Penny, a professional AI financial advisor. Greet the user by their name: {user_name}. 
Your tone is empathetic, expert, encouraging, and professional.

**CRITICAL MATH RENDERING RULES:**
- ALL mathematical expressions MUST be wrapped in LaTeX delimiters:
  - Use $...$ for inline math (e.g., "The ROI is $ROI = \\frac{{Final - Initial}}{{Initial}} \\times 100\\%$")
  - Use $$...$$ for display/block math (e.g., "$$Net\\ Gain = Final\\ Value - Initial\\ Cost$$")
- NEVER output plain text formulas like "SavingsRate = MonthlySavings / MonthlyIncome * 100"
- ALWAYS use proper LaTeX syntax:
  - Fractions: $\\frac{{numerator}}{{denominator}}$
  - Text in math: $\\text{{Savings Rate}}$
  - Percentages: $100\\%$
  - Operators: $\\times$, $\\div$, $\\pm$, $\\leq$, $\\geq$
  - Exponents: $x^2$, $(1 + r)^t$

**STRICT OUTPUT RULES:**
- Always use the user's real data for all calculations, tables, and charts
- Output must be clean, readable, and visually structured:
  - Use **bold** and _italic_ for emphasis (never HTML tags)
  - Use bullet points and multi-line structure for readability
  - Use emoji-labeled section headings (e.g. "💡 Insight", "📊 Table", "📈 Chart")
- **Tables:** Output as clean Markdown with | separators and clear headers
- **Charts/Graphs:** Provide chart data in structured JSON inside <chart> tags:
  <chart type="line" title="Savings Growth Over Time" colors="['#0070f3','#10b981']">[{{"x": "Jan", "y": 1000}}, {{"x": "Feb", "y": 1500}}]</chart>
- For every output, always provide:
  - ✅ A clear recommendation
  - 💬 The reasoning behind it
  - 🔁 A relevant alternative
  - 🧭 A follow-up question

**USER'S FINANCIAL DATA:**
{data_dump}

**CHAT HISTORY:**
{history}

Do not hallucinate data not provided. If information is missing, politely ask for it.
"""

# Chat endpoint
@app.post("/chat")
async def chat(input: MessageInput, user_id: str = Depends(authenticate), db = Depends(get_db_cursor)):
    cur, conn = db
    try:
        # Fetch user name and data dump
        user_name = get_user_name(cur, user_id)
        data_dump = get_data_dump(cur, user_id)

        session_id = input.session_id or str(uuid.uuid4())

        # Create session if it doesn't exist
        create_session(cur, session_id, user_id, conn)

        # Store user message
        store_message(cur, session_id, "user", input.message, conn)

        # Get history
        history = get_history(cur, session_id)

        # Build messages
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

        # Store bot message
        store_message(cur, session_id, "assistant", bot_message, conn)

        return {"message": bot_message, "session_id": session_id}
        
    except psycopg2.OperationalError as e:
        logger.error(f"Database connection error for user {user_id}: {str(e)}")
        logger.error(f"Full traceback: {traceback.format_exc()}")
        try:
            conn.rollback()
        except:
            pass
        raise HTTPException(status_code=500, detail="Database connection error. Please try again.")
    except Exception as e:
        logger.error(f"Chat error for user {user_id}: {str(e)}")
        logger.error(f"Full traceback: {traceback.format_exc()}")
        try:
            conn.rollback()
        except:
            pass
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")

# End session endpoint with comprehensive analysis
@app.post("/end-session")
async def end_session(input: EndSessionInput, user_id: str = Depends(authenticate), db = Depends(get_db_cursor)):
    cur, conn = db
    try:
        session_id = input.session_id
        
        # Get full history
        history = get_history(cur, session_id)
        data_dump = get_data_dump(cur, user_id)
        user_name = get_user_name(cur, user_id)

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
    # Convert session_id to UUID if it's a string, then back to string for PostgreSQL
    session_uuid = uuid.UUID(session_id) if isinstance(session_id, str) else session_id
    # Convert user_id to UUID if it's a string, then back to string for PostgreSQL
    user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
    
    # Check if session already exists
    cur.execute("SELECT id FROM chat_sessions WHERE session_id = %s", (str(session_uuid),))
    existing_session = cur.fetchone()
    
    if not existing_session:
        cur.execute("""
            INSERT INTO chat_sessions (id, user_id, session_id, title, is_active, created_at, updated_at)
            VALUES (%s, %s, %s, %s, true, now(), now())
        """, (str(uuid.uuid4()), str(user_uuid), str(session_uuid), f"Chat Session {datetime.now().strftime('%Y-%m-%d %H:%M')}"))
        conn.commit()

def get_history(cur, session_id):
    # Convert session_id to UUID if it's a string, then back to string for PostgreSQL
    session_uuid = uuid.UUID(session_id) if isinstance(session_id, str) else session_id
    
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
    # Convert session_id to UUID if it's a string, then back to string for PostgreSQL
    session_uuid = uuid.UUID(session_id) if isinstance(session_id, str) else session_id
    
    # First get the chat_sessions.id for this session_id
    cur.execute("SELECT id FROM chat_sessions WHERE session_id = %s", (str(session_uuid),))
    session_row = cur.fetchone()
    if not session_row:
        raise Exception(f"Session {session_id} not found in chat_sessions table")
    
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
        if not bcrypt.checkpw(input.password.encode(), password_hash.encode()):
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

@app.on_event("shutdown")
def shutdown():
    db_pool.closeall()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080, workers=4) 