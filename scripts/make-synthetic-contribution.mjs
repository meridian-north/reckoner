// Builds the canonical permitted synthetic example of the single contribution file.
// Owned synthetic text only: no source image, no original hOCR bytes, no model execution,
// no network. Exact reference hashes of the (absent) source/hOCR are declared as owned constants.
// Output: examples/synthetic-contribution/contribution.history.json (creator-history bundle, the
// default download), latest-receipt.json (exact latest snapshot bytes), HASHES.json.
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash,webcrypto} from 'node:crypto';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
import {makeState,addRevision,addReview,seal} from '../dist/core.js';
import {creatorSave} from '../dist/creator-history.mjs';
import {bundleText} from '../dist/creator-history-store.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const SOURCE_SHA='3b0d3c3a6c55f2b4f9d7f0a1c3e5b7d9f1a3c5e7b9d1f3a5c7e9b1d3f5a7c9e1';// owned synthetic page image reference (bytes not included)
const HOCR_SHA='9e1c7a5f3d1b9f7d5b3a1f9d7c5e3a1b9f7d5c3e1a9b7f5d3c1e9a7b5f3d1c9e';// owned synthetic hOCR reference (bytes not included)
export async function buildSyntheticContribution({now=new Date('2026-10-20T06:00:00.000Z')}={}){
 const state=makeState();state.id='cairn:synthetic-contribution-example';state.createdAt=now.toISOString();
 state.sourceImage={name:'synthetic-notice-page.png',mime:'image/png',size:27378,sha256:SOURCE_SHA,synthetic:true};
 const context={title:'Synthetic council notice (owned example)',publisher:'Synthetic Example Council',actors:'Council clerk',sourceUrl:'',sourceFile:'synthetic-notice-page.png',locator:'hOCR page 1 (page_1), word word_1_2, bbox 260 260 300 320',sourceDate:'1912-06-04 (synthetic)',edition:'Example edition 1',sourceWhy:'Public meeting notice (synthetic)',lexicon:'Literal transcription v1',lens:'OCR correction',method:'Compared the enlarged passage with the machine reading; no recognition or correction applied automatically.',imageView:'',
  hocr:{operation:'Human review of hOCR word; no recognition or correction applied automatically',hocrFile:'synthetic-notice-page.hocr',hocrSha256:HOCR_SHA,hocrBytes:1194,pageId:'page_1',pageIndex:0,wordId:'word_1_2',originalWord:'14',bbox:[260,260,300,320],ocrConfidence:71,sourceSha256:SOURCE_SHA,identity:'Local image dimensions matched; correspondence asserted by contributor, not independently verified'}};
 // Reading 1: human correction, AI assistance declared as a note (no model executed here).
 addRevision(state,{original:'14',proposed:'17',contributor:'Synthetic contributor (owned example)',uncertainty:'clear',reason:'Enlarged passage shows a 7; the machine reading has a 4.',assistance:'Drafted with an AI assistant; the human checked the enlarged scan. Synthetic example; no model was executed to build this file.'},context);
 // Reading 2: a second human reading of the same word with uncertainty, no assistance declared.
 addRevision(state,{original:'14',proposed:'17.',contributor:'Second synthetic contributor',uncertainty:'uncertain',reason:'Possible trailing period after the digit; not certain.'},context);
 const [r1,r2]=state.revisions;
 addReview(state,{reviewer:'Synthetic mentor',role:'mentor',decision:'needs_review',reason:'Recheck whether the mark after 17 is a period or dirt on the scan.',revisionId:r2.id});
 addReview(state,{reviewer:'Synthetic reviewer',role:'reviewer',decision:'disputed',reason:'I read the final digit as 4 at 300% zoom; please re-examine.',revisionId:r1.id});
 state.modelRuns=[{id:'declared-model-note-0',provider:'Declared only',model:'No model executed; this record declares assistance, it does not carry an execution',prompt:'(none)',response:'(none)'}];
 state.activeRevisionId=r2.id;
 // Two checkpoints: first after reading 1, second after reading 2 + reviews, so the bundle carries prior revisions.
 const stateAfterFirst=structuredClone(state);stateAfterFirst.revisions=[r1];stateAfterFirst.reviews=[];stateAfterFirst.activeRevisionId=r1.id;
 const bytes1=new TextEncoder().encode(JSON.stringify(await seal(stateAfterFirst)));
 const first=await creatorSave({receiptBytes:bytes1,creatorLabel:'Synthetic contributor (owned example)',savedAt:new Date(now.getTime()+60000).toISOString()});
 const bytes2=new TextEncoder().encode(JSON.stringify(await seal(state)));
 const second=await creatorSave({historyJson:first.historyJson,snapshots:first.snapshots,receiptBytes:bytes2,creatorLabel:'Second synthetic contributor',savedAt:new Date(now.getTime()+120000).toISOString(),expectedGenesis:first.verification.genesis,expectedTip:first.verification.tip});
 return {bundle:bundleText(second),latestReceipt:bytes2,firstReceipt:bytes1,verification:second.verification};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const out=new URL('../examples/synthetic-contribution/',import.meta.url);await mkdir(out,{recursive:true});
 const built=await buildSyntheticContribution();
 await writeFile(new URL('contribution.history.json',out),built.bundle);
 await writeFile(new URL('latest-receipt.json',out),built.latestReceipt);
 const hashes={schema:'reckoner.synthetic-contribution-example.v1',note:'Owned synthetic example. Source image and original hOCR bytes are intentionally absent; their declared hashes are owned constants, not real files.',files:{'contribution.history.json':{bytes:built.bundle.length,sha256:sha(built.bundle)},'latest-receipt.json':{bytes:built.latestReceipt.length,sha256:sha(built.latestReceipt)}},genesis:built.verification.genesis,tip:built.verification.tip};
 await writeFile(new URL('HASHES.json',out),JSON.stringify(hashes,null,2)+'\n');
 console.log(JSON.stringify(hashes,null,2));
}
