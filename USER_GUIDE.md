# 👑 King AI Studio: User Guide
> **The Autonomous Business Empire Builder - AWS Deployment Edition**

King AI Studio is a governed, autonomous product studio designed to design, build, and run multiple businesses simultaneously. It functions as a "Governed AI CEO" that handles everything from niche research to daily operations, while keeping you in the loop for critical decisions.

---

## 🚀 Server Access & Quick Start

### 1. Connecting to your AWS Server
Your studio is hosted on a high-performance **m7i.4xlarge** AWS instance.

**From your local computer (Windows PowerShell):**
```powershell
# 1. Navigate to your local folder
cd C:\Users\dmilner.AGV-040318-PC\Downloads\landon\king-ai-studio

# 2. Login to the AWS Ubuntu Server
ssh -i "king-ai-studio.pem (1)" ubuntu@ec2-18-216-0-221.us-east-2.compute.amazonaws.com
```
ssh -i "C:\Users\dmilner.AGV-040318-PC\Downloads\landon\king-ai-studio\king-ai-studio (1).pem" ubuntu@ec2-98-83-219-105.compute-1.amazonaws.com
### 2. Updating the Studio
If you receive a notification that I have pushed a fix or a new feature, run this on the server:
```bash
cd ~/king-ai-studio
# Force update (clears local log conflicts)
git reset --hard origin/main
```

### 3. Launching the Engine (The King's Way 👑)
The easiest way to keep your studio updated and running is to use the **Master Controller** from your local machine (Windows).

From your local project folder, run:
```bash
node king.js
```
This script will:
1.  **Sync** your local code/fixes to GitHub.
2.  **SSH** into your AWS server automatically.
3.  **Update** the server with the latest code.
4.  **Initialize** the database and AI models.
5.  **Restart** the Empire in a background session.

---

### 4. Manual Launch (Advanced)
If you prefer to run things manually or in interactive mode:

#### **A. Interactive Mode (For Chatting/Commands)**
```bash
npm start
```

#### **B. Daemon/Empire Mode (Background)**
```bash
npm run empire:daemon
```

---

## 🌐 The Approval Dashboard
You don't need to look at the terminal to manage your empire. Open your browser to the **Visual Command Center**:

👉 **[http://ec2-18-218-174-196.us-east-2.compute.amazonaws.com:3847](http://ec2-18-218-174-196.us-east-2.compute.amazonaws.com:3847)**

From here, you can:
- **Approve/Reject** legal and financial tasks.
- **Monitor** real-time logs of what the AI is thinking.
- **Track** the progress of your business portfolio.

---

## � The AI "Brains" (Model Configuration)

The system is configured to use **Gemini 1.5 Pro** as its primary reasoning engine.

### Unlocking Local Power (No-Cost Brain)
To use the 16-core CPU of your AWS instance instead of paid APIs, you must start **Ollama** on the server:
```bash
# Run this once in a separate terminal window on the server
curl -fsSL https://ollama.com/install.sh | sh
ollama serve & 
ollama run llama3.3:70b
```

---

## 🛡️ Safety & Approvals
King AI Studio follows a strict **Governance Policy**. It will pause and wait for your "OK" for:
- **Legal**: Forming LLCs, signing contracts, filing trademarks.
- **Financial**: Making payments, subscribing to services, moving funds.

Check the **Dashboard** or your **Email** (`landon.king@luxebuildmedia.com`) for approval requests.

---

## 🛠️ Troubleshooting

- **"Connection Refused" when starting?** ensure you are logged into the **AWS server** and not running on your local PC.
- **"fetch failed" or "Idea Generation Failed"?** Ollama is likely not running. Either start Ollama (Step 3 above) or ensure your `GEMINI_API_KEY` in `.env` is valid.
- **Dashboard link not working?** The app must be running (`npm start` or `npm run empire:daemon`) for the website to stay online.

---

## 📊 Daily Reporting
Every day at **6 PM Chicago Time**, the system compiles a **Daily Brief** and sends it to your email. This summarizes all business progress and lists anything that requires your attention for the next morning.
