(function(root){
"use strict";
const Q=root.SchoolQuestions||(typeof require!=="undefined"?require("./questions.js"):null),C=root.Curriculum||(typeof require!=="undefined"?require("../curriculum.js"):null);
const KEY="math10_weekly_v1";
function today(now=new Date()){return now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0")+"-"+String(now.getDate()).padStart(2,"0");}
function add(date,n){const d=new Date(date+"T12:00:00");d.setDate(d.getDate()+n);return today(d);}
function week(date=today()){const d=new Date(date+"T12:00:00");return add(date,-((d.getDay()+6)%7));}
function settings(s={}){return {weekday:Number.isInteger(s.weekday)&&s.weekday>=0&&s.weekday<=6?s.weekday:5,count:[5,10,20].includes(s.count)?s.count:10,source:["school","manual","level"].includes(s.source)?s.source:"school",types:types(s.types)};}
function types(a){return Array.isArray(a)?Array.from(new Set(a.filter(t=>Number.isInteger(t)&&t>=0&&t<20))).sort((a,b)=>a-b):[];}
function fresh(){return {version:1,settings:settings(),exams:[]};}
function load(storage){try{const raw=JSON.parse(storage.getItem(KEY)||"null");if(!raw||raw.version!==1)return fresh();return {version:1,settings:settings(raw.settings),exams:(Array.isArray(raw.exams)?raw.exams:[]).filter(e=>e&&/^\d{4}-\d{2}-\d{2}$/.test(e.week)&&Array.isArray(e.questions)&&e.questions.length>0&&e.questions.length<=20&&e.questions.every(q=>q&&typeof q.text==="string"&&Array.isArray(q.inputs)&&Array.isArray(q.answers))&&Array.isArray(e.drafts)&&e.drafts.length===e.questions.length&&e.drafts.every(a=>Array.isArray(a)&&a.every(x=>typeof x==="string"))&&Array.isArray(e.reasons)&&Number.isInteger(e.index)&&e.index>=0&&e.index<e.questions.length).slice(-52)};}catch(_){return fresh();}}
function save(storage,data){try{storage.setItem(KEY,JSON.stringify(data));return true;}catch(_){return false;}}
function covered(practice){return types([...(practice&&Array.isArray(practice.covered)?practice.covered:[]),...(practice&&practice.session&&Array.isArray(practice.session.results)?practice.session.results.map(r=>r.type):[])]);}
function scope(config,practice,learning){
 config=settings(config);
 if(config.source==="level"){const level=learning&&Number.isInteger(learning.level)?Math.max(1,Math.min(12,learning.level)):null;return {source:"level",level,types:[],label:level?"놀이터 "+level+"단계 · "+C.levelById(level).name+(level>1?" (직전 단계 복습 포함)":""):"놀이터 단계 기록이 없어요"};}
 const chosen=config.source==="manual"?config.types:covered(practice);
 return {source:"school",types:chosen,label:(config.source==="manual"?"부모님이 정한 학교 진도":"연습에서 만나본 학교 진도")+" · "+chosen.length+"개 유형"};
}
function status(data,date=today()){
 const start=week(date),due=add(start,(data.settings.weekday+6)%7);
 const active=data.exams.find(e=>!e.submittedAt),exam=data.exams.find(e=>e.week===start);
 return {week:start,due,nextDue:add(due,7),active,exam,ready:date>=due&&!exam&&!active};
}
function random(seed){let n=seed>>>0;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
function generate(scope,count,seed){
 const r=random(seed),out=[],seen=new Set(),pool=scope.source==="school"?scope.types.slice():[];
 for(let i=pool.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
 let tries=0;
 while(out.length<count&&tries<500){
  let q;
  if(scope.source==="school"){if(!pool.length)break;q=Q.question(pool[tries%pool.length],Math.floor(r()*0xffffffff));}
  else{if(!scope.level)break;const lv=scope.level>1&&out.length%5===4?scope.level-1:scope.level,L=C.levelById(lv),p=C.makeProblem(lv,r,L.types[tries%L.types.length]);q={type:p.type,group:"level-"+lv,name:lv+"단계 · "+L.name,mode:"fields",inputs:[{label:"답"}],answers:[String(p.answer)],text:p.text,explain:C.explain(p),visual:null};}
  tries++;const sig=JSON.stringify([q.type,q.text,q.visual,q.inputs,(q.options||[]).slice().sort()]);if(seen.has(sig))continue;seen.add(sig);out.push(q);
 }
 return out;
}
function start(data,practice,learning,date=today(),seed=(Date.now()>>>0)){
 const s=status(data,date);if(s.active)return s.active;if(s.exam)return s.exam;if(!s.ready)return null;
 const sc=scope(data.settings,practice,learning),questions=generate(sc,data.settings.count,seed);if(!questions.length)return null;
 const e={week:s.week,due:s.due,scope:sc,questions,drafts:questions.map(()=>[]),reasons:questions.map(()=>""),index:0,startedAt:date,submittedAt:null};
 data.exams.push(e);data.exams=data.exams.slice(-52);return e;
}
function edit(exam,index,answer,reason=""){if(exam.submittedAt||index<0||index>=exam.questions.length)return false;exam.drafts[index]=Array.isArray(answer)?answer.map(x=>String(x).slice(0,150)):[];exam.reasons[index]=String(reason).slice(0,500);return true;}
function unanswered(exam){return exam.questions.flatMap((q,i)=>{const a=exam.drafts[i]||[];return !a.length||a.some(x=>!String(x).trim())||(q.mode==="fields"&&a.length!==q.inputs.length)?[i]:[];});}
function result(exam){
 const rows=exam.questions.map((q,i)=>({index:i,correct:Q.grade(q,exam.drafts[i]),name:q.name,group:q.group})),correct=rows.filter(r=>r.correct).length;
 const groups={};rows.forEach(r=>{const g=groups[r.group]||(groups[r.group]={total:0,correct:0});g.total++;if(r.correct)g.correct++;});
 return {rows,correct,total:rows.length,score:Math.round(correct/rows.length*100),groups};
}
function submit(exam,date=today()){if(exam.submittedAt)return false;exam.submittedAt=date;return true;}
const api={KEY,today,add,week,settings,fresh,load,save,covered,scope,status,generate,start,edit,unanswered,result,submit};
if(typeof module!=="undefined"&&module.exports)module.exports=api;else root.WeeklyExam=api;
})(typeof window!=="undefined"?window:globalThis);
