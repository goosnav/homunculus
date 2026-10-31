// Explicit development tool; production builds use the checked-in, verified GLBs.
import {readFile,writeFile,copyFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const source=resolve(process.argv[2]||'../goosnav-3D-assets');
const files=[['exports/ps1guy_v12.glb','resident.glb'],['exports/ps1guy_skeleton_v1.glb','skeleton.glb'],['props/ps1/book2_goosnav_dilemma.glb','book.glb'],['props/ps1/goosklerf_booster_pack.glb','pack.glb'],['props/ps1/goosnav_zine_09.glb','zine.glb'],['props/ps1/goosklerf_freewill.glb','card.glb']];
const lock={repository:'https://github.com/goosnav/goosnav-3D-assets',sourceCommit:execFileSync('git',['-C',source,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),files:[]};
for(const [path,destination]of files){const bytes=await readFile(resolve(source,path));if(bytes.subarray(0,4).toString()!=='glTF')throw Error(`${path} is not a downloaded GLB`);if(bytes.length>25*1024*1024)throw Error(`${path} exceeds the static asset limit`);await copyFile(resolve(source,path),new URL(`../web/assets/${destination}`,import.meta.url));lock.files.push({source:path,destination,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
await writeFile(new URL('../web/assets/asset-lock.json',import.meta.url),JSON.stringify(lock,null,2)+'\n');console.log(`Synced ${files.length} models from ${lock.sourceCommit}`);
