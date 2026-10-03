// No wall-clock needs, streaks, hunger or absence penalties. A weekly friend.
export const FEELS=[
 {spring:1,damping:1,pitch:1,label:'탱탱한 소다'},
 {spring:.74,damping:1.12,pitch:1.15,label:'부드러운 딸기'},
 {spring:.88,damping:1.7,pitch:.82,label:'쫀득한 멜론'},
 {spring:1.18,damping:.95,pitch:1.28,label:'통통 튀는 레몬'},
 {spring:.82,damping:1.4,pitch:.9,label:'포근한 포도'},
 {spring:1,damping:1.2,pitch:1.08,label:'반짝이는 오로라'}
];
export const ORNAMENTS=[{id:'none',name:'그대로',need:0},{id:'flower',name:'꽃',need:0},{id:'cat',name:'고양이 귀',need:0},{id:'crown',name:'왕관',need:0},{id:'ribbon',name:'리본',need:5},{id:'hat',name:'별 모자',need:15}];
export const ACCESSORY_COLORS=[{name:'원래 색',color:null},{name:'분홍',color:'#f582b1'},{name:'하늘',color:'#79c9ed'},{name:'민트',color:'#83dbb9'},{name:'보라',color:'#b598ef'},{name:'금빛',color:'#f6ca69'}];
const KEY='slime:friend:v1';
export function createFriend(storage){
 let saved={};try{saved=JSON.parse(storage?.getItem(KEY)||'{}')||{};}catch{}
 const data={name:typeof saved.name==='string'?saved.name.trim().slice(0,12)||'말랑이':'말랑이',flavor:Number.isInteger(saved.flavor)?Math.max(0,Math.min(5,saved.flavor)):0,
  affection:Number.isSafeInteger(saved.affection)?Math.max(0,Math.min(100000,saved.affection)):0,ornament:ORNAMENTS.some(x=>x.id===saved.ornament)?saved.ornament:'none',accessoryColor:Number.isInteger(saved.accessoryColor)&&saved.accessoryColor>=0&&saved.accessoryColor<ACCESSORY_COLORS.length?saved.accessoryColor:0};
 if(!ORNAMENTS.some(x=>x.id===data.ornament&&x.need<=data.affection))data.ornament='none';
 const save=()=>{try{storage?.setItem(KEY,JSON.stringify(data));}catch{}};
 let last=-Infinity;
 return{data,reward(now){if(!Number.isFinite(now)||now-last<.65)return[];last=now;const before=data.affection;data.affection=Math.min(100000,before+1);save();return ORNAMENTS.filter(x=>x.need>before&&x.need<=data.affection);},
  rename(value){data.name=String(value).trim().slice(0,12)||'말랑이';save();},flavor(i){if(Number.isInteger(i)&&i>=0&&i<6){data.flavor=i;save();}},
  dress(id){if(!ORNAMENTS.some(x=>x.id===id&&x.need<=data.affection))return false;data.ornament=id;save();return true;},
  tint(i){if(!Number.isInteger(i)||i<0||i>=ACCESSORY_COLORS.length)return false;data.accessoryColor=i;save();return true;},save};
}
