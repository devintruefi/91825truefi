# Chat Architecture Documentation

## Overview
The TrueFi chat system has been migrated to a unified architecture where all chat logic is handled by the FastAPI backend (TRUEFIBACKEND), with the Next.js frontend acting as a thin proxy layer.

## Architecture Flow

```
Frontend (apple-chat-interface.tsx)
    ↓
Next.js API Route (/api/chat/route.ts) [Thin Proxy]
    ↓
FastAPI Backend (TRUEFIBACKEND/main.py)
    ├── /chat (authenticated users)
    └── /chat/public (non-authenticated/demo users)
```

## Components

### 1. Frontend Component
**File**: `components/apple-chat-interface.tsx`
- Handles UI/UX for chat interface
- Detects authentication status via `useUser()` hook
- Sends requests to `/api/chat` with or without auth token
- Displays personalized greeting for logged-in users
- Shows "Sample User" greeting for non-authenticated users

### 2. Next.js API Proxy
**File**: `app/api/chat/route.ts`
- Acts as a thin proxy layer
- Routes authenticated requests to FastAPI `/chat` endpoint
- Routes non-authenticated requests to FastAPI `/chat/public` endpoint
- Forwards JWT authentication headers when present
- Provides fallback responses if backend is unavailable
- Transforms FastAPI response format to match frontend expectations

### 3. FastAPI Backend
**File**: `TRUEFIBACKEND/main.py`

#### Authenticated Endpoint (`/chat`)
- Validates JWT token
- Retrieves user context and financial data
- Uses sophisticated agent framework for intelligent responses
- Stores chat history in database (`chat_sessions`, `chat_messages` tables)
- Returns personalized financial advice based on user data

#### Public Endpoint (`/chat/public`)
- No authentication required
- Uses basic OpenAI chat without user context
- Provides demo experience for potential users
- Uses sample financial data for demonstrations

## Data Flow

### For Authenticated Users:
1. User types message in frontend
2. Frontend sends POST to `/api/chat` with:
   - `message`: User's message
   - `sessionId`: Current session ID
   - `Authorization` header with JWT token
3. Next.js proxy forwards to FastAPI `/chat`
4. FastAPI:
   - Validates JWT token
   - Creates/retrieves session
   - Stores message in database
   - Processes with agent framework
   - Returns AI response
5. Response flows back through proxy to frontend

### For Non-Authenticated Users:
1. User types message in frontend
2. Frontend sends POST to `/api/chat` with:
   - `message`: User's message
   - `sessionId`: Current session ID
   - No Authorization header
3. Next.js proxy forwards to FastAPI `/chat/public`
4. FastAPI:
   - Processes with basic OpenAI
   - Returns generic response
5. Response flows back through proxy to frontend

## Database Schema

### chat_sessions Table
- `id`: UUID (primary key)
- `user_id`: UUID (foreign key to users)
- `session_id`: VARCHAR (legacy session identifier)
- `title`: VARCHAR
- `is_active`: BOOLEAN
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP

### chat_messages Table
- `id`: UUID (primary key)
- `session_id`: UUID (foreign key to chat_sessions)
- `user_id`: UUID (foreign key to users)
- `message_type`: VARCHAR ('user' or 'assistant')
- `content`: TEXT
- `turn_number`: INTEGER
- `created_at`: TIMESTAMP

## Authentication

- JWT tokens are generated during login
- Tokens contain `userId`, `first_name`, and other user metadata
- Frontend stores token in localStorage as `auth_token`
- Token is sent in Authorization header: `Bearer <token>`
- Backend validates token and extracts user ID

## Benefits of This Architecture

1. **Single Source of Truth**: All business logic in FastAPI backend
2. **Better AI Integration**: Python backend can leverage ML libraries
3. **Centralized Data Access**: Direct database access for context building
4. **Simplified Authentication**: One JWT validation implementation
5. **Scalability**: Backend can be scaled independently
6. **Consistency**: Same chat logic for all authenticated users
7. **Maintainability**: Easier to update and debug chat features

## Environment Variables

### Next.js (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8000  # FastAPI backend URL
```

### FastAPI (.env)
```
OPENAI_API_KEY=<your-key>
DATABASE_URL=<postgres-connection-string>
JWT_SECRET=<jwt-secret-key>
```

## Error Handling

1. **Backend Unavailable**: Next.js provides fallback responses
2. **Invalid JWT**: Returns 401, frontend redirects to login
3. **Database Errors**: Backend returns 500, friendly message shown
4. **OpenAI Errors**: Falls back to agent framework or generic response

## Future Enhancements

1. Add WebSocket support for real-time streaming
2. Implement conversation memory across sessions
3. Add file upload support for document analysis
4. Enhance agent framework with more specialized agents
5. Add multi-language support