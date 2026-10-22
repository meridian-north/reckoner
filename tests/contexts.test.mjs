import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as C from '../dist/contexts.js';
import * as F from '../dist/facets.js';
import { starterEntries, STARTER_IDS } from '../dist/starters.js';
import { LensCache, resolveLens, deriveIndexes } from '../dist/lens-cache.js';
import { makeState, addRevision, addReview, seal, verifyReceipt, textReport, modelHandoff, status, EXTENSIONS } from '../dist/core.js';
import { mergeStates } from '../dist/collaboration.js';
import { restoreDraft } from '../dist/recovery.js';
import { LIBRARY_KEY } from '../dist/context-ui.js';
import { app, fixture as wiringFixture } from './browser-harness.mjs';
import * as P from '../dist/native-projection.js';

// Synthetic fixtures only. Model evidence below is test data for the binding rules, not a measurement.
const POLICY = { definitionByteBudget: null };
const MEANING = 'Read "exactly" what is shown; keep \\ backslashes and quotes.\nSecond line: 原文 🙂';
const form = (name, extra = {}) => ({ name, author: 'Reader A', provenance: 'Written for this test.', meaning: MEANING, facets: [{ group: 'work', value: 'transcription' }, { group: 'media', value: 'image' }, { group: 'domain', value: 'court records' }], emphasis: ['who', 'when'], concepts: [{ term: 'literal', meaning: 'As shown.' }], rules: ['Keep spelling.'], operations: [], hints: ['1 and l look alike.'], references: [{ label: 'Guide', url: 'https://example.org/guide', locator: 'section 2' }], ...extra });
const create = (mode, name, options = {}, extra = {}) => C.draftContext({ mode, form: form(name, extra), policy: POLICY, ...options });
const revise = (base, name, parents = []) => C.draftContext({ mode: 'revise', base, form: form(name, { revisionReason: 'Test revision.' }), parents, policy: POLICY });
async function library(...drafts) { return C.mergeIntoLibrary(C.emptyLibrary(), [], { definitions: drafts.map(d => d.record), events: [] }, { origin: 'created' }); }
const insertBefore = (text, marker, line) => text.replace(marker, line + '\n' + marker);
const model = { id: 'synthetic-ternary-model', version: '0.1-test', weightsSha256: 'c'.repeat(64) };
const gate = (record, extra = {}) => ({ id: 'gate-' + crypto.randomUUID(), type: 'gate_evidence', contextId: record.id, version: record.version, sha256: record.sha256, recordedAt: '2026-10-15T12:00:00.000Z', recordedBy: 'Synthetic runner A', identity: 'self_declared', model, probe: { id: 'comprehension.synthetic', version: '1' }, result: 'pass', measuredAt: '2026-10-15T11:59:00.000Z', evidence: { sha256: 'd'.repeat(64), locator: 'synthetic-gate-log.json' }, authority: 'external_measurement', ...extra });
const promotion = (record, gateEvent, extra = {}) => ({ id: 'promo-' + crypto.randomUUID(), type: 'promotion', contextId: record.id, version: record.version, sha256: record.sha256, recordedAt: '2026-10-15T12:05:00.000Z', recordedBy: 'Synthetic registry operator', identity: 'self_declared', model, gateEvidenceId: gateEvent.id, authority: 'native_registry_claim', ...extra });
const blessing = record => C.contextEvent('blessing', record, { recordedBy: 'Reader A', decision: 'blessed', reason: 'I read this exact version.' });
function readingState() {
  const s = makeState();
  s.context = { sourceUrl: 'https://archive.org/details/synthetic', locator: 'page 61' };
  s.draft = { original: 'maximum theoretical daily losses', proposed: 'maximum theoretical daily losses', contributor: 'Reader A', uncertainty: 'uncertain', reason: 'Qualifiers kept.' };
  return s;
}
function attach(s, entry, chain) { s.context.readingContext = C.readingContextRef(entry); s.contextDefinitions = chain.map(e => C.portableRecord(e.record)); }

test('starter contexts are newly written, labelled, deterministic and pinned by hash', async () => {
  const starters = await starterEntries(), again = await starterEntries();
  const golden = {
    [STARTER_IDS.literal + '@1']: ['c0ef0ecc03b35a133e8f76b3dfbf4f3f40cbe37847677c27b63b0d9b7b3d35e0', 4556],
    [STARTER_IDS.image + '@1']: ['7903c95108e7b5590955ef0db75f73630b0bdb8dce52323ea9ef335856acbd1b', 4226],
    [STARTER_IDS.review + '@1']: ['ad19958955903455679b59ecff2e88fb9429b89d0a30d4559a917fa10f516b28', 3845],
    [STARTER_IDS.estimates + '@1']: ['6e308813cd178af74c31527365f705a36d59ea64975931ec9e8aaccad1ff8b5b', 4126],
    [STARTER_IDS.literal + '@2']: ['1f922aed03a439166eb08dedbddafddfcd6fd694f1e1ebe43385d00849d7fd56', 5157],
    [STARTER_IDS.image + '@2']: ['2665400b3908e8f136a84bed311ff3578d9354677a2e8014791f0e72ffa2f6ed', 4824],
    [STARTER_IDS.review + '@2']: ['2851e9dd5581f8d5838d4107659b82ca8f5d7168bcd8f04e49cdf8de11429f51', 4437],
    [STARTER_IDS.estimates + '@2']: ['6e796f9849550dfc0b83ea811eda7df373e66029007c0f21ebf0323d524720b4', 4794],
  };
  assert.deepEqual(starters.map(s => C.definitionKey(s.record)), Object.keys(golden), 'every version 1, then every version 2');
  for (const [i, s] of starters.entries()) {
    assert.deepEqual([s.record.sha256, s.record.bytes], golden[C.definitionKey(s.record)], C.definitionKey(s.record));
    assert.equal(again[i].record.text, s.record.text);
    assert.equal(s.model.releaseLabel, 'starter_example');
    assert.match(s.model.provenance, /Not endorsed by Internet Archive and not promoted for Garrison Node production use/);
    assert.equal(C.serializeDefinition(C.parseDefinition(s.record.text)), s.record.text);
  }
  const find = (name, version) => starters.find(s => s.record.id === STARTER_IDS[name] && s.record.version === version);
  assert.deepEqual(C.pinOf(find('estimates', 1).model.parents[0]), C.pinOf(find('review', 1).record));
  assert.deepEqual(C.pinOf(find('estimates', 2).model.parents[0]), C.pinOf(find('review', 2).record), 'each version 2 child pins the version 2 parent');
  for (const name of Object.keys(STARTER_IDS)) {
    const first = find(name, 1), second = find(name, 2);
    assert.deepEqual([first.model.format, second.model.format], [C.LEGACY_FORMAT, C.FORMAT_V03]);
    assert.deepEqual(second.model.revisionOf, C.pinOf(first.record));
    assert.equal(second.model.basis, 'revision');
    for (const key of ['symbol', 'name', 'meaning', 'facets', 'emphasis', 'concepts', 'rules', 'operations', 'hints', 'references', 'provenance', 'author', 'releaseLabel']) assert.deepEqual(second.model[key], first.model[key], name + ' ' + key);
  }
  for (const section of ['Section 1. Identity and inheritance', 'Section 2. Header provenance', 'Section 3. Active concepts', 'Section 4. Rules', 'Section 5. Disambiguation hints', 'Section 6. References']) assert.ok(find('estimates', 1).record.text.includes(section), section);
  for (const section of ['Section 1. Header: schema, provenance and filing facets', 'Section 2. Identity and inheritance, with 5W1H emphasis', 'Section 6. Doctrine references']) assert.ok(find('estimates', 2).record.text.includes(section), section);
});

test('acceptance 1: a created context with plural facets and full meaning exports and reopens to identical bytes and hash', async () => {
  const draft = await create('new', 'Court record dates');
  assert.ok(draft.record.bytes > draft.record.text.length, 'UTF-8 bytes are measured, not characters');
  assert.equal(draft.record.bytes, new TextEncoder().encode(draft.record.text).byteLength);
  assert.equal(draft.model.meaning, MEANING);
  assert.deepEqual(draft.model.facets.map(f => f.group + ':' + f.value), ['work:transcription', 'media:image', 'domain:court records']);
  const { library: lib, entries } = await library(draft);
  const pkg = JSON.stringify(await C.sealPackage([draft.record], []), null, 2);
  const reopened = await C.importContextFile(pkg, C.emptyLibrary(), []);
  const copy = reopened.library.definitions.find(d => d.id === draft.record.id);
  assert.equal(copy.text, draft.record.text);
  assert.equal(copy.sha256, draft.record.sha256);
  assert.equal(copy.sha256, await C.sha256Hex(copy.text));
  const fromText = await C.importContextFile(draft.record.text, C.emptyLibrary(), []);
  assert.equal(fromText.kind, 'definition');
  assert.equal(fromText.library.definitions[0].sha256, draft.record.sha256);
  assert.equal(entries.length, 1);
  assert.equal(lib.definitions[0].origin, 'created');
});

test('acceptance 2: a narrower context pins its parent; cycles are refused and missing parents stay visible', async () => {
  const a1 = await create('new', 'Alpha'), b1 = await create('derive', 'Beta', { base: a1 });
  assert.deepEqual(C.pinOf(b1.model.parents[0]), C.pinOf(a1.record));
  assert.match(b1.record.text, /\(genlMt Beta_[0-9a-f]{8}Mt Alpha_[0-9a-f]{8}Mt\)/);
  const { library: lib, entries } = await library(a1, b1);
  const { order } = C.cascade(entries.find(e => e.record.id === b1.record.id), C.libraryLookup(entries));
  assert.deepEqual(order.map(e => e.model.name), ['Alpha', 'Beta']);
  // A2 -> B1 -> A1 repeats Alpha. Refused whatever the import order, and the library is unchanged.
  const a2 = await revise(a1, 'Alpha', [b1]);
  const c1 = await create('new', 'Gamma', { parents: [b1, a2] });
  const before = structuredClone(lib);
  for (const definitions of [[a2.record], [a2.record, c1.record], [c1.record, a2.record]]) {
    await assert.rejects(() => C.mergeIntoLibrary(lib, entries, { definitions }), /Cycles are refused/);
  }
  assert.deepEqual(lib, before);
  // Latest versions must not form a cycle either: A3 narrows B1 while B2 narrows A2.
  const x1 = await create('new', 'Xeno'), y1 = await create('new', 'Yarrow'), x2 = await revise(x1, 'Xeno'), y2 = await revise(y1, 'Yarrow', [x2]), x3 = await revise(x2, 'Xeno', [y1]);
  const graph = await library(x1, y1, x2, y2);
  await assert.rejects(() => C.mergeIntoLibrary(graph.library, graph.entries, { definitions: [x3.record] }), /cycle of broader contexts/);
  // A child imported without its parent is accepted, listed as missing, and never resolved by substitution.
  const orphan = await C.mergeIntoLibrary(C.emptyLibrary(), [], { definitions: [b1.record] });
  const child = orphan.entries[0];
  assert.deepEqual(C.cascade(child, C.libraryLookup(orphan.entries)).missing.map(p => p.id), [a1.record.id]);
  const resolved = await resolveLens(new LensCache(), { definitions: orphan.library.definitions, events: [], policy: POLICY, index: deriveIndexes(orphan.entries) }, C.pinOf(b1.record));
  assert.equal(resolved.reason, 'missing_broader');
});

test('revisions keep earlier versions; a revision needs a reason and starts without inherited reviews', async () => {
  const v1 = await create('new', 'Notice dates');
  await assert.rejects(() => C.draftContext({ mode: 'revise', base: v1, form: form('Notice dates'), policy: POLICY }), /reason/);
  const v2 = await revise(v1, 'Notice dates');
  assert.deepEqual(v2.model.revisionOf, C.pinOf(v1.record));
  assert.equal(v2.record.id, v1.record.id);
  assert.notEqual(v2.record.sha256, v1.record.sha256);
  const check = C.contextEvent('mentor_check', v1.record, { recordedBy: 'Mentor M', role: 'mentor', decision: 'accepted', check: 'Compare the stamp with line 2.', passage: { locator: 'page 1' } });
  const { library: lib } = await C.mergeIntoLibrary(C.emptyLibrary(), [], { definitions: [v1.record, v2.record], events: [blessing(v1.record), check] });
  assert.equal(C.lifecycleSummary(lib.events, v1.record).checks.length, 1);
  const fresh = C.lifecycleSummary(lib.events, v2.record);
  assert.equal(fresh.checks.length + fresh.blessed.length, 0);
  assert.deepEqual(C.earlierVersionReviews(lib.events, v2.record).map(x => [x.version, x.blessings, x.checks]), [[1, 1, 1]]);
  const starters = await starterEntries();
  await assert.rejects(() => C.draftContext({ mode: 'revise', base: starters[0], form: form('Literal transcription', { revisionReason: 'x' }), policy: POLICY }), /Starter examples cannot be revised/);
  // Two different texts for the same ID and version conflict, and nothing is imported.
  const rival = await C.draftContext({ mode: 'revise', base: v1, form: form('Notice dates', { revisionReason: 'A different change.', meaning: 'Different meaning.' }), policy: POLICY });
  const { entries } = await library(v1, v2);
  await assert.rejects(() => C.mergeIntoLibrary(lib, entries, { definitions: [rival.record] }), /already exists with different content/);
});

test('acceptance 3: a reading pins a context version; editing the context preserves the old reading, definition and mentor review', async () => {
  const v1 = await create('new', 'Assumption check'), v2 = await revise(v1, 'Assumption check');
  const s = readingState();
  attach(s, v1, [v1]);
  const first = addRevision(s, s.draft, s.context);
  const mentor = addReview(s, { reviewer: 'Mentor M', role: 'mentor', decision: 'needs_review', reason: 'Repeat: compare page 51 scenarios.', revisionId: first.id });
  assert.deepEqual(mentor.context, C.pinOf(v1.record));
  s.context.readingContext = C.readingContextRef(v2);
  s.contextDefinitions.push(C.portableRecord(v2.record));
  const second = addRevision(s, s.draft, s.context);
  assert.equal(status(s, second.id), 'pending');
  const restored = await verifyReceipt(JSON.parse(JSON.stringify(await seal(s))));
  assert.deepEqual(C.pinOf(restored.revisions[0].context.readingContext), C.pinOf(v1.record));
  assert.deepEqual(C.pinOf(restored.revisions[1].context.readingContext), C.pinOf(v2.record));
  assert.deepEqual(restored.reviews[0].context, C.pinOf(v1.record));
  assert.equal(restored.contextDefinitions.find(d => d.version === 1).text, v1.record.text);
  assert.match(textReport(restored), /context ctx:[0-9a-f-]+@1\b/);
  assert.match(textReport(restored), /APPENDIX: CANONICAL CONTEXT DEFINITIONS/);
});

test('acceptance 4: personal review, model evidence, promotion and ratification stay distinct; nothing passes by default', async () => {
  const v1 = await create('new', 'Gated context'), v2 = await revise(v1, 'Gated context');
  const base = (await library(v1, v2));
  let life = C.lifecycleSummary([], v1.record, { model });
  assert.equal(life.modelGate, 'not_run');
  assert.equal(life.institutionalApproval, 'none');
  for (const type of ['gate_evidence', 'promotion', 'ratification']) assert.throws(() => C.contextEvent(type, v1.record, { recordedBy: 'A' }), /Model checks are not run here/);
  const bless = blessing(v1.record), g1 = gate(v1.record), p1 = promotion(v1.record, g1);
  // A blessing alone is not a model gate, and a promotion needs passing evidence for the same bytes and model.
  life = C.lifecycleSummary([bless], v1.record, { model });
  assert.equal(life.blessed.length, 1);
  assert.equal(life.modelGate, 'not_run');
  await assert.rejects(() => C.mergeIntoLibrary(base.library, base.entries, { events: [bless, p1] }), /promotion claim needs passing model evidence/);
  await assert.rejects(() => C.mergeIntoLibrary(base.library, base.entries, { events: [g1, p1] }), /needs a human blessing/);
  const failed = gate(v1.record, { result: 'fail' });
  await assert.rejects(() => C.mergeIntoLibrary(base.library, base.entries, { events: [bless, failed, promotion(v1.record, failed)] }), /passing model evidence/);
  const promoted = await C.mergeIntoLibrary(base.library, base.entries, { events: [bless, g1, p1] });
  life = C.lifecycleSummary(promoted.library.events, v1.record, { model });
  assert.equal(life.modelGate, 'pass_recorded_elsewhere');
  assert.deepEqual(life.promotedFor, [C.modelFingerprint(model)]);
  assert.deepEqual(life.ratifiedFor, []);
  // A first gate is not independent ratification: the same evidence or the same person is refused.
  const samePerson = { id: 'rat-1', type: 'ratification', contextId: v1.record.id, version: 1, sha256: v1.record.sha256, recordedAt: '2026-10-15T13:00:00.000Z', recordedBy: 'Synthetic registry operator', identity: 'self_declared', model, gateEvidenceId: g1.id, promotionId: p1.id, authority: 'independent_ratification_claim' };
  await assert.rejects(() => C.mergeIntoLibrary(promoted.library, promoted.entries, { events: [samePerson] }), /own passing model evidence/);
  const g2 = gate(v1.record, { recordedBy: 'Synthetic runner B', evidence: { sha256: 'e'.repeat(64), locator: 'second-log.json' } });
  await assert.rejects(() => C.mergeIntoLibrary(promoted.library, promoted.entries, { events: [g2, { ...samePerson, gateEvidenceId: g2.id }] }), /different person/);
  const ratified = await C.mergeIntoLibrary(promoted.library, promoted.entries, { events: [g2, { ...samePerson, id: 'rat-2', gateEvidenceId: g2.id, recordedBy: 'Independent ratifier' }] });
  assert.deepEqual(C.lifecycleSummary(ratified.library.events, v1.record).ratifiedFor, [C.modelFingerprint(model)]);
  // Changed definition bytes or a different model cannot reuse that evidence.
  const later = C.lifecycleSummary(ratified.library.events, v2.record, { model });
  assert.equal(later.modelGate, 'not_run');
  assert.equal(later.gates.length + later.promotions.length + later.ratifications.length, 0);
  assert.equal(C.lifecycleSummary(ratified.library.events, v1.record, { model: { ...model, weightsSha256: 'f'.repeat(64) } }).modelGate, 'not_run');
  await assert.rejects(() => C.mergeIntoLibrary(base.library, base.entries, { events: [gate(v1.record, { sha256: v2.record.sha256 })] }), /not included/);
  const store = { definitions: ratified.library.definitions, events: ratified.library.events, policy: POLICY, index: deriveIndexes(ratified.entries) };
  assert.equal((await resolveLens(new LensCache(), store, C.pinOf(v1.record), { model })).status, 'ok');
  assert.equal((await resolveLens(new LensCache(), store, C.pinOf(v2.record), { model })).reason, 'model_check_not_current');
  assert.equal((await resolveLens(new LensCache(), store, C.pinOf(v2.record))).status, 'ok', 'personal human use needs no model');
});

test('acceptance 6: malformed, executable-looking, oversized or conflicting context files are rejected atomically', async () => {
  const draft = await create('new', 'Strict import', {}, { operations: [{ op: 'imageContrastPercent', value: 140 }] });
  const { library: lib, entries } = await library(draft);
  const before = structuredClone(lib), text = draft.record.text, S = draft.model.symbol;
  const bad = [
    [text.replace('(isa', ' (isa'), /canonical form/],
    [text.replace(/\n/g, '\r\n'), /carriage returns/],
    [String.fromCharCode(0xfeff) + text, /byte-order mark/],
    [insertBefore(text, ';;; Section 5.', '(eval ' + S + ' "fetch(1)")'), /unsupported assertion "eval"/],
    [insertBefore(text, ';;; Section 5.', '(contextRule ' + S + ' (eval "x"))'), /nested lists/],
    [text.replace('(isa ' + S, '(isa #$' + S), /without the #\$ prefix/],
    [text.replace('"imageContrastPercent" 140', '"runScript" 140'), /Unsupported lens operation/],
    [text.replace('"imageContrastPercent" 140', '"imageContrastPercent" 999'), /whole number from 50 to 250/],
    [text.replace('(contextVersion ' + S + ' 1)', '(contextVersion ' + S + ' 2)'), /revision/],
    ['{"schema":"reckoner.context_package.v0.1"', /not valid JSON/],
    ['x'.repeat(2 * 1024 * 1024 + 1), /under 2 MB/],
  ];
  for (const [input, pattern] of bad) await assert.rejects(() => C.importContextFile(input, lib, entries), pattern);
  const pkg = await C.sealPackage([draft.record], []);
  await assert.rejects(() => C.importContextFile(JSON.stringify({ ...pkg, definitions: [{ ...draft.record, text: text.replace('Keep spelling.', 'Keep spelling!') }] }), lib, entries), /integrity/);
  const resealed = await C.sealPackage([{ ...draft.record, text: text.replace('Keep spelling.', 'Keep spelling!') }], []);
  await assert.rejects(() => C.importContextFile(JSON.stringify(resealed), lib, entries), /does not match its definition text/);
  const event = blessing(draft.record);
  const once = await C.mergeIntoLibrary(lib, entries, { events: [event] });
  await assert.rejects(() => C.mergeIntoLibrary(once.library, once.entries, { events: [{ ...event, reason: 'Changed.' }] }), /same ID but different contents/);
  assert.throws(() => C.parseDefinition('x'.repeat(C.HARD_MAX_DEFINITION_BYTES + 1)), /maximum/);
  assert.deepEqual(lib, before);
});

test('byte budgets are measured in UTF-8 bytes and enforced without truncation', async () => {
  const draft = await create('new', 'Budget');
  const policy = { definitionByteBudget: draft.record.bytes - 1 };
  await assert.rejects(() => C.draftContext({ mode: 'new', form: form('Budget'), policy }), /above your configured budget[\s\S]*Nothing was shortened/);
  const status = C.byteBudgetStatus(draft.record.bytes, { definitionByteBudget: draft.record.text.length });
  assert.equal(status.ok, false, 'characters are not bytes');
  await assert.rejects(() => C.importContextFile(draft.record.text, { ...C.emptyLibrary(), policy }, []), /configured budget/);
  const absorbed = await C.mergeIntoLibrary({ ...C.emptyLibrary(), policy }, [], { definitions: [draft.record] }, { enforceBudget: false, origin: 'record' });
  assert.equal(absorbed.library.definitions[0].text, draft.record.text);
  const store = { definitions: absorbed.library.definitions, events: [], policy, index: deriveIndexes(absorbed.entries) };
  const resolved = await resolveLens(new LensCache(), store, C.pinOf(draft.record));
  assert.equal(resolved.reason, 'over_budget');
  assert.throws(() => C.normalizePolicy({ definitionByteBudget: 100 }), /256/);
  assert.throws(() => C.normalizePolicy({ definitionByteBudget: 70000 }), /65,536/);
});

test('named lenses resolve through ID, version and hash; unknown, ambiguous, changed and withdrawn lenses are rechecked', async () => {
  const v1 = await create('new', 'Shared name'), v2 = await revise(v1, 'Shared name'), solo = await create('new', 'Solo lens');
  const { library: lib, entries } = await library(v1, v2, solo);
  const cache = new LensCache();
  const store = (events = [], policy = POLICY, definitions = lib.definitions) => ({ definitions, events, policy, index: deriveIndexes(entries) });
  const byName = await resolveLens(cache, store(), { name: 'Solo lens' });
  assert.equal(byName.status, 'ok');
  assert.equal(byName.resolvedFrom, 'name');
  assert.deepEqual(byName.pin, C.pinOf(solo.record));
  assert.equal(byName.cacheHit, false);
  const again = await resolveLens(cache, store(), C.pinOf(solo.record));
  assert.equal(again.cacheHit, true);
  assert.equal(again.entry.model, byName.entry.model, 'the validated parse is reused');
  assert.equal((await resolveLens(cache, store(), { name: 'Shared name' })).reason, 'ambiguous');
  assert.equal((await resolveLens(cache, store(), { name: 'shared name' })).reason, 'unknown', 'names are not case-folded into a match');
  assert.equal((await resolveLens(cache, store(), { id: solo.record.id, version: 1 })).status, 'ok');
  const tampered = lib.definitions.map(d => (d.id === solo.record.id ? { ...d, text: d.text.replace('Keep spelling.', 'Keep spelling!') } : d));
  assert.equal((await resolveLens(cache, store([], POLICY, tampered), C.pinOf(solo.record))).reason, 'changed');
  const withdrawn = C.contextEvent('revocation', solo.record, { recordedBy: 'Reader A', reason: 'Superseded in practice.' });
  assert.equal((await resolveLens(cache, store([withdrawn]), C.pinOf(solo.record))).reason, 'revoked', 'a cache hit never bypasses withdrawal');
  const misses = cache.stats.misses;
  await resolveLens(cache, store([], { definitionByteBudget: 60000 }), C.pinOf(solo.record));
  assert.equal(cache.stats.misses, misses + 1, 'a policy change forces revalidation');
});

test('acceptance 5: plural facets filter exactly; joins need explicit relationships, whose disputes stay visible', () => {
  const s = readingState();
  const add = (kind, input) => { s.context.facets = F.addFacet(s.context.facets, kind, { addedBy: 'Reader A', ...input }).facets; };
  add('entities', { group: 'people_organizations', label: 'Monsanto Co.', basis: 'stated_in_source', locator: 'p. 61' });
  add('entities', { group: 'people_organizations', label: 'Monsanto', basis: 'stated_in_source', locator: 'p. 51' });
  add('entities', { group: 'places_jurisdictions', label: 'Anniston, Alabama', basis: 'stated_in_source', locator: 'cover' });
  add('entities', { group: 'events', label: 'Plant operations', basis: 'contributor_inference' });
  add('dates', { kind: 'source_event', value: '2006-01-11', basis: 'stated_in_source', locator: 'cover' });
  add('dates', { kind: 'upload', value: 'UNKNOWN', basis: 'unknown' });
  add('formats', { value: F.sniffFormat(new TextEncoder().encode('%PDF-1.7 synthetic')), basis: 'measured_content_signature' });
  assert.throws(() => F.addFacet(s.context.facets, 'entities', { group: 'people_organizations', label: 'Clerk', basis: 'stated_in_source', addedBy: 'Reader A' }), /passage location/);
  assert.throws(() => F.addFacet(s.context.facets, 'dates', { kind: 'edition', value: '', basis: 'unknown', addedBy: 'Reader A' }), /UNKNOWN/);
  const first = addRevision(s, s.draft, s.context);
  s.draft.reason = 'Second reading names only the short form.';
  s.context.facets = { entities: [s.context.facets.entities[1]], dates: [], formats: [] };
  const second = addRevision(s, s.draft, s.context);
  assert.deepEqual(first.context.facets.dates.map(d => d.kind), ['source_event', 'upload']);
  assert.equal(first.context.facets.formats[0].value, 'application/pdf');
  const index = F.facetIndex(s);
  const keyFor = label => index.find(i => i.label === label).key;
  assert.deepEqual(F.filterReadings(s, keyFor('People and organizations: Monsanto Co.')).exact, [first.id]);
  assert.deepEqual(F.filterReadings(s, keyFor('People and organizations: Monsanto')).exact, [first.id, second.id]);
  assert.ok(!index.some(i => i.label.includes('pdf') && i.label.includes('name')), 'no format is inferred from a file name');
  const [longName, shortName] = first.context.facets.entities;
  assert.throws(() => F.addAssertion(s, { revisionId: first.id, subjectId: longName.id, relation: 'same_as', objectId: shortName.id, assertedBy: 'Reader A', locator: '', reason: 'x', uncertainty: 'uncertain' }), /source passage/);
  const sameAs = F.addAssertion(s, { revisionId: first.id, subjectId: longName.id, relation: 'same_as', objectId: shortName.id, assertedBy: 'Reader A', locator: 'pp. 51 and 61', reason: 'Both name the plant operator.', uncertainty: 'uncertain' });
  s.assertions.push(sameAs);
  const linked = F.filterReadings(s, keyFor('People and organizations: Monsanto Co.'));
  assert.deepEqual(linked.exact, [first.id]);
  assert.deepEqual(linked.linked.map(l => [l.revisionId, l.status]), [[second.id, 'pending']]);
  s.assertionReviews.push(F.addAssertionReview(s, { assertionId: sameAs.id, reviewer: 'Reader B', role: 'reviewer', decision: 'accepted', reason: 'Same operator on both pages.' }));
  s.assertionReviews.push(F.addAssertionReview(s, { assertionId: sameAs.id, reviewer: 'Reader C', role: 'mentor', decision: 'disputed', reason: 'The corporate name changed over time; not checked.' }));
  assert.equal(F.assertionStatus(s, sameAs.id), 'conflicting_reviews');
  assert.equal(F.filterReadings(s, keyFor('People and organizations: Monsanto Co.')).linked[0].status, 'conflicting_reviews');
});

test('relationship and facet records are validated on import, even with a recomputed digest', async () => {
  const s = readingState();
  s.context.facets = F.addFacet(undefined, 'entities', { group: 'subjects_objects', label: 'Notice', basis: 'stated_in_source', locator: 'line 1', addedBy: 'A' }).facets;
  s.context.facets = F.addFacet(s.context.facets, 'entities', { group: 'subjects_objects', label: 'Record', basis: 'stated_in_source', locator: 'line 3', addedBy: 'A' }).facets;
  const reading = addRevision(s, s.draft, s.context);
  const [x, y] = reading.context.facets.entities;
  s.assertions.push(F.addAssertion(s, { revisionId: reading.id, subjectId: x.id, relation: 'mentions', objectId: y.id, assertedBy: 'A', locator: 'line 1', reason: 'The notice mentions the record.', uncertainty: 'clear' }));
  assert.equal((await verifyReceipt(await seal(s))).assertions.length, 1);
  const relabel = structuredClone(s); relabel.assertions[0].subject.label = 'Something else';
  await assert.rejects(() => seal(relabel).then(verifyReceipt), /does not contain/);
  const orphan = structuredClone(s); orphan.assertions[0].revisionId = 'missing';
  await assert.rejects(() => seal(orphan).then(verifyReceipt), /missing saved reading/);
  const facet = structuredClone(s); facet.revisions[0].context.facets.entities[0].group = 'gods';
  await assert.rejects(() => seal(facet).then(verifyReceipt), /facet group/);
  const reused = structuredClone(s); reused.assertions[0].id = reading.id;
  await assert.rejects(() => seal(reused).then(verifyReceipt), /share an ID/);
});

test('CSV indexes cite the pinned context without repeating its definition and neutralize spreadsheet formulas', async () => {
  const starters = await starterEntries(), estimates = starters.find(e => e.record.id === STARTER_IDS.estimates), review = starters.find(e => e.record.id === STARTER_IDS.review);
  const s = readingState();
  s.draft.contributor = '=HYPERLINK("http://example.invalid","x")';
  attach(s, estimates, [review, estimates]);
  addRevision(s, s.draft, s.context);
  const csv = F.readingsCsv(s, status);
  const [header, row] = csv.split('\r\n');
  assert.ok(header.startsWith('"record_id","reading_number"'));
  assert.ok(row.includes('"' + C.pinnedKey(estimates.record) + '"'));
  assert.ok(row.includes('"yes"'), 'the definition is carried in the JSON record');
  assert.ok(!csv.includes('qualifying words'), 'definition text is not repeated');
  assert.ok(row.includes('"\'=HYPERLINK(""http://example.invalid"",""x"")"'));
  assert.ok(csv.endsWith('\r\n'));
  assert.equal(F.csvCell('-2+3'), '"\'-2+3"');
  assert.equal(F.csvCell('plain "quoted" text'), '"plain ""quoted"" text"');
});

test('sidecars are designed for BitNet flags and never claim an inference ran', async () => {
  const starters = await starterEntries(), lookup = C.libraryLookup(starters);
  const estimates = starters.find(e => e.record.id === STARTER_IDS.estimates);
  const sidecar = C.contextSidecar({ entry: estimates, events: [], policy: { definitionByteBudget: 4000 }, lookup });
  assert.deepEqual(sidecar.designedFor, ['bitnet_flags']);
  assert.match(sidecar.compatibilityLabel, /not a measured BitNet inference/);
  assert.deepEqual(Object.fromEntries(C.BITNET_FLAGS.map(f => [f, sidecar.bitnetFlags[f].status])), { scoring: 'not_run', comprehension: 'not_run', suitability: 'unknown', verification: 'not_run' });
  assert.equal(sidecar.byteBudget.withinBudget, false);
  assert.equal(sidecar.byteBudget.measuredBytes, 4126);
  assert.equal(sidecar.tokenOrWeightConstraints, 'not_measured');
  assert.deepEqual(sidecar.cascade.map(c => c.id), [STARTER_IDS.review, STARTER_IDS.estimates]);
  assert.equal(sidecar.cascadeBytes, 3845 + 4126);
  assert.ok(!JSON.stringify(sidecar).includes('"pass"'));
  const scored = C.contextSidecar({ entry: estimates, events: [gate(estimates.record, { probe: { id: 'bitnet.scoring', version: '1' } })], policy: POLICY, lookup });
  assert.equal(scored.bitnetFlags.scoring.status, 'evidence_recorded_elsewhere_not_verified_here');
  assert.equal(scored.bitnetFlags.comprehension.status, 'not_run');
});

test('lens operations are bounded declarations recorded with the reading; a name implies no behaviour', async () => {
  const plain = await create('new', 'High contrast');
  assert.deepEqual(plain.model.operations, []);
  const lens = await create('new', 'Zoomed', {}, { operations: [{ op: 'readingTextSizePx', value: 20 }, { op: 'imageZoomPercent', value: 150 }] });
  assert.deepEqual(lens.model.operations.map(o => o.op), ['imageZoomPercent', 'readingTextSizePx'], 'canonical order');
  for (const operations of [[{ op: 'constructor', value: 1 }], [{ op: '__proto__', value: 1 }], [{ op: 'imageZoomPercent', value: 1.5 }], [{ op: 'imageZoomPercent', value: 100 }, { op: 'imageZoomPercent', value: 120 }]]) assert.throws(() => C.checkOperations(operations));
  const s = readingState();
  attach(s, lens, [lens]);
  s.context.readingContext.appliedOperations = structuredClone(lens.model.operations);
  s.context.readingContext.appliedAt = '2026-10-15T12:00:00.000Z';
  const reading = addRevision(s, s.draft, s.context);
  assert.deepEqual((await verifyReceipt(await seal(s))).revisions[0].context.readingContext.appliedOperations, lens.model.operations);
  const forged = structuredClone(s); forged.revisions[0].context.readingContext.appliedOperations = [{ op: 'imageZoomPercent', value: 5000 }];
  await assert.rejects(() => seal(forged).then(verifyReceipt), /Image zoom/);
  const untimed = structuredClone(s); untimed.revisions[0].context.readingContext.appliedAt = null;
  await assert.rejects(() => seal(untimed).then(verifyReceipt), /time they were applied/);
  assert.equal(reading.context.readingContext.appliedOperations.length, 2);
});

test('legacy receipts verify and export without the new collections; carried definitions are hash-checked', async () => {
  const legacy = readingState();
  addRevision(legacy, legacy.draft, legacy.context);
  const receipt = await seal(legacy);
  assert.ok(!Object.keys(receipt).some(k => EXTENSIONS.includes(k)));
  assert.equal((await verifyReceipt(receipt)).revisions.length, 1);
  const starters = await starterEntries(), estimates = starters.find(e => e.record.id === STARTER_IDS.estimates), review = starters.find(e => e.record.id === STARTER_IDS.review);
  const s = readingState();
  attach(s, estimates, [review, estimates]);
  const reading = addRevision(s, s.draft, s.context);
  addReview(s, { reviewer: 'Mentor', role: 'mentor', decision: 'accepted', reason: 'Checked qualifiers.', revisionId: reading.id });
  const tampered = structuredClone(s); tampered.contextDefinitions[1].text = tampered.contextDefinitions[1].text.replace('estimates', 'guesses');
  await assert.rejects(() => seal(tampered).then(verifyReceipt), /does not match its definition text/);
  const mismatch = structuredClone(s); mismatch.reviews[0].context.version = 2;
  await assert.rejects(() => seal(mismatch).then(verifyReceipt), /did not use/);
  const conflict = structuredClone(s); conflict.revisions[0].context.readingContext.sha256 = 'a'.repeat(64);
  await assert.rejects(() => seal(conflict).then(verifyReceipt), /different hash/);
  const missing = structuredClone(s); missing.contextDefinitions = [];
  const opened = await verifyReceipt(await seal(missing));
  assert.equal(opened.contextDefinitions.length, 0, 'a missing definition stays missing; nothing is substituted');
  assert.match(textReport(opened), /definition not included in this record/);
});

test('merging copies unions pinned definitions and rejects two texts for one context version', async () => {
  const v1 = await create('new', 'Merge context');
  const s = readingState();
  attach(s, v1, [v1]);
  addRevision(s, s.draft, s.context);
  const other = await verifyReceipt(await seal(s));
  const merged = mergeStates(s, other).state;
  assert.equal(merged.contextDefinitions.length, 1);
  const rival = await C.draftContext({ mode: 'new', form: form('Merge context', { meaning: MEANING + ' Explicit conflicting definition.' }), policy: POLICY, newId: v1.record.id });
  const bad = structuredClone(other); bad.contextDefinitions = [C.portableRecord(rival.record)];
  const before = structuredClone(s);
  assert.throws(() => mergeStates(s, bad), /different definitions/);
  assert.deepEqual(s, before);
});

test('model handoff includes the full pinned definition and states that model checks were not run', async () => {
  const starters = await starterEntries(), literal = starters.find(e => e.record.id === STARTER_IDS.literal);
  const s = readingState();
  const prompt = modelHandoff(s, { task: 'Review', readingContext: literal.record });
  assert.ok(prompt.includes(literal.record.text));
  assert.match(prompt, /use only this text, not any remembered version/);
  assert.match(prompt, /Not run by this form for any model/);
  assert.ok(!modelHandoff(s, { task: 'Review' }).includes('READING CONTEXT'));
});

test('shipped modules, tests, scripts, fixtures and docs contain no raw text-direction or invisible control characters', () => {
  const pattern = new RegExp('[' + [[0x00, 0x08], [0x0b, 0x1f], [0x7f, 0x7f], [0x200e, 0x200f], [0x202a, 0x202e], [0x2066, 0x2069], [0x2028, 0x2029]].map(([a, b]) => String.fromCharCode(a) + '-' + String.fromCharCode(b)).join('') + String.fromCharCode(0x061c) + ']');
  const scanned = [['../dist/', /\.(js|html|css)$/], ['./', /\.mjs$/], ['../scripts/', /\.(mjs|py)$/], ['./fixtures/contexts/', /\.(cycl|txt|json)$/], ['../', /\.md$/]];
  let count = 0;
  for (const [dir, kind] of scanned) for (const file of fs.readdirSync(new URL(dir, import.meta.url))) {
    if (!kind.test(file)) continue;
    assert.ok(!pattern.test(fs.readFileSync(new URL(dir + file, import.meta.url), 'utf8')), dir + file);
    count++;
  }
  assert.ok(count > 50, 'scanned ' + count + ' files');
});

// Format alignment and native projection. The native section order comes from the
// reported native convention; these tests use public fields and synthetic data only.

const V02_TITLES = ['Section 1. Header: schema and provenance', 'Section 2. Identity and inheritance, with 5W1H emphasis', 'Section 3. Active concepts', 'Section 4. Rules', 'Section 5. Disambiguation hints', 'Section 6. Doctrine references'];
const V03_TITLES = ['Section 1. Header: schema, provenance and filing facets', ...V02_TITLES.slice(1)];
async function legacyRecord(extra = {}) {
  const model = C.buildDefinition({ format: C.LEGACY_FORMAT, symbol: 'LegacyLens_0000a001Mt', id: 'ctx:legacy-test-a001', version: 1, name: 'Legacy lens', parents: [], compositions: [], author: 'Reader A', createdAt: '2026-10-14T10:00:00.000Z', releaseLabel: 'personal', basis: 'newly_authored', provenance: 'Written before format v0.2.', adaptedFrom: null, revisionOf: null, revisionReason: null, meaning: 'First line.\nSecond line keeps its literal break.', facets: [{ group: 'work', value: 'transcription' }], emphasis: ['who', 'where'], concepts: [{ term: 'literal', meaning: 'As shown.' }], rules: ['Keep spelling.'], operations: [{ op: 'readingTextSizePx', value: 18 }], hints: ['1 and l look alike.'], references: [{ label: 'Guide', url: '', locator: 'p. 1' }], ...extra });
  return C.recordFromModel(model, POLICY);
}
const sectionOf = text => { const map = []; let section = 0; for (const line of text.split('\n')) { const m = /^;;; Section (\d)\./.exec(line); if (m) section = Number(m[1]); else if (line.startsWith('(')) map.push([line.slice(1, line.indexOf(' ')), section]); } return map; };

test('format v0.1 definitions keep their exact bytes, hashes and order; nothing relabels them', async () => {
  const legacy = await legacyRecord();
  assert.equal(legacy.model.format, C.LEGACY_FORMAT);
  assert.match(legacy.record.text, /;;; Section 1\. Identity and inheritance\n\(contextFormat /);
  assert.ok(legacy.record.text.includes('"First line.\nSecond line keeps its literal break."'), 'v0.1 keeps line breaks inside text as written');
  assert.equal(C.serializeDefinition(C.parseDefinition(legacy.record.text)), legacy.record.text);
  assert.equal((await C.recordFromText(legacy.record.text, POLICY)).record.sha256, legacy.record.sha256);
  for (const starter of await starterEntries()) {
    assert.equal(starter.model.format, starter.record.version === 1 ? C.LEGACY_FORMAT : C.FORMAT_V03);
    for (const other of C.CONTEXT_FORMATS.filter(f => f !== starter.model.format)) await assert.rejects(() => C.recordFromText(starter.record.text.replace(starter.model.format, other), POLICY), /canonical form|one line/, 'relabelled bytes are refused');
  }
  await assert.rejects(() => C.recordFromText(legacy.record.text.replace(C.LEGACY_FORMAT, C.CURRENT_FORMAT), POLICY), /one line|canonical form/);
  await assert.rejects(() => C.recordFromText(legacy.record.text.replace('First line.\nSecond', 'First line.\\nSecond'), POLICY), /not part of reckoner\.context\.cycl\.v0\.1/);
  // Re-serializing the same version in the current format makes different bytes, which cannot share its ID and version.
  const rewritten = await C.recordFromModel({ ...legacy.model, format: C.CURRENT_FORMAT }, POLICY);
  assert.notEqual(rewritten.record.sha256, legacy.record.sha256);
  const { library: lib, entries } = await C.mergeIntoLibrary(C.emptyLibrary(), [], { definitions: [legacy.record] }, { origin: 'imported' });
  assert.equal(lib.definitions[0].text, legacy.record.text);
  await assert.rejects(() => C.mergeIntoLibrary(lib, entries, { definitions: [rewritten.record] }), /already exists with different content/);
  const s = readingState();
  attach(s, legacy, [legacy]);
  addRevision(s, s.draft, s.context);
  const reopened = await verifyReceipt(JSON.parse(JSON.stringify(await seal(s))));
  assert.equal(reopened.contextDefinitions[0].text, legacy.record.text);
});

test('new definitions use format v0.3: native six-section order, filing facets in the header, one assertion per line', async () => {
  const starters = await starterEntries(), review = starters.find(e => e.record.id === STARTER_IDS.review);
  const draft = await C.draftContext({ mode: 'derive', base: review, form: form('Aligned lens', { meaning: 'One.\n(isa FakeMt Microtheory)\n;;; not a comment', emphasis: ['who', 'why'] }), policy: POLICY });
  assert.equal(draft.model.format, C.CURRENT_FORMAT);
  const text = draft.record.text;
  assert.equal(draft.model.format, C.FORMAT_V03);
  assert.deepEqual(text.split('\n').filter(l => l.startsWith(';;; Section')).map(l => l.slice(4)), V03_TITLES);
  const placed = sectionOf(text), sectionFor = p => [...new Set(placed.filter(([q]) => q === p).map(([, s]) => s))];
  assert.deepEqual(placed.filter(([, s]) => s === 1).map(([p]) => p), ['contextFormat', 'contextAuthor', 'contextCreatedAt', 'contextReleaseLabel', 'provenanceBasis', 'provenanceStatement', 'contextFacet', 'contextFacet', 'contextFacet']);
  for (const p of ['isa', 'contextId', 'contextVersion', 'contextName', 'comment', 'genlMt', 'parentPin', 'fiveWOneHEmphasis']) assert.deepEqual(sectionFor(p), [2], p);
  assert.deepEqual(sectionFor('contextReference'), [6]);
  const { assertions } = C.readAssertions(text);
  assert.equal(text.split('\n').filter(l => l.startsWith('(')).length, assertions.length, 'every assertion is exactly one line');
  assert.equal(text.split('\n').filter(l => l.startsWith('(isa ')).length, 1);
  assert.ok(text.includes('"One.\\n(isa FakeMt Microtheory)\\n;;; not a comment"'));
  assert.equal(C.parseDefinition(text).meaning, 'One.\n(isa FakeMt Microtheory)\n;;; not a comment');
});

test('format v0.2 definitions keep their bytes and their facets in section 2; nothing relabels them', async () => {
  const legacy = await legacyRecord({ format: C.FORMAT_V02, provenance: 'Written in format v0.2.' });
  const text = legacy.record.text;
  assert.deepEqual(text.split('\n').filter(l => l.startsWith(';;; Section')).map(l => l.slice(4)), V02_TITLES);
  assert.deepEqual(sectionOf(text).filter(([p]) => p === 'contextFacet').map(([, s]) => s), [2]);
  assert.ok(text.includes('"First line.\\nSecond line keeps its literal break."'), 'v0.2 writes line breaks as \\n');
  assert.equal(C.serializeDefinition(C.parseDefinition(text)), text);
  assert.equal((await C.recordFromText(text, POLICY)).record.sha256, legacy.record.sha256);
  for (const other of [C.LEGACY_FORMAT, C.FORMAT_V03]) await assert.rejects(() => C.recordFromText(text.replace(C.FORMAT_V02, other), POLICY), /canonical form|not part of/, other);
  const current = await C.recordFromModel({ ...legacy.model, format: C.FORMAT_V03 }, POLICY);
  assert.notEqual(current.record.sha256, legacy.record.sha256, 'the same model in v0.3 is different bytes');
  assert.deepEqual(sectionOf(current.record.text).filter(([p]) => p === 'contextFacet').map(([, s]) => s), [1]);
});

test('revising a v0.1 context writes the current format and pins the untouched v0.1 bytes', async () => {
  const legacy = await legacyRecord();
  const check = C.contextEvent('mentor_check', legacy.record, { recordedBy: 'Mentor M', role: 'mentor', decision: 'accepted', check: 'Compared with the scan.', passage: { locator: 'p. 1' } });
  const base = await C.mergeIntoLibrary(C.emptyLibrary(), [], { definitions: [legacy.record], events: [check] }, { origin: 'imported' });
  const v2 = await revise(base.entries[0], 'Legacy lens');
  assert.equal(v2.model.format, C.CURRENT_FORMAT);
  assert.deepEqual(v2.model.revisionOf, C.pinOf(legacy.record));
  const next = await C.mergeIntoLibrary(base.library, base.entries, { definitions: [v2.record] }, { origin: 'created' });
  assert.equal(next.library.definitions.find(d => d.version === 1).text, legacy.record.text);
  const store = { definitions: next.library.definitions, events: next.library.events, policy: POLICY, index: deriveIndexes(next.entries) };
  for (const pin of [C.pinOf(legacy.record), C.pinOf(v2.record)]) assert.equal((await resolveLens(new LensCache(), store, pin)).status, 'ok');
  assert.equal(C.lifecycleSummary(next.library.events, v2.record).checks.length, 0, 'checks of v0.1 bytes do not carry over');
});

test('the native projection is metadata only: every public assertion once, with source lines, and no author text', async () => {
  const subjects = [...(await starterEntries()), await create('new', 'Projected lens', {}, { operations: [{ op: 'imageContrastPercent', value: 140 }] })];
  for (const subject of subjects) {
    const projection = await P.projectToNative(subject.record);
    const { assertions } = C.readAssertions(subject.record.text), lines = subject.record.text.split('\n');
    assert.equal(projection.schema, P.NATIVE_PROJECTION_SCHEMA);
    assert.deepEqual(projection.source, { id: subject.record.id, version: subject.record.version, constant: subject.model.symbol, format: subject.model.format, formatNote: C.FORMAT_NOTES[subject.model.format], sha256: subject.record.sha256, bytes: subject.record.bytes });
    const json = JSON.stringify(projection);
    for (const long of [subject.model.meaning, subject.model.provenance, ...subject.model.rules]) assert.ok(!json.includes(JSON.stringify(long).slice(1, -1)), 'author text is not copied');
    assert.notEqual(projection.projectionText.sha256, subject.record.sha256);
    assert.equal(projection.projectionText.sha256, await C.sha256Hex(projection.projectionText.text));
    assert.deepEqual(projection.sectionOrder, [...P.NATIVE_SECTIONS]);
    assert.equal(projection.sections.reduce((n, s) => n + s.assertions.length, 0), assertions.length, 'each assertion once');
    assert.ok(projection.headerMetadata.length >= 6, 'header metadata is projected, not empty');
    for (const h of projection.headerMetadata) assert.ok(lines[h.source.lines[0] - 1].startsWith('(' + h.source.predicate + ' '), h.field);
    const byLine = new Map(assertions.map(a => [a.line, a]));
    for (const s of projection.sections) for (const a of s.assertions) {
      assert.equal(s.number, P.FIELD_MAP[a.predicate][0]);
      assert.equal(a.kind, ['composesWith', 'compositionPin', 'lensOperation'].includes(a.predicate) ? 'public_extension' : 'declared');
      const source = byLine.get(a.sourceLines[0]).args.slice(1);
      assert.equal(a.args.length, source.length);
      for (const [n, x] of a.args.entries()) {
        if (x.type === 'author_text') assert.deepEqual([x.bytes, x.sha256], [C.utf8Bytes(source[n].value), await C.sha256Hex(source[n].value)]);
        else assert.equal(x.value, source[n].value);
      }
    }
    if (subject.model.format === C.CURRENT_FORMAT) for (const [predicate, section] of sectionOf(subject.record.text)) assert.equal(P.FIELD_MAP[predicate][0], section, 'v0.3 sections are the native sections');
    const { integrity, ...body } = projection;
    assert.equal(integrity.bodySha256, await C.sha256Hex(C.canonicalJson(body)));
    assert.equal(JSON.stringify(await P.projectToNative(subject.record)), JSON.stringify(projection), 'deterministic');
  }
  await assert.rejects(() => P.projectToNative({ ...subjects[0].record, sha256: 'f'.repeat(64) }), /does not match/);
});

test('the projection keeps public review apart from native admission and infers no production status', async () => {
  const starters = await starterEntries(), literal = starters.find(e => e.record.id === STARTER_IDS.literal);
  const g = gate(literal.record), bless = blessing(literal.record);
  const events = [bless, C.contextEvent('mentor_check', literal.record, { recordedBy: 'Mentor M', role: 'mentor', decision: 'accepted', check: 'Repeatable.', passage: { locator: 'line 2' } }), g, promotion(literal.record, g)];
  const projection = await P.projectToNative(literal.record, events);
  assert.deepEqual([projection.review.public.humanBlessings, projection.review.public.mentorChecks, projection.review.public.identity], [1, 1, 'self_declared']);
  assert.equal(projection.review.modelEvidence, 'recorded_elsewhere_not_verified');
  assert.equal(projection.review.claims.promotion, 'recorded_elsewhere_not_verified');
  assert.deepEqual(projection.review.nativeAdmission, { institutional: 'not_established', model: 'not_established' });
  assert.equal(projection.productionStatus, 'not_inferred');
  assert.match(projection.releaseLabel.meaning, /Not a production definition/);
  assert.deepEqual(Object.fromEntries(projection.unsupported.map(u => [u.item, u.status])), { 'native header keys other than domain': 'not_emitted', 'native BitNet predicates and scoring': 'not_emitted', 'native institutional admission': 'not_established', 'native model admission or promotion': 'not_established', 'production status or authority': 'not_inferred', 'other native metadata formats': 'not_produced', 'author text': 'not_copied', 'native fields or rules beyond the declared public fields': 'not_provided' });
  assert.equal(projection.nativeHeader.status, 'not_emitted', 'the literal starter declares no domain facet');
  assert.deepEqual(projection.nativeHeader.fields, {});
  assert.equal(projection.compatibility.claim, 'none');
  assert.ok(!/"(approved|admitted|promoted|production)"\s*:\s*true/i.test(JSON.stringify(projection)));
});

test('the native header block carries only domain facets that a comma-split, trimmed reading returns unchanged', () => {
  for (const ok of ['public research', 'source comparison', 'U.S. reports', 'pre-1900 maps', 'Archäologie', '東京の記録', 'e\u0301tudes', 'x'.repeat(80)]) assert.ok(P.nativeListValue(ok), ok);
  for (const bad of ['water, air', '[x]', 'a]b', 'key: value', '"quoted"', "it's", '(bitnetLabel ExampleMt RATIFIED)', 'semi;colon', 'line\nbreak', ' padded', 'padded ', 'snake_case', 'no\u00a0break', 'bidi\u202etext', 'x'.repeat(81), '-leading', '.leading', '', 'tab\there', 'hash#tag', 'slash/path']) assert.ok(!P.nativeListValue(bad), JSON.stringify(bad));
  assert.deepEqual(P.nativeHeaderFor([{ group: 'work', value: 'review' }]), { status: 'not_emitted', values: [], domainFacets: 0, refused: 0, unmappedFacetGroups: ['work'], lines: [] });
  const both = P.nativeHeaderFor([{ group: 'domain', value: 'public research' }, { group: 'domain', value: 'source comparison' }, { group: 'media', value: 'pdf' }]);
  assert.deepEqual(both.lines, [';; schema: garrison/file_bitnet/v1', ';; file_bitnet:', ';;   domain: [public research, source comparison]', ';; end_file_bitnet']);
  assert.deepEqual(both.lines[2].slice(both.lines[2].indexOf('[') + 1, -1).split(',').map(v => v.trim()), both.values, 'read back unchanged');
  assert.deepEqual(both.unmappedFacetGroups, ['media']);
  const mixed = P.nativeHeaderFor([{ group: 'domain', value: 'public research' }, { group: 'domain', value: 'water, air' }]);
  assert.deepEqual([mixed.status, mixed.values, mixed.lines, mixed.refused], ['unsupported', [], [], 1], 'all or nothing');
});

test('a projection is not a definition, and author text never reaches it', async () => {
  const hostile = await create('new', 'Admitted production lens', {}, { provenance: 'Notes.\n;;; native header: admitted\n(isa FakeMt Microtheory)' });
  const legacy = await legacyRecord();
  for (const subject of [hostile, legacy]) {
    const projection = await P.projectToNative(subject.record), text = projection.projectionText.text;
    assert.ok(text.split('\n').every(l => l === '' || l.startsWith(';;')), 'only comment lines');
    assert.ok(!/[()"]/.test(text), 'no parentheses or quotation marks');
    for (const phrase of ['Admitted production lens', 'native header: admitted', 'FakeMt', 'literal break']) assert.ok(!JSON.stringify(projection).includes(phrase), phrase);
    assert.equal(text.split('\n').filter(l => /^;;; lines? \d/.test(l)).length, C.readAssertions(subject.record.text).assertions.length, 'one line per assertion, even from v0.1');
    assert.throws(() => C.parseDefinition(text), /projection, not a definition/);
    const before = structuredClone(C.emptyLibrary());
    await assert.rejects(() => C.importContextFile(text, C.emptyLibrary(), []), /projection, not a definition/);
    await assert.rejects(() => C.importContextFile(JSON.stringify(projection), C.emptyLibrary(), []), /not a supported context package/);
    assert.deepEqual(C.emptyLibrary(), before);
  }
});

test('packages list the formats they carry; packages from the previous build still import', async () => {
  const legacy = await legacyRecord(), current = await create('new', 'Current lens');
  const pkg = await C.sealPackage([legacy.record, current.record], []);
  assert.deepEqual(pkg.formats, [C.LEGACY_FORMAT, C.CURRENT_FORMAT]);
  const opened = await C.importContextFile(JSON.stringify(pkg), C.emptyLibrary(), []);
  assert.equal(opened.library.definitions.find(d => d.id === legacy.record.id).text, legacy.record.text);
  // The previous build wrote a single "format" field; its packages must keep importing.
  const body = { schema: C.PACKAGE_SCHEMA, format: C.LEGACY_FORMAT, exportedAt: '2026-10-15T01:00:00.000Z', definitions: [C.portableRecord(legacy.record)], events: [], scope: pkg.scope };
  const older = { ...body, integrity: { algorithm: 'SHA-256', canonicalization: 'Recursively sorted JSON keys; array order preserved; compact JSON', bodySha256: await C.sha256Hex(C.canonicalJson(body)) } };
  assert.equal((await C.importContextFile(JSON.stringify(older), C.emptyLibrary(), [])).library.definitions[0].sha256, legacy.record.sha256);
});

// Browser-handler wiring through the shared harness (a simulated DOM, not a real browser).

test('wiring: choosing a context, saving, and a mentor review keep the exact version through reload', async () => {
  const a = await app(JSON.stringify(wiringFixture()));
  const starters = await starterEntries(), estimates = starters.find(e => e.record.id === STARTER_IDS.estimates);
  const select = a.get('reading-context-select');
  select.value = C.pinnedKey(estimates.record);
  assert.equal(await select.onchange(), true);
  assert.deepEqual(a.api.state().contextDefinitions.map(d => d.id), [STARTER_IDS.review, STARTER_IDS.estimates]);
  await a.get('save-revision').click();
  const saved = a.api.state().revisions.at(-1);
  assert.deepEqual(C.pinOf(saved.context.readingContext), C.pinOf(estimates.record));
  Object.entries({ reviewer: 'Mentor M', 'review-role': 'mentor', decision: 'needs_review', 'review-reason': 'Compare the two scenarios on page 51.', 'review-reading': saved.id }).forEach(([id, value]) => { a.get(id).value = value; });
  await a.get('save-review').click();
  assert.deepEqual(a.api.state().reviews.at(-1).context, C.pinOf(estimates.record));
  const restored = await restoreDraft(a.saved);
  assert.deepEqual(C.pinOf(restored.revisions.at(-1).context.readingContext), C.pinOf(estimates.record));
  assert.equal(restored.contextDefinitions.length, 2);
  assert.equal(a.stored.has(LIBRARY_KEY), false, 'choosing a starter writes nothing to the context library');
});

test('wiring: a created context is stored under its own key and never overwrites the draft', async () => {
  const a = await app(JSON.stringify(wiringFixture()));
  a.get('context-new').click();
  Object.entries({ 'ctx-name': 'Probate dates', 'ctx-meaning': 'Dates as the clerk stamped them.', 'ctx-author': 'Reader A', 'ctx-provenance': 'My own notes.', 'ctx-concepts': 'filing date: the clerk stamp' }).forEach(([id, value]) => { a.get(id).value = value; });
  await a.get('ctx-save').onclick();
  const stored = JSON.parse(a.stored.get(LIBRARY_KEY));
  assert.equal(stored.definitions.length, 1);
  assert.match(stored.definitions[0].text, /\(activeConcept Probate[^ ]+ "filing date" "the clerk stamp"\)/);
  assert.equal((await restoreDraft(a.saved)).revisions.length, 1, 'the draft remains a valid workspace');
});

test('wiring: an unreadable stored context library is preserved, not overwritten', async () => {
  const a = await app(JSON.stringify(wiringFixture()), { [LIBRARY_KEY]: '{"schema":"something else"}' });
  a.get('context-new').click();
  Object.entries({ 'ctx-name': 'New lens', 'ctx-meaning': 'Meaning.', 'ctx-author': 'Reader A', 'ctx-provenance': 'Notes.' }).forEach(([id, value]) => { a.get(id).value = value; });
  await a.get('ctx-save').onclick();
  assert.equal(a.stored.get(LIBRARY_KEY), '{"schema":"something else"}');
  assert.match(a.get('context-library-status').textContent, /preserved and were not overwritten/);
});

test('wiring: the real-report walkthrough starts with the narrower starter context pinned', async () => {
  const a = await app(null);
  a.get('load-real-example').onclick();
  const s = a.api.state();
  assert.equal(s.context.readingContext.id, STARTER_IDS.estimates);
  assert.deepEqual(s.contextDefinitions.map(d => d.id), [STARTER_IDS.review, STARTER_IDS.estimates]);
});

test('wiring: facet entries and a disputed relationship survive save and reload', async () => {
  const a = await app(JSON.stringify(wiringFixture()));
  const set = values => Object.entries(values).forEach(([id, value]) => { a.get(id).value = value; });
  set({ 'facet-group': 'people_organizations', 'facet-label': 'Council clerk', 'facet-basis': 'stated_in_source', 'facet-locator': 'line 9', 'facet-identity': '' });
  a.get('add-facet').click();
  set({ 'facet-label': 'The clerk', 'facet-locator': 'line 2' });
  a.get('add-facet').click();
  set({ 'date-kind': 'upload', 'date-value': 'UNKNOWN', 'date-basis': 'unknown', 'date-locator': '' });
  a.get('add-date').click();
  await a.get('save-revision').click();
  const reading = a.api.state().revisions.at(-1), [first, second] = reading.context.facets.entities;
  set({ 'assertion-reading': reading.id, 'assertion-subject': first.id, 'assertion-relation': 'same_as', 'assertion-object': second.id, 'assertion-external': '', 'assertion-locator': 'lines 2 and 9', 'assertion-reason': 'The same office named twice.', 'assertion-uncertainty': 'uncertain', 'assertion-by': 'Reader A' });
  a.get('add-assertion').click();
  set({ 'assertion-review-target': a.api.state().assertions[0].id, 'assertion-reviewer': 'Reader B', 'assertion-review-role': 'reviewer', 'assertion-decision': 'disputed', 'assertion-review-reason': 'Two different clerks are possible.' });
  a.get('save-assertion-review').click();
  const restored = await restoreDraft(a.saved);
  assert.equal(F.assertionStatus(restored, restored.assertions[0].id), 'disputed');
  assert.deepEqual(restored.revisions.at(-1).context.facets.dates.map(d => [d.kind, d.value]), [['upload', 'UNKNOWN']]);
  assert.equal(restored.revisions.at(-1).context.facets.entities.length, 2);
});

test('wiring: opening a record with contexts adds them to the library without touching the draft key', async () => {
  const starters = await starterEntries(), estimates = starters.find(e => e.record.id === STARTER_IDS.estimates), review = starters.find(e => e.record.id === STARTER_IDS.review);
  const v1 = await create('derive', 'Report scenarios', { base: estimates });
  const s = readingState();
  attach(s, v1, [review, estimates, v1]);
  addRevision(s, s.draft, s.context);
  const receipt = JSON.stringify(await seal(s));
  const a = await app(null);
  await a.get('import-file').onchange({ target: { value: '', files: [{ size: receipt.length, text: async () => receipt }] } });
  assert.equal(a.api.state().id, s.id);
  const stored = JSON.parse(a.stored.get(LIBRARY_KEY));
  assert.ok(stored.definitions.some(d => d.sha256 === v1.record.sha256));
});
