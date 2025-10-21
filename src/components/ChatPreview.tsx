import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/* shadcn/ui */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

/* icons */
import {
  FiMessageSquare,
  FiUser,
  FiSend,
  FiRefreshCw,
  FiCopy,
  FiTrash2,
  FiRotateCcw,
  FiVolume2,
  FiVolumeX,
  FiStopCircle,
  FiMic,
  FiCheck,
  FiMoreHorizontal,
} from "react-icons/fi";
import type { IconType } from "react-icons";
import { TbWaveSine } from "react-icons/tb";

/* ---------- Types ---------- */
type Msg = {
  id: string;
  kind: "user" | "assistant" | "thinking";
  html?: string;
  md?: string;
};

export type Props = {
  status: string;
  history: Msg[];
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  micIcon: ReactNode;
  micTitle: string;
  onMicDown: () => void;
  onMicUp: () => void;
  canSend: boolean;
  micHint: string;
  onReconnect: () => void;
  onCopyLast: () => void;
  onClearChat: () => void;
  onReset: () => void;
  onToggleMute: () => void;
  onStopSpeech: () => void;
  muted: boolean;
  isSpeaking: boolean;
  isRecording?: boolean;
};

/* ---------- Helpers ---------- */
const decodeEntities = (s: string) => {
  const d = document.createElement("div");
  d.innerHTML = s;
  return d.textContent || d.innerText || "";
};

const htmlToMarkdown = (raw = "") =>
  decodeEntities(
    raw
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
      .replace(/<\/?p>/gi, "\n\n")
      .replace(/<[^>]+>/g, "")
  )
    .replace(/\r?\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const toMarkdown = (m: Msg) => m.md?.trim() || htmlToMarkdown(m.html || "");

/* ---------- Markdown Components ---------- */
const assistantMd = {
  a: (p: any) => <a {...p} target="_blank" rel="noopener noreferrer" />,
  code: (p: any) => (
    <code className="bg-zinc-100 text-zinc-900 rounded px-1 py-0.5 text-[13px] font-mono">
      {p.children}
    </code>
  ),
  pre: (p: any) => (
    <pre className="bg-zinc-950 text-zinc-50 rounded-xl p-3 overflow-x-auto text-sm shadow-sm">
      {p.children}
    </pre>
  ),
};
const userMd = {
  a: (p: any) => <a {...p} target="_blank" rel="noopener noreferrer" />,
  code: (p: any) => (
    <code className="bg-white/20 rounded px-1 py-0.5 font-mono text-xs">
      {p.children}
    </code>
  ),
};

/* ---------- Message Bubbles ---------- */
const CopyButton = memo(({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  const doCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }, [text]);
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 rounded-full"
            onClick={doCopy}
            aria-label="Copy message"
          >
            {copied ? <FiCheck className="text-emerald-600" /> : <FiCopy />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{copied ? "Copied" : "Copy"}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

const MsgBubbleAssistant = memo(({ msg }: { msg: Msg }) => {
  const content = toMarkdown(msg);
  if (!content) return null;
  return (
    <li className="group flex gap-2 items-start">
      <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600">
        <TbWaveSine />
      </div>
      <div className="relative bg-white/80 border border-gray-200 rounded-2xl px-3.5 py-2 shadow-sm max-w-[78%]">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={assistantMd as any}>
          {content}
        </ReactMarkdown>
        <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <CopyButton text={content} />
        </div>
      </div>
    </li>
  );
});

const MsgBubbleUser = memo(({ msg }: { msg: Msg }) => {
  const content = toMarkdown(msg);
  if (!content) return null;
  return (
    <li className="group flex gap-2 justify-end">
      <div className="relative bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white rounded-2xl px-3.5 py-2 shadow max-w-[78%]">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={userMd as any}>
          {content}
        </ReactMarkdown>
        <div className="absolute -top-2 -left-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <CopyButton text={content} />
        </div>
      </div>
      <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600">
        <FiUser />
      </div>
    </li>
  );
});

const MsgBubbleThinking = memo(() => (
  <li className="flex gap-2 items-start">
    <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600">
      <TbWaveSine />
    </div>
    <div className="animate-pulse bg-white/70 border border-gray-200 rounded-2xl px-3 py-3 w-56 max-w-[78%]" />
  </li>
));

/* ---------- Header Toolbar ---------- */
const HeaderToolbar = memo(
  ({
    muted,
    isSpeaking,
    isRecording,
    status,
    onReconnect,
    onCopyLast,
    onClearChat,
    onReset,
    onToggleMute,
    onStopSpeech,
  }: {
    muted: boolean;
    isSpeaking: boolean;
    isRecording?: boolean;
    status: string;
    onReconnect: () => void;
    onCopyLast: () => void;
    onClearChat: () => void;
    onReset: () => void;
    onToggleMute: () => void;
    onStopSpeech: () => void;
  }) => {
    const state =
      muted ? "Muted" : isRecording ? "Recording" : isSpeaking ? "Speaking" : "Idle";

    // Strongly-typed action descriptors (fixes Icon JSX typing issues)
    const actions: Array<{ Icon: IconType; onClick: () => void; label: string }> = [
      { Icon: FiRefreshCw, onClick: onReconnect, label: "Reconnect" },
      { Icon: FiCopy, onClick: onCopyLast, label: "Copy last" },
      { Icon: FiTrash2, onClick: onClearChat, label: "Clear chat" },
      { Icon: FiRotateCcw, onClick: onReset, label: "New session" },
      { Icon: muted ? FiVolumeX : FiVolume2, onClick: onToggleMute, label: muted ? "Unmute" : "Mute" },
      { Icon: FiStopCircle, onClick: onStopSpeech, label: "Stop speech" },
    ];

    return (
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
          <FiMessageSquare />
        </div>

        <div className="flex-1 min-w-0">
          <CardTitle className="text-base font-semibold">Chat</CardTitle>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="secondary" className="h-5 rounded-full px-2 text-[11px]">
              <span
                className={`inline-block h-2.5 w-2.5 rounded-full ${
                  isSpeaking && !muted ? "bg-emerald-500 animate-pulse" : "bg-zinc-300"
                }`}
              />{" "}
              {state}
            </Badge>
            <span className="text-[11px] text-zinc-600 truncate">{status}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 ml-auto">
          {actions.map(({ Icon, onClick, label }) => (
            <TooltipProvider key={label}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onClick}>
                    <Icon />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{label}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
          <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="More">
            <FiMoreHorizontal />
          </Button>
        </div>
      </div>
    );
  }
);

/* ---------- Main Component ---------- */
const ChatPreview = memo(function ChatPreview({
  status,
  history,
  value,
  onChange,
  onSend,
  micIcon,
  micTitle,
  onMicDown,
  onMicUp,
  canSend,
  micHint,
  onReconnect,
  onCopyLast,
  onClearChat,
  onReset,
  onToggleMute,
  onStopSpeech,
  muted,
  isSpeaking,
  isRecording = false,
}: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // autoresize
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const resize = () => {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 160) + "px";
    };
    resize();
    el.addEventListener("input", resize);
    return () => el.removeEventListener("input", resize);
  }, []);

  // autoscroll
  useEffect(() => {
    const node = endRef.current;
    if (node) node.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [history]);

  const handleSend = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      onSend();
    },
    [onSend]
  );

  return (
    <div className="h-[84vh] flex flex-col">
      <Card className="flex-1 flex flex-col border-zinc-200/70 shadow-sm bg-white/80 backdrop-blur overflow-hidden">
        <CardHeader className="py-3 border-b bg-white/80 backdrop-blur sticky top-0 z-10">
          <HeaderToolbar
            status={status}
            muted={muted}
            isSpeaking={isSpeaking}
            isRecording={isRecording}
            onReconnect={onReconnect}
            onCopyLast={onCopyLast}
            onClearChat={onClearChat}
            onReset={onReset}
            onToggleMute={onToggleMute}
            onStopSpeech={onStopSpeech}
          />
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
          <ScrollArea className="flex-1 h-full overflow-y-auto">
            <div ref={viewportRef} className="h-full">
              <div className="p-4 bg-gradient-to-b from-white/40 to-zinc-50/40">
                <ul className="space-y-4 max-w-[52rem] mx-auto" aria-live="polite">
                  {history.map((m) =>
                    m.kind === "user" ? (
                      <MsgBubbleUser key={m.id} msg={m} />
                    ) : m.kind === "assistant" ? (
                      <MsgBubbleAssistant key={m.id} msg={m} />
                    ) : (
                      <MsgBubbleThinking key={m.id} />
                    )
                  )}
                  <div ref={endRef} />
                </ul>
              </div>
            </div>
          </ScrollArea>

          <Separator />

          {/* Composer */}
          <form
            className="px-3 py-3 bg-white/90 flex items-end gap-2 sticky bottom-0"
            onSubmit={handleSend}
          >
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant={isRecording ? "destructive" : "outline"}
                    className="relative w-11 h-11 shrink-0"
                    aria-label={micTitle}
                    onMouseDown={onMicDown}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      onMicDown();
                    }}
                    onMouseUp={onMicUp}
                    onTouchEnd={onMicUp}
                  >
                    {micIcon ?? <FiMic />}
                    {isRecording && (
                      <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{micTitle}</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <textarea
              ref={inputRef}
              rows={1}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
              }}
              placeholder="Type a message or hold the mic…"
              className="flex-1 resize-none rounded-xl px-3 py-2.5 bg-white/90 border border-zinc-200 focus:ring-2 focus:ring-indigo-400/40 text-sm"
            />

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button type="submit" disabled={!canSend} className="h-11 px-3 gap-2">
                      <FiSend /> <span className="hidden sm:inline">Send</span>
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>Enter to send · Shift+Enter for newline</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </form>

          <div className="flex justify-between px-4 pb-2 text-[11px] text-zinc-600">
            <span>{micHint}</span>
            <span className="hidden sm:block">Enter to send · Shift+Enter for newline</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

export default ChatPreview;
