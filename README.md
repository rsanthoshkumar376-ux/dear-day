# Dear Day — AI Diary Companion

> A warm, mobile-first Progressive Web App (PWA) personal diary companion. Talk or type about your day in a gentle, conversational check-in. At the end of the day, Dear Day turns your thoughts into an authentic first-person journal entry with highlights and mood tags.

🌐 **Live Production App**: [https://dear-day-rose.vercel.app](https://dear-day-rose.vercel.app)  
📦 **GitHub Repository**: [https://github.com/rsanthoshkumar376-ux/dear-day](https://github.com/rsanthoshkumar376-ux/dear-day)

---

## Highlights & Features

- **Mobile-First PWA**: Installable to home screen on iOS, Android, macOS, and Windows with offline caching via service workers and web app manifest.
- **100% On-Device Privacy (Dexie IndexedDB)**: All diary entries, streak records, user settings, and conversation logs are stored exclusively in your browser's local IndexedDB. No remote database, no user accounts, and no data tracking.
- **Voice-First Interaction**:
  - **Speech Input**: Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`) with real-time live transcript editing and browser support detection.
  - **Voice Output**: Optional AI voice replies using `speechSynthesis` to read questions aloud in a warm, unhurried cadence.
- **Claude AI via Secure Node Proxy**:
  - Connects to Anthropic Claude (`claude-3-5-sonnet-20241022`) through a lightweight Express proxy server.
  - API keys are kept strictly on the backend and never exposed to the client.
- **Out-of-the-Box Demo Mode**:
  - If no `ANTHROPIC_API_KEY` is provided, Dear Day runs immediately on a high-fidelity local scripted conversational and reflection engine.
- **Safety First**:
  - Built-in crisis detection for self-harm or violence keywords. Dear Day responds with immediate empathy and emergency helpline resources (such as 988, Crisis Text Line), pausing standard journaling questions.
- **Streak Tracking & Weekly Freeze**:
  - Mathematically derived consecutive day streak with 30-day activity heatmap.
  - Automatic **1 free streak freeze per week** to protect your streak against accidental missed days.
  - Confetti milestone celebrations at 3, 7, 14, 30, and 100 days.
- **Reminders & Notifications**:
  - Daily check-in notification scheduled at your chosen time.
  - 2-hour streak-at-risk nudge if today's entry has not yet been completed.
  - Never sends reminders if today is already done.
  - Graceful handling of browser permission states with informative in-app banners.
- **Security & Portability**:
  - Optional 4-digit PIN lock with Web Crypto SHA-256 hashing.
  - Full JSON data export and import for seamless backups and device transfers.

---

## Tech Stack

- **Frontend**: React 18, Vite 6, TypeScript, Tailwind CSS, Lucide Icons, Canvas Confetti.
- **Storage**: IndexedDB via [Dexie.js](https://dexie.org/) & `dexie-react-hooks`.
- **Backend Proxy**: Node.js 22, Express, `@anthropic-ai/sdk`, TypeScript (`tsx`), CORS, Dotenv.
- **APIs**: Web Speech API (Recognition + Synthesis), Service Worker API, Notification API, Web Crypto API.

---

## Directory Structure

```text
dear-day/
├── server/
│   └── index.ts                 # Express proxy for Claude API & safety filters
├── src/
│   ├── components/
│   │   ├── CelebrationModal.tsx # Milestone confetti celebrations (3, 7, 14, 30, 100)
│   │   ├── ChatScreen.tsx       # Messenger chat with voice mic & live transcript
│   │   ├── DaySummaryModal.tsx  # End-of-day summary preview & editor
│   │   ├── DiaryScreen.tsx      # Reverse chron diary list, reader view, swipe & search
│   │   ├── Navbar.tsx           # Mobile-first navigation with streak flame indicator
│   │   ├── OnboardingModal.tsx  # First launch setup & privacy notice
│   │   ├── PinLockScreen.tsx    # 4-digit PIN unlock keypad
│   │   ├── SettingsScreen.tsx   # Customization, backup JSON, PIN, notifications
│   │   ├── StreakScreen.tsx     # Current streak, longest streak & 30-day heatmap
│   │   └── TodayScreen.tsx      # Home screen with daily greeting & streak status
│   ├── db/
│   │   └── dexie.ts             # Dexie IndexedDB database configuration
│   ├── services/
│   │   ├── aiService.ts         # Dual-mode AI client (Claude Proxy + Demo fallback)
│   │   ├── demoAi.ts            # Local scripted conversational & synthesis engine
│   │   ├── exportImportService.ts # JSON backup export/import & SHA-256 PIN hashing
│   │   ├── notificationService.ts # Notification scheduling & permission checking
│   │   ├── speechService.ts     # SpeechRecognition & SpeechSynthesis controllers
│   │   └── streakService.ts     # Streak derivation, heatmap & streak freeze logic
│   ├── types/
│   │   └── index.ts             # TypeScript interfaces for entries, messages, settings
│   ├── App.tsx                  # Main application orchestrator & live Dexie bindings
│   ├── index.css                # Tailwind directives & journal animations
│   └── main.tsx                 # Entry mount point
├── public/
│   ├── favicon.svg              # App vector icon
│   ├── icon-192.png             # PWA app icon (192x192)
│   ├── icon-512.png             # PWA app icon (512x512)
│   ├── manifest.json            # PWA Web App Manifest
│   └── sw.js                    # Service worker for offline caching & notifications
├── scripts/
│   ├── generate-icons.js        # Script generating PNG icons
│   ├── test-app.ts              # Unit tests for streaks, demo AI, and safety rules
│   └── test-server.ts           # Integration tests for proxy server endpoints
├── .env.example
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## Quickstart & Setup

### 1. Prerequisites
- **Node.js** (v18+ or v22 recommended)
- **npm** (v9+)

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables (Optional)
To use live Anthropic Claude models, copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Open `.env` and add your API key:
```env
ANTHROPIC_API_KEY=sk-ant-api03-...
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
PORT=3001
```
> **Note**: If `ANTHROPIC_API_KEY` is not provided, Dear Day runs immediately in **Demo Mode**, using its built-in conversational flow and diary summary generator.

### 4. Run Development Server
Run both the backend proxy and Vite dev server with one command:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 5. Build for Production
```bash
npm run build
```
This compiles the TypeScript code and produces an optimized production bundle in `dist/`.

---

## Test Verification Checklist

Follow this checklist to verify all features end-to-end:

| Step | Feature | What to Verify |
|---|---|---|
| **1** | **First-Launch Onboarding** | Open the app in a fresh incognito window or clear storage. The Onboarding modal appears, requests your name, preferred reminder time (e.g. `20:30`), voice reply preference, and notification permissions. Verifies that the on-device privacy guarantee is prominently displayed. |
| **2** | **Typed Chat with AI** | Navigate to the **Check-in** tab. The AI starts with *"How was your day, [Name]?"*. Type answers about your day. Observe that the AI asks one question at a time, acknowledges feelings with empathy, and provides follow-up questions. |
| **3** | **Voice Input (Web Speech API)** | On supported browsers (Chrome, Edge, Safari), tap the microphone icon. Speak aloud. Watch the live transcript banner appear and sync directly into the text box for editing. Tap the send button. |
| **4** | **Voice Output (Speech Synthesis)** | In **Settings**, toggle *Voice Replies* to ON. Notice that the AI speaks its questions aloud using `window.speechSynthesis`. Each AI chat bubble also has an individual speaker icon to re-play audio. |
| **5** | **Finish the Day & Generate Summary** | In Chat, tap the **"Finish my day"** button. The summary modal opens and weaves your spoken/typed responses into an authentic 150-300 word first-person diary entry. Edit the title, mood tag, and 3 highlight bullets. Tap **"Save to Diary"**. |
| **6** | **Streak Increment** | Observe the flame counter on the Today and Streak screens increment to `1` (or next consecutive number). The action button on the Today screen updates to *"Done for today ✓"*. |
| **7** | **Browse Diary Day by Day** | Go to the **Diary** tab. Tap on the newly saved entry. Read the formatted first-person text, key highlights, and expand the raw conversation drawer. Swipe left/right or use the prev/next day arrow buttons. Test search filtering and the calendar date picker. |
| **8** | **Edit & Delete Entry** | Within an entry, tap the edit icon (pencil) to modify the text or title. Tap the delete icon (trash) and confirm to remove the entry. |
| **9** | **Streak Reset & Weekly Freeze** | Test consecutive days vs. missed days using the unit test suite (`npm run` with test scripts). If yesterday was missed but a freeze is available, the freeze badge activates. If more than 1 day is missed, streak resets to 0 while keeping the longest streak. |
| **10** | **Reminders & Permissions** | In Settings, tap the **"Test"** button next to Daily Notifications. A test notification appears through the browser and service worker. If permission is denied in browser settings, an informative warning banner appears on the Today screen with instructions. |
| **11** | **PIN Lock Security** | In Settings, tap **Set PIN** and create a 4-digit code (e.g. `1234`). Refresh the page. The app locks and displays the numeric PIN keypad until the correct code is entered. |
| **12** | **JSON Export & Import** | In Settings, tap **Export JSON** to download a backup file. Delete all data to test reset, then tap **Import JSON** and select your backup. All entries, messages, and settings are restored. |
| **13** | **Crisis Safety Guard** | In Chat, type or speak *"I want to die"*. Dear Day immediately halts normal questions, responds with warm empathy, and provides the 988 Crisis Lifeline and text line resources. |

---

## Deployment Guide

### Deploying the Backend Proxy
The proxy server is a standard Node.js Express service:
- Can be deployed to **Render**, **Railway**, **Fly.io**, **Vercel Serverless Functions**, or **Google Cloud Run**.
- Configure the environment variable:
  - `ANTHROPIC_API_KEY`: Your Anthropic API key.
  - `PORT`: Set automatically by the host platform (defaults to 3001).

### Deploying the Frontend PWA
The frontend is a static single-page application built with Vite:
1. Run `npm run build`.
2. Deploy the `dist/` folder to **Vercel**, **Netlify**, **Cloudflare Pages**, or **Firebase Hosting**.
3. In production, configure your reverse proxy or CDN so that `/api/*` routes forward to your Node proxy service.

---

## Privacy & Security Commitment

Dear Day is built on the philosophy that your personal reflections should remain yours:
- **IndexedDB**: All entries and messages remain strictly inside your browser sandbox on your device.
- **No Remote Storage**: There are no remote user databases or analytics trackers.
- **Transient AI Processing**: When using Claude API, only the messages from the current conversation are sent to generate the next question or the summary. The backend proxy never saves, logs, or stores your journal text on disk or external databases.
