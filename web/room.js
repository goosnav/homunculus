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
export class Room {
  constructor(container, settings, onInteraction){
    this.container=container;this.settings=settings;this.onInteraction=onInteraction;
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0x263d37);
    this.camera=new THREE.OrthographicCamera(-5.3,5.3,3.975,-3.975,.1,60);
    this.camera.position.set(7.5,6.5,12);this.camera.lookAt(0,1.15,0);
    this.renderer=new THREE.WebGLRenderer({antialias:false,alpha:false,powerPreference:'low-power'});
    this.renderer.setPixelRatio(1);this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.toneMapping=THREE.NoToneMapping;
    this.container.prepend(this.renderer.domElement);
    this.configure(settings);
    this.scene.add(new THREE.HemisphereLight(0xf6eed0,0x536757,2));
    const sun=new THREE.DirectionalLight(0xffe3b3,2.3);sun.position.set(-3,7,5);this.scene.add(sun);
    this.resident=new THREE.Group();this.scene.add(this.resident);
    this.resident.position.set(0,0,.8);this.bones={};this.rest={};this.state=null;this.lastFrame=0;this.dragging=false;
    this.raycaster=new THREE.Raycaster();this.pointer=new THREE.Vector2();this.ground=new THREE.Plane(new THREE.Vector3(0,1,0),0);
    this.buildRoom();this.bindPointer();
    this.ready=this.loadAssets();
    this.frame=this.frame.bind(this);this.raf=requestAnimationFrame(this.frame);
  }
  configure(settings){this.settings=settings;this.renderer.setSize(...settings.render_size,false);}
  box(size,position,color){const o=new THREE.Mesh(new THREE.BoxGeometry(...size),mat(color));o.position.set(...position);this.scene.add(o);return o;}
  plane(size,position,texture){const o=new THREE.Mesh(new THREE.PlaneGeometry(...size),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));o.position.set(...position);this.scene.add(o);return o;}
  blob(x,z,sx,sz,opacity=.15){const m=new THREE.Mesh(new THREE.CircleGeometry(1,20),new THREE.MeshBasicMaterial({color:0x152a22,transparent:true,opacity,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.set(x,.012,z);m.scale.set(sx,sz,1);this.scene.add(m);return m;}
  buildRoom(){
    const checker=canvasTexture(128,128,(c,w,h)=>{
      c.fillStyle='#c6bf9d';c.fillRect(0,0,w,h);c.fillStyle='#8b9a83';c.fillRect(0,0,64,64);c.fillRect(64,64,64,64);
      for(let i=0;i<250;i++){const x=(i*43)%128,y=(i*71)%128;c.fillStyle=i%2?'#00000008':'#ffffff0d';c.fillRect(x,y,2,1);}
      c.strokeStyle='#53665025';c.strokeRect(0,0,64,64);c.strokeRect(64,64,64,64);
    });checker.wrapS=checker.wrapT=THREE.RepeatWrapping;checker.repeat.set(5,4);
    const floor=new THREE.Mesh(new THREE.BoxGeometry(7,.18,5.5),new THREE.MeshLambertMaterial({map:checker}));floor.position.set(0,-.1,.25);this.scene.add(floor);
    this.box([7,.22,.2],[0,-.08,3.02],palette.edge);
    this.box([7,3.5,.16],[0,1.65,-2.5],palette.wall);
    this.box([.16,3.5,5.5],[-3.5,1.65,.25],palette.side);
    this.box([7,.12,.12],[0,.07,-2.38],palette.edge);
    this.box([.12,.12,5.4],[-3.38,.07,.25],palette.edge);
    this.box([7,.08,.21],[0,3.42,-2.5],0xc9c6aa);
    this.box([.21,.08,5.5],[-3.5,3.42,.25],0xc9c6aa);
    // A door with a deliberately unhelpful little plaque.
    this.box([1.45,2.65,.12],[.05,1.32,-2.36],0x66755e);
    this.box([1.22,2.48,.13],[.05,1.25,-2.27],0x8b8567);
    this.box([.93,1.0,.03],[.05,1.74,-2.19],0x979076);
    this.box([.93,.74,.03],[.05,.65,-2.19],0x979076);
    this.box([.08,.08,.08],[.48,1.15,-2.1],0xbdb17a);
    const label=canvasTexture(128,64,(c)=>{c.fillStyle='#d9d4b2';c.fillRect(0,0,128,64);c.fillStyle='#4b594b';c.textAlign='center';c.font='bold 15px monospace';c.fillText('OUTSIDE',64,26);c.font='9px monospace';c.fillText('(probably)',64,46);});
    this.plane([.64,.32],[.05,2.04,-2.165],label);
    // A modest window onto a suspiciously unchanging landscape.
    this.box([1.65,1.44,.12],[-2.13,2.1,-2.35],0xe4ddbd);
    const view=canvasTexture(128,96,(c)=>{c.fillStyle='#839c9b';c.fillRect(0,0,128,96);c.fillStyle='#e0d7af';c.fillRect(83,15,13,13);c.fillStyle='#7c8e65';c.beginPath();c.moveTo(0,65);c.lineTo(35,38);c.lineTo(78,72);c.lineTo(105,42);c.lineTo(128,58);c.lineTo(128,96);c.lineTo(0,96);c.fill();c.fillStyle='#5b785d';c.beginPath();c.moveTo(0,83);c.lineTo(62,56);c.lineTo(128,85);c.lineTo(128,96);c.lineTo(0,96);c.fill();});
    this.plane([1.42,1.2],[-2.13,2.1,-2.27],view);
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
    const shade=new THREE.Mesh(new THREE.ConeGeometry(.23,.28,8,1,true),mat(0xe1ce8a));shade.position.set(2.72,1.56,-1.6);this.scene.add(shade);
    this.box([.55,.1,.55],[1.96,.5,-.25],0x8e7a5c);
    for(const x of [1.76,2.16])for(const z of [-.45,-.05])this.box([.05,.46,.05],[x,.23,z],0x6b6951);
    // A small plant and a bowl. Enough company for one room.
    this.box([.64,.65,.6],[-2.44,.32,-1.6],0x7c8062);
    const pot=new THREE.Mesh(new THREE.CylinderGeometry(.19,.14,.29,7),mat(0x9a6b47));pot.position.set(-2.44,.82,-1.6);this.scene.add(pot);
    for(let i=0;i<5;i++){const leaf=new THREE.Mesh(new THREE.ConeGeometry(.14,.48,4),mat(i%2?0x647853:0x7c8a5a));leaf.position.set(-2.44+Math.sin(i*2.3)*.1,1.09+Math.cos(i)*.06,-1.6+Math.cos(i*2.3)*.1);leaf.rotation.z=Math.sin(i*2)*.5;this.scene.add(leaf);}
    const bowl=new THREE.Mesh(new THREE.CylinderGeometry(.21,.14,.12,10),mat(0xb9b594));bowl.position.set(-1.5,.07,-1.5);this.scene.add(bowl);
    const note=canvasTexture(128,128,(c)=>{c.fillStyle='#d8d0a9';c.fillRect(0,0,128,128);c.textAlign='center';c.fillStyle='#66715a';c.font='12px monospace';['PLEASE','REMAIN','INSIDE'].forEach((s,i)=>c.fillText(s,64,42+i*19));});
    this.plane([.63,.63],[2.35,2.3,-2.39],note);
    const clock=new THREE.Mesh(new THREE.CircleGeometry(.27,16),mat(0xe2dec2));clock.position.set(1.24,2.72,-2.38);this.scene.add(clock);
    this.box([.015,.17,.02],[1.24,2.8,-2.35],0x59664f);this.box([.13,.015,.02],[1.3,2.72,-2.35],0x59664f);
    // Long afternoon light is painted onto the floor.
    const patch=new THREE.Mesh(new THREE.PlaneGeometry(1.5,1.7),new THREE.MeshBasicMaterial({color:0xffe4a1,transparent:true,opacity:.13,depthWrite:false}));patch.rotation.x=-Math.PI/2;patch.rotation.z=.2;patch.position.set(-.7,.018,-.5);this.scene.add(patch);
    this.shadow=this.blob(0,.8,.32,.24,.23);
  }
  async loadAssets(){
    const loader=new GLTFLoader();
    const load=async(file)=>{
      const gltf=await loader.loadAsync(`/assets/${file}.glb`);
      gltf.scene.traverse(o=>{if(o.isMesh){const source=Array.isArray(o.material)?o.material:[o.material];o.material=source.map(m=>{if(m.map){m.map.magFilter=THREE.NearestFilter;m.map.minFilter=THREE.NearestFilter;m.map.generateMipmaps=false;}return new THREE.MeshLambertMaterial({color:m.color,map:m.map,side:m.side,transparent:m.transparent,opacity:m.opacity,flatShading:true});});if(o.material.length===1)o.material=o.material[0];}});
      return gltf.scene;
    };
    const resident=await load('resident');
    this.model=resident;this.resident.add(resident);
    resident.traverse(o=>{if(o.isBone){this.bones[o.name]=o;this.rest[o.name]={q:o.quaternion.clone(),p:o.position.clone()};}});
    // Blender faces -Y; glTF conversion maps that to +Z, toward the glass.
    const items=[['book',[1.64,1.025,-1.3],2.1,.24],['pack',[2.17,1.03,-1.4],1.65,-.3],['zine',[-2.33,.694,.51],1.8,.2],['card',[1.88,1.035,-1.04],2.1,.45]];
    await Promise.all(items.map(async([file,p,s,y])=>{const item=await load(file);item.position.set(...p);item.scale.setScalar(s);item.rotation.y=y;this.scene.add(item);}));
    this.container.dataset.loaded='true';
    return this;
  }
  update(state){this.state=state;}
  pose(name,x=0,y=0,z=0){const bone=this.bones[name],rest=this.rest[name];if(!bone)return;bone.quaternion.copy(rest.q).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(x,y,z)));}
  animate(t,dt){
    if(!this.state||!this.model)return;
    const s=this.state, moving=s.walking&&!this.dragging, w=Math.sin(t*7.5), rest=s.activity==='rest'&&!moving, speaking=t<this.speakingUntil;
    if(!this.dragging){this.resident.position.x=THREE.MathUtils.damp(this.resident.position.x,s.position[0],12,dt);this.resident.position.z=THREE.MathUtils.damp(this.resident.position.z,s.position[1],12,dt);const d=Math.atan2(Math.sin(s.yaw-this.resident.rotation.y),Math.cos(s.yaw-this.resident.rotation.y));this.resident.rotation.y+=d*Math.min(1,dt*7);}
    this.resident.position.y=this.dragging?.45:Math.abs(moving?w*.018:0);
    for(const [name,bone]of Object.entries(this.bones)){bone.quaternion.copy(this.rest[name].q);bone.position.copy(this.rest[name].p);}
    this.pose('thighL',moving?w*.32:0);this.pose('thighR',moving?-w*.32:0);
    this.pose('shinL',moving?Math.max(0,-w)*.35:0);this.pose('shinR',moving?Math.max(0,w)*.35:0);
    // GLTFLoader sanitizes dots in bone names; exported names are handled below.
    for(const [side,sign]of [['L',1],['R',-1]]){
      this.pose(`thigh.${side}`,moving?w*.32*sign:0);
      this.pose(`shin.${side}`,moving?Math.max(0,-w*sign)*.35:0);
      this.pose(`upper_arm.${side}`,moving?-w*.25*sign:speaking?-.28+Math.sin(t*3+sign)*.08:rest?.1:0,0,this.dragging?sign*.9:0);
      this.pose(`forearm.${side}`,speaking?-.35:0);
      this.pose(`upper_arm${side}`,moving?-w*.25*sign:speaking?-.28:0,0,this.dragging?sign*.9:0);
    }
    this.pose('chest',rest?.18:Math.sin(t*1.6)*.012,0,0);
    this.pose('head',rest?.28:speaking?Math.sin(t*4)*.045:Math.sin(t*.7)*.025,Math.sin(t*.43)*.06,0);
    this.pose('jaw',speaking?-Math.abs(Math.sin(t*13))*.18:0);
    this.shadow.position.x=this.resident.position.x;this.shadow.position.z=this.resident.position.z;
    this.shadow.material.opacity=this.dragging?.12:.23;
  }
  frame(now){
    this.raf=requestAnimationFrame(this.frame);
    if(document.hidden||this.container.closest('[hidden]')){this.lastFrame=now;return;}
    if(now-this.lastFrame<1000/this.settings.fps)return;
    const dt=Math.min(.15,(now-this.lastFrame)/1000);this.lastFrame=now;
    this.animate(now/1000,dt);this.renderer.render(this.scene,this.camera);
  }
  speak(text){this.speakingUntil=performance.now()/1000+Math.min(12,Math.max(2,text.length/15));}
  ray(event){const r=this.renderer.domElement.getBoundingClientRect();this.pointer.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);this.raycaster.setFromCamera(this.pointer,this.camera);}
  bindPointer(){
    const canvas=this.renderer.domElement;
    canvas.addEventListener('pointerdown',e=>{
      if(this.settings.kiosk||!this.model)return;
      this.ray(e);const hits=this.raycaster.intersectObject(this.resident,true);
      this.down={x:e.clientX,y:e.clientY};
      if(hits.length){this.dragging=true;canvas.setPointerCapture(e.pointerId);}
    });
    canvas.addEventListener('pointermove',e=>{if(!this.dragging)return;this.ray(e);const hit=new THREE.Vector3();if(this.raycaster.ray.intersectPlane(this.ground,hit)){this.resident.position.x=THREE.MathUtils.clamp(hit.x,-3,3);this.resident.position.z=THREE.MathUtils.clamp(hit.z,-1.75,2.25);}});
    const end=e=>{if(!this.down)return;const dragged=this.dragging;this.dragging=false;if(dragged)this.onInteraction('move',{x:this.resident.position.x,z:this.resident.position.z});else if(Math.hypot(e.clientX-this.down.x,e.clientY-this.down.y)<8)this.onInteraction('tap',{});this.down=null;};
    canvas.addEventListener('pointerup',end);
    canvas.addEventListener('pointercancel',()=>{this.down=null;this.dragging=false;});
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();cancelAnimationFrame(this.raf);this.container.dispatchEvent(new CustomEvent('render-lost'));});
    this.container.addEventListener('keydown',e=>{if(e.key==='Enter'&&!this.settings.kiosk){e.preventDefault();this.onInteraction('tap',{});}});
  }
}
