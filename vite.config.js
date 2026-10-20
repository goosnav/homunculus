import { defineConfig } from 'vite';
import { cp, mkdir, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const root=import.meta.dirname;
export default defineConfig({
  root:'web',base:'/',publicDir:false,
  build:{outDir:'../dist',emptyOutDir:true,assetsDir:'runtime',assetsInlineLimit:0,target:'es2022',license:{fileName:'licenses/bundled.md'}},
  worker:{format:'es'},
  plugins:[{
    name:'homunculus-static-assets',
    // The raw-source entry also supports a plain static server. Vite resolves its own npm imports.
    transformIndexHtml:{order:'pre',handler:html=>html.replace(/<script type="importmap">[\s\S]*?<\/script>/,'')},
    async closeBundle(){
      await mkdir(resolve(root,'dist/vendor'),{recursive:true});
      await cp(resolve(root,'web/models'),resolve(root,'dist/models'),{recursive:true});
      await cp(resolve(root,'web/assets'),resolve(root,'dist/assets'),{recursive:true});
      await mkdir(resolve(root,'dist/licenses'),{recursive:true});
      await copyFile(resolve(root,'web/vendor/THREE-LICENSE.txt'),resolve(root,'dist/licenses/three.txt'));
      await copyFile(resolve(root,'web/vendor/SMOLLM2-LICENSE.txt'),resolve(root,'dist/licenses/smollm2.txt'));
      await copyFile(resolve(root,'tools/model-lock.json'),resolve(root,'dist/licenses/model-sources.json'));
      await copyFile(resolve(root,'web/_headers'),resolve(root,'dist/_headers'));
      await copyFile(resolve(root,'LICENSE.md'),resolve(root,'dist/licenses/homunculus.md'));
      await copyFile(resolve(root,'node_modules/@echogarden/flite-wasi/COPYING'),resolve(root,'dist/licenses/flite.txt'));
      await copyFile(resolve(root,'node_modules/@bjorn3/browser_wasi_shim/LICENSE-MIT'),resolve(root,'dist/licenses/browser-wasi-shim.txt'));
      await copyFile(resolve(root,'node_modules/@wllama/wllama/LICENCE'),resolve(root,'dist/licenses/wllama.txt'));
    }
  }]
});
