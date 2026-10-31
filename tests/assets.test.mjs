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
