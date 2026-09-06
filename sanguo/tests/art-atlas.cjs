const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {chromium}=require('playwright'),{createServer}=require('../preview-server.cjs');
const source=fs.readFileSync(path.join(__dirname,'../src/game/sideScroller.js'),'utf8');
const start=source.indexOf('const PAINTED_FRAME_LAYOUTS = '),end=source.indexOf('function drawAtlasFrame',start);
const layouts=vm.runInNewContext(source.slice(start,end)+';PAINTED_FRAME_LAYOUTS;');
const genericFrames=[[0,0,640,640],[640,0,640,640],[0,640,640,640],[640,640,640,640]];
const representativeArt='xiahoudun-painted-sheet-v1 xiahoudun-bow-painted-sheet-v1 zhangliao-painted-sheet-v1 zhangliao-bow-painted-sheet-v1 xuchu-painted-sheet-v1 xuchu-bow-painted-sheet-v1 simayi-painted-sheet-v1 simayi-bow-painted-sheet-v1 sunquan-painted-sheet-v1 sunquan-bow-painted-sheet-v1 taishici-painted-sheet-v1 taishici-bow-painted-sheet-v1 ganning-painted-sheet-v1 ganning-bow-painted-sheet-v1 luxun-painted-sheet-v1 zhouyu-bow-painted-sheet-v1 huanggai-bow-painted-sheet-v1'.split(' ').map(name=>name+'.png');
for(const name of representativeArt)layouts[name]=genericFrames;
const genericEdgeBudget=Object.fromEntries(representativeArt.map(name=>[name,name==='xuchu-painted-sheet-v1.png'?210:60]));
(async()=>{
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true});const page=await browser.newPage();
  await page.goto('http://127.0.0.1:'+server.address().port);
  const results=await page.evaluate(async layouts=>{
   const results=[];
   for(const [name,frames]of Object.entries(layouts)){
    const image=new Image();image.src='art/side-scroller/'+name;await image.decode();
    const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
    const rgba=ctx.getImageData(0,0,canvas.width,canvas.height).data,unit=image.width/1280;
    let transparent=0;for(let i=3;i<rgba.length;i+=4)if(rgba[i]===0)transparent++;
    const edgeCounts=frames.map(([sx,sy,sw,sh])=>{
     [sx,sy,sw,sh]=[sx,sy,sw,sh].map(v=>Math.round(v*unit));let count=0;
     const solid=(x,y)=>rgba[(y*canvas.width+x)*4+3]>127;
     for(let x=sx;x<sx+sw;x++)count+=solid(x,sy)+solid(x,sy+sh-1);
     for(let y=sy;y<sy+sh;y++)count+=solid(sx,y)+solid(sx+sw-1,y);
     return count;
    });
    results.push({name,transparent:transparent/(image.width*image.height),edgeCounts});
   }return results;
  },layouts);
  for(const result of results){
   assert.ok(result.transparent>.2,result.name+' alpha');
   // Original hand-trimmed atlases must be perfectly inset. The new painted poses
   // keep a tightly framed weapon tip; their measured edge allowance prevents a
   // full background or neighboring pose from leaking into a frame.
   if(genericEdgeBudget[result.name]!==undefined)assert.ok(result.edgeCounts.every(count=>count<=genericEdgeBudget[result.name]),result.name+' clipped pose');
   else assert.deepEqual(result.edgeCounts,[0,0,0,0],result.name+' clipped pose');
   console.log(JSON.stringify(result));
  }
 }finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
