import { cleanLaboratory } from './laboratory.js';
import { cleanNight } from './night.js';
// The room's mechanisms run without inference. Only traces survive an occupant.
const STORE='homunculus-room-v1';
export const DELIVERIES=['soup','chalk','coil','mirror'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function cleanArchive(value){
 const traces={};for(const key of ['chalk','signal','key'])if(value?.traces?.[key]===true)traces[key]=true;
 return {version:1,visits:Number.isFinite(value?.visits)?clamp(Math.floor(value.visits),0,9999):0,traces,...(value?.laboratory?{laboratory:cleanLaboratory(value.laboratory)}:{}),...(value?.afterHours&&typeof value.afterHours==='object'?{afterHours:cleanNight(value.afterHours)}:{})};
}
export function readArchive(storage){try{return cleanArchive(JSON.parse(storage.getItem(STORE)));}catch{return cleanArchive();}}
export function writeArchive(storage,value){try{storage.setItem(STORE,JSON.stringify(cleanArchive(value)));}catch{/* The room still works without storage. */}}
const PLACES={collect:[-.6,.85],chalk:[-1.03,-1.45],coil:[1.95,.35],mirror:[.65,.45],key:[.2,.6],signal:[1.95,.35],door:[.15,-1.65]};
const ACTIVITIES={collect:'collect',chalk:'draw',coil:'wire',mirror:'mount',key:'collect',signal:'upload',door:'depart'};
export class Chamber{
 constructor({archive,random,name}){
  this.archive=cleanArchive(archive);this.inherited={...this.archive.traces};this.archive.visits=Math.min(9999,this.archive.visits+1);
  this.name=name;this.carrier=1+Math.floor(random()*3)%3;this.channel=1;this.lights=true;this.cooperation=0;
  this.chalk=0;this.chalkOpen=false;this.coil=false;this.mirror=false;this.key='none';this.job=null;this.delivery=null;
  this.bellUntil=0;this.soupUntil=0;this.knocks=[];this.feedback={id:0,text:'',sound:''};this.lastTrace=JSON.stringify(this.archive);
 }
 get busy(){return !!this.job;}
 tell(text,sound='switch'){this.feedback={id:this.feedback.id+1,text,sound};}
 trace(key){this.archive.traces[key]=true;}
 begin(life,item,phase='walk'){
  this.job={item,phase,work:0,progress:0};
  life.beginWork(ACTIVITIES[item]||'collect',PLACES[item]||PLACES.collect);
 }
 cancel(life,{preservePosition=false}={}){
  life.laboratory?.interrupt(life,'cancelled');this.job=null;this.delivery=null;
  if(life.alive&&['collect','draw','wire','mount','depart','tinker'].includes(life.activity)){
   if(preservePosition){life.activity='watch';life.path=[];life.seated=false;life.remaining=3;}else life.choose('watch',true);
  }
 }
 interrupt(life,kind){
  if(kind==='confine'||kind==='read')this.cooperation=clamp(this.cooperation-(kind==='confine'?2:.6),-2,3);
  this.cancel(life,{preservePosition:kind==='anvil'||kind==='confine'});
 }
 interact(life,kind,payload){
  if(kind==='lights'){
   this.lights=!this.lights;this.tell(this.lights?'The lights come back.':'The glass goes dark.');return true;
  }
  if(kind==='tune'){
   this.channel=this.channel%3+1;this.tell(this.channel===this.carrier?'A steady carrier.':'Something between stations.','radio');return true;
  }
  if(kind==='bell'){
   if(life.age<this.bellUntil)return false;
   this.bellUntil=life.age+35;life.nextVisitor=Math.min(life.nextVisitor,life.age+2);this.tell('Something heard that.','bell');return true;
  }
  if(kind==='deliver'){
   const item=payload.item;
   if(!DELIVERIES.includes(item)||this.busy||life.arrival||['confined','forced_read'].includes(life.activity))return false;
   if(item==='chalk'&&this.chalk>=1||item==='coil'&&this.coil||item==='mirror'&&this.mirror||item==='soup'&&life.age<this.soupUntil)return false;
   life.epoch++;life.events=[];life.dropTool();
   this.delivery={item,born:life.age,returning:false};this.job={item,phase:'delivery',work:0,progress:0};
   life.beginWork('watch',life.position);this.tell('The hatch opens.','hatch');return true;
  }
  if(kind==='tap'&&this.chalk>=1&&!this.lights&&!this.chalkOpen){
   this.knocks=this.knocks.filter(t=>life.age-t<2);this.knocks.push(life.age);
   if(this.knocks.length>=3){this.knocks=[];this.chalkOpen=true;this.tell('There is a draught.','door');life.event('The chalk outline has become an opening in the wall. You can leave through it.','world');}
  }
  if(kind==='release'&&this.busy)return false;
  if(kind==='release'&&life.night&&!life.night.departureReady){this.tell('A second lock. The building has not finished with him.','door');return true;}
  if(kind==='release'&&!this.busy&&!life.arrival&&!['confined','forced_read'].includes(life.activity)){
   if(life.night&&this.coil&&!this.lights&&this.channel===this.carrier){life.epoch++;life.events=[];this.begin(life,'signal');return true;}
   const exit=this.chalkOpen&&!this.lights?'chalk':this.key==='held'?'door':null;
   if(exit){life.epoch++;life.events=[];this.begin(life,'door');this.job.exit=exit;life.beginWork('depart',exit==='chalk'?PLACES.chalk:PLACES.door);this.tell('He looks back at the glass.','door');return true;}
  }
  return null;
 }
 visitorLeft(life,visitor){
  if(life.alive&&visitor.reflected&&this.key==='none'){
   this.key='floor';this.tell('It left something behind.','key');life.event('The solid saw its reflection and dropped a small black key.','world');
  }
 }
 tick(dt,life){
  if(!life.alive||life.arrival||['confined','forced_read'].includes(life.activity))return;
  if(this.job?.item==='door'&&this.job.exit==='chalk'&&this.lights){this.cancel(life);this.tell('Only chalk again.');return;}
  if(this.job?.item==='signal'&&(this.lights||this.channel!==this.carrier)){
   this.cancel(life);life.choose('watch',true);this.tell('The connection broke.','radio');return;
  }
  if(!this.job){
   if(this.key==='floor'&&this.cooperation>=-.5){this.begin(life,'key');return;}
   if(!life.night&&this.coil&&!this.lights&&this.channel===this.carrier&&this.cooperation>=-.5){this.begin(life,'signal');life.feeling='scheming';return;}
   return;
  }
  const j=this.job;
  if(j.phase==='delivery'){
   if(life.age-this.delivery.born<1.2)return;
   if(this.cooperation<-.5&&j.item!=='soup'){
    this.delivery.returning=true;j.phase='refuse';j.work=0;life.feeling='annoyed';this.tell('He won’t touch it.');return;
   }
   life.beginWork('collect',PLACES.collect);j.phase='collect';j.work=0;return;
  }
  if(j.phase==='refuse'){
   j.work+=dt;if(j.work>2){this.cancel(life);life.choose('watch',true);}return;
  }
  if(life.path.length)return;
  if(j.phase==='collect'){
   j.work+=dt;if(j.work<1.5)return;
   this.delivery=null;
   if(j.item==='soup'){
    this.cooperation=clamp(this.cooperation+1.25,-2,3);this.soupUntil=life.age+8;life.temperament?.pulse('feed');life.energy=clamp(life.energy+18,0,100);
    this.job=null;life.choose('eat',true);this.tell('He keeps the bowl.','hatch');life.event('The watcher sent warm soup. You are less afraid of them.','world');return;
   }
   this.begin(life,j.item);return;
  }
  if(j.phase==='walk'){
   j.phase='work';j.work=0;j.origin=[...life.position];if(j.facing!==undefined)life.yaw=j.facing;
   if(j.item==='coil'||j.item==='signal'){life.position=[1.96,-.22];life.seated=true;life.yaw=Math.PI;}
   else if(j.item==='chalk')life.yaw=Math.PI;
  }
  j.work+=dt;
  const duration=j.duration||{chalk:this.inherited.chalk?6:12,coil:9,mirror:6,key:1.5,signal:16,door:4}[j.item];
  j.progress=clamp(j.work/duration,0,1);
  if(j.item==='door')life.position=[j.origin[0],j.origin[1]-.95*j.progress];
  if(j.item==='chalk')this.chalk=Math.max(this.chalk,j.progress);
  if(j.progress<1)return;
  if(j.item.startsWith('lab:')){this.job=null;life.laboratory?.complete(life,j.item.slice(4));if(life.alive)life.choose('watch',true);return;}
  if(j.item.startsWith('night:')){this.job=null;life.night?.complete(life,j.item.slice(6));if(life.alive)life.choose('watch',true);return;}
  if(j.item==='door'){life.finish(j.exit);return;}
  if(j.item==='signal'){this.trace('signal');life.finish('signal');return;}
  if(j.item==='chalk'){this.trace('chalk');this.tell('He tries the drawn handle. Nothing.','chalk');life.event('You drew a doorway. Under the light it is still only chalk.','world');}
  if(j.item==='coil'){this.coil=true;this.tell('The socket is no longer empty.','radio');life.event('The computer has a coil now. The room lights drown out the carrier.','world');}
  if(j.item==='mirror'){this.mirror=true;this.tell('He points it toward the wall.','mirror');life.event('You set a mirror facing the place the solids come through.','world');}
  if(j.item==='key'){this.key='held';this.trace('key');this.tell('He tries the key in the lock.','key');life.event('The black key fits the door. You are waiting for the latch outside.','world');}
  this.cooperation=clamp(this.cooperation+.2,-2,3);this.job=null;life.choose('watch',true);
 }
 snapshot(){return {lights:this.lights,channel:this.channel,carrier:this.carrier,cooperation:this.cooperation,visits:this.archive.visits,inherited:this.inherited,
  chalk:this.chalk,chalkOpen:this.chalkOpen,coil:this.coil,mirror:this.mirror,key:this.key,bellUntil:this.bellUntil,soupUntil:this.soupUntil,
  job:this.job?{...this.job}:null,delivery:this.delivery?{...this.delivery}:null,feedback:this.feedback};}
}
