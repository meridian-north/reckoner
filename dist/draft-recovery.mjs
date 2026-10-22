import {restoreDraft} from './recovery.js';
const SCHEMA='reckoner.draft-recovery.v1';
export function makeDraftRecovery(state,pendingInputs={}){return JSON.stringify({schema:SCHEMA,capturedAt:new Date().toISOString(),notice:'Unsealed unsaved draft recovery. Not a receipt, verified creator history, signature or approval.',workspace:structuredClone(state),pendingInputs});}
export function isDraftRecovery(value){return value?.schema===SCHEMA;}
export async function openDraftRecovery(value){
 if(new TextEncoder().encode(JSON.stringify(value)).length>8*1024*1024)throw Error('Draft recovery exceeds 8 MB import limit');
 if(!isDraftRecovery(value)||Object.keys(value).sort().join(',')!==['schema','capturedAt','notice','workspace','pendingInputs'].sort().join(','))throw Error('Unsupported draft recovery fields');
 if(typeof value.capturedAt!=='string'||!Number.isFinite(Date.parse(value.capturedAt))||typeof value.notice!=='string'||!value.pendingInputs||typeof value.pendingInputs!=='object'||Array.isArray(value.pendingInputs))throw Error('Invalid draft recovery metadata');
 const entries=Object.entries(value.pendingInputs);if(entries.length>300)throw Error('Draft recovery control count limit');
 for(const [id,input]of entries)if(!id||id.length>200||!input||Object.keys(input).sort().join(',')!=='checked,value'||typeof input.value!=='string'||input.value.length>200000||!(input.checked===null||typeof input.checked==='boolean'))throw Error('Invalid draft recovery pending input');
 return {state:await restoreDraft(JSON.stringify(value.workspace)),pendingInputs:value.pendingInputs};
}
