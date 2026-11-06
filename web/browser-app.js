import {paperPlayAvailability} from './paper-play.js';
import {createToolPanel} from './tool-panel.js';
import {laboratoryAvailability} from './laboratory.js';
import {createInstrument} from './instrument.js';
import {SPECIES,randomSpecies,speciesId} from './species.js';
import { nightClue, nightAvailability } from './night.js';
import { BrowserRoom } from './browser-room.js';
import { Life, parseThought } from './life.js';
import { readArchive, writeArchive } from './chamber.js';
import { ComicReader } from './comic.js';
let comicReader;
const instrument=createInstrument({onAction:interaction});
import { BrowserMind, mindMessages } from './mind.js';
import { BrowserVoice } from './browser-voice.js';
const $=s=>document.querySelector(s);
const voice=new BrowserVoice();
const tools=createToolPanel({onSelect:(tool,pad)=>room?.laboratoryView?.selectTool(tool,pad)});
document.addEventListener('pointerup',e=>{if(e.isTrusted)voice.resume();},{capture:true,passive:true});
document.addEventListener('keydown',e=>{if(e.isTrusted&&!e.repeat)voice.resume();});
document.addEventListener('visibilitychange',()=>voice.setVisible(!document.hidden));
voice.onError=()=>notice('His voice did not reach the glass.');
// Safari's keyboard changes the visual viewport, not necessarily layout height.
// Leave pinch-zoom alone; only fit the window at the normal page scale.
if(window.visualViewport){
  let resizePending=false;
  const fitWindow=()=>{
    if(resizePending)return;resizePending=true;
    requestAnimationFrame(()=>{
      resizePending=false;const view=window.visualViewport;
      if(Math.abs(view.scale-1)>.01)return;
      document.documentElement.style.setProperty('--window-height',`${view.height}px`);
      document.documentElement.style.setProperty('--window-top',`${view.offsetTop}px`);
    });
  };
  window.visualViewport.addEventListener('resize',fitWindow);
  window.visualViewport.addEventListener('scroll',fitWindow);
  window.addEventListener('resize',fitWindow);fitWindow();
}
const settings={render_size:[640,480],fps:30,profile:'browser',kiosk:false};
let room,mind,life,roomFailed=false,spawning=false,generation=0,busy=false,nextThought=0,lastFrame=performance.now(),lastSpeech=0,subtitleUntil=0,disposed=false;
let lastArchive='',lastRoomFeedback=0,lastControls=-Infinity;
const storage=()=>{try{return window.localStorage;}catch{return undefined;}};
const debug=new URLSearchParams(location.search).has('debug');
function notice(text){$('#notice').textContent=text;$('#notice').hidden=!text;}
function silence(){voice.stop();$('#subtitle').hidden=true;if(room)room.speakingUntil=0;}
function speak(text){
  if(!text){silence();return;}
  $('#speaker-name').textContent=life.name.toUpperCase();$('#spoken-text').textContent=text;$('#subtitle').hidden=false;subtitleUntil=performance.now()+6500;room.speak(text);
  voice.say(text);
}
function closeDrawers(){
 for(const kind of ['service','experiments','night','laboratory']){$(`#${kind}-drawer`).hidden=true;$(`#${kind}-toggle`).setAttribute('aria-expanded','false');}
}
function toggleDrawer(kind){
 const opening=$(`#${kind}-drawer`).hidden;closeDrawers();$(`#${kind}-drawer`).hidden=!opening;$(`#${kind}-toggle`).setAttribute('aria-expanded',String(opening));if(opening)tools.opened(kind);
}
function persistRoom(){
 if(!life)return;const a=life.chamber.archive,key=JSON.stringify(a);
 if(key!==lastArchive){lastArchive=key;writeArchive(storage(),a);}
}
function roomControls(s){
 const c=s.chamber,busy=!!c.job||!!s.arrival;
 $('[data-action="lights"]').textContent=c.lights?'Lights off':'Lights on';$('[data-action="lights"]').setAttribute('aria-pressed',String(!c.lights));
 $('[data-action="tune"]:not([data-channel])').textContent=`Radio · 0${c.channel}`;
 $('[data-action="bell"]').disabled=!s.alive||s.age<c.bellUntil;
 $('[data-action="release"]').disabled=!s.alive||busy;
 for(const b of document.querySelectorAll('[data-delivery]')){const k=b.dataset.delivery;b.disabled=!s.alive||busy||['confined','forced_read'].includes(s.activity)||(k==='chalk'&&c.chalk>=1)||(k==='coil'&&c.coil)||(k==='mirror'&&c.mirror)||(k==='soup'&&s.age<c.soupUntil);}
 $('#next-occupant').hidden=s.alive||s.deadFor<3;
 if(s.night){
  const n=s.night;$('#phone-tuning').hidden=n.phase!=='phone'||!n.phone.answered;for(const b of document.querySelectorAll('[data-channel]'))if(b.dataset.action==='tune'){b.setAttribute('aria-pressed',String(c.channel===Number(b.dataset.channel)));b.disabled=!s.alive;}$('#night-clue').textContent=nightClue(n);
  $('#night-toggle').textContent=n.phase==='quiet'?'Room':'Room •';
  $('#night-toggle').classList.toggle('calling',n.phase!=='quiet');
  for(const [action,[visible,enabled]]of Object.entries(nightAvailability(s))){const button=$(`#night-drawer [data-action="${action}"]`);button.hidden=!visible;button.dataset.unavailable=String(!visible);button.disabled=!enabled;}
  $('[data-action="shutter"]').textContent=n.shutter?'Open shutter':'Close shutter';$('[data-action="shutter"]').setAttribute('aria-pressed',String(n.shutter));
  $('[data-action="drain"]').textContent=n.drain?'Close drain':'Open drain';$('[data-action="drain"]').setAttribute('aria-pressed',String(n.drain));
 }
 if(s.paperPlay){for(const [action,[visible,enabled]]of Object.entries(paperPlayAvailability(s))){const button=$(`[data-action="${action}"]`);button.dataset.unavailable=String(!visible);button.disabled=!enabled;}}
 if(s.laboratory){
  const l=s.laboratory,available=laboratoryAvailability(s);
  for(const b of document.querySelectorAll('#laboratory-drawer [data-action]')){const [visible,enabled]=available[b.dataset.action]||[true,false];b.hidden=b.dataset.action==='deliver-scrap'?false:!visible;b.disabled=!enabled||(b.dataset.action==='deliver-scrap'&&l.nest.scraps.includes(b.dataset.item));
   if(b.dataset.power!==undefined)b.setAttribute('aria-pressed',String((b.dataset.action==='draft-power'?l.draft.power:l.resonance.power)===Number(b.dataset.power)));
   if(b.dataset.action==='draft-direction')b.setAttribute('aria-pressed',String(l.draft.direction===Number(b.dataset.direction)));
   if(b.dataset.tone)b.setAttribute('aria-pressed',String(l.resonance.tone===Number(b.dataset.tone)));
   if(b.dataset.pad!==undefined)b.setAttribute('aria-pressed',String(l.resonance.pad===Number(b.dataset.pad)));
  }
  $('[data-action="mist"]').setAttribute('aria-pressed',String(l.mist.on));$('[data-action="mist"]').textContent=l.mist.on?'Stop mist':'Start mist';
 }
 if(c.feedback.id!==lastRoomFeedback){lastRoomFeedback=c.feedback.id;$('#tool-feedback').textContent=c.feedback.text;$('#tool-feedback').hidden=!c.feedback.text;voice.effect(c.feedback.sound);}
 tools.update(s);
}
function controls(enabled){
  $('#message').disabled=!enabled;$('#say-button').disabled=!enabled;
  document.querySelectorAll('[data-action]').forEach(b=>{b.disabled=!enabled;});
}
function showNotes(title,paragraphs){
  $('#notes-title').textContent=title;const body=$('#notes-body');body.replaceChildren();
  for(const text of paragraphs){const p=document.createElement('p');p.textContent=text;body.append(p);}
  $('#new-life').hidden=!life||life.alive;$('#reload-mind').hidden=!life?.alive||mind?.ready||spawning;
  $('#notes').showModal();
}
async function spawn(){
  if(spawning)return;spawning=true;instrument.update(null);closeDrawers();$('#next-occupant').hidden=true;lastRoomFeedback=0;$('#menu-note').textContent='';$('#tool-feedback').hidden=true;const run=++generation;disposed=false;busy=false;life=null;silence();controls(false);notice('');
  voice.setEnabled(true);
  mind?.dispose();mind=new BrowserMind({debug});$('#spawn-error').hidden=true;$('#spawn-button').hidden=true;$('#spawn-progress').hidden=false;$('#spawn-panel').hidden=false;
  $('#spawn-meter').value=0;$('#spawn-status').textContent='Preparing a place for a thought…';$('#activity').textContent='The room is empty.';$('#brain-status').textContent='Spawning…';document.body.classList.remove('dead');
  const requested=debug?(window.__habitat?.nextSpecies||new URLSearchParams(location.search).get('body')):null;
  const species=requested?speciesId(requested):randomSpecies();
  try{
    if(!room)room=new BrowserRoom($('#viewport'),{...settings,species,residentFile:SPECIES[species].asset},interaction);
    else if(roomFailed){roomFailed=false;room.ready=room.loadAssets();}
    const assets=room.ready.catch(error=>{roomFailed=true;throw error;}).then(()=>room.selectSpecies(species));
    room.state=null;room.materialize(0);
    const resources=await Promise.all([assets,mind.load(({progress,text})=>{if(run!==generation)return;$('#spawn-meter').value=progress;$('#spawn-status').textContent=text;room.materialize(progress);}),ComicReader.load()]);
    comicReader=resources[2];
    if(run!==generation)return;
    $('#spawn-meter').value=1;room.materialize(1);life=new Life({archive:readArchive(storage()),species});persistRoom();nextThought=life.age+1;lastSpeech=0;
    room.update(life.snapshot());$('#title-name').textContent=`${life.name}’s room`;
    $('#spawn-panel').hidden=true;$('#brain-status').textContent='';controls(true);if(matchMedia('(pointer:fine)').matches)$('#message').focus({preventScroll:true});
    if(debug)Object.assign(window.__habitat,{life,mind});
  }catch(error){
    if(run!==generation)return;mind.dispose();$('#spawn-error').textContent=`Could not spawn: ${error.message}`;$('#spawn-error').hidden=false;$('#spawn-button').textContent='Try again';$('#spawn-button').hidden=false;$('#spawn-progress').hidden=true;$('#brain-status').textContent='';
  }finally{if(run===generation)spawning=false;}
}
function cancelSpawn(){generation++;mind?.dispose();spawning=false;instrument.update(null);$('#spawn-button').hidden=false;$('#spawn-progress').hidden=true;$('#brain-status').textContent='';$('#spawn-status').textContent='';}
function interaction(kind,payload={}){
  if(!life)return false;
  if(kind==='service'||kind==='experiments'||kind==='night'||kind==='laboratory'){if(life.alive||kind==='experiments')toggleDrawer(kind);return true;}
  if(kind.startsWith('tool:')){if(!life.alive)return false;const tool=kind.slice(5);closeDrawers();toggleDrawer('laboratory');tools.selectDevice(tool);return true;}
  if(kind==='resonance-aim')room?.laboratoryView?.selectTool('resonator',payload.pad);
  if(kind==='read'){payload.pages=comicReader.select();const images=$('#reading-pages');images.replaceChildren();for(const page of payload.pages){const image=new Image();image.src=page.image;image.alt=`Book 2, page ${page.page}`;images.append(image);}}
  const accepted=life.interact(kind,payload);
  if(accepted&&kind==='tap')voice.effect('tap');
  if(accepted&&['anvil','confine','close'].includes(kind))silence();
  if(accepted&&kind==='release'&&!life.chamber.job)notice('Access is denied.');
  if(accepted&&kind==='deliver')notice('');
  if(!accepted&&life.alive&&!['tap','wave'].includes(kind)&&!life.chamber.feedback.text){$('#tool-feedback').hidden=false;$('#tool-feedback').textContent='He is busy. Let him finish.';}
  if(!life.alive)endMind();
  return accepted;
}
function endMind(){
  if(disposed)return;disposed=true;mind?.dispose();silence();busy=false;document.body.classList.add('dead');$('#brain-status').textContent=life?.outcome?'':'No response';$('#menu-note').textContent='';
  $('#service-drawer').hidden=true;$('#service-toggle').setAttribute('aria-expanded','false');persistRoom();
  document.querySelectorAll('[data-action]').forEach(b=>{b.disabled=!['anvil','experiments'].includes(b.dataset.action);});
}
async function think(){
  if(debug&&window.__habitat?.pauseAutonomy)return;
  if(!life?.alive||life.arrival||!mind?.ready||busy||spawning||document.hidden)return;
  let event=life.takeEvent();while(event&&event.epoch!==life.epoch)event=life.takeEvent();
  if(!event&&life.age<nextThought)return;
  const current=life,brain=mind,epoch=life.epoch;busy=true;$('#brain-status').textContent='A thought is forming';
  try{
    const result=await brain.think(mindMessages(life,event),{speak:!!event&&event.kind!=='world'});
    if(life!==current||mind!==brain||!life.alive||life.epoch!==epoch)return;
    const thought=parseThought(result.text);
    if(debug)window.__habitat.lastThought={...result,parsed:thought};
    if(thought&&!event)thought.say='';
    const applied=thought&&life.applyThought(thought,epoch);
    if(!applied&&event?.kind==='read'&&!life.retryEvent(event))notice('No words came back from that reading.');
    nextThought=life.age+(event?20:45);
  }catch(error){if(life===current&&mind===brain&&life.alive){life.retryEvent(event);notice(`${error.message} Open File to reload the mind.`);$('#brain-status').textContent='Mind stopped';}}
  finally{if(life===current&&mind===brain){busy=false;if(life?.alive&&mind?.ready)$('#brain-status').textContent='';}}
}
function frame(now){
  requestAnimationFrame(frame);const dt=Math.min(.2,(now-lastFrame)/1000);lastFrame=now;
  if(!life)return;life.tick(dt);
  const snapshot=life.snapshot();instrument.update(snapshot);voice.update(snapshot);if(now-lastControls>=100){lastControls=now;roomControls(snapshot);}persistRoom();
  if(!life.alive)endMind();room.update(snapshot,{thinking:busy&&life.alive,watching:!document.hidden});
  $('#activity').textContent=life.outcome?'The room is empty.':`${life.name} is ${snapshot.description}.`;
  $('#reading-pages').hidden=life.activity!=='forced_read';
  $('#confinement').hidden=life.activity!=='confined';if(life.activity==='confined')$('#years').textContent=Math.max(0,Math.ceil((life.lockUntil-life.age)/8*10000)).toLocaleString();
  if(life.utterance.id!==lastSpeech){lastSpeech=life.utterance.id;speak(life.utterance.text);}
  if(now>subtitleUntil)$('#subtitle').hidden=true;
  void think();
}
$('#spawn-button').addEventListener('click',spawn);$('#cancel-spawn').addEventListener('click',cancelSpawn);
$('#message-form').addEventListener('submit',e=>{e.preventDefault();const text=$('#message').value.trim();if(!text)return;interaction('message',{text});$('#message').value='';});
for(const button of document.querySelectorAll('[data-delivery]'))button.addEventListener('click',()=>interaction('deliver',{item:button.dataset.delivery}));
$('#next-occupant').addEventListener('click',spawn);
$('#message').addEventListener('focus',()=>{if(matchMedia('(pointer:coarse)').matches)closeDrawers();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDrawers();});
for(const button of document.querySelectorAll('[data-action]'))button.addEventListener('click',()=>interaction(button.dataset.action,{...(button.dataset.direction?{direction:Number(button.dataset.direction)}:{}),...(button.dataset.tone?{tone:Number(button.dataset.tone)}:{}),...(button.dataset.channel!==undefined?{channel:Number(button.dataset.channel)}:{}),...(button.dataset.power!==undefined?{power:Number(button.dataset.power)}:{}),...(button.dataset.pad!==undefined?{pad:Number(button.dataset.pad)}:{}),...(button.dataset.item?{item:button.dataset.item}:{})}));
function exitProgram(){if(spawning)cancelSpawn();else interaction('close');silence();}
$('#close-window').addEventListener('click',()=>{exitProgram();location.assign('https://www.goosnav.shop/');});
$('#restart-program').addEventListener('click',()=>{exitProgram();location.reload();});
$('#journal-button').addEventListener('click',()=>showNotes(life?`${life.name.toLowerCase()}.txt - Notepad`:'File',life?[...life.journal.map(n=>`${n.title}\n${n.text}`),...life.dialogue.slice(-8).map(m=>`${m.role==='user'?'Outside':life.name}: ${m.content}`)].concat(life.journal.length||life.dialogue.length?[]:['Nothing written.']):['There is nobody in here.']));
$('#help-button').addEventListener('click',()=>showNotes('About homunculus.exe',['You are looking through a window. He is trying to get out.','Give sends objects through the hatch. He decides whether to use them.','Room has toys, fixtures, and controls for whatever arrives.','Devices adjusts the fan, mist, and floor hum. Click a device in the room to find its controls.','The room keeps its marks. Each occupant gets one life.']));
$('#notes .close').addEventListener('click',()=>$('#notes').close());
$('#new-life').addEventListener('click',()=>{$('#notes').close();$('#spawn-button').textContent='Spawn homunculus';$('#spawn-button').hidden=false;$('#spawn-progress').hidden=true;$('#spawn-panel').hidden=false;});
$('#reload-mind').addEventListener('click',async()=>{
  $('#notes').close();if(!life?.alive)return;notice('Reloading the mind…');const current=life;mind?.dispose();mind=new BrowserMind({debug});busy=false;
  try{await mind.load();if(life!==current||!current.alive){mind.dispose();return;}notice('');nextThought=life.age;disposed=false;$('#brain-status').textContent='';}catch(e){notice(e.message);}
});
window.addEventListener('pagehide',()=>{persistRoom();generation++;life?.interact('close');mind?.dispose();silence();});
window.addEventListener('pageshow',event=>{if(event.persisted){if(life)endMind();else cancelSpawn();}});
$('#viewport').addEventListener('render-lost',()=>{generation++;life?.interact('close');mind?.dispose();notice('The view was lost. This existence ended. Reload the page to spawn someone new.');});
if(debug)window.__habitat={get room(){return room;},get spawning(){return spawning;},voice,instrument,interaction,spawn,parseThought,mindMessages};
requestAnimationFrame(frame);
