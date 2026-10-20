import {WASI,File,OpenFile,ConsoleStdout,PreopenDirectory} from '@bjorn3/browser_wasi_shim';
// Flite's KAL is a small male diphone voice, not another neural model.
export async function synthesizeSpeech(module,text){
  const output=new PreopenDirectory('/out',[]),messages=[];
  const log=ConsoleStdout.lineBuffered(line=>{if(messages.length<8)messages.push(line);});
  const wasi=new WASI(['flite','-voice','kal','--setf','int_f0_target_mean=95','--setf','duration_stretch=1.12','-t',String(text).slice(0,240),'-o','/out/voice.wav'],[],[new OpenFile(new File([])),log,log,output],{debug:false});
  const instance=await WebAssembly.instantiate(module,{wasi_snapshot_preview1:wasi.wasiImport});
  const code=wasi.start(instance),bytes=output.dir.contents.get('voice.wav')?.data;
  if(code!==0||!bytes)throw Error(`Voice synthesis failed: ${messages.join(' ').slice(0,200)}`);
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  let sampleRate=8000,dataOffset=0,dataSize=0;
  for(let offset=12;offset+8<=bytes.length;){
    const tag=String.fromCharCode(...bytes.subarray(offset,offset+4)),size=view.getUint32(offset+4,true);
    if(tag==='fmt '){
      if(view.getUint16(offset+8,true)!==1||view.getUint16(offset+10,true)!==1||view.getUint16(offset+22,true)!==16)throw Error('Unsupported voice audio format.');
      sampleRate=view.getUint32(offset+12,true);
    }
    if(tag==='data'){dataOffset=offset+8;dataSize=Math.min(size,bytes.length-dataOffset);break;}
    offset+=8+size+(size%2);
  }
  if(!dataOffset)throw Error('The voice produced no audio.');
  const samples=new Float32Array(Math.min(Math.floor(dataSize/2),sampleRate*20));
  for(let i=0;i<samples.length;i++)samples[i]=view.getInt16(dataOffset+i*2,true)/32768;
  return {samples,sampleRate};
}
