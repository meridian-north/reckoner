import test from 'node:test';import assert from 'node:assert/strict';import {app,fixture} from './browser-harness.mjs';
const event=(type,bytes,size=bytes.byteLength)=>({target:{value:'selected',files:[{name:type==='application/pdf'?'wrong.pdf':'broken.png',type,size,arrayBuffer:async()=>bytes}]}});
test('undecodable image preserves source, draft and history before any mutation',async()=>{
 const a=await app(JSON.stringify(fixture()),{},{Image:class{async decode(){throw Error('broken pixels');}}});const before=JSON.stringify(a.api.state());await a.get('source-image').onchange(event('image/png',new Uint8Array([137,80,78,71,13,10,26,10]).buffer));assert.equal(JSON.stringify(a.api.state()),before);assert.match(a.get('toast').textContent,/could not be decoded/);
});
test('non-PDF bytes and changed read length preserve current review',async()=>{
 const a=await app(JSON.stringify(fixture()));const before=JSON.stringify(a.api.state());await a.get('source-image').onchange(event('application/pdf',new TextEncoder().encode('<html>not a PDF</html>').buffer));assert.equal(JSON.stringify(a.api.state()),before);assert.match(a.get('toast').textContent,/PDF header/);await a.get('source-image').onchange(event('image/png',new Uint8Array([1]).buffer,2));assert.equal(JSON.stringify(a.api.state()),before);assert.match(a.get('toast').textContent,/size changed/);
});
