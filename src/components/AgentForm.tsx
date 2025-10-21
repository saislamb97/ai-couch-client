import { memo, useCallback, useEffect, useRef } from "react";
import type { AgentCreateRequest } from "@/types";
import AvatarPreview from "@/components/AvatarPreview";

type Props = {
  form: AgentCreateRequest;
  onPatch: (patch: Partial<AgentCreateRequest>) => void;
  previewUrl: string | null;
  onPreviewReload: () => void;
  rpmSrc: string;
  onRpmExported: (url: string) => void;
};

const Field = memo(function Field({
  label, hint, colSpan = "md:col-span-1", children,
}: { label: string; hint?: string; colSpan?: string; children: React.ReactNode }) {
  return (
    <div className={`space-y-2 ${colSpan}`}>
      <label className="text-sm font-medium text-gray-800">{label}</label>
      {children}
      {hint ? <p className="text-xs text-gray-500">{hint}</p> : null}
    </div>
  );
});

const RPMEmbed = memo(function RPMEmbed({ onExported, src }: { onExported: (url: string) => void; src: string }) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      let data: any;
      try { data = typeof event.data === "string" ? JSON.parse(event.data) : event.data; } catch { return; }
      if (!data || data.source !== "readyplayerme") return;
      if (data.eventName === "v1.frame.ready") {
        frameRef.current?.contentWindow?.postMessage(
          JSON.stringify({ target: "readyplayerme", type: "subscribe", eventName: "v1.**" }), "*"
        );
      }
      if (data.eventName === "v1.avatar.exported" && data.data?.url) onExported(data.data.url);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [onExported]);

  return (
    <iframe
      ref={frameRef}
      className="w-full h-[70vh] rounded-xl border border-gray-200"
      allow="camera *; microphone *; clipboard-write"
      src={src}
      title="Ready Player Me"
    />
  );
});

export default function AgentForm({
  form, onPatch, previewUrl, onPreviewReload, rpmSrc, onRpmExported,
}: Props) {
  const onChange = useCallback(
    <K extends keyof AgentCreateRequest>(key: K) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const v = e.target.value;
        onPatch({ [key]: v.length ? v : (key === "avatar" || key === "voice_id" ? null : "") } as Partial<AgentCreateRequest>);
      },
    [onPatch]
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Form */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Name">
            <input className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200" value={form.name} onChange={onChange("name")} />
          </Field>
          <Field label="Voice ID" hint="Optional">
            <input className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200" value={form.voice_id ?? ""} onChange={onChange("voice_id")} />
          </Field>
          <Field label="Avatar (GLB) URL" hint="Edits won’t update preview until Reload/Save." colSpan="md:col-span-2">
            <div className="flex gap-2">
              <input className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200" placeholder="https://.../avatar.glb" value={form.avatar ?? ""} onChange={onChange("avatar")} />
              <button type="button" className="px-3 py-2 rounded-lg border hover:bg-gray-50" onClick={onPreviewReload}>Reload</button>
            </div>
          </Field>
          <Field label="Prompt" colSpan="md:col-span-2">
            <textarea className="w-full border rounded-lg px-3 py-2 min-h-32 focus:outline-none focus:ring-2 focus:ring-indigo-200" value={form.prompt} onChange={onChange("prompt")} />
          </Field>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-white rounded-xl shadow p-6">
        <AvatarPreview url={previewUrl} />
        <p className="text-xs text-gray-500 mt-3">
          Preview reflects the saved avatar (or after <strong>Reload</strong>). No refresh while typing.
        </p>
      </div>

      {/* Ready Player Me */}
      <div className="lg:col-span-2 bg-white rounded-xl shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-gray-900 font-medium">Ready Player Me</span>
          <span className="text-xs text-gray-500">Export fills the field and refreshes preview immediately.</span>
        </div>
        <RPMEmbed
          src={rpmSrc}
          onExported={(glbUrl) => { onPatch({ avatar: glbUrl }); onRpmExported(glbUrl); }}
        />
      </div>
    </div>
  );
}
