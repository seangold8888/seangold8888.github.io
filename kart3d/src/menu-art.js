// Tiny local postcards. Actual course geometry, no network images or video.
const photos = new Map();
export function coursePhoto(track) {
  if (photos.has(track.id)) return photos.get(track.id);
  const cv = document.createElement('canvas'); cv.width = 520; cv.height = 260;
  const c = cv.getContext('2d');
  const color = n => '#' + n.toString(16).padStart(6, '0');
  const night = track.id === 'night';
  const sky = c.createLinearGradient(0,0,0,260);
  sky.addColorStop(0,color(track.sky)); sky.addColorStop(1,night?'#56669f':'#fff6dd');
  c.fillStyle=sky; c.fillRect(0,0,520,260);
  const circle=(x,y,r,fill)=>{c.fillStyle=fill;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();};
  circle(428,50,26,night?'#fff3ab':'#fff5c2');
  if(night) for(let i=0;i<20;i++) circle((i*89+25)%520,15+(i*37)%100,1.8,'#fff7d7');
  else for (const x of [60,235,460]) {circle(x,63,22,'#ffffffc0');circle(x+23,70,17,'#ffffffc0');circle(x-20,72,15,'#ffffffc0');}
  c.fillStyle=color(track.ground); c.beginPath();c.moveTo(0,175);c.quadraticCurveTo(130,110,270,167);c.quadraticCurveTo(430,104,520,150);c.lineTo(520,260);c.lineTo(0,260);c.fill();
  const points=track.points, xs=points.map(p=>p[0]),zs=points.map(p=>p[2]);
  const minX=Math.min(...xs),minZ=Math.min(...zs),spanX=Math.max(...xs)-minX,spanZ=Math.max(...zs)-minZ;
  const path=()=>{c.beginPath();points.forEach((p,i)=>{const x=105+(p[0]-minX)/spanX*310,y=122+(p[2]-minZ)/spanZ*110;i?c.lineTo(x,y):c.moveTo(x,y);});c.closePath();};
  c.lineJoin='round';c.lineCap='round';path();c.strokeStyle=color(track.rail);c.lineWidth=28;c.stroke();path();c.strokeStyle=color(track.road);c.lineWidth=19;c.stroke();path();c.strokeStyle=night?'#fff5b4':'#bf9872';c.lineWidth=2;c.setLineDash([7,9]);c.stroke();c.setLineDash([]);
  for(let i=0;i<5;i++) {
    const x=35+i*104,y=155+(i%2)*50;
    if(track.id==='candy'){c.strokeStyle='#fff';c.lineWidth=5;c.beginPath();c.moveTo(x,y+30);c.lineTo(x,y);c.stroke();circle(x,y,15,i%2?'#ff6a9c':'#fff1a6');circle(x,y,7,'#ffffffa0');}
    else if(track.id==='park'||track.id==='beach'){c.fillStyle='#866047';c.fillRect(x-3,y,6,35);circle(x,y,19,track.id==='beach'?'#53b595':'#53aa73');circle(x+12,y+3,12,'#7ac88b');}
    else {circle(x,y,20,'#ffffffb0');circle(x+17,y+7,15,'#ffffffb0');}
  }
  if(track.id==='rainbow') ['#ff7c96','#ffc761','#ffe58c','#8cdbb0','#81cafa'].forEach((cl,i)=>{c.beginPath();c.arc(260,100,62-i*7,Math.PI,Math.PI*2);c.strokeStyle=cl;c.lineWidth=8;c.stroke();});
  // A physical start gantry on each miniature course.
  c.fillStyle='#27375b';c.fillRect(366,145,5,32);c.fillRect(397,145,5,32);
  for(let y=0;y<2;y++)for(let x=0;x<6;x++){c.fillStyle=(x+y)%2?'#fff':'#27375b';c.fillRect(366+x*6,145+y*6,6,6);}
  const url=cv.toDataURL('image/png');photos.set(track.id,url);return url;
}
