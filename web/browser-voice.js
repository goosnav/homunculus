export class BrowserVoice{
  constructor({synthesis=globalThis.speechSynthesis,Utterance=globalThis.SpeechSynthesisUtterance}={}){
    this.synthesis=synthesis;this.Utterance=Utterance;this.enabled=false;this.current=null;
  }
  setEnabled(enabled){
    this.enabled=!!enabled&&!!this.synthesis&&!!this.Utterance;
    if(!this.enabled){this.stop();return false;}
    // Must run synchronously from the Spawn button's tap. WebKit removes its
    // speech-start gesture restriction here, before later asynchronous replies.
    const prime=new this.Utterance('');prime.volume=0;
    this.synthesis.speak(prime);return true;
  }
  say(text){
    if(!this.enabled||!text)return;
    const voices=this.synthesis.getVoices();
    const voice=voices.find(v=>v.localService&&v.lang.startsWith('en'))||voices.find(v=>v.lang.startsWith('en'))||voices.find(v=>v.default);
    const line=new this.Utterance(text);
    if(voice)line.voice=voice;
    line.lang='en-US';line.rate=.82;line.pitch=.65;
    this.current=line;
    line.onend=line.onerror=()=>{if(this.current===line)this.current=null;};
    this.synthesis.speak(line);
  }
  stop(){this.synthesis?.cancel();this.current=null;}
}
