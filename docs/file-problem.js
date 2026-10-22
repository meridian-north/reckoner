// Evidence report, not repair, diagnosis, executable payload or institutional submission.
export const SCHEMA='file.problem-report.v1',MAX_BYTES=65536;
export const KINDS=['acquisition','integrity','compatibility','file-identification','access','rendering','text-extraction','ocr','interpretation','other'];
const need=(v,m)=>{if(!v)throw Error(m);};
function exact(o,keys){need(o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join(',')===[...keys].sort().join(','),'Unexpected report fields');}
const text=(v,n)=>need(typeof v==='string'&&v.trim()&&v.length<=n,'Missing or oversized report text');
const hash=v=>need(v===null||typeof v==='string'&&/^[a-f0-9]{64}$/.test(v),'Invalid hash reference');
export function validateReport(r){
 exact(r,['schema','kind','source','method','expected','observed','evidence','uncertainty','contributor','assistance','createdAt']);need(r.schema===SCHEMA&&KINDS.includes(r.kind),'Unsupported report type');
 exact(r.source,['url','filename','version','locator','sha256']);if(r.source.url!==null){text(r.source.url,2048);const u=new URL(r.source.url);need(u.protocol==='https:'&&!u.username&&!u.password,'Use a HTTPS reference without credentials; destination is not verified');}
 for(const k of ['filename','version','locator'])text(r.source[k],1000);hash(r.source.sha256);text(r.method,4000);for(const k of ['expected','observed','evidence','uncertainty'])text(r[k],8000);text(r.contributor,120);need(['none-declared','AI-assisted','AI-scripted-example'].includes(r.assistance),'Choose an assistance label');
 need(typeof r.createdAt==='string'&&Number.isFinite(Date.parse(r.createdAt))&&new Date(r.createdAt).toISOString()===r.createdAt,'Use a valid UTC timestamp');return r;
}
function canonical(r){return JSON.stringify({schema:r.schema,kind:r.kind,source:{url:r.source.url,filename:r.source.filename,version:r.source.version,locator:r.source.locator,sha256:r.source.sha256},method:r.method,expected:r.expected,observed:r.observed,evidence:r.evidence,uncertainty:r.uncertainty,contributor:r.contributor,assistance:r.assistance,createdAt:r.createdAt});}
async function digest(r){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(r))))].map(x=>x.toString(16).padStart(2,'0')).join('');}
export async function exportReport(input){const report=structuredClone(validateReport(input));need(new TextEncoder().encode(canonical(report)).length<=MAX_BYTES,'Report exceeds 64 KiB');const raw=JSON.stringify({report,digest:await digest(report)},null,2);need(new TextEncoder().encode(raw).length<=MAX_BYTES,'Report exceeds 64 KiB');return raw;}
export async function importReport(raw){need(typeof raw==='string'&&new TextEncoder().encode(raw).length<=MAX_BYTES,'Choose a report under 64 KiB');const p=JSON.parse(raw);exact(p,['report','digest']);validateReport(p.report);need(typeof p.digest==='string'&&/^[a-f0-9]{64}$/.test(p.digest)&&await digest(p.report)===p.digest,'Report digest mismatch');return p;}
