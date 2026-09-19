// 모험 상자 게임 시간. 문제 10개로 받은 티켓 한 장 = 게임 5분.
// 대시보드(data-mode="hub")는 시간을 내주기만 하고, 게임 화면(기본)은 남은 시간을 보여 주다가
// 끝나면 모험 상자로 돌려보낸다. 하루 100문제를 채우거나 부모님 모드면 그날은 시간 제한이 없다.
// 끝나는 시각을 기기에 적어 두므로 새로고침하거나 다른 게임으로 옮겨도 시간이 다시 차지 않는다.
(function () {
  "use strict";

  var KEY = "hub_play_pass";
  var FORCE_KEY = "hub_play_timer_force";
  var MINUTES_PER_TICKET = 5;
  var WARN_MS = 60 * 1000;
  var REDIRECT_MS = 10 * 1000;
  var script = document.currentScript;
  var mode = script && script.dataset && script.dataset.mode === "hub" ? "hub" : "game";
  var hubUrl = new URL("../../game/", script && script.src ? script.src : location.href).href;

  function today() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function read() {
    try {
      var pass = JSON.parse(localStorage.getItem(KEY) || "null");
      return pass && typeof pass === "object" ? pass : null;
    } catch (error) {
      return null;
    }
  }
  function write(pass) {
    try { localStorage.setItem(KEY, JSON.stringify(pass)); } catch (error) {}
  }
  function isFreeToday(pass) {
    return Boolean(pass && pass.free === true && pass.day === today());
  }
  function remainingMs(pass) {
    if (!pass || typeof pass.until !== "number") return 0;
    return Math.max(0, pass.until - Date.now());
  }
  function active() {
    var pass = read();
    return isFreeToday(pass) || remainingMs(pass) > 0;
  }

  var api = {
    minutesPerTicket: MINUTES_PER_TICKET,
    // 티켓 한 장을 쓸 때. 남은 시간이 있으면 그 뒤에 이어 붙인다.
    grant: function (minutes) {
      var pass = read();
      var base = Math.max(Date.now(), pass && typeof pass.until === "number" ? pass.until : 0);
      var next = { until: base + Math.max(1, Number(minutes) || MINUTES_PER_TICKET) * 60 * 1000 };
      write(next);
      return next;
    },
    // 하루 100문제를 채웠거나 부모님 모드일 때.
    grantFree: function () {
      var pass = read() || {};
      var next = { free: true, day: today(), until: typeof pass.until === "number" ? pass.until : 0 };
      write(next);
      return next;
    },
    active: active,
    remainingMs: function () { return remainingMs(read()); },
    isFreeToday: function () { return isFreeToday(read()); },
    format: format,
    hubUrl: hubUrl
  };
  window.HubPlayTimer = api;

  function format(ms) {
    var total = Math.ceil(ms / 1000);
    var m = Math.floor(total / 60), s = total % 60;
    return m + ":" + String(s).padStart(2, "0");
  }

  if (mode === "hub") return;
  // 자동 점검 브라우저에서는 게임 화면 점검을 막지 않는다. 시간 제한 점검 때만 켠다.
  var forced = false;
  try { forced = localStorage.getItem(FORCE_KEY) === "1"; } catch (error) {}
  if (navigator.webdriver && !forced) return;

  var style = document.createElement("style");
  style.textContent =
    ".hub-play-chip{position:fixed;left:10px;bottom:10px;z-index:2147483600;padding:6px 11px;border-radius:999px;" +
    "background:rgba(20,16,48,.78);color:#fff;font:700 15px/1.2 system-ui,-apple-system,sans-serif;pointer-events:none;" +
    "box-shadow:0 4px 14px rgba(0,0,0,.35);letter-spacing:.02em}" +
    ".hub-play-chip.is-warn{background:rgba(214,120,0,.92)}" +
    ".hub-play-over{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;" +
    "background:rgba(10,8,30,.86);font-family:system-ui,-apple-system,sans-serif;padding:24px}" +
    ".hub-play-over .box{max-width:420px;width:100%;background:#fff8e8;color:#2a2140;border-radius:22px;padding:26px 22px;text-align:center;" +
    "box-shadow:0 18px 50px rgba(0,0,0,.45)}" +
    ".hub-play-over h2{margin:0 0 10px;font-size:24px}.hub-play-over p{margin:0 0 18px;font-size:17px;line-height:1.5}" +
    ".hub-play-over a{display:inline-block;padding:14px 22px;border-radius:14px;background:#ffcf4a;color:#2a2140;font-weight:800;" +
    "font-size:18px;text-decoration:none;box-shadow:0 4px 0 #c9951a}" +
    ".hub-play-over small{display:block;margin-top:14px;font-size:14px;opacity:.7}";
  document.head.appendChild(style);

  var chip = null, overlay = null, timer = 0;

  function stopMedia() {
    document.querySelectorAll("audio,video").forEach(function (el) { try { el.pause(); } catch (error) {} });
  }
  function showOverlay(neverStarted) {
    if (overlay) return;
    clearInterval(timer);
    if (chip) chip.remove();
    stopMedia();
    overlay = document.createElement("div");
    overlay.className = "hub-play-over";
    overlay.setAttribute("role", "alertdialog");
    overlay.setAttribute("aria-live", "assertive");
    var box = document.createElement("div");
    box.className = "box";
    var title = document.createElement("h2");
    title.textContent = neverStarted ? "🎟️ 게임 티켓이 필요해요" : "⏰ 게임 시간이 끝났어요!";
    var text = document.createElement("p");
    text.textContent = "모험 상자에서 문제 10개를 풀면 " + MINUTES_PER_TICKET + "분 더 놀 수 있어요.";
    var link = document.createElement("a");
    link.href = hubUrl;
    link.textContent = "모험 상자로 가기";
    var note = document.createElement("small");
    box.append(title, text, link, note);
    overlay.appendChild(box);
    // 뒤의 게임을 누를 수 없게 모든 입력을 막는다.
    ["pointerdown", "pointerup", "click", "touchstart", "keydown"].forEach(function (type) {
      overlay.addEventListener(type, function (event) {
        if (event.target !== link) { event.stopPropagation(); if (event.cancelable) event.preventDefault(); }
      }, true);
    });
    document.addEventListener("keydown", function (event) {
      if (overlay) { event.stopPropagation(); event.preventDefault(); }
    }, true);
    document.body.appendChild(overlay);
    var leaveAt = Date.now() + REDIRECT_MS;
    var countdown = setInterval(function () {
      var left = Math.max(0, Math.ceil((leaveAt - Date.now()) / 1000));
      note.textContent = left + "초 뒤에 모험 상자로 돌아가요";
      if (left <= 0) { clearInterval(countdown); location.href = hubUrl; }
    }, 250);
  }
  function tick() {
    var pass = read();
    if (isFreeToday(pass)) {
      if (chip) { chip.remove(); chip = null; }
      return;
    }
    var left = remainingMs(pass);
    if (left <= 0) { showOverlay(false); return; }
    if (!chip) {
      chip = document.createElement("div");
      chip.className = "hub-play-chip";
      chip.setAttribute("aria-live", "off");
      (document.body || document.documentElement).appendChild(chip);
    }
    var warn = left <= WARN_MS;
    // 마지막 1분은 주황색으로 바꾸고 문구를 계속 붙여 둔다.
    chip.textContent = "⏱ " + format(left) + (warn ? " · 곧 끝나요!" : "");
    chip.classList.toggle("is-warn", warn);
  }
  function start() {
    var pass = read();
    if (!isFreeToday(pass) && remainingMs(pass) <= 0) {
      // 게임 시간을 받은 적이 없거나 이미 끝났으면 바로 막는다.
      showOverlay(!pass || typeof pass.until !== "number" || pass.until === 0);
      return;
    }
    tick();
    timer = setInterval(tick, 1000);
  }
  // 화면을 다시 켰을 때 그사이 시간이 끝났을 수 있다.
  document.addEventListener("visibilitychange", function () { if (!document.hidden && !overlay) tick(); });
  window.addEventListener("pageshow", function () { if (!overlay) tick(); });

  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start);
})();
