import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getAgent, updateAgent } from "@/api/endpoints";
import type { AgentCreateRequest, Agent } from "@/types";
import AgentForm from "@/components/AgentForm";

const API_BASE =
  import.meta.env.DEV
    ? (import.meta.env.VITE_API_BASE_URL || window.location.origin)
    : window.location.origin;
    
const RPM_URL  = (import.meta.env.VITE_RPM_FRAME_URL as string) || "https://nudgyt-b5jcsl.readyplayer.me/avatar?frameApi";

type UiState = { saving: boolean; error: string | null; savedAt?: number };

function useScriptOnce(src: string) {
  useEffect(() => {
    if (!src) return;
    if (document.querySelector(`script[src="${src}"]`)) {
      window.dispatchEvent(new CustomEvent("animationjs-ready"));
      return;
    }
    const el = document.createElement("script");
    el.src = src; el.async = true;
    el.onload = () => window.dispatchEvent(new CustomEvent("animationjs-ready"));
    el.onerror = () => console.warn("[animation] failed:", src);
    document.body.appendChild(el);
  }, [src]);
}

export default function AgentDetailPage() {
  const { botId = "" } = useParams();
  const navigate = useNavigate();

  const [agent, setAgent] = useState<Agent | null>(null);
  const [form, setForm] = useState<AgentCreateRequest>({ name: "", prompt: "", avatar: null, voice_id: null });
  const [initialForm, setInitialForm] = useState<AgentCreateRequest | null>(null);
  const [ui, setUi] = useState<UiState>({ saving: false, error: null });

  // load animations once (for AvatarPreview controls)
  useScriptOnce(`${API_BASE}/static/js/animation.js`);

  // preview is decoupled from form for snappy typing
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // fetch agent
  useEffect(() => {
    (async () => {
      try {
        const a = await getAgent(botId);
        const f: AgentCreateRequest = {
          name: a.name, voice_id: a.voice_id ?? null, prompt: a.prompt ?? "", avatar: a.avatar ?? null,
        };
        setAgent(a); setForm(f); setInitialForm(f);
        setPreviewUrl(f.avatar ?? null);
      } catch (e: any) {
        setUi((u) => ({ ...u, error: e?.message || "Failed to load agent" }));
      }
    })();
  }, [botId]);

  const patch = useCallback((p: Partial<AgentCreateRequest>) => {
    setForm((prev) => ({ ...prev, ...p }));
  }, []);

  const dirty = useMemo(() => {
    if (!initialForm) return false;
    return (
      initialForm.name !== form.name ||
      (initialForm.voice_id ?? null) !== (form.voice_id ?? null) ||
      (initialForm.prompt ?? "") !== (form.prompt ?? "") ||
      (initialForm.avatar ?? null) !== (form.avatar ?? null)
    );
  }, [initialForm, form]);

  const save = useCallback(async () => {
    try {
      setUi({ saving: true, error: null });
      const updated = await updateAgent(botId, form);
      const f: AgentCreateRequest = {
        name: updated.name, voice_id: updated.voice_id ?? null, prompt: updated.prompt ?? "", avatar: updated.avatar ?? null,
      };
      setAgent(updated); setForm(f); setInitialForm(f);
      setPreviewUrl(f.avatar ?? null);
      setUi({ saving: false, error: null, savedAt: Date.now() });
    } catch (e: any) {
      setUi({ saving: false, error: e?.message || "Failed to save" });
    }
  }, [botId, form]);

  if (!agent) {
    return <div className="bg-white rounded-xl shadow p-6 text-gray-700">Loading agent…</div>;
  }

  return (
    <div className="space-y-6">
      {/* Action bar */}
      <div className="flex items-center justify-between bg-white rounded-xl shadow p-4">
        <div>
          <h1 className="text-xl font-semibold">Agent Details</h1>
          <div className="mt-0.5 text-xs text-gray-500">bot_id: {botId}</div>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-2 rounded-lg border hover:bg-gray-50" onClick={() => navigate("/agents")}>Back</button>
          <button className="px-3 py-2 rounded-lg border hover:bg-gray-50" onClick={() => navigate(`/agents/preview/${botId}`)}>Preview</button>
          <button className="px-3 py-2 rounded-lg bg-indigo-600 text-white disabled:opacity-50 hover:bg-indigo-700" onClick={save} disabled={ui.saving || !dirty}>
            {ui.saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {/* Status */}
      {ui.error && <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-800 px-4 py-2">{ui.error}</div>}
      {!!ui.savedAt && !ui.error && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 px-4 py-2">
          Saved at {new Date(ui.savedAt).toLocaleTimeString()}
        </div>
      )}

      {/* Form + Preview + RPM */}
      <AgentForm
        form={form}
        onPatch={patch}
        previewUrl={previewUrl}
        onPreviewReload={() => setPreviewUrl(form.avatar ?? null)}
        rpmSrc={RPM_URL}
        onRpmExported={(glbUrl) => { setPreviewUrl(glbUrl); }}
      />
    </div>
  );
}
