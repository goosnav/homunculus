import {paperPlayClue} from './paper-play.js';
// UI selection only. Physical rules remain in Life and its apparatus.
const $=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)];
const HELP={fan:'Blow loose things across the floor.',mist:'A fine spray from the ceiling pipe. Things get damp.',resonator:'Send a note into one floor tile. Watch what answers.',nest:'Give him scraps to build with. Try a gentle note when it is finished.'};
const PLAY={plane:'A folded sheet, a throw, and whatever the air decides.',mouse:'Wind his little companion and let it run.',plant:'Plant, water, and see what grows in here.',boat:'Fold a boat. It needs water on the floor.',neighbor:'Send something through the wall. Wait for an answer.'};
export function createToolPanel({onSelect=()=>{}}={}){
 let device='fan',roomTab='play',play='plane',snapshot=null;
 const selectDevice=key=>{if(!Object.hasOwn(HELP,key))return;device=key;for(const b of all('[data-device]'))b.setAttribute('aria-pressed',String(b.dataset.device===key));for(const p of all('[data-device-panel]'))p.hidden=p.dataset.devicePanel!==key;$('#device-help').textContent=HELP[key];onSelect(key,snapshot?.laboratory?.resonance.pad??0);render();};
 const selectRoom=key=>{if(!['play','fixtures','arrivals'].includes(key))return;roomTab=key;for(const b of all('[data-room-tab]'))b.setAttribute('aria-pressed',String(b.dataset.roomTab===key));for(const p of all('[data-room-panel]'))p.hidden=p.dataset.roomPanel!==key;};
 function render(){
  const s=snapshot;if(!s)return;const l=s.laboratory,c=s.chamber;
  const wait=!s.alive?'There is nobody to use it.':s.arrival?'Let him find his feet.':['confined','forced_read'].includes(s.activity)?'He cannot use this while confined.':l.gravity.lift>.02?'Bring him down with bass or turn the resonator off.':c.job?'He is busy. Let him finish.':c.cooperation<-.5?'He is keeping his distance. Try sending soup.':'';
  $('#give-state').textContent=wait||'Send something through the hatch. He decides what to do with it.';
  for(const b of all('[data-delivery]')){const item=b.dataset.delivery,installed=item==='chalk'?c.chalk>=1:item==='coil'?c.coil:item==='mirror'?c.mirror:false;b.classList.toggle('installed',!!installed);b.title=installed?'Already in the room.':wait||({soup:s.age<c.soupUntil?'He still has his bowl.':'A warm bowl.',chalk:'Something to draw with.',coil:'Fits the computer’s empty socket.',mirror:'Something to look back.'})[item];}
  const installed=l.nest.scraps.map(v=>v[0].toUpperCase()+v.slice(1));
  $('#device-state').textContent=device==='fan'?`${['Off','Low','High'][l.draft.power]} · toward ${['the right wall','the glass','the left wall','the back wall'][l.draft.direction]}.`:device==='mist'?(l.mist.on?'The mist is running.':'The pipe is closed.'):device==='resonator'?`${['Off','Low','High'][l.resonance.power]} · ${['bass','middle','treble'][l.resonance.tone-1]} · ${['nest','center','door'][l.resonance.pad]}.`:wait||({awake:s.night?.drain?'Keep the little thing, or let it leave.':'Keep it here, or open the drain in Room → Fixtures.',kept:'It lives here now.',released:'Only the little shell remains.'})[l.nest.heart]||(installed.length===3?'The nest is built. It is listening.':installed.length?`${installed.join(', ')} fitted. Give him another scrap.`:'Paper, wire, cloth. One scrap at a time.');
  for(const b of all('[data-item]')){const fitted=l.nest.scraps.includes(b.dataset.item);b.textContent=b.dataset.item[0].toUpperCase()+b.dataset.item.slice(1)+(fitted?' ✓':'');b.title=fitted?'Already fitted.':wait||'Send this scrap.';}
  for(const b of all('[data-play]'))b.hidden=b.dataset.play!==play||b.dataset.unavailable==='true';
  const p=s.paperPlay;
  const detail=play==='plane'&&(s.visitor||s.startled>0)?'Let him recover from the visitor.':play==='plane'&&p?paperPlayClue(p):play==='boat'&&s.night?.water<.12?'The floor is dry.':play==='plant'&&s.night?.plant.planted?'The plant is already growing.':'';
  $('#play-help').textContent=wait||detail||PLAY[play];
  $('#arrival-mark').textContent=s.night?.phase!=='quiet'?' •':'';
 }
 for(const b of all('[data-device]'))b.addEventListener('click',()=>selectDevice(b.dataset.device));
 for(const b of all('[data-room-tab]'))b.addEventListener('click',()=>selectRoom(b.dataset.roomTab));
 $('#play-select').addEventListener('change',e=>{play=e.target.value;render();});
 return {update(s){snapshot=s;render();},selectDevice,selectRoom,selectPlay(key){if(Object.hasOwn(PLAY,key)){play=key;$('#play-select').value=key;selectRoom('play');render();}},opened(kind){if(kind==='laboratory')onSelect(device,snapshot?.laboratory?.resonance.pad??0);if(kind==='night'&&snapshot?.night?.phase!=='quiet')selectRoom('arrivals');},get device(){return device;}};
}
