(function(){
"use strict";
const W=window.WeeklyExam,Q=window.SchoolQuestions,V=window.SchoolView,$=id=>document.getElementById(id),el=V.el;
let storage;try{storage=window.localStorage;}catch(_){storage={getItem:()=>null,setItem:()=>{throw Error("storage");}};}
let data=W.load(storage),selected=null,currentPage="menu",memoryOnly=false;
function read(key){try{return JSON.parse(storage.getItem(key)||"null");}catch(_){return null;}}
function refresh(){if(memoryOnly)return;try{if(storage.getItem(W.KEY)!==null)data=W.load(storage);}catch(_){}}
function save(){memoryOnly=!W.save(storage,data);if(memoryOnly)$("storageNote").textContent="지금은 저장이 어려워요. 이 화면에서 계속할 수 있지만 나가면 답안이 사라질 수 있어요.";}
function exam(){return data.exams.find(e=>e.week===selected);}
function screen(name){currentPage=name;["menu","exam","submitReview","result"].forEach(id=>$(id).hidden=id!==name);$("pause").hidden=name!=="exam";}
function scope(){return W.scope(data.settings,read("math10_school_v1"),read("math10_state"));}
function settings(){
 const s=data.settings;$("weekday").value=s.weekday;$("count").value=s.count;$("source").value=s.source;$("manualTypes").hidden=s.source!=="manual";
 $("typeChecks").replaceChildren();Q.NAMES.forEach((name,i)=>{const label=el("label"),input=el("input");input.type="checkbox";input.value=String(i);input.checked=s.types.includes(i);label.append(input,el("span",name));$("typeChecks").append(label);});
}
function menu(){
 refresh();screen("menu");const st=W.status(data),sc=scope(),available=sc.source==="level"?!!sc.level:sc.types.length>0;
 $("scheduleInfo").textContent="매주 "+"일월화수목금토"[data.settings.weekday]+"요일부터 · 최대 "+data.settings.count+"문제 · 이번 주 "+st.due+"부터";
 $("scopeInfo").textContent="출제 범위: "+sc.label;
 $("resumeExam").hidden=!st.active;$("thisResult").hidden=!(st.exam&&st.exam.submittedAt);$("startExam").hidden=!(st.ready&&available);
 $("weekStatus").textContent=st.active?st.active.week+" 주에 시작한 시험이 있어요. 답을 이어서 쓸 수 있어요.":st.exam?"이번 주 시험을 마쳤어요. 다음 시험은 "+st.nextDue+"부터 열려요.":!available?"아직 출제할 진도가 없어요. 학교 유형을 연습하거나 부모님 설정에서 배운 범위를 골라 주세요.":st.ready?"이번 주 시험이 열렸어요. 한 번 응시하고, 제출 전에는 자유롭게 답을 바꿔요.":st.due+"에 이번 주 시험이 열려요.";
 settings();$("history").replaceChildren();data.exams.filter(e=>e.submittedAt).slice().reverse().forEach(e=>{const r=W.result(e),b=el("button",e.week+" 주 · "+r.score+"점 ("+r.correct+"/"+r.total+")","btn secondary");b.onclick=()=>{selected=e.week;result();};$("history").append(b);});
 if(!$("history").children.length)$("history").append(el("p","아직 제출한 시험이 없어요.","tiny"));
}
function draw(){
 const e=exam();if(!e)return menu();if(e.submittedAt)return result();screen("exam");const q=e.questions[e.index];
 $("progress").textContent=(e.index+1)+" / "+e.questions.length;$("typeName").textContent=q.name;$("frozenScope").textContent=e.scope.label;
 $("questionTitle").textContent=q.text;V.visual(q,$("visual"));V.answers(q,e.drafts[e.index],false,$("answers"));$("reasonField").hidden=!q.reason;$("reason").value=e.reasons[e.index]||"";
 $("questionNav").replaceChildren();const missing=W.unanswered(e);
 e.questions.forEach((_,i)=>{const b=el("button",String(i+1),missing.includes(i)?"":"answered");b.setAttribute("aria-label",(i+1)+"번 "+(missing.includes(i)?"미응답":"답 작성"));b.setAttribute("aria-current",String(i===e.index));b.onclick=()=>move(i);$("questionNav").append(b);});
 $("prev").disabled=e.index===0;$("next").textContent=e.index===e.questions.length-1?"답안 확인 →":"다음 문제";
}
function draft(){
 const old=exam();if(!old||old.submittedAt)return;const i=old.index,q=old.questions[i],values=V.read(q,$("answers")),reason=$("reason").value;
 refresh();const e=exam();if(!e||e.submittedAt){result();return;}
 W.edit(e,i,values,reason);e.index=i;save();
 const missing=W.unanswered(e);Array.from($("questionNav").children).forEach((b,n)=>{b.classList.toggle("answered",!missing.includes(n));b.setAttribute("aria-label",(n+1)+"번 "+(missing.includes(n)?"미응답":"답 작성"));});
}
function move(i){draft();const e=exam();if(!e||e.submittedAt)return result();e.index=i;save();draw();$("questionTitle").focus({preventScroll:true});window.scrollTo(0,0);}
function reviewSubmit(){
 draft();const e=exam();if(!e||e.submittedAt)return result();screen("submitReview");
 const missing=W.unanswered(e);$("missingNote").textContent=missing.length?"아직 답을 쓰지 않은 문제가 "+missing.length+"개예요: "+missing.map(i=>i+1).join(", ")+"번":"모든 문제에 답을 썼어요. 제출할 준비가 됐어요.";
 $("answerOverview").replaceChildren();e.questions.forEach((q,i)=>{const b=el("button",(i+1)+"번 · "+q.name+" · "+(missing.includes(i)?"미응답":"답 작성함"),"btn secondary");b.onclick=()=>move(i);$("answerOverview").append(b);});
 window.scrollTo(0,0);
}
function result(){
 const e=exam();if(!e)return menu();if(!e.submittedAt)return draw();screen("result");const r=W.result(e);
 $("resultWeek").textContent=e.week+" 주 시험 · 제출 "+e.submittedAt;$("score").textContent=r.score+"점 · "+r.correct+" / "+r.total+"문제";$("resultScope").textContent=e.scope.label;
 $("groupResults").replaceChildren();Object.entries(r.groups).forEach(([g,v])=>$("groupResults").append(el("p",(Q.GROUPS[g]||(g.startsWith("level-")?"놀이터 "+g.slice(6)+"단계":g))+" "+v.correct+"/"+v.total)));
 $("review").replaceChildren();e.questions.forEach((q,i)=>{const d=el("details",undefined,"review-item");d.append(el("summary",(i+1)+". "+q.name+" · "+(r.rows[i].correct?"맞았어요":"다시 살펴봐요")),el("p",q.text));
 const userAnswer=q.mode==="fields"?e.drafts[i].join(" / "):e.drafts[i].map(v=>(q.options||[])[Number(v)]||"").join(", ");
 d.append(el("p","내 답: "+(userAnswer||"미응답")),el("p","정답: "+V.answerLabel(q)),el("p",q.explain));
 if(q.reason){d.append(el("p","내 풀이: "+(e.reasons[i]||"말로 설명하거나 아직 쓰지 않았어요."),"own-reason"),el("p","풀이 글은 자동 채점하지 않아요. 예시와 함께 비교해 주세요."));}
 $("review").append(d);});window.scrollTo(0,0);
}
$("settingsForm").onsubmit=ev=>{ev.preventDefault();refresh();const config={weekday:Number($("weekday").value),count:Number($("count").value),source:$("source").value,types:Array.from($("typeChecks").querySelectorAll("input:checked")).map(n=>Number(n.value))};
 if(config.source==="manual"&&!config.types.length){$("settingsNote").textContent="배운 유형을 하나 이상 골라 주세요.";return;}
 data.settings=W.settings(config);save();menu();$("settingsPanel").open=true;$("settingsNote").textContent="저장했어요. 아직 시작하지 않은 시험부터 적용돼요.";};
$("source").onchange=()=>{$("manualTypes").hidden=$("source").value!=="manual";};
$("startExam").onclick=()=>{refresh();const e=W.start(data,read("math10_school_v1"),read("math10_state"));if(!e)return menu();selected=e.week;save();draw();window.scrollTo(0,0);};
$("resumeExam").onclick=()=>{refresh();const e=W.status(data).active;if(!e)return menu();selected=e.week;draw();};
$("thisResult").onclick=()=>{const e=W.status(data).exam;if(!e)return menu();selected=e.week;result();};
$("answerForm").onsubmit=e=>e.preventDefault();$("answerForm").addEventListener("input",draft);$("answerForm").addEventListener("change",draft);
$("prev").onclick=()=>move(exam().index-1);$("next").onclick=()=>{const e=exam();if(e.index===e.questions.length-1)reviewSubmit();else move(e.index+1);};
$("reviewSubmit").onclick=reviewSubmit;$("backExam").onclick=draw;
$("submitFinal").onclick=()=>{refresh();const e=exam();if(!e)return menu();W.submit(e);save();result();};
$("pause").onclick=()=>{draft();menu();window.scrollTo(0,0);};$("home").onclick=()=>{menu();window.scrollTo(0,0);};
window.addEventListener("storage",e=>{if(e.key===W.KEY){refresh();if(currentPage==="menu")menu();else if(exam()&&exam().submittedAt)result();}});
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&currentPage==="menu")menu();});
menu();if(location.hash==="#settings"){$("settingsPanel").open=true;$("settingsPanel").scrollIntoView();}
})();
