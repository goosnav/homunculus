import {pressAction,showGive} from './tool-driver.mjs';
import assert from 'node:assert/strict';
export async function driveNight(page,{alternative=false,ending='stay',stopAtEviction=false,callService=false,onPhase=async()=>{}}={}){
 let previous='';
 const press=action=>pressAction(page,action);
 for(let attempt=0;attempt<500;attempt++){
  const s=await page.evaluate(()=>window.__habitat.life.snapshot()),n=s.night,c=s.chamber;
  if(n.phase!==previous){previous=n.phase;await onPhase(n.phase,s);}
  if(n.resolved||stopAtEviction&&n.phase==='eviction')return n.time;
  assert.ok(s.alive,'story actor died unexpectedly');
  if(!c.job&&!s.arrival){
   if(c.cooperation<-.5){await showGive(page);await page.locator('[data-delivery="soup"]').click();}
   else if(n.phase==='quiet'&&callService&&n.serviceReady)await press('call-service');
   else if(n.phase==='parcel')await press(alternative?'return-parcel':'open-parcel');
   else if(n.phase==='rain'){
    if(alternative){if(!n.boat.made||n.boat.captured)await press('fold-boat');else if(!n.boat.launched){if(n.drain&&n.water<.12)await press('drain');else if(n.water>=.12)await press('float-boat');}else if(!n.drain)await press('drain');}
    else if(!n.plant.planted)await press('plant');else if(!c.lights)await press('lights');else if(n.plant.growth>=.65)await press('harvest');
   }else if(n.phase==='phone'){
    if(alternative){if(!n.phone.ignored)await press('hang-up');else if(!n.neighbor.returnAt)await press('feed-wall');}
    else if(!n.phone.answered)await press('answer');else if(c.channel!==n.phone.code[n.phone.index])await press('tune');else await press('transmit');
   }else if(n.phase==='shadow'){
    if(alternative){if(n.shutter)await press('shutter');else await press('bell');}
    else if(n.toy.until<=n.time)await press('wind-mouse');else if(Math.hypot(n.shadow.x-n.toy.x,n.shadow.z-n.toy.z)<.8){if(c.lights)await press('lights');}else if(!c.lights)await press('lights');
   }else if(n.phase==='inspection'){
    const dark=n.inspector.rule==='dark';if(c.lights===dark)await press('lights');else if(n.shutter!==dark)await press('shutter');else if(!n.inspector.submitted)await press('submit-inspection');
   }else if(n.phase==='eviction'){
    if(ending==='stay')await press('refuse-eviction');
    else if(!c.coil){await showGive(page);await page.locator('[data-delivery="coil"]').click();}
    else if(c.lights)await press('lights');else if(c.channel!==c.carrier)await press('tune');else await press('release');
   }
  }
  await page.evaluate(()=>{for(let i=0;i<24;i++)window.__habitat.life.tick(.25);});await page.waitForTimeout(50);
 }
 throw Error('Full shift did not complete through the public controls');
}
