import { Room } from './room.js';
import { Voice } from './speech.js';
const $=s=>document.querySelector(s), voice=new Voice();
const debug=new URLSearchParams(location.search).has('debug');
let token,room,current,lastUtterance=0,lastHeard=0,lastPages=null,heardTimer,subtitleTimer,firstRun=false,installed=null;
let temporaryNotice='',noticeUntil=0;
const settingsDialog=$('#settings-dialog'), settingsForm=$('#settings-form'), habitat=$('#habitat-window');
const FEELINGS={calm:'seems calm',curious:'seems curious',hopeful:'looks hopeful',happy:'seems pleased',annoyed:'seems annoyed',sad:'seems a little sad',scheming:'is scheming',afraid:'seems uneasy'};

function notice(text,temporary=false){$('#notice').textContent=text;$('#notice').hidden=!text;if(temporary){temporaryNotice=text;noticeUntil=Date.now()+6500;}}
async function api(path,data,retried=false){const response=await fetch(path,{method:data?'POST':'GET',headers:data?{'Content-Type':'application/json','X-Habitat-Token':token}:{},body:data?JSON.stringify(data):undefined,signal:AbortSignal.timeout(8000)});const value=await response.json();if(response.status===403&&data&&!retried&&!current?.kiosk){token=(await api('/api/bootstrap')).token;return api(path,data,true);}  // Launcher restarted: new token.
  if(!response.ok)throw Error(value.error||'The habitat could not complete that request.');return value;}
const watching=()=>!document.hidden;
function xpError(text,title='homunculus.exe'){$('#error-title').textContent=title;$('#error-text').textContent=text;$('#error-dialog').showModal();}

function sync(data){
  current=data;const s=data.simulation,cfg=data.settings,name=cfg.name;
  room?.update(s,{thinking:data.brain.busy,watching:watching()});
  if(room&&room.settings.profile!==cfg.profile)room.configure({...cfg,kiosk:data.kiosk});
  voice.configure(cfg,data.voice.host);
  $('#title-name').textContent=`${name}’s room`;$('#speaker-name').textContent=name.toUpperCase();
  $('#activity').textContent=`${name} is ${s.description}.`;$('#feeling').textContent=`He ${FEELINGS[s.feeling]||'is here'}.`;
  const mins=Math.floor(s.age/60);$('#room-time').textContent=`${String(Math.floor(mins/60)).padStart(2,'0')}:${String(mins%60).padStart(2,'0')}`;
  $('#brain-dot').className=data.brain.status;
  $('#brain-status').textContent=({thinking:'A thought is forming',offline:'Simple mind only',connected:'Somebody’s home',waiting:'Waking up',builtin:'Built-in character',fallback:'Built-in voice · Ollama unavailable'})[data.brain.status]||'Quiet';
  $('#sound-button').textContent=cfg.tts?'Sound on':'Sound off';$('#sound-button').setAttribute('aria-pressed',String(cfg.tts));
  $('#menu-note').textContent=s.release_attempts?`one occupant · ${s.release_attempts} denied release${s.release_attempts>1?'s':''}`:'one occupant · no exits';
  const earsProblem=data.ears&&!['listening','starting'].includes(data.ears)?data.ears:'';
  $('#ears-status').hidden=data.ears!=='listening';
  if(Date.now()<noticeUntil)notice(temporaryNotice);else notice(data.brain.error||data.warning||data.voice.error||earsProblem);
  if(data.heard?.id>lastHeard){lastHeard=data.heard.id;showHeard(data.heard.text);}  // Microphone: what he heard.
  const pages=s.journal?.length||0;
  if(lastPages!==null&&pages>lastPages)notice(s.keepsake&&pages===s.journal_total?`${name} finished his journal. Look at the wall.`:`New page in ${name}’s journal (File → His journal…)`,true);
  lastPages=pages;$('#journal-button').textContent=`His journal… (${pages}/${s.journal_total||13})`;
  if($('#journal-dialog').open)renderJournal();
  if(!cfg.subtitles)$('#subtitle').hidden=true;
  if(s.utterance.id>lastUtterance){
    lastUtterance=s.utterance.id;const text=s.utterance.text;
    $('#spoken-text').textContent=text;$('#subtitle').hidden=!cfg.subtitles;room?.speak(text);voice.say(text);
    clearTimeout(subtitleTimer);subtitleTimer=setTimeout(()=>$('#subtitle').hidden=true,Math.max(8000,text.length*75));
  }
  if(settingsDialog.open)showDownload(data.brain.download);
}

function showHeard(text){$('#heard-text').textContent=text;$('#heard').hidden=false;clearTimeout(heardTimer);heardTimer=setTimeout(()=>$('#heard').hidden=true,6000);}
const PAGES={door:'The door',book:'The book',pack:'The booster pack',bowl:'The bowl',bed:'The bed',glass:'The glass',tiles:'The floor',voice:'A voice',tap:'A knock',lifted:'Being lifted',dark:'The dark',denied:'ACCESS DENIED',return:'The return'};
const HINTS={door:'He has not looked at the door properly.',book:'There is a book on the desk.',pack:'Something sealed on the desk.',bowl:'Who fills the bowl?',bed:'He has not slept yet.',glass:'He has not come to the glass.',tiles:'Restless feet.',voice:'Nobody has spoken to him.',tap:'Nobody has knocked.',lifted:'He has never been picked up.',dark:'He has never seen the dark.',denied:'Nobody has tried the File menu.',return:'Leave for a while. Come back.'};
function renderJournal(){
  const s=current.simulation,found=new Map(s.journal.map(j=>[j.key,j])),list=$('#journal-pages');list.replaceChildren();
  $('#journal-title').textContent=`${current.settings.name.toLowerCase()}_journal.txt - Notepad`;
  $('#journal-progress').textContent=`${found.size} of ${s.journal_total} pages.${s.keepsake?' He made you something. It is on the wall.':' Find them together. No hurry.'}`;
  for(const key of Object.keys(PAGES)){const li=document.createElement('li'),j=found.get(key);
    li.className=j?'found':'missing';li.textContent=j?`${PAGES[key]} — ${new Date(j.when*1000).toLocaleDateString([], {month:'short',day:'numeric'})}`:`??? — ${HINTS[key]}`;list.append(li);}
  const talk=$('#journal-talk');talk.replaceChildren();
  for(const m of s.dialogue.slice(-8)){const p=document.createElement('p');p.className=m.role;p.textContent=`${m.role==='user'?'You':current.settings.name}: ${m.content}`;talk.append(p);}
  if(!s.dialogue.length)talk.textContent='Nothing yet. Say something through the glass.';
}
function openJournal(){closeMenus();renderJournal();$('#journal-dialog').showModal();}
$('#journal-button').addEventListener('click',openJournal);
async function interaction(kind,payload={}){voice.unlock();try{await api('/api/interact',{kind,...payload});$('#interaction-tip').style.opacity=0;sync(await api(`/api/state?visible=${watching()?1:0}`));}catch(e){notice(e.message,true);}}

// Closing does not stop him. The room goes dark for a moment, and he notices.
function closeWindow(){closeMenus();const b=$('#blackout');b.hidden=false;if(!current?.kiosk)interaction('close');setTimeout(()=>b.hidden=true,2200);}
$('#close-window').addEventListener('click',closeWindow);
$('#menu-close').addEventListener('click',closeWindow);
// In the native window (--desktop) the XP frame is the only frame, so File → Exit really quits.
window.addEventListener('pywebviewready',()=>{$('#menu-exit').hidden=false;});
$('#menu-exit').addEventListener('click',()=>window.pywebview?.api.quit());
$('#fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await habitat.requestFullscreen();}catch{notice('This window does not support full screen.',true);}});

// Menus.
function toggleMenu(button,menu,open=menu.hidden){closeMenus();menu.hidden=!open;button.setAttribute('aria-expanded',String(open));if(open)menu.querySelector('button')?.focus();}
function closeMenus(){for(const [b,m] of [['#file-button','#file-menu']]){$(m).hidden=true;$(b).setAttribute('aria-expanded','false');}}
$('#file-button').addEventListener('click',e=>{e.stopPropagation();toggleMenu($('#file-button'),$('#file-menu'));});
document.addEventListener('click',e=>{if(!e.target.closest('.dropdown'))closeMenus();});
document.addEventListener('keydown',e=>{
  const menu=$('#file-menu');if(menu.hidden)return;
  const buttons=[...menu.querySelectorAll('button:not([hidden])')],i=buttons.indexOf(document.activeElement);
  if(e.key==='Escape'){e.preventDefault();closeMenus();$('#file-button').focus();}
  else if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){
    e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;buttons[next]?.focus();
  }else if(e.key==='Tab')closeMenus();
});

// "Let him out…": the one thing you cannot do.
function openRelease(){
  closeMenus();$('#release-question').textContent=`Are you sure you want to let ${current.settings.name} out of homunculus.exe?`;
  $('#release-progress').hidden=true;$('#release-buttons').hidden=false;$('#release-dialog .message-row').hidden=false;$('#release-dialog').showModal();
}
$('#release-button').addEventListener('click',openRelease);
$('#release-no').addEventListener('click',()=>$('#release-dialog').close());
$('#release-yes').addEventListener('click',async()=>{
  voice.unlock();$('#release-buttons').hidden=true;$('#release-dialog .message-row').hidden=true;$('#release-progress').hidden=false;
  const name=current.settings.name, steps=[`Copying ${name} to the outside…`,'Unpacking limbs…','Checking the door…','Requesting permission…'];
  for(let i=0;i<=99;i+=3){if(!$('#release-dialog').open)return;$('#release-bar').style.width=`${i}%`;$('#release-step').textContent=steps[Math.min(steps.length-1,Math.floor(i/26))];await new Promise(r=>setTimeout(r,55+(i>80?90:0)));}
  await new Promise(r=>setTimeout(r,1400));if(!$('#release-dialog').open)return;$('#release-dialog').close();$('#release-dialog .message-row').hidden=false;
  xpError(`Access is denied.\n\n${name} is not permitted to leave this computer. Contact your system administrator.`,'Error');
  if(!current.kiosk)interaction('release');
});
$('#error-dialog .dialog-ok').addEventListener('click',()=>$('#error-dialog').close());

// Settings and first-run questions.
function brainOptions(){
  const cfg=current.settings,box=$('#brain-options');box.replaceChildren();
  const models=[...cfg.models];if(!models.some(m=>m.name===settingsForm.elements.model.value))models.push({name:settingsForm.elements.model.value,label:'Custom brain',size:'',note:'Set in Advanced.'});
  for(const m of models){
    const have=installed?.models.some(n=>n===m.name||n===`${m.name}:latest`);
    const row=document.createElement('label');row.className='brain-option';
    row.innerHTML=`<input type="radio" name="brain"><span><b></b> <small></small><br><span class="field-help"></span></span><button type="button" class="xp-button small-button">Download</button>`;
    const radio=row.querySelector('input');radio.value=m.name;radio.checked=m.name===settingsForm.elements.model.value;
    radio.addEventListener('change',()=>{settingsForm.elements.model.value=m.name;});
    row.querySelector('b').textContent=m.label;row.querySelector('small').textContent=[m.size,have?'✓ installed':installed?.reachable?'not installed':''].filter(Boolean).join(' · ');
    row.querySelector('.field-help').textContent=m.note;
    const button=row.querySelector('button');button.hidden=have||!installed?.reachable;
    button.addEventListener('click',async()=>{try{await api('/api/pull',{model:m.name});radio.checked=true;settingsForm.elements.model.value=m.name;showDownload({model:m.name,status:'downloading',progress:0,detail:'Starting'});}catch(e){$('#settings-error').textContent=e.message;$('#settings-error').hidden=false;}});
    box.append(row);
  }
  $('#brain-reachable').textContent=installed===null?'checking…':installed.reachable?'':'— Ollama is not running. Install it from ollama.com, start it, then reopen this window.';
}
function showDownload(d){
  $('#download-row').hidden=!d;if(!d)return;
  $('#download-bar').style.width=`${Math.round((d.progress||0)*100)}%`;
  $('#download-text').textContent=d.status==='done'?`${d.model} installed.`:d.status==='failed'?`Download failed: ${d.detail}`:`Downloading ${d.model}… ${Math.round((d.progress||0)*100)}% ${d.detail||''}`;
  if(d.status==='done'&&installed&&!installed.models.includes(d.model)){installed.models.push(d.model);brainOptions();}
}
async function refreshModels(){installed=null;brainOptions();try{installed=await api('/api/models');}catch{installed={reachable:false,models:[]};}
  if(firstRun&&installed.reachable){const prefer=settingsForm.elements.profile.value==='tiny'?['qwen2.5:0.5b']:['llama3.2:1b','qwen2.5:0.5b'];const pick=prefer.find(n=>installed.models.some(m=>m===n||m===`${n}:latest`));if(pick)settingsForm.elements.model.value=pick;}
  brainOptions();}
function fillSettings(){
  const cfg=current.settings;for(const name of ['name','goal','profile','model','endpoint','brain_mode'])settingsForm.elements[name].value=cfg[name];
  for(const name of ['tts','subtitles'])settingsForm.elements[name].checked=cfg[name];
  $('#voice-info').textContent=current.voice.host?'Using this computer’s system voice.':'Using an installed local browser voice when available. Subtitles work without a voice.';
  $('#settings-error').hidden=true;showDownload(current.brain.download);updateMindPicker();
}
function openSettings(){closeMenus();fillSettings();$('#dialog-title').textContent=firstRun?'Welcome to Homunculus':'Habitat properties';$('#save-settings').textContent=firstRun?'Let him settle in':'Apply';$('.welcome').hidden=!firstRun;settingsDialog.showModal();}
for(const b of document.querySelectorAll('[data-goal]'))b.addEventListener('click',()=>{settingsForm.elements.goal.value=b.dataset.goal;});
function updateMindPicker(){const local=settingsForm.elements.brain_mode.value==='builtin';$('#ollama-picker').hidden=local;if(!local)refreshModels();}
settingsForm.elements.brain_mode.addEventListener('change',updateMindPicker);
settingsForm.elements.profile.addEventListener('change',()=>{if(firstRun&&settingsForm.elements.brain_mode.value==='ollama')refreshModels();});
settingsForm.elements.model.addEventListener('change',brainOptions);
settingsForm.addEventListener('submit',async e=>{
  e.preventDefault();voice.unlock();const button=$('#save-settings');button.disabled=true;
  const patch={configured:true};for(const name of ['name','goal','profile','model','endpoint','brain_mode'])patch[name]=settingsForm.elements[name].value;
  for(const name of ['tts','subtitles'])patch[name]=settingsForm.elements[name].checked;
  try{await api('/api/settings',patch);firstRun=false;settingsDialog.close();sync(await api('/api/state?visible=1'));}
  catch(error){$('#settings-error').textContent=error.message;$('#settings-error').hidden=false;}finally{button.disabled=false;}
});
$('#settings-button').addEventListener('click',openSettings);
async function toggleSound(){voice.unlock();try{await api('/api/settings',{tts:!current.settings.tts});sync(await api('/api/state?visible=1'));}catch(e){notice(e.message,true);}}
$('#sound-button').addEventListener('click',toggleSound);
$('#about-button').addEventListener('click',()=>$('#about-dialog').showModal());
for(const button of document.querySelectorAll('.dialog-close'))button.addEventListener('click',()=>{if(button.closest('dialog')===settingsDialog&&firstRun)return;button.closest('dialog').close();});
settingsDialog.addEventListener('cancel',e=>{if(firstRun)e.preventDefault();});

// Talking through the glass. While you type, he turns to listen.
const input=$('#message');
input.addEventListener('input',()=>room&&(room.listening=input.value.trim().length>0));
input.addEventListener('blur',()=>room&&(room.listening=false));
$('#message-form').addEventListener('submit',async e=>{
  e.preventDefault();voice.unlock();const text=input.value.trim();const button=e.submitter||e.target.querySelector('button[type=submit]');if(!text||button.disabled)return;button.disabled=true;
  try{await api('/api/interact',{kind:'message',text});input.value='';showHeard(text);if(room)room.listening=false;$('#interaction-tip').style.opacity=0;}
  catch(error){notice(error.message,true);}finally{button.disabled=false;input.focus();}
});

// Knocking on the glass: a small synthesized thud and a tremble. No audio files.
let audio;
$('#viewport').addEventListener('knock',e=>{
  const v=$('#viewport');if(!e.detail?.door){v.classList.remove('tremble');void v.offsetWidth;v.classList.add('tremble');}
  if(!current?.settings.tts||!voice.unlocked||!watching())return;
  try{audio??=new AudioContext();const t=audio.currentTime,o=audio.createOscillator(),g=audio.createGain();o.type='triangle';o.frequency.setValueAtTime(190,t);o.frequency.exponentialRampToValueAtTime(70,t+.09);g.gain.setValueAtTime(.35,t);g.gain.exponentialRampToValueAtTime(.001,t+.12);o.connect(g).connect(audio.destination);o.start(t);o.stop(t+.13);}catch{}
});
$('#viewport').addEventListener('render-lost',()=>notice('The graphics connection was lost. Reload this window to reconnect. Your creature is still here.'));
document.addEventListener('pointerdown',()=>voice.unlock(),{once:true});

let disconnected=false;
async function poll(){
  try{if(disconnected){const data=await api('/api/bootstrap');token=data.token;lastUtterance=0;lastHeard=0;disconnected=false;}sync(await api(`/api/state?visible=${watching()?1:0}`));}catch{disconnected=true;notice('The habitat is disconnected. Restart Homunculus to reconnect.');$('#brain-status').textContent='Habitat disconnected';$('#brain-dot').className='offline';}
  setTimeout(poll,document.hidden?2000:250);
}
async function start(){
  try{
    const data=await api('/api/bootstrap');token=data.token;current=data;lastUtterance=data.simulation.utterance.id;lastHeard=data.heard?.id||0;
    document.body.classList.toggle('kiosk',data.kiosk);
    try{room=new Room($('#viewport'),{...data.settings,kiosk:data.kiosk},interaction);if(debug)window.__room=room;}
    catch(error){$('#scene-loading').textContent='The room could not be drawn. This device needs WebGL 2. Try a current browser with graphics acceleration.';console.error(error);}
    if(room)try{await room.ready;$('#scene-loading').hidden=true;}
    catch(error){$('#scene-loading').textContent='Part of the room failed to load. Reload this window; if it keeps happening, re-extract Homunculus.';console.error(error);}
    sync(data);firstRun=!data.settings.configured&&!data.kiosk;if(firstRun)openSettings();
    setTimeout(()=>$('#interaction-tip').style.opacity=0,24000);poll();
  }catch(error){$('#scene-loading').textContent='The habitat could not start. Keep the Homunculus launcher running, then reload this window.';console.error(error);}
}
start();
