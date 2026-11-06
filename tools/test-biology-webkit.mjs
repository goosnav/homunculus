import {webkit} from 'playwright-core';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const site=new URL(process.env.BROWSER_TEST_URL||'http://127.0.0.1:8773');
const executable=process.env.BROWSER_EXECUTABLE||fileURLToPath(new URL('../.local/browser-qa/run-webkit.sh',import.meta.url));
const browser=await webkit.launch({executablePath:executable,headless:true});
await mkdir('.local/browser-qa',{recursive:true});
try{
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const errors=[],external=[],oldAPI=[],weights=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>{
    const url=new URL(request.url());
    if(/^https?:$/.test(url.protocol)&&url.origin!==site.origin)external.push(url.href);
    if(/\/api\/|:11434/.test(url.href))oldAPI.push(url.href);
    if(/\/models\/.*\.bin$/.test(url.pathname))weights.push(url.href);
  });
  await page.goto(new URL('/?debug&body=worm',site).href);
  const bundle=await page.locator('script[type="module"][src]:not([src="/@vite/client"])').getAttribute('src');
  await page.evaluate(()=>{window.__habitat.pauseAutonomy=true;});
  const started=Date.now();await page.locator('#spawn-button').click();
  await page.waitForFunction(()=>window.__habitat.life?.species==='worm',{},{timeout:120000});
  await page.waitForFunction(()=>!window.__habitat.life.arrival,{},{timeout:15000});
  const spawnMs=Date.now()-started;
  const initial=await page.evaluate(()=>{
    const h=window.__habitat,r=h.room;
    return {species:h.life.species,viewSpecies:r.species,ready:h.mind.ready,context:h.mind.context,model:r.model.visible,jaw:!!r.bones.jaw,head:!!r.bones.head,camera:r.camera.position.toArray(),calls:r.renderer.info.render.calls,width:r.renderer.domElement.width,height:r.renderer.domElement.height};
  });
  assert.equal(initial.species,'worm');assert.equal(initial.viewSpecies,'worm');assert.equal(initial.ready,true);
  assert.equal(initial.model,true);assert.ok(initial.jaw&&initial.head&&initial.calls>0);assert.ok(initial.width*initial.height<=640*480);
  assert.deepEqual(initial.context,{size:512,batch:64,threads:1});assert.ok(weights.length>0,'load the actual bundled model');
  assert.ok(await page.locator('#message').evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=16));
  assert.equal(await page.locator('#viewport').evaluate(el=>getComputedStyle(el).touchAction),'manipulation');
  console.log(JSON.stringify({phase:'spawned',engine:browser.version(),bundle,spawnMs,context:initial.context,drawCalls:initial.calls}));

  await page.locator('#message').fill('What do you want?');
  await page.evaluate(()=>{window.__habitat.pauseAutonomy=false;});
  await page.locator('#say-button').click();
  let reply=null;
  await page.waitForFunction(()=>!!window.__habitat.life.utterance.text,{},{timeout:90000});
  reply=await page.evaluate(()=>({text:window.__habitat.life.utterance.text,tokens:window.__habitat.lastThought?.inputTokens}));
  assert.ok(Number.isInteger(reply.tokens?.decision)&&reply.tokens.decision<=256);
  assert.ok(Number.isInteger(reply.tokens?.speech)&&reply.tokens.speech<=256);
  await page.waitForFunction(()=>window.__habitat.voice.lastAudio?.samples>0,{},{timeout:30000});
  const jaws=[];
  for(let i=0;i<5;i++){jaws.push(await page.evaluate(()=>window.__habitat.room.bones.jaw.quaternion.toArray()));await page.waitForTimeout(60);}
  assert.ok(jaws.some(jaw=>jaw.some((value,index)=>Math.abs(value-jaws[0][index])>1e-5)),'the real spoken reply must animate the worm jaw');
  assert.equal(await page.evaluate(()=>window.__habitat.voice.context.state),'running');

  await page.evaluate(()=>{window.__habitat.pauseAutonomy=true;});
  console.log(JSON.stringify({phase:'reply',reply}));
  await page.locator('#message').blur();
  await page.locator('#emotion-button').click();
  const meter=page.locator('#emotion-instrument');
  assert.equal(await meter.isVisible(),true);
  assert.equal(await meter.getAttribute('aria-modal'),'false');
  await meter.locator('[data-channel="energy"]').click();
  assert.equal(Number(await meter.locator('.instrument-dial-value').textContent()),Math.round(await page.evaluate(()=>window.__habitat.life.energy)));
  await page.screenshot({path:'.local/browser-qa/biology-webkit-mobile.png'});

  // WPE has no physical iPhone keyboard. Reproduce its visual-viewport geometry.
  await page.locator('#message').focus();
  await page.evaluate(()=>{
    Object.defineProperties(window.visualViewport,{height:{configurable:true,value:360},offsetTop:{configurable:true,value:30}});
    window.visualViewport.dispatchEvent(new Event('resize'));
  });
  await page.waitForTimeout(150);
  const composer=await page.locator('#message').boundingBox(),instrument=await meter.boundingBox();
  assert.ok(composer.y>=30&&composer.y+composer.height<=390,'the composer must stay above the keyboard');
  assert.ok(instrument.x>=0&&instrument.x+instrument.width<=390&&instrument.y>=30&&instrument.y+instrument.height<=390,'the instrument must remain inside the visible viewport');
  await meter.locator('.instrument-close').click();assert.equal(await meter.isVisible(),false);
  await page.evaluate(()=>{
    delete window.visualViewport.height;delete window.visualViewport.offsetTop;
    window.visualViewport.dispatchEvent(new Event('resize'));
  });
  await page.waitForTimeout(150);
  assert.ok((await page.locator('.window').boundingBox()).height>=840,'the window must recover when the keyboard closes');
  console.log(JSON.stringify({phase:'meter-and-keyboard',composer,instrument}));

  await page.evaluate(()=>window.__habitat.voice.context.suspend());
  await page.locator('#laboratory-toggle').click();
  await page.waitForFunction(()=>window.__habitat.voice.context.state==='running');
  await page.locator('[data-action="draft-direction"][data-direction="3"]').click();
  assert.equal(await page.evaluate(()=>window.__habitat.life.laboratory.draft.direction),3,'Back wall must send the exact direction, rather than cycle it');
  await page.locator('[data-action="draft-direction"][data-direction="0"]').click();
  assert.equal(await page.evaluate(()=>window.__habitat.life.laboratory.draft.direction),0);
  await page.locator('[data-action="draft-power"][data-power="1"]').click();assert.equal(await page.evaluate(()=>window.__habitat.life.laboratory.draft.power),1);
  await page.locator('[data-device="mist"]').click();
  await page.locator('[data-action="mist"]').click();assert.equal(await page.evaluate(()=>window.__habitat.life.laboratory.mist.on),true);
  await page.locator('[data-device="resonator"]').click();
  await page.locator('[data-action="resonance-aim"][data-pad="2"]').click();assert.equal(await page.evaluate(()=>window.__habitat.life.laboratory.resonance.pad),2);
  await page.locator('[data-action="resonance-tone"][data-tone="3"]').click();assert.equal(await page.evaluate(()=>window.__habitat.life.laboratory.resonance.tone),3);
  await page.locator('[data-action="resonance-power"][data-power="2"]').click();
  assert.equal(await page.evaluate(()=>window.__habitat.life.laboratory.resonance.power),2);
  await page.waitForFunction(()=>window.__habitat.life.laboratory.gravity.lift>.8,{},{timeout:30000});
  await page.waitForFunction(()=>window.__habitat.room.body.position.y>.7,{},{timeout:5000});
  await page.screenshot({path:'.local/browser-qa/biology-webkit-gravity.png'});
  await page.locator('[data-action="resonance-tone"][data-tone="1"]').click();
  await page.waitForFunction(()=>window.__habitat.life.laboratory.gravity.lift===0,{},{timeout:10000});
  assert.equal(await page.evaluate(()=>window.__habitat.life.laboratory.gravity.lift),0);
  assert.deepEqual(await page.evaluate(()=>window.__habitat.room.camera.position.toArray()),initial.camera);
  console.log(JSON.stringify({phase:'apparatus',gravityRecovered:true,numericButtonPayloads:true}));

  await page.locator('#experiments-toggle').click();await page.locator('[data-action="anvil"]').click();
  await page.waitForFunction(()=>window.__habitat.life.snapshot().remains==='husk',{},{timeout:10000});
  const terminal=await page.evaluate(()=>{
    const h=window.__habitat;
    return {alive:h.life.alive,remains:h.life.snapshot().remains,body:h.room.model.visible,skeleton:h.room.skeleton.visible,heightScale:h.room.body.scale.y,mindReady:h.mind.ready,voiceWorker:h.voice.worker,source:h.voice.source};
  });
  assert.ok(terminal.heightScale>0&&terminal.heightScale<.5,'the remains must visibly collapse');
  assert.deepEqual({...terminal,heightScale:undefined},{alive:false,remains:'husk',body:true,skeleton:false,heightScale:undefined,mindReady:false,voiceWorker:null,source:null});
  await page.locator('#message').fill('Still there?');await page.locator('#say-button').click();
  await page.waitForTimeout(1500);
  assert.equal(await page.evaluate(()=>window.__habitat.life.alive),false);assert.equal(await page.evaluate(()=>window.__habitat.life.utterance.text),'');
  await page.screenshot({path:'.local/browser-qa/biology-webkit-husk.png'});
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.deepEqual(oldAPI,[]);
  console.log(JSON.stringify({pass:true,engine:'WebKit',viewport:'390×844',bundle,spawnMs,reply,terminal,checks:'real worm and mind, spoken jaw, mobile renderer, meter, simulated keyboard viewport, apparatus payloads, gravity recovery, permanent husk',limitation:'Desktop WPE WebKit; no physical iPhone or real software keyboard.'}));
}finally{await browser.close();}
