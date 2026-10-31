import * as THREE from 'three';
const m=color=>new THREE.MeshLambertMaterial({color});
const ink=color=>new THREE.MeshBasicMaterial({color});
const box=(w,h,d,color)=>new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m(color));
function canvasTexture(w,h){const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.magFilter=THREE.NearestFilter;map.minFilter=THREE.NearestFilter;map.generateMipmaps=false;return map;}
function place(parent,object,x,y,z){object.position.set(x,y,z);parent.add(object);return object;}
function item(kind){
 const group=new THREE.Group();
 if(kind==='chalk'){const stick=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.24,6),m(0xe3dbc0));stick.rotation.z=Math.PI/2;group.add(stick);}
 if(kind==='soup'){
  group.add(new THREE.Mesh(new THREE.CylinderGeometry(.14,.1,.12,10),m(0xc3c2a5)));
  const soup=new THREE.Mesh(new THREE.CircleGeometry(.12,12),ink(0x8b5629));soup.rotation.x=-Math.PI/2;place(group,soup,0,.061,0);
 }
 if(kind==='coil'){
  for(let i=0;i<5;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(.1,.016,5,12),m(0xb9753b));place(group,ring,0,0,i*.035-.07);}
  place(group,box(.03,.13,.03,0x75674b),-.1,-.08,0);place(group,box(.03,.13,.03,0x75674b),.1,-.08,0);
 }
 if(kind==='mirror'){
  place(group,box(.33,.45,.035,0x665a44),0,.18,0);
  place(group,new THREE.Mesh(new THREE.PlaneGeometry(.27,.38),ink(0xb3c7bd)),0,.18,.022);
  place(group,box(.045,.17,.04,0x665a44),0,-.13,0);
 }
 if(kind==='key'){
  group.add(new THREE.Mesh(new THREE.TorusGeometry(.045,.013,5,10),m(0x282c29)));
  place(group,box(.025,.16,.025,0x282c29),0,-.1,0);place(group,box(.06,.025,.025,0x282c29),.02,-.16,0);
 }
 return group;
}
export class ChamberView{
 constructor(room){
  this.room=room;this.group=new THREE.Group();room.scene.add(this.group);this.targets=[];this.hand=new THREE.Vector3();this.lastLights=true;this.monitorFrame=-1;
  // A wall hatch and a low steel tray: all objects are reused between deliveries.
  place(this.group,box(.12,.65,.94,0x3f4842),-3.36,.4,.85);
  this.hatch=place(this.group,box(.03,.5,.8,0x8d9588),-3.28,.4,.85);
  for(let i=0;i<4;i++)place(this.hatch,box(.012,.02,.57,0x424b43),.02,-.13+i*.085,0);
  this.tray=place(this.group,box(.62,.035,.42,0x9aa28e),-.6,.06,.85);this.tray.visible=false;
  this.items={};for(const kind of ['soup','chalk','coil','mirror']){this.items[kind]=item(kind);this.group.add(this.items[kind]);this.items[kind].visible=false;}
  // Drawn geometry, not an achievement badge. Draw range reveals each stroke.
  const points=[[-.34,0,0],[-.34,1.9,0],[-.34,1.9,0],[.34,1.9,0],[.34,1.9,0],[.34,0,0],[.34,0,0],[-.34,0,0],[.21,.89,0],[.15,.89,0]];
  this.chalkMaterial=new THREE.LineBasicMaterial({color:0xd1d1ad,transparent:true,opacity:.8});
  this.outline=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p))),this.chalkMaterial);
  place(this.group,this.outline,-1.05,.03,-2.37);
  this.chalkVoid=place(this.group,new THREE.Mesh(new THREE.PlaneGeometry(.66,1.89),ink(0x010403)),-1.05,.98,-2.38);this.chalkVoid.visible=false;
  this.draught=place(this.group,new THREE.Mesh(new THREE.PlaneGeometry(.63,1.5),new THREE.MeshBasicMaterial({color:0xc5d2b5,transparent:true,opacity:.12,depthWrite:false})),-1.05,.015,-1.65);this.draught.rotation.x=-Math.PI/2;this.draught.visible=false;
  // A real empty socket, repair coil and three-channel receiver on the desk.
  this.socket=place(this.group,new THREE.Mesh(new THREE.TorusGeometry(.065,.016,6,12),m(0x292e2b)),1.73,1.29,-1.242);
  this.installedCoil=place(this.group,item('coil'),1.73,1.28,-1.19);this.installedCoil.scale.setScalar(.7);
  this.radio=place(this.group,box(.42,.21,.24,0x867b61),2.55,1.12,-.92);
  this.radioMap=canvasTexture(96,40);this.radioDisplay=place(this.radio,new THREE.Mesh(new THREE.PlaneGeometry(.26,.12),new THREE.MeshBasicMaterial({map:this.radioMap})),0,.015,.123);
  this.knob=place(this.radio,new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,.03,8),m(0x303b33)),.16,0,.13);this.knob.rotation.x=Math.PI/2;
  this.radioLights=[0,1,2].map(i=>place(this.radio,new THREE.Mesh(new THREE.SphereGeometry(.013,5,4),ink(0x363c2d)),-.12+i*.09,-.075,.13));
  this.mirror=place(this.group,item('mirror'),.68,.52,.45);this.mirror.scale.setScalar(1.65);this.mirror.rotation.y=-.2;
  place(this.mirror,box(.035,.35,.035,0x5a6255),0,-.35,-.05);place(this.mirror,box(.35,.035,.24,0x5a6255),0,-.52,-.05);
  this.reflection=place(this.mirror,new THREE.Mesh(new THREE.PlaneGeometry(.21,.24),new THREE.MeshBasicMaterial({map:room.visitorMaterial.map,transparent:true,opacity:.85})),0,.18,.025);
  this.key=place(this.group,item('key'),.2,.07,.6);this.key.rotation.x=-Math.PI/2;
  this.hook=place(this.group,new THREE.Mesh(new THREE.TorusGeometry(.04,.012,5,12,Math.PI*1.4),m(0x4c554a)),-.63,1.55,-2.19);
  // An opening remains black. No destination or camera beyond the observation room.
  this.doorVoid=place(this.group,new THREE.Mesh(new THREE.PlaneGeometry(1.16,2.45),ink(0x010403)),.05,1.25,-2.205);
  this.doorPivot=place(this.group,new THREE.Group(),-.56,1.25,-2.21);
  place(this.doorPivot,box(1.22,2.48,.13,0x8b8567),.61,0,0);
  place(this.doorPivot,box(.93,1,.03,0x979076),.61,.49,.08);place(this.doorPivot,box(.93,.74,.03,0x979076),.61,-.6,.08);
  place(this.doorPivot,new THREE.Mesh(new THREE.SphereGeometry(.045,7,6),m(0xbdb17a)),1.04,-.1,.15);
  this.plateMap=canvasTexture(128,40);place(this.group,new THREE.Mesh(new THREE.PlaneGeometry(.65,.2),new THREE.MeshBasicMaterial({map:this.plateMap})),2.95,2.65,-2.397);
  this.switch=place(this.group,box(.13,.22,.04,0xb7b299),.94,1.4,-2.37);this.switchLever=place(this.switch,box(.045,.08,.035,0x494f42),0,0,.04);
  this.bell=place(this.group,new THREE.Mesh(new THREE.SphereGeometry(.11,10,6,0,Math.PI*2,0,Math.PI/2),m(0x9e8660)),-1.42,.14,1.15);
  place(this.group,box(.3,.05,.24,0x595e51),-1.42,.04,1.15);
  // Slightly generous invisible hit volumes; the toolbar provides keyboard/touch equivalents.
  this.target('service',[-3.25,.45,.85],[.3,.9,1.15]);this.target('lights',[.94,1.4,-2.32],[.35,.45,.15]);
  this.target('tune',[2.55,1.15,-.86],[.62,.4,.3]);this.target('bell',[-1.42,.15,1.15],[.48,.36,.4]);this.target('release',[.05,1.3,-2.12],[1.1,2.35,.12]);
 }
 target(action,position,size){const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),new THREE.MeshBasicMaterial({visible:false}));mesh.position.set(...position);mesh.userData.action=action;this.group.add(mesh);this.targets.push(mesh);}
 hit(raycaster){return raycaster.intersectObjects(this.targets,false)[0]?.object.userData.action||null;}
 update(s,t){
  const c=s.chamber;if(!c)return;const r=this.room,j=c.job,delivery=c.delivery;
  if(!c.lights){if(this.lastLights)this.lightValues=[r.hemi.intensity,r.sun.intensity,r.lamp.intensity];r.hemi.intensity=.28;r.sun.intensity=.08;r.lamp.intensity=0;}
  else if(!this.lastLights&&this.lightValues)[r.hemi.intensity,r.sun.intensity,r.lamp.intensity]=this.lightValues;
  this.lastLights=c.lights;this.switchLever.rotation.x=c.lights?-.25:.25;
  this.hatch.position.y=.4+(delivery?(delivery.returning?.02:.42):0);
  this.tray.visible=!!delivery;
  for(const mesh of Object.values(this.items))mesh.visible=false;
  if(delivery){const p=Math.min(1,(s.age-delivery.born)/1.2),x=delivery.returning?THREE.MathUtils.lerp(-.6,-3.2,Math.min(1,(j?.work||0)/2)):THREE.MathUtils.lerp(-3.2,-.6,p);this.tray.position.x=x;const mesh=this.items[delivery.item];mesh.visible=true;mesh.position.set(x,.17,.85);mesh.rotation.set(0,t*.1,0);}
  if(!delivery&&this.items[j?.item]&&['walk','work'].includes(j.phase)){
   const carried=this.items[j.item];carried.visible=true;r.bones.handR?.getWorldPosition(this.hand);carried.position.copy(this.hand);carried.rotation.set(0,0,Math.PI/4);
  }
  this.outline.visible=c.chalk>0||!!c.inherited.chalk;this.outline.geometry.setDrawRange(0,c.chalk>0?Math.max(2,Math.ceil(c.chalk*5)*2):10);
  this.chalkMaterial.opacity=c.chalk>=1?(c.lights?.65:1):c.chalk>0?.7:.18;this.chalkMaterial.color.setHex(c.lights?0xbfc2a5:0xe0eccc);
  this.chalkVoid.visible=c.chalkOpen&&!c.lights;this.draught.visible=this.chalkVoid.visible;
  this.draught.material.opacity=.09+Math.sin(t*1.8)*.025;
  this.installedCoil.visible=c.coil;this.mirror.visible=c.mirror;this.reflection.visible=!!s.visitor?.reflected;
  this.key.visible=c.key!=='none'&&!s.outcome;
  if(c.key==='held'&&r.bones.handR){r.bones.handR.getWorldPosition(this.hand);this.key.position.copy(this.hand);this.key.rotation.set(0,0,.2);}else{this.key.position.set(.2,.06,.6);this.key.rotation.x=-Math.PI/2;}
  this.hook.visible=!!c.inherited.key||c.key==='held';
  const doorOpen=j?.item==='door'&&j.exit==='door'||s.outcome?.kind==='door';
  this.doorVoid.visible=this.doorPivot.visible=!!doorOpen;r.door.visible=!doorOpen;for(const p of r.doorPanels)p.visible=!doorOpen;r.doorLabel.visible=!doorOpen;r.handle.visible=!doorOpen;
  this.doorPivot.rotation.y=doorOpen?-1.15:0;if(doorOpen)r.doorView.visible=false;
  if(this.lastVisit!==c.visits){this.lastVisit=c.visits;const x=this.plateMap.image.getContext('2d');x.fillStyle='#c3bea0';x.fillRect(0,0,128,40);x.fillStyle='#454d42';x.font='bold 17px monospace';x.fillText(`ROOM ${String(c.visits).padStart(3,'0')}`,12,26);this.plateMap.needsUpdate=true;}
  // Own the map every rendered frame; the legacy copy may run before repair,
  // but must never overwrite the carrier or show an occupant after departure.
  r.monitor.material.map=s.effects?.copy&&!c.coil&&!s.outcome?r.copyTarget.texture:r.monitorTexture;
  if(this.monitorFrame!==Math.floor(t*6)){
   this.monitorFrame=Math.floor(t*6);this.drawMonitor(s,t);
   const x=this.radioMap.image.getContext('2d');x.fillStyle='#27342d';x.fillRect(0,0,96,40);x.fillStyle=c.channel===c.carrier?'#c8d59e':'#939d83';x.font='22px monospace';x.fillText(`0${c.channel}`,10,28);x.fillRect(56,24-(c.channel===c.carrier?12:Math.sin(t*9)*8),26,2);this.radioMap.needsUpdate=true;
  }
  for(let i=0;i<3;i++)this.radioLights[i].material.color.setHex(i===c.channel-1?(c.channel===c.carrier?0xb7ca7c:0xba914d):0x363c2d);
 }
 drawMonitor(s,t){
  const r=this.room,c=s.chamber,x=r.monitorTexture.image.getContext('2d'),carrier=c.channel===c.carrier;
  x.fillStyle='#102219';x.fillRect(0,0,128,96);x.fillStyle='#a9bf91';x.strokeStyle='#a9bf91';x.font='10px monospace';
  if(s.outcome){x.fillText('NO CARRIER',25,47);if(Math.floor(t)%2)x.fillRect(26,56,5,2);}
  else if(!c.coil){x.strokeRect(52,32,22,22);x.fillText('EMPTY SOCKET',12,77);if(c.inherited.signal){x.fillRect(12+Math.sin(t)*8,15,3,3);x.fillRect(91,57,2,2);}}
  else{x.fillText(carrier?'CARRIER':'SEARCHING',13,19);x.beginPath();for(let i=0;i<110;i++){const y=46+(carrier?Math.sin(i*.18-t*3)*9:Math.sin(i*2.7+t*5)*17);if(i)x.lineTo(i+9,y);else x.moveTo(i+9,y);}x.stroke();x.fillText(c.lights?'LIGHT INTERFERENCE':c.job?.item==='signal'?'CONNECTED':'_',8,79);}
  r.monitorTexture.needsUpdate=true;
 }
 pose(s,t){
  const j=s.chamber?.job;if(!j)return;const r=this.room;
  if(j.phase==='refuse'){r.pose('head',0,Math.sin(t*5)*.35);r.pose('upper_arm.R',.5,0,-.6);r.pose('forearm.R',1.1);}
  if(s.walking){if(this.items[j.item]){r.pose('upper_arm.R',.5,0,-.2);r.pose('forearm.R',1.1);}return;}
  if(s.activity==='collect'){r.pose('chest',.65);r.pose('upper_arm.R',.8);r.pose('forearm.R',.2);r.pose('head',.35);}
  if(s.activity==='draw'){r.pose('upper_arm.R',1.7+Math.sin(t*2)*.25,0,-.2);r.pose('forearm.R',.35+Math.sin(t*3)*.1);r.pose('head',-.1,Math.sin(t)*.1);}
  if(s.activity==='wire'){r.pose('upper_arm.R',1.0);r.pose('upper_arm.L',.95);r.pose('forearm.R',.65+Math.sin(t*10)*.1);r.pose('forearm.L',.7);r.pose('head',.35);r.pose('thigh.R',1.45);r.pose('shin.R',-1.45);r.pose('thigh.L',1.45);r.pose('shin.L',-1.45);r.body.position.y=-.26;}
  if(s.activity==='mount'){r.pose('chest',.25);r.pose('upper_arm.R',.8,0,-.3);r.pose('upper_arm.L',.8,0,.3);r.pose('forearm.R',.65);r.pose('forearm.L',.65);}
  if(j.item==='signal'){
   r.headset.visible=true;r.cable.visible=true;r.pose('head',.15);const p=j.progress;
   if(p>.72){r.model.visible=Math.floor(t*13)%3!==0;r.pose('upper_arm.R',.5);r.pose('upper_arm.L',.5);}
  }
  if(j.item==='door'&&j.phase==='work'){
   const p=j.progress;r.resident.position.set(s.position[0],0,s.position[1]);r.resident.rotation.y=Math.PI;
   r.pose('thigh.R',Math.sin(t*8)*.25);r.pose('thigh.L',-Math.sin(t*8)*.25);r.pose('head',0,p<.3?.7:0);
   if(p>.9)r.model.visible=false;
  }
 }
}
