// Deterministic observer apparatus. Rendering and language generation are consumers.
export const SCRAPS=['paper','wire','cloth'];
const REMNANTS=['cradle','heart','shed'];
export const LAB_PADS=[[-.65,.85],[.6,.6],[.15,-1.55]];
export const NEST_POSITION=[-.75,.65];
const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,v));
const FIXTURES=['draft-turn','draft-power','mist','resonance-tone','resonance-power','resonance-aim'];
const ACTIONS=[...FIXTURES,'deliver-scrap','keep-heart','release-heart'];
const FLOW=[[1,0],[0,1],[-1,0],[0,-1]];
const coerced=life=>['confined','forced_read'].includes(life.activity);
const terminal=life=>!life?.alive||!!life.outcome;
export function cleanLaboratory(value){return {remnants:REMNANTS.filter(key=>Array.isArray(value?.remnants)&&value.remnants.includes(key))};}
export class Laboratory {
  constructor({random=Math.random,morphology='human',archive={}}={}) {
    this.morphology=['human','slug','worm','mass'].includes(morphology)?morphology:'human';
    this.record=cleanLaboratory(archive?.laboratory);if(archive&&typeof archive==='object')archive.laboratory=this.record;
    const seed=typeof random==='function'?random():0;this.seed=Number.isFinite(seed)?clamp(seed)*Math.PI*2:0;
    this.time=0;this.ended=false;this.pending=null;
    this.draft={direction:0,power:0,x:0,z:0};
    this.mist={on:false,humidity:.2};
    this.resonance={tone:1,power:0,pad:0,affinity:({human:2,slug:1,worm:2,mass:3})[this.morphology],charge:0};
    this.gravity={lift:0,active:false};this.glass={present:false,pressure:0};
    this.nest={scraps:[],offering:null,progress:0,heart:'dormant',pulse:0};
    this.reaction={morphology:this.morphology,curl:0,stretch:0,spread:0,tremble:0,attraction:0};
    this.stimuli={comfort:0,alarm:0,curiosity:0};
    this.gravityCoolingUntil=0;this.warned=false;this.glassTime=0;this.glassLatched=false;
  }
  get suspended(){return this.gravity.lift>.02;}
  tell(life,text,sound='switch'){life.chamber.tell(text,sound);}
  notice(life,text,pulse){
    life.event(text,'world');if(pulse)life.temperament?.pulse(pulse);
  }
  keep(remnant){if(!this.record.remnants.includes(remnant))this.record.remnants=REMNANTS.filter(key=>key===remnant||this.record.remnants.includes(key));}
  updateFlow(){
    const direction=FLOW[this.draft.direction],strength=[0,.12,.28][this.draft.power];
    this.draft.x=direction[0]*strength;this.draft.z=direction[1]*strength;
  }
  startJob(life,kind){
    if(this.ended||terminal(life)||this.suspended||this.pending||life.chamber.busy||life.arrival||coerced(life)||life.anvils?.some(a=>!a.hit))return false;
    if(life.chamber.cooperation<-.5){this.tell(life,'The scraps remain by the hatch. Something warm might help.');return false;}
    life.epoch++;life.events=[];
    this.pending={kind,epoch:life.epoch};
    life.chamber.job={item:`lab:${kind}`,phase:'walk',work:0,progress:0,duration:kind==='fit-wire'?12:kind==='fit-paper'?8:10,facing:0};
    life.beginWork('tinker',kind==='release-heart'?[-.55,.8]:NEST_POSITION);
    return true;
  }
  interact(life,kind,payload={}){
    if(!ACTIONS.includes(kind))return null;
    if(this.ended||terminal(life))return false;
    if(!payload||typeof payload!=='object'||Array.isArray(payload))return false;
    if(kind==='draft-turn'){
      if(payload.direction!==-1&&payload.direction!==1)return false;
      this.draft.direction=(this.draft.direction+payload.direction+4)%4;this.updateFlow();
      this.tell(life,'The fan turns on its little stand.','wind');return true;
    }
    if(kind==='draft-power'){
      this.draft.power=(this.draft.power+1)%3;this.updateFlow();
      this.tell(life,['The fan coasts to a stop.','A little draught crosses the floor.','The papers hold on to the floor.'][this.draft.power],'wind');return true;
    }
    if(kind==='mist'){
      this.mist.on=!this.mist.on;this.tell(life,this.mist.on?'The pipe breathes a fine mist.':'The pipe stops breathing.','water');return true;
    }
    if(kind==='resonance-tone'){
      if(!Number.isInteger(payload.tone)||payload.tone<1||payload.tone>3)return false;
      this.resonance.tone=payload.tone;this.tell(life,['A low note. The screws settle.','A note somewhere inside the walls.','The glass answers the high note.'][payload.tone-1],['bass','middle','treble'][payload.tone-1]);return true;
    }
    if(kind==='resonance-power'){
      this.resonance.power=(this.resonance.power+1)%3;
      this.tell(life,['The room finishes humming.','A gentle hum travels through the floor.','The screws start to complain.'][this.resonance.power],'radio');return true;
    }
    if(kind==='resonance-aim'){
      if(!Number.isInteger(payload.pad)||payload.pad<0||payload.pad>=LAB_PADS.length)return false;
      this.resonance.pad=payload.pad;this.tell(life,'The floor hum moves to another tile.','tone');return true;
    }
    if(kind==='deliver-scrap'){
      if(!SCRAPS.includes(payload.item)||this.nest.scraps.includes(payload.item)||this.nest.heart!=='dormant')return false;
      if(!this.startJob(life,`fit-${payload.item}`))return false;
      this.nest.offering={item:payload.item,born:this.time};this.tell(life,'A scrap arrives through the hatch.','hatch');return true;
    }
    if(this.nest.heart!=='awake')return false;
    if(kind==='release-heart'&&!life.night?.drain){this.tell(life,'The small thing is listening to the closed drain.','water');return false;}
    if(!this.startJob(life,kind))return false;
    this.tell(life,kind==='keep-heart'?'He begins making it a place.':'He carries it toward the drain.','paper');return true;
  }
  tick(dt,life){
    if(!Number.isFinite(dt)||dt<=0)return;
    if(this.ended||terminal(life)){
      this.ended=true;this.interrupt(life,'ended');this.gravity.lift=0;this.gravity.active=false;this.glass.present=false;this.glass.pressure=0;this.resonance.charge=0;
      this.reaction={morphology:this.morphology,curl:0,stretch:0,spread:0,tremble:0,attraction:0};this.stimuli={comfort:0,alarm:0,curiosity:0};return;
    }
    dt=Math.min(dt,.25);this.time+=dt;
    if(this.pending&&(this.pending.epoch!==life.epoch||coerced(life)||!life.chamber.job?.item.startsWith('lab:')))this.interrupt(life,'interrupted');
    this.mist.humidity=clamp(this.mist.humidity+dt*(this.mist.on?.035:-.012)-dt*this.draft.power*.004);
    const r=this.resonance,high=r.power===2&&r.tone!==1,oldLift=this.gravity.lift;
    const canCharge=high&&this.time>=this.gravityCoolingUntil&&!life.arrival;
    r.charge=clamp(r.charge+dt*(canCharge?1/8:-.45));
    if(canCharge&&r.charge>.15&&!this.warned){this.warned=true;this.tell(life,'The loose screws rise. Bass or power off will settle them.','radio');}
    const lifting=canCharge&&r.charge>=1;
    this.gravity.lift=clamp(this.gravity.lift+dt*(lifting?1/3:-1/3));this.gravity.active=this.gravity.lift>0;
    if(lifting&&oldLift===0){this.notice(life,'Gravity has leaked out of the room. You and the loose objects are rising.','mishap');this.tell(life,'The floor has let go. Bass, or power off.','radio');}
    if(oldLift>0&&this.gravity.lift===0){this.gravityCoolingUntil=this.time+12;this.warned=false;r.charge=0;this.notice(life,'Gravity has returned. Everything settles onto the same floor.','soothe');this.tell(life,'The room remembers which way is down.','switch');}
    if(!high&&r.charge===0)this.warned=false;
    const glassCondition=!life.arrival&&!coerced(life)&&!life.chamber.lights&&this.mist.on&&r.power===1&&r.tone===3;
    this.glassTime=glassCondition?Math.min(6,this.glassTime+dt):0;
    if(glassCondition&&this.glassTime>=6&&!this.glassLatched){
      this.glassLatched=true;this.notice(life,'An enormous eye presses against the outside of the observer glass. It is looking at you.','visitor');this.tell(life,'Something is breathing against your side of the glass. Light or bass.','shadow');
    }
    const oldPressure=this.glass.pressure;
    this.glass.pressure=clamp(this.glass.pressure+dt*(glassCondition&&this.glassLatched?.4:-.4));this.glass.present=this.glass.pressure>0;
    if(!glassCondition&&this.glass.pressure===0){
      this.glassLatched=false;if(oldPressure>0){this.notice(life,'The eye withdrew from the glass. You can see the observer again.','soothe');this.tell(life,'Only condensation remains on the glass.','water');}
    }
    const matching=r.power===1&&r.tone===r.affinity,position=LAB_PADS[r.pad];
    const nearNest=Math.hypot(position[0]-NEST_POSITION[0],position[1]-NEST_POSITION[1])<.7;
    const workingAllowed=!life.arrival&&!coerced(life)&&!this.suspended;
    if(this.nest.scraps.length===3&&this.nest.heart==='dormant'&&workingAllowed){
      this.nest.progress=clamp(this.nest.progress+dt*(matching&&nearNest?1/25:-1/40));
      if(this.nest.progress>=1){this.nest.heart='awake';this.notice(life,'The little nest has a heartbeat. There is a new small thing living inside it.','discovery');this.tell(life,'The scraps have made something. Keep it warm, or open the drain.','bloom');}
    }
    this.nest.pulse=['awake','kept'].includes(this.nest.heart)?(Math.sin(this.time*5+this.seed)+1)*.5:0;
    const alarm=clamp((r.power===2?.65:0)+this.gravity.lift*.5+this.glass.pressure*.7+this.draft.power*.06);
    const damp=this.mist.humidity,comfort=clamp(.35+(matching?.35:0)+(this.morphology==='slug'?damp*.3:.1)-alarm*.6);
    const curiosity=clamp((r.power===1?.45:0)+(matching?.35:0)+(this.nest.heart==='awake'?.2:0));
    this.stimuli={comfort,alarm,curiosity};
    this.reaction={morphology:this.morphology,curl:this.morphology==='worm'?clamp(alarm*.8+(matching?.25:.05)):this.morphology==='slug'?alarm*.6:0,
      stretch:this.morphology==='slug'?clamp(damp*.7+(matching?.25:0)):this.morphology==='worm'?(r.power===1?.55:.15):0,
      spread:this.morphology==='mass'?clamp(comfort*.7+(Math.sin(this.time*3+this.seed)+1)*.08):0,
      tremble:alarm,attraction:this.morphology==='worm'?(r.power===1?1:0):this.morphology==='slug'?(matching?damp:0):this.morphology==='mass'?(matching?.75:.1):(matching?.35:0)};
  }
  complete(life,kind){
    const pending=this.pending;
    if(!pending||pending.kind!==kind||pending.epoch!==life.epoch||this.ended||terminal(life)||coerced(life)||this.suspended)return false;
    this.pending=null;this.nest.offering=null;
    if(kind.startsWith('fit-')){
      const item=kind.slice(4);if(!SCRAPS.includes(item)||this.nest.scraps.includes(item))return false;
      this.nest.scraps.push(item);this.nest.scraps=SCRAPS.filter(scrap=>this.nest.scraps.includes(scrap));
      if(this.nest.scraps.length===3){this.keep('cradle');this.notice(life,'You have built a little cradle from the scraps. It seems to be waiting for the right sound.','discovery');this.tell(life,'A nest. Something in it almost answers the hum.','paper');}
      else this.tell(life,'He fits the scrap into a shape of his own.','paper');
      return true;
    }
    if(this.nest.heart!=='awake')return false;
    if(kind==='release-heart'){
      if(!life.night?.drain){this.tell(life,'The drain closed. He brings the little thing back.','water');return false;}
      this.nest.heart='released';this.nest.pulse=0;this.keep('shed');this.notice(life,'You let the small room-heart leave through the drain. It left a hollow shell behind.','discovery');this.tell(life,'Something small has gone somewhere larger.','water');return true;
    }
    if(kind==='keep-heart'){
      this.nest.heart='kept';this.keep('heart');this.notice(life,'You made the new room-heart a permanent place in your nest. You are not alone in here.','soothe');this.tell(life,'There are two heartbeats in the room now.','bloom');return true;
    }
    return false;
  }
  interrupt(life,reason){this.pending=null;this.nest.offering=null;}
  cue(){
    if(this.ended)return '';
    if(this.gravity.active)return 'Gravity has leaked. You and loose things are floating; bass settles the room.';
    if(this.glass.present)return 'An enormous eye is pressed against the observer glass.';
    if(this.nest.heart==='awake')return 'Something small is alive in the nest you built.';
    if(this.nest.heart==='kept')return 'You are sharing your nest with a small room-heart.';
    if(this.nest.heart==='released')return 'The room-heart left a hollow shell and went down the drain.';
    if(this.resonance.power)return `A ${['low','middle','high'][this.resonance.tone-1]} hum is moving through the floor.`;
    return '';
  }
  snapshot(){return {time:this.time,morphology:this.morphology,draft:{...this.draft},mist:{...this.mist},resonance:{...this.resonance,position:[...LAB_PADS[this.resonance.pad]]},gravity:{...this.gravity},glass:{...this.glass},nest:{...this.nest,scraps:[...this.nest.scraps],offering:this.nest.offering?{...this.nest.offering}:null,position:[...NEST_POSITION]},reaction:{...this.reaction},stimuli:{...this.stimuli},remnants:[...this.record.remnants]};}
}
export function laboratoryAvailability(snapshot){
  const l=snapshot.laboratory;if(!l)return {};
  const alive=!!snapshot.alive&&!snapshot.outcome,ready=alive&&!snapshot.arrival&&!snapshot.chamber?.job&&!coerced(snapshot)&&l.gravity.lift<=.02&&snapshot.chamber?.cooperation>=-.5;
  const result=Object.fromEntries(FIXTURES.map(kind=>[kind,[true,alive]]));
  result['deliver-scrap']=[l.nest.scraps.length<3,ready&&l.nest.scraps.length<3];
  result['keep-heart']=[l.nest.heart==='awake',ready&&l.nest.heart==='awake'];
  result['release-heart']=[l.nest.heart==='awake',ready&&l.nest.heart==='awake'&&!!snapshot.night?.drain];
  return result;
}
