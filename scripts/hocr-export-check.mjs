// Reproducible hOCR derivative export checks in an actual isolated browser.
// Usage: node scripts/hocr-export-check.mjs
import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';import http from 'node:http';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';import {STATIC_TYPES} from './static-types.mjs';
const {chromium}=process.env.PLAYWRIGHT_MODULE?createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE):await import('playwright');
const root=fileURLToPath(new URL('../dist',import.meta.url));const server=http.createServer(async(req,res)=>{try{const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root+path.sep))throw Error('outside');const content=await fs.readFile(f);res.writeHead(200,{'content-type':STATIC_TYPES[path.extname(f)]||'application/octet-stream'});res.end(content);}catch{res.writeHead(404);res.end();}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port+'/';
const b=await chromium.launch(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{});
try {
 const p=await b.newPage();await p.goto(base+'index.html');
 const result=await p.evaluate(async()=>{
  const {proposedHocr}=await import('./hocr-export.js');
  const raw='<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml"><head><meta name="ocr-system" content="Owned test engine"/><meta name="ocr-capabilities" content="ocr_page ocrx_word ocrx_cinfo"/><meta http-equiv="refresh" content="0;url=https://example.invalid"/></head><body><div class="ocr_page" id="p1" title="bbox 0 0 100 100"><span class="ocrx_word" id="w1" title="bbox 1 1 50 30; x_wconf 70">Juno</span></div></body></html>';
  const bytes=new TextEncoder().encode(raw).buffer;
  const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');
  const out=await proposedHocr(bytes,{hocrSha256:hash,pageIndex:0,pageId:'p1',wordId:'w1',originalWord:'Juno',bbox:[1,1,50,30],proposed:'June'});
  const hostile=raw.replace('<body>','<body onload="alert(1)"><img src="https://export-owned.invalid/image"/><audio src="https://export-owned.invalid/audio"/>').replace('id="w1"','id="w1" onclick="alert(2)" data-private="discard"').replace('<html xmlns=','<?test instruction?><html xmlns=');
  const hostileBytes=new TextEncoder().encode(hostile).buffer;
  const hostileHash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',hostileBytes))].map(v=>v.toString(16).padStart(2,'0')).join('');
  const literal='<script>alert("literal text")</script>&';
  const sanitized=await proposedHocr(hostileBytes,{hocrSha256:hostileHash,pageIndex:0,pageId:'p1',wordId:'w1',originalWord:'Juno',bbox:[1,1,50,30],proposed:literal});
  const sanitizedXml=new DOMParser().parseFromString(sanitized.text,'application/xml');
  const inertProposal=sanitizedXml.querySelector('.ocrx_word').textContent===literal&&!sanitizedXml.querySelector('script,img,audio,video,base,meta[http-equiv]')&&![...sanitizedXml.querySelectorAll('*')].some(n=>[...n.attributes].some(a=>/^(on|src|href|data-)/i.test(a.name)))&&!sanitized.text.includes('<?test');
  const mutableBytes=new TextEncoder().encode(raw).buffer;
  const mutableSelection={hocrSha256:hash,pageIndex:0,pageId:'p1',wordId:'w1',originalWord:'Juno',bbox:[1,1,50,30],proposed:'June'};
  const pending=proposedHocr(mutableBytes,mutableSelection);
  new Uint8Array(mutableBytes).set(new TextEncoder().encode(raw.replace('Owned test engine','Other test engine')));
  mutableSelection.proposed='July';
  const owned=await pending;
  const ownedXml=new DOMParser().parseFromString(owned.text,'application/xml');
  const ownedInputs=owned.text===out.text&&ownedXml.querySelector('meta[name="ocr-system"]')?.getAttribute('content')==='Owned test engine'&&ownedXml.querySelector('.ocrx_word')?.textContent==='June'&&owned.originalSha256===hash;
  const detached=new TextEncoder().encode(raw).buffer;structuredClone(detached,{transfer:[detached]});
  let detachedRefusedClearly=false;try{await proposedHocr(detached,{hocrSha256:hash,pageIndex:0,pageId:'p1',wordId:'w1',originalWord:'Juno',bbox:[1,1,50,30],proposed:'June'});}catch(error){detachedRefusedClearly=error.message==='Use the original bounded hOCR file bytes';}
  const xml=new DOMParser().parseFromString(out.text,'application/xml');
  return {detachedRefusedClearly,ownedInputs,inertProposal,declarations:(out.text.match(/<\?xml/g)||[]).length,valid:!xml.querySelector('parsererror'),system:xml.querySelector('meta[name="ocr-system"]')?.getAttribute('content'),capabilities:xml.querySelector('meta[name="ocr-capabilities"]')?.getAttribute('content'),refresh:!!xml.querySelector('meta[http-equiv]'),word:xml.querySelector('.ocrx_word')?.textContent,sourceUnchanged:new TextDecoder().decode(bytes)===raw};
 });
 assert.deepEqual(result,{detachedRefusedClearly:true,ownedInputs:true,inertProposal:true,declarations:1,valid:true,system:'Owned test engine',capabilities:'ocr_page ocrx_word',refresh:false,word:'June',sourceUnchanged:true});
 console.log(JSON.stringify({passed:true,...result,scope:'Owned XHTML fixture with XML header, doctype, namespace and OCR metadata; Chromium strict XML parsing.'},null,2));
}finally{await b.close();server.close()}
