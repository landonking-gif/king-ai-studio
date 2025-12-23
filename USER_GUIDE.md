# 👑 King AI Studio: User Guide
> **The Autonomous Business Empire Builder**

King AI Studio is a governed, autonomous product studio designed to design, build, and run multiple businesses simultaneously. It functions as a "Governed AI CEO" that handles everything from niche research to daily operations, while keeping you in the loop for critical decisions.

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: v20 or higher.
- **Ollama**: Installed and running (`ollama serve`).
- **Models**: Pull the required models:
  ```bash
  ollama pull deepseek-r1:8b
  ollama pull llama3.1:8b
  ```

### 2. Installation
```bash
# Clone and install dependencies
git clone <repository-url>
cd king-ai-studio
npm install

# Configure environment
cp .env.example .env
# Edit .env with your AI API keys and Gmail credentials
```

### 3. Launching the Empire
The simplest way to start is the integrated launch command:
```bash
npm start
```
This initializes the database, ensures models are ready, and boots the **Interactive Command Center**.

---

## 🕹️ The Command Center
When the system starts, you enter the **King-AI Interactive Hub**. You can interact with your AI CEO in real-time.

| Command | Action |
|---------|--------|
| `talk: <text>` | **Advisory Mode.** Chat with the CEO about strategy without trigger actions. |
| `exec: <text>` | **Direct Action.** Interpret the input and queue a business task immediately. |
| `<natural text>`| **Safe Interpretation.** AI proposes a task and waits for your `(y/n)` to proceed. |
| `status` | View the health of all 100 modules and system stats. |
| `tasks` | Show the currently active and prioritized background task queue. |
| `approvals` | List all tasks currently paused for human oversight. |
| `approve <id>` | Grant permission for a specific legal or financial task. |
| `exit` | Gracefully shut down all background loops and save state. |

---

## 🤖 The Empire Loop
In "Empire Mode," the system runs an autonomous cycle:
1. **Idea Generation**: Brainstorms 5 high-ROI business ideas.
2. **Ranking**: Scores them based on viability, cost, and automation potential.
3. **Planning**: Creates a complete execution blueprint for the top-ranked idea.
4. **Execution**: Decomposes the plan into tasks and begins working (code, research, outreach).
5. **Recursive Governance**: Analyzes its own performance and optimizes its strategy for the next cycle.

---

## 🛡️ Safety & Approvals
King AI Studio is designed with a **Conscience (PolicyEngine)**. Certain high-risk actions will *always* pause for your approval:
- **Legal**: Forming LLCs, signing contracts, filing trademarks.
- **Financial**: Making payments, subscribing to services, moving funds.

You will receive an **Email Notification** (if configured) or see the request in the terminal/dashboard whenever a task requires your "OK."

---

## 📊 Daily Reporting
Every day at **6 PM Chicago Time**, the system compiles a "Daily Brief" and sends it to your email. This includes:
- A summary of all actions taken today.
- Success/Failure rates of autonomous tasks.
- Strategic questions for you to answer.
- Proposed high-impact tasks for tomorrow.

---

## 🛠️ Troubleshooting
- **AI not responding?** Ensure `ollama serve` is running in the background.
- **Task stuck?** Check `approvals` to see if it's waiting for you.
- **Connection error?** Verify your `.env` keys for cloud providers (Gemini, OpenAI, etc.).
