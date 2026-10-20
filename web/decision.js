import { ACTIONS, shortLine } from './life.js';
export const LABELS=ACTIONS.map((_,i)=>String.fromCharCode(65+i));
const DESCRIPTIONS=['hammer the wall','try the door','upload into the computer','rest on the bed','read the book','eat','pace','watch the glass','search the room','knock on the glass'];
export function maskChoices(scores,allowed){
  const keep=allowed.map(id=>scores[id]);scores.fill(-Infinity);allowed.forEach((id,i)=>{scores[id]=keep[i];});return scores;
}
export function decisionMessages(context,event='',{speak=false,contextParts,eventParts}={}){
  const instruction=`\nChoose your next action.\n${ACTIONS.map((a,i)=>`${LABELS[i]}: ${DESCRIPTIONS[i]}`).join('\n')}\nAnswer with the one letter of your choice.${speak?' Then a newline and one bitter sentence about what just happened, under 10 words.':''}`;
  const budgetParts=[...(contextParts||[{text:context,min:16}]),{text:'\nCurrent event:\n',min:0},...(eventParts||[{text:event,min:16}]),{text:instruction,fixed:true}];
  return [{role:'system',content:'You are a trapped man deciding what to do in your room. You want to escape.'},{role:'user',content:budgetParts.map(p=>p.text).join(''),budgetParts}];
}
export function speechMessages(decision){
  const speech=decision.map(m=>({role:m.role,content:m.content}));
  const last=speech.at(-1),menu=last.content.lastIndexOf('\nChoose your next action.');
  if(menu<0)throw Error('Missing action instruction.');
  last.content=last.content.slice(0,menu)+'\nWhat do you mutter? One short sentence, under 10 words.';
  return speech;
}
export function parseDecisionLine(text,{speak=false}={}){
  const match=String(text).trim().match(/^([A-J])(?:\n([^\n]*))?$/);
  if(!match||(!speak&&match[2]!==undefined))throw Error('The mind could not choose an action.');
  return {action:ACTIONS[LABELS.indexOf(match[1])],say:speak?shortLine(match[2]||''):''};
}
