import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../web/assets/',import.meta.url);
test('current owner character has a native frown, mouth shapes and blinking eyes',async()=>{
 const bytes=await readFile(new URL('resident.glb',root)),gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));
 const morphs=gltf.meshes.flatMap(m=>m.extras?.targetNames||[]);
 for(const name of ['frown','wide','round','jaw_fix','blink'])assert.ok(morphs.includes(name),`native ${name}`);
 assert.ok(gltf.nodes.some(n=>n.name==='jaw'));assert.ok(bytes.length<3*1024*1024);
});
test('bundled models exactly match recorded owner asset provenance',async()=>{
 const lock=JSON.parse(await readFile(new URL('asset-lock.json',root),'utf8'));
 assert.match(lock.sourceCommit,/^[a-f0-9]{40}$/);
 for(const file of lock.files){const bytes=await readFile(new URL(file.destination,root));assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256);}
});

test('all three creature GLBs match their original rig manifest and remain tiny and self-contained',async()=>{
 const manifest=JSON.parse(await readFile(new URL('creatures/source-manifest.json',root),'utf8'));
 assert.match(manifest.source_commit,/^[a-f0-9]{40}$/);assert.equal(manifest.assets.length,3);
 for(const asset of manifest.assets){
  const bytes=await readFile(new URL(`creatures/${asset.id}.glb`,root));assert.equal(bytes.length,asset.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256);assert.ok(bytes.length<200000);
  const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));const names=gltf.nodes.map(n=>n.name);
  for(const bone of ['root','head','jaw','eye.L','eye.R',...Array.from({length:7},(_,i)=>`body.${i}`)])assert.ok(names.includes(bone),`${asset.id}: ${bone}`);
  assert.equal(gltf.images?.length||0,0);assert.ok(gltf.skins.length>0);assert.ok(gltf.buffers.every(b=>!b.uri));
 }
});
