(function(root){
  'use strict';
  const KEY='princess:growth:v1',CHILDREN={jaei:'재이',taeo:'태오'};
  const freshChild=()=>({math:0,reading:0,discovery:0,friend:false,diary:null,quest:{step:0,plates:[0,0,0]}});
  const empty=()=>({version:1,active:'jaei',seen:{},children:{jaei:freshChild(),taeo:freshChild()}});
  const count=x=>Number.isSafeInteger(x)&&x>=0?Math.min(x,1000000):0;
  function read(storage){
    const text=storage.getItem(KEY);if(!text)return empty();
    const raw=JSON.parse(text);if(raw?.version!==1||!raw.children)throw Error('기록을 안전하게 읽지 못했어요. 기존 기록은 그대로 두었어요.');
    const s=empty();s.active=Object.hasOwn(CHILDREN,raw.active)?raw.active:'jaei';
    for(const id of Object.keys(CHILDREN)){
      const r=raw.children[id]||{},p=s.children[id];for(const k of ['math','reading','discovery'])p[k]=count(r[k]);
      p.friend=r.friend===true;
      p.diary=r.diary&&typeof r.diary.at==='string'?{at:r.diary.at.slice(0,32),princess:String(r.diary.princess||'공주').slice(0,30),photo:cleanPhoto(r.diary.photo)}:null;
      p.quest.step=Number.isInteger(r.quest?.step)?Math.max(0,Math.min(5,r.quest.step)):0;
      p.quest.plates=[0,1,2].map(i=>Math.min(3,count(r.quest?.plates?.[i])));
    }
    for(const [day,n] of Object.entries(raw.seen||{}))if(/^\d{4}-\d{1,2}-\d{1,2}$/.test(day))s.seen[day]=count(n);
    return s;
  }
  function cleanPhoto(value){return typeof value==='string'&&value.length<600000&&/^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(value)?value:null;}
  function update(storage,change){
    try{const s=read(storage),changed=change(s);if(changed!==false){storage.setItem(KEY,JSON.stringify(s));if(root.dispatchEvent&&root.CustomEvent)root.dispatchEvent(new root.CustomEvent('princess-growth'));}return {ok:true,state:s,changed:changed!==false};}
    catch(e){return {ok:false,error:e.message||'저장 공간을 확인해 주세요.'};}
  }
  function select(storage,id){if(!Object.hasOwn(CHILDREN,id))return {ok:false,error:'아이를 골라 주세요.'};return update(storage,s=>{s.active=id;});}
  function record(storage,{day,ordinal,subject,parentMode=false}){
    if(parentMode||!/^\d{4}-\d{1,2}-\d{1,2}$/.test(day)||!Number.isSafeInteger(ordinal)||ordinal<1||!['math','reading','discovery'].includes(subject))return {ok:false,error:'학습 기록 형식 오류'};
    return update(storage,s=>{if((s.seen[day]||0)>=ordinal)return false;s.seen[day]=ordinal;s.children[s.active][subject]++;});
  }
  function quest(storage,id,action,detail){
    if(!Object.hasOwn(CHILDREN,id))return {ok:false,error:'아이를 골라 주세요.'};
    return update(storage,s=>{
      const p=s.children[id],q=p.quest;
      if(action==='replay'&&q.step===5){p.quest={step:0,plates:[0,0,0]};return;}
      if(action==='start'&&q.step===0){q.step=1;return;}
      if(action==='apple'&&q.step===1&&[0,1,2].includes(detail)&&q.plates.reduce((a,b)=>a+b,0)<6&&q.plates[detail]<3){q.plates[detail]++;return;}
      if(action==='reset'&&q.step===1){q.plates=[0,0,0];return;}
      if(action==='share-help'&&q.step===1&&p.math>=3){q.plates=[2,2,2];return;}
      if(action==='share'&&q.step===1&&q.plates.every(n=>n===2)){q.step=2;return;}
      if(action==='trail'&&q.step===2&&detail==='prints'){q.step=3;return;}
      if(action==='greet'&&q.step===3&&detail==='Come with me.'){q.step=4;return;}
      if(action==='finish'&&q.step===4){q.step=5;p.friend=true;if(!p.diary)p.diary={at:new Date().toISOString(),princess:String(detail?.princess||'공주').slice(0,30),photo:cleanPhoto(detail?.photo)};return;}
      return false;
    });
  }
  function summary(p){const total=p.math+p.reading+p.discovery;return {total,stars:Math.floor(total/10),next:10-total%10};}
  function mountHub(node,storage){
    if(!node)return;let note='지금부터 푸는 문제를 선택한 아이의 공주 성장에 담아요.';
    function draw(){
      node.replaceChildren();try{
        const s=read(storage),p=s.children[s.active],t=summary(p),head=document.createElement('strong');head.textContent='누구의 공주를 키울까요?';node.append(head);
        const controls=document.createElement('div');controls.className='pg-children';
        for(const [id,name] of Object.entries(CHILDREN)){const b=document.createElement('button');b.type='button';b.textContent=name;b.setAttribute('aria-pressed',String(id===s.active));b.onclick=()=>{const r=select(storage,id);if(!r.ok){note='성장 기록을 저장하지 못했어요. 공부는 계속할 수 있어요.';draw();}};controls.append(b);}node.append(controls);
        const line=document.createElement('p');line.textContent=CHILDREN[s.active]+'의 성장별 '+t.stars+'개 · 다음 별까지 '+t.next+'문제';node.append(line);
        const small=document.createElement('small');small.textContent=note+' 기존 학습 진도·게임 티켓은 가족 공용 그대로예요.';node.append(small);
      }catch(e){node.textContent=e.message;}
    }
    root.addEventListener('princess-growth',draw);root.addEventListener('storage',e=>{if(e.key===KEY)draw();});draw();return {draw};
  }
  const api={KEY,CHILDREN,read,select,record,quest,summary,mountHub};root.PrincessGrowth=api;
  if(typeof module!=='undefined')module.exports=api;
  if(root.document){const node=document.getElementById('princessGrowthHub');if(node)try{mountHub(node,root.localStorage);}catch(_){node.textContent='성장 기록 저장을 사용할 수 없어요. 공부는 그대로 할 수 있어요.';}}
})(globalThis);
