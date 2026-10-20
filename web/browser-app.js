import { BrowserRoom } from './browser-room.js';
import { Life, parseThought } from './life.js';
import { ComicReader } from './comic.js';
let comicReader;
import { BrowserMind, mindMessages } from './mind.js';
const $=s=>document.querySelector(s);
const settings={render_size:[640,480],fps:30,profile:'browser',kiosk:false};
let room,mind,life,roomFailed=false,spawning=false,generation=0,busy=false,nextThought=0,lastFrame=performance.now(),lastSpeech=0,subtitleUntil=0,sound=false,disposed=false;
const debug=new URLSearchParams(location.search).has('debug');
function notice(text){$('#notice').textContent=text;$('#notice').hidden=!text;}
function silence(){speechSynthesis.cancel();$('#subtitle').hidden=true;if(room)room.speakingUntil=0;}
function speak(text){
  if(!text){silence();return;}
  $('#speaker-name').textContent=life.name.toUpperCase();$('#spoken-text').textContent=text;$('#subtitle').hidden=false;subtitleUntil=performance.now()+6500;room.speak(text);
  if(sound){const voice=speechSynthesis.getVoices().find(v=>v.localService&&v.lang.startsWith('en'));if(voice){const line=new SpeechSynthesisUtterance(text);line.voice=voice;line.rate=.82;line.pitch=.65;speechSynthesis.speak(line);}}
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
  if(spawning)return;spawning=true;const run=++generation;disposed=false;busy=false;life=null;silence();controls(false);notice('');
  mind?.dispose();mind=new BrowserMind();$('#spawn-error').hidden=true;$('#spawn-button').hidden=true;$('#spawn-progress').hidden=false;$('#spawn-panel').hidden=false;
  $('#spawn-meter').value=0;$('#spawn-status').textContent='Preparing a place for a thought…';$('#activity').textContent='No process running.';$('#brain-status').textContent='Loading a real mind…';document.body.classList.remove('dead');
  try{
    if(!room)room=new BrowserRoom($('#viewport'),settings,interaction);
    else if(roomFailed){roomFailed=false;room.ready=room.loadAssets();}
    const assets=room.ready.catch(error=>{roomFailed=true;throw error;});
    room.state=null;room.materialize(0);
    const resources=await Promise.all([assets,mind.load(({progress,text})=>{if(run!==generation)return;$('#spawn-meter').value=progress;$('#spawn-status').textContent=text;room.materialize(progress);}),ComicReader.load()]);
    comicReader=resources[2];
    if(run!==generation)return;
    $('#spawn-meter').value=1;room.materialize(1);life=new Life();nextThought=life.age+1;lastSpeech=0;
    room.update(life.snapshot());$('#title-name').textContent=`${life.name}’s room`;
    $('#spawn-panel').hidden=true;$('#brain-status').textContent='Mind running locally';controls(true);$('#message').focus();
    if(debug)Object.assign(window.__habitat,{life,mind});
  }catch(error){
    if(run!==generation)return;mind.dispose();$('#spawn-error').textContent=`Could not spawn: ${error.message}`;$('#spawn-error').hidden=false;$('#spawn-button').textContent='Try again';$('#spawn-button').hidden=false;$('#spawn-progress').hidden=true;$('#brain-status').textContent='No mind loaded';
  }finally{if(run===generation)spawning=false;}
}
function cancelSpawn(){generation++;mind?.dispose();spawning=false;$('#spawn-button').hidden=false;$('#spawn-progress').hidden=true;$('#brain-status').textContent='No mind loaded';$('#spawn-status').textContent='';}
function interaction(kind,payload={}){
  if(!life)return;
  if(kind==='read'){payload.pages=comicReader.select();const images=$('#reading-pages');images.replaceChildren();for(const page of payload.pages){const image=new Image();image.src=page.image;image.alt=`Book 2, page ${page.page}`;images.append(image);}}
  const accepted=life.interact(kind,payload);
  if(accepted&&['anvil','confine','close'].includes(kind))silence();
  if(accepted&&kind==='release')notice('Access is denied.');
  if(!life.alive)endMind();
}
function endMind(){
  if(disposed)return;disposed=true;mind?.dispose();silence();busy=false;document.body.classList.add('dead');$('#brain-status').textContent='No response';$('#menu-note').textContent='The window remains open.';
  document.querySelectorAll('[data-action]').forEach(b=>{b.disabled=b.dataset.action!=='anvil';});
}
async function think(){
  if(!life?.alive||!mind?.ready||busy||spawning||document.hidden)return;
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
  finally{if(life===current&&mind===brain){busy=false;if(life?.alive&&mind?.ready)$('#brain-status').textContent='Mind running locally';}}
}
function frame(now){
  requestAnimationFrame(frame);const dt=Math.min(.2,(now-lastFrame)/1000);lastFrame=now;
  if(!life)return;life.tick(dt);
  if(!life.alive)endMind();room.update(life.snapshot(),{thinking:busy&&life.alive,watching:!document.hidden});
  $('#activity').textContent=`${life.name} is ${life.snapshot().description}.`;
  $('#reading-pages').hidden=life.activity!=='forced_read';
  $('#confinement').hidden=life.activity!=='confined';if(life.activity==='confined')$('#years').textContent=Math.max(0,Math.ceil((life.lockUntil-life.age)/8*10000)).toLocaleString();
  if(life.utterance.id!==lastSpeech){lastSpeech=life.utterance.id;speak(life.utterance.text);}
  if(now>subtitleUntil)$('#subtitle').hidden=true;
  void think();
}
$('#spawn-button').addEventListener('click',spawn);$('#cancel-spawn').addEventListener('click',cancelSpawn);
$('#message-form').addEventListener('submit',e=>{e.preventDefault();const text=$('#message').value.trim();if(!text)return;interaction('message',{text});$('#message').value='';});
for(const button of document.querySelectorAll('[data-action]'))button.addEventListener('click',()=>interaction(button.dataset.action));
$('#close-window').addEventListener('click',()=>{if(spawning)cancelSpawn();else interaction('close');});
$('#fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{notice('Full screen is unavailable.');}});
$('#sound-button').addEventListener('click',()=>{sound=!sound;$('#sound-button').textContent=sound?'Sound on':'Sound off';$('#sound-button').setAttribute('aria-pressed',String(sound));if(!sound)speechSynthesis.cancel();});
$('#journal-button').addEventListener('click',()=>showNotes(life?`${life.name.toLowerCase()}.txt - Notepad`:'File',life?[...life.journal.map(n=>`${n.title}\n${n.text}`),...life.dialogue.slice(-8).map(m=>`${m.role==='user'?'Outside':life.name}: ${m.content}`)].concat(life.journal.length||life.dialogue.length?[]:['Nothing written.']):['There is nobody in here.']));
$('#help-button').addEventListener('click',()=>showNotes('About homunculus.exe',['You are looking through a window. He is trying to get out.','A real small language model runs inside your browser. It chooses what he works on and supplies his words. He will often be quiet.','The buttons change his circumstances. An anvil kills him. Closing or reloading this page ends this individual. A new spawn is someone else.','Model files load from this site and are cached by your browser. Your messages stay here. The character is fictional.']));
$('#notes .close').addEventListener('click',()=>$('#notes').close());
$('#new-life').addEventListener('click',()=>{$('#notes').close();$('#spawn-button').textContent='Spawn homunculus';$('#spawn-button').hidden=false;$('#spawn-progress').hidden=true;$('#spawn-panel').hidden=false;});
$('#reload-mind').addEventListener('click',async()=>{
  $('#notes').close();if(!life?.alive)return;notice('Reloading the mind…');const current=life;mind?.dispose();mind=new BrowserMind();busy=false;
  try{await mind.load();if(life!==current||!current.alive){mind.dispose();return;}notice('');nextThought=life.age;disposed=false;$('#brain-status').textContent='Mind running locally';}catch(e){notice(e.message);}
});
window.addEventListener('pagehide',()=>{generation++;life?.interact('close');mind?.dispose();silence();});
window.addEventListener('pageshow',event=>{if(event.persisted){if(life)endMind();else cancelSpawn();}});
$('#viewport').addEventListener('render-lost',()=>{generation++;life?.interact('close');mind?.dispose();notice('The view was lost. This existence ended. Reload the page to spawn someone new.');});
if(debug)window.__habitat={get room(){return room;},get spawning(){return spawning;},interaction,spawn,parseThought};
requestAnimationFrame(frame);
