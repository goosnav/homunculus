import * as THREE from 'three';
import {LAB_PADS,NEST_POSITION} from './laboratory.js';
const mat=(color,basic=false)=>basic?new THREE.MeshBasicMaterial({color}):new THREE.MeshLambertMaterial({color});
const put=(p,o,x=0,y=0,z=0)=>{p.add(o);o.position.set(x,y,z);return o;};
const group=(p,...xyz)=>put(p,new THREE.Group(),...xyz);
const box=(w,h,d,c)=>new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(c));
const ball=(r,c)=>new THREE.Mesh(new THREE.IcosahedronGeometry(r,1),mat(c));
const ring=(r,t,c)=>new THREE.Mesh(new THREE.TorusGeometry(r,t,5,20),mat(c));
// All apparatus is allocated once; effects reuse small meshes and one line buffer.
export class LaboratoryView{
 constructor(room){
  this.room=room;this.root=group(room.scene);this.point=new THREE.Vector3();
  this.fan=group(this.root,2.85,.42,.85);put(this.fan,box(.45,.07,.32,0x696c5b),0,-.35);put(this.fan,box(.05,.35,.05,0x737763),0,-.16);
  this.fanHead=group(this.fan,0,.05,0);put(this.fanHead,ring(.23,.025,0x89917a));this.rotor=group(this.fanHead);
  for(let i=0;i<3;i++){const blade=put(this.rotor,box(.09,.33,.025,0x969d87));blade.rotation.z=i*Math.PI*2/3;blade.position.set(Math.sin(blade.rotation.z)*.09,Math.cos(blade.rotation.z)*.09,0);}
  put(this.fanHead,ball(.055,0x535b50),0,0,.025);
  this.nozzle=group(this.root,2.94,2.3,-1.9);put(this.nozzle,box(.5,.07,.07,0x7c8c7e));put(this.nozzle,ball(.07,0x3d5147),-.25,-.02,.02);
  this.mistBuffer=new Float32Array(28*6);const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(this.mistBuffer,3));this.mist=put(this.root,new THREE.LineSegments(geo,new THREE.LineBasicMaterial({color:0xc7d1bc,transparent:true,opacity:.18})));this.mist.frustumCulled=false;
  this.resonator=group(this.root,-1.45,.16,1.3);put(this.resonator,box(.36,.25,.3,0x766957));
  for(const x of [-.07,.07])put(this.resonator,box(.025,.31,.025,0xa7a68b),x,.21,0);put(this.resonator,box(.17,.025,.025,0xa7a68b),0,.07,0);
  this.pads=LAB_PADS.map(([x,z])=>{const g=group(this.root,x,.025,z);const r=ring(.18,.008,0x9ba38b);r.rotation.x=-Math.PI/2;put(g,r);const wave=ring(.18,.012,0xc5bc91);wave.rotation.x=-Math.PI/2;wave.material.transparent=true;wave.material.depthWrite=false;put(g,wave);return {g,wave};});
  this.nest=group(this.root,NEST_POSITION[0],.035,NEST_POSITION[1]);this.scraps={};
  const paper=this.scraps.paper=group(this.nest);for(let i=0;i<7;i++){const p=put(paper,box(.11,.013,.31,0xc6b995),Math.cos(i)*.16,.03,Math.sin(i)*.16);p.rotation.set(Math.sin(i)*.12,i,.15);}
  const wire=this.scraps.wire=group(this.nest);for(let i=0;i<3;i++){const w=ring(.19+i*.04,.013,0x987044);w.rotation.x=Math.PI/2+.13*i;put(wire,w,0,.07+i*.03);}
  const cloth=this.scraps.cloth=group(this.nest);for(let i=0;i<5;i++){const p=put(cloth,ball(.12,0x788f7c),Math.cos(i*1.3)*.2,.04,Math.sin(i*1.3)*.2);p.scale.set(1,.35,1);}
  this.offering=group(this.root);put(this.offering,box(.19,.025,.22,0xc6b995));
  this.heart=group(this.nest,0,.16,0);for(const x of [-.055,.055]){const lobe=put(this.heart,ball(.105,0xa76e68),x,.035);lobe.scale.set(.8,1,1);}put(this.heart,ball(.09,0x9a625e),0,-.04);for(const x of [-.04,.04])put(this.heart,ball(.016,0x1b2820),x,.06,.09);
  this.shell=group(this.nest,0,.09,.04);const shell=put(this.shell,ring(.1,.025,0xacad8b));shell.rotation.x=-Math.PI/2;put(this.shell,box(.11,.035,.1,0xc0bb96),.08,-.03);
  this.eye=group(this.root,2.7,1.7,2.25);const skin=put(this.eye,ball(1.05,0x8b9279));skin.scale.set(1,.65,.14);
  const white=put(this.eye,ball(.73,0xd3c5a6),0,0,.09);white.scale.set(1,.5,.13);
  this.pupil=put(this.eye,ball(.26,0x202f2a),0,0,.17);this.pupil.scale.z=.25;put(this.pupil,ball(.045,0xd3d5b7),-.06,.07,.06);
  this.eye.traverse(o=>{if(o.material){o.material.transparent=true;o.material.depthWrite=false;}});
  this.targets={fan:this.fan,mist:this.nozzle,resonator:this.resonator,nest:this.nest};this.hitMeshes=[];
  for(const [name,target] of Object.entries(this.targets))target.traverse(o=>{if(o.isMesh){o.userData.tool=name;this.hitMeshes.push(o);}});
  this.marker=put(this.root,ring(.34,.018,0xd6b870));this.marker.rotation.x=-Math.PI/2;this.marker.material.depthTest=false;this.marker.renderOrder=20;this.marker.visible=false;this.selectedUntil=0;this.selectedTool='fan';this.selectedPad=0;
  this.screws=[];for(let i=0;i<6;i++){const screw=group(this.root);put(screw,box(.035,.1,.035,0x707e6c));put(screw,box(.09,.025,.07,0x9aa38a),0,.06);this.screws.push(screw);}
 }
 selectTool(tool,pad=0){if(!Object.hasOwn(this.targets,tool))return;this.selectedTool=tool;this.selectedPad=Number.isInteger(pad)&&pad>=0&&pad<3?pad:0;this.selectedUntil=performance.now()+4500;}
 hit(raycaster){if(!this.root.visible)return null;const hit=raycaster.intersectObjects(this.hitMeshes,false)[0];return hit?`tool:${hit.object.userData.tool}`:null;}
 update(s,t){
  const l=s.laboratory;this.root.visible=!!l;if(!l)return;
  this.marker.visible=s.alive&&performance.now()<this.selectedUntil;
  if(this.marker.visible){const target=this.targets[this.selectedTool];this.marker.position.copy(target.position);if(this.selectedTool==='resonator'){const pad=LAB_PADS[this.selectedPad];this.marker.position.set(pad[0],.04,pad[1]);}else this.marker.position.y=this.selectedTool==='mist'?2.25:.04;this.marker.scale.setScalar(1+Math.sin(t*5)*.08);}
  this.fanHead.rotation.y=Math.PI/2-l.draft.direction*Math.PI/2;this.rotor.rotation.z=t*l.draft.power*8;
  this.mist.visible=l.mist.on&&s.alive;
  for(let i=0;i<28;i++){const p=(t*.18+i*.137)%1,x=2.68-p*(.6+Math.sin(i)*.4)+l.draft.x*p,y=2.3-p*1.5,z=-1.87+p*(1.4+Math.cos(i)*.5)+l.draft.z*p;this.mistBuffer.set([x,y,z,x-.03,y-.07,z+.05],i*6);}this.mist.geometry.attributes.position.needsUpdate=true;
  this.resonator.rotation.z=l.resonance.power?Math.sin(t*[0,24,45][l.resonance.tone])*.008*l.resonance.power:0;
  for(let i=0;i<3;i++){const {wave}=this.pads[i],on=s.alive&&l.resonance.power&&l.resonance.pad===i;wave.visible=!!on;const p=(t*(.7+l.resonance.tone*.25))%1;wave.scale.setScalar(1+p*2);wave.material.opacity=(1-p)*.5;}
  const n=l.nest,shape=s.species;this.nest.scale.set(shape==='worm'?1.4:shape==='mass'?1.2:1,1,shape==='worm'?.7:shape==='slug'?1.25:1);
  for(const [key,o]of Object.entries(this.scraps))o.visible=n.scraps.includes(key)||(l.remnants.includes('cradle')&&n.scraps.length===0);
  this.offering.visible=!!n.offering;
  if(n.offering){const hand=this.room.bones.handR||this.room.bones.nose||this.room.headBone;hand?.getWorldPosition(this.point);this.offering.position.copy(this.point);this.offering.rotation.set(0,t*.2,Math.sin(t*2)*.2);}
  this.heart.visible=['awake','kept'].includes(n.heart)||l.remnants.includes('heart');this.heart.scale.setScalar(1+n.pulse*.14);this.heart.rotation.z=Math.sin(t*2)*.05;
  this.shell.visible=n.heart==='released'||l.remnants.includes('shed');
  const p=l.glass.pressure;this.eye.visible=p>0;this.eye.position.x=-3.8+p*1.7;this.eye.scale.y=.7+Math.sin(t*.7)*.015;
  this.pupil.position.x=THREE.MathUtils.clamp(s.position[0]*.06,-.18,.18);this.pupil.position.y=-.1;
  this.eye.traverse(o=>{if(o.material)o.material.opacity=p*.88;});
  const lift=l.gravity.lift;
  this.screws.forEach((o,i)=>{o.visible=lift>0||l.resonance.charge>.15;o.position.set(-1.1+i*.37,.03+lift*(.55+i*.1)+l.resonance.charge*.025*Math.sin(t*12+i),-.8+(i%2)*.3);o.rotation.set(lift*t*.5,i,lift*Math.sin(t+i));});
 }
 pose(s,t){
  const l=s.laboratory,r=this.room;if(!l||!s.alive||s.arrival)return;
  if(s.chamber.job?.item.startsWith('lab:')&&!s.walking&&s.species==='human'){
   r.pose('chest',.55);r.pose('head',.3);r.pose('upper_arm.R',.9,0,-.2);r.pose('forearm.R',.6+Math.sin(t*4)*.15);r.pose('upper_arm.L',.9,0,.2);r.pose('forearm.L',.7);r.pose('thigh.R',.4);r.pose('shin.R',-.7);r.body.position.y=-.15;
  }
  if(l.glass.present){r.pose('head',-.15,-.45);}
  if(l.gravity.lift>0){const lift=l.gravity.lift;r.body.position.y+=lift*(1.1+Math.sin(t*.7)*.06);r.body.rotation.z+=Math.sin(t*.6)*.12*lift;r.shadow.material.opacity=.18*(1-lift*.7);if(s.species==='human'){r.pose('upper_arm.R',.8,0,-.7);r.pose('upper_arm.L',.6,0,.8);r.pose('thigh.R',.3);r.pose('shin.R',-.4);}}
  // The loose hammer floats too; it is reset by updateOddities every frame.
  if(r.floorHammer?.visible&&l.gravity.lift>0){r.floorHammer.position.y+=l.gravity.lift*.75;r.floorHammer.rotation.x=t*.2*l.gravity.lift;}else if(r.floorHammer)r.floorHammer.rotation.x=0;
 }
}
