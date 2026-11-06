import * as THREE from 'three';
import {KEEPSAKES} from './night.js';
const material=(color,basic=false)=>basic?new THREE.MeshBasicMaterial({color}):new THREE.MeshLambertMaterial({color,flatShading:true});
const box=(x,y,z,color)=>new THREE.Mesh(new THREE.BoxGeometry(x,y,z),material(color));
const sphere=(radius,color)=>new THREE.Mesh(new THREE.IcosahedronGeometry(radius,1),material(color));
const put=(parent,mesh,x=0,y=0,z=0)=>{mesh.position.set(x,y,z);parent.add(mesh);return mesh;};
const group=(parent,x=0,y=0,z=0)=>put(parent,new THREE.Group(),x,y,z);
function label(width,height){const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.magFilter=map.minFilter=THREE.NearestFilter;map.generateMipmaps=false;return map;}
function plane(w,h,color){return new THREE.Mesh(new THREE.PlaneGeometry(w,h),material(color,true));}
function keepsake(key){
 const g=new THREE.Group(),ivory=0xc7c4a3,ink=0x26382d,brass=0x9c9769;
 const part=(mesh,x=0,y=.08,z=0)=>put(g,mesh,x,y,z);
 const disc=(r,h,color)=>new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,10),material(color));
 if(key==='tooth'){part(sphere(.065,ivory),0,.13);for(const x of [-.032,.032]){const root=new THREE.Mesh(new THREE.ConeGeometry(.025,.1,5),material(ivory));root.rotation.z=Math.PI;part(root,x,.055);}}
 if(key==='button'){const b=disc(.068,.025,brass);b.rotation.x=Math.PI/2;part(b);for(const x of [-.024,.024])for(const y of [.056,.104])part(sphere(.012,ink),x,y,.019);}
 if(key==='bloom'){part(box(.015,.13,.015,0x677747));for(let i=0;i<5;i++)part(sphere(.032,0xd4c879),Math.cos(i*Math.PI*.4)*.04,.16+Math.sin(i*Math.PI*.4)*.04);}
 if(key==='boat'){const b=new THREE.Mesh(new THREE.ConeGeometry(.075,.07,4),material(ivory));b.rotation.z=Math.PI;b.scale.x=1.4;part(b,0,.035);part(plane(.085,.09,ivory),.01,.1);}
 if(key==='spool'){for(const x of [-.045,.045]){const reel=disc(.05,.03,brass);reel.rotation.x=Math.PI/2;part(reel,x);part(sphere(.015,ink),x,.08,.025);}part(box(.12,.025,.02,ink));}
 if(key==='shell'){const shell=new THREE.Mesh(new THREE.ConeGeometry(.07,.14,7),material(0xaaa893));shell.rotation.z=-.7;part(shell);for(let i=0;i<3;i++)part(box(.055,.012,.06,ivory),-.02+i*.02,.08+i*.027,.035);}
 if(key==='jar'){part(disc(.05,.13,0x536754));part(disc(.055,.025,brass),0,.155);part(plane(.035,.07,ink),0,.08,.051);}
 if(key==='silhouette'){part(plane(.045,.09,ink));part(sphere(.03,ink),0,.15);for(const x of [-.035,.035])part(plane(.022,.12,ink),x,.07);}
 if(key==='stamp'){part(box(.13,.03,.08,brass),0,.02);part(box(.025,.07,.025,ink),0,.07);part(sphere(.04,ink),0,.12);}
 if(key==='eye'){part(box(.14,.1,.06,brass));part(sphere(.045,ivory),0,.08,.04);part(sphere(.023,ink),0,.08,.075);}
 if(key==='tenant'){part(box(.14,.09,.02,0xa1aa89));for(const x of [-.04,0,.04])part(box(.016,.055,.012,ink),x,.08,.018);}
 if(key==='seal'){const paper=part(box(.12,.17,.014,0xa55542),0,.09);paper.rotation.z=-.18;part(box(.085,.03,.016,ivory),0,.085,.015);}
 g.userData.keepsake=key;return g;
}
export class NightView{
 constructor(room){
  this.room=room;this.root=group(room.scene);this.targets=[];this.hand=new THREE.Vector3();this.lastPanel='';
  // Unsolicited parcel: four feet, real lid, old cross-shaped packing tape.
  this.parcel=group(this.root,-.65,.27,.8);put(this.parcel,box(.65,.45,.48,0x877252));put(this.parcel,box(.08,.46,.49,0xbcb190));put(this.parcel,box(.66,.46,.07,0xbcb190));
  this.parcelLid=group(this.parcel,0,.23,-.24);put(this.parcelLid,box(.67,.035,.5,0x9d8561),0,0,.25);
  this.feet=[];for(const x of [-.24,.24])for(const z of [-.17,.17])this.feet.push(put(this.parcel,box(.09,.2,.1,0x3b3d31),x,-.29,z));
  // A cracked pot, a plant whose leaves physically unfurl, and a small warm star.
  this.pot=group(this.root,1.1,.18,1.06);put(this.pot,new THREE.Mesh(new THREE.CylinderGeometry(.23,.16,.36,8),material(0x795c46)));
  const soil=new THREE.Mesh(new THREE.CircleGeometry(.2,12),material(0x343b2c));soil.rotation.x=-Math.PI/2;put(this.pot,soil,0,.183,0);
  this.plant=group(this.pot,0,.18,0);put(this.plant,box(.04,.8,.04,0x4b6440),0,.4,0);this.leaves=[];
  for(let i=0;i<6;i++){const leaf=sphere(.17,i%2?0x71814c:0x4d6744);leaf.scale.set(1,.23,.5);put(this.plant,leaf,(i%2?1:-1)*.12,.12+i*.105,0);leaf.rotation.z=(i%2?1:-1)*.4;this.leaves.push(leaf);}
  this.flower=put(this.plant,sphere(.16,0xc5c06b),0,.86,0);this.flower.material=material(0xe0cd7a,true);
  this.jug=group(this.root);put(this.jug,new THREE.Mesh(new THREE.CylinderGeometry(.08,.1,.2,8),material(0xa4aba0)));put(this.jug,box(.18,.035,.04,0x8f9988),.13,.06,0);
  // Rain costs one line buffer; no sprites, render targets, lights or per-frame meshes.
  this.cloud=group(this.root,.8,2.8,.55);for(let i=0;i<5;i++)put(this.cloud,sphere(.24+(i%2)*.09,0x788584),(i-2)*.22,Math.sin(i*3)*.08,Math.cos(i)*.12);
  this.rainBuffer=new Float32Array(48*6);const rainGeometry=new THREE.BufferGeometry();rainGeometry.setAttribute('position',new THREE.BufferAttribute(this.rainBuffer,3));
  this.rain=put(this.root,new THREE.LineSegments(rainGeometry,new THREE.LineBasicMaterial({color:0xa3bec5,transparent:true,opacity:.55})));this.rain.frustumCulled=false;
  this.puddle=put(this.root,new THREE.Mesh(new THREE.CircleGeometry(1.55,24),new THREE.MeshBasicMaterial({color:0x536b66,transparent:true,opacity:.5,depthWrite:false})),.45,.021,.65);this.puddle.rotation.x=-Math.PI/2;
  this.drain=group(this.root,-.9,.025,.55);const rim=new THREE.Mesh(new THREE.CircleGeometry(.16,12),material(0x30352e));rim.rotation.x=-Math.PI/2;this.drain.add(rim);for(let i=0;i<4;i++)put(this.drain,box(.26,.012,.018,0x818a76),0,.005,-.09+i*.06);
  this.boat=group(this.root);const sail=plane(.27,.23,0xc6c1a6);put(this.boat,sail,0,.16,0);sail.rotation.y=.25;const hull=new THREE.Mesh(new THREE.ConeGeometry(.2,.2,4),material(0xb9b89e));hull.rotation.z=Math.PI;hull.scale.set(1.6,.5,.6);put(this.boat,hull,0,.03,0);
  // The wind-up mouse is deliberately a cheap metal toy, not another actor/model.
  this.mouse=group(this.root);const mouseBody=put(this.mouse,sphere(.13,0x8c8b72),0,.1,0);mouseBody.scale.set(.75,.7,1.35);put(this.mouse,sphere(.07,0x777c65),0,.12,.14);for(const x of [-.065,.065])put(this.mouse,sphere(.047,0x9ba088),x,.18,.12);
  put(this.mouse,sphere(.018,0x131e18),0,.13,.205);this.windKey=put(this.mouse,box(.19,.05,.025,0xb6a878),0,.21,-.06);put(this.mouse,box(.025,.045,.2,0x616d5c),0,.06,-.21);
  this.mouseShadow=put(this.root,new THREE.Mesh(new THREE.CircleGeometry(.2,12),new THREE.MeshBasicMaterial({color:0x080e0a,transparent:true,opacity:.25,depthWrite:false})));this.mouseShadow.rotation.x=-Math.PI/2;
  // Rotary telephone and its small physical instruction lamps.
  this.phone=group(this.root,1.11,1.1,-1.02);put(this.phone,box(.4,.11,.29,0x333f36));const dial=new THREE.Mesh(new THREE.CylinderGeometry(.1,.1,.02,12),material(0x9a997b));put(this.phone,dial,0,.07,.025);
  this.receiver=group(this.phone,0,.13,-.075);put(this.receiver,box(.35,.045,.065,0x26342d));for(const x of [-.15,.15])put(this.receiver,box(.09,.08,.11,0x26342d),x,-.025,0);
  this.phoneMap=label(192,80);const phonePanel=new THREE.Mesh(new THREE.PlaneGeometry(.68,.28),new THREE.MeshBasicMaterial({map:this.phoneMap}));put(this.root,phonePanel,1.1,1.55,-2.36);
  this.lamps=[0,1,2].map(i=>put(this.root,sphere(.028,0x646c4c),.91+i*.18,1.33,-2.31));
  // A shutter belongs to the room, not to the camera or observer's glass.
  this.shutter=group(this.root,-2.02,2.03,-2.18);for(let i=0;i<10;i++)put(this.shutter,box(1.4,.145,.04,0x5e6855),0,.68-i*.145,0);
  this.shutterRail=put(this.root,box(1.5,.08,.08,0x636c55),-2.02,2.83,-2.16);
  // Loose shadow with one eye: planar geometry can climb the wall then lie on the floor.
  this.shadow=group(this.root);this.shadowInk=material(0x111a12,true);
  const head=new THREE.Mesh(new THREE.CircleGeometry(.16,12),this.shadowInk);put(this.shadow,head,0,.85,.001);
  for(const [x,y,w,h,rz]of [[0,.5,.19,.5,0],[-.2,.52,.09,.5,-.5],[.2,.52,.09,.5,.5],[-.09,.1,.09,.44,-.2],[.09,.1,.09,.44,.2]]){const limb=new THREE.Mesh(new THREE.PlaneGeometry(w,h),this.shadowInk);limb.rotation.z=rz;put(this.shadow,limb,x,y,0);}
  put(this.shadow,plane(.035,.035,0xbec5a4),.045,.86,.005);
  this.jar=group(this.root,.95,1.1,-.9);put(this.jar,new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,.22,8),material(0x4e6254)));put(this.jar,box(.2,.04,.2,0x9a9b7d),0,.13,0);
  // Inspection apparatus: a huge mechanical eye on a telescoping ceiling stalk.
  this.inspector=group(this.root,0,2.5,-.2);put(this.inspector,box(1,.62,.48,0xa8a286));put(this.inspector,box(1.06,.065,.54,0x6c725e),0,.32,0);put(this.inspector,box(1.06,.065,.54,0x6c725e),0,-.32,0);
  this.eye=group(this.inspector,0,0,.26);put(this.eye,new THREE.Mesh(new THREE.CircleGeometry(.25,16),material(0xc8c6a3,true)));this.pupil=put(this.eye,new THREE.Mesh(new THREE.CircleGeometry(.105,12),material(0x17241d,true)),0,0,.005);
  this.stalk=put(this.inspector,box(.07,1.2,.07,0x5c6856),0,.9,-.12);this.inspectionMap=label(192,96);put(this.inspector,new THREE.Mesh(new THREE.PlaneGeometry(.75,.36),new THREE.MeshBasicMaterial({map:this.inspectionMap})),0,-.53,.2);
  this.seal=group(this.root,.05,1.2,-2.09);this.sealMap=label(256,64);const sealMesh=new THREE.Mesh(new THREE.PlaneGeometry(1.17,.26),new THREE.MeshBasicMaterial({map:this.sealMap}));sealMesh.rotation.z=-.22;this.seal.add(sealMesh);
  this.bolt=group(this.root,.12,1.1,-2.07);put(this.bolt,box(1.3,.09,.09,0x495b46));for(const x of [-.4,.4])put(this.bolt,box(.07,.18,.12,0x868d70),x,0,0);
  // Keepsakes live on an unlabelled shelf. This is not an achievements screen.
  this.shelf=group(this.root,2.55,2.15,-2.26);this.keepsakes=new Map();
  for(let row=0;row<2;row++)put(this.shelf,box(1.1,.04,.27,0x676c51),0,row*.28,0);
  KEEPSAKES.forEach((key,i)=>{const o=keepsake(key);put(this.shelf,o,-.45+(i%6)*.18,.025+Math.floor(i/6)*.28,0);this.keepsakes.set(key,o);});
  this.neighbor=group(this.root,-3.19,.55,-.3);put(this.neighbor,box(.04,.14,.45,0x272f25));this.button=put(this.root,sphere(.04,0xb2b388),-1.35,.04,-.7);
  this.target('open-parcel',[-.65,.25,.8],[.85,.7,.7]);this.target('water',[1.1,.5,1.06],[.65,1,.6]);this.target('wind-mouse',[0,.15,.6],[.5,.4,.5]);this.target('answer',[1.1,1.3,-1],[.65,.65,.45]);this.target('shutter',[-2.02,2,-2.12],[1.4,1.6,.1]);this.target('drain',[-.9,.05,.55],[.45,.15,.45]);this.target('feed-wall',[-3.15,.55,-.3],[.2,.5,.65]);
  const x=this.sealMap.image.getContext('2d');x.fillStyle='#a55542';x.fillRect(0,0,256,64);x.fillStyle='#e2d7ad';x.font='bold 32px monospace';x.fillText('VACANT',68,42);this.sealMap.needsUpdate=true;
 }
 target(action,p,size){const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),new THREE.MeshBasicMaterial({visible:false}));mesh.position.set(...p);mesh.userData.action=action;mesh.userData.baseAction=action;this.root.add(mesh);this.targets.push(mesh);}
 hit(ray){return ray.intersectObjects(this.targets.filter(t=>t.visible),false)[0]?.object.userData.action||null;}
 update(s,t){
  const n=s.night;this.root.visible=!!n;if(!n)return;const r=this.room,work=s.chamber.job?.item||'',alive=s.alive;
  this.parcel.visible=n.phase==='parcel';this.parcel.position.y=.27+Math.sin(t*6)*.015;this.parcel.rotation.y=Math.sin(t*2)*.06;this.feet.forEach((f,i)=>f.rotation.x=Math.sin(t*7+i)*.3);this.parcelLid.rotation.x=work==='night:open-parcel'?-Math.min(1,s.chamber.job.progress*2):Math.sin(t*10)*.025;
  this.plant.visible=n.plant.planted;this.plant.scale.setScalar(.2+n.plant.growth*.8);this.flower.visible=n.plant.growth>.65;this.flower.rotation.y=t*.6;
  this.leaves.forEach((leaf,i)=>{leaf.rotation.z=(i%2?1:-1)*(.4+(1-n.plant.moisture)*.3+Math.sin(t+i)*.06);});
  this.jug.visible=work==='night:water';if(this.jug.visible){r.bones.handR?.getWorldPosition(this.hand);this.jug.position.copy(this.hand);this.jug.rotation.z=s.walking?0:.7;}
  this.cloud.visible=this.rain.visible=n.phase==='rain';this.cloud.position.y=2.8+Math.sin(t)*.035;
  for(let i=0;i<48;i++){const x=.8+Math.sin(i*42.3)*.75,z=.55+Math.cos(i*31.1)*.6,y=2.7-((t*2.1+i*.37)%2.65);this.rainBuffer.set([x,y,z,x,y-.13,z],i*6);}this.rain.geometry.attributes.position.needsUpdate=true;
  this.puddle.visible=n.water>.01;this.puddle.scale.setScalar(.2+Math.sqrt(n.water)*.8);this.puddle.material.color.setHex(n.variant==='cold'?0x536c70:0x606d4f);
  this.boat.visible=n.boat.made;this.boat.position.set(n.boat.launched?.4+Math.sin(t*.5)*.65:-.75,n.boat.launched?.045:.06,n.boat.launched?.6+Math.cos(t*.7)*.3:1.05);this.boat.rotation.set(n.boat.launched?Math.sin(t*2)*.06:0,n.boat.launched?t*.1:.2,0);
  this.mouse.visible=this.mouseShadow.visible=true;this.mouse.position.set(n.toy.x,.02,n.toy.z);this.mouse.rotation.y=n.toy.until>n.time?Math.atan2(Math.cos(n.time*.55)*.55,-Math.sin(n.time*.43)*.43):0;this.windKey.rotation.y=n.toy.until>n.time?t*7:0;this.mouseShadow.position.set(n.toy.x,.023,n.toy.z);
  this.receiver.position.y=.13+(n.phone.answered&&n.phase==='phone'?.1:0)+(n.phase==='phone'&&!n.phone.answered&&!n.phone.ignored?Math.sin(t*22)*.015:0);
  const shown=n.phase==='phone'&&n.phone.answered;this.lamps.forEach((lamp,i)=>lamp.material.color.setHex(shown&&i===n.phone.index?0xdbcf81:shown&&i<n.phone.index?0x91b579:0x5e674c));
  this.shutter.visible=n.shutter;this.shutterRail.visible=true;
  this.shadow.visible=alive&&n.phase==='shadow';
  if(this.shadow.visible){const bait=n.toy.until>n.time;this.shadow.position.set(bait?n.shadow.x:-1.1,bait?.035:1.1,bait?n.shadow.z:-2.17);this.shadow.rotation.set(bait?-Math.PI/2:0,0,bait?n.time*.05:Math.sin(t)*.1);this.shadow.scale.setScalar(bait?.8:1.2);}
  this.jar.visible=n.keepsakes.includes('jar');this.inspector.visible=n.phase==='inspection';this.inspector.position.set(Math.sin(t*.5)*.12,2.65+Math.sin(t*.8)*.08,-.05);
  this.pupil.position.x=THREE.MathUtils.clamp(s.position[0]*.05,-.12,.12);this.pupil.position.y=THREE.MathUtils.clamp((s.position[1]-.5)*.04,-.08,.08);
  this.seal.visible=!n.departureReady;this.bolt.visible=n.staying;this.shelf.visible=n.keepsakes.length>0;this.keepsakes.forEach((o,key)=>{o.visible=n.keepsakes.includes(key);});this.button.visible=n.neighbor.gifts>0;this.neighbor.position.y=.55+(n.time-n.neighbor.reply<2?Math.sin(t*25)*.01:0);
  const panelKey=[n.phase,n.phone.answered,n.phone.ignored,n.phone.code.join(''),n.phone.index,n.inspector.rule,n.inspector.submitted,n.resolved,n.inherited.includes('tenant')].join(':');
  if(panelKey!==this.lastPanel){this.lastPanel=panelKey;this.drawPanels(n);}
  for(const target of this.targets){target.visible=alive;if(target.userData.action==='open-parcel')target.visible=alive&&n.phase==='parcel';if(target.userData.baseAction==='answer'){target.visible=alive&&(n.phase==='phone'||n.serviceReady);target.userData.action=n.phase==='phone'?'answer':'call-service';}if(target.userData.baseAction==='water')target.userData.action=n.plant.planted?'water':'plant';if(['wind-mouse'].includes(target.userData.action))target.position.set(n.toy.x,.15,n.toy.z);}
 }
 drawPanels(n){
  let x=this.phoneMap.image.getContext('2d');x.fillStyle='#d0cbb1';x.fillRect(0,0,192,80);x.fillStyle='#394735';x.font='bold 16px monospace';x.fillText(n.phase==='eviction'?'ROOM: VACANT':n.staying?'DO NOT DISTURB':n.inherited.includes('tenant')?'RETURN SERVICE':'NIGHT SERVICE',12,22);x.font='22px monospace';x.fillText(n.phase==='phone'?(n.phone.answered?n.phone.code.join('  '):n.phone.ignored?'— — —':'RINGING'):'0 0 0',25,58);this.phoneMap.needsUpdate=true;
  x=this.inspectionMap.image.getContext('2d');x.fillStyle='#c6c3a4';x.fillRect(0,0,192,96);x.fillStyle='#394735';x.font='bold 14px monospace';x.fillText('INSPECTION',38,19);x.strokeStyle='#394735';x.lineWidth=3;x.strokeRect(20,35,48,42);if(n.inspector.rule==='dark'){for(let i=0;i<5;i++)x.fillRect(23,38+i*8,42,4);}else{x.beginPath();x.moveTo(44,36);x.lineTo(44,76);x.moveTo(22,55);x.lineTo(65,55);x.stroke();}
  x.beginPath();x.arc(128,51,16,0,Math.PI*2);if(n.inspector.rule==='light')x.fill();else x.stroke();x.fillRect(119,70,18,5);this.inspectionMap.needsUpdate=true;
 }
 pose(s,t){
  const n=s.night;if(!n)return;const r=this.room,j=s.chamber.job;
  if(s.alive&&n.phase==='shadow')r.shadow.visible=false;
  if(!j?.item.startsWith('night:')||s.walking)return;
  const kind=j.item.slice(6);r.pose('head',.25);r.pose('upper_arm.R',.8,0,-.18);r.pose('forearm.R',.8+Math.sin(t*4)*.12);r.pose('upper_arm.L',.65,0,.18);r.pose('forearm.L',.7);
  if(['plant','water','harvest','wind-mouse','fold-boat','float-boat','catch-shadow','play','open-parcel','return-parcel'].includes(kind)){r.pose('chest',.7);r.pose('thigh.R',.45);r.pose('shin.R',-.8);r.pose('thigh.L',.45);r.pose('shin.L',-.8);r.body.position.y=-.18;}
  if(['call-service','answer','transmit'].includes(kind)){r.pose('upper_arm.R',1.9,0,-.25);r.pose('forearm.R',1.9);r.pose('head',.1,0,-.15);}
  if(kind==='refuse-eviction'){r.pose('upper_arm.R',1.5+Math.sin(t*3)*.3);r.pose('forearm.R',.6);r.pose('chest',.15);}
 }
}
