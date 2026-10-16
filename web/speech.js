export class Voice {
  constructor(){this.unlocked=false;this.enabled=true;this.host=false;this.voice=null;this.choose=()=>{const voices=window.speechSynthesis?.getVoices()||[];this.voice=voices.find(v=>v.localService&&v.lang.startsWith('en'))||null;};window.speechSynthesis?.addEventListener('voiceschanged',this.choose);this.choose();}
  unlock(){this.unlocked=true;}
  configure(settings,host){this.enabled=settings.tts;this.host=host;if(!this.enabled)window.speechSynthesis?.cancel();}
  say(text){if(!this.enabled||this.host||!this.unlocked||!window.speechSynthesis)return;this.choose();if(!this.voice)return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.voice=this.voice;u.rate=.86;u.pitch=.78;u.volume=.9;window.speechSynthesis.speak(u);}
}
