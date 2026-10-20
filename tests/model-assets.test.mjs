import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const hash=b=>createHash('sha256').update(b).digest('hex');
const bytes=Buffer.from('these are tiny model weights');
const pieces=[bytes.subarray(0,10),bytes.subarray(10)];
const manifest={files:{'onnx/model_quantized.onnx':{size:bytes.length,parts:pieces.map(b=>({path:hash(b)+'.bin',size:b.length,sha256:hash(b)}))}}};
async function loader(options={}){const mod=await import('../web/model-assets.js');return mod.createModelCache({baseURL:'https://game.test/models/test/',manifest,...options});}
test('model parts reassemble in order and persistent cache avoids a second download',async()=>{
 const stored=new Map(),cache={match:async k=>stored.get(k)?.clone(),put:async(k,v)=>stored.set(k,v.clone())};let requests=0;
 const fetcher=async url=>{requests++;return new Response(pieces[manifest.files['onnx/model_quantized.onnx'].parts.findIndex(p=>url.endsWith(p.path))]);};
 const first=await loader({cache,fetcher});const response=await first.match('/models/test/onnx/model_quantized.onnx');
 assert.equal(response.headers.get('content-length'),String(bytes.length));assert.deepEqual(Buffer.from(await response.arrayBuffer()),bytes);
 const second=await loader({cache,fetcher});assert.deepEqual(Buffer.from(await (await second.match('/models/test/onnx/model_quantized.onnx')).arrayBuffer()),bytes);assert.equal(requests,2);
 assert.equal(await first.match('https://elsewhere.test/model'),undefined);
});
test('truncated or corrupt model parts fail before reaching inference and are not cached',async()=>{
 let writes=0;const model=await loader({cache:{match:async()=>undefined,put:async()=>{writes++;}},fetcher:async()=>new Response('bad')});
 await assert.rejects((await model.match('/models/test/onnx/model_quantized.onnx')).arrayBuffer(),/integrity/);assert.equal(writes,0);
});
test('cache storage denial still permits a real model download',async()=>{
 const model=await loader({cache:{match:async()=>{throw Error('denied');},put:async()=>{throw Error('quota');}},fetcher:async url=>new Response(pieces[manifest.files['onnx/model_quantized.onnx'].parts.findIndex(p=>url.endsWith(p.path))])});
 assert.deepEqual(Buffer.from(await (await model.match('/models/test/onnx/model_quantized.onnx')).arrayBuffer()),bytes);
});
test('build packages verified pinned bytes into size-limited files and rejects corruption',async()=>{
 const {packageModel}=await import('../tools/prepare-model.mjs');const root=await mkdtemp(join(tmpdir(),'homunculus-model-'));
 const lock={model:'test',revision:'test-revision',files:[{name:'onnx/model_quantized.onnx',url:'https://example.test/pinned',sha256:hash(bytes),size:bytes.length}]};
 try{
  const manifest=await packageModel({lock,output:join(root,'out'),cacheDir:join(root,'cache'),partSize:10,fetcher:async()=>new Response(bytes)});
  assert.equal(manifest.files['onnx/model_quantized.onnx'].parts.length,3);
  assert.deepEqual(Buffer.concat(await Promise.all(manifest.files['onnx/model_quantized.onnx'].parts.map(p=>readFile(join(root,'out',p.path))))),bytes);
  await assert.rejects(packageModel({lock,output:join(root,'bad'),cacheDir:join(root,'empty'),fetcher:async()=>new Response('bad')}),/integrity/);
 }finally{await rm(root,{recursive:true,force:true});}
});
