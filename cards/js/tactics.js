(function(root){'use strict';
  const KEY='card_tactics_v1';
  const badges=[
    {id:'variety',icon:'✦',name:'기술 탐험가',goal:'서로 다른 기술 2개 쓰기'},
    {id:'guard',icon:'◈',name:'방패 달인',goal:'방어로 실제 피해 막기'},
    {id:'combo',icon:'❖',name:'이야기 전략가',goal:'조각을 쓰고 같은 턴에 공격하기'},
    {id:'ultimate',icon:'★',name:'이야기 영웅',goal:'필살기 사용하기'}
  ];
  function fresh(){return {version:1,battles:0,wins:0,badges:[],heroes:[]};}
  function normalize(x){const p=fresh();if(!x||x.version!==1)return p;for(const k of ['battles','wins'])p[k]=Number.isSafeInteger(x[k])&&x[k]>=0?Math.min(x[k],1000000):0;p.wins=Math.min(p.wins,p.battles);p.badges=badges.map(b=>b.id).filter(id=>Array.isArray(x.badges)&&x.badges.includes(id));p.heroes=Array.isArray(x.heroes)?[...new Set(x.heroes.filter(id=>typeof id==='string'&&/^[a-z0-9_-]{1,64}$/.test(id)))].slice(0,200):[];return p;}
  function load(storage){try{return normalize(JSON.parse(storage.getItem(KEY)));}catch(_){return fresh();}}
  function save(storage,p){try{storage.setItem(KEY,JSON.stringify(p));return true;}catch(_){return false;}}
  function analyze(log){const techniques=new Set(),fragmentTurns=new Set();let blocked=0,best=0,combo=false,ultimate=false;
    for(const e of Array.isArray(log)?log:[]){if(!e||e.actor!=='player')continue;
      if(e.type==='fragment_used')fragmentTurns.add(e.turnNumber);
      if(e.type==='attack'){if(Number.isInteger(e.attackIndex))techniques.add(e.attackIndex);if(fragmentTurns.has(e.turnNumber))combo=true;}
      if(e.type==='guard_block')blocked+=Math.max(0,Number(e.amount)||0);
      if(e.type==='damage'&&e.target==='enemy')best=Math.max(best,Math.max(0,Number(e.amount)||0));
      if(e.type==='ultimate_used')ultimate=true;
    }
    const earned=badges.filter(b=>({variety:techniques.size>=2,guard:blocked>0,combo,ultimate})[b.id]).map(b=>b.id);
    return {earned,techniques:techniques.size,blocked,best};
  }
  function goal(profile,card,hasFragments){const available=badges.filter(b=>b.id==='guard'||(b.id==='variety'&&card.attacks?.length>=2)||(b.id==='combo'&&hasFragments));const unearned=available.filter(b=>!profile.badges.includes(b.id));const pool=unearned.length?unearned:available;return pool[profile.battles%pool.length]||badges[1];}
  function settle(profile,log,winner,hero){const p=normalize(profile),stats=analyze(log),newBadges=stats.earned.filter(id=>!p.badges.includes(id));p.battles++;if(winner==='player')p.wins++;p.badges=[...new Set([...p.badges,...stats.earned])];if(hero&&!p.heroes.includes(hero))p.heroes.push(hero);return {profile:normalize(p),stats,newBadges};}
  const api={KEY,badges,fresh,load,save,analyze,goal,settle};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CardTactics=api;
})(globalThis);
