import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {SPECIES,speciesId} from './species.js';
import {nativeFace} from './expressions.js';
const point=new THREE.Vector3(),quat=new THREE.Quaternion(),euler=new THREE.Euler();
const clamp=THREE.MathUtils.clamp;

export function disposeBody(model){
 const geometries=new Set(),materials=new Set(),textures=new Set(),skeletons=new Set();
 model?.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.skeleton)skeletons.add(o.skeleton);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}});
 for(const s of skeletons)s.dispose();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();
}
export function attachBodyGear(room){
 const hand=room.bones.handR||room.bones.nose||room.headBone;
 if(room.book){hand.add(room.book);room.book.position.set(.06,.1,.02);room.book.rotation.set(0,0,0);room.book.visible=false;}
 if(room.hammer){hand.add(room.hammer);room.hammer.position.set(0,0,0);room.hammer.rotation.set(0,0,0);room.hammer.visible=false;}
 if(room.headset&&room.headBone){
  room.body.updateMatrixWorld(true);room.headBone.getWorldPosition(point);point.y+=room.species==='human'?.195:.15;
  room.scene.add(room.headset);room.headset.position.copy(point);room.headset.rotation.set(0,0,0);room.headBone.attach(room.headset);room.headset.visible=false;
 }
}
export async function switchBody(room,requested){
 const species=speciesId(requested),ticket=room.bodyLoadTicket=(room.bodyLoadTicket||0)+1;
 if(room.species===species)return room;
 const gltf=await new GLTFLoader().loadAsync(`/assets/${SPECIES[species].asset}.glb`),model=gltf.scene;
 if(ticket!==room.bodyLoadTicket){disposeBody(model);return room;}
 model.traverse(o=>{if(o.isMesh){const source=Array.isArray(o.material)?o.material:[o.material];const converted=source.map(m=>{const result=new THREE.MeshLambertMaterial({color:m.color,map:m.map,side:m.side,transparent:m.transparent,opacity:m.opacity,flatShading:false});m.dispose();return result;});o.material=converted.length===1?converted[0]:converted;}});
 for(const gear of [room.hammer,room.book,room.headset])gear?.removeFromParent();
 room.model?.removeFromParent();disposeBody(room.model);room.assetLoads?.delete(SPECIES[room.species]?.asset);
 room.model=model;room.species=species;room.body.add(model);room.bones={};room.rest={};room.nativeMorphs=[];
 model.traverse(o=>{if(o.isBone){const id=o.name.replaceAll('.','');room.bones[id]=o;room.rest[id]={q:o.quaternion.clone(),p:o.position.clone(),s:o.scale.clone()};}if(o.morphTargetDictionary)room.nativeMorphs.push(o);});
 room.headBone=room.bones.head;room.body.position.set(0,0,0);room.body.rotation.set(0,0,0);room.body.scale.set(1,1,1);
 attachBodyGear(room);room.skeleton.visible=false;room.materialize(room.formation??0);return room;
}

export function animateCreature(room,s,t,dt){
 const moving=s.walking,kind=s.species,alive=s.alive,resting=s.activity==='rest',reaction=s.laboratory?.reaction||{};
 room.overlay.hidden=true;room.skeleton.visible=false;room.hammer.visible=false;room.headset.visible=false;room.cable.visible=false;room.book.visible=false;
 room.body.rotation.set(0,0,0);room.body.scale.set(1,1,1);room.body.position.set(0,s.seated?.65:0,0);
 room.resident.position.x=THREE.MathUtils.damp(room.resident.position.x,s.position[0],12,dt);room.resident.position.z=THREE.MathUtils.damp(room.resident.position.z,s.position[1],12,dt);
 const turn=Math.atan2(Math.sin(s.yaw-room.resident.rotation.y),Math.cos(s.yaw-room.resident.rotation.y));room.resident.rotation.y+=turn*Math.min(1,dt*7);
 room.model.visible=room.formation>=1;
 for(const [id,b] of Object.entries(room.bones)){const r=room.rest[id];b.quaternion.copy(r.q);b.position.copy(r.p);b.scale.copy(r.s||point.set(1,1,1));}
 if(s.outcome){room.model.visible=false;room.shadow.visible=false;return;}
 if(!alive){
  if(s.deathCause==='hole'){room.body.position.y=-Math.min(4,s.deadFor*s.deadFor*3.5);room.body.rotation.z=s.deadFor*.2;room.model.visible=s.deadFor<1.2;room.shadow.visible=false;return;}
  const collapse=Math.min(1,s.deadFor*2);room.body.scale.set(1+.18*collapse,1-.78*collapse,1+.08*collapse);room.body.position.y=.012;room.shadow.visible=true;
  for(const side of ['L','R'])room.bones[`eye${side}`]?.scale.set(1,.08,1);return;
 }
 if(kind==='slug')room.body.scale.set(1-(reaction.curl||0)*.1,1-(reaction.curl||0)*.22,1+(reaction.stretch||0)*.18-(reaction.curl||0)*.2);
 if(kind==='worm')room.body.scale.z=1+(reaction.stretch||0)*.12;
 const wave=t*(moving?5:1.4),alarm=(s.affect?.fear||0)/100;
 for(let i=0;i<7;i++){
  const b=room.bones[`body${i}`];if(!b)continue;const r=room.rest[`body${i}`],tail=i/6;
  if(kind==='worm'){
   b.position.x+=Math.sin(wave-i*.82)*(moving?.12:.025)+(resting||s.seated?Math.sin(tail*Math.PI)*.35:0)+(reaction.curl||0)*Math.sin(tail*Math.PI)*.28;
   b.position.y+=moving?Math.max(0,Math.sin(wave-i*.82))*.045:.005*Math.sin(wave+i);
   b.quaternion.copy(r.q).multiply(quat.setFromEuler(euler.set(Math.sin(wave-i*.82)*.05,Math.cos(wave-i*.82)*(moving?.2:.025),0)));
  }else if(kind==='slug'){
   b.position.x+=Math.sin(wave-i*.55)*(moving?.025:.008);b.scale.y*=1+Math.sin(wave-i*.7)*(moving?.04:.016);b.scale.z*=1+Math.cos(wave-i*.7)*.025;
  }else{
   const pulse=Math.sin(t*2.5+i*1.1),spread=(reaction.spread||0)*.1;b.scale.set(r.s.x*(1+spread+pulse*.035),r.s.y*(1-spread+pulse*.05),r.s.z*(1+pulse*.025));b.position.x+=Math.sin(wave-i)*(moving?.075:.015);
  }
  if(s.seated)b.position.z+=tail*.45;
  if(s.startled>0)b.position.y+=Math.sin(s.startled/1.15*Math.PI)*(1-tail)*.13;
 }
 if(s.arrival){
  const a=s.arrival,after=Math.max(0,a.elapsed-a.impact),recover=THREE.MathUtils.smoothstep(after,.45,a.duration-a.impact),splat=a.elapsed<a.impact?0:Math.exp(-after*3);
  room.body.position.y=a.elapsed<a.impact?Math.max(0,a.height-9*a.elapsed*a.elapsed):Math.abs(Math.sin(after*12))*Math.exp(-after*5)*.13;
  room.body.scale.set(1+splat*.3,1-splat*.65,1+splat*.18);room.body.rotation.z=a.elapsed<a.impact?a.spin*a.elapsed:a.spin*(1-recover)*.3;
 }else if(s.activity==='tinker'&&!moving){
  const job=s.chamber.job?.item||'',reach=Math.sin(t*2)*.06;room.pose('head',.14+reach,Math.sin(t*.7)*.05,0);
  for(const side of ['L','R'])room.pose(`tendril.${side}`,.2+Math.sin(t*3+(side==='L'?0:1))*.16,0,side==='L'?.12:-.12);
  if(job==='night:water'||job.startsWith('lab:fit'))room.bones.head.position.y+=.06*Math.max(0,Math.sin(t*2));
 }
 let headYaw=Math.sin(t*.6)*.12;
 if(s.lookTarget){const dx=s.lookTarget[0]-s.position[0],dz=s.lookTarget[2]-s.position[1];headYaw=clamp(Math.atan2(Math.sin(Math.atan2(dx,dz)-s.yaw),Math.cos(Math.atan2(dx,dz)-s.yaw)),-.9,.9);}
 const working=s.activity==='tinker'&&!moving&&!s.arrival;
 room.pose('head',working?.14+Math.sin(t*2)*.06:resting?.15:alarm>.72?-.1:.04,headYaw,alarm>.72?Math.sin(t*22)*.016:0);
 const face=nativeFace(s,t,t<room.speakingUntil);room.pose('jaw',-.45*face.jaw);
 for(const side of ['L','R']){const eye=room.bones[`eye${side}`],r=room.rest[`eye${side}`];if(eye){eye.scale.copy(r.s||point.set(1,1,1));eye.scale.y*=Math.max(.08,1-face.blink*.95);room.pose(`eye.${side}`,0,headYaw*.2,0);}}
 if(!s.arrival){
  room.book.visible=!moving&&['read','forced_read'].includes(s.activity);
  room.hammer.visible=!!s.hasHammer&&s.activity==='hammer';if(room.hammer.visible)room.hammer.rotation.x=-Math.max(0,Math.sin(t*5))*1.1;
  room.headset.visible=!moving&&s.activity==='upload';room.cable.visible=room.headset.visible;
  if(room.cable.visible){room.headBone.getWorldPosition(point);const a=room.cable.geometry.attributes.position;for(let i=0;i<a.count;i++){const u=i/(a.count-1);a.setXYZ(i,THREE.MathUtils.lerp(point.x,2.05,u),THREE.MathUtils.lerp(point.y,1.28,u)-Math.sin(u*Math.PI)*.25,THREE.MathUtils.lerp(point.z,-1.8,u));}a.needsUpdate=true;room.cable.geometry.computeBoundingSphere();}
 }
 room.shadow.visible=true;room.shadow.position.set(room.resident.position.x,.019,room.resident.position.z);room.shadow.material.opacity=.18;
}
