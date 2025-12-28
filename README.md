# 👑 King AI Studio

**The "Governed AI CEO" for Autonomous Empire Building.**

King AI Studio is a comprehensive, self-hosting platform designed to design, build, and run multiple businesses simultaneously. It functions as an autonomous CEO that handles everything from niche research to daily operations (email, ads, coding, legal), while keeping you in the loop for critical strategic decisions.

---

## 🚀 Key Features

- **Autonomous Business Building**: Generates ideas, validates markets, generates code, and launches MVPs.
- **Governed AI CEO**: A central agent (`CEOAgent`) that manages resources, tasks, and sub-agents.
- **Human-in-the-Loop Approval**: Critical actions (legal, financial, public posts) require your approval via the Dashboard.
- **Real-Time Dashboard**: Monitor your empire with live updates on revenue, tasks, and system health.
- **Recursive Self-Improvement**: The system analyzes its own logs and errors to patch bugs and optimize its code automatically.
- **Multi-Model Intelligence**: Intelligently routes prompts to the best AI model (Gemini, OpenAI, Anthropic, HuggingFace, or local Ollama) based on cost, speed, and capabilities.

---

## 🛠️ Architecture

The system is built as a modular monorepo:

- **`packages/core`**: The brain. `ModelRouter` (AI), `Database` (Persistence), `PolicyEngine` ( Governance), `SelfImprovement` (Evolution).
- **`packages/ceo`**: The strategist. `CEOAgent` orchestrates high-level goals.
- **`packages/modules`**: The hands. `EmailCampaigner`, `AdManager`, etc.
- **`packages/infrastructure`**: The interface. `Dashboard` (Web UI), `ApprovalServer` (API).
- **`king.js`**: Data center deployment orchestrator (AWS/VPS).

---

## 📦 Installation & Setup

### Prerequisites
- Node.js v18+
- NPM
- (Optional) Docker for containerized deployment

### Quick Start (Local)

1.  **Clone & Install**:
    ```bash
    git clone https://github.com/your-repo/king-ai-studio.git
    cd king-ai-studio
    npm install
    ```

2.  **Configure API Keys**:
    Create a `.env` file (see `.env.example`) and add your keys:
    ```env
    GEMINI_API_KEYS=your_key_1,your_key_2
    OPENAI_API_KEY=sk-...
    HUGGING_FACE_API_KEYS=hf_...
    ```

3.  **Launch the Empire**:
    ```bash
    npm start
    ```
    This starts the `Empire Daemon` and the `Dashboard`.

4.  **Access Dashboard**:
    Open [http://localhost:3847](http://localhost:3847) in your browser.

---

## 🌐 Deployment (AWS/VPS)

Use the built-in `king.js` orchestrator to deploy to a remote server.

```bash
node king.js
```
This script will:
1. Connect to your AWS instance (configured in `.env`).
2. Sync the codebase.
3. Install dependencies and setup Ollama (if needed).
4. Start the Empire Daemon remotely.

---

## 🧠 Recursive Self-Improvement

The system features a **Singularity Engine** (`packages/core/self-improvement.js`).
- It scans audit logs for errors (`ErrorAnalyzer`).
- It identifies inefficient code.
- It uses AI to rewrite and optimize its own modules.
- It backs up files before changes and verifies syntax.

**To trigger manually:**
```javascript
// In CEO Chat
"Optimize the database module"
```

---

## 📚 Documentation

- **[User Guide](./USER_GUIDE.md)**: Detailed instructions for operating the Dashboard and managing businesses.
- **[File Reference](./docs/FILE_REFERENCE.md)**: Technical deep-dive into every file in the project.

---

## 🛡️ Security

- **Policy Engine**: Prevents the AI from taking dangerous actions without approval.
- **Audit Logs**: Every action is recorded in `data/audit-logs`.
- **Secret Vault**: API keys are rotated and managed securely.

---

© King AI Studio.
