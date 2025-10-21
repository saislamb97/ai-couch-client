import { useEffect, useMemo, useState } from "react";
import { listAgents, createAgent, deleteAgent } from "@/api/endpoints";
import type { Agent } from "@/types";
import { useNavigate } from "react-router-dom";

/* small utils */
function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}
async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/* ---------- Create Modal ---------- */
function CreateAgentModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (a: Agent) => void;
}) {
  const [name, setName] = useState("");
  const [voiceId, setVoiceId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const canCreate = name.trim().length > 0 && !busy;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl ring-1 ring-black/5">
        <h3 className="text-xl font-semibold tracking-tight">Create Agent</h3>
        <p className="mt-1 text-xs text-zinc-500">
          A name is required. Voice ID enables TTS responses.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-sm font-medium text-zinc-800">Name</label>
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="Coach Nova"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-800">Voice ID (optional)</label>
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="elevenlabs-voice-123"
              value={voiceId}
              onChange={(e) => setVoiceId(e.target.value)}
            />
            <p className="mt-1 text-xs text-zinc-500">
              When set, the backend will stream <span className="font-medium">audio_response</span> events.
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-800">Prompt (optional)</label>
            <textarea
              className="mt-1 w-full min-h-28 rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="You are a helpful AI coach…"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            className="rounded border px-3 py-2 text-zinc-800 hover:bg-zinc-50"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            className={`rounded px-3 py-2 text-white ${
              canCreate ? "bg-indigo-600 hover:bg-indigo-700" : "bg-indigo-300"
            }`}
            disabled={!canCreate}
            onClick={async () => {
              try {
                setBusy(true);
                const a = await createAgent({
                  name: name.trim(),
                  voice_id: voiceId.trim() ? voiceId.trim() : null,
                  prompt,
                });
                onCreated(a);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Small Presentational Bits ---------- */
function Avatar({
  src,
  name,
}: {
  src: string | null | undefined;
  name: string | null | undefined;
}) {
  if (src) {
    return <img src={src} className="h-12 w-12 rounded-xl object-cover" />;
  }
  const initial = (name || "A").trim().charAt(0).toUpperCase();
  return (
    <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-indigo-500/15 to-fuchsia-500/15 text-lg font-semibold text-indigo-700 ring-1 ring-inset ring-zinc-200">
      {initial}
    </div>
  );
}

function FieldRow({
  label,
  value,
  mono,
  copyable,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
  copyable?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2">
      <span className="shrink-0 text-[11px] font-medium text-zinc-500">{label}</span>
      <div className="min-w-0 flex-1">
        <div
          className={`truncate text-sm ${mono ? "font-mono text-zinc-800" : "text-zinc-800"}`}
          title={value}
        >
          {value}
        </div>
      </div>
      {copyable ? (
        <button
          className="rounded-md border px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
          onClick={async () => {
            const ok = await copy(value);
            if (!ok) alert("Copy failed");
          }}
        >
          Copy
        </button>
      ) : null}
    </div>
  );
}

/* ---------- Agent Card ---------- */
function AgentCard({
  a,
  onOpen,
  onDelete,
}: {
  a: Agent;
  onOpen: () => void;
  onDelete: () => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);
  const hasTTS = !!a.voice_id;
  const hasPrompt = useMemo(() => !!a.prompt && a.prompt.trim().length > 0, [a.prompt]);

  return (
    <div className="group relative flex flex-col rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm transition hover:shadow-md">
      {/* top */}
      <div className="flex items-start gap-3">
        <Avatar src={a.avatar} name={a.name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3
              className="truncate text-base font-semibold text-zinc-900"
              title={a.name || "(unnamed)"}
            >
              {a.name || "(unnamed)"}
            </h3>
            {hasTTS ? (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                TTS
              </span>
            ) : (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-600">
                Text-only
              </span>
            )}
            {hasPrompt ? (
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                Prompt set
              </span>
            ) : (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-600">
                No prompt
              </span>
            )}
          </div>
          <div className="mt-0.5 text-[11px] text-zinc-500">Created {formatDate(a.created_at)}</div>
        </div>
      </div>

      {/* meta (no prompt text shown) */}
      <div className="mt-3 space-y-2">
        <FieldRow label="Bot ID" value={a.bot_id} mono copyable />
        {a.voice_id ? <FieldRow label="Voice" value={a.voice_id} mono /> : null}
        {/* Intentionally not rendering prompt content */}
      </div>

      {/* actions */}
      <div className="mt-4 flex gap-2">
        <button
          className="flex-1 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          onClick={onOpen}
        >
          Open
        </button>
        <button
          className="rounded-lg border px-3 py-2 text-sm hover:bg-zinc-50"
          disabled={deleting}
          onClick={async () => {
            const sure = confirm("Delete this agent and its chats? This cannot be undone.");
            if (!sure) return;
            try {
              setDeleting(true);
              await onDelete();
            } finally {
              setDeleting(false);
            }
          }}
        >
          {deleting ? "Deleting…" : "Delete"}
        </button>
      </div>

      {/* subtle ring on hover */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-transparent transition group-hover:ring-zinc-200/90" />
    </div>
  );
}

/* ---------- Skeletons ---------- */
function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-zinc-200/70 bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 rounded-xl bg-zinc-200" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-40 rounded bg-zinc-200" />
          <div className="h-3 w-24 rounded bg-zinc-200" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-4 w-56 rounded bg-zinc-200" />
        <div className="h-4 w-72 rounded bg-zinc-200" />
      </div>
      <div className="mt-4 flex gap-2">
        <div className="h-9 w-full rounded-lg bg-zinc-200" />
        <div className="h-9 w-24 rounded-lg bg-zinc-200" />
      </div>
    </div>
  );
}

/* ---------- Page ---------- */
export default function AgentsPage() {
  const [items, setItems] = useState<Agent[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const navigate = useNavigate();

  async function load(c?: string | null) {
    if (c) setLoadingMore(true);
    else setLoading(true);

    try {
      const data = await listAgents(12, c ?? undefined);
      setItems(c ? (prev) => [...prev, ...data.items] : data.items);
      setNextCursor(data.next_cursor ?? null);
      setCursor(c ?? null);
    } finally {
      if (c) setLoadingMore(false);
      else setLoading(false);
    }
  }

  useEffect(() => {
    load(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Your Agents</h1>
          <p className="text-sm text-zinc-500">
            Create coaches with prompts and optional ElevenLabs voice IDs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-lg bg-indigo-600 px-3 py-2 text-white hover:bg-indigo-700"
            onClick={() => setOpen(true)}
          >
            Create Agent
          </button>
        </div>
      </div>

      <CreateAgentModal
        open={open}
        onClose={() => setOpen(false)}
        onCreated={(a) => {
          setOpen(false);
          navigate(`/agents/${a.bot_id}`);
        }}
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center">
          <div className="mx-auto mb-2 h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500/15 to-fuchsia-500/15 ring-1 ring-zinc-200" />
          <h3 className="text-lg font-semibold">No agents yet</h3>
          <p className="mt-1 text-sm text-zinc-600">Create your first agent to start chatting.</p>
          <button
            className="mt-4 rounded-lg bg-indigo-600 px-3 py-2 text-white hover:bg-indigo-700"
            onClick={() => setOpen(true)}
          >
            Create Agent
          </button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((a) => (
              <AgentCard
                key={a.bot_id}
                a={a}
                onOpen={() => navigate(`/agents/${a.bot_id}`)}
                onDelete={async () => {
                  await deleteAgent(a.bot_id, true);
                  setItems((prev) => prev.filter((x) => x.bot_id !== a.bot_id));
                }}
              />
            ))}
          </div>

          <div className="flex justify-center pt-2">
            {nextCursor ? (
              <button
                className="rounded-lg border px-4 py-2 hover:bg-zinc-50"
                onClick={() => load(nextCursor)}
                disabled={loadingMore}
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
