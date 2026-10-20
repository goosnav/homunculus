// Keep both prefill and generated output within a small, fixed WASM context.
export const MAX_INPUT_TOKENS=256;
export async function inputTokenCount(tokenizer,messages){
  return (await tokenizer.apply_chat_template(messages,{tokenize:true,return_tensor:false,add_generation_prompt:true})).length;
}
export async function boundMessages(tokenizer,messages,limit=MAX_INPUT_TOKENS){
  const result=messages.map(m=>({...m}));
  if(await inputTokenCount(tokenizer,result)<=limit)return result;
  // Old examples/dialogue yield to the current event and the resident's state.
  while(result.length>2&&await inputTokenCount(tokenizer,result)>limit)result.splice(1,1);
  // Protection comes from our prompt composer, never markers in player text.
  const sections=await Promise.all(result.map(async message=>Promise.all(
    (message.budgetParts||[{text:message.content,min:16}]).map(async part=>{
      const tokens=await tokenizer.encode(part.text,{add_special_tokens:false});
      return {tokens,keep:tokens.length,min:part.fixed?tokens.length:Math.min(part.min??16,tokens.length),memory:part.min===0};
    })
  )));
  let count=await inputTokenCount(tokenizer,result);
  while(count>limit){
    const candidates=sections.flat().filter(s=>s.keep>s.min).sort((a,b)=>Number(b.memory)-Number(a.memory)||(b.keep-b.min)-(a.keep-a.min));
    if(!candidates.length)throw Error('This thought could not fit.');
    const section=candidates[0];
    section.keep-=Math.min(section.keep-section.min,Math.max(16,count-limit));
    for(let i=0;i<sections.length;i++)result[i].content=(await Promise.all(sections[i].map(p=>p.keep?tokenizer.decode(p.tokens.slice(0,p.keep),{skip_special_tokens:false}):''))).join('');
    count=await inputTokenCount(tokenizer,result);
  }
  return result;
}
