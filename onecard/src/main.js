// 원카드: 화면·애니메이션·차례 진행. 규칙과 컴퓨터 생각은 rules.js(순수 모듈)에 있다.
import * as R from "./rules.js";
import * as Save from "./save.js";
import { cardEl, backEl } from "./cards.js";
import { sfx, unlock as audioUnlock, setMuted } from "./sfx.js";

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const params = new URLSearchParams(location.search);
const SPEED = Math.min(20, Math.max(0.2, Number(params.get("speed")) || 1)); // 점검용으로만 빠르게
let rng = params.get("seed") ? R.mulberry32(Number(params.get("seed"))) : Math.random;

const S = Save.load();
const KIDS = {
  jaei: { name: "재이", level: "normal", hand: 7, img: "art/jaei.webp" },
  taeo: { name: "태오", level: "easy", hand: 5, img: "art/taeo.webp" },
};
const OPP = [null, { name: "아빠", img: "art/appa.webp" }, { name: "엄마", img: "art/eomma.webp" }];
const STICKERS = ["⭐", "🍭", "🎈", "🦄", "🚀", "🌈", "🍓", "🐶", "🎀", "🍩", "🦖", "🌟"];

// 버튼은 "그 버튼 위에서 눌렀다 뗀" 손가락만 받는다. 카드를 누르는 순간 뜬 창(모양 고르기·결과)의 버튼이
// 같은 손가락의 뒤늦은 click으로 눌리는 일(유령 클릭)을 막는다. 터치 포인터는 처음 누른 요소에 묶여 있다.
function onTap(el, fn) {
  let armed = false;
  el.addEventListener("pointerdown", () => { armed = true; });
  el.addEventListener("pointerup", e => { if (armed) { armed = false; fn(e); } });
  el.addEventListener("pointercancel", () => { armed = false; });
  el.addEventListener("click", e => { if (e.detail === 0) fn(e); }); // 키보드
}

// ---------- 소리 ----------
function applySound() {
  setMuted(!S.sound);
  $$(".sound-btn").forEach(b => { b.textContent = S.sound ? "🔊" : "🔇"; });
}
$$(".sound-btn").forEach(b => onTap(b, () => { S.sound = !S.sound; Save.save(S); applySound(); }));
document.addEventListener("pointerdown", audioUnlock, { capture: true, passive: true });
applySound();

// ---------- 시간: 판이 바뀌면(gen) 예약된 일은 모두 무시한다 ----------
let gen = 0;
const timers = new Set();
function later(ms, fn) {
  const g = gen;
  const id = setTimeout(() => { timers.delete(id); if (g === gen) fn(); }, ms / SPEED);
  timers.add(id);
  return id;
}
const wait = ms => new Promise(res => later(ms, res));
function cancel(id) { if (id) { clearTimeout(id); timers.delete(id); } }
function stopAll() { gen++; timers.forEach(clearTimeout); timers.clear(); }

// ---------- 화면 ----------
function show(id) {
  ["home", "game"].forEach(s => { $("#" + s).hidden = s !== id; });
  ["suitPick", "result", "oneCard"].forEach(s => { $("#" + s).hidden = true; });
  $("#burst").hidden = true;
  if (id === "home") renderHome();
}

// ---------- 첫 화면 ----------
function stickerRow(n, max) {
  const shown = Math.min(n, max);
  let s = "";
  for (let i = n - shown; i < n; i++) s += STICKERS[i % STICKERS.length];
  return s;
}
function renderHome() {
  $$(".kid-card").forEach(c => {
    c.classList.toggle("on", c.dataset.kid === S.last);
    const k = c.dataset.kid, w = S.wins[k];
    c.querySelector(".stickers").innerHTML = w ? `<em>🏆 ${w}승</em><span>${stickerRow(w, 5)}</span>` : `<em>첫 승리 도전!</em>`;
  });
  $$(".opp-btn").forEach(b => b.classList.toggle("on", Number(b.dataset.opp) === S.opp));
}
$$(".kid-card").forEach(c => onTap(c, () => { sfx.pop(); startGame(c.dataset.kid); }));
$$(".opp-btn").forEach(b => onTap(b, () => { sfx.tap(); S.opp = Number(b.dataset.opp); Save.save(S); renderHome(); }));
(function titleFan() {
  const fan = $("#titleFan");
  [{ id: "H11", s: "H", r: 11 }, { id: "S7", s: "S", r: 7 }, { id: "D1", s: "D", r: 1 }, { id: "C13", s: "C", r: 13 }].forEach((c, i) => {
    const e = cardEl(c);
    e.style.setProperty("--i", i - 1.5);
    fan.appendChild(e);
  });
})();

// ---------- 크기 계산 ----------
const L = { cw: 80, ch: 112, tw: 90, hw: 80, handH: 140, rows: 1 };
function safe() {
  const p = $("#safeProbe") || (() => {
    const d = document.createElement("div");
    d.id = "safeProbe";
    d.style.cssText = "position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)";
    document.body.appendChild(d);
    return d;
  })();
  const cs = getComputedStyle(p);
  return { t: parseFloat(cs.paddingTop) || 0, r: parseFloat(cs.paddingRight) || 0, b: parseFloat(cs.paddingBottom) || 0, l: parseFloat(cs.paddingLeft) || 0 };
}
function layout(nArg) {
  const W = innerWidth, H = innerHeight, sf = safe();
  const portrait = H > W * 1.15;
  const top = Math.round(Math.min(110, Math.max(58, H * 0.12)));
  const avail = H - sf.t - sf.b - top - 18;
  const usableW = W - sf.l - sf.r - 24;
  // 손패 칸 높이는 판 내내 고정(탁자 크기가 흔들리지 않게). 그 안에서 줄 수·카드 크기를 고른다.
  const handH = Math.min(avail * (portrait ? 0.5 : 0.52), 150 * 1.4 * 1.68);
  const n = Math.max(1, nArg != null ? nArg : (G ? G.st.hands[0].length : 7));
  let best = null;
  for (let rows = 1; rows <= 3; rows++) {
    const per = Math.ceil(n / rows);
    const byW = usableW / (1 + 0.55 * (per - 1));
    const byH = handH / (1.4 * (1.2 + 0.48 * (rows - 1)));
    const hw = Math.min(150, byW, byH);
    if (!best || hw > best.hw * 1.08) best = { rows, hw };
  }
  const { rows, hw } = best;
  const tableH = avail - handH - 8;
  const infoH = portrait ? 96 : 0;
  const tw = Math.max(44, Math.min(180, (tableH - infoH) / 1.48, portrait ? (usableW - 40) / 2.3 : (usableW - 60) / 3.5));
  Object.assign(L, { tw, hw, handH, rows, top, usableW, portrait });
  const root = document.documentElement.style;
  root.setProperty("--top", top + "px");
  root.setProperty("--tw", tw.toFixed(1) + "px");
  root.setProperty("--hw", hw.toFixed(1) + "px");
  root.setProperty("--hand-h", handH.toFixed(1) + "px");
  root.setProperty("--av", Math.round(Math.min(top - 18, 72)) + "px");
  document.body.classList.toggle("portrait", portrait);
}
addEventListener("resize", () => { layout(L.lastN); if (G) render(); });

// ---------- 게임 상태 ----------
let G = null;
const handEls = new Map();

function startGame(kid) {
  stopAll();
  const K = KIDS[kid];
  S.last = kid; Save.save(S);
  G = {
    kid, K, level: K.level, n: S.opp,
    st: R.newGame({ players: 1 + S.opp, handSize: K.hand, rng }),
    phase: "deal", busy: true, hint: false, dealt: null, pileHold: 0, hide: null, oneTimer: 0,
  };
  G.dealt = G.st.hands.map(() => 0);
  handEls.clear();
  L.lastN = -1;
  $("#hand").innerHTML = "";
  show("game");
  buildOpps();
  layout();
  render();
  deal(gen);
}

async function deal(g) {
  const st = G.st;
  await wait(250);
  for (let k = 0; k < G.K.hand; k++) {
    for (let p = 0; p < st.players; p++) {
      if (g !== gen) return;
      G.dealt[p]++;
      sfx.deal();
      const to = p === 0 ? null : oppRect(p);
      if (to) flyBack(rect($("#deck")), to, 260);
      render();
      await wait(80);
    }
  }
  await wait(250);
  G.dealt = null;
  G.pileShown = true;
  sfx.flick();
  render();
  await wait(350);
  G.busy = false;
  advance();
}

function advance() {
  if (!G) return;
  const st = G.st;
  $("#passBtn").hidden = !(st.turn === 0 && st.drawn);
  render();
  if (st.winner >= 0) return finish();
  if (st.pending) return openOneCard();
  if (st.turn === 0) return startMyTurn();
  G.phase = "ai";
  setStatus(`${OPP[st.turn].name} 차례…`);
  later(900, () => aiTurn(st.turn));
}

function startMyTurn() {
  const st = G.st;
  G.phase = "play";
  cancel(G.hintTimer);
  G.hint = G.kid === "taeo" || !!st.drawn;
  if (!G.hint) G.hintTimer = later(6000, () => { if (G.phase === "play" && G.st.turn === 0) { G.hint = true; render(); } });
  sfx.turn();
  render();
}

// ---------- 그리기 ----------
function rect(e) { const b = e.getBoundingClientRect(); return { left: b.left, top: b.top, width: b.width, height: b.height }; }

function buildOpps() {
  const box = $("#opps");
  box.innerHTML = "";
  box.classList.toggle("two", G.n === 2);
  for (let p = 1; p <= G.n; p++) {
    const o = document.createElement("div");
    o.className = "opp";
    o.dataset.p = p;
    o.innerHTML = `<div class="av"><img src="${OPP[p].img}" alt=""></div>
      <div class="opp-info"><b>${OPP[p].name}</b><div class="mini"></div></div>
      <span class="count"></span><div class="bubble" hidden></div>`;
    box.appendChild(o);
  }
}

function render() {
  if (!G) return;
  renderOpps();
  renderTable();
  renderHand();
}

function renderOpps() {
  const st = G.st;
  $$(".opp").forEach(o => {
    const p = Number(o.dataset.p);
    const n = G.dealt ? G.dealt[p] : st.hands[p].length;
    o.classList.toggle("active", !G.dealt && st.winner < 0 && st.turn === p);
    o.classList.toggle("one", n === 1);
    o.querySelector(".count").textContent = n;
    const mini = o.querySelector(".mini");
    const want = Math.min(n, 7);
    while (mini.children.length > want) mini.lastChild.remove();
    while (mini.children.length < want) mini.appendChild(Object.assign(document.createElement("i"), { className: "mb" }));
  });
}

function renderTable() {
  const st = G.st;
  const deck = $("#deck");
  const drawable = R.canDraw(st);
  deck.classList.toggle("empty", !drawable);
  $("#deckCount").textContent = st.deck.length;
  const pile = $("#pile");
  pile.innerHTML = "";
  if (G.pileShown) {
    const upto = st.pile.length - G.pileHold;
    for (let i = Math.max(0, upto - 3); i < upto; i++) {
      const c = cardEl(st.pile[i]);
      const h = [...st.pile[i].id].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7);
      c.style.transform = i === upto - 1 ? `rotate(${(h % 7) - 3}deg)` : `rotate(${(h % 21) - 10}deg) translate(${(h % 9) - 4}px, ${(h % 5) - 2}px)`;
      pile.appendChild(c);
    }
  }
  const showSuit = G.pileShown ? st.suit : null;
  const badge = $("#suitBadge");
  badge.hidden = !showSuit;
  if (showSuit) {
    $("#suitSym").textContent = R.SUIT_SYM[showSuit];
    badge.classList.toggle("red", R.isRed(showSuit));
    badge.classList.toggle("wild", R.topCard(st).r === 7);
  }
  const mine = !G.dealt && st.turn === 0 && st.winner < 0 && G.phase === "play";
  const legal = mine ? R.legalCards(st, 0) : [];
  deck.classList.toggle("pulse", mine && G.hint && !legal.length && !st.drawn && drawable);
  deck.classList.toggle("mine", mine && !st.drawn);
  $("#handWrap").classList.toggle("mine", mine);
  if (mine) {
    const t = R.topCard(st);
    if (st.drawn) setStatus(legal.length ? "뽑은 카드를 낼까?" : "");
    else if (!legal.length) setStatus(`${G.K.name} 차례!\n낼 카드가 없어요 → 카드 뽑기`);
    else if (G.kid === "taeo") setStatus(`${G.K.name} 차례!\n반짝이는 카드를 내요`);
    else setStatus(`${G.K.name} 차례!\n${R.SUIT_SYM[st.suit]} 또는 ${R.rankLabel(t.r)}`);
  }
}

function setStatus(t) { $("#status").textContent = t; }

function handPositions(n) {
  const wrap = $("#hand");
  const W = wrap.clientWidth || L.usableW;
  const hw = L.hw, hch = hw * 1.4, rows = L.rows;
  const need = hch * (1.2 + 0.48 * (rows - 1));
  const y0 = Math.max(0, L.handH - need) * 0.6 + hch * 0.2;
  const per = Math.ceil(n / rows);
  const out = [];
  for (let row = 0, k = 0; row < rows; row++) {
    const cnt = Math.min(per, n - k);
    const step = cnt > 1 ? Math.min(hw * 1.06, (W - hw) / (cnt - 1)) : 0;
    const total = hw + step * (cnt - 1);
    const x0 = (W - total) / 2;
    for (let i = 0; i < cnt; i++, k++) out.push({ x: x0 + i * step, y: y0 + row * hch * 0.48 });
  }
  return out;
}

function renderHand() {
  const st = G.st;
  let cards = st.hands[0];
  if (G.dealt) cards = cards.slice(0, G.dealt[0]);
  cards = R.sortHand(cards);
  const want = cards.length;
  if (L.lastN !== want) { L.lastN = want; layout(want); }
  const mine = !G.dealt && st.turn === 0 && st.winner < 0 && G.phase === "play";
  const legal = new Set(mine ? R.legalCards(st, 0).map(c => c.id) : []);
  const pos = handPositions(cards.length);
  const keep = new Set(cards.map(c => c.id));
  for (const [id, e] of handEls) if (!keep.has(id)) { e.remove(); handEls.delete(id); }
  const wrap = $("#hand");
  cards.forEach((c, i) => {
    let e = handEls.get(c.id);
    if (!e) {
      e = cardEl(c);
      e.addEventListener("pointerdown", ev => { ev.preventDefault(); onCardTap(c.id, e); });
      handEls.set(c.id, e);
      e.style.left = pos[i].x + "px";
      e.style.top = pos[i].y + "px";
    }
    wrap.appendChild(e); // 순서대로 다시 붙여서 오른쪽 카드가 위에 오게
    e.style.left = pos[i].x + "px";
    e.style.top = pos[i].y + "px";
    e.style.zIndex = i + 1;
    e.classList.toggle("can", legal.has(c.id) && G.hint);
    e.classList.toggle("drawn", st.drawn === c.id);
    e.classList.toggle("dim", !!st.drawn && st.drawn !== c.id && mine);
    e.style.visibility = G.hide === c.id ? "hidden" : "";
  });
}

function oppRect(p) {
  const o = $(`.opp[data-p="${p}"] .av`);
  return o ? rect(o) : { left: innerWidth / 2, top: 0, width: 40, height: 40 };
}

// ---------- 날아가는 카드 ----------
function flyNode(node, from, to, ms, spin = 0) {
  node.classList.add("flying");
  node.style.setProperty("--cw", to.width + "px");
  node.style.left = to.left + "px";
  node.style.top = to.top + "px";
  $("#fly").appendChild(node);
  const sx = from.width / to.width;
  const dx = from.left + from.width / 2 - (to.left + to.width / 2);
  const dy = from.top + from.height / 2 - (to.top + to.height / 2);
  let anim;
  try {
    anim = node.animate([
      { transform: `translate(${dx}px, ${dy}px) scale(${sx}) rotate(${spin}deg)` },
      { transform: "translate(0,0) scale(1) rotate(0deg)" },
    ], { duration: ms / SPEED, easing: "cubic-bezier(.25,.8,.35,1)" });
  } catch (e) { anim = null; }
  const done = anim && anim.finished ? anim.finished : wait(ms);
  return done.catch(() => {}).then(() => node.remove());
}
function pileRect() { const r = rect($("#pile")); return r; }
function flyBack(from, to, ms = 320) {
  const b = backEl();
  return flyNode(b, from, { left: to.left, top: to.top, width: to.width, height: to.width * 1.4 }, ms, 10);
}
function smallFrom(r) { const w = r.width * 0.7; return { left: r.left + (r.width - w) / 2, top: r.top + r.height * 0.1, width: w, height: w * 1.4 }; }

// ---------- 아이 차례 ----------
function onCardTap(id, e) {
  if (!G || G.busy || G.dealt) return;
  const st = G.st;
  if (st.winner >= 0) return;
  if (G.phase === "one") return;
  if (st.turn !== 0) { toast(`${OPP[st.turn].name} 차례예요. 잠깐만!`); return; }
  if (G.phase !== "play") return;
  const legal = R.legalCards(st, 0);
  const card = st.hands[0].find(c => c.id === id);
  if (!card) return;
  if (!legal.some(c => c.id === id)) {
    sfx.wrong();
    e.classList.remove("shake"); void e.offsetWidth; e.classList.add("shake");
    if (st.drawn) toast("방금 뽑은 카드만 낼 수 있어요");
    else toast(`${R.SUIT_SYM[st.suit]} 모양이나 ${R.rankLabel(R.topCard(st).r)}만 낼 수 있어요`);
    return;
  }
  if (card.r === 7 && st.hands[0].length > 1) {
    G.phase = "suit";
    G.seven = id;
    sfx.suit();
    $("#suitPick").hidden = false;
    return;
  }
  kidPlay(id);
}

$$(".suit-btn").forEach(b => onTap(b, () => {
  if (!G || G.phase !== "suit") return;
  $("#suitPick").hidden = true;
  G.phase = "play";
  kidPlay(G.seven, b.dataset.suit);
}));
onTap($("#suitCancel"), () => {
  if (!G || G.phase !== "suit") return;
  sfx.tap();
  $("#suitPick").hidden = true;
  G.phase = "play";
});

async function kidPlay(id, suit) {
  const st = G.st, g = gen;
  G.busy = true;
  cancel(G.hintTimer);
  $("#passBtn").hidden = true;
  const e = handEls.get(id);
  const from = e ? rect(e) : rect($("#hand"));
  const card = st.hands[0].find(c => c.id === id);
  const ev = R.play(st, 0, id, suit);
  G.pileHold = 1;
  G.phase = "anim";
  render();
  await flyNode(cardEl(card), from, pileRect(), 340, -6);
  if (g !== gen) return;
  G.pileHold = 0;
  sfx.flick();
  render();
  if (card.r === 7 && !ev.win) await announceSuit(ev.suit, `${R.SUIT_NAME[ev.suit]}로 바꿨어요!`);
  G.busy = false;
  advance();
}

$("#deck").addEventListener("pointerdown", ev => { ev.preventDefault(); kidDraw(); });
async function kidDraw() {
  if (!G || G.busy || G.dealt) return;
  const st = G.st;
  if (st.winner >= 0 || G.phase === "one") return;
  if (st.turn !== 0) { toast(`${OPP[st.turn].name} 차례예요. 잠깐만!`); return; }
  if (G.phase !== "play") return;
  if (st.drawn) { toast("뽑은 카드를 내거나 '안 낼래'를 눌러요"); return; }
  const g = gen;
  G.busy = true;
  cancel(G.hintTimer);
  const ev = R.draw(st, 0, rng);
  if (ev.reshuffled) toast("카드를 다시 섞었어요 🔀");
  if (ev.card) {
    G.hide = ev.card.id;
    render();
    const slot = handEls.get(ev.card.id);
    sfx.draw();
    if (slot) await flyBack(rect($("#deck")), rect(slot), 320);
    if (g !== gen) return;
    G.hide = null;
  }
  if (!ev.card) { toast("뽑을 카드가 없어요. 통과!"); render(); await wait(700); }
  else if (ev.playable) {
    G.hint = true;
    G.busy = false;
    toast("이 카드 낼 수 있어요! ✨");
    $("#passBtn").hidden = false;
    render();
    return;
  } else { render(); toast("못 내요. 다음 차례!"); await wait(650); }
  if (g !== gen) return;
  G.busy = false;
  advance();
}
onTap($("#passBtn"), () => {
  if (!G || G.busy || G.phase !== "play" || !G.st.drawn || G.st.turn !== 0) return;
  sfx.tap();
  R.pass(G.st, 0);
  $("#passBtn").hidden = true;
  advance();
});

// ---------- 컴퓨터 차례 ----------
async function aiTurn(p) {
  const st = G.st, g = gen;
  if (st.turn !== p || st.winner >= 0 || st.pending) return;
  let m = R.aiChoose(st, p, G.level, rng);
  if (m.type === "draw") {
    const ev = R.draw(st, p, rng);
    if (ev.reshuffled) toast("카드를 다시 섞었어요 🔀");
    if (ev.card) {
      sfx.draw();
      await flyBack(rect($("#deck")), oppRect(p), 340);
      if (g !== gen) return;
      render();
    } else bubble(p, "통과!");
    if (ev.playable) {
      await wait(550);
      if (g !== gen) return;
      m = R.aiChoose(st, p, G.level, rng);
      if (m.type === "play") await aiPlay(p, m);
      else R.pass(st, p);
    } else if (ev.card) bubble(p, "한 장 뽑았어");
    if (g !== gen) return;
    advance();
    return;
  }
  await aiPlay(p, m);
  if (g !== gen) return;
  advance();
}

async function aiPlay(p, m) {
  const st = G.st, g = gen;
  const card = st.hands[p].find(c => c.id === m.cardId);
  const ev = R.play(st, p, m.cardId, m.suit);
  G.pileHold = 1;
  render();
  await flyNode(cardEl(card), smallFrom(oppRect(p)), pileRect(), 380, 8);
  if (g !== gen) return;
  G.pileHold = 0;
  sfx.flick();
  render();
  if (card.r === 7 && !ev.win) {
    bubble(p, `${R.SUIT_SYM[ev.suit]} ${R.SUIT_NAME[ev.suit]}로 바꿀게!`);
    await announceSuit(ev.suit);
  }
}

async function announceSuit(s, msg) {
  sfx.suit();
  const f = document.createElement("div");
  f.className = "suit-flash " + (R.isRed(s) ? "red" : "black");
  f.textContent = R.SUIT_SYM[s];
  $("#pile").appendChild(f);
  if (msg) toast(msg);
  await wait(900);
  f.remove();
}

// ---------- 원카드! ----------
function openOneCard() {
  const st = G.st, p = st.pending.player;
  G.phase = "one";
  const layer = $("#oneCard"), bar = $("#oneBar");
  setStatus("원카드!");
  layer.hidden = false;
  layer.classList.toggle("mine", p === 0);
  layer.classList.toggle("theirs", p !== 0);
  bar.style.animation = "none"; void bar.offsetWidth;
  if (p === 0) {
    $("#oneCap").textContent = "카드가 1장! 빨리 눌러요!";
    $("#oneBtn").textContent = "원카드!";
    const t = R.aiCatchDelay(G.level);
    bar.style.animation = `oneBar ${t / SPEED}ms linear forwards`;
    G.oneTimer = later(t, () => resolveOne(1));
  } else {
    $("#oneCap").textContent = `${OPP[p].name} 카드가 1장! 먼저 누르면 잡아요!`;
    $("#oneBtn").textContent = "원카드!";
    bar.style.animation = "";
    const d = R.aiSelfCallDelay(G.level, rng);
    G.oneTimer = d == null ? later(5000, expireOne) : later(d, () => resolveOne(p));
  }
  sfx.pop();
  render();
}
$("#oneBtn").addEventListener("pointerdown", ev => { ev.preventDefault(); resolveOne(0); });

async function resolveOne(caller) {
  if (!G || G.phase !== "one") return;
  const st = G.st, g = gen;
  cancel(G.oneTimer);
  G.phase = "anim";
  $("#oneCard").hidden = true;
  const r = R.callOneCard(st, caller, rng);
  if (!r) { advance(); return; }
  if (r.type === "safe" && r.player === 0) {
    sfx.oneCard();
    burst("원카드! 🎉", "good");
    await wait(1100);
  } else if (r.type === "safe") {
    sfx.pop();
    bubble(r.player, "원카드!");
    toast(`${OPP[r.player].name}가 먼저 외쳤어요`);
    await wait(1000);
  } else if (r.player === 0) {
    bubble(caller, "원카드!");
    sfx.oops();
    toast(`앗, ${OPP[caller].name}가 먼저 외쳤어요. 카드 1장 받기!`);
    if (r.card) {
      G.hide = r.card.id;
      render();
      const slot = handEls.get(r.card.id);
      if (slot) await flyBack(rect($("#deck")), rect(slot), 420);
      G.hide = null;
    }
    await wait(700);
  } else {
    sfx.caught();
    burst("잡았다! 🙌", "catch");
    bubble(r.player, "앗! 잡혔다!");
    if (r.card) await flyBack(rect($("#deck")), oppRect(r.player), 420);
    render();
    await wait(900);
  }
  if (g !== gen) return;
  advance();
}

function expireOne() {
  if (!G || G.phase !== "one") return;
  const p = G.st.pending.player;
  R.expireOneCard(G.st);
  $("#oneCard").hidden = true;
  bubble(p, "휴~");
  toast("이번엔 그냥 지나갔어요");
  G.phase = "anim";
  later(700, advance);
}

// ---------- 말풍선·알림 ----------
function bubble(p, text) {
  const b = $(`.opp[data-p="${p}"] .bubble`);
  if (!b) return;
  b.textContent = text;
  b.hidden = false;
  b.classList.remove("pop"); void b.offsetWidth; b.classList.add("pop");
  clearTimeout(b._t);
  b._t = setTimeout(() => { b.hidden = true; }, 1600 / SPEED);
}
let toastT = 0;
function toast(text) {
  const t = $("#toast");
  t.textContent = text;
  t.classList.remove("show"); void t.offsetWidth; t.classList.add("show");
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove("show"), 1700 / SPEED);
}
function burst(text, kind) {
  const b = $("#burst");
  b.className = "burst " + kind;
  b.innerHTML = "";
  const t = document.createElement("b");
  t.textContent = text;
  b.appendChild(t);
  for (let i = 0; i < 14; i++) {
    const s = document.createElement("i");
    s.textContent = ["⭐", "✨", "💫", "🌟"][i % 4];
    s.style.setProperty("--a", (i / 14) * 360 + "deg");
    b.appendChild(s);
  }
  b.hidden = false;
  setTimeout(() => { b.hidden = true; }, 1200 / SPEED);
}

// ---------- 끝 ----------
function finish() {
  const st = G.st, w = st.winner, g = gen;
  G.phase = "over";
  cancel(G.hintTimer);
  const k = G.kid;
  S.games[k]++;
  if (w === 0) S.wins[k]++;
  Save.save(S);
  setStatus(w === 0 ? "다 냈다!" : `${OPP[w].name} 승리`);
  later(700, () => {
    if (g !== gen) return;
    const won = w === 0;
    won ? sfx.win() : sfx.lose();
    $("#resultFace").src = won ? G.K.img : OPP[w].img;
    $("#resultTitle").textContent = won ? `${G.K.name} 승리! 🎉` : `${OPP[w].name}가 이겼어요`;
    $("#resultText").textContent = won ? "스티커 1장 받았어요!" : "아깝다! 한 판 더 해 볼까?";
    const n = S.wins[k];
    $("#resultStickers").innerHTML = n ? `<em>🏆 ${n}승</em> <span>${stickerRow(n, 10)}</span>` : "";
    $("#resultStickers").classList.toggle("new", won);
    const conf = $("#confetti");
    conf.innerHTML = "";
    if (won) for (let i = 0; i < 28; i++) {
      const c = document.createElement("i");
      c.style.left = (i * 37) % 100 + "%";
      c.style.setProperty("--d", ((i * 53) % 10) / 10 + "s");
      c.style.background = ["#ff6f61", "#ffc94a", "#4cc9a7", "#5aa7ff", "#c58cff"][i % 5];
      conf.appendChild(c);
    }
    $("#result").classList.toggle("lost", !won);
    $("#result").hidden = false;
  });
}
onTap($("#againBtn"), () => { sfx.pop(); startGame(G ? G.kid : S.last || "jaei"); });
onTap($("#homeBtn"), () => { sfx.tap(); stopAll(); G = null; show("home"); });
onTap($("#quitBtn"), () => { sfx.tap(); stopAll(); G = null; show("home"); });

// 점검용 손잡이(게임에는 영향 없음)
window.__ONECARD = {
  R,
  get G() { return G; },
  get L() { return L; },
  setRng(seed) { rng = R.mulberry32(seed); },
  // 점검: 내 차례에 손패·탁자를 바꿔 놓고 다시 그린다
  rig(fn) { fn(G.st); L.lastN = -1; render(); if (G.st.turn === 0 && G.st.winner < 0 && !G.st.pending) startMyTurn(); },
};

layout();
show("home");
