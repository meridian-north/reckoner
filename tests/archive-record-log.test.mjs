import {openBundle} from '../dist/creator-history-store.mjs';
// Archive activity notes are one record-level log: saving the review record,
// switching saved readings and merging collaborators' copies must keep every
// note, while each saved reading keeps its exact historical context.
import test from 'node:test';
import assert from 'node:assert/strict';
import { appendArchiveActivity, preparationSnapshot, MAX_ACTIVITY_BYTES } from '../dist/archive-activity.js';
import { mergeStates } from '../dist/collaboration.js';
import { addRevision, canonical, seal, verifyReceipt } from '../dist/core.js';
import { app, fixture } from './browser-harness.mjs';

const prepare = h => {
  h.get('archive-route').value = 'web_capture'; h.get('archive-rights').value = 'permission';
  h.get('archive-rights-evidence').value = 'Synthetic permission'; h.get('archive-preparer').value = 'Reader';
  h.get('archive-public-check').checked = true; h.get('prepare-archive-handoff').onclick();
};
const record = (h, kind, note, prepared = true) => {
  const preparedId = h.api.state().context.archiveActivity.events.find(e => e.kind === 'prepared').id;
  h.get('archive-note-kind').value = kind; h.get('archive-note-actor').value = 'Reader';
  h.get('archive-note-text').value = note; h.get('archive-note-url').value = '';
  h.get('archive-note-prepared').value = prepared ? preparedId : '';
  h.get('save-archive-note').onclick();
};
const file = text => ({ target: { files: [{ size: text.length, text: async () => text }], value: '' } });
const exportRecord = async h => { const count = h.blobs.length; await h.get('export-cairn').onclick(); assert.equal(h.blobs.length, count + 1, 'not saved: ' + h.get('toast').textContent); return h.blobs.at(-1).text(); };
const notes = state => state.context.archiveActivity?.events.map(e => e.id) || [];
const byId = revisions => new Map(revisions.map(r => [r.id, canonical(r)]));

test('a recorded Archive note does not block saving the review record, and a changed reading still does', async () => {
  const h = await app(JSON.stringify(fixture()));
  const saved = canonical(h.api.state().revisions);
  prepare(h); record(h, 'error', 'Synthetic service error.');
  const receipt = (await openBundle(await exportRecord(h))).state;
  assert.equal(receipt.context.archiveActivity.events.length, 2);
  assert.equal(canonical(receipt.revisions), saved);
  assert.equal(Object.hasOwn(receipt.revisions[0].context, 'archiveActivity'), false);
  h.get('proposed').value = 'SYNTHETIC_CHANGED';
  const count = h.blobs.length; await h.get('export-cairn').onclick();
  assert.equal(h.blobs.length, count);
  assert.match(h.get('toast').textContent, /new revision before exporting/);
});

test('continuing from an earlier saved reading keeps the notes recorded after it', async () => {
  const s = fixture(); Object.assign(s.draft, { proposed: 'SYNTHETIC_C', reason: 'A second synthetic reading' }); addRevision(s, s.draft, s.context);
  const h = await app(JSON.stringify(s));
  prepare(h); record(h, 'submission_attempt', 'Synthetic attempt.');
  const earlier = h.api.state().revisions[0];
  h.api.selectReading(earlier.id);
  assert.equal(h.api.state().activeRevisionId, earlier.id);
  assert.equal(h.api.state().draft.proposed, earlier.reading.proposed);
  assert.equal(notes(h.api.state()).length, 2);
  assert.equal(JSON.parse(h.saved).context.archiveActivity.events.length, 2);
});

test('two collaborators record different notes; merging either way keeps both in one order; export, reimport and an older reading keep them', async () => {
  const base = await seal(fixture());
  const bState = await verifyReceipt(structuredClone(base));
  Object.assign(bState.draft, { proposed: 'SYNTHETIC_B2', contributor: 'Reader B', reason: 'B reads it differently' }); addRevision(bState, bState.draft, bState.context);
  const a = await app(JSON.stringify(await verifyReceipt(structuredClone(base)))), b = await app(JSON.stringify(bState));
  prepare(a); record(a, 'error', 'A saw an error.');
  prepare(b); record(b, 'submission_attempt', 'B attempted once.'); record(b, 'retry_plan', 'B will retry after checking.');
  const before = { a: notes(a.api.state()), b: notes(b.api.state()) };
  const revisions = new Map([...byId(a.api.state().revisions), ...byId(b.api.state().revisions)]);
  const ra = await exportRecord(a), rb = await exportRecord(b);
  await a.get('merge-file').onchange(file(rb)); await b.get('merge-file').onchange(file(ra));
  const ab = a.api.state(), ba = b.api.state();
  assert.deepEqual(notes(ab), notes(ba));
  assert.deepEqual(new Set(notes(ab)), new Set([...before.a, ...before.b]));
  assert.equal(ab.revisions.length, 2);
  for (const r of [...ab.revisions, ...ba.revisions]) assert.equal(canonical(r), revisions.get(r.id), 'a saved reading changed in the merge');
  assert.match(a.get('toast').textContent, /4 new saved entries merged/);
  assert.match(b.get('toast').textContent, /2 new saved entries merged/);
  const merged = await exportRecord(a);
  const c = await app(null);
  await c.get('import-file').onchange(file(merged));
  assert.deepEqual(notes(c.api.state()), notes(ab));
  const older = c.api.state().revisions.find(r => r.parentId === null), newer = c.api.state().revisions.find(r => r.parentId === older.id);
  for (const reading of [newer, older]) {
    c.api.selectReading(reading.id);
    assert.equal(c.api.state().activeRevisionId, reading.id);
    assert.deepEqual(notes(c.api.state()), notes(ab));
    assert.deepEqual(notes(JSON.parse(c.saved)), notes(ab));
  }
  assert.match(c.get('archive-activity-history').textContent, /B will retry after checking/);
  assert.match(c.get('archive-activity-history').textContent, /A saw an error/);
});

// Pure merge rules.
const prep = { id: 'handoff', route: 'web_capture', source: { title: 'Synthetic source', url: 'https://example.org/source', file: null }, rights: { basis: 'permission' } };
const note = (prior, recordId, id, at, fields) => appendArchiveActivity(prior, recordId, { actor: 'Reader', note: 'Synthetic ' + id, ...fields }, { id, at });
const prepared = (prior, recordId, id, at) => note(prior, recordId, id, at, { kind: 'prepared', preparation: preparationSnapshot(prep) });
const pair = () => { const left = fixture(); return { left, right: structuredClone(left) }; };

test('merge order follows each preparation first, then time, the same in both directions even with skewed clocks', () => {
  const { left, right } = pair();
  left.context.archiveActivity = prepared(null, left.id, 'q', '2026-10-15T10:05:00.000Z');
  let incoming = prepared(null, right.id, 'p', '2026-10-15T10:10:00.000Z');
  incoming = note(incoming, right.id, 'x', '2026-10-15T10:00:00.000Z', { kind: 'submission_attempt', preparedId: 'p' });
  right.context.archiveActivity = incoming;
  const lr = mergeStates(left, right), rl = mergeStates(right, left);
  assert.deepEqual(notes(lr.state), ['q', 'p', 'x']);
  assert.deepEqual(notes(rl.state), ['q', 'p', 'x']);
  assert.equal(lr.added.archiveActivity, 2);
  assert.equal(rl.added.archiveActivity, 1);
});

test('the same note merged again is not duplicated; a note ID with different contents refuses the whole merge', () => {
  const { left, right } = pair();
  left.context.archiveActivity = prepared(null, left.id, 'p', '2026-10-15T10:00:00.000Z');
  right.context.archiveActivity = note(structuredClone(left.context.archiveActivity), right.id, 'e', '2026-10-15T10:01:00.000Z', { kind: 'error' });
  const once = mergeStates(left, right).state, twice = mergeStates(once, right);
  assert.deepEqual(notes(twice.state), ['p', 'e']);
  assert.equal(twice.added.archiveActivity, 0);
  const forged = structuredClone(right); forged.context.archiveActivity.events[1].note = 'Rewritten after the fact';
  const unchanged = canonical(once);
  assert.throws(() => mergeStates(once, forged), /same ID but different contents\. Nothing was merged/);
  assert.equal(canonical(once), unchanged);
});

test('a merge that would exceed the note count or byte limit is refused and leaves the current record unchanged', () => {
  const build = (recordId, prefix, count, text) => { let log = prepared(null, recordId, prefix + '-p', '2026-10-15T09:00:00.000Z'); for (let i = 0; i < count; i++) log = note(log, recordId, prefix + '-' + i, '2026-10-15T10:00:00.000Z', { kind: 'error', note: text }); return log; };
  for (const [mine, theirs, text, limit] of [[120, 90, 'Synthetic short note', 'count'], [40, 30, 'x'.repeat(3900), 'bytes']]) {
    const { left, right } = pair();
    left.context.archiveActivity = build(left.id, 'mine', mine, text);
    right.context.archiveActivity = build(right.id, 'theirs', theirs, text);
    assert.ok(JSON.stringify(left.context.archiveActivity).length < MAX_ACTIVITY_BYTES && JSON.stringify(right.context.archiveActivity).length < MAX_ACTIVITY_BYTES);
    const unchanged = canonical(left);
    assert.throws(() => mergeStates(left, right), /Archive notes limit.*Nothing was merged/, limit);
    assert.equal(canonical(left), unchanged);
  }
});

test('records without the optional field keep their earlier shape; a copy that has notes brings them in', () => {
  const { left, right } = pair();
  const plain = mergeStates(left, right).state;
  assert.equal(Object.hasOwn(plain.context, 'archiveActivity'), false);
  right.context.archiveActivity = prepared(null, right.id, 'p', '2026-10-15T10:00:00.000Z');
  assert.deepEqual(notes(mergeStates(left, right).state), ['p']);
  assert.deepEqual(notes(mergeStates(right, left).state), ['p']);
});
