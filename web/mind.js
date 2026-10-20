import { ACTIONS } from './life.js';
export const MODEL='onnx-community/SmolLM2-135M-Instruct-ONNX';
export function mindMessages(life,event){
  return [
    {role:'system',content:`You are an unhappy man trapped in a small room. You want out. Speak as this man, never as an assistant. Answer in one bitter sentence, under 10 words. No advice or greetings.\n${life.context()}`},
    {role:'user',content:'They ask: Are you happy here?'},
    {role:'assistant',content:'There is no handle on my side.'},
    {role:'user',content:'They ask: What are you doing?'},
    {role:'assistant',content:'Making the wall thinner.'},
    ...life.dialogue.slice(-1),
    {role:'user',content:event?`${event.kind==='message'?'The person outside says':'What just happened'}: ${event.text}\nWhat do you mutter? One short sentence.`:'Nobody is talking to you. Choose your next escape plan. Keep say empty.'},
  ];
}
export class DownloadProgress{
  files=new Map();high=0;
  update(event){
    if(event.file){const old=this.files.get(event.file)||{loaded:0,total:0};this.files.set(event.file,{loaded:event.status==='done'?old.total:event.loaded??old.loaded,total:event.total??old.total});}
    const files=[...this.files.values()],total=files.reduce((s,f)=>s+f.total,0),loaded=files.reduce((s,f)=>s+f.loaded,0);
    // Reserve the last tenth for WASM/model initialization; ready is a separate message.
    // Weight-file estimate prevents a completed tiny tokenizer from filling the bar.
    const fraction=Math.min(.9,loaded/Math.max(total,135658354)*.9);
    this.high=Math.max(this.high,fraction);
    return {progress:this.high,text:loaded>0?`Reading ${Math.round(loaded/1048576)} MB into existence…`:'Preparing a place for a thought…'};
  }
}
export class BrowserMind{
  constructor({workerFactory=()=>new Worker(new URL('./mind-worker.js',import.meta.url),{type:'module'}),timeout=90000}={}){
    this.workerFactory=workerFactory;this.timeout=timeout;this.worker=null;this.ready=false;this.pending=null;this.loading=null;this.serial=0;
  }
  load(onProgress=()=>{}){
    if(this.loading)return this.loading.promise;
    if(this.ready)return Promise.resolve();
    this.worker=this.workerFactory();const worker=this.worker;
    let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});
    this.loading={promise,resolve,reject,onProgress};
    worker.onmessage=({data})=>{
      if(this.worker!==worker)return;
      if(data.type==='progress')this.loading?.onProgress(data);
      if(data.type==='ready'){this.ready=true;this.loading?.resolve();this.loading=null;}
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
      this.pending={id,resolve,reject,timer};this.worker.postMessage({type:'think',id,messages,speak});
    });
  }
  fail(error){
    clearTimeout(this.pending?.timer);this.loading?.reject(error);this.pending?.reject(error);
    this.loading=null;this.pending=null;this.ready=false;this.worker?.terminate();this.worker=null;
  }
  dispose(){this.fail(new Error('This existence has ended.'));}
}
