import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
await mkdir('.local/browser-qa',{recursive:true});
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||undefined,headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
const url=process.env.BROWSER_TEST_URL||'http://127.0.0.1:4173';
try{
 const page=await browser.newPage({viewport:{width:1100,height:820}}),errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
 await page.goto(`${url}/?debug&body=slug`);await page.evaluate(()=>window.__habitat.pauseAutonomy=true);
 await page.locator('#spawn-button').click();await page.waitForFunction(()=>window.__habitat.life?.species==='slug',{},{timeout:120000});
 const memory=[];
 for(const species of ['slug','worm','mass','human','slug']){
  if(await page.evaluate(()=>window.__habitat.life.species)!==species){await page.evaluate(async s=>{const h=window.__habitat;h.nextSpecies=s;await h.spawn();},species);}
  await page.waitForFunction(s=>window.__habitat.life?.species===s,species,{timeout:120000});
  await page.evaluate(()=>{const h=window.__habitat;h.life.tick=()=>{};h.life.arrival=null;h.life.age=10;h.life.position=[-.15,.75];h.life.path=[];h.life.yaw=0;h.life.activity='watch';h.life.nextVisitor=1e6;});
  await page.waitForTimeout(300);
  const info=await page.evaluate(()=>{const h=window.__habitat,r=h.room;return {species:r.species,bones:Object.keys(r.bones),visible:r.model.visible,memory:r.renderer.info.memory,models:r.body.children.filter(o=>o===r.model).length,camera:r.camera.position.toArray()};});
  assert.equal(info.species,species);assert.equal(info.visible,true);assert.equal(info.models,1);assert.ok(info.bones.includes('jaw'));assert.ok(info.bones.includes('head'));
  await page.screenshot({path:`.local/browser-qa/body-${species}.png`});
  await page.evaluate(()=>{const h=window.__habitat;h.room.speak('I have several complaints.');});await page.waitForTimeout(200);
  await page.screenshot({path:`.local/browser-qa/body-${species}-speaking.png`});
  await page.evaluate(()=>{const l=window.__habitat.life;l.wallDamage=25;l.night.phase='shadow';});await page.waitForTimeout(150);
  assert.deepEqual(await page.evaluate(()=>{const r=window.__habitat.room;return [r.cracks.visible,r.shadow.visible,r.nightView.shadow.visible];}),[true,false,true],'every body shows wall damage and its detached shadow');
  await page.evaluate(()=>{const l=window.__habitat.life;l.wallDamage=0;l.night.phase='quiet';});await page.waitForTimeout(150);
  assert.equal(await page.evaluate(()=>window.__habitat.room.cracks.visible),false,'new lives do not inherit another body’s damage');
  memory.push(await page.evaluate(()=>({...window.__habitat.room.renderer.info.memory}))); // after warming common damage/shadow meshes
 }
 assert.ok(memory.at(-1).geometries<=memory[0].geometries+4,'body replacement must release old geometry');
 assert.ok(memory.at(-1).textures<=memory[0].textures+2,'body replacement must release old textures');
 await page.locator('#emotion-button').click();await page.locator('#laboratory-toggle').click();
 await page.locator('[data-device="mist"]').click();await page.locator('[data-action="mist"]').click();
 await page.locator('[data-device="resonator"]').click();await page.locator('[data-action="resonance-tone"][data-tone="3"]').click();await page.locator('[data-action="resonance-power"][data-power="1"]').click();
 await page.locator('#night-toggle').click();await page.locator('[data-room-tab="fixtures"]').click();await page.locator('[data-action="lights"]').click();
 await page.evaluate(()=>{const h=window.__habitat,l=h.life;for(let i=0;i<80;i++)Object.getPrototypeOf(l).tick.call(l,.1);});await page.waitForTimeout(200);
 assert.equal(await page.evaluate(()=>window.__habitat.room.laboratoryView.eye.visible),true);
 await page.screenshot({path:'.local/browser-qa/glass-eye.png'});
 await page.locator('[data-action="lights"]').click();await page.locator('#laboratory-toggle').click();await page.locator('[data-action="resonance-power"][data-power="2"]').click();
 await page.evaluate(()=>{const l=window.__habitat.life;for(let i=0;i<130;i++)Object.getPrototypeOf(l).tick.call(l,.1);});await page.waitForTimeout(200);
 assert.ok(await page.evaluate(()=>window.__habitat.room.body.position.y>1));await page.screenshot({path:'.local/browser-qa/gravity.png'});
 await page.locator('[data-action="resonance-tone"][data-tone="1"]').click();
 await page.evaluate(()=>{const l=window.__habitat.life;for(let i=0;i<60;i++)Object.getPrototypeOf(l).tick.call(l,.1);});
 assert.equal(await page.evaluate(()=>window.__habitat.life.laboratory.suspended),false);
 await page.locator('[data-action="resonance-power"][data-power="1"]').click();await page.locator('[data-device="nest"]').click();
 for(const item of ['paper','wire','cloth']){await page.locator(`[data-item="${item}"]`).click();await page.evaluate(()=>{const l=window.__habitat.life;for(let i=0;i<350&&l.chamber.job;i++)Object.getPrototypeOf(l).tick.call(l,.1);});await page.waitForTimeout(150);}
 assert.deepEqual(await page.evaluate(()=>window.__habitat.life.laboratory.nest.scraps),['paper','wire','cloth']);
 await page.evaluate(()=>{const l=window.__habitat.life;for(let i=0;i<270;i++)Object.getPrototypeOf(l).tick.call(l,.1);});await page.waitForTimeout(200);
 assert.equal(await page.evaluate(()=>window.__habitat.life.laboratory.nest.heart),'awake');await page.screenshot({path:'.local/browser-qa/room-heart.png'});
 await page.locator('[data-action="keep-heart"]').click();await page.evaluate(()=>{const l=window.__habitat.life;for(let i=0;i<350&&l.chamber.job;i++)Object.getPrototypeOf(l).tick.call(l,.1);});
 assert.equal(await page.evaluate(()=>window.__habitat.life.laboratory.nest.heart),'kept');
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);await page.screenshot({path:'.local/browser-qa/biology-mobile.png'});
 assert.ok(await page.locator('#viewport').evaluate(el=>el.getBoundingClientRect().height>=180));assert.equal(await page.locator('#message').evaluate(el=>getComputedStyle(el).fontSize),'16px');
 await page.locator('#experiments-toggle').click();await page.locator('[data-action="anvil"]').click();await page.evaluate(()=>{const l=window.__habitat.life;for(let i=0;i<45;i++)Object.getPrototypeOf(l).tick.call(l,.1);});await page.waitForTimeout(200);
 assert.equal(await page.evaluate(()=>window.__habitat.life.snapshot().remains),'husk');assert.equal(await page.evaluate(()=>window.__habitat.room.skeleton.visible),false);
 assert.deepEqual(errors,[]);assert.ok(!requests.some(u=>u.includes('/api/')));console.log(JSON.stringify({pass:true,species:4,memory,checks:'real body switching, speech, meter, eye, gravity recovery, nest, heart, mobile, terminal husk; no page errors or API calls'}));
}finally{await browser.close();}
