const CHANNELS=[['fear','Fear'],['curiosity','Curiosity'],['irritation','Irritation'],['trust','Trust'],['energy','Energy']];
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
let serial=0;

// A view of the resident's existing state. It owns neither a clock nor a mind.
export function createInstrument({onAction}={}){
  const menu=document.querySelector('.menubar');
  if(!menu)throw new Error('The emotion instrument needs a window menubar.');
  const suffix=serial++?`-${serial}`:'',id=`emotion-instrument${suffix}`;
  const events=new AbortController(),listen=(node,type,fn)=>node?.addEventListener(type,fn,{signal:events.signal});
  const opener=document.createElement('button');
  opener.type='button';opener.id=`emotion-button${suffix}`;opener.textContent='Emotion meter';
  opener.setAttribute('aria-haspopup','dialog');opener.setAttribute('aria-controls',id);opener.setAttribute('aria-expanded','false');
  menu.insertBefore(opener,menu.querySelector('.menu-note')||menu.querySelector('#menu-note'));
  const panel=document.createElement('section');
  panel.id=id;panel.className='emotion-instrument';panel.hidden=true;
  panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','false');panel.setAttribute('aria-label','Emotion meter');
  const ticks=Array.from({length:11},(_,index)=>{
    const angle=Math.PI-index*Math.PI/10,outer=82,inner=index%5===0?71:77;
    return `<line x1="${123+Math.cos(angle)*inner}" y1="${95-Math.sin(angle)*inner}" x2="${123+Math.cos(angle)*outer}" y2="${95-Math.sin(angle)*outer}"/>`;
  }).join('');
  panel.innerHTML=`
    <header class="titlebar instrument-titlebar">
      <button class="instrument-handle" type="button" aria-label="Move emotion meter. Use arrow keys to move; Shift moves farther." title="Drag to move. Arrow keys also move this window."><span aria-hidden="true">▥</span> emotion.exe</button>
      <button type="button" class="close instrument-close" aria-label="Close emotion meter">×</button>
    </header>
    <div class="instrument-body">
      <div class="instrument-screen" aria-hidden="true">
        <svg class="instrument-dial" viewBox="0 0 246 110">
          <path class="instrument-arc" d="M41 95 A82 82 0 0 1 205 95"/>
          <g class="instrument-ticks">${ticks}</g>
          <text class="instrument-scale" x="34" y="106">0</text><text class="instrument-scale" x="123" y="10" text-anchor="middle">50</text><text class="instrument-scale" x="211" y="106" text-anchor="end">100</text>
          <text class="instrument-dial-label" x="123" y="57" text-anchor="middle">FEAR</text>
          <text class="instrument-dial-value" x="123" y="81" text-anchor="middle">—</text>
          <g class="instrument-needle"><path d="M123 95 L123 22"/><circle cx="123" cy="95" r="4"/></g>
        </svg>
        <svg class="instrument-trace" viewBox="0 0 246 36">
          <path class="instrument-grid" d="M4 5H242M4 18H242M4 31H242M4 5V31M64 5V31M123 5V31M183 5V31M242 5V31"/>
          <polyline class="instrument-trace-line" points=""/>
        </svg>
      </div>
      <div class="instrument-channels" aria-label="Meter channel">${CHANNELS.map(([key,label])=>`<button type="button" class="instrument-channel" data-channel="${key}" aria-pressed="${key==='fear'}"><span>${label}</span><b>—</b></button>`).join('')}</div>
    </div>
    <footer class="instrument-footer"><span class="instrument-lamp" aria-hidden="true"></span><span class="instrument-occupant">NO SIGNAL</span></footer>`;
  document.body.append(panel);
  const handle=panel.querySelector('.instrument-handle'),needle=panel.querySelector('.instrument-needle');
  const channelButtons=[...panel.querySelectorAll('[data-channel]')];
  const trace=panel.querySelector('.instrument-trace-line'),value=panel.querySelector('.instrument-dial-value'),label=panel.querySelector('.instrument-dial-label');
  const occupant=panel.querySelector('.instrument-occupant');
  let latest=null,selected='fear',history=[],sampledAt=-Infinity,position=null,drag=null,destroyed=false;

  function fit(){
    if(panel.hidden||destroyed)return;
    const view=window.visualViewport;
    const left=(view?.offsetLeft||0)+6,top=(view?.offsetTop||0)+6;
    const width=Math.max(0,(view?.width||window.innerWidth)-12),height=Math.max(0,(view?.height||window.innerHeight)-12);
    panel.style.width=`${Math.min(280,width)}px`;panel.style.maxHeight=`${height}px`;
    const box=panel.getBoundingClientRect();
    position??={x:left+width-box.width,y:top+48};
    position.x=clamp(position.x,left,Math.max(left,left+width-box.width));
    position.y=clamp(position.y,top,Math.max(top,top+height-box.height));
    panel.style.left=`${position.x}px`;panel.style.top=`${position.y}px`;
  }
  function render(){
    const active=latest?.active,reading=active?latest.values[selected]:0;
    panel.classList.toggle('has-signal',!!active);
    needle.style.transform=`rotate(${reading*1.8-90}deg)`;
    value.textContent=active?String(Math.round(reading)):'—';
    label.textContent=CHANNELS.find(([key])=>key===selected)[1].toUpperCase();
    occupant.textContent=active?latest.name:'NO SIGNAL';
    for(const button of channelButtons){
      const key=button.dataset.channel,text=active?String(Math.round(latest.values[key])):'—';
      button.querySelector('b').textContent=text;
      button.setAttribute('aria-pressed',String(key===selected));
      button.setAttribute('aria-label',`${CHANNELS.find(([channel])=>channel===key)[1]}: ${active?text:'no signal'}`);
    }
    trace.setAttribute('points',active?history.map((sample,index)=>`${(4+(100-history.length+index)*238/99).toFixed(1)},${(31-sample[selected]*.26).toFixed(1)}`).join(' '):'');
  }
  function sample(){
    if(!latest?.active||latest.age-sampledAt<.2-1e-6)return false;
    history.push({...latest.values});if(history.length>100)history.shift();sampledAt=latest.age;return true;
  }
  function releasePointer(){
    const pointer=drag;drag=null;
    if(pointer&&handle.hasPointerCapture(pointer.id))handle.releasePointerCapture(pointer.id);
  }
  function hide(){
    if(destroyed||panel.hidden)return;
    const returnFocus=panel.contains(document.activeElement);
    releasePointer();panel.hidden=true;opener.setAttribute('aria-expanded','false');
    if(returnFocus)opener.focus({preventScroll:true});
  }
  function toggle(){
    if(destroyed)return;
    if(!panel.hidden){hide();return;}
    if(latest&&latest.age-sampledAt>.4){history=[];sampledAt=-Infinity;}
    panel.hidden=false;opener.setAttribute('aria-expanded','true');sample();render();fit();handle.focus({preventScroll:true});
  }
  function update(snapshot){
    if(destroyed)return;
    const active=!!snapshot?.alive&&!snapshot.outcome&&CHANNELS.every(([key])=>Number.isFinite(snapshot.affect?.[key]));
    const age=Number.isFinite(snapshot?.age)?snapshot.age:performance.now()/1000;
    const name=String(snapshot?.name||'');
    const reset=!active||latest?.name!==name||latest?.active!==active||age<(latest?.age??age);
    if(reset){history=[];sampledAt=-Infinity;}
    latest={active,age,name,values:Object.fromEntries(CHANNELS.map(([key])=>[key,active?clamp(snapshot.affect[key],0,100):0]))};
    if(!panel.hidden&&(sample()||reset))render();
  }
  listen(opener,'click',toggle);listen(panel.querySelector('.instrument-close'),'click',hide);
  for(const button of channelButtons)listen(button,'click',()=>{selected=button.dataset.channel;render();});
  listen(panel,'keydown',event=>{
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();hide();}
  });
  listen(handle,'keydown',event=>{
    const directions={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]},delta=directions[event.key];
    if(!delta)return;
    event.preventDefault();const step=event.shiftKey?32:8;
    position.x+=delta[0]*step;position.y+=delta[1]*step;fit();
  });
  listen(handle,'pointerdown',event=>{
    if(event.button!==0||event.isPrimary===false)return;
    event.preventDefault();handle.focus({preventScroll:true});
    drag={id:event.pointerId,x:event.clientX,y:event.clientY,left:position.x,top:position.y};
    handle.setPointerCapture(event.pointerId);
  });
  listen(handle,'pointermove',event=>{
    if(!drag||drag.id!==event.pointerId)return;
    position={x:drag.left+event.clientX-drag.x,y:drag.top+event.clientY-drag.y};fit();
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture'])listen(handle,type,event=>{if(drag?.id===event.pointerId)releasePointer();});
  listen(window,'resize',fit);listen(window.visualViewport,'resize',fit);listen(window.visualViewport,'scroll',fit);
  return {update,toggle,hide,destroy(){if(destroyed)return;hide();destroyed=true;events.abort();panel.remove();opener.remove();history=[];latest=null;}};
}
