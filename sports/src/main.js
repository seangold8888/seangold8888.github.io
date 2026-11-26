// 재이의 운동회 — 셸: 첫 화면(시연·아이 고르기·메달판) → 경기장(종목 고르기) → 차례 넘기기 → 종목 → 시상식 → 폐회식.
// 종목은 src/events/ 에 하나씩(약속은 EVENTS.md). 그림 방식은 종목의 view 로 분리 — 바꿀 때는 VIEW_KIND 만.
import { KIDS, TEAMS, kidById, kidArt, makeTeams, difficultyBadge } from "./kids.js?v=1";
import { loadSave, writeSave, recordResult } from "./save.js?v=1";
import { sfx, unlock, setOn } from "./sfx.js?v=1";
import { createQuiz } from "./quiz.js?v=1";
import { createJuice } from "./juice.js?v=1";
import { createReplay } from "./replay.js?v=1";
import { SLOTS, isOpen, loadEvent } from "./events/index.js?v=3";
import { medalFor, rankResults, teamPoints, addPoints, winner, cpuScore, MEDAL_LABEL, TEAM_POINT_CAPTION, teamScoreText, podiumGroups } from "./scoring.js?v=1";
import { safeArea } from "./layout.js?v=1";
import { poseCanvas, CEREMONY_POSE, CHEER_POSE, CALM_POSE } from "./render/pose-card.js?v=1";
import { cameraSupported, openPose, PRIVACY_LINE } from "./camera/pose.js?v=1";
import { createLobby } from "./views/lobby-stage.js?v=1";

export const VIEW_KIND = "stage";        // 그림 방식(종목 view 이름). 새 겉모습이 생기면 여기만 바꾼다.

const $ = id => document.getElementById(id);
const QS = new URLSearchParams(location.search), QA = QS.get("qa") === "1";
const SPEED = QA ? Math.max(0.25, Math.min(6, parseFloat(QS.get("speed") || "1") || 1)) : 1;
const AUTO = QA && QS.get("auto") === "1";
const save = loadSave();
const quiz = createQuiz({ qs: QS });
const juice = createJuice($("fx"));
const MEDAL_ICON = { gold: "🥇", silver: "🥈", bronze: "🥉" };
setOn(save.sound !== false);

/* ---------- 공용 도우미 ---------- */
const SCREENS = ["title", "lobby", "eventCard", "turn", "calib", "cpuTurn", "result", "ceremony", "final"];
let screen = "title";
// 경기장 장면(뒤 배경): 첫 화면·경기 중이 아닌 화면 뒤에서 청백 아이들이 응원한다
const LOBBY_SCREENS = new Set(["lobby", "eventCard", "turn", "calib", "cpuTurn", "result", "ceremony", "final"]);
let lobby = null;
function lobbyOn(on) {
  $("lobbyRoot").hidden = !on;
  if (on && !lobby) {
    lobby = createLobby($("lobbyRoot"));
    lobby.setPlayers(players);
    addLoop(dt => { if (!$("lobbyRoot").hidden) lobby.frame(dt); });
  }
}
function show(id) {
  screen = id;
  lobbyOn(LOBBY_SCREENS.has(id));
  for (const s of SCREENS) $(s).hidden = s !== id;
  $("topbar").hidden = !(id === "title" || id === "lobby" || id === "eventCard");
  document.body.dataset.screen = id;
}
function toast(text, ms = 2200) {
  const t = $("toast"); t.textContent = text; t.hidden = false;
  clearTimeout(toast.tm); toast.tm = setTimeout(() => { t.hidden = true; }, ms);
}
const wait = ms => new Promise(r => setTimeout(r, ms / SPEED));
const once = (el, type = "click") => new Promise(r => el.addEventListener(type, e => r(e), { once: true }));
function face(id, pose = "kid") { const im = new Image(); im.alt = ""; im.draggable = false; im.src = kidArt(id, pose); return im; }

/* ---------- 안전 구역(layout.js): 점수판·알림 띠·톡 버튼 띠를 비우고 남은 칸에 아이를 ---------- */
let safeCache = null;
function gameSafe() {
  const W = innerWidth, H = innerHeight, tapOn = !$("tapBtn").hidden, hudOn = !$("hud").hidden;
  const key = `${W}x${H}|${tapOn}|${hudOn}`;
  if (safeCache && safeCache.key === key) return safeCache.sa;
  const hb = hudOn ? Math.round($("hud").getBoundingClientRect().bottom) : null;
  const sa = safeArea({ W, H, hudBottom: hb, tap: tapOn });
  safeCache = { key, sa };
  document.documentElement.style.setProperty("--band-top", sa.bannerTop + "px");
  return sa;
}
function demoSafe() {
  const W = innerWidth, H = innerHeight, r = document.querySelector(".title-card")?.getBoundingClientRect();
  const tb = $("topbar").hidden ? 0 : $("topbar").getBoundingClientRect().bottom + 4;
  return safeArea({ W, H, demoCard: r ? { x: r.left, y: r.top, w: r.width, h: r.height } : { x: W * 0.55, y: H * 0.55, w: W * 0.45, h: H * 0.45 }, topBar: tb });
}
juice.setSafe(() => ($("hud").hidden ? null : gameSafe()));
juice.setActor(() => { try { return current && current.handle && current.handle.actorRect ? current.handle.actorRect() : null; } catch (_) { return null; } });
// 첫 손가락에서 소리 깨우기(iOS)
addEventListener("pointerdown", () => unlock(), { capture: true, passive: true });
addEventListener("keydown", () => unlock(), { capture: true });

/* ---------- 프레임 루프(모든 종목·시연 공용). 멈춤·화면 숨김이면 부르지 않는다 ---------- */
const loops = new Set();
let paused = false, rafId = 0, lastT = 0;
function frame(now) {
  rafId = requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - (lastT || now)) / 1000) * SPEED; lastT = now;
  if (paused || document.hidden) return;
  for (const fn of [...loops]) { try { fn(dt); } catch (e) { console.error(e); } }
}
rafId = requestAnimationFrame(frame);
function addLoop(fn) { loops.add(fn); return () => loops.delete(fn); }

/* ---------- 선수 고르기 ---------- */
let selected = save.kids.filter(id => kidById(id));
if (!selected.length) { let k = null; try { k = window.GameQuiz && window.GameQuiz.currentKid(); } catch (_) {} selected = [kidById(k) ? k : "jaei"]; }
let players = makeTeams(selected);

function paintKids() {
  const row = $("kidRow"); row.innerHTML = "";
  players = makeTeams(selected);
  for (const k of KIDS) {
    const b = document.createElement("button"); b.type = "button"; b.className = "kid";
    const p = players.find(x => x.id === k.id && !x.cpu);
    b.setAttribute("aria-pressed", String(!!p));
    b.dataset.team = k.team;
    b.style.setProperty("--kc", k.color);
    const nm = document.createElement("span"); nm.className = "nm"; nm.textContent = k.name;
    const rib = document.createElement("span"); rib.className = "rib"; rib.textContent = TEAMS[k.team].name;
    const db = difficultyBadge(k.level);
    const lv = document.createElement("span"); lv.className = "lv"; lv.dataset.stars = db.stars;
    lv.innerHTML = `<i>${"★".repeat(db.stars)}</i> ${db.label}`; lv.setAttribute("aria-label", `난이도 ${db.label}`);
    b.append(face(k.id), nm, lv, rib);
    b.addEventListener("click", () => toggleKid(k.id));
    row.appendChild(b);
  }
  const solo = players.filter(p => !p.cpu).length === 1;
  $("goBtn").textContent = solo ? "출발!" : "출발! 청백전";
}
function toggleKid(id) {
  sfx.click();
  if (selected.includes(id)) { if (selected.length > 1) selected = selected.filter(x => x !== id); }
  else selected = [...selected, id];
  save.kids = selected.slice(); writeSave(save);
  paintKids(); restartDemo();
}

/* ---------- 메달판(첫 화면 목표) ---------- */
function paintBoard() {
  const box = $("board"); box.innerHTML = "";
  for (const slot of SLOTS) {
    const open = isOpen(slot);
    const tile = document.createElement(open ? "button" : "div"); tile.className = "tile" + (open ? " pick" : " soon");
    if (open) { tile.type = "button"; tile.setAttribute("aria-label", slot.name + " 하기"); tile.addEventListener("click", () => startPicked(slot.id)); }
    const ic = document.createElement("span"); ic.className = "ic"; ic.textContent = slot.icon;
    const nm = document.createElement("span"); nm.className = "nm"; nm.textContent = slot.name;
    tile.append(ic, nm);
    if (open) {
      const dots = document.createElement("span"); dots.className = "dots";
      for (const k of KIDS) {
        const m = (save.medals[slot.id] || {})[k.id];
        const d = document.createElement("i"); d.className = "md " + (m || "none"); d.style.setProperty("--kc", k.color);
        d.title = `${k.name} ${m ? MEDAL_LABEL[m] : "아직"}`; d.textContent = m ? MEDAL_ICON[m] : "";
        dots.appendChild(d);
      }
      tile.appendChild(dots);
    } else {
      const s = document.createElement("span"); s.className = "soon-tag"; s.textContent = "곧 열려요"; tile.appendChild(s);
    }
    box.appendChild(tile);
  }
}

/* ---------- 첫 화면 뒤 시연(실제 종목을 자동으로) ---------- */
// 시연을 지원하는 종목(demo: true)을 DEMO_SEC 초마다 돌려 가며 보여 준다(고른 아이도 번갈아). ?demo=<id> 면 그 종목만.
// 바꿀 때는 새 종목을 새 층(.demo-layer)에 먼저 띄우고 살짝 겹쳐 사라지게(빈 화면 깜빡임 없음).
let demo = null, demoId = null, demoToken = 0, demoTurn = 0, demoTimer = 0, demoCount = 0, demoPrev = null;
const DEMO_SEC = 12;
const mutedSfx = new Proxy({}, { get: () => () => {} });
const noJuice = new Proxy({}, { get: () => () => {} });
async function startDemo() {
  const token = ++demoToken;
  clearTimeout(demoTimer);
  const only = QS.get("demo");
  const ids = SLOTS.filter(isOpen).map(s => s.id).filter(id => !only || id === only);
  let ev = null;
  for (let i = 0; i < ids.length && !ev; i++) {          // 이번 차례부터 시연되는 종목을 찾는다(없으면 다음)
    const e = await loadEvent(ids[(demoTurn + i) % ids.length]);
    if (token !== demoToken) return;
    if (e && e.demo) { ev = e; demoTurn = (demoTurn + i) % ids.length; }
  }
  if (!ev || token !== demoToken || screen !== "title") return;
  const host = $("demoRoot");
  const root = document.createElement("div"); root.className = "demo-layer";
  root.style.cssText = "position:absolute;inset:0;overflow:hidden" + (demoPrev ? ";opacity:0;transition:opacity .45s" : "");
  host.appendChild(root);
  const kid = kidById(selected[demoCount % selected.length] || selected[0]);
  const ctx = baseCtx({ root, kid, demo: true });
  // 첫 화면 카드가 가로에선 오른쪽, 세로에선 아래를 가린다 → 아이를 빈 쪽에
  // feet = 땅(아이 발)이 올 화면 높이 비율. 세로는 카드 바로 위.
  ctx.frame = () => {
    const r = document.querySelector(".title-card")?.getBoundingClientRect();
    if (innerWidth > innerHeight) {          // 가로: 카드 왼쪽 빈 곳 가운데
      const free = r ? r.left / innerWidth : 0.5;
      return { x: 0.5 - free / 2, feet: 0.9, zoom: innerHeight < 500 ? 0.9 : 1 };
    }
    const top = r ? r.top / innerHeight : 0.55;  // 세로: 카드 바로 위, 아이가 카드 위 빈 곳에 다 들어오게 조금 멀리
    return { x: 0, feet: Math.max(0.4, top - 0.04), zoom: Math.max(0.55, Math.min(1, top * 1.25)) };
  };
  const h = await ev.start(ctx);
  if (token !== demoToken) { if (h) h.stop(); root.remove(); return; }
  demo = h; demoId = ev.id;
  if (demoPrev) {                // 앞 시연은 새 그림이 읽힐 동안 조금 더 보이다가 사라진다
    const prev = demoPrev;
    setTimeout(() => { if (token === demoToken) root.style.opacity = "1"; }, 300);
    setTimeout(() => { if (demoPrev !== prev) return; prev.h.stop(); prev.root.remove(); demoPrev = null; }, 800);
  }
  if (!only && ids.length > 1) demoTimer = setTimeout(() => {
    if (token !== demoToken || screen !== "title" || !demo) return;
    if (demoPrev) { demoPrev.h.stop(); demoPrev.root.remove(); }
    demoPrev = { h: demo, root }; demo = null;
    demoTurn++; demoCount++; startDemo();
  }, DEMO_SEC * 1000 / SPEED);
}
function stopDemo() {
  demoToken++; clearTimeout(demoTimer);
  if (demo) { demo.stop(); demo = null; }
  if (demoPrev) { demoPrev.h.stop(); demoPrev = null; }
  demoId = null; $("demoRoot").innerHTML = "";
}
function restartDemo() { stopDemo(); if (screen === "title" && QS.get("nodemo") !== "1") startDemo(); }

/* ---------- 종목에 건네는 ctx ---------- */
function baseCtx({ root, kid, demo: isDemo, team, camera, onFinish }) {
  const k = kidById(kid.id);
  return {
    root, demo: !!isDemo, auto: AUTO, qaReplay: QA && QS.get("replay") === "1",
    kid: { id: k.id, name: k.name, age: k.age, level: k.level, color: k.color, scale: k.scale || 1, team: team || null, art: { stand: kidArt(k.id, "kid"), cheer: kidArt(k.id, "cheer"), run: kidArt(k.id, "run") } },
    difficulty: { level: k.level, speed: [0.78, 0.9, 1, 1.12][k.level], window: [1.6, 1.3, 1.1, 1][k.level] },
    cast: KIDS.map(x => x.id),
    viewKind: VIEW_KIND,
    safe: isDemo ? demoSafe : gameSafe,
    sfx: isDemo ? mutedSfx : sfx,
    juice: isDemo ? noJuice : juice,
    hud: isDemo ? noJuice : hud,
    quiz: isDemo ? { enabled: false, askReward: async () => null } : { enabled: quiz.enabled, askReward: (title, o) => { if (quiz.enabled) juice.clearText(); return quiz.askReward(k.id, title, o); } },   // 문제 판이 뜨면 앞 배너는 지운다(겹치지 않게)
    input: isDemo ? { onTap: () => () => {} } : input,
    camera: camera || null,
    replay: createReplay({ seconds: 2 }),
    loop: addLoop,
    wait,
    paused: () => paused,
    onPause: fn => pauseFns.add(fn), onResume: fn => resumeFns.add(fn),
    finish: result => { if (onFinish) onFinish(result); },
  };
}

/* ---------- 입력(종목 공용): 경기장 아무 데나 톡 + 큰 톡 버튼 + 스페이스 ---------- */
const tapFns = new Set();
const input = { onTap(fn) { tapFns.add(fn); return () => tapFns.delete(fn); } };
function fireTap() { if (paused || quiz.open) return; for (const fn of [...tapFns]) fn(); }
$("arena").addEventListener("pointerdown", e => { if (e.button > 0) return; e.preventDefault(); fireTap(); });
$("tapBtn").addEventListener("pointerdown", e => { e.preventDefault(); e.stopPropagation(); $("tapBtn").classList.remove("hit"); void $("tapBtn").offsetWidth; $("tapBtn").classList.add("hit"); fireTap(); });
addEventListener("keydown", e => { if ((e.code === "Space" || e.code === "Enter") && !$("arena").hidden && !e.repeat) { e.preventDefault(); fireTap(); } });

/* ---------- 점수판(종목 공용) ---------- */
const buffs = new Map();
const hud = {
  show({ kid, score = 0, round = "", line = "" }) {
    $("hud").hidden = false; $("tapBtn").hidden = false;
    $("hudFace").src = kidArt(kid.id); $("hudName").textContent = kid.name;
    $("hudWho").dataset.team = kid.team || "";
    $("hudScore").textContent = score; $("hudRound").textContent = round; $("hudTime").style.width = "100%";
    $("hudCombo").textContent = ""; $("hudBadges").textContent = ""; $("hudBuffs").innerHTML = ""; buffs.clear();
    $("hudDots").innerHTML = ""; $("hudRound").parentElement.classList.remove("dots");
    if (line) $("tapBtn").title = line;
    safeCache = null;
  },
  // 문제 보상이 켜져 있는 동안 점수판 아래 꼬리표: buff("golden", "⚾ 황금 방망이 ×2") / buff("golden", null) 끄기. 📐 수학 보너스! 가 붙는다.
  buff(key, text, o = {}) {
    const box = $("hudBuffs");
    const old = buffs.get(key);
    if (!text) { if (old) { old.remove(); buffs.delete(key); } return; }
    if (old) { const t = old.querySelector("b"); if (t.textContent !== text) t.textContent = text; return; }
    const el = document.createElement("span"); el.className = "buff " + (o.cls || "");
    const b = document.createElement("b"); b.textContent = text;
    const m = document.createElement("i"); m.textContent = "📐 수학 보너스!";
    el.append(b, m); box.appendChild(el); buffs.set(key, el);
  },
  // 기록 점(승부차기): list = [true(골)|false(못 넣음)…], total = 칸 수 — 점수판 진행 막대 대신
  dots(list, total) {
    const box = $("hudDots"), n = Math.max(total, list.length);
    $("hudRound").parentElement.classList.add("dots");
    const key = list.map(v => (v ? 1 : 0)).join("") + "/" + n;
    if (box.dataset.key === key) return;
    box.dataset.key = key; box.innerHTML = "";
    for (let i = 0; i < n; i++) { const d = document.createElement("i"); d.className = i < list.length ? (list[i] ? "goal" : "miss") : i === list.length ? "now" : ""; box.appendChild(d); }
  },
  set(o) {
    if (o.score != null) $("hudScore").textContent = o.score;
    if (o.round != null) $("hudRound").textContent = o.round;
    if (o.time != null) $("hudTime").style.width = Math.max(0, Math.min(1, o.time)) * 100 + "%";
    if (o.combo != null) $("hudCombo").textContent = o.combo >= 2 ? `콤보 ${o.combo}` : "";
    if (o.shield != null || o.mult != null) {
      const parts = [];
      if (o.mult && o.mult > 1) parts.push(`×${Math.round(o.mult * 100) / 100}`);
      if (o.shield) parts.push("🌈".repeat(o.shield));
      $("hudBadges").textContent = parts.join(" ");
    }
  },
  pulse(key) { const el = key === "combo" ? $("hudCombo") : $("hudScore"); el.classList.remove("pulse"); void el.offsetWidth; el.classList.add("pulse"); },
  hide() { $("hud").hidden = true; $("tapBtn").hidden = true; $("hudBuffs").innerHTML = ""; buffs.clear(); safeCache = null; },
};

/* ---------- 멈춤 ---------- */
const pauseFns = new Set(), resumeFns = new Set();
function setPaused(v) {
  if (paused === v) return;
  paused = v; $("pause").hidden = !v;
  for (const fn of [...(v ? pauseFns : resumeFns)]) { try { fn(); } catch (_) {} }
}
$("pauseBtn").addEventListener("click", e => { e.stopPropagation(); sfx.click(); setPaused(true); });
$("pauseBtn").addEventListener("pointerdown", e => e.stopPropagation());
$("resumeBtn").addEventListener("click", () => { sfx.click(); setPaused(false); });
$("quitBtn").addEventListener("click", () => { sfx.click(); quitEvent(); });
document.addEventListener("visibilitychange", () => { if (document.hidden && current) setPaused(true); });

/* ---------- 세션(청백 점수) ---------- */
const session = { total: { blue: 0, white: 0 }, played: {}, events: 0 };

function paintScoreboard() {
  const sb = $("scoreboard"); sb.innerHTML = "";
  for (const t of ["blue", "white"]) {
    const side = document.createElement("div"); side.className = "sb-side " + t;
    const name = document.createElement("b"); name.textContent = TEAMS[t].name;
    const pts = document.createElement("strong"); pts.textContent = teamScoreText(session.total, t);
    const faces = document.createElement("span"); faces.className = "sb-faces";
    for (const p of players.filter(x => x.team === t)) { const f = face(p.id); if (p.cpu) f.className = "cpu"; faces.appendChild(f); }
    side.append(name, faces, pts);
    sb.appendChild(side);
    if (t === "blue") { const vs = document.createElement("span"); vs.className = "vs"; vs.textContent = "VS"; sb.appendChild(vs); }
  }
  $("lobbyCap").textContent = TEAM_POINT_CAPTION;
}
function paintEvents() {
  const grid = $("eventGrid"); grid.innerHTML = "";
  for (const slot of SLOTS) {
    const open = isOpen(slot);
    const b = document.createElement("button"); b.type = "button"; b.className = "ev-tile" + (open ? "" : " soon");
    const ic = document.createElement("span"); ic.className = "ic"; ic.textContent = slot.icon;
    const nm = document.createElement("b"); nm.textContent = slot.name;
    b.append(ic, nm);
    const res = session.played[slot.id];
    const tag = document.createElement("span"); tag.className = "tag";
    tag.textContent = !open ? "곧 열려요" : res ? res.filter(r => !r.cpu).map(r => (r.medal ? MEDAL_ICON[r.medal] : "🎽")).join("") : "▶ 하기";
    b.appendChild(tag);
    if (open) b.addEventListener("click", () => { sfx.click(); openEventCard(slot.id); }); else b.disabled = true;
    grid.appendChild(b);
  }
  $("finalBtn").disabled = session.events < 1;
}
function goLobby() {
  stopDemo(); hud.hide(); $("arena").hidden = true; $("demoRoot").hidden = true;
  if (lobby) { lobby.setPlayers(players); lobby.focus(null); }
  paintScoreboard(); paintEvents(); show("lobby");
}
// 출발! = 한 번 탭으로 다음 종목 카드(아직 안 한 열린 종목 → 없으면 첫 종목). 경기장(종목 고르기)은 카드의 "다른 종목"에서.
$("goBtn").addEventListener("click", () => {
  sfx.whistle(); players = makeTeams(selected);
  stopDemo(); $("demoRoot").hidden = true; if (lobby) { lobby.setPlayers(players); lobby.focus(null); }
  const open = SLOTS.filter(isOpen), next = open.find(s => !session.played[s.id]) || open[0];
  openEventCard(next.id);
});
// 첫 화면 메달판 타일 = 그 종목 바로 고르기(11-22 대표님 "처음에 종목을 선택할 수 있게")
function startPicked(id) {
  sfx.whistle(); players = makeTeams(selected);
  stopDemo(); $("demoRoot").hidden = true; if (lobby) { lobby.setPlayers(players); lobby.focus(null); }
  openEventCard(id);
}
$("toTitle").addEventListener("click", () => { sfx.click(); goTitle(); });
function goTitle() {
  hud.hide(); $("arena").hidden = true; $("demoRoot").hidden = false;
  paintKids(); paintBoard(); show("title"); restartDemo();
}

/* ---------- 종목 카드(진짜로 뛰기 켜기) ---------- */
let cardEvent = null;
async function openEventCard(id) {
  const ev = await loadEvent(id);
  if (!ev) { toast("이 종목은 아직 준비 중이에요"); return; }
  cardEvent = ev;
  $("evIcon").textContent = ev.icon; $("evName").textContent = ev.name; $("evHow").textContent = ev.howTo || "";
  const camOk = !!ev.cameraMode;
  $("camToggle").hidden = !camOk; $("camPrivacy").hidden = !camOk;
  $("camPrivacy").textContent = "👪 " + PRIVACY_LINE;
  $("camLabel").textContent = ev.cameraLabel || "몸으로 하기";
  $("camKid").src = kidArt((players.find(p => !p.cpu) || players[0]).id, "cheer");
  paintCam();
  show("eventCard");
}
function paintCam() {
  const on = !!save.camera[cardEvent.id];
  $("camToggle").setAttribute("aria-pressed", String(on));
  $("camState").textContent = !cameraSupported() ? "이 기기는 카메라를 못 써요 · 손가락으로 해요" : on ? "켜짐 · 카메라 앞에서 진짜로 뛰어요!" : "카메라로 몸을 움직여요";
}
$("camToggle").addEventListener("click", () => { sfx.click(); save.camera[cardEvent.id] = !save.camera[cardEvent.id]; writeSave(save); paintCam(); });
$("evBack").addEventListener("click", () => { sfx.click(); goLobby(); });
$("evStart").addEventListener("click", () => { sfx.whistle(); runEvent(cardEvent); });

/* ---------- 한 종목 진행: 선수마다 차례 → 시상식 ---------- */
let current = null;          // { ev, handle, cancel }
let poseSession = null;

async function runEvent(ev) {
  const token = { cancelled: false };
  current = { ev, handle: null, token };
  const results = [];
  const wantCam = !!(ev.cameraMode && save.camera[ev.id]);
  for (let i = 0; i < players.length; i++) {
    const p = players[i], k = kidById(p.id);
    if (token.cancelled) return;
    if (p.cpu) { results.push(await cpuTurn(ev, p)); continue; }
    // 차례 넘기기 화면
    $("turnTeam").textContent = TEAMS[p.team].name; $("turnCard").dataset.team = p.team;
    $("turnFace").src = kidArt(p.id, "cheer"); $("turnText").textContent = `다음은 ${k.name} 차례!`;
    $("turnSub").textContent = wantCam && poseSession !== false ? "카메라 앞에 서요" : (ev.howTo || "");
    show("turn"); sfx.turn(); lobby.focus(p.id);
    // 혼자(나머지는 컴퓨터)면 버튼 없이도 잠깐 뒤 저절로 출발, 여럿이면 아이패드를 넘겨받고 "준비됐어요!"
    const humans = players.filter(x => !x.cpu).length;
    if (AUTO) await wait(300); else if (humans === 1) await Promise.race([once($("turnGo")), wait(1500)]); else await once($("turnGo"));
    if (token.cancelled) return;
    sfx.click(); quiz.setKid(p.id);
    let camera = null;
    if (wantCam) camera = await prepareCamera();
    if (token.cancelled) return;
    const r = await playTurn(ev, p, camera, token);
    if (!r || token.cancelled) return;
    results.push(r);
    await showResult(ev, p, r);
  }
  closeCamera();
  current = null;
  await ceremony(ev, results);
}

async function playTurn(ev, p, camera, token) {
  const k = kidById(p.id);
  const root = $("arena"); root.innerHTML = ""; root.hidden = false; $("demoRoot").hidden = true;
  show(null); juice.clear();
  return new Promise(async resolve => {
    let done = false;
    const ctx = baseCtx({ root, kid: k, team: p.team, camera, onFinish: res => { if (done) return; done = true; finishTurn(res); } });
    function finishTurn(res) {
      if (current && current.handle) { current.handle.stop(); current.handle = null; }
      hud.hide(); root.hidden = true; pauseFns.clear(); resumeFns.clear(); tapFns.clear();
      const th = ev.medals(k.level, quiz.enabled);
      const score = Math.max(0, Math.round(res.score || 0));
      const medal = res.medal !== undefined ? res.medal : medalFor(score, th);
      resolve({ id: p.id, team: p.team, cpu: false, score, medal, gold: th.gold, stats: res.stats || {} });
    }
    token.resolveQuit = () => { if (done) return; done = true; resolve(null); };
    try {
      const h = await ev.start(ctx);
      if (token.cancelled || done) { if (h) h.stop(); return; }
      current.handle = h;
    } catch (e) { console.error(e); toast("앗, 종목을 시작하지 못했어요"); done = true; resolve(null); goLobby(); }
  });
}

function quitEvent() {
  setPaused(false);
  if (!current) { goLobby(); return; }
  current.token.cancelled = true;
  if (current.handle) { current.handle.stop(); current.handle = null; }
  if (current.token.resolveQuit) current.token.resolveQuit();
  quiz.close(); closeCamera(); pauseFns.clear(); resumeFns.clear(); tapFns.clear();
  current = null; juice.clear(); goLobby();
}

async function cpuTurn(ev, p) {
  const k = kidById(p.id);
  $("cpuTeam").textContent = TEAMS[p.team].name + " · 사촌 친구(컴퓨터)";
  $("cpuFace").src = kidArt(p.id, "run"); $("cpuText").textContent = `${k.name} 차례!`; $("cpuScore").textContent = "…";
  show("cpuTurn"); sfx.drumroll(1); lobby.focus(p.id);
  const th = ev.medals(k.level, quiz.enabled), score = cpuScore(th), medal = medalFor(score, th);
  await wait(1100);
  $("cpuScore").textContent = `${score}점 ${medal ? MEDAL_ICON[medal] : ""}`; sfx.medal(medal || "bronze");
  await wait(1000);
  return { id: p.id, team: p.team, cpu: true, score, medal, gold: th.gold, stats: {} };
}

async function showResult(ev, p, r) {
  const k = kidById(p.id);
  const up = recordResult(save, ev.id, p.id, r.score, r.medal); save.plays++; writeSave(save);
  $("resMedal").textContent = r.medal ? MEDAL_ICON[r.medal] : "🎽";
  $("resMedal").className = "medal-big " + (r.medal || "none");
  $("resText").textContent = r.medal ? `${k.name} ${MEDAL_LABEL[r.medal]}!` : `${k.name} 잘했어요!`;
  $("resScore").textContent = `${r.score}점`;
  const th = ev.medals(k.level, quiz.enabled);
  const next = !r.medal ? `동메달까지 ${th.bronze - r.score}점` : r.medal === "bronze" ? `은메달까지 ${th.silver - r.score}점` : r.medal === "silver" ? `금메달까지 ${th.gold - r.score}점` : (up.newBest ? "새 최고 기록!" : "최고예요!");
  $("resSub").textContent = (up.medalUp ? "메달판에 새 메달! · " : "") + next;
  show("result"); lobby.focus(p.id);
  if (r.medal) lobby.cheer(p.team);
  if (r.medal) { sfx.medal(r.medal); juice.confetti(r.medal === "gold" ? 160 : 80, { y: 0.3 }); }
  if (r.medal === "gold") { sfx.crowd(1.2); try { window.KidVoices && window.KidVoices.shout(p.id, { reason: "gold" }); } catch (_) {} }
  if (AUTO) await wait(600); else await Promise.race([once($("resNext")), wait(6000)]);
}

async function ceremony(ev, results) {
  const ranked = rankResults(results);
  const gain = teamPoints(results);
  session.total = addPoints(session.total, gain); session.events++;
  session.played[ev.id] = results;
  $("cerTitle").textContent = `${ev.icon} ${ev.name} 시상식`;
  const pod = $("podium"); pod.innerHTML = "";
  const PZ = CEREMONY_POSE[ev.id] || { win: CHEER_POSE, still: CALM_POSE };
  const podH = () => (innerHeight < 500 ? Math.round(innerHeight * 0.34) : Math.round(Math.min(260, innerHeight * 0.28, innerWidth * 0.36)));
  const { order, rest } = podiumGroups(ranked);
  for (const grp of order) {
    const col = document.createElement("div"); col.className = `pod p${grp.rank}` + (grp.shared ? " shared" : "") + (grp.results.length === 1 ? " " + grp.results[0].team : "");
    const kids = document.createElement("div"); kids.className = "pod-kids";
    for (const r of grp.results) {
      const k = kidById(r.id);
      const one = document.createElement("div"); one.className = "pod-one " + r.team;
      const md = document.createElement("span"); md.className = "pod-medal"; md.textContent = r.medal ? MEDAL_ICON[r.medal] : "🎽";
      const im = poseCanvas(r.id, grp.rank === 1 ? PZ.win : PZ.still, { h: Math.round(podH() * (grp.rank === 1 ? 1 : 0.86) * (k.scale || 1)), cls: "pod-face" });
      const nm = document.createElement("b"); nm.textContent = k.name + (r.cpu ? " 🤖" : "");
      const sc = document.createElement("span"); sc.className = "pod-score"; sc.textContent = `${r.score}점`;
      one.append(md, im, nm, sc); kids.appendChild(one);
    }
    const step = document.createElement("div"); step.className = "pod-step"; step.textContent = grp.shared ? grp.label : grp.rank;
    col.append(kids, step);
    pod.appendChild(col);
  }
  for (const grp of rest) for (const r of grp.results) {
    const k = kidById(r.id); const s2 = document.createElement("div"); s2.className = "pod-rest"; s2.textContent = `${grp.label}. ${k.name} ${r.medal ? MEDAL_ICON[r.medal] : ""} ${r.score}점`; pod.appendChild(s2);
  }
  $("teamGain").innerHTML = "";
  for (const t of ["blue", "white"]) {
    const d = document.createElement("div"); d.className = "gain " + t;
    d.innerHTML = `<b>${TEAMS[t].name}</b><span>+${gain[t]}</span><strong>${teamScoreText(session.total, t)}</strong>`;
    $("teamGain").appendChild(d);
  }
  $("cerCap").textContent = TEAM_POINT_CAPTION;
  juice.clear();          // 마지막 선수의 종목 띠("끝!")가 시상식 제목·시상대를 가리지 않게
  show("ceremony"); lobby.empty(); lobby.cheer(ranked[0] ? ranked[0].team : "all", 4);
  sfx.fanfare(); sfx.crowd(1.3); juice.confetti(200, { y: 0.2, spread: 1.5 });
  setTimeout(() => juice.confetti(120, { x: 0.2, y: 0.3 }), 500); setTimeout(() => juice.confetti(120, { x: 0.8, y: 0.3 }), 800);
  const again = once($("cerAgain")).then(() => "again"), other = once($("cerOther")).then(() => "other");
  const choice = AUTO ? await Promise.race([again, other, new Promise(r => setTimeout(() => r("other"), 4000))]) : await Promise.race([again, other]);
  sfx.click();
  if (choice === "again") runEvent(ev); else goLobby();
}

/* ---------- 폐회식 ---------- */
$("finalBtn").addEventListener("click", () => {
  sfx.fanfare();
  const w = winner(session.total);
  $("finalTitle").textContent = w === "tie" ? "청군 백군 무승부! 모두 최고!" : `${TEAMS[w].name} 우승!`;
  const box = $("finalTeams"); box.innerHTML = "";
  const fh = innerHeight < 500 ? Math.round(innerHeight * 0.3) : Math.round(Math.min(230, innerHeight * 0.26, innerWidth * 0.42));
  for (const t of ["blue", "white"]) {
    const d = document.createElement("div"); d.className = "final-team " + t + (w === t ? " win" : "");
    const h = document.createElement("b"); h.textContent = (w === t ? "🏆 " : "") + TEAMS[t].name;
    const pts = document.createElement("strong"); pts.textContent = teamScoreText(session.total, t);
    const faces = document.createElement("span"); faces.className = "final-kids";
    const cheer = w === t || w === "tie";
    for (const p of players.filter(x => x.team === t)) faces.appendChild(poseCanvas(p.id, cheer ? CHEER_POSE : CALM_POSE, { h: Math.round(fh * (cheer ? 1 : 0.8) * ((kidById(p.id) || {}).scale || 1)), cls: "final-face" }));
    d.append(h, faces, pts); box.appendChild(d);
  }
  $("finalCap").textContent = TEAM_POINT_CAPTION;
  show("final"); lobby.empty(); lobby.cheer(w === "tie" ? "all" : w, 6); juice.confetti(260, { y: 0.15, spread: 1.6 }); sfx.crowd(1.5);
});
$("finalHome").addEventListener("click", () => { sfx.click(); session.total = { blue: 0, white: 0 }; session.played = {}; session.events = 0; goTitle(); });

/* ---------- 카메라(진짜로 뛰기): 한 종목 동안 한 번 켜고, 선수마다 다시 맞춘다 ---------- */
async function prepareCamera() {
  if (poseSession === false) return null;          // 이번 종목에서 이미 실패 → 손가락
  show("calib");
  $("calibPrivacy").textContent = "👪 " + PRIVACY_LINE; $("calibFill").style.width = "0%";
  $("calibText").textContent = "카메라를 켜는 중…";
  let skip = false; const skipP = once($("calibSkip")).then(() => { skip = true; });
  try {
    if (!poseSession) {
      poseSession = await Promise.race([openPose({ onStatus: t => { $("calibText").textContent = t; } }), skipP.then(() => null)]);
      if (!poseSession) { poseSession = false; return null; }
      const v = poseSession.video; v.className = "mirror"; $("calibVideo").innerHTML = ""; $("calibVideo").appendChild(v);
    } else { $("calibVideo").innerHTML = ""; $("calibVideo").appendChild(poseSession.video); }
    $("calibText").textContent = "가만히 서 있어요";
    await Promise.race([poseSession.calibrate({
      onProgress: r => {
        $("calibFill").style.width = Math.round(r.progress * 100) + "%";
        $("calibText").textContent = r.reason === "body" ? "몸 전체가 보이게 뒤로 가요" : r.reason === "move" ? "가만히 서 있어요" : "좋아요! 그대로…";
      },
    }), skipP]);
    if (skip) { closeCamera(); poseSession = false; return null; }
    sfx.beep(true);
    // 경기 중 작은 거울 화면(아이가 자기 몸을 본다)
    $("camPip").innerHTML = ""; $("camPip").appendChild(poseSession.video); $("camPip").hidden = false;
    const s = poseSession;
    return { on: (type, fn) => s.on(type, fn), lagMs: 100, video: s.video, lostFor: () => s.lostFor() };
  } catch (e) {
    console.warn("[sports] 카메라 대신 손가락", e && e.code, e);
    closeCamera(); poseSession = false;
    toast(e && e.code === "denied" ? "카메라를 못 켜서 손가락으로 해요" : e && e.code === "nobody" ? "몸이 안 보여서 손가락으로 해요" : "카메라를 쓸 수 없어서 손가락으로 해요");
    return null;
  }
}
function closeCamera() {
  if (poseSession) { try { poseSession.stop(); } catch (_) {} }
  poseSession = null; $("camPip").hidden = true; $("camPip").innerHTML = ""; $("calibVideo").innerHTML = "";
}

/* ---------- 소리 버튼 ---------- */
function paintSound() { $("soundBtn").setAttribute("aria-pressed", String(save.sound !== false)); $("soundBtn").textContent = save.sound !== false ? "♪" : "×"; }
$("soundBtn").addEventListener("click", () => { save.sound = save.sound === false; setOn(save.sound); writeSave(save); paintSound(); unlock(); sfx.click(); });
paintSound();

/* ---------- 시작 ---------- */
goTitle();

/* ---------- 검증 훅(?qa=1) ---------- */
if (QA) {
  window.__sports = {
    screen: () => screen, players: () => players.map(p => ({ ...p })), session: () => JSON.parse(JSON.stringify(session)),
    save: () => JSON.parse(JSON.stringify(save)), quiz: () => quiz.peek(), quizEnabled: () => quiz.enabled,
    run: () => (current && current.handle && current.handle.state ? current.handle.state() : null),
    demo: () => (demo && demo.state ? demo.state() : null),
    demoId: () => demoId,
    actor: () => (current && current.handle && current.handle.actorRect ? current.handle.actorRect() : null),
    demoActor: () => (demo && demo.actorRect ? demo.actorRect() : null),
    boardRect: () => (current && current.handle && current.handle.boardRect ? current.handle.boardRect() : null),
    safe: () => ($("hud").hidden ? demoSafe() : gameSafe()),
    demoSafe: () => demoSafe(),
    banner: () => juice.banner(),
    // 시상식 미리 보기(검증: 동점 시상대 등) — results = [{ id, team, score, medal, gold }]
    ceremony: async (id, results) => { const ev = await loadEvent(id); stopDemo(); $("demoRoot").hidden = true; ceremony(ev, results.map(r => ({ cpu: false, stats: {}, ...r }))); },
    tap: fireTap, pause: setPaused, select: ids => { selected = ids.slice(); save.kids = selected.slice(); writeSave(save); paintKids(); restartDemo(); },
  };
}
