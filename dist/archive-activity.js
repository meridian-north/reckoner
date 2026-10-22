const need=(value,message)=>{if(!value)throw Error(message);};
const exact=(value,keys)=>{need(value&&typeof value==='object'&&!Array.isArray(value),'Archive note object required.');const actual=Reflect.ownKeys(value);need(actual.length===keys.length&&actual.every(k=>keys.includes(k)&&Object.hasOwn(Object.getOwnPropertyDescriptor(value,k),'value')),'Unexpected Archive note fields.');};
const text=(v,n,required=false)=>need(typeof v==='string'&&v.length<=n&&(!required||v.trim()),'Missing or oversized Archive note text.');
const kinds=['prepared','submission_attempt','error','receipt_link','existing_item_check','retry_plan','metadata_error'];
export const MAX_ACTIVITY_BYTES=256*1024;
// Readable names for the report. The kind and field IDs are the file format and do not change.
export const ACTIVITY_LABELS=Object.freeze({prepared:'Checklist prepared',submission_attempt:'Submission attempted at the service',error:'Error seen',receipt_link:'Item or receipt link received',existing_item_check:'Checked for an existing item',retry_plan:'Retry planned',metadata_error:'Metadata change did not work as expected'});
const REPORT_LABELS={expected:'Expected',actual:'What happened',reproduction:'Steps to repeat',changedFields:'Fields intended to change',before:'Before, as seen',intendedAfter:'Intended after'};
export function createArchiveActivity(recordId){text(recordId,200,true);return {schema:'reckoner.archive_activity.v0.1',recordId,identity:'self_declared',serviceVerified:false,events:[]};}
function archiveUrl(value){text(value,2048);if(!value)return;const url=new URL(value);need(url.protocol==='https:'&&!url.username&&!url.password&&(url.hostname==='archive.org'||url.hostname.endsWith('.archive.org')),'Use an HTTPS Archive service or item address without credentials.');}
export function validateArchiveActivity(value,recordId){
 exact(value,['schema','recordId','identity','serviceVerified','events']);text(value.recordId,200,true);need(value.schema==='reckoner.archive_activity.v0.1'&&value.recordId===recordId&&value.identity==='self_declared'&&value.serviceVerified===false,'Archive activity identity or status mismatch.');need(Array.isArray(value.events)&&value.events.length<=200,'Archive activity entry limit reached.');const ids=new Map();
 for(const e of value.events){exact(e,['id','kind','actor','at','preparedId','note','url','preparation','report']);text(e.id,100,true);need(!ids.has(e.id)&&kinds.includes(e.kind),'Duplicate or unsupported Archive note.');text(e.actor,120,true);text(e.at,40,true);need(Number.isFinite(Date.parse(e.at)),'Invalid Archive note time.');text(e.note,4000,e.kind!=='metadata_error');archiveUrl(e.url);need(e.preparedId===null||typeof e.preparedId==='string'&&ids.get(e.preparedId)?.kind==='prepared','Archive note must refer to an earlier preparation.');
  if(e.kind==='prepared'){need(e.preparedId===null&&e.report===null,'Invalid preparation history.');const p=e.preparation;exact(p,['handoffId','route','title','sourceUrl','sourceFileSha256','rightsBasis']);text(p.handoffId,100,true);need(['web_capture','file_upload'].includes(p.route)&&['own_work','public_domain','permission','licensed'].includes(p.rightsBasis),'Invalid preparation scope.');text(p.title,2000);text(p.sourceUrl,2048);need(p.sourceFileSha256===null||/^[a-f0-9]{64}$/.test(p.sourceFileSha256),'Invalid preparation evidence pin.');}
  else need(e.preparation===null,'Only a preparation may carry a source snapshot.');
  if(['submission_attempt','retry_plan'].includes(e.kind))need(e.preparedId!==null,'Choose an earlier preparation before recording an attempt or retry plan.');
  if(['receipt_link','existing_item_check'].includes(e.kind))need(e.url.trim(),'Record the Archive address you inspected or received.');
  if(e.kind==='metadata_error'){exact(e.report,['expected','actual','reproduction','changedFields','before','intendedAfter']);for(const k of ['expected','actual','reproduction'])text(e.report[k],4000,true);for(const k of ['changedFields','before','intendedAfter'])text(e.report[k],4000);}
  else need(e.report===null,'Only metadata-error notes may carry an error report.');ids.set(e.id,e);
 }
 need(new TextEncoder().encode(JSON.stringify(value)).byteLength<=MAX_ACTIVITY_BYTES,'Archive activity byte limit reached. Export before adding more notes.');return true;
}
export function appendArchiveActivity(current,recordId,{kind,actor,note='',url='',preparedId=null,preparation=null,report=null}, {at=new Date().toISOString(),id=crypto.randomUUID()}={}){
 const prior=current||createArchiveActivity(recordId);validateArchiveActivity(prior,recordId);const next={...prior,events:[...prior.events,{id,kind,actor,at,preparedId,note,url,preparation,report}]};validateArchiveActivity(next,recordId);return structuredClone(next);
}
export function preparationSnapshot(handoff){return {handoffId:handoff.id,route:handoff.route,title:handoff.source.title,sourceUrl:handoff.source.url||'',sourceFileSha256:handoff.source.file?.sha256||null,rightsBasis:handoff.rights.basis};}
export function archiveActivityReport(value){validateArchiveActivity(value,value.recordId);const lines=['Archive activity notes','Self-declared observations; no service outcome, permission or institutional approval verified.','Review record: '+value.recordId];for(const e of value.events){const prepared=e.preparedId&&value.events.find(p=>p.id===e.preparedId);lines.push('',(ACTIVITY_LABELS[e.kind]||e.kind)+' · '+e.actor+' · '+e.at,'Note ID: '+e.id,prepared?'Related preparation: '+(prepared.preparation.title||'Untitled')+' · '+prepared.at+' (note '+prepared.id+')':'No earlier preparation selected',e.note,e.url);if(e.preparation)lines.push('Preparation snapshot: '+JSON.stringify(e.preparation));if(e.report)for(const [k,v] of Object.entries(e.report))lines.push((REPORT_LABELS[k]||k)+': '+(v||'Not stated'));}return lines.join('\n');}
// Archive notes are one record-level log. Merging two copies of the same record
// keeps every note: a note ID seen twice must carry the same contents, each note
// follows the preparation it names, and otherwise notes run by time, then ID,
// so both merge directions give one order. A copy without the field adds nothing.
const canon=v=>v===null||typeof v!=='object'?JSON.stringify(v):Array.isArray(v)?'['+v.map(canon).join(',')+']':'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canon(v[k])).join(',')+'}';
export function mergeArchiveActivity(current,incoming,recordId){
 if(incoming===undefined)return {activity:current,added:0};
 validateArchiveActivity(incoming,recordId);if(current!==undefined)validateArchiveActivity(current,recordId);
 const notes=new Map((current?.events||[]).map(e=>[e.id,e]));let added=0;
 for(const e of incoming.events){const existing=notes.get(e.id);if(existing){if(canon(existing)!==canon(e))throw Error('An Archive note has the same ID but different contents. Nothing was merged.');continue;}notes.set(e.id,e);added++;}
 if(!added)return {activity:current,added:0};
 const waiting=[...notes.values()],placed=new Set(),events=[];
 while(waiting.length){const ready=waiting.filter(e=>e.preparedId===null||placed.has(e.preparedId));if(!ready.length)throw Error('An Archive note refers to a missing preparation. Nothing was merged.');ready.sort((a,b)=>Date.parse(a.at)-Date.parse(b.at)||(a.id<b.id?-1:a.id>b.id?1:0));waiting.splice(waiting.indexOf(ready[0]),1);events.push(structuredClone(ready[0]));placed.add(ready[0].id);}
 const activity={...structuredClone(current||incoming),events};
 if(events.length>200||new TextEncoder().encode(JSON.stringify(activity)).byteLength>MAX_ACTIVITY_BYTES)throw Error('The combined copies exceed the Archive notes limit (200 notes, 256 KiB). Export each copy separately. Nothing was merged.');
 validateArchiveActivity(activity,recordId);return {activity,added};
}
