# 💻 My Life OS — Web Frontend

> Modern, responsive React 19 web application for My Life OS.

Built with **React 19**, **TypeScript**, **Vite**, **Tailwind CSS v4**, **Framer Motion**, **Recharts**, and **Lucide Icons**.

---

## 🚀 Getting Started

### Prerequisites
- Node.js >= 20.0.0
- Backend running on `http://localhost:3000`

### Installation
```bash
# Install dependencies
npm install

# Start development server with HMR
npm run dev

# Run TypeScript typecheck & production build
npm run build
```

---

## 🎨 Modules & Components

- **AI Gym Equipment Scanner** (`src/components/fitness/GymEquipmentScanner.tsx`):
  - Viewfinder camera overlay with camera flip and photo upload fallback.
  - Live AI scanning animation.
  - High and low confidence result cards with multi-machine candidate selection.
- **Exercise Demonstration Modal & Player** (`src/components/fitness/ExerciseDemo.tsx`):
  - Streamable video player (default muted, custom controls, replay, scrubber).
  - Setup cues, breathing instructions, common mistakes, and alternative exercises.
  - 1-click addition to today's workout.
- **Equipment & Exercise Library** (`src/components/fitness/EquipmentExplorer.tsx`):
  - Filterable by target muscle group and full-text keyword search.
- **Admin Equipment Modal** (`src/components/fitness/AdminEquipmentModal.tsx`):
  - In-app editor for updating exercise video URLs, thumbnails, sets, and rep targets.
- **Voice Command Bar** (`src/components/expenses/VoiceCommandBar.tsx`):
  - Hands-free voice navigation and execution across fitness, expenses, diary, and todos.
- **Personal Expense & Splitwise Engine** (`src/pages/expenses/`):
  - Multi-currency charts, group settlements, and debt balances.
- **OCR Receipt Scanner** (`src/components/expenses/BillScannerModal.tsx`):
  - Drag-and-drop or camera snap receipt parser.
- **Daily Diary & Mood Tracker** (`src/pages/diary/`):
  - Personal reflections, mood logging, and date-filtered timeline.
- **Workout Planner** (`src/pages/fitness/WorkoutPlanner.tsx`):
  - Weekly workout splits with direct exercise library lookups.

---

## 🛠 Available Scripts

- `npm run dev`: Launch Vite dev server on port 5173.
- `npm run build`: Typecheck with `tsc -b` and build for production.
- `npm run preview`: Preview production build locally.
- `npm run lint`: Lint codebase using Oxlint.
