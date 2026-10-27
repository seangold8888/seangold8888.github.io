// Slime workshop rules: paint mixing, secret recipes, collection and room roster.
// Pure data, no DOM or WebGL, so Node tests can check every rule directly.
export const PAINTS=[
 {id:'r',name:'빨강',css:'#ff5d73'},
 {id:'y',name:'노랑',css:'#ffd23f'},
 {id:'b',name:'파랑',css:'#3f9dff'},
 {id:'w',name:'하양',css:'#ffffff'},
 {id:'a',name:'오로라',css:'conic-gradient(#aee6ff,#c7b3fc,#ffa6d2,#ffe796,#9de2c6,#aee6ff)'}
];
export const MIXINS=[
 {id:'glitter',name:'반짝이',icon:'✦'},
 {id:'beads',name:'구슬',icon:'●'},
 {id:'foam',name:'거품',icon:'○'},
 {id:'stars',name:'별조각',icon:'★'}
];
export const MAX_DROPS=4,ROOM_MAX=4,ROOM_MAX_LOW=3,FEED_FULL=6,BABY_FED=2,CLASSIC_FED=4,DEX_MAX=60;
// Six snacks from the smallest twin to a full slime; the original friend starts at today's size.
export const sizeFor=fed=>.72+.07*Math.max(0,Math.min(FEED_FULL,Number(fed)||0));
const CLASSIC=['#a2eaff','#ffa3c2','#b6ec86','#ffe27e','#c6adff'];
export const SECRETS=[
 {id:'rainbow',name:'무지개',hint:'빨강·노랑·파랑에 오로라 한 방울',test:d=>d.r>0&&d.y>0&&d.b>0&&d.a>0,
  look:{color:'#f4effc',deep:'#aaa3cc',glow:'#efe6ff',rainbow:true,glitterColor:'#ffffff'}},
 {id:'galaxy',name:'은하수',hint:'보랏빛에 반짝이와 별조각',test:(d,m)=>d.r>0&&d.b>0&&!d.y&&m.glitter&&m.stars,
  look:{color:'#8174e6',deep:'#2b2388',glow:'#a99cff',glitterColor:'#fff3c4',starColor:'#ffe27a'}},
 {id:'sea',name:'바닷물',hint:'파랑과 하양에 거품 보글보글',test:(d,m)=>d.b>0&&d.w>0&&!d.r&&!d.y&&m.foam,
  look:{color:'#8fe6f2',deep:'#1c9bcb',glow:'#c4f7ff'}},
 {id:'milk',name:'딸기우유',hint:'빨강 하나, 하양 둘, 거품',test:(d,m)=>d.r===1&&d.w>=2&&!d.y&&!d.b&&m.foam,
  look:{color:'#ffc7da',deep:'#ec78a0',glow:'#ffe3ec'}},
 {id:'forest',name:'숲속',hint:'초록빛에 열매 구슬',test:(d,m)=>d.y>0&&d.b>0&&!d.r&&m.beads,
  look:{color:'#9fe08a',deep:'#2e8e45',glow:'#d6ffc4',beadColors:['#e8435a','#ff9f43','#8e5bd8','#e8435a']}},
 {id:'gold',name:'황금',hint:'노랑 두 방울에 반짝이',test:(d,m)=>d.y>=2&&!d.r&&!d.b&&!d.w&&m.glitter,
  look:{color:'#ffd66b',deep:'#d48a0c',glow:'#fff0b3',glitterColor:'#fff0a0',starColor:'#fff0a0'}}
];
const int=(v,max)=>Number.isInteger(v)&&v>0?Math.min(max,v):0;
export function cleanDrops(d={}){const out={};let left=MAX_DROPS;for(const p of PAINTS){out[p.id]=Math.min(left,int(d?.[p.id],MAX_DROPS));left-=out[p.id];}return out;}
export function cleanMix(m={}){const out={};for(const x of MIXINS)out[x.id]=!!m?.[x.id];return out;}
export const dropCount=d=>PAINTS.reduce((n,p)=>n+(d[p.id]||0),0);
export function recipeKey(drops,mix){const d=cleanDrops(drops),m=cleanMix(mix);return PAINTS.map(p=>p.id+d[p.id]).join('')+'-'+MIXINS.map(x=>m[x.id]?1:0).join('');}
// Red-yellow-blue paint cube: yellow + blue is green, as children expect from paint.
const CUBE=[[1,1,1],[1,0,0],[1,.86,.1],[1,.5,0],[.16,.45,.92],[.5,0,.5],[0,.66,.2],[.2,.094,0]];
export function rybToRgb(r,y,b){
 const out=[0,0,0];
 for(let i=0;i<8;i++){const w=(i&1?r:1-r)*(i&2?y:1-y)*(i&4?b:1-b);for(let k=0;k<3;k++)out[k]+=CUBE[i][k]*w;}
 return out;
}
const hex=c=>'#'+c.map(v=>Math.round(Math.max(0,Math.min(1,v))*255).toString(16).padStart(2,'0')).join('');
const mixWhite=(c,t)=>c.map(v=>v+(1-v)*t);
const toRgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255);
export function paintRgb(drops){
 const d=cleanDrops(drops),colors=d.r+d.y+d.b;if(!colors)return[1,1,1];
 const top=Math.max(d.r,d.y,d.b),strength=colors/(colors+d.w);
 return rybToRgb(d.r/top*strength,d.y/top*strength,d.b/top*strength);
}
function hueName(rgb,d){
 const colors=d.r+d.y+d.b;if(!colors)return d.a?'오로라':'우유';
 if(d.r&&d.y&&d.b)return'초코';
 const [r,g,b]=rgb,max=Math.max(r,g,b),min=Math.min(r,g,b);if(max-min<.08)return'우유';
 let h=max===r?((g-b)/(max-min))%6:max===g?(b-r)/(max-min)+2:(r-g)/(max-min)+4;h=(h*60+360)%360;
 if(d.w&&d.r&&!d.y&&!d.b)return'복숭아';
 return h<15||h>=345?'딸기':h<48?'귤':h<72?'레몬':h<165?'멜론':h<255?'소다':h<318?'포도':'자두';
}
// One recipe -> everything needed to draw it: gel colors, feel, mix-ins and a suggested name.
export function cook(drops,mix){
 const d=cleanDrops(drops),m=cleanMix(mix),secret=SECRETS.find(s=>s.test(d,m))||null,rgb=paintRgb(d);
 const plain=!(d.r+d.y+d.b);
 let look={color:hex(plain?[.93,.945,.965]:mixWhite(rgb,.36)),deep:hex(plain?[.66,.68,.73]:rgb.map(v=>v*.84)),glow:hex(plain?[.9,.92,.96]:mixWhite(rgb,.6)),
  rainbow:d.a>0,glitterColor:'#fff6d8',starColor:'#ffd95e',beadColors:null};
 if(secret)look={...look,...secret.look};
 let base=5;
 if(!look.rainbow){const c=toRgb(look.color);let best=Infinity;CLASSIC.forEach((h,i)=>{const k=toRgb(h),dist=k.reduce((s,v,j)=>s+(v-c[j])**2,0);if(dist<best){best=dist;base=i;}});}
 const prefix=m.glitter?'반짝':m.stars?'별빛':m.foam?'보글':m.beads?'콩콩':'말랑';
 return{...look,key:recipeKey(d,m),drops:d,mix:m,secret:secret?.id||null,base,suggest:secret?secret.name+' 슬라임':prefix+' '+hueName(rgb,d)};
}
export const cleanName=(v,fallback)=>String(v??'').replace(/\s+/g,' ').trim().slice(0,8)||fallback;
function read(storage,key){try{const v=JSON.parse(storage?.getItem(key)||'null');return v&&typeof v==='object'?v:null;}catch{return null;}}
function write(storage,key,value){try{storage?.setItem(key,JSON.stringify(value));return true;}catch{return false;}}
export function createDex(storage){
 const KEY='slime:dex:v1',saved=read(storage,KEY)||{},entries=[],seen=new Set();
 for(const e of Array.isArray(saved.entries)?saved.entries:[]){
  if(!e||typeof e!=='object'||!dropCount(cleanDrops(e.drops)))continue;const look=cook(e.drops,e.mix);if(seen.has(look.key))continue;seen.add(look.key);
  entries.push({key:look.key,drops:look.drops,mix:look.mix,secret:look.secret,name:cleanName(e.name,look.suggest)});if(entries.length>=DEX_MAX)break;}
 const secrets=new Set(entries.map(e=>e.secret).filter(Boolean));
 const save=()=>write(storage,KEY,{entries});
 return{entries,secrets,save,has:key=>seen.has(key),
  add(look,name){if(seen.has(look.key))return{isNew:false,secretNew:false};const secretNew=!!look.secret&&!secrets.has(look.secret);
   seen.add(look.key);entries.push({key:look.key,drops:look.drops,mix:look.mix,secret:look.secret,name:cleanName(name,look.suggest)});
   while(entries.length>DEX_MAX){const old=entries.findIndex(e=>!e.secret||entries.filter(x=>x.secret===e.secret).length>1);seen.delete(entries[old<0?0:old].key);entries.splice(old<0?0:old,1);}
   if(look.secret)secrets.add(look.secret);save();return{isNew:true,secretNew};}};
}
// Slot 0 is the full-detail friend the child is touching; later slots are its lighter room-mates.
export function createRoom(storage,{flavor=0,name='말랑이'}={}){
 const KEY='slime:room:v1',saved=read(storage,KEY),slimes=[];
 const fed=v=>Number.isFinite(v)?Math.max(0,Math.min(FEED_FULL,Math.round(v))):BABY_FED;
 for(const e of Array.isArray(saved?.slimes)?saved.slimes:[]){
  if(!e||typeof e!=='object')continue;
  if(e.kind==='classic'&&Number.isInteger(e.flavor)&&e.flavor>=0&&e.flavor<6)slimes.push({kind:'classic',flavor:e.flavor,name:cleanName(e.name,name),fed:fed(e.fed)});
  else if(e.kind==='recipe'&&dropCount(cleanDrops(e.drops))){const look=cook(e.drops,e.mix);slimes.push({kind:'recipe',drops:look.drops,mix:look.mix,name:cleanName(e.name,look.suggest),fed:fed(e.fed)});}
  if(slimes.length>=ROOM_MAX)break;
 }
 if(!slimes.length)slimes.push({kind:'classic',flavor,name,fed:CLASSIC_FED});
 const save=()=>write(storage,KEY,{slimes});
 return{slimes,save,get active(){return slimes[0];}};
}
// "말랑이" -> "말랑이 2", "말랑이 2" -> next free number in the room.
export function twinName(name,taken){const base=String(name).replace(/\s\d+$/,'').replace(/\s*슬라임$/,'').slice(0,5).trim()||'말랑이';for(let i=2;i<99;i++){const n=base+' '+i;if(!taken.includes(n))return n;}return base;}
