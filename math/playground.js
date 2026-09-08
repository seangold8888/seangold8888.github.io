/* Playground presentation: choices and locally authored equipment icons. */
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
  const api={SPOTS,byId,icon};
  if(typeof module!=="undefined" && module.exports) module.exports=api;else root.MathPlayground=api;
})(typeof window!=="undefined"?window:globalThis);
