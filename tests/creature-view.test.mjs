import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Room} from '../web/room.js';
import {BrowserRoom} from '../web/browser-room.js';
import {animateCreature,attachBodyGear,disposeBody,switchBody} from '../web/creature-view.js';

const species=['slug','worm','mass'];
async function loadBody(kind){
  const bytes=await readFile(new URL(`../web/assets/creatures/${kind}.glb`,import.meta.url));
  return new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
}
async function fixture(kind){
  const {scene:model}=await loadBody(kind);
  const room={species:kind,model,formation:1,speakingUntil:0,scene:new THREE.Scene(),resident:new THREE.Group(),body:new THREE.Group(),
    overlay:{hidden:false},skeleton:new THREE.Group(),hammer:new THREE.Group(),headset:new THREE.Group(),
    book:new THREE.Mesh(new THREE.BoxGeometry(.2,.035,.27),new THREE.MeshLambertMaterial()),
    cable:new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({length:24},()=>new THREE.Vector3())),new THREE.LineBasicMaterial()),
    shadow:new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial()),
    bones:{},rest:{},nativeMorphs:[],assetLoads:new Map(),pose:Room.prototype.pose,materialize:BrowserRoom.prototype.materialize};
  room.scene.add(room.resident,room.shadow,room.cable);room.resident.add(room.body);room.body.add(model,room.skeleton);
  model.traverse(b=>{if(b.isBone){const key=b.name.replaceAll('.','');room.bones[key]=b;room.rest[key]={q:b.quaternion.clone(),p:b.position.clone(),s:b.scale.clone()};}});
  room.headBone=room.bones.head;attachBodyGear(room);return room;
}
const state=kind=>({species:kind,alive:true,walking:false,seated:false,activity:'watch',position:[0,0],yaw:0,affect:{fear:20},feeling:'sad',startled:0,chamber:{job:null},laboratory:{reaction:{}}});
const bonePose=room=>Object.values(room.bones).flatMap(b=>[...b.position.toArray(),...b.quaternion.toArray(),...b.scale.toArray()]);
function finitePose(room){
  room.scene.updateMatrixWorld(true);
  room.model.traverse(node=>assert.ok(node.matrixWorld.elements.every(Number.isFinite),`${node.name} has a nonfinite transform`));
}
function cleanup(t,room){t.after(()=>{disposeBody(room.model);disposeBody(room.shadow);disposeBody(room.cable);});}
function resources(model){
  const geometries=new Set(),materials=new Set(),skeletons=new Set();
  model.traverse(node=>{
    if(node.geometry)geometries.add(node.geometry);
    if(node.skeleton)skeletons.add(node.skeleton);
    for(const material of node.material?(Array.isArray(node.material)?node.material:[node.material]):[])materials.add(material);
  });
  return {geometries,materials,skeletons};
}
function disposalCounts(items){
  const counts=new Map();
  for(const item of items){counts.set(item,0);item.addEventListener('dispose',()=>counts.set(item,counts.get(item)+1));}
  return counts;
}

test('each shipped creature moves its actual rig and travels toward its autonomous destination',async t=>{
  for(const kind of species){
    const room=await fixture(kind);cleanup(t,room);const s=state(kind);
    animateCreature(room,s,1,.1);const idle=bonePose(room);
    s.walking=true;s.activity='pace';s.position=[1,.5];animateCreature(room,s,1,.1);
    assert.notDeepEqual(bonePose(room),idle,`${kind} must have a locomotion pose`);
    assert.ok(room.resident.position.x>0&&room.resident.position.x<1);
    assert.ok(room.resident.position.z>0&&room.resident.position.z<.5);
    assert.equal(room.model.visible,true);assert.equal(room.skeleton.visible,false);finitePose(room);
  }
});

test('resting creatures settle on their seat and use a different head pose',async t=>{
  for(const kind of species){
    const room=await fixture(kind);cleanup(t,room);const s=state(kind);
    animateCreature(room,s,1,.1);const upright=room.bones.head.quaternion.clone(),height=room.body.position.y;
    s.activity='rest';s.seated=true;animateCreature(room,s,1,.1);
    assert.ok(room.body.position.y>height,`${kind} should occupy the bed height`);
    assert.ok(room.bones.head.quaternion.angleTo(upright)>.01,`${kind} should rest its head`);finitePose(room);
  }
});

test('speech opens each real jaw and returns it to rest when the voice stops',async t=>{
  for(const kind of species){
    const room=await fixture(kind);cleanup(t,room);const s=state(kind);
    animateCreature(room,s,1,.1);const quiet=room.bones.jaw.quaternion.clone();
    room.speakingUntil=2;animateCreature(room,s,1,.1);
    assert.ok(room.bones.jaw.quaternion.angleTo(quiet)>.01,`${kind} jaw must move for speech`);
    room.speakingUntil=0;animateCreature(room,s,1,.1);
    assert.deepEqual(room.bones.jaw.quaternion.toArray(),quiet.toArray());finitePose(room);
  }
});

test('slug moisture stretch and alarm curl visibly change its body independently',async t=>{
  const room=await fixture('slug');cleanup(t,room);const s=state('slug');
  animateCreature(room,s,1,.1);const neutral=room.body.scale.clone();
  s.laboratory.reaction={stretch:1};animateCreature(room,s,1,.1);
  assert.ok(room.body.scale.z>neutral.z,'moisture should visibly extend the slug');
  s.laboratory.reaction={curl:1};animateCreature(room,s,1,.1);
  assert.ok(room.body.scale.y<neutral.y&&room.body.scale.z<neutral.z,'alarm should visibly contract the slug');
  s.laboratory.reaction={};animateCreature(room,s,1,.1);
  assert.deepEqual(room.body.scale.toArray(),neutral.toArray(),'reactions cannot accumulate scale across frames');finitePose(room);
});

test('worm resonance stretch and alarm curl each affect the rendered creature',async t=>{
  const room=await fixture('worm');cleanup(t,room);const s=state('worm');
  animateCreature(room,s,1,.1);const length=room.body.scale.z,neutral=bonePose(room);
  s.laboratory.reaction={stretch:1};animateCreature(room,s,1,.1);
  assert.ok(room.body.scale.z>length,'resonance should visibly lengthen the worm');
  s.laboratory.reaction={curl:1};animateCreature(room,s,1,.1);
  assert.notDeepEqual(bonePose(room),neutral,'alarm should visibly bend the worm');finitePose(room);
});

test('a comfortable mass spreads sideways without increasing its height',async t=>{
  const room=await fixture('mass');cleanup(t,room);const s=state('mass');
  animateCreature(room,s,1,.1);const neutral=room.bones.body3.scale.clone();
  s.laboratory.reaction={spread:1};animateCreature(room,s,1,.1);
  assert.ok(room.bones.body3.scale.x>neutral.x&&room.bones.body3.scale.y<neutral.y);finitePose(room);
});

test('working creatures retain their reaching head pose after the gaze pass',async t=>{
  for(const kind of species){
    const room=await fixture(kind);cleanup(t,room);const s=state(kind);
    animateCreature(room,s,1,.1);const idle=room.bones.head.quaternion.clone();
    s.activity='tinker';s.chamber.job={item:'lab:fit-cloth'};animateCreature(room,s,1,.1);
    assert.ok(room.bones.head.quaternion.angleTo(idle)>.01,`${kind} work pose must survive the final gaze update`);finitePose(room);
  }
});

test('reading and uploading show attached gear only while the creature is settled',async t=>{
  for(const kind of species){
    const room=await fixture(kind);cleanup(t,room);const s=state(kind);
    s.activity='read';animateCreature(room,s,1,.1);assert.equal(room.book.visible,true);
    assert.ok(room.model.getObjectById(room.book.id),'the book stays attached to this creature');
    s.activity='upload';animateCreature(room,s,1,.1);
    assert.equal(room.book.visible,false);assert.equal(room.headset.visible,true);assert.equal(room.cable.visible,true);
    assert.ok([...room.cable.geometry.attributes.position.array].every(Number.isFinite));
    s.walking=true;animateCreature(room,s,1,.1);assert.equal(room.headset.visible,false);assert.equal(room.cable.visible,false);finitePose(room);
  }
});

test('death leaves a collapsed creature, while holes and departure hide it without a human skeleton',async t=>{
  for(const kind of species){
    const room=await fixture(kind);cleanup(t,room);const s=state(kind);
    s.activity='upload';animateCreature(room,s,1,.1);
    s.alive=false;s.activity='dead';s.deathCause='anvil';s.deadFor=4;animateCreature(room,s,2,.1);
    assert.equal(room.model.visible,true);assert.ok(room.body.scale.y<.5);assert.equal(room.skeleton.visible,false);
    for(const prop of ['hammer','headset','book','cable'])assert.equal(room[prop].visible,false,`${kind} ${prop}`);
    assert.equal(room.overlay.hidden,true);
    s.deathCause='hole';s.deadFor=.5;animateCreature(room,s,2,.1);
    assert.equal(room.model.visible,true);assert.ok(room.body.position.y<0);assert.equal(room.shadow.visible,false);
    s.deadFor=2;animateCreature(room,s,2,.1);assert.equal(room.model.visible,false);assert.equal(room.skeleton.visible,false);
    s.outcome={kind:'door'};animateCreature(room,s,2,.1);
    assert.equal(room.model.visible,false);assert.equal(room.shadow.visible,false);finitePose(room);
  }
});

test('body disposal releases shared geometry, material textures and skeleton textures exactly once',async()=>{
  const {scene:model}=await loadBody('slug'),owned=resources(model),texture=new THREE.Texture();
  for(const material of owned.materials)material.map=texture;
  const firstGeometry=[...owned.geometries][0],firstMaterial=[...owned.materials][0];
  model.add(new THREE.Mesh(firstGeometry,firstMaterial));
  const boneTextures=[];
  for(const skeleton of owned.skeletons){skeleton.computeBoneTexture();boneTextures.push(skeleton.boneTexture);}
  assert.ok(boneTextures.length>0,'exercise the real exported skin');
  const counts=disposalCounts([...owned.geometries,...owned.materials,texture,...boneTextures]);
  disposeBody(model);
  for(const count of counts.values())assert.equal(count,1);
  for(const skeleton of owned.skeletons)assert.equal(skeleton.boneTexture,null);
});

test('a late body download cannot replace the newer selection or dispose shared gear',async t=>{
  const room=await fixture('slug');cleanup(t,room);
  const oldBody=room.model,oldCounts=disposalCounts([...resources(oldBody).geometries].filter(geometry=>geometry!==room.book.geometry));
  // GLTF parsing remains real; only the external download is held to control arrival order.
  const downloads=new Map();
  t.mock.method(GLTFLoader.prototype,'loadAsync',url=>new Promise(resolve=>downloads.set(url,resolve)));
  const worm=await loadBody('worm'),mass=await loadBody('mass');
  const staleCounts=disposalCounts(resources(worm.scene).geometries),gearCounts=disposalCounts([room.book.geometry]);
  const first=switchBody(room,'worm'),second=switchBody(room,'mass');
  assert.equal(downloads.size,2);
  downloads.get('/assets/creatures/mass.glb')(mass);await second;
  assert.equal(room.species,'mass');assert.equal(room.model,mass.scene);assert.equal(oldBody.parent,null);
  downloads.get('/assets/creatures/worm.glb')(worm);await first;
  assert.equal(room.species,'mass');assert.equal(room.model,mass.scene);assert.equal(worm.scene.parent,null);
  for(const count of oldCounts.values())assert.equal(count,1);
  for(const count of staleCounts.values())assert.equal(count,1);
  assert.equal(gearCounts.get(room.book.geometry),0,'reused gear must survive disposal of the old body');
  assert.ok(room.model.getObjectById(room.book.id));assert.ok(room.model.getObjectById(room.headset.id));
});
