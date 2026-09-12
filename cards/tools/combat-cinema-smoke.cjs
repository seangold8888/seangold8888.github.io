"use strict";
// Isolated QA server and browser contexts; no production cheats or user saves.
const {chromium}=require("playwright");
const assert=require("node:assert/strict");
const fs=require("node:fs"),http=require("node:http"),path=require("node:path"),os=require("node:os");
const root=path.resolve(__dirname,"../.."),output=fs.mkdtempSync(path.join(os.tmpdir(),"card-cinema-"));
const server=http.createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,"http://local").pathname);
  const file=path.resolve(root,"."+pathname+(pathname.endsWith("/")?"index.html":""));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  fs.readFile(file,(error,data)=>{res.writeHead(error?404:200,{"Content-Type":({".js":"application/javascript",".html":"text/html",".css":"text/css",".json":"application/json",".png":"image/png",".webp":"image/webp"})[path.extname(file)]||"application/octet-stream"});res.end(error?"missing":data);});
});
async function main(){
  await new Promise(r=>server.listen(0,"127.0.0.1",r));
  const base="http://127.0.0.1:"+server.address().port;
  const browser=await chromium.launch({channel:"msedge",headless:true,args:["--enable-unsafe-swiftshader"]});
  async function open(card,viewport={width:820,height:1180},mode="normal"){
    const context=await browser.newContext({viewport,serviceWorkers:"block",reducedMotion:mode==="reduce"?"reduce":"no-preference"});
    await context.addInitScript(mode=>{
      localStorage.setItem("cards_bgm_muted","1");
      let engine;
      Object.defineProperty(window,"CardEngine",{configurable:true,get:()=>engine,set(value){
        engine={...value,createGame(player,enemy,options){
          // Stable non-dodging opponent: real engine, fixed opponent only in QA.
          const fixed={...enemy,hp:500,passive:null};
          return value.createGame(player,fixed,options);
        }};
      }});
      if(mode==="fallback"){
        const get=HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext=function(kind,...args){return this.id==="combatShaderCanvas"&&kind==="webgl"?null:get.call(this,kind,...args);};
      }
    },mode);
    const page=await context.newPage(),errors=[];
    page.on("pageerror",e=>errors.push(String(e)));
    await page.clock.install();
    await page.goto(base+"/cards/?preview=all&card="+card+"&battle=1");
    await page.waitForSelector("#battleScreen:not([hidden])");
    await page.clock.pauseAt(new Date(Date.now()+60000));
    await page.clock.runFor(250);
    return {page,context,errors};
  }
  try{
    for(const [card,name,profile,contact] of [
      ["zeus","번개 창","lightning",640],["arthur","바위에서 뽑은 검","blade",275],["snowqueen","서리 바늘","frost",640]
    ]){
      const {page,context,errors}=await open(card);
      await page.locator("#actionList button").filter({hasText:name}).click();
      await page.clock.runFor(contact-100);
      let status=await page.evaluate(()=>CardBattleFx.cinemaStatus());
      assert.equal(status.backend,"webgl",card+" compiled real shader");assert.equal(status.lastProfile,profile);
      assert.equal(status.contactAt,null,"no premature impact");
      await page.screenshot({path:path.join(output,profile+"-travel.png")});
      await page.clock.runFor(145);
      status=await page.evaluate(()=>CardBattleFx.cinemaStatus());
      assert.ok(status.contactAt!==null,"impact synchronized");assert.ok(status.width*status.height<=520000);
      await page.screenshot({path:path.join(output,profile+"-contact.png")});
      await page.clock.runFor(75);
      await page.screenshot({path:path.join(output,profile+"-afterglow.png")});
      assert.equal(await page.evaluate(()=>document.querySelector("#combatShaderCanvas").getContext("webgl").getError()),0);
      await page.clock.runFor(450);
      for(let i=0;i<12 && await page.locator("#leaveBattleButton").isDisabled();i++){
        if(await page.locator("#coinDialog").isVisible())await page.locator("#coinButton").click();
        await page.clock.runFor(500);
      }
      await page.locator("#leaveBattleButton").click();
      assert.equal(await page.evaluate(()=>CardBattleFx.cinemaStatus().active),false,"leaving battle cancels shader");
      assert.deepEqual(errors,[]);
      console.log("PASS",profile,status.width+"x"+status.height,status.frames+" frames");
      // Standalone same renderer, deterministic pixels + context loss + miss guards.
      await page.evaluate(()=>{
        window.__qaPlan={emoji:"⚡",kind:"projectile",outcome:"hit",impactAtMs:640,totalMs:840};
        window.__qaCanvas=document.createElement("canvas");
        __qaCanvas.style.cssText="position:fixed;inset:0;width:600px;height:500px;z-index:999";
        document.body.append(__qaCanvas);
        window.__qaCinema=CardCombatCinema.create(__qaCanvas);
        window.__qaPoints={startX:100,startY:350,endX:450,endY:100};
        __qaCinema.start(__qaPlan,__qaPoints);
        // QA-only instrumentation reads the framebuffer immediately after each draw.
        const gl=__qaCanvas.getContext("webgl"),draw=gl.drawArrays.bind(gl);
        gl.drawArrays=(...args)=>{draw(...args);const pixels=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,pixels);window.__lit=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]>25)__lit++;};
      });
      await page.clock.runFor(300);
      assert.ok(await page.evaluate(()=>__lit)>500,"shader produces visible pixels");
      await page.clock.runFor(600);
      assert.equal(await page.evaluate(()=>__qaCinema.inspect().active),false,"shader sleeps between actions");
      await page.evaluate(()=>__qaCinema.start(__qaPlan,__qaPoints));
      await page.evaluate(()=>{__qaPlan.outcome="miss";__qaCinema.impact(__qaPlan);});
      assert.equal(await page.evaluate(()=>__qaCinema.inspect().contactAt),null,"miss does not flash");
      await page.evaluate(()=>{window.__loss=__qaCanvas.getContext("webgl").getExtension("WEBGL_lose_context");__loss.loseContext();});
      await page.waitForFunction(()=>__qaCinema.inspect().backend==="lost");
      assert.equal(await page.evaluate(()=>__qaCinema.inspect().active),false);
      await page.evaluate(()=>__loss.restoreContext());
      await page.waitForFunction(()=>__qaCinema.inspect().backend==="idle");
      assert.ok(await page.evaluate(()=>__qaCinema.start(__qaPlan,__qaPoints)),"context restored");
      await page.evaluate(()=>window.dispatchEvent(new Event("resize")));
      assert.equal(await page.evaluate(()=>__qaCinema.inspect().active),false);
      await context.close();
    }
    for(const [mode,viewport] of [["fallback",{width:820,height:1180}],["reduce",{width:820,height:1180}],["normal",{width:1180,height:820}],["normal",{width:390,height:844}]]){
      const {page,context,errors}=await open("zeus",viewport,mode);
      await page.locator("#actionList button").filter({hasText:"번개 창"}).click();
      await page.clock.runFor(685);
      const status=await page.evaluate(()=>CardBattleFx.cinemaStatus());
      if(mode==="fallback")assert.equal(status.backend,"fallback");
      if(mode==="reduce")assert.equal(status.active,false);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      if(viewport.width>=800)assert.ok(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1),"iPad no page scrolling");
      await page.screenshot({path:path.join(output,mode+"-"+viewport.width+".png"),fullPage:true});
      assert.deepEqual(errors,[]);await context.close();
      console.log("PASS",mode,viewport);
    }
    // Render the real synthesis graph, measure samples rather than just source text.
    for(const profile of ["lightning","blade","frost"]){
      const context=await browser.newContext({serviceWorkers:"block"});
      const page=await context.newPage();
      await page.goto(base+"/cards/js/combat-cinema.js");
      await page.addScriptTag({content:`
        localStorage.setItem("cards_bgm_muted","1");
        window.AudioContext=class extends OfflineAudioContext{
          constructor(){super(2,44100,44100);window.__offline=this;}
          resume(){return Promise.resolve();}
        };
      `});
      await page.addScriptTag({url:base+"/cards/js/audio.js"});
      const result=await page.evaluate(async profile=>{
        CardAudio.prime();
        CardAudio.techniqueImpact({cinemaProfile:profile,kind:"burst",type:"magic",emoji:"⚡",outcome:"hit",big:true,impactAtMs:350,totalMs:800});
        const buffer=await __offline.startRendering(),a=buffer.getChannelData(0);
        let peak=0,squares=0;for(const v of a){peak=Math.max(peak,Math.abs(v));squares+=v*v;}
        return {peak,rms:Math.sqrt(squares/a.length),samples:Array.from(a)};
      },profile);
      assert.ok(result.peak>.001 && result.peak<.95,profile+" audible/no clipping");
      const pcm=Buffer.alloc(44+result.samples.length*2);
      pcm.write("RIFF",0);pcm.writeUInt32LE(pcm.length-8,4);pcm.write("WAVEfmt ",8);
      pcm.writeUInt32LE(16,16);pcm.writeUInt16LE(1,20);pcm.writeUInt16LE(1,22);pcm.writeUInt32LE(44100,24);pcm.writeUInt32LE(88200,28);pcm.writeUInt16LE(2,32);pcm.writeUInt16LE(16,34);pcm.write("data",36);pcm.writeUInt32LE(result.samples.length*2,40);
      result.samples.forEach((v,i)=>pcm.writeInt16LE(Math.round(Math.max(-1,Math.min(1,v))*32767),44+i*2));
      fs.writeFileSync(path.join(output,profile+".wav"),pcm);
      console.log("PASS audio",profile,{peak:result.peak,rms:result.rms});await context.close();
    }
    console.log("Artifacts:",output);
  } finally {await browser.close();server.close();}
}
main().catch(error=>{console.error(error);server.close();process.exitCode=1;});
