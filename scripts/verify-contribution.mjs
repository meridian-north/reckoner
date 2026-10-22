// Read-only Node adapter for the same semantic verifiers used by Reckoner.
// Accepts either a readable receipt (garrison.cairn.receipt.v0.1) or the complete
// creator-history bundle (reckoner.creator-history-bundle.v1) that Record tools →
// Download backup produces. The bundle is the single recoverable contribution file:
// every retained checkpoint is an exact receipt snapshot, hash-linked in order.
import {open,lstat,writeFile} from 'node:fs/promises';
import {constants} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {verifyReceipt} from '../dist/core.js';
import {MAX_RECEIPT_BYTES} from '../dist/limits.js';
import {openBundle,isHistoryBundle} from '../dist/creator-history-store.mjs';
import {LIMITS as HISTORY_LIMITS} from '../dist/creator-history.mjs';
const BUNDLE_TEXT_BYTES=92*1024*1024; // openBundle's own text budget; snapshots are bounded again inside it
const hex=v=>v===null||v===undefined||/^[a-f0-9]{64}$/.test(v);
async function readBounded(filename,maxBytes,label){
 const initial=await lstat(filename);if(!initial.isFile())throw Error('Choose a regular '+label+' file; links and special files are refused.');
 const file=await open(filename,constants.O_RDONLY|(constants.O_NONBLOCK||0)|(constants.O_NOFOLLOW||0));
 try{const info=await file.stat();if(!info.isFile()||info.size<1||info.size>maxBytes)throw Error('Choose a regular '+label+' file between 1 byte and '+maxBytes+' bytes.');const buffer=Buffer.alloc(maxBytes+1);let length=0;while(length<buffer.length){const read=await file.read(buffer,length,buffer.length-length,null);if(!read.bytesRead)break;length+=read.bytesRead;}if(length>maxBytes)throw Error(label+' exceeds its byte budget.');return buffer.subarray(0,length);}finally{await file.close();}
}
function receiptSummary(state){return {readings:state.revisions.length,reviews:state.reviews.length,mentorReviews:state.reviews.filter(r=>r.role==='mentor').length,disputed:state.reviews.filter(r=>r.decision==='disputed').length,needsReview:state.reviews.filter(r=>r.decision==='needs_review').length,assistanceNotes:state.revisions.filter(r=>r.reading.assistance?.trim()).length,hocrPinnedReadings:state.revisions.filter(r=>r.context?.hocr?.hocrSha256).length,modelRecords:(state.modelRuns||[]).length,contributors:[...new Set(state.revisions.map(r=>r.reading.contributor))].length,sourceCorrespondence:'NOT_CHECKED',identity:'SELF_DECLARED_UNAUTHENTICATED',correctness:'NOT_VERIFIED',rights:'NOT_VERIFIED'};}
export async function verifyContributionFile(filename,{expectedSha256=null,expectedGenesis=null,expectedTip=null,extractLatestReceipt=null}={}){
 for(const [v,n] of [[expectedSha256,'SHA-256'],[expectedGenesis,'genesis'],[expectedTip,'tip']])if(!hex(v))throw Error('Expected '+n+' must be 64 lowercase hexadecimal characters.');
 // Peek within the larger budget first; a receipt is then re-bounded to its own 2 MiB limit.
 const bytes=await readBounded(filename,BUNDLE_TEXT_BYTES,'contribution JSON');
 const sha256=createHash('sha256').update(bytes).digest('hex');if(expectedSha256&&sha256!==expectedSha256)throw Error('File does not match the independently supplied SHA-256 checkpoint.');
 const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);const parsed=JSON.parse(text);
 if(isHistoryBundle(parsed)){
  if(extractLatestReceipt&&!/\.json$/.test(extractLatestReceipt))throw Error('Extract the latest receipt to a .json path.');
  const opened=await openBundle(text,{expectedGenesis,expectedTip});
  const history=JSON.parse(opened.historyJson),last=history.entries.at(-1),latest=opened.snapshots.get(last.body.receipt.sha256);
  if(extractLatestReceipt)await writeFile(extractLatestReceipt,latest,{flag:'wx'});
  return {format:'reckoner.creator-history-bundle.v1',bytes:bytes.length,fileSha256:sha256,checkpoints:history.entries.length,snapshots:opened.snapshots.size,genesis:opened.verification.genesis,tip:opened.verification.tip,continuity:opened.verification.continuity,trust:opened.verification.trust,freshness:opened.verification.freshness,latestReceiptSha256:last.body.receipt.sha256,latestReceiptBytes:latest.length,latestBodySha256:JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(latest)).integrity?.bodySha256??null,latestReceipt:receiptSummary(opened.state),extracted:extractLatestReceipt||null,verification:'SELF_CONSISTENT_HISTORY'+(expectedGenesis?'_WITH_INDEPENDENT_GENESIS':'')+(expectedTip?'_AND_TIP':''),checkpoint:expectedSha256?'MATCHES_SUPPLIED_FILE_HASH':'NO_INDEPENDENT_FILE_HASH'};
 }
 if(bytes.length>MAX_RECEIPT_BYTES)throw Error('Contribution JSON exceeds 2 MiB.');
 if(expectedGenesis||expectedTip||extractLatestReceipt)throw Error('Genesis/tip checkpoints and extraction apply to a creator-history bundle, not a standalone receipt.');
 const state=await verifyReceipt(parsed);
 return {format:parsed.schema,bytes:bytes.length,fileSha256:sha256,bodySha256:parsed.integrity.bodySha256,verification:'SELF_CONSISTENT_RECEIPT',checkpoint:expectedSha256?'MATCHES_SUPPLIED_FILE_HASH':'NO_INDEPENDENT_CHECKPOINT',...receiptSummary(state),freshness:'LATEST_VERSION_UNKNOWN'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const args=process.argv.slice(2),opts={};const file=args.shift();
 try{
  if(!file)throw Error('Usage: node scripts/verify-contribution.mjs FILE.json [--expected-sha256 HEX] [--expected-genesis HEX] [--expected-tip HEX] [--extract-latest-receipt OUT.json]');
  while(args.length){const flag=args.shift(),value=args.shift();if(value===undefined)throw Error('Flag '+flag+' needs a value.');const key={'--expected-sha256':'expectedSha256','--expected-genesis':'expectedGenesis','--expected-tip':'expectedTip','--extract-latest-receipt':'extractLatestReceipt'}[flag];if(!key)throw Error('Unknown flag '+flag);opts[key]=value;}
  console.log(JSON.stringify(await verifyContributionFile(file,opts),null,2));
 }catch(error){console.error(JSON.stringify({verification:'REFUSED',error:error.message}));process.exitCode=1;}
}
