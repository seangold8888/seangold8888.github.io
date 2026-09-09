/* Math Playground: small, testable learning rules, separate from the view. */
(function(root) {
  'use strict';
  const C = root.Curriculum || (typeof require !== 'undefined' ? require('./curriculum.js') : null);
  const LABELS = {split:'수 가르기',join:'수 모으기',add:'덧셈',sub:'뺄셈',missing:'빈칸 찾기',split10:'10 가르기',make10:'10 만들기',from10:'10에서 빼기',tensCount:'10개씩 묶음',tensOnes:'십과 일',readKor:'한글 수 읽기',readSino:'숫자 읽기',nextNum:'다음 수',prevNum:'앞의 수',tenMore:'10만큼 뛰기',seq:'수의 순서',bigger:'큰 수',smaller:'작은 수',hundred:'100 이해하기',boxes:'묶음 세기',leftover:'남는 낱개',biggest2:'가장 큰 수 만들기',smallest2:'가장 작은 수 만들기',evenPick:'짝수',oddPick:'홀수',teenAdd:'10과 몇',teenSub:'십몇에서 빼기',three:'세 수 계산',twoOne:'두 자리와 한 자리',tensTens:'몇십끼리 계산',twoTwo:'두 자리끼리 계산',carry:'10을 만들어 더하기',borrow:'10을 나누어 빼기',carry2:'두 자리 받아올림',borrow2:'두 자리 받아내림'};
  const skillKey = p => p.level + ':' + p.type;
  function evidence(events) {
    const last = (events || []).slice(-6), good = last.filter(e => e.ok);
    const days = new Set(good.map(e => e.date)).size, variants = new Set(good.map(e => e.key)).size;
    return { count:last.length, correct:good.length, days, variants, mastered:last.length >= 4 && good.length / last.length >= .8 && days >= 2 && variants >= 3 };
  }
  function record(state, p, ok, date) {
    state.skills = state.skills || {};
    const key = skillKey(p), list = state.skills[key] || [];
    // Repeating one fact on one day cannot manufacture mastery.
    const same = list.find(e => e.date === date && e.key === p.key);
    if (same) same.ok = same.ok && ok;
    else list.push({date, key:p.key, ok:!!ok});
    state.skills[key] = list.slice(-12);
  }
  function summary(state, level) {
    return C.levelById(level).types.map(type => Object.assign({type, label:LABELS[type] || type}, evidence((state.skills || {})[level + ':' + type])));
  }
  function ready(state, level) { return summary(state, level).every(s => s.mastered); }
  function variant(p, rng, seen) {
    rng = rng || Math.random; let next;
    for (let i=0;i<80;i++) { next = C.makeProblem(p.level,rng,p.type); if (next.key !== p.key && !(seen || []).includes(next.key)) return next; }
    return null;
  }
  // Focus takes roughly two thirds; remaining slots keep other concepts and due reviews alive.
  function buildFocusedSession(opts) {
    const rng=opts.rng || Math.random,n=opts.count || 8,level=opts.level || 1,focus=opts.focus;
    const out=[],used=new Set(),target=Math.ceil(n*2/3);
    const allowed=C.levelById(focus.level).types.filter(t=>focus.types.includes(t));
    if(!allowed.length || focus.level>level || focus.level<1) return buildSession(Object.assign({},opts,{focus:null}));
    const weak=(at,types)=>summary(opts.state || {},at).filter(s=>types.includes(s.type))
      .sort((a,b)=>Number(a.mastered)-Number(b.mastered)||a.count-b.count);
    function add(p,focused) {
      if(!p || used.has(p.key)) return false;
      used.add(p.key);out.push(Object.assign({},p,{focused:!!focused}));return true;
    }
    const focusSkills=weak(focus.level,allowed);
    let guard=0;
    while(out.length<target && guard<400) add(C.makeProblem(focus.level,rng,focusSkills[guard++%focusSkills.length].type),true);
    const due=(opts.review || []).filter(r=>r.problem && r.problem.level<=level).slice(0,n===3?1:Math.floor(n*.2));
    for(const r of due) {
      if(out.length>=n) break;
      const p=variant(r.problem,rng,Array.from(used)) || r.problem;
      add(Object.assign({},p,{review:true,reviewKey:r.key}),false);
    }
    const all=C.levelById(level).types;
    const other=focus.level===level ? all.filter(t=>!allowed.includes(t)) : all;
    const mixed=weak(level,other.length?other:all);
    guard=0;
    while(out.length<n && guard<400) add(C.makeProblem(level,rng,mixed[guard++%mixed.length].type),false);
    // Small concepts such as 10-making contain only nine unique facts.
    // Fill from the current curriculum instead of repeating a fact or introducing a future level.
    const remaining=weak(level,all);guard=0;
    while(out.length<n && guard<400) add(C.makeProblem(level,rng,remaining[guard++%remaining.length].type),false);
    return out;
  }
  function buildSession(opts) {
    if(opts.focus) return buildFocusedSession(opts);
    const rng = opts.rng || Math.random, n = opts.count || 8, level = opts.level || 1;
    const out = [], used = new Set();
    function add(p) { if (p && !used.has(p.key)) { used.add(p.key); out.push(p); return true; } return false; }
    add(C.makeProblem(Math.max(1,level-1),rng));
    const due = (opts.review || []).slice(0,n===3 ? 1 : Math.floor(n*.3));
    due.forEach(r => { const p = variant(r.problem,rng,Array.from(used)) || r.problem; add(Object.assign({},p,{review:true,reviewKey:r.key})); });
    const skills = summary(opts.state || {},level).sort((a,b) => Number(a.mastered)-Number(b.mastered) || a.count-b.count);
    let guard=0;
    while(out.length<n && guard<500) { const type=skills[guard++ % skills.length].type; add(C.makeProblem(level,rng,type)); }
    return out;
  }
  function hint(p) {
    const v=p.visual || {};
    switch(p.type) {
      case 'carry': return v.a+'을 먼저 10으로 만들어 봐요. '+v.b+'에서 몇 개를 옮기면 될까요?';
      case 'borrow': return '십몇을 10과 낱개로 나눠 봐요. 10에서 먼저 빼면 어떨까요?';
      case 'carry2': return '일의 자리끼리 더해 봐요. 10개가 모이면 십 막대 하나로 바꿔요.';
      case 'borrow2': return '낱개가 모자라면 십 막대 하나를 낱개 10개로 바꿔 봐요.';
      case 'readKor': case 'readSino': return '앞부분은 몇십인지, 뒷부분은 몇인지 나눠 읽어 봐요.';
      case 'evenPick': case 'oddPick': return '두 개씩 짝을 지어 봐요. 남는 것이 있나요?';
      case 'bigger': case 'smaller': case 'biggest2': case 'smallest2': return '십의 자리를 먼저 비교해요. 같으면 일의 자리를 봐요.';
      case 'make10': case 'split10': return '10칸 중 채워진 칸을 보고, 빈칸에 하나씩 놓아 봐요.';
      case 'sub': case 'from10': case 'teenSub': return '처음 있던 것에서 덜어 낼 만큼 가려 봐요. 무엇이 남았나요?';
      case 'split': case 'missing': return '전체에서 이미 있는 것을 찾아요. 더 필요한 만큼 하나씩 세어 봐요.';
      case 'nextNum': case 'prevNum': case 'seq': return '수직선에서 한 칸씩 움직이며 수의 순서를 생각해 봐요.';
      default: return '그림을 볼까요? 10개씩 묶음과 낱개를 나누어 생각해 봐요.';
    }
  }
  const api = {LABELS,skillKey,evidence,record,summary,ready,variant,buildSession,hint};
  if(typeof module !== 'undefined' && module.exports) module.exports=api; else root.MathLearning=api;
})(typeof window !== 'undefined' ? window : globalThis);
