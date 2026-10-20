import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { Life } from '../web/life.js';

test('a transient room asset failure can be retried on the existing renderer',async()=>{
  const nodes=new Map();
  const node=selector=>{
    if(!nodes.has(selector))nodes.set(selector,{hidden:false,dataset:{},addEventListener(){},focus(){},replaceChildren(){},append(){}});
    return nodes.get(selector);
  };
  let rooms=0,assetAttempts=0;
  class FakeRoom{
    constructor(){rooms++;this.ready=this.loadAssets();}
    loadAssets(){return ++assetAttempts===1?Promise.reject(new Error('resident.glb 503')):Promise.resolve(this);}
    materialize(){} update(){}
  }
  class FakeMind{load(){this.ready=true;return Promise.resolve();}dispose(){}}
  const context=vm.createContext({
    console,URLSearchParams,location:{search:'?debug'},performance:{now:()=>0},
    document:{querySelector:node,querySelectorAll:()=>[],body:{classList:{remove(){},add(){}}}},
    window:{addEventListener(){}},requestAnimationFrame(){},speechSynthesis:{cancel(){}},
    BrowserRoom:FakeRoom,BrowserMind:FakeMind,ComicReader:{load:async()=>({})},Life,
    parseThought(){},mindMessages(){},
  });
  const source=readFileSync(new URL('../web/browser-app.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
  vm.runInContext(source,context);
  await context.window.__habitat.spawn();
  assert.match(node('#spawn-error').textContent,/503/);
  await context.window.__habitat.spawn();
  assert.equal(context.window.__habitat.life?.alive,true);
  assert.equal(rooms,1,'retry should reuse the renderer');
  assert.equal(assetAttempts,2);
});
