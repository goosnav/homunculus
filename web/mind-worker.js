import { pipeline, env, LogitsProcessor, LogitsProcessorList } from './vendor/transformers/transformers.min.js';
import { MODEL, DownloadProgress } from './mind.js';
import { localModelCache } from './model-assets.js';
import { ACTIONS, shortLine } from './life.js';
import { LABELS, maskChoices, decisionMessages } from './decision.js';
class ChoicesOnly extends LogitsProcessor {
  constructor(ids){super();this.ids=ids;}
  _call(inputIds,logits){for(let i=0;i<inputIds.length;i++)maskChoices(logits[i].data,this.ids);return logits;}
}
const generatedText=output=>{const text=output[0].generated_text;return typeof text==='string'?text:text.at(-1).content;};
// WASM runs inside this worker. Single-threading also works on static hosts without COOP/COEP.
env.allowLocalModels=true;
env.allowRemoteModels=false;
env.localModelPath='/models/';
env.useBrowserCache=false;
env.useCustomCache=true;
env.backends.onnx.wasm.numThreads=1;
env.backends.onnx.wasm.wasmPaths=new URL('/vendor/transformers/',self.location.origin).href;
let generator=null,busy=false;
self.onmessage=async({data})=>{
  if(busy)return;busy=true;
  try{
    if(data.type==='load'){
      const progress=new DownloadProgress();
      env.customCache=await localModelCache(new URL(`/models/${MODEL}/`,self.location.origin).href);
      generator=await pipeline('text-generation',MODEL,{device:'wasm',dtype:'q8',local_files_only:true,progress_callback:event=>self.postMessage({type:'progress',...progress.update(event)})});
      self.postMessage({type:'ready'});
    }else if(data.type==='think'&&generator){
      const started=performance.now();
      const ids=LABELS.map(label=>generator.tokenizer.encode(label,{add_special_tokens:false}));
      if(ids.some(tokens=>tokens.length!==1))throw Error('This tokenizer cannot encode the action choices.');
      const processors=new LogitsProcessorList();processors.push(new ChoicesOnly(ids.map(tokens=>tokens[0])));
      const choice=await generator(decisionMessages(data.messages[0].content,data.messages.at(-1).content),{max_new_tokens:1,do_sample:true,temperature:.85,top_p:1,logits_processor:processors});
      const letter=generatedText(choice).trim(),action=ACTIONS[LABELS.indexOf(letter)];
      if(!action)throw Error('The model could not choose an action.');
      let say='';
      if(data.speak){
        const output=await generator(data.messages,{max_new_tokens:22,do_sample:true,temperature:.65,top_p:.9,repetition_penalty:1.15});
        say=shortLine(generatedText(output));
      }
      const text=JSON.stringify({action,feeling:action==='upload'?'scheming':action==='hammer'?'annoyed':'sad',say});
      self.postMessage({type:'result',id:data.id,text,elapsed:performance.now()-started});
    }
  }catch(error){self.postMessage({type:'error',id:data.id,error:String(error.message||error)});}
  finally{busy=false;}
};
