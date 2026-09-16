(function(){
'use strict';
const dialog=document.createElement('dialog');dialog.className='dance-dialog';dialog.setAttribute('aria-labelledby','danceTitle');
dialog.innerHTML='<div class="dance-heading"><h2 id="danceTitle"></h2><button type="button" id="danceClose">닫기</button></div><p>주변을 넓게 비우고, 제자리에서 같이 춰 봐!</p><canvas width="800" height="460" role="img" aria-label="아빠, 태오, 재이, 엄마가 함께 추는 춤"></canvas><p id="danceCue" role="status"></p><div class="dance-controls"><button type="button" id="danceAgain">처음부터 춤추기</button><button type="button" id="danceClap">짝짝! 박수</button></div><p class="dance-note">음악 켜기를 누르면 생일 왈츠와 함께 놀아요.</p>';
document.body.append(dialog);
const canvas=dialog.querySelector('canvas'),ctx=canvas.getContext('2d'),cue=dialog.querySelector('#danceCue'),again=dialog.querySelector('#danceAgain');
const picture=new Image();picture.src='../assets/jaei-family-v4.webp';
const rear=new Image();rear.src='family-rear-dance-v1.png';
const rearRects=[{x:85,w:110,y:[6,207,385],h:270},{x:245,w:90,y:[80,264,429],h:167},{x:382,w:100,y:[50,237,407],h:209},{x:530,w:110,y:[7,208,385],h:270}];
const patchCanvas=document.createElement('canvas');patchCanvas.width=180;patchCanvas.height=280;const pc=patchCanvas.getContext('2d');
function rearSprite(i,t,moving){
 const r=rearRects[i],x=130+i*180,y=370,h=r.h,w=r.w*h/(201-r.y[0]),sx=rear.naturalWidth/720,sy=rear.naturalHeight/540;
 const row=(n,target)=>{const bottom=[202,383,537][n];target.drawImage(rear,r.x*sx,r.y[n]*sy,r.w*sx,(bottom-r.y[n])*sy,0,0,w,h);};
 ctx.save();ctx.translate(x-w/2,y-h);row(0,ctx);
 if(moving){
  // The head and planted feet always remain the neutral drawing. Blend only
  // the waist/hip band between actual left/right rear-view poses.
  const wave=Math.sin(t*Math.PI*2*1.2),n=wave<0?1:2;
  pc.clearRect(0,0,180,280);pc.globalCompositeOperation='source-over';row(n,pc);
  pc.globalCompositeOperation='destination-in';const mask=pc.createLinearGradient(0,0,0,h);mask.addColorStop(0,'transparent');mask.addColorStop(.44,'transparent');mask.addColorStop(.58,'black');mask.addColorStop(.78,'black');mask.addColorStop(.94,'transparent');mask.addColorStop(1,'transparent');pc.fillStyle=mask;pc.fillRect(0,0,180,280);pc.globalCompositeOperation='source-over';
  ctx.globalAlpha=Math.abs(wave);ctx.drawImage(patchCanvas,0,0);ctx.globalAlpha=1;
 }
 ctx.restore();ctx.font='18px Jua, sans-serif';ctx.textAlign='center';ctx.fillStyle='#52354f';ctx.fillText(people[i].name,x,y+27);
}
const people=[{name:'아빠',left:0,right:.28,h:270},{name:'태오',left:.28,right:.486,h:270},{name:'재이',left:.486,right:.73,h:270},{name:'엄마',left:.73,right:1,h:270}];
let mode='wiggle',frame=0,start=0,clapUntil=0,opener=null,loadFailed=false;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
function say(s){if(cue.textContent!==s)cue.textContent=s;}
function sprite(p,x,y,scale,t,move){
 const sx=p.left*picture.naturalWidth,sw=(p.right-p.left)*picture.naturalWidth,sh=picture.naturalHeight,h=p.h*scale,w=h*sw/sh;
 ctx.save();ctx.translate(x,y);ctx.fillStyle='#62476520';ctx.beginPath();ctx.ellipse(0,0,w*.42,8*scale,0,0,Math.PI*2);ctx.fill();
 // Preserve anatomy: a rigid illustration rocks around the planted foot.
 // Do not warp horizontal strips of the torso or stretch the face.
 const phase=t*Math.PI*2*108/60,rock=move?Math.sin(phase):0;
 ctx.save();ctx.translate(rock*w*.075,-Math.abs(rock)*3*scale);ctx.rotate(rock*(mode==='wiggle'?.045:.022));
 ctx.drawImage(picture,sx,0,sw,sh,-w/2,-h,w,h);ctx.restore();
 ctx.font='18px Jua, sans-serif';ctx.textAlign='center';ctx.fillStyle='#52354f';ctx.fillText(p.name,0,27*scale);ctx.restore();
}
function draw(now){
 if(!dialog.open)return;const elapsed=(now-start)/1000,still=reduced.matches,finished=elapsed>=12,frozen=mode==='circle'&&elapsed>=9;
 const active=!still&&!finished&&!frozen,beat=60/108;
 ctx.clearRect(0,0,800,460);const gradient=ctx.createLinearGradient(0,0,0,460);gradient.addColorStop(0,'#fff4e4');gradient.addColorStop(1,'#f4d3e4');ctx.fillStyle=mode==='wiggle'?'#fff4e4':gradient;ctx.fillRect(0,0,800,460);
 if(mode==='circle'){ctx.strokeStyle='#cf97b0';ctx.lineWidth=4;ctx.setLineDash([9,9]);ctx.beginPath();ctx.ellipse(400,315,270,80,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}
 if(picture.complete&&picture.naturalWidth){
  if(mode==='wiggle'){if(rear.complete&&rear.naturalWidth)people.forEach((p,i)=>rearSprite(i,elapsed,active));else say('뒤돌아선 가족 그림을 불러오는 중이에요.');}
  else {
   // A shared semicircle with small side steps avoids the front-facing
   // cutouts floating through one another on the previous elliptical orbit.
   const danceTime=Math.min(elapsed,9),travel=still?0:Math.sin(danceTime*Math.PI/(beat*4))*22;
   people.forEach((p,i)=>sprite(p,130+i*180+travel,340+Math.sin(i*Math.PI/3)*30,1,danceTime,!still));
  }
 }else{ctx.fillStyle='#52354f';ctx.font='24px Jua, sans-serif';ctx.textAlign='center';ctx.fillText(loadFailed?'그림을 불러오지 못했어요. 닫고 다시 열어 주세요.':'가족이 무대로 오고 있어요…',400,200);}
 if(now<clapUntil){ctx.font='40px Jua, sans-serif';ctx.textAlign='center';ctx.fillStyle='#9b4374';ctx.fillText('짝! 짝! ★',400,65);}
 say(finished?'멋지게 춤췄어! 한 번 더 할까?':frozen?'멈춰! 그대로 얼음!':mode==='circle'?'둥글게 모여서, 옆으로 한 발씩!':Math.floor(elapsed/(beat*2))%2?'오른쪽, 왼쪽!':'왼쪽, 오른쪽!');
 if(!finished)frame=requestAnimationFrame(draw);else frame=0;
}
function play(){cancelAnimationFrame(frame);start=performance.now();draw(start);}
function stop(){cancelAnimationFrame(frame);frame=0;}
dialog.querySelector('#danceClose').onclick=()=>dialog.close();
dialog.addEventListener('close',()=>{stop();if(opener&&opener.isConnected)opener.focus({preventScroll:true});});
again.onclick=play;dialog.querySelector('#danceClap').onclick=()=>{clapUntil=performance.now()+700;document.dispatchEvent(new CustomEvent('party-dance-note'));if(!frame){start=performance.now();draw(start);}};
document.addEventListener('visibilitychange',()=>{if(document.hidden&&dialog.open)dialog.close();});window.addEventListener('pagehide',()=>{stop();if(dialog.open)dialog.close();});
picture.onerror=()=>{loadFailed=true;};
const old=document.getElementById('dance');
for(const [id,label,title] of [['wiggle','엉덩이 씰룩춤','씰룩씰룩 엉덩이춤'],['circle','둥글게 둥글게','둥글게 돌다가 얼음!']]){
 const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.dance=id;old.before(b);b.onclick=()=>{mode=id;opener=b;dialog.querySelector('#danceTitle').textContent=title;dialog.showModal();play();};
}
})();
