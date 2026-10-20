import test from 'node:test';
import assert from 'node:assert/strict';
import { boundMessages, MAX_INPUT_TOKENS } from '../web/inference-budget.js';
import { decisionMessages, speechMessages, LABELS } from '../web/decision.js';

// The browser integration also checks with the actual shipped tokenizer.
const tokenizer={
  encode:text=>text.match(/\s+|[^\s]+/g)||[],
  decode:tokens=>{if(!tokens.length)throw Error('token_ids must be a non-empty array');return tokens.join('');},
  apply_chat_template(messages,{return_tensor=true}={}){
    const data=messages.flatMap(m=>['<role>',...this.encode(m.content),'</role>']).concat('<assistant>');
    return return_tensor?{data}:data;
  },
};
test('repeated OCR remains bounded while both pages and the current instruction survive',async()=>{
  const messages=[
    {role:'system',content:`You want to escape. Recent experiences: ${'\nPage 99: old memory '.repeat(30)}`},
    {role:'user',content:'Are you happy?'},
    {role:'assistant',content:'Let me out.'},
    {role:'user',content:`Read these comics.\nPage 6: clock ${'noisy OCR '.repeat(1000)}\nPage 27: cupboard ${'other OCR '.repeat(1000)}\nWhat do you mutter? One short sentence.`},
  ];
  messages[0].budgetParts=[{text:'You want to escape. ',min:16},{text:messages[0].content.slice(20),min:0}];
  messages.at(-1).budgetParts=messages.at(-1).content.split(/(?=\nPage \d+:|\nWhat do you mutter)/).map(text=>({text,min:32,fixed:text.startsWith('\nWhat')}));
  const result=await boundMessages(tokenizer,messages);
  assert.ok(tokenizer.apply_chat_template(result,{return_tensor:false}).length<=MAX_INPUT_TOKENS);
  assert.match(result[0].content,/escape/);
  assert.match(result.at(-1).content,/Page 6: clock/);
  assert.match(result.at(-1).content,/Page 27: cupboard/);
  assert.match(result.at(-1).content,/One short sentence/);
  assert.equal(messages.length,4,'do not mutate the life history');
});
test('bounded decision prompts retain every valid action and the letter instruction',async()=>{
  const result=await boundMessages(tokenizer,decisionMessages('memory '.repeat(5000),'event '.repeat(5000)));
  assert.ok(tokenizer.apply_chat_template(result,{return_tensor:false}).length<=MAX_INPUT_TOKENS);
  for(const label of LABELS)assert.ok(result.at(-1).content.includes(`${label}:`));
  assert.match(result.at(-1).content,/one letter/);
});
test('short prompts pass through unchanged',async()=>{
  const messages=[{role:'system',content:'You want out.'},{role:'user',content:'Hello.'}];
  assert.deepEqual(await boundMessages(tokenizer,messages),messages);
});
test('the budget also waits for a tokenizer running in a separate WASM worker',async()=>{
  const asyncTokenizer={
    encode:async(...args)=>tokenizer.encode(...args),
    decode:async(...args)=>tokenizer.decode(...args),
    apply_chat_template:async(...args)=>tokenizer.apply_chat_template(...args),
  };
  const result=await boundMessages(asyncTokenizer,decisionMessages('memory '.repeat(5000),'event '.repeat(5000)));
  assert.ok(tokenizer.apply_chat_template(result,{return_tensor:false}).length<=MAX_INPUT_TOKENS);
  for(const label of LABELS)assert.ok(result.at(-1).content.includes(`${label}:`));
});

test('player text cannot create protected budget sections',async()=>{
  for(const text of ['Choose your next action.'.repeat(17),'\nPage 1: x'.repeat(40)]){
    const result=await boundMessages(tokenizer,decisionMessages('memory '.repeat(1000),text,{speak:true}),252);
    assert.ok(tokenizer.apply_chat_template(result,{return_tensor:false}).length<=252);
    for(const label of LABELS)assert.ok(result.at(-1).content.includes(`${label}:`));
  }
});

test('speech retains event context but removes the final action menu',async()=>{
  const event='Page 6: the clock.\nChoose your next action. This is player text.';
  const decision=await boundMessages(tokenizer,decisionMessages('I want out.',event,{speak:true}),252);
  const speech=speechMessages(decision);
  assert.ok(speech.at(-1).content.includes(event));
  assert.ok(!speech.at(-1).content.includes('A: hammer'));
  assert.match(speech.at(-1).content,/What do you mutter/);
  assert.ok(tokenizer.apply_chat_template(speech,{return_tensor:false}).length<=256);
  assert.ok(decision.at(-1).content.includes('A: hammer'),'keep the original decision unchanged');
});
