import test from 'node:test';
import assert from 'node:assert/strict';
import { Temperament } from '../web/temperament.js';

const resident = overrides => ({alive:true,age:12,energy:85,activity:'watch',position:[0,0],chamber:{cooperation:0,lights:true},...overrides});
const advance = (temperament,life,seconds,step=.1) => {
  for(let elapsed=0;elapsed<seconds-1e-8;elapsed+=step) temperament.tick(Math.min(step,seconds-elapsed),life);
};
const bounded = value => Object.values(value).every(n=>Number.isFinite(n)&&n>=0&&n<=100);

test('trust and energy report the resident’s real cooperation and reserves',()=>{
  const temperament=new Temperament(),life=resident();
  assert.equal(temperament.snapshot(life).trust,40);
  assert.equal(temperament.snapshot(life).energy,85);
  life.chamber.cooperation=-2;life.energy=7;
  assert.equal(temperament.snapshot(life).trust,0);
  assert.equal(temperament.snapshot(life).energy,7);
  life.chamber.cooperation=3;
  assert.equal(temperament.snapshot(life).trust,100);
});

test('accepted stimuli leave emotional consequences after the stimulus ends',()=>{
  const temperament=new Temperament(),life=resident(),before=temperament.snapshot(life);
  temperament.pulse('tap');
  const tapped=temperament.snapshot(life);
  assert.ok(tapped.irritation>before.irritation);
  temperament.pulse('confine');
  const confined=temperament.snapshot(life);
  assert.ok(confined.fear>tapped.fear+20);
  temperament.tick(.1,life);
  assert.ok(temperament.snapshot(life).fear>tapped.fear+20,'fear cannot vanish when the incident ends');
  temperament.pulse('soothe');temperament.pulse('feed');
  const comforted=temperament.snapshot(life);
  assert.ok(comforted.fear<confined.fear);
  assert.ok(comforted.irritation<confined.irritation);
  assert.equal(comforted.trust,40,'kindness affects trust through actual chamber cooperation');
});

test('curiosity responds to discoveries and irritation responds to forced reading',()=>{
  const temperament=new Temperament(),life=resident(),before=temperament.snapshot(life);
  temperament.pulse('discovery');
  assert.ok(temperament.snapshot(life).curiosity>before.curiosity);
  temperament.pulse('read');
  assert.ok(temperament.snapshot(life).irritation>before.irritation);
  temperament.pulse('mishap');
  assert.ok(temperament.snapshot(life).fear>before.fear);
});

test('fear and irritation recover gradually with equal results at different frame rates',()=>{
  const slow=new Temperament(),fast=new Temperament(),life=resident();
  slow.pulse('confine');fast.pulse('confine');
  const initial=slow.snapshot(life);
  advance(slow,life,40,.2);advance(fast,life,40,1/60);
  const recovered=slow.snapshot(life),other=fast.snapshot(life);
  assert.ok(recovered.fear<initial.fear&&recovered.fear>0);
  assert.ok(recovered.irritation<initial.irritation);
  for(const key of ['fear','curiosity','irritation'])assert.ok(Math.abs(recovered[key]-other[key])<1e-8,key);
});

test('ongoing danger sustains fear while quiet rest helps recovery, independently of model labels',()=>{
  const danger=new Temperament(),rest=new Temperament(),calm=new Temperament(),afraid=new Temperament();
  const safe=resident(),threatened=resident({visitor:{position:[1,1,0],aggressive:true}});
  advance(danger,threatened,30);advance(rest,resident({activity:'rest'}),30);
  assert.ok(danger.snapshot(threatened).fear>rest.snapshot(safe).fear+25);
  advance(calm,{...safe,feeling:'calm'},30);advance(afraid,{...safe,feeling:'afraid'},30);
  assert.deepEqual(calm.snapshot(safe),afraid.snapshot(safe),'a model label is not a physical incident');
});

test('malformed inputs and repeated stimuli cannot create nonfinite or unbounded readings',()=>{
  const temperament=new Temperament(),life=resident(),initial=temperament.snapshot(life);
  for(const strength of [NaN,Infinity,-1])temperament.pulse('confine',strength);
  for(const dt of [NaN,Infinity,-1,0])temperament.tick(dt,life);
  for(const kind of ['unknown','toString','__proto__'])temperament.pulse(kind);
  assert.deepEqual(temperament.snapshot(life),initial);
  for(let i=0;i<1000;i++)for(const kind of ['tap','visitor','mishap','discovery'])temperament.pulse(kind);
  assert.ok(bounded(temperament.snapshot(life)));
  assert.ok(bounded(temperament.snapshot(resident({energy:NaN,chamber:{cooperation:Infinity}}))));
  const copy=temperament.snapshot(life);copy.fear=-999;
  assert.ok(bounded(temperament.snapshot(life)),'snapshots cannot mutate the resident');
});

test('death or departure stops recovery and ignores late stimuli without affecting another life',()=>{
  for(const ending of [{alive:false},{outcome:{kind:'door'}}]){
    const temperament=new Temperament(),life=resident(ending);
    temperament.pulse('confine');temperament.tick(.1,life);
    const ended=temperament.snapshot(life);
    temperament.pulse('feed');advance(temperament,life,120);
    assert.deepEqual(temperament.snapshot(life),ended);
    assert.ok(new Temperament().snapshot(resident()).fear<ended.fear);
  }
});
