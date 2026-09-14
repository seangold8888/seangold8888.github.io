'use strict';
// Read-only registration measurement. Prints source metadata; never edits image pixels.
const sharp=require('sharp');
(async()=>{const out={};for(const id of 'pumps glass boots sneakers sandals ballet rain slippers kkotsin'.split(' ')){
 const {data:d,info:i}=await sharp('princess/assets/footwear-v49/'+id+'.png').raw().toBuffer({resolveWithObject:true});
 const subject=(x,y)=>{const p=(y*i.width+x)*i.channels;return !(d[p+1]>d[p]+35&&d[p+1]>d[p+2]+35);};
 let sole=0;for(let y=600;y<i.height;y++)for(let x=250;x<i.width-250;x++)if(subject(x,y))sole=Math.max(sole,y);
 const start=id==='boots'?140:id==='rain'?340:570,forefoot=sole-100,rows=[];
 for(const y of [...new Set([start,400,500,570,600,700,800,900,1000,forefoot,sole])].sort((a,b)=>a-b)){
  const row=[y];for(let side=0;side<2;side++){const xs=[];for(let x=side*i.width/2;x<(side+1)*i.width/2;x++)if(subject(x,y))xs.push(x);const l=Math.min(...xs),r=Math.max(...xs);row.push((l+r)/2,r-l+1);}rows.push(row);
 }
 const skin=[];for(let c=0;c<3;c++){const vals=[];for(let y=start;y<start+50;y++)for(let x=460;x<510;x++)vals.push(d[(y*i.width+x)*i.channels+c]);vals.sort((a,b)=>a-b);skin.push(vals[vals.length>>1]);}
 out[id]={size:i.width,sole,start,forefoot,height:id==='boots'?320:id==='rain'?255:185,skin,rows};
 }console.log(JSON.stringify(out,null,2));})();
