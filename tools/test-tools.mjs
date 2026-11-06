import {chromium,webkit} from 'playwright-core';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

// Real rendering, model load, touch input and UI controls. Time is stepped only
// after spawn so arrival/story scheduling cannot obscure the controls under test.
const site=new URL(process.env.BROWSER_TEST_URL||'http://127.0.0.1:4173');
const engines=process.env.BROWSER_ENGINE==='both'?['chromium','webkit']:[process.env.BROWSER_ENGINE||'chromium'];
await mkdir('.local/browser-qa',{recursive:true});
for(const name of engines){
 const engine=name==='webkit'?webkit:chromium;
 const executablePath=name==='webkit'?(process.env.WEBKIT_EXECUTABLE||fileURLToPath(new URL('../.local/browser-qa/run-webkit.sh',import.meta.url))):process.env.BROWSER_EXECUTABLE;
 const browser=await engine.launch({executablePath,headless:true,...(name==='chromium'?{args:['--no-sandbox','--enable-unsafe-swiftshader']}:{})});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const errors=[],oldAPI=[],weights=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>{const url=new URL(request.url());if(/\/api\/|:11434/.test(url.href))oldAPI.push(url.href);if(/\/models\/.*\.bin$/.test(url.pathname))weights.push(url.href);});
  await page.goto(new URL('/?debug&body=slug',site).href);
  await page.evaluate(()=>{window.__habitat.pauseAutonomy=true;});
  await page.locator('#spawn-button').tap();
  await page.waitForFunction(()=>window.__habitat.life?.species==='slug',{},{timeout:120000});
  assert.equal(await page.evaluate(()=>window.__habitat.mind.ready),true,'spawn loads the actual browser mind');
  assert.ok(weights.length>0,'the real bundled weights were requested');
  assert.notEqual(await page.evaluate(()=>document.activeElement?.id),'message','touch spawn must not open the keyboard');
  assert.equal(await page.locator('#message').evaluate(el=>parseFloat(getComputedStyle(el).fontSize)),16,'mobile input must not trigger focus magnification');
  await page.evaluate(()=>{const l=window.__habitat.life;l.tick=()=>{};l.arrival=null;l.age=10;l.activity='watch';l.path=[];l.position=[0,.5];l.nextVisitor=1e6;l.night.phase='quiet';l.night.nextAt=1e6;});
  const camera=await page.evaluate(()=>window.__habitat.room.camera.position.toArray());
  const settle=()=>page.waitForTimeout(180);
  const checkLayout=async(label,minimum=220)=>{
   const size=await page.evaluate(()=>({width:innerWidth,overflow:document.documentElement.scrollWidth,room:document.querySelector('#viewport').getBoundingClientRect().height}));
   assert.ok(size.overflow<=size.width,`${label}: no horizontal page overflow`);
   assert.ok(size.room>=minimum,`${label}: room remains visible (${size.room}px)`);
   for(const button of await page.locator('#interventions button:visible').all())assert.ok((await button.boundingBox()).height>=40,`${label}: main tool touch targets`);
  };
  const open=async(kind)=>{if(!(await page.locator(`#${kind}-drawer`).isVisible()))await page.locator(`#${kind}-toggle`).tap();await settle();assert.equal(await page.locator('.tool-drawer:visible').count(),1,'one drawer is open');await checkLayout(kind);};
  const click=async(selector)=>{await page.locator(selector).tap();await settle();};
  const pressed=async(selector)=>{await page.waitForFunction(selector=>document.querySelector(selector)?.getAttribute('aria-pressed')==='true',selector);assert.equal(await page.locator(selector).getAttribute('aria-pressed'),'true',`${selector} visibly selected`);};
  const step=async(seconds)=>{await page.evaluate(seconds=>{const l=window.__habitat.life;for(let i=0;i<seconds*10;i++)Object.getPrototypeOf(l).tick.call(l,.1);},seconds);await settle();};
  for(const drawer of ['service','night','laboratory','experiments'])await open(drawer);
  await page.screenshot({path:`.local/browser-qa/tools-${name}-experiments.png`});

  await open('laboratory');await click('[data-device="fan"]');
  for(const power of [1,2,0]){
   await click(`[data-action="draft-power"][data-power="${power}"]`);
   assert.equal(await page.evaluate(()=>window.__habitat.life.laboratory.draft.power),power);
   await pressed(`[data-action="draft-power"][data-power="${power}"]`);
  }
  for(const direction of [1,2,3,0]){
   await click(`[data-action="draft-direction"][data-direction="${direction}"]`);
   assert.equal(await page.evaluate(()=>window.__habitat.life.laboratory.draft.direction),direction);
   await pressed(`[data-action="draft-direction"][data-direction="${direction}"]`);
  }
  assert.equal(await page.locator('#tool-feedback').isVisible(),true,'device feedback is visible on phones');
  assert.match(await page.locator('#tool-feedback').innerText(),/fan/i);
  await page.screenshot({path:`.local/browser-qa/tools-${name}-fan.png`});
  await click('[data-device="mist"]');await click('[data-action="mist"]');
  assert.equal(await page.evaluate(()=>window.__habitat.life.laboratory.mist.on),true);await pressed('[data-action="mist"]');
  assert.equal(await page.locator('[data-action="mist"]').innerText(),'Stop mist');
  await click('[data-action="mist"]');
  await click('[data-device="resonator"]');
  for(const power of [1,2,0]){await click(`[data-action="resonance-power"][data-power="${power}"]`);assert.equal(await page.evaluate(()=>window.__habitat.life.laboratory.resonance.power),power);await pressed(`[data-action="resonance-power"][data-power="${power}"]`);}
  for(const pad of [2,1,0]){
   await click(`[data-action="resonance-aim"][data-pad="${pad}"]`);
   assert.equal(await page.evaluate(()=>window.__habitat.life.laboratory.resonance.pad),pad);
   await pressed(`[data-action="resonance-aim"][data-pad="${pad}"]`);
   assert.equal(await page.evaluate(()=>window.__habitat.room.laboratoryView.selectedPad),pad);
  }
  await checkLayout('resonator');await page.screenshot({path:`.local/browser-qa/tools-${name}-resonator.png`});
  await click('[data-device="nest"]');await click('[data-action="deliver-scrap"][data-item="paper"]');
  assert.match(await page.locator('#device-state').innerText(),/busy|finish/i,'job rejection reason is visible');
  assert.equal(await page.locator('[data-item="wire"]').isDisabled(),true);
  await step(45);
  assert.ok(await page.evaluate(()=>window.__habitat.life.laboratory.nest.scraps.includes('paper')),'paper was actually fitted');
  assert.equal(await page.locator('[data-item="paper"]').isDisabled(),true);
  assert.match(await page.locator('[data-item="paper"]').innerText(),/✓/,'fitted material retains an explicit completion state');
  assert.match(await page.locator('#device-state').innerText(),/Paper fitted/);
  await page.screenshot({path:`.local/browser-qa/tools-${name}-nest.png`});

  await open('night');await click('[data-room-tab="play"]');
  for(const [object,action] of [['mouse','wind-mouse'],['plant','plant'],['boat','fold-boat'],['neighbor','feed-wall']]){
   await page.locator('#play-select').selectOption(object);await settle();
   assert.equal(await page.locator(`[data-action="${action}"]`).isVisible(),true,`${object} action stays reachable`);
   assert.equal(await page.locator('[data-room-panel="fixtures"]').isVisible(),false);
  }
  await click('[data-room-tab="fixtures"]');
  for(const action of ['wave','lights','tune','bell','release','shutter','drain'])assert.equal(await page.locator(`[data-room-panel="fixtures"] [data-action="${action}"]`).isVisible(),true,`${action} remains reachable`);
  assert.match(await page.locator('[data-room-panel="fixtures"] [data-action="tune"]').innerText(),/Radio/);
  await page.evaluate(()=>{const l=window.__habitat.life;l.night.enter(l,'parcel');});await click('[data-room-tab="arrivals"]');
  for(const action of ['open-parcel','return-parcel'])assert.equal(await page.locator(`[data-action="${action}"]`).isVisible(),true);
  await page.evaluate(()=>{const l=window.__habitat.life;l.night.enter(l,'phone');});await settle();
  for(const action of ['answer','hang-up','transmit'])assert.equal(await page.locator(`[data-action="${action}"]`).isVisible(),true);
  await click('[data-action="answer"]');await step(30);
  assert.equal(await page.evaluate(()=>window.__habitat.life.night.phone.answered),true,'old phone job still works from the new drawer');
  assert.equal(await page.locator('[data-action="transmit"]').isEnabled(),true);
  await click('[data-action="tune"][data-channel="3"]');
  assert.equal(await page.evaluate(()=>window.__habitat.life.chamber.channel),3,'phone radio selection changes the actual channel');
  await pressed('[data-action="tune"][data-channel="3"]');
  assert.equal(await page.locator('[data-room-panel="arrivals"]').isVisible(),true,'phone tuning stays beside the telephone controls');
  await click('[data-action="transmit"]');
  assert.equal(await page.evaluate(()=>window.__habitat.life.chamber.job?.item),'night:transmit','send tone starts from the same panel');
  await step(15);
  await page.screenshot({path:`.local/browser-qa/tools-${name}-phone.png`});

  // Hit the real fan geometry through the fixed camera, not a synthetic event.
  await page.locator('#night-toggle').tap();await settle();
  const point=await page.evaluate(()=>{const r=window.__habitat.room,v=r.laboratoryView.fanHead.position.clone();r.laboratoryView.fanHead.getWorldPosition(v);v.project(r.camera);const box=r.renderer.domElement.getBoundingClientRect();return {x:box.x+(v.x+1)*box.width/2,y:box.y+(1-v.y)*box.height/2};});
  const before=await page.evaluate(()=>{const l=window.__habitat.life;return {epoch:l.epoch,draft:{...l.laboratory.draft},resonance:{...l.laboratory.resonance},position:[...l.position],attention:l.attention};});
  await page.touchscreen.tap(point.x,point.y);await settle();
  assert.equal(await page.locator('#laboratory-drawer').isVisible(),true,'tapping physical fan opens its tool');
  await pressed('[data-device="fan"]');
  assert.deepEqual(await page.evaluate(()=>{const l=window.__habitat.life;return {epoch:l.epoch,draft:{...l.laboratory.draft},resonance:{...l.laboratory.resonance},position:[...l.position],attention:l.attention};}),before,'selecting a physical device does not issue a simulation action');
  await click('#emotion-button');
  const meter=await page.locator('#emotion-instrument').boundingBox();
  assert.ok(meter.height<=215,`mobile meter is compact (${meter.height}px)`);
  assert.ok(meter.x>=0&&meter.x+meter.width<=390,'meter fits phone width');
  await page.screenshot({path:`.local/browser-qa/tools-${name}-meter.png`});
  await click('.instrument-close');
  await page.setViewportSize({width:320,height:568});await settle();
  await page.screenshot({path:`.local/browser-qa/tools-${name}-small.png`});
  await checkLayout('small mobile',180);
  assert.deepEqual(await page.evaluate(()=>window.__habitat.room.camera.position.toArray()),camera,'tool use preserves the fixed fishbowl camera');
  assert.deepEqual(errors,[]);assert.deepEqual(oldAPI,[]);
  console.log(JSON.stringify({pass:true,engine:name,checks:'real mobile spawn; no autofocus; four drawers; explicit devices; zero target; fitted nest; visible feedback; room tabs; phone job; physical device tap; compact meter; 390px and 320px layout; fixed camera'}));
 }finally{await browser.close();}
}
