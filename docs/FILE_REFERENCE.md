# 📂 King AI Studio: File Reference

This document provides a technical summary of the key files in the King AI Studio architecture.

---

## 🧠 Core System (`packages/core`)

The brain and central nervous system of the empire.

- **`model-router.js`**: **CRITICAL**. Handles all AI model interactions. Routes prompts to Gemini, OpenAI, HuggingFace, or Ollama based on ROI, cost, and availability. Includes circuit breakers and key rotation.
- **`approval-server.js`**: **CRITICAL**. The backend API for the dashboard. Handles `/health`, `/api/all-data`, and serves the UI. Integrates `RealtimeAPI`.
- **`realtime-api.js`**: Manages Server-Sent Events (SSE) for live dashboard updates.
- **`database.js`**: SQLite wrapper for `king-empire.db`. Manages persistence for businesses, tasks, and logs.
- **`self-improvement.js`**: **SINGULARITY ENGINE**. Analyzes its own code and uses AI to rewrite/optimize modules.
- **`error-analyzer.js`**: Parses audit logs to find trends in system failures for the self-improvement engine.
- **`learning-memory.js`**: Persists the history of self-improvement attempts to learn from mistakes.
- **`audit-logger.js`**: Secure, append-only logging for all decisions and actions.
- **`policy-engine.js`**: Determines if an action requires human approval based on risk categories (Legal, Financial).
- **`daily-summarizer.js`**: Generates the 6 PM email digest.
- **`load-balancer.js`**: Distributes work across available AI nodes (Remote vs Local).
- **`security-vault.js`**: Encrypts sensitive data (API keys, passwords) at rest.

---

## 👔 CEO Agent (`packages/ceo`)

The strategic layer.

- **`ceo-agent.js`**: The main autonomous agent loop. Generates high-level specific business plans, delegates tasks to sub-agents, and manages the "Empire State".
- **`business-plan.js`**: Structuring logic for generating new venture concepts.

---

## 🛠️ Infrastructure (`packages/infrastructure`)

The user interface and hosting tools.

- **`dashboard/dashboard.js`**: **CRITICAL**. The frontend logic for the Web UI. Handles real-time SSE connection, charts (Chart.js), and user interactions.
- **`dashboard/index.html`**: The main entry point for the dashboard UI.
- **`dashboard/style.css`**: CSS styling for the dashboard (Dark/Cyberpunk theme).

---

## 🤖 Modules (`packages/modules`)

Specialized sub-agents for specific tasks.

- **`email-campaigner.js`**: Automates cold outreach sequences.
- **`ad-manager.js`**: Manages ad spend and creative generation.
- **`web-manager.js`**: Deploys and manages websites.

---

## 📂 Root Files

- **`king.js`**: **MASTER CONTROLLER**. The primary script for deployment, syncing, and remote management.
- **`empire.js`**: The "Daemon" script that runs on the server to keep the system alive.
- **`deploy.sh`**: Shell script executed by `king.js` on the remote server to install dependencies and start services.
- **`.env`**: Environment variables (API Keys, Config). **DO NOT COMMIT**.
- **`USER_GUIDE.md`**: User-facing documentation.

---

## 🗄️ Data Directory (`data/`)

- **`audit-logs/`**: Gzipped JSONL logs of all system actions.
- **`meta/`**: Application state metadata.
  - `learning-memory.json`: Learning history.
  - `backups/`: Code backups created by Self-Improvement engine.
- **`king-empire.db`**: SQLite database file.

---
