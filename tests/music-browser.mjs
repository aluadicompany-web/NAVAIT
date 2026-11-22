import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','5192','--strictPort'],{stdio:'pipe'});
let browser, strictBrowser;
const ready = page => page.waitForFunction(()=>document.querySelector('#music-toggle').dataset.state==='playing' && !document.querySelector('#river-music').paused && document.querySelector('#river-music').currentTime>0,{},{timeout:20000});
const visibility = (page,hidden)=>page.evaluate(hidden=>{if(hidden)Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});else delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));},hidden);
try {
  for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:5192')).ok)break;}catch{}if(server.exitCode!==null)throw Error('Preview startup failed');await new Promise(r=>setTimeout(r,100));}
  await mkdir('/tmp/navait-music-qa',{recursive:true});
  const launch={executablePath:process.env.BROWSER_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']};
  browser=await chromium.launch(launch);
  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  await context.addInitScript(()=>localStorage.setItem('navait.music.muted.v1','true'));
  const page=await context.newPage(), errors=[], external=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',request=>{const url=new URL(request.url());if(url.protocol.startsWith('http')&&url.hostname!=='127.0.0.1')external.push(url.hostname);});
  await page.goto('http://127.0.0.1:5192');
  await ready(page);
  const media=await page.locator('#river-music').evaluate(a=>({src:a.currentSrc,volume:a.volume,loop:a.loop,autoplay:a.autoplay,controls:a.controls,duration:a.duration}));
  assert.equal(media.volume,.25);assert.equal(media.loop,true);assert.equal(media.autoplay,true);assert.equal(media.controls,false);assert.ok(Math.abs(media.duration-390.58)<1);
  assert.equal(new URL(media.src).origin,'http://127.0.0.1:5192');assert.ok(new URL(media.src).pathname.endsWith('.mp3'));
  assert.equal(await page.locator('iframe,#music-panel').count(),0);assert.equal(await page.locator('#music-status').isVisible(),false);
  const range=await fetch(media.src,{headers:{Range:'bytes=0-1023'}});
  assert.equal(range.status,206);assert.match(range.headers.get('content-type'),/audio\/mpeg/);assert.equal((await range.arrayBuffer()).byteLength,1024);
  // Measure decoded audio from the actual shipped MP3, not a mock player or test tone.
  await page.evaluate(async()=>{
    const a=document.querySelector('#river-music');a.currentTime=30;
    const ctx=new AudioContext();await ctx.resume();
    const source=ctx.createMediaElementSource(a), analyser=ctx.createAnalyser();
    source.connect(analyser);analyser.connect(ctx.destination);window.__musicAnalyser=analyser;window.__musicContext=ctx;
  });
  await page.waitForFunction(()=>{const samples=new Float32Array(1024);window.__musicAnalyser.getFloatTimeDomainData(samples);return samples.some(v=>Math.abs(v)>.001);},null,{timeout:15000});
  await page.screenshot({path:'/tmp/navait-music-qa/local-mp3-desktop.png'});
  await visibility(page,true);await page.waitForFunction(()=>document.querySelector('#river-music').paused);
  const pausedAt=await page.locator('#river-music').evaluate(a=>a.currentTime);await page.waitForTimeout(300);
  assert.ok(Math.abs(await page.locator('#river-music').evaluate(a=>a.currentTime)-pausedAt)<.08);
  await visibility(page,false);await ready(page);
  await page.locator('#music-toggle').click();assert.equal(await page.locator('#river-music').evaluate(a=>a.paused),true);
  await visibility(page,true);await visibility(page,false);
  await page.locator('#name').click();await page.keyboard.type('ปิดไว้ในหน้านี้');
  assert.equal(await page.locator('#river-music').evaluate(a=>a.paused),true,'mute must hold within the current visit');
  await page.reload();await ready(page);
  assert.equal(await page.locator('#music-toggle').getAttribute('aria-label'),'ปิดเพลงประกอบ');
  await page.locator('#open-fair').click();await page.locator('.fair-room').waitFor();assert.equal(await page.locator('#river-music').evaluate(a=>a.paused),true);
  await page.locator('#leave-fair').click();await ready(page);
  await page.locator('#name').fill('เพลงริมแม่น้ำ');await page.locator('#launch-form button[type=submit]').click();await page.locator('#after').waitFor({state:'visible',timeout:45000});
  await page.locator('#enter-temple').click();await page.locator('.temple-room').waitFor();assert.equal(await page.locator('#river-music').evaluate(a=>a.paused),true);
  await page.locator('#leave-temple').click();await ready(page);
  for(const width of [320,390]){
    await page.setViewportSize({width,height:844});
    const boxes=await page.locator('#music-toggle,#sound-toggle,#open-fair,#about').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right};}));
    for(const b of boxes)assert.ok(b.left>=-1&&b.right<=width+1,`header overflows ${width}px`);
  }
  await page.screenshot({path:'/tmp/navait-music-qa/local-mp3-mobile.png'});
  // The real media clock must wrap at the end of the supplied six-minute song.
  await page.locator('#river-music').evaluate(a=>a.currentTime=a.duration-.2);
  await page.waitForFunction(()=>{const a=document.querySelector('#river-music');return a.currentTime<3&&!a.paused;},null,{timeout:15000});
  await page.locator('#music-toggle').click();
  await page.evaluate(()=>dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));assert.equal(await page.locator('#river-music').evaluate(a=>a.paused),true);
  await page.evaluate(()=>dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));await ready(page);
  assert.deepEqual(external,[],'music must not contact YouTube or any external service');assert.deepEqual(errors,[]);
  await context.close();
  // Exercise a genuine browser autoplay denial and trusted touchscreen/keyboard unlock.
  strictBrowser=await chromium.launch({...launch,args:['--no-sandbox','--enable-unsafe-swiftshader','--autoplay-policy=document-user-activation-required']});
  for(const input of ['touch','keyboard']){
    const blocked=await strictBrowser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
    const p=await blocked.newPage();await p.goto('http://127.0.0.1:5192');
    await p.waitForFunction(()=>document.querySelector('#music-toggle').dataset.state==='blocked');
    await p.evaluate(()=>document.dispatchEvent(new MouseEvent('click',{bubbles:true})));
    assert.equal(await p.locator('#river-music').evaluate(a=>a.paused),true);
    if(input==='touch')await p.locator('#name').tap();else{await p.locator('#name').focus();await p.keyboard.press('KeyA');await p.keyboard.type('สุขใจ');}
    await ready(p);
    await p.locator('#music-toggle').tap();await p.locator('#name').tap();await p.keyboard.type('ปิดไว้');
    assert.equal(await p.locator('#river-music').evaluate(a=>a.paused),true);await blocked.close();
  }
  const broken=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await broken.route('**/*.mp3',route=>route.fulfill({contentType:'audio/mpeg',body:Buffer.from('not-an-mp3')}));
  const failed=await broken.newPage();await failed.goto('http://127.0.0.1:5192');
  await failed.waitForFunction(()=>document.querySelector('#music-toggle').dataset.state==='error');
  assert.match(await failed.locator('#music-status').textContent(),/โหลดเพลงไม่สำเร็จ/);
  await broken.unroute('**/*.mp3');await failed.locator('#music-toggle').click();await ready(failed);await broken.close();
  const race=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  let release;const gate=new Promise(resolve=>{release=resolve;});
  await race.route('**/*.mp3',async route=>{await gate;await route.continue();});
  const pending=await race.newPage();await pending.goto('http://127.0.0.1:5192',{waitUntil:'domcontentloaded'});
  await pending.locator('#music-toggle').click();release();await pending.waitForTimeout(500);
  assert.equal(await pending.locator('#river-music').evaluate(a=>a.paused),true);assert.equal(await pending.locator('#music-toggle').getAttribute('data-state'),'off');await race.close();
  console.log('PASS local MP3 music: real decode, signal and playback clock; real loop; HTTP range support; no video/YouTube/external requests; default autoplay; actual browser autoplay denial; touch/keyboard unlock; reset mute on each entry/reload/history return; current-visit mute; hidden-tab and fair/temple pause/resume; pagehide/pageshow; error retry; mute-during-load race. Screenshots: /tmp/navait-music-qa');
} finally {await browser?.close();await strictBrowser?.close();server.kill();}
