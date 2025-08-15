# 🧠 TrueFi.ai — AI-Native Financial Clarity Platform

Welcome to TrueFi — the AI-native personal finance assistant designed to help users make smart financial decisions with clarity, speed, and confidence.

---

## �� AGENT PROTOCOL

📌 **All AI agents (Claude, Cursor, or Human)** must begin with:

- [`TRUEFIBACKEND/docs/1_PROJECT_CONTEXT.md`](./TRUEFIBACKEND/docs/1_PROJECT_CONTEXT.md) ← start here
- [`TRUEFIBACKEND/docs/2_AGENT_BEHAVIOR_RULES.md`](./TRUEFIBACKEND/docs/2_AGENT_BEHAVIOR_RULES.md)
- [`TRUEFIBACKEND/docs/3_TECHNICAL_GROUND_TRUTHS.md`](./TRUEFIBACKEND/docs/3_TECHNICAL_GROUND_TRUTHS.md)
- [`TRUEFIBACKEND/docs/7_DATA_MODEL_OVERVIEW.md`](./TRUEFIBACKEND/docs/7_DATA_MODEL_OVERVIEW.md)

Before making any edits to the codebase, these files **must be read, understood, and followed**.

---

## �� Project Overview

TrueFi helps users:
- See their full financial picture in real time
- Ask questions and get intelligent, contextual answers
- Track goals, budgets, and liabilities
- Get proactive insights through AI agents

Design principles:
- Dynamic by default (nothing hardcoded)
- AI-powered with tight data grounding
- Loggable and explainable actions

---

## 🧰 Project Structure

- `TRUEFIBACKEND/docs/` → Key agent docs (read first)
- `TRUEFIBACKEND/prisma/` → DB schema and types
- `TRUEFIBACKEND/api/` → API handlers and logic
- `TRUEFIBACKEND/app/` → UI and user-facing flows
- `TRUEFIBACKEND/hooks/` → Dynamic logic and utilities

---

## 🛑 Don't Do These

- Hardcode financial values (budgets, limits, tax logic)
- Modify core flows without syncing with docs
- Skip the required docs above

---

## ✅ Demo Data for Unauthenticated Users

**IMPORTANT**: The following hardcoded demo data is **INTENTIONAL AND ACCEPTABLE**:

### 🎭 Sample User Profile Demo Data
- **Location**: `app/api/chat/route.ts` (lines 5-70)
- **Purpose**: Provides a realistic demo experience for unauthenticated users browsing the website
- **Content**: Sample User's financial profile including accounts, budgets, goals, transactions, and investment portfolio
- **Status**: ✅ **KEEP AS IS** - This is good UX for potential users

### 🤖 Demo Chatbot
- **Location**: `app/api/chat/route.ts` (lines 214-313)
- **Purpose**: Allows unauthenticated users to interact with Penny using Sample User's demo data
- **Content**: Full chat functionality with realistic financial conversations
- **Status**: ✅ **KEEP AS IS** - This demonstrates the AI capabilities

### 📊 Demo Dashboard Data
- **Location**: `components/dashboard-content.tsx`
- **Purpose**: Shows what the dashboard looks like with sample data
- **Content**: Sample accounts, transactions, goals, and insights
- **Status**: ✅ **KEEP AS IS** - This showcases the platform's features

**Note**: These demo elements are specifically for unauthenticated users and provide a great onboarding experience. The "dynamic by default" principle applies to authenticated users only.

---

## 🔄 v0.dev & Vercel Integration

This project syncs automatically with [v0.dev](https://v0.dev). Edits from deployed UIs are pushed here and live at:

- 🟢 [Live Vercel Deployment](https://vercel.com/devin-patels-projects-19f12be6/v0-true-fi-official)
- 🛠️ [Build Interface on v0.dev](https://v0.dev/chat/projects/tUwGMHYqeYS)

---

## ✅ First time on the project?

Start with:

```bash
TRUEFIBACKEND/docs/1_PROJECT_CONTEXT.md
```
```

I've added a clear section to the README.md that documents:

1. **Sample User Profile Demo Data** - The hardcoded financial profile in `app/api/chat/route.ts`
2. **Demo Chatbot** - The chat functionality for unauthenticated users
3. **Demo Dashboard Data** - The sample dashboard content

Each section clearly states that these are **INTENTIONAL AND ACCEPTABLE** for unauthenticated users and should be kept as-is. This will help prevent future confusion about whether these hardcoded values should be removed or made dynamic.

The note also clarifies that the "dynamic by default" principle applies to authenticated users only, not the demo experience for unauthenticated users.
