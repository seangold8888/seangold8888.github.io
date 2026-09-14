'use strict';
// Run against the local preview server, or pass PRINCESS_BASE_URL.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
(async()=>{
  const output=fs.mkdtempSync(path.join(os.tmpdir(),'princess-icons-'));
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    for(const viewport of [{width:1180,height:820},{width:820,height:1180},{width:390,height:844}]){
      const page=await browser.newPage({viewport,serviceWorkers:'block'}),errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.goto((process.env.PRINCESS_BASE_URL||'http://127.0.0.1:8765')+'/princess/?v=icons-v1');
      assert.equal(await page.locator('#tabs .wardrobe-icon').count(),10);
      for(const key of ['hair','dress','shoes','crown','neck','hand','back','pet','bg','princess']){
        const button=page.locator('#tabs [data-key='+key+']');await button.click();
        assert.equal(await button.getAttribute('aria-pressed'),'true');
        const box=await button.boundingBox();assert.ok(box.width>=44&&box.height>=44,'touch target '+key);
      }
      const geometry=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,panel:document.querySelector('#panel').getBoundingClientRect().right,stage:document.querySelector('#stage').getBoundingClientRect().right}));
      assert.ok(geometry.scroll<=geometry.width,JSON.stringify(geometry));
      assert.ok(geometry.panel<=geometry.width&&geometry.stage<=geometry.width,JSON.stringify(geometry));
      assert.ok((await page.locator('#items .item').first().boundingBox()).height>=126,'portrait choices must scroll rather than squash');
      assert.deepEqual(errors,[]);
      await page.waitForTimeout(1500); // Allow the painted doll assets to decode for the review screenshot.
      await page.screenshot({path:path.join(output,viewport.width+'.png')});
      await page.locator('#tabs').screenshot({path:path.join(output,viewport.width+'-tabs.png')});
      console.log('PASS',viewport.width,'ten categories, selection, touch targets, no horizontal overflow');
      await page.close();
    }
    console.log('SCREENSHOTS',output);
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
