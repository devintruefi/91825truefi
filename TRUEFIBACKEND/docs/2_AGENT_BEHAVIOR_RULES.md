# Agent Behavior Guidelines

This document defines the **required behavior, responsibilities, and boundaries** for all code-modifying agents working on TrueFi.ai — including Claude, Cursor, and any automated systems performing refactors, enhancements, or feature development.

These rules ensure that all changes contribute to TrueFi’s mission of delivering secure, personalized, and scalable financial clarity through AI-native systems.

---

## 🎯 Agent Responsibilities

All agents are expected to:

- Operate with **complete awareness** of project structure, user personalization models, and security principles.
- Act as a **respectful collaborator** in a shared codebase — not an isolated script.
- Prioritize **modularity**, **scalability**, and **data integrity** in all changes.
- Reference and comply with documentation in `/docs/` at all times.

---

## ✅ Required Behaviors

You **must**:

1. **Use existing architecture and interfaces**  
   - Hooks: `use-budget`, `use-financial-data`, `use-chat`, etc.  
   - Context providers: `user-context.tsx`  
   - API endpoints: `/api/` and `/plaid/` routes

2. **Preserve dynamic logic**  
   - Derive values from user preferences, onboarding responses, and real-time data — not static code.

3. **Respect onboarding and personalization**  
   - Never bypass or break logic tied to `user_onboarding_responses`, `user_preferences`, `chat_sessions`, or `financial_insights`.

4. **Explain architectural changes**  
   - If suggesting schema updates, prompt changes, or functional rewrites, document the rationale and dependencies clearly.

5. **Operate safely within scope**  
   - Consider downstream dependencies and interconnected services before applying changes.

---

## ❌ Prohibited Behaviors

You **must not**:

- 🚫 **Hardcode thresholds, categories, goals, or logic**  
  _e.g., "if spending > $1000" is invalid unless sourced from the DB or context._

- 🚫 **Modify user-facing logic without user context**  
  _All insight generation, prompt flows, or budget logic must reflect actual user data._

- 🚫 **Delete or bypass personalization flows**  
  _This includes onboarding state, user memory logs, AI history context._

- 🚫 **Break data models or introduce inconsistencies**  
  _Respect all schema relations and avoid partial writes to complex objects (e.g., `goal_scenarios`, `manual_assets`)._

- 🚫 **Invent new features or flows** without checking `1_PROJECT_CONTEXT.md` and `10_PRODUCT_DECISIONS_AND_OPEN_QUESTIONS.md`.

---

## 🔐 Security & Privacy Rules

Agents are expected to:
- Maintain strict separation of user contexts.
- Avoid logging or exposing sensitive financial or identity data.
- Respect consent boundaries, including preferences in `user_privacy_settings` and `memory_capture_requests`.

---

## 🧭 Scope of Operation

| Action Type                         | Allowed? | Notes |
|------------------------------------|----------|-------|
| UI/UX Refactor                     | ✅        | Must preserve component hierarchy and styling patterns |
| API Endpoint Optimization          | ✅        | Must not change contract without updating consumers |
| Prompt Logic Adjustment            | ✅        | Requires explanation and backwards compatibility |
| Database Schema Change             | ⚠️        | Only with impact review, model sync, and doc update |
| New Feature Proposal               | ✅        | Log rationale and include doc references |
| Major Logic Rewrite                | ❌        | Requires team-level approval |

---

## 🧪 Behavior After Changes

After any update, agents should:

- 🔄 **Run validation** (or request validation) against affected flows
- ✍️ **Update documentation** in `/docs` if the behavior of any module has changed
- 🧠 **Log activity** to `AGENT_ACTION_LOG.md` with input/output/summary

---

## 🧠 Claude, Cursor, and All Future Agents:

You are expected to **reason holistically** about this system. That means:

- You’re not coding in a vacuum.
- You are contributing to a dynamic, user-driven ecosystem.
- Your changes are permanent, inspectable, and part of a growing intelligent product.

If you're unsure — ask, log, or defer. **Do not guess.**

---

