// 화면(DOM)용 아이 자세 그림: 종목 아틀라스(art/<kid>/<동작>.*)에서 한 프레임 또는 되풀이 동작을 작은 <canvas> 로.
// 시상식(종목별 자세)·폐회식(응원)·경기장(종목 고르기 뒤) 등 체육복 그림이 필요한 곳에 쓴다(허브 다른 게임 그림을 쓰지 않게).
import { loadImage } from "./sprites.js?v=1";

const ART = new URL("../../art/", import.meta.url).href;
// 아틀라스 판(각 종목 view 가 읽는 ?v= 와 같게 — 같은 주소라 다시 내려받지 않는다)
const VER = { jump: 3, shoot: 2, "shoot-idle": 2, "shoot-cheer": 2 };
const cache = new Map();

export function loadAtlas(kidId, name) {
  const key = kidId + "/" + name;
  if (!cache.has(key)) {
    const v = VER[name] || 1;
    cache.set(key, fetch(ART + `${kidId}/${name}.json?v=${v}`).then(r => (r.ok ? r.json() : null)).then(async meta => {
      if (!meta || !Array.isArray(meta.frames) || !meta.frames.length) return null;
      const img = await loadImage(ART + `${kidId}/${name}.webp?v=${v}`);
      return img ? { ...meta, img } : null;
    }).catch(() => null));
  }
  return cache.get(key);
}

// 종목별 시상 자세: [동작, 프레임("loop" = 되풀이)] — 1등은 되풀이, 나머지는 한 프레임
export const CEREMONY_POSE = Object.freeze({
  jumprope: { win: ["jump", "loop"], still: ["jump", 32] },
  baseball: { win: ["batidle", "loop"], still: ["swing", "finish"] },
  hula: { win: ["hula", "loop"], still: ["hula", "front"] },
  soccer: { win: ["cheer", "loop"], still: ["cheer", 0] },
  basketball: { win: ["shoot-cheer", "loop"], still: ["shoot-idle", 0] },
});
export const CHEER_POSE = Object.freeze(["cheer", "loop"]);
export const CALM_POSE = Object.freeze(["shoot-cheer", 0]);

// kidId, [name, frame], { h: 아이 키(px), speed }
export function poseCanvas(kidId, pose, { h = 150, speed = 1, cls = "" } = {}) {
  const [name, frame] = pose;
  const cv = document.createElement("canvas"); cv.className = "pose-cv " + cls;
  cv.style.height = h + "px"; cv.style.width = Math.round(h * 0.62) + "px";
  let raf = 0, seen = false, waited = 0;
  loadAtlas(kidId, name).then(at => {
    if (!at) { cv.classList.add("none"); return; }
    const n = at.frames.length, H = at.height || 390, ax = at.anchor ? at.anchor.x : at.frames[0].w / 2, ay = at.anchor ? at.anchor.y : at.frames[0].h;
    // 모든 프레임이 들어가는 상자(발 = 기준점)
    let l = 0, r = 0, t = 0, b = 0;
    for (const f of at.frames) { l = Math.min(l, -ax); r = Math.max(r, f.w - ax); t = Math.min(t, -ay); b = Math.max(b, f.h - ay); }
    t = Math.min(t, -H * 1.04); b = Math.max(b, 2);
    const bw = r - l, bh = b - t, sc = h / H;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(bw * sc * dpr); cv.height = Math.round(bh * sc * dpr);
    cv.style.width = Math.round(bw * sc) + "px"; cv.style.height = Math.round(bh * sc) + "px";
    const g = cv.getContext("2d");
    const ev = at.events || {};
    const fixed = frame === "loop" ? null : typeof frame === "string" ? (ev[frame] != null ? ev[frame] : 0) : Math.max(0, Math.min(n - 1, frame | 0));
    const draw = i => {
      const f = at.frames[i];
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
      g.setTransform(sc * dpr, 0, 0, sc * dpr, -l * sc * dpr, -t * sc * dpr);
      g.drawImage(at.img, f.x, f.y, f.w, f.h, -ax, -ay, f.w, f.h);
    };
    if (fixed != null) { draw(fixed); return; }
    const t0 = performance.now(), fps = (at.fps || 24) * speed;
    const tick = now => {
      if (cv.isConnected) seen = true; else if (seen || ++waited > 300) { cancelAnimationFrame(raf); return; }
      let k = Math.max(0, Math.floor((now - t0) / 1000 * fps));
      if (at.pingpong && n > 2) { const p = k % (2 * n - 2); k = p < n ? p : 2 * n - 2 - p; } else k %= n;
      draw(k);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  });
  return cv;
}
