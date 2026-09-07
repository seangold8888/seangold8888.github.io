/* 매일 수학 10분 — 부모님 화면 */
(function () {
  "use strict";
  const C = window.Curriculum, S = window.MathStore;
  const $ = function (id) { return document.getElementById(id); };
  const storage = window.localStorage;
  let state = S.load(storage);

  function sec(ms) { return ms ? (ms / 1000).toFixed(1) + "초" : "—"; }
  function stabilityTag(cv) {
    if (cv == null) return '<span class="tag muted">아직</span>';
    return cv < 0.35 ? '<span class="tag ok">안정</span>' : '<span class="tag warn">흔들림</span>';
  }
  function td(text) { const c = document.createElement("td"); c.textContent = text; return c; }
  function tdHtml(html) { const c = document.createElement("td"); c.innerHTML = html; return c; }

  function render() {
    const L = C.levelById(state.level);
    $("sDays").textContent = Object.keys(state.stamps).length;
    const recent = state.history.slice(-3);
    $("sAcc").textContent = recent.length ? Math.round(recent.reduce(function (s, h) { return s + h.acc; }, 0) / recent.length) + "%" : "—";
    $("sLevel").textContent = L.id;
    $("levelName").textContent = L.id + "단계 · " + L.name;
    $("levelNote").textContent = L.unit + " · 연속 90% 달성 " + state.streak + "/2회 · 복습 대기 " + state.wrong.length + "문제";

    const rows = $("levelRows"); rows.textContent = "";
    S.levelSummary(state).forEach(function (r) {
      const tr = document.createElement("tr");
      tr.appendChild(td(r.level + " · " + C.levelById(r.level).name));
      tr.appendChild(td(r.sessions));
      tr.appendChild(td(r.acc == null ? "—" : r.acc + "%"));
      tr.appendChild(td(sec(r.medianMs)));
      tr.appendChild(tdHtml(stabilityTag(r.cv)));
      rows.appendChild(tr);
    });
    if (!rows.children.length) rows.appendChild(document.createElement("tr")).appendChild(td("아직 기록이 없어요."));

    const srows = $("sessionRows"); srows.textContent = "";
    state.history.slice(-10).reverse().forEach(function (h) {
      const tr = document.createElement("tr");
      tr.appendChild(td(h.date.slice(5)));
      tr.appendChild(td(h.level + (h.change > 0 ? " ↑" : h.change < 0 ? " ↓" : "")));
      tr.appendChild(td(h.firstTry + "/" + h.fresh + " (" + h.acc + "%)"));
      tr.appendChild(td(sec(h.medianMs)));
      tr.appendChild(td(h.reviews ? h.reviewOk + "/" + h.reviews : "—"));
      srows.appendChild(tr);
    });
    if (!srows.children.length) srows.appendChild(document.createElement("tr")).appendChild(td("아직 기록이 없어요."));

    const rrows = $("reviewRows"); rrows.textContent = "";
    state.wrong.slice().sort(function (a, b) { return a.due < b.due ? -1 : 1; }).forEach(function (w) {
      const tr = document.createElement("tr");
      tr.appendChild(td(w.text.replace("□", "▢")));
      tr.appendChild(td(w.level));
      tr.appendChild(td(w.miss));
      tr.appendChild(td(w.due.slice(5) + (w.stage ? " (" + (w.stage + 1) + "단계)" : "")));
      rrows.appendChild(tr);
    });
    if (!rrows.children.length) rrows.appendChild(document.createElement("tr")).appendChild(td("다시 나올 문제가 없어요."));

    $("name").value = state.name;
    $("level").value = String(state.level);
    $("perSession").value = String(state.perSession);
    $("visualPolicy").value = state.visualPolicy;
    $("sound").value = state.sound ? "1" : "0";
    $("sheetLevel").value = String(state.level);
  }

  function fillLevels(select) {
    C.LEVELS.forEach(function (L) {
      const o = document.createElement("option"); o.value = String(L.id); o.textContent = L.id + "단계 · " + L.unit + " · " + L.name; select.appendChild(o);
    });
  }
  fillLevels($("level")); fillLevels($("sheetLevel"));

  $("saveBtn").addEventListener("click", function () {
    state.name = $("name").value.trim();
    const level = parseInt($("level").value, 10);
    if (level !== state.level) { state.level = level; state.streak = 0; }
    state.perSession = parseInt($("perSession").value, 10);
    state.visualPolicy = $("visualPolicy").value;
    state.sound = $("sound").value === "1";
    S.save(storage, state); state = S.load(storage); render();
    $("saveBtn").textContent = "저장했어요 ✓"; setTimeout(function () { $("saveBtn").textContent = "저장"; }, 1500);
  });

  $("printBtn").addEventListener("click", function () {
    const level = parseInt($("sheetLevel").value, 10), n = parseInt($("sheetCount").value, 10);
    const L = C.levelById(level), seen = {}, list = [];
    let guard = 0;
    while (list.length < n && guard++ < 1000) { const p = C.makeProblem(level); if (seen[p.key]) continue; seen[p.key] = true; list.push(p); }
    const sheet = $("sheet"); sheet.textContent = "";
    const h = document.createElement("h1"); h.textContent = "매일 수학 10분 · " + L.id + "단계 " + L.name; sheet.appendChild(h);
    const meta = document.createElement("p"); meta.className = "meta"; meta.textContent = "이름: " + (state.name || "________") + "    날짜: " + S.today() + "    " + L.unit; sheet.appendChild(meta);
    const ol = document.createElement("ol");
    list.forEach(function (p) { const li = document.createElement("li"); li.innerHTML = p.text.replace("□", '<span class="blank"></span>'); ol.appendChild(li); });
    sheet.appendChild(ol);
    const ans = document.createElement("div"); ans.className = "ans";
    const h2 = document.createElement("h1"); h2.textContent = "정답"; ans.appendChild(h2);
    const ol2 = document.createElement("ol");
    list.forEach(function (p) { const li = document.createElement("li"); li.textContent = p.text.replace("□", String(p.answer)); ol2.appendChild(li); });
    ans.appendChild(ol2); sheet.appendChild(ans);
    window.print();
  });

  $("exportBtn").addEventListener("click", function () {
    try { $("io").value = btoa(unescape(encodeURIComponent(JSON.stringify(S.clean(state))))); $("io").select(); } catch (_) {}
  });
  $("importBtn").addEventListener("click", function () {
    try {
      const parsed = JSON.parse(decodeURIComponent(escape(atob($("io").value.trim()))));
      if (!parsed || typeof parsed !== "object") throw new Error("bad");
      if (!window.confirm("이 기기의 기록을 가져온 기록으로 바꿀까요?")) return;
      state = S.clean(parsed); S.save(storage, state); render(); $("io").value = "가져왔어요.";
    } catch (_) { $("io").value = "코드를 읽지 못했어요. 내보내기 코드를 그대로 붙여 넣어 주세요."; }
  });
  $("resetBtn").addEventListener("click", function () {
    if (!window.confirm("모든 기록(도장·단계·복습)을 지울까요? 되돌릴 수 없어요.")) return;
    state = S.defaults(); S.save(storage, state); render();
  });

  render();
})();
