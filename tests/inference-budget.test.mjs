import test from 'node:test';
import assert from 'node:assert/strict';
import { boundMessages, MAX_INPUT_TOKENS } from '../web/inference-budget.js';
import { decisionMessages, LABELS } from '../web/decision.js';

// The browser integration also checks with the actual shipped tokenizer.
const tokenizer={
  encode:text=>text.match(/\s+|[^\s]+/g)||[],
  decode:tokens=>{if(!tokens.length)throw Error('token_ids must be a non-empty array');return tokens.join('');},
  apply_chat_template(messages,{return_tensor=true}={}){
    const data=messages.flatMap(m=>['<role>',...this.encode(m.content),'</role>']).concat('<assistant>');
    return return_tensor?{data}:data;
  },
};
test('repeated OCR remains bounded while both pages and the current instruction survive',()=>{
  const messages=[
    {role:'system',content:`You want to escape. Recent experiences: ${'\nPage 99: old memory '.repeat(30)}`},
    {role:'user',content:'Are you happy?'},
    {role:'assistant',content:'Let me out.'},
    {role:'user',content:`Read these comics.\nPage 6: clock ${'noisy OCR '.repeat(1000)}\nPage 27: cupboard ${'other OCR '.repeat(1000)}\nWhat do you mutter? One short sentence.`},
  ];
  const result=boundMessages(tokenizer,messages);
  assert.ok(tokenizer.apply_chat_template(result,{return_tensor:false}).length<=MAX_INPUT_TOKENS);
  assert.match(result[0].content,/escape/);
  assert.match(result.at(-1).content,/Page 6: clock/);
  assert.match(result.at(-1).content,/Page 27: cupboard/);
  assert.match(result.at(-1).content,/One short sentence/);
  assert.equal(messages.length,4,'do not mutate the life history');
});
test('bounded decision prompts retain every valid action and the letter instruction',()=>{
  const result=boundMessages(tokenizer,decisionMessages('memory '.repeat(5000),'event '.repeat(5000)));
  assert.ok(tokenizer.apply_chat_template(result,{return_tensor:false}).length<=MAX_INPUT_TOKENS);
  for(const label of LABELS)assert.ok(result.at(-1).content.includes(`${label}:`));
  assert.match(result.at(-1).content,/one letter/);
});
test('short prompts pass through unchanged',()=>{
  const messages=[{role:'system',content:'You want out.'},{role:'user',content:'Hello.'}];
  assert.deepEqual(boundMessages(tokenizer,messages),messages);
});
