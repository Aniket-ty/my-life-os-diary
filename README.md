# 🌟 My Life OS — Personal Life Operating System

> **All-in-one intelligent personal operating system**: Expense Tracking & Splitwise Group Finance • AI Receipt OCR Scanner • AI Gym Equipment Identification & Exercise Demonstrator • Multi-Currency Engine • Voice-Controlled AI Assistant • Daily Mood Diary • Smart Task & Reminder Planner.

[![Node.js](https://img.shields.io/badge/Node.js-v20+-68a063?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-v19-61dafb?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.x-646cff?logo=vite&logoColor=white)](https://vite.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-5.14-2d3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon_DB-336791?logo=postgresql&logoColor=white)](https://neon.tech/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-v4-06b6d4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
  - [1. AI Gym Equipment Scanner & Exercise Demonstrations](#1-ai-gym-equipment-scanner--exercise-demonstrations)
  - [2. Personal Expense & Splitwise-Style Group Finance](#2-personal-expense--splitwise-style-group-finance)
  - [3. Voice AI & Hands-Free Assistant](#3-voice-ai--hands-free-assistant)
  - [4. OCR Smart Receipt & Bill Scanner](#4-ocr-smart-receipt--bill-scanner)
  - [5. Diary, Journal & Mood Tracker](#5-diary-journal--mood-tracker)
  - [6. Todo & Recurring Task Planner](#6-todo--recurring-task-planner)
- [System Architecture](#-system-architecture)
- [Monorepo Project Structure](#-monorepo-project-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [1. Backend Setup](#1-backend-setup-my-life-os-backend)
  - [2. Web Frontend Setup](#2-web-frontend-setup-my-life-os-web)
  - [3. Optional Services (Mobile & Python AI)](#3-optional-services)
- [Voice Commands Guide](#-voice-commands-guide)
- [API Reference](#-api-reference)
- [Automated Testing](#-automated-testing)
- [License](#-license)

---

## 🚀 Overview

**My Life OS** unites fragmented productivity tools into a unified, privacy-conscious personal management platform. Instead of switching between split-expense calculators, workout loggers, receipt scanners, notes apps, and to-do lists, My Life OS integrates them seamlessly with multi-modal AI (Vision, OCR, Speech-to-Text, and NLP).

---

## ✨ Key Features

### 1. AI Gym Equipment Scanner & Exercise Demonstrations
- **Photo Identification**: Point your phone camera or upload a photo of any gym equipment (e.g. Lat Pulldown, Cable Crossover, Smith Machine, Leg Press).
- **Swappable AI Vision Layer**: Pluggable architecture supporting **Groq Vision** (`qwen/qwen3.8-27b`), **OpenAI GPT-4o**, or deterministic **MockVision** for offline testing.
- **SHA-256 Vision Caching**: Repeated scans of the same machine photo resolve instantly with zero AI token consumption.
- **Fuzzy & Token Matching**: Matches AI predictions against a verified database catalog containing 20+ core gym machines and 23+ exercise demos.
- **Low-Confidence Graceful Fallback**: If an image is blurry or ambiguous, the app provides photography tips and manual search suggestions.
- **Full Video Demonstrations**: Streamable, muted-by-default video player with play/pause, replay, scrub bar, poster images, and full instructions.
- **Complete Exercise Profiles**: Step-by-step setup, starting positions, execution mechanics, breathing patterns, common mistakes, and safer alternative exercises.
- **1-Click Workout Integration**: Add any demonstrated exercise straight into today's workout plan with customizable sets and rep targets.

### 2. Personal Expense & Splitwise-Style Group Finance
- **Personal Budgeting**: Real-time spending charts, category breakdowns, daily expense velocity, and recurring subscriptions.
- **Splitwise Groups**: Group expenses with custom split types (`EQUAL`, `EXACT`, `PERCENTAGE`, `SHARES`).
- **Debt Simplification**: live pairwise balances showing exactly who owes whom across group members.
- **Multi-Currency Support**: Real-time conversion between 30+ global currencies (INR, USD, EUR, GBP, AED, CAD, AUD, etc.) with configurable default user currency.
- **Settlement Tracking**: Record cash or digital settlements with balance reconciliation.

### 3. Voice AI & Hands-Free Assistant
- **Microphone & Speech-to-Text**: Powered by Whisper STT (`whisper-large-v3-turbo`) with browser Web Speech API fallback.
- **Hybrid Intent Interpreter**: Dual-layer parser utilizing Groq LLMs with a deterministic local heuristic fallback.
- **Two-Phase Action Confirmation**: High-impact actions (deletions, large expense creations, debt settlements) require voice or tap confirmation before committing to the database.
- **Multi-Module Navigation**: Hands-free navigation to any module (`"open fitness"`, `"open diary"`, `"show my expenses"`, `"open todos"`).

### 4. OCR Smart Receipt & Bill Scanner
- **One-Shot Extraction**: Upload or snap receipts to extract merchant names, total amounts, subtotal, tax, date, and currency.
- **Direct Expense Conversion**: Prefills expense forms or group splits from scanned receipts with a single tap.

### 5. Diary, Journal & Mood Tracker
- **Reflections & Journaling**: Markdown-supported rich text entries with mood indicators and tags.
- **Historical Timeline**: Calendar-filtered browsing of past thoughts and habits.

### 6. Todo & Recurring Task Planner
- **Task Scheduling**: Categorized to-dos with priorities (`LOW`, `MEDIUM`, `HIGH`), due dates, and recurrence patterns (`DAILY`, `WEEKLY`, `MONTHLY`).
- **Automated Reminders**: Built-in `node-cron` background scheduler with Firebase Cloud Messaging (FCM) push notifications.

---

## 🏗 System Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                          CLIENT APPLICATIONS                           │
│  React 19 + Tailwind v4 Web App (my-life-os-web)                       │
│  React Native / Expo Mobile App (my-life-os-app)                       │
└──────────────────┬─────────────────────────────┬───────────────────────┘
                   │ HTTPS / REST / Multipart    │ WebSockets / Voice
                   ▼                             ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         NODE.JS / EXPRESS API                          │
│                         (my-life-os-backend)                           │
│                                                                        │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │
│  │ Auth & Users │ │ Expenses &   │ │ Fitness &    │ │ Diary &      │  │
│  │ (JWT + PIN)  │ │ Splitwise    │ │ Workouts     │ │ Todos        │  │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └──────┬───────┘  │
│         │                │                │                │          │
│  ┌──────┴────────────────┴────────────────┴────────────────┴───────┐  │
│  │                    AI GATEWAY & RESOLUTION LAYER                │  │
│  │  • Voice Intent Parser (Groq LLM / Heuristic Engine)            │  │
│  │  • Vision Provider Factory (Groq / OpenAI / Mock)               │  │
│  │  • Equipment Fuzzy Matcher (Alias & Token Distance Engine)      │  │
│  │  • Image SHA-256 Hash Caching                                   │  │
│  └──────┬─────────────────────────────────┬────────────────────────┘  │
│         │                                 │                           │
│         ▼                                 ▼                           │
│  ┌──────────────┐                  ┌──────────────┐                   │
│  │  PostgreSQL  │                  │  AI Services │                   │
│  │  (Neon DB via│                  │  • Groq API  │                   │
│  │  Prisma ORM) │                  │  • Fast-API  │                   │
│  └──────────────┘                  └──────────────┘                   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Monorepo Project Structure

```text
my-life-os-diary/
├── my-life-os-backend/           # Core Node.js / Express REST API
│   ├── prisma/
│   │   ├── schema.prisma         # Prisma Schema (Users, Expenses, Equipment, Exercises)
│   │   └── seedEquipment.js      # Seed script for 20 machines & 23+ exercise demos
│   ├── src/
│   │   ├── config/               # Database and environment configurations
│   │   ├── controllers/          # Route handlers (fitness, equipment, expense, voice)
│   │   ├── middlewares/          # JWT authentication, multer upload, rate limiters
│   │   ├── routes/               # API endpoint definitions (/api/v1)
│   │   ├── services/
│   │   │   ├── ai/               # AI gateway, contracts, heuristic parser, Groq
│   │   │   ├── vision/           # GroqVision, OpenAiVision, MockVision providers
│   │   │   ├── equipmentMatching.service.js # Machine matching & SHA-256 caching
│   │   │   ├── voice.service.js  # Voice execution, confirmation & resolution
│   │   │   └── expense.service.js # Expense management and Splitwise logic
│   │   └── tests/                # Test suites (equipment tests, voice tests)
│   └── package.json
│
├── my-life-os-web/               # React 19 + TypeScript + Vite Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── fitness/          # GymEquipmentScanner, ExerciseDemo, Explorer
│   │   │   ├── expenses/         # VoiceCommandBar, ExpenseForm, SplitwiseCards
│   │   │   └── shared/           # Navigation, Modal, Toast notifications
│   │   ├── pages/                # Fitness, Expenses, Diary, Todo, Dashboard
│   │   ├── services/             # API clients (equipment.ts, voice.ts, expenses.ts)
│   │   └── index.css             # Tailwind CSS v4 design system
│   └── package.json
│
├── my-life-os-app/               # React Native / Expo Mobile Application
│   ├── App.js
│   └── package.json
│
├── ai-service/                   # Optional standalone Python microservice
│   ├── main.py                   # FastAPI app (Whisper STT, Tesseract OCR)
│   └── requirements.txt
│
└── API_DOCUMENTATION.md          # Exhaustive REST API endpoint documentation
```

---

## 🏁 Getting Started

### Prerequisites
- **Node.js**: `v20.0.0` or higher (`node -v`)
- **PostgreSQL**: Neon Cloud Postgres connection string or local PostgreSQL instance
- **npm** or **yarn**

---

### 1. Backend Setup (`my-life-os-backend`)

```bash
# Navigate to backend directory
cd my-life-os-backend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
```

Edit `.env` with your credentials:
```env
PORT=3000
DATABASE_URL="postgresql://user:password@ep-xyz.neon.tech/my_life_os?sslmode=require"
JWT_SECRET="your-super-secret-jwt-key"
GROQ_API_KEY="gsk_your_groq_api_key"            # Optional: for Vision & LLM
AI_VISION_PROVIDER="groq"                       # "groq", "openai", or "mock"
```

Push schema to PostgreSQL and seed initial equipment & exercise catalog:
```bash
# Push Prisma schema to Postgres
npx prisma db push

# Seed 20 gym machines and 23+ exercise demos
node prisma/seedEquipment.js

# Start backend in development mode
npm run dev
```
Backend API will be running at: `http://localhost:3000` (Health check: `http://localhost:3000/health`).

---

### 2. Web Frontend Setup (`my-life-os-web`)

```bash
# Navigate to web frontend directory
cd ../my-life-os-web

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
Frontend web application will be accessible at: `http://localhost:5173`.

---

### 3. Optional Services

<details>
<summary><b>📱 Mobile App Setup (my-life-os-app)</b></summary>

```bash
cd my-life-os-app
npm install
npx expo start
```
Scan the QR code with Expo Go (Android) or Camera (iOS).
</details>

<details>
<summary><b>🐍 Standalone Python AI Microservice (ai-service)</b></summary>

```bash
cd ai-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```
Set `AI_SERVICE_URL="http://localhost:8000"` in `my-life-os-backend/.env` to route OCR and STT through FastAPI.
</details>

---

## 🎙 Voice Commands Guide

Click the microphone button in the bottom navigation bar or use the Voice Command Bar:

| Voice Command | Action Taken |
| :--- | :--- |
| *"What machine is this?"* | Navigates to `/fitness` and opens the AI Equipment Scanner viewfinder |
| *"How do I use this machine?"* | Speaks and displays setup instructions, seat adjustment & technique |
| *"Show me an exercise for chest using this machine"* | Returns matched exercise card and streamable video demonstration |
| *"Add this exercise to today's workout"* | Automatically appends the exercise to today's routine in PostgreSQL |
| *"Give me the next exercise"* | Announces the upcoming exercise, recommended sets, and target rep range |
| *"Spent 500 rupees on lunch with Alex and Maya"* | Parses expense, computes 3-way split, and stages for confirmation |
| *"Who owes me money?"* | Calculates and summarizes live Splitwise balances across all groups |
| *"Open workout planner"* | Routes directly to `/fitness/planner` |
| *"Open diary"* | Routes directly to `/diary` |

---

## 📡 API Reference

A sample of core endpoints (refer to [API_DOCUMENTATION.md](file:///Users/admin/Desktop/my-life-os-diary/API_DOCUMENTATION.md) for complete details):

### 🏋️ Fitness & Equipment
- `POST /api/v1/fitness/equipment/scan` — Upload image, run Vision AI, return matched equipment & exercise demos.
- `GET /api/v1/fitness/equipment` — List/search machines by name, muscle, or category.
- `GET /api/v1/fitness/equipment/:id` — Machine details, setup instructions, safety tips.
- `GET /api/v1/fitness/exercises` — Search catalog of verified exercises with video demos.
- `GET /api/v1/fitness/exercises/:id` — Detailed exercise guide with video, mistakes, and alternatives.
- `POST /api/v1/fitness/exercises/:id/add-to-workout` — Add exercise to a workout session.

### 💰 Expenses & Splitwise
- `GET /api/v1/expenses/summary` — User spending totals, trends, and category distribution.
- `POST /api/v1/expenses` — Create personal or group expense with splits.
- `GET /api/v1/groups` — List groups with net balance summary.
- `POST /api/v1/groups/:id/settlements` — Record debt settlements.

### 🎙 Voice & AI
- `POST /api/v1/voice/command` — Submit voice transcript or text command for AI execution.
- `POST /api/v1/voice/confirm` — Confirm or cancel a staged voice action.
- `POST /api/v1/voice/transcribe` — Convert uploaded audio buffer into text.
- `POST /api/v1/ocr/receipt` — Extract structured financial data from receipt images.

---

## 🧪 Automated Testing

### Backend Equipment & Vision Test
```bash
cd my-life-os-backend
node src/tests/equipment.test.js
```
*Validates string normalization, mock vision provider, alias matching, low-confidence handling, exercise association, and multi-candidate detection.*

### Voice Fitness Command Test
```bash
cd my-life-os-backend
node src/tests/voiceFitness.test.js
```
*Tests and verifies all 5 fitness voice intents against live database models and AI gateways.*

### Frontend Production Build Test
```bash
cd my-life-os-web
npm run build
```
*Executes TypeScript typecheck (`tsc -b`) and Vite production bundle generation.*

---

## 📄 License

This project is licensed under the MIT License.
