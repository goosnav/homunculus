import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { BrowserRoom } from '../web/browser-room.js';
test('death removes living animation and switches to the actual skeleton after the delay',()=>{
  const room=Object.create(BrowserRoom.prototype);
  Object.assign(room,{state:{alive:false,deadFor:4,skeleton:true,anvils:[],position:[0,0]},model:new THREE.Group(),skeleton:new THREE.Group(),body:new THREE.Group(),resident:new THREE.Group(),overlay:{hidden:false},hammer:{visible:true},book:{visible:true},headset:{visible:true},shadow:{visible:true,position:new THREE.Vector3()},anvilMeshes:new Map(),scene:new THREE.Scene(),speakingUntil:9,bones:{},rest:{}});
  room.animate(10,.1);
  assert.equal(room.model.visible,false);assert.equal(room.skeleton.visible,true);assert.equal(room.overlay.hidden,true);assert.equal(room.hammer.visible,false);assert.equal(room.book.visible,false);assert.equal(room.speakingUntil,0);
});
test('materialization reveals solid surfaces progressively and finishes with the resident',()=>{
  const room=Object.create(BrowserRoom.prototype);room.scene=new THREE.Scene();room.model=new THREE.Group();
  for(let i=0;i<20;i++)room.scene.add(new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial()));
  room.materialize(0);assert.equal(room.model.visible,false);assert.ok(room.scene.children.every(m=>m.material.wireframe));
  room.materialize(.5);const solid=room.scene.children.filter(m=>!m.material.wireframe).length;assert.ok(solid>0&&solid<20);
  room.materialize(1);assert.equal(room.model.visible,true);assert.ok(room.scene.children.every(m=>!m.material.wireframe));
});
