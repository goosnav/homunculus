// Eyebrows and mouth stay attached to the owner's original head rig.
export function expression(state){
  if(state.activity==='confined')return {kind:'fear',brow:-.48,mouth:1.1,head:-.09};
  if(state.activity==='forced_read')return {kind:'pain',brow:.5,mouth:.3,head:.2};
  if(state.feeling==='afraid')return {kind:'fear',brow:-.48,mouth:1,head:-.08};
  if(state.activity==='upload')return {kind:'focus',brow:.2,mouth:0,head:.12};
  if(state.activity==='hammer'&&state.stage==='strike')return {kind:'anger',brow:.42,mouth:0,head:.1};
  if(state.feeling==='annoyed')return {kind:'anger',brow:.4,mouth:0,head:.05};
  if(state.feeling==='scheming'||state.activity==='inspect')return {kind:'suspicion',brow:.12,mouth:0,head:0,asymmetry:.25};
  return {kind:'sad',brow:-.25,mouth:0,head:.08};
}

// Native v12 lip shapes and rigid jaw; no second mouth is drawn over the mesh.
export function nativeFace(state,t,speaking=false){
 const afraid=state.feeling==='afraid'||state.activity==='confined'||!!state.arrival;
 const jaw=speaking?.1+.65*Math.pow(Math.abs(Math.sin(t*12)),1.6):afraid?.28:0;
 return {jaw,frown:speaking?.3:afraid?.35:.85,wide:speaking?.16*Math.abs(Math.sin(t*7)):0,round:afraid?.45:speaking?.2*Math.max(0,Math.sin(t*5)):0,
  blink:!state.alive&&state.alive!==undefined?0:Math.pow(Math.max(0,Math.cos(t*1.7)),24),brow:afraid?-.35:state.feeling==='annoyed'?.35:-.18};
}
