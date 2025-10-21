// AgentPreviewPage.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { firebaseApp } from "@/lib/firebase";
import { api } from "@/api/client";
import AvatarPreview from "@/components/AvatarPreview";
import ChatPreview from "@/components/ChatPreview";
import SlidePreview from "@/components/SlidePreview";
import { useMicrophone } from "@/hooks/useMicrophone";
import type { Agent } from "@/types";

/* shadcn/ui */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { TooltipProvider } from "@/components/ui/tooltip";

/* icons */
import {
  FiWifi, FiRefreshCw, FiAlertTriangle, FiMessageSquare,
  FiClipboard, FiLink
} from "react-icons/fi";
import { TbWaveSine } from "react-icons/tb";
import { IoMicOutline, IoMicOffOutline } from "react-icons/io5";

/** ENV */
const API_BASE =
  import.meta.env.DEV
    ? (import.meta.env.VITE_API_BASE_URL || window.location.origin)
    : window.location.origin;
const WS_PATH = "/ws/chat/";
const DETAIL_ENDPOINT = "/api/agent/detail/";
const SESSION_CREATE_ENDPOINT = "/api/session/create/";

/** utils */
const linkify = (s = "") =>
  s.replace(/(https?:\/\/[^\s]+)/g, (m) => `<a href="${m}" target="_blank" rel="noopener">${m}</a>`);
const escapeHTML = (s: string) => { const d = document.createElement("div"); d.innerText = s; return d.innerHTML; };
const fmtNow = () => {
  const d = new Date(), pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};
const useScriptOnce = (src: string) => useEffect(() => {
  if (!src) return;
  if (document.querySelector(`script[src="${src}"]`)) return;
  const el = document.createElement("script"); el.src = src; el.async = true;
  el.onerror = () => console.warn("[animation] failed:", src);
  document.body.appendChild(el);
}, [src]);

/** localStorage helpers (per-bot key) */
const getSessionKey = (botId: string) => `session_id:${botId}`;
const readCachedSessionId = (botId: string) => { try { return localStorage.getItem(getSessionKey(botId)); } catch { return null; } };
const writeCachedSessionId = (botId: string, sessionId: string) => { try { localStorage.setItem(getSessionKey(botId), sessionId); } catch {} };
const clearCachedSessionId = (botId: string) => { try { localStorage.removeItem(getSessionKey(botId)); } catch {} };

/** Types */
type ConnState = "connecting" | "connected" | "reconnecting" | "error";
type MsgRow = { id: string; kind: "user" | "assistant" | "thinking"; html?: string };
type AgentDetailResp = {
  agent: Agent;
  chats: { items: Array<{ query: string; response: string; created_at: string }>; next_cursor?: string | null; };
};
type SessionDto = { session_id: string; title?: string; summary?: string; created_at?: string; updated_at?: string };
type Slide = { title?: string; bullets?: string[] };
type SlidesJson = { slides?: Slide[] } | null;

export default function AgentPreviewPage() {
  const { botId = "" } = useParams();

  // layout + state
  const [agent, setAgent] = useState<Agent | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("Connecting…");
  const [conn, setConn] = useState<ConnState>("connecting");
  const [timingMs, setTimingMs] = useState<number | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [history, setHistory] = useState<MsgRow[]>([]);
  const [inputVal, setInputVal] = useState("");

  // session (now managed from backend)
  const [sessionId, setSessionId] = useState<string | null>(null);

  // ---- Overlapping runs state ----
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const liveRowByRunRef = useRef<Record<string, string>>({});
  const runStartedAtRef = useRef<Record<string, number>>({});
  const [slidesByRun, setSlidesByRun] = useState<Record<string, SlidesJson>>({});
  const [slidesRawByRun, setSlidesRawByRun] = useState<Record<string, string>>({});
  const [slidesLoadingByRun, setSlidesLoadingByRun] = useState<Record<string, boolean>>({});

  const derivedSlides = activeRunId ? slidesByRun[activeRunId] ?? null : null;
  const derivedSlidesRaw = activeRunId ? slidesRawByRun[activeRunId] ?? null : null;
  const derivedSlidesLoading = activeRunId ? !!slidesLoadingByRun[activeRunId] : false;

  // audio/speech
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioQueueRef = useRef<string[]>([]);
  const responseEndRef = useRef<boolean>(false);
  const [muted, setMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // ws + auth
  const wsRef = useRef<WebSocket | null>(null);
  const auth = useMemo(() => getAuth(firebaseApp), []);

  // icons
  const connDot =
    conn === "connected" ? "bg-emerald-500" :
    conn === "reconnecting" ? "bg-amber-500" :
    conn === "error" ? "bg-rose-500" : "bg-sky-500";
  const statusIcon =
    conn === "connected" ? (isSpeaking ? <TbWaveSine /> : <FiMessageSquare />) :
    conn === "reconnecting" ? <FiRefreshCw className="animate-spin" /> :
    conn === "error" ? <FiAlertTriangle /> : <FiWifi />;

  useScriptOnce(`${API_BASE}/static/js/animation.js`);

  /** log helper */
  const log = (line: string) =>
    setLogs((l) => [...l, `[${new Date().toLocaleTimeString()}] ${line}`].slice(-250));

  /** Ensure we have a session from backend (and cache it per bot) */
  const createSessionOnBackend = useCallback(async (): Promise<string> => {
    const params = new URLSearchParams({ bot_id: botId });
    const { data } = await api.post<SessionDto>(`${SESSION_CREATE_ENDPOINT}?${params.toString()}`, { title: "New Session" });
    if (!data?.session_id) throw new Error("No session_id in response");
    writeCachedSessionId(botId, data.session_id);
    log(`session created (server): ${data.session_id}`);
    return data.session_id;
  }, [botId]);

  const ensureSession = useCallback(async (): Promise<string> => {
    const cached = readCachedSessionId(botId);
    if (cached) { log(`session reused (cache): ${cached}`); return cached; }
    return await createSessionOnBackend();
  }, [botId, createSessionOnBackend]);

  /** Fetch agent + chat history (after sessionId is known) */
  const fetchAgentAndHistory = useCallback(async (sid: string) => {
    const params = new URLSearchParams({ bot_id: botId, session_id: sid, limit: "40" });
    const { data } = await api.get<AgentDetailResp>(`${DETAIL_ENDPOINT}?${params.toString()}`);
    setAgent(data.agent);
    setAvatarUrl(data.agent.avatar ?? null);

    const items: MsgRow[] = [];
    for (const c of (data.chats?.items ?? []).reverse()) {
      if (c.query) items.push({ id: `u_${c.created_at}`, kind: "user", html: linkify(escapeHTML(c.query)) });
      if (c.response) items.push({ id: `a_${c.created_at}`, kind: "assistant", html: linkify(escapeHTML(c.response)) });
    }
    setHistory(items);
  }, [botId]);

  /** Init */
  useEffect(() => {
    if (!botId) return;
    (async () => {
      try {
        setStatus("Initializing session…");
        const sid = await ensureSession();
        setSessionId(sid);
        await fetchAgentAndHistory(sid);
        setStatus("Ready");
      } catch {
        log("detail/session init failed");
        setConn("error");
        setStatus("Init failed");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botId]);

  /** websocket lifecycle — depends on sessionId */
  useEffect(() => {
    if (!botId || !sessionId) return;

    let heart: number | null = null;

    const open = async () => {
      try {
        setConn((c) => (c === "connected" ? "reconnecting" : "connecting"));
        setStatus("Connecting…");
        const token = await auth.currentUser?.getIdToken();
        if (!token) { setConn("error"); setStatus("Auth required"); log("no auth token"); return; }

        const loc = new URL(import.meta.env.DEV ? (import.meta.env.VITE_API_BASE_URL || window.location.origin) : window.location.origin);
        const wsProto = loc.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${wsProto}//${loc.host}${WS_PATH}?bot_id=${encodeURIComponent(botId)}&session_id=${encodeURIComponent(sessionId)}&token=${encodeURIComponent(token)}`;
        log(`WS → ${wsUrl}`);

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setConn("connected"); setStatus("Connected"); log("WS connected");
          heart = window.setInterval(() => { if (ws.readyState === 1) ws.send(JSON.stringify({ type: "ping" })); }, 60000);
        };
        ws.onmessage = (ev) => { try { handleWsMessage(JSON.parse(ev.data)); } catch { log("bad WS message"); } };
        ws.onerror   = () => { setConn("error"); setStatus("WebSocket error"); log("WS error"); };
        ws.onclose   = () => {
          setConn("reconnecting"); setStatus("Reconnecting…"); log("WS closed → retrying");
          if (heart) clearInterval(heart); heart = null;
          setTimeout(open, 900);
        };
      } catch {
        setConn("error"); setStatus("WebSocket init failed"); log("WS init failed");
      }
    };

    open();
    return () => {
      try { wsRef.current?.readyState === 1 && wsRef.current.send(JSON.stringify({ type: "stop_audio" })); } catch {}
      wsRef.current?.close();
    };
  }, [botId, sessionId, auth]);

  // audio element wiring
  useEffect(() => {
    const audio = (audioRef.current = new Audio());
    audio.setAttribute("playsinline", "true");
    audio.addEventListener("play", () => setIsSpeaking(true));
    audio.addEventListener("pause", () => { if (audioQueueRef.current.length === 0) setIsSpeaking(false); });
    audio.addEventListener("ended", () => {
      const q = audioQueueRef.current;
      if (q.length > 0) playQueueIfIdle();
      else if (responseEndRef.current) finishPlaybackCycle();
    });
    return () => { audio.pause(); audio.src = ""; };
  }, []);

  // mic hook
  const mic = useMicrophone((dataUrl, type) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({ type: "audio_query", audio: dataUrl, format: type, muteAudio: muted }));
      beginThinking();
      setStatus("Processing audio…");
      log(`client → audio_query (${type})`);
    }
  });

  // stream helpers
  const beginThinking = () => setHistory((h) => [...h, { id: `th_${Date.now()}`, kind: "thinking" }]);
  const endThinking   = () => setHistory((h) => h.filter((x) => x.kind !== "thinking"));

  // Per-run grow/finalize assistant content
  function growAssistantForRun(runId: string, chunk: string) {
    const incoming = chunk.trim();
    if (!incoming) return;

    let liveId = liveRowByRunRef.current[runId];
    setHistory((h) => {
      const copy = [...h];
      if (!liveId) {
        liveId = `live_${runId}_${Date.now()}`;
        liveRowByRunRef.current[runId] = liveId;
        copy.push({ id: liveId, kind: "assistant", html: escapeHTML(incoming) });
        return copy;
      }

      const idx = copy.findIndex((x) => x.id === liveId);
      if (idx >= 0) {
        const prev = (copy[idx].html || "").replace(/\s+/g, " ").trim();
        const next = (prev ? prev + " " : "") + incoming.replace(/\n/g, " ");
        copy[idx] = { ...copy[idx], html: escapeHTML(next) };
      } else {
        copy.push({ id: liveId, kind: "assistant", html: escapeHTML(incoming) });
      }
      return copy;
    });
  }

  function finalizeAssistantForRun(runId: string) {
    const liveId = liveRowByRunRef.current[runId];
    if (!liveId) return;
    setHistory((h) =>
      h.map((x) =>
        x.id === liveId && x.kind === "assistant"
          ? { ...x, id: `a_${runId}_${Date.now()}`, html: linkify(x.html || "") }
          : x
      )
    );
    delete liveRowByRunRef.current[runId];
  }

  function handleWsMessage(msg: any) {
    const runId = (msg.run_id as string | undefined) || null;

    switch (msg.type) {
      case "connected": log(`server connected: bot=${msg.bot_id} session=${msg.session_id}`); break;

      case "text_query": {
        endThinking();
        const t = String(msg.text || "");
        setHistory((h) => [...h, { id: `u_${Date.now()}`, kind: "user", html: linkify(escapeHTML(t)) }]);
        setStatus("User · sent");
        break;
      }

      case "response_start": {
        if (runId) {
          setActiveRunId((curr) => {
            const now = Date.now();
            runStartedAtRef.current[runId] = now;
            if (!curr) return runId;
            const a = runStartedAtRef.current[curr] || 0;
            return now >= a ? runId : curr;
          });
          setSlidesByRun((m) => ({ ...m, [runId]: null }));
          setSlidesRawByRun((m) => ({ ...m, [runId]: "" }));
          setSlidesLoadingByRun((m) => ({ ...m, [runId]: false }));
        }
        beginThinking();
        setStatus("Assistant · typing…");
        break;
      }

      case "text_response": {
        endThinking();
        const t = String(msg.text || "");
        if (runId) growAssistantForRun(runId, t);
        setStatus("Assistant · typing…");
        break;
      }

      case "slides_response": {
        if (!runId) break;
        if (msg.slides_raw === "__started__") {
          setSlidesLoadingByRun((m) => ({ ...m, [runId]: true }));
          setActiveRunId((curr) => {
            if (!curr) return runId;
            const a = runStartedAtRef.current[curr] || 0;
            const b = runStartedAtRef.current[runId] || Date.now();
            return b >= a ? runId : curr;
          });
          log(`slides sub-agent: started (run=${runId})`);
          break;
        }
        if (msg.slides) {
          setSlidesByRun((m) => ({ ...m, [runId]: msg.slides as SlidesJson }));
          setSlidesLoadingByRun((m) => ({ ...m, [runId]: false }));
          log(`slides sub-agent: json delivered (run=${runId})`);
        }
        if (msg.slides_raw != null && msg.slides_raw !== "__started__") {
          setSlidesRawByRun((m) => ({ ...m, [runId]: String(msg.slides_raw) }));
          setSlidesLoadingByRun((m) => ({ ...m, [runId]: false }));
          log(`slides sub-agent: raw delivered (run=${runId})`);
        }
        break;
      }

      case "audio_response": {
        const b64 = "data:audio/mpeg;base64," + (msg.audio || "");
        audioQueueRef.current.push(b64);
        playQueueIfIdle();
        break;
      }

      case "response_done": {
        const ms = Number(msg?.timings?.total_ms ?? 0) || 0;
        setTimingMs(ms);
        setStatus("Assistant · done");
        break;
      }

      case "response_ended": {
        if (runId) finalizeAssistantForRun(runId);
        responseEndRef.current = true;
        if (audioQueueRef.current.length === 0) finishPlaybackCycle();
        break;
      }

      case "stop_audio": {
        audioQueueRef.current = [];
        if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
        setIsSpeaking(false);
        break;
      }

      case "error": { endThinking(); setStatus("Error"); break; }
      default: log(`unknown: ${msg.type}`);
    }
  }

  // audio queue helpers
  function playQueueIfIdle() {
    const audio = audioRef.current!;
    if (!audio.paused && !audio.ended) return;
    const next = audioQueueRef.current.shift(); if (!next) return;
    audio.src = next; audio.muted = muted;
    audio.play().then(() => setIsSpeaking(true)).catch(() => {});
  }
  function finishPlaybackCycle() { responseEndRef.current = false; setIsSpeaking(false); }

  // quick actions
  const copyLastAssistant = useCallback(async () => {
    const last = [...history].reverse().find((m) => m.kind === "assistant");
    if (!last?.html) return;
    const tmp = document.createElement("div");
    tmp.innerHTML = last.html;
    const text = tmp.textContent || tmp.innerText || "";
    await navigator.clipboard.writeText(text);
    log("copied last assistant reply");
  }, [history]);

  const clearChat = useCallback(() => {
    setHistory([]);
    setSlidesByRun({});
    setSlidesRawByRun({});
    setSlidesLoadingByRun({});
    setTimingMs(null);
    log("cleared chat");
  }, []);

  const reconnectWS = useCallback(() => {
    try { wsRef.current?.close(); } catch {}
    setStatus("Reconnecting…");
    log("manual reconnect");
  }, []);

  // actions
  const sendText = useCallback(() => {
    const ws = wsRef.current, text = inputVal.trim();
    if (!ws || ws.readyState !== 1 || !text) return;
    ws.send(JSON.stringify({ type: "text_query", text, local_time: fmtNow(), muteAudio: muted }));
    setInputVal("");
    beginThinking();
    setStatus("Generating response…");
  }, [inputVal, muted]);

  const stopAll = useCallback(() => {
    const ws = wsRef.current;
    if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: "stop_audio" }));
    audioQueueRef.current = [];
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
    setIsSpeaking(false);
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const n = !m; if (audioRef.current) audioRef.current.muted = n; return n;
    });
  }, []);

  /** RESET: fresh backend session */
  const doReset = useCallback(async () => {
    try {
      setStatus("Resetting…");
      try { wsRef.current?.readyState === 1 && wsRef.current.send(JSON.stringify({ type: "stop_audio" })); } catch {}
      wsRef.current?.close();

      clearCachedSessionId(botId);
      const newId = await createSessionOnBackend();
      setSessionId(newId);

      setHistory([]);
      setSlidesByRun({});
      setSlidesRawByRun({});
      setSlidesLoadingByRun({});
      setLogs([]);
      setTimingMs(null);
      setIsSpeaking(false);
      setActiveRunId(null);
      runStartedAtRef.current = {};
      liveRowByRunRef.current = {};

      await fetchAgentAndHistory(newId);
      setStatus("Ready");
    } catch {
      setConn("error");
      setStatus("Reset failed");
      log("reset failed");
    }
  }, [botId, createSessionOnBackend, fetchAgentAndHistory]);

  // mic button visuals
  const micIcon = mic.state === "denied" ? <IoMicOffOutline /> : <IoMicOutline />;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="bg-[var(--bg,#f6f7fb)]">
        <div className="mx-auto max-w-[1680px] px-3 sm:px-4 md:px-6">
          {/* 2 rows × 2 columns layout */}
          <div className="grid grid-cols-12 gap-4 lg:gap-5 xl:gap-6 py-2">

            {/* ROW 1 — Chat (left) */}
            <div className="col-span-12 lg:col-span-6 order-1">
              <ChatPreview
                status={status}
                history={history}
                value={inputVal}
                onChange={setInputVal}
                onSend={() => {
                  if (!inputVal.trim() || conn !== "connected") return;
                  sendText();
                }}
                micIcon={micIcon}
                micTitle={mic.state === "denied" ? "Microphone blocked" : mic.isRecording ? "Recording…" : "Hold to record"}
                onMicDown={() => mic.start()}
                onMicUp={() => mic.stop()}
                canSend={!!inputVal.trim() && conn === "connected"}
                micHint={mic.state === "denied" ? "Microphone blocked. Enable in Site Permissions and reload." : mic.hint}

                /* Header actions */
                onReconnect={reconnectWS}
                onCopyLast={copyLastAssistant}
                onClearChat={clearChat}
                onReset={doReset}
                onToggleMute={toggleMute}
                onStopSpeech={stopAll}
                muted={muted}
                isSpeaking={isSpeaking}
                isRecording={mic.isRecording}
              />
            </div>

            {/* ROW 1 — Slides (right) */}
            <div className="col-span-12 lg:col-span-6 order-2">
              <SlidePreview
                slides={derivedSlides ?? undefined}
                slidesRaw={derivedSlidesRaw ?? undefined}
                loading={derivedSlidesLoading}
                runs={Object.entries(runStartedAtRef.current)
                  .sort((a, b) => (b[1] || 0) - (a[1] || 0))
                  .slice(0, 10)
                  .map(([id]) => ({
                    id,
                    active: activeRunId === id,
                    onClick: () => setActiveRunId(id),
                  }))}
              />
            </div>

            {/* ROW 2 — Avatar (left) */}
            <div className="col-span-12 lg:col-span-6 order-3">
              <Card className="flex flex-col h-[80vh]">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                      {statusIcon}
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        {agent?.name ?? "Assistant"}
                        <FiLink className={conn === "connected" ? "text-emerald-500" : "text-gray-400"} />
                      </CardTitle>
                      <p className="text-[11px] text-gray-500 truncate">
                        session: {sessionId ?? "…"}
                        <span className={`ml-2 inline-block w-1.5 h-1.5 rounded-full ${connDot}`} />
                      </p>
                    </div>
                  </div>
                </CardHeader>

                <Separator className="mb-2" />

                <CardContent className="flex-1 min-h-0 flex items-center justify-center">
                  <div className="w-full max-w-md">
                    <AvatarPreview
                      url={avatarUrl}
                      mode={isSpeaking ? "response" : "idle"}
                      className="mt-1"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ROW 2 — Logs (right) */}
            <div className="col-span-12 lg:col-span-6 order-4">
              <Card className="flex flex-col h-[80vh]">
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <FiClipboard /> Logs
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => { setLogs([]); log("logs cleared"); }}>
                        Clear
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(logs.join("\n"))}>
                        Copy
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <Separator />
                <CardContent className="p-0 flex-1 min-h-0">
                  {/* Both vertical & horizontal scroll */}
                  <div className="h-full overflow-auto">
                    <div className="px-3 py-2 text-[11px] font-mono text-gray-700 whitespace-pre">
                      {logs.length === 0
                        ? "No logs yet…"
                        : logs.map((l, i) => `${l}${i < logs.length - 1 ? "\n" : ""}`).join("")}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
