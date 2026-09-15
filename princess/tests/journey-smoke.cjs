'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('fs'),os=require('os'),path=require('path');
(async()=>{const out=fs.mkdtempSync(path.join(os.tmpdir(),'princess-picnic-')),b=await chromium.launch({channel:'msedge',headless:true});try{
 for(const viewport of [{width:390,height:844},{width:820,height:1180},{width:1180,height:820}]){
  const c=await b.newContext({viewport,serviceWorkers:'block'}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('http://127.0.0.1:8765/princess/?heads=natural&princess=cinder&v=picnic-1');
  const saved=await p.evaluate(()=>JSON.stringify(outfits));
  await p.getByRole('button',{name:'숲속 소풍 · 공주 키우기'}).click();
  const dialog=p.locator('.pj-dialog');await dialog.getByRole('button',{name:'이 옷을 입고 출발'}).click();
  await dialog.getByRole('button',{name:/공주 접시/}).click();
  await dialog.getByRole('button',{name:'닫기',exact:true}).click();await p.reload();
  await p.getByRole('button',{name:'숲속 소풍 · 공주 키우기'}).click();assert.equal(await p.evaluate(()=>PrincessGrowth.read(localStorage).children.jaei.quest.plates[0]),1);
  await dialog.getByRole('button',{name:'나눠 담았어요'}).click();assert.match(await p.locator('.pj-status').textContent(),/두 개씩/);
  await dialog.getByRole('button',{name:'다시 담기'}).click();
  for(const who of ['공주','토끼','다람쥐'])for(let i=0;i<2;i++)await dialog.getByRole('button',{name:new RegExp(who+' 접시')}).click();
  await p.locator('.pj-art > svg').waitFor();await p.waitForTimeout(200);
  assert(await dialog.evaluate(e=>e.scrollWidth<=e.clientWidth+1),'horizontal overflow');await p.screenshot({path:path.join(out,viewport.width+'-snacks.png')});
  await dialog.getByRole('button',{name:'나눠 담았어요'}).click();await dialog.getByRole('button',{name:'반짝이는 돌 쪽으로'}).click();assert.match(await p.locator('.pj-status').textContent(),/발자국/);
  await dialog.getByRole('button',{name:'작은 발자국을 따라서'}).click();await dialog.getByRole('button',{name:'Good night.',exact:true}).click();assert.match(await p.locator('.pj-status').textContent(),/Come with me/);
  await dialog.getByRole('button',{name:'Come with me.',exact:true}).click();
  await p.locator('.pj-art > svg').waitFor();await p.waitForTimeout(300);await c.setOffline(true);
  if(viewport.width===390){
   await p.evaluate(()=>{window.qaSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===PrincessGrowth.KEY)throw Error('QuotaExceededError');return window.qaSetItem.call(this,k,v);};});
   await dialog.getByRole('button',{name:'토끼 친구와 성장 일기 남기기'}).click();
   await p.waitForFunction(()=>document.querySelector('.pj-status').textContent.includes('저장하지 못했어요'));
   assert.equal(await p.evaluate(()=>PrincessGrowth.read(localStorage).children.jaei.quest.step),4);
   assert(await dialog.getByRole('button',{name:'토끼 친구와 성장 일기 남기기'}).isEnabled());
   await p.evaluate(()=>{Storage.prototype.setItem=window.qaSetItem;delete window.qaSetItem;});
  }
  await dialog.getByRole('button',{name:'토끼 친구와 성장 일기 남기기'}).click();await dialog.getByRole('heading',{name:'첫 친구, 토끼',exact:true}).waitFor({timeout:30000});
  assert(await p.evaluate(()=>PrincessGrowth.read(localStorage).children.jaei.diary.photo.startsWith('data:image/jpeg')));
  assert.equal(await p.evaluate(()=>JSON.stringify(outfits)),saved);await p.screenshot({path:path.join(out,viewport.width+'-ending.png')});
  assert.equal(await dialog.getByRole('button',{name:'태오',exact:true}).count(),0);
  assert.equal(await p.evaluate(()=>PrincessGrowth.read(localStorage).children.taeo.friend),false);
  await dialog.getByRole('heading',{name:'첫 친구, 토끼',exact:true}).waitFor();
  assert.deepEqual(errors,[]);console.log('PASS',viewport.width,'resume, retries, complete, photo offline, independent children, wardrobe unchanged');await c.close();
 }
 const c=await b.newContext({viewport:{width:820,height:1180},serviceWorkers:'block'}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:8765/game/');
 await p.evaluate(()=>{const t=new Date();localStorage.setItem('hub2_date',t.getFullYear()+'-'+(t.getMonth()+1)+'-'+t.getDate());localStorage.setItem('hub2_solved','10');localStorage.setItem('hub2_credit','1');localStorage.setItem('hub2_parent_mode','0');localStorage.setItem('hub2_plays',JSON.stringify({princess:{n:3,d:0}}));});
 await p.evaluate(()=>{PrincessGrowth.select(localStorage,'taeo');const old=JSON.parse(localStorage.getItem(PrincessGrowth.KEY));old.children.taeo.math=7;localStorage.setItem(PrincessGrowth.KEY,JSON.stringify(old));});
 await p.reload();assert.equal(await p.locator('#princessGrowthHub').getByRole('button').count(),0);assert.match(await p.locator('#princessGrowthHub').textContent(),/재이의 공주 키우기/);
 assert.match(await p.locator('.card.princess').textContent(),/3번/);
 await p.locator('#princessGrowthHub').screenshot({path:path.join(out,'hub-growth.png')});
 await p.locator('.card.princess').click();await p.waitForURL(/princess\/\?heads=natural/);
 assert.equal(await p.evaluate(()=>localStorage.getItem('hub2_credit')),'0');assert.equal(await p.evaluate(()=>localStorage.getItem('hub2_solved')),'10');
 await p.getByRole('button',{name:'숲속 소풍 · 공주 키우기'}).click();assert.equal(await p.locator('.pj-profile').getByRole('button').count(),0);assert.match(await p.locator('.pj-profile').textContent(),/재이의 공주 키우기/);
 await p.evaluate(()=>{for(let ordinal=1;ordinal<=8;ordinal++)PrincessGrowth.record(localStorage,{day:'2026-9-15',ordinal,subject:ordinal<=3?'math':'reading'});});
 await p.locator('.pj-dialog').getByRole('button',{name:'이 옷을 입고 출발'}).click();
 await p.getByRole('button',{name:'지혜 도우미 · 두 개씩 나누기'}).click();assert.deepEqual(await p.evaluate(()=>PrincessGrowth.read(localStorage).children.jaei.quest.plates),[2,2,2]);
 assert.equal(await p.evaluate(()=>PrincessGrowth.read(localStorage).children.taeo.math),7);
 await p.getByRole('button',{name:'나눠 담았어요'}).click();await p.getByRole('button',{name:'작은 발자국을 따라서'}).click();await p.getByRole('button',{name:'말하기 도우미 · 인사말 힌트'}).click();
 assert.match(await p.locator('.pj-status').textContent(),/영어 경험/);
 assert.deepEqual(errors,[]);await c.close();console.log('PASS hub profile, preserved play history, ticket entry, natural mode, shared child, earned helpers');
 console.log('SCREENSHOTS',out);
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
