/* Playground equipment, curriculum-aware focus, and locally authored icons. */
(function(root) {
  "use strict";
  const SPOTS=[
    {id:"bars",name:"구름사다리",mission:"구름사다리로 출발!",move:"한 칸 더 건넜어요!",description:"재이가 가장 좋아하는 구름사다리"},
    {id:"slide",name:"미끄럼틀",mission:"미끄럼틀 꼭대기로!",move:"계단을 한 칸 올랐어요!",description:"한 칸씩 올라가는 미끄럼틀"},
    {id:"swing",name:"그네",mission:"그네 타러 가요!",move:"그네가 한 번 더 움직여요!",description:"친구와 함께 타는 그네"},
    {id:"seesaw",name:"시소",mission:"시소에서 만나요!",move:"시소가 오르락내리락!",description:"둘이 함께 타는 시소"},
    {id:"blocks",name:"블록놀이",mission:"블록을 쌓아 볼까?",move:"블록을 하나 더 쌓았어요!",description:"숫자로 만드는 블록 놀이터"},
    {id:"steps",name:"징검다리",mission:"징검다리를 건너요!",move:"한 발짝 더 건넜어요!",description:"차근차근 건너는 징검다리"}
  ];
  const C=root.Curriculum || (typeof require!=="undefined" ? require("./curriculum.js") : null);
  const FOCUS={
    bars:["split","missing","make10","carry","carry2"],
    slide:["split","sub","from10","teenSub","borrow","borrow2"],
    swing:["join","add","teenAdd","carry","carry2"],
    seesaw:["split","split10","bigger","smaller","biggest2","smallest2"],
    blocks:["join","split10","tensCount","tensOnes","readKor","readSino","hundred","boxes","leftover","twoOne","tensTens","twoTwo","carry","carry2"]
  };
  const TITLES={
    split:"빈자리 찾기",missing:"빈칸 채우기",make10:"10 만들기",carry:"10을 만들어 더하기",carry2:"받아올려 더하기",
    sub:"빼기",from10:"10에서 빼기",teenSub:"십몇에서 빼기",borrow:"10을 나누어 빼기",borrow2:"받아내려 빼기",
    join:"수 모으기",add:"더하기",teenAdd:"10에 더하기",split10:"10 가르기",
    bigger:"수의 크기 비교",tensCount:"묶음과 수 읽기",twoOne:"십과 일로 계산",tensTens:"두 자리 수 계산"
  };
  function focus(id,level) {
    const spot=byId(id),current=C.levelById(level);
    if(spot.id==="steps") return current.id===5
      ? {level:5,types:["nextNum","prevNum","tenMore","seq","evenPick","oddPick"],title:"수 순서와 짝수·홀수",review:false}
      : {level:current.id,types:current.types.slice(),title:"이번 단계 골고루",review:false};
    for(let n=current.id;n>=1;n--) {
      const types=C.levelById(n).types.filter(t=>FOCUS[spot.id].includes(t));
      if(types.length) {
        let title=TITLES[types[0]] || "수 놀이";
        if(spot.id==="seesaw" && types[0]==="split") title="수 가르기";
        if(spot.id==="slide" && types[0]==="split") title="가르며 덜어 내기";
        return {level:n,types,title,review:n<current.id};
      }
    }
  }
  const PATHS={
    bars:'<path d="M12 51V15h40v36M12 15l9-8h38v36M21 7v37M52 15l7-8M21 15l8-8m2 8 8-8m2 8 8-8"/>',
    slide:'<path d="M11 53V25h17v28M11 25l8-11 10 11M12 36h15m-15 8h15M28 26c9 0 8 24 24 24h6"/><path d="M30 22c12 0 10 23 25 23"/>',
    swing:'<path d="M7 53 18 12h29l11 41M18 12l11 41M22 13v26m19-26v26M19 40h25v6H19z"/>',
    seesaw:'<path d="M9 32l47-14M27 48l7-20 7 20zM9 33v-9m47-5v-9M5 23h8m39-14h8"/>',
    blocks:'<rect x="7" y="34" width="23" height="22" rx="3"/><rect x="32" y="34" width="23" height="22" rx="3"/><path d="M22 30V13h22v17zM25 13l8-8 8 8"/>',
    steps:'<ellipse cx="13" cy="47" rx="9" ry="6"/><ellipse cx="34" cy="34" rx="10" ry="7"/><ellipse cx="50" cy="16" rx="9" ry="6"/>'
  };
  function byId(id) { return SPOTS.find(function(s) { return s.id===id; }) || SPOTS[0]; }
  function icon(id) {
    const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");
    svg.setAttribute("viewBox","0 0 64 64");svg.setAttribute("aria-hidden","true");svg.setAttribute("fill","none");svg.setAttribute("stroke","currentColor");svg.setAttribute("stroke-width","4");svg.setAttribute("stroke-linecap","round");svg.setAttribute("stroke-linejoin","round");
    svg.innerHTML=PATHS[byId(id).id];return svg;
  }
  function renderLadder(box,total,completed,label) {
    box.textContent="";
    box.setAttribute("role","progressbar");box.setAttribute("aria-label",label);
    box.setAttribute("aria-valuemin","0");box.setAttribute("aria-valuemax",String(total));box.setAttribute("aria-valuenow",String(completed));
    box.setAttribute("aria-valuetext",total+"문제 중 "+completed+"문제 해결");
    for(let i=0;i<total;i++) { const el=document.createElement("span");el.className="rung"+(i<completed?" done":i===completed?" current":"");el.setAttribute("aria-hidden","true");box.appendChild(el); }
    const puppy=document.createElement("img");puppy.src="assets/jaei-progress-friends.webp";puppy.alt="";puppy.className="progress-friend";puppy.width=64;puppy.height=64;
    const position=total>1?Math.min(completed,total-1)/(total-1)*100:0;
    puppy.style.left="clamp(28px,"+position+"%,calc(100% - 28px))";box.appendChild(puppy);
  }
  const api={SPOTS,byId,focus,icon,renderLadder};
  if(typeof module!=="undefined" && module.exports) module.exports=api;else root.MathPlayground=api;
})(typeof window!=="undefined"?window:globalThis);
