// Regression check against the pinned reference tokenizer shipped by the build.
// Browser tests additionally count with the tokenizer embedded in the real GGUF.
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {PreTrainedTokenizer} from '@huggingface/transformers';
import {boundMessages,inputTokenCount,MAX_INPUT_TOKENS} from '../web/inference-budget.js';
import {mindMessages} from '../web/mind.js';
import {decisionMessages,speechMessages,LABELS} from '../web/decision.js';
import {Life} from '../web/life.js';
const base=new URL('../dist/models/smollm2-135m/',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('manifest.json',base),'utf8'));
async function json(name){
 const bytes=await Promise.all(manifest.files[name].parts.map(p=>readFile(new URL(p.path,base))));
 return JSON.parse(Buffer.concat(bytes).toString());
}
const tokenizer=new PreTrainedTokenizer(await json('tokenizer.json'),await json('tokenizer_config.json'));
const {pages}=JSON.parse(await readFile(new URL('../web/assets/comic/excerpts.json',import.meta.url),'utf8'));
const life=new Life({random:()=>.1});
for(let i=0;i<12;i++){
 const selected=[pages[i%pages.length],pages[(i+1)%pages.length]];
 life.interact('read',{pages:selected});
 const event=life.takeEvent(),speech=mindMessages(life,event);
 for(const [kind,raw]of [['speech',speech],['decision',decisionMessages(speech[0].content,speech.at(-1).content,{speak:true,contextParts:speech[0].budgetParts,eventParts:speech.at(-1).budgetParts})]]){
  const messages=await boundMessages(tokenizer,raw,MAX_INPUT_TOKENS-4),count=await inputTokenCount(tokenizer,messages);
  assert.ok(Number.isInteger(count)&&count<=MAX_INPUT_TOKENS);
  for(const p of selected){
   assert.ok(messages.at(-1).content.includes(`Page ${p.page}:`),`${kind} lost page ${p.page}`);
   const firstWord=p.text.trim().split(/\s+/)[0];
   assert.ok(messages.at(-1).content.includes(firstWord),`${kind} lost actual OCR content`);
  }
  if(kind==='decision'){
   for(const label of LABELS)assert.ok(messages.at(-1).content.includes(`${label}:`));
   assert.ok(await inputTokenCount(tokenizer,speechMessages(messages))<=MAX_INPUT_TOKENS);
  }
  console.log(`reading ${i+1} ${kind}: ${await inputTokenCount(tokenizer,raw)} → ${count} tokens`);
 }
 life.choose('watch');
}
for(const text of ['🦆'.repeat(400),'字'.repeat(400),'hello '.repeat(100),'Choose your next action.'.repeat(17).slice(0,400),'\nPage 1: x'.repeat(40)]){
 const messages=mindMessages(life,{kind:'message',text});
 const decision=decisionMessages(messages[0].content,messages.at(-1).content,{speak:true,contextParts:messages[0].budgetParts,eventParts:messages.at(-1).budgetParts});
 assert.ok(await inputTokenCount(tokenizer,await boundMessages(tokenizer,decision,252))<=252);
}
console.log('PASS: actual bundled tokenizer, repeated real OCR, both pages, all action choices, Unicode messages.');
