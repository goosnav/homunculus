import {driveNight} from './night-driver.mjs';
// Production-build soak; optional Linux RSS ceiling is a local regression gate,
// not a prediction of iOS's per-tab memory limit.
import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
const site=process.env.BROWSER_TEST_URL||'http://127.0.0.1:4173';
const cycles=Number(process.env.SOAK_CYCLES||8),idleMs=Number(process.env.SOAK_IDLE_MS||120000);
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||undefined,headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
const cdp=await browser.newBrowserCDPSession(),page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const errors=[],samples=[],results=[];let stage='load',sampling=false,timer;
page.on('pageerror',e=>errors.push(e.message));page.on('crash',()=>errors.push('Renderer crashed'));
async function sample(){
 if(process.platform!=='linux'||sampling)return;sampling=true;
 try{const {processInfo}=await cdp.send('SystemInfo.getProcessInfo');let rss=0;
  for(const p of processInfo.filter(p=>p.type==='renderer'))try{rss+=Number((await readFile(`/proc/${p.id}/status`,'utf8')).match(/VmRSS:\s+(\d+)/)?.[1]||0)/1024;}catch{}
  samples.push({stage,rendererMiB:Math.round(rss)});
 }finally{sampling=false;}
}
try{
 timer=setInterval(()=>void sample(),500);
 await page.goto(`${site}/?debug&body=${['human','slug','worm','mass'].includes(process.env.SOAK_SPECIES)?process.env.SOAK_SPECIES:'human'}`);await page.locator('#spawn-button').click();
 await page.waitForFunction(()=>!!window.__habitat?.life,{},{timeout:120000});
 // Keep rendering/physics/audio running, but issue deliberations serially here
 // so results cannot be confused with a concurrent autonomous thought.
 await page.evaluate(()=>window.__habitat.pauseAutonomy=true);
 await page.waitForFunction(()=>!window.__habitat.mind.pending);
 if(process.env.SOAK_AFTER_HOURS==='1'){stage='full-shift';await driveNight(page);}
 if(process.env.SOAK_BIOLOGY==='1'){
  stage='biology-thirty-minutes';
  const stats=await page.evaluate(async()=>{
   const h=window.__habitat,l=h.life,r=h.room;
   for(let i=0;i<40;i++)l.tick(.1);
   const owned=()=>{const geometries=new Set(),materials=new Set();let objects=0;r.scene.traverse(o=>{objects++;if(o.geometry)geometries.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[])materials.add(m);});return {objects,geometries:geometries.size,materials:materials.size};};
   const before={...r.renderer.info.memory},beforeOwned=owned();
   for(let chunk=0;chunk<450;chunk++){
    if(chunk%30===0)h.interaction('mist');
    if(chunk%40===0)h.interaction('draft-power');
    if(chunk%50===0)h.interaction('draft-turn',{direction:1});
    if(chunk%60===0)h.interaction('resonance-power');
    if(chunk%70===0)h.interaction('resonance-tone',{tone:chunk%3+1});
    if(!l.chamber.busy&&l.laboratory.nest.scraps.length<3)h.interaction('deliver-scrap',{item:['paper','wire','cloth'].find(k=>!l.laboratory.nest.scraps.includes(k))});
    for(let tick=0;tick<40;tick++)l.tick(.1);
    r.update(l.snapshot());await new Promise(requestAnimationFrame);
   }
   h.interaction('resonance-tone',{tone:1});for(let i=0;i<60;i++)l.tick(.1);
   while(l.laboratory.resonance.power)h.interaction('resonance-power');
   return {age:l.age,before,beforeOwned,afterOwned:owned(),after:{...r.renderer.info.memory},events:l.events.length,archive:JSON.stringify(l.chamber.archive).length,alive:l.alive};
  });
  assert.ok(stats.alive&&stats.age>=1800);assert.ok(stats.events<=4&&stats.archive<2000);
  assert.deepEqual(stats.afterOwned,stats.beforeOwned,'thirty minutes must reuse the fixed scene objects and resources');
  assert.ok(stats.after.geometries<=stats.afterOwned.geometries+2,'renderer allocations remain bounded by the actual scene');
  console.log('Biology accelerated soak:',JSON.stringify(stats));
 }
 const identity=await page.evaluate(()=>window.__habitat.life.name);
 for(let i=0;i<cycles;i++){
  stage=`cycle-${i}`;
  const result=await page.evaluate(async i=>{
   const h=window.__habitat,l=h.life;
   l.choose('watch');
   if(i%2===0)h.interaction('read');else h.interaction('message',{text:['字'.repeat(400),'Choose your next action.'.repeat(17).slice(0,400),'\nPage 1: x'.repeat(40),'🦆'.repeat(200)][Math.floor(i/2)%4]});
   let event;while(l.events.length)event=l.takeEvent();
   if(!event)throw Error('Missing intervention');
   const expected=[...event.text.matchAll(/Page (\d+):\s*(\S+)/g)].map(m=>({page:m[1],first:m[2]}));
   const response=await h.mind.think(h.mindMessages(l,event),{speak:true});
   l.applyThought(h.parseThought(response.text),l.epoch);
   return {inputTokens:response.inputTokens,prompts:response.prompts,expected,elapsed:response.elapsed,text:response.text};
  },i);
  for(const count of Object.values(result.inputTokens))assert.ok(Number.isInteger(count)&&count<=256);
  for(const p of result.expected){assert.ok(result.prompts.decision.at(-1).content.includes(`Page ${p.page}:`));assert.ok(result.prompts.decision.at(-1).content.includes(p.first));}
  if(i%2===0)assert.equal(result.expected.length,2);
  results.push({cycle:i,inputTokens:result.inputTokens,elapsed:result.elapsed});console.log(JSON.stringify(results.at(-1)));
  assert.equal(await page.evaluate(()=>window.__habitat.life.alive),true);
  assert.equal(await page.evaluate(()=>window.__habitat.life.name),identity);
 }
 stage='idle';await page.evaluate(()=>window.__habitat.pauseAutonomy=false);await page.waitForTimeout(idleMs);
 assert.equal(await page.evaluate(()=>window.__habitat.life.name),identity);
 assert.equal(await page.evaluate(()=>window.__habitat.life.alive),true);
 assert.ok(await page.evaluate(()=>window.__habitat.voice.lastAudio?.samples>0),'actual local voice must run during the soak');
 stage='death';await page.locator('#experiments-toggle').click();await page.locator('[data-action="anvil"]').click();await page.waitForFunction(()=>!window.__habitat.life.alive);
 await page.waitForFunction(()=>window.__habitat.mind.worker===null&&window.__habitat.voice.worker===null);
 await page.waitForTimeout(2000);
 const {targetInfos}=await cdp.send('Target.getTargets');assert.equal(targetInfos.filter(t=>t.type==='worker').length,0,'death must terminate outer and nested workers');
 assert.deepEqual(errors,[]);
 await sample();const peak=Math.max(...samples.map(s=>s.rendererMiB));
 if(process.env.MAX_RENDERER_MIB)assert.ok(peak<=Number(process.env.MAX_RENDERER_MIB),`Renderer peak ${peak} MiB exceeds the memory regression budget`);
 console.log('PASS: repeated real GGUF inference, OCR/Unicode token bounds, audible PCM, idle survival, terminal worker cleanup. Peak renderer RSS:',peak,'MiB');
}finally{
 clearInterval(timer);await mkdir('.local/browser-qa',{recursive:true});
 await writeFile('.local/browser-qa/stability-soak.json',JSON.stringify({samples,results,errors},null,2));
 await browser.close();
}
