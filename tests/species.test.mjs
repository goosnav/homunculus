import test from 'node:test';
import assert from 'node:assert/strict';
import {Life} from '../web/life.js';
import {mindMessages} from '../web/mind.js';

test('random spawning reaches the human, slug, worm and mass with no saved-life override',()=>{
 const kinds=[.05,.3,.55,.8].map(random=>new Life({random:()=>random}).snapshot().species);
 assert.deepEqual(kinds,['human','slug','worm','mass']);
 const l=new Life({species:'worm',archive:{species:'mass',alive:true},random:()=>.2});assert.equal(l.species,'worm');assert.equal(l.age,0);
});
test('a body premise matches the actual occupant and remains within the normal prompt system',()=>{
 for(const species of ['human','slug','worm','mass']){
  const l=new Life({species});const system=mindMessages(l,null)[0].content;
  assert.equal(l.snapshot().species,species);assert.match(system,species==='human'?/man/:species==='mass'?/biological mass/:new RegExp(species));
  if(species!=='human')assert.doesNotMatch(system,/Speak as this man|unhappy man/);
 }
});
test('unknown body identifiers cannot become asset URLs; creatures die without a human skeleton',()=>{
 const invalid=new Life({species:'../../secret'});assert.equal(invalid.species,'human');
 for(const species of ['human','slug','worm','mass']){const l=new Life({species});l.die('anvil');for(let i=0;i<20;i++)l.tick(.25);assert.equal(l.alive,false);assert.equal(l.snapshot().skeleton,species==='human');assert.equal(l.snapshot().remains,species==='human'?'skeleton':'husk');}
});
