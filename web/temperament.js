const clamp = (value,min=0,max=100) => Math.max(min,Math.min(max,value));
const finite = (value,fallback=0) => Number.isFinite(value)?value:fallback;
const approach = (value,target,dt,seconds) => target+(value-target)*Math.exp(-dt/seconds);
// Impulses describe an experienced event; callers apply them only after it happens.
const IMPULSES={
  tap:[3,5,12],soothe:[-6,7,-10],feed:[-12,4,-16],
  confine:[58,-15,36],read:[9,-12,30],visitor:[25,4,8],
  mishap:[19,-4,18],discovery:[-2,25,-2],
};

export class Temperament {
  constructor(){this.fear=24;this.curiosity=32;this.irritation=14;this.ended=false;}
  pulse(kind,strength=1){
    const impulse=Object.hasOwn(IMPULSES,kind)?IMPULSES[kind]:null;
    if(this.ended||!impulse||!Number.isFinite(strength)||strength<=0)return false;
    const amount=clamp(strength,0,3);
    for(const [index,key] of ['fear','curiosity','irritation'].entries())this[key]=clamp(this[key]+impulse[index]*amount);
    return true;
  }
  tick(dt,life){
    if(life?.alive===false||life?.outcome)this.ended=true;
    if(this.ended||!life||!Number.isFinite(dt)||dt<=0)return;
    dt=Math.min(dt,1);
    const resting=life.activity==='rest',dark=life.chamber?.lights===false;
    let fear=resting?8:12,irritation=resting?4:8,curiosity=resting?18:28;
    if(dark){fear+=9;curiosity+=8;}
    if(life.activity==='confined'){fear=88;irritation=62;curiosity=8;}
    else if(life.activity==='forced_read'){fear=30;irritation=70;curiosity=12;}
    else if(life.arrival){fear=66;curiosity=44;}
    else if(life.activity==='inspect'||life.activity==='read')curiosity=46;
    const stimuli=life.laboratory?.stimuli;
    if(stimuli){fear+=finite(stimuli.alarm)*60;irritation+=finite(stimuli.alarm)*35;curiosity+=finite(stimuli.curiosity)*35;fear-=finite(stimuli.comfort)*8;}
    const visitor=life.visitor;
    if(visitor?.position&&life.position){
      const distance=Math.hypot(visitor.position[0]-life.position[0],visitor.position[2]-life.position[1]);
      if(Number.isFinite(distance)&&distance<2.6){
        const reflected=visitor.reflected||life.chamber?.mirror;
        fear=Math.max(fear,reflected?22:visitor.aggressive?86:65);
        curiosity=Math.max(curiosity,reflected?68:42);
      }
    }
    if(life.startledUntil>life.age)fear=Math.max(fear,88);
    if(life.anvils?.some(anvil=>!anvil.hit))fear=96;
    this.fear=clamp(approach(this.fear,fear,dt,fear>this.fear?4:resting?20:36));
    this.curiosity=clamp(approach(this.curiosity,curiosity,dt,24));
    this.irritation=clamp(approach(this.irritation,irritation,dt,irritation>this.irritation?6:resting?24:48));
  }
  snapshot(life){
    return {
      fear:clamp(finite(this.fear)),curiosity:clamp(finite(this.curiosity)),irritation:clamp(finite(this.irritation)),
      trust:clamp((finite(life?.chamber?.cooperation)+2)*20),energy:clamp(finite(life?.energy)),
    };
  }
}
