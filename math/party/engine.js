/* Level 4 party practice. Its own storage never rewrites math or hub records. */
(function(root){
'use strict';
const C=root.Curriculum || (typeof require!=='undefined'?require('../curriculum.js'):null);
const KEY='math10_party_v1', TYPES=['make10','from10','split10'];
function random(seed){let n=seed>>>0;return function(){n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
function shuffle(a,rng){for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function create(seed,history){
 seed=(Number.isInteger(seed)?seed:(Date.now()^Math.floor(Math.random()*0xffffffff)))>>>0;
 const rng=random(seed),light=C.makeProblem(4,rng,'make10'),cookie=C.makeProblem(4,rng,'from10');
 const facts=[],seen=new Set();
 while(facts.length<3){const p=C.makeProblem(4,rng,'split10'),k=Math.min(p.visual.a,p.answer);if(!seen.has(k)){seen.add(k);facts.push(p);}}
 const cards=shuffle(facts.flatMap((p,i)=>[{id:i*2,value:p.visual.a},{id:i*2+1,value:p.answer}]),rng);
 return {version:1,seed,id:'party-'+seed,started:false,stage:0,theme:'peach',cake:'strawberry',light,cookie,facts,cards,placed:0,selected:[],packed:false,matched:[],picked:null,help:[false,false,false],mistakes:[0,0,0],history:(history||[]).slice(-30),finishedAt:null};
}
function completed(s){return [s.light.visual.a+s.placed===10,s.packed && s.selected.length===s.cookie.visual.cross,s.matched.length===6];}
function clean(raw){
 if(!raw || raw.version!==1 || !Number.isInteger(raw.seed))return create();
 const s=create(raw.seed);
 const unique=(a)=>Array.isArray(a)?Array.from(new Set(a.filter(x=>Number.isInteger(x)&&x>=0&&x<10))):[];
 s.started=!!raw.started;s.theme=['peach','sky','mint'].includes(raw.theme)?raw.theme:'peach';s.cake=raw.cake==='chocolate'?'chocolate':'strawberry';
 s.placed=Math.min(10-s.light.visual.a,Math.max(0,parseInt(raw.placed,10)||0));s.selected=unique(raw.selected);s.packed=!!raw.packed && s.selected.length===s.cookie.visual.cross;
 const matches=unique(raw.matched).filter(id=>id<6),values=matches.map(id=>s.cards.find(c=>c.id===id).value);
 if(matches.length%2===0 && values.every(v=>v===5?values.filter(x=>x===5).length%2===0:values.filter(x=>x===v).length===values.filter(x=>x===10-v).length))s.matched=matches;
 s.picked=Number.isInteger(raw.picked)&&raw.picked>=0&&raw.picked<6&&!s.matched.includes(raw.picked)?raw.picked:null;
 s.help=s.help.map((_,i)=>!!(raw.help||[])[i]);s.mistakes=s.mistakes.map((_,i)=>Math.min(999,Math.max(0,parseInt((raw.mistakes||[])[i],10)||0)));
 let unlocked=0;while(unlocked<3&&completed(s)[unlocked])unlocked++;
 s.stage=Math.min(unlocked,Math.max(0,parseInt(raw.stage,10)||0),3);
 s.history=Array.isArray(raw.history)?raw.history.filter(e=>e&&typeof e.id==='string'&&e.id.length<50&&Number.isInteger(e.stage)&&e.stage>=0&&e.stage<3&&e.level===4&&TYPES.includes(e.type)&&typeof e.date==='string').slice(-30).map(e=>({id:e.id,stage:e.stage,level:4,type:e.type,date:e.date.slice(0,10),help:!!e.help,mistakes:Math.max(0,Math.min(999,parseInt(e.mistakes,10)||0)),mode:'manipulative'})):[];
 s.finishedAt=s.stage===3 && typeof raw.finishedAt==='string'?raw.finishedAt.slice(0,24):null;
 return s;
}
function load(storage){try{return clean(JSON.parse(storage.getItem(KEY)||'null'));}catch(_){return create();}}
function save(storage,s){try{storage.setItem(KEY,JSON.stringify(s));return true;}catch(_){return false;}}
function mark(s){
 const stage=s.stage;if(stage>=3||!completed(s)[stage]||s.history.some(e=>e.id===s.id&&e.stage===stage))return;
 const d=new Date(),date=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
 s.history.push({id:s.id,stage,level:4,type:TYPES[stage],date,help:s.help[stage],mistakes:s.mistakes[stage],mode:'manipulative'});s.history=s.history.slice(-30);
}
function act(s,action,value){
 const done=completed(s);let result='changed';
 if(action==='start'){s.started=true;return result;}
 if(action==='theme'&&['peach','sky','mint'].includes(value)){s.theme=value;return result;}
 if(action==='cake'&&['strawberry','chocolate'].includes(value)){s.cake=value;return result;}
 if(action==='help'&&s.stage<3&&!done[s.stage]){s.help[s.stage]=true;return 'help';}
 if(action==='next'&&s.stage<3&&done[s.stage]){mark(s);s.stage++;if(s.stage===3)s.finishedAt=new Date().toISOString();return 'next';}
 if(s.stage>=3||done[s.stage])return 'ignored';
 if(action==='power'&&s.stage===0&&[1,2,3].includes(value)){
  if(s.light.visual.a+s.placed+value>10){s.mistakes[0]++;return 'overflow';}s.placed+=value;
 }else if(action==='cookie'&&s.stage===1&&Number.isInteger(value)&&value>=0&&value<10){
  if(s.selected.includes(value))s.selected=s.selected.filter(x=>x!==value);else s.selected.push(value);
 }else if(action==='pack'&&s.stage===1){
  if(s.selected.length!==s.cookie.visual.cross){s.mistakes[1]++;return s.selected.length>s.cookie.visual.cross?'too-many':'too-few';}s.packed=true;
 }else if(action==='balloon'&&s.stage===2&&Number.isInteger(value)&&value>=0&&value<6&&!s.matched.includes(value)){
  if(s.picked===null){s.picked=value;return 'picked';}
  if(s.picked===value){s.picked=null;return 'changed';}
  const a=s.cards.find(c=>c.id===s.picked),b=s.cards.find(c=>c.id===value);s.picked=null;
  if(a.value+b.value!==10){s.mistakes[2]++;return 'mismatch';}
  s.matched.push(a.id,b.id);result='pair';
 }else return 'ignored';
 if(completed(s)[s.stage]){mark(s);return 'complete';}return result;
}
const api={KEY,create,clean,load,save,act,completed};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PartyEngine=api;
})(typeof window!=='undefined'?window:globalThis);
