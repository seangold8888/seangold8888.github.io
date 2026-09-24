// 재이와 태오의 멀티버스 2 — 90초 히어로 미션.
// 혼자 하는 게임: 고른 아이가 주인공, 다른 아이는 컴퓨터 동료. 깨면 별, 별로 캡슐, 캡슐로 꾸미기.
(function () {
  "use strict";

  var D = window.MV_DATA;
  var Save = window.MVSave;
  var W = 1280, H = 720;
  var GROUND_TOP = 560, GROUND_BOTTOM = 705;
  var HERO_H = 236;
  var state = Save.load(D);

  // ---------- 공통 도구 ----------
  function $(id) { return document.getElementById(id); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
  function depthScale(y) { return 0.82 + 0.28 * (y - GROUND_TOP) / (GROUND_BOTTOM - GROUND_TOP); }
  function itemById(id) { return D.ITEMS.filter(function (it) { return it.id === id; })[0] || null; }
  function wearing(kid, slot) { var o = state.outfit[kid]; return o && o[slot] ? itemById(o[slot]) : null; }
  function persist() { Save.save(state); }
  function other(kid) { return state.buddy && state.buddy !== kid ? state.buddy : D.BUDDY[kid]; }
  function heroHeight(kid) { return HERO_H * (D.HEROES[kid].scale || 1); }

  var images = {};
  function image(src) {
    if (!images[src]) { var im = new Image(); im.decoding = "async"; im.src = src; images[src] = im; }
    return images[src];
  }
  function ready(im) { return im && im.complete && im.naturalWidth > 0; }
  // 맞았을 때 번쩍이는 흰 그림을 한 번만 만들어 둔다(사파리 캔버스는 filter를 못 쓴다).
  var whiteCache = {};
  function whiteOf(im) {
    if (!ready(im)) return null;
    if (whiteCache[im.src]) return whiteCache[im.src];
    var c = document.createElement("canvas");
    c.width = im.naturalWidth; c.height = im.naturalHeight;
    var g = c.getContext("2d");
    g.drawImage(im, 0, 0);
    g.globalCompositeOperation = "source-in";
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, c.width, c.height);
    whiteCache[im.src] = c;
    return c;
  }
  function preload() {
    Object.keys(D.HEROES).forEach(function (kid) {
      Object.keys(D.HEROES[kid].poses).forEach(function (p) { image(D.HEROES[kid].poses[p].src); });
    });
    Object.keys(D.ENEMIES).forEach(function (k) { image(D.ENEMIES[k].src); });
    Object.keys(D.BOSSES).forEach(function (k) { image(D.BOSSES[k].src); });
    D.WORLDS.forEach(function (w) { image(w.bg); });
  }

  // ---------- 소리 ----------
  var muted = false;
  try { muted = localStorage.getItem("mv2_muted") === "1"; } catch (e) {}
  var bgm = window.HubBgm ? window.HubBgm.create({ basePath: "../assets/bgm/", volume: 0.55 }) : null;
  if (bgm) { bgm.setMuted(muted); bgm.setTrack("avengers"); }
  var Sfx = (function () {
    var ac = null;
    function ctx() {
      if (!ac) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ac = new AC();
      }
      if (ac.state === "suspended") ac.resume();
      return ac;
    }
    function tone(freq, dur, type, vol, slide, delay) {
      if (muted) return;
      var a = ctx(); if (!a) return;
      var t = a.currentTime + (delay || 0);
      var o = a.createOscillator(), g = a.createGain();
      o.type = type || "square";
      o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
      g.gain.setValueAtTime(vol || 0.12, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(a.destination);
      o.start(t); o.stop(t + dur + 0.02);
    }
    function noise(dur, vol) {
      if (muted) return;
      var a = ctx(); if (!a) return;
      var len = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      var s = a.createBufferSource(), g = a.createGain();
      s.buffer = buf; g.gain.value = vol || 0.15;
      s.connect(g); g.connect(a.destination); s.start();
    }
    return {
      unlock: function () { ctx(); },
      hit: function () { noise(0.07, 0.18); tone(220, 0.08, "square", 0.07, 0.5); },
      big: function () { noise(0.16, 0.28); tone(110, 0.2, "sawtooth", 0.1, 0.4); },
      block: function () { tone(900, 0.06, "triangle", 0.08, 0.8); },
      coin: function () { tone(988, 0.07, "sine", 0.1); tone(1318, 0.12, "sine", 0.1, 1, 0.06); },
      hurt: function () { tone(330, 0.18, "sawtooth", 0.08, 0.5); },
      special: function () { tone(220, 0.5, "sawtooth", 0.09, 4); noise(0.4, 0.12); },
      free: function () { [523, 659, 784, 1046].forEach(function (f, i) { tone(f, 0.12, "triangle", 0.1, 1, i * 0.07); }); },
      win: function () { [523, 659, 784, 1046, 1318].forEach(function (f, i) { tone(f, 0.18, "triangle", 0.12, 1, i * 0.1); }); },
      lose: function () { [392, 330, 262].forEach(function (f, i) { tone(f, 0.22, "triangle", 0.1, 1, i * 0.16); }); },
      warn: function () { tone(660, 0.1, "square", 0.05); tone(660, 0.1, "square", 0.05, 1, 0.15); }
    };
  })();

  // ---------- 캔버스 ----------
  var canvas = $("stage"), ctx = canvas.getContext("2d");
  var view = { scale: 1, ox: 0, oy: 0, dpr: 1, cw: 0, ch: 0 };
  function resize() {
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    view.cw = window.innerWidth; view.ch = window.innerHeight;
    canvas.width = Math.round(view.cw * view.dpr);
    canvas.height = Math.round(view.ch * view.dpr);
    view.scale = Math.min(view.cw / W, view.ch / H);
    view.ox = (view.cw - W * view.scale) / 2;
    // 배경 그림의 땅이 화면 아래에 붙어 있으니 싸움터도 아래에 맞춘다. 윗부분 글자는 따로 화면 위에 붙인다.
    view.oy = view.ch - H * view.scale;
  }
  window.addEventListener("resize", resize);
  resize();

  // ---------- 입력 ----------
  var keys = {};
  var input = { mx: 0, my: 0, attack: false, special: false };
  window.addEventListener("keydown", function (e) {
    keys[e.code] = true;
    if (!game || game.paused) return;
    if (e.code === "KeyJ" || e.code === "Space" || e.code === "KeyZ") { input.attack = true; e.preventDefault(); }
    if (e.code === "KeyK" || e.code === "KeyX") input.special = true;
    if (e.code === "Escape" || e.code === "KeyP") pauseGame();
  });
  window.addEventListener("keyup", function (e) { keys[e.code] = false; });
  function keyAxis() {
    var x = 0, y = 0;
    if (keys.ArrowLeft || keys.KeyA) x -= 1;
    if (keys.ArrowRight || keys.KeyD) x += 1;
    if (keys.ArrowUp || keys.KeyW) y -= 1;
    if (keys.ArrowDown || keys.KeyS) y += 1;
    return { x: x, y: y };
  }
  var stick = { id: null, sx: 0, sy: 0, x: 0, y: 0 };
  var zone = $("stickZone"), base = $("stickBase"), knob = $("stickKnob");
  zone.addEventListener("pointerdown", function (e) {
    Sfx.unlock();
    stick.id = e.pointerId; stick.sx = e.clientX; stick.sy = e.clientY; stick.x = 0; stick.y = 0;
    var r = zone.getBoundingClientRect();
    base.style.left = (e.clientX - r.left) + "px"; base.style.top = (e.clientY - r.top) + "px";
    try { zone.setPointerCapture(e.pointerId); } catch (err) {}
    e.preventDefault();
  });
  zone.addEventListener("pointermove", function (e) {
    if (e.pointerId !== stick.id) return;
    var dx = e.clientX - stick.sx, dy = e.clientY - stick.sy, len = Math.hypot(dx, dy), max = 60;
    if (len > max) { dx = dx / len * max; dy = dy / len * max; }
    stick.x = dx / max; stick.y = dy / max;
    knob.style.transform = "translate(" + dx + "px," + dy + "px)";
  });
  function stickEnd(e) {
    if (e.pointerId !== stick.id) return;
    stick.id = null; stick.x = 0; stick.y = 0; knob.style.transform = "";
  }
  zone.addEventListener("pointerup", stickEnd);
  zone.addEventListener("pointercancel", stickEnd);
  function holdButton(el, onPress) {
    el.addEventListener("pointerdown", function (e) {
      Sfx.unlock(); e.preventDefault();
      if (el.disabled) return;
      el.classList.add("is-down"); onPress();
    });
    ["pointerup", "pointercancel", "pointerleave"].forEach(function (t) { el.addEventListener(t, function () { el.classList.remove("is-down"); }); });
  }
  holdButton($("attackBtn"), function () { input.attack = true; });
  holdButton($("specialBtn"), function () { input.special = true; });
  $("pauseBtn").addEventListener("click", function () { pauseGame(); });
  document.addEventListener("pointerdown", function () { Sfx.unlock(); }, { passive: true });

  // ---------- 전투 ----------
  var game = null;

  function attackProfile(kid) {
    var w = wearing(kid, "weapon"), kind = w ? w.kind : null;
    var p = { reach: 118, dur: 0.26, hitAt: 0.09, dmg: 1, kb: 200, kind: kind };
    if (kind === "shield") { p.reach = 112; p.dmg = 1.1; p.kb = 380; }
    if (kind === "hammer") { p.reach = 128; p.dur = 0.32; p.hitAt = 0.14; p.dmg = 1.35; p.kb = 280; }
    if (kind === "blade") { p.reach = 180; p.dmg = 1.15; p.kb = 220; }
    if (kind === "web") { p.reach = 620; p.dmg = 0.9; p.kb = 90; p.ranged = true; }
    return p;
  }

  function makeHero(kid, isPlayer, x, y) {
    var def = D.HEROES[kid];
    return { kind: "hero", kid: kid, isPlayer: isPlayer, x: x, y: y, z: 0, vx: 0, vy: 0, facing: 1,
      hp: def.hp, maxHp: def.hp, st: "idle", t: 0, combo: 0, comboT: 0, hitDone: false, invul: 0, flash: 0,
      meter: isPlayer ? 30 : 0, aiCd: 0, restT: 0, bob: Math.random() * 6 };
  }

  function worldLevel() { return game ? game.worldIndex : 0; }

  function spawnEnemy(type, side) {
    var def = D.ENEMIES[type], lv = worldLevel();
    var fromLeft = side === undefined ? Math.random() < 0.5 : side < 0;
    var e = { kind: "enemy", type: type, def: def, x: fromLeft ? -70 : W + 70, y: rand(GROUND_TOP + 10, GROUND_BOTTOM - 5),
      z: def.fly || 0, vx: 0, facing: fromLeft ? 1 : -1, hp: Math.round(def.hp * (1 + 0.22 * lv)), st: "walk", t: 0,
      cd: rand(0.8, 1.6), flash: 0, slow: 0, kbx: 0, dmg: Math.round(def.damage * (1 + 0.15 * lv)), dead: 0 };
    e.maxHp = e.hp;
    game.enemies.push(e);
    return e;
  }

  function makeBoss(id) {
    var def = D.BOSSES[id];
    return { kind: "boss", id: id, def: def, x: W + 200, y: (GROUND_TOP + GROUND_BOTTOM) / 2, z: def.fly || 0, facing: -1,
      hp: def.hp, maxHp: def.hp, st: "enter", t: 0, flash: 0, move: null, moveIdx: 0, vx: 0, tx: 0, ty: 0, hitSet: [] };
  }

  function startMission(worldIndex, missionIndex) {
    var world = D.WORLDS[worldIndex], mission = D.MISSIONS[missionIndex];
    var buddyKid = other(state.hero);
    game = { worldIndex: worldIndex, missionIndex: missionIndex, world: world, mission: mission,
      time: D.MISSION_SECONDS, running: false, paused: false, over: false, endT: 0, stars: 0,
      heroes: [], enemies: [], boss: null, cages: [], sparks: [], shots: [], hazards: [], parts: [],
      freed: 0, collected: 0, goal: mission.id === "treasure" ? 50 : 3, spawnT: 1.2, sparkT: 0.5,
      hitstop: 0, shake: 0, banner: null, clock: 0, won: false };
    var player = makeHero(state.hero, true, 360, 660);
    var buddy = makeHero(buddyKid, false, 240, 600);
    player.maxHp = player.hp; buddy.maxHp = buddy.hp;
    game.heroes.push(player, buddy);
    game.player = player; game.buddy = buddy;
    if (mission.id === "rescue") {
      var animals = ["🐶", "🐱", "🐰", "🐼", "🦊", "🐹"];
      [[540, 610], [800, 690], [1070, 620]].forEach(function (p, i) {
        game.cages.push({ kind: "cage", x: p[0], y: p[1], hp: 280 + worldIndex * 40, maxHp: 280 + worldIndex * 40, animal: animals[(i + worldIndex * 2) % animals.length], freed: false, flash: 0, t: 0 });
      });
      game.maxEnemies = 3;
    } else if (mission.id === "treasure") {
      game.maxEnemies = 3;
    } else {
      game.boss = makeBoss(world.boss);
      game.maxEnemies = 0;
    }
    $("controls").hidden = false;
    updateSpecialBtn();
    showScreen(null);
    runIntro();
  }

  function runIntro() {
    var m = game.mission;
    $("introIcon").textContent = m.icon;
    $("introTitle").textContent = game.world.name + " · " + m.name;
    $("introGoal").textContent = game.boss ? game.boss.def.name + "을(를) 물리쳐요!" : m.goal;
    $("introCount").textContent = "";
    showScreen("intro", true);
    var steps = ["3", "2", "1", "출동!"], i = 0;
    var timer = setInterval(function () {
      if (!game) { clearInterval(timer); return; }
      if (i < steps.length) { $("introCount").textContent = steps[i]; Sfx.warn(); i++; return; }
      clearInterval(timer);
      showScreen(null);
      game.running = true;
    }, 650);
  }

  function heroesAlive() { return game.heroes.filter(function (h) { return h.st !== "down" && h.st !== "rest"; }); }
  function nearestHero(x, y) {
    var best = null, bd = 1e9;
    heroesAlive().forEach(function (h) { var d = Math.hypot(h.x - x, (h.y - y) * 1.6); if (d < bd) { bd = d; best = h; } });
    return best;
  }
  function targetsFor() {
    var list = game.enemies.filter(function (e) { return e.st !== "dead"; });
    if (game.boss && game.boss.st !== "dead" && game.boss.st !== "enter") list.push(game.boss);
    game.cages.forEach(function (c) { if (!c.freed) list.push(c); });
    game.shots.forEach(function (s) { if (s.owner === "enemy" && s.poppable) list.push(s); });
    return list;
  }
  function bodyWidth(t) {
    if (t.kind === "boss") return t.def.size * 0.34;
    if (t.kind === "enemy") return t.def.size * 0.3;
    if (t.kind === "cage") return 70;
    return 30;
  }

  // ---------- 효과 ----------
  function burst(x, y, color, n, speed) {
    for (var i = 0; i < n && game.parts.length < 320; i++) {
      var a = Math.random() * Math.PI * 2, s = rand(0.3, 1) * (speed || 360);
      game.parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 120, life: rand(0.35, 0.7), max: 0.7,
        color: color || "#fff3b0", size: rand(4, 10), kind: Math.random() < 0.4 ? "star" : "dot" });
    }
  }
  function floatText(x, y, text, color, size) {
    game.parts.push({ x: x, y: y, vx: rand(-30, 30), vy: -170, life: 0.9, max: 0.9, color: color || "#fff", size: size || 30, kind: "text", text: text });
  }
  function shake(power) { game.shake = Math.max(game.shake, power); }

  // ---------- 피해 ----------
  function hurtTarget(t, dmg, from, opt) {
    opt = opt || {};
    if (t.kind === "shot") { t.life = 0; burst(t.x, t.y - t.z, "#bfefff", 8, 200); Sfx.coin(); return; }
    var fromFront = from && ((from.x - t.x) * (t.facing || 1) > 0);
    if (t.kind === "enemy" && t.def.guard && fromFront && t.st !== "windup" && !opt.breakGuard) {
      dmg = Math.round(dmg * 0.25);
      floatText(t.x, t.y - t.def.size, "막았다!", "#9fd8ff", 26);
      Sfx.block();
    } else {
      Sfx.hit();
    }
    if (t.kind === "boss" && t.st === "dizzy") dmg = Math.round(dmg * 1.5);
    t.hp -= dmg;
    t.flash = 0.1;
    var hy = t.y - (t.kind === "cage" ? 80 : t.kind === "boss" ? t.def.size * 0.5 : t.def ? t.def.size * 0.5 : 100) - (t.z || 0);
    floatText(t.x + rand(-20, 20), hy, String(dmg), opt.big ? "#ffd84a" : "#ffffff", opt.big ? 40 : 30);
    burst(t.x, hy, opt.color || "#fff3b0", opt.big ? 16 : 8);
    game.hitstop = Math.max(game.hitstop, opt.big ? 0.09 : 0.045);
    if (opt.big) shake(10);
    if (from && from.isPlayer) addMeter(from, opt.big ? 4 : 8);
    if (t.kind === "enemy") {
      if (t.st !== "windup" || opt.big) { t.st = "hurt"; t.t = 0; }
      t.kbx = (opt.kb || 200) * (from ? Math.sign(t.x - from.x) || 1 : 1);
      if (opt.slow) t.slow = opt.slow;
      if (t.hp <= 0) killEnemy(t);
    } else if (t.kind === "cage") {
      t.t = 0.15;
      if (t.hp <= 0) freeCage(t);
    } else if (t.kind === "boss" && t.hp <= 0) {
      t.hp = 0; t.st = "dead"; t.t = 0;
      burst(t.x, t.y - t.def.size * 0.5, "#ffd84a", 60, 600); shake(18); Sfx.big();
      game.enemies.forEach(function (e) { if (e.st !== "dead") killEnemy(e); });
      winMission();
    }
  }
  function killEnemy(e) {
    e.st = "dead"; e.t = 0; e.dead = 0.5;
    burst(e.x, e.y - e.def.size * 0.4 - e.z, "#ffd84a", 18, 420);
    if (game.mission.id === "treasure") { dropSpark(e.x - 20, e.y, 260); dropSpark(e.x + 20, e.y, 260); }
  }
  function freeCage(c) {
    c.freed = true; c.t = 1.4;
    game.freed++;
    Sfx.free(); shake(6);
    burst(c.x, c.y - 90, "#ff9fd6", 30, 420);
    floatText(c.x, c.y - 180, "고마워! 💖", "#ffd1ec", 34);
    if (game.freed >= 3) winMission();
  }
  function dropSpark(x, y, pop) {
    game.sparks.push({ x: clamp(x, 60, W - 60), y: clamp(y, GROUND_TOP + 10, GROUND_BOTTOM), z: pop ? 40 : 520, vz: pop ? pop : 0, t: 0 });
  }
  function hurtHero(h, dmg, from) {
    if (h.invul > 0 || h.st === "down" || h.st === "rest" || game.over) return;
    if (wearing(h.kid, "weapon") && wearing(h.kid, "weapon").kind === "shield") dmg = Math.round(dmg * 0.6);
    if (!h.isPlayer) dmg = Math.round(dmg * 0.7);
    h.hp -= dmg; h.flash = 0.12; h.invul = 0.6;
    floatText(h.x, h.y - HERO_H, "-" + dmg, "#ff8a8a", 28);
    Sfx.hurt();
    if (h.hp <= 0) {
      h.hp = 0; h.st = h.isPlayer ? "down" : "rest"; h.t = 0;
      h.restT = h.isPlayer ? 2.2 : 4;
      floatText(h.x, h.y - HERO_H - 30, h.isPlayer ? "으악!" : "잠깐 쉴게 💤", "#fff", 30);
    } else if (h.st !== "attack" && h.st !== "special") {
      h.st = "hurt"; h.t = 0;
      h.vx = (from ? Math.sign(h.x - from.x) || 1 : 1) * 260;
    }
  }
  function addMeter(h, n) {
    h.meter = clamp(h.meter + n, 0, 100);
    if (h.isPlayer) updateSpecialBtn();
  }
  function updateSpecialBtn() {
    var full = game && game.player && game.player.meter >= 100;
    $("specialBtn").disabled = !full;
  }

  // ---------- 영웅 행동 ----------
  function startAttack(h) {
    if (h.st === "attack" || h.st === "special" || h.st === "down" || h.st === "rest") return;
    var prof = attackProfile(h.kid);
    // 가까운 적 쪽으로 저절로 돌아선다. 다섯 살도 맞힐 수 있게.
    var best = null, bd = prof.ranged ? 900 : 320;
    targetsFor().forEach(function (t) {
      var d = Math.abs(t.x - h.x) + Math.abs(t.y - h.y) * 1.4;
      if (d < bd) { bd = d; best = t; }
    });
    if (best) {
      h.facing = best.x >= h.x ? 1 : -1;
      if (!prof.ranged) {
        var gap = Math.abs(best.x - h.x) - prof.reach * 0.7;
        if (gap > 0) h.x += h.facing * Math.min(gap, 60);
        h.y += clamp(best.y - h.y, -26, 26);
      }
    }
    h.combo = h.comboT > 0 ? (h.combo + 1) % 3 : 0;
    h.st = "attack"; h.t = 0; h.hitDone = false; h.prof = prof; h.comboT = 0.7;
  }
  function doHit(h) {
    var prof = h.prof, third = h.combo === 2;
    var power = D.HEROES[h.kid].power * prof.dmg * (h.isPlayer ? 1 : 0.6) * (third ? 1.8 : 1);
    var fx = wearing(h.kid, "fx");
    if (prof.ranged) {
      game.shots.push({ owner: "hero", from: h, x: h.x + h.facing * 60, y: h.y, z: 120, vx: h.facing * 950, vy: 0,
        dmg: Math.round(power), life: 0.8, r: 40, kind: "web", big: third });
      return;
    }
    var hits = 0;
    targetsFor().forEach(function (t) {
      var dx = (t.x - h.x) * h.facing, bw = bodyWidth(t);
      var dy = Math.abs(t.y - h.y), yr = t.kind === "boss" ? 110 : 70;
      if (dx > -30 && dx < prof.reach + bw && dy < yr) {
        hits++;
        hurtTarget(t, Math.round(power), h, { big: third, kb: prof.kb * (third ? 1.8 : 1), breakGuard: third || prof.kind === "hammer",
          slow: prof.kind === "web" ? 1.5 : 0, color: fx ? fx.color : null });
      }
    });
    if (prof.kind === "hammer" && third) {
      game.hazards.push({ kind: "ring", owner: "hero", x: h.x + h.facing * 70, y: h.y, r: 10, maxR: 230, t: 0, dur: 0.35, color: "#ffe45c", hit: [] , dmg: Math.round(power * 0.6) });
      shake(8);
    }
    if (hits && third) Sfx.big();
  }
  function doSpecial(h) {
    if (h.meter < 100 || h.st === "down" || h.st === "rest" || h.st === "special") return;
    h.meter = 0; h.st = "special"; h.t = 0; h.hitDone = false;
    if (h.isPlayer) updateSpecialBtn();
    Sfx.special(); shake(14);
    var fx = wearing(h.kid, "fx");
    game.flash = { color: fx ? fx.color : "#ffffff", t: 0.35 };
    floatText(h.x, h.y - HERO_H - 40, D.HEROES[h.kid].name + " 필살기!", fx ? fx.color : "#fff", 40);
  }
  function specialBlast(h) {
    var fx = wearing(h.kid, "fx");
    var power = D.HEROES[h.kid].power * (h.isPlayer ? 5 : 3);
    game.hazards.push({ kind: "ring", owner: "hero", x: h.x, y: h.y, r: 20, maxR: 900, t: 0, dur: 0.6, color: fx ? fx.color : "#fff", hit: [], dmg: 0 });
    targetsFor().forEach(function (t) {
      hurtTarget(t, Math.round(t.kind === "boss" ? power * 0.8 : power), h, { big: true, kb: 520, breakGuard: true, color: fx ? fx.color : null });
    });
    for (var i = 0; i < 40; i++) burst(rand(80, W - 80), rand(GROUND_TOP - 200, GROUND_BOTTOM - 40), fx ? fx.color : "#fff", 1, 200);
  }

  function updateHero(h, dt) {
    h.t += dt; h.comboT -= dt; h.invul -= dt; h.flash -= dt;
    if (h.st === "down" || h.st === "rest") {
      h.restT -= dt;
      if (h.restT <= 0) {
        h.st = "idle"; h.hp = Math.round(h.maxHp * (h.isPlayer ? 0.6 : 1)); h.invul = 2;
        floatText(h.x, h.y - HERO_H - 20, "다시 일어났다!", "#b7ffcb", 28);
      }
      return;
    }
    var mx = 0, my = 0;
    if (h.isPlayer) {
      var k = keyAxis();
      mx = clamp(stick.x + k.x, -1, 1); my = clamp(stick.y + k.y, -1, 1);
      if (input.attack) startAttack(h);
      if (input.special) doSpecial(h);
    } else {
      var move = buddyBrain(h, dt); mx = move.x; my = move.y;
    }
    if (h.st === "attack") {
      if (!h.hitDone && h.t >= h.prof.hitAt) { h.hitDone = true; doHit(h); }
      if (h.t >= h.prof.dur) h.st = "idle";
      mx *= 0.2; my *= 0.2;
    } else if (h.st === "special") {
      if (!h.hitDone && h.t >= 0.35) { h.hitDone = true; specialBlast(h); }
      if (h.t >= 0.9) h.st = "idle";
      mx = 0; my = 0;
    } else if (h.st === "hurt") {
      if (h.t >= 0.3) h.st = "idle";
      mx = 0; my = 0;
    }
    var sp = D.HEROES[h.kid].speed;
    h.x += (mx * sp + h.vx) * dt;
    h.y += my * sp * 0.62 * dt;
    h.vx *= Math.pow(0.02, dt);
    h.x = clamp(h.x, 50, W - 50); h.y = clamp(h.y, GROUND_TOP, GROUND_BOTTOM);
    if (h.st === "idle" || h.st === "run") {
      h.st = Math.abs(mx) + Math.abs(my) > 0.15 ? "run" : "idle";
      if (Math.abs(mx) > 0.15) h.facing = mx > 0 ? 1 : -1;
    }
    // 반짝이 줍기
    for (var i = game.sparks.length - 1; i >= 0; i--) {
      var s = game.sparks[i];
      if (s.z > 30) continue;
      var d = Math.hypot(s.x - h.x, (s.y - h.y) * 1.5);
      if (d < 150) { s.x += (h.x - s.x) * Math.min(1, dt * 8); s.y += (h.y - s.y) * Math.min(1, dt * 8); }
      if (d < 60) {
        game.sparks.splice(i, 1); game.collected++; addMeter(h.isPlayer ? h : game.player, 3); Sfx.coin();
        burst(s.x, s.y - 30, "#fff3b0", 6, 220);
        if (game.collected >= game.goal && game.mission.id === "treasure") winMission();
      }
    }
  }

  // 동료: 가까운 적(구출이면 철창도)에게 가서 때리고, 없으면 주인공 뒤를 따라간다.
  function buddyBrain(h, dt) {
    h.aiCd -= dt;
    var p = game.player;
    var targets = targetsFor().filter(function (t) { return t.kind !== "shot"; });
    var best = null, bd = 1e9;
    targets.forEach(function (t) {
      var d = Math.hypot(t.x - h.x, (t.y - h.y) * 1.5) + (t.kind === "cage" ? 120 : 0);
      if (d < bd) { bd = d; best = t; }
    });
    if (h.meter >= 100 && best && bd < 500) { doSpecial(h); return { x: 0, y: 0 }; }
    if (best && bd < 700) {
      var reach = attackProfile(h.kid).reach;
      var side = h.x < best.x ? -1 : 1;
      var gx = best.x + side * (reach * 0.6 + bodyWidth(best)), gy = best.y;
      var dx = gx - h.x, dy = gy - h.y;
      if (Math.abs(dx) < 40 && Math.abs(dy) < 30) {
        h.facing = best.x >= h.x ? 1 : -1;
        if (h.aiCd <= 0) { startAttack(h); h.aiCd = rand(0.35, 0.6); }
        return { x: 0, y: 0 };
      }
      return { x: clamp(dx / 60, -1, 1) * 0.85, y: clamp(dy / 40, -1, 1) * 0.85 };
    }
    var fx = p.x - 140 * p.facing, fy = p.y - 30;
    var ddx = fx - h.x, ddy = fy - h.y;
    if (Math.abs(ddx) < 30 && Math.abs(ddy) < 20) return { x: 0, y: 0 };
    return { x: clamp(ddx / 80, -1, 1) * 0.8, y: clamp(ddy / 50, -1, 1) * 0.8 };
  }

  // ---------- 적 ----------
  function updateEnemy(e, dt) {
    e.t += dt; e.flash -= dt; e.slow -= dt;
    if (e.st === "dead") { e.dead -= dt; return; }
    e.x += e.kbx * dt; e.kbx *= Math.pow(0.01, dt);
    if (e.st === "hurt") { if (e.t > 0.28) { e.st = "walk"; e.t = 0; } return; }
    var target = nearestHero(e.x, e.y);
    if (!target) return;
    var slow = e.slow > 0 ? 0.45 : 1;
    if (e.def.ranged) {
      e.z = e.def.fly + Math.sin(game.clock * 3 + e.x) * 14;
      var want = target.x + (e.x < target.x ? -340 : 340);
      e.x += clamp(want - e.x, -1, 1) * e.def.speed * slow * dt * (Math.abs(want - e.x) > 20 ? 1 : 0);
      e.y += clamp(target.y - e.y, -1, 1) * e.def.speed * 0.5 * slow * dt;
      e.facing = target.x < e.x ? -1 : 1;
      e.cd -= dt;
      if (e.st === "walk" && e.cd <= 0 && e.x > 20 && e.x < W - 20) { e.st = "windup"; e.t = 0; }
      if (e.st === "windup" && e.t > 0.6) {
        var ang = Math.atan2((target.y - e.y) * 0.6, target.x - e.x);
        game.shots.push({ owner: "enemy", x: e.x + e.facing * 50, y: e.y, z: e.z - 20, vx: Math.cos(ang) * 260, vy: Math.sin(ang) * 160,
          dmg: e.dmg, life: 3, r: 26, kind: "bubble", poppable: true, facing: 1 });
        e.st = "walk"; e.t = 0; e.cd = rand(2.2, 3);
      }
    } else {
      var dx = target.x - e.x, dy = target.y - e.y;
      e.facing = dx < 0 ? -1 : 1;
      e.cd -= dt;
      if (e.st === "walk") {
        var gx = target.x - Math.sign(dx || 1) * (e.def.reach + 20);
        var mx = gx - e.x;
        if (Math.abs(mx) > 12) e.x += Math.sign(mx) * e.def.speed * slow * dt;
        if (Math.abs(dy) > 8) e.y += Math.sign(dy) * e.def.speed * 0.6 * slow * dt;
        if (Math.abs(dx) < e.def.reach + 50 && Math.abs(dy) < 40 && e.cd <= 0) { e.st = "windup"; e.t = 0; }
      } else if (e.st === "windup" && e.t > 0.55) {
        e.x += e.facing * 36;
        heroesAlive().forEach(function (h) {
          if (Math.abs(h.x - e.x) < e.def.reach + 40 && Math.abs(h.y - e.y) < 50) hurtHero(h, e.dmg, e);
        });
        e.st = "walk"; e.t = 0; e.cd = rand(1.2, 1.9);
      }
    }
    e.y = clamp(e.y, GROUND_TOP, GROUND_BOTTOM);
  }

  // ---------- 보스 ----------
  function updateBoss(b, dt) {
    b.t += dt; b.flash -= dt;
    var target = nearestHero(b.x, b.y) || game.player;
    var def = b.def;
    if (b.st === "dead") return;
    if (b.st === "enter") {
      b.x += (W - 280 - b.x) * Math.min(1, dt * 2.2);
      if (b.t > 1.4) { b.st = "idle"; b.t = 0; floatText(b.x, b.y - def.size - 20, def.name + " 등장!", "#ffd84a", 40); shake(10); Sfx.big(); }
      return;
    }
    if (b.st === "idle") {
      var keep = target.x + (b.x < target.x ? -260 : 260);
      b.x += clamp(keep - b.x, -1, 1) * def.speed * 0.6 * dt;
      b.y += clamp(target.y - b.y, -1, 1) * def.speed * 0.4 * dt;
      b.facing = target.x < b.x ? -1 : 1;
      var wait = b.hp < b.maxHp / 2 ? 1.1 : 1.7;
      if (b.t > wait) {
        b.move = def.moves[b.moveIdx % def.moves.length]; b.moveIdx++;
        b.st = "tele"; b.t = 0; b.hitSet = [];
        b.tx = target.x; b.ty = target.y;
        Sfx.warn();
        if (b.move === "rain") {
          for (var i = 0; i < 5; i++) {
            var h = pick(heroesAlive()) || game.player;
            game.hazards.push({ kind: "drop", owner: "boss", x: clamp(h.x + rand(-160, 160), 60, W - 60), y: clamp(h.y + rand(-50, 50), GROUND_TOP, GROUND_BOTTOM),
              r: 70, t: -i * 0.18, dur: 1.2, dmg: def.damage, hit: [], color: game.world.tint });
          }
        }
      }
    } else if (b.st === "tele") {
      var teleTime = b.move === "charge" ? 0.8 : b.move === "dive" ? 0.7 : b.move === "stomp" ? 0.9 : 0.6;
      if (b.t > teleTime) { b.st = "act"; b.t = 0; startBossMove(b, target); }
    } else if (b.st === "act") {
      actBoss(b, dt);
    } else if (b.st === "dizzy") {
      if (b.t > 1.8) { b.st = "idle"; b.t = 0; }
    }
    b.y = clamp(b.y, GROUND_TOP + 10, GROUND_BOTTOM - 10);
    b.x = clamp(b.x, 90, W - 90);
  }
  function startBossMove(b, target) {
    var def = b.def;
    if (b.move === "stomp") {
      game.hazards.push({ kind: "ring", owner: "boss", x: b.x, y: b.y, r: 30, maxR: 330, t: 0, dur: 0.5, dmg: def.damage, hit: [], color: "#ff6b5b" });
      shake(14); Sfx.big();
    } else if (b.move === "charge") {
      b.vx = (target.x < b.x ? -1 : 1) * 820; b.facing = b.vx < 0 ? -1 : 1;
    } else if (b.move === "summon") {
      spawnEnemy(def.minion, -1); spawnEnemy(def.minion, 1);
      floatText(b.x, b.y - def.size - 10, "부하들아 나와라!", "#fff", 30);
    } else if (b.move === "dive") {
      b.sx = b.x; b.sy = b.y;
    }
  }
  function actBoss(b, dt) {
    var def = b.def;
    if (b.move === "charge") {
      b.x += b.vx * dt;
      heroesAlive().forEach(function (h) {
        if (b.hitSet.indexOf(h) < 0 && Math.abs(h.x - b.x) < def.size * 0.3 && Math.abs(h.y - b.y) < 70) { b.hitSet.push(h); hurtHero(h, def.damage, b); }
      });
      if (b.x < 110 || b.x > W - 110) { b.st = "dizzy"; b.t = 0; shake(12); Sfx.big(); floatText(b.x, b.y - def.size, "어지러워~ 지금이야!", "#ffe45c", 32); }
    } else if (b.move === "dive") {
      var k = Math.min(1, b.t / 0.45);
      b.x = b.sx + (b.tx - b.sx) * k; b.y = b.sy + (b.ty - b.sy) * k;
      b.z = def.fly * (1 - k) + 10;
      if (k >= 1 && b.hitSet.length === 0) {
        b.hitSet.push("done");
        heroesAlive().forEach(function (h) { if (Math.hypot(h.x - b.x, (h.y - b.y) * 1.5) < 120) hurtHero(h, def.damage, b); });
        shake(10); burst(b.x, b.y - 40, "#c69bff", 20);
      }
      if (b.t > 1.2) { b.z = def.fly; b.st = "dizzy"; b.t = 0.9; }
    } else if (b.t > 0.7) {
      b.st = "idle"; b.t = 0;
    }
  }

  // ---------- 미션 진행 ----------
  function winMission() {
    if (game.over) return;
    game.won = true; endMission();
  }
  function starsFor() {
    var m = game.mission.id;
    if (m === "rescue") return game.freed;
    if (m === "treasure") return game.collected >= 50 ? 3 : game.collected >= 35 ? 2 : game.collected >= 20 ? 1 : 0;
    if (!game.won) return 0;
    return game.time >= 25 ? 3 : game.time >= 10 ? 2 : 1;
  }
  function endMission() {
    game.over = true; game.endT = 0;
    game.stars = starsFor();
    game.banner = { text: game.stars > 0 ? "미션 성공!" : "시간 끝!", t: 0 };
    if (game.stars > 0) Sfx.win(); else Sfx.lose();
  }
  function updateMission(dt) {
    if (!game.over) {
      game.time -= dt;
      if (game.time <= 0) { game.time = 0; endMission(); }
    }
    var m = game.mission.id;
    if (m !== "boss") {
      var alive = game.enemies.filter(function (e) { return e.st !== "dead"; }).length;
      game.spawnT -= dt;
      var cap = game.maxEnemies + (game.time < 45 ? 1 : 0);
      if (!game.over && alive < cap && game.spawnT <= 0) {
        spawnEnemy(pick(game.world.enemies));
        game.spawnT = rand(1.2, 2.4);
      }
    }
    if (m === "treasure" && !game.over) {
      game.sparkT -= dt;
      if (game.sparkT <= 0) { dropSpark(rand(80, W - 80), rand(GROUND_TOP + 10, GROUND_BOTTOM - 10)); game.sparkT = rand(0.9, 1.3); }
    }
  }

  function update(dt) {
    game.clock += dt;
    game.shake = Math.max(0, game.shake - dt * 40);
    if (game.flash) { game.flash.t -= dt; if (game.flash.t <= 0) game.flash = null; }
    updateParts(dt);
    if (game.over) {
      game.endT += dt;
      if (game.banner) game.banner.t += dt;
      if (game.endT > 2.2 && !game.resultShown) { game.resultShown = true; showResult(); }
      return;
    }
    if (game.hitstop > 0) { game.hitstop -= dt; input.attack = false; input.special = false; return; }
    game.heroes.forEach(function (h) { updateHero(h, dt); });
    input.attack = false; input.special = false;
    game.enemies.forEach(function (e) { updateEnemy(e, dt); });
    game.enemies = game.enemies.filter(function (e) { return e.st !== "dead" || e.dead > 0; });
    if (game.boss) updateBoss(game.boss, dt);
    game.cages.forEach(function (c) { c.flash -= dt; c.t -= dt; });
    updateShots(dt);
    updateHazards(dt);
    game.sparks.forEach(function (s) {
      s.t += dt;
      if (s.z > 0 || s.vz) { s.vz -= 1100 * dt; s.z += s.vz * dt; if (s.z <= 0) { s.z = 0; s.vz = s.vz < -200 ? -s.vz * 0.35 : 0; } }
    });
    updateMission(dt);
  }
  function updateShots(dt) {
    game.shots.forEach(function (s) {
      s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt;
      s.y = clamp(s.y, GROUND_TOP, GROUND_BOTTOM);
      if (s.owner === "enemy") {
        heroesAlive().forEach(function (h) {
          if (s.life > 0 && Math.abs(h.x - s.x) < 50 && Math.abs(h.y - s.y) < 45) { s.life = 0; hurtHero(h, s.dmg, s); burst(s.x, s.y - s.z, "#bfefff", 10, 200); }
        });
      } else {
        targetsFor().forEach(function (t) {
          if (s.life > 0 && t.kind !== "shot" && Math.abs(t.x - s.x) < bodyWidth(t) + 30 && Math.abs(t.y - s.y) < (t.kind === "boss" ? 110 : 70)) {
            s.life = 0; hurtTarget(t, s.dmg, s.from, { big: s.big, kb: 120, slow: 1.5, color: "#ffffff" });
          }
        });
      }
      if (s.x < -80 || s.x > W + 80) s.life = 0;
    });
    game.shots = game.shots.filter(function (s) { return s.life > 0; });
  }
  function updateHazards(dt) {
    game.hazards.forEach(function (z) {
      z.t += dt;
      if (z.kind === "ring") {
        z.r = z.maxR * Math.min(1, z.t / z.dur);
        var victims = z.owner === "boss" ? heroesAlive() : targetsFor().filter(function (t) { return t.kind === "enemy"; });
        if (z.dmg) victims.forEach(function (v) {
          if (z.hit.indexOf(v) >= 0) return;
          var d = Math.hypot(v.x - z.x, (v.y - z.y) * 2);
          if (d < z.r + 10 && d > z.r - 70) {
            z.hit.push(v);
            if (z.owner === "boss") hurtHero(v, z.dmg, z); else hurtTarget(v, z.dmg, game.player, { kb: 300 });
          }
        });
      } else if (z.kind === "drop" && z.t >= z.dur && !z.done) {
        z.done = true; shake(6); burst(z.x, z.y - 10, z.color, 12, 260);
        heroesAlive().forEach(function (h) { if (Math.hypot(h.x - z.x, (h.y - z.y) * 1.8) < z.r + 20) hurtHero(h, z.dmg, z); });
      }
    });
    game.hazards = game.hazards.filter(function (z) { return z.kind === "ring" ? z.t < z.dur + 0.15 : z.t < z.dur + 0.3; });
  }
  function updateParts(dt) {
    game.parts.forEach(function (p) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.kind !== "text") p.vy += 700 * dt; else p.vy *= Math.pow(0.1, dt); });
    game.parts = game.parts.filter(function (p) { return p.life > 0; });
  }

  // ---------- 그리기 ----------
  // 영웅 한 명: 망토(뒤) → 그림 → 가슴 마크·마스크·무기(앞). 그림은 오른쪽을 본다.
  function drawHero(g, kid, pose, x, y, h, facing, outfit, t, opt) {
    opt = opt || {};
    var def = D.HEROES[kid], pd = def.poses[pose] || def.poses.idle;
    var im = image(pd.src);
    var ok = ready(im);
    var w = ok ? h * im.naturalWidth / im.naturalHeight : h * 0.5;
    function at(a) { return [-w / 2 + a[0] * w, -h + a[1] * h]; }
    g.save();
    g.translate(x, y);
    g.scale(facing, 1);
    if (opt.alpha !== undefined) g.globalAlpha = opt.alpha;
    var cape = outfit && outfit.cape ? itemById(outfit.cape) : null;
    if (cape) drawCape(g, cape, at(pd.back), h, t, pose);
    if (opt.aura) {
      var grd = g.createRadialGradient(0, -h * 0.5, 10, 0, -h * 0.5, h * 0.75);
      grd.addColorStop(0, opt.aura + "cc"); grd.addColorStop(1, opt.aura + "00");
      g.fillStyle = grd; g.beginPath(); g.arc(0, -h * 0.5, h * 0.75, 0, Math.PI * 2); g.fill();
    }
    if (ok) {
      g.drawImage(im, -w / 2, -h, w, h);
      if (opt.flash > 0) { g.globalAlpha = Math.min(1, opt.flash * 8) * (opt.alpha === undefined ? 1 : opt.alpha); g.drawImage(whiteOf(im), -w / 2, -h, w, h); g.globalAlpha = opt.alpha === undefined ? 1 : opt.alpha; }
    } else {
      g.fillStyle = def.color; g.beginPath(); g.ellipse(0, -h * 0.5, w * 0.35, h * 0.48, 0, 0, Math.PI * 2); g.fill();
    }
    var emblem = outfit && outfit.emblem ? itemById(outfit.emblem) : null;
    if (emblem) {
      var c = at(pd.chest), r = h * 0.05;
      g.fillStyle = "#fffdf4"; g.strokeStyle = def.color; g.lineWidth = r * 0.28;
      g.beginPath(); g.arc(c[0], c[1], r, 0, Math.PI * 2); g.fill(); g.stroke();
      g.save(); g.translate(c[0], c[1]); g.scale(facing, 1);
      g.font = Math.round(r * 1.25) + "px system-ui, 'Apple Color Emoji'"; g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText(emblem.icon, 0, r * 0.08); g.restore();
    }
    var mask = outfit && outfit.mask ? itemById(outfit.mask) : null;
    if (mask) drawMask(g, mask, at(pd.head), h);
    var weapon = outfit && outfit.weapon ? itemById(outfit.weapon) : null;
    if (weapon) drawWeapon(g, weapon, at(pd.hand), h, pose, t);
    g.restore();
  }
  function drawCape(g, cape, p, h, t, pose) {
    var sway = Math.sin(t * 5) * h * 0.03 + (pose === "run" ? h * 0.08 : 0) + (pose === "attack" ? h * 0.05 : 0);
    var len = h * (pose === "hurt" ? 0.45 : 0.56);
    var x0 = p[0], y0 = p[1];
    g.beginPath();
    g.moveTo(x0 + h * 0.07, y0 - h * 0.01);
    g.quadraticCurveTo(x0 - h * 0.05, y0 + len * 0.5, x0 - h * 0.14 - sway, y0 + len);
    g.quadraticCurveTo(x0 - h * 0.02 - sway * 0.5, y0 + len + h * 0.04, x0 + h * 0.12 - sway * 0.3, y0 + len * 0.96);
    g.quadraticCurveTo(x0 + h * 0.09, y0 + len * 0.45, x0 + h * 0.07, y0 - h * 0.01);
    g.closePath();
    if (cape.color === "rainbow") {
      var grd = g.createLinearGradient(0, y0, 0, y0 + len);
      ["#ff5e7a", "#ffb347", "#ffe45c", "#5ee07a", "#58b8ff", "#9b5cff"].forEach(function (c, i) { grd.addColorStop(i / 5, c); });
      g.fillStyle = grd;
    } else {
      g.fillStyle = cape.color;
    }
    g.fill();
    g.lineWidth = h * 0.012; g.strokeStyle = "rgba(0,0,0,0.35)"; g.stroke();
    if (cape.stars) {
      g.fillStyle = "#fff6b0";
      for (var i = 0; i < 6; i++) { var sx = x0 - h * 0.02 - sway * (i / 6) + Math.sin(i * 7) * h * 0.04, sy = y0 + len * (0.2 + i * 0.13); g.beginPath(); g.arc(sx, sy, h * 0.008, 0, Math.PI * 2); g.fill(); }
    }
  }
  function drawMask(g, mask, p, h) {
    var x = p[0], y = p[1], mw = h * 0.2, mh = h * 0.055;
    if (mask.ears) {
      g.fillStyle = mask.color;
      [[-1, -0.07], [1, -0.07]].forEach(function (s) {
        g.beginPath(); g.moveTo(x + s[0] * mw * 0.22, y - h * 0.09); g.lineTo(x + s[0] * mw * 0.48, y - h * 0.19); g.lineTo(x + s[0] * mw * 0.5, y - h * 0.08); g.closePath(); g.fill();
      });
    }
    if (mask.goggle) {
      g.strokeStyle = "#2a2140"; g.lineWidth = h * 0.012;
      g.beginPath(); g.moveTo(x - mw * 0.55, y); g.lineTo(x + mw * 0.55, y); g.stroke();
      [-0.24, 0.24].forEach(function (o) {
        g.fillStyle = "rgba(88,214,255,0.45)"; g.beginPath(); g.arc(x + o * mw, y, h * 0.035, 0, Math.PI * 2); g.fill();
        g.strokeStyle = mask.color; g.lineWidth = h * 0.012; g.stroke();
      });
      return;
    }
    g.fillStyle = mask.color;
    g.beginPath();
    g.moveTo(x - mw * 0.5, y - mh * 0.2);
    g.quadraticCurveTo(x, y - mh * 0.9, x + mw * 0.5, y - mh * 0.2);
    g.quadraticCurveTo(x + mw * 0.45, y + mh * 0.8, x + mw * 0.08, y + mh * 0.35);
    g.quadraticCurveTo(x, y + mh * 0.15, x - mw * 0.08, y + mh * 0.35);
    g.quadraticCurveTo(x - mw * 0.45, y + mh * 0.8, x - mw * 0.5, y - mh * 0.2);
    g.fill();
    g.fillStyle = "#ffffff";
    [-0.22, 0.22].forEach(function (o) { g.beginPath(); g.ellipse(x + o * mw, y + mh * 0.05, mw * 0.11, mh * 0.34, o * 0.6, 0, Math.PI * 2); g.fill(); });
  }
  function drawWeapon(g, weapon, p, h, pose, t) {
    var x = p[0], y = p[1];
    g.save(); g.translate(x, y);
    if (weapon.kind === "shield") {
      var r = h * 0.12;
      g.fillStyle = "#3f7cff"; g.beginPath(); g.arc(r * 0.3, 0, r, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#ff4d5e"; g.beginPath(); g.arc(r * 0.3, 0, r * 0.72, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#ffffff"; g.beginPath(); g.arc(r * 0.3, 0, r * 0.45, 0, Math.PI * 2); g.fill();
      star(g, r * 0.3, 0, r * 0.32, "#ffc93c");
    } else if (weapon.kind === "hammer") {
      var ang = pose === "attack" ? -0.2 : -1.1;
      g.rotate(ang);
      g.fillStyle = "#8a5a2b"; g.fillRect(-h * 0.015, -h * 0.02, h * 0.03, h * 0.3);
      g.fillStyle = "#b9c3d6"; g.fillRect(-h * 0.08, h * 0.24, h * 0.16, h * 0.1);
      g.strokeStyle = "#ffe45c"; g.lineWidth = h * 0.008; g.strokeRect(-h * 0.08, h * 0.24, h * 0.16, h * 0.1);
    } else if (weapon.kind === "blade") {
      var a2 = pose === "attack" ? 0 : -1.2;
      g.rotate(a2);
      g.shadowColor = "#7fe3ff"; g.shadowBlur = h * 0.05;
      g.strokeStyle = "#e9fbff"; g.lineWidth = h * 0.028; g.lineCap = "round";
      g.beginPath(); g.moveTo(0, 0); g.lineTo(h * 0.42, 0); g.stroke();
      g.shadowBlur = 0; g.fillStyle = "#555"; g.fillRect(-h * 0.05, -h * 0.02, h * 0.06, h * 0.04);
    } else if (weapon.kind === "web") {
      g.fillStyle = "#e2344a"; g.beginPath(); g.arc(0, 0, h * 0.03, 0, Math.PI * 2); g.fill();
      g.strokeStyle = "#ffffff"; g.lineWidth = h * 0.006; g.beginPath(); g.arc(0, 0, h * 0.02, 0, Math.PI * 2); g.stroke();
    }
    g.restore();
  }
  function star(g, x, y, r, color) {
    g.fillStyle = color; g.beginPath();
    for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    g.closePath(); g.fill();
  }

  function drawSprite(g, src, x, y, h, facing, flash, alpha, wobble) {
    var im = image(src);
    if (!ready(im)) { g.fillStyle = "#999"; g.beginPath(); g.arc(x, y - h / 2, h / 3, 0, Math.PI * 2); g.fill(); return; }
    var w = h * im.naturalWidth / im.naturalHeight;
    g.save(); g.translate(x, y);
    // 그림은 왼쪽을 본다. 오른쪽으로 갈 때 뒤집는다.
    g.scale(facing > 0 ? -1 : 1, 1);
    if (wobble) g.rotate(wobble);
    if (alpha !== undefined) g.globalAlpha = alpha;
    g.drawImage(im, -w / 2, -h, w, h);
    if (flash > 0) { g.globalAlpha = Math.min(1, flash * 8); g.drawImage(whiteOf(im), -w / 2, -h, w, h); }
    g.restore();
  }
  function shadow(g, x, y, w) {
    g.fillStyle = "rgba(0,0,0,0.28)"; g.beginPath(); g.ellipse(x, y, w, w * 0.22, 0, 0, Math.PI * 2); g.fill();
  }

  function drawBackground(g, src) {
    var im = image(src);
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (ready(im)) {
      var s = Math.max(canvas.width / im.naturalWidth, canvas.height / im.naturalHeight);
      var dw = im.naturalWidth * s, dh = im.naturalHeight * s;
      // 발 딛는 땅이 화면 아래에 오도록 그림 아래쪽을 맞춘다.
      g.drawImage(im, (canvas.width - dw) / 2, canvas.height - dh, dw, dh);
    } else {
      g.fillStyle = "#241c5c"; g.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  function render() {
    var g = ctx;
    drawBackground(g, game ? game.world.bg : D.WORLDS[0].bg);
    if (!game) return;
    var sx = game.shake ? rand(-game.shake, game.shake) : 0, sy = game.shake ? rand(-game.shake, game.shake) : 0;
    g.setTransform(view.dpr * view.scale, 0, 0, view.dpr * view.scale, view.dpr * (view.ox + sx * view.scale), view.dpr * (view.oy + sy * view.scale));
    var t = game.clock;
    // 땅 위 경고 표시
    game.hazards.forEach(function (z) {
      if (z.kind === "drop") {
        var k = clamp(z.t / z.dur, 0, 1);
        if (z.t < 0) return;
        g.fillStyle = "rgba(255,70,70," + (0.18 + 0.3 * k) + ")"; g.beginPath(); g.ellipse(z.x, z.y, z.r, z.r * 0.3, 0, 0, Math.PI * 2); g.fill();
        if (!z.done) { var fy = z.y - 600 * (1 - k); star(g, z.x, fy - 30, 30, z.color); }
      }
    });
    if (game.boss && game.boss.st === "tele") {
      var b = game.boss;
      g.strokeStyle = "rgba(255,80,80," + (0.5 + 0.5 * Math.sin(t * 20)) + ")"; g.lineWidth = 6;
      if (b.move === "stomp") { g.beginPath(); g.ellipse(b.x, b.y, 330, 70, 0, 0, Math.PI * 2); g.stroke(); }
      if (b.move === "charge") { g.beginPath(); g.moveTo(b.x, b.y); g.lineTo(b.tx < b.x ? 60 : W - 60, b.y); g.stroke(); }
      if (b.move === "dive") { g.fillStyle = "rgba(255,80,80,0.35)"; g.beginPath(); g.ellipse(b.tx, b.ty, 110, 34, 0, 0, Math.PI * 2); g.fill(); }
    }
    // 그림자와 캐릭터를 앞뒤 순서로
    var list = [];
    game.heroes.forEach(function (h) { list.push(h); });
    game.enemies.forEach(function (e) { list.push(e); });
    if (game.boss) list.push(game.boss);
    game.cages.forEach(function (c) { list.push(c); });
    game.sparks.forEach(function (s) { list.push(s); });
    game.shots.forEach(function (s) { list.push(s); });
    list.sort(function (a, b) { return a.y - b.y; });
    list.forEach(function (o) { drawThing(g, o, t); });
    game.hazards.forEach(function (z) {
      if (z.kind !== "ring") return;
      var a = 1 - z.t / (z.dur + 0.15);
      g.strokeStyle = z.color; g.globalAlpha = Math.max(0, a); g.lineWidth = z.owner === "boss" ? 14 : 18;
      g.beginPath(); g.ellipse(z.x, z.y, z.r, z.r * 0.32, 0, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1;
    });
    drawParts(g);
    if (game.flash) { g.fillStyle = game.flash.color; g.globalAlpha = game.flash.t * 1.4; g.fillRect(-200, -900, W + 400, H + 1200); g.globalAlpha = 1; }
    g.setTransform(view.dpr * view.scale, 0, 0, view.dpr * view.scale, view.dpr * view.ox, view.dpr * Math.min(view.oy, 0));
    drawHud(g, t);
  }
  function drawThing(g, o, t) {
    var s = depthScale(o.y);
    if (o.kind === "hero") {
      shadow(g, o.x, o.y, 58 * s);
      var pose = o.st === "down" || o.st === "rest" || o.st === "hurt" ? "hurt" : o.st === "attack" ? "attack" : o.st === "special" ? "special" : o.st === "run" ? "run" : "idle";
      var bob = o.st === "idle" ? Math.sin(t * 4 + o.bob) * 3 : o.st === "run" ? Math.abs(Math.sin(t * 12 + o.bob)) * -8 : 0;
      var alpha = o.st === "rest" ? 0.55 : o.invul > 0 && Math.floor(t * 20) % 2 ? 0.55 : 1;
      var fx = wearing(o.kid, "fx");
      drawHero(g, o.kid, pose, o.x, o.y + bob, heroHeight(o.kid) * s, o.facing, state.outfit[o.kid], t,
        { flash: o.flash, alpha: alpha, aura: o.st === "special" ? (fx ? fx.color : "#ffffff") : o.meter >= 100 && o.isPlayer ? "#ffd84a" : null });
      if (o.st === "attack") drawSwing(g, o, s);
      // 이름표
      g.font = "800 " + Math.round(20 * s) + "px system-ui"; g.textAlign = "center";
      g.fillStyle = o.isPlayer ? "#ffd84a" : "#ffffff"; g.strokeStyle = "rgba(0,0,0,0.6)"; g.lineWidth = 5;
      var label = o.isPlayer ? "▼ " + D.HEROES[o.kid].name : D.HEROES[o.kid].name + (o.st === "rest" ? " 💤" : "");
      var ly = o.y - heroHeight(o.kid) * s - 14;
      g.strokeText(label, o.x, ly); g.fillText(label, o.x, ly);
    } else if (o.kind === "enemy") {
      var hgt = o.def.size * s;
      shadow(g, o.x, o.y, hgt * 0.3);
      var wob = o.st === "windup" ? Math.sin(t * 40) * 0.08 : o.st === "hurt" ? -0.15 * o.facing : 0;
      var a = o.st === "dead" ? Math.max(0, o.dead / 0.5) : 1;
      drawSprite(g, o.def.src, o.x, o.y - o.z + (o.st === "dead" ? (1 - a) * 40 : 0), hgt, o.facing, o.flash, a, wob);
      if (o.st === "windup") { g.font = "900 34px system-ui"; g.textAlign = "center"; g.fillStyle = "#ff5a5a"; g.fillText("!", o.x, o.y - o.z - hgt - 8); }
      if (o.st !== "dead" && o.hp < o.maxHp) bar(g, o.x - 40, o.y - o.z - hgt - 18, 80, 9, o.hp / o.maxHp, "#ff6b5b");
      if (o.slow > 0) { g.strokeStyle = "rgba(255,255,255,0.7)"; g.lineWidth = 2; for (var i = 0; i < 4; i++) { g.beginPath(); g.moveTo(o.x - 40, o.y - o.z - hgt * (0.2 + i * 0.2)); g.lineTo(o.x + 40, o.y - o.z - hgt * (0.3 + i * 0.15)); g.stroke(); } }
    } else if (o.kind === "boss") {
      var bh = o.def.size * s;
      shadow(g, o.x, o.y, bh * 0.36);
      var bw = o.st === "tele" ? Math.sin(t * 36) * 0.05 : o.st === "dizzy" ? Math.sin(t * 6) * 0.1 : 0;
      var enterAlpha = o.st === "dead" ? Math.max(0, 1 - o.t) : 1;
      drawSprite(g, o.def.src, o.x, o.y - o.z, bh, o.facing, o.flash, enterAlpha, bw);
      if (o.st === "dizzy") { for (var j = 0; j < 3; j++) star(g, o.x + Math.cos(t * 5 + j * 2.1) * 60, o.y - o.z - bh - 10 + Math.sin(t * 5 + j * 2.1) * 12, 14, "#ffe45c"); }
    } else if (o.kind === "cage") {
      shadow(g, o.x, o.y, 70);
      if (o.freed) {
        if (o.t > 0) { var up = (1.4 - o.t) * 160; g.font = "64px system-ui"; g.textAlign = "center"; g.globalAlpha = Math.min(1, o.t); g.fillText(o.animal, o.x + (1.4 - o.t) * 140, o.y - 40 - up); g.globalAlpha = 1; }
        return;
      }
      var shakeX = o.t > 0 ? Math.sin(t * 60) * 5 : 0;
      g.font = "64px system-ui"; g.textAlign = "center"; g.fillText(o.animal, o.x + shakeX, o.y - 40);
      g.strokeStyle = o.flash > 0 ? "#ffffff" : "#8e96ad"; g.lineWidth = 8;
      g.strokeRect(o.x - 60 + shakeX, o.y - 150, 120, 150);
      for (var k2 = 1; k2 < 5; k2++) { g.beginPath(); g.moveTo(o.x - 60 + k2 * 24 + shakeX, o.y - 150); g.lineTo(o.x - 60 + k2 * 24 + shakeX, o.y); g.stroke(); }
      g.fillStyle = "#5d6479"; g.fillRect(o.x - 70 + shakeX, o.y - 164, 140, 18);
      bar(g, o.x - 55, o.y - 186, 110, 12, o.hp / o.maxHp, "#58d6ff");
      g.font = "900 22px system-ui"; g.fillStyle = "#fff"; g.fillText("때려서 열어요!", o.x, o.y - 196);
    } else if (o.kind === "spark") {
      var glow = 0.6 + 0.4 * Math.sin(t * 8 + o.x);
      if (o.z < 30) { g.fillStyle = "rgba(255,230,120,0.25)"; g.beginPath(); g.ellipse(o.x, o.y, 26, 8, 0, 0, Math.PI * 2); g.fill(); }
      g.save(); g.translate(o.x, o.y - 26 - o.z); g.rotate(t * 2); g.globalAlpha = glow; star(g, 0, 0, 24, "#ffe45c"); g.restore(); g.globalAlpha = 1;
    } else if (o.kind === "shot") {
      if (o.kind === "shot" && o.owner === "enemy") {
        g.fillStyle = "rgba(170,235,255,0.55)"; g.strokeStyle = "#ffffff"; g.lineWidth = 3;
        g.beginPath(); g.arc(o.x, o.y - o.z, o.r, 0, Math.PI * 2); g.fill(); g.stroke();
      } else {
        g.strokeStyle = "#ffffff"; g.lineWidth = 3;
        g.beginPath(); g.moveTo(o.x - Math.sign(o.vx) * 80, o.y - o.z); g.lineTo(o.x, o.y - o.z); g.stroke();
        for (var q = 0; q < 6; q++) { var an = q * Math.PI / 3; g.beginPath(); g.moveTo(o.x, o.y - o.z); g.lineTo(o.x + Math.cos(an) * 26, o.y - o.z + Math.sin(an) * 26); g.stroke(); }
      }
    }
  }
  function drawSwing(g, h, s) {
    var p = h.prof; if (!p || p.ranged) return;
    var k = clamp(h.t / p.dur, 0, 1), third = h.combo === 2;
    var fx = wearing(h.kid, "fx"), color = third && fx ? fx.color : "#ffffff";
    g.save(); g.translate(h.x, h.y - HERO_H * s * 0.5); g.scale(h.facing, 1);
    g.globalAlpha = 1 - k; g.strokeStyle = color; g.lineWidth = third ? 16 : 10; g.lineCap = "round";
    g.beginPath(); g.arc(20, 0, p.reach * 0.75, -1.1 + k * 0.4, 0.9 + k * 0.4); g.stroke();
    g.restore(); g.globalAlpha = 1;
  }
  function drawParts(g) {
    game.parts.forEach(function (p) {
      var a = clamp(p.life / p.max, 0, 1);
      g.globalAlpha = a;
      if (p.kind === "text") {
        g.font = "900 " + p.size + "px system-ui"; g.textAlign = "center"; g.lineWidth = 6; g.strokeStyle = "rgba(0,0,0,0.6)";
        g.strokeText(p.text, p.x, p.y); g.fillStyle = p.color; g.fillText(p.text, p.x, p.y);
      } else if (p.kind === "star") star(g, p.x, p.y, p.size, p.color);
      else { g.fillStyle = p.color; g.beginPath(); g.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2); g.fill(); }
    });
    g.globalAlpha = 1;
  }
  function bar(g, x, y, w, h, k, color) {
    g.fillStyle = "rgba(0,0,0,0.5)"; roundRect(g, x - 2, y - 2, w + 4, h + 4, h); g.fill();
    g.fillStyle = color; roundRect(g, x, y, Math.max(0, w * clamp(k, 0, 1)), h, h / 2); g.fill();
  }
  function roundRect(g, x, y, w, h, r) {
    r = Math.min(r, h / 2, w / 2);
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function drawHud(g, t) {
    var p = game.player, b = game.buddy;
    g.font = "900 22px system-ui"; g.textAlign = "left"; g.fillStyle = "#fff";
    g.lineWidth = 5; g.strokeStyle = "rgba(0,0,0,0.55)";
    g.strokeText(D.HEROES[p.kid].name, 24, 40); g.fillText(D.HEROES[p.kid].name, 24, 40);
    bar(g, 90, 24, 240, 20, p.hp / p.maxHp, "#5ee07a");
    bar(g, 90, 50, 240, 10, p.meter / 100, p.meter >= 100 ? "#ff7ec8" : "#c69bff");
    g.font = "800 17px system-ui"; g.strokeText(D.HEROES[b.kid].name, 24, 88); g.fillText(D.HEROES[b.kid].name, 24, 88);
    bar(g, 90, 76, 160, 12, b.hp / b.maxHp, "#8fe6ff");
    // 시간
    var sec = Math.ceil(game.time), warn = sec <= 10 && !game.over;
    g.textAlign = "center"; g.font = "900 " + (warn ? 58 + Math.sin(t * 12) * 4 : 52) + "px system-ui";
    g.fillStyle = warn ? "#ff6b6b" : "#ffffff"; g.lineWidth = 7;
    g.strokeText(String(sec), W / 2, 62); g.fillText(String(sec), W / 2, 62);
    // 목표
    var m = game.mission.id, goal = "";
    if (m === "rescue") goal = "🔓 " + game.freed + " / 3";
    if (m === "treasure") goal = "⭐ " + game.collected + " / 50";
    if (goal) { g.font = "900 30px system-ui"; g.lineWidth = 6; g.strokeText(goal, W / 2, 104); g.fillStyle = "#ffe45c"; g.fillText(goal, W / 2, 104); }
    if (game.boss && game.boss.st !== "enter") {
      g.font = "900 22px system-ui"; g.fillStyle = "#fff"; g.lineWidth = 5;
      g.strokeText(game.boss.def.name, W / 2, 100); g.fillText(game.boss.def.name, W / 2, 100);
      bar(g, W / 2 - 220, 110, 440, 20, game.boss.hp / game.boss.maxHp, "#ff5a78");
    }
    if (game.banner) {
      var k = Math.min(1, game.banner.t * 4);
      g.save(); g.translate(W / 2, H / 2 - 60); g.scale(0.5 + 0.5 * k, 0.5 + 0.5 * k);
      g.font = "900 96px system-ui"; g.lineWidth = 12; g.strokeStyle = "#2a2140";
      g.strokeText(game.banner.text, 0, 0); g.fillStyle = game.stars > 0 ? "#ffd84a" : "#ffffff"; g.fillText(game.banner.text, 0, 0);
      g.restore();
    }
  }

  // ---------- 반복 ----------
  var last = 0;
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    if (game && game.running && !game.paused) update(dt);
    if (game || !$("home").hidden === false) render();
    if (!$("wardrobe").hidden) renderPreview(now / 1000);
    requestAnimationFrame(frame);
  }

  // ---------- 화면 ----------
  var screens = ["home", "map", "intro", "result", "pause", "wardrobe", "capsule"];
  function showScreen(id, keepGame) {
    screens.forEach(function (s) { $(s).hidden = s !== id; });
    if (!keepGame && id && id !== "pause" && id !== "result" && id !== "intro") {
      game = null; $("controls").hidden = true;
    }
    if (id === "home") paintHome();
    if (id === "map") paintMap();
    if (id === "wardrobe") paintWardrobe();
    if (id === "capsule") paintCapsule();
  }
  document.querySelectorAll("[data-go]").forEach(function (b) {
    b.addEventListener("click", function () { showScreen(b.getAttribute("data-go")); });
  });

  function paintStars() {
    ["starCount", "mapStars", "wardrobeStars", "capsuleStars"].forEach(function (id) { $(id).textContent = "⭐ " + state.stars; });
  }
  // 네 명 중 주인공 한 명, 동료 한 명을 고른다. 주인공을 바꾸면 동료는 짝꿍으로 돌아간다.
  function paintHome() {
    paintStars();
    var pickBox = $("heroPick"), buddyBox = $("buddyPick");
    pickBox.replaceChildren(); buddyBox.replaceChildren();
    D.HERO_ORDER.forEach(function (kid) {
      var def = D.HEROES[kid];
      var card = document.createElement("button");
      card.type = "button"; card.className = "hero-card" + (kid === state.hero ? " is-on" : "");
      card.setAttribute("data-kid", kid);
      card.setAttribute("aria-pressed", String(kid === state.hero));
      var img = document.createElement("img"); img.src = def.poses.idle.src; img.alt = "";
      var name = document.createElement("strong"); name.textContent = def.name;
      var age = document.createElement("small"); age.textContent = def.age + "살";
      card.append(img, name, age);
      card.addEventListener("click", function () {
        state.hero = kid; state.buddy = D.BUDDY[kid]; persist(); paintHome(); Sfx.coin();
      });
      pickBox.appendChild(card);
      if (kid === state.hero) return;
      var chip = document.createElement("button");
      chip.type = "button"; chip.className = "buddy-chip" + (kid === other(state.hero) ? " is-on" : "");
      chip.setAttribute("data-kid", kid);
      var face = document.createElement("img"); face.src = def.poses.idle.src; face.alt = "";
      var label = document.createElement("span"); label.textContent = def.name;
      chip.append(face, label);
      chip.addEventListener("click", function () { state.buddy = kid; persist(); paintHome(); Sfx.coin(); });
      buddyBox.appendChild(chip);
    });
    $("buddyNote").textContent = "같이 갈 동료: " + D.HEROES[other(state.hero)].name + " (컴퓨터가 조종해요)";
    $("muteBtn").textContent = muted ? "🔇" : "🔊";
  }
  $("goMap").addEventListener("click", function () { showScreen("map"); });
  $("goWardrobe").addEventListener("click", function () { wardrobeKid = state.hero; showScreen("wardrobe"); });
  $("goCapsule").addEventListener("click", function () { showScreen("capsule"); });
  $("muteBtn").addEventListener("click", function () {
    muted = !muted;
    try { localStorage.setItem("mv2_muted", muted ? "1" : "0"); } catch (e) {}
    if (bgm) bgm.setMuted(muted);
    paintHome();
  });

  function paintMap() {
    paintStars();
    var list = $("worldList");
    list.replaceChildren();
    D.WORLDS.forEach(function (w, wi) {
      var card = document.createElement("div");
      card.className = "world";
      card.style.backgroundImage = "url(" + w.bg + ")";
      var open0 = Save.missionOpen(state, D, wi, 0);
      if (!open0) card.classList.add("is-locked");
      var title = document.createElement("h3");
      title.textContent = w.icon + " " + w.name + (open0 ? "" : " 🔒");
      var row = document.createElement("div");
      row.className = "missions";
      D.MISSIONS.forEach(function (m, mi) {
        var b = document.createElement("button");
        b.type = "button"; b.className = "mission-btn";
        var best = state.best[w.id + ":" + m.id] || 0;
        var open = Save.missionOpen(state, D, wi, mi);
        b.disabled = !open;
        b.innerHTML = "";
        var ic = document.createElement("span"); ic.className = "m-icon"; ic.textContent = open ? (m.id === "boss" ? "👑" : m.icon) : "🔒";
        var nm = document.createElement("span"); nm.textContent = m.id === "boss" ? D.BOSSES[w.boss].name : m.name;
        var st = document.createElement("span"); st.className = "m-stars"; st.textContent = "★★★".slice(0, best) + "☆☆☆".slice(0, 3 - best);
        b.append(ic, nm, st);
        b.setAttribute("aria-label", w.name + " " + m.name + (open ? "" : " 잠김"));
        b.addEventListener("click", function () { startMission(wi, mi); });
        row.appendChild(b);
      });
      card.append(title, row);
      list.appendChild(card);
    });
  }

  function showResult() {
    var rec = Save.recordMission(state, game.world.id, game.mission.id, game.stars);
    state = rec.state; persist();
    $("controls").hidden = true;
    var st = $("resultStars");
    st.replaceChildren();
    for (var i = 0; i < 3; i++) {
      var s = document.createElement("span"); s.textContent = "⭐";
      if (i >= game.stars) s.className = "off";
      s.style.animationDelay = (0.15 + i * 0.25) + "s";
      st.appendChild(s);
    }
    $("resultTitle").textContent = game.stars > 0 ? "미션 성공! 🎉" : "아깝다! 다시 해 볼까?";
    $("resultText").textContent = game.stars > 0 ? "별 " + rec.earned + "개를 받았어요! (모은 별 ⭐ " + state.stars + ")" : resultHint();
    var next = nextMission();
    $("nextBtn").hidden = !(game.stars > 0 && next);
    $("resultCapsule").hidden = state.stars < D.CAPSULE_COST || state.owned.length >= D.ITEMS.length;
    showScreen("result", true);
  }
  function resultHint() {
    if (game.mission.id === "rescue") return "철창을 계속 때리면 열려요. 태오·재이도 같이 도와줘요!";
    if (game.mission.id === "treasure") return "반짝이 20개만 모아도 별을 받아요. 로봇을 물리치면 반짝이가 튀어나와요!";
    return "보스가 벽에 부딪혀 어지러울 때 마구 때려요!";
  }
  function nextMission() {
    var wi = game.worldIndex, mi = game.missionIndex + 1;
    if (mi >= D.MISSIONS.length) { wi++; mi = 0; }
    if (wi >= D.WORLDS.length) return null;
    return Save.missionOpen(state, D, wi, mi) ? [wi, mi] : null;
  }
  $("againBtn").addEventListener("click", function () { startMission(game.worldIndex, game.missionIndex); });
  $("nextBtn").addEventListener("click", function () { var n = nextMission(); if (n) startMission(n[0], n[1]); });
  $("resultCapsule").addEventListener("click", function () { showScreen("capsule"); });

  function pauseGame() {
    if (!game || !game.running || game.over) return;
    game.paused = true; showScreen("pause", true);
  }
  $("resumeBtn").addEventListener("click", function () { if (game) { game.paused = false; showScreen(null, true); last = performance.now(); } });
  $("quitBtn").addEventListener("click", function () { showScreen("map"); });
  document.addEventListener("visibilitychange", function () { if (document.hidden) pauseGame(); });

  // ---------- 옷장 ----------
  var wardrobeKid = "jaei", wardrobeSlot = "cape";
  var pctx = $("previewCanvas").getContext("2d");
  function paintWardrobe() {
    paintStars();
    var kidTabs = $("kidTabs");
    kidTabs.replaceChildren();
    D.HERO_ORDER.forEach(function (kid) {
      var b = document.createElement("button"); b.type = "button"; b.setAttribute("data-kid", kid);
      b.textContent = D.HEROES[kid].name;
      b.classList.toggle("is-on", kid === wardrobeKid);
      b.addEventListener("click", function () { wardrobeKid = kid; paintWardrobe(); });
      kidTabs.appendChild(b);
    });
    var tabs = $("slotTabs");
    tabs.replaceChildren();
    D.SLOTS.forEach(function (s) {
      var b = document.createElement("button"); b.type = "button";
      b.textContent = s.icon + " " + s.name;
      b.classList.toggle("is-on", s.id === wardrobeSlot);
      b.addEventListener("click", function () { wardrobeSlot = s.id; paintWardrobe(); });
      tabs.appendChild(b);
    });
    var grid = $("itemGrid");
    grid.replaceChildren();
    var none = document.createElement("button"); none.type = "button"; none.className = "item";
    none.innerHTML = "<span class='i-icon'>🚫</span><span>안 입기</span>";
    none.classList.toggle("is-on", !state.outfit[wardrobeKid][wardrobeSlot]);
    none.addEventListener("click", function () { state = Save.equip(state, D, wardrobeKid, null, wardrobeSlot); persist(); paintWardrobe(); });
    grid.appendChild(none);
    D.ITEMS.filter(function (it) { return it.slot === wardrobeSlot; }).forEach(function (it) {
      var owned = state.owned.indexOf(it.id) >= 0;
      var b = document.createElement("button"); b.type = "button"; b.className = "item" + (owned ? "" : " is-locked");
      b.appendChild(itemBadge(it, owned));
      var name = document.createElement("span"); name.textContent = owned ? it.name : "???";
      b.appendChild(name);
      b.disabled = !owned;
      b.classList.toggle("is-on", state.outfit[wardrobeKid][wardrobeSlot] === it.id);
      b.addEventListener("click", function () { state = Save.equip(state, D, wardrobeKid, it.id); persist(); Sfx.coin(); paintWardrobe(); });
      grid.appendChild(b);
    });
    $("collectCount").textContent = "모은 조각 " + state.owned.length + " / " + D.ITEMS.length;
  }
  function itemBadge(it, owned) {
    if (!owned) { var q = document.createElement("span"); q.className = "i-icon"; q.textContent = "❔"; return q; }
    if (it.icon) { var i = document.createElement("span"); i.className = "i-icon"; i.textContent = it.icon; return i; }
    var sw = document.createElement("span"); sw.className = "swatch";
    sw.style.background = it.color === "rainbow" ? "linear-gradient(135deg,#ff5e7a,#ffe45c,#5ee07a,#58b8ff,#9b5cff)" : it.color;
    return sw;
  }
  function renderPreview(t) {
    var c = $("previewCanvas");
    pctx.setTransform(1, 0, 0, 1, 0, 0);
    pctx.clearRect(0, 0, c.width, c.height);
    var grd = pctx.createRadialGradient(260, 340, 40, 260, 340, 300);
    grd.addColorStop(0, "rgba(255,207,74,0.35)"); grd.addColorStop(1, "rgba(255,207,74,0)");
    pctx.fillStyle = grd; pctx.fillRect(0, 0, c.width, c.height);
    pctx.fillStyle = "rgba(0,0,0,0.3)"; pctx.beginPath(); pctx.ellipse(260, 590, 120, 22, 0, 0, Math.PI * 2); pctx.fill();
    drawHero(pctx, wardrobeKid, "idle", 260, 588 + Math.sin(t * 3) * 4, 540 * Math.min(1, (D.HEROES[wardrobeKid].scale || 1) / 1.06), 1, state.outfit[wardrobeKid], t, {});
  }

  // ---------- 캡슐 ----------
  var lastPrize = null;
  function paintCapsule() {
    paintStars();
    $("capsulePrize").hidden = true; $("wearPrize").hidden = true;
    $("capsuleBall").className = "capsule";
    var done = state.owned.length >= D.ITEMS.length;
    $("openCapsule").disabled = done || state.stars < D.CAPSULE_COST;
    $("capsuleHint").textContent = done ? "모든 조각을 다 모았어요! 👑" : state.stars < D.CAPSULE_COST
      ? "별이 " + (D.CAPSULE_COST - state.stars) + "개 더 있으면 열 수 있어요. 미션을 깨요!" : "별 3개로 새 꾸미기 조각이 나와요!";
  }
  $("openCapsule").addEventListener("click", function () {
    var res = Save.openCapsule(state, D);
    if (!res.item) { paintCapsule(); return; }
    state = res.state; persist(); lastPrize = res.item;
    $("openCapsule").disabled = true;
    var ball = $("capsuleBall");
    ball.className = "capsule is-shaking"; Sfx.warn();
    setTimeout(function () {
      ball.className = "capsule is-open"; Sfx.free();
      $("prizeIcon").replaceChildren(itemBadge(lastPrize, true));
      $("prizeName").textContent = lastPrize.name + "!";
      $("capsulePrize").hidden = false; $("wearPrize").hidden = false;
      $("capsuleHint").textContent = "새 조각이에요! 옷장에서 입혀 봐요.";
      paintStars();
      setTimeout(function () { $("openCapsule").disabled = state.stars < D.CAPSULE_COST || state.owned.length >= D.ITEMS.length; }, 400);
    }, 1050);
  });
  $("wearPrize").addEventListener("click", function () {
    if (!lastPrize) return;
    wardrobeKid = state.hero; wardrobeSlot = lastPrize.slot;
    state = Save.equip(state, D, wardrobeKid, lastPrize.id); persist();
    showScreen("wardrobe");
  });

  // ---------- 시작 ----------
  preload();
  showScreen("home");
  requestAnimationFrame(frame);

  // 점검용: 자동 브라우저 검사에서 상태를 읽고 미션을 바로 시작한다.
  window.__MV = {
    get state() { return state; }, get game() { return game; }, data: D,
    start: startMission, setState: function (s) { state = Save.normalise(s, D); persist(); showScreen("home"); },
    step: function (sec) { for (var i = 0; i < sec * 60; i++) { if (game && game.running && !game.paused) update(1 / 60); } }
  };
})();
