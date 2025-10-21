// components/AvatarPreview.tsx
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  WebGLRenderer, Scene, PerspectiveCamera, Clock,
  AmbientLight, DirectionalLight, HemisphereLight,
  Box3, Vector3, MathUtils, AnimationMixer, AnimationClip, LoopRepeat,
  ACESFilmicToneMapping, SRGBColorSpace,
} from "three";
import { GLTFLoader, DRACOLoader } from "three-stdlib";
import type { GLTF } from "three-stdlib";

declare global { interface Window { standingAnimation1?: any; responseAnimation1?: any; } }

export type AvatarPreviewProps = {
  url: string | null;
  mode?: "idle" | "response";
  className?: string;
};

const parseClip = (raw: any): AnimationClip | null =>
  raw ? (raw instanceof AnimationClip ? raw : AnimationClip.parse(raw)) : null;

function disposeObject3D(obj: any) {
  if (!obj) return;
  obj.traverse?.((child: any) => {
    if (child.geometry) child.geometry.dispose?.();
    if (child.material) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((m: any) => {
        Object.keys(m).forEach((k) => { const v = (m as any)[k]; if (v?.isTexture) v.dispose?.(); });
        m.dispose?.();
      });
    }
  });
  obj.parent?.remove(obj);
}

const AvatarPreview = memo(function AvatarPreview({ url, mode = "idle", className = "" }: AvatarPreviewProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const sceneRef = useRef<Scene | null>(null);
  const cameraRef = useRef<PerspectiveCamera | null>(null);
  const mixerRef = useRef<AnimationMixer | null>(null);
  const modelRef = useRef<any>(null);
  const gltfClipsRef = useRef<AnimationClip[]>([]);
  const loadTokenRef = useRef(0);
  const clockRef = useRef<Clock | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);

  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [statusMsg, setStatusMsg] = useState<string>("");

  const setLoading = (msg = "Loading…") => { setStatus("loading"); setStatusMsg(msg); };
  const setError = (msg = "Preview failed to load.") => { setStatus("error"); setStatusMsg(msg); };
  const setReady = () => { setStatus("ready"); setStatusMsg(""); };

  const { gltfLoader } = useMemo(() => {
    const gltf = new GLTFLoader();
    const draco = new DRACOLoader();
    draco.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");
    draco.setDecoderConfig({ type: "wasm" });
    draco.preload();
    gltf.setDRACOLoader(draco);
    gltf.setCrossOrigin("anonymous");
    return { gltfLoader: gltf };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const wrap = wrapRef.current!;
    const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.max(1, window.devicePixelRatio || 1));
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.outputColorSpace = SRGBColorSpace;
    rendererRef.current = renderer;

    const scene = new Scene();
    const camera = new PerspectiveCamera(50, 1, 0.1, 1000);

    scene.add(new AmbientLight(0xffffff, 1.05));
    const key = new DirectionalLight(0xffffff, 1.35); key.position.set(5, 6, 6); scene.add(key);
    const fill = new DirectionalLight(0xffffff, 0.9);  fill.position.set(-6, 6, 2); scene.add(fill);
    const hemi = new HemisphereLight(0xffffff, 0x444444, 0.7); hemi.position.set(0, 10, 0); scene.add(hemi);

    const resize = () => {
      const r = wrap.getBoundingClientRect();
      const w = Math.max(1, Math.floor(r.width));
      const h = Math.max(1, Math.floor(r.height));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    roRef.current = new ResizeObserver(resize);
    roRef.current.observe(wrap);
    resize();

    const clock = new Clock();
    clockRef.current = clock;

    renderer.setAnimationLoop(() => {
      const dt = clock.getDelta();
      mixerRef.current?.update(dt);
      renderer.render(scene, camera);
    });

    sceneRef.current = scene;
    cameraRef.current = camera;

    return () => {
      renderer.setAnimationLoop(null);
      roRef.current?.disconnect();
      disposeObject3D(modelRef.current);
      renderer.dispose();
      scene.clear();
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      mixerRef.current = null;
      gltfClipsRef.current = [];
    };
  }, []);

  const frameToObject = useCallback((obj: any) => {
    const camera = cameraRef.current!;
    const box = new Box3().setFromObject(obj);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    obj.position.sub(center);

    const maxSize = Math.max(size.x, size.y, size.z);
    const halfFov = MathUtils.degToRad(camera.fov * 0.5);
    const distance = (maxSize / 2) / Math.tan(halfFov);

    camera.near = Math.max(0.1, distance / 100);
    camera.far  = distance * 100;
    camera.position.set(0, size.y * 0.12, distance * 0.95);
    camera.lookAt(0, size.y * 0.12, 0);
    camera.updateProjectionMatrix();
  }, []);

  const getIdle = useCallback(
    () => parseClip(window.standingAnimation1) || gltfClipsRef.current[0] || null, []
  );
  const getResp = useCallback(
    () => parseClip(window.responseAnimation1) || getIdle(), [getIdle]
  );

  useEffect(() => {
    const scene = sceneRef.current, camera = cameraRef.current;
    if (!scene || !camera) return;

    disposeObject3D(modelRef.current);
    modelRef.current = null;
    mixerRef.current = null;
    gltfClipsRef.current = [];

    if (!url?.trim()) { setStatus("idle"); setStatusMsg("No avatar URL"); return; }

    setLoading();
    const myToken = ++loadTokenRef.current;

    gltfLoader.load(
      url,
      (gltf) => {
        if (myToken !== loadTokenRef.current) return;
        const model = gltf.scene;
        scene.add(model);
        model.scale.set(1, 1, 1);
        modelRef.current = model;
        gltfClipsRef.current = (gltf.animations || []) as AnimationClip[];

        frameToObject(model);

        const idle = getIdle();
        if (idle) {
          const mixer = new AnimationMixer(model); mixerRef.current = mixer;
          mixer.stopAllAction();
          mixer.clipAction(idle).reset().setLoop(LoopRepeat, Infinity).play();
        }
        setReady();
      },
      undefined,
      () => { if (myToken === loadTokenRef.current) setError(); }
    );
  }, [url, gltfLoader, frameToObject, getIdle]);

  useEffect(() => {
    if (!modelRef.current) return;
    if (!mixerRef.current) mixerRef.current = new AnimationMixer(modelRef.current);
    const clip = mode === "response" ? getResp() : getIdle();
    if (!clip) return;
    const action = mixerRef.current.clipAction(clip);
    mixerRef.current.stopAllAction();
    action.reset().setLoop(LoopRepeat, Infinity).play();
  }, [mode, getIdle, getResp]);

  return (
    <div className={className}>
      <div ref={wrapRef} className="relative aspect-[4/3] bg-gradient-to-b from-gray-50 to-white border rounded-xl overflow-hidden">
        <canvas ref={canvasRef} className="w-full h-full" />
        {status !== "ready" && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-sm" aria-live="polite" aria-busy={status === "loading"}>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/70 backdrop-blur border border-gray-200">
              {status === "loading" ? (
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
              ) : null}
              <span>{statusMsg || (status === "idle" ? "No avatar URL" : "Preview failed to load.")}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default AvatarPreview;
