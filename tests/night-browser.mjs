import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';import {mkdir} from 'node:fs/promises';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5194','--strictPort'],{stdio:'pipe',env:{...process.env,VITE_SUPABASE_URL:'',VITE_SUPABASE_PUBLISHABLE_KEY:''}});let browser;
try{
for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:5194')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.goto('http://127.0.0.1:5194');await page.waitForFunction(()=>document.querySelector('#river').dataset.backgroundReady==='true');await page.locator('#music-toggle').click();await page.waitForTimeout(1200);await mkdir('/tmp/navait-night-qa',{recursive:true});await page.screenshot({path:'/tmp/navait-night-qa/desktop.png'});console.log(JSON.stringify({errors,metrics:await page.locator('#river').evaluate(e=>({...e.dataset}))}));
const checks=await page.evaluate(async()=>{
 const {NightSky}=await import('/src/render/night-sky.ts');
 const T=await import('/node_modules/three/build/three.module.js');
 const {createKrathong,disposeModel}=await import('/src/render/krathong.ts');
 const host=document.createElement('div'),sky=new NightSky(host);
 const renderer=new T.WebGLRenderer({alpha:true,preserveDrawingBuffer:true});renderer.setSize(400,200);
 const scene=new T.Scene(),camera=new T.Camera();scene.add(sky.group);sky.resize(400,200,1);
 const snapshot=t=>{sky.update(t);renderer.render(scene,camera);return renderer.domElement.toDataURL();};
 const first=snapshot(1),frozenPixels=first===snapshot(1),twinkling=first!==snapshot(3);
 renderer.dispose();
 sky.resize(1440,900,1.5);const desktop=sky.stars.geometry.drawRange.count;
 const phases=new Set(sky.stars.geometry.getAttribute('phase').array).size;
 const rates=new Set(sky.stars.geometry.getAttribute('rate').array).size;
 sky.update(2);const time=sky.material.uniforms.time.value;sky.update(2);
 const frozen=sky.material.uniforms.time.value===time;
 sky.resize(390,844,1);const mobile=sky.stars.geometry.drawRange.count;sky.dispose();
 let valid=true,shared=true,disposed=0;
 for(let i=0;i<12;i++){
  const a=createKrathong(i),b=createKrathong(i);
  const geometry=a.group.children[0].geometry;
  shared&&=geometry===b.group.children[0].geometry;
  geometry.addEventListener('dispose',()=>disposed++);
  a.group.traverse(o=>{if(o.material?.map){const uv=o.geometry.getAttribute('uv');valid&&=!!uv&&uv.count===o.geometry.getAttribute('position').count;}});
  disposeModel(a);disposeModel(a); // Idempotent; the second live instance retains its buffers.
  shared&&=b.group.children[0].geometry===geometry;
  disposeModel(b);
 }
 return {desktop,mobile,phases,rates,frozen,valid,shared,disposed,frozenPixels,twinkling};
});
assert.equal(checks.desktop,104);assert.equal(checks.mobile,60);
assert.equal(checks.phases,104);assert.equal(checks.rates,104);
assert.ok(checks.frozen&&checks.valid&&checks.shared);
assert.ok(checks.frozenPixels&&checks.twinkling,'rendered stars must twinkle with time and freeze at fixed time');
// The twelve demo boats still own these buffers after the test clones are released.
assert.equal(checks.disposed,0);
assert.deepEqual(errors,[]);
assert.ok(Number(await page.locator('#river').getAttribute('data-draw-calls'))<220);
await page.setViewportSize({width:390,height:844});await page.waitForTimeout(700);await page.screenshot({path:'/tmp/navait-night-qa/mobile.png'});
console.log('PASS night: desktop/mobile background, independent star phases/rates, frozen animation time, all 12 textured models share live geometry safely, draw budget and no browser errors. Screenshots: /tmp/navait-night-qa');
}finally{await browser?.close();server.kill();}
