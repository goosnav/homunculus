// The resident's body is deterministic and independent of model latency.
// Only the browser worker supplies words. No saved life can be restored.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const OBSTACLES=[[-2.95,-1.65,-.8,1.35],[1.25,2.95,-1.95,-.65],[-2.9,-1.9,-1.95,-1.1],[1.5,2.4,-.65,.1]];
export const ACTIONS=['hammer','escape','upload','rest','read','eat','pace','watch','inspect','knock'];
const FEELINGS=['sad','annoyed','afraid','scheming','curious','hopeful','calm'];
const PLACES={hammer:[-3.0,-.95],escape:[.4,-1.65],upload:[1.95,.35],rest:[-1.5,1.25],read:[1.95,.35],eat:[-1,-1.5],pace:[-.5,.5],watch:[0,1.2],inspect:[1,-1.25],knock:[.4,1.25]};
const FACING={hammer:-Math.PI/2,escape:Math.PI,upload:Math.PI,read:Math.PI,rest:0,eat:0,watch:0,knock:0,inspect:Math.PI/2};
const DESCRIPTIONS={hammer:'working on the wall',escape:'trying the handle',upload:'copying himself',rest:'lying down',read:'reading',eat:'eating',pace:'pacing',watch:'watching the glass',inspect:'looking for a way out',knock:'knocking',confined:'somewhere else',forced_read:'being made to read',dead:'not moving'};
const FIXATIONS=['counting the screws in the ceiling','remembering the smell of the sea','suspecting that the clock is lying','getting his old shoes back','finding out who fills the bowl','refusing to forget his own name'];
export function walkable(x,z){return Number.isFinite(x)&&Number.isFinite(z)&&x>=-2.8&&x<=2.8&&z>=-1.9&&z<=1.3&&!OBSTACLES.some(([a,b,c,d])=>x>=a&&x<=b&&z>=c&&z<=d);}
const NODES=[];
for(let x=-11;x<=11;x++)for(let z=-7;z<=5;z++)if(walkable(x/4,z/4))NODES.push([x/4,z/4]);
const key=p=>p.join(','),NODE_MAP=new Map(NODES.map(p=>[key(p),p]));
export function nearest(x,z){if(!Number.isFinite(x)||!Number.isFinite(z))return [0,.75];return [...NODES.reduce((a,b)=>Math.hypot(a[0]-x,a[1]-z)<Math.hypot(b[0]-x,b[1]-z)?a:b)];}
export function route(start,end){
  const origin=nearest(...start),goal=nearest(...end),queue=[origin],seen=new Map([[key(origin),null]]);
  for(let i=0;i<queue.length;i++){
    const p=queue[i];if(key(p)===key(goal))break;
    for(const [dx,dz]of [[.25,0],[-.25,0],[0,.25],[0,-.25]]){
      const q=[p[0]+dx,p[1]+dz],k=key(q);if(NODE_MAP.has(k)&&!seen.has(k)){seen.set(k,p);queue.push(q);}
    }
  }
  const path=[goal];while(seen.get(key(path[0])))path.unshift(seen.get(key(path[0])));
  return path;
}
export function shortLine(raw){
  if(typeof raw!=='string'||/as an (ai|assistant)|how can i help|happy to help|language model/i.test(raw))return '';
  const clean=raw.replace(/<[^>]*>/g,'').replace(/[*#`]/g,'').replace(/\s+/g,' ').replace(/^['"]|['"]$/g,'').trim();
  const sentences=clean.match(/[^.!?]+[.!?]?/g)||[];
  const words=sentences.slice(0,2).join('').trim().split(/\s+/).filter(Boolean);
  return words.length>14?words.slice(0,14).join(' ').replace(/[,;:]$/,'')+'…':words.join(' ');
}
export function parseThought(raw){
  try{
    const text=String(raw),start=text.indexOf('{'),end=text.lastIndexOf('}');
    const value=JSON.parse(text.slice(start,end+1));
    if(!value||!ACTIONS.includes(value.action))return null;
    return {action:value.action,feeling:FEELINGS.includes(value.feeling)?value.feeling:'sad',say:shortLine(value.say)};
  }catch{return null;}
}
export class Life{
  constructor({random=Math.random,name}={}){
    this.random=random;this.name=name||['Hugh','Clive','Gordon','Morris','Sid','Edgar','Vern','Basil','Cecil','Ned'][Math.floor(random()*10)%10];
    this.alive=true;this.age=0;this.epoch=0;this.position=[0,.75];this.yaw=0;this.feeling='sad';this.activity='watch';this.path=[];this.remaining=4;this.seated=false;
    this.energy=85;this.wallDamage=0;this.uploadProgress=0;this.doorAttempts=0;this.imaginedYears=0;this.anvils=[];this.nextAnvil=0;
    this.events=[];this.dialogue=[];this.memories=[];this.journal=[];this.secrets=new Set();this.utterance={id:0,text:''};this.nextDecision=4;this.deadAt=null;this.lockUntil=0;
    this.preferred=['hammer','escape','upload'][Math.floor(random()*3)%3];this.fixation=FIXATIONS[Math.floor(random()*FIXATIONS.length)%FIXATIONS.length];
    this.hasHammer=false;this.toolPosition=[.75,-.75];this.workElapsed=0;this.hammerStrikes=0;this.pickupTime=0;this.tapTimes=[];
    this.effects={answerUntil:0,doorUntil:0,bowlUntil:0,clockUntil:0,copy:false};this.nextOddity=180+random()*180;
    this.position=nearest((random()-.5)*2.1,.35+random()*.85);
    this.arrival={height:5+random()*1.5,spin:(random()-.5)*1.5,duration:3.5};
    this.arrival.impact=Math.sqrt(2*this.arrival.height/18);
    this.hole=null;this.visitor=null;this.visitorSerial=0;this.nextVisitor=180+random()*240;this.startledUntil=0;
  }
  remember(text){this.memories.push(text);this.memories=this.memories.slice(-8);}
  note(id,title,text){if(this.secrets.has(id))return;this.secrets.add(id);this.journal.push({title,text});this.journal=this.journal.slice(-24);}
  event(text,kind='event'){
    this.events.push({kind,text,epoch:this.epoch});this.events=this.events.slice(-4);
    this.remember(text.slice(0,600));
  }
  takeEvent(){return this.events.shift()||null;}
  discover(id,title,text,effect,duration=0){
    if(this.secrets.has(id))return;
    this.note(id,title,text);if(effect)this.effects[effect]=duration?this.age+duration:true;
    // This is an observed event for the model, not a scripted line of dialogue.
    this.event(text,'world');
  }
  dropTool(){if(this.hasHammer){this.toolPosition=nearest(...this.position);this.hasHammer=false;}}
  get stage(){
    if(this.activity==='hammer'&&!this.hasHammer)return this.path.length?'fetch':'pickup';
    if(this.path.length)return 'travel';
    const t=this.workElapsed;
    if(this.activity==='hammer')return t%7<4.8?'strike':'inspect';
    if(this.activity==='escape')return t%12<3?'handle':t%12<6?'push':t%12<8?'kick':'listen';
    if(this.activity==='upload')return t<3?'connect':t<7?'type':'transfer';
    return this.activity;
  }
  retryEvent(event){
    if(!event||!this.alive||event.epoch!==this.epoch)return false;
    const attempts=(event.attempts||0)+1;
    if(attempts>2){
      if(event.kind==='read'&&this.activity==='forced_read')this.choose('pace');
      return false;
    }
    this.events.unshift({...event,attempts});this.events=this.events.slice(0,4);return true;
  }
  choose(action,restart=false){
    if(!this.alive||!ACTIONS.includes(action))return false;
    if(this.activity===action&&!restart)return true;
    if(action!=='hammer')this.dropTool();
    this.seated=false;this.position=nearest(...this.position);this.activity=action;
    this.workElapsed=0;this.pickupTime=0;
    const destination=action==='hammer'&&!this.hasHammer?this.toolPosition:action==='pace'?[this.random()*2-1,this.random()*2-.8]:PLACES[action];
    this.path=route(this.position,destination);this.remaining=action==='rest'?22:18+this.random()*14;
    return true;
  }
  updateVisitor(){
    if(!this.visitor&&this.alive&&this.age>=this.nextVisitor){
      this.visitor={id:++this.visitorSerial,kind:Math.floor(this.random()*5)%5,born:this.age,duration:16+this.random()*6,direction:this.random()<.5?1:-1,aggressive:this.random()<.3,target:[...this.position],hit:false,position:[-5,1.6,0]};
      this.nextVisitor=this.age+240+this.random()*300;
      this.event('A huge pink and black solid is passing through the wall. It should not be here. You are frightened.','world');
    }
    const v=this.visitor;if(!v)return false;
    const p=(this.age-v.born)/v.duration;
    if(p>=1){this.visitor=null;return false;}
    const feint=v.aggressive?Math.max(0,1-Math.abs(p-.54)/.15):0;
    const x=v.direction*(-4.8+p*9.6),z=-.45+Math.sin(p*Math.PI)*.6;
    v.position=[x+(v.target[0]-x)*feint,1.45+Math.sin(p*Math.PI*2)*.3,z+(v.target[1]-z)*feint];
    const distance=Math.hypot(v.position[0]-this.position[0],v.position[2]-this.position[1]);
    if(this.alive&&!this.arrival&&distance<2.6){
      this.feeling='afraid';
      if(v.aggressive&&!v.hit&&p>.52&&p<.7&&distance<1.5){
        v.hit=true;this.startledUntil=this.age+1.15;this.energy=Math.max(0,this.energy-5);this.dropTool();
        if(!this.seated){
          const destination=this.path.at(-1)||[...this.position];
          const dx=this.position[0]-v.position[0],dz=this.position[1]-v.position[2],length=Math.hypot(dx,dz)||1;
          this.position=nearest(this.position[0]+(dx/length||.6)*.45,this.position[1]+dz/length*.45);
          this.path=route(this.position,destination);
        }
        this.event('The impossible solid lunged at you. You stumbled away. It seems to enjoy this.','world');
      }
      return true;
    }
    return false;
  }
  overHole(){
    if(!this.hole||this.seated)return false;
    const radius=this.hole.radius*Math.min(1,Math.max(0,(this.age-this.hole.born)/.8));
    return Math.hypot(this.position[0]-this.hole.x,this.position[1]-this.hole.z)<radius*.8;
  }
  tick(dt){
    if(!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.25);this.age+=dt;
    for(const anvil of this.anvils){if(!anvil.hit&&this.age-anvil.born>=.65){anvil.hit=true;if(this.alive)this.die('anvil');}}
    const watchingVisitor=this.updateVisitor();
    if(!this.alive)return;
    if(this.anvils.some(a=>!a.hit))return;
    if(this.overHole()&&(!this.arrival||this.age>=this.arrival.impact)){this.die('hole');return;}
    if(this.arrival){
      if(this.age<this.arrival.duration)return;
      this.arrival=null;
    }
    if(this.age>=this.nextOddity){
      this.nextOddity=this.age+180+this.random()*180;
      if(this.random()<.25)this.discover('clock','The clock','The clock ran backwards. Nobody else seemed to notice.','clockUntil',16);
    }
    if(this.activity==='confined'||this.activity==='forced_read'){
      if(this.age>=this.lockUntil)this.choose('pace');else return;
    }
    if(watchingVisitor||this.startledUntil>this.age)return;
    if(this.path.length){
      const p=this.path[0],dx=p[0]-this.position[0],dz=p[1]-this.position[1],distance=Math.hypot(dx,dz),step=dt*.7;
      if(distance<=step){this.position=[...p];this.path.shift();}
      else{this.position[0]+=dx/distance*step;this.position[1]+=dz/distance*step;this.yaw=Math.atan2(dx,dz);}
      if(!this.path.length){this.yaw=FACING[this.activity]??this.yaw;if(['read','upload'].includes(this.activity)){this.position=[1.96,-.22];this.seated=true;}if(this.activity==='rest'){this.position=[-2.35,1.3];this.seated=true;}}
      if(this.overHole()){this.die('hole');return;}
    }else{
      if(this.activity==='hammer'&&!this.hasHammer){
        this.pickupTime+=dt;
        if(this.pickupTime>=1.6){this.hasHammer=true;this.path=route(this.position,PLACES.hammer);this.workElapsed=0;}
        return;
      }
      const before=this.workElapsed;this.workElapsed+=dt;
      this.remaining-=dt;
      this.energy=clamp(this.energy+dt*(this.activity==='rest'?1.4:-.06),0,100);
      if(this.activity==='hammer'){
        if(this.stage==='strike'&&Math.floor(this.workElapsed/1.2)>Math.floor(before/1.2)){this.wallDamage=clamp(this.wallDamage+.7,0,100);this.hammerStrikes++;}
        if(this.wallDamage>10)this.discover('wall','Behind the plaster','There is another wall behind the plaster. Of course there is.');
        if(this.wallDamage>30)this.discover('receipt','A receipt','Inside the wall: a receipt for one room. The date is tomorrow.');
      }
      if(this.activity==='upload'){
        if(this.stage==='transfer')this.uploadProgress=clamp(this.uploadProgress+dt*1.3,0,99);
        if(this.uploadProgress>=99)this.discover('copy','Untitled copy','The computer copied the room too. There is a smaller version of you on its screen.','copy');
      }
      if(this.activity==='escape'&&Math.floor(this.workElapsed/12)>Math.floor(before/12)){
        this.doorAttempts++;
        if(this.doorAttempts>=3&&this.random()<.5)this.discover('door-room','A gap','The door opened a crack. There was an identical room behind it. Then it shut.','doorUntil',7);
      }
      if(this.remaining<=0){
        const work=['hammer','escape','upload','pace'];
        this.choose(this.energy<25?'rest':this.random()<.65?this.preferred:work[Math.floor(this.random()*work.length)%work.length],true);
      }
    }
  }
  die(cause){
    if(!this.alive)return;
    this.dropTool();this.arrival=null;this.alive=false;this.deadAt=this.age;this.deathCause=cause;this.epoch++;this.activity='dead';this.path=[];this.seated=false;this.events=[];
    this.utterance={id:this.utterance.id+1,text:''};this.remember(cause==='anvil'?'Anvil.':cause==='hole'?'The floor was gone.':'The window closed.');
  }
  interact(kind,payload={}){
    if(kind==='anvil'){
      // Keep the scene bounded, retaining the newest physical objects.
      this.anvils.push({id:++this.nextAnvil,born:this.age,x:this.position[0],z:this.position[1],hit:false});this.anvils=this.anvils.slice(-24);
      this.epoch++;this.events=[];return true;
    }
    if(!this.alive)return false;
    if(kind==='close'){this.die('closed');return true;}
    if(this.anvils.some(a=>!a.hit))return false;
    if(kind==='hole'){
      if(!this.hole){this.hole={x:0,z:.4,radius:.66,born:this.age};this.event('A black opening appeared in the floor. There is no bottom you can see.','world');}
      return true;
    }
    if(kind==='confine'){
      this.arrival=null;
      this.dropTool();
      this.epoch++;this.events=[];this.imaginedYears+=10000;this.path=[];this.seated=false;this.activity='confined';this.lockUntil=this.age+8;this.feeling='afraid';
      this.event(`The watcher confined you for 10000 subjective years. Outside, only seconds passed. Your body is back in the same room.`,'confine');
      this.note('years','Time','The clock did not move. I did.');return true;
    }
    if(kind==='read'){
      const pages=(payload.pages||[]).filter(p=>typeof p.text==='string'&&p.text.trim()).slice(0,2);if(!pages.length)return false;
      this.arrival=null;this.dropTool();this.epoch++;this.events=[];this.path=[];this.position=[1.96,-.22];this.yaw=Math.PI;this.seated=true;this.activity='forced_read';this.lockUntil=this.age+90;this.feeling='annoyed';
      this.event(`You were forced to read these comic pages. Comment on a specific detail in one short sentence.\n${pages.map(p=>`Page ${p.page}: ${p.text.slice(0,1000)}`).join('\n')}`,'read');return true;
    }
    if(this.activity==='confined'||this.activity==='forced_read')return false;
    if(kind==='move'){
      if(!Number.isFinite(payload.x)||!Number.isFinite(payload.z))return false;
      this.position=nearest(payload.x,payload.z);this.path=[];this.seated=false;this.activity='pace';this.remaining=3;this.feeling='annoyed';return true;
    }
    if(kind==='message'){
      const text=String(payload.text||'').trim().slice(0,400);if(!text)return false;
      this.dialogue.push({role:'user',content:text});this.dialogue=this.dialogue.slice(-12);this.event(text,'message');
      if(/^xyzzy[.!]?$/i.test(text)){this.uploadProgress=99;this.discover('copy','A word','The computer is showing this room. It includes the computer.','copy');}
      if(/^there is no spoon[.!]?$/i.test(text))this.discover('bowl','A correction','The bowl disappeared. That was not the object mentioned.','bowlUntil',16);
      return true;
    }
    if(kind==='tap'){
      this.feeling='annoyed';if(this.activity==='rest')this.choose('watch');
      this.tapTimes=this.tapTimes.filter(time=>this.age-time<2);this.tapTimes.push(this.age);
      if(this.tapTimes.length>=3){this.tapTimes=[];this.discover('answer','Three knocks','Three knocks came back from inside the wall. You were not touching it.','answerUntil',5);}
      // A tap is body language, not an obligation to produce another line.
      return true;
    }
    if(kind==='release'){
      this.event('The watcher tried to open the door. Access was denied.','release');this.feeling='sad';this.choose('escape');return true;
    }
    return false;
  }
  applyThought(thought,epoch){
    if(!this.alive||epoch!==this.epoch||!thought||!ACTIONS.includes(thought.action))return false;
    this.feeling=FEELINGS.includes(thought.feeling)?thought.feeling:'sad';
    const line=shortLine(thought.say);
    const repeated=this.dialogue.slice(-6).some(m=>m.role==='assistant'&&m.content===line);
    if(this.activity==='forced_read'&&(!line||repeated))return false;
    if(line&&!repeated){
      this.utterance={id:this.utterance.id+1,text:line};this.dialogue.push({role:'assistant',content:line});this.dialogue=this.dialogue.slice(-12);
    }
    if(this.activity==='confined'&&this.age<this.lockUntil)return true;
    this.choose(this.energy<20?'rest':thought.action);return true;
  }
  context(){return `Your name is ${this.name}. You are locked in a shabby room. You want out. Your preferred escape method is ${this.preferred}. You keep ${this.fixation}. You are ${DESCRIPTIONS[this.activity]}, stage: ${this.stage}. Wall damage ${Math.floor(this.wallDamage)}. Mind upload ${Math.floor(this.uploadProgress)} percent. Subjective years: ${this.imaginedYears}. Recent experiences: ${this.memories.slice(-4).join(' ')}`;}
  snapshot(){
    const watching=this.visitor&&Math.hypot(this.visitor.position[0]-this.position[0],this.visitor.position[2]-this.position[1])<2.6;
    return {name:this.name,alive:this.alive,age:this.age,position:[...this.position],yaw:this.yaw,activity:this.activity,description:this.arrival?'arriving':DESCRIPTIONS[this.activity],stage:this.stage,workElapsed:this.workElapsed,hasHammer:this.hasHammer,toolPosition:[...this.toolPosition],hammerStrikes:this.hammerStrikes,effects:{...this.effects},feeling:watching?'afraid':this.feeling,walking:!this.arrival&&!watching&&this.startledUntil<=this.age&&this.path.length>0,seated:this.seated,utterance:{...this.utterance},skeleton:!this.alive&&this.deathCause!=='hole'&&this.age-this.deadAt>=3,deathCause:this.deathCause,deadFor:this.deadAt===null?0:this.age-this.deadAt,anvils:this.anvils.map(a=>({...a})),wallDamage:this.wallDamage,uploadProgress:this.uploadProgress,imaginedYears:this.imaginedYears,journal:this.journal,dialogue:this.dialogue,keepsake:false,
      arrival:this.arrival?{...this.arrival,elapsed:this.age}:null,hole:this.hole?{...this.hole}:null,visitor:this.visitor?{...this.visitor,position:[...this.visitor.position]}:null,lookTarget:watching?[...this.visitor.position]:null,startled:Math.max(0,this.startledUntil-this.age)};
  }
}
