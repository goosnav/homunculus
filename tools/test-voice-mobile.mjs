// Real audio graph and bundled Flite worker; no model download is needed here.
// This cannot emulate an iPhone's hardware mute switch or phone-call routing.
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
import {chromium,webkit} from 'playwright-core';

const vite=await createServer({server:{host:'127.0.0.1',port:0}});await vite.listen();
const origin=`http://127.0.0.1:${vite.httpServer.address().port}`;
const selected=process.env.BROWSER_ENGINE||'both';
const engines=selected==='both'?['chromium','webkit']:[selected];
try{
 for(const name of engines){
  const engine=name==='webkit'?webkit:chromium;
  const executablePath=name==='webkit'?(process.env.WEBKIT_EXECUTABLE||fileURLToPath(new URL('../.local/browser-qa/run-webkit.sh',import.meta.url))):process.env.BROWSER_EXECUTABLE;
  const browser=await engine.launch({headless:true,executablePath,args:name==='chromium'?['--no-sandbox']:[]});
  try{
   const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   await page.route('**/__voice-test.html',route=>route.fulfill({contentType:'text/html',body:`<meta name="viewport" content="width=device-width,initial-scale=1"><button id="enable">Spawn</button><button id="say">Speak</button><button id="resume">Touch</button><script type="module">
    import {BrowserVoice} from '/browser-voice.js';
    const voice=window.voice=new BrowserVoice();window.voiceErrors=[];voice.onError=error=>voiceErrors.push(error);
    document.querySelector('#enable').onclick=()=>voice.setEnabled(true);
    document.querySelector('#say').onclick=()=>voice.say('There is no handle on my side.');
    document.querySelector('#resume').onclick=()=>voice.resume();
   </script>`}));
   await page.goto(`${origin}/__voice-test.html`);await page.waitForFunction(()=>!!window.voice);
   await page.locator('#enable').tap();
   await page.waitForFunction(()=>voice.context?.state==='running');
   const measure=async()=>{
    await page.evaluate(()=>{
     const analyser=voice.context.createAnalyser();analyser.fftSize=512;voice.gain.connect(analyser);window.audioProbe=analyser;
    });
    await page.locator('#say').tap();await page.waitForFunction(()=>!!voice.source,{},{timeout:30000});
    const peak=await page.evaluate(async()=>{
     let peak=0;const samples=new Float32Array(audioProbe.fftSize);
     for(let n=0;n<20;n++){audioProbe.getFloatTimeDomainData(samples);for(const sample of samples)peak=Math.max(peak,Math.abs(sample));await new Promise(resolve=>setTimeout(resolve,25));}
     voice.gain.disconnect(audioProbe);audioProbe.disconnect();return peak;
    });
    assert.ok(peak>.005,`real ${name} filtered speech must have measurable PCM, got ${peak}`);
    return peak;
   };
   const peak=await measure();
   // A later utterance must recover the same real context after suspension.
   await page.evaluate(async()=>{await voice.context.suspend();voice.say('Still here.');});
   await page.waitForFunction(()=>voice.context.state==='running'&&!!voice.source);
   for(let i=0;i<3;i++){
    await page.evaluate(()=>voice.setVisible(false));
    await page.waitForFunction(()=>voice.context.state==='suspended');
    assert.deepEqual(await page.evaluate(()=>({effects:voice.effects.size,worker:voice.worker,source:voice.source})),{effects:0,worker:null,source:null});
    await page.evaluate(()=>voice.setVisible(true));await page.locator('#resume').tap();
    await page.waitForFunction(()=>voice.context.state==='running');
    await measure();
   }
   await page.evaluate(async()=>{window.oldAudioContext=voice.context;await voice.context.close();});
   await page.locator('#resume').tap();await page.waitForFunction(()=>voice.context!==oldAudioContext&&voice.context.state==='running');
   const replacementPeak=await measure();
   await page.evaluate(()=>voice.stop());
   assert.deepEqual(await page.evaluate(()=>({effects:voice.effects.size,worker:voice.worker,source:voice.source,pending:voice.pendingAudio})),{effects:0,worker:null,source:null,pending:null});
   assert.deepEqual(await page.evaluate(()=>voiceErrors),[]);assert.deepEqual(errors,[]);
   console.log(JSON.stringify({engine:name,version:browser.version(),peak,replacementPeak,passed:'real male PCM through glass filter, suspended recovery, three background cycles, closed-context recreation, complete stop cleanup'}));
  }finally{await browser.close();}
 }
}finally{await vite.close();}
