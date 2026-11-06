import * as THREE from 'three';

// One folded sheet, one shadow, one picking box. Nothing is allocated during update.
export class PaperPlayView{
 constructor(room){
  this.room=room;this.root=new THREE.Group();room.scene.add(this.root);
  this.plane=new THREE.Group();this.root.add(this.plane);
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute([
   0,.025,-.4,-.36,0,.31,0,.085,.23,
   0,.025,-.4,0,.085,.23,.36,0,.31,
   0,.025,-.4,0,-.04,.25,0,.085,.23
  ],3));geometry.computeVertexNormals();
  this.paper=new THREE.Mesh(geometry,new THREE.MeshLambertMaterial({color:0xd3cfb4,side:THREE.DoubleSide,flatShading:true}));this.plane.add(this.paper);
  const creases=new THREE.BufferGeometry();creases.setAttribute('position',new THREE.Float32BufferAttribute([0,.027,-.4,0,.087,.23,-.36,.002,.31,0,.027,-.4,0,.027,-.4,.36,.002,.31],3));
  this.plane.add(new THREE.LineSegments(creases,new THREE.LineBasicMaterial({color:0x6b6b59})));
  // A little crooked window with an eye. The story appears on the object itself.
  const ink=[];const height=(x,z)=>.028+(z+.4)*(.06/.63)-x*(.025+.71*.06/.63)/.36;
  const segment=(a,b,c,d)=>ink.push(a,height(a,b),b,c,height(c,d),d);
  segment(.09,.08,.25,.1);segment(.25,.1,.24,.21);segment(.24,.21,.08,.19);segment(.08,.19,.09,.08);
  for(let i=0;i<12;i++){const a=i*Math.PI/6,b=(i+1)*Math.PI/6;segment(.165+Math.cos(a)*.047,.145+Math.sin(a)*.025,.165+Math.cos(b)*.047,.145+Math.sin(b)*.025);}
  segment(.165,.13,.165,.16);
  const mark=new THREE.BufferGeometry();mark.setAttribute('position',new THREE.Float32BufferAttribute(ink,3));this.drawing=new THREE.LineSegments(mark,new THREE.LineBasicMaterial({color:0x29382d}));this.plane.add(this.drawing);
  this.shadow=new THREE.Mesh(new THREE.CircleGeometry(.28,12),new THREE.MeshBasicMaterial({color:0x0c170f,transparent:true,opacity:.2,depthWrite:false}));this.shadow.rotation.x=-Math.PI/2;this.root.add(this.shadow);
  this.target=new THREE.Mesh(new THREE.BoxGeometry(.85,.25,.85),new THREE.MeshBasicMaterial({visible:false}));this.root.add(this.target);this.targets=[this.target];this.action=null;
  this.root.visible=false;
 }
 hit(ray){return this.root.visible&&this.target.visible&&this.action&&ray.intersectObjects(this.targets,false).length?this.action:null;}
 update(s,t){
  const p=s.paperPlay;this.root.visible=!!p&&p.state!=='absent';if(!p||!this.root.visible){this.action=null;return;}
  const flying=p.state==='flying',folding=p.state==='folding',held=p.carried;
  this.plane.position.set(p.position[0],p.position[1],p.position[2]);this.plane.rotation.set(0,.3,0);this.plane.scale.setScalar(1);this.paper.scale.y=1;
  if(folding){
   const progress=s.chamber?.job?.progress||0;this.plane.position.y+=.01;this.paper.scale.y=.1+progress*.9;
   if(!s.walking)this.plane.rotation.y=Math.sin(t*3)*.04;
  }else if(flying){
   const speed=Math.hypot(p.velocity[0],p.velocity[2]);this.plane.rotation.set(Math.atan2(p.velocity[1],speed),Math.atan2(-p.velocity[0],-p.velocity[2]),Math.sin(t*5)*(.08+p.wetness*.08));
   this.plane.scale.setScalar(Math.max(.05,1-p.fade/.55));
  }else if(held){
   this.plane.rotation.set(-.15,s.yaw+.5,.15);
  }else if(p.state==='soggy'){this.paper.scale.y=.18;this.plane.rotation.z=Math.sin(t*.7)*.012;}
  const damp=p.wetness;this.paper.material.color.setRGB(.83-damp*.22,.81-damp*.19,.7-damp*.16);this.drawing.visible=p.drawing;
  this.shadow.visible=flying;this.shadow.position.set(p.position[0],.026,p.position[2]);this.shadow.scale.setScalar(.65+p.position[1]*.15);this.shadow.material.opacity=.23/(1+p.position[1]);
  this.target.visible=s.alive&&!s.outcome&&!p.work&&['ready','landed','soggy'].includes(p.state);this.target.position.copy(this.plane.position);
  this.action=this.target.visible?(p.state==='ready'?'launch-plane':p.state==='soggy'?'fold-plane':'retrieve-plane'):null;
 }
 pose(s,t){
  const p=s.paperPlay,r=this.room;if(!p||!s.alive||s.arrival||s.species!=='human'||s.walking||s.visitor||s.startled>0||(s.laboratory?.gravity?.lift||0)>.02)return;
  if(s.chamber?.job?.item.startsWith('play:')){
   r.pose('chest',.55);r.pose('head',.25);r.pose('upper_arm.R',.8,0,-.18);r.pose('forearm.R',.8+Math.sin(t*4)*.12);r.pose('upper_arm.L',.65,0,.18);r.pose('forearm.L',.7);
   r.pose('thigh.R',.45);r.pose('shin.R',-.8);r.pose('thigh.L',.45);r.pose('shin.L',-.8);r.body.position.y=-.18;
  }else if(p.throwUntil>p.time&&!s.chamber?.job){
   const progress=1-(p.throwUntil-p.time)/.65;r.pose('upper_arm.R',1.5-progress);r.pose('forearm.R',1.1*(1-progress));r.pose('chest',.12);
  }
 }
}
