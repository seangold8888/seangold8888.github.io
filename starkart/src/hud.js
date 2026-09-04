// 별빛 카트 배틀 — HUD + 터치 조작. Owner: Agent PRESENTATION.
// 순수 헬퍼(formatTime, ordinalKo, minimapTransform ...)는 DOM 없이 Node에서 테스트 가능.
// createHud / createTouchControls 는 document 가 없으면 무해한 no-op 객체를 돌려준다.
import { RACE } from "./contracts.js";

export const HUD_PALETTE = Object.freeze({
  night: "#201a40",
  night2: "#2b2350",
  star: "#ffd93d",
  cream: "#fff6e6",
  silver: "#d9dff0",
  bronze: "#e8a05a",
  sky: "#7fd7ff",
  pink: "#ff8ac2",
  flame: "#ff8a3d",
});
export const HUD_FONT =
  '"Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", system-ui, -apple-system, sans-serif';
export const MINIMAP_SIZE = 150;

const TAU = Math.PI * 2;
const STYLE_ID = "sk-hud-style";

// ---------- 순수 헬퍼 ----------

function pad2(n) { return n < 10 ? "0" + n : String(n); }

/** ms → "mm:ss.t" (분은 99에서 포화, 음수/NaN은 0) */
export function formatTime(ms) {
  const t = Number.isFinite(ms) && ms > 0 ? ms : 0;
  const totalTenths = Math.floor(t / 100);
  const tenths = totalTenths % 10;
  const totalSec = Math.floor(totalTenths / 10);
  const s = totalSec % 60;
  const m = Math.min(99, Math.floor(totalSec / 60));
  return `${pad2(m)}:${pad2(s)}.${tenths}`;
}

/** 초 단위와 ms 단위가 섞여 들어와도 ms 로 통일. 10000 미만은 초로 본다(한 경주는 수만 ms). */
export function normalizeTimeMs(v) {
  if (!Number.isFinite(v) || v <= 0) return 0;
  return v < 10000 ? v * 1000 : v;
}

/** 1 → "1위", 그 외 잘못된 값 → "－위" */
export function ordinalKo(n) {
  return Number.isInteger(n) && n >= 1 ? `${n}위` : "－위";
}

export function rankColor(n) {
  switch (n) {
    case 1: return HUD_PALETTE.star;
    case 2: return HUD_PALETTE.silver;
    case 3: return HUD_PALETTE.bronze;
    default: return HUD_PALETTE.cream;
  }
}

export function speedFraction(speed, max = RACE.BOOST_SPEED) {
  const v = Math.abs(Number(speed) || 0) / (max || 1);
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** 0xf4b6c2 → "#f4b6c2", 문자열은 그대로 */
export function cssColor(c) {
  if (typeof c === "string") return c;
  if (Number.isFinite(c)) return "#" + ((c >>> 0) & 0xffffff).toString(16).padStart(6, "0");
  return HUD_PALETTE.cream;
}

export function resultTitle(rank) {
  if (rank === 1) return "🏆 1위! 별빛 챔피언!";
  if (rank === 2 || rank === 3) return `🎉 ${rank}위! 정말 잘했어!`;
  if (Number.isInteger(rank) && rank >= 1) return `${rank}위! 다음엔 더 빨리!`;
  return "경주 끝!";
}

export function manaStars(mana, max = RACE.MANA_MAX) {
  const m = Math.max(0, Math.min(max, Math.floor(Number(mana) || 0)));
  return "★".repeat(m) + "☆".repeat(max - m);
}

/**
 * 트랙 점들({x,z})을 size×size 캔버스에 맞추는 변환. +Z(앞) 가 위쪽.
 * 반환: { scale, toX(x), toY(z) } — 모든 점이 [pad, size-pad] 안에 들어온다.
 */
export function minimapTransform(points, size = MINIMAP_SIZE, pad = 12) {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const p of points || []) {
    if (!p) continue;
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.z < minZ) minZ = p.z;
    if (p.z > maxZ) maxZ = p.z;
  }
  if (!Number.isFinite(minX)) { minX = maxX = minZ = maxZ = 0; }
  const span = Math.max(maxX - minX, maxZ - minZ, 1e-6);
  const scale = (size - pad * 2) / span;
  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;
  const half = size / 2;
  return {
    scale,
    toX(x) { return half + (x - cx) * scale; },
    toY(z) { return half - (z - cz) * scale; },
  };
}

// ---------- 스타일 ----------

const CSS = `
.sk-hud{position:absolute;inset:0;pointer-events:none;font-family:${HUD_FONT};color:${HUD_PALETTE.cream};user-select:none;-webkit-user-select:none;overflow:hidden;z-index:10}
.sk-hud [hidden],.sk-touch [hidden]{display:none!important}
.sk-hud *,.sk-touch *{box-sizing:border-box}
.sk-top{position:absolute;left:0;right:0;top:0;display:grid;grid-template-columns:1fr auto 1fr;align-items:start;padding:calc(10px + env(safe-area-inset-top)) 16px 0}
.sk-lap,.sk-timer{font-size:22px;font-weight:800;background:rgba(32,26,64,.72);border-radius:14px;padding:8px 14px;border:2px solid rgba(255,246,230,.25);text-shadow:0 2px 0 ${HUD_PALETTE.night};white-space:nowrap}
.sk-lap{justify-self:start}
.sk-timer{justify-self:end;font-variant-numeric:tabular-nums}
.sk-rank{justify-self:center;font-size:56px;line-height:1;font-weight:900;color:${HUD_PALETTE.star};text-shadow:0 3px 0 ${HUD_PALETTE.night},0 0 18px rgba(32,26,64,.9);transition:color .2s,transform .15s}
.sk-rank.sk-bump{animation:sk-bump .3s ease}
@keyframes sk-bump{0%{transform:scale(1)}40%{transform:scale(1.25)}100%{transform:scale(1)}}
.sk-mute{position:absolute;top:calc(60px + env(safe-area-inset-top));right:16px;font-size:14px;font-weight:800;background:rgba(32,26,64,.72);border-radius:10px;padding:4px 10px;color:${HUD_PALETTE.silver}}
.sk-speedwrap{position:absolute;left:16px;bottom:calc(136px + env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:6px}
.sk-mana{font-size:20px;color:${HUD_PALETTE.star};letter-spacing:2px;text-shadow:0 2px 0 ${HUD_PALETTE.night};min-height:24px;line-height:24px}
.sk-speed{width:180px;height:20px;border-radius:12px;background:rgba(32,26,64,.75);border:2px solid rgba(255,246,230,.35);overflow:hidden;position:relative}
.sk-speed-fill{position:absolute;inset:0;transform-origin:left center;transform:scaleX(0);background:linear-gradient(90deg,${HUD_PALETTE.star},${HUD_PALETTE.flame});border-radius:12px;transition:transform .08s linear}
.sk-speedwrap.sk-ready .sk-speed{border-color:${HUD_PALETTE.sky};animation:sk-glow .6s ease-in-out infinite alternate}
.sk-speedwrap.sk-ready .sk-speed-fill{background:linear-gradient(90deg,${HUD_PALETTE.sky},${HUD_PALETTE.cream})}
.sk-speed-label{font-size:15px;font-weight:900;color:${HUD_PALETTE.sky};text-shadow:0 2px 0 ${HUD_PALETTE.night};opacity:0;transition:opacity .15s;min-height:18px}
.sk-speedwrap.sk-ready .sk-speed-label{opacity:1}
@keyframes sk-glow{from{box-shadow:0 0 8px 2px rgba(127,215,255,.5)}to{box-shadow:0 0 18px 6px rgba(127,215,255,.95)}}
.sk-minimap{position:absolute;right:16px;bottom:calc(136px + env(safe-area-inset-bottom));width:${MINIMAP_SIZE}px;height:${MINIMAP_SIZE}px;border-radius:18px;background:rgba(32,26,64,.6);border:2px solid rgba(255,246,230,.3)}
.sk-hand{position:absolute;left:50%;bottom:calc(12px + env(safe-area-inset-bottom));transform:translateX(-50%);display:flex;gap:10px;align-items:flex-end;pointer-events:auto}
.sk-countdown{position:absolute;left:50%;top:38%;transform:translate(-50%,-50%);font-size:150px;font-weight:900;color:${HUD_PALETTE.star};text-shadow:0 6px 0 ${HUD_PALETTE.night},0 0 30px rgba(255,217,61,.6);line-height:1;white-space:nowrap}
.sk-countdown.sk-go{font-size:120px;color:${HUD_PALETTE.cream};text-shadow:0 6px 0 ${HUD_PALETTE.night},0 0 30px rgba(255,246,230,.7)}
.sk-countdown.sk-pop{animation:sk-pop .95s cubic-bezier(.2,1.4,.4,1) both}
@keyframes sk-pop{0%{transform:translate(-50%,-50%) scale(.2);opacity:0}25%{transform:translate(-50%,-50%) scale(1.15);opacity:1}70%{transform:translate(-50%,-50%) scale(1);opacity:1}100%{transform:translate(-50%,-50%) scale(1.35);opacity:0}}
.sk-toast{position:absolute;left:50%;top:22%;transform:translateX(-50%);font-size:30px;font-weight:900;background:rgba(32,26,64,.85);border:3px solid ${HUD_PALETTE.star};border-radius:20px;padding:10px 22px;white-space:nowrap;max-width:90vw;overflow:hidden;text-overflow:ellipsis}
.sk-toast.sk-in{animation:sk-toast var(--sk-toast-ms,1400ms) ease both}
@keyframes sk-toast{0%{transform:translateX(-50%) translateY(-20px) scale(.8);opacity:0}15%{transform:translateX(-50%) translateY(0) scale(1.05);opacity:1}80%{opacity:1}100%{opacity:0}}
.sk-results{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(32,26,64,.82);pointer-events:auto}
.sk-results-card{background:${HUD_PALETTE.night2};border:4px solid ${HUD_PALETTE.star};border-radius:28px;padding:22px 28px;min-width:340px;max-width:92vw;max-height:92vh;overflow:auto;text-align:center;box-shadow:0 12px 40px rgba(0,0,0,.4)}
.sk-results-title{font-size:34px;font-weight:900;color:${HUD_PALETTE.star};margin:0 0 14px;text-shadow:0 3px 0 ${HUD_PALETTE.night}}
.sk-results-list{list-style:none;margin:0 0 18px;padding:0;display:flex;flex-direction:column;gap:6px}
.sk-results-list li{display:grid;grid-template-columns:58px 40px 1fr auto;align-items:center;gap:8px;font-size:22px;font-weight:800;padding:8px 12px;border-radius:14px;background:rgba(255,246,230,.06)}
.sk-results-list li.sk-me{background:rgba(255,217,61,.18);outline:2px solid ${HUD_PALETTE.star}}
.sk-r-rank{text-align:left}
.sk-r-name{text-align:left}
.sk-r-time{font-variant-numeric:tabular-nums;color:${HUD_PALETTE.silver}}
.sk-results-buttons{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
.sk-btn{min-width:170px;min-height:64px;font-family:inherit;font-size:24px;font-weight:900;border-radius:20px;border:0;cursor:pointer;padding:12px 22px;color:${HUD_PALETTE.night};background:${HUD_PALETTE.star};box-shadow:0 5px 0 #b8951a;touch-action:manipulation}
.sk-btn:active{transform:translateY(3px);box-shadow:0 2px 0 #b8951a}
.sk-btn.sk-btn-home{background:${HUD_PALETTE.cream};box-shadow:0 5px 0 #b9ad9e}
.sk-btn.sk-btn-home:active{box-shadow:0 2px 0 #b9ad9e}
.sk-touch{position:absolute;inset:0;pointer-events:none;touch-action:none;font-family:${HUD_FONT};user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;z-index:11}
.sk-pad,.sk-drift{position:absolute;bottom:calc(16px + env(safe-area-inset-bottom));width:104px;height:104px;border-radius:50%;pointer-events:auto;display:flex;align-items:center;justify-content:center;font-size:42px;font-weight:900;color:${HUD_PALETTE.cream};background:rgba(32,26,64,.6);border:3px solid rgba(255,246,230,.45);touch-action:none;transition:transform .06s,background .06s;text-shadow:0 2px 0 ${HUD_PALETTE.night}}
.sk-pad-left{left:16px}
.sk-pad-right{left:132px}
.sk-drift{right:16px;font-size:20px;line-height:1.1;text-align:center;background:rgba(255,138,194,.35);border-color:${HUD_PALETTE.pink}}
.sk-pad.sk-on,.sk-drift.sk-on{background:rgba(255,217,61,.55);border-color:${HUD_PALETTE.star};transform:scale(.94)}
@media (hover:hover) and (pointer:fine){.sk-touch{display:none}.sk-speedwrap,.sk-minimap{bottom:16px}}
@media (prefers-reduced-motion:reduce){.sk-hud *,.sk-touch *{animation:none!important;transition:none!important}.sk-countdown.sk-pop,.sk-toast.sk-in{opacity:1}}
`;

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = CSS;
  (document.head || document.documentElement).appendChild(style);
}

function restartAnim(node, cls) {
  node.classList.remove(cls);
  void node.offsetWidth; // reflow → 애니메이션 재시작
  node.classList.add(cls);
}

function setText(node, text, cache, key) {
  if (cache[key] === text) return;
  cache[key] = text;
  node.textContent = text;
}

function noop() {}

function noopHud() {
  return {
    el: null, handRoot: null,
    update: noop, showCountdown: noop, hideCountdown: noop,
    showResults: noop, hideResults: noop, showToast: noop,
    minimapUpdate: noop, setMuted: noop, destroy: noop,
  };
}

// ---------- createHud ----------

/**
 * createHud(rootEl) → HUD 객체.
 * update(raceState, playerVehicle, extra):
 *   raceState.time = 초 단위(경주 시작 후). extra = { driftBoostReady, mana, lap, rank, timeMs } (전부 선택).
 */
export function createHud(rootEl) {
  if (typeof document === "undefined" || !rootEl) return noopHud();
  injectStyle();

  const root = document.createElement("div");
  root.className = "sk-hud";
  root.innerHTML = `
    <div class="sk-top">
      <div class="sk-lap">1/${RACE.LAPS} 바퀴</div>
      <div class="sk-rank">－위</div>
      <div class="sk-timer">00:00.0</div>
    </div>
    <div class="sk-mute" hidden>🔇 소리 꺼짐</div>
    <div class="sk-speedwrap">
      <div class="sk-mana"></div>
      <div class="sk-speed"><div class="sk-speed-fill"></div></div>
      <div class="sk-speed-label">✨ 부스트 준비!</div>
    </div>
    <canvas class="sk-minimap" width="${MINIMAP_SIZE}" height="${MINIMAP_SIZE}"></canvas>
    <div class="sk-hand"></div>
    <div class="sk-countdown" hidden></div>
    <div class="sk-toast" hidden></div>
    <div class="sk-results" hidden>
      <div class="sk-results-card">
        <h2 class="sk-results-title">경주 끝!</h2>
        <ul class="sk-results-list"></ul>
        <div class="sk-results-buttons">
          <button type="button" class="sk-btn sk-btn-again">한 판 더</button>
          <button type="button" class="sk-btn sk-btn-home">모험 상자로</button>
        </div>
      </div>
    </div>`;
  rootEl.appendChild(root);

  const q = (sel) => root.querySelector(sel);
  const lapEl = q(".sk-lap");
  const rankEl = q(".sk-rank");
  const timerEl = q(".sk-timer");
  const muteEl = q(".sk-mute");
  const speedWrap = q(".sk-speedwrap");
  const manaEl = q(".sk-mana");
  const speedFill = q(".sk-speed-fill");
  const canvas = q(".sk-minimap");
  const handRoot = q(".sk-hand");
  const countdownEl = q(".sk-countdown");
  const toastEl = q(".sk-toast");
  const resultsEl = q(".sk-results");
  const resultsTitle = q(".sk-results-title");
  const resultsList = q(".sk-results-list");
  const againBtn = q(".sk-btn-again");
  const homeBtn = q(".sk-btn-home");

  const cache = { lap: "", rank: "", rankColor: "", timer: "", speed: -1, ready: null, mana: "" };
  let countdownTimer = 0;
  let toastTimer = 0;
  let onAgain = null;
  let onHome = null;
  againBtn.addEventListener("click", () => { if (typeof onAgain === "function") onAgain(); });
  homeBtn.addEventListener("click", () => { if (typeof onHome === "function") onHome(); });

  // ---- 미니맵 ----
  const dpr = Math.min(2, (typeof window !== "undefined" && window.devicePixelRatio) || 1);
  canvas.width = MINIMAP_SIZE * dpr;
  canvas.height = MINIMAP_SIZE * dpr;
  const ctx = canvas.getContext ? canvas.getContext("2d") : null;
  const mm = { trackId: null, pts: null, count: 0, startX: 0, startY: 0, tf: null };

  function buildMinimapPath(track) {
    let pts = null;
    if (track.curve && typeof track.curve.getPoints === "function") {
      pts = track.curve.getPoints(200);
    } else if (typeof track.sample === "function") {
      pts = [];
      for (let i = 0; i < 200; i++) pts.push(track.sample(i / 200).position);
    }
    mm.trackId = track.id;
    if (!pts || !pts.length) { mm.pts = null; mm.count = 0; return; }
    const tf = minimapTransform(pts, MINIMAP_SIZE, 14);
    const arr = new Float32Array(pts.length * 2);
    for (let i = 0; i < pts.length; i++) {
      arr[i * 2] = tf.toX(pts[i].x);
      arr[i * 2 + 1] = tf.toY(pts[i].z);
    }
    mm.pts = arr;
    mm.count = pts.length;
    mm.tf = tf;
    mm.startX = arr[0];
    mm.startY = arr[1];
  }

  function drawStar(cx, cy, r, fill, stroke) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const rad = i % 2 === 0 ? r : r * 0.45;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const x = cx + Math.cos(a) * rad;
      const y = cy + Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 3; ctx.stroke(); }
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function minimapUpdate(track, vehicles) {
    if (!ctx || !track) return;
    if (mm.trackId !== track.id || !mm.pts) buildMinimapPath(track);
    const S = MINIMAP_SIZE;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, S, S);
    if (!mm.pts) return;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    for (let i = 0; i < mm.count; i++) {
      const x = mm.pts[i * 2], y = mm.pts[i * 2 + 1];
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = "rgba(255,246,230,.9)";
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.strokeStyle = "#3a3070";
    ctx.lineWidth = 3.5;
    ctx.stroke();
    // 출발선
    ctx.fillStyle = HUD_PALETTE.cream;
    ctx.beginPath();
    ctx.arc(mm.startX, mm.startY, 3.2, 0, TAU);
    ctx.fill();
    if (!vehicles || !mm.tf) return;
    let player = null;
    for (let i = 0; i < vehicles.length; i++) {
      const v = vehicles[i];
      if (!v || !v.state) continue;
      if (v.isPlayer) { player = v; continue; }
      const x = mm.tf.toX(v.state.x), y = mm.tf.toY(v.state.z);
      ctx.beginPath();
      ctx.arc(x, y, 4.5, 0, TAU);
      ctx.fillStyle = cssColor(v.spec && v.spec.color);
      ctx.fill();
      ctx.strokeStyle = HUD_PALETTE.night;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    if (player) {
      drawStar(mm.tf.toX(player.state.x), mm.tf.toY(player.state.z), 8, HUD_PALETTE.star, HUD_PALETTE.night);
    }
  }

  // ---- 프레임 업데이트 ----
  function update(raceState, playerVehicle, extra) {
    extra = extra || {};
    const st = (playerVehicle && playerVehicle.state) || {};
    const track = raceState && raceState.track;
    const laps = (track && track.laps) || RACE.LAPS;

    const lapRaw = extra.lap != null ? extra.lap : st.lap != null ? st.lap : 1;
    const lap = Math.max(1, Math.min(laps, Math.floor(lapRaw) || 1));
    setText(lapEl, `${lap}/${laps} 바퀴`, cache, "lap");

    const rank = extra.rank != null ? extra.rank : st.rank;
    const rankText = ordinalKo(rank);
    if (cache.rank !== rankText) {
      cache.rank = rankText;
      rankEl.textContent = rankText;
      restartAnim(rankEl, "sk-bump");
    }
    const rc = rankColor(rank);
    if (cache.rankColor !== rc) { cache.rankColor = rc; rankEl.style.color = rc; }

    const timeMs = extra.timeMs != null ? extra.timeMs : ((raceState && raceState.time) || 0) * 1000;
    setText(timerEl, formatTime(timeMs), cache, "timer");

    const frac = speedFraction(st.speed);
    if (Math.abs(frac - cache.speed) > 0.005) {
      cache.speed = frac;
      speedFill.style.transform = `scaleX(${frac.toFixed(3)})`;
    }
    const ready = !!extra.driftBoostReady || !!(st.drifting && st.driftCharge >= 0.5);
    if (cache.ready !== ready) { cache.ready = ready; speedWrap.classList.toggle("sk-ready", ready); }

    if (extra.mana != null) setText(manaEl, manaStars(extra.mana), cache, "mana");

    if (track && raceState.vehicles) minimapUpdate(track, raceState.vehicles);
  }

  // ---- 카운트다운 ----
  function hideCountdown() {
    clearTimeout(countdownTimer);
    countdownTimer = 0;
    countdownEl.hidden = true;
    countdownEl.classList.remove("sk-pop");
  }
  function showCountdown(n) {
    clearTimeout(countdownTimer);
    const go = !(n > 0);
    countdownEl.textContent = go ? "출발!" : String(n);
    countdownEl.classList.toggle("sk-go", go);
    countdownEl.hidden = false;
    restartAnim(countdownEl, "sk-pop");
    countdownTimer = setTimeout(hideCountdown, go ? 900 : 950);
  }

  // ---- 결과 ----
  function hideResults() { resultsEl.hidden = true; }
  function showResults(rankings, again, home) {
    onAgain = again;
    onHome = home;
    const list = Array.isArray(rankings) ? rankings : [];
    resultsList.textContent = "";
    let playerRank = null;
    list.forEach((r, i) => {
      const rank = Number.isInteger(r && r.rank) ? r.rank : i + 1;
      const li = document.createElement("li");
      if (r && r.isPlayer) { li.classList.add("sk-me"); playerRank = rank; }
      const rankSpan = document.createElement("span");
      rankSpan.className = "sk-r-rank";
      rankSpan.textContent = ordinalKo(rank);
      rankSpan.style.color = rankColor(rank);
      const emoji = document.createElement("span");
      emoji.className = "sk-r-emoji";
      emoji.textContent = (r && r.emoji) || "🏎️";
      const name = document.createElement("span");
      name.className = "sk-r-name";
      name.textContent = (r && r.name) || "?";
      const time = document.createElement("span");
      time.className = "sk-r-time";
      const ms = normalizeTimeMs(r && (r.timeMs != null ? r.timeMs : r.time));
      time.textContent = ms > 0 ? formatTime(ms) : "－";
      li.append(rankSpan, emoji, name, time);
      resultsList.appendChild(li);
    });
    resultsTitle.textContent = resultTitle(playerRank);
    resultsEl.hidden = false;
  }

  // ---- 토스트 ----
  function showToast(text, ms) {
    const dur = Number.isFinite(ms) && ms > 0 ? ms : 1400;
    clearTimeout(toastTimer);
    toastEl.textContent = String(text == null ? "" : text);
    toastEl.style.setProperty("--sk-toast-ms", `${dur}ms`);
    toastEl.hidden = false;
    restartAnim(toastEl, "sk-in");
    toastTimer = setTimeout(() => { toastEl.hidden = true; toastEl.classList.remove("sk-in"); }, dur);
  }

  function setMuted(muted) { muteEl.hidden = !muted; }

  function destroy() {
    clearTimeout(countdownTimer);
    clearTimeout(toastTimer);
    if (root.parentNode) root.parentNode.removeChild(root);
  }

  return {
    el: root, handRoot,
    update, showCountdown, hideCountdown,
    showResults, hideResults, showToast,
    minimapUpdate, setMuted, destroy,
  };
}

// ---------- 터치 조작 ----------

/**
 * createTouchControls(rootEl, onInput) → { el, state, destroy }
 * onInput({ steer:-1|0|1, drift:bool, hop:bool }) 는 입력이 바뀔 때마다 호출. hop 은 드리프트 버튼을
 * 누른 그 호출에서만 true. 마우스+hover 환경(데스크톱)에서는 CSS 로 숨겨진다.
 */
export function createTouchControls(rootEl, onInput) {
  const state = { steer: 0, drift: false, hop: false };
  if (typeof document === "undefined" || !rootEl) return { el: null, state, destroy: noop };
  injectStyle();

  const wrap = document.createElement("div");
  wrap.className = "sk-touch";
  wrap.innerHTML = `
    <div class="sk-pad sk-pad-left" data-role="left" aria-label="왼쪽">◀</div>
    <div class="sk-pad sk-pad-right" data-role="right" aria-label="오른쪽">▶</div>
    <div class="sk-drift" data-role="drift" aria-label="드리프트">드리<br>프트</div>`;
  rootEl.appendChild(wrap);

  const leftPad = wrap.querySelector(".sk-pad-left");
  const rightPad = wrap.querySelector(".sk-pad-right");
  const driftBtn = wrap.querySelector(".sk-drift");
  const buttons = { left: leftPad, right: rightPad, drift: driftBtn };
  const held = new Map(); // pointerId → role

  function emit(hop) {
    state.hop = !!hop;
    if (typeof onInput === "function") onInput({ steer: state.steer, drift: state.drift, hop: state.hop });
    state.hop = false;
  }
  function recompute() {
    let l = 0, r = 0, d = false;
    for (const role of held.values()) {
      if (role === "left") l = 1;
      else if (role === "right") r = 1;
      else if (role === "drift") d = true;
    }
    state.steer = r - l;
    state.drift = d;
    leftPad.classList.toggle("sk-on", l === 1);
    rightPad.classList.toggle("sk-on", r === 1);
    driftBtn.classList.toggle("sk-on", d);
  }
  function roleAt(x, y) {
    const rr = rightPad.getBoundingClientRect();
    if (x >= rr.left && x <= rr.right && y >= rr.top && y <= rr.bottom) return "right";
    const lr = leftPad.getBoundingClientRect();
    if (x >= lr.left && x <= lr.right && y >= lr.top && y <= lr.bottom) return "left";
    return null;
  }
  function onDown(e) {
    const role = e.currentTarget.dataset.role;
    e.preventDefault();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) { /* 구형 브라우저 */ }
    held.set(e.pointerId, role);
    recompute();
    emit(role === "drift");
  }
  function onMove(e) {
    const cur = held.get(e.pointerId);
    if (!cur || cur === "drift") return;
    const next = roleAt(e.clientX, e.clientY);
    if (next && next !== cur) { held.set(e.pointerId, next); recompute(); emit(false); }
  }
  function onUp(e) {
    if (!held.has(e.pointerId)) return;
    held.delete(e.pointerId);
    recompute();
    emit(false);
  }
  const prevent = (e) => e.preventDefault();

  for (const btn of Object.values(buttons)) {
    btn.addEventListener("pointerdown", onDown);
    btn.addEventListener("pointermove", onMove);
    btn.addEventListener("pointerup", onUp);
    btn.addEventListener("pointercancel", onUp);
    btn.addEventListener("lostpointercapture", onUp);
    btn.addEventListener("contextmenu", prevent);
    btn.addEventListener("touchstart", prevent, { passive: false });
  }

  function destroy() {
    held.clear();
    if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
  }

  return { el: wrap, state, destroy };
}
