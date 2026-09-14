'use strict';
// Jointly painted clothing/body sprites. All tinting is runtime SVG material
// rendering; the original generated PNG/WebP pixels are retained unchanged.
globalThis.PrincessWardrobe=(()=>{
  const ids='ballgown aline party mermaidline hanbok tutu tail winter star rainbow summer rose adventure'.split(' ');
  const short=new Set(['party','tutu','winter','summer','adventure']);
  const skin={snow:'#d7aa90',cinder:'#d8ad91',rapunzel:'#dab18f',mermaid:'#b98763',thumb:'#cc9b78',kongjwi:'#d7ae8c',briar:'#d5ab91',moon:'#795132',frost:'#dcb49e',sahara:'#ae7b54',lotus:'#cca17d',sunny:'#9e6b44'};
  const fits=Object.fromEntries(ids.map(id=>[id,{neckY:40,feet:1480,hand:[751,700]}]));
  Object.assign(fits,{tail:{neckY:25,feet:1480,hand:[792,560]},ballgown:{neckY:50,feet:1490,hand:[744,612]},aline:{neckY:25,feet:1505,hand:[750,687]},party:{neckY:40,feet:1480,hand:[773,700]}});
  const has=id=>ids.includes(id);
  const path=id=>id==='tail'?'assets/salon-v44/mermaid-tail-body.webp':'assets/wardrobe-v45/'+id+'.webp';
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  function geometry(id,p,identities,anchors){
    const a=anchors[p.id],cx=(a[1]+a[2])/2+identities[p.id].dx,scale=1/3;
    return {x:cx-512*scale,y:101-fits[id].neckY*scale,scale,cx};
  }
  function skinTone(id,color){
    const rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)/255);
    return `<filter id="${id}" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="0"/><feComponentTransfer>${['R','G','B'].map((c,i)=>`<feFunc${c} type="table" tableValues="0 ${(rgb[i]*.46).toFixed(4)} ${(rgb[i]*.88).toFixed(4)} ${Math.min(1,rgb[i]+.18).toFixed(4)}"/>`).join('')}</feComponentTransfer></filter>`;
  }
  function render(st,p,scope,src,identities,anchors,tone,shoeCut){
    const id=st.dress.id,g=geometry(id,p,identities,anchors),s=scope+'-worn',asset=s+'-source';
    // Detect warm skin in ORIGINAL cool-colored fabric art before material tinting.
    // The two channel tests exclude blue cloth and silver embroidery.
    const matrix=values=>`<feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  ${values}"/>`;
    const skinFilter=`<filter id="${s}-skin-only" color-interpolation-filters="sRGB">${matrix('80 -80 0 0 -3.6').replace('/>',' result="rg"/>')}${matrix('0 80 -80 0 -1.6').replace('/>',' result="gb"/>')}<feComposite in="rg" in2="gb" operator="in"/><feComponentTransfer><feFuncA type="linear" slope="2" intercept="0"/></feComponentTransfer></filter>`;
    const regions={
      rainbow:'<path fill="white" d="M450 0H580L610 100L555 160H475L420 100Z M0 0H390V300L360 850H0Z M634 0H1024V850H664L634 300Z"/><rect y="1400" width="1024" height="136" fill="white"/>',
      hanbok:'<path fill="white" d="M460 0H565L550 60L510 100L474 60Z"/><rect x="210" y="580" width="145" height="210" fill="white"/><rect x="680" y="580" width="145" height="210" fill="white"/><rect y="1430" width="1024" height="106" fill="white"/>'
    };
    const region=regions[id]||'<rect width="1024" height="1536" fill="white"/>';
    const skinMask=`<mask id="${s}-skin" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1536"><use href="#${asset}" filter="url(#${s}-skin-only)"/></mask>`;
    const skinClip=`<mask id="${s}-region" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1536">${region}</mask>`;
    const recolor=id!=='rainbow'&&st.dress.color;
    // Hide only skin under the shoe, never chop a hole out of a long skirt.
    const footCut=id!=='tail'&&shoeCut!=null?`<g mask="url(#${s}-skin)"><rect x="0" y="${(shoeCut-g.y)/g.scale}" width="1024" height="1536" fill="black"/></g>`:'';
    return `<g data-studio-part="wardrobe/${id}" data-wear-layer="painted-outfit" data-skin-tone="${p.id}">
      <defs><image id="${asset}" href="${esc(src)}" width="1024" height="1536" preserveAspectRatio="xMidYMid meet"/>${skinFilter}${skinMask}${skinClip}${skinTone(s+'-tone',skin[p.id])}${tone(s+'-cloth',st.dress.color,'dress')}<mask id="${s}-feet" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1536"><rect width="1024" height="1536" fill="white"/>${footCut}</mask></defs>
      <g transform="translate(${g.x} ${g.y}) scale(${g.scale})" mask="url(#${s}-feet)">
      <use href="#${asset}" ${recolor?`filter="url(#${s}-cloth)"`:''}/>
      <g mask="url(#${s}-region)"><g mask="url(#${s}-skin)"><use href="#${asset}" filter="url(#${s}-tone)"/></g></g>
      </g></g>`;
  }
  function hand(id,p,identities,anchors){const g=geometry(id,p,identities,anchors);return fits[id].hand.map((v,i)=>v*g.scale+(i?g.y:g.x));}
  return {ids,has,path,skin,fits,short,geometry,render,hand};
})();
