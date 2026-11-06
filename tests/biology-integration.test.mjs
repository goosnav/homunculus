import test from 'node:test';
import assert from 'node:assert/strict';
import {Life} from '../web/life.js';
import {cleanArchive} from '../web/chamber.js';
const run=(l,seconds)=>{for(let i=0;i<seconds*10;i++)l.tick(.1);};
const resident=species=>{const l=new Life({species,random:()=>.5,afterHours:false});run(l,4);l.nextVisitor=Infinity;return l;};
const job=l=>{for(let i=0;i<600&&l.chamber.busy;i++)l.tick(.1);assert.equal(l.chamber.busy,false);};
test('all four bodies can build, awaken and keep a room-heart through the real job executor',()=>{
 for(const species of ['human','slug','worm','mass']){const l=resident(species);
  for(const item of ['paper','wire','cloth']){assert.equal(l.interact('deliver-scrap',{item}),true);job(l);}
  assert.deepEqual(l.laboratory.nest.scraps,['paper','wire','cloth']);
  l.interact('resonance-tone',{tone:l.laboratory.resonance.affinity});l.interact('resonance-power');run(l,26);
  assert.equal(l.laboratory.nest.heart,'awake');assert.equal(l.interact('keep-heart'),true);job(l);
  assert.equal(l.laboratory.nest.heart,'kept');assert.deepEqual(cleanArchive(l.chamber.archive).laboratory.remnants,['cradle','heart']);
  const next=new Life({archive:l.chamber.archive,species});assert.equal(next.laboratory.nest.heart,'dormant');assert.deepEqual(next.laboratory.nest.scraps,[]);assert.equal(next.laboratory.record.remnants.length,2);
 }
});
test('gravity suspends physical work and paths, while recovery controls and lethal interventions remain effective',()=>{
 const l=resident('worm');l.interact('deliver-scrap',{item:'wire'});l.interact('resonance-tone',{tone:3});l.interact('resonance-power');l.interact('resonance-power');run(l,12);
 assert.ok(l.laboratory.suspended);const before={position:[...l.position],work:l.chamber.job?.work,night:l.night?.time};run(l,10);
 assert.deepEqual(l.position,before.position);assert.equal(l.chamber.job?.work,before.work);assert.equal(l.snapshot().walking,false);
 assert.equal(l.interact('resonance-tone',{tone:1}),true);run(l,4);assert.equal(l.laboratory.suspended,false);job(l);assert.deepEqual(l.laboratory.nest.scraps,['wire']);
 l.interact('resonance-tone',{tone:3});run(l,25);assert.ok(l.laboratory.suspended);l.interact('anvil');run(l,1);assert.equal(l.alive,false);assert.equal(l.laboratory.gravity.lift,0);run(l,10);assert.equal(l.alive,false);
});
test('coercion cancels pending scraps, and an ended life cannot finish a stale laboratory job',()=>{
 for(const action of ['confine','anvil','close']){const l=resident('mass');l.interact('deliver-scrap',{item:'paper'});const kind=l.chamber.job.item.slice(4);l.interact(action);run(l,20);assert.deepEqual(l.laboratory.nest.scraps,[]);assert.equal(l.laboratory.nest.offering,null);assert.equal(l.laboratory.complete(l,kind),false);}
});
