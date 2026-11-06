import {chromium} from 'playwright-core';import assert from 'node:assert/strict';import {mkdir} from 'node:fs/promises';import {driveNight} from './night-driver.mjs';
await mkdir('.local/after-hours',{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE||undefined,args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1200,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${process.env.BROWSER_TEST_URL||'http://127.0.0.1:4173'}/?debug&body=human`);assert.equal(await page.locator('#night-toggle').count(),1,'after-hours objects must have reachable controls');
 async function spawn(){await page.locator('#spawn-button').click();await page.waitForFunction(()=>!!window.__habitat?.life,{},{timeout:120000});await page.evaluate(()=>{window.__habitat.pauseAutonomy=true;for(let i=0;i<20;i++)window.__habitat.life.tick(.25);});}
 await spawn();const camera=await page.evaluate(()=>window.__habitat.room.camera.position.toArray());
 await page.locator('#night-toggle').click();await page.locator('#play-select').selectOption('plant');await page.screenshot({path:'.local/after-hours/controls.png'});await page.locator('[data-action="plant"]').click();
 await page.evaluate(()=>{for(let i=0;i<100;i++)window.__habitat.life.tick(.25);});
 let route=0;const shots=async(phase,s)=>{if(phase!=='quiet'){await page.waitForTimeout(100);await page.screenshot({path:`.local/after-hours/${route}-${phase}.png`});}};
 const duration=await driveNight(page,{onPhase:shots});assert.ok(duration<1800);assert.equal(await page.evaluate(()=>window.__habitat.life.alive),true);await page.screenshot({path:'.local/after-hours/stayed.png'});
 await page.setViewportSize({width:390,height:844});if(!await page.locator('#night-drawer').isVisible())await page.locator('#night-toggle').click();await page.screenshot({path:'.local/after-hours/mobile.png'});
 const viewport=await page.locator('#viewport').boundingBox();assert.ok(viewport.height>=200);for(const b of await page.locator('#night-drawer button:visible').all()){const r=await b.boundingBox();assert.ok(r.width>=44&&r.height>=36);assert.ok(r.x>=0&&r.x+r.width<=390);}
 await page.setViewportSize({width:1200,height:900});const sceneGeometry=await page.evaluate(()=>{const ids=new Set();window.__habitat.room.scene.traverse(o=>{if(o.geometry)ids.add(o.geometry.uuid);});return [...ids].sort();});
 await page.locator('#experiments-toggle').click();await page.locator('[data-action="anvil"]').click();await page.waitForFunction(()=>!window.__habitat.life.alive);await page.waitForTimeout(3200);const warm=await page.evaluate(()=>{const r=window.__habitat.room,anvil=new Set();for(const o of r.anvilMeshes.values())o.traverse(m=>{if(m.geometry)anvil.add(m.geometry.uuid);});return r.renderer.info.memory.geometries-anvil.size;});await page.locator('#next-occupant').click();await page.waitForFunction(()=>window.__habitat.life.alive,{},{timeout:120000});await page.evaluate(()=>window.__habitat.pauseAutonomy=true);await page.waitForTimeout(200);
 assert.equal(await page.evaluate(()=>window.__habitat.room.renderer.info.memory.geometries),warm);assert.deepEqual(await page.evaluate(()=>{const ids=new Set();window.__habitat.room.scene.traverse(o=>{if(o.geometry)ids.add(o.geometry.uuid);});return [...ids].sort();}),sceneGeometry);route=1;
 const alt=await driveNight(page,{alternative:true,ending:'leave',callService:true,onPhase:shots});assert.ok(alt<duration-250,'calling service removes enforced quiet intervals');assert.equal(await page.evaluate(()=>window.__habitat.life.outcome.kind),'signal');
 assert.deepEqual(await page.evaluate(()=>window.__habitat.room.camera.position.toArray()),camera);await page.screenshot({path:'.local/after-hours/left.png'});
 const visibleKeepsakes=await page.evaluate(()=>{const n=window.__habitat.room.nightView;return [...n.keepsakes].filter(([,o])=>o.visible).map(([key])=>key);});
 for(const key of ['tooth','bloom','spool','jar','tenant','boat','shell','silhouette','seal'])assert.ok(visibleKeepsakes.includes(key),`visible shelf keepsake: ${key}`);
 assert.deepEqual(errors,[]);console.log(`PASS: actual controls, two full shifts (unhurried ${Math.round(duration)}s / call-service ${Math.round(alt)}s), alternate solutions, stay/leave, permanent death, mobile drawer, scene reuse and fixed camera.`);
}finally{await browser.close();}
