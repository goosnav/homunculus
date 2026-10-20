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
