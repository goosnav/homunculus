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
      await cp(resolve(root,'web/assets'),resolve(root,'dist/assets'),{recursive:true});
      await cp(resolve(root,'web/vendor/transformers'),resolve(root,'dist/vendor/transformers'),{recursive:true});
      await mkdir(resolve(root,'dist/licenses'),{recursive:true});
      await copyFile(resolve(root,'web/vendor/THREE-LICENSE.txt'),resolve(root,'dist/licenses/three.txt'));
      await copyFile(resolve(root,'LICENSE.md'),resolve(root,'dist/licenses/homunculus.md'));
    }
  }]
});
