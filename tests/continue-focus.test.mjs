// "Continue from this reading" is pressed inside the History panel, which the
// switch to the Reading panel hides. Focus must move to the Reading tab rather
// than fall to the page, where the next Tab would land far below the reading.
import test from 'node:test';
import assert from 'node:assert/strict';
import { addRevision } from '../dist/core.js';
import { app, fixture } from './browser-harness.mjs';

test('continuing from a saved reading moves focus to the Reading tab', async () => {
  const s = fixture(); Object.assign(s.draft, { proposed: 'SYNTHETIC_C', reason: 'A second synthetic reading' }); addRevision(s, s.draft, s.context);
  const h = await app(JSON.stringify(s));
  const focused = []; h.get('tab-reading').focus = options => focused.push(options ?? null);
  h.api.selectReading('no-such-reading');
  assert.deepEqual(focused, [], 'an unknown reading moved focus');
  const earlier = h.api.state().revisions[0];
  h.api.selectReading(earlier.id);
  assert.equal(h.api.state().activeRevisionId, earlier.id);
  assert.deepEqual(focused, [null]);
});
