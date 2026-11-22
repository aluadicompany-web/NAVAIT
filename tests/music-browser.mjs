import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5192','--strictPort'],{stdio:'pipe',env:{...process.env,VITE_SUPABASE_URL:'',VITE_SUPABASE_PUBLISHABLE_KEY:''}});
let browser;
const mockAPI=`
window.__musicPlayers=[];
window.YT={Player:class {
 constructor(el,options){
  this.options=options;this.log=[];this.destroyed=false;this.frame=document.createElement('iframe');
  this.frame.src='https://www.youtube-nocookie.com/embed/'+options.videoId;
  this.frame.width=String(options.width);this.frame.height=String(options.height);el.replaceWith(this.frame);
  window.__musicPlayers.push(this);
  this.listener=e=>{if(e.source!==this.frame.contentWindow)return;if(e.data==='mock-play'){window.__musicMode='normal';this.playVideo();}if(e.data==='mock-pause')this.pauseVideo();};
  window.addEventListener('message',this.listener);
  setTimeout(()=>{if(!this.destroyed){options.events.onReady({target:this});if(window.__musicMode==='error')options.events.onError({target:this,data:101});}},50);
 }
 getIframe(){return this.frame;}
 setVolume(n){this.volume=n;}
 playVideo(){this.log.push('play');if(window.__musicMode==='blocked'){this.options.events.onAutoplayBlocked({target:this});return;}this.options.events.onStateChange({target:this,data:1});}
 pauseVideo(){this.log.push('pause');this.options.events.onStateChange({target:this,data:2});}
 destroy(){this.log.push('destroy');this.destroyed=true;this.frame.remove();window.removeEventListener('message',this.listener);}
}};
window.onYouTubeIframeAPIReady?.();
`;
try {
  for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:5192')).ok)break;}catch{}if(server.exitCode!==null)throw Error('Vite startup failed');await new Promise(r=>setTimeout(r,100));}
  await mkdir('/tmp/navait-music-qa',{recursive:true});
  browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  let requests=0;
  await context.route('https://www.youtube.com/iframe_api',route=>{requests++;return route.fulfill({contentType:'text/javascript',body:mockAPI});});
  await context.route('https://www.youtube-nocookie.com/embed/*',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:'<!doctype html><meta charset="utf-8"><html lang="th"><body style="margin:0;background:#122e39;color:#ffedc5;font:14px sans-serif;display:grid;place-content:center;height:100vh;text-align:center"><p>YouTube · ตัวเล่นจำลองสำหรับ QA</p><button onclick="parent.postMessage(\'mock-play\',\'*\')">เล่น</button><button onclick="parent.postMessage(\'mock-pause\',\'*\')">พัก</button></body></html>'}));
  const page=await context.newPage(), errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5192');
  assert.equal(requests,0);assert.equal(await page.locator('#music-panel').isVisible(),false);
  await page.locator('#music-toggle').click();
  await page.waitForFunction(()=>document.querySelector('#music-panel').dataset.state==='playing');
  assert.equal(requests,1);
  const options=await page.evaluate(()=>{const p=window.__musicPlayers[0];return {videoId:p.options.videoId,vars:p.options.playerVars,volume:p.volume};});
  assert.equal(options.videoId,'95s3Y8nVMV4');assert.equal(options.vars.autoplay,0);assert.equal(options.vars.loop,1);assert.equal(options.vars.playlist,'95s3Y8nVMV4');assert.equal(options.volume,25);
  const frame=page.locator('#music-panel iframe');
  const bounds=await frame.boundingBox();assert.ok(bounds.width>=200&&bounds.height>=200);
  await page.screenshot({path:'/tmp/navait-music-qa/desktop.png'});
  const visibility=hidden=>page.evaluate(hidden=>{if(hidden)Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});else delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));},hidden);
  await visibility(true);await page.waitForFunction(()=>document.querySelector('#music-toggle').getAttribute('aria-pressed')==='false');
  await visibility(false);await page.waitForFunction(()=>document.querySelector('#music-toggle').getAttribute('aria-pressed')==='true');
  await page.frameLocator('#music-panel iframe').getByRole('button',{name:'พัก',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#music-toggle').getAttribute('aria-pressed')==='false');
  const plays=await page.evaluate(()=>window.__musicPlayers[0].log.filter(x=>x==='play').length);
  await visibility(true);await visibility(false);
  assert.equal(await page.evaluate(()=>window.__musicPlayers[0].log.filter(x=>x==='play').length),plays,'manual pause must survive a tab switch');
  await page.frameLocator('#music-panel iframe').getByRole('button',{name:'เล่น',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#music-panel').dataset.state==='playing');
  await page.locator('#open-fair').click();await page.locator('.fair-room').waitFor();
  assert.equal(await page.locator('#music-toggle').getAttribute('aria-pressed'),'false');
  await page.locator('#leave-fair').click();await page.waitForFunction(()=>document.querySelector('#music-toggle').getAttribute('aria-pressed')==='true');
  await page.locator('#name').fill('ฟังเพลงริมแม่น้ำ');await page.locator('#launch-form button[type=submit]').click();await page.locator('#after').waitFor({state:'visible',timeout:45000});
  await page.locator('#enter-temple').click();await page.locator('.temple-room').waitFor();
  assert.equal(await page.locator('#music-toggle').getAttribute('aria-pressed'),'false');
  await page.locator('#leave-temple').click();await page.waitForFunction(()=>document.querySelector('#music-toggle').getAttribute('aria-pressed')==='true');
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'/tmp/navait-music-qa/mobile.png'});
  for(const width of [320,390]){
    await page.setViewportSize({width,height:844});
    const boxes=await page.locator('#music-toggle,#open-fair,#sound-toggle,#about,#music-panel iframe').evaluateAll(els=>els.map(el=>{const b=el.getBoundingClientRect();return {left:b.left,right:b.right,width:b.width,height:b.height};}));
    for(const box of boxes)assert.ok(box.left>=-1&&box.right<=width+1,`control overflows ${width}px: ${JSON.stringify(box)}`);
    assert.ok(boxes.at(-1).width>=200&&boxes.at(-1).height>=200);
  }
  await page.locator('.music-close').click();assert.equal(await page.locator('#music-panel').isVisible(),false);assert.equal(await page.locator('#music-panel iframe').count(),0);
  await page.evaluate(()=>window.__musicMode='blocked');await page.locator('#music-toggle').click();
  await page.waitForFunction(()=>document.querySelector('#music-panel').dataset.state==='blocked');
  assert.match(await page.locator('.music-status').textContent(),/กด ▶/);
  await page.frameLocator('#music-panel iframe').getByRole('button',{name:'เล่น',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#music-panel').dataset.state==='playing');
  await page.locator('.music-close').click();
  await page.evaluate(()=>window.__musicMode='error');await page.locator('#music-toggle').click();
  await page.waitForFunction(()=>document.querySelector('#music-panel').dataset.state==='error');assert.match(await page.locator('.music-status').textContent(),/ไม่อนุญาต/);
  assert.equal(await page.locator('.music-footer a').getAttribute('href'),'https://www.youtube.com/watch?v=95s3Y8nVMV4');
  await page.evaluate(()=>window.__musicMode='normal');await page.locator('.music-retry').click();await page.waitForFunction(()=>document.querySelector('#music-panel').dataset.state==='playing');
  await page.evaluate(()=>dispatchEvent(new Event('pagehide')));assert.equal(await page.locator('#music-panel iframe').count(),0);
  assert.deepEqual(errors,[]);
  // Closing during API loading must not start music after the async response arrives.
  const race=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  let releaseAPI;const apiGate=new Promise(resolve=>{releaseAPI=resolve;});
  await race.route('https://www.youtube.com/iframe_api',async route=>{await apiGate;await route.fulfill({contentType:'text/javascript',body:mockAPI});});
  const racePage=await race.newPage();await racePage.goto('http://127.0.0.1:5192');
  await racePage.locator('#music-toggle').click();await racePage.locator('.music-close').click();releaseAPI();await racePage.waitForFunction(()=>Array.isArray(window.__musicPlayers));
  assert.equal(await racePage.locator('#music-panel iframe').count(),0);assert.equal(await racePage.evaluate(()=>window.__musicPlayers.length),0);await race.close();
  // Network denial must leave a usable retry and original YouTube link.
  const denied=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await denied.route('https://www.youtube.com/iframe_api',route=>route.abort('blockedbyclient'));
  const deniedPage=await denied.newPage();await deniedPage.goto('http://127.0.0.1:5192');await deniedPage.locator('#music-toggle').click();
  await deniedPage.waitForFunction(()=>document.querySelector('#music-panel').dataset.state==='error');
  assert.equal(await deniedPage.locator('.music-retry').isVisible(),true);await denied.close();
  console.log('PASS music (mocked YouTube): explicit opt-in; supplied video/loop/volume; visible player; desktop/mobile controls; visibility and manual pause; fair/temple pause/resume; close/pagehide cleanup; blocked autoplay; embed denial/retry; network denial; close-during-load race. Actual YouTube playback is not verified. Screenshots: /tmp/navait-music-qa');
} finally {await browser?.close();server.kill();}
