import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {BrowserVoice} from '../web/browser-voice.js';
import {synthesizeSpeech} from '../web/voice-synth.js';
class Node{
  gain={value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}};
  frequency={value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}};
  Q={value:0};
  connect(to){return to;}disconnect(){}start(){this.started=true;}stop(){this.stopped=true;}
}
function fixture(){
 const context={currentTime:0,state:'running',destination:{},resumes:0,resume(){this.resumes++;return Promise.resolve();},createGain:()=>new Node(),createBiquadFilter:()=>new Node(),createBuffer:(channels,size,rate)=>({duration:size/rate,copyToChannel(){}}),createBufferSource:()=>new Node(),createOscillator:()=>new Node()};
 const worker={sent:[],postMessage(data){this.sent.push(data);},terminate(){this.terminated=true;}};
 return {context,worker,voice:new BrowserVoice({contextFactory:()=>context,workerFactory:()=>worker})};
}
test('Spawn enables Web Audio synchronously; a PCM reply passes through the glass filter',()=>{
 const {voice,context,worker}=fixture();
 assert.equal(voice.setEnabled(true),true);assert.equal(context.resumes,1);
 voice.say('Let me out.');
 const request=worker.sent.at(-1);
 worker.onmessage({data:{id:request.id,samples:new Float32Array(8000),sampleRate:8000}});
 assert.equal(voice.filter.type,'lowpass');assert.ok(voice.filter.frequency.value<=1800);
 assert.equal(voice.source.started,true);
});
test('death stops playback and rejects late speech; unsupported audio cannot break spawning',()=>{
 const {voice,worker}=fixture();voice.setEnabled(true);voice.say('Wait.');
 const request=worker.sent.at(-1),receive=worker.onmessage;voice.stop();
 receive({data:{id:request.id,samples:new Float32Array(8000),sampleRate:8000}});
 assert.equal(voice.source,null);assert.equal(worker.terminated,true);
 const unavailable=new BrowserVoice({contextFactory:()=>{throw Error('unsupported');}});
 assert.equal(unavailable.setEnabled(true),false);unavailable.say('Hello');unavailable.stop();
 const failed=fixture().voice;failed.workerFactory=()=>{throw Error('Worker unavailable');};
 failed.setEnabled(true);let error;failed.onError=message=>{error=message;};
 assert.doesNotThrow(()=>failed.say('Hello'));assert.match(error,/Worker unavailable/);assert.equal(failed.worker,null);
});
test('the bundled male Flite voice generates bounded PCM without network or OS voices',async()=>{
 const module=await WebAssembly.compile(await readFile(new URL('../node_modules/@echogarden/flite-wasi/flite.wasm',import.meta.url)));
 const result=await synthesizeSpeech(module,'There is no handle on my side.');
 assert.equal(result.sampleRate,8000);assert.ok(result.samples.length>8000&&result.samples.length<8000*15);
 assert.ok(result.samples.some(value=>Math.abs(value)>.01));
});

test('a suspended or interrupted phone context resumes before the latest speech starts',async()=>{
 for(const state of ['suspended','interrupted']){
  const {voice,context,worker}=fixture();voice.setEnabled(true);context.state=state;
  let resolveResume;context.resume=()=>{context.resumes++;return new Promise(resolve=>{resolveResume=()=>{context.state='running';resolve();};});};
  voice.say('Still here.');
  const request=worker.sent.at(-1);worker.onmessage({data:{id:request.id,samples:new Float32Array(8000),sampleRate:8000}});
  assert.equal(voice.source,null,'do not queue an inaudible source into a paused context');
  assert.ok(context.resumes>1,'speech must attempt recovery after Spawn');
  resolveResume();await Promise.resolve();assert.equal(voice.source?.started,true);
 }
});
test('phone gestures can retry a refused resume without resetting a life or retaining a sound backlog',async()=>{
 const {voice,context,worker}=fixture();voice.setEnabled(true);context.state='interrupted';
 context.resume=()=>Promise.reject(Error('gesture required'));
 voice.say('Wait.');const request=worker.sent.at(-1);
 worker.onmessage({data:{id:request.id,samples:new Float32Array(8000),sampleRate:8000}});
 await Promise.resolve();assert.equal(voice.source,null);
 context.resume=()=>{context.state='running';return Promise.resolve();};
 voice.resume();await Promise.resolve();assert.equal(voice.source.started,true);
});
test('backgrounding drops old speech and effects; a visible page can speak again',async()=>{
 const {voice,context,worker}=fixture();context.suspend=()=>{context.state='suspended';return Promise.resolve();};voice.setEnabled(true);voice.say('Wait.');
 const request=worker.sent.at(-1),receive=worker.onmessage;assert.ok(voice.effects.size>0);
 voice.setVisible(false);assert.equal(voice.effects.size,0);assert.equal(voice.worker,null);assert.equal(voice.source,null);
 receive({data:{id:request.id,samples:new Float32Array(8000),sampleRate:8000}});assert.equal(voice.source,null);
 voice.effect('tap');voice.say('Nobody hears this.');assert.equal(voice.effects.size,0);assert.equal(voice.worker,null);
 context.resume=()=>{context.state='running';return Promise.resolve();};voice.setVisible(true);await Promise.resolve();
 voice.say('Back.');const fresh=worker.sent.at(-1);worker.onmessage({data:{id:fresh.id,samples:new Float32Array(8000),sampleRate:8000}});assert.equal(voice.source.started,true);
});
test('a stale worker error cannot silence a new worker',()=>{
 const {voice,worker}=fixture();voice.setEnabled(true);voice.say('Old life.');const failed=worker.onerror;
 voice.stop();const replacement={postMessage(){},terminate(){this.terminated=true;}};voice.workerFactory=()=>replacement;voice.say('New life.');
 failed();assert.equal(voice.worker,replacement);assert.equal(replacement.terminated,undefined);
});
test('stopping sound releases every active effect even while the clock is suspended',()=>{
 const {voice,context}=fixture();voice.setEnabled(true);voice.effect('telephone');const effects=[...voice.effects];context.state='suspended';voice.stop();
 assert.equal(voice.effects.size,0);assert.ok(effects.every(effect=>effect.stopped));
});

test('a closed phone audio context is replaced on the next gesture',()=>{
 const {voice,context,worker}=fixture();voice.setEnabled(true);voice.say('First.');
 const request=worker.sent.at(-1);worker.onmessage({data:{id:request.id,samples:new Float32Array(8000),sampleRate:8000}});
 const source=voice.source;context.state='closed';const fresh=fixture().context;voice.contextFactory=()=>fresh;
 voice.resume();assert.equal(voice.context,fresh);assert.equal(source.stopped,true);
 voice.say('Second.');const next=worker.sent.at(-1);worker.onmessage({data:{id:next.id,samples:new Float32Array(8000),sampleRate:8000}});assert.equal(voice.source.started,true);
});
test('an old unplayed reply expires while a phone is interrupted',async()=>{
 const {voice,context,worker}=fixture();let now=1000;voice.now=()=>now;voice.setEnabled(true);context.state='interrupted';context.resume=()=>Promise.resolve();
 voice.say('That was a while ago.');const request=worker.sent.at(-1);worker.onmessage({data:{id:request.id,samples:new Float32Array(8000),sampleRate:8000}});
 now+=15000;context.state='running';voice.resume();await Promise.resolve();assert.equal(voice.source,null);assert.equal(voice.pendingAudio,null);
});
