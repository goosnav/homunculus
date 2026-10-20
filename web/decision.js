import { ACTIONS } from './life.js';
export const LABELS=ACTIONS.map((_,i)=>String.fromCharCode(65+i));
const DESCRIPTIONS=['hit the wall with a hammer','try the locked door handle','upload your mind into the computer','lie down on the bed','read the comic on the desk','eat from the bowl','pace and think','watch the person through the glass','inspect the room for a hidden exit','bang on the glass'];
export function maskChoices(scores,allowed){
  const keep=allowed.map(id=>scores[id]);scores.fill(-Infinity);allowed.forEach((id,i)=>{scores[id]=keep[i];});return scores;
}
export function decisionMessages(context,event=''){
  return [{role:'system',content:'You are a trapped man deciding what to do in your room. You want to escape.'},{role:'user',content:`${context}\n${event}\nChoose your next action.\n${ACTIONS.map((a,i)=>`${LABELS[i]}: ${DESCRIPTIONS[i]}`).join('\n')}\nAnswer with the one letter of your choice.`}];
}
