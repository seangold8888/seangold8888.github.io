const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const {createServer}=require('../preview-server.cjs');
(async()=>{
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 const output=process.env.MENU_QA_OUTPUT||path.resolve(__dirname,'../qa');fs.mkdirSync(output,{recursive:true});
 try{
  browser=await chromium.launch({headless:true});
  for(const [width,height,label]of [[1180,820,'ipad-landscape'],[768,1024,'ipad-portrait'],[390,844,'phone']]){
   const context=await browser.newContext({viewport:{width,height},hasTouch:true}),page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:'+server.address().port);
   await page.waitForSelector('.cm-hero');
   await page.evaluate(()=>document.fonts.ready);
   await page.evaluate(()=>Promise.all([...document.querySelectorAll('.cm-portrait[style]')].map(el=>{const img=new Image();img.src=el.style.backgroundImage.slice(5,-2);return img.decode().catch(()=>{});})));
   await page.screenshot({path:path.join(output,label+'.png'),fullPage:true});
   const layout=await page.evaluate(()=>{
    const r=document.querySelector('#menu-deploy').getBoundingClientRect(),screen=document.querySelector('.command-menu'),hero=document.querySelector('.cm-hero').getBoundingClientRect();
    return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,scrollWidth:screen.scrollWidth,clientWidth:screen.clientWidth,scrollHeight:screen.scrollHeight,clientHeight:screen.clientHeight,heroBottom:hero.bottom};
   });
   assert.ok(layout.x>=0&&layout.right<=width+.5&&layout.bottom<=height+.5,JSON.stringify(layout));
   assert.ok(layout.scrollWidth<=layout.clientWidth+1,'horizontal overflow');
   if(width>=1000)assert.ok(layout.scrollHeight<=layout.clientHeight+1,'iPad initial menu must fit one screen');
   assert.equal(await page.locator('[data-stage]').count(),10);
   assert.equal(await page.locator('.cm-details').getAttribute('open'),null);
   await page.locator('[data-hero=zhangfei]').click();
   assert.equal(await page.locator('[data-hero=zhangfei]').getAttribute('aria-pressed'),'true');
   assert.equal(await page.locator('.command-menu').count(),1,'hero selection stays on menu');
   await page.locator('[data-diff=easy]').click();
   assert.match(await page.locator('.cm-selection').innerText(),/장비/);
   await page.locator('#menu-deploy').click();await page.waitForSelector('#story-begin');
   await page.locator('#story-back').click();await page.waitForSelector('.command-menu');
   assert.equal(await page.locator('[data-hero=zhangfei]').getAttribute('aria-pressed'),'true');
   if(width<=680)await page.locator('.cm-stage-toggle').click();
   await page.locator('[data-stage=dingjunshan]').click();
   assert.ok(await page.locator('#menu-deploy').isDisabled());
   assert.match(await page.locator('.cm-unavailable').innerText(),/원화 준비 중/);
   if(width<=680)await page.locator('.cm-stage-toggle').click();
   await page.locator('[data-stage=changban]').click();
   assert.ok(await page.locator('#menu-deploy').isEnabled());
   assert.equal(await page.locator('[data-hero=zhaoyun]').getAttribute('aria-pressed'),'true');
   for(const work of ['xiyou','shuihu','sanguo']){
    await page.locator('[data-work='+work+']').click();
    assert.ok(await page.locator('[data-hero]:not(:disabled)').count()>0);
    assert.ok(await page.evaluate(()=>{const s=document.querySelector('.command-menu');return s.scrollWidth<=s.clientWidth+1;}));
   }
   await page.locator('.cm-details summary').click();
   assert.ok(await page.locator('.cm-details').evaluate(e=>e.open));
   await page.locator('#menu-deploy').focus();await page.keyboard.press('Enter');
   await page.waitForSelector('#story-begin');
   if(label==='ipad-landscape'){
    await page.locator('#story-begin').click();await page.waitForSelector('#hud');
    assert.equal(await page.locator('[data-touch-action]').count(),5);
   }
   assert.deepEqual(errors,[]);
   console.log(JSON.stringify({label,layout,passed:true}));
   await context.close();
  }
  console.log('PASS: menu layout, selection, difficulty, briefing/back, unavailable stage, recovery. '+output);
 }finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
