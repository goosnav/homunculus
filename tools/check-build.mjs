import { readFile,readdir,stat } from 'node:fs/promises';
import assert from 'node:assert/strict';
const root=new URL('../dist/',import.meta.url);
const index=await readFile(new URL('index.html',root),'utf8');
assert.match(index,/Spawn homunculus/);
assert.doesNotMatch(index,/\/app\.js|\/api\/bootstrap/);
for(const file of ['assets/resident.glb','assets/skeleton.glb','assets/comic/excerpts.json','vendor/transformers/ort-wasm-simd-threaded.jsep.wasm'])assert.ok((await stat(new URL(file,root))).size>0,file);
const excerpts=JSON.parse(await readFile(new URL('assets/comic/excerpts.json',root),'utf8'));
assert.ok(excerpts.pages.length>=2&&excerpts.pages.length<excerpts.source_pages);
for(const page of excerpts.pages){assert.ok(page.text.length>0);await stat(new URL(page.image,root));}
let count=0,total=0;
async function inspect(folder){for(const name of await readdir(folder)){const url=new URL(name,folder),info=await stat(url);if(info.isDirectory()){await inspect(new URL(name+'/',folder));continue;}
 count++;total+=info.size;assert.ok(info.size<=25*1024*1024,`${url.pathname} exceeds Pages' individual file limit`);
 if(name.endsWith('.js'))assert.doesNotMatch(await readFile(url,'utf8'),/\/api\/(?:state|interact|bootstrap)|localhost:11434|127\.0\.0\.1:11434/);
 assert.ok(!name.endsWith('.pdf'),'Never ship the full source book');
 assert.ok(!name.endsWith('.zip'),'Keep downloadable archives outside the deployment folder');
}}
await inspect(root);console.log(`Static build checked: ${count} files, ${(total/1048576).toFixed(1)} MiB; excerpts only, no desktop API or Ollama calls.`);
