# 👑 King AI Studio: User Guide

> **The Autonomous Business Empire Builder - AWS Deployment Edition**

King AI Studio is a governed, autonomous product studio designed to design, build, and run multiple businesses simultaneously. It functions as a **"Governed AI CEO"** that handles everything from niche research to daily operations, while keeping you in the loop for critical decisions.

---

## 🚀 Quick Start (The King's Way)

The easiest way to manage your empire is using the **Master Controller** script from your local machine.

```bash
node king.js
```

This magic script will:
1.  **Sync** your local code to the AWS server.
2.  **Update** the environment with the correct dynamic IP.
3.  **Deploy** the latest version.
4.  **Auto-Open** the Real-Time Dashboard in your browser.

---

## 🌐 Real-Time Dashboard

The command center for your empire. No refreshing needed — data streams live.

### Key Sections:
- **Empire Overview**: See all your active businesses and their current phase (Idea -> MVP -> Growth).
- **CEO Command Center**: Chat directly with the AI CEO. Monitor its "Thinking" process in real-time.
- **Approvals**: Review and authorize high-risk actions (Legal, Financial). Risk levels are color-coded.
- **Analytics**: Live charts showing revenue projections and system automation levels.

**Keyboard Shortcuts:**
- `1-5`: Switch tabs (Dashboard, Empire, Approvals, CEO, Analytics)
- `Ctrl+K`: Focus Search
- `Ctrl+N`: New Business Wizard
- `Ctrl+R`: Force Data Refresh

---

## 🧠 AI Capabilities & "Self-Improvement"

Your system is now equipped with a **Singularity Engine**.

### 1. Multi-Model Intelligence
The system automatically selects the best AI model for the task:
- **Gemini 1.5/2.0**: Primary reasoning engine (Cloud).
- **HuggingFace (Mistral/Mixtral)**: High-speed fallbacks.
- **Ollama (Llama 3/DeepSeek)**: Local reasoning (Free & Private) running on your AWS GPU/CPU.

### 2. Recursive Self-Improvement
The AI can **read its own code**, find errors, and **rewrite itself** to be better.

**How it works:**
1.  **Error Analyzer**: Scans logs for recurring bugs.
2.  **Optimization**: The AI rewrites the buggy module.
3.  **Verification**: It runs syntax checks and tests.
4.  **Backup**: The old version is saved to `data/meta/backups` before any change.

**To trigger manually:**
Type this in the CEO Chat on the dashboard:
> "Run a self-improvement cycle on the database module."

---

## 🛡️ Safety & Governance

King AI Studio follows a strict **Policy Engine**.

**Requires Approval:**
- ⚖️ **Legal**: Forming LLCs, contracts.
- 💰 **Financial**: Spending > $50.
- 📢 **Public Reputation**: Posting to social media.

**Auto-Approved:**
- 🔍 Market Research.
- 💻 Writing Code.
- 📧 Internal Drafting.

---

## 🛠️ Troubleshooting

**"System using fallback responder?"**
- This usually means all API keys (Gemini/HF) are exhausted or the local Ollama server is down.
- **Fix**: The system now auto-rotates keys. If it persists, run `node king.js` to restart the remote services.

**"Dashboard not updating?"**
- Check the connection status indicator in the top right.
- If "Offline", ensure the server is running (`npm run empire:daemon` on AWS).

**"How do I see what the AI changed?"**
- Check `data/meta/learning-memory.json` or the `backups` folder to diff changes.

---

## 📊 Daily Reporting
Every day at **6 PM**, you receive an email summary of:
- 💰 Total Profit
- 🚀 New Businesses Launched
- ⚠️ Pending Approvals

---
© King AI Studio
