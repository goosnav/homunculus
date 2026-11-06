import test from 'node:test';
import assert from 'node:assert/strict';
import {Life} from '../web/life.js';

function resident(){
  const life=new Life({afterHours:false,species:'human',name:'Hugh',random:()=>.2});
  life.arrival=null;life.age=5;life.nextVisitor=Infinity;life.nextOddity=Infinity;
  return life;
}
const closeTo=(actual,expected)=>{
  assert.equal(actual.length,expected.length);
  actual.forEach((value,index)=>assert.ok(Math.abs(value-expected[index])<1e-9,`${actual} should be near ${expected}`));
};

test('glass contacts map normalized coordinates to a finite, bounded gaze target',()=>{
  for(const kind of ['tap','wave'])for(const [payload,expected] of [
    [{x:.5,y:-.5},[1.35,1.2,2.5]],
    [{x:999,y:-999},[2.7,.8,2.5]],
    [{x:-999,y:999},[-2.7,2.4,2.5]],
    [{x:NaN,y:Infinity},[0,1.6,2.5]],
    [{},[0,1.6,2.5]],
  ]){
    const life=resident();
    assert.equal(life.interact(kind,payload),true);
    closeTo(life.snapshot().lookTarget,expected);
    assert.equal(life.snapshot().attention.kind,kind);
  }
});

test('a wave lets the resident look without moving his feet or replacing his chosen work',()=>{
  for(const action of ['hammer','rest','upload']){
    const life=resident();life.choose(action);
    const before={position:[...life.position],path:life.path.map(point=>[...point]),activity:life.activity,yaw:life.yaw,seated:life.seated,remaining:life.remaining};
    assert.equal(life.interact('wave',{x:-.5,y:.25}),true);
    assert.deepEqual({position:life.position,path:life.path,activity:life.activity,yaw:life.yaw,seated:life.seated,remaining:life.remaining},before);
    assert.ok(life.snapshot().lookTarget);
  }
});

test('waves require four seconds between accepted gestures and cannot repeatedly soothe during cooldown',()=>{
  const life=resident();
  assert.equal(life.interact('wave',{x:-1}),true);
  const first=structuredClone(life.attention),feelings=life.temperament.snapshot(life);
  life.age=8.999;
  assert.equal(life.interact('wave',{x:1}),false);
  assert.deepEqual(life.attention,first);
  assert.deepEqual(life.temperament.snapshot(life),feelings);
  life.age=9;
  assert.equal(life.interact('wave',{x:1}),true);
  closeTo(life.snapshot().lookTarget,[2.7,1.6,2.5]);
});

test('arrival, occupied work and irritation let the resident ignore both kinds of glass contact',()=>{
  for(const kind of ['tap','wave'])for(const condition of ['arrival','busy','irritated']){
    const life=resident();
    if(condition==='arrival')life.arrival={height:5,duration:3.5,impact:.75};
    if(condition==='busy')life.chamber.begin(life,'coil');
    if(condition==='irritated'){life.temperament.pulse('read',3);assert.ok(life.temperament.irritation>75);}
    const job=life.chamber.job;
    assert.equal(life.interact(kind,{x:1,y:1}),true);
    assert.equal(life.snapshot().attention,null,`${kind} during ${condition}`);
    assert.equal(life.snapshot().lookTarget,null,`${kind} during ${condition}`);
    assert.equal(life.chamber.job,job,'contact cannot replace occupied physical work');
  }
});

test('nearby visitors take attention priority over an observer gesture',()=>{
  const life=resident();life.interact('wave',{x:-1});
  const glass=life.snapshot().lookTarget;
  life.visitor={position:[life.position[0]+.25,1.8,life.position[1]+.25]};
  assert.deepEqual(life.snapshot().lookTarget,life.visitor.position);
  life.visitor.position[0]=100;
  assert.deepEqual(life.snapshot().lookTarget,glass,'a distant visitor does not steal the glance');
});

test('observer glances expire and snapshot consumers cannot redirect the resident',()=>{
  const life=resident();life.interact('tap',{x:.5,y:.25});
  const snapshot=life.snapshot(),original=[...snapshot.lookTarget];
  snapshot.lookTarget[0]=999;snapshot.attention.position[0]=999;
  assert.deepEqual(life.snapshot().lookTarget,original);
  life.age=8;
  assert.equal(life.snapshot().attention,null);assert.equal(life.snapshot().lookTarget,null);
});

test('ordinary taps and waves produce body language without queuing model work or dialogue',()=>{
  const life=resident(),epoch=life.epoch;
  assert.equal(life.interact('tap',{x:.2}),true);
  assert.equal(life.interact('wave',{x:-.2}),true);
  life.age=9;assert.equal(life.interact('wave'),true);
  assert.deepEqual(life.events,[]);assert.deepEqual(life.dialogue,[]);assert.deepEqual(life.memories,[]);
  assert.equal(life.utterance.text,'');assert.equal(life.epoch,epoch);
});

test('the intentional three-knock discovery still produces one world event',()=>{
  const life=resident();
  for(let i=0;i<3;i++)life.interact('tap');
  assert.equal(life.events.length,1);assert.equal(life.events[0].kind,'world');
  assert.ok(life.effects.answerUntil>life.age);
  assert.deepEqual(life.dialogue,[]);
});

test('coercion and terminal states reject new observer gestures',()=>{
  for(const kind of ['tap','wave'])for(const state of ['confined','forced_read','dead']){
    const life=resident();
    if(state==='dead')life.die('closed');
    else{life.activity=state;life.lockUntil=100;}
    assert.equal(life.interact(kind,{x:1}),false);
    assert.equal(life.attention,null);assert.equal(life.events.length,0);
  }
});
