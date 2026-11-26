// 아이 캐릭터 그림(2.5D): 동작별 프레임 아틀라스를 읽어 재생한다. 아틀라스가 아직 없으면 허브 3D 아이 그림 한 장 +
// 코드 늘이기·찌그러뜨리기(squash/stretch)로 대신한다. 어느 쪽이든 같은 Actor API 라서 그림이 들어오면 저절로 바뀐다.
// 그림 약속은 sports/ART-SPEC.md. 무엇이 있는지는 art/manifest.json 이 알려 준다(없는 파일은 아예 요청하지 않는다 → 404 없음).
import { kidById } from "../kids.js?v=1";

const BASE = new URL("../../art/", import.meta.url).href;
let manifestP = null;
export function loadManifest() {
  if (!manifestP) manifestP = fetch(BASE + "manifest.json?v=1").then(r => (r.ok ? r.json() : {})).catch(() => ({}));
  return manifestP;
}
const imgCache = new Map();
export function loadImage(url) {
  if (imgCache.has(url)) return imgCache.get(url);
  const p = new Promise(res => { const im = new Image(); im.decoding = "async"; im.onload = () => res(im); im.onerror = () => res(null); im.src = url; });
  imgCache.set(url, p); return p;
}
function syncImage(url) {   // 자리표시 그림: 바로 그릴 수 있게 Image 를 돌려준다(읽는 중엔 complete=false)
  const k = "s:" + url; if (imgCache.has(k)) return imgCache.get(k);
  const im = new Image(); im.decoding = "async"; im.src = url; imgCache.set(k, im); return im;
}

// 동작 → 자리표시 그림 자세(kid 서 있기 / cheer 만세 점프 / run 달리기)
const PLACEHOLDER_POSE = { idle: "kid", cheer: "cheer", sad: "kid", jump: "kid", run: "run", swing: "kid", spin: "kid", kick: "run", shoot: "cheer", throw: "kid" };

// 한 아이의 동작 아틀라스 묶음. actions = 이 종목에서 쓸 동작 이름들.
export async function loadKidSprites(kidId, actions) {
  const k = kidById(kidId), man = await loadManifest();
  const have = (man.kids && man.kids[kidId]) || [];
  const out = { kidId, atlases: {}, placeholder: {} };
  for (const a of actions) {
    out.placeholder[a] = syncImage(BASE + `${PLACEHOLDER_POSE[a] || "kid"}${k.art}.webp?v=1`);
    if (!have.includes(a)) continue;
    try {
      const v = man.version || 1;
      const meta = await fetch(BASE + `${kidId}/${a}.json?v=${v}`).then(r => (r.ok ? r.json() : null));
      const img = meta && await loadImage(BASE + `${kidId}/${a}.webp?v=${v}`);
      if (meta && img && Array.isArray(meta.frames) && meta.frames.length) out.atlases[a] = { ...meta, img };
    } catch (_) {}
  }
  for (const pose of ["kid", "cheer", "run"]) syncImage(BASE + `${pose}${k.art}.webp?v=1`);
  return out;
}

// Actor: 화면 한 아이. world 단위로 그린다(발 = (x, y), 키 = h).
//   play(action, { loop, restart, speed })  시간으로 재생
//   scrub(action, u)                         0~1 진행도로 프레임 고르기(점프 높이·스윙 각도에 딱 맞추기)
//   update(dt) / draw(g, x, y, h, { flip, alpha, squash, shadow, tilt })
//   on("contact", fn)  아틀라스 events.contact 프레임을 지날 때(자리표시는 진행도 0.5)
export function createActor(sprites) {
  let action = "idle", t = 0, u = null, loop = true, speed = 1, lastFrame = -1;
  const handlers = {};
  let bounceT = 0;     // 자리표시용: 동작이 바뀐 순간 통 튀기
  // 그 동작 아틀라스가 없으면: 같은 아이의 다른 진짜 그림 한 프레임(옷차림이 같게) → 그것도 없으면 자리표시 그림
  const anyAtlas = () => { for (const k in sprites.atlases) return sprites.atlases[k]; return null; };
  const realFor = a => sprites.atlases[a] || null;
  function frameCount(a) { const at = realFor(a); return at ? at.frames.length : 1; }
  function frameIndex() {
    const at = realFor(action);
    if (!at) { const fb = anyAtlas(); return fb && fb.events && fb.events.idle != null ? fb.events.idle : 0; }
    const n = at.frames.length;
    if (u != null) return Math.min(n - 1, Math.max(0, Math.floor(u * n)));
    const f = Math.floor(t * (at.fps || 12) * speed);
    return (at.loop !== false && loop) ? f % n : Math.min(n - 1, f);
  }
  function fire(i) {
    const at = sprites.atlases[action], ev = at && at.events;
    if (!ev) return;
    for (const name in ev) if (ev[name] === i && handlers[name]) handlers[name].forEach(fn => fn(action));
  }
  return {
    get action() { return action; },
    hasAtlas: a => !!sprites.atlases[a || action],
    atlas: a => sprites.atlases[a || action] || null,
    // 정확한 프레임 번호로(줄넘기: 줄 각도 → 프레임)
    scrubFrame(a, idx) { const n = frameCount(a); this.scrub(a, (((idx % n) + n) % n + 0.5) / n); },
    play(a, o = {}) {
      if (a === action && !o.restart && u == null) return;
      action = a; t = 0; u = null; loop = o.loop !== false; speed = o.speed || 1; lastFrame = -1; bounceT = 0.18;
    },
    scrub(a, p) {
      if (a !== action) { action = a; t = 0; lastFrame = -1; }
      const prev = u; u = Math.max(0, Math.min(1, p));
      if (!sprites.atlases[a] && handlers.contact && prev != null && prev < 0.5 && u >= 0.5) handlers.contact.forEach(fn => fn(a));
    },
    update(dt) {
      t += dt; bounceT = Math.max(0, bounceT - dt);
      const i = frameIndex();
      if (i !== lastFrame) { if (lastFrame >= 0 || i === 0) fire(i); lastFrame = i; }
    },
    on(name, fn) { (handlers[name] = handlers[name] || []).push(fn); return () => { handlers[name] = handlers[name].filter(f => f !== fn); }; },
    // 그리기. o.squash = {x,y} 코드 늘이기(자리표시·진짜 그림 모두 적용; 진짜 그림은 작게 쓰는 편)
    draw(g, x, y, h, o = {}) {
      const own = realFor(action), at = own || anyAtlas();
      let sx = 1, sy = 1;
      if (o.squash) { sx *= o.squash.x || 1; sy *= o.squash.y || 1; }
      if (!own) {
        // 자리표시: 동작마다 코드로 살아 있게
        const k = performance.now() / 1000;
        if (action === "idle") { sy *= 1 + Math.sin(k * 3.2) * 0.018; sx *= 1 - Math.sin(k * 3.2) * 0.012; }
        if (action === "cheer") { const b = Math.abs(Math.sin(k * 7)); y -= b * h * 0.06; sy *= 1 + b * 0.04; }
        if (action === "sad") { sy *= 0.94; sx *= 1.03; }
        if (bounceT > 0) { const q = bounceT / 0.18; sy *= 1 - 0.08 * q; sx *= 1 + 0.06 * q; }
      }
      if (o.shadow !== false) {
        const lift = Math.max(0, (o.ground != null ? o.ground : y) - y);
        const s = Math.max(0.35, 1 - lift / (h * 1.4));
        const gy = o.ground != null ? o.ground : y;
        const grad = g.createRadialGradient(x, gy, 0, x, gy, h * 0.28 * s);
        grad.addColorStop(0, `rgba(20,40,20,${0.38 * s})`); grad.addColorStop(1, "rgba(20,40,20,0)");
        g.fillStyle = grad; g.beginPath(); g.ellipse(x, gy, h * 0.28 * s, h * 0.07 * s, 0, 0, Math.PI * 2); g.fill();
      }
      g.save();
      if (o.alpha != null) g.globalAlpha *= o.alpha;
      g.translate(x, y);
      if (o.tilt) g.rotate(o.tilt);
      if (action === "sad" && !own) g.rotate(-0.06);
      g.scale((o.flip ? -1 : 1) * sx, sy);
      if (at) {
        const f = at.frames[frameIndex()];
        const H = at.height || Math.max(...at.frames.map(fr => fr.h));
        const sc = h / H, ax = at.anchor ? at.anchor.x : f.w / 2, ay = at.anchor ? at.anchor.y : f.h;
        g.drawImage(at.img, f.x, f.y, f.w, f.h, -ax * sc, -ay * sc, f.w * sc, f.h * sc);
      } else {
        const im = sprites.placeholder[action] || sprites.placeholder.idle;
        if (im && im.complete && im.naturalWidth) {
          const w = h * im.naturalWidth / im.naturalHeight;
          g.drawImage(im, -w / 2, -h, w, h);
        } else {
          g.fillStyle = (kidById(sprites.kidId) || {}).color || "#888";
          g.beginPath(); g.arc(0, -h * 0.8, h * 0.17, 0, Math.PI * 2); g.fill(); g.fillRect(-h * 0.12, -h * 0.62, h * 0.24, h * 0.62);
        }
      }
      g.restore();
    },
    frameCount,
  };
}
