import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
await mkdir('.local/browser-qa',{recursive:true});
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||undefined,headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1100,height:820}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${process.env.BROWSER_TEST_URL||'http://127.0.0.1:4173'}/?debug`);
 await page.locator('#spawn-button').click();
 await page.waitForFunction(()=>!!window.__habitat.life,{},{timeout:120000});
 await page.evaluate(()=>{const h=window.__habitat;h.mind.dispose();h.life.tick=()=>{};h.life.position=[-.3,.9];h.life.path=[];h.life.yaw=0;});
 const capture=async name=>{await page.waitForTimeout(200);await page.screenshot({path:`.local/browser-qa/${name}.png`});};
 for(const [name,time]of [['arrival-fall',.62],['arrival-impact',1],['arrival-getup',2.5]]){
   await page.evaluate(t=>{window.__habitat.life.age=t;},time);await capture(name);
 }
 await page.evaluate(()=>{const l=window.__habitat.life;l.age=10;l.arrival=null;l.nextVisitor=10;l.updateVisitor();l.visitor.kind=3;l.visitor.aggressive=false;l.visitor.born=l.age-l.visitor.duration*.55;l.updateVisitor();});
 await capture('visitor-pass');
 assert.ok(await page.evaluate(()=>window.__habitat.life.snapshot().lookTarget));
 assert.equal(await page.evaluate(()=>window.__habitat.room.visitorMeshes.filter(m=>m.visible).length),1);
 await page.evaluate(()=>{const l=window.__habitat.life;l.visitor.aggressive=true;l.visitor.target=[...l.position];l.visitor.born=l.age-l.visitor.duration*.54;l.updateVisitor();});
 await capture('visitor-hostile');
 assert.ok(await page.evaluate(()=>window.__habitat.life.snapshot().startled>0));
 await page.evaluate(()=>{const l=window.__habitat.life;l.visitor=null;l.startledUntil=0;});
 await page.locator('[data-action="hole"]').click();
 await page.evaluate(()=>{window.__habitat.life.age+=1;});await capture('hole-open');
 assert.equal(await page.evaluate(()=>window.__habitat.room.holeDisk.visible),true);
 await page.evaluate(()=>{const l=window.__habitat.life;l.position=[l.hole.x,l.hole.z];Object.getPrototypeOf(l).tick.call(l,.1);l.age+=.3;});
 await capture('hole-falling');
 await page.evaluate(()=>{window.__habitat.life.age+=2;});await capture('hole-empty');
 assert.equal(await page.evaluate(()=>window.__habitat.life.alive),false);
 assert.equal(await page.evaluate(()=>window.__habitat.room.model.visible),false);
 assert.equal(await page.evaluate(()=>window.__habitat.room.skeleton.visible),false);
 assert.equal(await page.evaluate(()=>window.__habitat.room.shadow.visible),false);
 assert.equal(await page.evaluate(()=>window.__habitat.mind.ready),false);
 assert.deepEqual(errors,[]);
 console.log('PASS: ceiling arrival poses, visitor gaze/aggression, hole button, permanent disappearing death, no page errors.');
}finally{await browser.close();}
