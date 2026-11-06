import test from 'node:test';
import assert from 'node:assert/strict';
import { Life } from '../web/life.js';
import * as implementation from '../web/laboratory.js';

// This unit boundary uses the real resident/chamber, with Chamber's documented
// completion callback invoked explicitly. Navigation is covered by Life tests.
const available = test;
function fresh(morphology='human',archive={}) {
  const life=new Life({random:()=>.2,afterHours:false});
  life.arrival=null;life.path=[];life.activity='watch';life.nextVisitor=Infinity;
  const lab=new implementation.Laboratory({random:()=>.2,morphology,archive});
  return {life,lab,archive};
}
function advance(lab,life,seconds) {
  for(let t=0;t<seconds-1e-8;t+=.1){life.age+=.1;lab.tick(.1,life);}
}
function act(pair,kind,payload) { return pair.lab.interact(pair.life,kind,payload); }
function finishWork(pair) {
  const job=pair.life.chamber.job;assert.ok(job?.item.startsWith('lab:'));
  advance(pair.lab,pair.life,job.duration);
  assert.equal(pair.lab.suspended,false,'the physical executor cannot work while floating');
  pair.life.chamber.job=null;pair.life.path=[];pair.life.activity='watch';
  pair.lab.complete(pair.life,job.item.slice(4));
}
function build(pair) {
  for(const item of ['wire','cloth','paper']) {
    assert.equal(act(pair,'deliver-scrap',{item}),true);finishWork(pair);
  }
}
function awaken(pair) {
  build(pair);act(pair,'resonance-tone',{tone:pair.lab.snapshot().resonance.affinity});
  act(pair,'resonance-aim',{pad:0});act(pair,'resonance-power');
  advance(pair.lab,pair.life,27);assert.equal(pair.lab.snapshot().nest.heart,'awake');
}
available('fixtures remain usable during occupied work, low cooperation and coercion',()=>{
  const pair=fresh();pair.life.chamber.cooperation=-2;pair.life.activity='confined';
  pair.life.chamber.job={item:'night:answer',phase:'work',progress:.2};
  for(const [action,payload] of [['draft-turn',{direction:-1}],['draft-power'],['mist'],['resonance-tone',{tone:3}],['resonance-power'],['resonance-aim',{pad:2}]])assert.equal(act(pair,action,payload),true,action);
  assert.equal(pair.life.chamber.job.item,'night:answer');
  assert.equal(act(pair,'deliver-scrap',{item:'paper'}),false);
  assert.equal(pair.lab.snapshot().draft.power,1);
  advance(pair.lab,pair.life,3);assert.ok(pair.lab.snapshot().mist.humidity>0);
});
available('malformed payloads cannot poison fixture state or start physical work',()=>{
  const pair=fresh(),before=pair.lab.snapshot();
  for(const tone of [NaN,Infinity,-1,0,4,1.5,'2',null])assert.equal(act(pair,'resonance-tone',{tone}),false);
  for(const pad of [NaN,Infinity,-1,3,.5,'1',null])assert.equal(act(pair,'resonance-aim',{pad}),false);
  for(const direction of [NaN,Infinity,0,2,.5,'1',null])assert.equal(act(pair,'draft-turn',{direction}),false);
  for(const item of ['',null,'<script>','shell',{},[]])assert.equal(act(pair,'deliver-scrap',{item}),false);
  for(const payload of [null,[],4,'bad'])assert.equal(act(pair,'resonance-tone',payload),false);
  assert.deepEqual(pair.lab.snapshot(),before);assert.equal(pair.life.chamber.job,null);
});
available('scraps install once through Chamber jobs and only matching nearby gentle resonance awakens them',()=>{
  const pair=fresh('worm');
  assert.equal(act(pair,'deliver-scrap',{item:'wire'}),true);
  assert.equal(act(pair,'deliver-scrap',{item:'paper'}),false);
  assert.equal(pair.lab.snapshot().nest.scraps.length,0);
  assert.ok(pair.life.chamber.job.duration>=8&&pair.life.chamber.job.duration<=12);
  finishWork(pair);assert.equal(act(pair,'deliver-scrap',{item:'wire'}),false);
  for(const item of ['cloth','paper']){act(pair,'deliver-scrap',{item});finishWork(pair);}
  assert.equal(pair.lab.snapshot().nest.scraps.length,3);
  const affinity=pair.lab.snapshot().resonance.affinity;
  act(pair,'resonance-tone',{tone:affinity%3+1});act(pair,'resonance-power');
  advance(pair.lab,pair.life,35);assert.equal(pair.lab.snapshot().nest.heart,'dormant');
  act(pair,'resonance-tone',{tone:affinity});act(pair,'resonance-aim',{pad:2});
  advance(pair.lab,pair.life,35);assert.equal(pair.lab.snapshot().nest.heart,'dormant');
  act(pair,'resonance-aim',{pad:0});advance(pair.lab,pair.life,15);
  assert.ok(pair.lab.snapshot().nest.progress>.4&&pair.lab.snapshot().nest.progress<1);
  advance(pair.lab,pair.life,12);assert.equal(pair.lab.snapshot().nest.heart,'awake');
});
available('keeping and releasing a real awakened heart leave different bounded physical remnants',()=>{
  const kept=fresh('mass'),released=fresh('slug');awaken(kept);awaken(released);
  assert.equal(act(kept,'keep-heart'),true);assert.equal(kept.lab.snapshot().nest.heart,'awake');finishWork(kept);
  assert.equal(kept.lab.snapshot().nest.heart,'kept');assert.ok(kept.archive.laboratory.remnants.includes('heart'));
  assert.equal(act(released,'release-heart'),false,'a closed drain blocks release');
  released.life.night={drain:true};assert.equal(act(released,'release-heart'),true);finishWork(released);
  assert.equal(released.lab.snapshot().nest.heart,'released');assert.ok(released.archive.laboratory.remnants.includes('shed'));
  assert.notDeepEqual(kept.archive.laboratory,released.archive.laboratory);
  assert.equal(act(kept,'release-heart'),false);assert.equal(act(released,'keep-heart'),false);
});
available('gravity warns before lifting and preserves work until power off or bass brings it down',()=>{
  for(const remedy of ['off','bass']) {
    const pair=fresh();act(pair,'deliver-scrap',{item:'paper'});const job=pair.life.chamber.job;
    act(pair,'resonance-tone',{tone:3});act(pair,'resonance-power');act(pair,'resonance-power');
    advance(pair.lab,pair.life,5);assert.equal(pair.lab.suspended,false);assert.ok(pair.lab.snapshot().resonance.charge>0);
    advance(pair.lab,pair.life,6);assert.equal(pair.lab.suspended,true);assert.ok(pair.lab.snapshot().gravity.lift>.5);
    assert.equal(pair.life.chamber.job,job);assert.equal(pair.lab.snapshot().nest.scraps.length,0);
    if(remedy==='off')act(pair,'resonance-power');else act(pair,'resonance-tone',{tone:1});
    advance(pair.lab,pair.life,8);assert.equal(pair.lab.suspended,false);assert.equal(pair.lab.snapshot().gravity.lift,0);
    advance(pair.lab,pair.life,20);assert.equal(pair.lab.suspended,false,'high bass cannot retrigger the leak');
    finishWork(pair);assert.deepEqual(pair.lab.snapshot().nest.scraps,['paper']);
    act(pair,'resonance-tone',{tone:3});if(remedy==='off'){act(pair,'resonance-power');act(pair,'resonance-power');}
    advance(pair.lab,pair.life,12);assert.equal(pair.lab.suspended,true,'the apparatus can be used again');
  }
});
available('the glass face enters once, can be soothed, and rearms only after conditions change',()=>{
  const pair=fresh();pair.life.chamber.lights=false;act(pair,'mist');act(pair,'resonance-tone',{tone:3});act(pair,'resonance-power');
  advance(pair.lab,pair.life,4);assert.equal(pair.lab.snapshot().glass.present,false);
  advance(pair.lab,pair.life,5);assert.equal(pair.lab.snapshot().glass.present,true);
  const feedback=pair.life.chamber.feedback.id;advance(pair.lab,pair.life,30);assert.equal(pair.life.chamber.feedback.id,feedback);
  act(pair,'resonance-tone',{tone:1});advance(pair.lab,pair.life,6);assert.equal(pair.lab.snapshot().glass.present,false);
  act(pair,'resonance-tone',{tone:3});advance(pair.lab,pair.life,9);assert.equal(pair.lab.snapshot().glass.present,true);
  pair.life.chamber.lights=true;advance(pair.lab,pair.life,6);assert.equal(pair.lab.snapshot().glass.present,false);
});
available('interruption invalidates stale completion and dead residents cannot trigger or finish work',()=>{
  for(const reason of ['read','confine','anvil']) {
    const pair=fresh();act(pair,'deliver-scrap',{item:'cloth'});const kind=pair.life.chamber.job.item.slice(4);
    pair.lab.interrupt(pair.life,reason);pair.life.chamber.job=null;pair.lab.complete(pair.life,kind);
    assert.equal(pair.lab.snapshot().nest.offering,null);assert.deepEqual(pair.lab.snapshot().nest.scraps,[]);
    assert.equal(act(pair,'deliver-scrap',{item:'cloth'}),true);
    pair.life.alive=false;advance(pair.lab,pair.life,50);pair.lab.complete(pair.life,'fit-cloth');
    assert.deepEqual(pair.lab.snapshot().nest.scraps,[]);assert.equal(pair.lab.snapshot().gravity.lift,0);
    assert.equal(pair.lab.snapshot().glass.present,false);assert.equal(act(pair,'mist'),false);
  }
});
available('releasing cannot finish if its drain closes during the walk',()=>{
  const pair=fresh();awaken(pair);pair.life.night={drain:true};act(pair,'release-heart');
  pair.life.night.drain=false;finishWork(pair);
  assert.equal(pair.lab.snapshot().nest.heart,'awake');assert.equal(pair.archive.laboratory.remnants.includes('shed'),false);
});
available('morphology changes the physical response to the same field',()=>{
  const reactions=[];
  for(const morphology of ['human','slug','worm','mass']) {
    const pair=fresh(morphology);act(pair,'mist');act(pair,'resonance-tone',{tone:2});act(pair,'resonance-power');advance(pair.lab,pair.life,8);
    const reaction=pair.lab.snapshot().reaction;assert.equal(reaction.morphology,morphology);
    const {morphology:kind,...physical}=reaction;reactions.push(JSON.stringify(physical));
  }
  assert.equal(new Set(reactions).size,4);
});
available('availability exposes live apparatus and blocks only unavailable resident work',()=>{
  const pair=fresh(),state={...pair.life.snapshot(),laboratory:pair.lab.snapshot()};
  const normal=implementation.laboratoryAvailability(state);
  assert.equal(normal['deliver-scrap'][1],true);assert.equal(normal['keep-heart'][1],false);
  state.chamber.job={item:'night:answer'};const busy=implementation.laboratoryAvailability(state);
  assert.equal(busy['deliver-scrap'][1],false);assert.equal(busy['resonance-power'][1],true);
  state.alive=false;assert.equal(implementation.laboratoryAvailability(state)['resonance-power'][1],false);
});
available('fan rotation produces a finite reversible flow instead of a cosmetic setting',()=>{
  const pair=fresh();act(pair,'draft-power');advance(pair.lab,pair.life,.1);const first=pair.lab.snapshot().draft;
  assert.ok(Math.hypot(first.x,first.z)>0);
  act(pair,'draft-turn',{direction:1});act(pair,'draft-turn',{direction:1});advance(pair.lab,pair.life,.1);
  const opposite=pair.lab.snapshot().draft;assert.ok(first.x*opposite.x+first.z*opposite.z<0);
  act(pair,'draft-power');act(pair,'draft-power');advance(pair.lab,pair.life,.1);
  assert.equal(Math.hypot(pair.lab.snapshot().draft.x,pair.lab.snapshot().draft.z),0);
});
available('archive migration rejects individual state and snapshots do not share mutable arrays',()=>{
  const record=implementation.cleanLaboratory({remnants:Array(500).fill('heart').concat(['shed','cradle','evil']),alive:true,name:'old person'});
  assert.deepEqual(record,{remnants:['cradle','heart','shed']});assert.ok(JSON.stringify(record).length<100);
  const pair=fresh('mass',{laboratory:record});const snapshot=pair.lab.snapshot();
  snapshot.remnants.push('evil');snapshot.nest.scraps.push('paper');snapshot.resonance.position[0]=999;
  assert.equal(pair.lab.snapshot().remnants.includes('evil'),false);assert.equal(pair.lab.snapshot().nest.scraps.length,0);
  assert.notEqual(pair.lab.snapshot().resonance.position[0],999);assert.equal(pair.lab.snapshot().nest.heart,'dormant');
});
available('thirty minutes of control changes retain finite bounded state and small archives',()=>{
  const pair=fresh('mass');let last=0;
  for(let frame=0;frame<18000;frame++) {
    if(frame%73===0)act(pair,'resonance-power');
    if(frame%101===0)act(pair,'resonance-tone',{tone:1+(frame%3)});
    if(frame%127===0)act(pair,'draft-turn',{direction:1});
    if(frame%193===0)act(pair,'draft-power');
    if(frame%241===0)act(pair,'mist');
    advance(pair.lab,pair.life,.1);const s=pair.lab.snapshot();
    for(const value of [s.resonance.charge,s.gravity.lift,s.glass.pressure,s.mist.humidity,s.nest.progress])assert.ok(Number.isFinite(value)&&value>=0&&value<=1);
    assert.ok(s.time>=last);last=s.time;
  }
  const before=pair.lab.snapshot();for(const dt of [NaN,Infinity,-1,0])pair.lab.tick(dt,pair.life);assert.deepEqual(pair.lab.snapshot(),before);
  assert.ok(JSON.stringify(pair.lab.snapshot()).length<3000);assert.ok(JSON.stringify(pair.archive).length<150);
  assert.ok(pair.life.events.length<=4);assert.ok(pair.life.memories.length<=8);assert.equal(pair.life.chamber.job,null,'experiments do not steal the ordinary shift');
});
