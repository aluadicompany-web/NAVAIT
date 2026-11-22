import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5189','--strictPort'],{stdio:'pipe',env:{...process.env,VITE_SUPABASE_URL:'',VITE_SUPABASE_PUBLISHABLE_KEY:''}});
let browser;
try {
  for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:5189')).ok)break;}catch{}if(server.exitCode!==null)throw Error('Vite startup failed');await new Promise(r=>setTimeout(r,100));}
  await mkdir('/tmp/navait-evolution-qa',{recursive:true});
  browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  await context.addInitScript(()=>localStorage.setItem("navait.music.muted.v1","true"));
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5189');
  await page.waitForFunction(()=>document.querySelectorAll('.choice img[src^="data:image/png"]').length===12);
  assert.equal(await page.locator('.choice').count(),12);
  assert.equal(new Set(await page.locator('.choice img').evaluateAll(images=>images.map(i=>i.src))).size,12);
  await page.locator('[data-design="9"]').scrollIntoViewIfNeeded();
  await page.screenshot({path:'/tmp/navait-evolution-qa/designs-desktop.png'});
  const original=await page.evaluate(()=>{
    const items=Array.from({length:30},(_,i)=>({id:`legacy-${i}`,name:`คนที่ ${i}`,wish:`keep wish ${i}`,design:i%12,color:1,x:.65,y:.66,created:Date.now()}));
    const value=JSON.stringify(items);localStorage.setItem('navait.krathongs.v1',value);return value;
  });
  await page.reload();
  await page.waitForFunction(()=>document.querySelectorAll('.boat-label:not(.sample)').length===30&&[...document.querySelectorAll('.boat-label')].every(l=>l.style.transform));
  const positions=()=>page.locator('.boat-label').evaluateAll(labels=>labels.map(l=>{const r=l.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),name:l.textContent};}));
  const first=await positions();
  assert.equal(new Set(first.map(p=>`${p.x},${p.y}`)).size,30);
  assert.ok(new Set(first.map(p=>p.x)).size>20, 'boats must not align in a few columns');
  assert.ok(new Set(first.map(p=>p.y)).size>20, 'boats must not align in a few rows');
  assert.ok(Math.max(...first.map(p=>p.x))-Math.min(...first.map(p=>p.x))>800);
  assert.equal(await page.evaluate(()=>localStorage.getItem('navait.krathongs.v1')),original);
  await page.screenshot({path:'/tmp/navait-evolution-qa/spread-desktop.png'});
  await page.reload();await page.waitForFunction(()=>document.querySelectorAll('.boat-label').length===30&&[...document.querySelectorAll('.boat-label')].every(l=>l.style.transform));
  assert.deepEqual(await positions(),first);
  assert.equal(await page.evaluate(()=>localStorage.getItem('navait.krathongs.v1')),original);
  await page.setViewportSize({width:390,height:844});
  await page.waitForTimeout(500);
  await page.screenshot({path:'/tmp/navait-evolution-qa/spread-mobile.png'});
  // New IDs must survive the same local save/read path as the original nine.
  for(const design of [9,10,11]) {
    await page.locator(`[data-design="${design}"]`).click();
    await page.locator('#name').fill(`แบบใหม่ ${design}`);
    await page.locator('#launch-form button[type=submit]').click();
    await page.locator('#after').waitFor({state:'visible',timeout:45000});
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('navait.krathongs.v1')).at(-1).design),design);
    if(design!==11)await page.locator('#again').click();
  }
  await page.locator('#enter-temple').click();
  await page.locator('.temple-room').waitFor();
  await page.waitForTimeout(1000);
  await page.screenshot({path:'/tmp/navait-evolution-qa/altar-mobile.png'});
  await page.setViewportSize({width:1440,height:900});await page.waitForTimeout(500);
  await page.screenshot({path:'/tmp/navait-evolution-qa/altar-desktop.png'});
  const decor=await page.evaluate(async()=>{
    const {TempleInterior}=await import('/src/render/temple-interior.ts');
    const {ROOM}=await import('/src/temple-state.ts');
    const T=await import('/node_modules/three/build/three.module.js');
    const interior=new TempleInterior(),decor=interior.group.userData.altarDecor;
    const markerColors=[0xdcb38e,0xc77b32,0xa95b28,0xe1a18f].map(c=>new T.Color(c));
    let front=-Infinity,vertices=0;
    interior.group.updateMatrixWorld(true);
    interior.group.traverse(mesh=>{
      const positions=mesh.geometry?.getAttribute('position'),colors=mesh.geometry?.getAttribute('color');
      if(!positions||!colors)return;
      for(let i=0;i<positions.count;i++)if(markerColors.some(c=>Math.abs(colors.getX(i)-c.r)<1e-6&&Math.abs(colors.getY(i)-c.g)<1e-6&&Math.abs(colors.getZ(i)-c.b)<1e-6)){
        const p=new T.Vector3().fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld);front=Math.max(front,p.z);vertices++;
      }
    });
    const clear=vertices>100&&front<ROOM.minZ-.4;
    interior.dispose();return {...decor,clear,front,vertices};
  });
  assert.equal(decor.monks,1);assert.ok(decor.flowerBowls>=12);assert.equal(decor.clear,true);
  await page.locator('#leave-temple').click();
  assert.deepEqual(errors,[]);
  console.log('PASS evolution: 12 distinct 3D previews; 30 legacy boats spread deterministically on reload without rewriting data; all 3 new designs save locally; monk and flower ring clear walking bounds. Screenshots: /tmp/navait-evolution-qa');
} finally {await browser?.close();server.kill();}
