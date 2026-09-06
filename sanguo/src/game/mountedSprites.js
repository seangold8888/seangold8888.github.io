// A mount's horse asset is invariant. Only the transparent rider overlay changes.
const art = name => 'art/side-scroller/' + name + '.png';
export const MOUNT_PROFILES = Object.freeze({
  guanyu: { horse:art('mount-guanyu-painted-sheet-v1'), rider:art('rider-guanyu-combat-bow-v1'), label:'적토마' },
  zhaoyun: { horse:art('mount-zhaoyun-painted-sheet-v1'), rider:art('rider-zhaoyun-combat-bow-v1'), bow:art('zhaoyun-bow-painted-sheet-v1'), label:'은빛 백마' },
  caocao: { horse:art('mount-caocao-painted-sheet-v1'), rider:art('rider-caocao-combat-bow-v1'), bow:art('caocao-bow-painted-sheet-v1'), label:'흑영 전마' },
  machao: { horse:art('mount-machao-painted-sheet-v1'), rider:art('rider-machao-combat-bow-v1'), bow:art('machao-bow-painted-sheet-v1'), label:'서량 황마' },
});

export function riderPose(frame, ranged) {
  return ranged ? (frame < 3 ? 2 : 3) : (frame < 3 ? 0 : 1);
}

// Non-rectangular source regions follow the transparent gutters: a raised bow
// can extend above its nominal row without leaking into the idle rider's boots.
const rect=(x,y,w,h)=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
const RIDER_REGIONS = {
  'rider-guanyu-combat-bow-v1.png': [
    [[0,0],[600,0],[600,585],[340,585],[340,625],[0,625]],
    [[600,0],[1280,0],[1280,590],[960,590],[960,625],[600,625]],
    [[0,625],[340,625],[340,585],[600,585],[600,1280],[0,1280]],
    [[600,625],[960,625],[960,590],[1280,590],[1280,1280],[600,1280]],
  ],
  'rider-zhaoyun-combat-bow-v1.png': [
    [[0,0],[665,0],[665,110],[610,110],[610,610],[0,610]],
    [[665,0],[1280,0],[1280,590],[1000,590],[1000,625],[610,625],[610,110],[665,110]],
    rect(0,610,610,670),
    [[610,625],[1000,625],[1000,590],[1280,590],[1280,1280],[610,1280]],
  ],
  'rider-caocao-combat-bow-v1.png': [rect(0,0,600,590),rect(600,0,680,610),rect(0,590,600,690),rect(600,610,680,670)],
  'rider-machao-combat-bow-v1.png': [
    [[0,0],[660,0],[660,160],[550,160],[550,560],[0,560]],
    [[660,0],[1280,0],[1280,605],[610,605],[610,560],[550,560],[550,160],[660,160]],
    rect(0,560,610,720),rect(610,605,670,675),
  ],
};

export function drawConsistentMount(ctx, drawFrame, {horse, rider, x, y, height, facing=1, alpha=1, frame=0, ranged=false, moving=false, now=0, seatY=.53}) {
  // Attack/archery frames never select a different horse or a rearing pose.
  const horseFrame = moving ? 1 + Math.floor(now / 125) % 2 : 0;
  drawFrame(ctx, horse, horseFrame, x, y, height, facing, alpha);
  const pose = riderPose(frame,ranged), cellW=rider.width/2, cellH=rider.height/2;
  const riderHeight=height*.88, riderWidth=riderHeight*cellW/cellH;
  const saddleX=x-facing*height*.065, saddleY=y-height*seatY;
  const region=RIDER_REGIONS[rider.src?.split('/').pop()]?.[pose];
  if(region){
    const scale=riderHeight/640, ax=(pose%2)*640+320, ay=Math.floor(pose/2)*640+350;
    ctx.save();ctx.globalAlpha=alpha;ctx.translate(saddleX,saddleY);ctx.scale(facing*scale,scale);ctx.translate(-ax,-ay);
    ctx.beginPath();region.forEach(([px,py],i)=>i?ctx.lineTo(px,py):ctx.moveTo(px,py));ctx.closePath();ctx.clip();
    ctx.drawImage(rider,0,0,1280,1280);ctx.restore();return;
  }
  ctx.save();ctx.globalAlpha=alpha;ctx.translate(saddleX,saddleY);ctx.scale(facing,1);
  ctx.drawImage(rider,(pose%2)*cellW,Math.floor(pose/2)*cellH,cellW,cellH,-riderWidth*.5,-riderHeight*.62,riderWidth,riderHeight);
  ctx.restore();
}
