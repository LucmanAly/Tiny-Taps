// Optional real-browser regression. Install Playwright in a development
// environment, then: node scripts/test-babyboo-browser.mjs
// PLAYWRIGHT_MODULE and BROWSER_EXECUTABLE may point at existing installations.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import https from 'node:https';
import { execFileSync } from 'node:child_process';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'babyboo-browser-'));
const key=path.join(temp,'key.pem'),cert=path.join(temp,'cert.pem');
execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',key,'-out',cert,'-days','1','-subj','/CN=localhost'],{stdio:'ignore'});
const root=process.cwd();
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.mp3':'audio/mpeg'};
const server=https.createServer({key:fs.readFileSync(key),cert:fs.readFileSync(cert)},(req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'https://localhost').pathname);
 const file=path.resolve(root,pathname.replace(/^\/Tiny-Taps\//,'')||'index.html');
 if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403);res.end();return;}
 const target=fs.existsSync(file)&&fs.statSync(file).isDirectory()?path.join(file,'index.html'):file;
 fs.readFile(target,(err,data)=>{if(err){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',mime[path.extname(target)]||'application/octet-stream');res.end(data);});
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=`https://127.0.0.1:${server.address().port}/Tiny-Taps/`;
const browser=await chromium.launch({
 executablePath:process.env.BROWSER_EXECUTABLE||undefined,headless:true,
 args:['--no-sandbox','--ignore-certificate-errors','--disable-dev-shm-usage',...(process.env.BROWSER_EXECUTABLE?['--single-process','--in-process-gpu','--no-zygote','--disable-features=AudioServiceOutOfProcess,IsolateOrigins,site-per-process']:[])],
});
const errors=[];
const context=await browser.newContext({viewport:{width:1180,height:820},ignoreHTTPSErrors:true,hasTouch:true,deviceScaleFactor:1});
const page=await context.newPage();page.setDefaultTimeout(15000);
page.on('pageerror',e=>errors.push(e.message));
const game=page.locator('.bb-world');
const press=async name=>{
 const target=page.locator(`.bb-hit[data-target="${name}"]`);
 await target.waitFor({state:'visible'});await target.tap({force:true});
};
const data=async (key,value)=>{await page.waitForFunction(([k,v])=>document.querySelector('.bb-world')?.dataset[k]===v,[key,value]);};
async function skipIntro(){
 const intro=page.locator('.intro-screen canvas');
 await intro.tap({force:true});
 // With cached artwork the first gesture starts the audio-gated intro;
 // the second skips it. With uncached art the first gesture already skips.
 await page.waitForTimeout(100);
 if(await intro.isVisible())await intro.tap({force:true});
}
async function openGame(){
 await skipIntro();
 await page.locator('.menu-card').filter({hasText:'Baby Boo'}).waitFor();
 // Shared app launch guard deliberately ignores duplicate launches in 600 ms.
 await page.waitForTimeout(650);
 await page.locator('.menu-card').filter({hasText:'Baby Boo'}).tap({force:true});
 await game.waitFor();await game.locator('.bb-loading').waitFor({state:'hidden'});
 await page.waitForTimeout(100);
}
async function scene(direction,name){await press(direction);await data('scene',name);await page.waitForTimeout(400);}
try{
 await page.goto(url);
 // Install under a GitHub Pages-style subdirectory and wait for the app's
 // first controller claim before exercising gameplay.
 await page.waitForFunction(()=>!!navigator.serviceWorker.controller,{},{timeout:90000});
 await page.waitForTimeout(1000);await page.waitForLoadState('load');await openGame();
 await press('basket');await data('held','candy');
 await press('monster');await data('shared','true');await data('held','');
 await scene('next','path');await press('leaf');await data('held','leaf');
 // Rotate during carry; the same item remains owned by Boo.
 await page.setViewportSize({width:820,height:1180});await data('held','leaf');
 await press('boo');await data('held','leaf');
 await scene('next','pond');await press('dock');await data('boat','ready');await data('held','');
 await press('basket');await data('held','candy');await press('boat');await data('cargo','candy');
 await page.locator('.home-btn').tap();await game.waitFor({state:'detached'});
 await page.reload();await openGame();await data('scene','pond');await data('cargo','candy');
 for(let i=0;i<6;i++)await press('water');
 await data('delivered','true');await data('boat','ready');
 await scene('previous','path');await scene('previous','home');await data('completed','true');
 console.log('PASS: touch sharing, cross-scene carry, rotation, cargo save/reload, boat delivery/return and family homecoming.');

 // The new activity is an optional branch; candy and the completed boat survive.
 await press('basket');await data('held','candy');await scene('next','path');
 await scene('patch','patch');await data('boat','ready');await data('held','candy');
 await press('peekaboo');await data('peekaboo','hidden');
 const clue=page.locator('[data-target="hidden-boo"]');
 const correct=Number((await clue.getAttribute('data-action')).split(':')[1]);
 await press(`pumpkin-${(correct+1)%3}`);await data('peekaboo','hidden');await data('held','candy');
 for(const viewport of [{width:1180,height:820},{width:820,height:1180},{width:390,height:844},{width:844,height:390}]){
  await page.setViewportSize(viewport);await page.waitForTimeout(100);
  const bad=await game.locator('.bb-hit:visible').evaluateAll(buttons=>buttons.map(b=>({label:b.getAttribute('aria-label'),r:b.getBoundingClientRect().toJSON()})).filter(({r})=>r.width<47||r.height<47||r.x<-.5||r.y<-.5||r.right>innerWidth+.5||r.bottom>innerHeight+.5));
  assert.deepEqual(bad,[],`Clipped patch targets at ${viewport.width}x${viewport.height}`);
  if(process.env.BABYBOO_SCREENSHOTS){fs.mkdirSync(process.env.BABYBOO_SCREENSHOTS,{recursive:true});await page.screenshot({path:path.join(process.env.BABYBOO_SCREENSHOTS,`patch-hidden-${viewport.width}x${viewport.height}.png`)});}
 }
 await page.setViewportSize({width:1180,height:820});await page.waitForTimeout(150);
 await press('hidden-boo');await data('peekaboo','found');await data('foundBoo','true');await data('held','candy');
 if(process.env.BABYBOO_SCREENSHOTS)await page.screenshot({path:path.join(process.env.BABYBOO_SCREENSHOTS,'patch-found.png')});
 await press('monster');await data('held','');
 await page.locator('[data-target="peekaboo"]').press('Enter');await data('peekaboo','hidden');
 assert.notEqual(await clue.getAttribute('data-action'),`pumpkin:${correct}`,'Another round moves Boo to another pumpkin');
 await press(`pumpkin-${(await clue.getAttribute('data-action')).split(':')[1]}`);await data('peekaboo','found');
 await page.emulateMedia({reducedMotion:'reduce'});await press('peekaboo');await data('peekaboo','hidden');
 await scene('previous','path');await data('peekaboo','idle');
 await page.emulateMedia({reducedMotion:'no-preference'});
 // Carry/drop/reload in the new region, including an interrupted hidden round.
 await press('flower');await data('held','flower');await scene('patch','patch');
 await press('held');await data('held','');await press('peekaboo');await data('peekaboo','hidden');
 await page.reload();await openGame();await data('scene','patch');await data('peekaboo','idle');await data('foundBoo','true');
 await press('flower');await data('held','flower');await press('peekaboo');await data('peekaboo','hidden');
 const tray=await page.locator('[data-target="held"]').boundingBox();
 await page.mouse.move(tray.x+tray.width/2,tray.y+tray.height/2);await page.mouse.down();
 await page.mouse.move(470,735,{steps:14});await page.mouse.up();
 await data('peekaboo','idle');await data('held','');
 await press('flower');await data('held','flower');await scene('previous','path');await scene('previous','home');
 await press('mommy');await data('held','');
 console.log('PASS: optional Pumpkin Patch, curl clue, gentle misses, four hiding layouts, reveal/replay, candy sharing, interruption and cross-location prop saves.');

 for(const viewport of [{width:1180,height:820},{width:820,height:1180},{width:390,height:844},{width:844,height:390}]){
  await page.setViewportSize(viewport);await page.waitForTimeout(100);
  const bad=await game.locator('.bb-hit:visible').evaluateAll(buttons=>buttons.map(b=>({label:b.getAttribute('aria-label'),r:b.getBoundingClientRect().toJSON()})).filter(({r})=>r.width<47||r.height<47||r.x<-.5||r.y<-.5||r.right>innerWidth+.5||r.bottom>innerHeight+.5));
  assert.deepEqual(bad,[],`Clipped or undersized touch targets at ${viewport.width}x${viewport.height}`);
  if(process.env.BABYBOO_SCREENSHOTS){fs.mkdirSync(process.env.BABYBOO_SCREENSHOTS,{recursive:true});await page.screenshot({path:path.join(process.env.BABYBOO_SCREENSHOTS,`home-${viewport.width}x${viewport.height}.png`)});}
 }
 await page.setViewportSize({width:1180,height:820});await page.waitForTimeout(150);
 await press('again');await data('scene','path');await page.waitForTimeout(500);
 assert.equal(await game.getAttribute('data-boat'),'none');assert.ok(await game.locator('[data-target="leaf"]').isVisible());
 await page.emulateMedia({reducedMotion:'reduce'});await press('mushroom');await press('bush');
 await scene('previous','home');await page.locator('.mute-btn').tap();
 assert.equal(await page.evaluate(async()=> (await import('./js/engine/audio.js')).isMuted()),true);
 await page.locator('.bb-hit[data-target="boo"]').press('Enter');
 console.log('PASS: four responsive layouts, 48px targets, replay, reduced motion, keyboard action and shared mute.');

 // A second child gets independent memories, even if the first has finished.
 await page.evaluate(()=>localStorage.setItem('tinytaps-children',JSON.stringify({active:'c2',list:[{id:'c1',name:'One',avatar:'bunny'},{id:'c2',name:'Two',avatar:'bear'}]})));
 await page.reload();await skipIntro();
 await page.getByRole('button',{name:'Two',exact:true}).tap();await page.waitForTimeout(650);
 await page.locator('.menu-card').filter({hasText:'Baby Boo'}).tap({force:true});await game.waitFor();await game.locator('.bb-loading').waitFor({state:'hidden'});
 await data('scene','home');await data('completed','false');
 await page.evaluate(()=>localStorage.setItem('tinytaps-tap-place','0'));
 await press('basket');await page.waitForTimeout(200);assert.equal(await game.getAttribute('data-held'),'');
 // Drag still works with tap-to-place disabled.
 const from=await page.locator('[data-target="basket"]').boundingBox();const to=await page.locator('[data-target="monster"]').boundingBox();
 await page.mouse.move(from.x+from.width/2,from.y+from.height/2);await page.mouse.down();
 await page.mouse.move(to.x+to.width/2,to.y+to.height/2,{steps:14});await page.mouse.up();
 await data('shared','true');
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('tinytaps-babyboo-v1')).memories.home),true);
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('tinytaps-babyboo-v1::c2')).memories.home),false);
 console.log('PASS: drag delivery with tap-to-place off and independent per-child persistence.');

 // Restore the parent option before the separate tap-based offline flow.
 await page.evaluate(()=>localStorage.setItem('tinytaps-tap-place','1'));
 // Nothing is fetched from the network once cached, including a fresh launch.
 await context.setOffline(true);await page.reload();await skipIntro();
 await page.getByRole('button',{name:'Two',exact:true}).tap();await page.waitForTimeout(650);
 await page.locator('.menu-card').filter({hasText:'Baby Boo'}).tap({force:true});await game.waitFor();await game.locator('.bb-loading').waitFor({state:'hidden'});
 await scene('next','path');await press('leaf');await data('held','leaf');await scene('next','pond');
 await press('dock');await data('boat','ready');
 await scene('previous','path');await scene('patch','patch');
 await press('peekaboo');await data('peekaboo','hidden');await press('hidden-boo');await data('peekaboo','found');
 console.log('PASS: fresh offline app launch, all Baby Boo art, travel, leaf placement and peekaboo under /Tiny-Taps/.');
 assert.deepEqual(errors,[],`Browser errors: ${errors.join('; ')}`);
 console.log('Baby Boo browser regression passed.');
}catch(error){
 console.error('Browser state:',await page.locator('body').innerText());
 console.error('Page errors:',errors);
 if(process.env.BABYBOO_SCREENSHOTS){fs.mkdirSync(process.env.BABYBOO_SCREENSHOTS,{recursive:true});await page.screenshot({path:path.join(process.env.BABYBOO_SCREENSHOTS,'failure.png')});}
 throw error;
}finally{
 await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));fs.rmSync(temp,{recursive:true,force:true});
}
