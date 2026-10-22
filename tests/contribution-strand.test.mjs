import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
import {makeState,addRevision,seal,canonical,digest} from '../dist/core.js';
import {draftContext,portableRecord} from '../dist/contexts.js';
import {preparePrivateWalSave} from '../dist/contribution-wal-bundle.js';
import * as V2 from '../dist/contribution-wal.js';
import * as V3 from '../dist/contribution-strand.js';
const E=new TextEncoder();
async function fixture(){
 const context=await draftContext({mode:'new',form:{name:'SyntheticArchiveArbitrage2026',author:'Synthetic reviewer',provenance:'Owned software fixture',meaning:'Literal transcription against the supplied image',facets:[],emphasis:[],concepts:[],rules:['Preserve spelling','Keep uncertainty explicit'],operations:[],hints:[],references:[]},policy:{definitionByteBudget:null}});
 const state=makeState();state.context={title:'Owned strand fixture',sourceUrl:'https://owned-fixture.invalid/page',method:'Compare visible glyphs',locator:'Synthetic line 1'};
 state.draft={original:'Juno',proposed:'June',reason:'Synthetic test only',contributor:'Synthetic contributor',uncertainty:'uncertain'};
 state.contextDefinitions=[portableRecord(context.record)];
 state.modelRuns=[{id:'owned-bitnet-note',provider:'Owned test fixture',model:'BitNet-compatible suggestion record, not executed',prompt:'Synthetic prompt',response:'Synthetic suggestion'}];
 addRevision(state,state.draft,state.context);
 const packet=E.encode(JSON.stringify(await seal(state))),h=await digest(packet);
 const legacy=await preparePrivateWalSave({packetBytes:packet,creator:'Synthetic exporter',recordId:state.id,eventId:'save-0',purpose:'Owned software test',method:'No model execution',savedAt:'2026-10-19T12:00:00.000Z',localOnly:true});
 return {legacy,fields:{...legacy.verification.rows[0],bitnet_sidecars:canonical([{artifactSha256:h,pointer:'/modelRuns/0'}]),microtheories:canonical([{artifactSha256:h,pointer:'/contextDefinitions/0'}])},snapshots:legacy.snapshots};
}
test('v3 carries both public references and exact artifacts, independently of v2 header',async()=>{
 const f=await fixture(),before=new Uint8Array(f.legacy.bytes),v=await V3.appendContributionWal(f);
 assert.equal(V3.HEADER.length,25);assert.equal(V2.HEADER.length,23);assert.equal(v.verification.schema,V3.SCHEMA);
 assert.deepEqual(f.legacy.bytes,before);assert.equal((await V2.verifyContributionWal(before,f.snapshots)).schema,V2.SCHEMA);
 const reopened=await V3.verifyContributionWal(v.bytes,v.snapshots,{expectedGenesis:v.verification.genesis,expectedTip:v.verification.tip});
 assert.equal(reopened.rows[0].microtheories,f.fields.microtheories);assert.equal(reopened.rows[0].bitnet_sidecars,f.fields.bitnet_sidecars);
 assert.equal(JSON.parse((await V3.safeViewingProjection(v.bytes,v.snapshots)).text).rows[0].microtheories,f.fields.microtheories);
});
test('missing references, private extension keys and changed artifacts are refused',async()=>{
 const f=await fixture();
 for(const refs of [[{artifactSha256:'0'.repeat(64),pointer:'/modelRuns/0'}],[{artifactSha256:[...f.snapshots.keys()][0],pointer:'/missing'}],[{artifactSha256:[...f.snapshots.keys()][0],pointer:'/revisions/0/reading/reason'}],[{artifactSha256:[...f.snapshots.keys()][0],pointer:'/modelRuns/0'},{artifactSha256:[...f.snapshots.keys()][0],pointer:'/modelRuns/0'}],[{artifactSha256:[...f.snapshots.keys()][0],pointer:'/modelRuns/0',internalRegistry:'forbidden'}]]){
  await assert.rejects(V3.appendContributionWal({...f,fields:{...f.fields,bitnet_sidecars:canonical(refs)}}));
 }
 const v=await V3.appendContributionWal(f),changed=new Map([...v.snapshots].map(([h,b])=>[h,new Uint8Array(b).fill(32)]));
 await assert.rejects(V3.verifyContributionWal(v.bytes,changed),/changed/);
 await assert.rejects(V3.appendContributionWal({...f,previousBytes:f.legacy.bytes,expectedGenesis:f.legacy.verification.genesis,expectedTip:f.legacy.verification.tip}),/width|header/i);
});
test('optional columns default empty and v3 append retains prior byte prefix',async()=>{
 const f=await fixture(),fields={...f.fields};delete fields.bitnet_sidecars;delete fields.microtheories;
 const first=await V3.appendContributionWal({...f,fields});assert.equal(first.verification.rows[0].microtheories,'[]');
 const next=await V3.appendContributionWal({...f,fields:{...f.fields,event_id:'save-1'},previousBytes:first.bytes,expectedGenesis:first.verification.genesis,expectedTip:first.verification.tip});
 assert.deepEqual(next.bytes.slice(0,first.bytes.length),first.bytes);assert.equal(next.verification.rows.length,2);
});
