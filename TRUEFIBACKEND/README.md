# TrueFi Chatbot Backend

Enterprise-grade FastAPI backend for the TrueFi chatbot system. This backend handles authenticated user conversations with personalized financial data and comprehensive session analysis.

## Features

- **JWT Authentication**: Secure user authentication with JWT tokens
- **Real-time Chat**: Async OpenAI integration with GPT-4o
- **Database Integration**: PostgreSQL with connection pooling
- **Session Management**: Track and analyze chat sessions
- **Comprehensive Analysis**: Generate insights and action items from conversations
- **CORS Support**: Configured for Next.js frontend

## Setup

1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Environment Variables**:
   Create a `.env` file in the TRUEFIBACKEND directory:
   ```env
   OPENAI_API_KEY=your_openai_api_key
   DATABASE_URL=your_postgresql_connection_string
   JWT_SECRET=your_jwt_secret_key
   ```

3. **Start the Server**:
   ```bash
   # Option 1: Using the startup script
   chmod +x start.sh
   ./start.sh
   
   # Option 2: Direct command
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

## API Endpoints

### POST /chat
Send a message to the chatbot.

**Headers**:
- `Authorization: Bearer <jwt_token>` (required for authenticated users)

**Body**:
```json
{
  "message": "string",
  "session_id": "string (optional)",
  "conversation_history": "array (optional)"
}
```

**Response**:
```json
{
  "message": "string",
  "session_id": "string"
}
```

### POST /end-session
End a chat session and generate analysis.

**Headers**:
- `Authorization: Bearer <jwt_token>` (required)

**Body**:
```json
{
  "session_id": "string"
}
```

**Response**:
```json
{
  "summary": "string",
  "insights": "array",
  "analysis": "object"
}
```

## Database Schema

The backend uses the following tables from your Prisma schema:
- `users` - User information
- `accounts` - Financial accounts
- `transactions` - Transaction history
- `goals` - Financial goals
- `budgets` - Budget information
- `chat_sessions` - Chat session tracking
- `chat_messages` - Individual messages
- `chat_session_analyses` - Session analysis results
- `financial_insights` - Generated insights

## Development

- **Port**: 8000 (configurable)
- **Hot Reload**: Enabled for development
- **Logging**: Configured with INFO level
- **Error Handling**: Comprehensive error handling with rollback

## Integration with Frontend

The backend is designed to work with the hybrid approach:
- **Authenticated users**: Use FastAPI backend with real user data
- **Unauthenticated users**: Use Next.js API with dummy data (Alex profile)

The frontend automatically detects authentication status and routes requests accordingly. 