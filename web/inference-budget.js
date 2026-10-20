// The ONNX decoder returns logits for every input position (49,152 floats
// each). Bound prefill, not just output length, on phones and desktops alike.
export const MAX_INPUT_TOKENS=384;
export function inputTokenCount(tokenizer,messages){
  return tokenizer.apply_chat_template(messages,{tokenize:true,return_tensor:false,add_generation_prompt:true}).length;
}
export function boundMessages(tokenizer,messages,limit=MAX_INPUT_TOKENS){
  const result=messages.map(m=>({...m}));
  if(inputTokenCount(tokenizer,result)<=limit)return result;
  // Old examples/dialogue yield to the current event and the resident's state.
  while(result.length>2&&inputTokenCount(tokenizer,result)>limit)result.splice(1,1);
  const sections=result.map(message=>{
    let memory=false;
    return message.content.split(/(?=\nPage \d+:|\nWhat do you mutter\?|Recent experiences:|\nCurrent event:|Choose your next action\.)/).map(text=>{
    const tokens=tokenizer.encode(text,{add_special_tokens:false});
    if(text.startsWith('Recent experiences:'))memory=true;
    if(/^(\nCurrent event:|Choose your next action\.)/.test(text))memory=false;
    // Keep the action vocabulary and reply instruction intact. Each real
    // selected comic page gets its own share instead of losing the second page.
    const fixed=!memory&&/^(Choose your next action\.|\nWhat do you mutter\?)/.test(text);
    return {tokens,keep:tokens.length,min:fixed?tokens.length:memory?0:Math.min(32,tokens.length),memory};
  });});
  let count=inputTokenCount(tokenizer,result);
  while(count>limit){
    const candidates=sections.flat().filter(s=>s.keep>s.min).sort((a,b)=>Number(b.memory)-Number(a.memory)||(b.keep-b.min)-(a.keep-a.min));
    if(!candidates.length)throw Error('This thought could not fit.');
    const section=candidates[0];
    section.keep-=Math.min(section.keep-section.min,Math.max(16,count-limit));
    sections.forEach((parts,i)=>{result[i].content=parts.map(p=>p.keep?tokenizer.decode(p.tokens.slice(0,p.keep),{skip_special_tokens:false}):'').join('');});
    count=inputTokenCount(tokenizer,result);
  }
  return result;
}
