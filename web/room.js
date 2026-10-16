import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const palette = { wall:0xb2b39a, side:0x8c9b86, edge:0x53685d, wood:0x887259, dark:0x39463e, cream:0xe4d9b4, bed:0x727e6b };
const materialCache = new Map();
function mat(color) {
  if (!materialCache.has(color)) materialCache.set(color,new THREE.MeshLambertMaterial({color,flatShading:true}));
  return materialCache.get(color);
}
function canvasTexture(width,height,draw){
  const c=document.createElement('canvas');c.width=width;c.height=height;draw(c.getContext('2d'),width,height);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.magFilter=THREE.NearestFilter;t.minFilter=THREE.NearestFilter;t.generateMipmaps=false;return t;
}
const _q=new THREE.Quaternion(),_e=new THREE.Euler(),_v=new THREE.Vector3();  // Reused every frame: no garbage on small devices.
const damp=THREE.MathUtils.damp, clamp=THREE.MathUtils.clamp;
function angleTo(from,to){return Math.atan2(Math.sin(to-from),Math.cos(to-from));}
// Seat transforms: feet planted at the seat point; the body pivots at the feet.
const LIE={y:.76,tilt:-Math.PI/2}, SIT={y:-.26};
// A fixed view through the glass, like looking into a fishtank: front-on, a little above his eye line, close
// enough that he is the subject. The camera never moves. The vertical field of view widens only as far as a
// narrow window needs to keep his whole box (BOX) in sight; the room runs past every edge, so nothing is cut off.
export const EYE=new THREE.Vector3(0,2.15,6.4), LOOK=new THREE.Vector3(0,1.05,0), BASE_FOV=42;
export const BOX={x:2.8,front:1.3};
export const BOX_HALF_ANGLE=Math.atan((BOX.x+.35)/(EYE.z-BOX.front));

export class Room {
  constructor(container, settings, onInteraction){
    this.container=container;this.settings=settings;this.onInteraction=onInteraction;
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0x263d37);
    this.camera=new THREE.PerspectiveCamera(BASE_FOV,4/3,.1,90);this.camera.position.copy(EYE);this.camera.lookAt(LOOK);
    this.renderer=new THREE.WebGLRenderer({antialias:false,alpha:false,powerPreference:'low-power'});
    this.renderer.setPixelRatio(1);this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.toneMapping=THREE.NoToneMapping;
    this.container.prepend(this.renderer.domElement);
    new ResizeObserver(()=>this.resize()).observe(this.container);
    this.configure(settings);
    this.hemi=new THREE.HemisphereLight(0xf6eed0,0x536757,2);this.scene.add(this.hemi);
    this.sun=new THREE.DirectionalLight(0xffe3b3,2.3);this.sun.position.set(-3,7,5);this.scene.add(this.sun);
    this.lamp=new THREE.PointLight(0xffc56b,0,5,1.6);this.lamp.position.set(2.72,1.45,-1.6);this.scene.add(this.lamp);
    this.resident=new THREE.Group();this.scene.add(this.resident);
    this.body=new THREE.Group();this.resident.add(this.body);
    this.resident.position.set(0,0,.75);this.bones={};this.rest={};this.state=null;this.lastFrame=0;this.dragging=false;
    this.listening=false;this.watching=true;this.knockPhase=0;this.speakingUntil=0;
    this.raycaster=new THREE.Raycaster();this.pointer=new THREE.Vector2();this.ground=new THREE.Plane(new THREE.Vector3(0,1,0),0);
    this.overlay=document.createElement('div');this.overlay.className='head-overlay';this.overlay.setAttribute('aria-hidden','true');this.container.append(this.overlay);
    this.buildRoom();this.bindPointer();this.setDaylight(new Date());
    this.ready=this.loadAssets();
    this.frame=this.frame.bind(this);this.raf=requestAnimationFrame(this.frame);
  }
  configure(settings){this.settings=settings;this.resize();}
  resize(){
    const r=this.container.getBoundingClientRect(), aspect=r.width>0&&r.height>0?r.width/r.height:4/3;
    const h=this.settings.render_size[1], w=Math.max(1,Math.round(h*aspect));  // Low-res pixels, any shape.
    this.renderer.setSize(w,h,false);
    const c=this.camera;c.aspect=aspect;
    c.fov=Math.max(BASE_FOV,2*Math.atan(Math.tan(BOX_HALF_ANGLE)/aspect)*180/Math.PI);c.updateProjectionMatrix();
  }
  box(size,position,color){const o=new THREE.Mesh(new THREE.BoxGeometry(...size),mat(color));o.position.set(...position);this.scene.add(o);return o;}
  plane(size,position,texture){const o=new THREE.Mesh(new THREE.PlaneGeometry(...size),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));o.position.set(...position);this.scene.add(o);return o;}
  blob(x,z,sx,sz,opacity=.15){const m=new THREE.Mesh(new THREE.CircleGeometry(1,20),new THREE.MeshBasicMaterial({color:0x152a22,transparent:true,opacity,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.set(x,.012,z);m.scale.set(sx,sz,1);this.scene.add(m);return m;}
  buildRoom(){
    const checker=canvasTexture(128,128,(c,w,h)=>{
      c.fillStyle='#c6bf9d';c.fillRect(0,0,w,h);c.fillStyle='#8b9a83';c.fillRect(0,0,64,64);c.fillRect(64,64,64,64);
      for(let i=0;i<250;i++){const x=(i*43)%128,y=(i*71)%128;c.fillStyle=i%2?'#00000008':'#ffffff0d';c.fillRect(x,y,2,1);}
      c.strokeStyle='#53665025';c.strokeRect(0,0,64,64);c.strokeRect(64,64,64,64);
    });checker.wrapS=checker.wrapT=THREE.RepeatWrapping;
    // No visible edges: the floor runs past the frame toward the glass, the walls run up and away out of
    // sight. He is held in place by an invisible box (world.py BOUNDS), not by anything you can see.
    const FAR=60;checker.repeat.set(FAR/1.4,FAR/1.4);checker.offset.set(.5,.5);
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(FAR,FAR),new THREE.MeshLambertMaterial({map:checker}));
    floor.rotation.x=-Math.PI/2;floor.position.set(-3.5+FAR/2,0,-2.5+FAR/2);this.scene.add(floor);
    this.box([FAR,FAR,.16],[-3.5+FAR/2,FAR/2-.01,-2.5],palette.wall);
    this.box([.16,FAR,FAR],[-3.5,FAR/2-.01,-2.5+FAR/2],palette.side);
    this.box([.16,FAR,FAR],[3.5,FAR/2-.01,-2.5+FAR/2],palette.side);this.box([.12,.12,FAR],[3.38,.06,-2.5+FAR/2],palette.edge);
    this.box([FAR,.12,.12],[-3.5+FAR/2,.06,-2.38],palette.edge);
    this.box([.12,.12,FAR],[-3.38,.06,-2.5+FAR/2],palette.edge);
    // A door with a deliberately unhelpful little plaque.
    this.box([1.45,2.65,.12],[.05,1.32,-2.36],0x66755e);
    this.door=this.box([1.22,2.48,.13],[.05,1.25,-2.27],0x8b8567);
    this.box([.93,1.0,.03],[.05,1.74,-2.19],0x979076);
    this.box([.93,.74,.03],[.05,.65,-2.19],0x979076);
    this.box([.08,.08,.08],[.48,1.15,-2.1],0xbdb17a);
    const label=canvasTexture(128,64,(c)=>{c.fillStyle='#d9d4b2';c.fillRect(0,0,128,64);c.fillStyle='#4b594b';c.textAlign='center';c.font='bold 15px monospace';c.fillText('OUTSIDE',64,26);c.font='9px monospace';c.fillText('(probably)',64,46);});
    this.plane([.64,.32],[.05,2.04,-2.165],label);
    // A modest window onto a suspiciously unchanging landscape. It does follow your clock, though.
    this.box([1.65,1.44,.12],[-2.13,2.1,-2.35],0xe4ddbd);
    const hills=(sky,sun,far,near,stars)=>canvasTexture(128,96,(c)=>{c.fillStyle=sky;c.fillRect(0,0,128,96);if(stars)for(let i=0;i<22;i++){c.fillStyle='#dfe6c8';c.fillRect((i*37)%128,(i*23)%50,1,1);}c.fillStyle=sun;c.fillRect(83,15,13,13);c.fillStyle=far;c.beginPath();c.moveTo(0,65);c.lineTo(35,38);c.lineTo(78,72);c.lineTo(105,42);c.lineTo(128,58);c.lineTo(128,96);c.lineTo(0,96);c.fill();c.fillStyle=near;c.beginPath();c.moveTo(0,83);c.lineTo(62,56);c.lineTo(128,85);c.lineTo(128,96);c.lineTo(0,96);c.fill();});
    this.views={day:hills('#839c9b','#e0d7af','#7c8e65','#5b785d'),dusk:hills('#b98f72','#f0b66a','#6f6e55','#4f5a45'),night:hills('#1d2a3a','#d9d6bd','#2c3a33','#1f2b25',true)};
    this.view=this.plane([1.42,1.2],[-2.13,2.1,-2.27],this.views.day);
    this.box([.07,1.25,.1],[-2.13,2.1,-2.18],0xe4ddbd);this.box([1.45,.07,.1],[-2.13,2.1,-2.18],0xe4ddbd);
    this.box([1.8,.1,.35],[-2.13,1.38,-2.16],palette.cream);
    // Bed, cloth stripes and a pair of slippers.
    this.blob(-2.35,.35,.9,1.25);
    this.box([1.05,.32,2],[-2.35,.25,.35],palette.wood);
    this.box([1.12,.19,2.04],[-2.35,.49,.35],0xe5ddbd);
    this.box([1.15,.1,1.45],[-2.35,.62,.58],palette.bed);
    for(let z=0;z<5;z++)this.box([1.16,.012,.045],[-2.35,.68,.05+z*.25],0x9ba389);
    this.box([.79,.13,.42],[-2.35,.66,-.38],0xf0e8cb);
    this.box([1.15,.93,.1],[-2.35,.47,-.7],palette.wood);
    this.box([1.15,.57,.1],[-2.35,.29,1.4],palette.wood);
    this.box([.16,.07,.3],[-1.72,.04,1.38],0x5d6656);this.box([.16,.07,.3],[-1.47,.04,1.38],0x5d6656);
    // Desk and lamp. No expensive real-time shadows.
    this.blob(2.1,-1.35,1.3,.8);
    this.box([1.85,.14,1.02],[2.1,.94,-1.35],palette.wood);
    for(const x of [1.35,2.85])for(const z of [-1.72,-.98])this.box([.09,.9,.09],[x,.45,z],0x576454);
    this.box([.6,.23,.8],[2.57,.72,-1.35],0x796a54);
    this.box([.17,.035,.035],[2.57,.72,-.91],0xb3a87d);
    this.box([.28,.05,.24],[2.72,1.03,-1.6],0x4f685a);
    this.box([.035,.5,.035],[2.72,1.28,-1.6],0x577260);
    this.shade=new THREE.Mesh(new THREE.ConeGeometry(.23,.28,8,1,true),new THREE.MeshLambertMaterial({color:0xe1ce8a,flatShading:true,side:THREE.DoubleSide}));this.shade.position.set(2.72,1.56,-1.6);this.scene.add(this.shade);
    this.box([.55,.1,.55],[1.96,.5,-.25],0x8e7a5c);
    for(const x of [1.76,2.16])for(const z of [-.45,-.05])this.box([.05,.46,.05],[x,.23,z],0x6b6951);
    // A small plant and a bowl. Enough company for one room.
    this.box([.64,.65,.6],[-2.44,.32,-1.6],0x7c8062);
    const pot=new THREE.Mesh(new THREE.CylinderGeometry(.19,.14,.29,7),mat(0x9a6b47));pot.position.set(-2.44,.82,-1.6);this.scene.add(pot);
    for(let i=0;i<5;i++){const leaf=new THREE.Mesh(new THREE.ConeGeometry(.14,.48,4),mat(i%2?0x647853:0x7c8a5a));leaf.position.set(-2.44+Math.sin(i*2.3)*.1,1.09+Math.cos(i)*.06,-1.6+Math.cos(i*2.3)*.1);leaf.rotation.z=Math.sin(i*2)*.5;this.scene.add(leaf);}
    const bowl=new THREE.Mesh(new THREE.CylinderGeometry(.21,.14,.12,10),mat(0xb9b594));bowl.position.set(-1.0,.07,-1.0);this.scene.add(bowl);
    const note=canvasTexture(128,128,(c)=>{c.fillStyle='#d8d0a9';c.fillRect(0,0,128,128);c.textAlign='center';c.fillStyle='#66715a';c.font='12px monospace';['PLEASE','REMAIN','INSIDE'].forEach((s,i)=>c.fillText(s,64,42+i*19));});
    this.plane([.63,.63],[2.35,2.3,-2.39],note);
    // The wall clock keeps the watcher's time. He has noticed.
    const clock=new THREE.Mesh(new THREE.CircleGeometry(.27,16),mat(0xe2dec2));clock.position.set(1.24,2.72,-2.38);this.scene.add(clock);
    const hand=(length,width)=>{const g=new THREE.Group();const m=new THREE.Mesh(new THREE.BoxGeometry(width,length,.02),mat(0x59664f));m.position.y=length/2;g.add(m);g.position.set(1.24,2.72,-2.35);this.scene.add(g);return g;};
    this.hourHand=hand(.13,.025);this.minuteHand=hand(.2,.015);
    // Long afternoon light is painted onto the floor.
    this.patch=new THREE.Mesh(new THREE.PlaneGeometry(1.5,1.7),new THREE.MeshBasicMaterial({color:0xffe4a1,transparent:true,opacity:.13,depthWrite:false}));this.patch.rotation.x=-Math.PI/2;this.patch.rotation.z=.2;this.patch.position.set(-.7,.018,-.5);this.scene.add(this.patch);
    this.shadow=this.blob(0,.8,.32,.24,.23);
    // The keepsake: once every journal page is found, he pins up a drawing of you.
    const drawing=canvasTexture(96,128,(c,w,h)=>{c.fillStyle='#f3eedb';c.fillRect(0,0,w,h);c.strokeStyle='#33405a';c.lineWidth=2;
      c.beginPath();c.arc(48,46,26,0,Math.PI*2);c.stroke();c.fillStyle='#33405a';c.fillRect(38,40,4,4);c.fillRect(54,40,4,4);
      c.beginPath();c.arc(48,52,10,.2,Math.PI-.2);c.stroke();c.strokeRect(6,6,w-12,82);
      c.fillStyle='#b5442f';c.fillRect(70,92,6,18);c.beginPath();c.arc(73,90,5,0,Math.PI*2);c.fill();
      c.fillStyle='#33405a';c.font='bold 13px monospace';c.textAlign='center';c.fillText('YOU',36,112);c.font='9px monospace';c.fillText('+ me',36,123);});
    this.keepsake=this.plane([.62,.82],[-3.4,1.95,.55],drawing);this.keepsake.rotation.y=Math.PI/2;this.keepsake.visible=false;
  }
  setDaylight(now){
    const h=now.getHours()+now.getMinutes()/60, night=h<6||h>=20.5, dusk=!night&&(h<7.5||h>=18);
    this.hourHand.rotation.z=-(h%12)/12*Math.PI*2;this.minuteHand.rotation.z=-now.getMinutes()/60*Math.PI*2;
    const mode=night?'night':dusk?'dusk':'day';if(mode===this.daylight)return;this.daylight=mode;
    this.view.material.map=this.views[mode];this.view.material.needsUpdate=true;
    this.hemi.intensity=night?.75:dusk?1.6:2;this.sun.intensity=night?.25:dusk?1.6:2.3;
    this.sun.color.set(night?0x8fa3c9:dusk?0xffc28a:0xffe3b3);
    this.lamp.intensity=night?7:dusk?2.5:0;this.shade.material.emissive.set(night||dusk?0x6a5320:0);
    this.patch.visible=!night;this.scene.background.set(night?0x18282a:0x263d37);
  }
  async loadAssets(){
    const loader=new GLTFLoader();
    const load=async(file)=>{
      const gltf=await loader.loadAsync(`/assets/${file}.glb`);
      gltf.scene.traverse(o=>{if(o.isMesh){const source=Array.isArray(o.material)?o.material:[o.material];o.material=source.map(m=>{if(m.map){m.map.magFilter=THREE.NearestFilter;m.map.minFilter=THREE.NearestFilter;m.map.generateMipmaps=false;}return new THREE.MeshLambertMaterial({color:m.color,map:m.map,side:m.side,transparent:m.transparent,opacity:m.opacity,flatShading:true});});if(o.material.length===1)o.material=o.material[0];}});
      return gltf.scene;
    };
    const resident=await load('resident');
    this.model=resident;this.body.add(resident);
    resident.traverse(o=>{if(o.isBone){this.bones[o.name.replaceAll('.','')]=o;this.rest[o.name.replaceAll('.','')]={q:o.quaternion.clone(),p:o.position.clone()};}});
    this.headBone=this.bones.head;
    // A small book that only exists while he reads at the desk.
    if(this.bones.handR){this.book=new THREE.Mesh(new THREE.BoxGeometry(.2,.035,.27),mat(0x8b3b2e));this.book.position.set(.06,.1,.02);this.book.visible=false;this.bones.handR.add(this.book);}
    // Blender faces -Y; glTF conversion maps that to +Z, toward the glass.
    const items=[['book',[1.64,1.025,-1.3],2.1,.24],['pack',[2.17,1.03,-1.4],1.65,-.3],['zine',[-2.33,.694,.51],1.8,.2],['card',[1.88,1.035,-1.04],2.1,.45]];
    await Promise.all(items.map(async([file,p,s,y])=>{const item=await load(file);item.position.set(...p);item.scale.setScalar(s);item.rotation.y=y;this.scene.add(item);}));
    this.container.dataset.loaded='true';
    return this;
  }
  update(state,extra={}){
    if(!this.state)this.resident.position.set(state.position[0],0,state.position[1]);
    this.state=state;Object.assign(this,extra);this.keepsake.visible=!!state.keepsake;
  }
  pose(name,x=0,y=0,z=0){name=name.replaceAll('.','');const bone=this.bones[name],rest=this.rest[name];if(!bone)return;bone.quaternion.copy(rest.q).multiply(_q.setFromEuler(_e.set(x,y,z)));}
  animate(t,dt){
    if(!this.state||!this.model)return;
    const s=this.state, f=s.feeling||'calm', moving=s.walking&&!this.dragging, w=Math.sin(t*(f==='annoyed'||f==='afraid'?10:7.5));
    const lying=s.seated&&s.activity==='rest'&&!this.dragging, sitting=s.seated&&s.activity==='read'&&!this.dragging;
    const knocking=s.activity==='knock'&&!moving&&!s.seated&&!this.dragging, speaking=t<this.speakingUntil;
    // Where the body is, and which way it faces.
    if(!this.dragging){
      this.resident.position.x=damp(this.resident.position.x,s.position[0],lying||sitting?6:12,dt);
      this.resident.position.z=damp(this.resident.position.z,s.position[1],lying||sitting?6:12,dt);
      this.resident.rotation.y+=angleTo(this.resident.rotation.y,s.yaw)*Math.min(1,dt*7);
    }
    this.body.rotation.x=damp(this.body.rotation.x,lying?LIE.tilt:0,5,dt);
    const lift=this.dragging?.45:lying?LIE.y:sitting?SIT.y:moving?Math.abs(w*.018):f==='happy'?Math.max(0,Math.sin(t*5))*.02:0;
    this.body.position.y=damp(this.body.position.y,lift,lying||sitting?6:20,dt);
    for(const [name,bone]of Object.entries(this.bones)){bone.quaternion.copy(this.rest[name].q);bone.position.copy(this.rest[name].p);}
    // Limbs.
    for(const [side,sign]of [['L',1],['R',-1]]){
      if(sitting){this.pose(`thigh.${side}`,1.45);this.pose(`shin.${side}`,-1.45);}
      else{this.pose(`thigh.${side}`,moving?w*.32*sign:0);this.pose(`shin.${side}`,moving?Math.max(0,-w*sign)*.35:0);}
      // Arm bones: positive X swings forward.
      const swing=moving?-w*.25*sign:speaking&&!lying?.28+Math.sin(t*3+sign)*.08:lying?-.05:0;
      this.pose(`upper_arm.${side}`,swing,0,this.dragging?sign*.9:f==='sad'&&!moving?-sign*.08:0);
      this.pose(`forearm.${side}`,speaking&&!lying?.35:0);
      if(lying)this.pose(`foot.${side}`,.9);
    }
    // Little lives: each activity has its own loop, and idle moments get fidgets. All procedural, no clips.
    const x={chest:0,head:0,tilt:0,jaw:0,look:null}, settled=!moving&&!this.dragging&&!lying&&!s.walking;
    const cycle=period=>(t%period)/period;
    if(sitting){  // Reading at the desk: book in both hands, a page turned now and then.
      this.pose('upper_arm.R',.75,0,-.15);this.pose('forearm.R',.9);this.pose('upper_arm.L',.75,0,.15);this.pose('forearm.L',.9);
      const turn=cycle(5.5);if(turn>.8)this.pose('upper_arm.L',.95,0,.15+Math.sin((turn-.8)*5*Math.PI)*.5);
      x.head=.3;
    }else if(settled&&s.activity==='eat'){  // Reach into the bowl, food to mouth, chew.
      const e=cycle(4.2);
      if(e<.35){x.chest=.45*Math.sin(e/.35*Math.PI);this.pose('upper_arm.R',.9,0,-.1);this.pose('forearm.R',.15);}
      else if(e<.55){this.pose('upper_arm.R',.85,0,-.2);this.pose('forearm.R',2.0);x.head=-.05;}
      else{this.pose('upper_arm.R',.2*(1-(e-.55)/.45),0,-.05);this.pose('forearm.R',.4);x.jaw=-Math.abs(Math.sin(t*9))*.12;x.head=.05;}
    }else if(settled&&s.activity==='inspect'){  // Prod the booster pack, then stand back and think about it.
      const i=cycle(6);
      if(i<.5){this.pose('upper_arm.R',.85,0,-.1);this.pose('forearm.R',.45+Math.sin(t*6)*.08);x.head=.2;x.tilt=.18;}
      else{this.pose('upper_arm.R',.35,0,-.25);this.pose('forearm.R',2.2);this.pose('upper_arm.L',.25,0,.2);this.pose('forearm.L',1.3);x.tilt=-.15;}
    }else if(settled&&s.activity==='escape'){  // Push the door; when that fails, knock on it.
      const d=cycle(5);
      if(d<.45){this.pose('upper_arm.R',1.35,0,-.1);this.pose('upper_arm.L',1.35,0,.1);this.pose('forearm.R',.2);this.pose('forearm.L',.2);x.chest=.12+Math.sin(t*8)*.03;}
      else{const k=Math.sin(t*11);this.pose('upper_arm.R',1.2,0,-.1);this.pose('forearm.R',.95-Math.max(0,k)*.45);
        if(k>.95&&!this.doorKnocked){this.doorKnocked=true;this.container.dispatchEvent(new CustomEvent('knock',{detail:{door:true}}));}
        if(k<0)this.doorKnocked=false;}
    }else if(s.activity==='pace'&&!this.dragging){  // Hands behind his back.
      for(const [side,sign]of [['L',1],['R',-1]]){this.pose(`upper_arm.${side}`,-.45,0,sign*.15);this.pose(`forearm.${side}`,1.1);}
      x.head=.12;
    }else if(settled&&['watch','wander'].includes(s.activity)&&!speaking){
      if(!this.fidget||t>this.fidget.until+this.fidget.rest){  // Something small every few seconds.
        const kinds=['scratch','stretch','look','shrug','look'];
        this.fidget={kind:kinds[Math.floor(Math.random()*kinds.length)],start:t,until:t+2.4,rest:4+Math.random()*7};
      }
      const g=this.fidget, p=(t-g.start)/(g.until-g.start);
      if(p>=0&&p<=1){const ease=Math.sin(p*Math.PI);
        if(g.kind==='scratch'){this.pose('upper_arm.R',2.3*ease,0,-.3*ease);this.pose('forearm.R',1.9*ease+Math.sin(t*14)*.12*ease);x.tilt=.12*ease;}
        else if(g.kind==='stretch'){this.pose('upper_arm.R',2.9*ease,0,-.15*ease);this.pose('upper_arm.L',2.9*ease,0,.15*ease);x.chest=-.15*ease;x.head=-.2*ease;}
        else if(g.kind==='shrug'){this.pose('upper_arm.R',.2*ease,0,-.35*ease);this.pose('upper_arm.L',.2*ease,0,.35*ease);this.pose('forearm.R',1*ease);this.pose('forearm.L',1*ease);x.tilt=.1*ease;}
        else if(g.kind==='look')x.look=Math.sin(p*Math.PI*2)*.9;}
    }
    if(this.book)this.book.visible=sitting;
    if(knocking){
      this.knockPhase+=dt*5.5;const k=Math.sin(this.knockPhase*Math.PI*2);
      this.pose('upper_arm.R',1.3,0,-.15);this.pose('forearm.R',.9-Math.max(0,k)*.45);
      if(k>.95&&!this.knocked){this.knocked=true;this.container.dispatchEvent(new CustomEvent('knock'));}
      if(k<0)this.knocked=false;
    }
    // Head: breathing, mood, and the uncanny part: he looks at you.
    const sad=f==='sad'?.28:0, afraid=f==='afraid'?Math.sin(t*31)*.012:0;
    const attending=!lying&&!sitting&&!moving&&(this.listening||knocking||s.activity==='watch'||(speaking&&this.watching));
    const toCamera=Math.atan2(EYE.x-this.resident.position.x,EYE.z-this.resident.position.z);
    const look=attending&&x.look===null?clamp(angleTo(this.resident.rotation.y,toCamera),-1.1,1.1):x.look??Math.sin(t*.43)*.06;
    this.headYaw=damp(this.headYaw||0,look,4,dt);
    this.pose('chest',lying?0:Math.sin(t*1.6)*.012+sad*.3+x.chest,0,0);
    this.pose('head',lying?-.15:(speaking?Math.sin(t*4)*.045:Math.sin(t*.7)*.025)+sad+(this.listening?-.08:0)+afraid+x.head,this.headYaw,(f==='curious'&&attending?Math.sin(t*.9)*.12:0)+x.tilt);
    this.pose('jaw',speaking?-Math.abs(Math.sin(t*13))*.18:x.jaw);
    this.shadow.visible=!lying&&!sitting;
    this.shadow.position.x=this.resident.position.x;this.shadow.position.z=this.resident.position.z;
    this.shadow.material.opacity=this.dragging?.12:.23;
    this.updateOverlay(t,lying,speaking);
  }
  // A few pixels of HTML above his head: Zs while asleep, an ellipsis while a thought forms.
  updateOverlay(t,lying,speaking){
    const text=lying&&!speaking?'z'+(Math.floor(t*1.2)%3?' Z':'')+(Math.floor(t*1.2)%3===2?' z':''):this.thinking&&!speaking?'.'.repeat(1+Math.floor(t*2.5)%3):'';
    if(text!==this.overlay.textContent)this.overlay.textContent=text;
    this.overlay.hidden=!text;if(!text||!this.headBone)return;
    const p=this.headBone.getWorldPosition(_v);p.y+=lying?.35:.5;p.project(this.camera);
    this.overlay.style.left=`${(p.x+1)/2*100}%`;this.overlay.style.top=`${(1-p.y)/2*100}%`;
  }
  frame(now){
    this.raf=requestAnimationFrame(this.frame);
    if(document.hidden||this.container.closest('[hidden]')){this.lastFrame=now;return;}
    if(now-this.lastFrame<1000/this.settings.fps)return;
    const dt=Math.min(.15,(now-this.lastFrame)/1000);this.lastFrame=now;
    if(!this.lastDaylight||now-this.lastDaylight>20000){this.lastDaylight=now;this.setDaylight(new Date());}
    this.animate(now/1000,dt);this.renderer.render(this.scene,this.camera);
  }
  speak(text){this.speakingUntil=performance.now()/1000+Math.min(12,Math.max(2,text.length/15));}
  ray(event){const r=this.renderer.domElement.getBoundingClientRect();this.pointer.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);this.raycaster.setFromCamera(this.pointer,this.camera);}
  bindPointer(){
    const canvas=this.renderer.domElement;
    const finish=cancel=>{
      const down=this.down;if(!down)return;
      if(cancel&&this.dragging)this.resident.position.copy(down.position);
      this.down=null;this.dragging=false;
      if(canvas.hasPointerCapture(down.id))canvas.releasePointerCapture(down.id);
    };
    canvas.addEventListener('pointerdown',e=>{
      if(this.settings.kiosk||!this.model||e.button!==0||e.isPrimary===false||this.down)return;
      e.preventDefault();this.container.focus({preventScroll:true});
      this.ray(e);const hits=this.raycaster.intersectObject(this.resident,true);
      const ground=this.raycaster.ray.intersectPlane(this.ground,new THREE.Vector3());
      this.down={id:e.pointerId,x:e.clientX,y:e.clientY,grab:hits.length>0,ground,position:this.resident.position.clone()};
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove',e=>{
      if(!this.down||this.down.id!==e.pointerId)return;
      // A click on him is a hello, not an abduction: only a real drag picks him up.
      if(this.down.grab&&this.down.ground&&!this.dragging&&Math.hypot(e.clientX-this.down.x,e.clientY-this.down.y)>6){this.dragging=true;this.body.rotation.x=0;}
      if(!this.dragging)return;
      this.ray(e);const hit=this.raycaster.ray.intersectPlane(this.ground,new THREE.Vector3());
      if(hit){this.resident.position.x=clamp(this.down.position.x+hit.x-this.down.ground.x,-BOX.x,BOX.x);this.resident.position.z=clamp(this.down.position.z+hit.z-this.down.ground.z,-1.75,BOX.front);}
    });
    canvas.addEventListener('pointerup',e=>{
      if(!this.down||this.down.id!==e.pointerId)return;
      const dragged=this.dragging,tap=Math.hypot(e.clientX-this.down.x,e.clientY-this.down.y)<8;
      finish(false);
      if(dragged)this.onInteraction('move',{x:this.resident.position.x,z:this.resident.position.z});
      else if(tap)this.onInteraction('tap',{});
    });
    for(const type of ['pointercancel','lostpointercapture'])canvas.addEventListener(type,e=>{if(this.down?.id===e.pointerId)finish(true);});
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();cancelAnimationFrame(this.raf);this.container.dispatchEvent(new CustomEvent('render-lost'));});
    this.container.addEventListener('keydown',e=>{
      if(this.settings.kiosk||!this.model||e.altKey||e.ctrlKey||e.metaKey)return;
      if(e.key==='Escape'&&this.down){e.preventDefault();finish(true);return;}
      if(this.down)return;
      if(e.key==='Enter'){e.preventDefault();if(!e.repeat)this.onInteraction('tap',{});return;}
      const direction={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];
      if(!direction)return;
      e.preventDefault();if(e.repeat)return;
      const [right,forward]=direction,step=.4;  // The view is front-on: screen directions are room directions.
      this.onInteraction('move',{x:clamp(this.resident.position.x+step*right,-BOX.x,BOX.x),z:clamp(this.resident.position.z+step*forward,-1.75,BOX.front)});
    });
  }
}
