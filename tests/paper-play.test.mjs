import test from 'node:test';
import assert from 'node:assert/strict';
import {Life} from '../web/life.js';
import {PaperPlay,paperPlayAvailability,paperPlayClue} from '../web/paper-play.js';
import * as THREE from 'three';
import {PaperPlayView} from '../web/paper-play-view.js';

function fresh(random=()=>.7){
 const life=new Life({random:()=>.2,afterHours:false});
 life.arrival=null;life.path=[];life.activity='watch';life.nextVisitor=Infinity;
 return {life,play:new PaperPlay({random})};
}
const act=(p,kind,payload)=>p.play.interact(p.life,kind,payload);
function advance(p,seconds){for(let t=0;t<seconds-1e-8;t+=.1){p.life.age+=.1;p.play.tick(.1,p.life);}}
function finish(p){const job=p.life.chamber.job;assert.ok(job?.item.startsWith('play:'));advance(p,job.duration);p.life.chamber.job=null;p.life.path=[];p.life.activity='watch';return p.play.complete(p.life,job.item.slice(5));}
function folded(p){assert.equal(act(p,'fold-plane'),true);assert.equal(finish(p),true);assert.equal(p.play.snapshot().state,'ready');}

test('one real folded plane can be thrown, retrieved and used again',()=>{
 const p=fresh();assert.equal(act(p,'launch-plane'),false);folded(p);
 assert.equal(act(p,'fold-plane'),false);assert.equal(act(p,'launch-plane'),true);
 assert.equal(p.play.snapshot().state,'flying');assert.equal(act(p,'launch-plane'),false);
 p.life.chamber.cooperation=-1;advance(p,15);assert.equal(p.play.snapshot().state,'landed');
 assert.equal(act(p,'retrieve-plane'),false);p.life.chamber.cooperation=0;
 assert.equal(act(p,'retrieve-plane'),true);assert.equal(p.play.snapshot().state,'landed');assert.equal(finish(p),true);
 assert.equal(p.play.snapshot().state,'ready');assert.equal(act(p,'launch-plane'),true);assert.equal(p.play.snapshot().launches,2);
});
test('folding and retrieval respect executor ownership and physical interruptions',()=>{
 const p=fresh();p.life.chamber.job={item:'night:answer'};const before=p.life.chamber.job;
 assert.equal(act(p,'fold-plane'),false);assert.equal(p.life.chamber.job,before);p.life.chamber.job=null;
 for(const guard of ['arrival','coercion','gravity','anvil','refusal']){
  p.life.arrival=guard==='arrival'?{}:null;p.life.activity=guard==='coercion'?'confined':'watch';
  p.life.laboratory.gravity.lift=guard==='gravity'?.5:0;p.life.anvils=guard==='anvil'?[{hit:false}]:[];p.life.chamber.cooperation=guard==='refusal'?-1:0;
  assert.equal(act(p,'fold-plane'),false,guard);
 }
});
test('cancelled or stale work cannot create a plane or finish a retrieval',()=>{
 for(const reason of ['read','confine','anvil','cancelled']){
  const p=fresh();assert.equal(act(p,'fold-plane'),true);p.play.interrupt(p.life,reason);p.life.chamber.job=null;
  assert.equal(p.play.complete(p.life,'fold-plane'),false);assert.equal(p.play.snapshot().state,'absent');
  assert.equal(act(p,'fold-plane'),true);p.life.epoch++;advance(p,.1);assert.equal(p.play.complete(p.life,'fold-plane'),false);assert.equal(p.play.snapshot().state,'absent');
 }
 const p=fresh();folded(p);act(p,'launch-plane');p.life.chamber.cooperation=-1;advance(p,15);p.life.chamber.cooperation=0;
 act(p,'retrieve-plane');p.play.interrupt(p.life,'cancelled');p.life.chamber.job=null;assert.equal(p.play.complete(p.life,'retrieve-plane'),false);assert.equal(p.play.snapshot().state,'landed');
});
test('wind steers flights and mist soaks the paper, which can be refolded',()=>{
 const a=fresh(),b=fresh();for(const p of [a,b]){folded(p);act(p,'launch-plane');p.life.chamber.cooperation=-1;}
 b.life.laboratory.draft.x=.28;advance(a,2);advance(b,2);assert.ok(b.play.snapshot().position[0]-a.play.snapshot().position[0]>.15);
 b.life.laboratory.mist.on=true;advance(b,15);assert.equal(b.play.snapshot().state,'soggy');assert.ok(b.play.snapshot().wetness>=.7);
 b.life.chamber.cooperation=0;assert.equal(act(b,'fold-plane'),true);assert.equal(finish(b),true);assert.equal(b.play.snapshot().state,'ready');assert.equal(b.play.snapshot().wetness,0);
});
test('gravity floats the loose plane while preserving busy resident work',()=>{
 const p=fresh();folded(p);act(p,'launch-plane');p.life.laboratory.gravity.lift=1;p.life.chamber.job={item:'night:answer'};
 const job=p.life.chamber.job;advance(p,12);assert.equal(p.life.chamber.job,job);assert.equal(p.play.snapshot().state,'flying');assert.ok(p.play.snapshot().position[1]>1);
 assert.equal(act(p,'retrieve-plane'),false);p.life.laboratory.gravity.lift=0;advance(p,15);assert.equal(p.play.snapshot().state,'landed');
});
test('a seeded impossible return stays in the observed room and occurs only once per flight',()=>{
 const p=fresh(()=>.05);folded(p);act(p,'launch-plane');p.life.chamber.cooperation=-1;let appeared=false;
 for(let i=0;i<150;i++){advance(p,.1);const s=p.play.snapshot();if(s.returned)appeared=true;assert.ok(Math.abs(s.position[0])<=2.8);assert.ok(s.position[2]>=-1.85&&s.position[2]<=1.85);}
 assert.equal(appeared,true);assert.equal(p.life.events.filter(e=>e.text.includes('opposite wall')).length,1);assert.equal(p.play.snapshot().state,'landed');
});
test('an idle willing resident watches then retrieves the plane without taking occupied jobs',()=>{
 const p=fresh();folded(p);act(p,'launch-plane');advance(p,.1);assert.equal(p.life.attention?.kind,'paper-plane');
 const job={item:'night:answer'};p.life.chamber.job=job;advance(p,25);assert.equal(p.life.chamber.job,job);
 p.life.chamber.job=null;advance(p,5);assert.equal(p.life.chamber.job?.item,'play:retrieve-plane');assert.equal(finish(p),true);assert.equal(p.play.snapshot().state,'ready');
});
test('third flight adds one physical drawing and does not grow a transcript each time',()=>{
 const p=fresh();folded(p);
 for(let i=0;i<4;i++){act(p,'launch-plane');p.life.chamber.cooperation=-1;advance(p,15);p.life.chamber.cooperation=0;act(p,'retrieve-plane');finish(p);}
 assert.equal(p.play.snapshot().drawing,true);assert.equal(p.life.memories.filter(m=>m.includes('drawing')).length,1);assert.ok(paperPlayClue(p.play.snapshot()).includes('drawing'));
});
test('death, departure and coercion during flight never resurrect or seize the executor',()=>{
 for(const hazard of ['anvil','hole','departed','confined']){
  const p=fresh();folded(p);act(p,'launch-plane');advance(p,.5);
  if(hazard==='departed')p.life.finish('door');else if(hazard==='confined'){p.life.activity='confined';p.life.epoch++;}else p.life.die(hazard);
  const alive=p.life.alive;advance(p,30);assert.equal(p.life.alive,alive);assert.equal(p.life.chamber.job,null);
  assert.equal(act(p,'retrieve-plane'),false);if(hazard!=='confined'){assert.equal(p.play.snapshot().state,'landed');assert.equal(p.play.snapshot().ended,true);}
 }
});
test('snapshots are isolated and bad payloads or timesteps cannot poison state',()=>{
 const p=fresh();const s=p.play.snapshot();s.position[0]=NaN;assert.ok(Number.isFinite(p.play.snapshot().position[0]));
 for(const v of [null,[],3,'bad'])assert.equal(act(p,'fold-plane',v),false);
 assert.equal(act(p,'not-a-paper-action'),null);const before=p.play.snapshot();for(const dt of [NaN,Infinity,-1,0])p.play.tick(dt,p.life);assert.deepEqual(p.play.snapshot(),before);
});
test('availability is contextual and leaves a clear reason when resident work is blocked',()=>{
 const p=fresh();let s={...p.life.snapshot(),paperPlay:p.play.snapshot()};assert.deepEqual(paperPlayAvailability(s)['fold-plane'],[true,true]);assert.equal(paperPlayAvailability(s)['launch-plane'][0],false);
 folded(p);s={...p.life.snapshot(),paperPlay:p.play.snapshot()};assert.equal(paperPlayAvailability(s)['launch-plane'][1],true);s.chamber.job={item:'night:answer'};assert.equal(paperPlayAvailability(s)['launch-plane'][1],false);
 s.alive=false;assert.equal(paperPlayAvailability(s)['launch-plane'][1],false);
});
test('thirty minutes of repeated paper play retain one finite plane and bounded event state',()=>{
 const p=fresh(()=>.05);folded(p);
 for(let frame=0;frame<18000;frame++){
  p.life.laboratory.draft.x=frame%197<95?.28:-.28;p.life.laboratory.mist.on=frame%251<30;p.life.laboratory.gravity.lift=frame%373<90?1:0;
  const s=p.play.snapshot();if(!p.life.chamber.busy){if(s.state==='ready')act(p,'launch-plane');else if(s.state==='landed')act(p,'retrieve-plane');else if(s.state==='soggy')act(p,'fold-plane');}
  advance(p,.1);if(p.life.chamber.job?.item.startsWith('play:')&&frame%61===0){p.life.laboratory.gravity.lift=0;finish(p);}
  for(const v of p.play.snapshot().position)assert.ok(Number.isFinite(v)&&Math.abs(v)<4);
 }
 assert.ok(JSON.stringify(p.play.snapshot()).length<1200);assert.ok(p.life.events.length<=4);assert.ok(p.life.memories.length<=8);assert.ok(p.play.snapshot().launches<=999);
});
test('paper view reuses one set of geometry and picking targets across all states',()=>{
 const room={scene:new THREE.Scene(),bones:{},pose(){},body:new THREE.Group()};const view=new PaperPlayView(room);
 const geometry=new Set(),materials=new Set();room.scene.traverse(o=>{if(o.geometry)geometry.add(o.geometry);if(o.material)materials.add(o.material);});
 const p=fresh();let s={...p.life.snapshot(),paperPlay:p.play.snapshot()};view.update(s,0);assert.equal(view.root.visible,false);
 folded(p);s={...p.life.snapshot(),paperPlay:p.play.snapshot()};view.update(s,1);assert.equal(view.action,'launch-plane');
 act(p,'launch-plane');p.life.chamber.cooperation=-1;
 for(let frame=0;frame<500;frame++){advance(p,.1);s={...p.life.snapshot(),paperPlay:p.play.snapshot()};view.update(s,frame*.1);view.pose(s,frame*.1);}
 assert.equal(view.action,'retrieve-plane');assert.equal(view.targets.length,1);
 let objects=0;room.scene.traverse(o=>{objects++;if(o.geometry)assert.ok(geometry.has(o.geometry));if(o.material)assert.ok(materials.has(o.material));});assert.ok(objects<12);
 s.alive=false;view.update(s,60);assert.equal(view.action,null);assert.equal(view.target.visible,false);
 s.alive=true;s.species='human';s.walking=false;s.chamber.job={item:'play:fold-plane',progress:.2};s.laboratory.gravity.lift=.8;room.body.position.y=1.1;view.pose(s,65);assert.equal(room.body.position.y,1.1,'paper work cannot overwrite the floating body pose');
});
function runLife(l,seconds){for(let t=0;t<seconds-1e-8;t+=.1)l.tick(.1);}
function liveRoom(species){const l=new Life({random:()=>.7,afterHours:false,species});l.nextVisitor=l.nextOddity=Infinity;runLife(l,4);return l;}
test('the actual Life executor walks, folds, watches flight and retrieves without manual completion',()=>{
 const l=liveRoom();assert.equal(l.interact('fold-plane'),true);runLife(l,25);assert.equal(l.paperPlay.state,'ready');assert.equal(l.chamber.job,null);
 assert.equal(l.interact('launch-plane'),true);runLife(l,.2);assert.equal(l.snapshot().lookTarget.length,3);
 runLife(l,50);assert.equal(l.paperPlay.state,'ready');assert.equal(l.chamber.job,null);assert.ok(l.alive);
 assert.equal(l.interact('deliver',{item:'mirror'}),true);const work=l.chamber.job;assert.equal(l.interact('launch-plane'),false);assert.equal(l.chamber.job,work);runLife(l,30);assert.equal(l.chamber.mirror,true);
});
test('real forced actions cancel paper jobs and a fresh resident inherits no plane or stale work',()=>{
 for(const [action,payload]of [['confine',{}],['read',{pages:[{page:1,text:'A cold bowl.'}]}],['anvil',{}]]){
  const l=liveRoom();l.interact('fold-plane');runLife(l,1);assert.ok(l.paperPlay.pending);
  assert.equal(l.interact(action,payload),true);runLife(l,1);assert.equal(l.paperPlay.pending,null);assert.equal(l.paperPlay.state,'absent');assert.equal(l.chamber.job,null);
  assert.equal(l.paperPlay.complete(l,'fold-plane'),false);
  const successor=new Life({random:()=>.7,archive:l.chamber.archive});assert.equal(successor.paperPlay.state,'absent');assert.equal(successor.paperPlay.launches,0);assert.equal(successor.paperPlay.drawing,false);
 }
 const l=liveRoom();l.interact('fold-plane');runLife(l,20);l.interact('launch-plane');l.finish('door');runLife(l,3);assert.equal(l.paperPlay.ended,true);assert.equal(l.alive,false);assert.equal(l.chamber.job,null);assert.equal(l.interact('launch-plane'),false);
});
test('real visitor and startle pauses keep the resident’s escape path until paper play can safely resume',()=>{
 for(const scare of ['visitor','startle']){
  const l=liveRoom();l.interact('fold-plane');runLife(l,25);l.interact('launch-plane');l.chamber.cooperation=-1;runLife(l,20);l.chamber.cooperation=0;
  assert.equal(l.paperPlay.state,'landed');l.choose('escape',true);
  if(scare==='visitor')l.visitor={id:9,kind:0,born:l.age-10,duration:20,direction:1,aggressive:false,target:[...l.position],hit:false,position:[0,1.5,0]};
  else l.startledUntil=l.age+3;
  const path=l.path.map(p=>[...p]),activity=l.activity,epoch=l.epoch;runLife(l,.5);
  assert.equal(l.chamber.job,null,`${scare}: autonomous retrieval must wait`);assert.equal(l.activity,activity);assert.equal(l.epoch,epoch);assert.deepEqual(l.path,path);
  assert.equal(l.interact('retrieve-plane'),false);assert.equal(l.epoch,epoch);assert.deepEqual(l.path,path);
  assert.equal(paperPlayAvailability(l.snapshot())['retrieve-plane'][1],false);
  l.visitor=null;l.startledUntil=l.age;runLife(l,.1);assert.equal(l.chamber.job?.item,'play:retrieve-plane');
  runLife(l,30);assert.equal(l.paperPlay.state,'ready');assert.equal(l.chamber.job,null);
 }
});
test('folding, throwing and plane attention also respect active scares without treating ordinary fear as a lock',()=>{
 for(const state of ['absent','ready'])for(const scare of ['visitor','startle']){
  const p=fresh();if(state==='ready')folded(p);p.life.choose('escape',true);
  if(scare==='visitor')p.life.visitor={born:p.life.age,duration:10};else p.life.startledUntil=p.life.age+3;
  const epoch=p.life.epoch,path=p.life.path.map(v=>[...v]);assert.equal(act(p,state==='absent'?'fold-plane':'launch-plane'),false);assert.equal(p.life.epoch,epoch);assert.deepEqual(p.life.path,path);
 }
 const p=fresh();folded(p);act(p,'launch-plane');p.life.startledUntil=p.life.age+3;p.life.attention=null;advance(p,.2);assert.equal(p.life.attention,null);
 const q=fresh();q.life.temperament.fear=95;assert.equal(act(q,'fold-plane'),true,'ordinary fear does not make play permanently unavailable');
});
test('canonical carried paper drops where its resident is killed instead of returning to the folding spot',()=>{
 const l=liveRoom('slug');l.interact('fold-plane');runLife(l,25);const foldedAt=[...l.paperPlay.position];
 l.position=[2,1];l.yaw=0;l.path=[];l.activity='watch';runLife(l,.1);
 const carried=l.paperPlay.snapshot();assert.equal(carried.carried,true);assert.ok(Math.hypot(carried.position[0]-2,carried.position[2]-1)<.5);assert.notDeepEqual(carried.position,foldedAt);
 const room={scene:new THREE.Scene(),bones:{},pose(){},body:new THREE.Group()},view=new PaperPlayView(room);view.update(l.snapshot(),l.age);assert.deepEqual(view.plane.position.toArray(),carried.position,'renderer must consume the canonical carried position');
 l.interact('anvil');runLife(l,1);const dropped=l.paperPlay.snapshot();assert.equal(dropped.carried,false);assert.equal(dropped.state,'landed');assert.equal(l.alive,false);
 assert.equal(dropped.position[0],carried.position[0]);assert.equal(dropped.position[2],carried.position[2]);assert.equal(dropped.position[1],.055);
 view.update(l.snapshot(),l.age);assert.deepEqual(view.plane.position.toArray(),dropped.position);
});
test('competing work leaves the plane at the drop point and requires a real retrieval before another throw',()=>{
 const l=liveRoom('slug');l.interact('fold-plane');runLife(l,25);l.position=[2,1];l.yaw=0;l.path=[];l.activity='watch';runLife(l,.1);const carried=l.paperPlay.snapshot();
 assert.equal(l.interact('deliver',{item:'mirror'}),true);const job=l.chamber.job,epoch=l.epoch;runLife(l,.1);
 assert.equal(l.paperPlay.state,'landed');assert.equal(l.paperPlay.carried,false);assert.equal(l.chamber.job,job);assert.equal(l.epoch,epoch);
 assert.equal(l.paperPlay.position[0],carried.position[0]);assert.equal(l.paperPlay.position[2],carried.position[2]);
 l.position=[-1,-1];runLife(l,.1);assert.equal(l.paperPlay.position[0],carried.position[0]);assert.equal(l.paperPlay.position[2],carried.position[2]);assert.equal(l.interact('launch-plane'),false);
});
test('refolding a distant soggy plane leaves its visible sheet at the actual landing point during the walk',()=>{
 const p=fresh();p.life.position=[-.5,.8];p.play.state='soggy';p.play.position=[2,.055,-1];p.play.wetness=1;
 assert.equal(act(p,'fold-plane'),true);assert.ok(p.life.path.length>0);
 const room={scene:new THREE.Scene(),bones:{},pose(){},body:new THREE.Group()},view=new PaperPlayView(room);
 view.update({...p.life.snapshot(),paperPlay:p.play.snapshot()},0);assert.equal(view.plane.position.x,2);assert.equal(view.plane.position.z,-1);
});
