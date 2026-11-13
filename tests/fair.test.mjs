import test from 'node:test';
import assert from 'node:assert/strict';
import { FAIR_WIDTH, FAIR_STOPS, walkFair, nearbyStop, fairCamera, BalloonRound } from '../src/fair-state.ts';
test('walking, camera and all six fair attractions stay reachable within the world',()=>{
  assert.equal(walkFair(100,-1,.05),100);
  assert.equal(walkFair(FAIR_WIDTH-100,1,.05),FAIR_WIDTH-100);
  assert.equal(walkFair(180,1,10),191.5);
  assert.equal(walkFair(180,1,-1),180);
  for(const [i,stop] of FAIR_STOPS.entries())assert.equal(nearbyStop(stop.x),i);
  assert.equal(nearbyStop(180),-1);
  for(const width of [340,640,1400,5000])for(const x of [100,2000,3700]){
    const camera=fairCamera(x,width);
    assert.ok(camera>=0 && camera<=Math.max(0,FAIR_WIDTH-width));
  }
});
test('balloon rounds reject repeat hits and cap throws, new rounds start clean',()=>{
  const round=new BalloonRound();
  assert.equal(round.throwAt(-1),false);
  for(let i=0;i<5;i++)assert.equal(round.throwAt(i),true);
  assert.equal(round.throwAt(0),false);
  assert.equal(round.throwAt(5),false);
  assert.equal(round.throws,5);
  assert.equal(round.hits.size,5);
  assert.equal(new BalloonRound().throws,0);
});
