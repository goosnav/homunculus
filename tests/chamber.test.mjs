import test from 'node:test';
import assert from 'node:assert/strict';
import {Life} from '../web/life.js';
const step=(life,seconds)=>{for(let i=0;i<seconds*10;i++)life.tick(.1);};
function fresh(options={}){const l=new Life({random:()=>.1,afterHours:false,...options});step(l,4);return l;}
function until(l,predicate,seconds=150){for(let i=0;i<seconds*10&&!predicate();i++)l.tick(.1);assert.ok(predicate(),'state must be reachable through navigation and time');}
function deliver(l,item){assert.equal(l.interact('deliver',{item}),true);until(l,()=>!l.chamber.busy);}

test('deliveries are physical projects; duplicates cannot stack and model thoughts cannot override them',()=>{
 const l=fresh();assert.ok(l.chamber,'the room has an experiment simulation');
 assert.equal(l.interact('deliver',{item:'chalk'}),true);assert.equal(l.interact('deliver',{item:'coil'}),false);
 assert.equal(l.interact('release'),false);
 const epoch=l.epoch;l.applyThought({action:'rest',say:'Let me think.'},epoch);step(l,2);
 assert.equal(l.chamber.job.item,'chalk');assert.notEqual(l.activity,'rest');
 until(l,()=>l.chamber.chalk>=1);assert.equal(l.interact('deliver',{item:'chalk'}),false);
 assert.ok(l.chamber.archive.traces.chalk);assert.equal(l.chamber.delivery,null);
});
test('chalk route opens only in darkness after knocks and ends in the same empty room',()=>{
 const l=fresh();assert.ok(l.chamber);deliver(l,'chalk');
 l.interact('tap');l.interact('tap');l.interact('tap');assert.equal(l.chamber.chalkOpen,false);
 l.interact('lights');l.interact('tap');l.interact('tap');l.interact('tap');assert.equal(l.chamber.chalkOpen,true);
 l.interact('release');assert.equal(l.alive,true);until(l,()=>!l.alive);
 assert.equal(l.outcome.kind,'chalk');assert.equal(l.snapshot().skeleton,false);assert.equal(l.interact('deliver',{item:'soup'}),false);
});
test('coil route needs the carrier and darkness; interruption is recoverable',()=>{
 const l=fresh();assert.ok(l.chamber);deliver(l,'coil');
 step(l,20);assert.equal(l.chamber.job,null);l.interact('lights');
 while(l.chamber.channel!==l.chamber.carrier)l.interact('tune');step(l,2);assert.equal(l.chamber.job.item,'signal');
 l.interact('lights');step(l,1);assert.equal(l.chamber.job,null);assert.equal(l.alive,true);
 l.interact('lights');until(l,()=>!l.alive);assert.equal(l.outcome.kind,'signal');
});
test('mirror changes a visitor, leaves a physical key, and permits a real door escape',()=>{
 const l=fresh();assert.ok(l.chamber);deliver(l,'mirror');assert.equal(l.interact('bell'),true);assert.equal(l.interact('bell'),false);
 until(l,()=>!!l.visitor);assert.equal(l.visitor.reflected,true);assert.equal(l.visitor.aggressive,false);
 until(l,()=>l.chamber.key==='held');assert.ok(l.chamber.archive.traces.key);
 assert.equal(l.interact('release'),true);until(l,()=>!l.alive);assert.equal(l.outcome.kind,'door');
});
test('cruelty can cause refusal; soup restores cooperation without a permanent soft lock',()=>{
 const l=fresh();assert.ok(l.chamber);l.interact('confine');step(l,9);deliver(l,'mirror');assert.equal(l.chamber.mirror,false);
 deliver(l,'soup');step(l,10);deliver(l,'soup');deliver(l,'mirror');assert.equal(l.chamber.mirror,true);
});
test('anvil interrupts delivery, transfer and departure without later resurrection',()=>{
 for(const phase of ['delivery','transfer','departure']){
  const l=fresh();assert.ok(l.chamber);
  if(phase==='delivery')l.interact('deliver',{item:'mirror'});
  if(phase==='transfer'){deliver(l,'coil');l.interact('lights');while(l.chamber.channel!==l.chamber.carrier)l.interact('tune');step(l,3);}
  if(phase==='departure'){deliver(l,'chalk');l.interact('lights');for(let i=0;i<3;i++)l.interact('tap');l.interact('release');}
  l.interact('anvil');step(l,90);assert.equal(l.alive,false);assert.equal(l.deathCause,'anvil');assert.equal(l.outcome,null);assert.equal(l.chamber.busy,false);
 }
});
test('only bounded room traces persist; an archive never resurrects a life',async()=>{
 const l=fresh();assert.ok(l.chamber);const {readArchive,writeArchive}=await import('../web/chamber.js');
 let stored='broken';const storage={getItem:()=>stored,setItem:(key,value)=>{stored=value;}};
 assert.deepEqual(readArchive(storage),{version:1,visits:0,traces:{}});
 deliver(l,'chalk');l.die('anvil');writeArchive(storage,l.chamber.archive);const next=fresh({archive:readArchive(storage)});
 assert.equal(next.alive,true);assert.equal(next.chamber.chalk,0);assert.equal(next.chamber.inherited.chalk,true);assert.equal(next.chamber.archive.visits,2);
 assert.equal(stored.includes('dialogue'),false);assert.equal(stored.includes('alive'),false);
 const bad={getItem:()=>'{"visits":1e90,"traces":{"chalk":true,"evil":true},"alive":true}',setItem:()=>{throw Error('quota');}};
 assert.ok(readArchive(bad).visits<=9999);assert.deepEqual(Object.keys(readArchive(bad).traces),['chalk']);assert.doesNotThrow(()=>writeArchive(bad,next.chamber.archive));
});

test('turning lights back on interrupts an unfinished chalk departure',()=>{
 const l=fresh();deliver(l,'chalk');l.interact('lights');for(let i=0;i<3;i++)l.interact('tap');l.interact('release');
 until(l,()=>l.chamber.job?.phase==='work');step(l,1);l.interact('lights');step(l,10);
 assert.equal(l.alive,true);assert.equal(l.outcome,null);assert.equal(l.chamber.job,null);
});
test('anvil lands at the current departure position, not the old navigation stop',()=>{
 const l=fresh();deliver(l,'chalk');l.interact('lights');for(let i=0;i<3;i++)l.interact('tap');l.interact('release');
 until(l,()=>l.chamber.job?.phase==='work');const before=l.position[1];step(l,1);
 assert.ok(l.position[1]<before);const at=[...l.position];l.interact('anvil');step(l,1);
 assert.deepEqual(l.position,at);assert.equal(l.deathCause,'anvil');
});

test('confinement preserves a departing body and returns it by walking after release',()=>{
 const l=fresh();deliver(l,'chalk');l.interact('lights');for(let i=0;i<3;i++)l.interact('tap');l.interact('release');
 until(l,()=>l.chamber.job?.phase==='work');step(l,2.8);const at=[...l.position];
 l.interact('confine');assert.deepEqual(l.position,at);step(l,7.9);assert.deepEqual(l.position,at);
 l.tick(.2);assert.ok(Math.hypot(l.position[0]-at[0],l.position[1]-at[1])<=.15,'return at walking speed, never snap');
 assert.equal(l.alive,true);assert.equal(l.outcome,null);
});
test('a floor opening kills during a delivery walk and cancels its project permanently',()=>{
 const l=fresh();l.interact('deliver',{item:'coil'});l.interact('hole');until(l,()=>!l.alive);
 assert.equal(l.deathCause,'hole');assert.equal(l.chamber.busy,false);step(l,30);assert.equal(l.chamber.coil,false);assert.equal(l.snapshot().skeleton,false);
 assert.equal(l.applyThought({action:'rest',say:'Back.'},l.epoch),false);
});
