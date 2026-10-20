import test from 'node:test';
import assert from 'node:assert/strict';
import { ComicReader } from '../web/comic.js';
import { existsSync,readFileSync } from 'node:fs';
const PAGES=JSON.parse(readFileSync(new URL('../web/assets/comic/excerpts.json',import.meta.url))).pages;
test('reading selects two distinct verified book pages and rotates the next pair',()=>{
  const reader=new ComicReader(PAGES,()=>.2),first=reader.select(),second=reader.select();
  assert.equal(first.length,2);assert.notEqual(first[0].page,first[1].page);
  assert.ok(second.every(p=>!first.some(previous=>previous.page===p.page)));
  for(const p of PAGES){assert.ok(p.text.length>40);assert.ok(p.pdfPage>p.page);assert.ok(existsSync(new URL(`../web/${p.image}`,import.meta.url)));}
});
