export const SCHEMA='reckoner.discovery_path.v0.1';
export const MAX_BYTES=2*1024*1024;
export const ROUTES=Object.freeze({
 known_book:{label:'Find a book or edition',begin:'Start with title, author or ISBN in Open Library. Check the specific edition and language.',check:'A work groups editions; keep the edition you examined.'},
 phrase:{label:'Find words inside a document',begin:'Choose text-content search on Internet Archive, then search within promising books.',check:'Try shorter distinctive fragments or OCR variants; preserve each attempt.'},
 government:{label:'Find a public record',begin:'Start with agency, jurisdiction, document identifier and period.',check:'Check the issuing source and exact version. An archived copy is not proof of current legal authority.'},
 science:{label:'Follow a scientific claim',begin:'Start with title, author, DOI or report identifier.',check:'Separate estimates from measurements; check revisions, methods and cited sources.'},
 web_history:{label:'Find an older web page',begin:'Start with a known URL or domain in Wayback.',check:'Capture date differs from publication date; missing resources remain gaps.'},
 remembered_scene:{label:'I remember a scene, sound or story',begin:'List remembered actions, objects, people and approximate era separately.',check:'Keep guesses and competing candidates. Confirm against a passage or timestamp rather than memory alone.'},
});
const FIELDS={
 clue:['text','confidence'],
 attempt:['query','destination','url','parentAttemptId','reason','stage'],
 outcome:['attemptId','result','observed','nextStep'],
 candidate:['attemptId','url','locator','match','reason'],
 mentor:['targetId','guidance'],
 complaint:['attemptId','expected','actual','reproduction','workaround'],
};
// Display names for the note kinds. The kind IDs above are the file format and do not change.
export const KIND_LABELS=Object.freeze({clue:'Clue or memory',attempt:'Search',outcome:'Search results observed',candidate:'Possible source',mentor:'Mentor guidance',complaint:'Problem report'});
export const kindLabel=kind=>KIND_LABELS[kind]||kind;
// One line naming a note in lists: its display name and its most telling field.
export const eventSummary=e=>kindLabel(e.kind)+': '+(e.query||e.text||e.guidance||e.observed||e.url||e.actual||e.id).slice(0,90);
const need=(ok,message)=>{if(!ok)throw Error(message);};
function exact(value,keys){need(value&&typeof value==='object'&&!Array.isArray(value),'Object required.');const own=Object.keys(value);need(own.length===keys.length&&own.every(k=>keys.includes(k)),'Unexpected or missing fields.');}
function text(value,max,required=true){need(typeof value==='string'&&value.length<=max&&(!required||value.trim()),'Missing or oversized text.');return value;}
function timestamp(value){text(value,40);need(Number.isFinite(Date.parse(value)),'Invalid observation time.');}
function url(value){text(value,2048);const u=new URL(value);need(u.protocol==='https:'&&!u.username&&!u.password,'Use a public HTTPS URL without credentials.');return value;}
const canonical=value=>value===null||typeof value!=='object'?JSON.stringify(value):Array.isArray(value)?'['+value.map(canonical).join(',')+']':'{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
const hash=async value=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(v=>v.toString(16).padStart(2,'0')).join('');
const exchange=(body,bodySha256)=>({schema:'reckoner.discovery_exchange.v0.1',body,integrity:{algorithm:'SHA-256',bodySha256}});
export const serializePath=packet=>canonical(packet);
export function createPath({goal,title,by,at=new Date().toISOString()}){
 need(Object.hasOwn(ROUTES,goal),'Choose a supported starting point.');text(title,200);text(by,120);timestamp(at);
 return {schema:SCHEMA,id:'discovery:'+crypto.randomUUID(),goal,title,createdBy:by,createdAt:at,identity:'self_declared',events:[]};
}
export function validatePath(path){
 exact(path,['schema','id','goal','title','createdBy','createdAt','identity','events']);need(path.schema===SCHEMA&&path.identity==='self_declared','Unsupported path or identity claim.');
 text(path.id,100);need(path.id.startsWith('discovery:'),'Invalid path identifier.');need(Object.hasOwn(ROUTES,path.goal),'Unknown starting point.');text(path.title,200);text(path.createdBy,120);timestamp(path.createdAt);
 need(Array.isArray(path.events)&&path.events.length<=500,'Path event limit reached.');
 const prior=new Map();let attempts=0;
 for(const e of path.events){
  need(Object.hasOwn(FIELDS,e?.kind),'Unknown event type.');exact(e,['id','kind','by','at',...FIELDS[e.kind]]);text(e.id,100);text(e.by,120);timestamp(e.at);need(!prior.has(e.id),'Duplicate event identifier.');
  if(e.kind==='clue'){text(e.text,4000);need(['confident_memory','uncertain_memory','documented_clue'].includes(e.confidence),'Record clue uncertainty.');}
  if(e.kind==='attempt'){need(['planned','opening_requested','reported_tried'].includes(e.stage),'Record search stage.');need(++attempts<=100,'Search attempt limit reached.');text(e.query,1000);text(e.destination,120);url(e.url);text(e.reason,4000);need(e.parentAttemptId===null||prior.get(e.parentAttemptId)?.kind==='attempt','Retry must name an earlier attempt.');}
  if(['outcome','candidate','complaint'].includes(e.kind))need(prior.get(e.attemptId)?.kind==='attempt','Event must name an earlier attempt.');
  if(e.kind==='outcome'){need(['no_match_seen','too_many_results','possible_match','service_error','access_restricted','not_checked'].includes(e.result),'Unsupported outcome claim.');text(e.observed,8000);text(e.nextStep,4000,false);}
  if(e.kind==='candidate'){url(e.url);text(e.locator,2000);need(['possible','supported_by_passage','rejected'].includes(e.match),'Record candidate uncertainty.');text(e.reason,8000);}
  if(e.kind==='mentor'){need(prior.has(e.targetId),'Mentor guidance must name an earlier event.');text(e.guidance,8000);}
  if(e.kind==='complaint'){for(const key of ['expected','actual','reproduction'])text(e[key],8000);text(e.workaround,4000,false);}
  prior.set(e.id,e);
 }
 need(new TextEncoder().encode(canonical(exchange(path,'0'.repeat(64)))).byteLength<=MAX_BYTES,'Path exchange byte limit reached. Export this path before adding more steps.');return true;
}
export function appendEvent(path,{kind,by,at=new Date().toISOString(),...fields}){
 validatePath(path);const event={id:crypto.randomUUID(),kind,by,at,...fields};const next={...path,events:[...path.events,event]};validatePath(next);return structuredClone(next);
}
export async function exportPath(path){
 validatePath(path);const owned=structuredClone(path),bodyText=canonical(owned);return exchange(owned,await hash(bodyText));
}
export async function importPath(raw){
 text(raw,MAX_BYTES);need(new TextEncoder().encode(raw).byteLength<=MAX_BYTES,'Exchange byte limit reached.');const packet=JSON.parse(raw);exact(packet,['schema','body','integrity']);need(packet.schema==='reckoner.discovery_exchange.v0.1','Unsupported discovery exchange.');exact(packet.integrity,['algorithm','bodySha256']);need(packet.integrity.algorithm==='SHA-256'&&/^[a-f0-9]{64}$/.test(packet.integrity.bodySha256),'Invalid integrity fields.');validatePath(packet.body);need(await hash(canonical(packet.body))===packet.integrity.bodySha256,'Discovery exchange digest mismatch.');return structuredClone(packet.body);
}
export const DISCOVERY_SCOPE='Self-declared search observations and mentoring. A digest detects changed bytes; it proves neither identity, factual accuracy, absence from an archive, permission to upload nor trusted time.';
// Derived display only. Never added to the portable path or its digest body.
const unknownAuthor=value=>['UNKNOWN','UNKNOWN_ABSENT','UNKNOWN_NOT_AUTHENTICATED','NOT_STATED','UNNAMED'].includes(value.trim().toUpperCase());
export function discoveryActivitySummary(path){
 validatePath(path);const handles=new Set(),stepHandles=new Set(),kinds={};let unknownStepAuthors=0;
 const handle=value=>value.trim().toLocaleLowerCase('en-US');
 const creatorUnknown=unknownAuthor(path.createdBy);if(!creatorUnknown)handles.add(handle(path.createdBy));
 for(const e of path.events){kinds[e.kind]=(kinds[e.kind]||0)+1;if(unknownAuthor(e.by))unknownStepAuthors++;else{const key=handle(e.by);handles.add(key);stepHandles.add(key);}}
 return {entries:path.events.length,distinctHandles:handles.size,distinctStepHandles:stepHandles.size,unknownStepAuthors,creatorUnknown,kinds,identity:'self_declared',scope:'This saved path only. Trimmed, case-insensitive handles are labels, not verified people.'};
}
export function discoverySummaryText(path){const s=discoveryActivitySummary(path);return `${s.entries} recorded steps · ${s.distinctHandles} distinct named handles (creator and step authors) · ${s.unknownStepAuthors} steps labelled with an unknown or unnamed author${s.creatorUnknown?' · creator labelled unknown or unnamed':''}. Counts cover this saved path only; handles are self-declared, not verified people.`;}
export function discoveryTextReport(path){validatePath(path);return ['Search notes: '+path.title,'Path: '+path.id,discoverySummaryText(path),'Counting: trim whitespace and compare handle labels without letter case. Unknown labels are counted separately, not silently dropped.','Created by (self-declared): '+path.createdBy,'Created at (claimed): '+path.createdAt,'Starting point: '+ROUTES[path.goal].label,'',...path.events.flatMap((e,i)=>['Step '+(i+1)+' · '+kindLabel(e.kind)+' · '+e.by+' · '+e.at,JSON.stringify(e,null,2),'']),DISCOVERY_SCOPE,'Readable report only. Keep the JSON search-notes file for digest checking and reopening.'].join('\n');}
