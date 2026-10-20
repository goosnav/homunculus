import test from 'node:test';
import assert from 'node:assert/strict';
import {Life,walkable} from '../web/life.js';
const run=(life,seconds)=>{for(let t=0;t<seconds;t+=.1)life.tick(.1);};
test('arrival starts above the room, varies landing points, then hands control to the resident',()=>{
 const a=new Life({random:()=>.2}),b=new Life({random:()=>.8});
 assert.ok(a.snapshot().arrival.height>=5);
 assert.notDeepEqual(a.position,b.position);
 assert.ok(walkable(...a.position)&&walkable(...b.position));
 run(a,4);assert.equal(a.snapshot().arrival,null);assert.equal(a.alive,true);
});
test('floor void kills on contact and cannot return a skeleton or accept a late thought',()=>{
 const life=new Life();run(life,4);life.interact('hole');
 assert.ok(life.snapshot().hole);
 life.position=[life.hole.x,life.hole.z];life.path=[];life.seated=false;
 const epoch=life.epoch;run(life,1);
 assert.equal(life.alive,false);assert.equal(life.deathCause,'hole');
 run(life,5);assert.equal(life.snapshot().skeleton,false);
 assert.equal(life.applyThought({action:'watch',say:'I am back.'},epoch),false);
 assert.equal(life.interact('message',{text:'Hello?'}),false);
});
test('a hole remains bounded and a nearby resident is not killed until crossing its edge',()=>{
 const life=new Life();run(life,4);life.interact('hole');
 const hole=life.hole;
 for(let i=0;i<20;i++)life.interact('hole');
 assert.equal(life.hole,hole);
 life.position=[-1,.9];life.path=[];life.seated=false;life.remaining=100;
 run(life,1);assert.equal(life.alive,true);
 life.position=[hole.x-.8,hole.z];life.path=[[hole.x+.8,hole.z]];
 run(life,3);assert.equal(life.alive,false);
});
test('rare solids pass through, provoke fear and retire without accumulating objects',()=>{
 const life=new Life({random:()=>.1});run(life,4);
 assert.equal(life.visitor,null);assert.ok(life.nextVisitor>=180);
 life.nextVisitor=life.age;life.tick(.1);
 assert.ok(life.visitor);const id=life.visitor.id;
 life.visitor.born=life.age-life.visitor.duration*.45;
 life.position=[0,.2];life.path=[];life.tick(.1);
 assert.equal(life.snapshot().feeling,'afraid');assert.ok(life.snapshot().lookTarget);
 assert.equal(life.visitor.id,id);
 run(life,30);assert.equal(life.visitor,null);
 assert.ok(life.nextVisitor>life.age);
});
test('hostile solids can startle the resident but cannot revive the dead',()=>{
 const life=new Life({random:()=>.1});run(life,4);life.nextVisitor=life.age;life.tick(.1);
 life.position=[0,.2];life.path=[];life.visitor.aggressive=true;life.visitor.target=[...life.position];
 life.visitor.born=life.age-life.visitor.duration*.53;life.tick(.1);
 assert.ok(life.startledUntil>life.age);assert.equal(life.alive,true);
 life.interact('close');run(life,40);assert.equal(life.alive,false);assert.equal(life.visitor,null);
});
test('a visitor shove replans around furniture; a seated resident stays in his seat',()=>{
 const life=new Life({random:()=>.1});life.arrival=null;life.position=[-1.75,-1.25];
 life.choose('hammer',true);life.path.shift();life.age=20;life.nextVisitor=Infinity;
 life.visitor={id:1,kind:0,born:20-20*.54,duration:20,direction:1,aggressive:true,target:[-1.3,-1.5],hit:false,position:[0,0,0]};
 life.updateVisitor();assert.deepEqual(life.position,[-2.25,-1]);
 const visitor=life.visitor;life.visitor=null;life.startledUntil=0;
 for(let i=0;i<100;i++){life.tick(.1);assert.ok(walkable(...life.position),`invalid position ${life.position}`);}
 life.seated=true;life.position=[1.96,-.22];const seated=[...life.position];
 life.visitor={...visitor,hit:false,born:life.age-20*.54,target:[...seated]};
 life.updateVisitor();assert.deepEqual(life.position,seated);assert.equal(life.seated,true);
});
