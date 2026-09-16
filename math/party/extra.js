(function(){
'use strict';
const host=document.getElementById('partyExtra');if(!host)return;
let step=0,count=0,choice=null;const goals=[3,5,7],patterns=[['별','하트','별','하트'],['꽃','꽃','별','꽃','꽃','별'],['하트','별','꽃','하트','별','꽃']];
const shape={별:'★',하트:'♥',꽃:'✿'};
let badges={candles:false,crown:false};try{localStorage.removeItem('math10_party_badges_v1');}catch(_){}
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
function save(){} // Party stamps belong only to the current visit.
host.append(el('p','완성 후 더 놀기','eyebrow'),el('h2','재이의 공주파티 살롱'));
const tabs=el('div',null,'extra-tabs'),board=el('div',null,'extra-board'),status=el('p','','feedback'),collection=el('p','','extra-stamps');status.setAttribute('role','status');host.append(tabs,board,status,collection);
function button(label,fn){const b=el('button',label);b.type='button';b.onclick=()=>{fn();if(!b.isConnected){const next=[...board.querySelectorAll('button')].find(n=>n.textContent===label&&!n.disabled)||board.querySelector('button:not(:disabled)');if(next)next.focus({preventScroll:true});}};return b;}
let mode='candles';for(const [id,label] of [['candles','케이크 촛불 세기'],['crown','왕관 보석 꾸미기']]){const b=button(label,()=>{mode=id;step=0;count=0;choice=null;status.textContent='';render();});b.dataset.mode=id;tabs.append(b);}
function reward(){badges[mode]=true;status.textContent=mode==='candles'?'촛불 장인! 소원을 빌고 가족을 불러 봐.':'반짝 왕관 완성! 재이는 멋진 파티 디자이너야.';render();save();}
function render(){
 tabs.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));board.replaceChildren();collection.textContent='내 파티 도장 · '+(badges.candles?'촛불 장인 ✓':'촛불 장인 ○')+' · '+(badges.crown?'왕관 디자이너 ✓':'왕관 디자이너 ○');
 if(step===3){board.append(el('h3','세 가지 도전을 모두 해냈어!'),button('한 번 더 놀기',()=>{step=0;count=0;choice=null;status.textContent='';render();}));return;}
 board.append(el('p',(step+1)+' / 3 · '+(mode==='candles'?'촛불 '+goals[step]+'개를 꽂아 줘.':'보석의 순서를 보고 다음 모양을 골라 줘.')));
 if(mode==='candles'){
  const cake=el('div',null,'extra-cake'),candles=el('div',null,'extra-candles');for(let i=0;i<count;i++){const c=el('i');c.setAttribute('aria-hidden','true');candles.append(c);}cake.append(candles,el('strong','재이의 소원 케이크'));board.append(cake,el('p','지금 촛불 '+count+'개'));
  const controls=el('div',null,'extra-controls');const less=button('하나 빼기',()=>{count--;render();}),more=button('하나 꽂기',()=>{count++;render();});less.disabled=count===0;more.disabled=count===9;controls.append(less,more,button('이만큼 준비했어!',()=>{if(count!==goals[step]){status.textContent='촛불을 하나씩 세어 보자. '+goals[step]+'개가 필요해.';return;}step++;count=0;if(step===3)reward();else{status.textContent='딱 맞아! 다음 케이크도 준비해 볼까?';render();}}));board.append(controls);
 }else{
  const row=el('div',null,'extra-crown');row.setAttribute('aria-label','보석 순서: '+patterns[step].join(', ')+', 다음은?');for(const s of patterns[step]){const gem=el('span',shape[s]);gem.dataset.shape=s;gem.setAttribute('aria-hidden','true');row.append(gem);}row.append(el('span','?'));board.append(row);
  const answers=el('div',null,'extra-controls');for(const s of ['꽃','별','하트'])answers.append(button(shape[s]+' '+s,()=>{choice=s;if(s!==patterns[step][0]){status.textContent='처음부터 같은 순서로 읽어 보자. 틀려도 다시 고르면 돼.';return;}step++;if(step===3)reward();else{status.textContent='맞아! 반복되는 모양을 찾았네.';render();}}));board.append(answers);
 }
}
document.addEventListener('party-reset',()=>{step=0;count=0;choice=null;mode='candles';badges={candles:false,crown:false};status.textContent='';render();});
document.addEventListener('party-stage',e=>{host.hidden=!e.detail.ready;});render();
})();
