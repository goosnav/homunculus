// After-hours story and tactile play. No renderer or inference owns these rules.
export const KEEPSAKES=['tooth','button','bloom','boat','spool','shell','jar','silhouette','stamp','eye','tenant','seal'];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function cleanNight(value){return {shifts:Number.isFinite(value?.shifts)?clamp(Math.floor(value.shifts),0,9999):0,keepsakes:KEEPSAKES.filter(k=>Array.isArray(value?.keepsakes)&&value.keepsakes.includes(k)),last:['stay','door','chalk','signal'].includes(value?.last)?value.last:''};}
function shuffled(list,random){const a=[...list];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1))%(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
const JOBS={
 'open-parcel':{point:[-.6,.85],duration:12},'return-parcel':{point:[-.6,.85],duration:10},
 plant:{point:[1,1.1],duration:8},water:{point:[1,1.1],duration:5},harvest:{point:[1,1.1],duration:7},
 'wind-mouse':{point:[.15,.6],duration:5},play:{point:[.15,.6],duration:5},
 'feed-wall':{point:[-1.3,-.75],duration:12},'fold-boat':{point:[-.6,.85],duration:8},'float-boat':{point:[-.55,.8],duration:5},
 answer:{point:[1.95,.35],duration:8},transmit:{point:[1.95,.35],duration:4},
 'catch-shadow':{point:[.1,.65],duration:10},'free-shadow':{point:[.1,.65],duration:9},
 'submit-inspection':{point:[.15,-1.65],duration:4},'inspection-pass':{point:[.15,-1.65],duration:8},'challenge':{point:[.65,.45],duration:18},
 'refuse-eviction':{point:[.15,-1.65],duration:22}
};
export class NightShift{
 constructor({random,archive}){
  this.random=random;archive.afterHours=cleanNight(archive.afterHours);this.record=archive.afterHours;this.inherited=[...this.record.keepsakes];
  this.order=['parcel',...shuffled(['rain','phone','shadow'],random),'inspection','eviction'];this.cursor=0;this.phase='quiet';this.time=0;this.nextAt=35;this.entered=0;this.resolved=false;this.leaving=false;this.history=[];
  this.variant=random()<.5?'warm':'cold';this.shutter=false;this.drain=false;this.water=0;this.parcel='sealed';
  this.plant={planted:false,moisture:0,growth:0,harvests:0};this.toy={until:0,x:0,z:.6,friends:0};this.nextPlay=0;
  this.neighbor={gifts:0,until:0,returnAt:0,reply:0};this.boat={made:false,launched:false,launchedAt:0};
  this.phone={answered:false,ignored:false,code:shuffled([1,2,3],random),index:0,tone:0,ringAt:0};
  this.shadow={x:-2.1,z:.5,caught:false,free:false};this.inspector={rule:random()<.5?'dark':'light',progress:0,verdict:'',submitted:false};
  this.stamp=0;this.lastCue='';this.approach=false;
 }
 get departureReady(){return this.phase==='eviction'||this.resolved;}
 tell(l,text,sound='switch'){l.chamber.tell(text,sound);}
 keep(key){if(!this.record.keepsakes.includes(key))this.record.keepsakes=KEEPSAKES.filter(k=>k===key||this.record.keepsakes.includes(k));}
 startJob(l,kind){
  if(l.chamber.busy||l.arrival||['confined','forced_read'].includes(l.activity))return false;
  if(l.chamber.cooperation<-.5){this.tell(l,'He turns away. Perhaps something warm first.');return false;}
  const spec=JOBS[kind];if(!spec)return false;
  l.epoch++;l.events=[];l.chamber.job={item:`night:${kind}`,phase:'walk',work:0,progress:0,duration:spec.duration};l.beginWork('tinker',spec.point);return true;
 }
 enter(l,phase){
  this.phase=phase;this.entered=this.time;this.approach=false;
  const cues={parcel:'An unrequested parcel has crawled out from under the bed.',rain:'A cloud has entered through the ceiling pipe. It is raining inside.',phone:'The telephone rings. Its label says this room has no occupant.',shadow:'Your shadow detached itself. It is climbing the wall.',inspection:'A mechanical eye is inspecting the room. Its card shows what it expects.',eviction:'The building has marked your occupied room VACANT. You can leave, or refuse.'};
  if(phase==='parcel')this.parcel='sealed';
  if(phase==='rain'){this.drain=false;this.boat.launched=false;this.plant.growth=Math.min(this.plant.growth,.45);}
  if(phase==='phone'){this.phone={...this.phone,answered:false,ignored:false,index:0,code:shuffled([1,2,3],this.random),ringAt:this.time};}
  if(phase==='shadow')this.shadow={x:-2.1,z:.5,caught:false,free:false};
  if(phase==='inspection')this.inspector={rule:this.random()<.5?'dark':'light',progress:0,verdict:'',submitted:false};
  this.tell(l,({parcel:'Something under the bed.',rain:'The ceiling is leaking weather.',phone:'The phone has your room number.',shadow:'He has one shadow too few.',inspection:'An inspection. It has brought a stamp.',eviction:'VACANT. He disagrees.'})[phase],phase==='phone'?'telephone':phase==='inspection'?'inspection':'hatch');
  l.event(cues[phase],'world');l.feeling=phase==='parcel'?'curious':'afraid';
 }
 resolve(l,choice,keepsake){
  this.keep(keepsake);this.history.push({case:this.phase,choice});this.history=this.history.slice(-8);
  this.phase='quiet';this.cursor++;this.nextAt=this.time+95+this.random()*20;this.approach=false;
  l.event(`The room kept a ${keepsake}. The building has not finished with you.`,'world');
 }
 settle(l,kind){
  if(this.resolved)return;
  this.resolved=true;this.record.shifts=Math.min(9999,this.record.shifts+1);this.record.last=kind;this.keep(kind==='stay'?'tenant':'seal');
  this.history.push({case:'eviction',choice:kind});this.history=this.history.slice(-8);this.phase='quiet';this.nextAt=this.time+120;this.cursor=0;
  if(kind==='stay'){this.tell(l,'He takes his number off the wall.','door');l.feeling='calm';l.event('You refused eviction. You live here now. The building will have to work around you.','world');}
 }
 interact(l,kind){
  const c=l.chamber;
  if(kind==='shutter'){this.shutter=!this.shutter;this.tell(l,this.shutter?'The shutter closes.':'The shutter opens.','shutter');return true;}
  if(kind==='drain'){this.drain=!this.drain;this.tell(l,this.drain?'Something drinks beneath the drain.':'The drain shuts.','water');return true;}
  if(kind==='hang-up'&&this.phase==='phone'){
   if(c.busy)return false;this.phone.ignored=true;this.phone.answered=false;this.tell(l,'A knock answers from inside the wall.','knock');return true;
  }
  if(kind==='bell'&&this.phase==='shadow'&&!this.shutter)return this.startJob(l,'free-shadow');
  if(kind==='bell'&&this.phase==='inspection'&&c.mirror)return this.startJob(l,'challenge');
  if(!(kind in JOBS)||['play','catch-shadow','free-shadow','inspection-pass','challenge'].includes(kind))return null;
  if(kind==='plant'&&this.plant.planted)return false;
  if(kind==='water'&&(!this.plant.planted||this.plant.moisture>=1.3))return false;
  if(kind==='harvest'&&(!this.plant.planted||this.plant.growth<.65))return false;
  if(kind==='wind-mouse'&&this.toy.until-this.time>45)return false;
  if(kind==='feed-wall'&&(this.neighbor.returnAt||this.time<this.neighbor.until&&!(this.phase==='phone'&&this.phone.ignored)))return false;
  if(kind==='fold-boat'&&this.boat.made)return false;
  if(kind==='float-boat'&&(!this.boat.made||this.boat.launched||this.water<.12)){this.tell(l,'It needs somewhere to float.');return false;}
  if(['open-parcel','return-parcel'].includes(kind)&&this.phase!=='parcel')return false;
  if(['answer','transmit'].includes(kind)&&this.phase!=='phone')return false;
  if(kind==='answer'&&this.phone.answered)return false;
  if(kind==='transmit'&&!this.phone.answered)return false;
  if(kind==='submit-inspection'&&(this.phase!=='inspection'||this.inspector.submitted))return false;
  if(kind==='refuse-eviction'&&this.phase!=='eviction')return false;
  if(!this.startJob(l,kind))return false;
  if(kind==='transmit')this.phone.tone=c.channel;
  return true;
 }
 complete(l,kind){
  if(!l.alive)return;
  if(kind==='open-parcel'){this.parcel='opened';this.resolve(l,'opened','tooth');this.tell(l,'A tooth. Far too large for the box.','parcel');}
  if(kind==='return-parcel'){this.parcel='returned';this.resolve(l,'returned','button');this.tell(l,'It came back smaller. With a button.','parcel');}
  if(kind==='plant'){this.plant.planted=true;this.plant.moisture=.4;this.tell(l,'He puts a seed in the cracked pot.','water');}
  if(kind==='water'){this.plant.moisture=clamp(this.plant.moisture+.7,0,1.5);this.water=clamp(this.water+.035,0,1);this.tell(l,'The leaves turn toward him.','water');}
  if(kind==='harvest'){this.plant.growth=.25;this.plant.harvests=Math.min(99,this.plant.harvests+1);this.keep('bloom');if(this.phase==='rain'){this.drain=true;this.resolve(l,'garden','bloom');}this.tell(l,'There is a small light inside the flower.','bloom');}
  if(kind==='wind-mouse'){this.toy.until=this.time+90;this.nextPlay=this.time+8;this.tell(l,'The little thing knows its way around.','wind');}
  if(kind==='play'){this.toy.friends=Math.min(5,this.toy.friends+1);l.feeling='curious';l.energy=clamp(l.energy+5,0,100);this.nextPlay=this.time+22;}
  if(kind==='feed-wall'){this.neighbor.returnAt=this.time+15;this.neighbor.until=this.time+85;this.tell(l,'The bowl slides back empty.','knock');}
  if(kind==='fold-boat'){this.boat.made=true;this.tell(l,'He makes a boat from the room inventory.','paper');}
  if(kind==='float-boat'){this.boat.launched=true;this.boat.launchedAt=this.time;this.tell(l,'The paper says FLOOR: DRY.','water');}
  if(kind==='answer'){this.phone.answered=true;this.phone.ignored=false;this.tell(l,'Three lamps. Three stations. Send the tones in order.','telephone');}
  if(kind==='transmit'){
   if(this.phone.tone===this.phone.code[this.phone.index]){this.phone.index++;this.tell(l,'The other end clicks.','tone');}
   else {this.phone.index=0;this.tell(l,'Wrong extension. The lamps repeat.','radio');}
   if(this.phone.index===3){this.resolve(l,'answered','spool');this.tell(l,'A recording of someone moving your furniture.','telephone');}
  }
  if(kind==='catch-shadow'){this.shadow.caught=true;this.resolve(l,'caught','jar');this.tell(l,'The jar is heavier with the lid off.','shadow');}
  if(kind==='free-shadow'){this.shadow.free=true;this.resolve(l,'released','silhouette');this.tell(l,'It leaves without him. His shadow grows back.','shadow');}
  if(kind==='submit-inspection'){this.inspector.submitted=true;this.tell(l,'The eye starts counting.','inspection');}
  if(kind==='inspection-pass'){this.inspector.verdict='approved';this.stamp=this.time;this.resolve(l,'complied','stamp');this.tell(l,'APPROVED FOR DEMOLITION.','inspection');}
  if(kind==='challenge'){this.inspector.verdict='reflected';this.stamp=this.time;this.resolve(l,'challenged','eye');this.tell(l,'It inspects itself. Then hurriedly leaves.','inspection');}
  if(kind==='refuse-eviction')this.settle(l,'stay');
 }
 tick(dt,l){
  if(!l.alive||l.arrival||['confined','forced_read'].includes(l.activity))return;
  this.time+=dt;const c=l.chamber,p=this.plant;
  const raining=this.phase==='rain';
  this.water=clamp(this.water+dt*(raining&&!this.drain?.012:this.drain?-.024:-.0005),0,1);
  if(p.planted){p.moisture=clamp(p.moisture+dt*(raining?.014:-.0025),0,1.5);if(p.moisture>.08&&c.lights)p.growth=clamp(p.growth+dt*.008,0,1);}
  if(this.toy.until>this.time){this.toy.x=Math.sin(this.time*.55)*.85;this.toy.z=.55+Math.cos(this.time*.43)*.35;}
  if(this.neighbor.returnAt&&this.time>=this.neighbor.returnAt){
   this.neighbor.returnAt=0;this.neighbor.gifts=Math.min(99,this.neighbor.gifts+1);this.neighbor.reply=this.time;this.keep('button');this.tell(l,'Three knocks. Then a button rolls out.','knock');
   if(this.phase==='phone'&&this.phone.ignored){this.resolve(l,'neighbor','shell');this.tell(l,'The neighbor takes the call. A shell is pushed through.','telephone');}
  }
  if(this.phase==='quiet'&&this.time>=this.nextAt){
   const phase=this.resolved?['parcel','rain','phone','shadow','inspection'][this.cursor%5]:this.order[this.cursor];if(phase)this.enter(l,phase);
  }else if(this.phase==='quiet'&&!this.approach&&this.time>this.nextAt-20){this.approach=true;this.tell(l,'The pipes are moving again.','pipe');}
  if(this.phase==='rain'&&this.boat.launched&&this.time-this.boat.launchedAt>=30&&this.drain&&this.water<.08){this.resolve(l,'boat','boat');this.tell(l,'The boat disappears into a drain smaller than itself.','water');}
  if(this.phase==='phone'&&!this.phone.answered&&!this.phone.ignored&&this.time>=this.phone.ringAt){this.phone.ringAt=this.time+12;this.tell(l,'It keeps ringing.','telephone');}
  if(this.phase==='shadow'){
   if(this.toy.until>this.time&&c.lights){this.shadow.x+=(this.toy.x-this.shadow.x)*Math.min(1,dt*.8);this.shadow.z+=(this.toy.z-this.shadow.z)*Math.min(1,dt*.8);}
   if(!c.busy&&!c.lights&&this.toy.until>this.time&&Math.hypot(this.shadow.x-this.toy.x,this.shadow.z-this.toy.z)<.8)this.startJob(l,'catch-shadow');
  }
  if(this.phase==='inspection'&&this.inspector.submitted){
   const match=this.inspector.rule==='dark'?!c.lights&&this.shutter:c.lights&&!this.shutter;
   this.inspector.progress=clamp(this.inspector.progress+dt*(match?1:-.3),0,35);
   if(this.inspector.progress>=35&&!c.busy)this.startJob(l,'inspection-pass');
  }
  if(this.phase==='quiet'&&!c.busy&&this.toy.until>this.time&&this.time>=this.nextPlay){this.startJob(l,'play');this.nextPlay=this.time+25;}
 }
 cue(){return ({quiet:this.resolved?'You refused to leave. This is your home now.':'The building is slowly waking up around you.',parcel:'An unsolicited box under the bed has legs.',rain:'A cloud is raining into your room.',phone:'A telephone insists this room is vacant.',shadow:'Your detached shadow is following a little wind-up mouse.',inspection:'A mechanical eye is checking whether your room is occupied.',eviction:'The building wants this room empty. You can leave or refuse.'})[this.phase];}
 snapshot(){return {time:this.time,phase:this.phase,entered:this.entered,approach:this.approach,resolved:this.resolved,departureReady:this.departureReady,variant:this.variant,shutter:this.shutter,drain:this.drain,water:this.water,parcel:this.parcel,plant:{...this.plant},toy:{...this.toy},neighbor:{...this.neighbor},boat:{...this.boat},phone:{...this.phone,code:[...this.phone.code]},shadow:{...this.shadow},inspector:{...this.inspector},stamp:this.stamp,inherited:this.inherited,keepsakes:[...this.record.keepsakes]};}
}

// Short, actionable clues live in the optional physical-controls drawer.
export function nightClue(n){
 if(!n)return '';
 return ({quiet:n.resolved?'He lives here now. The building is still taking an interest.':'The room has plumbing, a telephone, and someone behind the wall.',parcel:'The parcel is walking. Open it, or send it back.',rain:n.boat.launched?'Let the boat sail, then open the drain.':'Grow something under the rain and light, or fold a boat and find it a drain.',phone:n.phone.ignored?'The wall answered. Perhaps send its occupant a meal.':n.phone.answered?`The lamps read ${n.phone.code.join(' · ')}. Tune and send each tone in that order.`:'Pick up the receiver, or hang up and let someone else answer.',shadow:'It is watching the mouse. Darkness will hold it still. An open shutter and the bell might let it out.',inspection:n.inspector.rule==='dark'?'The inspection card shows a closed shutter and an unlit bulb. Or show it its own reflection.':'The inspection card shows an open shutter and a lit bulb. Or show it its own reflection.',eviction:'They marked the room VACANT. Prepare a way out, or refuse to surrender it.'})[n.phase];
}
