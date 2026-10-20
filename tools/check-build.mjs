import { readFile,readdir,stat } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root=new URL('../dist/',import.meta.url);
const index=await readFile(new URL('index.html',root),'utf8');
assert.match(index,/Spawn homunculus/);
assert.doesNotMatch(index,/\/app\.js|\/api\/bootstrap/);
for(const file of ['assets/resident.glb','assets/skeleton.glb','assets/comic/excerpts.json','vendor/transformers/ort-wasm-simd-threaded.jsep.wasm'])assert.ok((await stat(new URL(file,root))).size>0,file);
const excerpts=JSON.parse(await readFile(new URL('assets/comic/excerpts.json',root),'utf8'));
assert.ok(excerpts.pages.length>=2&&excerpts.pages.length<excerpts.source_pages);
for(const page of excerpts.pages){assert.ok(page.text.length>0);await stat(new URL(page.image,root));}
const modelRoot=new URL('models/smollm2-135m/',root);
const manifest=JSON.parse(await readFile(new URL('manifest.json',modelRoot),'utf8'));
const lock=JSON.parse(await readFile(new URL('../tools/model-lock.json',import.meta.url),'utf8'));
assert.equal(manifest.revision,lock.revision);
for(const expected of lock.files){
 const file=manifest.files[expected.name];assert.ok(file,expected.name);let bytes=0;const digest=createHash('sha256');
 for(const part of file.parts){
  const data=await readFile(new URL(part.path,modelRoot));bytes+=data.length;digest.update(data);
  assert.equal(data.length,part.size);assert.equal(createHash('sha256').update(data).digest('hex'),part.sha256);
 }
 assert.equal(bytes,expected.size);assert.equal(digest.digest('hex'),expected.sha256);
}
let count=0,total=0;
async function inspect(folder){for(const name of await readdir(folder)){const url=new URL(name,folder),info=await stat(url);if(info.isDirectory()){await inspect(new URL(name+'/',folder));continue;}
 count++;total+=info.size;assert.ok(info.size<=25*1024*1024,`${url.pathname} exceeds Pages' individual file limit`);
 if(name.endsWith('.js'))assert.doesNotMatch(await readFile(url,'utf8'),/\/api\/(?:state|interact|bootstrap)|localhost:11434|127\.0\.0\.1:11434/);
 assert.ok(!name.endsWith('.pdf'),'Never ship the full source book');
 assert.ok(!name.endsWith('.zip'),'Keep downloadable archives outside the deployment folder');
}}
await inspect(root);console.log(`Static build checked: ${count} files, ${(total/1048576).toFixed(1)} MiB; complete local model, excerpts only, no desktop API or Ollama calls.`);
