import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';

const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||undefined,headless:true,args:['--no-sandbox']});
const origin=new URL(process.env.BROWSER_TEST_URL||'http://127.0.0.1:4173').origin;
try{
  const page=await browser.newPage({viewport:{width:900,height:700}});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/instrument-fixture',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/browser.css"><link rel="stylesheet" href="/instrument.css"></head><body><section class="window"><nav class="menubar"><button>File</button><button>Help</button><span id="menu-note"></span></nav><div id="viewport" tabindex="0"></div><input id="message"></section></body></html>`}));
  await page.goto(`${origin}/instrument-fixture`);
  await page.evaluate(async()=>{
    const {createInstrument}=await import('/instrument.js');
    window.instrument=createInstrument({});
    window.reading={name:'Hugh',alive:true,age:0,affect:{fear:24,curiosity:32,irritation:14,trust:40,energy:85}};
    window.instrument.update(window.reading);
  });
  const panel=page.locator('#emotion-instrument'),opener=page.locator('#emotion-button');
  assert.equal(await panel.isVisible(),false);
  await opener.click();
  assert.equal(await panel.getAttribute('aria-modal'),'false');
  assert.equal(await opener.getAttribute('aria-expanded'),'true');
  assert.match(await panel.locator('.instrument-footer').textContent(),/Hugh/);
  await page.evaluate(()=>{
    for(let i=0;i<180;i++){
      window.reading.age=i*.21;
      window.reading.affect.fear=i%101;
      window.instrument.update(window.reading);
    }
  });
  const points=await panel.locator('.instrument-trace-line').getAttribute('points');
  assert.equal(points.trim().split(/\s+/).length,100,'visible history must remain bounded');
  await panel.locator('[data-channel="energy"]').click();
  assert.equal(await panel.locator('.instrument-dial-value').textContent(),'85');
  assert.match(await panel.locator('[data-channel="energy"]').getAttribute('aria-label'),/85/);
  if(process.env.INSTRUMENT_SCREENSHOT)await panel.screenshot({path:process.env.INSTRUMENT_SCREENSHOT});
  const handle=panel.locator('.instrument-handle');
  await handle.focus();
  const before=await panel.boundingBox();await handle.press('ArrowLeft');
  assert.ok((await panel.boundingBox()).x<before.x,'the title bar must be movable by keyboard');
  await handle.press('Escape');
  assert.equal(await panel.isVisible(),false);
  assert.equal(await opener.evaluate(el=>el===document.activeElement),true);
  await opener.click();
  const title=await handle.boundingBox();
  await page.mouse.move(title.x+60,title.y+12);await page.mouse.down();await page.mouse.move(-100,-100);await page.mouse.up();
  const dragged=await panel.boundingBox();assert.ok(dragged.x>=0&&dragged.y>=0,'dragging cannot strand the utility offscreen');
  await page.setViewportSize({width:320,height:568});
  await page.evaluate(()=>{
    Object.defineProperties(window.visualViewport,{height:{configurable:true,value:250},offsetTop:{configurable:true,value:30}});
    window.visualViewport.dispatchEvent(new Event('resize'));
  });
  const mobile=await panel.boundingBox();
  assert.ok(mobile.x>=0&&mobile.x+mobile.width<=320);
  assert.ok(mobile.y>=30&&mobile.y+mobile.height<=280,'the close control and instrument must fit above the keyboard');
  assert.equal(await handle.evaluate(el=>getComputedStyle(el).touchAction),'none');
  assert.equal(await page.locator('#viewport').evaluate(el=>getComputedStyle(el).touchAction),'manipulation','dragging the utility must not disable room pinch zoom');
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await panel.locator('.instrument-needle').evaluate(el=>getComputedStyle(el).transitionDuration),'0s');
  await page.evaluate(()=>{window.instrument.update({...window.reading,alive:false});});
  assert.match(await panel.locator('.instrument-footer').textContent(),/NO SIGNAL/);
  assert.equal(await panel.locator('.instrument-trace-line').getAttribute('points'),'');
  await page.evaluate(()=>{window.instrument.destroy();});
  assert.equal(await panel.count(),0);assert.equal(await opener.count(),0);assert.deepEqual(errors,[]);
  console.log('PASS: instrument readings, bounded history, nonmodal keyboard control, pointer bounds, mobile keyboard viewport, terminal state and cleanup.');
}finally{await browser.close();}
