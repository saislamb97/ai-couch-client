# 🧠 AI Coach Client (React + Vite + Firebase)

Frontend for **AI Coach**, built with **React, Vite, and Firebase Authentication**.  
It connects to the deployed **Django backend** at  
👉 **https://ai-coach-pmkn.onrender.com**, which handles agents, chat sessions, and real-time AI interactions.

---

## 🚀 Quick Start

### 1. Clone the repo

```bash
git clone git@github.com:saislamb97/ai-couch-client.git
cd ai-couch-client
````

---

### 2. Create your `.env`

Copy the example file and update it with the following config:

```bash
cp .env.example .env
```

---

### 3. Install dependencies

```bash
npm install
```

---

### 4. Run locally

```bash
npm run dev
```

Access the app at 👉 **[http://localhost:3000](http://localhost:3000)**

---

## 📁 Folder Overview

```
AI-COACH-CLIENT/
├── public/                     # Static assets
├── src/
│   ├── api/                    # REST API integration
│   │   ├── auth.ts
│   │   ├── client.ts
│   │   └── endpoints.ts
│   │
│   ├── assets/                 # Images and icons
│   │   └── react.svg
│   │
│   ├── components/             # Reusable UI & feature components
│   │   ├── ui/                 # Base UI primitives
│   │   │   ├── badge.tsx, button.tsx, card.tsx, ...
│   │   ├── AgentForm.tsx
│   │   ├── AvatarPreview.tsx
│   │   ├── ChatPreview.tsx
│   │   └── SlidePreview.tsx
│   │
│   ├── hooks/                  # Custom React hooks
│   │   ├── useApi.ts
│   │   ├── useAuth.ts
│   │   └── useMicrophone.ts
│   │
│   ├── lib/                    # Shared libraries
│   │   ├── firebase.ts
│   │   └── utils.ts
│   │
│   ├── pages/                  # Route-level pages
│   │   ├── AgentsPage.tsx
│   │   ├── AgentDetailPage.tsx
│   │   ├── AgentPreviewPage.tsx
│   │   └── DocsPage.tsx
│   │
│   ├── types/                  # Shared TypeScript types
│   │   └── index.ts
│   │
│   ├── App.tsx                 # Main router + auth gate
│   ├── main.tsx                # React entrypoint
│   ├── index.css               # Tailwind global styles
│   └── .env.example
│
├── package.json
├── vite.config.ts
├── tsconfig.json
├── README.md
└── .gitignore
```

---

## 🔑 Authentication

* Uses **Firebase Email/Password Auth**
* Automatically creates a user if the email doesn’t exist
* Enforces password policy:

  * ✅ Minimum **8 characters**
  * ✅ 1 **uppercase**
  * ✅ 1 **lowercase**
  * ✅ 1 **numeric digit**

---

## 🧩 Backend Integration

The backend provides AI logic, RAG pipeline, session persistence, and WebSocket streaming.

| Endpoint                                    | Description                             |
| ------------------------------------------- | --------------------------------------- |
| `/api/agent/...`                            | Create & manage AI agents               |
| `/api/session/...`                          | Manage user chat sessions               |
| `/api/chat/...`                             | Chat history & persistence              |
| `/api/storage/signed-url/`                  | Upload avatars/files                    |
| `wss://ai-coach-pmkn.onrender.com/ws/chat/` | Real-time streaming (text, slides, TTS) |

All REST calls include a Firebase ID token header:

```http
Authorization: Bearer <FIREBASE_ID_TOKEN>
```

WebSocket connections include it as a query param (`token`).

---

## 🧰 Commands

| Command           | Description                  |
| ----------------- | ---------------------------- |
| `npm run dev`     | Start dev server (port 3000) |
| `npm run build`   | Build for production         |
| `npm run preview` | Preview production build     |
| `npm run lint`    | Run ESLint checks            |

---