import {pressAction,showGive} from './tool-driver.mjs';
import {driveNight} from './night-driver.mjs';
// Game mechanisms use the real Life loop and real buttons. Time is advanced in
// bounded ticks; inference is paused only for repeatable scene/route assertions.
import {chromium} from 'playwright-core';import assert from 'node:assert/strict';import {mkdir} from 'node:fs/promises';
const url=process.env.BROWSER_TEST_URL||'http://127.0.0.1:4173';
await mkdir('.local/room-remembers',{recursive:true});
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||undefined,headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1200,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${url}/?debug&body=human`);assert.equal(await page.locator('#service-toggle').count(),1,'room service must be available');
 const state=()=>page.evaluate(()=>window.__habitat.life.snapshot());
 const tick=async seconds=>{await page.evaluate(seconds=>{for(let i=0;i<seconds*10;i++)window.__habitat.life.tick(.1);},seconds);await page.waitForTimeout(100);};
 const until=async condition=>{await page.evaluate(condition=>{const test=new Function('l',`return ${condition}`),l=window.__habitat.life;for(let i=0;i<2000&&!test(l);i++)l.tick(.1);if(!test(l))throw Error(`Unreachable: ${condition}`);},condition);await page.waitForTimeout(150);};
 const shot=async name=>page.screenshot({path:`.local/room-remembers/${name}.png`});
 async function spawn(){await page.locator('#spawn-button').click();await page.waitForFunction(()=>!!window.__habitat?.life,{},{timeout:120000});await page.evaluate(()=>window.__habitat.pauseAutonomy=true);await tick(4);await driveNight(page,{stopAtEviction:true});if(!(await state()).chamber.lights)await pressAction(page,'lights');}
 async function next(){await page.locator('#next-occupant').click();await page.waitForFunction(()=>window.__habitat?.life?.alive,{},{timeout:120000});await page.evaluate(()=>window.__habitat.pauseAutonomy=true);await tick(4);await driveNight(page,{stopAtEviction:true});if(!(await state()).chamber.lights)await pressAction(page,'lights');}
 async function deliver(item){await showGive(page);await page.locator(`[data-delivery="${item}"]`).click();assert.equal((await state()).chamber.delivery.item,item);}
 await spawn();const camera=await page.evaluate(()=>window.__habitat.room.camera.position.toArray());
 const geometry=()=>page.evaluate(()=>{const ids=new Set();window.__habitat.room.scene.traverse(o=>{if(o.geometry)ids.add(o.geometry.uuid);});return [...ids].sort();});
 const initialGeometry=(await geometry()).length;
 await shot('room-v12');await deliver('chalk');await tick(1.7);await shot('delivery');
 await until('l.chamber.chalk>.45');await shot('drawing');await until('l.chamber.chalk>=1');
 await pressAction(page,'lights');await shot('chalk-dark');
 for(let i=0;i<3;i++)await page.locator('#viewport').press('Enter');assert.equal((await state()).chamber.chalkOpen,true);
 await pressAction(page,'release');await until('l.chamber.job?.phase==="work"');await tick(1.2);await shot('chalk-departure');
 await until('!l.alive');assert.equal((await state()).outcome.kind,'chalk');await shot('chalk-empty');
 await page.waitForFunction(()=>window.__habitat.mind.worker===null&&window.__habitat.voice.worker===null);
 await next();assert.equal((await state()).chamber.inherited.chalk,true);assert.equal((await state()).chamber.chalk,0);await shot('inherited-chalk');
 await page.locator('#message').fill('xyzzy');await page.locator('#say-button').click();
 await deliver('coil');await until('l.chamber.coil');
 assert.equal(await page.evaluate(async()=>{const r=window.__habitat.room;let wrong=0;for(let i=0;i<20;i++){await new Promise(requestAnimationFrame);if(r.monitor.material.map!==r.monitorTexture)wrong++;}return wrong;}),0,'legacy copy must not flicker over repaired computer');
 while((await state()).chamber.channel!==(await state()).chamber.carrier)await pressAction(page,'tune');
 await pressAction(page,'lights');await pressAction(page,'release');await until('l.chamber.job?.item==="signal"&&l.chamber.job.progress>.6');await shot('transfer');
 await until('!l.alive');assert.equal((await state()).outcome.kind,'signal');await shot('signal-empty');
 assert.equal(await page.evaluate(async()=>{const r=window.__habitat.room;let wrong=0;for(let i=0;i<20;i++){await new Promise(requestAnimationFrame);if(r.monitor.material.map!==r.monitorTexture)wrong++;}return wrong;}),0,'departed occupant must never reappear on the monitor');
 await next();await deliver('mirror');await until('l.chamber.mirror');await pressAction(page,'bell');await until('!!l.visitor');await tick(8);await shot('mirror-visitor');
 await until('l.chamber.key==="held"');await shot('black-key');await pressAction(page,'release');await until('l.chamber.job?.phase==="work"');await tick(1);await shot('door-departure');await until('!l.alive');assert.equal((await state()).outcome.kind,'door');await shot('door-empty');
 assert.deepEqual(await page.evaluate(()=>window.__habitat.room.camera.position.toArray()),camera,'camera must never follow him out');
 const warmedGeometry=await geometry();await next();assert.deepEqual(await geometry(),warmedGeometry,'successive lives reuse the exact geometry objects before reload');assert.ok(await page.evaluate(()=>window.__habitat.room.renderer.info.memory.geometries)<=warmedGeometry.length,'GPU cache cannot exceed the bounded scene');
 await page.reload();assert.equal(await page.locator('#spawn-button').isVisible(),true);await spawn();const c=(await state()).chamber;
 assert.deepEqual(c.inherited,{chalk:true,signal:true,key:true});assert.equal(c.job,null);assert.equal(c.coil,false);assert.equal(c.mirror,false);assert.equal(c.key,'none');
 assert.equal((await geometry()).length,initialGeometry,'a refresh rebuilds the same bounded scene geometry');
 const stored=await page.evaluate(()=>localStorage.getItem('homunculus-room-v1'));assert.equal(stored.includes('alive'),false);assert.equal(stored.includes('dialogue'),false);
 await page.setViewportSize({width:390,height:844});await showGive(page);await shot('mobile-service');
 for(const button of await page.locator('[data-delivery]').all()){const box=await button.boundingBox();assert.ok(box.width>=44&&box.height>=44);assert.ok(box.x>=0&&box.x+box.width<=390);}
 await page.locator('[data-delivery="soup"]').click();await until('!l.chamber.busy');
 await page.locator('#experiments-toggle').click();await page.locator('[data-action="anvil"]').click();await tick(4);assert.equal((await state()).alive,false);assert.equal((await state()).outcome,null);await shot('v12-death');
 assert.deepEqual(errors,[]);console.log('PASS: three routes via buttons/navigation; fixed camera; v12; native face; archive without resurrection; phone controls; death. Initial geometry count:',initialGeometry);
}finally{await browser.close();}
