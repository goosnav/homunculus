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
