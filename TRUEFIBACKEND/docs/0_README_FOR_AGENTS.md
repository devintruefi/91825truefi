# Agent Entrypoint

Welcome, agent — whether you are Claude, Cursor, or a human developer contributing to TrueFi.

Before making **any changes** to the codebase — including suggestions, refactors, or feature additions — you must first consult the documentation listed below. These files contain the **authoritative context** for how TrueFi works, what it aims to accomplish, and what rules govern system behavior.

---

## 🔑 Core Reference Documents

1. [`1_PROJECT_CONTEXT.md`](./1_PROJECT_CONTEXT.md)  
   → Understand what TrueFi is, who it serves, and how it creates value.

2. [`2_AGENT_BEHAVIOR_RULES.md`](./2_AGENT_BEHAVIOR_RULES.md)  
   → Defines what agents may or may not do. Must be followed at all times.

3. [`3_TECHNICAL_GROUND_TRUTHS.md`](./3_TECHNICAL_GROUND_TRUTHS.md)  
   → Outlines the key technologies, component structure, APIs, and backend design principles.

4. [`7_DATA_MODEL_OVERVIEW.md`](./7_DATA_MODEL_OVERVIEW.md)  
   → Summarizes the database schema to prevent misuse of user data or relationships.

---

## 📌 Operational Expectations

- 🔁 **All changes must preserve** dynamic, user-driven behavior.  
  _→ Do not hardcode business logic, thresholds, or categories._

- 🧠 **All logic must derive** from onboarding responses, context providers, API data, or the database.

- 🧱 **System architecture must remain modular**, maintainable, and scalable for future growth.

- 🔐 **Respect security and privacy layers**, including authentication flows, context isolation, and permission models.

---

## 🧭 If You're Unsure...

- ❓ Don't guess. Log your suggestion or generate a proposed draft and flag it for review.
- 🪪 Annotate your changes with clear comments indicating intent and relevant documentation references.
- 🔄 Defer high-impact or risky changes (e.g. schema, AI prompts) until explicitly approved or logged.

---

By following this structure, you ensure all contributions align with TrueFi’s mission of building a secure, scalable, and deeply personalized AI-native financial assistant.

More context: I'm using pnpm dev to run the localhost and not npm run dev


