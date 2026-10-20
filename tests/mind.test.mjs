import test from 'node:test';
import assert from 'node:assert/strict';
import { BrowserMind, mindMessages, DownloadProgress } from '../web/mind.js';
class FakeWorker{
  sent=[];terminated=false;
  postMessage(message){this.sent.push(message);}
  terminate(){this.terminated=true;}
  emit(data){this.onmessage?.({data});}
}
test('model loading forwards real progress and resolves only on worker readiness',async()=>{
  const worker=new FakeWorker(),mind=new BrowserMind({workerFactory:()=>worker}),progress=[];
  const loading=mind.load(p=>progress.push(p));worker.emit({type:'progress',progress:.45,text:'weights'});
  assert.equal(mind.ready,false);worker.emit({type:'ready'});await loading;
  assert.equal(mind.ready,true);assert.equal(progress[0].progress,.45);mind.dispose();
});
test('only one generation can run; termination rejects pending work and ignores late results',async()=>{
  const worker=new FakeWorker(),mind=new BrowserMind({workerFactory:()=>worker});
  const loading=mind.load(()=>{});worker.emit({type:'ready'});await loading;
  const pending=mind.think([{role:'user',content:'hello'}]);
  await assert.rejects(mind.think([]),/already thinking/);
  const rejected=assert.rejects(pending,/ended/);mind.dispose();await rejected;
  worker.emit({type:'result',id:1,text:'{"action":"watch","say":"Back."}'});
  assert.equal(worker.terminated,true);assert.equal(mind.ready,false);
});
test('worker failures reject load and can be retried with a new worker',async()=>{
  const workers=[],mind=new BrowserMind({workerFactory:()=>{const w=new FakeWorker();workers.push(w);return w;}});
  const failed=mind.load(()=>{});workers[0].emit({type:'error',error:'No memory'});await assert.rejects(failed,/No memory/);
  assert.equal(workers[0].terminated,true);
  const retry=mind.load(()=>{});workers[1].emit({type:'ready'});await retry;assert.equal(mind.ready,true);mind.dispose();
});
test('progress is monotonic across files and does not claim ready during compilation',()=>{
  const progress=new DownloadProgress();
  const a=progress.update({status:'progress',file:'model.onnx',loaded:50,total:100});
  const b=progress.update({status:'progress',file:'tokenizer.json',loaded:1,total:20});
  assert.ok(b.progress>=a.progress);
  const c=progress.update({status:'done',file:'model.onnx'});assert.ok(c.progress<1);
});
test('mind context contains actual intervention text, limits history, and requests silent autonomous work',()=>{
  const life={context:()=> 'Wall damage 20.',dialogue:Array.from({length:30},()=>({role:'user',content:'hello'}))};
  const message=mindMessages(life,{kind:'read',text:'Page 3: A clock without hands.'});
  assert.match(message.at(-1).content,/clock without hands/);assert.ok(message.length<=8);
  assert.match(mindMessages(life,null).at(-1).content,/empty/);
});

test('constrained action decoding preserves model scores only for valid choices',async()=>{
  const { maskChoices, decisionMessages }=await import('../web/decision.js');
  const scores=new Float32Array([.2,4,9,-1,2]);maskChoices(scores,[1,3]);
  assert.equal(scores[1],4);assert.equal(scores[3],-1);assert.equal(scores[2],-Infinity);
  const prompt=decisionMessages('The door is jammed.','You have a hammer.');
  assert.match(prompt.at(-1).content,/hammer/);assert.match(prompt.at(-1).content,/letter/);
});
