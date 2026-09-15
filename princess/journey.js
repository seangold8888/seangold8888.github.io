(function(root){
  'use strict';
  function mount(api){
    const G=root.PrincessGrowth,d=document;if(!G)return null;let storage;
    try{storage=root.localStorage;}catch(_){storage={getItem:()=>null,setItem:()=>{throw Error('저장소 사용 불가');}};}
    const el=(tag,cls,text)=>{const n=d.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;};
    const button=(text,fn)=>{const b=el('button','pj-button',text);b.type='button';b.onclick=fn;return b;};
    const nav=el('div','pj-nav'),open=button('숲속 소풍 · 공주 키우기',show);nav.append(open);d.querySelector('.outing-nav').prepend(nav);
    const dialog=el('dialog','pj-dialog');dialog.setAttribute('aria-labelledby','pj-title');
    const head=el('header','pj-head'),title=el('h2','','공주와 숲속 소풍');title.id='pj-title';head.append(title,button('닫기',()=>dialog.close()));
    const profile=el('div','pj-profile'),layout=el('div','pj-layout'),art=el('div','pj-art'),story=el('section','pj-story'),status=el('p','pj-status');status.setAttribute('role','status');
    layout.append(art,story);dialog.append(head,profile,layout,status);d.body.append(dialog);
    let child='jaei',snapshot=null,token=0,hint='',renderedArtKey='';
    function apply(action,detail){const r=G.quest(storage,child,action,detail);if(!r.ok){status.textContent='저장하지 못했어요. 기존 기록은 그대로예요. 공간을 확인하고 다시 눌러 주세요.';return;}if(!r.changed){hint=action==='share'?'세 친구에게 두 개씩 나눠 주세요. 다시 담아도 괜찮아요.':action==='trail'?'갈라진 길 옆에 작은 발자국이 이어져 있어요.':action==='greet'?'같이 가자고 부르는 말은 “Come with me.”예요.':'사과는 모두 여섯 개예요. 다시 담아 볼까요?';}else{hint='';api.sound('click');}draw();}
    function show(){try{G.read(storage);child='jaei';snapshot=api.snapshot();hint='';dialog.showModal();draw();}catch(_){api.notify('성장 기록을 읽지 못했어요. 기존 기록은 그대로예요.');}}
    async function finish(){
      const mine=token,owner=child;for(const b of story.querySelectorAll('button'))b.disabled=true;status.textContent='소풍 사진과 일기를 담고 있어요…';
      try{
        const existing=G.read(storage).children[owner].diary;
        const photo=existing?null:await api.photo(await api.exportSvg({...snapshot.state,bg:'forest',pet:{id:'rabbit'}},snapshot.princess));
        if(mine!==token||!dialog.open)return;
        apply('finish',{princess:snapshot.princess.name,photo});
      }catch(_){if(mine===token&&dialog.open){status.textContent='사진을 저장하지 못했어요. 다시 시도하거나 사진 없이 일기를 남길 수 있어요.';story.append(button('사진 없이 일기 남기기',()=>apply('finish',{princess:snapshot.princess.name})));}}
      finally{if(mine===token&&dialog.open)for(const b of story.querySelectorAll('button'))b.disabled=false;}
    }
    async function draw(){
      const mine=++token;let s;try{s=G.read(storage);}catch(e){status.textContent=e.message;return;}
      const p=s.children[child],q=p.quest,t=G.summary(p);profile.replaceChildren();
      profile.append(el('strong','','재이의 공주 키우기'));
      profile.append(el('span','pj-growth','성장별 '+t.stars+' · 지혜 '+p.math+' · 말하기 '+p.reading));
      story.replaceChildren();status.textContent=hint;
      story.append(el('p','pj-kicker','첫 번째 모험 · '+G.CHILDREN[child]+'의 이야기'));
      const progress=el('ol','pj-progress');for(const [i,label] of ['준비','간식','길 찾기','인사','친구'].entries()){const n=el('li',q.step>i?'done':'',label);if(Math.min(q.step,4)===i)n.setAttribute('aria-current','step');progress.append(n);}story.append(progress);
      const text=(heading,copy)=>{story.append(el('h3','',heading),el('p','pj-copy',copy));};
      const act=(label,action,detail)=>story.append(button(label,()=>apply(action,detail)));
      if(q.step===0){
        text('토끼에게 온 소풍 편지','“숲속 큰 나무 아래에서 만나! 간식은 우리 셋이 나눠 먹자.” 공주는 편지를 접어 가방에 넣었어요. 그런데 약속 장소에는 토끼가 보이지 않네요. 간식을 준비하고 함께 찾아볼까요?');
        story.append(el('p','pj-note',t.total?'모험보드에서 배운 '+t.total+'문제가 공주의 성장에 담겼어요. 오늘은 나누기와 영어 인사를 써 봐요.':'공부 기록이 없어도 첫 소풍은 할 수 있어요. 다음에 모험보드에서 공부하면 성장별이 쌓여요.'));
        act('이 옷을 입고 출발','start');story.append(button('옷을 더 골라 볼래요',()=>dialog.close()));
      }else if(q.step===1){
        text('사과 여섯 개를 나눠요','공주와 토끼, 다람쥐가 먹을 간식이에요. 접시를 눌러 세 친구에게 두 개씩 나눠 주세요.');
        const used=q.plates.reduce((a,b)=>a+b,0);story.append(el('p','pj-basket','바구니에 남은 사과 '+(6-used)+'개'));
        const plates=el('div','pj-plates');for(const [i,name] of ['공주','토끼','다람쥐'].entries()){const b=button('',()=>apply('apple',i));b.setAttribute('aria-label',name+' 접시, 사과 '+q.plates[i]+'개. 사과 하나 놓기');b.append(el('strong','',name),el('span','pj-apples'),el('span','',q.plates[i]+'개'));const apples=b.querySelector('.pj-apples');apples.setAttribute('aria-hidden','true');for(let n=0;n<q.plates[i];n++)apples.append(el('i','pj-apple'));if(!q.plates[i])apples.textContent='빈 접시';plates.append(b);}story.append(plates);
        if(p.math>=3){act('지혜 도우미 · 두 개씩 나누기','share-help');story.append(el('small','pj-note','모험보드 수학 경험으로 열린 도움! 2 + 2 + 2 = 6이에요.'));}
        act('나눠 담았어요','share');act('다시 담기','reset');
      }else if(q.step===2){
        text('토끼는 어느 길로 갔을까요?','바람에 나뭇잎이 바스락거려요. 반짝이는 돌 옆에는 아무 흔적이 없고, 다른 길에는 토끼의 작은 발자국이 이어져 있어요. 토끼가 간 길을 찾아 주세요.');
        act('반짝이는 돌 쪽으로','trail','stone');act('작은 발자국을 따라서','trail','prints');
      }else if(q.step===3){
        text('토끼에게 “같이 가자!”','길을 잃은 토끼가 나무 뒤에 앉아 있어요. 공주가 가까이 다가가 말해요. “같이 가자!” 어떤 영어 인사가 맞을까요?');
        const options=['Come with me.','Good night.','Thank you.'];for(let i=options.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[options[i],options[j]]=[options[j],options[i]];}
        for(const line of options)act(line,'greet',line);
        if(p.reading>=5)story.append(button('말하기 도우미 · 인사말 힌트',()=>{status.textContent='모험보드 영어 경험으로 열린 도움! “Come with me.”는 “나와 같이 가자.”라는 뜻이에요.';}));
        story.append(el('small','pj-note','문장을 소리 내어 읽어도 좋아요. 이 장면은 뜻 고르기이며 마이크로 채점하지 않아요.'));
      }else if(q.step===4){
        text('함께라서 더 즐거운 소풍','“Come with me!” 공주의 말에 토끼가 고개를 들었어요. 둘은 발자국을 거슬러 큰 나무로 돌아왔어요. 기다리던 다람쥐와 사과를 두 개씩 나누어 먹었지요. “다음에도 함께 놀자!” 토끼가 꽃 한 송이를 건넸어요.');
        story.append(button('토끼 친구와 성장 일기 남기기',finish));
      }else{
        text('첫 친구, 토끼','사과 여섯 개를 세 친구에게 두 개씩 나누었어요. “Come with me.”라고 인사하고 길 잃은 토끼를 도왔어요.');
        story.append(el('div','pj-reward','토끼 친구 · 소풍 꽃 기념품'),el('p','pj-note','성장 일기 1장 저장됨 · '+(p.diary?.princess||snapshot.princess.name)+'와 함께한 첫 소풍'));
        act('다시 소풍 가기','replay');story.append(button('옷장으로 돌아가기',()=>dialog.close()));
        story.append(el('small','pj-note','다시 놀아도 친구와 일기는 중복되지 않아요. 다음 이야기는 아직 준비 중이에요.'));
      }
      art.setAttribute('aria-label',snapshot.princess.name+'의 숲속 소풍');art.setAttribute('role','img');
      const artKey=child+':'+(q.step>=4)+':'+(q.step===5);
      if(renderedArtKey===artKey)return;
      art.classList.add('loading');
      try{if(q.step===5&&p.diary?.photo){const img=el('img');img.src=p.diary.photo;img.alt='첫 소풍 기념사진';art.replaceChildren(img);renderedArtKey=artKey;art.classList.remove('loading');return;}const scene={...snapshot.state,bg:'forest',pet:q.step>=4?{id:'rabbit'}:null};const svg=await api.exportSvg(scene,snapshot.princess);if(mine!==token||!dialog.open)return;art.innerHTML=svg;art.querySelector('svg')?.setAttribute('aria-hidden','true');renderedArtKey=artKey;art.classList.remove('loading');}
      catch(_){if(mine===token){art.replaceChildren(el('p','','그림을 불러오지 못했어요.'));art.append(button('그림 다시 불러오기',draw));art.classList.remove('loading');}}
    }
    dialog.addEventListener('close',()=>{token++;renderedArtKey='';art.replaceChildren();});
    root.addEventListener('storage',e=>{if(e.key===G.KEY&&dialog.open)draw();});
    return {show};
  }
  root.PrincessJourney={mount};
})(globalThis);
