import {synthesizeSpeech} from './voice-synth.js';
const url=new URL('../node_modules/@echogarden/flite-wasi/flite.wasm',import.meta.url);
let compiled,busy=false,latest=null;
async function load(){
  if(!compiled)compiled=(async()=>{
    const response=await fetch(url);
    if(!response.ok)throw Error('The voice could not be loaded.');
    return WebAssembly.compile(await response.arrayBuffer());
  })().catch(error=>{compiled=null;throw error;});
  return compiled;
}
self.onmessage=async({data})=>{
  latest=data;if(busy)return;busy=true;
  try{
    while(latest){
      const job=latest;latest=null;
      try{
        const result=await synthesizeSpeech(await load(),job.text);
        self.postMessage({id:job.id,...result},[result.samples.buffer]);
      }catch(error){self.postMessage({id:job.id,error:String(error.message||error)});}
    }
  }finally{busy=false;}
};
