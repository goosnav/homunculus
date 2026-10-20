// Build-time download only. Every input is revision- and SHA256-pinned.
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function packageModel({lock,output,cacheDir,partSize=20*1024*1024,fetcher=fetch}){
 await mkdir(cacheDir,{recursive:true});await rm(output,{recursive:true,force:true});await mkdir(output,{recursive:true});
 const manifest={model:lock.model,revision:lock.revision,files:{}};
 for(const file of lock.files){
  const cached=join(cacheDir,file.sha256);let bytes;
  try{bytes=await readFile(cached);}catch(error){if(error.code!=='ENOENT')throw error;}
  if(!bytes||bytes.length!==file.size||hash(bytes)!==file.sha256){
   console.log(`Preparing browser model: ${file.name}`);
   const response=await fetcher(file.url,{signal:AbortSignal.timeout(180000)});
   if(!response.ok)throw Error(`Model download failed (${response.status}): ${file.name}`);
   bytes=Buffer.from(await response.arrayBuffer());
   if(bytes.length!==file.size||hash(bytes)!==file.sha256)throw Error(`Model integrity check failed: ${file.name}`);
   await writeFile(cached,bytes);
  }
  const parts=[];
  for(let start=0;start<bytes.length;start+=partSize){
   const part=bytes.subarray(start,start+partSize),sha256=hash(part),path=`${sha256}.bin`;
   await writeFile(join(output,path),part);parts.push({path,size:part.length,sha256});
  }
  manifest.files[file.name]={size:bytes.length,sha256:file.sha256,parts};
 }
 await writeFile(join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');return manifest;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const root=resolve(import.meta.dirname,'..');
 const lock=JSON.parse(await readFile(join(root,'tools/model-lock.json'),'utf8'));
 await packageModel({lock,output:join(root,'web/models/smollm2-135m'),cacheDir:join(root,'.cache/models')});
 console.log('Browser model ready: pinned weights split into assets of at most 20 MiB.');
}
