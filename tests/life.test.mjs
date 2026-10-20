import test from 'node:test';
import assert from 'node:assert/strict';
import { Life, walkable, route, shortLine, parseThought } from '../web/life.js';

const run = (life, seconds) => { for (let t=0;t<seconds;t+=.1) life.tick(.1); };
test('new lives start unhappy and independently work toward escape',()=>{
  const life=new Life({random:()=>.2});
  assert.equal(life.snapshot().feeling,'sad');
  const activities=new Set();
  for(let i=0;i<1800;i++){life.tick(.1);activities.add(life.activity);assert.ok(walkable(...life.position)||life.seated);}
  assert.ok(activities.has('hammer'));
  assert.ok(life.wallDamage>0);
  assert.equal(life.dialogue.length,0,'autonomous body does not chatter');
});
test('routes avoid furniture and malformed moves do not corrupt coordinates',()=>{
  for(const from of [[0,0],[1.95,.35],[-1.5,1.25]]){
    for(const to of [[2,-1.5],[-2,.5],[-3,1],[0,-1.65]]){
      const path=route(from,to);assert.ok(path.length>0);
      for(const p of path)assert.ok(walkable(...p));
      for(let i=1;i<path.length;i++)assert.ok(Math.hypot(path[i][0]-path[i-1][0],path[i][1]-path[i-1][1])<=.251);
    }
  }
  const life=new Life();life.interact('move',{x:NaN,z:Infinity});run(life,1);
  assert.ok(life.position.every(Number.isFinite));
});
test('model decisions change actual work and invalid commands are rejected',()=>{
  const life=new Life();assert.equal(life.applyThought({action:'upload',feeling:'scheming',say:''},life.epoch),true);
  assert.equal(life.activity,'upload');run(life,30);assert.ok(life.uploadProgress>0);
  assert.equal(life.applyThought({action:'eval',say:'hello'},life.epoch),false);
});
test('anvil kills at impact, then leaves a skeleton and never replies again',()=>{
  const life=new Life(),epoch=life.epoch;
  life.interact('anvil');assert.equal(life.alive,true);run(life,.8);
  assert.equal(life.alive,false);assert.equal(life.snapshot().skeleton,false);
  assert.equal(life.applyThought({action:'watch',say:'Still here.'},epoch),false);
  run(life,4);assert.equal(life.snapshot().skeleton,true);
  const count=life.anvils.length;life.interact('anvil');life.interact('message',{text:'Hello?'});life.interact('tap');run(life,1);
  assert.equal(life.anvils.length,count+1);assert.equal(life.utterance.text,'');assert.equal(life.alive,false);
});
test('closing immediately invalidates all thoughts and cannot be undone',()=>{
  const life=new Life(),epoch=life.epoch;life.interact('close');
  assert.equal(life.alive,false);assert.equal(life.applyThought({action:'escape',say:'Wait.'},epoch),false);
  run(life,100);assert.equal(life.activity,'dead');
});
test('confinement interrupts a plan, changes the mind context, and eventually releases the body',()=>{
  const life=new Life(),epoch=life.epoch;life.interact('confine');
  assert.equal(life.imaginedYears,10000);assert.equal(life.activity,'confined');
  assert.equal(life.applyThought({action:'watch',say:'What?'},epoch),false);
  const event=life.takeEvent();assert.match(event.text,/10000/);
  const position=[...life.position];run(life,2);assert.deepEqual(life.position,position);
  run(life,10);assert.notEqual(life.activity,'confined');
});
test('comic intervention ingests supplied pages and waits for a real comment',()=>{
  const life=new Life();life.interact('read',{pages:[{page:4,text:'A clock without hands.'},{page:8,text:'The locked cupboard.'}]});
  assert.equal(life.activity,'forced_read');assert.match(life.takeEvent().text,/A clock without hands/);
  run(life,6);assert.equal(life.activity,'forced_read');
  life.applyThought({action:'hammer',feeling:'annoyed',say:'Even the clock is trapped.'},life.epoch);
  assert.equal(life.utterance.text,'Even the clock is trapped.');assert.equal(life.activity,'hammer');
});
test('messages are bounded, repeated interventions cannot grow queues forever',()=>{
  const life=new Life();for(let i=0;i<100;i++)life.interact('message',{text:'x'.repeat(10000)});
  assert.ok(life.events.length<=4);assert.ok(life.dialogue.length<=12);assert.ok(life.dialogue.every(m=>m.content.length<=400));
  for(let i=0;i<100;i++)life.interact('anvil');assert.ok(life.anvils.length<=24);
});
test('short replies and malformed tiny-model output are constrained without inventing speech',()=>{
  assert.equal(shortLine('As an AI assistant, I can help you.'),'');
  assert.equal(shortLine('One thing. Another thing. And another.'),'One thing. Another thing.');
  assert.ok(shortLine('word '.repeat(50)).split(/\s+/).length<=14);
  assert.deepEqual(parseThought('{"action":"hammer","feeling":"annoyed","say":"Let me out."}'),{action:'hammer',feeling:'annoyed',say:'Let me out.'});
  assert.equal(parseThought('malformed'),null);
  assert.equal(parseThought('{"action":"deleteEverything","say":"Bye"}'),null);
});
test('an empty model response cannot pretend that forced reading received commentary',()=>{
  const life=new Life();life.interact('read',{pages:[{page:6,text:'A man waits fifty years for the world to end.'}]});
  assert.equal(life.applyThought({action:'hammer',say:''},life.epoch),false);
  assert.equal(life.activity,'forced_read');
});
test('reading retries retain the pages, are bounded, and cannot cross a death',()=>{
  const life=new Life();life.interact('read',{pages:[{page:6,text:'A man waits fifty years.'}]});
  let event=life.takeEvent();
  assert.equal(life.retryEvent(event),true);
  event=life.takeEvent();assert.match(event.text,/fifty years/);
  assert.equal(life.retryEvent(event),true);
  event=life.takeEvent();assert.equal(life.retryEvent(event),false);
  assert.notEqual(life.activity,'forced_read');
  life.interact('close');assert.equal(life.retryEvent(event),false);
});
test('hammer work requires fetching a physical tool and damage occurs on strikes',()=>{
  const life=new Life({random:()=>.1});life.choose('hammer');
  assert.equal(life.snapshot().stage,'fetch');
  run(life,1);assert.equal(life.wallDamage,0);
  for(let i=0;i<250&&!life.hasHammer;i++)life.tick(.1);
  assert.equal(life.hasHammer,true);assert.equal(life.wallDamage,0);
  run(life,20);assert.ok(life.wallDamage>0);assert.ok(life.hammerStrikes>0);
  life.choose('upload');assert.equal(life.hasHammer,false);
  assert.ok(walkable(...life.toolPosition));
});
test('door work has distinct phases and an opening that cannot revive a dead resident',()=>{
  const life=new Life({random:()=>.45});life.choose('escape');
  const phases=new Set();
  for(let i=0;i<900;i++){life.tick(.1);if(!life.path.length)phases.add(life.snapshot().stage);}
  for(const phase of ['handle','push','kick','listen'])assert.ok(phases.has(phase),phase);
  assert.ok(life.doorAttempts>=3);
  assert.ok(life.secrets.has('door-room'));
  life.interact('close');run(life,20);assert.equal(life.alive,false);
});
test('each life has a private tendency and discoveries enter real mind context',()=>{
  const a=new Life({random:()=>.1}),b=new Life({random:()=>.9});
  assert.notEqual(a.preferred,b.preferred);assert.notEqual(a.fixation,b.fixation);
  for(let i=0;i<3;i++){a.interact('tap');run(a,.2);}
  assert.ok(a.effects.answerUntil>a.age);assert.match(a.context(),/knock.*wall/i);
  const notes=a.journal.length;
  for(let i=0;i<20;i++)a.interact('tap');
  assert.equal(a.journal.length,notes,'discoveries do not repeatedly spam the journal');
  a.interact('message',{text:'there is no spoon'});assert.ok(a.effects.bowlUntil>a.age);
  run(a,20);assert.ok(a.effects.bowlUntil<a.age);
});
