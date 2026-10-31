import test from 'node:test';import assert from 'node:assert/strict';
import * as faces from '../web/expressions.js';
test('native face rests unhappy, speaks with the jaw and never stacks a second mouth',()=>{
 assert.equal(typeof faces.nativeFace,'function');
 const rest=faces.nativeFace({feeling:'sad'},1,false),talk=faces.nativeFace({feeling:'sad'},1,true),fear=faces.nativeFace({feeling:'afraid'},1,false);
 assert.ok(rest.frown>.5);assert.equal(rest.jaw,0);assert.ok(talk.jaw>rest.jaw);assert.ok(fear.jaw>0);
 for(let t=0;t<12;t+=.1)for(const n of Object.values(faces.nativeFace({feeling:'afraid'},t,true)))assert.ok(Number.isFinite(n)&&n>=-1&&n<=1);
});
