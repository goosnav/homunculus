import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Room } from './room.js';
import { expression } from './expressions.js';
const dark=0x292b29;
const material=color=>new THREE.MeshLambertMaterial({color,flatShading:true});
const meshBox=(size,color)=>new THREE.Mesh(new THREE.BoxGeometry(...size),material(color));
function texture(width,height,draw){const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;draw(canvas.getContext('2d'),width,height);const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.magFilter=THREE.NearestFilter;tex.minFilter=THREE.NearestFilter;return tex;}
function tube(points,radius,color){return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),12,radius,5,false),material(color));}
export class BrowserRoom extends Room{
  buildRoom(){
    super.buildRoom();this.anvilMeshes=new Map();
    // A salvaged beige computer, a keyboard with missing keys, and a failed cable run.
    this.box([.7,.82,.57],[2.04,1.43,-1.57],0xc3bca3);
    this.box([.59,.48,.025],[2.04,1.53,-1.266],0x575d51);
    this.monitorTexture=texture(128,96,(c,w,h)=>{c.fillStyle='#17251e';c.fillRect(0,0,w,h);c.fillStyle='#9fbd8d';c.font='11px monospace';c.fillText('NO CARRIER',19,45);c.fillRect(19,52,6,2);});
    this.monitor=this.plane([.49,.37],[2.04,1.53,-1.249],this.monitorTexture);
    this.box([.27,.025,.025],[2.12,1.16,-1.264],0x484b40);
    this.box([.57,.055,.22],[1.96,1.04,-.99],0xb5ae95);
    for(let row=0;row<3;row++)for(let k=0;k<9;k++)if(k!==3||row!==1)this.box([.039,.018,.043],[1.73+k*.055,1.077,-1.06+row*.055],0xd4cdb6);
    this.box([.08,.035,.12],[2.4,1.035,-.98],0xcfc8af);
    this.box([.035,.2,.02],[1.73,1.28,-1.264],0x8a856f);
    this.cable=new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({length:24},()=>new THREE.Vector3())),new THREE.LineBasicMaterial({color:0x262b26}));this.cable.visible=false;this.scene.add(this.cable);
    // Damp near the floor, patches, abandoned notes, scratch marks and loose plaster.
    for(let i=0;i<18;i++){
      const stain=this.box([.15+(i%4)*.12,.05+(i%3)*.05,.012],[-3.1+(i*.47)%6.1,.15+(i%3)*.075,-2.405],i%2?0x8e9480:0x9a9d84);stain.rotation.z=Math.sin(i*2)*.12;
    }
    const tallies=texture(128,128,c=>{c.clearRect(0,0,128,128);c.strokeStyle='#5c5d4b';c.lineWidth=2;for(let row=0;row<4;row++)for(let group=0;group<3;group++){const x=8+group*40,y=8+row*27;for(let n=0;n<4;n++){c.beginPath();c.moveTo(x+n*7,y);c.lineTo(x+n*7+1,y+18);c.stroke();}c.beginPath();c.moveTo(x-3,y+16);c.lineTo(x+26,y+3);c.stroke();}});
    const marks=this.plane([.67,.67],[-1.04,1.55,-2.399],tallies);marks.material.transparent=true;
    for(let i=0;i<7;i++){const paper=this.box([.22,.008,.31],[.85+Math.sin(i*1.9)*.5,.024,-.7+Math.cos(i*1.9)*.4],0xc5bea2);paper.rotation.y=i*2.1;}
    const mug=new THREE.Mesh(new THREE.CylinderGeometry(.075,.07,.16,8),material(0x827d6b));mug.position.set(1.37,1.08,-1.2);this.scene.add(mug);
    const darkTea=new THREE.Mesh(new THREE.CircleGeometry(.061,8),material(0x3b3427));darkTea.rotation.x=-Math.PI/2;darkTea.position.set(1.37,1.163,-1.2);this.scene.add(darkTea);
    this.cracks=new THREE.Group();this.scene.add(this.cracks);
    for(let i=0;i<9;i++){const crack=this.box([.018,.16,.012],[-3.402,.65+(i%4)*.19,-.97+(i%3)*.12],0x4d5549);crack.rotation.y=Math.PI/2;crack.rotation.x=(i%2?.7:-.5);this.scene.remove(crack);this.cracks.add(crack);}
    this.cracks.visible=false;
    this.handle=this.box([.04,.04,.18],[.48,1.15,-2.03],0xb6a270);
    this.wallReply=this.box([.025,.22,.26],[-3.405,1.05,-.9],0x85907c);
    this.debris=new THREE.Group();this.scene.add(this.debris);
    for(let i=0;i<7;i++){const chip=meshBox([.055,.028,.075],0xb2b39a);this.debris.add(chip);}
    this.doorView=this.plane([1.11,2.25],[.05,1.25,-2.08],null);this.doorView.visible=false;
    this.copyTarget=new THREE.WebGLRenderTarget(160,112,{minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter});
    this.doorTarget=new THREE.WebGLRenderTarget(96,192,{minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter});
    this.doorView.material.map=this.doorTarget.texture;
    // A front edge belongs to the wall around the viewer, with CSS completing the inset.
    this.box([.11,.08,5.5],[-3.37,.13,.2],0x66705e);
  }
  async loadAssets(){
    // Fetch this extra dependency before the base room adopts its assets.
    this.skeletonSource??=(await new GLTFLoader().loadAsync('./assets/skeleton.glb')).scene;
    await super.loadAssets();
    this.skeleton=this.skeletonSource;const bounds=new THREE.Box3().setFromObject(this.skeleton),size=bounds.getSize(new THREE.Vector3());
    this.skeleton.scale.setScalar(1.7/size.y);this.skeleton.position.y=-bounds.min.y*this.skeleton.scale.x;this.skeleton.visible=false;this.body.add(this.skeleton);
    // The owner-authored Homunculus variant has continuous skin under these expressions.
    this.scene.updateMatrixWorld(true);
    const face=new THREE.Group();face.position.set(0,1.525,.147);
    this.frown=tube([[-.105,-.024,0],[-.055,.003,.008],[0,.014,.01],[.055,.003,.008],[.105,-.024,0]],.008,0x402e29);face.add(this.frown);
    this.openMouth=new THREE.Mesh(new THREE.CircleGeometry(.035,10),material(0x372320));this.openMouth.position.set(0,-.005,.018);this.openMouth.scale.y=.6;this.openMouth.visible=false;face.add(this.openMouth);
    this.body.add(face);this.body.updateMatrixWorld(true);this.headBone.attach(face);this.face=face;
    this.brows=[];
    for(const sign of [-1,1]){const brow=meshBox([.09,.014,.018],0x514039);brow.position.set(sign*.095,1.659,.074);brow.rotation.z=sign*-.24;this.body.add(brow);this.body.updateMatrixWorld(true);this.headBone.attach(brow);this.brows.push(brow);}
    this.hammer=new THREE.Group();const handle=meshBox([.035,.36,.035],0x78603e);handle.position.y=.17;this.hammer.add(handle);const head=meshBox([.19,.095,.08],0x545955);head.position.y=.35;this.hammer.add(head);this.bones.handR?.add(this.hammer);this.hammer.visible=false;
    this.floorHammer=this.hammer.clone();this.floorHammer.rotation.z=Math.PI/2;this.scene.add(this.floorHammer);
    this.headset=new THREE.Group();
    const dome=new THREE.Mesh(new THREE.SphereGeometry(.205,10,5,0,Math.PI*2,0,Math.PI/2),material(0x848780));dome.scale.y=.55;this.headset.add(dome);
    for(let i=0;i<8;i++){const hole=new THREE.Mesh(new THREE.SphereGeometry(.012,5,4),material(0x333a33));hole.position.set(Math.cos(i*Math.PI/4)*.17,.055,Math.sin(i*Math.PI/4)*.17);this.headset.add(hole);}
    this.headset.position.set(0,1.695,0);this.body.add(this.headset);this.body.updateMatrixWorld(true);this.headBone.attach(this.headset);this.headset.visible=false;
    if(this.formation!==undefined)this.materialize(this.formation);
    return this;
  }
  materialize(progress){
    this.formation=progress;const materials=[];this.scene.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(!materials.includes(m))materials.push(m);});
    materials.forEach((m,i)=>{m.wireframe=progress<1&&(progress<=0||(i+1)/materials.length>progress);m.needsUpdate=true;});
    if(this.model)this.model.visible=progress>=1;
  }
  makeAnvil(){
    const group=new THREE.Group();
    for(const [size,p]of [[[.52,.12,.32],[0,.06,0]],[[.23,.22,.2],[0,.2,0]],[[.58,.14,.29],[0,.37,0]]]){const part=meshBox(size,0x444b4a);part.position.set(...p);group.add(part);}
    const horn=new THREE.Mesh(new THREE.ConeGeometry(.12,.33,5),material(0x515755));horn.rotation.z=-Math.PI/2;horn.position.set(.43,.37,0);group.add(horn);this.scene.add(group);return group;
  }
  updateAnvils(){
    const state=this.state,keep=new Set();
    for(const a of state.anvils||[]){keep.add(a.id);let mesh=this.anvilMeshes.get(a.id);if(!mesh){mesh=this.makeAnvil();this.anvilMeshes.set(a.id,mesh);}const elapsed=state.age-a.born;mesh.position.set(a.x,Math.max(.025,5-11.83*elapsed*elapsed),a.z);mesh.rotation.y=a.id*.37;}
    for(const [id,mesh]of this.anvilMeshes)if(!keep.has(id)){this.scene.remove(mesh);mesh.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});this.anvilMeshes.delete(id);}
  }
  captureRoom(target){
    const old=this.renderer.getRenderTarget(),monitorVisible=this.monitor.visible,doorVisible=this.doorView.visible;
    this.monitor.visible=false;this.doorView.visible=false;
    const camera=this.camera.clone();camera.aspect=target.width/target.height;camera.fov=Math.max(42,2*Math.atan(.62/camera.aspect)*180/Math.PI);camera.updateProjectionMatrix();
    this.renderer.setRenderTarget(target);this.renderer.render(this.scene,camera);this.renderer.setRenderTarget(old);
    this.monitor.visible=monitorVisible;this.doorView.visible=doorVisible;
  }
  updateOddities(){
    const s=this.state,e=s.effects||{},doorOpen=e.doorUntil>s.age;
    if(this.floorHammer){this.floorHammer.visible=!s.hasHammer;this.floorHammer.position.set(s.toolPosition?.[0]??.75,.05,s.toolPosition?.[1]??-.75);}
    if(this.bowl)this.bowl.visible=!(e.bowlUntil>s.age);
    if(this.wallReply){
      const elapsed=5-(e.answerUntil-s.age),pulse=e.answerUntil>s.age?Math.max(0,Math.sin(elapsed*Math.PI*3))*Math.exp(-elapsed*.4):0;
      this.wallReply.position.x=-3.405+pulse*.09;
    }
    if(this.doorView){
      if(doorOpen&&!this.doorWasOpen)this.captureRoom(this.doorTarget);
      this.doorView.visible=doorOpen;this.doorView.scale.x=doorOpen?Math.min(1,(e.doorUntil-s.age)*1.5,(7-e.doorUntil+s.age)*1.5):0;
      this.doorWasOpen=doorOpen;
    }
    if(e.copy&&!this.roomWasCopied){this.captureRoom(this.copyTarget);this.roomWasCopied=true;}
    if(!e.copy)this.roomWasCopied=false;
    if(this.monitor)this.monitor.material.map=e.copy?this.copyTarget.texture:this.monitorTexture;
    if(e.clockUntil>s.age){this.minuteHand.rotation.z=s.age*1.5;this.hourHand.rotation.z=s.age*.14;this.clockWasOdd=true;}
    else if(this.clockWasOdd){this.clockWasOdd=false;this.setDaylight(new Date());}
    if(this.debris)for(let i=0;i<this.debris.children.length;i++){
      const chip=this.debris.children[i];chip.visible=s.wallDamage>i*4;
      const fall=s.stage==='strike'&&s.hammerStrikes>0?(s.workElapsed%1.2):1.2;
      chip.position.set(-3.1+i*.07,.025+Math.max(0,.8-fall*fall*1.8),-.85+Math.sin(i*3)*.17);chip.rotation.set(i,0,fall*4);
    }
  }
  animate(t,dt){
    if(!this.state||!this.model)return;const s=this.state;
    this.updateAnvils();
    this.updateOddities();
    if(!s.alive){
      this.dragging=false;this.speakingUntil=0;this.overlay.hidden=true;
      if(this.hammer)this.hammer.visible=false;if(this.book)this.book.visible=false;if(this.headset)this.headset.visible=false;if(this.cable)this.cable.visible=false;
      const fall=Math.min(1,s.deadFor*2.2);this.body.rotation.set(fall*Math.PI/2,0,fall*.12);this.body.position.y=.48*fall;this.resident.rotation.y=THREE.MathUtils.lerp(s.yaw||0,0,fall);
      this.model.visible=!s.skeleton;if(this.skeleton)this.skeleton.visible=s.skeleton;
      for(const [name,bone]of Object.entries(this.bones)){bone.quaternion.copy(this.rest[name].q);bone.position.copy(this.rest[name].p);}
      this.pose('upper_arm.R',.25,0,-.4);this.pose('upper_arm.L',.1,0,.5);return;
    }
    if(this.skeleton)this.skeleton.visible=false;this.model.visible=this.formation===undefined||this.formation>=1;this.body.rotation.z=0;
    super.animate(t,dt);
    const settled=!s.walking&&!this.dragging,hammering=settled&&s.activity==='hammer'&&s.stage==='strike',uploading=settled&&s.activity==='upload';
    if(this.hammer)this.hammer.visible=!!s.hasHammer&&s.activity==='hammer';
    if(this.headset)this.headset.visible=uploading&&s.workElapsed>2;
    if(this.cable)this.cable.visible=this.headset?.visible;
    const face=expression(s);
    if(settled&&s.activity==='watch'&&s.feeling==='sad')this.pose('head',face.head,this.headYaw||0);
    if(s.stage==='pickup'){this.pose('chest',.7);this.pose('upper_arm.R',.65);this.pose('forearm.R',.1);this.pose('head',.35);}
    if(hammering){const lift=Math.sin((s.workElapsed%1.2)/1.2*Math.PI);this.pose('upper_arm.R',.85+lift*1.4,0,-.15);this.pose('forearm.R',.2+lift*.8);this.pose('upper_arm.L',.9,0,.15);this.pose('chest',lift*.12);this.pose('head',.08,0,-.08);}
    if(s.activity==='hammer'&&s.stage==='inspect'){this.pose('upper_arm.R',.15,0,-.2);this.pose('head',.1,-.2,-.15);}
    if(uploading){this.pose('upper_arm.R',.95,0,-.2);this.pose('forearm.R',.5+Math.sin(t*8)*.05);this.pose('upper_arm.L',.9,0,.15);this.pose('forearm.L',.45);this.pose('head',.12,0,0);
      if(s.stage==='connect'){this.pose('upper_arm.R',2.2,0,-.15);this.pose('forearm.R',1.6);this.pose('upper_arm.L',2.2,0,.15);this.pose('forearm.L',1.6);}
      this.scene.updateMatrixWorld(true);const head=this.headBone.getWorldPosition(new THREE.Vector3());head.y+=.22;
      const points=this.cable.geometry.attributes.position;for(let i=0;i<points.count;i++){const p=i/(points.count-1);points.setXYZ(i,THREE.MathUtils.lerp(head.x,2.05,p),THREE.MathUtils.lerp(head.y,1.28,p)-Math.sin(p*Math.PI)*.45,THREE.MathUtils.lerp(head.z,-1.8,p));}points.needsUpdate=true;this.cable.geometry.computeBoundingSphere();
    }
    if(settled&&s.activity==='escape'){
      this.pose('upper_arm.R',.15);this.pose('upper_arm.L',.15);this.pose('forearm.R',0);this.pose('forearm.L',0);
      if(s.stage==='handle'){this.pose('upper_arm.R',1.0,0,-.12);this.pose('forearm.R',.4);this.pose('hand.R',0,Math.sin(t*13)*.5,0);this.handle.rotation.z=Math.sin(t*13)*.2;}
      if(s.stage==='push'){this.pose('upper_arm.R',1.35);this.pose('upper_arm.L',1.35);this.pose('chest',.2+Math.sin(t*4)*.07);}
      if(s.stage==='kick'){const kick=Math.max(0,Math.sin((s.workElapsed%12-6)*Math.PI));this.pose('thigh.R',kick*1.05);this.pose('shin.R',-.2*kick);this.pose('chest',-.16*kick);}
      if(s.stage==='listen'){this.pose('head',0,0,.4);this.pose('chest',.14);}
    }
    if(this.handle&&s.stage!=='handle')this.handle.rotation.z=0;
    if(s.activity==='confined'){this.pose('head',.3,0,Math.sin(t*25)*.025);this.pose('upper_arm.R',2.1,0,-.3);this.pose('forearm.R',1.9);this.pose('upper_arm.L',2.1,0,.3);this.pose('forearm.L',1.9);}
    if(s.activity==='forced_read'){this.pose('upper_arm.R',.75,0,-.15);this.pose('forearm.R',.9);this.pose('upper_arm.L',.75,0,.15);this.pose('forearm.L',.9);this.pose('head',.28);if(this.book)this.book.visible=true;}
    if(this.openMouth){this.openMouth.visible=t<this.speakingUntil||face.mouth>0;this.openMouth.scale.y=t<this.speakingUntil?.4+Math.abs(Math.sin(t*12)):face.mouth;this.frown.visible=!this.openMouth.visible;}
    if(this.brows)for(let i=0;i<2;i++)this.brows[i].rotation.z=(i?1:-1)*(face.brow+(i?face.asymmetry||0:0));
    if(this.cracks){this.cracks.visible=s.wallDamage>3;this.cracks.children.forEach((c,i)=>c.visible=s.wallDamage>i*3);}
    const monitorText=s.uploadProgress>=99?'COPY IS A ROOM':uploading?`COPYING ${Math.floor(s.uploadProgress)}%`:'NO CARRIER';
    if(this.monitorTexture&&this.lastMonitorText!==monitorText){this.lastMonitorText=monitorText;const c=this.monitorTexture.image.getContext('2d');c.fillStyle='#17251e';c.fillRect(0,0,128,96);c.fillStyle='#9fbd8d';c.font='10px monospace';c.fillText(monitorText,8,45);c.fillText(s.uploadProgress>=99?'ACCESS DENIED':'_',8,62);this.monitorTexture.needsUpdate=true;}
  }
  bindPointer(){
    // Observer's glass: tapping is allowed, but never dragging a dead body or a half-loaded resident.
    const canvas=this.renderer.domElement;
    canvas.addEventListener('pointerdown',e=>{if(e.button===0&&this.state?.alive){this.container.focus();this.onInteraction('tap',{});}});
    this.container.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.repeat&&this.state?.alive){e.preventDefault();this.onInteraction('tap',{});}});
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();cancelAnimationFrame(this.raf);this.container.dispatchEvent(new CustomEvent('render-lost'));});
  }
}
