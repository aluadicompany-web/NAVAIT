import test from 'node:test';
import assert from 'node:assert/strict';
import { FairCrowd } from '../src/fair-crowd.ts';
function random(seed){return ()=>{seed=Math.imul(seed,1664525)+1013904223;return (seed>>>0)/4294967296;};}
test('15 independent visitors roam bounded walkways with distinct routes and varied speeds',()=>{
 const crowd=new FairCrowd(random(42));assert.equal(crowd.visitors.length,15);
 const paths=crowd.visitors.map(()=>[]),initial=crowd.visitors.map(v=>({x:v.x,z:v.z}));
 assert.ok(new Set(crowd.visitors.map(v=>v.speed)).size===15);
 for(let frame=0;frame<3600;frame++){
  crowd.update(.05);
  crowd.visitors.forEach((v,i)=>{assert.ok(Number.isFinite(v.x)&&v.x>=1.1&&v.x<=36.9&&v.z>=.8&&v.z<=5.7);if(frame%100===0)paths[i].push(`${v.x.toFixed(2)},${v.z.toFixed(2)}`);});
 }
 assert.equal(new Set(paths.map(p=>p.join(';'))).size,15);
 for(let i=0;i<15;i++)assert.ok(new Set(paths[i]).size>10);
 assert.ok(crowd.visitors.every((v,i)=>Math.hypot(v.x-initial[i].x,v.z-initial[i].z)>1));
 const snapshot=JSON.stringify(crowd.visitors);crowd.update(10,true);crowd.update(NaN);crowd.update(-1);assert.equal(JSON.stringify(crowd.visitors),snapshot);
 assert.notDeepEqual(new FairCrowd(random(43)).visitors,new FairCrowd(random(42)).visitors);
});
