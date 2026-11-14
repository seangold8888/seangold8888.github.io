/* KidVoices — 아이 넷의 "영웅 외침" 클립 표 하나와 외침 재생기 (여러 게임이 같이 쓴다)
 *
 * 불러오는 순서(일반 <script>, game-quiz.js 보다 먼저):
 *   curriculum → learning → store → math-bridge → kid-voices → game-quiz
 *   <script src="../assets/study/kid-voices.js?v=1"></script>
 *
 * 쓰는 법:
 *   KidVoices.list("taeo")                → [[주소, "대사"], ...]  (주소는 이 파일 위치 기준으로 풀어 둔 절대 주소)
 *   KidVoices.shout("taeo")               → 그 아이 클립 하나를 무작위로(바로 앞과 같은 것은 빼고) 튼다. 손가락 처리 안에서 부를 것.
 *   KidVoices.shout("taeo", { ctx, out, force:true, reason:"quiz" })
 *       ctx: 게임이 이미 쓰는 AudioContext(있으면 그쪽으로, 없으면 <audio> 하나를 돌려 쓴다)
 *       out: ctx 쪽 연결할 노드(기본 ctx.destination), force: 3초 간격 무시(하던 외침은 끊는다)
 *   KidVoices.preload("taeo"[, ctx])      → 미리 받아 두기(선택)
 *   KidVoices.log()                       → 점검용 기록
 *
 * 지킬 것: speechSynthesis 절대 금지(아이패드 마이크가 죽는다). 한 번에 외침 하나. 기본 3초 간격.
 * 실패는 조용히. Node·자동화 브라우저(navigator.webdriver)에서는 소리를 내지 않고 기록만 남긴다.
 * 클립은 모두 이미 녹음된 로컬 파일(ElevenLabs로 미리 만든 것)이다. 게임 안에서 유료 API를 부르지 않는다.
 */
(function (root) {
  "use strict";

  // 주소는 저장소 뿌리 기준. 그 아이 목소리가 아닌 클립은 넣지 않는다.
  var FS = "sanguo/audio/family-skills-v1/", HC = "sanguo/audio/hero-callouts-eleven-v2/", AV = "cards/audio/attack-voices-v1/";
  var TABLE = {
    yunchan: [
      [HC + "yunchan-callout-v2.wav", "마마보이!"],
      [AV + "chanppul.mp3", "번개맨 천둥쇼!"],
      [FS + "yunchan-special-eleven-bored-v1.mp3", "엄마 심심해!"],
      [FS + "yunchan-special-eleven-funthing-v1.mp3", "재밌는 거 없어?"]
    ],
    jaei: [
      [HC + "jaei-callout-v2.wav", "김태오!"],
      [FS + "jaei-special-eleven-no-v1.mp3", "아니야!"],
      [FS + "jaei-special-eleven-wait-v1.mp3", "기다려!"],
      [FS + "jaei-special-eleven-sireo-v1.mp3", "시러!"],
      [AV + "jaewing.mp3", "바이킹 그네 밀기!"]
    ],
    yungeon: [
      [HC + "yungeon-callout-v2.wav", "너무 쉽잖아!"],
      [AV + "geonppul.mp3", "헐크 박치기!"],
      [FS + "yungeon-special-eleven-bulletshot-v1.mp3", "총알 슛!"],
      [FS + "yungeon-special-eleven-hurricaneshot-v1.mp3", "해리케인 슛!"],
      [FS + "yungeon-special-eleven-yamalshot-v1.mp3", "라민 야말 슛!"]
    ],
    taeo: [
      [FS + "taeo-special-eleven-sseugumi-only-v1.mp3", "쓰구미!"],
      [FS + "taeo-special-eleven-fight-v1.mp3", "싸우자!"],
      [FS + "taeo-special-eleven-kiap-v1.mp3", "치앗! 촤! 치앗! 촤!"],
      [FS + "taeo-special-eleven-meganaptor-v1.mp3", "메가냅터킥!"],
      [FS + "taeo-special-eleven-yummy-v1.mp3", "맛있는 거죠!"],
      [FS + "taeo-special-eleven-nosleep-v1.mp3", "잠 못 자게 한다!"]
    ]
  };
  var GAP_MS = 3000, VOLUME = 0.9;

  var W = typeof window !== "undefined" ? window : null;
  var nav = W && W.navigator;
  var SILENT = !W || !W.document || !!(nav && nav.webdriver);

  // 이 파일이 있는 곳(assets/study/)에서 두 칸 위 = 저장소 뿌리.
  var BASE = "";
  try {
    var cs = W && W.document && W.document.currentScript;
    BASE = cs && cs.src ? new URL("../../", cs.src).href : (W && W.location ? new URL("/", W.location.href).href : "");
  } catch (_) { BASE = ""; }
  function abs(p) { try { return BASE ? new URL(p, BASE).href : p; } catch (_) { return p; } }

  function now() { return W && W.performance ? W.performance.now() : Date.now(); }
  function list(kid) {
    var t = TABLE[kid]; if (!t) return [];
    return t.map(function (x) { return [abs(x[0]), x[1]]; });
  }
  function kids() { return Object.keys(TABLE); }

  /* ---------- 고르기: 바로 앞과 같은 클립은 빼고 무작위 ---------- */
  var lastPick = {};
  function pickIndex(kid, rng) {
    var n = TABLE[kid] ? TABLE[kid].length : 0; if (!n) return -1;
    rng = rng || Math.random;
    var i = Math.floor(rng() * n);
    if (n > 1 && i === lastPick[kid]) i = (i + 1 + Math.floor(rng() * (n - 1))) % n;
    lastPick[kid] = i; return i;
  }

  /* ---------- 재생 ---------- */
  var logs = [], t0 = now();
  function record(e) { e.t = Math.round(now() - t0); e.at = Date.now(); logs.push(e); if (logs.length > 200) logs.splice(0, logs.length - 200); return e; }

  var el = null;                 // <audio> 하나를 돌려 쓴다(iOS: 손가락 처리 안에서 play 하면 그 뒤로도 쓸 수 있다)
  var cur = null;                // 지금 나는 외침 { kind, stop, until }
  var lastAt = -1e9;
  var buffers = new WeakMap();   // ctx → { url: AudioBuffer | Promise }

  function busy() { return cur && now() < cur.until; }
  function stopCurrent() {
    if (!cur) return;
    try { cur.stop(); } catch (_) {}
    cur = null;
  }
  function audioEl() {
    if (el) return el;
    try { el = new W.Audio(); el.preload = "auto"; el.setAttribute("playsinline", ""); } catch (_) { el = null; }
    return el;
  }
  function bufCache(ctx) { var c = buffers.get(ctx); if (!c) { c = {}; buffers.set(ctx, c); } return c; }
  function loadBuf(ctx, url) {
    var c = bufCache(ctx);
    if (c[url]) return c[url];
    var p = fetch(url).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.arrayBuffer(); })
      .then(function (b) { return new Promise(function (ok, no) { var q = ctx.decodeAudioData(b, ok, no); if (q && q.catch) q.catch(no); }); })
      .then(function (buf) {
        var d = buf.getChannelData(0), pk = 0; for (var k = 0; k < d.length; k += 2) pk = Math.max(pk, Math.abs(d[k]));
        var v = { buf: buf, gain: Math.min(2.5, 0.85 / Math.max(0.05, pk)) }; c[url] = v; return v;
      });
    c[url] = p;
    p.catch(function () { if (c[url] === p) delete c[url]; });
    return p;
  }
  function preload(kid, ctx) {
    if (SILENT) return;
    list(kid).forEach(function (x) {
      try {
        if (ctx && ctx.decodeAudioData) loadBuf(ctx, x[0]);
        else if (typeof fetch === "function") fetch(x[0]).catch(function () {});
      } catch (_) {}
    });
  }

  function playCtx(ctx, out, v, e) {
    var s = ctx.createBufferSource(), g = ctx.createGain();
    s.buffer = v.buf; g.gain.value = v.gain * VOLUME; s.connect(g); g.connect(out || ctx.destination);
    s.start(ctx.currentTime + 0.01);
    var c = cur = { kind: "ctx", until: now() + v.buf.duration * 1000 + 60, stop: function () { try { s.stop(); } catch (_) {} } };
    s.onended = function () { try { g.disconnect(); } catch (_) {} if (cur === c) cur = null; };
    e.path = "ctx"; e.dur = Math.round(v.buf.duration * 1000) / 1000;
  }
  function playEl(url, e) {
    var a = audioEl(); if (!a) { e.blocked = "noaudio"; return false; }
    try { a.pause(); } catch (_) {}
    a.src = url; a.volume = VOLUME;
    try { a.currentTime = 0; } catch (_) {}
    var c = cur = { kind: "el", until: now() + 2600, stop: function () { try { a.pause(); } catch (_) {} } };
    a.onended = function () { if (cur === c) cur = null; };
    a.onloadedmetadata = function () { if (cur === c && isFinite(a.duration)) c.until = now() + a.duration * 1000; };
    a.onerror = function () { if (cur === c) cur = null; e.error = "load"; };
    var p; try { p = a.play(); } catch (err) { if (cur === c) cur = null; e.error = String(err && err.name || err); return false; }
    if (p && p.catch) p.catch(function (err) { if (cur === c) cur = null; e.error = String(err && err.name || err); });
    e.path = "audio";
    return true;
  }

  // shout(kid, opts) → 기록 객체(e.played true/false). 실패해도 던지지 않는다.
  function shout(kid, opts) {
    opts = opts || {};
    var e = { kid: kid, reason: opts.reason || "", force: !!opts.force, played: false };
    try {
      if (!TABLE[kid]) { e.blocked = "kid"; return record(e); }
      if (W && W.document && W.document.hidden) { e.blocked = "hidden"; return record(e); }
      var t = now();
      if (!opts.force) {
        if (busy()) { e.blocked = "busy"; return record(e); }
        if (t - lastAt < (opts.gap != null ? opts.gap : GAP_MS)) { e.blocked = "gap"; return record(e); }
      }
      var i = pickIndex(kid, opts.rng), url = abs(TABLE[kid][i][0]);
      e.line = TABLE[kid][i][1]; e.url = url;
      lastAt = t;
      if (SILENT) { e.silent = true; e.played = true; return record(e); }
      stopCurrent();
      var ctx = opts.ctx;
      if (ctx && ctx.state === "running" && ctx.createBufferSource) {
        var v = bufCache(ctx)[url];
        if (v && v.buf) { playCtx(ctx, opts.out, v, e); e.played = true; return record(e); }
        loadBuf(ctx, url).catch(function () {});      // 다음 번을 위해 받아 두고, 이번엔 <audio> 로 바로 낸다
      }
      e.played = playEl(url, e);
      return record(e);
    } catch (err) { e.error = String(err); return record(e); }
  }

  var api = {
    TABLE: TABLE, GAP_MS: GAP_MS,
    list: list, kids: kids, shout: shout, preload: preload, pickIndex: pickIndex,
    stop: stopCurrent,
    log: function () { return logs.slice(); },
    clearLog: function () { logs.length = 0; },
    _reset: function () { lastPick = {}; lastAt = -1e9; cur = null; logs.length = 0; }
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.KidVoices = api;
})(typeof window !== "undefined" ? window : globalThis);
