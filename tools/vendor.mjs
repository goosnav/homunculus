import { mkdir, copyFile } from 'node:fs/promises';
for (const folder of ['web/vendor', 'web/vendor/loaders', 'web/vendor/utils']) await mkdir(folder, { recursive:true });
for (const [from, to] of [
  ['build/three.module.js','three.module.js'],
  ['build/three.core.js','three.core.js'],
  ['examples/jsm/loaders/GLTFLoader.js','loaders/GLTFLoader.js'],
  ['examples/jsm/utils/BufferGeometryUtils.js','utils/BufferGeometryUtils.js'],
  ['examples/jsm/utils/SkeletonUtils.js','utils/SkeletonUtils.js'],
  ['LICENSE','THREE-LICENSE.txt']
]) await copyFile(`node_modules/three/${from}`, `web/vendor/${to}`);
// Pinned browser inference runtime. Model weights are downloaded and cached on spawn.
await mkdir('web/vendor/transformers', {recursive:true});
for (const file of ['transformers.min.js','ort-wasm-simd-threaded.jsep.mjs','ort-wasm-simd-threaded.jsep.wasm']) {
  await copyFile(`node_modules/@huggingface/transformers/dist/${file}`, `web/vendor/transformers/${file}`);
}
await copyFile('node_modules/@huggingface/transformers/LICENSE', 'web/vendor/transformers/TRANSFORMERS-LICENSE.txt');
// ONNX Runtime's npm package omits LICENSE; preserve the upstream MIT notice checked into web/vendor/transformers.
