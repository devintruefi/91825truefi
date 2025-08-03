# TrueFi Data Model Overview

This document provides a structured overview of the TrueFi database schema. It is designed specifically for AI agents (Claude, Cursor, etc.) and developers to:

- Understand what each model represents
- Safely interact with structured data
- Avoid destructive changes to critical relationships
- Ensure dynamic, personalized behavior is preserved

---

## 🔐 Core Data Philosophy

> Every user’s financial state, preferences, and activity is dynamically modeled.  
> **Agents must never hardcode**, assume, or bypass these models.

All logic, insights, and experiences must be derived from these structured relationships — especially when building or modifying APIs, AI prompts, or UI components.

---

## 👤 USERS & IDENTITY MODELS

| Table               | Purpose                                                 |
|---------------------|---------------------------------------------------------|
| `users`             | Primary user table. Includes contact info, account flags, and AI preferences. |
| `user_identity`     | Full name, phone, email, and physical address data.     |
| `user_preferences`  | Stores user-defined settings (theme, language, currency, goals, risk tolerance). |
| `user_demographics` | Age, income, household, dependents. May influence personalized suggestions. |
| `user_privacy_settings` | Consent flags for data sharing and AI behavior.     |

> ❗ Do not assume a user has given permission for memory or financial modeling without checking `user_privacy_settings`.

---

## 💳 ACCOUNTS & TRANSACTIONS

| Table         | Purpose |
|---------------|---------|
| `accounts`    | Bank, credit, investment, or manual accounts. Linked via Plaid or entered manually. |
| `transactions`| Normalized transaction records with full categorization, timestamp, merchant data. |

Key Fields:
- `plaid_account_id`, `plaid_item_id`: Must be kept in sync for live accounts.
- `category`, `pfc_primary`, `pfc_detailed`: Used in budget and insight generation.
- `pending`: Useful for flagging uncertainty or delay in user-facing UIs.

---

## 📊 BUDGETING

| Table                | Purpose |
|----------------------|---------|
| `budgets`            | High-level budget configuration by user. Includes period, total amount, and timeframe. |
| `budget_categories`  | Subcategory limits (e.g., groceries, transportation) tied to a `budget_id`. |

> ⚠️ All budget recommendations or limits shown in the UI must derive from these tables.  
> Never hardcode categories or caps.

---

## 💬 CHAT & AI CONTEXT

| Table                  | Purpose |
|------------------------|---------|
| `chat_sessions`        | Persistent record of user chats with Penny. Includes summary, intent, status. |
| `chat_messages`        | All messages and structured content (text, rich JSON) exchanged in sessions. |
| `financial_insights`   | GPT-generated advice, forecasts, or alerts based on user context. |
| `ai_conversation_context` | Stores dynamically constructed memory context for prompt injection. |
| `ai_feedback`          | Ratings and comments on past AI responses. |

> 🧠 These tables power **prompt construction** for Penny and must be consulted before generating new AI interactions.

---

## 💼 ASSETS & LIABILITIES

| Table               | Purpose |
|---------------------|---------|
| `manual_assets`     | Top-level user-entered asset entities. Categorized into subtypes. |
| `real_estate_details`, `vehicle_assets`, `business_assets`, `collectible_assets`, `other_assets` | Asset class extensions. Contain structured metadata (valuation, ownership, dates, etc.). |
| `manual_liabilities`| User-entered debts not linked to Plaid. |
| `loan_details`, `credit_card_details`, `student_loan_details`, `mortgage_details` | Class-specific liability detail tables. Linked by `account_id`. |

Important Relationships:
- All asset/liability entries are tied to `manual_asset_id` or `account_id`.
- Changes to valuation, ownership, or categorization must reflect in **summary dashboards and AI insights**.

---

## 🎯 SCENARIOS & GOALS

| Table             | Purpose |
|-------------------|---------|
| `goals`           | User-defined financial goals (home, retirement, emergency fund). |
| `goal_scenarios`  | AI- or user-generated plans to reach those goals. Includes assumptions and projections. |

Guidelines:
- Never show “next step” advice without referencing `goals` or `goal_scenarios`.
- AI-generated scenario modeling must store outputs to `goal_scenarios` to enable explainability and traceability.

---

## 📜 AUDIT & PERMISSION MODELS

| Table              | Purpose |
|--------------------|---------|
| `agent_run_log`    | Input/output/action metadata for every AI agent task. Includes errors and API calls. |
| `agent_permissions`| Defines what each agent (Claude, Cursor, etc.) is allowed to modify per user. |
| `agent_action_log` | High-level record of what action an agent took and why. Optional for rollback. |

> 🔍 These tables should be updated automatically by agents when they operate on user data.

---

## 🔍 SPECIALIZED MODELS (for Advanced Automation)

| Table                     | Purpose |
|---------------------------|---------|
| `user_onboarding_responses` | Stores structured onboarding inputs (goals, behaviors, preferences). |
| `memory_capture_requests`   | Records what data should be remembered by AI and whether the user allowed it. |
| `chat_session_analyses`     | GPT-generated summaries of past sessions, including action items and key topics. |
| `user_dashboard_state`      | Cached summary of financial state (spending, budgets, net worth, etc.) for real-time UI updates. |
| `feature_usage`, `nps_scores`, `user_feedback` | UX analytics for product improvement and sentiment tracking. |

---

## 🔐 DATA SAFETY RULES FOR AGENTS

1. **Never modify relational tables (`*_details`) without validating primary keys.**
2. **All insights must include a reference back to the data that generated them** (e.g., a transaction, goal, or budget category).
3. **All AI-driven suggestions must be logged in `agent_run_log` and, if applicable, stored in `financial_insights`.**
4. **Dynamic personalization must always reflect current values from the database.**
5. **Agents may read from all models, but may only write to permitted tables as defined in `agent_permissions`.**

---

## 📌 Schema Evolution Guidelines

- Schema changes must be reflected in this file and documented in `CHANGELOG_SUMMARY.md`.
- Prisma migration files must be kept in sync with application logic and API contracts.
- Agents should defer schema modifications unless explicitly authorized or triggered by a product decision in `10_PRODUCT_DECISIONS_AND_OPEN_QUESTIONS.md`.

---

## 🤖 Final Note for Agents

This schema is the **single source of truth** for every user-facing feature in TrueFi.  
Any action taken that bypasses or distorts the relationships in these tables can lead to:

- Broken UI flows
- Misleading financial advice
- Violations of trust and data governance

**Read carefully. Reason holistically. Act responsibly.**

