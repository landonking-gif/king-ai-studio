# 🛠️ King AI Studio: Developer Guide
> **Architecture, Roadmap, and Governance Framework**

This document provides a deep dive into the technical architecture and strategic roadmap of the King AI Studio. It is intended for developers extending the system or integrating new capabilities.

---

## 🏗️ System Architecture
The system is built as a modular Node.js application (ESM) with a robust persistence layer and a multi-agent orchestration core.

### 1. Core Packages (`/packages/core`)
- **ModelRouter**: Intelligent gateway between local (Ollama) and cloud (Gemini, OpenAI, Anthropic) models. Implements "Dark-Pool" failover logic.
- **Database**: SQLite-backed persistence (`data/king-ai.db`) for tracking businesses, tasks, and historical performance.
- **PolicyEngine**: Hard-coded safety rules that determine auto-approval vs. human-in-the-loop requirements.
- **AuditLogger**: Immutable, append-only JSONL logging of every AI decision and execution.
- **SelfEvaluator**: The recursive "Critique" loop that verifies AI output before it is committed.

### 2. CEO Orchestration (`/packages/ceo`)
- **CEOAgent**: The primary brain. Handles the recursive `executeTask` loop and delegates to specific agents.
- **BusinessAnalyzer**: Specialized module for brainstorm-to-blueprint transformations.
- **StrategyManager**: Manages the persistent "System Prompt" and execution rules based on historical success.

### 3. Execution Modules (`/packages/modules`)
A collection of 100+ specialized agents (SaaS Generators, SEO Engines, Legal Autopilots, etc.) that the CEO invokes as needed.

---

## 🗺️ Strategic Roadmap (1-100 ROI Modules)
The system is designed around 100 high-ROI modules, all of which are now **fully implemented and active.**

| Rank | Module | Purpose |
|------|--------|---------|
| 1 | `PortfolioManager` | Autonomous capital and resource allocation across ventures. |
| 5 | `SelfHealer` | Uses LLMs to detect and repair broken automation scripts. |
| 7 | `PromptSelfOptimizer` | Recursive meta-learning that improves the system's own prompts. |
| 20 | `ModelRouter` | Intelligent routing with hidden fallback layers. |
| 40 | `SelfRefactorer` | Autonomously refactors high-traffic code paths for performance. |
| ... | (100 total) | See `packages/` for complete implementation list. |

---

## 🧠 Recursive Governance Loop
The "King-AI" secret sauce is the recursive governance cycle:
1. **Produce**: An agent generates code, text, or a plan.
2. **Critique**: The `SelfEvaluator` runs a "Hostile Critic" pass against the output.
3. **Rewrite**: If the score is low, the agent rewrites the output incorporating the critique.
4. **Verify**: The updated output is cross-checked against mandatory safety and compliance strategies.
5. **Learn**: The `MetaLearner` extracts principles from the successes to update the `ModelRouter` system prompt.

---

## 🧪 Testing & Verification
We use a native Node.js test suite to verify module integrity.
```bash
# Run all unit and integration tests
node --test tests/*.test.js
```
The system includes:
- **Mock AI Testing**: Test complex recursive loops without spending API credits.
- **Smoke Testing**: Verify the entire empire boot sequence.

---

## 📂 Project Structure
```
king-ai-studio/
├── packages/
│   ├── core/           # Memory, Brain, and Safety foundations.
│   ├── ceo/            # High-level orchestration and empire loops.
│   ├── modules/        # The 100 execution specialized agents.
│   ├── expansion/      # Self-expansion and registry logic.
│   └── orchestrator/   # CLI Hub and Task Queue management.
├── data/               # SQLite DB, logs, and account credentials.
├── tests/              # Automated verification suite.
└── empire.js           # Main entry point for the Autonomous Empire.
```

---

## 🚀 Adding New Capabilities
To add a new specialized module:
1. Create a new file in `packages/modules/`.
2. Ensure it implements an `execute(task)` method.
3. Register the module in `CEOAgent.js`.
4. Add applicable strategies to `data/strategies.json`.
