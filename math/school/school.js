(function(){
"use strict";
const Q=window.SchoolQuestions,$=id=>document.getElementById(id),KEY="math10_school_v1";
let data={version:1,session:null,history:[]},storage=null;
try{
 storage=window.localStorage;const raw=JSON.parse(storage.getItem(KEY)||"null");
 if(raw&&raw.version===1){
  data.history=Array.isArray(raw.history)?raw.history.filter(h=>h&&Number.isInteger(h.total)&&h.total>=0&&h.total<=20&&typeof h.date==="string").slice(-30):[];
  const s=raw.session;
  if(s&&s.version===1&&Number.isInteger(s.seed)&&Array.isArray(s.order)&&s.order.length>0&&s.order.length<=20&&new Set(s.order).size===s.order.length&&s.order.every(t=>Number.isInteger(t)&&t>=0&&t<20)&&Number.isInteger(s.index)&&s.index>=0&&s.index<=s.order.length&&Array.isArray(s.results)&&s.results.length===s.index+(s.checked&&s.index<s.order.length?1:0)&&s.results.every((r,i)=>r&&r.type===s.order[i]&&typeof r.correct==="boolean")){
   data.session=s;s.draft=Array.isArray(s.draft)?s.draft.map(String):[];s.reason=String(s.reason||"").slice(0,500);
  }
 }
}catch(_){$("storageNote").textContent="저장된 연습을 읽지 못했어요. 새 연습을 시작할 수 있어요.";}
function save(){try{if(!storage)throw Error("storage");storage.setItem(KEY,JSON.stringify(data));}catch(_){$("storageNote").textContent="지금은 저장이 어려워요. 이 화면에서 계속 연습할 수 있어요.";}}
function el(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}
function current(){const s=data.session;return Q.question(s.order[s.index],s.seed);}
function page(name){for(const id of ["menu","exercise","result"])$(id).hidden=id!==name;$("pause").hidden=name!=="exercise";}
function menu(){page("menu");const s=data.session,active=s&&!s.archived&&s.index<s.order.length;$("resumeBox").hidden=!active;$("newOptions").hidden=!!active;$("lastResult").hidden=!(s&&s.archived);if(active)$("resumeText").textContent=s.order.length+"문제 중 "+s.index+"문제까지 만났어요.";$("historySummary").textContent=data.history.length?"이 기기에서 마친 연습 "+data.history.length+"회 · 최근 기록은 최대 30회 보관해요.":"";}
function visual(q){
 const box=$("visual");box.replaceChildren();const v=q.visual;if(!v)return;
 if(v.kind==="bundles"){const grid=el("div",undefined,"bundle-grid");for(let i=0;i<v.tens;i++){const bundle=el("span",undefined,"bundle");bundle.append(el("b","10"),el("small","한 묶음"));grid.append(bundle);}box.append(grid);if(v.ones){const units=el("div",undefined,"loose-units");units.setAttribute("aria-label","낱개 "+v.ones+"개");for(let i=0;i<v.ones;i++)units.append(el("i",undefined,"single-dot"));box.append(units);}}
 if(v.kind==="beads"){const rows=el("div",undefined,"bead-rows");rows.setAttribute("role","img");rows.setAttribute("aria-label","한 줄에 10개씩 "+v.rows+"줄의 구슬");for(let i=0;i<v.rows;i++){const row=el("div",undefined,"bead-row");for(let j=0;j<10;j++)row.append(el("i",undefined,"bead"));rows.append(row);}box.append(rows);}
 if(v.kind==="number")box.append(el("div",v.value,"school-number"));
 if(v.kind==="sequence"||v.kind==="cards"){const row=el("div",undefined,v.kind==="cards"?"number-cards":"number-sequence");v.values.forEach(x=>row.append(el("span",x)));box.append(row);}
}
function readDraft(){
 const s=data.session,q=current();
 s.draft=q.mode==="fields"?Array.from($("answers").querySelectorAll("[data-answer]")).map(e=>e.value):Array.from($("answers").querySelectorAll("input:checked")).map(e=>e.value);
 s.reason=$("reason").value;save();
}
function solution(q){
 $("solution").replaceChildren(el("strong","답: "+answerLabel(q)),el("p",q.explain));
 if(q.reason)$("solution").append(el("p","내가 쓴 글이나 말로 설명한 내용과 비교해 보세요. 풀이 문장은 자동 채점하지 않아요."));
 $("solution").hidden=false;
}
function answerLabel(q){return q.mode==="fields"?q.answers.map((a,i)=>q.inputs[i].label+": "+a).join(" / "):q.answers.map(i=>q.options[Number(i)]).join(", ");}
function draw(){
 const s=data.session;if(!s)return menu();if(s.archived||s.index>=s.order.length)return finish();
 const q=current();page("exercise");$("progress").textContent=(s.index+1)+" / "+s.order.length;$("progressBar").max=s.order.length;$("progressBar").value=s.index;$("typeName").textContent=q.name;$("questionTitle").textContent=q.text;visual(q);
 const box=$("answers");box.replaceChildren();
 if(q.mode==="fields"){
  const fields=el("div",undefined,"answer-fields");
  q.inputs.forEach((spec,i)=>{const label=el("label",undefined,"answer-field");label.append(el("span",spec.label));let input;
   if(spec.options){input=el("select");const blank=el("option","선택");blank.value="";input.append(blank);spec.options.forEach(x=>{const op=el("option",x);op.value=x;input.append(op);});}
   else{input=el("input");input.type="text";input.inputMode="numeric";input.pattern="[0-9]*";input.maxLength=3;input.autocomplete="off";}
   input.dataset.answer=String(i);input.value=s.draft[i]||"";input.disabled=!!s.checked;label.append(input);fields.append(label);
  });box.append(fields);
 }else{
  const fs=el("fieldset");fs.append(el("legend",q.mode==="multi"?"맞는 답을 모두 선택하세요.":"답 하나를 선택하세요."));const list=el("div",undefined,"choice-list");
  q.options.forEach((option,i)=>{const label=el("label",undefined,"choice"),input=el("input");input.type=q.mode==="multi"?"checkbox":"radio";input.name="choice";input.value=String(i);input.checked=s.draft.includes(String(i));input.disabled=!!s.checked;label.append(input,el("span",option));list.append(label);});fs.append(list);box.append(fs);
 }
 $("reasonField").hidden=!q.reason;$("reason").value=s.reason;$("reason").disabled=!!s.checked;
 $("hintText").hidden=!s.help;$("hintText").textContent=q.hint;$("solution").hidden=true;$("feedback").textContent="";
 $("check").hidden=!!s.checked;$("hint").hidden=!!s.checked;$("reveal").hidden=!!s.checked;$("next").hidden=!s.checked;
 $("next").textContent=s.index===s.order.length-1?"여기까지 마치기 →":"다음으로 →";
 if(s.checked){solution(q);$("feedback").textContent=s.revealed?"풀이를 함께 살펴봤어요. 다음에도 천천히 해봐요.":"맞았어요! "+(s.help?"도움을 받아 해결했어요.":"스스로 생각해 냈어요.");}
 else if(s.attempts)$("feedback").textContent="다시 생각해 봐도 좋아요. 고른 답이나 빈칸을 살펴보세요.";
}
function record(correct){
 const s=data.session;if(s.checked)return;s.checked=true;
 s.results.push({type:s.order[s.index],correct,help:!!s.help,attempts:s.attempts,reason:s.reason,answer:s.draft.slice()});save();draw();$("next").focus({preventScroll:true});
}
function finish(){
 const s=data.session;if(!s)return menu();page("result");$("pause").hidden=true;
 const done=s.results.length,independent=s.results.filter(r=>r.correct&&!r.help).length,helped=s.results.filter(r=>r.help).length;
 $("resultSummary").textContent=done+"문제를 만났어요. 도움 없이 해결 "+independent+"개 · 함께 연습 "+helped+"개.";
 const review=$("review");review.replaceChildren();s.results.forEach((r,i)=>{const q=Q.question(r.type,s.seed),d=el("details",undefined,"review-item");d.append(el("summary",(i+1)+". "+q.name+" · "+(r.correct?(r.help?"도움받아 해결":"스스로 해결"):"풀이 함께 보기")),el("p",q.text),el("p","답: "+answerLabel(q)),el("p",q.explain));if(r.reason)d.append(el("p","내 풀이: "+r.reason,"own-reason"));review.append(d);});
 if(!s.archived){data.history.push({date:new Date().toISOString(),total:done,independent,helped,group:s.group});data.history=data.history.slice(-30);s.archived=true;save();}
}
function start(size){data.session=Q.create(size===20?"all":$("group").value,size,(Date.now()^Math.floor(Math.random()*0xffffffff))>>>0);save();draw();$("questionTitle").focus({preventScroll:true});window.scrollTo(0,0);}
$("lastResult").onclick=finish;
$("startShort").onclick=()=>start(5);$("startFull").onclick=()=>start(20);$("resume").onclick=draw;
$("pause").onclick=()=>{readDraft();menu();window.scrollTo(0,0);};
$("finishEarly").onclick=()=>{finish();};
$("backMenu").onclick=()=>{data.session=null;save();menu();window.scrollTo(0,0);};
$("answerForm").addEventListener("input",readDraft);$("answerForm").addEventListener("change",readDraft);
$("answerForm").onsubmit=e=>{
 e.preventDefault();const s=data.session;if(s.checked)return;readDraft();const q=current();
 if(!s.draft.length||s.draft.some(x=>!String(x).trim())){$("feedback").textContent="빈칸을 채우거나 답을 골라 주세요.";return;}
 s.attempts++;if(Q.grade(q,s.draft))record(true);else{save();$("feedback").textContent="다시 생각해 봐도 좋아요. 고른 답이나 빈칸을 살펴보세요.";}
};
$("hint").onclick=()=>{readDraft();data.session.help=true;save();$("hintText").textContent=current().hint;$("hintText").hidden=false;};
$("reveal").onclick=()=>{readDraft();data.session.help=true;data.session.revealed=true;record(false);};
$("next").onclick=()=>{const s=data.session;if(!s.checked)return;s.index++;s.draft=[];s.reason="";s.attempts=0;s.help=false;s.revealed=false;s.checked=false;save();draw();if(!$("exercise").hidden)$("questionTitle").focus({preventScroll:true});window.scrollTo(0,0);};
menu();
})();
