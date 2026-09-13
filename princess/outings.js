(function(root){
  "use strict";
  const KEY="princess:storybook:v1",MAX_PAGES=24;
  const INVITES=Object.freeze([
    {id:"rainbow",title:"무지개 생일파티",icon:"🌈",bg:"rainbow",tab:"dress",rule:"pink",wish:"옷이나 소품 하나를 분홍색으로 골라 줄래?",intro:"무지개 아래에 생일 초대장이 도착했어요. 오늘의 주인공은 네가 꾸민 공주예요!",line:"분홍빛 웃음이 무지개 파티를 환하게 밝혔어요.",pet:"dog",sticker:"🎂"},
    {id:"tea",title:"빗방울 티파티",icon:"☔",bg:"cherry",tab:"hand",rule:"blue",wish:"옷이나 소품 하나를 하늘색으로 골라 줄래?",intro:"톡톡, 비 오는 정원의 작은 티파티예요. 좋아하는 모습으로 놀러 오세요.",line:"빗방울 소리를 들으며 친구와 따뜻한 시간을 보냈어요.",pet:"cat",sticker:"☕"},
    {id:"moon",title:"달빛 무도회",icon:"🌙",bg:"ballroom",tab:"crown",rule:"crown",wish:"마음에 드는 머리 장식을 하나 골라 줄래?",intro:"커튼이 열리고 달빛 무대가 반짝여요. 공주가 인사를 기다리고 있어요.",line:"조명이 켜지자 나만의 달빛 무도회가 시작됐어요.",pet:"mouse",sticker:"💎"},
    {id:"forest",title:"숲속 동물 소풍",icon:"🌳",bg:"forest",tab:"pet",rule:"pet",wish:"함께 소풍 갈 동물 친구를 골라 줄래?",intro:"숲속의 친구들이 소풍 자리를 준비했어요. 오늘은 누구와 함께 갈까요?",line:"숲속 친구와 인사하고 소풍 사진을 남겼어요.",pet:"rabbit",sticker:"🍓"},
    {id:"sea",title:"바닷속 음악회",icon:"🐚",bg:"sea",tab:"hand",rule:"hand",wish:"손에 들고 갈 소품을 하나 골라 줄래?",intro:"보글보글, 바닷속 음악회에 초대됐어요. 인어 꼬리가 없어도 마법처럼 놀러 갈 수 있어요.",line:"바닷속 반짝이는 무대에서 나만의 포즈를 뽐냈어요.",pet:"fish",sticker:"🐚"},
    {id:"snow",title:"눈꽃 잠옷 파티",icon:"❄️",bg:"snow",tab:"dress",rule:"white",wish:"옷이나 소품 하나를 하얀색으로 골라 줄래?",intro:"눈꽃 축제 뒤에 포근한 파티가 열려요. 잠옷이 아니어도 좋아하는 옷이면 괜찮아요!",line:"눈꽃이 내려앉은 파티에서 포근한 추억을 만들었어요.",pet:"deer",sticker:"❄️"}
  ].map(Object.freeze));
  const clone=x=>JSON.parse(JSON.stringify(x));
  function invitation(id){return INVITES.find(x=>x.id===id)||null;}
  function matches(inv,state){
    if(!inv||!state)return false;
    if(["crown","pet","hand"].includes(inv.rule))return !!state[inv.rule]?.id;
    const color={pink:"#ff8fc1",blue:"#6fc3ff",white:"#ffffff"}[inv.rule];
    return ["dress","shoes","crown","neck","hand","back"].some(k=>state[k]?.id&&state[k].color?.toLowerCase()===color);
  }
  function sceneState(state,inv){return {...clone(state),bg:inv.bg};}
  function emptyBook(){return {version:1,pages:[],stickers:[]};}
  function readBook(storage){
    try{
      const raw=JSON.parse(storage.getItem(KEY)||"null");
      if(raw?.version!==1||!Array.isArray(raw.pages))return emptyBook();
      return {version:1,pages:raw.pages.filter(p=>p&&typeof p.id==="string"&&invitation(p.inviteId)&&
        typeof p.photo==="string"&&/^data:image\/(?:jpeg|png);base64,/.test(p.photo)).slice(0,MAX_PAGES),
        stickers:[...new Set((Array.isArray(raw.stickers)?raw.stickers:[]).filter(id=>invitation(id)))]};
    }catch(_){return emptyBook();}
  }
  function addPage(storage,page){
    const book=readBook(storage);
    if(book.pages.some(p=>p.id===page.id))return {ok:true,book};
    if(book.pages.length>=MAX_PAGES)return {ok:false,reason:"full"};
    const next={version:1,pages:[clone(page),...book.pages],stickers:[...new Set([...book.stickers,page.inviteId])]};
    try{storage.setItem(KEY,JSON.stringify(next));return {ok:true,book:next};}
    catch(_){return {ok:false,reason:"storage"};}
  }
  function removePage(storage,id){
    const book=readBook(storage),next={...book,pages:book.pages.filter(p=>p.id!==id)};
    try{storage.setItem(KEY,JSON.stringify(next));return true;}catch(_){return false;}
  }
  function mount(api){
    const d=document,storage={getItem:k=>localStorage.getItem(k),setItem:(k,v)=>localStorage.setItem(k,v)};
    const el=(tag,cls,text)=>{const n=d.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;};
    const button=(text,fn,cls="outing-button")=>{const b=el("button",cls,text);b.type="button";b.addEventListener("click",fn);return b;};
    const nav=el("nav","outing-nav");nav.setAttribute("aria-label","공주 이야기 놀이");
    const navCopy=el("span","outing-nav-copy","꾸민 다음, 놀러 가요!");
    nav.append(navCopy,button("💌 초대장 6통",openInvites,"outing-button outing-primary"),button("📖 내 이야기책",openBook));
    d.querySelector("header").after(nav);
    const quest=el("section","outing-quest");quest.hidden=true;
    const questCopy=el("div"),questTitle=el("strong"),questStatus=el("p");questStatus.setAttribute("aria-live","polite");
    questCopy.append(questTitle,questStatus);
    const go=button("놀러 가기 →",startScene,"outing-button outing-primary");
    quest.append(questCopy,button("고르러 가기",()=>api.selectTab(active.tab)),go,button("자유 꾸미기",()=>{active=null;quest.hidden=true;}));
    nav.after(quest);
    function dialog(label){
      const node=el("dialog","outing-dialog"),head=el("div","outing-dialog-head"),title=el("h2","",label);
      const titleId="outing-title-"+d.querySelectorAll(".outing-dialog").length;title.id=titleId;node.setAttribute("aria-labelledby",titleId);
      head.append(title,button("닫기",()=>node.close()));node.append(head);d.body.append(node);return node;
    }
    const invites=dialog("오늘은 어디로 놀러 갈까요?"),grid=el("div","outing-invites");
    invites.append(el("p","outing-lead","부탁은 하나, 나머지는 네 마음대로! 언제든 다시 놀러 갈 수 있어요."),grid);
    for(const inv of INVITES){
      const b=button("",()=>{active=inv;invites.close();quest.hidden=false;refresh();api.selectTab(inv.tab);});
      b.className="outing-invite";b.dataset.invite=inv.id;
      const img=el("img");img.src=api.background(inv.bg);img.alt="";img.loading="lazy";
      b.append(img,el("span","outing-invite-icon",inv.icon),el("strong","",inv.title),el("span","",inv.wish));grid.append(b);
    }
    const scene=dialog("공주의 나들이");scene.classList.add("outing-scene");
    const layout=el("div","outing-scene-layout"),stage=el("div","outing-stage"),sceneArt=el("div","outing-scene-art");
    const fx=el("div","outing-effects");fx.setAttribute("aria-hidden","true");
    stage.append(sceneArt,fx);
    const side=el("div","outing-scene-side"),tag=el("p","outing-eyebrow","MY LITTLE STORY"),sceneTitle=el("h3"),intro=el("p","outing-intro");
    const live=el("p","outing-live");live.setAttribute("role","status");
    const actions=el("div","outing-actions"),save=button("📸 찍어서 이야기책에",saveStory,"outing-button outing-primary");
    actions.append(button("🙇 꾸벅 인사",()=>act("bow")),button("✨ 반짝 포즈",()=>act("pose")),button("🐾 친구 부르기",()=>act("pet")));
    const sticker=el("div","outing-earned");sticker.hidden=true;
    side.append(tag,sceneTitle,intro,live,actions,save,sticker,button("📖 이야기책 보기",()=>{scene.close();openBook();}),button("옷 다시 고르기",()=>scene.close()));
    layout.append(stage,side);scene.append(layout);
    const bookDialog=dialog("내 공주 이야기책"),shelf=el("div","outing-stickers"),pages=el("div","outing-pages");
    bookDialog.append(shelf,pages);
    let active=null,visit=null,busy=false,token=0,serial=0;
    scene.addEventListener("close",()=>{token++;fx.replaceChildren();busy=false;});
    function refresh(){
      if(!active)return;
      const ok=matches(active,api.snapshot().state);questTitle.textContent=active.icon+" "+active.title;
      questStatus.textContent=(ok?"✓ 준비됐어요! ":"")+active.wish;
      quest.classList.toggle("is-ready",ok);go.textContent=ok?"놀러 가기 →":"마음대로 놀러 가기 →";
    }
    function openInvites(){api.sound("click");invites.showModal();}
    function safeSvg(svg){
      return svg.replace(/\bid="([^"]+)"/g,(_,id)=>'id="outing-'+id+'"')
        .replace(/url\(#([^)]+)\)/g,(_,id)=>"url(#outing-"+id+")").replace(/href="#([^"]+)"/g,(_,id)=>'href="#outing-'+id+'"');
    }
    function decorate(svg,pose,inviteId){
      const doc=new DOMParser().parseFromString(safeSvg(svg),"image/svg+xml");
      const ambience=doc.createElementNS("http://www.w3.org/2000/svg","g");
      ambience.setAttribute("data-outing-ambience",inviteId);
      ambience.setAttribute("aria-hidden","true");
      if(["tea","snow","sea"].includes(inviteId))for(let i=0;i<18;i++){
        const rain=inviteId==="tea",n=doc.createElementNS("http://www.w3.org/2000/svg",rain?"line":"circle");
        const x=(i*73+23)%420,y=(i*113+35)%660;
        const attrs=rain?{x1:x,y1:y,x2:x-4,y2:y+16,stroke:"#e5f4ff","stroke-width":2}:{cx:x,cy:y,r:inviteId==="sea"?4+i%4:2+i%3,fill:inviteId==="sea"?"none":"white",stroke:"white","stroke-width":1};
        Object.entries(attrs).forEach(([key,value])=>n.setAttribute(key,value));
        n.setAttribute("opacity",".6");ambience.append(n);
      }
      doc.querySelector("[data-photo-safe]")?.before(ambience);
      const actor=doc.querySelector("[data-body-identity]");
      if(actor){
        const wrapper=doc.createElementNS("http://www.w3.org/2000/svg","g");wrapper.setAttribute("class","outing-actor");
        actor.before(wrapper);wrapper.append(actor);
        if(pose)wrapper.setAttribute("transform","translate(210 580) rotate(-3) translate(-210 -580)");
      }
      const pet=doc.querySelector('[data-studio-part^="pet/"]');
      if(pet){const wrapper=doc.createElementNS("http://www.w3.org/2000/svg","g");wrapper.setAttribute("class","outing-pet");pet.before(wrapper);wrapper.append(pet);}
      return new XMLSerializer().serializeToString(doc.documentElement);
    }
    function renderScene(){sceneArt.innerHTML=decorate(api.render(visit.state,visit.princess),visit.pose,visit.inviteId);}
    function startScene(){
      if(!active)return;const snapshot=api.snapshot();
      visit={id:Date.now().toString(36)+"-"+(++serial),inviteId:active.id,princess:snapshot.princess,state:sceneState(snapshot.state,active),wishMet:matches(active,snapshot.state),pose:false,saved:false};
      token++;busy=false;save.disabled=false;save.textContent="📸 찍어서 이야기책에";sticker.hidden=true;
      sceneTitle.textContent=active.icon+" "+active.title;intro.textContent=active.intro;
      live.textContent="인사하고, 포즈를 고르고, 친구도 불러 봐요.";renderScene();scene.showModal();api.sound("tada");burst(active.icon);
    }
    function burst(icon){
      fx.replaceChildren();
      for(let i=0;i<10;i++){const s=el("span","outing-spark",i%3===0?icon:"✦");s.style.setProperty("--x",(8+i*9)+"%");s.style.setProperty("--delay",i*.05+"s");fx.append(s);}
    }
    function act(kind){
      if(!visit||busy)return;const inv=invitation(visit.inviteId);
      if(kind==="pet"){
        if(!visit.state.pet)visit.state.pet={id:inv.pet};
        live.textContent=api.petName(visit.state.pet.id)+" 친구가 반갑게 인사해요!";
      }else if(kind==="bow"){live.textContent="꾸벅! 만나서 반가워요. 네가 꾸며 준 모습이 마음에 들어요.";}
      else {visit.pose=!visit.pose;live.textContent=visit.pose?"반짝! 오늘의 포즈를 골랐어요. 사진으로 남겨 볼까요?":"다시 편안한 포즈로 돌아왔어요.";}
      renderScene();sceneArt.classList.remove("is-bowing","is-calling");void sceneArt.offsetWidth;
      if(kind==="bow")sceneArt.classList.add("is-bowing");
      if(kind==="pet")sceneArt.classList.add("is-calling");
      api.sound(kind==="pet"?"click":"tada");burst(kind==="pet"?"💗":"✨");
    }
    async function saveStory(){
      if(!visit||busy||visit.saved)return;
      busy=true;save.disabled=true;save.textContent="사진을 담고 있어요…";const capture=clone(visit),mine=token;
      try{
        const svg=await api.exportSvg(capture.state,capture.princess);
        const photo=await api.photo(decorate(svg,capture.pose,capture.inviteId));
        if(mine!==token||!scene.open)return;
        const inv=invitation(capture.inviteId),result=addPage(storage,{id:capture.id,inviteId:capture.inviteId,princessName:capture.princess.name,photo,pose:capture.pose,wishMet:capture.wishMet,createdAt:Date.now()});
        if(!result.ok)throw new Error(result.reason);
        visit.saved=true;save.textContent="✓ 이야기책에 담았어요";sticker.hidden=false;
        sticker.textContent=inv.sticker+" 추억 스티커를 모았어요! "+result.book.stickers.length+" / 6";
        live.textContent="사진과 초대장이 한 페이지가 됐어요.";api.sound("tada");burst(inv.sticker);
      }catch(e){
        if(mine!==token)return;
        live.textContent=e.message==="full"?"이야기책 24장이 가득 찼어요. 책에서 원하는 사진을 지운 뒤 다시 찍어 주세요.":e.message==="storage"?"기기 저장 공간이 부족해요. 기존 사진은 그대로예요. 공간을 마련한 뒤 다시 눌러 주세요.":"사진을 만들지 못했어요. 인터넷 연결을 확인하거나 다시 눌러 주세요.";
        save.disabled=false;save.textContent="📸 다시 저장하기";
      }finally{if(mine===token){busy=false;if(!visit.saved)save.disabled=false;}}
    }
    function openBook(){
      const book=readBook(storage);shelf.replaceChildren(el("p","","사진 "+book.pages.length+" / 24 · 추억 스티커 "+book.stickers.length+" / 6"));
      for(const inv of INVITES){const s=el("span",book.stickers.includes(inv.id)?"is-collected":"",book.stickers.includes(inv.id)?inv.sticker:"○");s.title=inv.title;s.setAttribute("aria-label",inv.title+(book.stickers.includes(inv.id)?" 스티커 모음":" 아직"));shelf.append(s);}
      pages.replaceChildren();
      if(!book.pages.length)pages.append(el("p","outing-empty","아직 첫 페이지가 비어 있어요. 초대장을 골라 놀러 간 뒤 사진을 찍어 보세요!"),button("💌 초대장 보기",()=>{bookDialog.close();openInvites();}));
      for(const item of book.pages){
        const inv=invitation(item.inviteId),page=el("article","outing-page"),img=el("img");img.src=item.photo;img.alt=item.princessName+" · "+inv.title;img.loading="lazy";
        page.append(img,el("small","",inv.icon+" "+inv.title),el("h3","",item.princessName+"의 나들이"),el("p","",inv.line),el("span","outing-page-sticker",inv.sticker),
          button("이 사진 지우기",()=>{if(!confirm("이야기책의 이 사진만 지울까요? 모은 스티커와 기존 앨범은 그대로예요."))return;if(removePage(storage,item.id))openBook();else api.notify("사진을 지우지 못했어요. 기존 기록은 그대로예요.");},"outing-delete"));
        pages.append(page);
      }
      if(!bookDialog.open)bookDialog.showModal();
    }
    return {refresh};
  }
  root.PrincessOutings={KEY,MAX_PAGES,INVITES,invitation,matches,sceneState,readBook,addPage,removePage,mount};
})(globalThis);
