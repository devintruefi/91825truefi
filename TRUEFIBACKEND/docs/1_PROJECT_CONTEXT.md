# TrueFi.ai – AI-Native Personal Finance Platform

## 🧭 Vision

TrueFi.ai exists to **empower every individual** — regardless of income, education, or financial background — with the tools and clarity to take control of their money and their future.

Our long-term goal is to build the **first fully AI-native personal financial assistant**, one that operates in real time, learns from the user, and adapts dynamically to changes in financial behavior, goals, and economic context.

TrueFi is designed not as a product — but as a **financial operating system** for modern life.

---

## 🧬 Origin & Evolution

- 🚀 **Fin.ai**: Originally launched as a tool for financial advisors (B2B2C). Built with limited AI features and advisor workflows.
- 🔁 **Strategic Pivot**: Shifted focus to **B2C**, rebranding to **TrueFi.ai** to address the financial guidance gap faced by consumers.
- 🧠 **AI-Native Rebuild**: Re-architected the platform to leverage GPT-4, FastAPI, and a dynamic user modeling system for real-time, automated, and deeply personalized experiences.
- ⚙️ **Automation Layer Added**: Integrated agents, prompt pipelines, and automated data orchestration across frontend, backend, and user dashboards.

---

## 💡 Core Offerings

1. **Real-Time Personalized Insights**  
   - AI-generated insights driven by dynamic data (budgets, goals, transaction trends)
   - Delivered via chat, dashboard widgets, or push notifications

2. **Scenario Modeling Tools**  
   - Simulate retirement, home buying, student debt, etc.
   - Powered by AI-driven projections, assumptions, and sensitivity analysis

3. **Financial Education (On-Demand & Embedded)**  
   - Conversational explanations
   - Glossary, calculators, and contextual nudges
   - Designed for users with little to no financial literacy

4. **Unified Financial Dashboard**  
   - Aggregates accounts via Plaid
   - Includes budgets, transactions, net worth, and financial insights
   - Modular, mobile-first interface with real-time sync

5. **Penny – 24/7 Chat-Based Financial Assistant**  
   - OpenAI GPT-4 powered assistant trained on user-specific context
   - Custom prompt injection system (onboarding, memory, financial state)
   - Built-in function-calling capabilities for automated recommendations

---

## 🎯 Who It’s For

TrueFi is designed for real-world consumers, not financial experts.

### Primary Personas
- 🧑‍🎓 **The Student**: Planning loan repayment, part-time job income, rent budgets
- 👨‍👩‍👧 **The Family Builder**: Managing daycare costs, saving for a home, planning for maternity leave
- 🧍‍♀️ **The Independent Adult**: Struggling with spending control, seeking clarity and structure
- 👴 **The Pre-Retiree**: Wants to model retirement scenarios without paying for an advisor

---

## ⚙️ Automation-Driven Architecture

TrueFi is built to **automate everything that can be automated**, from user onboarding to financial scenario generation, to database insights and chat-based recommendations.

### Agent Use Cases (Claude, Cursor, Internal Agents)
- Auto-refactor dynamic logic (no hardcoded values)
- Summarize daily activity logs
- Run real-time prompt injections for Penny based on budget + goal state
- Generate and update insights stored in `financial_insights`

### System Automations
- 🔄 **Daily Dashboard Summarization**: Auto-sync net worth, spending trends, and top insights to `user_dashboard_state`
- 🧠 **Prompt Context Injection**: Build real-time financial prompts from backend (`main.py`) using user financial and behavioral data
- 🛠 **Scenario Planning Generator**: Use LLMs to auto-populate `goal_scenarios` table based on user goals + market assumptions
- 📊 **Agent Audit Logs**: Every Claude/Cursor action is stored and optionally rendered into markdown logs for review

---

## 🧰 Technical Principles

- **Dynamic by Default**: No assumptions should be hardcoded. All thresholds, behaviors, and outcomes derive from data: user input, transactions, goals, preferences.
- **Personalized at Scale**: Every user sees a different dashboard, gets different advice, and walks a unique financial journey.
- **Interoperable AI + UI**: AI flows (chat, insights, alerts) are tightly integrated with React UI and FastAPI backend.
- **Explainable + Empathetic**: Penny is trained to explain financial concepts clearly, calmly, and non-judgmentally — not just spit out answers.

---

## 🧱 Platform Stack

| Layer           | Stack / Tools                             |
|------------------|--------------------------------------------|
| **Frontend**     | Next.js 15 (App Router), React 19, Tailwind CSS |
| **Backend**      | FastAPI (Python), PostgreSQL               |
| **AI Layer**     | OpenAI GPT-4o via Bedrock / OpenAI API      |
| **Data Sync**    | Plaid API, Prisma ORM                      |
| **Authentication** | JWT, bcrypt, user context hooks         |
| **Deployment**   | Vercel (frontend), AWS or cloud backend    |

---

## 🔐 Design Principles

- **Security-First**: Enterprise-grade encryption, zero trust architecture, opt-in data permissions.
- **Privacy-Preserving**: Users control what’s remembered, shared, or retained.
- **Fail-Safe AI**: Prompts and insights are logged, explainable, and reversible.
- **Accessibility & Inclusivity**: Clear UI, dark mode, mobile-first design, accessible language for all levels of financial literacy.

---

## 🚀 Roadmap Summary

| Area              | Upcoming Focus |
|-------------------|----------------|
| 🔄 Dynamic Prompt Expansion | Use more goal-specific data in AI chat |
| 🧠 Local LLM Integration   | Support on-device models for privacy use cases |
| 📈 Automated Plan Tracking | Auto-generate progress reports from `goals` and `budgets` |
| 📤 AI Output Logging       | Track every LLM output with context snapshots |
| 🧪 Explainability UI       | Let users see *why* an insight or recommendation was made |

---

## 🤝 Final Word

TrueFi is not just a personal finance app — it's a living system that learns, teaches, and adapts alongside the user.

Every contribution, every agent behavior, every design decision must serve this purpose:  
> **Help the user feel in control — not confused, judged, or ignored.**

We don’t automate to remove humans — we automate so that humans can *become more financially human*.

