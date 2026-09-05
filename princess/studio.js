'use strict';
// All image rectangles and attachment points use the current 420 x 680 doll,
// independently of the retired vector figure's coordinates.
globalThis.PrincessStudio=(()=>{
  const ROOT='assets/studio-v3/';
  const wearGeometry={"shoes":{"pumps":[[0.01042,0.00463,0.48958,0.99074],[0.50521,0.00463,0.48958,0.99074]],"glass":[[0.00521,0.0045,0.47396,0.99099],[0.52083,0.0045,0.47396,0.99099]],"boots":[[0.00649,0.00781,0.46753,0.99219],[0.50649,0.00391,0.48701,0.99609]],"sneakers":[[0.00521,0.00478,0.49479,0.99522],[0.5,0.00478,0.49479,0.99522]],"sandals":[[0.00521,0.00926,0.48958,0.98611],[0.51042,0.00463,0.48438,0.99074]],"ballet":[[0.00521,0,0.49479,0.9919],[0.5,0,0.49479,0.9919]],"rain":[[0.00524,0,0.48691,0.99609],[0.50262,0,0.49215,0.99609]],"slippers":[[0.01042,0.01935,0.48958,0.96774],[0.5,0.0129,0.49479,0.98065]],"kkotsin":[[0.00521,0.00515,0.48438,0.98969],[0.51042,0.00515,0.48438,0.98969]]},"bodies":{"snow":{"wrist":[299.66,278],"feet":[[177.34,26.72],[213.56,27.31]]},"cinder":{"wrist":[304.41,278],"feet":[[183.28,24.34],[211.78,24.34]]},"rapunzel":{"wrist":[307.97,278],"feet":[[177.94,26.13],[214.75,26.13]]},"mermaid":{"wrist":[307.67,278],"feet":[[183.28,25.53],[214.75,26.13]]},"thumb":{"wrist":[308.86,278],"feet":[[182.09,26.13],[213.56,26.13]]},"kongjwi":{"wrist":[307.97,278],"feet":[[180.91,26.13],[217.72,26.13]]},"briar":{"wrist":[311.23,278],"feet":[[174.97,28.5],[211.78,29.09]]},"moon":{"wrist":[304.41,278],"feet":[[177.34,27.31],[211.19,27.31]]}}};
  const shoeWear={pumps:[533,46,.60],glass:[533,46,.60],boots:[475,104,0],sneakers:[542,37,.22],sandals:[535,44,.73],ballet:[521,58,.66],rain:[505,74,0],slippers:[549,30,.46],kkotsin:[540,39,.48]};
  const gripPoints={wand:[.5,.84],fan:[.5,.9],bouquet:[.5,.8],umbrella:[.51,.88],bag:[.5,.12],balloon:[.47,.96],book:[.16,.62],lollipop:[.5,.86],sword:[.5,.74],mirror:[.5,.86],basket:[.5,.14]};
  // Individual fictional character designs; body build is not derived from ethnicity.
  const identities={
    snow:{sx:.97,sy:.95,fit:1.04,dx:0},cinder:{sx:.98,sy:1.01,fit:1.04,dx:0},
    rapunzel:{sx:.96,sy:1,fit:1.08,dx:-1.5},mermaid:{sx:1.04,sy:.98,fit:1.06,dx:-4.5},
    thumb:{sx:.98,sy:.87,fit:1.07,dx:-3.3},kongjwi:{sx:1,sy:.96,fit:1.06,dx:-5},
    briar:{sx:1.05,sy:.98,fit:1.20,dx:-2.6},moon:{sx:1.05,sy:1.02,fit:1.05,dx:.7}
  };
  const rects={
    dress:{
      ballgown:[80,140,260,428],aline:[101,140,218,407],party:[127,138,166,244],
      mermaidline:[121,140,178,430],hanbok:[91,126,238,442],tutu:[117,139,186,197],
      tail:[140,145,140,442],winter:[99,123,222,446],star:[96,140,228,430],
      rainbow:[90,139,240,430],summer:[132,138,156,250],rose:[93,139,234,431],
      adventure:[151,125,118,418]
    },
    shoes:{
      pumps:[177,546,66,34],glass:[177,546,66,34],boots:[178,483,64,96],
      sneakers:[177,543,66,36],sandals:[178,547,64,32],ballet:[179,531,62,48],
      rain:[178,509,64,70],slippers:[175,548,70,32],kkotsin:[176,547,68,32]
    },
    crown:{
      crown:[168,-2,84,41],tiara:[172,9,76,27],flowers:[165,8,90,35],
      bow:[227,10,49,35],starclip:[232,22,27,28],pearls:[174,10,72,29],
      witch:[151,-5,119,57],bunny:[176,-12,68,62],catears:[172,0,77,40],
      hennin:[184,-14,82,64],daenggi:[196,12,29,39],moon:[172,-1,77,40],
      veil:[156,8,111,195]
    },
    neck:{
      pearls:[185,112,51,44],heart:[193,113,36,49],gem:[190,113,42,52],
      scarf:[181,110,61,63],choker:[190,113,41,22],star:[192,112,38,53],
      norigae:[218,204,24,82],flowerlei:[178,110,65,61]
    },
    hand:{
      wand:[305,190,34,121],fan:[277,239,82,73],bouquet:[283,226,74,103],
      umbrella:[249,133,128,180],bag:[293,283,69,66],balloon:[302,140,65,168],
      book:[303,264,54,59],lollipop:[306,222,43,99],sword:[309,174,36,141],
      mirror:[306,227,39,91],basket:[291,282,83,78]
    },
    back:{
      fairy:[78,118,264,257],butterfly:[66,122,288,272],cape:[109,123,202,427],
      angel:[63,115,294,289],bat:[67,132,286,222],backpack:[147,153,126,163]
    },
    pet:{
      cat:[312,501,84,87],dog:[313,503,86,85],rabbit:[315,477,82,111],
      bird:[79,268,61,62],frog:[310,524,81,67],unicorn:[289,474,110,119],
      deer:[289,472,112,121],butterfly:[69,241,79,82],dragon:[293,485,104,107],
      hamster:[324,538,66,54],mouse:[313,541,79,50],fish:[63,290,75,54],
      toad:[310,535,88,58]
    },
    hair:{
      bob:[136.3,4.4,145.2,116.3],bun:[150.7,-16.3,116.9,145.4],braid:[146.4,4,133.7,216.5],
      wavy:[94,6.3,243.3,208.2],pigtails:[104.1,-2.3,213.5,181],daenggi:[148.8,2.5,121.2,215.1],
      curls:[98.7,6.3,234.6,181.2],afro:[102.25,-11.8,217.5,153.2]
    }
  };
  const cache=new Map(),pending=new Map();
  const dressMeshes={
    party:[[0,123,190],[.052,132,205],[.112,151,265],[.176,174,280],[.313,215,290],[.485,273,215],[1,382,180]],
    tutu:[[0,126,285],[.198,150,300],[.254,174,310],[.427,215,300],[.586,263,242],[1,336,190]],
    summer:[[0,128,222],[.175,151,238],[.242,174,252],[.418,215,202],[.547,269,184],[1,392,171]],
    rainbow:[[0,145,460],[.069,172,480],[.142,215,475],[.274,272,290],[.5,385,248],[1,568,245]],
    ballgown:[[0,125,300],[.10,152,300],[.15,184,495],[.20,215,440],[.28,246,320],[.5,350,278],[1,570,270]],
    aline:[[0,127,300],[.1,149,315],[.165,170,315],[.26,215,315],[.39,271,273],[.6,395,230],[1,548,220]],
    mermaidline:[[0,127,340],[.106,151,380],[.142,170,420],[.225,215,400],[.334,269,368],[.5,375,360],[.68,443,250],[1,570,218]],
    adventure:[[0,112,140],[.059,128,144],[.151,170,144],[.295,215,118],[.4,269,140],[.58,355,154],[.78,455,152],[1,580,136]],
    tail:[[0,148,330],[.10,173,340],[.20,216,360],[.35,271,225],[.55,375,155],[1,587,183]],
    hanbok:[[0,119,240],[.12,158,318],[.26,209,290],[.45,289,247],[1,568,240]]
  };
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  const key=(cat,id)=>cat+'/'+id;
  const path=(cat,id)=>cat==='grip'?'assets/wear-v5/grip-'+id+'.webp':cat==='body'?'assets/bodies-v4/body-'+id+'.webp':ROOT+cat+'-'+id+(cat==='bg'?'.jpg':'.webp');
  const selectedHair=(st,p)=>Object.hasOwn(rects.hair,st.hairStyle)?st.hairStyle:p.hair;
  const href=(cat,id,embedded)=>embedded===undefined?path(cat,id):embedded[key(cat,id)];
  const fileKeys=(st,p)=>{
    const list=[key('bg',st.bg),key('hair',selectedHair(st,p)),key('body',p.id)];
    if(st.hand)list.push(key('grip',p.id));
    for(const cat of ['back','dress','shoes','crown','neck','hand','pet']){
      if(st[cat]&&!(cat==='shoes'&&st.dress?.id==='tail'))list.push(key(cat,st[cat].id));
    }
    return list;
  };
  function tone(id,color,type,contact=false){
    if(!/^#[a-f0-9]{6}$/i.test(color))return `<filter id="${id}" x="-5%" y="-5%" width="110%" height="110%"><feColorMatrix type="saturate" values="1"/>${contact?'<feDropShadow dx="0" dy=".65" stdDeviation=".45" flood-color="#291827" flood-opacity=".26"/>':''}</filter>`;
    const raw=/^#[a-f0-9]{6}$/i.test(color)?color:'#ffffff';
    const channels=[1,3,5].map(i=>parseInt(raw.slice(i,i+2),16)/255);
    const curves=channels.map(v=>{
      if(type==='hair')return [v*.07,v*.38,v*.86,Math.min(1,v*.9+.18)];
      // Keep deep folds and near-white silk/metal glints when fabric is recolored.
      return [.008,v*.18,v*.52,v*.88,Math.min(1,.94+v*.06)];
    });
    return `<filter id="${id}" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="0"/><feComponentTransfer>${['R','G','B'].map((c,i)=>`<feFunc${c} type="table" tableValues="${curves[i].map(v=>v.toFixed(4)).join(' ')}"/>`).join('')}</feComponentTransfer>${contact?'<feDropShadow dx="0" dy=".65" stdDeviation=".45" flood-color="#291827" flood-opacity=".26"/>':''}</filter>`;
  }
  function sprite(cat,id,color,scope,embedded,override){
    const r=override||rects[cat]?.[id];if(!r)return '';
    const src=href(cat,id,embedded);if(!src)throw new Error('Missing studio asset: '+key(cat,id));
    if(cat==='pet')return `<g data-studio-part="pet/${id}" data-natural-color="true"><image href="${escape(src)}" x="${r[0]}" y="${r[1]}" width="${r[2]}" height="${r[3]}" preserveAspectRatio="xMidYMid meet"/></g>`;
    const tid=scope+'-tone';
    if(cat==='dress'&&!override&&dressMeshes[id]){
      const knots=dressMeshes[id],asset=scope+'-source';
      const at=f=>{
        let i=0;while(i<knots.length-2&&knots[i+1][0]<f)i++;
        const a=knots[i],b=knots[i+1],t=(f-a[0])/(b[0]-a[0]);
        return [a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
      };
      const slices=Array.from({length:64},(_,i)=>{
        const s=i/64,e=(i+1)/64,a=at(s),b=at(e),w=at((s+e)/2)[1];
        return `<svg x="${210-w/2}" y="${a[0]}" width="${w}" height="${b[0]-a[0]+.8}" viewBox="0 ${s} 1 ${e-s}" preserveAspectRatio="none" overflow="hidden"><use href="#${asset}"/></svg>`;
      }).join('');
      return `<g data-studio-part="dress/${id}" filter="url(#${tid})"><defs>${tone(tid,color,cat)}<image id="${asset}" href="${escape(src)}" width="1" height="1" preserveAspectRatio="none"/></defs>${slices}</g>`;
    }
    return `<g data-studio-part="${cat}/${id}"><defs>${tone(tid,color,cat)}</defs><image href="${escape(src)}" x="${r[0]}" y="${r[1]}" width="${r[2]}" height="${r[3]}" preserveAspectRatio="${override?'xMidYMid meet':'none'}" filter="url(#${tid})"/></g>`;
  }
  function background(id,embedded){
    const src=href('bg',id,embedded);if(!src)throw new Error('Missing background '+id);
    return `<image data-studio-background="${id}" href="${escape(src)}" width="420" height="680" preserveAspectRatio="xMidYMid slice"/>`;
  }
  function body(p,bodyHref,scope,tail,dressColor,shoeId=null,holding=false,trousers=false,liningSrc=null){
    const wx=wearGeometry.bodies[p.id].wrist[0],wear=shoeId&&shoeWear[shoeId];
    const cuts=(tail?'<rect x="140" y="250" width="140" height="430" fill="black"/>':'')+
      (trousers?`<rect x="140" y="250" width="140" height="${wear?wear[0]-250:430}" fill="black"/>`:'')+
      (wear?`<rect x="145" y="${wear[0]+wear[1]*wear[2]}" width="140" height="150" fill="black"/>`:'')+
      (holding?`<path d="M${wx-10} 278L${wx+9} 270L380 350H285Z" fill="black"/>`:'');
    const lining=liningSrc?`<defs>${tone(scope+'-lining',dressColor,'dress')}<clipPath id="${scope}-lining-clip"><path d="M169 141Q209 148 252 141L243 177Q237 201 236 215Q238 235 251 260L229 274L216 286H204L190 274L168 260Q179 236 182 215Q180 194 175 177Z"/></clipPath></defs><g data-wear-layer="fabric-lining" clip-path="url(#${scope}-lining-clip)"><image href="${escape(liningSrc)}" x="154" y="100" width="112" height="420" preserveAspectRatio="xMidYMin slice" filter="url(#${scope}-lining)"/></g>`:'';
    return `<defs><image id="${scope}-body-source" data-studio-body="true" href="${escape(bodyHref)}" x="20" y="10" width="380" height="570" preserveAspectRatio="xMidYMid meet"/><mask id="${scope}-body-visible" maskUnits="userSpaceOnUse" x="0" y="0" width="420" height="680"><rect width="420" height="680" fill="white"/>${cuts}</mask></defs><g mask="url(#${scope}-body-visible)"><use href="#${scope}-body-source"/>${lining}</g>`;
  }
  function fittedShoes(st,p,scope,embedded,front){
    if(!st.shoes||st.dress?.id==='tail')return '';
    const {id,color}=st.shoes,[y,h,opening]=shoeWear[id],sid=scope+'-shoes-'+(front?'front':'back'),src=href('shoes',id,embedded);
    const feet=wearGeometry.bodies[p.id].feet,dx=identities[p.id].dx;
    const pairs=feet.map(([left,width],i)=>{
      const box=wearGeometry.shoes[id][i],x=left+dx-2,w=width+4,mask=sid+'-opening-'+i;
      const hole=front&&opening>0?`<path fill="black" d="M${x+w*.26} ${y+h*.07} Q${x+w*.5} ${y-h*.03} ${x+w*.74} ${y+h*.07} L${x+w*.81} ${y+h*opening} Q${x+w*.5} ${y+h*(opening+.1)} ${x+w*.19} ${y+h*opening}Z"/>`:'';
      return `<defs><mask id="${mask}" maskUnits="userSpaceOnUse" x="${x-2}" y="${y-2}" width="${w+4}" height="${h+4}"><rect x="${x-2}" y="${y-2}" width="${w+4}" height="${h+4}" fill="white"/>${hole}</mask></defs><g mask="url(#${mask})"><svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${box.join(' ')}" preserveAspectRatio="none" overflow="hidden"><image href="${escape(src)}" width="1" height="1" preserveAspectRatio="none"/></svg></g>`;
    }).join('');
    return `<g data-studio-part="shoes/${id}" data-wear-layer="${front?'shoe-front':'shoe-back'}" filter="url(#${sid}-tone)"><defs>${tone(sid+'-tone',color,'shoes',front)}</defs>${pairs}</g>`;
  }
  function heldProp(st,p,scope,embedded){
    if(!st.hand)return '';
    const {id,color}=st.hand,r=rects.hand[id],a=gripPoints[id],wx=wearGeometry.bodies[p.id].wrist[0]+identities[p.id].dx;
    const tx=wx+16-(r[0]+r[2]*a[0]),ty=297-(r[1]+r[3]*a[1]);
    return `<g data-wear-layer="held-prop" transform="translate(${tx} ${ty})" filter="url(#${scope}-contact)">${sprite('hand',id,color,scope+'-hand',embedded)}</g><image data-studio-part="grip/${p.id}" data-wear-layer="gripping-fingers" href="${escape(href('grip',p.id,embedded))}" x="${wx-7}" y="270" width="33" height="42" preserveAspectRatio="none"/>`;
  }
  function frontArms(st,p,scope){
    const longSleeves=['hanbok','winter','adventure'].includes(st.dress?.id),y=longSleeves?278:225;
    return `<defs><clipPath id="${scope}-front-arms"><path d="M65 ${y}H145L158 ${y+12}L125 335H65Z M275 ${y}H360V335H294L261 ${y+12}Z"/></clipPath></defs><g data-wear-layer="arms-over-clothes" filter="url(#${scope}-skin-contact)"><g transform="translate(${identities[p.id].dx} 0)" clip-path="url(#${scope}-front-arms)" mask="url(#${scope}-body-visible)"><use href="#${scope}-body-source"/></g></g>`;
  }
  // Measured on the actual bald doll assets: crown top and temple edges in scene units.
  const headAnchors={
    snow:[18.3125,183.875,239.09375],cinder:[18.90625,183.875,236.125],
    rapunzel:[14.15625,185.65625,239.09375],mermaid:[18.90625,186.25,242.0625],
    thumb:[14.75,183.875,242.65625],kongjwi:[20.6875,189.21875,241.46875],
    briar:[16.53125,186.84375,240.28125],moon:[15.34375,183.28125,236.125]
  };
  // Normalized forehead opening, temple row/edges, crown volume and natural length.
  const hairAnchors={
    bob:[.2663,.4142,.3186,.6845,6,125],bun:[.3548,.5046,.2874,.7356,25,132],
    braid:[.1455,.2933,.2537,.7122,6,225],wavy:[.1376,.2867,.3496,.5962,8,224],
    pigtails:[.2061,.356,.362,.6329,10,192],daenggi:[.1533,.3021,.25,.755,5,225],
    curls:[.1583,.3073,.3581,.5934,8,202],afro:[.3081,.4569,.3816,.6276,16,158]
  };
  function hairPlacement(p,bodyOffset=identities[p.id].dx){
    const [top,left,right]=headAnchors[p.id],a=hairAnchors[p.hair];
    const width=(right-left-4)/(a[3]-a[2]);
    return {x:(left+right)/2+bodyOffset-(a[2]+a[3])/2*width,width,
      knots:[[0,top-a[4]],[a[0],top+18],[a[1],57.5],[1,a[5]+top-18]]};
  }
  function hair(p,color,scope,embedded,front=false,bodyOffset=identities[p.id].dx){
    const fit=hairPlacement(p,bodyOffset),asset=scope+'-source',tid=scope+'-tone';
    // Three continuous sections preserve strands without thin-strip alpha seams.
    const slices=fit.knots.slice(0,-1).map((a,i)=>{
      const b=fit.knots[i+1];
      return `<svg x="${fit.x}" y="${a[1]}" width="${fit.width}" height="${b[1]-a[1]+.35}" viewBox="0 ${a[0]} 1 ${b[0]-a[0]}" preserveAspectRatio="none" overflow="hidden"><use href="#${asset}"/></svg>`;
    });
    return `<g data-studio-part="hair/${p.hair}" data-hair-fit="head-anchors-v33" data-contact-shading="${front}" data-wear-layer="${front?'hair-front':'hair-back'}" filter="url(#${tid})"><defs>${tone(tid,color,'hair',front)}<image id="${asset}" href="${escape(href('hair',p.hair,embedded))}" width="1" height="1" preserveAspectRatio="none"/></defs>${slices.join('')}</g>`;
  }
  function accessoryPlacement(cat,id,p){
    const [top,left,right]=headAnchors[p.id],center=(left+right)/2+identities[p.id].dx,r=rects[cat][id];
    if(cat==='neck'){
      if(id==='norigae')return {sx:1,sy:1,dx:0,dy:0};
      const sx=(right-left)/55*(id==='choker'?.67:id==='scarf'?.9:id==='flowerlei'?.9:.72),sy=id==='choker'?.55:.72;
      return {sx,sy,dx:center-210*sx,dy:103-r[1]*sy};
    }
    const scale=(right-left+12)/84;
    const base=top+17;
    return {sx:scale,sy:scale,dx:center-210*scale,dy:Math.max(-18-r[1]*scale,base-(r[1]+(id==='veil'?34:r[3]))*scale)};
  }
  function render(st,p,bodyHref='assets/fashion-doll-base-v1.png',embedded){
    p={...p,hair:selectedHair(st,p)};
    const scope='studio-'+p.id,tail=st.dress?.id==='tail',identity=identities[p.id];
    bodyHref=href('body',p.id,embedded);if(!bodyHref)throw new Error('Missing body '+p.id);
    const part=cat=>{
      if(!st[cat])return '';
      const art=sprite(cat,st[cat].id,st[cat].color,scope+'-'+cat,embedded);
      const hem=st.dress?.id==='adventure'&&st.shoes?shoeWear[st.shoes.id][0]+5:680;
      return cat==='dress'?`<defs><clipPath id="${scope}-hem"><rect width="420" height="${hem}"/></clipPath></defs><g data-wear-layer="clothes" filter="url(#${scope}-contact)" clip-path="url(#${scope}-hem)"><g mask="url(#${scope}-dress-fit)"><g transform="translate(210 0) scale(${identity.fit} 1) translate(-210 0)">${art}</g></g></g>`:art;
    };
    const neck=front=>{
      if(!st.neck)return '';const {id,color}=st.neck,sid=scope+'-neck-'+front,fit=accessoryPlacement('neck',id,p);
      if(!front&&id==='norigae')return '';
      return `<defs><clipPath id="${sid}-clip"><rect x="0" y="${front?119:0}" width="420" height="${front?561:119}"/></clipPath></defs><g data-wear-layer="neck-${front?'front':'back'}" data-attachment="neck" transform="matrix(${fit.sx} 0 0 ${fit.sy} ${fit.dx} ${fit.dy})" filter="url(#${scope}-skin-contact)"><g clip-path="url(#${sid}-clip)">${sprite('neck',id,color,sid,embedded)}</g></g>`;
    };
    const crown=front=>{
      if(!st.crown)return '';const {id,color}=st.crown,sid=scope+'-crown-'+front,r=rects.crown[id],fit=accessoryPlacement('crown',id,p);
      const cut=id==='veil'?42:['crown','tiara','flowers','pearls','moon'].includes(id)?r[1]+r[3]*.80:680;
      return `<defs><clipPath id="${sid}-clip"><rect x="0" y="-30" width="420" height="${front?cut+30:710}"/></clipPath></defs><g data-wear-layer="headwear-${front?'front':'back'}" data-attachment="head" transform="matrix(${fit.sx} 0 0 ${fit.sy} ${fit.dx} ${fit.dy})" filter="url(#${scope}-skin-contact)"><g clip-path="url(#${sid}-clip)">${sprite('crown',id,color,sid,embedded)}</g></g>`;
    };
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 680" width="420" height="680" role="img" aria-label="${escape(p.name)} 인형 꾸미기" data-art-version="wear-v5">
      <defs><filter id="${scope}-skin-contact" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB"><feDropShadow dx="0" dy=".65" stdDeviation=".45" flood-color="#291827" flood-opacity=".26"/></filter></defs>
      <defs><filter id="${scope}-contact" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB"><feDropShadow dx=".5" dy="1.2" stdDeviation=".85" flood-color="#2a1823" flood-opacity=".30"/></filter><radialGradient id="${scope}-shade"><stop offset="0" stop-color="#17111f" stop-opacity=".34"/><stop offset="1" stop-color="#17111f" stop-opacity="0"/></radialGradient></defs>
      <defs><filter id="${scope}-torso-contour"><feMorphology in="SourceAlpha" operator="dilate" radius="6" result="contour"/><feFlood flood-color="white"/><feComposite in2="contour" operator="in"/></filter><mask id="${scope}-dress-fit" maskUnits="userSpaceOnUse" x="0" y="0" width="420" height="680"><use href="#${scope}-body-source" transform="translate(${identity.dx} 0)" filter="url(#${scope}-torso-contour)"/><rect y="220" width="420" height="460" fill="white"/></mask></defs>
      ${background(st.bg,embedded)}
      <g data-photo-safe="true" transform="translate(0 24) scale(1 .96)">
      <ellipse cx="210" cy="603" rx="97" ry="21" fill="url(#${scope}-shade)"/>
      <g data-body-identity="${p.id}" transform="translate(210 ${604-580*identity.sy}) scale(${identity.sx} ${identity.sy}) translate(-210 0)">
      ${part('back')}${crown(false)}
      ${hair(p,st.hairColor,scope+'-hair-back',embedded)}
      ${neck(false)}${fittedShoes(st,p,scope,embedded,false)}
      <g data-studio-part="body/${p.id}" transform="translate(${identity.dx} 0)">${body(p,bodyHref,scope,tail,st.dress?.color,tail?null:st.shoes?.id,!!st.hand,st.dress?.id==='adventure',st.dress?href('dress',st.dress.id,embedded):null)}</g>
      ${st.dress?.id==='adventure'?'':fittedShoes(st,p,scope,embedded,true)}
      ${part('dress')}${st.dress?.id==='adventure'?fittedShoes(st,p,scope,embedded,true):''}${frontArms(st,p,scope)}
      ${neck(true)}
      ${hair(p,st.hairColor,scope+'-hair-front',embedded,true)}
      ${crown(true)}${heldProp(st,p,scope,embedded)}
      </g><g transform="translate(0 24)">${part('pet')}</g></g>
    </svg>`;
  }
  function thumb(cat,item,color,embedded){
    const inner=cat==='bg'?background(item.id,embedded):sprite(cat,item.id,color,'thumb-'+cat+'-'+item.id,embedded,[10,10,140,160]);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${cat==='bg'?'0 0 420 680':'0 0 160 180'}" preserveAspectRatio="xMidYMid meet" data-art-version="studio-v3">${inner}</svg>`;
  }
  function portrait(p,color,embedded,bodyHref='assets/fashion-doll-base-v1.png'){
    const scope='portrait-'+p.id;
    bodyHref=href('body',p.id,embedded);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="125 -24 170 208" preserveAspectRatio="xMidYMid meet" data-art-version="studio-v3">${hair(p,color,scope+'-back',embedded,false,0)}${body(p,bodyHref,scope,false)}${hair(p,color,scope+'-front',embedded,true,0)}</svg>`;
  }
  function loadFile(k){
    if(cache.has(k))return Promise.resolve(cache.get(k));
    if(pending.has(k))return pending.get(k);
    const [cat,id]=k.split('/');
    const promise=fetch(path(cat,id),{cache:'force-cache'}).then(r=>{
      if(!r.ok)throw new Error('Asset download failed: '+k);
      return r.blob();
    }).then(blob=>new Promise((resolve,reject)=>{
      const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);
    })).then(data=>{cache.set(k,data);return data}).finally(()=>pending.delete(k));
    pending.set(k,promise);return promise;
  }
  async function exportAssets(st,p){
    const keys=fileKeys(st,p);
    const values=await Promise.all(keys.map(loadFile));
    return Object.fromEntries(keys.map((k,i)=>[k,values[i]]));
  }
  return {render,thumb,portrait,background,exportAssets,fileKeys,path,rects,identities,headAnchors,hairAnchors,hairPlacement,accessoryPlacement};
})();
