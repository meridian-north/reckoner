import { canonical, checkCapacity } from './core.js';
import { mergeArchiveActivity } from './archive-activity.js';

const collections = ['revisions', 'reviews', 'connections', 'modelRuns', 'resolutions', 'contextEvents', 'assertions', 'assertionReviews'];
const limits = { revisions: 500, reviews: 2000, connections: 2000, modelRuns: 200, resolutions: 500, contextEvents: 2000, assertions: 2000, assertionReviews: 2000 };

export function currentReading(state) {
  return state.revisions.find(r => r.id === state.activeRevisionId)
    || state.revisions.at(-1)
    || null;
}

export function readingTips(state) {
  const parents = new Set(state.revisions.map(r => r.parentId).filter(Boolean));
  return state.revisions.filter(r => !parents.has(r.id));
}

export function mergeStates(current, incoming) {
  if (current.id !== incoming.id) {
    throw Error('These are different review records. Open the original saved record before merging another copy of it.');
  }
  const currentIds = new Set(current.revisions.map(r => r.id));
  if (!incoming.revisions.some(r => currentIds.has(r.id))) {
    throw Error('The files have no shared saved reading. Keep them separate and link them as related records.');
  }
  const next = structuredClone(current);
  const added = {};
  for (const name of collections) {
    const records = new Map((current[name] || []).map(record => [record.id, record]));
    added[name] = 0;
    for (const record of incoming[name] || []) {
      const existing = records.get(record.id);
      if (existing && canonical(existing) !== canonical(record)) {
        throw Error('A saved ' + name + ' entry has the same ID but different contents. Nothing was merged.');
      }
      if (!existing) {
        records.set(record.id, structuredClone(record));
        added[name]++;
      }
    }
    if (records.size > limits[name]) throw Error('The combined record exceeds the ' + name + ' limit.');
    next[name] = [...records.values()];
  }
  // Pinned context definitions are keyed by ID and version; one key cannot carry two texts.
  const definitions = new Map((current.contextDefinitions || []).map(d => [d.id + '@' + d.version, d]));
  added.contextDefinitions = 0;
  for (const definition of incoming.contextDefinitions || []) {
    const key = definition.id + '@' + definition.version, existing = definitions.get(key);
    if (existing && existing.sha256 !== definition.sha256) throw Error('The copies carry different definitions for context ' + key + '. Nothing was merged.');
    if (!existing) {
      definitions.set(key, structuredClone(definition));
      added.contextDefinitions++;
    }
  }
  if (definitions.size > 200) throw Error('The combined record exceeds the contextDefinitions limit.');
  next.contextDefinitions = [...definitions.values()];
  // Parent records must precede their children in the portable format.
  const sorted = [], remaining = [...next.revisions], seen = new Set();
  while (remaining.length) {
    const index = remaining.findIndex(r => r.parentId === null || seen.has(r.parentId));
    if (index < 0) throw Error('The combined reading history contains a broken or cyclic path.');
    const [record] = remaining.splice(index, 1);
    sorted.push(record);
    seen.add(record.id);
  }
  next.revisions = sorted;
  const eventIds = new Set();
  for (const name of collections) {
    for (const record of next[name] || []) {
      if (eventIds.has(record.id)) throw Error('Two different saved entries share an ID. Nothing was merged.');
      eventIds.add(record.id);
    }
  }
  // Archive notes are a record-level log: both copies' notes are kept. Saved
  // readings keep the exact context they were saved with.
  const notes = mergeArchiveActivity(current.context?.archiveActivity, incoming.context?.archiveActivity, current.id);
  added.archiveActivity = notes.added;
  if (notes.activity !== undefined) next.context.archiveActivity = structuredClone(notes.activity);
  // Keep this user's current draft, source context, and selected path.
  next.activeRevisionId = currentReading(current)?.id || null;
  checkCapacity(next);
  return { state: next, added, paths: readingTips(next).length };
}

export function causalSteps(state) {
  const waiting = [
    ...state.revisions.map(r => ({
      kind: 'reading', id: r.id, time: r.observedAt,
      actor: r.reading.contributor, record: r,
      dependency: r.parentId
    })),
    ...state.reviews.map(r => ({
      kind: 'review', id: r.id, time: r.recordedAt,
      actor: r.reviewer, record: r,
      dependency: r.revisionId
    })),
    ...(state.resolutions||[]).map(r=>({kind:'resolution',id:r.id,time:r.recordedAt,actor:r.recordedBy,record:r,dependencies:[...r.consideredRevisionIds,...r.consideredReviewIds]}))
  ];
  const result = [], seen = new Set();
  while (waiting.length) {
    const ready = waiting.filter(event => (!event.dependency || seen.has(event.dependency)) && (event.dependencies||[]).every(id=>seen.has(id)));
    if (!ready.length) throw Error('A saved step refers to missing or cyclic history.');
    ready.sort((a, b) => Date.parse(a.time) - Date.parse(b.time) || a.id.localeCompare(b.id));
    const event = ready[0];
    waiting.splice(waiting.indexOf(event), 1);
    result.push(event);
    seen.add(event.id);
  }
  return result;
}
