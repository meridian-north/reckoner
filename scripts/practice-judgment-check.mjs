// Reproducible practice judgment checks in an actual isolated browser.
// Usage: node scripts/practice-judgment-check.mjs
import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';import http from 'node:http';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';import {STATIC_TYPES} from './static-types.mjs';
const {chromium}=process.env.PLAYWRIGHT_MODULE?createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE):await import('playwright');
const root=fileURLToPath(new URL('../dist',import.meta.url));const server=http.createServer(async(req,res)=>{try{const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root+path.sep))throw Error('outside');const content=await fs.readFile(f);res.writeHead(200,{'content-type':STATIC_TYPES[path.extname(f)]||'application/octet-stream'});res.end(content);}catch{res.writeHead(404);res.end();}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port+'/';
const b=await chromium.launch(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{});
try{
 const p=await b.newPage();const outbound=[];await p.route('**/*',r=>r.request().url().startsWith(base)?r.continue():(outbound.push(r.request().url()),r.abort()));
 await p.goto(base+'index.html?practice=notice-date&practiceSession=72345678-1234-1234-1234-123456789abc');
 await p.waitForFunction(()=>document.getElementById('original').value.includes('14 June'));
 assert.equal(await p.locator('#proposed').inputValue(),await p.locator('#original').inputValue());
 assert.equal(await p.locator('#reason').inputValue(),'');assert.equal(await p.locator('#uncertainty').inputValue(),'not_assessed');
 assert.equal(await p.locator('#passage-task details').getAttribute('open'),null);
 assert.match(await p.locator('#passage-task summary').innerText(),/AI-written/);
 await p.locator('#reason').fill('Unfinished practice judgment to preserve');
 const png=Buffer.from(await p.evaluate(()=>{const c=document.createElement('canvas');c.width=40;c.height=40;return c.toDataURL('image/png').split(',')[1]}),'base64');
 await p.setInputFiles('#source-image',{name:'owned-source.png',mimeType:'image/png',buffer:png});
 await p.waitForFunction(()=>document.getElementById('image-info').textContent.startsWith('owned-source.png'));
 assert.equal(await p.locator('#original').inputValue(),'');assert.equal(await p.locator('#reason').inputValue(),'');assert.equal(await p.locator('#title').inputValue(),'');
 assert.equal(outbound.length,0);
 console.log(JSON.stringify({passed:true,proposalStartsWithMachineReading:true,reasonBlank:true,uncertaintyNotAssessed:true,aiExplanationCollapsed:true,differentSourceClearsPracticeMetadataAndDraft:true,outboundRequests:outbound},null,2));
}finally{await b.close();server.close()}
