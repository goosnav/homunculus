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
