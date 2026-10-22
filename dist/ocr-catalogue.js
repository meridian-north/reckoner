export const CATALOGUE_SCHEMA='reckoner.ocr-problem-catalogue.v1';
export const CATALOGUE_SCHEMA_V2='reckoner.ocr-problem-catalogue.v2';
export const STATES=Object.freeze(['unverified','reproduced','disputed','reviewed']);
const need=(v,m)=>{if(!v)throw Error(m)},text=(s,max)=>need(typeof s==='string'&&s.trim()&&s.length<=max,'Missing or oversized text');
function exact(v,keys){need(v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join(',')===keys.sort().join(','),'Unexpected catalogue fields');}
function https(s){text(s,2048);const u=new URL(s);need(u.protocol==='https:'&&!u.username&&!u.password,'Use a HTTPS reference without credentials; destination is not verified');}
export function validateCatalogue(c){
 exact(c,['schema','entries']);need([CATALOGUE_SCHEMA,CATALOGUE_SCHEMA_V2].includes(c.schema)&&Array.isArray(c.entries)&&c.entries.length<=500,'Invalid catalogue or entry limit');const ids=new Set();
 for(const e of c.entries){exact(e,['id','title','source','problem','reportUrl','upstreamStatus','reviews','sidecars']);text(e.id,100);need(!ids.has(e.id),'Duplicate catalogue ID');ids.add(e.id);text(e.title,200);text(e.problem,8000);if(c.schema===CATALOGUE_SCHEMA||e.reportUrl!==null)https(e.reportUrl);need(['OPEN','CLOSED','UNKNOWN'].includes(e.upstreamStatus),'Invalid upstream status');
  exact(e.source,['url','archiveItem','filename','version','sha256','locator']);https(e.source.url);text(e.source.archiveItem,300);text(e.source.locator,2000);
  for(const k of ['filename','version'])need(e.source[k]===null||(typeof e.source[k]==='string'&&e.source[k].trim()&&e.source[k].length<=400),'Invalid file/version reference');
  need(e.source.sha256===null||(typeof e.source.sha256==='string'&&/^[a-f0-9]{64}$/.test(e.source.sha256)),'Invalid source hash');need(Array.isArray(e.reviews)&&e.reviews.length<=100,'Review limit');
  for(const a of e.reviews){exact(a,['state','by','reason','at']);need(STATES.includes(a.state),'Unknown evidence state');text(a.by,120);text(a.reason,8000);need(typeof a.at==='string'&&Number.isFinite(Date.parse(a.at)),'Invalid date');}
  need(Array.isArray(e.sidecars)&&e.sidecars.length<=100,'Sidecar limit');for(const s of e.sidecars){exact(s,['url','sha256','description']);https(s.url);need(s.sha256===null||(typeof s.sha256==='string'&&/^[a-f0-9]{64}$/.test(s.sha256)),'Invalid sidecar hash');text(s.description,2000);}
 }
 need(new TextEncoder().encode(JSON.stringify(c)).byteLength<=2*1024*1024,'Catalogue exceeds 2 MiB metadata limit');return c;
}
export function catalogueFromLeads(rows){return validateCatalogue({schema:CATALOGUE_SCHEMA,entries:rows.map(r=>({id:r.id,title:r.title,source:{url:r.source,archiveItem:new URL(r.source).pathname.split('/')[2],filename:null,version:null,sha256:null,locator:r.locator},problem:r.kind+'. '+r.note,reportUrl:r.issue,upstreamStatus:r.status,reviews:[],sidecars:[]}))});}
export const evidenceState=e=>e.reviews.at(-1)?.state||'unverified';
export function recordEvidence(c,id,review){const next=structuredClone(validateCatalogue(c)),e=next.entries.find(e=>e.id===id);need(e,'Unknown entry');e.reviews.push({...review});return validateCatalogue(next);}
export function linkSidecar(c,id,sidecar){const next=structuredClone(validateCatalogue(c)),e=next.entries.find(e=>e.id===id);need(e,'Unknown entry');e.sidecars.push({...sidecar});return validateCatalogue(next);}
export function importCatalogue(raw){need(typeof raw==='string'&&new TextEncoder().encode(raw).byteLength<=2*1024*1024,'Catalogue exceeds 2 MiB metadata limit');return validateCatalogue(JSON.parse(raw));}

// A new source report never rewrites a lead or inherits its evidence/sidecars.
// The reporter is retained as an initial unverified evidence-history event.
export function addCatalogueEntry(c,input){
 const next=structuredClone(validateCatalogue(c));
 input={reportUrl:null,...input};
 exact(input,['id','title','source','problem','by','at','reportUrl']);
 text(input.id,100);text(input.by,120);
 need(!next.entries.some(e=>e.id===input.id),'Catalogue ID already exists');
 need(typeof input.at==='string'&&Number.isFinite(Date.parse(input.at))&&new Date(input.at).toISOString()===input.at,'Use a valid UTC report time');
 exact(input.source,['url','archiveItem','filename','version','sha256','locator']);
 text(input.source.filename,400);text(input.source.version,400);
 next.schema=CATALOGUE_SCHEMA_V2;
 next.entries.push({id:input.id,title:input.title,source:structuredClone(input.source),problem:input.problem,reportUrl:input.reportUrl,upstreamStatus:'UNKNOWN',reviews:[{state:'unverified',by:input.by,reason:'Initial local report only; source identity and problem are self-declared. Reproduction has not been established.',at:input.at}],sidecars:[]});
 return validateCatalogue(next);
}

// Use the same compact UTF-8 representation bounded by validateCatalogue,
// so a locally saved export is never inflated past its own import limit.
export function exportCatalogue(c){return JSON.stringify(validateCatalogue(c));}
