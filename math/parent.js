/* 매일 수학 10분 — 부모님 화면 */
(function () {
  "use strict";
  const C = window.Curriculum, S = window.MathStore, Sc = window.MathSchedule, F = window.MathFriends;
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
  function md(d) { return d.slice(5).replace("-", "/"); }
  function plan() { return Sc.buildPlan({ start: state.planStart, end: state.planEnd, daysPerWeek: state.planDays, fromLevel: state.planFrom }); }

  function renderPlan() {
    const p = plan(), st = Sc.status(p, Object.keys(state.stamps), state.level, S.today());
    if (!st) { $("planHead").textContent = "계획 없음"; return; }
    const pg = C.levelById(st.plannedLevel), cur = C.levelById(state.level);
    $("planHead").textContent = st.finished ? "계획 기간이 끝났어요" : st.label + " · 오늘 계획 " + pg.id + "단계, 현재 " + cur.id + "단계";
    $("planDetail").textContent = "계획 " + st.plannedIndex + "/" + st.total + "회차 (" + md(st.startDate) + " ~ " + md(st.endDate) + ", 주 " + state.planDays + "일) · 지금까지 예정 " + st.expected + "일 중 실제 공부 " + st.done + "일" + (st.dayGap < 0 ? " · 빠진 날 " + (-st.dayGap) + "일" : st.dayGap > 0 ? " · 추가로 " + st.dayGap + "일 더" : "");
    const pct = Math.round(100 * st.plannedIndex / st.total);
    $("planBar").style.width = pct + "%";
    const donePct = Math.round(100 * Math.min(st.total, st.done) / st.total);
    $("planHere").style.left = donePct + "%";
    $("planLegend").textContent = "회색 막대 = 계획 진행률 " + pct + "%, 점 = 실제 공부한 날 기준 " + donePct + "%";

    const rows = $("milestoneRows"); rows.textContent = "";
    const today = S.today();
    Sc.milestones(p).forEach(function (m) {
      const L = C.levelById(m.level), g = F.guideFor(m.level);
      const end = p.slice().reverse().find(function (x) { return x.level === m.level; }).date;
      const tr = document.createElement("tr");
      tr.appendChild(td(L.id + " · " + L.name + " (" + g.name + ")"));
      tr.appendChild(td(md(m.date) + " ~ " + md(end)));
      tr.appendChild(td(m.days + "일"));
      const status = m.level < state.level ? '<span class="tag ok">완료</span>' : m.level === state.level ? '<span class="tag warn">지금 여기</span>' : (m.date <= today && end >= today) ? '<span class="tag muted">계획상 오늘</span>' : "";
      tr.appendChild(tdHtml(status));
      rows.appendChild(tr);
    });
    const prow = $("planRows"); prow.textContent = "";
    p.forEach(function (e) {
      const tr = document.createElement("tr");
      if (e.date === today) tr.style.fontWeight = "700";
      tr.appendChild(td(e.i)); tr.appendChild(td(e.date)); tr.appendChild(td(e.level + "단계"));
      tr.appendChild(td(state.stamps[e.date] ? "✓" : (e.date < today ? "–" : "")));
      prow.appendChild(tr);
    });
  }

  function renderParty() {
    const E=window.PartyEngine;
    if (!E || !storage.getItem(E.KEY)) return;
    const party=E.load(storage), labels=["불빛","선물","풍선"];
    const current=E.completed(party).filter(Boolean).length;
    const detail=party.history.slice(-3).map(function(e){return labels[e.stage]+(e.help?" (함께 해요 사용)":"")+(e.mistakes?" · 다시 시도 "+e.mistakes+"회":"");}).join(" / ");
    $("partyPracticeSummary").textContent="현재 파티 준비 "+current+"/3 · "+(party.stage===3?"완성한 파티에서 자유놀이 중":"준비 중")+" · 저장된 활동 "+party.history.length+"개"+(detail?" — 최근: "+detail:"");
  }
  function renderSchool() {
    try {
      const raw=JSON.parse(storage.getItem("math10_school_v1")||"null");
      if(!raw||raw.version!==1)return;
      const history=Array.isArray(raw.history)?raw.history:[];
      const last=history[history.length-1],s=raw.session;
      const pending=s&&!s.archived&&Array.isArray(s.order)&&s.index<s.order.length?" · 이어할 연습 "+s.index+"/"+s.order.length:"";
      $("schoolPracticeSummary").textContent="마친 연습 "+history.length+"회"+(last?" · 최근 "+last.total+"문항 중 도움 없이 해결 "+last.independent+"개, 함께 연습 "+last.helped+"개":"")+pending;
    } catch (_) { $("schoolPracticeSummary").textContent="학교 연습 기록을 읽을 수 없어요."; }
  }
  function renderWeekly() {
    const W=window.WeeklyExam;
    if(!W)return;
    const data=W.load(storage),status=W.status(data),last=data.exams.filter(e=>e.submittedAt).slice(-1)[0];
    $("weeklySummary").textContent="매주 "+"일월화수목금토"[data.settings.weekday]+"요일 · 최대 "+data.settings.count+"문제"+(status.active?" · 이어할 시험 있음":status.exam?" · 이번 주 제출 완료":" · 이번 주 "+status.due+"부터")+(last?" · 최근 시험 "+W.result(last).score+"점":"");
  }
  function render() {
    renderWeekly();
    renderSchool();
    renderParty();
    const L = C.levelById(state.level);
    $("sDays").textContent = Object.keys(state.stamps).length;
    const recent = state.history.slice(-3);
    $("sAcc").textContent = recent.length ? Math.round(recent.reduce(function (s, h) { return s + h.acc; }, 0) / recent.length) + "%" : "—";
    $("sLevel").textContent = L.id;
    renderPlan();
    const skills=window.MathLearning.summary(state,state.level), mastered=skills.filter(function(x) { return x.mastered; });
    $("learningNote").textContent=skills.length+"개 개념 중 "+mastered.length+"개를 다른 날에도 혼자 해결했어요. 놀이터에는 탐험 도장 "+(state.garden || 0)+"개가 쌓였어요.";
    const skillList=$("skillList"); skillList.textContent="";
    skills.forEach(function(skill) {
      const cell=document.createElement("div");cell.className="skill-item"+(skill.mastered?" mastered":"");
      const title=document.createElement("span");title.textContent=(skill.mastered?"✿ ":"✧ ")+skill.label;
      const detail=document.createElement("small"); detail.textContent=skill.count ? "최근 독립 해결 "+skill.correct+"/"+skill.count+" · 성공한 날 "+skill.days+"일 · "+(skill.mastered?"다른 날에도 해냈어요":"더 살펴보는 중") : "아직 만나지 않은 개념";
      cell.append(title,detail);skillList.appendChild(cell);
    });
    $("familyPlay").textContent=state.level <= 4 ? "오늘 함께할 놀이: 블록을 10개 놓고 일부를 가려 주세요. 보이는 수와 가려진 수를 어떻게 알았는지 들어 주세요." : state.level === 5 ? "오늘 함께할 놀이: 빨대를 10개씩 묶고 낱개를 더해 수를 만들어 보세요. 십과 일을 나눠 설명하는지 살펴보세요." : "오늘 함께할 놀이: 간식 가게를 열어 더하거나 남기는 상황을 만들어 보세요. 답을 구한 방법을 재이의 말로 들어 주세요.";

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
      tr.appendChild(td(md(h.date)));
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
      tr.appendChild(td(md(w.due) + (w.stage ? " (" + (w.stage + 1) + "단계)" : "")));
      rrows.appendChild(tr);
    });
    if (!rrows.children.length) rrows.appendChild(document.createElement("tr")).appendChild(td("다시 나올 문제가 없어요."));

    const today = S.today(), hearts = Object.keys(state.hearts).length;
    $("heartToday").disabled = !!state.hearts[today];
    $("heartToday").textContent = state.hearts[today] ? "♥ 오늘 칭찬 도장 완료" : "♥ 오늘 칭찬 도장 찍기";
    $("heartInfo").textContent = "지금까지 칭찬 도장 " + hearts + "개 · 친구 앨범 " + new Set(state.album.map(function (a) { return a.id; })).size + "/22명 · 반짝 이상 스티커 " + state.album.filter(function (a) { return a.r >= 1; }).length + "장";
    $("placementInfo").textContent = state.placement
      ? state.placement.date.replace(/-/g, ".") + " 확인 · " + state.placement.level + "단계에서 시작 · " + state.placement.asked + "문제 중 " + state.placement.correct + "개 정답" + (state.placement.medianMs ? " · 중간 " + (state.placement.medianMs / 1000).toFixed(1) + "초" : "")
      : "아직 실력 확인을 하지 않았어요. 아이 화면을 열면 처음에 진행됩니다.";
    $("school").value = state.school || ""; $("grade").value = String(state.grade || 1);
    $("name").value = state.name;
    $("level").value = String(state.level);
    $("perSession").value = String(state.perSession);
    $("visualPolicy").value = state.visualPolicy;
    $("sound").value = state.sound ? "1" : "0";
    $("music").value = state.music ? "1" : "0";
    $("friendPrompts").value = state.friendPrompts ? "1" : "0";
    $("sheetLevel").value = String(state.level);
    $("planStart").value = state.planStart; $("planEnd").value = state.planEnd;
    $("planDays").value = String(state.planDays); $("planFrom").value = String(state.planFrom);
  }

  function fillLevels(select) {
    C.LEVELS.forEach(function (L) {
      const o = document.createElement("option"); o.value = String(L.id); o.textContent = L.id + "단계 · " + L.unit + " · " + L.name; select.appendChild(o);
    });
  }
  fillLevels($("level")); fillLevels($("sheetLevel")); fillLevels($("planFrom"));

  $("saveBtn").addEventListener("click", function () {
    state.name = $("name").value.trim();
    state.school = $("school").value.trim(); state.grade = parseInt($("grade").value, 10) || 1;
    const level = parseInt($("level").value, 10);
    if (level !== state.level) { state.level = level; state.streak = 0; state.pending = null; }
    state.perSession = parseInt($("perSession").value, 10);
    state.visualPolicy = $("visualPolicy").value;
    state.sound = $("sound").value === "1";
    state.music = $("music").value === "1";
    state.friendPrompts = $("friendPrompts").value === "1";
    state.planStart = $("planStart").value || state.planStart;
    state.planEnd = $("planEnd").value || state.planEnd;
    state.planDays = parseInt($("planDays").value, 10);
    state.planFrom = parseInt($("planFrom").value, 10);
    S.save(storage, state); state = S.load(storage); render();
    $("saveBtn").textContent = "저장했어요 ✓"; setTimeout(function () { $("saveBtn").textContent = "저장"; }, 1500);
  });

  $("printBtn").addEventListener("click", function () {
    const level = parseInt($("sheetLevel").value, 10), n = parseInt($("sheetCount").value, 10);
    const L = C.levelById(level), seen = {}, list = [];
    let guard = 0;
    while (list.length < n && guard++ < 1000) { const p = C.makeProblem(level); if (seen[p.key]) continue; seen[p.key] = true; list.push(p); }
    const sheet = $("sheet"); sheet.textContent = "";
    const h = document.createElement("h1"); h.textContent = "재이의 수학놀이터 · " + L.id + "단계 " + L.name; sheet.appendChild(h);
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
  $("replaceBtn").addEventListener("click", function () {
    if (!window.confirm("아이 화면을 열 때 실력 확인을 다시 할까요? (기록은 그대로)")) return;
    state.placed = false; state.pending = null; S.save(storage, state); render();
    $("replaceBtn").textContent = "다음에 아이 화면을 열면 실력 확인부터 해요";
  });
  $("heartToday").addEventListener("click", function () { state.hearts[S.today()] = true; S.save(storage, state); render(); });
  $("resetAllBtn").addEventListener("click", function () {
    if (!window.confirm("모든 기록(이름·단계·스티커·코인·옷장)을 지우고 처음부터 시작할까요? 되돌릴 수 없어요.")) return;
    try { storage.removeItem(S.KEY); } catch (_) {}
    window.location.href = "index.html";
  });
  $("resetBtn").addEventListener("click", function () {
    if (!window.confirm("모든 기록(스티커·단계·복습)을 지울까요? 되돌릴 수 없어요.")) return;
    state = S.defaults(); S.save(storage, state); render();
  });

  render();
})();
