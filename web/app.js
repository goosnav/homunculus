import { Room } from './room.js';
import { Voice } from './speech.js';
const $=s=>document.querySelector(s), voice=new Voice();
let token,room,current,lastUtterance=0,subtitleTimer,firstRun=false;
let temporaryNotice='',noticeUntil=0;
const settingsDialog=$('#settings-dialog'), settingsForm=$('#settings-form');
function notice(text,temporary=false){$('#notice').textContent=text;$('#notice').hidden=!text;if(temporary){temporaryNotice=text;noticeUntil=Date.now()+6500;}}
async function api(path,data){const response=await fetch(path,{method:data?'POST':'GET',headers:data?{'Content-Type':'application/json','X-Habitat-Token':token}:{},body:data?JSON.stringify(data):undefined,signal:AbortSignal.timeout(8000)});const value=await response.json();if(!response.ok)throw Error(value.error||'The habitat could not complete that request.');return value;}
function sync(data){
  current=data;const s=data.simulation,cfg=data.settings;
  room?.update(s);if(room&&(room.settings.profile!==cfg.profile))room.configure({...cfg,kiosk:data.kiosk});
  voice.configure(cfg,data.voice.host);
  $('#title-name').textContent=`${cfg.name}’s room`;$('#speaker-name').textContent=cfg.name.toUpperCase();
  $('#activity').textContent=`${cfg.name} is ${s.description}.`;
  const mins=Math.floor(s.age/60);$('#room-time').textContent=`${String(Math.floor(mins/60)).padStart(2,'0')}:${String(mins%60).padStart(2,'0')}`;
  $('#brain-dot').className=data.brain.status;
  $('#brain-status').textContent=({thinking:'A thought is forming',offline:'Mind disconnected',connected:'Somebody’s home',waiting:'Waking up'})[data.brain.status]||'Quiet';
  $('#sound-button').textContent=cfg.tts?'Sound on':'Sound off';$('#sound-button').setAttribute('aria-pressed',String(cfg.tts));
  if(Date.now()<noticeUntil)notice(temporaryNotice);else notice(data.brain.error||data.warning||data.voice.error);
  if(!cfg.subtitles)$('#subtitle').hidden=true;
  if(s.utterance.id>lastUtterance){
    lastUtterance=s.utterance.id;$('#spoken-text').textContent=s.utterance.text;
    $('#subtitle').hidden=!cfg.subtitles;room?.speak(s.utterance.text);voice.say(s.utterance.text);
    clearTimeout(subtitleTimer);subtitleTimer=setTimeout(()=>$('#subtitle').hidden=true,Math.max(8000,s.utterance.text.length*75));
  }
}
async function interaction(kind,payload){voice.unlock();try{await api('/api/interact',{kind,...payload});$('#interaction-tip').style.opacity=0;}catch(e){notice(e.message,true);}}
function fillSettings(){
  const cfg=current.settings;for(const name of ['name','goal','profile','model','endpoint'])settingsForm.elements[name].value=cfg[name];
  for(const name of ['tts','subtitles'])settingsForm.elements[name].checked=cfg[name];
  $('#pull-command').textContent=`ollama pull ${cfg.model}`;
  $('#voice-info').textContent=current.voice.host?'Using this computer’s system voice.':'Using an installed local browser voice when available. Subtitles work without a voice.';
  $('#settings-error').hidden=true;
}
function openSettings(){fillSettings();$('#dialog-title').textContent=firstRun?'Welcome to Homunculus':'Habitat properties';$('#save-settings').textContent=firstRun?'Let him settle in':'Apply';$('.welcome').hidden=!firstRun;settingsDialog.showModal();}
settingsForm.elements.model.addEventListener('input',()=>$('#pull-command').textContent=`ollama pull ${settingsForm.elements.model.value}`);
settingsForm.addEventListener('submit',async e=>{
  e.preventDefault();voice.unlock();const button=$('#save-settings');button.disabled=true;
  const patch={configured:true};for(const name of ['name','goal','profile','model','endpoint'])patch[name]=settingsForm.elements[name].value;
  for(const name of ['tts','subtitles'])patch[name]=settingsForm.elements[name].checked;
  try{await api('/api/settings',patch);firstRun=false;settingsDialog.close();sync(await api('/api/state'));}
  catch(error){$('#settings-error').textContent=error.message;$('#settings-error').hidden=false;}finally{button.disabled=false;}
});
$('#settings-button').addEventListener('click',openSettings);
$('#sound-button').addEventListener('click',async()=>{voice.unlock();try{await api('/api/settings',{tts:!current.settings.tts});sync(await api('/api/state'));}catch(e){notice(e.message,true);}});
$('#about-button').addEventListener('click',()=>$('#about-dialog').showModal());
for(const button of document.querySelectorAll('.dialog-close'))button.addEventListener('click',()=>{if(button.closest('dialog')===settingsDialog&&firstRun)return;button.closest('dialog').close();});
settingsDialog.addEventListener('cancel',e=>{if(firstRun)e.preventDefault();});
$('#message-form').addEventListener('submit',async e=>{
  e.preventDefault();voice.unlock();const input=$('#message'),text=input.value.trim();if(!text)return;const button=e.submitter;button.disabled=true;
  try{await api('/api/interact',{kind:'message',text});input.value='';notice('Your voice reached the room.',true);$('#interaction-tip').style.opacity=0;}
  catch(error){notice(error.message,true);}finally{button.disabled=false;input.focus();}
});
$('#fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('#habitat-window').requestFullscreen();}catch{notice('This window does not support full screen.',true);}});
$('#hide-window').addEventListener('click',()=>{$('#habitat-window').hidden=true;$('#restore-window').hidden=false;$('#restore-window').focus();});
$('#restore-window').addEventListener('click',()=>{$('#habitat-window').hidden=false;$('#restore-window').hidden=true;$('#message').focus();});
$('#viewport').addEventListener('render-lost',()=>notice('The graphics connection was lost. Reload this window to reconnect. Your creature is still here.'));
document.addEventListener('pointerdown',()=>voice.unlock(),{once:true});
async function poll(){
  try{sync(await api('/api/state'));}catch{notice('The habitat is disconnected. Restart Homunculus to reconnect.');$('#brain-status').textContent='Habitat disconnected';$('#brain-dot').className='offline';}
  setTimeout(poll,document.hidden?2000:250);
}
async function start(){
  try{
    const data=await api('/api/bootstrap');token=data.token;current=data;lastUtterance=data.simulation.utterance.id;
    document.body.classList.toggle('kiosk',data.kiosk);
    try{room=new Room($('#viewport'),{...data.settings,kiosk:data.kiosk},interaction);await room.ready;$('#scene-loading').hidden=true;}
    catch(error){$('#scene-loading').textContent='The room could not be drawn. This device needs WebGL 2. Try a current browser with graphics acceleration.';console.error(error);}
    sync(data);firstRun=!data.settings.configured&&!data.kiosk;if(firstRun)openSettings();
    setTimeout(()=>$('#interaction-tip').style.opacity=0,24000);poll();
  }catch(error){$('#scene-loading').textContent='The habitat could not start. Keep the Homunculus launcher running, then reload this window.';console.error(error);}
}
start();
