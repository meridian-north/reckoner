// Readers see plain names for note kinds; the files keep their format IDs.
// A new or imported workspace does not keep the example's load message.
import test from 'node:test';
import assert from 'node:assert/strict';
import { KIND_LABELS, kindLabel, eventSummary, createPath, appendEvent, serializePath } from '../dist/discovery.mjs';
import { ACTIVITY_LABELS, appendArchiveActivity, preparationSnapshot, archiveActivityReport } from '../dist/archive-activity.js';
import { seal } from '../dist/core.js';
import { app, fixture } from './browser-harness.mjs';

test('search-note kinds have plain names, and a candidate is listed by its address rather than its ID', () => {
  assert.deepEqual(Object.keys(KIND_LABELS).sort(), ['attempt', 'candidate', 'clue', 'complaint', 'mentor', 'outcome']);
  for (const [kind, label] of Object.entries(KIND_LABELS)) { assert.notEqual(label, kind); assert.doesNotMatch(label, /_/); assert.equal(kindLabel(kind), label); }
  let path = createPath({ goal: 'science', title: 'Synthetic search', by: 'Reader' });
  path = appendEvent(path, { kind: 'attempt', by: 'Reader', query: 'synthetic query', destination: 'Synthetic library', url: 'https://example.org/search?q=synthetic', parentAttemptId: null, reason: 'Synthetic', stage: 'planned' });
  const attempt = path.events.at(-1);
  path = appendEvent(path, { kind: 'candidate', by: 'Reader', attemptId: attempt.id, url: 'https://source.invalid/synthetic.pdf', locator: 'p. 1', match: 'possible', reason: 'Synthetic' });
  assert.equal(eventSummary(attempt), 'Search: synthetic query');
  assert.equal(eventSummary(path.events.at(-1)), 'Possible source: https://source.invalid/synthetic.pdf');
  const file = serializePath(path);
  assert.match(file, /"kind":"attempt"/);
  assert.match(file, /"kind":"candidate"/);
});

test('the readable Archive report uses plain names and names the related preparation; the notes keep their IDs', () => {
  const recordId = 'cairn:synthetic';
  const handoff = { id: 'handoff', route: 'web_capture', source: { title: 'Synthetic source', url: 'https://example.org/source', file: null }, rights: { basis: 'permission' } };
  let notes = appendArchiveActivity(null, recordId, { kind: 'prepared', actor: 'Reader', note: 'Prepared.', preparation: preparationSnapshot(handoff) }, { id: 'prep', at: '2026-10-15T10:00:00.000Z' });
  notes = appendArchiveActivity(notes, recordId, { kind: 'submission_attempt', actor: 'Reader', note: 'Tried once.', preparedId: 'prep' }, { id: 'try', at: '2026-10-15T10:01:00.000Z' });
  notes = appendArchiveActivity(notes, recordId, { kind: 'metadata_error', actor: 'Reader', report: { expected: 'New title', actual: 'Old title shown', reproduction: 'Edit, save, reload', changedFields: 'title', before: 'Old title', intendedAfter: 'New title' } }, { id: 'meta', at: '2026-10-15T10:02:00.000Z' });
  const report = archiveActivityReport(notes);
  for (const label of [ACTIVITY_LABELS.prepared, ACTIVITY_LABELS.submission_attempt, ACTIVITY_LABELS.metadata_error]) assert.match(report, new RegExp('\\n' + label + ' · Reader · '));
  assert.doesNotMatch(report, /\n(prepared|submission_attempt|metadata_error) · /);
  assert.match(report, /Related preparation: Synthetic source · 2026-10-15T10:00:00.000Z \(note prep\)/);
  assert.match(report, /Steps to repeat: Edit, save, reload/);
  assert.match(report, /Intended after: New title/);
  assert.deepEqual(notes.events.map(e => e.kind), ['prepared', 'submission_attempt', 'metadata_error']);
});

test('New workspace and opening another saved record clear the example load message', async () => {
  const other = await seal(fixture());
  const h = await app(JSON.stringify(fixture()));
  h.get('example-load-status').textContent = 'Example image and readings loaded. Add your name to save a proposal.';
  h.get('new-workspace').onclick();
  assert.equal(h.get('example-load-status').textContent, '');
  h.get('example-load-status').textContent = 'Example image and readings loaded. Add your name to save a proposal.';
  const text = JSON.stringify(other);
  await h.get('import-file').onchange({ target: { files: [{ size: text.length, text: async () => text }], value: '' } });
  assert.equal(h.api.state().id, other.id);
  assert.equal(h.get('example-load-status').textContent, '');
});
