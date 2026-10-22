// The single contribution file is the existing creator-history bundle. These tests prove that a
// save → bundle → fresh reopen round trip preserves every attribution/decision field, that the
// Node reader accepts both the bundle and the exact extracted receipt, and that stale, tampered
// and truncated bundles are refused. No browser, no network, no model execution.
import test from 'node:test';import assert from 'node:assert/strict';import {webcrypto,createHash} from 'node:crypto';if(!globalThis.crypto)globalThis.crypto=webcrypto;
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import path from 'node:path';
import {openBundle,isHistoryBundle} from '../dist/creator-history-store.mjs';
import {buildSyntheticContribution} from '../scripts/make-synthetic-contribution.mjs';
import {verifyContributionFile} from '../scripts/verify-contribution.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
test('bundle round trip preserves contributor, AI note, reason, uncertainty, hOCR pin, mentor/dispute decisions and prior revisions',async()=>{
 const built=await buildSyntheticContribution();assert.ok(isHistoryBundle(JSON.parse(built.bundle)));
 const opened=await openBundle(built.bundle);const s=opened.state;
 assert.equal(s.revisions.length,2);assert.equal(opened.snapshots.size,2,'both checkpoints retained');
 const [r1,r2]=s.revisions;
 assert.equal(r1.reading.contributor,'Synthetic contributor (owned example)');assert.match(r1.reading.assistance,/AI assistant/);assert.equal(r1.reading.uncertainty,'clear');assert.match(r1.reading.reason,/shows a 7/);
 assert.equal(r2.reading.contributor,'Second synthetic contributor');assert.equal(r2.reading.assistance??'', '');assert.equal(r2.reading.uncertainty,'uncertain');
 for(const r of s.revisions){assert.equal(r.context.hocr.wordId,'word_1_2');assert.deepEqual(r.context.hocr.bbox,[260,260,300,320]);assert.equal(r.context.hocr.hocrSha256.length,64);assert.equal(r.context.hocr.sourceSha256,r.sourceImage?.sha256??s.sourceImage.sha256);}
 const mentor=s.reviews.find(v=>v.role==='mentor');assert.equal(mentor.decision,'needs_review');assert.equal(mentor.revisionId,r2.id);
 const dispute=s.reviews.find(v=>v.decision==='disputed');assert.equal(dispute.role,'reviewer');assert.equal(dispute.revisionId,r1.id);
 // prior checkpoint is the exact first receipt and shows one reading, no reviews
 const firstHash=sha(built.firstReceipt);assert.ok(opened.snapshots.has(firstHash));const prior=JSON.parse(new TextDecoder().decode(opened.snapshots.get(firstHash)));assert.equal(prior.revisions.length,1);assert.equal(prior.reviews.length,0);
 assert.equal(opened.verification.continuity,'exact_snapshot_hash_links_verified');
});
test('Node reader accepts the bundle, extracts the exact latest receipt and reads that receipt back',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'reckoner-contribution-'));try{
  const built=await buildSyntheticContribution();const file=path.join(dir,'contribution.history.json');await writeFile(file,built.bundle);const out=path.join(dir,'latest.json');
  const r=await verifyContributionFile(file,{expectedGenesis:built.verification.genesis,expectedTip:built.verification.tip,extractLatestReceipt:out});
  assert.equal(r.format,'reckoner.creator-history-bundle.v1');assert.equal(r.checkpoints,2);assert.equal(r.trust,'MATCHES_INDEPENDENT_GENESIS');assert.equal(r.freshness,'MATCHES_INDEPENDENT_TIP');
  assert.deepEqual([r.latestReceipt.readings,r.latestReceipt.mentorReviews,r.latestReceipt.disputed,r.latestReceipt.needsReview,r.latestReceipt.assistanceNotes,r.latestReceipt.hocrPinnedReadings],[2,1,1,1,1,2]);
  assert.deepEqual(await readFile(out),Buffer.from(built.latestReceipt),'extraction is byte exact');assert.equal(r.latestBodySha256.length,64);
  const back=await verifyContributionFile(out);assert.equal(back.format,'garrison.cairn.receipt.v0.1');assert.equal(back.bodySha256,r.latestBodySha256);assert.equal(back.readings,2);
  await assert.rejects(verifyContributionFile(file,{extractLatestReceipt:out}),/EEXIST/,'never overwrites an existing extraction');
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('stale, rollback, tampered-snapshot, tampered-history and truncated bundles are refused; standalone receipt rejects bundle-only flags',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'reckoner-contribution-'));try{
  const built=await buildSyntheticContribution();const bundle=JSON.parse(built.bundle);
  const stale=structuredClone(bundle);const h=JSON.parse(stale.history);h.entries.pop();stale.history=JSON.stringify(h);stale.snapshots.pop();const staleFile=path.join(dir,'stale.json');await writeFile(staleFile,JSON.stringify(stale));
  await assert.rejects(verifyContributionFile(staleFile,{expectedTip:built.verification.tip}),/stale, rollback or different branch/);
  const unknownTip=await verifyContributionFile(staleFile);assert.equal(unknownTip.freshness,'LATEST_VERSION_UNKNOWN');
  const tampered=structuredClone(bundle);const last=tampered.snapshots.at(-1);last.base64=Buffer.from(Buffer.from(last.base64,'base64').toString('utf8').replace('"proposed":"17."','"proposed":"18."')).toString('base64');const tf=path.join(dir,'tampered.json');await writeFile(tf,JSON.stringify(tampered));
  await assert.rejects(verifyContributionFile(tf),/Missing or changed snapshot|integrity/);
  const edited=structuredClone(bundle);const eh=JSON.parse(edited.history);eh.entries[0].body.creatorLabel='Someone else';edited.history=JSON.stringify(eh);const ef=path.join(dir,'edited.json');await writeFile(ef,JSON.stringify(edited));
  await assert.rejects(verifyContributionFile(ef));
  const trunc=path.join(dir,'trunc.json');await writeFile(trunc,built.bundle.slice(0,built.bundle.length-20));await assert.rejects(verifyContributionFile(trunc));
  const receipt=path.join(dir,'receipt.json');await writeFile(receipt,built.latestReceipt);await assert.rejects(verifyContributionFile(receipt,{expectedTip:built.verification.tip}),/apply to a creator-history bundle/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('committed synthetic example matches its recorded hashes and verifies',async()=>{
 const base=new URL('../examples/synthetic-contribution/',import.meta.url);const hashes=JSON.parse(await readFile(new URL('HASHES.json',base),'utf8'));
 for(const [name,info] of Object.entries(hashes.files)){const bytes=await readFile(new URL(name,base));assert.equal(bytes.length,info.bytes,name);assert.equal(sha(bytes),info.sha256,name);}
 const r=await verifyContributionFile(new URL('contribution.history.json',base).pathname,{expectedGenesis:hashes.genesis,expectedTip:hashes.tip});assert.equal(r.verification,'SELF_CONSISTENT_HISTORY_WITH_INDEPENDENT_GENESIS_AND_TIP');assert.equal(r.latestReceiptSha256,hashes.files['latest-receipt.json'].sha256);
});
