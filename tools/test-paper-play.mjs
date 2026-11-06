import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {pressAction} from './tool-driver.mjs';

await mkdir('.local/browser-qa',{recursive:true});
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||undefined,headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1100,height:820}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 // The game has no WebSocket dependency. Keep concurrent Vite edits out of this run.
 await page.routeWebSocket('**',socket=>socket.close());
 await page.goto(`${process.env.BROWSER_TEST_URL||'http://127.0.0.1:4173'}/?debug&body=human`);
 await page.evaluate(()=>window.__habitat.pauseAutonomy=true);await page.locator('#spawn-button').click();
 await page.waitForFunction(()=>window.__habitat.life?.alive,{},{timeout:120000});
 await page.evaluate(()=>{const l=window.__habitat.life;l.tick=()=>{};l.nextVisitor=l.nextOddity=Infinity;l.night.nextAt=Infinity;l.paperPlay.random=()=>.05;});
 async function tick(seconds){await page.evaluate(seconds=>{const l=window.__habitat.life;for(let t=0;t<seconds;t+=.1)Object.getPrototypeOf(l).tick.call(l,.1);},seconds);await page.waitForTimeout(120);}
 const state=()=>page.evaluate(()=>window.__habitat.life.paperPlay.snapshot());
 await tick(4);const camera=await page.evaluate(()=>window.__habitat.room.camera.position.toArray());
 await pressAction(page,'fold-plane');await tick(25);assert.equal((await state()).state,'ready');
 await pressAction(page,'launch-plane');await tick(1.5);assert.equal((await state()).state,'flying');
 assert.equal(await page.evaluate(()=>window.__habitat.life.attention?.kind),'paper-plane');
 await page.screenshot({path:'.local/browser-qa/paper-plane-flight.png'});
 await tick(2);assert.equal((await state()).returned,true,'seeded impossible flight crosses the room without a camera cut');
 await tick(40);assert.equal((await state()).state,'ready','the actual resident walks over and retrieves it');
 for(let i=0;i<2;i++){await pressAction(page,'launch-plane');await tick(45);assert.equal((await state()).state,'ready');}
 assert.equal((await state()).drawing,true);await page.screenshot({path:'.local/browser-qa/paper-plane-drawing.png'});
 await page.locator('#laboratory-toggle').click();await page.locator('[data-device="mist"]').click();await page.locator('[data-action="mist"]').click();
 await pressAction(page,'launch-plane');await tick(15);assert.equal((await state()).state,'soggy');
 await page.screenshot({path:'.local/browser-qa/paper-plane-soggy.png'});
 await page.locator('#laboratory-toggle').click();await page.locator('[data-action="mist"]').click();
 await pressAction(page,'fold-plane');await tick(25);assert.equal((await state()).state,'ready');
 await page.locator('#laboratory-toggle').click();await page.locator('[data-device="fan"]').click();await page.locator('[data-action="draft-power"][data-power="2"]').click();
 assert.equal(await page.evaluate(()=>window.__habitat.life.laboratory.draft.power),2);
 await pressAction(page,'launch-plane');await tick(1);assert.ok((await state()).velocity[0]>.2,'real fan changes flight');
 const resources=await page.evaluate(()=>{const v=window.__habitat.room.paperPlayView,g=[],m=[];let count=0;v.root.traverse(o=>{count++;if(o.geometry)g.push(o.geometry.uuid);if(o.material)m.push(o.material.uuid);});return {count,geometry:g,materials:m};});
 await page.evaluate(()=>{const l=window.__habitat.life;for(let i=0;i<18000;i++){
  if(!l.chamber.busy){const state=l.paperPlay.state;if(state==='ready')l.interact('launch-plane');else if(state==='soggy')l.interact('fold-plane');}
  Object.getPrototypeOf(l).tick.call(l,.1);
 }});await page.waitForTimeout(200);
 const after=await page.evaluate(()=>{const v=window.__habitat.room.paperPlayView,g=[],m=[];let count=0;v.root.traverse(o=>{count++;if(o.geometry)g.push(o.geometry.uuid);if(o.material)m.push(o.material.uuid);});return {count,geometry:g,materials:m};});assert.deepEqual(after,resources);
 assert.equal(await page.evaluate(()=>window.__habitat.life.alive),true);
 await page.setViewportSize({width:390,height:844});if(!await page.locator('#night-drawer').isVisible())await page.locator('#night-toggle').click();await page.locator('[data-room-tab="play"]').click();await page.locator('#play-select').selectOption('plane');
 await page.waitForTimeout(150);await page.screenshot({path:'.local/browser-qa/paper-plane-mobile.png'});
 const viewport=await page.locator('#viewport').boundingBox();assert.ok(viewport.height>=180);
 await page.setViewportSize({width:1100,height:820});await pressAction(page,'anvil');await tick(4);assert.equal(await page.evaluate(()=>window.__habitat.life.alive),false);
 assert.equal((await state()).ended,true);await page.screenshot({path:'.local/browser-qa/paper-plane-terminal.png'});
 assert.deepEqual(await page.evaluate(()=>window.__habitat.room.camera.position.toArray()),camera);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({pass:true,resources,checks:'actual fold/throw/fetch, wall return, drawing, mist/refold, wind, 30-minute reuse, mobile controls, permanent death and fixed camera'}));
}finally{await browser.close();}
