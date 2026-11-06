// A single reusable paper object. The resident's work stays on Chamber's executor.
export const PAPER_FOLD_POINT=[.7,.8];
const ACTIONS=['fold-plane','launch-plane','retrieve-plane'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const terminal=l=>!l?.alive||!!l.outcome;
const coerced=l=>['confined','forced_read'].includes(l.activity);
const floating=l=>(l.laboratory?.gravity?.lift||0)>.02;
const pendingAnvil=l=>l.anvils?.some(a=>!a.hit);
const scared=l=>l.startledUntil>l.age||l.startled>0||!!(l.visitor&&l.age>=l.visitor.born&&l.age-l.visitor.born<l.visitor.duration);
const free=l=>!terminal(l)&&!l.arrival&&!coerced(l)&&!floating(l)&&!pendingAnvil(l)&&!scared(l)&&!l.chamber.busy;
const sample=random=>{const value=typeof random==='function'?random():.5;return Number.isFinite(value)?clamp(value,0,.999999):.5;};
export class PaperPlay{
 constructor({random=Math.random}={}){
  this.random=random;this.seed=sample(random);this.time=0;this.ended=false;this.pending=null;
  this.state='absent';this.carried=false;this.position=[PAPER_FOLD_POINT[0],.055,PAPER_FOLD_POINT[1]];this.velocity=[0,0,0];
  this.wetness=0;this.launches=0;this.drawing=false;this.flight=0;this.variant='ordinary';this.returned=false;this.looped=false;this.fade=0;
  this.landedAt=0;this.retrieveAt=Infinity;this.returnSeen=false;this.throwUntil=0;
 }
 tell(l,text,sound='paper'){l.chamber.tell(text,sound);}
 carryPosition(l){
  const yaw=Number.isFinite(l.yaw)?l.yaw:0,side=l.species==='human'?-.28:.23,forward=.15;
  this.position[0]=clamp(l.position[0]+Math.cos(yaw)*side+Math.sin(yaw)*forward,-2.7,2.7);
  this.position[1]=l.species==='human'?.85:l.species==='worm'?.36:.55;
  this.position[2]=clamp(l.position[1]-Math.sin(yaw)*side+Math.cos(yaw)*forward,-1.8,1.8);
 }
 workAllowed(l,quiet=false){
  if(this.ended||!free(l)||this.pending)return false;
  if(l.chamber.cooperation<-.5){if(!quiet)this.tell(l,'He leaves the paper alone. Warm soup might help.');return false;}
  return true;
 }
 startJob(l,kind,quiet=false){
  if(!this.workAllowed(l,quiet))return false;
  l.epoch++;l.events=[];this.pending={kind,epoch:l.epoch,previous:this.state};
  const point=kind==='retrieve-plane'||this.state==='soggy'?[this.position[0],this.position[2]]:PAPER_FOLD_POINT;
  if(kind==='fold-plane')this.state='folding';
  l.chamber.job={item:`play:${kind}`,phase:'walk',work:0,progress:0,duration:kind==='fold-plane'?7:4,facing:0};
  l.beginWork('tinker',point);return true;
 }
 interact(l,kind,payload={}){
  if(!ACTIONS.includes(kind))return null;
  if(terminal(l)||this.ended||!payload||typeof payload!=='object'||Array.isArray(payload))return false;
  if(kind==='fold-plane'){
   if(!['absent','soggy'].includes(this.state)||!this.startJob(l,kind))return false;
   this.tell(l,this.pending.previous==='soggy'?'He starts working the damp creases flat.':'A blank sheet arrives through the hatch.','hatch');return true;
  }
  if(kind==='retrieve-plane'){
   if(this.state!=='landed'||!this.startJob(l,kind))return false;
   this.tell(l,'He goes to fetch it.');return true;
  }
  if(this.state!=='ready'||!this.carried||!this.workAllowed(l))return false;
  this.state='flying';this.carried=false;this.flight=0;this.launches=Math.min(999,this.launches+1);this.returned=false;this.looped=false;this.fade=0;
  const choice=sample(this.random);this.variant=choice<.2?'wall-return':choice<.4?'loop':'ordinary';
  this.position[0]=clamp(l.position[0],-2.6,2.6);this.position[1]=.95;this.position[2]=clamp(l.position[1],-1.6,1.65);
  // Start diagonally so the fixed front view can see it emerge beside his body.
  this.velocity[0]=.55+(this.seed-.5)*.45;this.velocity[1]=.38;this.velocity[2]=-1.25;this.throwUntil=this.time+.65;
  this.tell(l,'He sends the paper across the room.','wind');
  if(this.launches>=3&&!this.drawing){
   this.drawing=true;l.event('There is a new little drawing on the paper plane: the observation window, with an eye where you should be.','world');
   l.temperament?.pulse('discovery');this.tell(l,'There is a little drawing on the wing now.');
  }
  return true;
 }
 land(){
  this.state=this.wetness>=.7?'soggy':'landed';this.carried=false;this.position[1]=.055;this.velocity.fill(0);this.fade=0;
  this.landedAt=this.time;this.retrieveAt=this.time+7+this.seed*5;
 }
 tick(dt,l){
  if(!Number.isFinite(dt)||dt<=0)return;
  if(this.ended||terminal(l)){
   this.ended=true;this.interrupt(l,'ended');
   if(this.state==='flying')this.land();else this.position[1]=.055;
   this.velocity.fill(0);this.fade=0;if(l.attention?.kind==='paper-plane')l.attention=null;return;
  }
  dt=Math.min(dt,.25);this.time+=dt;
  if(this.pending&&(this.pending.epoch!==l.epoch||coerced(l)||l.chamber.job?.item!==`play:${this.pending.kind}`))this.interrupt(l,'cancelled');
  if(this.state==='absent'||this.state==='folding')return;
  const lab=l.laboratory,gravity=clamp(lab?.gravity?.lift||0,0,1),mist=!!lab?.mist?.on;
  this.wetness=clamp(this.wetness+dt*(mist?.095:-.012),0,1);
  if(this.carried){
   this.carryPosition(l);
   if(!free(l)||l.hasHammer||l.seated||this.wetness>=.7)this.land();
  }
  if(this.state==='flying'){
   this.flight=Math.min(120,this.flight+dt);this.fade=Math.max(0,this.fade-dt);
   const vx=Number.isFinite(lab?.draft?.x)?clamp(lab.draft.x,-.35,.35):0,vz=Number.isFinite(lab?.draft?.z)?clamp(lab.draft.z,-.35,.35):0;
   this.velocity[0]=clamp(this.velocity[0]+dt*(vx*1.7-this.velocity[0]*.12),-1.8,1.8);
   this.velocity[2]=clamp(this.velocity[2]+dt*(vz*1.7-this.velocity[2]*.09),-1.8,1.8);
   this.velocity[1]=gravity>.02?clamp((1.3+gravity-this.position[1])*.8,-.5,.65):Math.max(-.7,this.velocity[1]-dt*(.23+this.wetness*.32));
   for(let i=0;i<3;i++)this.position[i]+=this.velocity[i]*dt;
   if(this.position[0]<-2.7||this.position[0]>2.7){this.position[0]=clamp(this.position[0],-2.7,2.7);this.velocity[0]*=-.8;}
   if(this.position[2]<-1.8||this.position[2]>1.8){
    if(this.variant==='wall-return'&&!this.returned){
     this.position[2]=this.position[2]<0?1.76:-1.76;this.velocity[2]=this.position[2]>0?-.9:.9;this.position[0]*=-1;this.velocity[1]=.24;this.fade=.55;this.returned=true;
     this.tell(l,'It comes back through the wrong wall.','shadow');
     if(!this.returnSeen){this.returnSeen=true;l.event('Your paper plane passed into one wall and came out of the opposite wall. The walls did not open.','world');l.temperament?.pulse('discovery');}
    }else{this.position[2]=clamp(this.position[2],-1.8,1.8);this.velocity[2]*=-.75;}
   }
   if(this.variant==='loop'&&!this.looped&&this.flight>=1.5){this.velocity[2]*=-1;this.velocity[1]=.5;this.looped=true;}
   this.position[1]=clamp(this.position[1],.055,2.7);
   if(!gravity&&(this.position[1]<=.055||this.flight>=22))this.land();
   if(this.state==='flying'&&!l.chamber.busy&&!coerced(l)&&!l.arrival&&!scared(l)&&(!l.attention||l.attention.kind==='paper-plane'||l.attention.until<=l.age)){
    if(l.attention?.kind!=='paper-plane')l.attention={kind:'paper-plane',position:[0,0,0],until:0};
    for(let i=0;i<3;i++)l.attention.position[i]=this.position[i];l.attention.until=l.age+.4;
   }
  }else{
   // Loose paper follows the gravity leak, but no resident work can start in midair.
   if(!this.carried)this.position[1]+=((.055+gravity*1.25)-this.position[1])*Math.min(1,dt*3);
   if(this.wetness>=.7&&this.state!=='soggy'&&!this.pending){this.state='soggy';this.tell(l,'The paper has gone soft. He could fold it again.','water');}
   if(this.state==='landed'&&this.time>=this.retrieveAt&&!l.hole&&this.workAllowed(l,true)){
    if(this.startJob(l,'retrieve-plane',true))this.tell(l,'He goes back for the paper.');
   }
  }
 }
 complete(l,kind){
  const p=this.pending;
  if(!p||p.kind!==kind||p.epoch!==l.epoch||terminal(l)||this.ended||coerced(l)||floating(l)||pendingAnvil(l))return false;
  if(!['fold-plane','retrieve-plane'].includes(kind))return false;
  this.pending=null;this.state='ready';this.carried=true;this.carryPosition(l);this.velocity.fill(0);this.retrieveAt=Infinity;
  if(kind==='fold-plane')this.wetness=0;
  this.tell(l,kind==='fold-plane'?'A paper plane. Try a little wind.':this.drawing?'He smooths the wing. The drawing is still there.':'He smooths the wing and keeps it.');
  l.temperament?.pulse('soothe');return true;
 }
 interrupt(l,reason){
  if(this.carried){this.carryPosition(l);this.land();}
  if(this.pending){if(this.state==='folding')this.state=this.pending.previous;this.pending=null;}
  if(l.attention?.kind==='paper-plane'&&['ended','departed'].includes(reason))l.attention=null;
 }
 cue(){
  if(this.ended)return '';
  if(this.state==='flying')return this.returned?'Your paper plane came through the wrong wall.':'A paper plane is flying around your room.';
  if(this.drawing&&this.state!=='absent')return 'Your paper plane has a little drawing of the observation window and a watching eye.';
  if(this.state==='soggy')return 'Your paper plane is wet. The creases have come apart.';
  return '';
 }
 snapshot(){return {time:this.time,ended:this.ended,state:this.state,carried:this.carried,position:[...this.position],velocity:[...this.velocity],wetness:this.wetness,launches:this.launches,drawing:this.drawing,flight:this.flight,variant:this.variant,returned:this.returned,looped:this.looped,fade:this.fade,throwUntil:this.throwUntil,work:this.pending?.kind||null};}
}
export function paperPlayAvailability(s){
 const p=s.paperPlay;if(!p)return {};
 const ready=!terminal(s)&&!s.arrival&&!coerced(s)&&!scared(s)&&!s.chamber?.job&&(s.laboratory?.gravity?.lift||0)<=.02&&s.chamber?.cooperation>=-.5&&!pendingAnvil(s)&&!p.work;
 return {'fold-plane':[['absent','soggy','folding'].includes(p.state),ready&&['absent','soggy'].includes(p.state)],'launch-plane':[p.state==='ready'||p.state==='flying',ready&&p.state==='ready'&&p.carried],'retrieve-plane':[p.state==='landed',ready&&p.state==='landed']};
}
export function paperPlayClue(p){
 if(!p)return '';
 if(p.work==='retrieve-plane')return 'He is fetching the plane.';
 if(p.state==='folding')return 'He is folding a sheet of paper.';
 if(p.state==='absent')return 'Give him a sheet. See what the wind does to it.';
 if(p.state==='soggy')return 'Wet paper. Turn off the mist, then refold it.';
 if(p.state==='flying')return p.returned?'It came through the wrong wall.':'In flight. The fan can change its course.';
 if(p.drawing)return 'A little drawing has appeared on the wing.';
 return p.state==='ready'?'Ready to throw. Try changing the fan.':'On the floor. He may fetch it himself.';
}
