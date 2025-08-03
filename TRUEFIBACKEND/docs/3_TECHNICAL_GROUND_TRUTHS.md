# Technical Ground Truths

## Stack
- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Backend:** FastAPI (Python), PostgreSQL
- **AI:** OpenAI GPT-4o
- **Data Aggregation:** Plaid API

## Frontend Structure
- `/hooks/`: State management for chat, financial data, auth
- `/contexts/`: React Context providers for user session and config
- `/app/`: App router structure
- `/api/`: Next.js API endpoints

## Backend Rules
- JWT authentication is required on all endpoints
- All chat logic runs through `main.py` and the `/chat` route
- Database queries go through SQLAlchemy or Prisma client

## AI Rules
- GPT prompts include user context, budget, goals
- Do not change prompt tone/personality without a clear reason
