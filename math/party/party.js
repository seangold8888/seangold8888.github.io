(function(){
'use strict';
const E=window.PartyEngine,$=id=>document.getElementById(id);let storage;
try{storage=window.localStorage;}catch(_){storage={getItem:()=>null,setItem:()=>{throw Error('unavailable');}};}
let state=E.load(storage),sound=false,ctx=null,blown=false,danceTimer;
const colors=['#f5aec4','#a9d8e3','#f5d68e','#b9ddb8','#d1bcef','#f4bea1'];
function persist(){if(!E.save(storage,state))$('saveNote').textContent='지금은 저장이 어려워. 이 화면에서 계속 놀 수 있어.';}
function tone(notes=[523,659,784]){if(!sound)return;try{ctx=ctx||new(window.AudioContext||window.webkitAudioContext)();ctx.resume();notes.forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime+i*.12;o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(.08,t);g.gain.exponentialRampToValueAtTime(.001,t+.22);o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+.24);});}catch(_){sound=false;$('sound').textContent='소리 켜기';$('sound').setAttribute('aria-pressed','false');}}
function announce(text){$('feedback').textContent=text;}
function scene(){
 document.body.dataset.theme=state.theme;
 $('sceneLights').innerHTML=Array.from({length:10},(_,i)=>'<i class="scene-light '+(i<state.light.visual.a+state.placed?'on':'')+'"></i>').join('');
 $('sceneGift').hidden=!state.packed;
 $('sceneBalloons').innerHTML=state.matched.map((id,i)=>'<i class="mini-balloon" style="--c:'+colors[i]+'"></i>').join('');
 $('cake').classList.toggle('chocolate',state.cake==='chocolate');
 $('candles').innerHTML=state.stage===3?'<i class="candle"></i>'.repeat(4):'';
 $('candles').classList.toggle('out',blown);
 document.querySelectorAll('button[data-theme]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.theme===state.theme)));
 document.querySelectorAll('[data-cake]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.cake===state.cake)));
}
function render(){
 scene();$('welcome').hidden=state.started;$('play').hidden=!state.started;if(!state.started)return;
 const stage=state.stage,done=stage<3&&E.completed(state)[stage];
 $('play').classList.toggle('is-party',stage===3);
 $('parityInPlay').hidden=stage!==1&&stage!==3;
 document.querySelectorAll('[data-stop]').forEach(n=>{const i=Number(n.dataset.stop);n.className=i===stage?'current':i<stage?'done':'';if(i===stage)n.setAttribute('aria-current','step');else n.removeAttribute('aria-current');});
 $('help').hidden=stage===3||done;$('finishActions').hidden=!done;$('partyActions').hidden=stage!==3;
 $('next').textContent=stage===2?'파티를 시작하자! →':'다음 준비하러 가자 →';
 $('speaker').textContent=['아빠와 불빛 켜기','태오와 선물 만들기','엄마와 풍선 꾸미기','우리 가족이 모두 모였어!'][stage];
 $('title').textContent=['반짝반짝, 불을 밝혀줘','쿠키 선물을 포장해 줘','풍선 친구를 찾아줘','재이의 파티가 열렸어!'][stage];
 const a=state.light.visual.a+state.placed,b=state.cookie.visual.cross;
 $('instruction').textContent=['전구 10개 중 '+a+'개가 켜졌어. 번개 묶음을 눌러 남은 불빛을 채워줘.','쿠키 10개 중 '+b+'개를 태오의 선물 상자에 담아줘. 쿠키를 누르면 자리를 옮겨.','두 풍선의 숫자를 합쳐 10이 되면 하늘로 둥실! 짝이 되는 풍선을 하나씩 눌러줘.','촛불을 끄고 소원을 빌어볼까? 케이크를 바꾸고 풍선도 터뜨려 봐!'][stage];
 if(stage===0){$('activity').innerHTML='<div class="ten-lights" role="img" aria-label="전구 10개 중 '+a+'개 켜짐">'+Array.from({length:10},(_,i)=>'<i class="bulb '+(i<a?'on':'')+'"></i>').join('')+'</div><div class="power-packets">'+[1,2,3].map(n=>'<button class="power" data-power="'+n+'" aria-label="전구 '+n+'개 켜기" '+(done?'disabled':'')+'>'+'<i class="energy-dot" aria-hidden="true"></i>'.repeat(n)+'</button>').join('')+'</div><p class="activity-note">번개 하나가 전구 하나를 켜 줘.</p>';}
 else if(stage===1){const cookie=(id,inBox)=>'<button class="cookie" data-cookie="'+id+'" aria-label="쿠키 '+(id+1)+(inBox?' 접시로 돌려놓기':' 선물에 담기')+'" '+(done?'disabled':'')+'></button>';const rest=Array.from({length:10},(_,i)=>i).filter(i=>!state.selected.includes(i));$('activity').innerHTML='<div class="cookie-area"><div class="tray"><p class="tray-title">파티 접시 · '+rest.length+'개</p><div class="cookie-grid">'+(rest.map(i=>cookie(i,false)).join('')||'<span class="empty-slot">모두 옮겼어</span>')+'</div></div><div class="tray gift '+(done?'packed':'')+'"><p class="tray-title">태오의 선물 · '+state.selected.length+' / '+b+'개</p><div class="cookie-grid">'+(state.selected.map(i=>cookie(i,true)).join('')||'<span class="empty-slot">여기에 담아줘</span>')+'</div></div></div><button class="wrap-button" data-pack="1" '+(done?'disabled':'')+'>'+(done?'🎀 선물 준비 끝!':'🎀 리본 묶기')+'</button>';}
 else if(stage===2){$('activity').innerHTML='<div class="balloon-grid">'+state.cards.map((c,i)=>'<button class="balloon '+(state.matched.includes(c.id)?'matched':'')+'" style="--c:'+colors[i]+'" data-balloon="'+c.id+'" aria-label="'+c.value+' 풍선'+(state.matched.includes(c.id)?' 연결 완료':'')+'" aria-pressed="'+(state.picked===c.id)+'" '+(state.matched.includes(c.id)?'disabled':'')+'>'+(state.matched.includes(c.id)?'✓':c.value)+'</button>').join('')+'</div>';}
 else{$('activity').innerHTML='<div class="party-complete" aria-hidden="true">🎂 🎈 🎁<p>불빛도, 선물도, 풍선도 재이가 준비했어.</p></div>';}
 if(done)announce(['열 개가 모두 반짝! 아빠가 환하게 웃었어.','선물에 '+b+'개, 파티 접시에 '+(10-b)+'개! 태오 선물 준비 끝.','풍선이 모두 하늘로 올라갔어. 이제 가족을 부르자!'][stage]);
 else if(stage<3&&state.help[stage])showHelp();else announce(stage===3?'오늘은 여기서 마음껏 놀아도 좋아.':'');
}
function showHelp(){const n=10-state.light.visual.a-state.placed,b=state.cookie.visual.cross;announce(['꺼진 전구를 하나씩 세어보자. '+n+'개를 더 켜면 열 개야. 번개 한 개짜리부터 눌러도 좋아.','선물에 담긴 쿠키를 하나씩 세어보자. '+b+'개가 되면 리본을 묶어줘. 많이 담았으면 다시 누르면 돼.','풍선 하나를 골라 그 숫자부터 10까지 세어보자. 더 필요한 수가 적힌 풍선을 찾아줘.'][state.stage]);}
function dispatch(action,value,focusSelector){const result=E.act(state,action,value);if(result==='ignored')return;persist();render();if(result==='overflow')announce('열 개보다 많아져. 더 작은 번개 묶음을 골라보자.');if(result==='too-many')announce('조금 많이 담았네. 선물 속 쿠키를 눌러 접시에 돌려줘.');if(result==='too-few')announce('태오의 선물에 쿠키가 더 필요해. 접시에서 더 담아줘.');if(result==='mismatch')announce('이 둘은 열 개가 아니네. 다른 친구를 찾아보자.');if(result==='picked'){const c=state.cards.find(c=>c.id===state.picked);announce(c.value+' 풍선을 골랐어. 더해서 10이 되는 친구는?');}if(result==='pair'){announce('둘이 합쳐 10! 하늘에 풍선이 달렸어.');tone();}if(result==='complete'){tone();confetti();}if(action==='start'||action==='next'){$('title').setAttribute('tabindex','-1');$('title').focus({preventScroll:true});$('play').scrollIntoView({block:'nearest',behavior:'auto'});}else if(focusSelector){const target=document.querySelector(focusSelector);if(target&&!target.disabled)target.focus({preventScroll:true});else if(result==='complete')$('next').focus({preventScroll:true});}}
function revealScene(){document.querySelector('.scene').scrollIntoView({block:'nearest',behavior:'auto'});}
function confetti(){for(let i=0;i<20;i++){const e=document.createElement('i');e.className='spark';e.style.cssText='left:'+Math.random()*100+'%;top:'+Math.random()*25+'%;--c:'+colors[i%6]+';animation-delay:'+Math.random()*.2+'s';$('sparks').append(e);setTimeout(()=>e.remove(),1600);}}
$('themes').addEventListener('click',e=>{const b=e.target.closest('[data-theme]');if(b)dispatch('theme',b.dataset.theme);});
$('start').onclick=()=>dispatch('start');$('next').onclick=()=>dispatch('next');$('help').onclick=()=>dispatch('help');
$('activity').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;for(const [key,action] of [['power','power'],['cookie','cookie'],['balloon','balloon'],['pack','pack']])if(b.dataset[key]!==undefined){dispatch(action,Number(b.dataset[key]),'[data-'+key+'="'+b.dataset[key]+'"]');break;}});
$('sound').onclick=()=>{sound=!sound;$('sound').textContent=sound?'소리 끄기':'소리 켜기';$('sound').setAttribute('aria-pressed',String(sound));tone();};
$('blow').onclick=()=>{revealScene();blown=!blown;scene();$('blow').textContent=blown?'촛불 다시 켜기':'후~ 촛불 끄기';announce(blown?'후우~! 재이의 소원이 이루어지길!':'다시 반짝! 소원을 하나 더 빌어볼까?');if(blown){confetti();tone([784,659,523]);}};
$('dance').onclick=()=>{revealScene();clearTimeout(danceTimer);document.querySelector('.scene').classList.remove('dancing');void $('cake').offsetWidth;document.querySelector('.scene').classList.add('dancing');danceTimer=setTimeout(()=>document.querySelector('.scene').classList.remove('dancing'),3000);tone([523,659,784,659,523]);announce('아빠, 태오, 재이, 엄마! 다 같이 들썩들썩 ♪');};
$('pop').onclick=()=>{revealScene();const existing=$('sparks').querySelectorAll('.toy-balloon');if(existing.length>=6)existing[0].remove();const b=document.createElement('button');b.className='toy-balloon';b.style.cssText='left:'+(8+Math.random()*72)+'%;--c:'+colors[Math.floor(Math.random()*6)];b.setAttribute('aria-label','떠오르는 풍선 터뜨리기');b.textContent='♥';b.onclick=()=>{b.remove();tone([880]);announce('톡! 하트가 퐁!');};$('sparks').append(b);setTimeout(()=>b.remove(),7500);announce('풍선을 눌러 톡 터뜨려 봐!');};
document.querySelectorAll('[data-cake]').forEach(b=>b.onclick=()=>dispatch('cake',b.dataset.cake));
$('replay').onclick=()=>{state=E.create(undefined,state.history);blown=false;$('blow').textContent='후~ 촛불 끄기';$('sparks').replaceChildren();persist();render();$('start').focus({preventScroll:true});$('welcome').scrollIntoView({block:'nearest'});};
document.addEventListener('visibilitychange',()=>{if(document.hidden&&ctx)ctx.suspend();});
persist();render();
})();
