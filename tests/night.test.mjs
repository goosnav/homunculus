import test from 'node:test';import assert from 'node:assert/strict';
import {Life} from '../web/life.js';import {readArchive,writeArchive} from '../web/chamber.js';
import {advance,operateNight,shift} from './night-helpers.mjs';
const fresh=(r=.3,archive)=>new Life({random:()=>r,archive});
test('a complete after-hours shift resolves six distinct encounters and lets the resident stay',t=>{
 const l=fresh();assert.ok(l.night);const duration=shift(l);
 t.diagnostic(`Unhurried scripted route: ${duration}s (includes optional quiet intervals)`);assert.ok(duration<1800);assert.equal(l.alive,true);assert.equal(l.night.phase,'quiet');
 assert.equal(l.chamber.archive.afterHours.shifts,1);assert.ok(l.chamber.archive.afterHours.keepsakes.includes('tenant'));
 assert.equal(l.night.history.length,6);assert.equal(new Set(l.night.history.map(x=>x.case)).size,6);
});
test('alternate parcel, weather, telephone and shadow solutions lead to different physical keepsakes',()=>{
 const a=fresh(),b=fresh(.8);shift(a);shift(b,{alternative:true});
 for(const key of ['tooth','bloom','spool','jar'])assert.ok(a.chamber.archive.afterHours.keepsakes.includes(key),key);
 for(const key of ['button','boat','shell','silhouette'])assert.ok(b.chamber.archive.afterHours.keepsakes.includes(key),key);
 assert.notDeepEqual(a.night.order,b.night.order);assert.notDeepEqual(a.night.phone.code,b.night.phone.code);
});
test('the building seal prevents a one-minute escape; a later departure remains terminal',()=>{
 const l=fresh();advance(l,4);l.interact('deliver',{item:'coil'});advance(l,60);l.interact('lights');while(l.chamber.channel!==l.chamber.carrier)l.interact('tune');l.interact('release');advance(l,30);assert.equal(l.alive,true);
 shift(l,{ending:'leave'});assert.equal(l.alive,false);assert.equal(l.outcome.kind,'signal');assert.equal(l.snapshot().skeleton,false);const at=[...l.position];advance(l,100);assert.deepEqual(l.position,at);
});
test('tending, a clockwork companion and a neighbor are repeatable activities between incidents',()=>{
 const l=fresh();assert.ok(l.night);advance(l,4);assert.equal(l.interact('plant'),true);advance(l,20);assert.equal(l.night.plant.planted,true);
 l.interact('water');advance(l,50);assert.ok(l.night.plant.growth>0);l.interact('wind-mouse');advance(l,15);assert.ok(l.night.toy.until>l.night.time);
 l.interact('feed-wall');advance(l,40);assert.ok(l.night.neighbor.gifts>=1);assert.ok(l.events.length<=4);assert.ok(l.memories.length<=8);
});
test('wrong telephone tones reset safely and repeatable clues remain available',()=>{
 const l=fresh();assert.ok(l.night);for(let i=0;i<5000&&l.night.phase!=='phone';i++){operateNight(l);l.tick(.25);}l.interact('answer');advance(l,30);
 while(l.chamber.channel===l.night.phone.code[0])l.interact('tune');l.interact('transmit');advance(l,12);assert.equal(l.night.phone.index,0);assert.equal(l.night.phase,'phone');shift(l);
});
test('death, confinement and forced reading cannot complete interrupted story work',()=>{
 for(const action of ['anvil','confine','read']){
  const l=fresh();assert.ok(l.night);advance(l,40);l.interact('open-parcel');advance(l,3);const at=[...l.position];l.interact(action,{pages:[{page:1,text:'A room with a telephone.'}]});advance(l,1);
  assert.equal(l.chamber.busy,false);assert.equal(l.night.history.length,0);
  if(action==='anvil'){advance(l,600);assert.equal(l.alive,false);assert.equal(l.night.history.length,0);assert.equal(l.night.resolved,false);}
  else {assert.equal(l.alive,true);advance(l,50);shift(l);}
 }
});
test('archives migrate, reject unbounded fields and never save an individual',()=>{
 const l=fresh();assert.ok(l.night);shift(l);let saved;const store={getItem:()=>saved,setItem:(k,v)=>saved=v};writeArchive(store,l.chamber.archive);
 assert.ok(saved.length<1000);assert.equal(/dialogue|alive|phone|position|memories/.test(saved),false);
 const next=fresh(.5,readArchive(store));assert.equal(next.night.resolved,false);assert.equal(next.night.phase,'quiet');assert.ok(next.night.inherited.includes('tenant'));assert.equal(next.age,0);
 const bad=readArchive({getItem:()=>JSON.stringify({afterHours:{shifts:1e80,keepsakes:Array(1000).fill('evil'),last:'<script>'},traces:{chalk:true}})});
 assert.ok(bad.afterHours.shifts<=9999);assert.deepEqual(bad.afterHours.keepsakes,[]);assert.equal(bad.afterHours.last,'');
});
test('thirty minutes and later encounters keep state bounded without completing extra shifts',()=>{
 const l=fresh();assert.ok(l.night);shift(l);for(let i=0;i<7200;i++){operateNight(l);l.tick(.25);}
 assert.equal(l.alive,true);assert.equal(l.chamber.archive.afterHours.shifts,1);assert.ok(l.night.history.length<=8);assert.ok(l.events.length<=4);assert.ok(l.memories.length<=8);assert.ok(l.chamber.archive.afterHours.keepsakes.length<=12);
});

test('a reflected inspector can be challenged instead of obeyed',()=>{
 const l=fresh();advance(l,4);l.interact('deliver',{item:'mirror'});advance(l,40);
 for(let i=0;i<7000&&l.night.phase!=='inspection';i++){operateNight(l);l.tick(.25);}
 assert.equal(l.night.phase,'inspection');l.interact('bell');advance(l,50);
 assert.equal(l.night.inspector.verdict,'reflected');assert.ok(l.chamber.archive.afterHours.keepsakes.includes('eye'));
});

test('automatic inspection work waits quietly when the resident refuses cooperation',()=>{
 const l=fresh();for(let i=0;i<7000&&l.night.phase!=='inspection';i++){operateNight(l);l.tick(.25);}
 operateNight(l);advance(l,20);l.interact('confine');advance(l,50);const id=l.chamber.feedback.id;advance(l,5);
 assert.equal(l.chamber.feedback.id,id,'refusal must not produce a sound every simulation tick');assert.equal(l.chamber.busy,false);
});


test('failed release followed by staying does not arm a later signal escape',()=>{
 const l=fresh();for(let i=0;i<7000&&l.night.phase!=='eviction';i++){operateNight(l);l.tick(.25);}
 l.interact('release');assert.equal(l.chamber.busy,false);
 l.interact('refuse-eviction');advance(l,35);assert.equal(l.night.staying,true);
 l.interact('deliver',{item:'coil'});advance(l,40);if(l.chamber.lights)l.interact('lights');while(l.chamber.channel!==l.chamber.carrier)l.interact('tune');
 advance(l,35);assert.equal(l.alive,true,'choosing home must not silently become an escape');assert.equal(l.chamber.busy,false);
 l.interact('release');advance(l,50);assert.equal(l.outcome.kind,'signal');
});

test('a broken signal departure requires another explicit release',()=>{
 const l=fresh();shift(l);l.interact('deliver',{item:'coil'});advance(l,40);
 if(l.chamber.lights)l.interact('lights');while(l.chamber.channel!==l.chamber.carrier)l.interact('tune');
 l.interact('release');advance(l,2);l.interact('lights');advance(l,1);assert.equal(l.chamber.busy,false);
 l.interact('lights');advance(l,30);assert.equal(l.alive,true);assert.equal(l.chamber.busy,false);
 l.interact('release');advance(l,50);assert.equal(l.outcome.kind,'signal');
});

test('calling night service advances every quiet interval without skipping encounters',t=>{
 const normal=fresh(),active=fresh();const unhurried=shift(normal),quick=shift(active,{callService:true});
 t.diagnostic(`Active scripted route: ${quick}s; unhurried: ${unhurried}s. Human engagement is not measured.`);
 assert.ok(quick<unhurried-300,'active players must be able to advance the building');
 assert.deepEqual(active.night.history,normal.night.history);assert.equal(active.alive,true);
 const l=fresh();advance(l,4);assert.equal(l.interact('call-service'),false);advance(l,16);
 assert.equal(l.interact('call-service'),true);assert.equal(l.interact('call-service'),false,'one physical job at a time');advance(l,30);
 assert.equal(l.night.phase,'parcel');assert.equal(l.interact('call-service'),false,'cannot skip an unresolved case');
});
