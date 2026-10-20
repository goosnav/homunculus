export class BrowserVoice{
  constructor({contextFactory=()=>new (globalThis.AudioContext||globalThis.webkitAudioContext)(),workerFactory=()=>new Worker(new URL('./voice-worker.js',import.meta.url),{type:'module'})}={}){
    this.contextFactory=contextFactory;this.workerFactory=workerFactory;this.context=null;this.worker=null;this.source=null;this.enabled=false;this.serial=0;this.effects=new Set();
  }
  setEnabled(enabled){
    this.enabled=!!enabled;if(!enabled){this.stop();return false;}
    try{
      if(!this.context){
        this.context=this.contextFactory();this.filter=this.context.createBiquadFilter();
        this.filter.type='lowpass';this.filter.frequency.value=1550;this.filter.Q.value=.6;
        this.gain=this.context.createGain();this.gain.gain.value=.8;
        this.filter.connect(this.gain).connect(this.context.destination);
      }
      // Resume synchronously from the Spawn gesture, before any model download.
      this.context.resume().catch(()=>{});this.arrivalSound=false;this.lastStrike=0;this.anvilHits=new Set();this.holeSound=false;
      this.effect('tap');return true;
    }catch{this.enabled=false;return false;}
  }
  say(text){
    if(!this.enabled||!text)return;
    const id=++this.serial;
    try{
    if(!this.worker){
      this.worker=this.workerFactory();
      this.worker.onmessage=({data})=>{
        if(data.id!==this.serial||!this.enabled)return;
        if(data.error){this.onError?.(data.error);return;}
        this.source?.stop();this.source?.disconnect();
        const buffer=this.context.createBuffer(1,data.samples.length,data.sampleRate);buffer.copyToChannel(data.samples,0);
        const source=this.context.createBufferSource();source.buffer=buffer;source.connect(this.filter);this.source=source;
        source.onended=()=>{source.disconnect();if(this.source===source)this.source=null;};
        this.lastAudio={samples:data.samples.length,sampleRate:data.sampleRate,duration:buffer.duration};
        source.start();
      };
      this.worker.onerror=()=>{this.stop();this.onError?.('The voice stopped.');};
    }
    this.worker.postMessage({id,text:String(text).slice(0,240)});
    }catch(error){this.stop();this.onError?.(String(error.message||error));}
  }
  stop(){this.serial++;try{this.source?.stop();}catch{}this.source?.disconnect();this.source=null;this.worker?.terminate();this.worker=null;}
  effect(kind){
    if(!this.enabled||!this.context||this.effects.size>=4)return;
    const now=this.context.currentTime,osc=this.context.createOscillator(),gain=this.context.createGain();
    const [start,end,length,volume]=kind==='tap'?[650,240,.055,.035]:kind==='hammer'?[180,65,.12,.07]:kind==='hole'?[100,24,.7,.12]:[110,32,.28,.18];
    osc.type='triangle';osc.frequency.setValueAtTime(start,now);osc.frequency.exponentialRampToValueAtTime(end,now+length);
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
