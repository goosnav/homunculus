export class BrowserVoice{
  constructor({contextFactory=()=>new (globalThis.AudioContext||globalThis.webkitAudioContext)(),workerFactory=()=>new Worker(new URL('./voice-worker.js',import.meta.url),{type:'module'})}={}){
    this.contextFactory=contextFactory;this.workerFactory=workerFactory;this.context=null;this.worker=null;this.source=null;this.enabled=false;this.visible=true;this.serial=0;this.effects=new Set();this.pendingAudio=null;this.now=()=>Date.now();
  }
  ensureContext(){
    if(this.context&&this.context.state!=='closed')return;
    this.stopSource();this.stopEffects();
    if(this.context)this.context.onstatechange=null;
    this.filter?.disconnect();this.gain?.disconnect();
    const context=this.contextFactory();this.context=context;
    this.filter=context.createBiquadFilter();this.filter.type='lowpass';this.filter.frequency.value=1550;this.filter.Q.value=.6;
    this.gain=context.createGain();this.gain.gain.value=.8;
    this.filter.connect(this.gain).connect(context.destination);
    context.onstatechange=()=>{
      if(this.context!==context)return;
      if(context.state==='running')this.playPending();
      else{this.stopSource();this.stopEffects();}
    };
  }
  setEnabled(enabled){
    this.enabled=!!enabled;this.stop();if(!enabled)return false;
    try{
      this.ensureContext();
      // The Spawn gesture is the first unlock. Later gestures and foreground
      // events retry it: iOS may interrupt the same context after this point.
      this.resume(true);this.arrivalSound=false;this.lastStrike=0;this.anvilHits=new Set();this.holeSound=false;
      this.effect('tap');return true;
    }catch{this.enabled=false;return false;}
  }
  resume(force=false){
    if(!this.enabled||!this.visible)return;
    try{
      this.ensureContext();const context=this.context;
      if(context.state==='running'&&!force){this.playPending();return;}
      // Do not await here or latch an unresolved promise. A fresh trusted touch
      // must be able to retry even if a background resume never settled.
      context.resume().then(()=>{if(this.context===context)this.playPending();}).catch(()=>{});
    }catch{/* A future gesture can retry without disturbing the simulation. */}
  }
  setVisible(visible){
    this.visible=!!visible;
    if(this.visible){this.resume();return;}
    // No stale speech or burst of accumulated effects when the phone returns.
    this.stop();
    try{this.context?.suspend()?.catch(()=>{});}catch{}
  }
  say(text){
    if(!this.enabled||!this.visible||!text)return;
    const id=++this.serial;this.pendingAudio=null;this.resume();
    try{
      if(!this.worker){
        const worker=this.workerFactory();this.worker=worker;
        worker.onmessage=({data})=>{
          if(this.worker!==worker||data.id!==this.serial||!this.enabled||!this.visible)return;
          if(data.error){this.stop();this.onError?.(data.error);return;}
          this.pendingAudio={...data,expires:this.now()+8000};this.playPending();
        };
        worker.onerror=()=>{if(this.worker!==worker)return;this.stop();this.onError?.('The voice stopped.');};
      }
      this.worker.postMessage({id,text:String(text).slice(0,240)});
    }catch(error){this.stop();this.onError?.(String(error.message||error));}
  }
  playPending(){
    const data=this.pendingAudio;
    if(!data)return;
    if(data.id!==this.serial||!this.enabled||!this.visible||data.expires<this.now()){this.pendingAudio=null;return;}
    if(this.context?.state!=='running')return;
    this.pendingAudio=null;
    try{
      this.stopSource();
      const buffer=this.context.createBuffer(1,data.samples.length,data.sampleRate);buffer.copyToChannel(data.samples,0);
      const source=this.context.createBufferSource();source.buffer=buffer;source.connect(this.filter);this.source=source;
      source.onended=()=>{source.disconnect();if(this.source===source)this.source=null;};
      source.start();this.lastAudio={samples:data.samples.length,sampleRate:data.sampleRate,duration:buffer.duration};
    }catch(error){this.stop();this.onError?.(String(error.message||error));}
  }
  stopSource(){try{this.source?.stop();}catch{}this.source?.disconnect();this.source=null;}
  stopEffects(){for(const effect of this.effects){try{effect.stop();}catch{}effect.onended?.();}this.effects.clear();}
  stop(){this.serial++;this.pendingAudio=null;this.stopSource();this.stopEffects();this.worker?.terminate();this.worker=null;}
  effect(kind){
    if(!this.enabled||!this.visible||this.context?.state!=='running'||this.effects.size>=4)return;
    const now=this.context.currentTime,osc=this.context.createOscillator(),gain=this.context.createGain();
    const sounds={bass:[110,110,.5,.035],middle:[330,330,.45,.03],treble:[990,990,.4,.025],telephone:[880,620,.5,.045],inspection:[90,150,.6,.06],shutter:[130,65,.3,.045],water:[600,270,.15,.025],wind:[1150,450,.25,.025],paper:[480,210,.08,.02],knock:[230,80,.13,.045],parcel:[160,90,.22,.04],bloom:[640,820,.4,.025],shadow:[140,45,.5,.04],tone:[640,640,.16,.035],pipe:[160,140,.5,.025],tap:[650,240,.055,.035],hammer:[180,65,.12,.07],hole:[100,24,.7,.12],bell:[780,680,.6,.06],radio:[460,440,.15,.025],key:[1200,800,.08,.035],mirror:[1400,1100,.12,.025],hatch:[140,90,.18,.07],door:[80,40,.6,.07],chalk:[400,200,.08,.02],switch:[1800,850,.025,.025]};
    const [start,end,length,volume]=sounds[kind]||[110,32,.28,.18];
    osc.type=kind==='bell'?'sine':kind==='radio'?'square':'triangle';osc.frequency.setValueAtTime(start,now);osc.frequency.exponentialRampToValueAtTime(end,now+length);
    gain.gain.setValueAtTime(volume,now);gain.gain.exponentialRampToValueAtTime(.001,now+length);
    osc.connect(gain).connect(this.filter);this.effects.add(osc);
    osc.onended=()=>{osc.disconnect();gain.disconnect();this.effects.delete(osc);};osc.start(now);osc.stop(now+length);
  }
  update(state){
    if(!this.enabled)return;
    if(state.arrival&&!this.arrivalSound&&state.arrival.elapsed>=state.arrival.impact){this.arrivalSound=true;this.effect('impact');}
    if(state.hammerStrikes>this.lastStrike){this.lastStrike=state.hammerStrikes;this.effect('hammer');}
    for(const anvil of state.anvils)if(anvil.hit&&!this.anvilHits.has(anvil.id)){this.anvilHits.add(anvil.id);this.effect('impact');}
    if(!state.alive&&state.deathCause==='hole'&&!this.holeSound){this.holeSound=true;this.effect('hole');}
    // The simulation retains at most 24 anvils.
    this.anvilHits=new Set(state.anvils.filter(a=>a.hit).map(a=>a.id));
  }
}
