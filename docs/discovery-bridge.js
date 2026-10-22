import {importPath,exportPath,serializePath,MAX_BYTES} from './discovery.mjs';
export async function validateTrail(trail){
 if(!trail||typeof trail!=='object'||Array.isArray(trail)||Object.keys(trail).sort().join(',')!=='candidateId,packet,schema'||trail.schema!=='reckoner.discovery_review.v0.1'||typeof trail.packet!=='string'||typeof trail.candidateId!=='string')throw Error('Invalid discovery trail.');
 const path=await importPath(trail.packet);const candidate=path.events.find(e=>e.id===trail.candidateId&&e.kind==='candidate');
 if(!candidate||candidate.match==='rejected')throw Error('Choose a non-rejected candidate from this saved discovery path.');
 return {path,candidate};
}
export async function prepareDiscoveryReview(path,candidateId){
 const owned=structuredClone(path);const packet=serializePath(await exportPath(owned));const trail={schema:'reckoner.discovery_review.v0.1',packet,candidateId};
 const {candidate}=await validateTrail(trail);
 const context={title:owned.title,sourceUrl:candidate.url,locator:candidate.locator,discoveryTrail:trail};if(new TextEncoder().encode(JSON.stringify(context)).byteLength>MAX_BYTES-16384)throw Error('Discovery trail leaves no room in a review record. Export this path separately and begin a shorter linked path.');return context;
}
export const handoffKey=id=>{if(!/^[a-f0-9-]{36}$/.test(id))throw Error('Invalid handoff identifier.');return 'reckoner-discovery-review:'+id;};
export async function readHandoff(raw){if(typeof raw!=='string'||new TextEncoder().encode(raw).byteLength>MAX_BYTES+16384)throw Error('Invalid handoff size.');const context=JSON.parse(raw);if(Object.keys(context).sort().join(',')!=='discoveryTrail,locator,sourceUrl,title')throw Error('Invalid handoff fields.');const {path,candidate}=await validateTrail(context.discoveryTrail);if(context.title!==path.title||context.sourceUrl!==candidate.url||context.locator!==candidate.locator)throw Error('Handoff does not match the selected candidate.');return context;}

export function forkReviewStorage(id,session,uuid=()=>crypto.randomUUID()){
 const intakeKey=handoffKey(id),pointer=intakeKey+':tab';let previous=null;
 try{const found=session.getItem(pointer);if(found&&found.startsWith(intakeKey+':workspace:')&&/^[a-f0-9-]{36}$/.test(found.slice((intakeKey+':workspace:').length)))previous=found;}catch{}
 const result={key:intakeKey+':workspace:'+uuid(),previous,intakeKey,resumable:false,commit(){try{session.setItem(pointer,result.key);result.resumable=session.getItem(pointer)===result.key;}catch{result.resumable=false;}return result.resumable;}};
 return result;
}
