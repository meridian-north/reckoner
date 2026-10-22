import {parseHocr,HOCR_LIMITS} from './hocr.js';
const need=(v,m)=>{if(!v)throw Error(m);};
export async function proposedHocr(bytes,selection){
 need(bytes instanceof ArrayBuffer&&bytes.byteLength>0&&bytes.byteLength<=HOCR_LIMITS.bytes,'Use the original bounded hOCR file bytes');
 need(selection&&Array.isArray(selection.bbox)&&selection.bbox.length===4,'Use the saved four-coordinate word region');
 // Own the bounded source and selected proposal before the first asynchronous step.
 // Caller mutation must never separate the digest from the bytes we serialize.
 bytes=bytes.slice(0);
 selection={hocrSha256:selection.hocrSha256,pageIndex:selection.pageIndex,pageId:selection.pageId,wordId:selection.wordId,originalWord:selection.originalWord,bbox:selection.bbox.slice(),proposed:selection.proposed};
 const sha256=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
 need(selection?.hocrSha256===sha256,'Opened hOCR does not match the saved reading');
 need(typeof selection.proposed==='string'&&selection.proposed.trim()&&selection.proposed.length<=4000,'Use a nonempty proposed word under 4,000 characters');
 const raw=new TextDecoder('utf-8',{fatal:true}).decode(bytes),original=parseHocr(raw),page=original.pages[selection.pageIndex];
 const index=page?.words.findIndex(w=>w.id===selection.wordId&&w.text===selection.originalWord&&JSON.stringify(w.box)===JSON.stringify(selection.bbox));
 need(page&&page.id===selection.pageId&&index>=0,'Saved word or region does not match original hOCR');
 // A derivative needs well-formed XML; never silently repair loose HTML into different geometry.
 const xml=new DOMParser().parseFromString(raw.replace(/<!DOCTYPE[^>]*>/gi,''),'application/xml');
 need(!xml.querySelector('parsererror'),'Derivative export requires well-formed hOCR XHTML; keep the JSON sidecar for other imports');
 const xmlPages=[...xml.querySelectorAll('.ocr_page')];need(xmlPages.length===original.pages.length,'XML/hOCR page structure differs');
 // Normalize character-based words to word-level hOCR throughout the derivative.
 // This prevents mixed character/word representations from breaking downstream tools.
 for(const [pi,p] of xmlPages.entries()){
  const words=[...p.querySelectorAll('.ocrx_word,.ocr_word')];need(words.length===original.pages[pi].words.length,'XML/hOCR word structure differs');
  for(const [wi,w] of words.entries()){w.textContent=pi===selection.pageIndex&&wi===index?selection.proposed:original.pages[pi].words[wi].text;w.setAttributeNS('http://www.w3.org/XML/1998/namespace','xml:space','preserve');}
 }
 const allowed=new Set(['html','head','body','title','meta','div','span','p','br','b','strong','em','i','section','article']);
 for(const node of [...xml.querySelectorAll('*')]){
  if(node.localName==='meta'){
   // Preserve inert OCR producer declarations, never refresh or external links.
   const name=node.getAttribute('name');
   if(!['ocr-system','ocr-capabilities'].includes(name)){node.remove();continue;}
   const content=node.getAttribute('content')||'';
   for(const attr of [...node.attributes])node.removeAttributeNode(attr);
   node.setAttribute('name',name);
   node.setAttribute('content',name==='ocr-capabilities'?content.split(/\s+/).filter(v=>v&&v!=='ocrx_cinfo').join(' '):content);
   continue;
  }
  if(['img','audio','video','source','base'].includes(node.localName)){node.remove();continue;}
  need(allowed.has(node.localName),'Unsupported XHTML element in derivative export');
  for(const attr of [...node.attributes])if(!['id','class','title','lang','dir','xmlns','xml:lang','xml:space'].includes(attr.name))node.removeAttributeNode(attr);
 }
 const walker=xml.createTreeWalker(xml,64),instructions=[];while(walker.nextNode())instructions.push(walker.currentNode);for(const node of instructions)node.remove();
 const text='<?xml version="1.0" encoding="UTF-8"?>\n'+new XMLSerializer().serializeToString(xml.documentElement);
 const strict=new DOMParser().parseFromString(text,'application/xml');
 need(!strict.querySelector('parsererror'),'Generated derivative is not well-formed XML');
 const checked=parseHocr(text);
 need(checked.pages.length===original.pages.length,'Derivative page count changed');
 for(const [pi,p] of checked.pages.entries())for(const [wi,w] of p.words.entries()){
  const old=original.pages[pi].words[wi];need(w.id===old.id&&JSON.stringify(w.box)===JSON.stringify(old.box)&&w.confidence===old.confidence,'Derivative word geometry or engine confidence changed');
  need(w.text===(pi===selection.pageIndex&&wi===index?selection.proposed:old.text),'Unexpected derivative text change');
 }
 return {text,originalSha256:sha256,wordId:selection.wordId,changed:selection.proposed!==selection.originalWord,scope:'One saved proposal, not host acceptance. Word-level derivative; inline character geometry and formatting removed. Page/line structure and word boxes retained. Original OCR confidence retained as engine output, not a confidence score for the human correction.'};
}
