// 디즈니랜드 줄 서기: 롤러코스터 타기 전, "아직이야?" 투덜 게이지를 달래며 기다린다.
// 진짜 여행에서 아이들이 줄 서는 내내 투덜댔던 기억(라이트닝 패스를 샀는데도!)을 웃음으로 바꾼 장면.
// 줄 선 사람·문·간판은 모두 캔버스로 그린 이 게임만의 것. 실패는 없다: 게이지가 꽉 차면 한바탕 떼쓰고 츄러스로 다시 시작.
import { cover, text, sprite, Particles, Floaters, rr, clamp, rng } from "../engine.js";
import { emo } from "./parkkit.js";

const GRUMBLES = [
  { say: "아직이야?", fix: "mascot" },
  { say: "다리 아파~", fix: "piggy" },
  { say: "배고파!", fix: "popcorn" },
  { say: "언제 타?", fix: "rps" },
  { say: "심심해~", fix: "soap" },
  { say: "목말라~", fix: "drink" },
  { say: "풍선 사 줘!", fix: "balloon" },
];
const FIX_TEXT = {
  piggy: "영차! 업어 줄게 💪",
  popcorn: "팝콘 나눠 먹자 🍿",
  rps: "가위바위보! 이겼다 ✌️",
  soap: "뽀글뽀글 비눗방울~",
  drink: "꿀꺽꿀꺽 시원해 🥤",
  balloon: "풍선 하나, 둘, 셋! 🎈",
};
const MUTTER = ["하아암~", "쿨쿨… zzz", "아직 멀었네…", "다리야~", "배고프다…", "언제 줄어…"];
const SKIN = ["#f6d2b8", "#e9b48f", "#c98d63", "#8d5a3b", "#f3c9a5"];
const SHIRT = ["#ff7a6b", "#4cc9a7", "#2f8fd8", "#c084fc", "#ffd166", "#ff9fc8", "#7ad16b", "#f59e0b", "#5fd4ff"];
const PANTS = ["#3b4a6b", "#5b4636", "#2f6f8f", "#6b4a7b", "#4a4a52", "#8a6a4a"];
const HAIR = ["#3a2a1a", "#6b3e1e", "#1d1d1d", "#c58b3a", "#9a9a9a", "#a0522d"];
const BALLOON = ["#ff5fa2", "#ffd23f", "#5fd4ff", "#9b7bff", "#7cf06b"];

export function createQueue(env, opt = {}) {
  const { sfx } = env;
  const easy = env.easy;
  const mascot = opt.mascot;
  const fx = new Particles(), fl = new Floaters();
  const r = rng(23);
  const RISE = easy ? 0.03 : 0.04;      // 가만히 있어도 차오르는 투덜
  const SPAWN = easy ? 2.1 : 1.7;       // 투덜 말풍선 간격(초)
  const LIFE = easy ? 6.5 : 5.2;        // 말풍선이 버티는 시간
  const SPEED = opt.speed || 1;         // 두 번째 줄부터는 더 짧다
  const AUTO = 0.0095 * SPEED;          // 줄이 저절로 줄어드는 속도(진행도/초)
  const CHEER = 0.022 * SPEED;          // 달래 줄 때마다 줄이 조금 앞으로
  const ZAP = SPEED > 1 ? 0.3 : 0.26;   // 라이트닝 패스 한 번
  const M = opt.minutes || 60;          // 간판에 처음 적힌 시간
  const BADGE = opt.badgeNeed || (easy ? 4 : 5); // 참을성 배지: 하루 동안 이만큼 달래면
  const before = opt.cheeredBefore || 0;
  const GATE = opt.gate || { name: "별빛 코스터", icon: "🎢", c: "#ff6fb0" };
  const MAXP = opt.passes == null ? 2 : opt.passes;
  const JOKES = ["어? 라이트닝 패스 줄도 있네?!", "여기도 라이트닝 줄이 있어?!", "라이트닝 줄에도 또 줄이?!"];
  let state = "wait", st = 0, t = 0, done = false;
  let meter = 0.12, passes = MAXP, cheered = 0, melts = 0, spawnT = 1.4, mutterT = 2.5, hintT = 0, newT = 7, gi = r() * GRUMBLES.length | 0;
  let jokeT = 0, jokeN = opt.jokeIndex || 0, signPop = 0, lastMin = M, flash = 0, zipFrom = 0, zipTo = 0, walker = null, walkerN = 0, botT = 0, said = false;
  const bubbles = [], props = [], soaps = [], trail = [];
  const hap = { player: 0, buddy: 0 }, hop = { player: 0, buddy: 0 };
  let whoNext = "player", jokeMsg = JOKES[0];

  // ---------- 줄 모양(지그재그) ----------
  let geo = null, gKey = "";
  function layout() {
    const W = env.W, H = env.H, key = W + "x" + H;
    if (geo && gKey === key) return geo;
    gKey = key;
    const U = clamp(Math.min(W, H) / 820, 0.7, 1.3);
    const port = H > W * 1.05;
    const n = port ? 5 : 3; // 홀수 줄: 맨 아랫줄은 왼쪽 화면 밖에서 들어온다
    const top = H * (port ? 0.43 : 0.5), bot = H - 62 * U;
    const ys = [];
    for (let i = 0; i < n; i++) ys.push(top + (bot - top) * i / (n - 1));
    const xL = W * 0.08, xR = W * 0.7, gx = W * 0.85, gy = ys[0];
    const pts = [[gx, gy]];
    for (let i = 0; i < n; i++) {
      const x = i % 2 === 0 ? xL : xR;
      if (i === n - 1) pts.push([-90 * U, ys[i]]);
      else { pts.push([x, ys[i]]); pts.push([x, ys[i + 1]]); }
    }
    pts.reverse(); // 뒤(화면 밖) → 앞(문)
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    geo = { W, H, U, n, ys, xL, xR, gx, gy, pts, cum, total: cum[cum.length - 1], port };
    return geo;
  }
  function pointAt(g, s) {
    const d = clamp(s, 0, 1) * g.total;
    let i = 1;
    while (i < g.cum.length - 1 && g.cum[i] < d) i++;
    const a = g.pts[i - 1], b = g.pts[i], seg = g.cum[i] - g.cum[i - 1] || 1, k = (d - g.cum[i - 1]) / seg;
    const p = [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
    if (s > 1) p[0] += (s - 1) * g.total * 0.6; // 문 안으로 걸어 들어간다
    return p;
  }

  const g0 = layout();
  const gap = 70 * g0.U / g0.total;               // 사람 사이 간격(진행 좌표)
  const s0 = (g0.W * 0.17 + 90 * g0.U) / g0.total; // 처음 아이들이 선 자리(맨 뒤)
  const END = 1 - 0.004;
  let ks = s0, ksd = s0;
  const qOf = s => clamp((s - s0) / (END - s0), 0, 1);

  // ---------- 줄 선 사람들 ----------
  const people = [];
  function makePerson(s) {
    const kid = r() < 0.2;
    const x = r();
    const extra = x < 0.12 ? "balloon" : x < 0.22 ? "popcorn" : x < 0.32 ? "phone" : x < 0.4 ? "icecream" : x < 0.45 ? "sleepy" : "";
    return {
      s, d: s, kid, h: kid ? 62 : 92 + r() * 14, skin: SKIN[r() * SKIN.length | 0], shirt: SHIRT[r() * SHIRT.length | 0],
      pants: PANTS[r() * PANTS.length | 0], hair: HAIR[r() * HAIR.length | 0], long: r() < 0.4, hat: r() < 0.22 ? 1 : r() < 0.18 ? 2 : 0,
      hatC: SHIRT[r() * SHIRT.length | 0], bal: BALLOON[r() * BALLOON.length | 0], extra, ph: r() * 6, lit: false, litT: 0, say: "", sayT: 0, alpha: 1,
    };
  }
  for (let s = ks + gap; s < 1.02; s += gap * (0.92 + r() * 0.16)) people.push(makePerson(s));

  function adv(dq) {
    if (dq <= 0) return;
    const ds = Math.min(dq * (END - s0), END - ks);
    ks += ds;
    for (const p of people) p.s += ds;
  }

  function kidsAt(g) {
    const hp = (env.player === "taeo" ? 116 : 132) * g.U, hb = (env.buddy === "taeo" ? 116 : 132) * g.U;
    const a = pointAt(g, ksd), b = pointAt(g, ksd - gap * 0.85);
    const yo = who => (hop[who] > 0 ? -Math.sin(Math.PI * (1 - hop[who] / 0.9)) * 46 * g.U : 0);
    return { player: { x: a[0], y: a[1], h: hp, yo: yo("player") }, buddy: { x: b[0], y: b[1], h: hb, yo: yo("buddy") } };
  }

  // ---------- 라이트닝 패스 버튼 ----------
  function button(g) { return { x: g.W - 96 * g.U, y: g.H - 104 * g.U, r: 68 * g.U }; }
  const zapRoom = () => 1 - gap * 4.6 - ks;
  const canPass = () => state === "wait" && passes > 0 && zapRoom() > 0.04;

  // ---------- 말풍선 ----------
  function spawnBubble() {
    const busy = new Set(bubbles.map(b => b.who));
    let who = whoNext;
    if (busy.has(who)) who = who === "player" ? "buddy" : "player";
    if (busy.has(who)) return;
    whoNext = who === "player" ? "buddy" : "player";
    gi = (gi + 1 + (r() * 3 | 0)) % GRUMBLES.length;
    bubbles.push({ who, g: GRUMBLES[gi], age: 0, life: LIFE, x: 0, y: 0, w: 0, h: 0 });
    sfx.tap();
  }
  function placeBubbles(g) {
    const k = kidsAt(g), U = g.U, fs = 30 * U;
    const playerLeft = k.player.x < k.buddy.x - 1 || (Math.abs(k.player.x - k.buddy.x) <= 1 && k.player.x > g.W / 2);
    for (const b of bubbles) {
      const kid = k[b.who];
      const len = b.g.say.length;
      b.w = len * fs * 0.92 + 44 * U; b.h = 66 * U; b.fs = fs;
      const goLeft = b.who === "player" ? playerLeft : !playerLeft;
      let cx = kid.x + (goLeft ? -1 : 1) * (b.w / 2 - 24 * U);
      cx = clamp(cx, b.w / 2 + 8, g.W - b.w / 2 - 8);
      let cy = kid.y + kid.yo - kid.h - b.h / 2 - 22 * U;
      cy = Math.max(cy, 196 * U + b.h / 2);
      b.x = cx; b.y = cy; b.tx = kid.x; b.ty = kid.y + kid.yo - kid.h * 0.9;
    }
  }

  function cheer(b) {
    const i = bubbles.indexOf(b);
    if (i >= 0) bubbles.splice(i, 1);
    cheered++;
    meter = Math.max(0, meter - 0.22);
    adv(CHEER);
    hap[b.who] = 1.1;
    const g = layout(), k = kidsAt(g)[b.who], U = g.U;
    const hx = k.x, hy = k.y - k.h * 0.55;
    sfx.pop(); sfx.star();
    fx.burst(b.x, b.y, 12, { color: ["#ff9fc8", "#ffd23f", "#fff"], kind: "star", speed: 240, size: 5, gravity: 200 });
    const fix = b.g.fix;
    let say = FIX_TEXT[fix];
    if (fix === "mascot") {
      const kind = walkerN++ % 2 ? "bear" : "bunny";
      say = kind === "bunny" ? "구름토끼다! 안녕~ 👋" : "별곰이다! 안녕~ 👋";
      walker = { kind, x: -120 * U, y: Math.min(g.H - 4, k.y + 54 * U), age: 0 };
    } else if (fix === "piggy") hop[b.who] = 0.9;
    else if (fix === "popcorn") {
      props.push({ kind: "popcorn", who: b.who, age: 0, life: 1.5 });
      fx.burst(hx, hy, 16, { color: ["#fff8e0", "#ffe08a", "#fff"], speed: 260, size: 6, gravity: 700, angle: -Math.PI / 2, spread: 1.6 });
    } else if (fix === "rps") props.push({ kind: "rps", who: b.who, age: 0, life: 1.6 });
    else if (fix === "drink") props.push({ kind: "drink", who: b.who, age: 0, life: 1.5 });
    else if (fix === "soap") {
      for (let j = 0; j < 9; j++) soaps.push({ x: hx + (r() - 0.5) * 60 * U, y: hy - 20 * U, vx: (r() - 0.5) * 80 * U, vy: -(60 + r() * 90) * U, rad: (8 + r() * 14) * U, age: 0, life: 2 + r() });
    } else if (fix === "balloon") {
      for (let j = 0; j < 3; j++) props.push({ kind: "balloon", who: b.who, age: -j * 0.25, life: 2.6, dx: (j - 1) * 34 * U, c: BALLOON[(j + walkerN) % BALLOON.length] });
    }
    fl.add(say, clamp(hx, 150 * U, g.W - 150 * U), Math.max(hy - k.h * 0.6, 200 * U), "#fff36b", 28 * U);
  }

  function useZap() {
    passes--;
    state = "zip"; st = 0;
    zipFrom = ks;
    zipTo = ks + Math.min(ZAP * (END - s0), zapRoom());
    // 내려앉을 자리를 비우고, 뒤에 있던 사람들은 빈자리만큼 앞으로
    for (let i = people.length - 1; i >= 0; i--) {
      const p = people[i];
      if (p.s > zipTo - gap * 1.7 && p.s < zipTo + gap * 0.8) people.splice(i, 1);
      else if (p.s < zipFrom) p.s += gap * 1.8;
    }
    bubbles.length = 0;
    flash = 0.7; trail.length = 0;
    sfx.whoosh(); sfx.launch();
    hap.player = hap.buddy = 1.6;
  }
  function land() {
    ks = zipTo; ksd = zipTo;
    state = "wait"; st = 0;
    flash = 0.35;
    const ahead = people.filter(p => p.s > ks).sort((a, b) => a.s - b.s).slice(0, 3);
    ahead.forEach((p, i) => { p.lit = true; p.litT = -0.35 - i * 0.18; });
    if (ahead[0]) { ahead[0].say = jokeN % 2 ? "우리도 ⚡ 패스!" : "우리도 ⚡ 패스~"; ahead[0].sayT = -1.1; }
    jokeT = 2.9; jokeMsg = JOKES[jokeN % JOKES.length]; jokeN++;
    spawnT = 2.6;
    sfx.coin();
    const g = layout(), k = kidsAt(g).player;
    fx.burst(k.x, k.y - k.h * 0.5, 26, { color: ["#ffe14d", "#fff", "#ffb300"], kind: "star", speed: 360, size: 6, gravity: 250 });
  }
  function startMelt() {
    state = "melt"; st = 0; melts++;
    bubbles.length = 0;
    sfx.hit();
  }

  function minutes() {
    if (ks >= END - 1e-4) return 0;
    return Math.max(5, Math.ceil(M * (1 - qOf(ks)) / 5) * 5);
  }

  const api = {
    get done() { return done; },
    get cheered() { return cheered; },
    get melts() { return melts; },
    progress: () => qOf(ksd),
    update(dt) {
      t += dt; st += dt;
      const g = layout(), U = g.U;
      if (!said && t > 0.3) { said = true; env.toast(opt.first === false ? "또 줄이야?! 말풍선을 콕콕 달래 줘요 💬" : "앗, 줄이 길어요! 말풍선을 콕 눌러 달래 줘요 💬", 3200); }
      if (state === "wait") {
        meter = clamp(meter + RISE * dt, 0, 1);
        adv(AUTO * dt);
        if (jokeT <= 0) {
          spawnT -= dt;
          if (spawnT <= 0) { spawnBubble(); spawnT = SPAWN * (0.8 + r() * 0.4); }
        }
        for (let i = bubbles.length - 1; i >= 0; i--) {
          const b = bubbles[i];
          b.age += dt;
          if (b.age > b.life) {
            bubbles.splice(i, 1);
            meter = clamp(meter + 0.12, 0, 1);
            fl.add("칫…", b.x, b.y, "#ffb0b0", 26 * U);
            sfx.wrong();
          }
        }
        hintT += dt;
        if (passes > 0 && hintT > 9 && canPass()) { hintT = -14; env.toast("⚡ 라이트닝 패스를 눌러 봐요!", 2600); }
        if (meter >= 1) startMelt();
        else if (ks >= END - 1e-4) { state = "board"; st = 0; bubbles.length = 0; sfx.fanfare(); hap.player = hap.buddy = 3; }
      } else if (state === "zip") {
        const p = clamp(st / 0.8, 0, 1), e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        ksd = zipFrom + (zipTo - zipFrom) * e;
        trail.unshift(ksd); if (trail.length > 7) trail.pop();
        if (p >= 1) land();
      } else if (state === "melt") {
        if (st > 1.5 && st - dt <= 1.5) sfx.chime(76);
        if (st > 3.1) {
          state = "wait"; st = 0; meter = 0.3; spawnT = 2.2;
          hap.player = hap.buddy = 1.4;
          props.push({ kind: "churro", who: "player", age: 0, life: 3 }, { kind: "churro", who: "buddy", age: 0, life: 3 });
          sfx.level();
        }
      } else if (state === "board") {
        if (st > 0.2 && Math.random() < dt * 6) fx.burst(g.W * (0.2 + Math.random() * 0.6), g.H * (0.25 + Math.random() * 0.2), 24, { color: ["#ff5fa2", "#ffd23f", "#5fd4ff", "#9b7bff", "#7cf06b"], speed: 380 * U, size: 6, gravity: 420, life: 1.4 });
        if (st > 2.4) { state = "done"; done = true; }
      }
      if (state !== "zip") ksd += (ks - ksd) * Math.min(1, dt * 3);
      for (const p of people) {
        p.d += (p.s - p.d) * Math.min(1, dt * 2.6);
        if (p.litT < 1) p.litT += dt;
        if (p.sayT < 2.2) p.sayT += dt;
      }
      // 맨 앞 사람은 문 안으로 사라진다
      for (let i = people.length - 1; i >= 0; i--) if (people[i].d > 1 + gap * 1.2) people.splice(i, 1);
      // 뒤에도 사람들이 자꾸 와서 줄을 선다
      newT -= dt;
      if (newT <= 0 && state === "wait") {
        const kidBack = ks - gap * 0.85;
        const back = people.reduce((m, p) => (p.s < kidBack ? Math.min(m, p.s) : m), kidBack);
        if (back - gap >= 0) {
          const p = makePerson(back - gap); p.d = 0; people.push(p);
          if (r() < 0.5) { p.say = "와, 줄 길다~"; p.sayT = -0.8; }
          newT = 3 + r() * 3;
        } else newT = 1;
      }
      // 어른들도 투덜투덜
      mutterT -= dt;
      if (mutterT <= 0) {
        mutterT = 3.5 + r() * 3;
        const vis = people.filter(p => !p.lit && p.sayT >= 2.2 && p.d > ks + gap && p.d < 0.98);
        if (vis.length) { const p = vis[r() * vis.length | 0]; p.say = MUTTER[r() * MUTTER.length | 0]; p.sayT = 0; }
      }
      if (walker) { walker.age += dt; walker.x += 300 * U * dt; if (walker.x > g.W + 140 * U) walker = null; }
      for (const s of soaps) { s.age += dt; s.x += s.vx * dt + Math.sin(s.age * 4) * 0.6; s.y += s.vy * dt; }
      for (let i = soaps.length - 1; i >= 0; i--) if (soaps[i].age > soaps[i].life) { const s = soaps[i]; fx.burst(s.x, s.y, 5, { color: ["#d8f6ff", "#fff"], speed: 90, size: 3, gravity: 0, life: 0.4 }); soaps.splice(i, 1); }
      for (const p of props) p.age += dt;
      for (let i = props.length - 1; i >= 0; i--) if (props[i].age > props[i].life) props.splice(i, 1);
      for (const w of ["player", "buddy"]) { hap[w] = Math.max(0, hap[w] - dt); hop[w] = Math.max(0, hop[w] - dt); }
      jokeT = Math.max(0, jokeT - dt);
      flash = Math.max(0, flash - dt * 1.4);
      signPop = Math.max(0, signPop - dt);
      const m = minutes();
      if (m !== lastMin) {
        const drop = lastMin - m;
        if (drop >= 10) fl.add(`-${drop}분!`, g.gx, g.gy - 330 * U * 0.5, "#7cf06b", 34 * U);
        lastMin = m; signPop = 0.45;
      }
      env.setScore(m > 0 ? `⏳ ${m}분` : "🎢 탄다!");
      placeBubbles(g);
      fx.update(dt); fl.update(dt);
    },
    down(x, y) {
      if (state !== "wait") return;
      const g = layout(), U = g.U, bt = button(g);
      if (Math.hypot(x - bt.x, y - bt.y) < bt.r + 16 * U) {
        if (canPass()) useZap();
        else { sfx.wrong(); env.toast(passes > 0 ? "거의 다 왔어요! 조금만 더 🙂" : "라이트닝 패스를 다 썼어요 ⚡", 1800); }
        return;
      }
      let best = null, bd = 1e9;
      for (const b of bubbles) {
        const pad = 22 * U;
        if (Math.abs(x - b.x) < b.w / 2 + pad && Math.abs(y - b.y) < b.h / 2 + pad) {
          const d = Math.hypot(x - b.x, y - b.y);
          if (d < bd) { bd = d; best = b; }
        }
      }
      if (!best) {
        // 아이 몸을 눌러도 그 아이의 투덜을 달래 준다
        const k = kidsAt(g);
        for (const who of ["player", "buddy"]) {
          const kid = k[who];
          if (Math.abs(x - kid.x) < kid.h * 0.32 && y < kid.y + 8 && y > kid.y - kid.h) { best = bubbles.find(b => b.who === who) || null; if (best) break; }
        }
      }
      if (best) cheer(best);
    },
    bot(dt) {
      botT += dt;
      if (botT < 0.3 || state !== "wait") return;
      botT = 0;
      const q = qOf(ks);
      const bt = button(layout());
      if (canPass() && ((MAXP - passes === 0 && q > 0.1) || (MAXP - passes === 1 && q > 0.42))) { api.down(bt.x, bt.y); return; }
      const b = bubbles.find(b => b.age > 0.5);
      if (b) api.down(b.x, b.y);
    },
    info() {
      const bt = button(layout());
      return {
        state, q: qOf(ks), meter, passes, cheered, melts, minutes: minutes(), canPass: canPass(),
        bubbles: bubbles.map(b => ({ x: b.x, y: b.y, say: b.g.say, who: b.who })), button: { x: bt.x, y: bt.y, r: bt.r },
      };
    },
    setMeter(v) { meter = clamp(v, 0, 1); },
    summary: () => ({ state, q: +qOf(ks).toFixed(2), cheered, melts, passes }),

    draw(ctx) {
      const g = layout(), W = g.W, H = g.H, U = g.U;
      cover(ctx, env.img("bg-park"), 0, 0, W, H, 0.15, 0.42, 1.18);
      // 줄 서는 마당
      const gy0 = g.ys[0] - 90 * U;
      const pav = ctx.createLinearGradient(0, gy0, 0, gy0 + 120 * U);
      pav.addColorStop(0, "rgba(250,232,205,0)"); pav.addColorStop(1, "rgba(250,232,205,.82)");
      ctx.fillStyle = pav; ctx.fillRect(0, gy0, W, H - gy0);
      ctx.strokeStyle = "rgba(200,160,120,.25)"; ctx.lineWidth = 2;
      for (let y = gy0 + 140 * U; y < H; y += 56 * U) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      if (state === "melt") { ctx.fillStyle = `rgba(255,80,80,${0.12 + 0.06 * Math.sin(t * 20)})`; ctx.fillRect(0, 0, W, H); }

      drawGate(ctx, g, t, state === "board", GATE);
      drawSign(ctx, g, minutes(), signPop);

      // 앞뒤 순서(발 위치 y)대로 그린다
      const items = [];
      for (let i = 0; i < g.n - 1; i++) {
        const yr = (g.ys[i] + g.ys[i + 1]) / 2, leftOpen = i % 2 === 0;
        items.push({ y: yr, f: () => rope(ctx, leftOpen ? g.xL + 52 * U : g.xL - 34 * U, leftOpen ? g.xR + 34 * U : g.xR - 52 * U, yr, U) });
      }
      for (const p of people) {
        const [x, y] = pointAt(g, p.d);
        if (x < -60 * U || x > W + 60 * U) continue;
        const a = p.d > 1 ? clamp(1 - (p.d - 1) / (gap * 1.2), 0, 1) : 1;
        items.push({ y, f: () => person(ctx, x, y, p.h * U, p, t, Math.abs(p.s - p.d) > gap * 0.06, a) });
        if (p.sayT >= 0 && p.sayT < 2.2 && p.say) items.push({ y: 1e6, f: () => smallBubble(ctx, x, y - p.h * U - 18 * U, p.say, U, p.lit) });
      }
      const k = kidsAt(g);
      const grumpy = meter > 0.66;
      for (const who of ["buddy", "player"]) {
        const kid = k[who];
        items.push({ y: kid.y + (who === "player" ? 0.5 : 0), f: () => drawKid(ctx, who, kid, U, grumpy) });
      }
      if (walker && mascot) items.push({ y: walker.y, f: () => { mascot(ctx, walker.kind, walker.x, walker.y, 0.95 * U, walker.age); text(ctx, "👋", walker.x + 44 * U, walker.y - 120 * U + Math.sin(walker.age * 10) * 6 * U, 34 * U); } });
      items.sort((a, b) => a.y - b.y);
      for (const it of items) it.f();

      // 라이트닝 길
      if (state === "zip") drawBolt(ctx, g);
      // 소품
      for (const p of props) drawProp(ctx, p, k[p.who], U);
      for (const s of soaps) {
        const a = Math.min(1, (s.life - s.age) * 2);
        ctx.globalAlpha = a;
        ctx.strokeStyle = "rgba(120,200,255,.9)"; ctx.lineWidth = 2.5 * U; ctx.fillStyle = "rgba(220,245,255,.25)";
        ctx.beginPath(); ctx.arc(s.x, s.y, s.rad, 0, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,.8)"; ctx.beginPath(); ctx.arc(s.x - s.rad * 0.35, s.y - s.rad * 0.35, s.rad * 0.22, 0, 7); ctx.fill();
        ctx.globalAlpha = 1;
      }
      fx.draw(ctx);
      // 투덜 말풍선
      for (const b of bubbles) drawBubble(ctx, b, U, t);
      if (jokeT > 0 && jokeT < 2.6) {
        const kid = k.player;
        bigBubble(ctx, jokeMsg, clamp(kid.x, 250 * U, W - 250 * U), Math.max(kid.y - kid.h - 70 * U, 230 * U), kid.x, kid.y - kid.h * 0.9, U, Math.min(1, (2.6 - jokeT) * 5));
        if (jokeT > 2.4) sfxOnce("joke" + jokeN, () => sfx.wrong());
      }
      if (state === "melt") {
        bigBubble(ctx, "으아앙~ 못 기다려!!", clamp(k.player.x, 220 * U, W - 220 * U), Math.max(k.player.y - 210 * U, 230 * U), k.player.x, k.player.y - 40 * U, U, Math.min(1, st * 5), "#ffe0e0");
        if (st > 1.4) banner(ctx, "엄마 아빠: 알았어~ 츄러스 먹으면서 기다리자!", W / 2, 268 * U, U, Math.min(1, (st - 1.4) * 4));
      }
      drawMeter(ctx, g, meter, t, state === "melt");
      drawButton(ctx, g, button(g), passes, MAXP, canPass(), t);
      fl.draw(ctx);
      if (flash > 0) { ctx.fillStyle = `rgba(255,250,200,${Math.min(0.7, flash)})`; ctx.fillRect(0, 0, W, H); }
      if (state === "zip" && st < 0.8) text(ctx, "⚡ 라이트닝 패스! 휙~", W / 2, H * 0.3, 54 * U, { color: "#fff36b", stroke: "#7a4b00" });
      if (state === "board" || state === "done") {
        const s = Math.min(1, st * 3);
        text(ctx, "드디어 탄다! 🎢", W / 2, H * 0.3, 92 * U * (0.6 + 0.4 * s) * (1 + Math.max(0, 0.1 - Math.abs(st - 0.35)) * 2), { color: "#fff", stroke: "#ff5fa2", lw: 16 * U });
        if (before < BADGE && before + cheered >= BADGE) text(ctx, "🏅 참을성 배지!", W / 2, H * 0.3 + 86 * U, 40 * U, { color: "#ffe14d", stroke: "#7a4b00" });
      }
    },
  };

  const once = new Set();
  function sfxOnce(key, f) { if (!once.has(key)) { once.add(key); f(); } }

  function drawKid(ctx, who, kid, U, grumpy) {
    const melt = state === "melt";
    const happy = hap[who] > 0 || state === "board" || state === "done" || state === "zip";
    const img = env.kid(happy && !melt ? "cheer" : "travel", who);
    ctx.save();
    ctx.translate(kid.x, kid.y + kid.yo);
    ctx.fillStyle = "rgba(70,40,40,.2)"; ctx.beginPath(); ctx.ellipse(0, 0, kid.h * 0.22, 7 * U, 0, 0, 7); ctx.fill();
    if (melt) {
      // 바닥에 드러누워 발버둥
      const lie = Math.min(1, st * 4) * (who === "player" ? -1.42 : 1.42);
      ctx.translate(0, -8 * U);
      ctx.rotate(lie + Math.sin(t * 22 + (who === "player" ? 0 : 1)) * 0.08);
    } else if (grumpy) {
      ctx.rotate(Math.sin(t * 9 + (who === "player" ? 0 : 2)) * 0.05);
      ctx.scale(1.02, 0.96);
    }
    if (state === "zip") {
      ctx.globalAlpha = 1;
    }
    sprite(ctx, img, 0, 0, kid.h);
    ctx.restore();
    if (state === "zip") {
      // 잔상
      const g = layout();
      trail.forEach((s, i) => {
        if (i === 0) return;
        const p = pointAt(g, s - (who === "buddy" ? gap * 0.85 : 0));
        sprite(ctx, img, p[0], p[1], kid.h, false, 0.28 * (1 - i / trail.length));
      });
    }
    if (grumpy && !melt && state === "wait") {
      text(ctx, "💢", kid.x + kid.h * 0.24, kid.y + kid.yo - kid.h * 0.92 + Math.sin(t * 8) * 3 * U, 30 * U);
    }
  }

  function drawBolt(ctx, g) {
    const U = g.U, pts = [];
    const n = 26;
    for (let i = 0; i <= n; i++) {
      const s = zipFrom + (ksd - zipFrom) * i / n;
      const p = pointAt(g, s);
      const j = i === 0 || i === n ? 0 : 1;
      pts.push([p[0] + (Math.random() - 0.5) * 26 * U * j, p[1] - 70 * U + (Math.random() - 0.5) * 26 * U * j]);
    }
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    [[20 * U, "rgba(255,225,77,.35)"], [9 * U, "#ffd23f"], [3.5 * U, "#fff"]].forEach(([w, c]) => {
      ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
      ctx.stroke();
    });
  }

  function drawProp(ctx, p, kid, U) {
    if (!kid || p.age < 0) return;
    const hx = kid.x + kid.h * 0.18, hy = kid.y + kid.yo - kid.h * 0.48;
    const a = Math.min(1, (p.life - p.age) * 3);
    ctx.globalAlpha = a;
    if (p.kind === "popcorn") emo(ctx, "🍿", hx, hy - Math.abs(Math.sin(p.age * 8)) * 8 * U, 46 * U);
    else if (p.kind === "drink") { ctx.save(); ctx.translate(hx, hy); ctx.rotate(-0.3 + Math.sin(p.age * 6) * 0.15); emo(ctx, "🥤", 0, 0, 46 * U); ctx.restore(); }
    else if (p.kind === "rps") {
      const hands = ["✊", "✌️", "✋"];
      const ch = p.age < 0.9 ? hands[Math.floor(p.age / 0.12) % 3] : "✌️";
      const y = kid.y + kid.yo - kid.h - 34 * U;
      emo(ctx, ch, kid.x - 34 * U, y, 50 * U);
      emo(ctx, p.age < 0.9 ? hands[(Math.floor(p.age / 0.12) + 1) % 3] : "✋", kid.x + 34 * U, y, 50 * U);
    } else if (p.kind === "balloon") {
      const bx = kid.x + p.dx + Math.sin(p.age * 3 + p.dx) * 8 * U, by = hy - p.age * 120 * U - 40 * U;
      ctx.strokeStyle = "rgba(90,70,70,.7)"; ctx.lineWidth = 1.5 * U;
      ctx.beginPath(); ctx.moveTo(bx, by + 22 * U); ctx.quadraticCurveTo(bx - 6 * U, by + 46 * U, bx + 2 * U, by + 66 * U); ctx.stroke();
      ctx.fillStyle = p.c; ctx.beginPath(); ctx.ellipse(bx, by, 17 * U, 21 * U, 0, 0, 7); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.beginPath(); ctx.arc(bx - 6 * U, by - 8 * U, 4.5 * U, 0, 7); ctx.fill();
    } else if (p.kind === "churro") {
      // 손에 든 츄러스(작게, 몸 옆으로)
      ctx.save(); ctx.translate(kid.x + kid.h * 0.3, kid.y + kid.yo - kid.h * 0.4); ctx.rotate(0.35);
      ctx.fillStyle = "#c9832e"; rr(ctx, -4.5 * U, -34 * U, 9 * U, 38 * U, 4 * U); ctx.fill();
      ctx.strokeStyle = "#8a5418"; ctx.lineWidth = 1.2 * U;
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-4.5 * U, -28 * U + i * 8 * U); ctx.lineTo(4.5 * U, -25 * U + i * 8 * U); ctx.stroke(); }
      ctx.fillStyle = "#fff4d6"; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc((i % 2 ? 2 : -2) * U, -30 * U + i * 6 * U, 1.2 * U, 0, 7); ctx.fill(); }
      ctx.fillStyle = "#fff"; rr(ctx, -6 * U, -2 * U, 12 * U, 10 * U, 2 * U); ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  return api;
}

// ---------- 그리기 도구 ----------
function rope(ctx, x0, x1, y, U) {
  const n = Math.max(2, Math.round((x1 - x0) / (120 * U)));
  const step = (x1 - x0) / n, top = y - 38 * U;
  ctx.strokeStyle = "#b0284c"; ctx.lineWidth = 5 * U; ctx.lineCap = "round";
  ctx.beginPath();
  for (let i = 0; i < n; i++) { const a = x0 + i * step; ctx.moveTo(a, top); ctx.quadraticCurveTo(a + step / 2, top + 14 * U, a + step, top); }
  ctx.stroke();
  for (let i = 0; i <= n; i++) {
    const x = x0 + i * step;
    ctx.fillStyle = "rgba(70,40,40,.18)"; ctx.beginPath(); ctx.ellipse(x, y, 10 * U, 3.5 * U, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = "#6b6b78"; ctx.lineWidth = 5 * U;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, top - 4 * U); ctx.stroke();
    ctx.fillStyle = "#e8b931"; ctx.beginPath(); ctx.arc(x, top - 6 * U, 5 * U, 0, 7); ctx.fill();
  }
}

function person(ctx, x, y, h, v, t, walk, alpha) {
  const s = h / 100;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(70,40,40,.18)"; ctx.beginPath(); ctx.ellipse(0, 0, 18 * s, 5 * s, 0, 0, 7); ctx.fill();
  const step = walk ? Math.sin(t * 12 + v.ph) : 0;
  ctx.fillStyle = v.pants;
  rr(ctx, -12 * s, -40 * s - step * 3 * s, 10 * s, 40 * s + step * 3 * s, 4 * s); ctx.fill();
  rr(ctx, 2 * s, -40 * s + step * 3 * s, 10 * s, 40 * s - step * 3 * s, 4 * s); ctx.fill();
  ctx.translate(0, -(walk ? Math.abs(step) * 3 * s : Math.sin(t * 1.6 + v.ph) * 1.2 * s));
  ctx.strokeStyle = v.skin; ctx.lineWidth = 7 * s; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-16 * s, -68 * s); ctx.lineTo(-21 * s, -44 * s); ctx.moveTo(16 * s, -68 * s); ctx.lineTo(21 * s, -44 * s); ctx.stroke();
  ctx.fillStyle = v.shirt; rr(ctx, -17 * s, -78 * s, 34 * s, 44 * s, 12 * s); ctx.fill();
  if (v.long) { ctx.fillStyle = v.hair; rr(ctx, -15 * s, -100 * s, 30 * s, 30 * s, 10 * s); ctx.fill(); }
  ctx.fillStyle = v.skin; ctx.beginPath(); ctx.arc(0, -92 * s, 14 * s, 0, 7); ctx.fill();
  ctx.fillStyle = v.hair; ctx.beginPath(); ctx.arc(0, -94 * s, 14.5 * s, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#2a1a1a"; ctx.strokeStyle = "#2a1a1a"; ctx.lineWidth = 1.8 * s;
  if (v.extra === "sleepy") { ctx.beginPath(); ctx.moveTo(-8 * s, -91 * s); ctx.lineTo(-3 * s, -91 * s); ctx.moveTo(3 * s, -91 * s); ctx.lineTo(8 * s, -91 * s); ctx.stroke(); }
  else { ctx.beginPath(); ctx.arc(-5 * s, -91 * s, 1.9 * s, 0, 7); ctx.arc(5 * s, -91 * s, 1.9 * s, 0, 7); ctx.fill(); }
  ctx.beginPath(); ctx.moveTo(-4 * s, -84 * s); ctx.lineTo(4 * s, -84 * s); ctx.stroke();
  if (v.lit) {
    const k = clamp(v.litT * 3, 0, 1);
    if (k > 0) {
      ctx.save(); ctx.translate(0, -100 * s); ctx.scale(k, k);
      ctx.fillStyle = "rgba(255,225,77,.35)"; ctx.beginPath(); ctx.arc(0, 0, 26 * s, 0, 7); ctx.fill();
      ctx.fillStyle = "#ffd23f"; ctx.beginPath(); ctx.arc(0, 2 * s, 15 * s, Math.PI, 0); ctx.fill();
      ctx.fillRect(-2 * s, 0, 22 * s, 5 * s);
      ctx.restore();
      ctx.globalAlpha *= k;
      emo(ctx, "⚡", 0, -108 * s, 16 * s);
    }
  } else if (v.hat === 1) {
    ctx.fillStyle = v.hatC; ctx.beginPath(); ctx.arc(0, -98 * s, 14.5 * s, Math.PI, 0); ctx.fill(); ctx.fillRect(-2 * s, -100 * s, 22 * s, 5 * s);
  } else if (v.hat === 2) {
    ctx.fillStyle = "#ff5fa2"; ctx.beginPath(); ctx.ellipse(-10 * s, -104 * s, 7 * s, 4.5 * s, -0.5, 0, 7); ctx.ellipse(-2 * s, -108 * s, 7 * s, 4.5 * s, 0.5, 0, 7); ctx.fill();
  }
  if (v.extra === "balloon") {
    ctx.strokeStyle = "rgba(90,70,70,.7)"; ctx.lineWidth = 1.4 * s;
    ctx.beginPath(); ctx.moveTo(21 * s, -44 * s); ctx.lineTo(28 * s, -128 * s); ctx.stroke();
    ctx.fillStyle = v.bal; ctx.beginPath(); ctx.ellipse(28 * s + Math.sin(t * 2 + v.ph) * 2 * s, -144 * s, 14 * s, 17 * s, 0, 0, 7); ctx.fill();
  } else if (v.extra === "popcorn") {
    ctx.fillStyle = "#fff"; rr(ctx, 14 * s, -58 * s, 18 * s, 20 * s, 3 * s); ctx.fill();
    ctx.fillStyle = "#ff5a5a"; ctx.fillRect(17 * s, -58 * s, 4 * s, 20 * s); ctx.fillRect(25 * s, -58 * s, 4 * s, 20 * s);
    ctx.fillStyle = "#fff4c2"; [[17, -60], [23, -63], [29, -60]].forEach(([a, b]) => { ctx.beginPath(); ctx.arc(a * s, b * s, 4.5 * s, 0, 7); ctx.fill(); });
  } else if (v.extra === "phone") {
    ctx.fillStyle = "#2a2a3a"; rr(ctx, -27 * s, -54 * s, 10 * s, 15 * s, 2 * s); ctx.fill();
    ctx.fillStyle = "#8fd8ff"; ctx.fillRect(-25.5 * s, -52 * s, 7 * s, 10 * s);
  } else if (v.extra === "icecream") {
    ctx.fillStyle = "#e0a85a"; ctx.beginPath(); ctx.moveTo(15 * s, -52 * s); ctx.lineTo(27 * s, -52 * s); ctx.lineTo(21 * s, -38 * s); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#ffb3d1"; ctx.beginPath(); ctx.arc(21 * s, -56 * s, 7 * s, 0, 7); ctx.fill();
  }
  ctx.restore();
}

function bubbleShape(ctx, x, y, w, h, tx, ty, U, rad) {
  rr(ctx, x - w / 2, y - h / 2, w, h, rad);
  const bx = clamp(tx, x - w / 2 + rad, x + w / 2 - rad);
  ctx.moveTo(bx - 12 * U, y + h / 2 - 1);
  ctx.lineTo(clamp(tx, bx - 30 * U, bx + 30 * U), Math.max(y + h / 2 + 10 * U, Math.min(ty, y + h / 2 + 30 * U)));
  ctx.lineTo(bx + 12 * U, y + h / 2 - 1);
}

function drawBubble(ctx, b, U, t) {
  const pop = Math.min(1, b.age * 6), late = clamp((b.age / b.life - 0.55) / 0.45, 0, 1);
  const shake = late > 0 ? Math.sin(t * 40) * 3 * U * late : 0;
  ctx.save();
  ctx.translate(b.x + shake, b.y);
  ctx.scale(0.6 + 0.4 * pop, 0.6 + 0.4 * pop);
  ctx.fillStyle = late > 0 ? `rgb(255,${Math.round(255 - 40 * late)},${Math.round(255 - 40 * late)})` : "#fff";
  ctx.strokeStyle = "#5a3a4a"; ctx.lineWidth = 4 * U;
  ctx.beginPath(); bubbleShape(ctx, 0, 0, b.w, b.h, b.tx - b.x, b.ty - b.y, U, 26 * U); ctx.fill(); ctx.stroke();
  text(ctx, b.g.say, 0, 1, b.fs, { color: "#4a2a3a" });
  ctx.restore();
}

function smallBubble(ctx, x, y, str, U, lit) {
  ctx.font = `900 ${Math.round(17 * U)}px "Pretendard", system-ui, sans-serif`;
  const w = ctx.measureText(str).width + 22 * U, h = 30 * U;
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = lit ? "#fff6c2" : "#f2f2f2"; ctx.strokeStyle = lit ? "#c99a00" : "#9a9aa6"; ctx.lineWidth = 2 * U;
  ctx.beginPath(); bubbleShape(ctx, x, y - h / 2, w, h, x, y + 8 * U, U, 12 * U); ctx.fill(); ctx.stroke();
  text(ctx, str, x, y - h / 2 + 1, 17 * U, { color: "#55505a" });
  ctx.globalAlpha = 1;
}

function bigBubble(ctx, str, x, y, tx, ty, U, k, fill = "#fff8c8") {
  const fs = 38 * U;
  ctx.font = `900 ${Math.round(fs)}px "Pretendard", system-ui, sans-serif`;
  const w = ctx.measureText(str).width + 56 * U, h = 82 * U;
  const cw = ctx.canvas.clientWidth || ctx.canvas.width;
  x = Math.max(w / 2 + 8, Math.min(cw - w / 2 - 8, x));
  ctx.save();
  ctx.translate(x, y); ctx.scale(0.5 + 0.5 * k, 0.5 + 0.5 * k); ctx.rotate(-0.03);
  ctx.fillStyle = fill; ctx.strokeStyle = "#5a3a4a"; ctx.lineWidth = 5 * U;
  ctx.beginPath(); bubbleShape(ctx, 0, 0, w, h, tx - x, ty - y, U, 30 * U); ctx.fill(); ctx.stroke();
  text(ctx, str, 0, 2, fs, { color: "#4a2a3a" });
  ctx.restore();
}

function banner(ctx, str, x, y, U, k) {
  const fs = 26 * U;
  ctx.font = `900 ${Math.round(fs)}px "Pretendard", system-ui, sans-serif`;
  const w = Math.min(ctx.canvas.width, ctx.measureText(str).width + 44 * U), h = 56 * U;
  ctx.globalAlpha = k;
  ctx.fillStyle = "rgba(255,255,255,.95)"; ctx.strokeStyle = "#ff9fc8"; ctx.lineWidth = 4 * U;
  rr(ctx, x - w / 2, y - h / 2, w, h, 28 * U); ctx.fill(); ctx.stroke();
  text(ctx, str, x, y + 1, fs, { color: "#5a2a4a" });
  ctx.globalAlpha = 1;
}

function drawMeter(ctx, g, v, t, melt) {
  const U = g.U, x = 16, y = 140 * U, w = Math.min(g.W * 0.42, 400 * U), h = 46 * U;
  const shake = v > 0.8 || melt ? Math.sin(t * 30) * 2.5 * U : 0;
  ctx.save(); ctx.translate(shake, 0);
  ctx.fillStyle = "rgba(255,255,255,.93)"; ctx.strokeStyle = "#5a3a4a"; ctx.lineWidth = 3 * U;
  rr(ctx, x, y, w, h, h / 2); ctx.fill(); ctx.stroke();
  text(ctx, "투덜 게이지", x + 16 * U, y + h / 2 + 1, 19 * U, { color: "#5a3a4a", align: "left" });
  const bx = x + 124 * U, bw = w - 124 * U - 52 * U, bh = 20 * U, by = y + (h - bh) / 2;
  ctx.fillStyle = "#eee3e8"; rr(ctx, bx, by, bw, bh, bh / 2); ctx.fill();
  if (v > 0.01) {
    const gr = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    gr.addColorStop(0, "#7be07b"); gr.addColorStop(0.5, "#ffd23f"); gr.addColorStop(1, "#ff5a5a");
    ctx.fillStyle = gr; rr(ctx, bx, by, Math.max(bh, bw * v), bh, bh / 2); ctx.fill();
  }
  const face = melt ? "😭" : v < 0.35 ? "😊" : v < 0.6 ? "😐" : v < 0.85 ? "😣" : "😫";
  emo(ctx, face, x + w - 28 * U, y + h / 2, 34 * U);
  ctx.restore();
}

function drawButton(ctx, g, b, passes, maxp, on, t) {
  const U = g.U;
  const s = on ? 1 + Math.sin(t * 5) * 0.05 : 1;
  ctx.save(); ctx.translate(b.x, b.y); ctx.scale(s, s);
  if (on) { ctx.fillStyle = "rgba(255,225,77,.35)"; ctx.beginPath(); ctx.arc(0, 0, b.r * 1.25, 0, 7); ctx.fill(); }
  const gr = ctx.createLinearGradient(0, -b.r, 0, b.r);
  gr.addColorStop(0, on ? "#fff07a" : "#e4e4ea"); gr.addColorStop(1, on ? "#ffb300" : "#a9a9b4");
  ctx.fillStyle = gr; ctx.strokeStyle = on ? "#9a5a00" : "#77778a"; ctx.lineWidth = 6 * U;
  ctx.beginPath(); ctx.arc(0, 0, b.r, 0, 7); ctx.fill(); ctx.stroke();
  ctx.globalAlpha = on ? 1 : 0.5;
  emo(ctx, "⚡", 0, -8 * U, b.r * 0.95);
  for (let i = 0; i < maxp; i++) {
    ctx.fillStyle = i < passes ? "#ff5fa2" : "rgba(0,0,0,.18)";
    ctx.beginPath(); ctx.arc((i - (maxp - 1) / 2) * 22 * U, b.r * 0.6, 8 * U, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  text(ctx, passes > 0 ? "라이트닝 패스" : "다 썼어요", b.x, b.y - b.r - 16 * U, 20 * U, { color: "#fff", stroke: "rgba(90,50,0,.85)" });
}

function drawGate(ctx, g, t, party, gate) {
  const U = g.U, x = g.gx, y = g.gy, w = 150 * U, h = 190 * U, pw = 26 * U;
  const dark = ctx.createLinearGradient(0, y - h, 0, y);
  dark.addColorStop(0, "#3b2a5a"); dark.addColorStop(1, "#1d1430");
  ctx.fillStyle = dark;
  ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.lineTo(x - w / 2, y - h + w / 2); ctx.arc(x, y - h + w / 2, w / 2, Math.PI, 0); ctx.lineTo(x + w / 2, y); ctx.closePath(); ctx.fill();
  for (const sx of [-1, 1]) {
    const px = x + sx * (w / 2) - pw / 2;
    ctx.fillStyle = "#fff"; rr(ctx, px, y - h + w / 2 - 6 * U, pw, h - w / 2 + 6 * U, 8 * U); ctx.fill();
    ctx.save(); ctx.beginPath(); rr(ctx, px, y - h + w / 2 - 6 * U, pw, h - w / 2 + 6 * U, 8 * U); ctx.clip();
    ctx.fillStyle = gate.c;
    for (let k = -2; k < 12; k++) { const yy = y - h + w / 2 + k * 22 * U; ctx.beginPath(); ctx.moveTo(px, yy); ctx.lineTo(px + pw, yy - 12 * U); ctx.lineTo(px + pw, yy - 2 * U); ctx.lineTo(px, yy + 10 * U); ctx.fill(); }
    ctx.restore();
  }
  ctx.strokeStyle = gate.c; ctx.lineWidth = 22 * U;
  ctx.beginPath(); ctx.arc(x, y - h + w / 2, w / 2, Math.PI, 0); ctx.stroke();
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI + i * Math.PI / 8, on = party ? Math.sin(t * 12 + i) > 0 : Math.sin(t * 3 + i * 0.8) > -0.3;
    ctx.fillStyle = on ? "#fff36b" : "#b98aa8";
    ctx.beginPath(); ctx.arc(x + Math.cos(a) * w / 2, y - h + w / 2 + Math.sin(a) * w / 2, 4.5 * U, 0, 7); ctx.fill();
  }
  ctx.fillStyle = "#7b4bd0"; ctx.strokeStyle = "#fff"; ctx.lineWidth = 3 * U;
  rr(ctx, x - 84 * U, y - h - 20 * U, 168 * U, 40 * U, 14 * U); ctx.fill(); ctx.stroke();
  text(ctx, `${gate.icon} ${gate.name}`, x, y - h, 23 * U, { color: "#fff" });
}

function drawSign(ctx, g, min, pop) {
  const U = g.U, x = g.gx, y = g.gy - 190 * U - 84 * U, w = 210 * U, h = 92 * U;
  const s = 1 + Math.sin(Math.min(1, pop / 0.45) * Math.PI) * 0.12;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.strokeStyle = "#7a5230"; ctx.lineWidth = 6 * U;
  ctx.beginPath(); ctx.moveTo(-60 * U, h / 2); ctx.lineTo(-60 * U, h / 2 + 30 * U); ctx.moveTo(60 * U, h / 2); ctx.lineTo(60 * U, h / 2 + 30 * U); ctx.stroke();
  ctx.fillStyle = "#fffaf0"; ctx.strokeStyle = "#3b2a5a"; ctx.lineWidth = 5 * U;
  rr(ctx, -w / 2, -h / 2, w, h, 16 * U); ctx.fill(); ctx.stroke();
  text(ctx, "기다리는 시간", 0, -h / 2 + 22 * U, 19 * U, { color: "#5a3a4a" });
  text(ctx, min > 0 ? `${min}분` : "지금!", 0, 14 * U, 44 * U, { color: min > 30 ? "#e0344f" : min > 10 ? "#e08a00" : "#1f9a5a" });
  ctx.restore();
}
