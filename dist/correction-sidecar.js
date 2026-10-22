// A bounded correction proposal. Digests detect changed bytes; they prove no identity or approval.
export const SCHEMA='ocr.correction-sidecar.v1',MAX_BYTES=65536;
const need=(ok,message)=>{if(!ok)throw Error(message);};
const exact=(o,keys)=>need(o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join(',')===[...keys].sort().join(','),'Unexpected correction fields');
const text=(v,n)=>need(typeof v==='string'&&v.trim().length>0&&v.length<=n,'Missing or oversized correction text');
const hash=v=>need(v===null||(typeof v==='string'&&/^[a-f0-9]{64}$/.test(v)),'Invalid SHA-256 reference');
function https(v){text(v,2048);const u=new URL(v);need(u.protocol==='https:'&&!u.username&&!u.password,'Use HTTPS references without credentials');}
export function validateProposal(p){
 exact(p,['schema','source','original','proposed','reason','uncertainty','attribution','createdAt','previousDigest']);need(p.schema===SCHEMA,'Unsupported correction schema');
 exact(p.source,['url','archiveItem','filename','version','sha256','locator']);https(p.source.url);text(p.source.archiveItem,300);text(p.source.filename,400);text(p.source.version,400);text(p.source.locator,2000);hash(p.source.sha256);
 for(const k of ['original','proposed','reason'])text(p[k],8000);
 need(p.original!==p.proposed,'A correction must identify a changed passage');text(p.uncertainty,2000);
 exact(p.attribution,['contributor','assistance']);text(p.attribution.contributor,120);need(['none-declared','AI-assisted','AI-scripted-example'].includes(p.attribution.assistance),'Choose an explicit assistance label');
 need(typeof p.createdAt==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(p.createdAt)&&Number.isFinite(Date.parse(p.createdAt))&&new Date(p.createdAt).toISOString()===p.createdAt,'Use a valid UTC creation time');hash(p.previousDigest);
 need(new TextEncoder().encode(JSON.stringify(p)).byteLength<=MAX_BYTES,'Correction exceeds 64 KiB');return p;
}
// Fixed field order makes digest input independent of JSON property ordering.
function canonical(p){return JSON.stringify({schema:p.schema,source:{url:p.source.url,archiveItem:p.source.archiveItem,filename:p.source.filename,version:p.source.version,sha256:p.source.sha256,locator:p.source.locator},original:p.original,proposed:p.proposed,reason:p.reason,uncertainty:p.uncertainty,attribution:{contributor:p.attribution.contributor,assistance:p.attribution.assistance},createdAt:p.createdAt,previousDigest:p.previousDigest});}
async function digest(p){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(p))))].map(b=>b.toString(16).padStart(2,'0')).join('');}
export async function exportCorrection(proposal){const p=structuredClone(validateProposal(proposal));const packet={proposal:p,digest:await digest(p)};const raw=JSON.stringify(packet,null,2);need(new TextEncoder().encode(raw).byteLength<=MAX_BYTES,'Correction exceeds 64 KiB');return raw;}
export async function importCorrection(raw){need(typeof raw==='string'&&new TextEncoder().encode(raw).byteLength<=MAX_BYTES,'Choose a correction under 64 KiB');const packet=JSON.parse(raw);exact(packet,['proposal','digest']);validateProposal(packet.proposal);need(typeof packet.digest==='string'&&/^[a-f0-9]{64}$/.test(packet.digest),'Missing correction digest');need(await digest(packet.proposal)===packet.digest,'Correction digest mismatch; retain the original and inspect changes');return packet;}
