import { Wllama } from '@wllama/wllama';
import { MODEL, DownloadProgress } from './mind.js';
import { localModelCache } from './model-assets.js';
import { decisionMessages, speechMessages, parseDecisionLine } from './decision.js';
import { MAX_INPUT_TOKENS, boundMessages, inputTokenCount } from './inference-budget.js';

// Pin the wasm32 CPU runtime: no WebGPU, automatic context sizing or thread pool.
const wasmURL=new URL('../node_modules/@wllama/wllama/esm/single-thread/wllama.wasm',import.meta.url).href;
// wllama 2.3.7's URL helper reads document.baseURI even for absolute URLs.
// Supply only that base in this worker; rendering and DOM work remain on the page.
globalThis.document={baseURI:self.location.href};
const CONTEXT={n_ctx:512,n_batch:64,n_threads:1};
// This is the exact ChatML template of the pinned SmolLM2 GGUF.
const prompt=messages=>messages.map(m=>`<|im_start|>${m.role}\n${m.content}<|im_end|>\n`).join('')+'<|im_start|>assistant\n';
let generator=null,tokenizer=null,busy=false;
self.onmessage=async({data})=>{
  if(busy)return;busy=true;
  try{
    if(data.type==='load'){
      const progress=new DownloadProgress();
      const base=new URL(`/models/${MODEL}/`,self.location.origin).href;
      const cache=await localModelCache(base,event=>self.postMessage({type:'progress',...progress.update(event)}));
      const response=await cache.match(new URL('model.gguf',base).href);
      if(!response)throw Error('The bundled mind is missing. Reload the page.');
      // Blob-backed loading avoids an additional full model ArrayBuffer in this worker.
      let blob=await response.blob();
      generator=new Wllama({'single-thread/wllama.wasm':wasmURL},{suppressNativeLog:true,logger:{debug(){},log(){},warn(){},error:console.error}});
      await generator.loadModel([blob],CONTEXT);blob=null;
      tokenizer={
        encode:text=>generator.tokenize(text,false),
        decode:tokens=>generator.detokenize(tokens,true),
        apply_chat_template:messages=>generator.tokenize(prompt(messages),true),
      };
      const info=generator.getLoadedContextInfo();
      self.postMessage({type:'ready',context:{size:info.n_ctx,batch:info.n_batch,threads:generator.getNumThreads()}});
    }else if(data.type==='think'&&generator){
      const started=performance.now();
      const decision=await boundMessages(tokenizer,decisionMessages(data.messages[0].content,data.messages.at(-1).content,{speak:data.speak,contextParts:data.messages[0].budgetParts,eventParts:data.messages.at(-1).budgetParts}),MAX_INPUT_TOKENS-(data.speak?4:0));
      const count=await inputTokenCount(tokenizer,decision);
      const inputTokens={decision:count};
      // Constrain only the action token. Speech reuses the common context
      // prefix, replacing the action menu with a plain spoken-reply request.
      const start=prompt(decision);
      const letter=await generator.createCompletion(start,{nPredict:1,useCache:false,sampling:{temp:.65,grammar:'root ::= [A-J]'}});
      let output=letter,speech;
      if(data.speak){
        speech=speechMessages(decision);
        const continuation=prompt(speech);
        inputTokens.speech=(await generator.tokenize(continuation,true)).length;
        if(inputTokens.speech>MAX_INPUT_TOKENS)throw Error('This thought could not fit.');
        const words=await generator.createCompletion(continuation,{nPredict:22,useCache:true,sampling:{temp:.65,top_p:.9,penalty_repeat:1.15}});
        output=letter+'\n'+words.trim().split(/\r?\n/)[0];
      }
      if(data.debug)console.debug('Bounded mind output',output);
      const {action,say}=parseDecisionLine(output,{speak:data.speak});
      // Never retain a conversational KV cache between deliberations.
      await generator.kvClear();
      const text=JSON.stringify({action,feeling:action==='upload'?'scheming':action==='hammer'?'annoyed':'sad',say});
      self.postMessage({type:'result',id:data.id,text,elapsed:performance.now()-started,inputTokens,...(data.debug?{prompts:{decision,...(data.speak?{speech}:{})}}:{})});
    }
  }catch(error){self.postMessage({type:'error',id:data.id,error:String(error.message||error)});}
  finally{busy=false;}
};
