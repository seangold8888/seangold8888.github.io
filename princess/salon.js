'use strict';
// Chroma-key compositing, not a background-removal service. Original art stays intact.
globalThis.PrincessSalon=(()=>{
 const princesses='snow cinder rapunzel thumb kongjwi briar moon frost sahara lotus sunny'.split(' ');
 const ids=new Set(princesses.flatMap(id=>['half','braid'].map(style=>id+'-'+style)));
 const has=id=>ids.has(id);
 const path=id=>'assets/salon-v47/'+id+'.webp';
 function filter(id){
  const alpha=(row,result)=>`<feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  ${row}" result="${result}"/>`;
  return `<filter id="${id}" color-interpolation-filters="sRGB" x="0" y="0" width="100%" height="100%">
   ${alpha('-5 5 0 0 0','spillR')}${alpha('0 5 -5 0 0','spillB')}
   <feComposite in="spillR" in2="spillB" operator="in" result="spill"/>
   <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  .5 0 .5 0 0  0 0 1 0 0  0 0 0 1 0" result="neutral"/>
   <feComposite in="neutral" in2="spill" operator="in" result="correction"/>
   <feComposite in="correction" in2="SourceGraphic" operator="over" result="color"/>
   ${alpha('5 -5 0 0 1','matteR')}${alpha('0 -5 5 0 1','matteB')}
   <feComposite in="matteR" in2="matteB" operator="over" result="matte"/>
   <feComposite in="color" in2="matte" operator="in"/></filter>`;
 }
 return {ids,has,path,filter};
})();
