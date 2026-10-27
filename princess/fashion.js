(function(root){
  'use strict';
  /* 패션쇼: 주제 카드 → 꾸미기 → 무대 워킹 → 심사위원 3명의 별점.
     기존 옷장 그림만 다시 쓰고, 옷장 저장(princess:outfits)은 절대 바꾸지 않는다. */
  const KEY='princess:fashion:v1';
  const THEMES=Object.freeze([
    {id:'beach',title:'바닷가 소풍',icon:'🏖️',colors:['#6fc3ff','#5fd9c9','#ffffff','#ffd93d'],line:'파도 소리 들리는 바닷가로 소풍 가요!',likes:'여름 원피스 · 샌들 · 양산 · 바닷속 배경 · 물고기 친구'},
    {id:'ball',title:'왕궁 무도회',icon:'👑',colors:['#ffd93d','#6fc3ff','#c98bff','#ffffff','#ff8fc1'],line:'반짝이는 샹들리에 아래 무도회가 열려요.',likes:'무도회 드레스 · 유리 구두 · 왕관 · 부채 · 무도회장'},
    {id:'snow',title:'눈 오는 날',icon:'❄️',colors:['#ffffff','#6fc3ff','#c98bff','#ff5a6e'],line:'하얀 눈이 펑펑! 따뜻하게 입고 나가요.',likes:'겨울 코트 · 부츠 · 스카프 · 눈 내리는 날 · 토끼 친구'},
    {id:'flower',title:'꽃밭 생일파티',icon:'🌷',colors:['#ff8fc1','#ffd93d','#7ad97a','#ff9a4d'],line:'꽃밭에서 친구 생일파티를 열어요!',likes:'꽃 드레스 · 꽃관 · 꽃다발 · 풍선 · 꽃밭 · 나비 친구'},
    {id:'starry',title:'별빛 밤 산책',icon:'🌙',colors:['#3b3f7a','#8a7dff','#c98bff','#ffd93d'],line:'별이 반짝이는 밤, 살금살금 산책해요.',likes:'별빛 마법사 · 달빛 관 · 요술봉 · 망토 · 밤하늘 · 아기 용'},
    {id:'candy',title:'사탕 나라 파티',icon:'🍭',colors:['#ff8fc1','#c98bff','#6fc3ff','#ffffff'],line:'달콤달콤 사탕 나라에 초대받았어요!',likes:'발레 튜튜 · 큰 리본 · 막대사탕 · 요정 날개 · 사탕 나라 · 햄스터'},
    {id:'hanok',title:'한옥 마당 잔치',icon:'🏮',colors:['#ff8fc1','#ff5a6e','#7ad97a','#ffd93d'],line:'한옥 마당에서 신나는 잔치가 열려요.',likes:'한복 · 꽃신 · 배씨댕기 · 노리개 · 한옥 마당 · 두꺼비'},
    {id:'forest',title:'숲속 탐험',icon:'🌲',colors:['#7ad97a','#8b5a3c','#ff9a4d','#ffd93d'],line:'숲속 비밀 길을 따라 탐험을 떠나요!',likes:'모험가 옷 · 부츠 · 배낭 · 바구니 · 숲속 · 아기 사슴'}
  ].map(t=>Object.freeze({...t,colors:Object.freeze(t.colors)})));
  // 기존 아이템마다 어울리는 주제 꼬리표. 새 그림 없이 기존 id만 쓴다.
  const ITEM_TAGS={
    dress:{ballgown:['ball','starry'],aline:['flower','forest'],party:['flower','candy','beach'],mermaidline:['ball','beach'],hanbok:['hanok'],tutu:['candy','flower'],tail:['beach'],winter:['snow'],star:['starry'],rainbow:['flower','candy'],summer:['beach','flower','forest'],rose:['ball','flower'],adventure:['forest','snow']},
    shoes:{pumps:['ball'],glass:['ball','starry'],boots:['snow','forest','starry'],sneakers:['forest','candy'],sandals:['beach','flower'],ballet:['candy','flower'],rain:['snow','forest'],slippers:['snow'],kkotsin:['hanok']},
    crown:{crown:['ball'],tiara:['ball','snow'],flowers:['flower','hanok','beach'],bow:['candy','flower'],starclip:['starry','beach'],pearls:['beach','ball'],witch:['starry'],bunny:['candy','snow'],catears:['candy'],hennin:['ball'],daenggi:['hanok'],moon:['starry'],veil:['ball']},
    neck:{pearls:['ball','beach'],heart:['candy','flower'],gem:['ball','starry'],scarf:['snow','forest'],choker:['candy','ball'],star:['starry'],norigae:['hanok'],flowerlei:['flower','beach']},
    hand:{wand:['starry','snow'],fan:['ball','hanok'],bouquet:['flower'],umbrella:['beach'],bag:['forest','beach'],balloon:['flower','candy'],book:['starry','forest'],lollipop:['candy'],sword:['forest'],mirror:['ball'],basket:['forest','hanok','beach']},
    back:{fairy:['candy','flower'],butterfly:['flower','forest'],cape:['starry','snow','ball'],angel:['snow'],bat:['starry'],backpack:['forest','beach']},
    pet:{cat:['ball','starry'],dog:['beach','forest'],rabbit:['snow','forest'],bird:['flower','hanok'],frog:['forest'],unicorn:['candy','ball'],deer:['snow','forest'],butterfly:['flower'],dragon:['starry'],hamster:['candy'],mouse:['ball'],fish:['beach'],toad:['hanok']},
    bg:{plain:['candy'],castle:['ball'],forest:['forest'],sea:['beach'],night:['starry'],cherry:['flower'],ballroom:['ball'],snow:['snow'],rainbow:['flower','candy'],candy:['candy'],tower:['starry'],meadow:['flower'],hanok:['hanok'],rosecastle:['ball']}
  };
  const ACCESSORIES=['shoes','crown','neck','hand','back'];
  const COLOR_NAMES={'#ff8fc1':'분홍','#ff5a6e':'빨강','#ff9a4d':'주황','#ffd93d':'노랑','#7ad97a':'초록','#5fd9c9':'민트','#6fc3ff':'하늘','#8a7dff':'보라','#c98bff':'연보라','#ffffff':'하양','#3b3f7a':'남색','#8b5a3c':'갈색'};
  const JUDGES=Object.freeze([
    {id:'mong',face:'🐰',name:'몽글이',role:'토끼 재봉사',looks:'옷과 색깔'},
    {id:'banjjak',face:'🦉',name:'반짝이',role:'부엉이 보석상',looks:'반짝 장식'},
    {id:'kong',face:'🦔',name:'콩콩이',role:'고슴도치 무대감독',looks:'무대와 친구'}
  ].map(Object.freeze));
  const theme=id=>THEMES.find(t=>t.id===id)||null;
  const tagged=(cat,id,themeId)=>!!id&&(ITEM_TAGS[cat]?.[id]||[]).includes(themeId);
  const suggestions=(cat,themeId)=>Object.keys(ITEM_TAGS[cat]||{}).filter(id=>tagged(cat,id,themeId));
  function wornAccessories(state){
    const tail=state?.dress?.id==='tail';
    return ACCESSORIES.filter(k=>state?.[k]?.id&&!(k==='shoes'&&tail));
  }
  function checklist(themeId,state){
    const t=theme(themeId);state=state||{};
    if(!t)return {dress:false,color:false,accessories:0,bg:false,pet:false};
    const colorful=wornAccessories(state).concat(state.dress?.id?['dress']:[])
      .some(k=>t.colors.includes(String(state[k].color||'').toLowerCase()));
    const rainbow=state.dress?.id==='rainbow'&&tagged('dress','rainbow',t.id);
    return {
      dress:tagged('dress',state.dress?.id,t.id),
      color:colorful||rainbow,
      accessories:wornAccessories(state).filter(k=>tagged(k,state[k].id,t.id)).length,
      bg:tagged('bg',state.bg,t.id),
      pet:tagged('pet',state.pet?.id,t.id)
    };
  }
  const q=s=>'‘'+s+'’';
  /* 심사: 심사위원마다 기본 별 3개에서 시작해 맞춘 만큼 더한다. 절대 3개 아래로 내려가지 않는다. */
  function judge(themeId,state,nameOf){
    const t=theme(themeId);if(!t)return null;state=state||{};
    const name=typeof nameOf==='function'?nameOf:(cat,id)=>id;
    const c=checklist(themeId,state);
    const pick=(cat)=>{const list=suggestions(cat,t.id).filter(id=>state[cat]?.id!==id);return list.length?q(name(cat,list[0])):'';};
    const colorWords=t.colors.slice(0,2).map(x=>COLOR_NAMES[x]).join('·');
    // 1) 몽글이: 옷 + 색깔
    const dressName=state.dress?.id?q(name('dress',state.dress.id)):'';
    let a;
    if(c.dress&&c.color)a={hits:2,text:dressName+'에 색깔까지! '+t.title+'에 딱 맞아요.',tip:''};
    else if(c.dress)a={hits:1,text:dressName+', '+t.title+'에 정말 잘 어울려요!',tip:'💡 '+colorWords+' 색으로 바꿔 봐도 예뻐요.'};
    else if(c.color)a={hits:1,text:'색깔이 정말 예뻐요! 오늘 분위기랑 딱이에요.',tip:pick('dress')?'💡 '+pick('dress')+'도 잘 어울려요.':''};
    else a={hits:0,text:'나만의 멋진 스타일이에요! 당당해서 좋아요.',tip:'💡 '+(pick('dress')?pick('dress')+'에 ':'')+colorWords+' 색은 어때요?'};
    // 2) 반짝이: 장식(신발·왕관·목걸이·손·날개)
    const shiny=wornAccessories(state).filter(k=>tagged(k,state[k].id,t.id)).map(k=>q(name(k,state[k].id)));
    const accTip=()=>{const ideas=ACCESSORIES.filter(k=>!(state[k]?.id&&tagged(k,state[k].id,t.id))).map(pick).filter(Boolean).slice(0,2);return ideas.length?'💡 '+ideas.join(', ')+'도 반짝반짝해요.':'';};
    let b;
    if(shiny.length>=2)b={hits:2,text:shiny.slice(0,2).join(', ')+'! 반짝반짝 완벽해요.',tip:''};
    else if(shiny.length===1)b={hits:1,text:shiny[0]+' 고른 눈이 최고예요!',tip:accTip()};
    else b={hits:0,text:'깔끔하고 멋진 차림이에요!',tip:accTip()};
    // 3) 콩콩이: 무대(배경) + 친구
    const bgName=state.bg?q(name('bg',state.bg)):'',petName=state.pet?.id?q(name('pet',state.pet.id)):'';
    let k;
    if(c.bg&&c.pet)k={hits:2,text:bgName+' 무대에 '+petName+' 친구까지, 무대가 살아나요!',tip:''};
    else if(c.bg)k={hits:1,text:bgName+' 무대가 정말 멋져요!',tip:pick('pet')?'💡 '+pick('pet')+' 친구랑 같이 와도 좋아요.':''};
    else if(c.pet)k={hits:1,text:petName+' 친구랑 함께라 더 즐거워요!',tip:pick('bg')?'💡 '+pick('bg')+' 배경이 잘 어울려요.':''};
    else k={hits:0,text:'워킹이 정말 당당했어요! 박수 짝짝!',tip:'💡 '+[pick('bg')&&pick('bg')+' 배경',pick('pet')&&pick('pet')+' 친구'].filter(Boolean).join(', ')+'도 좋아요.'};
    const judges=[a,b,k].map((r,i)=>({...JUDGES[i],stars:3+r.hits,text:r.text,tip:r.tip}));
    const total=judges.reduce((s,j)=>s+j.stars,0);
    return {themeId:t.id,judges,total,max:15,perfect:total===15};
  }
  function headline(result){
    if(!result)return '';
    if(result.perfect)return '완벽한 무대! 황금 트로피를 받았어요!';
    if(result.total>=13)return '반짝반짝 멋진 무대! 리본을 받았어요!';
    return '당당한 무대! 리본을 받았어요!';
  }
  function emptyShelf(){return {version:1,themes:{},current:null,shows:0};}
  function readShelf(storage){
    try{
      const raw=JSON.parse(storage.getItem(KEY)||'null');
      if(!raw||raw.version!==1||typeof raw.themes!=='object'||!raw.themes)return emptyShelf();
      const themes={};
      for(const t of THEMES){
        const r=raw.themes[t.id];if(!r||typeof r!=='object')continue;
        const best=Math.max(9,Math.min(15,Math.round(+r.best||0)));
        themes[t.id]={best,perfect:r.perfect===true||best===15,count:Math.max(1,Math.round(+r.count||1))};
      }
      return {version:1,themes,current:theme(raw.current)?raw.current:null,shows:Math.max(0,Math.round(+raw.shows||0))};
    }catch(_){return emptyShelf();}
  }
  function writeShelf(storage,shelf){try{storage.setItem(KEY,JSON.stringify(shelf));return true;}catch(_){return false;}}
  function setCurrent(storage,id){const s=readShelf(storage);s.current=theme(id)?id:null;return writeShelf(storage,s);}
  function recordShow(storage,result){
    const s=readShelf(storage),t=result&&theme(result.themeId);if(!t)return {ok:false,shelf:s};
    const prev=s.themes[t.id],next={best:Math.max(prev?.best||0,result.total),perfect:!!(prev?.perfect||result.perfect),count:(prev?.count||0)+1};
    const out={...s,themes:{...s.themes,[t.id]:next},shows:s.shows+1};
    const ok=writeShelf(storage,out);
    return {ok,shelf:ok?out:s,newRibbon:!prev,newTrophy:!!result.perfect&&!prev?.perfect};
  }
  function draw(shelf,exclude,rand=Math.random){
    const fresh=THEMES.filter(t=>t.id!==exclude&&!shelf?.themes?.[t.id]?.perfect);
    const pool=fresh.length?fresh:THEMES.filter(t=>t.id!==exclude);
    return pool[Math.floor(rand()*pool.length)%pool.length];
  }

  function mount(api){
    const d=document;let storage;
    try{storage=root.localStorage;storage.getItem(KEY);}catch(_){storage={getItem:()=>null,setItem:()=>{throw Error('no storage');}};}
    const safeStore={getItem:k=>{try{return storage.getItem(k);}catch(_){return null;}},setItem:(k,v)=>storage.setItem(k,v)};
    const el=(tag,cls,text)=>{const n=d.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
    const button=(text,fn,cls='fs-button')=>{const b=el('button',cls,text);b.type='button';b.addEventListener('click',fn);return b;};
    const nameOf=(cat,id)=>{try{return api.itemName(cat,id)||id;}catch(_){return id;}};
    const reduce=()=>{try{return root.matchMedia('(prefers-reduced-motion: reduce)').matches;}catch(_){return false;}};

    // ---------- 소리(Web Audio, 말소리 합성 없음) ----------
    let noise=null;
    function audio(){try{return api.audio();}catch(_){return null;}}
    function tone(a,f,t0,dur,type='triangle',vol=.14){const o=a.createOscillator(),g=a.createGain(),t=a.currentTime+t0;o.type=type;o.frequency.value=f;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(a.destination);o.start(t);o.stop(t+dur+.03);}
    function noiseBuffer(a){if(noise&&noise.sampleRate===a.sampleRate)return noise;const n=Math.floor(a.sampleRate*.06),b=a.createBuffer(1,n,a.sampleRate),ch=b.getChannelData(0);for(let i=0;i<n;i++)ch[i]=(Math.random()*2-1)*Math.pow(1-i/n,3);noise=b;return b;}
    function clapAt(a,t0,vol){const s=a.createBufferSource(),f=a.createBiquadFilter(),g=a.createGain();s.buffer=noiseBuffer(a);f.type='bandpass';f.frequency.value=1100+Math.random()*1200;f.Q.value=.9;g.gain.value=vol;s.connect(f);f.connect(g);g.connect(a.destination);s.start(a.currentTime+t0);}
    function sfx(kind){
      const a=audio();if(!a)return;
      try{
        if(kind==='clap'){for(let i=0;i<46;i++)clapAt(a,Math.random()*1.9,.1+Math.random()*.14);}
        else if(kind==='step'){tone(a,196,0,.12,'sine',.07);}
        else if(kind==='star'){tone(a,1318,0,.18,'triangle',.11);tone(a,1760,.06,.2,'sine',.07);}
        else if(kind==='drum'){for(let i=0;i<10;i++)tone(a,110+i*6,i*.06,.08,'square',.035);}
        else if(kind==='fanfare'){[523,659,784,1047,784,1047].forEach((f,i)=>tone(a,f,i*.11,.32,'triangle',.13));}
        else if(kind==='trophy'){[784,988,1175,1568].forEach((f,i)=>tone(a,f,i*.09,.5,'triangle',.13));tone(a,2093,.42,.7,'sine',.08);}
      }catch(_){}
    }

    // ---------- 입구 버튼과 진행 막대 ----------
    const navHost=d.querySelector('.outing-nav')||d.querySelector('header');
    const entry=button('🎤 패션쇼',()=>{api.sound('click');openPick();},'fs-button fs-entry');entry.dataset.fashionEntry='true';
    navHost.append(entry);
    const bar=el('section','fs-bar');bar.hidden=true;bar.setAttribute('aria-label','패션쇼 준비');
    const barTitle=el('strong','fs-bar-title'),chips=el('div','fs-chips');
    const goStage=button('무대로! 🎤',startShow,'fs-button fs-primary fs-go');
    bar.append(barTitle,chips,goStage,button('🃏 주제',()=>{api.sound('click');openPick();}),button('✕',stopTheme,'fs-button fs-close'));
    bar.lastChild.setAttribute('aria-label','패션쇼 그만하기');
    (d.querySelector('.outing-quest')||navHost).after(bar);

    function dialog(label,cls){
      const node=el('dialog','fs-dialog '+cls),head=el('div','fs-head'),title=el('h2','',label);
      title.id='fs-title-'+cls;node.setAttribute('aria-labelledby',title.id);
      head.append(title);node.append(head);d.body.append(node);return {node,head,title};
    }

    // ---------- 주제 카드 뽑기 + 트로피 진열장 ----------
    const pick=dialog('🎤 오늘의 패션쇼 주제','fs-pick');
    pick.head.append(button('닫기',()=>pick.node.close()));
    const card=el('div','fs-card'),cardIcon=el('span','fs-card-icon'),cardTitle=el('strong','fs-card-title'),cardLine=el('p','fs-card-line'),cardLikes=el('p','fs-card-likes');
    card.append(el('span','fs-card-kicker','THEME CARD'),cardIcon,cardTitle,cardLine,cardLikes);
    // 다시 열 때 지난 뒤집기 애니메이션이 재생되지 않도록 끝나면 지운다.
    card.addEventListener('animationend',()=>card.classList.remove('is-flip'));
    const pickRow=el('div','fs-row');
    pickRow.append(button('🃏 다른 카드 뽑기',()=>{drawn=draw(readShelf(safeStore),drawn?.id);sfx('drum');showCard(true);}),button('👗 이 주제로 꾸미기 →',chooseTheme,'fs-button fs-primary'));
    const shelfTitle=el('h3','fs-shelf-title','🏆 트로피 진열장'),shelfNote=el('p','fs-shelf-note'),shelfGrid=el('div','fs-shelf');
    pick.node.append(card,pickRow,shelfTitle,shelfNote,shelfGrid);
    let drawn=null,active=null;
    function renderShelf(target,note){
      const s=readShelf(safeStore);target.replaceChildren();
      for(const t of THEMES){
        const r=s.themes[t.id],slot=el('div','fs-slot'+(r?.perfect?' is-trophy':r?' is-ribbon':''));slot.dataset.shelf=t.id;
        slot.append(el('span','fs-slot-award',r?.perfect?'🏆':r?'🎀':t.icon),el('strong','',t.title),el('small','',r?'별 '+r.best+'개':'아직 비어 있어요'));
        target.append(slot);
      }
      if(note){const cleared=Object.keys(s.themes).length,golden=Object.values(s.themes).filter(r=>r.perfect).length;note.textContent='리본 '+cleared+' / '+THEMES.length+' · 황금 트로피 '+golden+' / '+THEMES.length;}
    }
    function showCard(flip){
      card.dataset.theme=drawn.id;cardIcon.textContent=drawn.icon;cardTitle.textContent=drawn.title;cardLine.textContent=drawn.line;cardLikes.textContent='좋아해요: '+drawn.likes;
      if(flip&&!reduce()){card.classList.remove('is-flip');void card.offsetWidth;card.classList.add('is-flip');}
    }
    function openPick(forceNew){
      const s=readShelf(safeStore),fresh=forceNew===true||!active;drawn=fresh?draw(s,active?.id):active;showCard(fresh);renderShelf(shelfGrid,shelfNote);
      if(!pick.node.open)pick.node.showModal();
    }
    function chooseTheme(){
      active=drawn;setCurrent(safeStore,active.id);pick.node.close();api.sound('tada');refresh();
      api.selectTab('dress');
    }
    function stopTheme(){active=null;setCurrent(safeStore,null);bar.hidden=true;api.sound('click');}
    const CHIP_DEFS=[
      {key:'dress',icon:'👗',label:'옷',tab:'dress'},{key:'color',icon:'🎨',label:'색깔',tab:'dress'},
      {key:'accessories',icon:'💎',label:'장식',tab:'crown'},{key:'bg',icon:'🏰',label:'무대',tab:'bg'},{key:'pet',icon:'🐾',label:'친구',tab:'pet'}
    ];
    function refresh(){
      if(!active){bar.hidden=true;return;}
      bar.hidden=false;const c=checklist(active.id,api.snapshot().state);
      barTitle.textContent=active.icon+' '+active.title;chips.replaceChildren();
      for(const def of CHIP_DEFS){
        const v=c[def.key],ok=def.key==='accessories'?v>=2:!!v;
        const chip=button(def.icon+' '+def.label+(def.key==='accessories'?' '+Math.min(v,2)+'/2':ok?' ✓':''),()=>{api.sound('click');api.selectTab(def.tab);},'fs-chip'+(ok?' is-ok':''));
        chip.dataset.check=def.key;chip.setAttribute('aria-label',def.label+(ok?' 잘 어울려요':' 골라 보기'));chips.append(chip);
      }
    }

    // ---------- 무대 ----------
    const show=dialog('🎤 패션쇼','fs-show');
    const skip=button('⏩ 빨리 보기',()=>{fast=true;flushWaits();}),closeShow=button('닫기',()=>show.node.close());
    show.head.append(skip,closeShow);
    const layout=el('div','fs-show-layout'),runway=el('div','fs-runway'),screen=el('div','fs-screen'),screenImg=el('img');screenImg.alt='';screen.append(screenImg);
    const floor=el('div','fs-floor'),spot=el('div','fs-spot'),actor=el('div','fs-actor'),bob=el('div','fs-bob'),sparkles=el('div','fs-sparkles'),curtainL=el('div','fs-curtain fs-curtain-l'),curtainR=el('div','fs-curtain fs-curtain-r');
    const audience=el('div','fs-audience');for(const f of ['🐻','🐱','🐶','🐼','🦊','🐨','🐹','🐧','🐸'])audience.append(el('span','',f));
    const banner=el('div','fs-banner');
    actor.append(bob);runway.append(screen,floor,spot,actor,sparkles,curtainL,curtainR,audience,banner);
    runway.setAttribute('role','img');
    const side=el('div','fs-side'),judgesBox=el('div','fs-judges'),result=el('div','fs-result'),live=el('p','fs-live');live.setAttribute('role','status');
    result.hidden=true;
    const resultIcon=el('span','fs-result-icon'),resultText=el('strong','fs-result-text'),resultStars=el('span','fs-result-stars');
    result.append(resultIcon,resultText,resultStars);
    const actions=el('div','fs-actions');actions.hidden=true;
    const albumBtn=button('📸 앨범에 넣기',saveToAlbum,'fs-button fs-primary');
    actions.append(albumBtn,button('🔁 한 번 더 걷기',()=>startShow(true)),button('👗 옷 바꾸기',()=>show.node.close()),button('🃏 다른 주제',()=>{show.node.close();openPick(true);}),button('🏆 진열장',()=>{show.node.close();openPick();}));
    side.append(judgesBox,result,live,actions);layout.append(runway,side);show.node.append(layout);
    let token=0,fast=false,run=null,waits=new Set(),saving=false;
    function flushWaits(){for(const w of [...waits]){clearTimeout(w.t);waits.delete(w);w.r();}}
    function wait(ms,mine){return new Promise(r=>{if(fast||mine!==token)return r();const w={r,t:0};w.t=setTimeout(()=>{waits.delete(w);r();},ms);waits.add(w);});}
    show.node.addEventListener('close',()=>{token++;flushWaits();sparkles.replaceChildren();runway.className='fs-runway';refresh();});
    function scopeIds(svg){
      return svg.replace(/\bid="([^"]+)"/g,(_,id)=>'id="fs-'+id+'"').replace(/url\(#([^)]+)\)/g,(_,id)=>'url(#fs-'+id+')').replace(/href="#([^"]+)"/g,(_,id)=>'href="#fs-'+id+'"');
    }
    function actorSvg(svg){
      const doc=new DOMParser().parseFromString(scopeIds(svg),'image/svg+xml');
      doc.querySelectorAll('[data-studio-background]').forEach(n=>n.remove());
      const s=doc.documentElement;s.setAttribute('aria-hidden','true');s.removeAttribute('role');
      return new XMLSerializer().serializeToString(s);
    }
    function burst(chars,n=14){
      if(reduce())return;
      for(let i=0;i<n;i++){const s=el('span','fs-spark',chars[i%chars.length]);s.style.setProperty('--x',(6+((i*37)%88))+'%');s.style.setProperty('--y',(14+((i*53)%60))+'%');s.style.setProperty('--d',(i*.06)+'s');sparkles.append(s);}
      setTimeout(()=>{if(sparkles.childElementCount>40)sparkles.replaceChildren();},1600);
    }
    function starsRow(n){const row=el('span','fs-stars');row.setAttribute('aria-label','별 '+n+'개');for(let i=0;i<5;i++)row.append(el('i',i<n?'on':'','★'));return row;}
    function judgeCard(j){
      const card=el('article','fs-judge');card.dataset.judge=j.id;card.dataset.stars=String(j.stars);
      const face=el('span','fs-judge-face',j.face),who=el('div','fs-judge-who');who.append(el('strong','',j.name),el('small','',j.role));
      const stars=starsRow(0),text=el('p','fs-judge-text',j.text),tip=el('p','fs-judge-tip',j.tip||'');if(!j.tip)tip.hidden=true;
      card.append(face,who,stars,text,tip);return {card,stars};
    }
    async function startShow(again){
      if(!active)return;
      const snap=api.snapshot(),mine=++token;flushWaits();fast=reduce();saving=false;
      run={theme:active,state:JSON.parse(JSON.stringify(snap.state)),princess:snap.princess,result:judge(active.id,snap.state,nameOf),saved:false};
      show.title.textContent='🎤 패션쇼 · '+active.title;
      runway.setAttribute('aria-label',run.princess.name+'의 '+active.title+' 패션쇼 무대');
      try{screenImg.src=api.background(run.state.bg);}catch(_){screenImg.removeAttribute('src');}
      try{bob.innerHTML=actorSvg(api.render(run.state,run.princess));}catch(_){bob.replaceChildren(el('p','fs-missing','공주 그림을 불러오지 못했어요.'));}
      banner.textContent=active.icon+' '+active.title;
      judgesBox.replaceChildren(el('p','fs-judges-wait','심사위원 세 친구가 기다리고 있어요…'));
      result.hidden=true;actions.hidden=true;albumBtn.disabled=false;albumBtn.textContent='📸 앨범에 넣기';sparkles.replaceChildren();
      skip.hidden=false;live.textContent=again?'한 번 더 무대로!':'곧 무대가 열려요!';
      runway.className='fs-runway is-dark';
      if(!show.node.open)show.node.showModal();
      void runway.offsetWidth;
      sfx('drum');
      await wait(700,mine);if(mine!==token)return;
      runway.classList.add('is-open');live.textContent=run.princess.name+' 입장!';
      await wait(500,mine);if(mine!==token)return;
      runway.classList.add('is-walking');
      for(let i=0;i<6&&mine===token&&!fast;i++){sfx('step');await wait(380,mine);}
      if(mine!==token)return;
      runway.classList.remove('is-walking');runway.classList.add('is-front','is-pose','is-lit');
      live.textContent='반짝! 멋진 포즈!';sfx('clap');sfx('fanfare');burst(['✨','⭐','💖','✦']);
      await wait(1300,mine);if(mine!==token)return;
      judgesBox.replaceChildren();
      for(const j of run.result.judges){
        const {card,stars}=judgeCard(j);judgesBox.append(card);
        if(!fast)card.classList.add('is-enter');
        await wait(350,mine);if(mine!==token)return;
        for(let i=0;i<j.stars;i++){stars.children[i].classList.add('on');if(!fast){sfx('star');await wait(170,mine);if(mine!==token)return;}}
        await wait(650,mine);if(mine!==token)return;
      }
      finish(mine);
    }
    function finish(mine){
      if(mine!==token)return;
      const r=run.result,rec=recordShow(safeStore,r);
      runway.classList.add('is-front','is-pose','is-lit','is-done');
      result.hidden=false;result.dataset.award=r.perfect?'trophy':'ribbon';result.classList.toggle('is-trophy',r.perfect);
      resultIcon.textContent=r.perfect?'🏆':'🎀';resultText.textContent=headline(r);
      resultStars.textContent='별 '+r.total+' / '+r.max;
      actions.hidden=false;skip.hidden=true;
      live.textContent=!rec.ok?'진열장에 저장하지 못했어요. 그래도 무대는 최고였어요!':rec.newTrophy?'진열장에 황금 트로피가 생겼어요!':rec.newRibbon?'진열장에 '+run.theme.title+' 리본이 생겼어요!':'관객들이 계속 박수를 쳐요!';
      sfx(r.perfect?'trophy':'fanfare');sfx('clap');burst(r.perfect?['🏆','✨','⭐','👑']:['🎀','✨','💖'],r.perfect?22:14);
      api.notify(r.perfect?'황금 트로피! 🏆':'리본을 받았어요! 🎀');
    }
    function drawStar(ctx,x,y,r,fill){ctx.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.45:r;ctx.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);}ctx.closePath();ctx.fillStyle=fill;ctx.fill();}
    function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
    async function composePhoto(capture){
      const svg=await api.exportSvg(capture.state,capture.princess),png=await api.rasterize(svg,280,453);
      const img=new Image();img.src=png;await img.decode();
      const W=280,H=453,cv=d.createElement('canvas');cv.width=W;cv.height=H;const ctx=cv.getContext('2d');
      ctx.drawImage(img,0,0,W,H);
      const glow=ctx.createRadialGradient(W/2,H*.18,10,W/2,H*.45,H*.62);glow.addColorStop(0,'rgba(255,250,220,.28)');glow.addColorStop(1,'rgba(40,10,60,.18)');ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);
      const font='"Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",sans-serif';
      roundRect(ctx,24,10,W-48,30,15);ctx.fillStyle='rgba(255,255,255,.9)';ctx.fill();ctx.lineWidth=2;ctx.strokeStyle='#ffd86a';ctx.stroke();
      ctx.fillStyle='#6b2f74';ctx.font='900 14px '+font;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('패션쇼 · '+capture.theme.title,W/2,26);
      // 리본 또는 트로피 휘장(그림 파일 없이 도형으로)
      const cx=W-42,cy=H-62,gold=capture.result.perfect;
      ctx.fillStyle=gold?'#e5a82f':'#d83e8a';
      ctx.beginPath();ctx.moveTo(cx-14,cy+10);ctx.lineTo(cx-22,cy+42);ctx.lineTo(cx-10,cy+35);ctx.lineTo(cx-4,cy+46);ctx.lineTo(cx,cy+12);ctx.fill();
      ctx.beginPath();ctx.moveTo(cx+14,cy+10);ctx.lineTo(cx+22,cy+42);ctx.lineTo(cx+10,cy+35);ctx.lineTo(cx+4,cy+46);ctx.lineTo(cx,cy+12);ctx.fill();
      ctx.beginPath();ctx.arc(cx,cy,24,0,Math.PI*2);ctx.fillStyle=gold?'#ffd05a':'#ff8fc1';ctx.fill();ctx.lineWidth=3;ctx.strokeStyle='#fff';ctx.stroke();
      drawStar(ctx,cx,cy,14,gold?'#fff6c8':'#fff');
      roundRect(ctx,14,H-38,124,26,13);ctx.fillStyle='rgba(67,36,73,.78)';ctx.fill();
      for(let i=0;i<5;i++)drawStar(ctx,30+i*15,H-25,6.5,'#ffd93d');
      ctx.fillStyle='#fff';ctx.font='900 12px '+font;ctx.textAlign='left';ctx.fillText(String(capture.result.total),106,H-24.5);
      return cv.toDataURL('image/jpeg',.86);
    }
    async function saveToAlbum(){
      if(!run||run.saved||saving)return;
      saving=true;albumBtn.disabled=true;albumBtn.textContent='사진을 담고 있어요…';const capture=run,mine=token;
      try{
        const src=await composePhoto(capture);
        if(mine!==token)return;
        if(!api.saveAlbum({src,name:capture.princess.name+' · '+capture.theme.title+' 패션쇼',t:Date.now()}))throw new Error('storage');
        capture.saved=true;albumBtn.textContent='✓ 앨범에 넣었어요';live.textContent='📚 앨범에 패션쇼 사진을 넣었어요!';api.sound('shutter');
      }catch(e){
        if(mine!==token)return;
        live.textContent=e&&e.message==='storage'?'기기 저장 공간이 부족해요. 앨범 사진을 조금 지운 뒤 다시 눌러 주세요.':'사진을 만들지 못했어요. 다시 눌러 주세요.';
        albumBtn.disabled=false;albumBtn.textContent='📸 다시 넣기';
      }finally{if(mine===token)saving=false;}
    }

    const saved=readShelf(safeStore);
    if(saved.current){active=theme(saved.current);refresh();}
    return {refresh,openPick,startShow,get active(){return active;}};
  }
  root.PrincessFashion={KEY,THEMES,ITEM_TAGS,JUDGES,COLOR_NAMES,theme,tagged,suggestions,checklist,judge,headline,readShelf,recordShow,setCurrent,draw,mount};
})(globalThis);
