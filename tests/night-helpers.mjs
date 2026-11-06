import assert from 'node:assert/strict';
export const advance=(l,seconds)=>{for(let i=0;i<seconds*4;i++)l.tick(.25);};
export function operateNight(l,{alternative=false,ending='stay'}={}){
 const n=l.night,c=l.chamber;
 if(!l.alive||l.arrival||c.busy)return;
 const act=k=>l.interact(k);
 if(c.cooperation<-.5){l.interact('deliver',{item:'soup'});return;}
 if(n.phase==='parcel'){act(alternative?'return-parcel':'open-parcel');return;}
 if(n.phase==='rain'){
  if(alternative){if(!n.boat.made)act('fold-boat');else if(!n.boat.launched)act('float-boat');else if(n.time-n.boat.launchedAt>32&&!n.drain)act('drain');}
  else if(!n.plant.planted)act('plant');else if(!c.lights)act('lights');else if(n.plant.growth>=.65)act('harvest');
  return;
 }
 if(n.phase==='phone'){
  if(alternative){if(!n.phone.ignored)act('hang-up');else act('feed-wall');}
  else if(!n.phone.answered)act('answer');else {while(c.channel!==n.phone.code[n.phone.index])act('tune');act('transmit');}
  return;
 }
 if(n.phase==='shadow'){
  if(alternative){if(n.shutter)act('shutter');act('bell');}
  else if(n.toy.until<=n.time)act('wind-mouse');else if(Math.hypot(n.shadow.x-n.toy.x,n.shadow.z-n.toy.z)<.8){if(c.lights)act('lights');}else if(!c.lights)act('lights');
  return;
 }
 if(n.phase==='inspection'){
  const dark=n.inspector.rule==='dark';if(c.lights===dark)act('lights');if(n.shutter!==dark)act('shutter');if(!n.inspector.submitted)act('submit-inspection');return;
 }
 if(n.phase==='eviction'){
  if(ending==='stay')act('refuse-eviction');
  else if(!c.coil)l.interact('deliver',{item:'coil'});else {if(c.lights)act('lights');while(c.channel!==c.carrier)act('tune');act('release');}
 }
}
export function shift(l,options={}){
 assert.ok(l.night,'a real shift exists');
 for(let i=0;i<10000&&!l.night.resolved&&l.alive;i++){operateNight(l,options);l.tick(.25);}
 assert.ok(l.night.resolved,'the shift is reachable through ordinary actions');return l.night.time;
}
