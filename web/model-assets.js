// Transformers.js custom cache: expose a logical model file as a stream of
// verified same-origin parts. Each part fits the static host's file limit.
export function createModelCache({baseURL,manifest,fetcher=fetch,cache=null}){
 const base=new URL(baseURL);
 return {
  async match(key){
   if(!key)return undefined;
   const url=new URL(key,base.origin);
   if(url.origin!==base.origin||!url.pathname.startsWith(base.pathname))return undefined;
   const file=manifest.files[url.pathname.slice(base.pathname.length)];
   if(!file)return undefined;
   let index=0;
   const stream=new ReadableStream({
    async pull(controller){
     if(index===file.parts.length){controller.close();return;}
     const part=file.parts[index++],partURL=new URL(part.path,base).href;
     try{
      let response;try{response=await cache?.match(partURL);}catch{/* Storage may be disabled. */}
      const cached=!!response;
      response??=await fetcher(partURL);
      if(!response.ok)throw Error(`Model part download failed (${response.status}). Retry spawning.`);
      const bytes=await response.arrayBuffer();
      const digest=await crypto.subtle.digest('SHA-256',bytes);
      const sha256=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
      if(bytes.byteLength!==part.size||sha256!==part.sha256){
       try{await cache?.delete?.(partURL);}catch{}
       throw Error('Model part integrity check failed. Retry spawning.');
      }
      if(!cached)try{await cache?.put(partURL,new Response(bytes));}catch{/* Quota failures must not disable inference. */}
      controller.enqueue(new Uint8Array(bytes));
     }catch(error){controller.error(error);}
    }
   });
   return new Response(stream,{headers:{'content-length':String(file.size),'content-type':'application/octet-stream'}});
  },
  async put(){/* Parts are cached individually after verification. */}
 };
}
export async function localModelCache(baseURL){
 const response=await fetch(new URL('manifest.json',baseURL));
 if(!response.ok)throw Error('The bundled model is missing. Run npm run build again.');
 const manifest=await response.json();let cache=null;
 try{cache=await caches.open('homunculus-model-parts-v1');}catch{/* Still usable without persistent storage. */}
 return createModelCache({baseURL,manifest,cache});
}
