// 앞 카메라 + MediaPipe Pose(Tasks Vision) — 종목 여럿이 같이 쓰는 몸짓 입력.
// 영상은 이 기기 안에서만 처리한다: <video> 에 띄워 관절 좌표만 뽑고, 녹화·저장·전송하지 않는다(서버로 가는 것은
// 처음 한 번 받는 프로그램·모델 파일뿐). 카메라가 없거나 거절·오프라인·읽기 실패면 PoseError 를 던지고, 종목은 손가락으로 대신한다.
//
// 쓰는 법(셸이 대신 해 주고 종목은 ctx.camera 로 받는다 — EVENTS.md):
//   const pose = await openPose({ onStatus });          // 카메라 켜기 + 모델 읽기
//   const base = await pose.calibrate({ onProgress });  // "가만히 서 있어요"
//   const off = pose.on("jump", ev => ...);             // jump | hipCircle | swing | kick | throw | frame
//   pose.stop();                                        // 카메라 끄기(꼭 부른다)
import { bodyFrame, createCalibrator, DETECTORS } from "./gestures.js?v=1";

export const TASKS_VISION_VERSION = "0.10.14";
export const BUNDLE_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VISION_VERSION}/vision_bundle.mjs`;
export const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VISION_VERSION}/wasm`;
export const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
export const PRIVACY_LINE = "카메라 영상은 이 기기 안에서만 몸짓을 읽는 데 쓰고, 저장하거나 보내지 않아요.";

export class PoseError extends Error {
  constructor(code, message) { super(message || code); this.code = code; }   // code: unsupported | denied | offline | load | nobody
}

export function cameraSupported() {
  return typeof navigator !== "undefined" && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) && typeof window !== "undefined" && "WebAssembly" in window;
}

const withTimeout = (p, ms, code) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new PoseError(code, code + " timeout")), ms))]);
let landmarkerPromise = null;    // 모델은 한 번만 읽어 두고 다시 쓴다(카메라만 껐다 켠다)

async function loadLandmarker() {
  if (landmarkerPromise) return landmarkerPromise;
  landmarkerPromise = (async () => {
    let vision;
    try { vision = await withTimeout(import(/* @vite-ignore */ BUNDLE_URL), 15000, "offline"); }
    catch (e) { throw e instanceof PoseError ? e : new PoseError("offline", String(e && e.message || e)); }
    const files = await withTimeout(vision.FilesetResolver.forVisionTasks(WASM_URL), 15000, "load");
    const make = delegate => vision.PoseLandmarker.createFromOptions(files, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate }, runningMode: "VIDEO", numPoses: 1,
      minPoseDetectionConfidence: 0.5, minPosePresenceConfidence: 0.5, minTrackingConfidence: 0.5,
    });
    try { return await withTimeout(make("GPU"), 20000, "load"); }
    catch (_) { return await withTimeout(make("CPU"), 20000, "load"); }
  })();
  landmarkerPromise.catch(() => { landmarkerPromise = null; });
  return landmarkerPromise;
}

// opts: { onStatus(text), video(이미 있는 <video> 를 쓸 때), fps(기본 30) }
export async function openPose(opts = {}) {
  const status = t => { try { opts.onStatus && opts.onStatus(t); } catch (_) {} };
  if (!cameraSupported()) throw new PoseError("unsupported");
  if (typeof navigator !== "undefined" && navigator.onLine === false) throw new PoseError("offline");
  status("카메라를 켜는 중…");
  let stream;
  try {
    stream = await withTimeout(navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } } }), 12000, "denied");
  } catch (e) { throw e instanceof PoseError ? e : new PoseError(e && e.name === "NotAllowedError" ? "denied" : "unsupported", String(e && e.message || e)); }
  const video = opts.video || document.createElement("video");
  video.setAttribute("playsinline", ""); video.muted = true; video.autoplay = true; video.srcObject = stream;
  const stopTracks = () => { try { stream.getTracks().forEach(t => t.stop()); } catch (_) {} video.srcObject = null; };
  try { await video.play(); } catch (_) {}
  status("몸짓 읽는 프로그램을 받는 중…");
  let lm;
  try { lm = await loadLandmarker(); } catch (e) { stopTracks(); throw e instanceof PoseError ? e : new PoseError("load", String(e)); }

  const listeners = new Map();      // type → Set(fn)
  const detectors = new Map();      // type → detector
  let baseline = null, running = true, lastVideoTime = -1, lastSeen = 0, frame = null, raf = 0, calib = null;
  const minGap = 1000 / (opts.fps || 30);
  let lastRun = 0;

  function emit(type, ev) { const set = listeners.get(type); if (set) for (const fn of [...set]) { try { fn(ev); } catch (e) { console.error(e); } } }
  function ensureDetector(type) {
    if (!baseline || detectors.has(type) || !DETECTORS[type]) return;
    detectors.set(type, DETECTORS[type](baseline));
  }
  function tick(now) {
    if (!running) return;
    raf = requestAnimationFrame(tick);
    if (now - lastRun < minGap || video.readyState < 2 || video.currentTime === lastVideoTime) return;
    lastRun = now; lastVideoTime = video.currentTime;
    let res;
    try { res = lm.detectForVideo(video, now); } catch (e) { return; }
    const lms = res && res.landmarks && res.landmarks[0];
    // 화면은 거울처럼 보여 주므로 x 를 뒤집어 "아이가 보는 방향"으로 맞춘다
    const mirrored = lms ? lms.map(p => ({ x: 1 - p.x, y: p.y, z: p.z, visibility: p.visibility })) : null;
    frame = bodyFrame(mirrored);
    if (frame.ok) lastSeen = now;
    emit("frame", { frame, landmarks: mirrored, t: now });
    if (calib) calib(frame, now);
    for (const [type, d] of detectors) { const ev = d.push(frame, now); if (ev) emit(type, ev); }
  }
  raf = requestAnimationFrame(tick);

  return {
    video,
    get baseline() { return baseline; },
    get frame() { return frame; },
    // 몸이 안 보인 지 몇 ms
    lostFor(now = performance.now()) { return lastSeen ? now - lastSeen : Infinity; },
    // "가만히 서 있어요": timeoutMs 안에 끝나지 않으면 PoseError("nobody")
    calibrate({ onProgress, timeoutMs = 15000, needMs = 1200 } = {}) {
      detectors.clear(); baseline = null;
      const c = createCalibrator({ needMs });
      return new Promise((resolve, reject) => {
        const to = setTimeout(() => { calib = null; reject(new PoseError("nobody")); }, timeoutMs);
        calib = (f, t) => {
          const r = c.push(f, t);
          try { onProgress && onProgress(r); } catch (_) {}
          if (r.done) {
            clearTimeout(to); calib = null; baseline = r.baseline;
            for (const type of listeners.keys()) ensureDetector(type);
            resolve(baseline);
          }
        };
      });
    },
    on(type, fn) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(fn); ensureDetector(type);
      return () => { const s = listeners.get(type); if (s) s.delete(fn); };
    },
    stop() { running = false; cancelAnimationFrame(raf); listeners.clear(); detectors.clear(); calib = null; stopTracks(); },
  };
}
