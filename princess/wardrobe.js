'use strict';
// Jointly painted clothing/body sprites. All tinting is runtime SVG material
// rendering; the original generated PNG/WebP pixels are retained unchanged.
globalThis.PrincessWardrobe=(()=>{
  const ids='ballgown aline party mermaidline hanbok tutu tail winter star rainbow summer rose adventure'.split(' ');
  const short=new Set(['party','tutu','winter','summer','adventure']);
  // Measured neck colors from accepted heads, not a second independent palette.
  const skin={snow:'#ddb399',cinder:'#d99f7b',rapunzel:'#d7a177',mermaid:'#c78e66',thumb:'#e3ac88',kongjwi:'#deb498',briar:'#d9ac91',moon:'#905335',frost:'#bf9d8c',sahara:'#b87645',lotus:'#cf9f7a',sunny:'#ab6236'};
  const sourceSkin={ballgown:[212,167,137],aline:[208,161,130],party:[235,179,140],mermaidline:[213,168,140],hanbok:[214,176,146],tutu:[213,159,122],tail:[206,153,112],winter:[237,185,153],star:[198,148,114],rainbow:[228,180,141],summer:[221,171,133],rose:[216,173,140],adventure:[217,166,131]};
  const fits=Object.fromEntries(ids.map(id=>[id,{neckY:40,feet:1480,hand:[751,700]}]));
  Object.assign(fits,{tail:{neckY:25,feet:1480,hand:[792,560]},ballgown:{neckY:50,feet:1490,hand:[744,612]},aline:{neckY:25,feet:1505,hand:[750,687]},party:{neckY:40,feet:1480,hand:[773,700]}});
  Object.entries({ballgown:1489,aline:1507,party:1471,mermaidline:1508,hanbok:1512,tutu:1487,winter:1487,star:1484,rainbow:1517,summer:1491,rose:1507,adventure:1488}).forEach(([id,y])=>{fits[id].feet=y;});
  const has=id=>ids.includes(id);
  const path=id=>id==='tail'?'assets/salon-v44/mermaid-tail-body.webp':'assets/wardrobe-v45/'+id+'.webp';
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  function geometry(id,p,identities,anchors){
    const a=anchors[p.id],cx=(a[1]+a[2])/2+identities[p.id].dx,scale=1/3;
    // The painted neck must start underneath the chin, before the portrait fades.
    return {x:cx-512*scale,y:94-fits[id].neckY*scale,scale,cx};
  }
  function skinTone(id,color,garment){
    const rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));
    return `<filter id="${id}" color-interpolation-filters="sRGB"><feComponentTransfer>${['R','G','B'].map((c,i)=>`<feFunc${c} type="linear" slope="${(rgb[i]/sourceSkin[garment][i]).toFixed(5)}" intercept="0"/>`).join('')}</feComponentTransfer></filter>`;
  }
  function render(st,p,scope,src,identities,anchors,tone,shoeCut){
    const id=st.dress.id,g=geometry(id,p,identities,anchors),s=scope+'-worn',asset=s+'-source';
    // Detect warm skin in ORIGINAL cool-colored fabric art before material tinting.
    // The two channel tests exclude blue cloth and silver embroidery.
    const matrix=values=>`<feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  ${values}"/>`;
    const skinFilter=`<filter id="${s}-skin-only" color-interpolation-filters="sRGB">${matrix('80 -80 0 0 -3.6').replace('/>',' result="rg"/>')}${matrix('0 80 -80 0 -1.6').replace('/>',' result="gb"/>')}<feComposite in="rg" in2="gb" operator="in"/><feComponentTransfer><feFuncA type="linear" slope="2" intercept="0"/></feComponentTransfer></filter>`;
    const regions={
      rainbow:'<path fill="white" d="M450 0H580L610 100L555 160H475L420 100Z M0 0H390V300L360 850H0Z M634 0H1024V850H664L634 300Z M439 1445L445 1431L451 1417L460 1416L472 1417L476 1429L490 1434L499 1439L502 1433L515 1439L529 1443L541 1443L553 1448L566 1451L585 1536H400Z"/>',
      hanbok:'<path fill="white" d="M460 0H565L550 60L510 100L474 60Z"/><rect x="210" y="580" width="145" height="210" fill="white"/><rect x="680" y="580" width="145" height="210" fill="white"/><rect y="1430" width="1024" height="106" fill="white"/>'
    };
    const region=regions[id]||'<rect width="1024" height="1536" fill="white"/>';
    const skinMask=`<mask id="${s}-skin" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1536"><use href="#${asset}" filter="url(#${s}-skin-only)"/></mask>`;
    const skinClip=`<mask id="${s}-region" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1536">${region}</mask>`;
    const recolor=id!=='rainbow'&&st.dress.color;
    // Hide only skin under the shoe, never chop a hole out of a long skirt.
    const cutY=shoeCut==null?0:(shoeCut-g.y)/g.scale;
    const footCut=id!=='tail'&&shoeCut!=null?`<g mask="url(#${s}-region)"><g mask="url(#${s}-skin)"><rect x="0" y="${cutY}" width="1024" height="1536" fill="black"/></g></g>`:'';
    const occlusion=`<filter id="${s}-silhouette"><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"/></filter><mask id="${s}-cloth-occlusion" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1536"><rect width="1024" height="1536" fill="white"/><use href="#${asset}" filter="url(#${s}-silhouette)"/><g mask="url(#${s}-region)"><use href="#${asset}" filter="url(#${s}-skin-only)"/></g></mask>`;
    return `<g data-studio-part="wardrobe/${id}" data-wear-layer="painted-outfit" data-skin-tone="${p.id}">
      <defs><image id="${asset}" href="${esc(src)}" width="1024" height="1536" preserveAspectRatio="xMidYMid meet"/>${skinFilter}${skinMask}${skinClip}${occlusion}${skinTone(s+'-tone',skin[p.id],id)}${tone(s+'-cloth',st.dress.color,'dress')}<mask id="${s}-feet" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1536"><rect width="1024" height="1536" fill="white"/>${footCut}</mask></defs>
      <g transform="translate(${g.x} ${g.y}) scale(${g.scale})" mask="url(#${s}-feet)">
      <use href="#${asset}" ${recolor?`filter="url(#${s}-cloth)"`:''}/>
      <g mask="url(#${s}-region)"><g mask="url(#${s}-skin)"><use href="#${asset}" filter="url(#${s}-tone)"/></g></g>
      </g></g>`;
  }
  function hand(id,p,identities,anchors){const g=geometry(id,p,identities,anchors);return fits[id].hand.map((v,i)=>v*g.scale+(i?g.y:g.x));}
  return {ids,has,path,skin,fits,short,geometry,render,hand};
})();
