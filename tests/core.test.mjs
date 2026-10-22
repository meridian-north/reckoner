import test from 'node:test';import assert from 'node:assert/strict';import {makeState,addRevision,addReview,status,seal,verifyReceipt,diff,canonical,contributionSummary,textReport,modelHandoff,replayStep,documentUrl} from '../dist/core.js';
function fixture(){const s=makeState();s.context={sourceUrl:'https://archive.org/details/example',locator:'page 1'};s.draft={original:'Meet on 14 June.',proposed:'Meet on 17 June.',contributor:'Reader A',uncertainty:'clear',reason:'The source image shows 17.'};return s;}
test('original reading remains immutable across revisions',()=>{const s=fixture(),r=addRevision(s,s.draft,s.context);s.draft.proposed='Meet on 18 June.';addRevision(s,s.draft,s.context);assert.equal(r.reading.proposed,'Meet on 17 June.');assert.equal(s.revisions[1].parentId,r.id);});
test('conflicting reviews stay visible and do not grant automatic acceptance',()=>{const s=fixture(),r=addRevision(s,s.draft,s.context);addReview(s,{reviewer:'B',decision:'accepted',reason:'Image checked'});addReview(s,{reviewer:'C',decision:'disputed',reason:'Final digit uncertain'});assert.equal(status(s,r.id),'conflicting_reviews');});
test('review applies only to the specific saved revision',()=>{const s=fixture(),r=addRevision(s,s.draft,s.context);addReview(s,{reviewer:'B',decision:'accepted',reason:'Image checked'});s.draft.reason='Second pass';const next=addRevision(s,s.draft,s.context);assert.equal(status(s,r.id),'accepted');assert.equal(status(s,next.id),'pending');});
test('receipt round-trip verifies, tampering fails',async()=>{const s=fixture();addRevision(s,s.draft,s.context);const receipt=await seal(s);const restored=await verifyReceipt(receipt);assert.equal(restored.id,s.id);receipt.revisions[0].reading.proposed='tampered';await assert.rejects(()=>verifyReceipt(receipt),/integrity/);});
test('invalid review links rejected even with recomputed digest',async()=>{const s=fixture();addRevision(s,s.draft,s.context);s.reviews.push({revisionId:'missing',decision:'accepted',reviewer:'X',reason:'X'});await assert.rejects(()=>seal(s).then(verifyReceipt),/review/);});
test('required source locator and contributor enforced',()=>{const s=fixture();assert.throws(()=>addRevision(s,{...s.draft,contributor:''},s.context),/contributor/);assert.throws(()=>addRevision(s,s.draft,{sourceUrl:'https://archive.org/'}),/locator/);});
test('diff reconstructs original and proposed, including markup-looking input',()=>{const a='<script>bad</script>\n14',b='<script>bad</script>\n17';const d=diff(a,b);assert.equal(d.filter(x=>x.kind!=='added').map(x=>x.text).join(''),a);assert.equal(d.filter(x=>x.kind!=='removed').map(x=>x.text).join(''),b);});
test('canonical object keys stable without reordering event arrays',()=>{assert.equal(canonical({b:1,a:2}),canonical({a:2,b:1}));assert.notEqual(canonical([1,2]),canonical([2,1]));});

test('contribution tracker deduplicates handles across roles and counts actions',()=>{const s=fixture();addRevision(s,s.draft,s.context);addReview(s,{reviewer:'reader a',decision:'accepted',reason:'Checked'});const c=contributionSummary(s);assert.equal(c.distinctHandles,1);assert.equal(c.readingContributors,1);assert.equal(c.reviewers,1);assert.equal(c.reviews,1);assert.match(textReport(s),/self-declared handles/);});

test('model handoff respects excluded fields and preserves OCR verbatim',()=>{const s=fixture();s.context.secret='excluded context';const prompt=modelHandoff(s,{task:'Review',includeProposed:false,includeContext:false});assert.ok(prompt.includes(s.draft.original));assert.ok(!prompt.includes(s.draft.proposed));assert.ok(!prompt.includes('excluded context'));assert.match(prompt,/no image is attached/);});

test('replay shows pending before a later review, then the recorded decision',()=>{const s=fixture();const r=addRevision(s,s.draft,s.context);r.observedAt='2026-10-14T12:00:00.000Z';const review=addReview(s,{reviewer:'B',decision:'accepted',reason:'Checked source'});review.recordedAt='2026-10-14T12:01:00.000Z';assert.equal(replayStep(s,0).reviewStatus,'pending');assert.equal(replayStep(s,1).reviewStatus,'accepted');assert.equal(replayStep(s,1).revision.reading.original,s.draft.original);});
test('document links reject executable schemes and embedded credentials',()=>{assert.throws(()=>documentUrl('javascript:alert(1)'),/http/);assert.throws(()=>documentUrl('https://person:secret@example.com/doc.pdf'),/credentials/);assert.equal(documentUrl('https://archive.org/download/item/doc.pdf'),'https://archive.org/download/item/doc.pdf');});

import {mergeStates, currentReading, readingTips} from '../dist/collaboration.js';
test('two contributors can retain separate branches and review a specific reading',async()=>{
  const original=fixture();const base=addRevision(original,original.draft,original.context);
  const left=await verifyReceipt(await seal(original)),right=await verifyReceipt(await seal(original));
  left.draft.proposed='Meet on 18 June.';left.draft.contributor='Reader B';const l=addRevision(left,left.draft,left.context);
  right.draft.proposed='Meet on 19 June.';right.draft.contributor='Reader C';const r=addRevision(right,right.draft,right.context);
  const merged=mergeStates(left,right).state;
  assert.equal(merged.revisions.length,3);assert.equal(readingTips(merged).length,2);
  assert.equal(currentReading(merged).id,l.id);assert.equal(l.parentId,base.id);assert.equal(r.parentId,base.id);
  addReview(merged,{revisionId:r.id,reviewer:'D',decision:'disputed',reason:'The scan does not support 19.'});
  assert.equal(status(merged,r.id),'disputed');assert.equal(status(merged,l.id),'pending');
  assert.equal((await verifyReceipt(await seal(merged))).activeRevisionId,l.id);
});
test('merging the same contribution repeatedly does not inflate counts',async()=>{
  const left=fixture();addRevision(left,left.draft,left.context);const right=await verifyReceipt(await seal(left));
  addReview(right,{reviewer:'B',decision:'accepted',reason:'Checked'});
  const once=mergeStates(left,right).state,twice=mergeStates(once,right);
  assert.equal(twice.added.reviews,0);assert.deepEqual(contributionSummary(twice.state),contributionSummary(once));
});
test('a same-ID modified entry rejects the entire merge without changing local data',()=>{
  const left=fixture();addRevision(left,left.draft,left.context);const right=structuredClone(left);
  right.revisions[0].reading.proposed='Changed existing evidence';
  const before=canonical(left);assert.throws(()=>mergeStates(left,right),/same ID/);assert.equal(canonical(left),before);
});
test('unrelated records cannot be merged merely because they discuss the same source',()=>{
  const left=fixture(),right=fixture();addRevision(left,left.draft,left.context);addRevision(right,right.draft,right.context);
  assert.throws(()=>mergeStates(left,right),/different review records/);
});
test('replay respects parent and review dependencies even when device clocks disagree',()=>{
  const s=fixture();const parent=addRevision(s,s.draft,s.context);parent.observedAt='2026-10-14T13:00:00.000Z';
  s.draft.reason='Second review';const child=addRevision(s,s.draft,s.context);child.observedAt='2026-10-14T12:00:00.000Z';
  const review=addReview(s,{reviewer:'B',decision:'accepted',reason:'Checked child'});review.recordedAt='2026-10-14T11:00:00.000Z';
  assert.equal(replayStep(s,0).step.id,parent.id);assert.equal(replayStep(s,1).step.id,child.id);assert.equal(replayStep(s,2).step.id,review.id);
});

import {addResolution} from '../dist/core.js';
test('a recorded resolution preserves disagreement and can be replayed after considered reviews',async()=>{
  const s=fixture();const reading=addRevision(s,s.draft,s.context);
  addReview(s,{reviewer:'B',decision:'disputed',reason:'A difficult digit'});
  const resolution=addResolution(s,{selectedRevisionId:reading.id,recordedBy:'C',decision:'resolved',reason:'A better scan supports this reading.'});
  assert.equal(status(s,reading.id),'disputed');assert.equal(s.reviews.length,1);
  assert.equal(replayStep(s,2).step.id,resolution.id);
  const restored=await verifyReceipt(await seal(s));assert.equal(restored.resolutions[0].reason,resolution.reason);
});
test('unresolved conclusions do not invent a selected reading',()=>{
  const s=fixture();addRevision(s,s.draft,s.context);
  const conclusion=addResolution(s,{recordedBy:'A',decision:'unresolved',reason:'The scan remains illegible.'});
  assert.equal(conclusion.selectedRevisionId,null);assert.equal(replayStep(s,1).revision,undefined);
});
test('an invalid conclusion reference is rejected on import',async()=>{
  const s=fixture();const r=addRevision(s,s.draft,s.context);
  const conclusion=addResolution(s,{selectedRevisionId:r.id,recordedBy:'A',decision:'resolved',reason:'Checked'});
  conclusion.consideredRevisionIds.push('missing');await assert.rejects(()=>seal(s).then(verifyReceipt),/resolution/);
});

test('conclusion cannot select an unconsidered reading or resolve an unresolved record',async()=>{
  const s=fixture();const r=addRevision(s,s.draft,s.context);
  const conclusion=addResolution(s,{selectedRevisionId:r.id,recordedBy:'A',decision:'resolved',reason:'Checked'});
  conclusion.consideredRevisionIds=[];
  await assert.rejects(()=>seal(s).then(verifyReceipt),/resolution/);
  conclusion.consideredRevisionIds=[r.id];conclusion.decision='unresolved';
  await assert.rejects(()=>seal(s).then(verifyReceipt),/resolution/);
});

test('merge rejects IDs reused across event types atomically',()=>{
  const a=fixture();addRevision(a,a.draft,a.context);const b=structuredClone(a);
  const review=addReview(a,{reviewer:'B',decision:'accepted',reason:'Checked'});
  b.connections.push({id:review.id,contributor:'C',target:'other',reason:'Related',relationship:'supports'});
  const before=structuredClone(a);assert.throws(()=>mergeStates(a,b),/share an ID/);assert.deepEqual(a,before);
});
test('replay compares absolute timestamps across time zones',()=>{
  const s=fixture();addRevision(s,s.draft,s.context);
  const first=addReview(s,{reviewer:'B',decision:'accepted',reason:'Earlier'});first.recordedAt='2026-10-14T10:00:00+02:00';
  const second=addReview(s,{reviewer:'C',decision:'disputed',reason:'Later'});second.recordedAt='2026-10-14T09:00:00Z';
  assert.equal(replayStep(s,1).step.id,first.id);assert.equal(replayStep(s,2).step.id,second.id);
});

import {restoreDraft} from '../dist/recovery.js';
test('saved drafts restore unsaved text and reject corrupt history',async()=>{
 const s=fixture();addRevision(s,s.draft,s.context);s.draft.proposed='Unsaved correction';
 const restored=await restoreDraft(JSON.stringify(s));assert.equal(restored.draft.proposed,'Unsaved correction');
 s.revisions=[null];await assert.rejects(()=>restoreDraft(JSON.stringify(s)));
 await assert.rejects(()=>restoreDraft('{broken'));
});

test('saving beyond count or exchange-byte limits preserves existing history',()=>{
 const s=fixture();const r=addRevision(s,s.draft,s.context);
 s.revisions=Array.from({length:500},(_,i)=>({...structuredClone(r),id:'r'+i,number:i+1}));s.activeRevisionId='r499';s.draft.reason='Another proposal';
 const before=structuredClone(s);assert.throws(()=>addRevision(s,s.draft,s.context),/limit/);assert.deepEqual(s,before);
 const large=fixture();large.draft.original='a'.repeat(1100000);large.draft.proposed='b'.repeat(1100000);
 assert.throws(()=>addRevision(large,large.draft,large.context),/2 MB/);assert.equal(large.revisions.length,0);
});

import {searchLinks} from '../dist/search.js';
test('source search encodes literal queries and restricts destinations',()=>{
 const query='A&B #title <script>';
 const links=searchLinks(query);assert.equal(links.length,4);
 for(const link of links){const url=new URL(link.url);assert.equal(url.protocol,'https:');assert.equal(url.searchParams.get('q'),query);}
 assert.throws(()=>searchLinks('  '));assert.throws(()=>searchLinks('x'.repeat(1001)));
});

test('compact near-limit receipts can be reopened and exported again',async()=>{
 const s=fixture();addRevision(s,s.draft,s.context);s.context.method='';
 const baseline=JSON.stringify(await seal(s)).length;
 s.context.method='x'.repeat(2*1024*1024-baseline-100);
 const receipt=await seal(s);assert.ok(new TextEncoder().encode(JSON.stringify(receipt)).byteLength<2*1024*1024);
 const restored=await verifyReceipt(receipt);const reexport=JSON.stringify(await seal(restored));
 assert.ok(new TextEncoder().encode(reexport).byteLength<=2*1024*1024);
});

test('mentoring reviews retain guidance and credit without multiplying participant counts',async()=>{
 const s=fixture();addRevision(s,s.draft,s.context);
 addReview(s,{reviewer:'Mentor A',role:'mentor',decision:'needs_review',reason:'Compare the units and qualifying words on both pages.'});
 addReview(s,{reviewer:'Mentor A',decision:'disputed',reason:'Further evidence needed.'});
 const restored=await verifyReceipt(await seal(s));assert.equal(restored.reviews[0].role,'mentor');assert.match(restored.reviews[0].reason,/qualifying/);
 const counts=contributionSummary(restored);assert.equal(counts.mentors,1);assert.equal(counts.mentoringReviews,1);assert.equal(counts.reviewers,1);
 assert.throws(()=>addReview(s,{reviewer:'B',role:'administrator',decision:'accepted',reason:'Claim'}),/role/);
});

test('review status agrees after merging in either direction',()=>{
 const a=fixture();const r=addRevision(a,a.draft,a.context);const b=structuredClone(a);
 addReview(a,{reviewer:'B',decision:'accepted',reason:'Checked'});
 addReview(b,{reviewer:'C',decision:'needs_review',reason:'More evidence needed'});
 const ab=mergeStates(a,b).state,ba=mergeStates(b,a).state;
 assert.equal(status(ab,r.id),'needs_review');assert.equal(status(ab,r.id),status(ba,r.id));
 addReview(ab,{reviewer:'D',decision:'disputed',reason:'Conflict'});assert.equal(status(ab,r.id),'conflicting_reviews');
});

import {prepareArchiveHandoff} from '../dist/archive.js';
test('Archive preparation preserves source and cannot claim submission or permission verification',()=>{
 const s=fixture();const options={route:'web_capture',rightsBasis:'public_domain',rightsEvidence:'Official publication checked',publicChecked:true,preparedBy:'A'};
 const plan=prepareArchiveHandoff(s,options);assert.equal(plan.status,'prepared_not_submitted');assert.equal(plan.result.verified,false);assert.equal(plan.result.serviceReceipt,null);assert.equal(plan.source.url,s.context.sourceUrl);
 assert.throws(()=>prepareArchiveHandoff(s,{...options,rightsBasis:'unknown'}),/permission/);
 assert.throws(()=>prepareArchiveHandoff(s,{...options,publicChecked:false}),/public/);
 assert.throws(()=>prepareArchiveHandoff(s,{...options,route:'file_upload'}),/source file/);
});

import {wordComparisonAvailable} from '../dist/core.js';
test('page-length OCR with a local correction retains a word-level comparison',()=>{
 const words=Array.from({length:900},(_,i)=>'word'+i);const original=words.join(' ');words[450]='corrected';const proposed=words.join(' ');
 assert.equal(wordComparisonAvailable(original,proposed),true);const parts=diff(original,proposed);
 assert.equal(parts.filter(x=>x.kind!=='added').map(x=>x.text).join(''),original);
 assert.equal(parts.filter(x=>x.kind!=='removed').map(x=>x.text).join(''),proposed);
 assert.ok(parts.filter(x=>x.kind==='same').map(x=>x.text).join('').length>original.length*.9);
 assert.equal(wordComparisonAvailable('a '.repeat(1000),'b '.repeat(1000)),false);
});


test('connection lineage rejects orphan readings and invalid times without losing legacy records',async()=>{
 const s=fixture(),r=addRevision(s,s.draft,s.context);
 const connection={id:crypto.randomUUID(),relationship:'supports',target:'https://archive.org/details/related',reason:'Same passage in another edition',contributor:'Reader A',revisionId:r.id,createdAt:new Date().toISOString()};
 s.connections=[connection];
 const restored=await verifyReceipt(await seal(s));assert.equal(restored.connections[0].revisionId,r.id);
 s.connections=[{...connection,revisionId:'missing'}];await assert.rejects(()=>seal(s).then(verifyReceipt),/connection/);
 s.connections=[{...connection,createdAt:'not a date'}];await assert.rejects(()=>seal(s).then(verifyReceipt),/connection/);
 s.connections=[{...connection,target:s.id}];await assert.rejects(()=>seal(s).then(verifyReceipt),/connection/);
 const {revisionId,createdAt,...legacy}=connection;s.connections=[legacy];assert.equal((await verifyReceipt(await seal(s))).connections.length,1);
});

test('shuffled multi-contributor exchanges preserve events and decisions across repeated imports',async()=>{
 let seed=74021;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
 for(let trial=0;trial<30;trial++){
  const base=fixture();addRevision(base,base.draft,base.context);const branches=[];
  for(let person=0;person<5;person++){
   const branch=await verifyReceipt(await seal(base));branch.draft.contributor='Contributor '+person;branch.draft.proposed='Trial '+trial+' alternative '+person;
   const reading=addRevision(branch,branch.draft,branch.context);
   addReview(branch,{revisionId:reading.id,reviewer:'Reviewer '+person,role:person%2?'mentor':'reviewer',decision:['accepted','disputed','needs_review'][Math.floor(random()*3)],reason:'Synthetic check '+trial});branches.push(branch);
  }
  let forward=structuredClone(base),shuffled=structuredClone(base);
  for(const b of branches)forward=mergeStates(forward,b).state;
  const order=[...branches];for(let i=order.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
  for(const b of [...order,...order])shuffled=mergeStates(shuffled,b).state;
  for(const name of ['revisions','reviews']){
   const byId=s=>[...s[name]].sort((a,b)=>a.id.localeCompare(b.id));assert.deepEqual(byId(forward),byId(shuffled));
  }
  for(const reading of forward.revisions)assert.equal(status(forward,reading.id),status(shuffled,reading.id));
  assert.deepEqual(contributionSummary(forward),contributionSummary(shuffled));
  assert.equal((await verifyReceipt(await seal(shuffled))).revisions.length,6);
 }
});

test('mixed Unicode and whitespace comparisons preserve both exact input strings',()=>{
 let seed=91;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
 const tokens=['café','\r\n','🙂','<tag>','\t','17','  ','ﬁ','—','原文'];
 for(let trial=0;trial<100;trial++){
  const text=()=>Array.from({length:40},()=>tokens[Math.floor(random()*tokens.length)]).join('');const a=text(),b=text(),parts=diff(a,b);
  assert.equal(parts.filter(p=>p.kind!=='added').map(p=>p.text).join(''),a);
  assert.equal(parts.filter(p=>p.kind!=='removed').map(p=>p.text).join(''),b);
 }
});

test('readable exports retain branch, source, conclusion scope and optional suggestion context',()=>{
 const s=fixture();s.sourceImage={name:'synthetic.png',sha256:'abc123',mime:'image/png',size:12};
 const base=addRevision(s,s.draft,s.context);s.draft.proposed='Meet on 18 June.';const next=addRevision(s,s.draft,s.context);
 const review=addReview(s,{revisionId:next.id,reviewer:'Mentor',role:'mentor',decision:'needs_review',reason:'Repeat the image check.'});
 const conclusion=addResolution(s,{selectedRevisionId:next.id,recordedBy:'Reader',decision:'resolved',reason:'Synthetic exercise only.'});
 s.draft.proposed='Meet on 19 June.';addRevision(s,s.draft,s.context);
 s.connections.push({id:'connection-test',relationship:'supports',target:'related-record',contributor:'Reader',revisionId:base.id,reason:'Related passage',createdAt:'2026-10-14T10:00:00Z'});
 s.modelRuns.push({id:'suggestion-test',provider:'Manual handoff',model:'Test model',prompt:'Check the date.',response:'Uncertain: compare source.'});
 const report=textReport(s);
 for(const value of [base.id,next.id,review.id,conclusion.id,'synthetic.png','abc123','Repeat the image check.','Check the date.','Uncertain: compare source.','Developed by John Reed / Garrison Node'])assert.ok(report.includes(value),value);
 assert.match(report,/Other saved work falls outside this conclusion/);
 assert.match(report,/Model output is a recorded suggestion/);
 assert.match(report,/Continues reading:/);
});

import {saveToChosenFile} from '../dist/save.js';
test('chosen-location saves commit only after writing succeeds',async()=>{
 const events=[],blob=new Blob(['exact record']);let options;
 const result=await saveToChosenFile(blob,'record.json',async o=>{options=o;return {createWritable:async()=>({write:async b=>events.push(await b.text()),close:async()=>events.push('closed'),abort:async()=>events.push('aborted')})};});
 assert.equal(result.status,'saved');assert.equal(options.suggestedName,'record.json');assert.deepEqual(events,['exact record','closed']);
});
test('chosen-location cancellation and unsupported browsers never report a save',async()=>{
 assert.equal((await saveToChosenFile(new Blob(), 'record.json',null)).status,'unsupported');
 assert.equal((await saveToChosenFile(new Blob(),'record.json',async()=>{throw new DOMException('Cancelled','AbortError');})).status,'cancelled');
});
test('failed chosen-location writes abort and retain the original failure',async()=>{
 let aborted=false,closed=false;
 await assert.rejects(()=>saveToChosenFile(new Blob(),'record.txt',async()=>({createWritable:async()=>({write:async()=>{throw Error('Disk full');},close:async()=>{closed=true;},abort:async()=>{aborted=true;}})})),/Disk full/);
 assert.equal(aborted,true);assert.equal(closed,false);
});


import { enhancementRecord, validateEnhancements } from '../dist/enhancements.js';
function enhancementFixture(){const s=fixture();s.sourceImage={name:'original.png',mime:'image/png',sha256:'a'.repeat(64),size:100};const record=enhancementRecord(s.sourceImage,{name:'enhanced.png',mime:'image/png',size:120,sha256:'b'.repeat(64)},{tool:'Example processor',toolVersion:'1.2',operations:'deskew, then sharpen',settings:'angle=1; radius=2',reason:'Compare apparent letter edges against the original.',contributor:'Reader A'});s.context.imageEnhancements=[record];return s;}
test('enhancement provenance remains tied to the original and immutable saved readings',async()=>{const s=enhancementFixture(),r=addRevision(s,s.draft,s.context);s.context.imageEnhancements[0].settings='radius=3';s.draft.reason='Second image-processing check';addRevision(s,s.draft,s.context);assert.equal(r.context.imageEnhancements[0].settings,'angle=1; radius=2');assert.equal(s.revisions[1].context.imageEnhancements[0].settings,'radius=3');const restored=await verifyReceipt(await seal(s));assert.equal(restored.revisions[0].context.imageEnhancements[0].derivative.sha256,'b'.repeat(64));assert.match(textReport(restored),/angle=1; radius=2/);});
test('enhancement records reject mismatched originals and incomplete methods before saving',()=>{const s=enhancementFixture();s.sourceImage.sha256='c'.repeat(64);assert.throws(()=>addRevision(s,s.draft,s.context),/enhancement/);s.sourceImage.sha256='a'.repeat(64);s.context.imageEnhancements[0].settings='';assert.throws(()=>addRevision(s,s.draft,s.context),/enhancement/);assert.equal(s.revisions.length,0);});
test('recomputed receipt digest cannot conceal malformed enhancement metadata',async()=>{const s=enhancementFixture();addRevision(s,s.draft,s.context);s.revisions[0].context.imageEnhancements[0].derivative.sha256='not-a-hash';await assert.rejects(()=>seal(s).then(verifyReceipt),/enhancement/);});
test('enhancement limits and duplicate IDs are rejected',()=>{const s=enhancementFixture(),record=s.context.imageEnhancements[0];assert.throws(()=>validateEnhancements({imageEnhancements:[record,record]},s.sourceImage),/enhancement/);assert.throws(()=>validateEnhancements({imageEnhancements:Array.from({length:51},()=>({...record,id:crypto.randomUUID()}))},s.sourceImage),/enhancement/);});
