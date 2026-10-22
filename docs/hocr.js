// Parse hOCR as inert data. Never attach imported nodes or follow image references.
export const HOCR_LIMITS=Object.freeze({bytes:2*1024*1024,pages:100,words:20000,nodes:100000});
const need=(condition,message)=>{if(!condition)throw Error(message);};
function bbox(title){const value=title.split(';').map(s=>s.trim()).find(s=>/^bbox\s/.test(s));need(value,'Missing hOCR bounding box');const parts=value.split(/\s+/);need(parts.length===5&&parts.slice(1).every(s=>/^-?\d+$/.test(s)),'Invalid hOCR bounding box');const b=parts.slice(1).map(Number);need(b.every(Number.isSafeInteger)&&b.every(v=>Math.abs(v)<=1000000)&&b[2]>b[0]&&b[3]>b[1],'Invalid hOCR bounding box extent');return b;}
export function parseHocr(raw,doc=globalThis.document){
 need(typeof raw==='string'&&new TextEncoder().encode(raw).byteLength<=HOCR_LIMITS.bytes,'Use hOCR under 2 MiB; split larger documents by page first');
 need(doc?.createElement,'A browser document is required for inert hOCR parsing');
 need(!/<!ENTITY\b/i.test(raw),'Entity declarations are not supported');
 const template=doc.createElement('template');template.innerHTML=raw;
 const root=template.content,nodes=root.querySelectorAll('*');need(nodes.length<=HOCR_LIMITS.nodes,'hOCR node limit exceeded');
 need(!root.querySelector('script,iframe,object,embed,style,link,svg,math,form,template'),'Active or unsupported hOCR markup');
 const pageNodes=[...root.querySelectorAll('.ocr_page')];need(pageNodes.length>0&&pageNodes.length<=HOCR_LIMITS.pages,'Use 1–100 hOCR pages');
 const ids=new Set();let count=0;
 const pages=pageNodes.map((page,pageIndex)=>{
  need(!page.parentElement?.closest('.ocr_page'),'Nested hOCR pages are not supported');
  let bounds;try{bounds=bbox(page.getAttribute('title')||'');}catch(error){throw Error('hOCR page '+(pageIndex+1)+': '+error.message);}
  const pageId=page.id||`page-${pageIndex+1}`;need(pageId.length<=200&&!ids.has(pageId),'hOCR page '+(pageIndex+1)+': Duplicate or oversized page identity');ids.add(pageId);
  const [px,py,pr,pb]=bounds;
  const words=[...page.querySelectorAll('.ocrx_word,.ocr_word')].map((word,index)=>{
   try{
   need(++count<=HOCR_LIMITS.words,'hOCR word limit exceeded');need(!word.parentElement?.closest('.ocrx_word,.ocr_word'),'Nested hOCR words are not supported');
   const title=word.getAttribute('title')||'',box=bbox(title),[x,y,r,b]=box;need(x>=px&&y>=py&&r<=pr&&b<=pb,'Word box lies outside its hOCR page');
   const chars=[...word.querySelectorAll('.ocrx_cinfo')];const text=chars.length?chars.map(c=>c.textContent).join(''):word.getAttribute('xml:space')==='preserve'?word.textContent:word.textContent.trim();need(text.length>0&&text.length<=4000,'Empty or oversized hOCR word');
   const id=word.id||`page-${pageIndex+1}-word-${index+1}`;need(id.length<=200&&!ids.has(id),'Missing or duplicate hOCR word identity');ids.add(id);
   const confidencePart=title.split(';').map(s=>s.trim()).find(s=>/^x_wconf\s/.test(s));let confidence=null;
   if(confidencePart){need(/^x_wconf\s+\d{1,3}(?:\.\d+)?$/.test(confidencePart),'Invalid hOCR word confidence');confidence=Number(confidencePart.split(/\s+/)[1]);need(confidence<=100,'Invalid hOCR word confidence');}
   return {id,text,box,normalizedBox:[(x-px)/(pr-px),(y-py)/(pb-py),(r-x)/(pr-px),(b-y)/(pb-py)],confidence};
   }catch(error){throw Error('hOCR page '+(pageIndex+1)+', word '+(index+1)+': '+error.message);}
  });
  return {id:pageId,index:pageIndex,bounds,words};
 });
 return {format:'hocr',pages,wordCount:count,warning:'OCR confidence is engine output, not verified correctness. Image references were not fetched. Original hOCR remains unchanged.'};
}
