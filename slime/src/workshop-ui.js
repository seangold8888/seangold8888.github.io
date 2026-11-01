import {PAINTS,MIXINS,MAX_DROPS,SECRETS,ROOM_MAX,cook,dropCount} from './workshop.js?v=workshop-17';
// DOM for the 슬라임 공방 dialog: paint bowl, mix-ins, naming and the 도감 grid.
const $=id=>document.getElementById(id);
function hash(s){let h=2166136261;for(const c of String(s))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
// A CSS jelly for tiles and the bowl. Mix-ins are drawn as the same kinds of pieces.
export function blob(look,{locked=false}={}){
 const el=document.createElement('span');el.className='blob'+(locked?' locked':'')+(!locked&&look.rainbow?' rainbow':'')+(!locked&&look.mix?.glitter?' glitter':'');
 el.setAttribute('aria-hidden','true');
 if(!locked){el.style.setProperty('--c',look.color);el.style.setProperty('--deep',look.deep);}
 let h=hash(look?.key||'locked');const r=()=>((h=Math.imul(h^h>>>15,2246822507)>>>0)%1000)/1000;
 const piece=(cls,x,y,s,c,text='')=>{const i=document.createElement('i');i.className=cls;i.style.cssText='--x:'+x+'%;--y:'+y+'%;--s:'+s+'%'+(c?';--dc:'+c:'');i.textContent=text;el.append(i);};
 if(!locked){
  const beads=look.beadColors||['#ff6f91','#ffc94d','#5ec8ff','#7be0a8','#b28cff'];
  if(look.mix?.beads)for(let i=0;i<5;i++)piece('dot',14+r()*64,36+r()*44,13,beads[i%beads.length]);
  if(look.mix?.foam)for(let i=0;i<7;i++)piece('dot foam',10+r()*74,28+r()*54,6+r()*6,'#fff');
  if(look.mix?.stars)for(let i=0;i<3;i++)piece('star',12+r()*66,32+r()*44,22,look.starColor||'#ffd95e','★');
 }
 for(const side of ['l','r'])piece('eye '+side,0,0,0);
 if(locked)piece('q',0,0,0,'','?');
 return el;
}
export function workshopUI({dex,audio,onMake,onSummon,onRest,room}){
 const dialog=$('workshop'),drops={},mix={};
 const clear=()=>{for(const p of PAINTS)drops[p.id]=0;for(const m of MIXINS)mix[m.id]=false;};clear();
 PAINTS.forEach((p,i)=>{const b=document.createElement('button');b.type='button';b.className='paint';b.dataset.paint=p.id;b.setAttribute('aria-label',p.name+' 방울 넣기');
  b.innerHTML='<span class="paint-drop" style="--p:'+p.css+'"></span><span>'+p.name+'</span><b class="paint-n"></b>';
  b.addEventListener('click',()=>{if(dropCount(drops)>=MAX_DROPS){say('그릇이 가득! 비우기를 누르거나 만들기!');wobble();return;}drops[p.id]++;audio.play('drip',i);fall(p.css);paint();});$('paints').append(b);});
 MIXINS.forEach(m=>{const b=document.createElement('button');b.type='button';b.className='mixin';b.dataset.mixin=m.id;b.setAttribute('aria-pressed','false');
  b.innerHTML='<span class="mixin-icon mixin-'+m.id+'">'+m.icon+'</span><span>'+m.name+'</span>';
  b.addEventListener('click',()=>{mix[m.id]=!mix[m.id];audio.play('mixin');wobble();paint();});$('mixins').append(b);});
 let sayTimer=0;
 function say(text){$('shop-say').textContent=text;clearTimeout(sayTimer);}
 function wobble(){const b=$('bowl');b.classList.remove('wobble');void b.offsetWidth;b.classList.add('wobble');}
 function fall(css){const d=document.createElement('i');d.className='drop-fall';d.style.setProperty('--p',css);$('bowl').append(d);
  d.addEventListener('animationend',()=>{d.remove();wobble();},{once:true});setTimeout(()=>d.remove(),900);}
 function current(){return dropCount(drops)?cook(drops,mix):null;}
 function paint(){
  const look=current(),n=dropCount(drops),slot=$('bowl-slime');slot.textContent='';
  if(look)slot.append(blob(look));else slot.innerHTML='<span class="bowl-empty">빈 그릇</span>';
  $('drops').innerHTML=Array.from({length:MAX_DROPS},(_,i)=>{let k=i,css='';for(const p of PAINTS){if(k<drops[p.id]){css=p.css;break;}k-=drops[p.id];}return'<i class="drop-slot'+(css?' full':'')+'" style="--p:'+(css||'#fff')+'"></i>';}).join('');
  for(const b of $('paints').children){const c=drops[b.dataset.paint];b.querySelector('.paint-n').textContent=c?'×'+c:'';b.classList.toggle('used',c>0);}
  for(const b of $('mixins').children)b.setAttribute('aria-pressed',String(mix[b.dataset.mixin]));
  $('slime-name').placeholder=look?look.suggest:'이름을 지어 줘요';$('make-go').disabled=!look;
  if(!look)say('색 방울을 콕! 두 색을 섞으면 새 색이 돼요.');
  else if(dex.has(look.key))say('도감에 있는 슬라임이에요. 또 만들어도 좋아요!');
  else if(look.secret&&!dex.secrets.has(look.secret))say('어? 그릇이 반짝반짝… 뭔가 특별해요!');
  else say(n<2?'한 방울 더 넣으면 색이 섞여요.':'새로운 색이에요! 이름을 짓고 만들기!');
 }
 function tile(look,name,{locked=false,hint='',secret=false}={}){
  const b=document.createElement('button');b.type='button';b.className='dex-tile'+(locked?' locked':'')+(secret?' secret':'');
  b.append(blob(look,{locked}));const label=document.createElement('span');label.className='dex-name';label.textContent=locked?'???':name;b.append(label);
  if(hint){const h=document.createElement('small');h.textContent=hint;b.append(h);}
  if(locked){b.disabled=true;b.setAttribute('aria-label','잠긴 비밀 레시피. 힌트: '+hint);}else b.setAttribute('aria-label',name+' 데려오기');
  return b;
 }
 function paintDex(){
  const grid=$('secret-grid');grid.textContent='';
  for(const s of SECRETS){const found=dex.entries.find(e=>e.secret===s.id);
   const b=found?tile(cook(found.drops,found.mix),s.name,{hint:'비밀 레시피!',secret:true}):tile(null,'',{locked:true,hint:s.hint});
   if(found)b.addEventListener('click',()=>summon(found));grid.append(b);}
  $('secret-count').textContent=dex.secrets.size+' / '+SECRETS.length;
  const made=$('dex-grid');made.textContent='';
  for(const e of dex.entries){const b=tile(cook(e.drops,e.mix),e.name);b.dataset.key=e.key;b.addEventListener('click',()=>summon(e));made.append(b);}
  $('made-count').textContent=dex.entries.length+'마리';$('dex-count').textContent=dex.entries.length;$('dex-empty').hidden=dex.entries.length>0;
  const n=room.slimes.length;$('room-count').textContent='놀이방 친구 '+n+' / '+ROOM_MAX;$('room-rest').disabled=n<2;
 }
 function summon(e){dialog.close();onSummon(e);}
 function tab(name){for(const [t,s] of [['tab-make','shop-make'],['tab-dex','shop-dex']]){const on=t==='tab-'+name;$(t).setAttribute('aria-selected',String(on));$(s).hidden=!on;}if(name==='dex')paintDex();}
 $('tab-make').addEventListener('click',()=>tab('make'));$('tab-dex').addEventListener('click',()=>tab('dex'));
 $('bowl-clear').addEventListener('click',()=>{clear();audio.play('pet');wobble();paint();});
 $('shop-close').addEventListener('click',()=>dialog.close());
 $('room-rest').addEventListener('click',()=>{onRest();paintDex();});
 $('make-form').addEventListener('submit',e=>{e.preventDefault();const look=current();if(!look)return;const name=$('slime-name').value;
  $('slime-name').value='';clear();paint();dialog.close();onMake(look,name);});
 paint();
 return{open(name='make'){paintDex();tab(name);paint();if(!dialog.open)dialog.showModal();},close:()=>dialog.close(),paintDex,
  setDrops(d,m={}){clear();Object.assign(drops,d);for(const k of Object.keys(m))mix[k]=!!m[k];paint();},state:()=>({drops:{...drops},mix:{...mix},look:current()})};
}
