import { useCallback, useEffect, useRef, useState } from "react";

type MicState = "unknown" | "granted" | "denied";
export type UseMicrophone = {
  state: MicState;
  hint: string;
  start: () => Promise<void>;
  stop: () => void;
  isRecording: boolean;
};

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

function pickBestMime(): string {
  const order = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg",
    "audio/mp4",
    "audio/mpeg",
  ];
  const isSup = window.MediaRecorder?.isTypeSupported?.bind(window.MediaRecorder);
  for (const t of order) if (isSup?.(t)) return t;
  return "";
}

async function blobToDataUrl(blob: Blob) {
  const buf = await blob.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
  return `data:${blob.type};base64,${base64}`;
}

export function useMicrophone(
  onAudioReady: (dataUrl: string, mime: string) => void
): UseMicrophone {
  const [state, setState] = useState<MicState>("unknown");
  const [hint, setHint] = useState("Hold mic to speak. We’ll ask for permission.");
  const [isRecording, setIsRecording] = useState(false);

  const recRef = useRef<{ mr: MediaRecorder | null; stream: MediaStream | null }>({ mr: null, stream: null });

  // passive read of mic permission
  useEffect(() => {
    (async () => {
      try {
        // @ts-ignore
        const p = await navigator.permissions?.query?.({ name: "microphone" as PermissionName });
        if (p?.state === "granted") setState("granted");
        if (p?.state === "denied")  setState("denied");
        p?.addEventListener?.("change", () => {
          // @ts-ignore
          const st = p.state as PermissionState;
          setState(st === "granted" ? "granted" : st === "denied" ? "denied" : "unknown");
        });
      } catch {}
    })();
  }, []);

  const start = useCallback(async () => {
    if (recRef.current.mr) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      setState("granted");
      setHint("Recording… release to send");

      const mime = pickBestMime();
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks: Blob[] = [];
      mr.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      mr.onstop = async () => {
        try {
          const type = mr.mimeType || mime || "audio/webm";
          const blob = new Blob(chunks, { type });

          if (blob.size > MAX_AUDIO_BYTES) {
            setHint("Recording too large. Try shorter.");
            return;
          }
          const dataUrl = await blobToDataUrl(blob);
          onAudioReady(dataUrl, type);
        } finally {
          stream.getTracks().forEach((t) => t.stop());
          recRef.current = { mr: null, stream: null };
          setIsRecording(false);
          setHint("Hold mic to speak.");
        }
      };
      recRef.current = { mr, stream };
      mr.start();
      setIsRecording(true);
    } catch {
      setState("denied");
      setHint("Microphone blocked. Enable it in your browser settings.");
    }
  }, [onAudioReady]);

  const stop = useCallback(() => {
    const mr = recRef.current.mr;
    if (!mr) return;
    try { mr.stop(); } catch {}
  }, []);

  return { state, hint, start, stop, isRecording };
}
