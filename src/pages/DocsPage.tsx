// src/pages/DocsPage.tsx
import React, { useState } from "react";

/* ───────────────────────────── Small UI bits ───────────────────────────── */

function Badge({ method }: { method: "GET" | "POST" | "PUT" | "DELETE" }) {
  const styles: Record<string, string> = {
    GET: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200",
    POST: "bg-blue-100 text-blue-700 ring-1 ring-blue-200",
    PUT: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",
    DELETE: "bg-rose-100 text-rose-700 ring-1 ring-rose-200",
  };
  return (
    <span className={`px-2 py-0.5 text-[11px] font-semibold rounded ${styles[method]}`}>
      {method}
    </span>
  );
}

function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  async function onCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {console.log("Copy failed");}
  }
  return (
    <button
      onClick={onCopy}
      className={`text-xs px-2 py-1 rounded border bg-white hover:bg-slate-50 ${className || ""}`}
      aria-label="Copy"
      title="Copy"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function CodeBlock({
  children,
  title,
}: {
  children: string;
  title?: string;
}) {
  return (
    <div className="relative group">
      {title ? (
        <div className="flex items-center justify-between px-3 py-1 border-x border-t rounded-t bg-slate-50 text-[11px] text-slate-600">
          <span className="truncate">{title}</span>
          <CopyButton text={children} />
        </div>
      ) : (
        <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition">
          <CopyButton text={children} />
        </div>
      )}
      <pre className="bg-slate-50 border border-slate-200 rounded p-4 overflow-auto text-[13px] leading-6">
        <code>{children}</code>
      </pre>
    </div>
  );
}

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="group scroll-mt-24 text-xl font-semibold mt-10 mb-3">
      <a href={`#${id}`} className="no-underline">{children}</a>
      <a
        href={`#${id}`}
        className="ml-2 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600"
        aria-label="Copy section link"
      >
        #
      </a>
    </h2>
  );
}

function SubTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h3 id={id} className="group scroll-mt-24 text-lg font-semibold mt-8 mb-2">
      <a href={`#${id}`} className="no-underline">{children}</a>
      <a
        href={`#${id}`}
        className="ml-2 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600"
        aria-label="Copy subsection link"
      >
        #
      </a>
    </h3>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="px-1.5 py-0.5 text-[11px] border rounded bg-white">{children}</kbd>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-slate-100 text-slate-700 ring-1 ring-slate-200">
      {children}
    </span>
  );
}

function EndpointCard({
  method,
  path,
  desc,
  request,
  response,
  note,
}: {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  desc?: React.ReactNode;
  request?: string;
  response?: string;
  note?: React.ReactNode;
}) {
  return (
    <div className="border border-slate-200 rounded p-4 space-y-3 bg-white">
      <div className="flex items-center gap-2">
        <Badge method={method} />
        <code className="text-sm break-all">{path}</code>
        <CopyButton text={path} className="ml-auto" />
      </div>
      {desc ? <p className="text-slate-600 text-sm">{desc}</p> : null}
      {request ? <CodeBlock title="Request">{request}</CodeBlock> : null}
      {response ? <CodeBlock title="Response">{response}</CodeBlock> : null}
      {note ? <div className="text-slate-600 text-xs">{note}</div> : null}
    </div>
  );
}

/* ───────────────────────────── Docs content strings ───────────────────────── */

const AUTH_HEADER = String.raw`Authorization: Bearer <FIREBASE_ID_TOKEN>`;

const ENV_VARS = String.raw`VITE_API_BASE_URL=http://127.0.0.1:8000

# Firebase Web SDK (CLIENT config; safe for frontend)
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MEASUREMENT_ID=...

# Optional (Ready Player Me)
VITE_RPM_FRAME_URL=https://nudgyt-b5jcsl.readyplayer.me/avatar?frameApi`;

const GET_ID_TOKEN = String.raw`import { auth } from "@/lib/firebase"; // your firebase.ts

async function getIdToken(): Promise<string> {
  const u = auth.currentUser;
  if (!u) throw new Error("Not signed in");
  return u.getIdToken(/* forceRefresh? */);
}`;

const API_HELPER = String.raw`async function api(path: string, init: RequestInit = {}) {
  const token = await getIdToken();
  const res = await fetch(\`\${import.meta.env.VITE_API_BASE_URL}\${path}\`, {
    ...init,
    headers: {
      "Authorization": \`Bearer \${token}\`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(\`\${res.status} \${res.statusText}: \${text}\`);
  }
  return res.json();
}`;

const WS_OPEN = String.raw`function openChatSocket({
  base,
  botId,
  sessionId,
  token,
  websiteLanguage = "en",
}: {
  base: string;
  botId: string;
  sessionId: string;
  token: string;
  websiteLanguage?: string;
}) {
  const wsUrl = \`\${base.replace(/^http/, "ws")}/ws/chat/?bot_id=\${encodeURIComponent(
    botId
  )}&session_id=\${encodeURIComponent(sessionId)}&token=\${encodeURIComponent(
    token
  )}&website_language=\${encodeURIComponent(websiteLanguage)}\`;
  return new WebSocket(wsUrl);
}`;

const WS_TYPES = String.raw`type WsEvt =
  | { type: "connected"; bot_id: string; session_id: string }
  | { type: "text_query"; text: string; local_time: string }
  | { type: "response_start"; run_id: string }
  | { type: "text_response"; text: string; local_time: string; run_id: string }
  | { type: "slides_response"; slides?: { slides: { title: string; bullets: string[] }[] }; slides_raw?: string; local_time: string; run_id: string }
  | { type: "response_done"; timings: Record<string, number>; run_id: string }
  | { type: "response_ended"; run_id: string }
  | { type: "audio_response"; audio: string }
  | { type: "stop_audio"; stop_audio: boolean }
  | { type: "error"; message: string; run_id?: string }
  | { type: "cancelled"; run_id: string }
  | { type: "pong" };`;

const WS_BOOTSTRAP = String.raw`const ws = openChatSocket({
  base: import.meta.env.VITE_API_BASE_URL,
  botId,
  sessionId,
  token,
});

ws.onopen = () => {
  ws.send(
    JSON.stringify({
      type: "text_query",
      text: "Hello!",
      local_time: new Date().toISOString().slice(0, 19).replace("T", " "),
      muteAudio: false,
    })
  );
};

ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data) as WsEvt;
  switch (msg.type) {
    case "text_response":
      // append streamed text to UI
      break;
    case "slides_response":
      // prefer msg.slides (JSON); else render msg.slides_raw (markdown)
      break;
    case "audio_response":
      // decode base64 to Blob and play via <audio> or WebAudio
      break;
    case "error":
      console.error("[ws error]", msg.message);
      break;
    // handle others...
  }
};`;

const WS_TEXT_QUERY = String.raw`{ "type": "text_query", "text": "Hello coach!", "local_time": "2025-10-20 12:34:56", "muteAudio": false }`;
const WS_AUDIO_QUERY = String.raw`{
  "type": "audio_query",
  "audio": "data:audio/webm;base64,AAA...",
  "format": "webm",
  "muteAudio": false
}`;
const WS_STOP = String.raw`{ "type": "stop_audio" }`;
const WS_PING = String.raw`{ "type": "ping" }`;

const EVT_CONNECTED = String.raw`{ "type": "connected", "bot_id": "...", "session_id": "..." }`;
const EVT_TEXT_ECHO = String.raw`{ "type": "text_query", "text": "Hello coach!", "local_time": "2025-10-20 12:34:56" }`;
const EVT_START = String.raw`{ "type": "response_start", "run_id": "session123:45678" }`;
const EVT_TEXT = String.raw`{ "type": "text_response", "text": "First sentence.", "local_time": "2025-10-20 12:34:57", "run_id": "..." }`;
const EVT_SLIDES_JSON = String.raw`{
  "type": "slides_response",
  "slides": {
    "slides": [
      { "title": "Intro", "bullets": ["What we'll cover", "Why it matters"] },
      { "title": "Plan", "bullets": ["Step 1", "Step 2"] }
    ]
  },
  "local_time": "2025-10-20 12:34:58",
  "run_id": "..."
}`;
const EVT_SLIDES_MD = String.raw`{
  "type": "slides_response",
  "slides_raw": "## Intro\n- What we'll cover\n- Why it matters",
  "local_time": "2025-10-20 12:34:58",
  "run_id": "..."
}`;
const EVT_DONE = String.raw`{
  "type": "response_done",
  "timings": { "prepare_ms": 88, "router_ms": 135, "stream_text_ms": 1245, "total_ms": 1520 },
  "run_id": "..."
}`;
const EVT_END = String.raw`{ "type": "response_ended", "run_id": "..." }`;
const EVT_AUDIO = String.raw`{ "type": "audio_response", "audio": "BASE64_BYTES" }`;
const EVT_STOP_AUDIO = String.raw`{ "type": "stop_audio", "stop_audio": true }`;
const EVT_ERR = String.raw`{ "type": "error", "message": "Human-readable message", "run_id": "optional" }`;
const EVT_CANCELLED = String.raw`{ "type": "cancelled", "run_id": "..." }`;
const EVT_PONG = String.raw`{ "type": "pong" }`;

const CURL_AUTH = String.raw`# Every request must include:
Authorization: Bearer <FirebaseIDToken>`;

const AGENT_CREATE_REQ = String.raw`POST /api/agent/create/ HTTP/1.1
Host: domain
Authorization: Bearer <token>
Content-Type: application/json`;
const AGENT_CREATE_BODY = String.raw`{
  "name": "Coach Nova",
  "voice_id": "elevenlabs-voice-123",
  "prompt": "You are a helpful AI coach.",
  "avatar": "https://models.readyplayer.me/68f337b00f9f862ffeee43ab.glb"
}`;
const AGENT_CREATE_RES = String.raw`{
  "bot_id": "d5510c73-3b7f-4a6a-a3b1-0c72f9c5d7ef",
  "name": "Coach Nova",
  "voice_id": "elevenlabs-voice-123",
  "prompt": "You are a helpful AI coach.",
  "avatar": "https://models.readyplayer.me/68f337b00f9f862ffeee43ab.glb",
  "created_at": "2025-10-20T06:51:12.123Z"
}`;

const AGENT_GET_RES = String.raw`{
  "bot_id": "d5510c73-3b7f-4a6a-a3b1-0c72f9c5d7ef",
  "name": "Coach Nova",
  "voice_id": "elevenlabs-voice-123",
  "prompt": "You are a helpful AI coach.",
  "avatar": "https://models.readyplayer.me/68f337b00f9f862ffeee43ab.glb",
  "created_at": "2025-10-20T06:51:12.123Z"
}`;

const AGENT_UPDATE_BODY = String.raw`{
  "name": "Coach Nova v2",
  "voice_id": "elevenlabs-voice-456",
  "prompt": "Be concise and motivating.",
  "avatar": null
}`;

const AGENT_LIST_RES = String.raw`{
  "items": [
    {
      "bot_id": "d5510c73-...d7ef",
      "name": "Coach Nova",
      "voice_id": "elevenlabs-voice-456",
      "prompt": "Be concise and motivating.",
      "avatar": null,
      "created_at": "2025-10-20T06:51:12.123Z"
    }
  ],
  "next_cursor": null
}`;

const SESSION_CREATE_BODY = String.raw`{
  "title": "Onboarding",
  "summary": "",
  "is_active": true
}`;
const SESSION_CREATE_RES = String.raw`{
  "session_id": "f0f35b7d-3a51-4a1f-9c46-7e86b96a4a9b",
  "title": "Onboarding",
  "summary": "",
  "is_active": true,
  "created_at": "2025-10-20T06:54:03.111Z",
  "updated_at": "2025-10-20T06:54:03.111Z"
}`;
const SESSION_LIST_RES = String.raw`{
  "items": [ { "session_id": "...", "title": "Onboarding", "...": "..." } ],
  "next_cursor": null
}`;
const SESSION_DELETE_RES = String.raw`{ "deleted": 12 }`;

const CHAT_LIST_RES = String.raw`{
  "items": [
    {
      "session_id": "f0f35b7d-...",
      "query": "How do I structure a 30-day learning plan?",
      "response": "Here's a concise 4-week plan...",
      "created_at": "2025-10-20T06:58:01.200Z"
    }
  ],
  "next_cursor": null
}`;
const CHAT_DELETE_RES = String.raw`{ "deleted": 12 }`;

const SIGNED_URL_REQ = String.raw`{
  "path": "users/<uid>/avatars/<bot_id>.png",
  "method": "PUT",
  "content_type": "image/png"
}`;
const SIGNED_URL_RES = String.raw`{ "url": "https://...signed-url..." }`;
const SIGNED_URL_UPLOAD = String.raw`await fetch(signedUrl, {
  method: "PUT",
  headers: { "Content-Type": "image/png" },
  body: fileBlob
});`;

/* ─────────────────────────────────── Page ─────────────────────────────────── */

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Header (non-sticky) */}
      <header className="border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-5">
          <h1 className="text-2xl font-semibold tracking-tight">AI Coach — Integration Docs</h1>
          <p className="text-sm text-slate-500">
            Firebase Auth · Firestore · Firebase Storage · Django + Channels · OpenAI STT/LLM · ElevenLabs TTS
          </p>
        </div>
      </header>

      {/* Content (single column, long scroll) */}
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Intro */}
        <section>
          <SectionTitle id="intro">0. What the backend does (quick mental model)</SectionTitle>
          <ol className="list-decimal pl-5 space-y-2 text-slate-700">
            <li>
              <b>Auth:</b> Frontend signs in via <b>Firebase Email/Password</b>. Every REST/WS call includes the
              Firebase ID token. DRF authenticates and sets <code>request.user.uid</code>.
            </li>
            <li>
              <b>Resources:</b> <Pill>Agent</Pill> (name, prompt, optional <code>voice_id</code>, optional{" "}
              <code>avatar</code>), <Pill>Session</Pill> (per-agent chat container), <Pill>Chat</Pill> (Q/A pairs).
            </li>
            <li>
              <b>Realtime:</b> Open WebSocket with <code>bot_id</code>, <code>session_id</code>, <code>token</code>. RAG:
              <code> prepare → router (may launch Slides) → stream text</code>. Streams sentence chunks, optional slides
              (JSON or Markdown), and optional TTS audio (if agent has <code>voice_id</code>).
            </li>
            <li>
              <b>Storage:</b> request <b>signed URL</b> then <Kbd>PUT</Kbd> directly to Firebase Storage.
            </li>
          </ol>
        </section>

        {/* Base + Security */}
        <section>
          <SectionTitle id="base">1. Base URL & Security</SectionTitle>
          <p className="text-slate-700">
            Replace <code>domain</code> with your deployment (e.g. <code>https://ai-coach-pmkn.onrender.com</code>). Local
            dev uses <code>http://127.0.0.1:8000</code>.
          </p>
          <p className="text-slate-700 mt-2">
            <b>Every REST call</b> requires:
          </p>
          <CodeBlock>{AUTH_HEADER}</CodeBlock>
          <p className="text-slate-700 mt-2">
            <b>Every WebSocket</b> requires query params: <code>bot_id</code>, <code>session_id</code>,{" "}
            <code>token</code> (Firebase ID token), optional <code>website_language</code> (default <code>en</code>).
          </p>
        </section>

        {/* Frontend env */}
        <section>
          <SectionTitle id="frontend-env">2. Frontend environment variables</SectionTitle>
          <p className="text-slate-700">Create <code>frontend/.env</code> (Vite):</p>
          <CodeBlock title="frontend/.env">{ENV_VARS}</CodeBlock>
          <SubTitle id="get-id-token">Get Firebase ID token</SubTitle>
          <CodeBlock title="lib/getIdToken.ts">{GET_ID_TOKEN}</CodeBlock>
        </section>

        {/* REST */}
        <section>
          <SectionTitle id="rest">3. REST API Integration (base: <code>domain/api/</code>)</SectionTitle>

          {/* Agents */}
          <SubTitle id="agents">3.1 Agents</SubTitle>

          <EndpointCard
            method="POST"
            path="/api/agent/create/"
            desc={<>Create an agent. Set <code>voice_id</code> if you want TTS.</>}
            request={`${AGENT_CREATE_REQ}\n\n${AGENT_CREATE_BODY}`}
            response={AGENT_CREATE_RES}
          />

          <EndpointCard
            method="GET"
            path="/api/agent/{bot_id}/"
            desc={<>Get an agent by id.</>}
            response={AGENT_GET_RES}
          />

          <EndpointCard
            method="PUT"
            path="/api/agent/{bot_id}/"
            desc={<>Update fields (<code>avatar</code> may be <code>null</code>).</>}
            request={AGENT_UPDATE_BODY}
            response={AGENT_GET_RES}
          />

          <EndpointCard
            method="GET"
            path="/api/agent/list/?limit=20&cursor=<ISO8601>"
            desc={<>List agents (paginated with <code>next_cursor</code>).</>}
            response={AGENT_LIST_RES}
          />

          <EndpointCard
            method="DELETE"
            path="/api/agent/delete/?bot_id=...&cascade_chats=true"
            desc={<>Delete an agent. <code>204 No Content</code>.</>}
          />

          {/* Sessions */}
          <SubTitle id="sessions">3.2 Sessions</SubTitle>
          <EndpointCard
            method="POST"
            path="/api/session/create/?bot_id=..."
            desc={<>Create a session for an agent.</>}
            request={SESSION_CREATE_BODY}
            response={SESSION_CREATE_RES}
          />
          <EndpointCard
            method="GET"
            path="/api/session/list/?bot_id=...&limit=50&cursor=<ISO8601>"
            desc={<>List sessions (paginated).</>}
            response={SESSION_LIST_RES}
          />
          <EndpointCard
            method="DELETE"
            path="/api/session/delete/?bot_id=...&session_id=..."
            desc={<>Delete a session and its chats.</>}
            response={SESSION_DELETE_RES}
          />

          {/* Chats */}
          <SubTitle id="chats">3.3 Chats</SubTitle>
          <EndpointCard
            method="GET"
            path="/api/chat/list/?bot_id=...&session_id=...&limit=50&cursor=<ISO8601>"
            desc={<>List chats for a session.</>}
            response={CHAT_LIST_RES}
          />
          <EndpointCard
            method="DELETE"
            path="/api/chat/delete/?bot_id=...&session_id=..."
            desc={<>Delete all chats for a session.</>}
            response={CHAT_DELETE_RES}
          />

          {/* Storage */}
          <SubTitle id="storage">3.4 Storage (Signed URLs)</SubTitle>
          <EndpointCard
            method="POST"
            path="/api/storage/signed-url/"
            desc={<>Issue a short-lived signed URL (path must start with <code>users/&lt;uid&gt;/</code>).</>}
            request={SIGNED_URL_REQ}
            response={SIGNED_URL_RES}
            note={
              <div className="space-y-2">
                <div className="text-slate-700">Upload with the signed URL:</div>
                <CodeBlock title="PUT upload">{SIGNED_URL_UPLOAD}</CodeBlock>
              </div>
            }
          />

          <SubTitle id="openapi">3.5 OpenAPI / Swagger</SubTitle>
          <ul className="list-disc pl-6 text-slate-700">
            <li>
              Schema: <a className="text-blue-600 hover:underline" href="/api/schema/">/api/schema/</a>
            </li>
            <li>
              UI: <a className="text-blue-600 hover:underline" href="/api/docs/">/api/docs/</a>
            </li>
          </ul>
          <p className="text-slate-600 text-sm mt-1">The schema includes a global <code>firebaseAuth</code> security scheme.</p>
        </section>

        {/* WebSocket */}
        <section>
          <SectionTitle id="ws">4. WebSocket Integration (Realtime chat, slides, TTS)</SectionTitle>
          <p className="text-slate-700">
            <b>WS URL (example):</b> <code>wss://domain/ws/chat/</code> — ensure your Channels routing maps this
            path to the <code>ChatConsumer</code>.
          </p>

          <SubTitle id="ws-connect">4.1 Connect</SubTitle>
          <ul className="list-disc pl-6 text-slate-700">
            <li><code>bot_id</code> — agent id</li>
            <li><code>session_id</code> — session id</li>
            <li><code>token</code> — Firebase ID token</li>
            <li><code>website_language</code> — optional (default <code>"en"</code>)</li>
          </ul>
          <CodeBlock title="openChatSocket (TypeScript)">{WS_OPEN}</CodeBlock>

          <SubTitle id="ws-messages">4.2 Client → Server messages</SubTitle>
          <div className="grid md:grid-cols-2 gap-4">
            <CodeBlock title="text_query (JSON)">{WS_TEXT_QUERY}</CodeBlock>
            <CodeBlock title="audio_query (JSON)">{WS_AUDIO_QUERY}</CodeBlock>
            <CodeBlock title="stop_audio (JSON)">{WS_STOP}</CodeBlock>
            <CodeBlock title="ping (JSON)">{WS_PING}</CodeBlock>
          </div>
          <p className="text-slate-600 text-sm mt-2">
            Accepted audio formats: <code>wav</code>, <code>mp3/mpeg</code>, <code>m4a</code>, <code>ogg</code>, <code>webm</code>.
          </p>

          <SubTitle id="ws-events">4.3 Server → Client events (complete)</SubTitle>
          <div className="grid md:grid-cols-2 gap-4">
            <CodeBlock title="connected">{EVT_CONNECTED}</CodeBlock>
            <CodeBlock title="text_query (echo)">{EVT_TEXT_ECHO}</CodeBlock>
            <CodeBlock title="response_start">{EVT_START}</CodeBlock>
            <CodeBlock title="text_response (streamed)">{EVT_TEXT}</CodeBlock>
            <CodeBlock title="slides_response (JSON)">{EVT_SLIDES_JSON}</CodeBlock>
            <CodeBlock title="slides_response (markdown)">{EVT_SLIDES_MD}</CodeBlock>
            <CodeBlock title="response_done">{EVT_DONE}</CodeBlock>
            <CodeBlock title="response_ended">{EVT_END}</CodeBlock>
            <CodeBlock title="audio_response">{EVT_AUDIO}</CodeBlock>
            <CodeBlock title="stop_audio">{EVT_STOP_AUDIO}</CodeBlock>
            <CodeBlock title="error">{EVT_ERR}</CodeBlock>
            <CodeBlock title="cancelled">{EVT_CANCELLED}</CodeBlock>
            <CodeBlock title="pong">{EVT_PONG}</CodeBlock>
          </div>

          <div className="mt-3 text-slate-700">
            <b>Server limits:</b>
            <ul className="list-disc pl-6">
              <li>Max message rate: ~20 Hz</li>
              <li>Max audio payload: ~25 MB</li>
              <li>Pump idle timeout: 45s</li>
              <li>TTS concurrency: up to 8</li>
              <li>STT model: <code>whisper-1</code> (configurable)</li>
              <li>TTS locale default: <code>en_GB</code></li>
            </ul>
          </div>

          <SubTitle id="ws-client">4.4 Recommended client implementation</SubTitle>
          <CodeBlock title="Type definitions">{WS_TYPES}</CodeBlock>
          <CodeBlock title="Bootstrap handlers">{WS_BOOTSTRAP}</CodeBlock>
        </section>

        {/* Flow */}
        <section>
          <SectionTitle id="flow">5. Typical end-to-end flow</SectionTitle>
          <ol className="list-decimal pl-5 space-y-2 text-slate-700">
            <li>Sign in with Firebase (Email/Password).</li>
            <li>Create an Agent (set <code>voice_id</code> for TTS).</li>
            <li>Create a Session for that Agent.</li>
            <li>Open WebSocket with <code>bot_id</code>, <code>session_id</code>, and <code>token</code>.</li>
            <li>Send <code>text_query</code> or <code>audio_query</code>; receive streamed <code>text_response</code>, optional <code>slides_response</code>, optional <code>audio_response</code>.</li>
            <li>Responses persist as <b>Chat</b> items.</li>
            <li>Use REST to list Sessions/Chats later (history UI).</li>
            <li>For files (avatars), request signed URL → PUT directly.</li>
          </ol>
        </section>

        {/* HTTP helper */}
        <section>
          <SectionTitle id="http-helper">6. Sample HTTP helper (fetch)</SectionTitle>
          <CodeBlock title="api helper">{API_HELPER}</CodeBlock>
        </section>

        {/* Errors */}
        <section>
          <SectionTitle id="errors">7. Error handling & status codes</SectionTitle>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-slate-200 rounded">
              <thead className="bg-slate-50">
                <tr className="text-left">
                  <th className="p-2 border-b">Symptom / Code</th>
                  <th className="p-2 border-b">Meaning / Fix</th>
                </tr>
              </thead>
              <tbody>
                <tr className="align-top">
                  <td className="p-2 border-b">400</td>
                  <td className="p-2 border-b">Missing params (<code>bot_id</code>/<code>session_id</code>), validation errors, bad audio encoding.</td>
                </tr>
                <tr className="align-top">
                  <td className="p-2 border-b">401 / 403</td>
                  <td className="p-2 border-b">Invalid / missing Firebase token.</td>
                </tr>
                <tr className="align-top">
                  <td className="p-2 border-b">404</td>
                  <td className="p-2 border-b">Agent not found (for this user).</td>
                </tr>
                <tr className="align-top">
                  <td className="p-2 border-b">WS close 4000</td>
                  <td className="p-2 border-b">Required query params missing (<code>bot_id</code>, <code>session_id</code>, <code>token</code>).</td>
                </tr>
                <tr className="align-top">
                  <td className="p-2 border-b">WS close 4001</td>
                  <td className="p-2 border-b">Token verification failed.</td>
                </tr>
                <tr className="align-top">
                  <td className="p-2">WS close 4003</td>
                  <td className="p-2">Agent not found for user.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-3">
            <CodeBlock title="Auth header">{CURL_AUTH}</CodeBlock>
          </div>
        </section>

        {/* Tips */}
        <section>
          <SectionTitle id="tips">8. Implementation tips</SectionTitle>
          <ul className="list-disc pl-6 text-slate-700">
            <li><b>Overlapping runs:</b> each <code>text_query</code> spawns a run; use <code>run_id</code> to correlate in UI.</li>
            <li><b>Slides:</b> prefer JSON <code>slides</code>; fallback to parsing <code>slides_raw</code> markdown.</li>
            <li><b>TTS:</b> requires a valid agent <code>voice_id</code>; otherwise no <code>audio_response</code>.</li>
            <li><b>Audio capture:</b> send a single blob per <code>audio_query</code> (not streaming frames).</li>
            <li><b>Uploads:</b> paths must start with <code>users/&lt;uid&gt;/...</code> (enforced server-side).</li>
          </ul>
        </section>
      </main>

      <footer className="border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-6 text-sm text-slate-500">
          © {new Date().getFullYear()} AI Coach (docs)
        </div>
      </footer>
    </div>
  );
}
