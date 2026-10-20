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
 await page.goto(`${site}/?debug`);await page.locator('#spawn-button').click();
 await page.waitForFunction(()=>!!window.__habitat?.life,{},{timeout:120000});
 // Keep rendering/physics/audio running, but issue deliberations serially here
 // so results cannot be confused with a concurrent autonomous thought.
 await page.evaluate(()=>window.__habitat.pauseAutonomy=true);
 await page.waitForFunction(()=>!window.__habitat.mind.pending);
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
 stage='death';await page.locator('[data-action="anvil"]').click();await page.waitForFunction(()=>!window.__habitat.life.alive);
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
