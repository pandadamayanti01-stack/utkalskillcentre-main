# 🎓 Utkal Skill Centre — AI Agents Challenge (Track 2: Optimize)

Welcome to the official repository of **Utkal Skill Centre**, optimized for **Track 2: Optimize** of the **Google for Startups AI Agents Challenge**.

Utkal Skill Centre is a bilingual educational PWA designed to bridge the digital and educational divide for state-board students in Odisha, India, by providing localized, curriculum-aligned AI tutoring (Gundulu AI) in their mother tongue (**Odia**).

---

## 🚀 Hackathon Submission Quick Links

*   **Live App URL**: [https://utkalskillcentre.com](https://utkalskillcentre.com) (or your Cloud Run / custom domain URL)
*   **Judge Demo Credentials**:
    *   **Username (Email)**: `judge@utkal.com`
    *   **Password**: `JudgePassword123`
    *   *(Note: This account is pre-registered in Firebase and pre-configured for Class 10 to instantly access state-board materials and AI Gundulu).*
*   **FastMCP Server Source**: [scratch/hackathon_mcp_server.py](file:///d:/WebApp/utkalskillcentre-main/scratch/hackathon_mcp_server.py)

---

## 🎯 Track 2 Optimization Details & Architecture

In alignment with **Track 2 (Optimize)**, we focused on transforming our baseline educational MVP into a highly resilient, production-ready system optimized for low-bandwidth rural environments.

### 1. Dynamic Fail-Safe Hybrid Pipeline (Vertex AI ⇄ Google AI Studio)
In production, standardizing purely on Vertex AI can lead to outages if the Service Account encounters unexpected IAM permission changes or quotas.
*   **Optimization**: We built a dynamic upstream router in our Express API backend (`server.ts` and `api/index.ts`).
*   **Behavior**: The backend first attempts to route requests securely through **Vertex AI** using ambient Application Default Credentials (ADC) or JWT auth. If Vertex AI returns a `403 Permission Denied` (e.g., API disabled, IAM block), or hits quota, the server instantly logs a warning and falls through to **Google AI Studio (`GEMINI_API_KEY`)** to deliver zero-downtime tutoring.

### 2. Conversational Odia Mother-Tongue Persona (Gundulu AI)
Generic models sound overly academic, translation-heavy, or robotic when writing in Odia.
*   **Optimization**: Formulated highly structured system prompts mapping to colloquial Odia teaching styles. Gundulu behaves as a supportive digital learning companion (*ଡିଜିଟାଲ୍ ସାହିତ୍ୟ ସାଥୀ*), converting complex scientific and mathematical concepts into simple native dialects.

### 3. Low-Latency Voice Synthesis for 2G/3G Networks
Rural Odisha operates on highly constrained mobile networks. Downloading heavy audio streams or running real-time WebSocket connections is slow and costly.
*   **Optimization**: Engineered a dual-engine speech synthesis approach:
    1.  **GCP/Gemini TTS API** is queried for clean, high-quality audio segments.
    2.  If the client is on a slow connection or the server hits RPM limits, the PWA dynamically falls back to the client-side **Web Speech API (`window.speechSynthesis`)**, yielding instant zero-latency speech synthesis locally on the student's mobile device.

### 4. LaTeX and Text Clean-up Post-Processors
Baseline RAG extractions from state textbooks often contained mathematical symbols (like `$`), Markdown headers (`#`), or formatting syntax that corrupted horizontal Kindle-style pagination and made copy-pasting notes difficult.
*   **Optimization**: Created regular expression post-processors that strip raw syntax markers from the generative stream, outputting clean, readable prose optimized for state board students.

---

## 🔌 Model Context Protocol (MCP) Server

To demonstrate ecosystem compatibility with the **Google Agent Developer Kit (ADK)**, we created a Python FastMCP server at [scratch/hackathon_mcp_server.py](file:///d:/WebApp/utkalskillcentre-main/scratch/hackathon_mcp_server.py) that exposes our database context as structured tools.

### Available Tools:
1.  `get_curriculum_chapter_context(subject, grade, chapter_id)`: Fetches curriculum notes from Firestore and filters markdown characters.
2.  `award_launch_celebration_points(user_id)`: Rewards 500 XP to the student's leaderboard profile on Play Store launch.

To run the MCP server:
```bash
uv pip install mcp firebase-admin
python scratch/hackathon_mcp_server.py
```

---

## ⚙️ Daily MCQ Automation & Local Developer Setup

For developers hosting the platform locally, follow these instructions to get up and running:

### Local Configuration
1.  Copy `firebase-applet-config.example.json` to `firebase-applet-config.json` in the root.
2.  Create a `.env` file in the root using the template below:

```env
FIREBASE_PROJECT_ID=utkalskillcentre
FIREBASE_STORAGE_BUCKET=utkalskillcentre.firebasestorage.app
FIRESTORE_DATABASE_ID=utkal-prod

VITE_FIREBASE_PROJECT_ID=utkalskillcentre
VITE_FIREBASE_DATABASE_ID=utkal-prod

# API Keys
GEMINI_API_KEY=your_gemini_api_key_here
VITE_GEMINI_API_KEY=your_gemini_api_key_here
USE_VERTEX_AI=true
VERTEX_AI_REGION=us-central1

# Google Drive and Cloud Service Account Credentials
GOOGLE_APPLICATION_CREDENTIALS=D:/WebApp/utkalskillcentre-main/utkal-admin-sdk.json
```

### Installation & Execution
Install dependencies and run the local development server:
```bash
npm install
npm run dev
```

The dev server will run on `http://localhost:3000`.

### Verifying MCQ Automation
To verify the automated Daily MCQ generator runs correctly:
```powershell
curl.exe -i -X POST http://127.0.0.1:3000/api/admin/daily-mcqs/run-auto -H "Content-Type: application/json" -d "{}"
```

---

## 🛠️ Verification & Compile Checks

Ensure all components build and pass type checks before staging commits:
*   **Lint / Typecheck**: `npm run lint` (runs `tsc --noEmit`)
*   **Compile / Build**: `npm run build`
