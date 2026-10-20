import { ACTIONS } from './life.js';
export const MODEL='smollm2-135m';
export function mindMessages(life,event){
  const system=`You are an unhappy man trapped in a small room. You want out. Speak as this man, never as an assistant. Answer in one bitter sentence, under 10 words. No advice or greetings.\n${life.context()}`;
  const memory=system.indexOf('Recent experiences:');
  const content=event?`${event.kind==='message'?'The person outside says':'What just happened'}: ${event.text}\nWhat do you mutter? One short sentence.`:'Nobody is talking to you. Choose your next escape plan. Keep say empty.';
  // Only a real reading event protects comic excerpts. Player messages cannot
  // manufacture protected sections by containing page/instruction markers.
  const eventParts=event?.kind==='read'?content.split(/(?=\nPage \d+:)/).slice(0,3).map((text,i)=>({text,min:i?32:16})):[{text:content,min:16}];
  return [
    {role:'system',content:system,budgetParts:memory<0?[{text:system,min:16}]:[{text:system.slice(0,memory),min:16},{text:system.slice(memory),min:0}]},
    {role:'user',content:'They ask: Are you happy here?'},
    {role:'assistant',content:'There is no handle on my side.'},
    {role:'user',content:'They ask: What are you doing?'},
    {role:'assistant',content:'Making the wall thinner.'},
    ...life.dialogue.slice(-1),
    {role:'user',content,budgetParts:eventParts},
  ];
}
export class DownloadProgress{
  files=new Map();high=0;
  update(event){
    if(event.file){const old=this.files.get(event.file)||{loaded:0,total:0};this.files.set(event.file,{loaded:event.status==='done'?old.total:event.loaded??old.loaded,total:event.total??old.total});}
    const files=[...this.files.values()],total=files.reduce((s,f)=>s+f.total,0),loaded=files.reduce((s,f)=>s+f.loaded,0);
    // Reserve the last tenth for WASM/model initialization; ready is a separate message.
    // Weight-file estimate prevents a completed tiny tokenizer from filling the bar.
    const fraction=Math.min(.9,loaded/Math.max(total,91893088)*.9);
    this.high=Math.max(this.high,fraction);
    return {progress:this.high,text:loaded>0?'Taking shape…':'Preparing a place for a thought…'};
  }
}
export class BrowserMind{
  constructor({workerFactory=()=>new Worker(new URL('./mind-worker.js',import.meta.url),{type:'module'}),timeout=90000,loadTimeout=180000,debug=false}={}){
    this.workerFactory=workerFactory;this.timeout=timeout;this.loadTimeout=loadTimeout;this.debug=debug;this.worker=null;this.ready=false;this.pending=null;this.loading=null;this.serial=0;
  }
  load(onProgress=()=>{}){
    if(this.loading)return this.loading.promise;
    if(this.ready)return Promise.resolve();
    this.worker=this.workerFactory();const worker=this.worker;
    let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});
    const timer=setTimeout(()=>this.fail(new Error('Spawning timed out. Please try again.')),this.loadTimeout);
    this.loading={promise,resolve,reject,onProgress,timer};
    worker.onmessage=({data})=>{
      if(this.worker!==worker)return;
      if(data.type==='progress')this.loading?.onProgress(data);
      if(data.type==='ready'){clearTimeout(this.loading?.timer);this.context=data.context;this.ready=true;this.loading?.resolve();this.loading=null;}
      if(data.type==='result'&&data.id===this.pending?.id){clearTimeout(this.pending.timer);this.pending.resolve(data);this.pending=null;}
      if(data.type==='error')this.fail(new Error(data.error||'The mind stopped responding.'));
    };
    worker.onerror=e=>{e.preventDefault?.();this.fail(new Error(e.message||'The browser could not start the mind.'));};
    worker.postMessage({type:'load'});return promise;
  }
  think(messages,{speak=false}={}){
    if(!this.ready)return Promise.reject(new Error('The mind is not ready.'));
    if(this.pending)return Promise.reject(new Error('The mind is already thinking.'));
    return new Promise((resolve,reject)=>{
      const id=++this.serial,timer=setTimeout(()=>this.fail(new Error('The thought timed out. The mind can be reloaded.')),this.timeout);
      this.pending={id,resolve,reject,timer};this.worker.postMessage({type:'think',id,messages,speak,debug:this.debug});
    });
  }
  fail(error){
    clearTimeout(this.loading?.timer);clearTimeout(this.pending?.timer);this.loading?.reject(error);this.pending?.reject(error);
    this.loading=null;this.pending=null;this.ready=false;this.worker?.terminate();this.worker=null;
  }
  dispose(){this.fail(new Error('This existence has ended.'));}
}
