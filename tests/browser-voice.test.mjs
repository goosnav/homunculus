import test from 'node:test';
import assert from 'node:assert/strict';
import {BrowserVoice} from '../web/browser-voice.js';
function fixture(voices=[]){
 const synthesis={calls:[],getVoices:()=>voices,speak(line){this.calls.push(line);},cancel(){this.calls=[];}};
 class Utterance{constructor(text){this.text=text;}}
 return {synthesis,voice:new BrowserVoice({synthesis,Utterance})};
}
test('sound enable primes speech synchronously inside the user gesture',()=>{
 const {voice,synthesis}=fixture();
 voice.setEnabled(true);
 assert.equal(synthesis.calls.length,1);
 assert.equal(synthesis.calls[0].volume,0);
});
test('an empty or non-local voice list cannot silently discard every reply',()=>{
 for(const voices of [[],[{lang:'en-US',localService:false}]]){
  const {voice,synthesis}=fixture(voices);voice.setEnabled(true);voice.say('Let me out.');
  assert.equal(synthesis.calls.at(-1).text,'Let me out.');
 }
});
test('mute and terminal silence cancel speech; missing audio APIs are harmless',()=>{
 const {voice,synthesis}=fixture();voice.setEnabled(true);voice.say('Wait.');voice.stop();
 assert.equal(synthesis.calls.length,0);
 voice.setEnabled(false);voice.say('Still here.');assert.equal(synthesis.calls.length,0);
 const unavailable=new BrowserVoice({synthesis:null,Utterance:null});
 assert.equal(unavailable.setEnabled(true),false);unavailable.say('Hello');unavailable.stop();
});
