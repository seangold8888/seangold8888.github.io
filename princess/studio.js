'use strict';
// All image rectangles and attachment points use the current 420 x 680 doll,
// independently of the retired vector figure's coordinates.
globalThis.PrincessStudio=(()=>{
  const ROOT='assets/studio-v3/';
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
      norigae:[208,179,34,102],flowerlei:[178,110,65,61]
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
    ballgown:[[0,125,300],[.10,152,300],[.15,184,495],[.20,215,440],[.28,246,320],[.5,350,278],[1,570,270]],
    aline:[[0,127,300],[.1,149,315],[.165,170,315],[.26,215,315],[.39,271,273],[.6,395,230],[1,548,220]],
    mermaidline:[[0,127,340],[.106,151,380],[.142,170,420],[.225,215,400],[.334,269,368],[.5,375,360],[.68,443,250],[1,570,218]],
    adventure:[[0,112,140],[.059,128,144],[.151,170,144],[.295,215,118],[.4,269,140],[.58,355,154],[.78,455,152],[1,580,136]],
    tail:[[0,148,330],[.10,173,340],[.20,216,360],[.35,271,225],[.55,375,155],[1,587,183]],
    hanbok:[[0,119,240],[.12,158,318],[.26,209,290],[.45,289,247],[1,568,240]]
  };
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  const key=(cat,id)=>cat+'/'+id;
  const path=(cat,id)=>cat==='body'?'assets/bodies-v4/body-'+id+'.png':ROOT+cat+'-'+id+(cat==='bg'?'.jpg':'.png');
  const href=(cat,id,embedded)=>embedded===undefined?path(cat,id):embedded[key(cat,id)];
  const fileKeys=(st,p)=>{
    const list=[key('bg',st.bg),key('hair',p.hair),key('body',p.id)];
    for(const cat of ['back','dress','shoes','crown','neck','hand','pet']){
      if(st[cat]&&!(cat==='shoes'&&st.dress?.id==='tail'))list.push(key(cat,st[cat].id));
    }
    return list;
  };
  function tone(id,color,type){
    const raw=/^#[a-f0-9]{6}$/i.test(color)?color:'#ffffff';
    const channels=[1,3,5].map(i=>parseInt(raw.slice(i,i+2),16)/255);
    const curves=channels.map(v=>{
      if(type==='hair')return [v*.07,v*.38,v*.86,Math.min(1,v*.9+.18)];
      return [0,v*.32,v*.76,Math.min(1,v*.86+.14)];
    });
    return `<filter id="${id}" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="0"/><feComponentTransfer>${['R','G','B'].map((c,i)=>`<feFunc${c} type="table" tableValues="${curves[i].map(v=>v.toFixed(4)).join(' ')}"/>`).join('')}</feComponentTransfer></filter>`;
  }
  function sprite(cat,id,color,scope,embedded,override){
    const r=override||rects[cat]?.[id];if(!r)return '';
    const src=href(cat,id,embedded);if(!src)throw new Error('Missing studio asset: '+key(cat,id));
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
        return `<svg x="${210-w/2}" y="${a[0]}" width="${w}" height="${b[0]-a[0]+.18}" viewBox="0 ${s} 1 ${e-s}" preserveAspectRatio="none" overflow="hidden"><use href="#${asset}"/></svg>`;
      }).join('');
      return `<g data-studio-part="dress/${id}" filter="url(#${tid})"><defs>${tone(tid,color,cat)}<image id="${asset}" href="${escape(src)}" width="1" height="1" preserveAspectRatio="none"/></defs>${slices}</g>`;
    }
    return `<g data-studio-part="${cat}/${id}"><defs>${tone(tid,color,cat)}</defs><image href="${escape(src)}" x="${r[0]}" y="${r[1]}" width="${r[2]}" height="${r[3]}" preserveAspectRatio="${override?'xMidYMid meet':'none'}" filter="url(#${tid})"/></g>`;
  }
  function background(id,embedded){
    const src=href('bg',id,embedded);if(!src)throw new Error('Missing background '+id);
    return `<image data-studio-background="${id}" href="${escape(src)}" width="420" height="680" preserveAspectRatio="xMidYMid slice"/>`;
  }
  function body(p,bodyHref,scope,tail,dressColor){
    const [r,g,b]=[1,1,1]; // Each original already contains its own complexion and facial sculpt.
    const lining=dressColor?`<defs>${tone(scope+'-lining',dressColor,'dress')}<clipPath id="${scope}-lining-clip"><path d="M169 141Q209 148 252 141L243 177Q237 201 236 215Q238 235 251 260L229 274L216 286H204L190 274L168 260Q179 236 182 215Q180 194 175 177Z"/></clipPath></defs><image href="${escape(bodyHref)}" x="20" y="10" width="380" height="570" preserveAspectRatio="xMidYMid meet" filter="url(#${scope}-lining)" clip-path="url(#${scope}-lining-clip)"/>`:'';
    return `<defs><filter id="${scope}-skin" color-interpolation-filters="sRGB"><feColorMatrix values="${r} 0 0 0 0 0 ${g} 0 0 0 0 0 ${b} 0 0 0 0 0 1 0"/></filter><clipPath id="${scope}-body-clip"><rect width="420" height="${tail?250:680}"/>${tail?'<rect width="141" height="680"/><rect x="279" width="141" height="680"/>':''}</clipPath></defs><g clip-path="url(#${scope}-body-clip)"><image data-studio-body="true" href="${escape(bodyHref)}" x="20" y="10" width="380" height="570" preserveAspectRatio="xMidYMid meet" filter="url(#${scope}-skin)"/>${lining}</g>`;
  }
  function hair(p,color,scope,embedded,front=false){
    const piece=sprite('hair',p.hair,color,scope,embedded);
    const fit={moon:.87,briar:.92,kongjwi:.95,mermaid:.96,snow:1,cinder:1,rapunzel:.98,thumb:.95}[p.id];
    return `<g transform="translate(210 0) scale(${fit} 1) translate(-210 0)">${piece}</g>`;
  }
  function render(st,p,bodyHref='assets/fashion-doll-base-v1.png',embedded){
    const scope='studio-'+p.id,tail=st.dress?.id==='tail',identity=identities[p.id];
    bodyHref=href('body',p.id,embedded);
    if(!bodyHref)throw new Error('Missing body '+p.id);
    const part=cat=>{
      if(!st[cat])return '';
      const art=sprite(cat,st[cat].id,st[cat].color,scope+'-'+cat,embedded);
      return cat==='dress'?`<g transform="translate(210 0) scale(${identity.fit} 1) translate(-210 0)">${art}</g>`:art;
    };
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 680" width="420" height="680" role="img" aria-label="${escape(p.name)} 인형 꾸미기" data-art-version="studio-v3">
      <defs><radialGradient id="${scope}-shade"><stop offset="0" stop-color="#17111f" stop-opacity=".34"/><stop offset="1" stop-color="#17111f" stop-opacity="0"/></radialGradient><linearGradient id="${scope}-edge" x2="0" y2="1"><stop stop-color="#fff" stop-opacity=".06"/><stop offset=".72" stop-color="#17111f" stop-opacity="0"/><stop offset="1" stop-color="#17111f" stop-opacity=".18"/></linearGradient></defs>
      ${background(st.bg,embedded)}
      <rect width="420" height="680" fill="url(#${scope}-edge)"/>
      <ellipse cx="210" cy="603" rx="97" ry="21" fill="url(#${scope}-shade)"/>
      <g data-body-identity="${p.id}" transform="translate(210 ${604-580*identity.sy}) scale(${identity.sx} ${identity.sy}) translate(-210 0)">
      ${part('back')}
      ${hair(p,st.hairColor,scope+'-hair-back',embedded)}
      <g data-studio-part="body/${p.id}" transform="translate(${identity.dx} 0)">${body(p,bodyHref,scope,tail||st.dress?.id==='adventure',st.dress?.color)}</g>
      ${tail||st.dress?.id==='adventure'?'':part('shoes')}
      ${part('dress')}
      ${st.dress?.id==='adventure'?part('shoes'):''}
      ${hair(p,st.hairColor,scope+'-hair-front',embedded,true)}
      ${part('neck')}
      ${part('crown')}
      ${part('hand')}
      </g>
      <g transform="translate(0 24)">${part('pet')}</g>
    </svg>`;
  }
  function thumb(cat,item,color,embedded){
    const inner=cat==='bg'?background(item.id,embedded):sprite(cat,item.id,color,'thumb-'+cat+'-'+item.id,embedded,[10,10,140,160]);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${cat==='bg'?'0 0 420 680':'0 0 160 180'}" preserveAspectRatio="xMidYMid meet" data-art-version="studio-v3">${inner}</svg>`;
  }
  function portrait(p,color,embedded,bodyHref='assets/fashion-doll-base-v1.png'){
    const scope='portrait-'+p.id;
    bodyHref=href('body',p.id,embedded);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="125 -24 170 208" preserveAspectRatio="xMidYMid meet" data-art-version="studio-v3">${hair(p,color,scope+'-back',embedded)}${body(p,bodyHref,scope,false)}${hair(p,color,scope+'-front',embedded,true)}</svg>`;
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
  return {render,thumb,portrait,background,exportAssets,fileKeys,path,rects,identities};
})();
