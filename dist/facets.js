import { checkText, checkPin, checkTime, samePin } from './contexts.js';

// Source discovery facets and attributed relationships. Labels are kept as
// recorded; similar names are never merged, and a file type or date never
// identifies a source. Joins need an explicit identity key or an attributed
// relationship assertion, and every relationship can be disputed.

export const ENTITY_GROUPS = Object.freeze({ people_organizations: 'People and organizations', places_jurisdictions: 'Places and jurisdictions', subjects_objects: 'Subjects and objects', events: 'Events' });
export const ENTITY_BASES = Object.freeze({ stated_in_source: 'Stated in the source', contributor_inference: 'Contributor inference', external_reference: 'From another reference', unknown: 'Unknown' });
export const DATE_KINDS = Object.freeze({ source_event: 'Source or event date', edition: 'Edition date', upload: 'Upload date', observation: 'Observation date', other: 'Other date' });
export const DATE_BASES = Object.freeze({ stated_in_source: 'Stated in the source', service_metadata: 'Archive or service metadata', recorded_by_contributor: 'Recorded by the contributor', unknown: 'Unknown' });
export const FORMAT_BASES = Object.freeze({ measured_content_signature: 'Measured from file content', declared: 'Declared by a contributor' });
export const RELATIONS = Object.freeze({ same_as: 'is the same as', not_same_as: 'is not the same as', part_of: 'is part of', located_in: 'is located in', participant_in: 'took part in', mentions: 'mentions', created_by: 'was created by', related_to: 'is related to' });
export const UNCERTAINTY = Object.freeze({ not_assessed: 'Not assessed', clear: 'Clear', uncertain: 'Uncertain' });
export const FACET_LIMITS = Object.freeze({ entities: 200, dates: 50, formats: 20 });

function fail(message) { throw Error(message); }
const own = (table, key) => typeof key === 'string' && Object.hasOwn(table, key);
const clean = value => (typeof value === 'string' ? value.replace(/\r\n?/g, '\n').trim() : value);
const FACET_ID = /^f:[a-z0-9-]{8,64}$/;

function checkEntry(entry, kind) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry) || !FACET_ID.test(entry.id)) fail('Invalid facet entry.');
  checkText(entry.addedBy, 'the name of the person recording the entry', 200, { multiline: false });
  checkTime(entry.addedAt, 'facet entry time');
  if (kind === 'entities') {
    if (!own(ENTITY_GROUPS, entry.group) || !own(ENTITY_BASES, entry.basis)) fail('Invalid facet group or basis.');
    checkText(entry.label, 'the name as stated', 300, { multiline: false });
    checkText(entry.locator, 'the passage location', 300, { multiline: false, optional: entry.basis !== 'stated_in_source' });
    checkText(entry.identityKey, 'the identity key', 500, { multiline: false, optional: true });
  } else if (kind === 'dates') {
    if (!own(DATE_KINDS, entry.kind) || !own(DATE_BASES, entry.basis)) fail('Invalid date type or basis.');
    checkText(entry.value, 'the date as stated (or UNKNOWN)', 100, { multiline: false });
    checkText(entry.locator, 'where the date is recorded', 300, { multiline: false, optional: true });
  } else {
    if (!own(FORMAT_BASES, entry.basis)) fail('Invalid format basis.');
    checkText(entry.value, 'the file format', 100, { multiline: false });
  }
}

export function validateFacets(facets) {
  if (facets === undefined) return;
  if (!facets || typeof facets !== 'object' || Array.isArray(facets) || Object.keys(facets).some(k => !own(FACET_LIMITS, k))) fail('Invalid source facets.');
  const ids = new Set();
  for (const [kind, limit] of Object.entries(FACET_LIMITS)) {
    const list = facets[kind] ?? [];
    if (!Array.isArray(list) || list.length > limit) fail('Too many ' + kind + ' facet entries.');
    for (const entry of list) {
      checkEntry(entry, kind);
      if (ids.has(entry.id)) fail('Two facet entries share an ID.');
      ids.add(entry.id);
    }
  }
}

const emptyFacets = () => ({ entities: [], dates: [], formats: [] });

// Returns new facets; the caller decides whether to keep them. Saved readings are never edited.
export function addFacet(facets, kind, input, now = new Date().toISOString()) {
  const next = structuredClone(facets || emptyFacets());
  for (const key of Object.keys(FACET_LIMITS)) next[key] ??= [];
  const entry = { id: 'f:' + crypto.randomUUID(), addedBy: clean(input.addedBy), addedAt: now };
  if (!entry.addedBy) fail('Add your name or handle in Compare & read before recording a facet.');
  if (kind === 'entities') Object.assign(entry, { group: input.group, label: clean(input.label), basis: input.basis, locator: clean(input.locator || ''), identityKey: clean(input.identityKey || '') });
  else if (kind === 'dates') Object.assign(entry, { kind: input.kind, value: clean(input.value), basis: input.basis, locator: clean(input.locator || '') });
  else if (kind === 'formats') Object.assign(entry, { value: clean(input.value), basis: input.basis });
  else fail('Unknown facet kind.');
  checkEntry(entry, kind);
  const same = next[kind].find(e => kind === 'entities' ? e.group === entry.group && e.label === entry.label && e.locator === entry.locator && e.identityKey === entry.identityKey
    : kind === 'dates' ? e.kind === entry.kind && e.value === entry.value && e.basis === entry.basis : e.value === entry.value && e.basis === entry.basis);
  if (same) fail('That entry is already recorded in this draft.');
  next[kind].push(entry);
  validateFacets(next);
  return { facets: next, entry };
}

export function removeFacet(facets, id) {
  const next = structuredClone(facets || emptyFacets());
  for (const kind of Object.keys(FACET_LIMITS)) next[kind] = (next[kind] || []).filter(e => e.id !== id);
  return next;
}

// Content signatures read from the file bytes, not from its name.
export function sniffFormat(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const starts = sig => sig.every((v, i) => b[i] === v);
  if (starts([0x25, 0x50, 0x44, 0x46, 0x2d])) return 'application/pdf';
  if (starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (starts([0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (starts([0x52, 0x49, 0x46, 0x46]) && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp';
  const head = new TextDecoder().decode(b.slice(0, 1024)).replace(new RegExp('^' + String.fromCharCode(0xfeff)), '').trimStart();
  if (/^<svg[\s>]/i.test(head) || (/^<\?xml/i.test(head) && /<svg[\s>]/i.test(head))) return 'image/svg+xml';
  return null;
}

// Facet index: exact recorded values per saved reading. No normalization merges two labels.
export function readingFacets(revision) {
  const list = [], add = (key, label) => list.push({ key, label });
  const c = revision.context || {}, f = c.facets || {};
  for (const e of f.entities || []) {
    add('entity\u0001' + e.group + '\u0001' + e.label, ENTITY_GROUPS[e.group] + ': ' + e.label);
    if (e.identityKey) add('identity\u0001' + e.identityKey, 'Identity key: ' + e.identityKey);
  }
  for (const d of f.dates || []) add('date\u0001' + d.kind + '\u0001' + d.value, DATE_KINDS[d.kind] + ': ' + d.value);
  for (const x of f.formats || []) add('format\u0001' + x.basis + '\u0001' + x.value, 'Format (' + FORMAT_BASES[x.basis].toLowerCase() + '): ' + x.value);
  if (c.iaIdentifier) add('source\u0001ia\u0001' + c.iaIdentifier, 'Internet Archive item: ' + c.iaIdentifier);
  if (c.sourceUrl) add('source\u0001url\u0001' + c.sourceUrl, 'Source URL: ' + c.sourceUrl);
  if (c.sourceFile) add('source\u0001file\u0001' + c.sourceFile, 'Source file name: ' + c.sourceFile);
  if (revision.sourceImage?.sha256) add('source\u0001sha256\u0001' + revision.sourceImage.sha256, 'Measured source hash: ' + revision.sourceImage.sha256);
  if (c.readingContext) add('context\u0001' + c.readingContext.id + '@' + c.readingContext.version, 'Reading context: ' + c.readingContext.name + ' v' + c.readingContext.version);
  return list;
}

export function facetIndex(state) {
  const index = new Map();
  for (const revision of state.revisions) for (const { key, label } of readingFacets(revision)) {
    const item = index.get(key) || { key, label, revisionIds: [] };
    if (!item.revisionIds.includes(revision.id)) item.revisionIds.push(revision.id);
    index.set(key, item);
  }
  return [...index.values()].sort((a, b) => (a.label < b.label ? -1 : a.label > b.label ? 1 : 0));
}

// Exact matches stay separate from readings reachable only through a recorded relationship.
export function filterReadings(state, key) {
  const exact = state.revisions.filter(r => readingFacets(r).some(f => f.key === key)).map(r => r.id);
  const matched = new Set();
  for (const r of state.revisions) for (const e of r.context?.facets?.entities || []) {
    if ('entity\u0001' + e.group + '\u0001' + e.label === key || (e.identityKey && 'identity\u0001' + e.identityKey === key)) matched.add(e.id);
  }
  const relationships = (state.assertions || []).filter(a => matched.has(a.subject.entryId) || (a.object.entryId && matched.has(a.object.entryId)));
  const linked = [];
  for (const a of relationships) {
    if (a.relation !== 'same_as') continue;
    const other = matched.has(a.subject.entryId) ? a.object : a.subject;
    for (const r of state.revisions) {
      if (exact.includes(r.id)) continue;
      const hit = (r.context?.facets?.entities || []).some(e => (other.entryId && e.id === other.entryId) || (other.externalKey && e.identityKey === other.externalKey));
      if (hit && !linked.some(l => l.revisionId === r.id && l.assertionId === a.id)) linked.push({ revisionId: r.id, assertionId: a.id, status: assertionStatus(state, a.id) });
    }
  }
  return { exact, linked, relationships: relationships.map(a => ({ assertionId: a.id, relation: a.relation, status: assertionStatus(state, a.id) })) };
}

// Relationship assertions and their reviews.

export function addAssertion(state, input, now = new Date().toISOString()) {
  const revision = state.revisions.find(r => r.id === input.revisionId);
  if (!revision) fail('Choose a saved reading whose entries the relationship connects.');
  const entities = revision.context?.facets?.entities || [];
  const subject = entities.find(e => e.id === input.subjectId);
  if (!subject) fail('Choose the first entry from that saved reading.');
  const externalKey = clean(input.externalKey || '');
  const object = input.objectId ? entities.find(e => e.id === input.objectId) : null;
  if (input.objectId && !object) fail('Choose the second entry from the same saved reading.');
  if (!object && !externalKey) fail('Choose a second entry, or give the identity key it is linked to.');
  if (object && externalKey) fail('Choose either a second entry or an identity key, not both.');
  if (object && object.id === subject.id) fail('Choose two different entries.');
  const ref = revision.context.readingContext;
  const assertion = {
    id: crypto.randomUUID(), revisionId: revision.id,
    subject: { entryId: subject.id, label: subject.label },
    relation: input.relation,
    object: object ? { entryId: object.id, label: object.label } : { externalKey },
    assertedBy: clean(input.assertedBy), locator: clean(input.locator), reason: clean(input.reason),
    uncertainty: input.uncertainty, context: ref ? { id: ref.id, version: ref.version, sha256: ref.sha256 } : null,
    recordedAt: now, identity: 'self_declared', status: 'proposed',
  };
  checkAssertion(assertion, new Map([[revision.id, revision]]));
  return assertion;
}

function checkAssertion(a, revisions) {
  if (!a || typeof a !== 'object' || typeof a.id !== 'string' || !a.id || a.id.length > 200) fail('Invalid relationship record.');
  const revision = revisions.get(a.revisionId);
  if (!revision) fail('A relationship refers to a missing saved reading.');
  const entities = revision.context?.facets?.entities || [];
  const subject = entities.find(e => e.id === a.subject?.entryId);
  if (!subject || a.subject.label !== subject.label || Object.keys(a.subject).length !== 2) fail('A relationship refers to an entry that its reading does not contain.');
  if (!own(RELATIONS, a.relation)) fail('Choose a relationship type.');
  if (!a.object || typeof a.object !== 'object') fail('Invalid relationship target.');
  if (a.object.entryId !== undefined) {
    const object = entities.find(e => e.id === a.object.entryId);
    if (!object || object.id === subject.id || a.object.label !== object.label || Object.keys(a.object).length !== 2) fail('A relationship refers to an entry that its reading does not contain.');
  } else {
    if (Object.keys(a.object).length !== 1) fail('Invalid relationship target.');
    checkText(a.object.externalKey, 'the linked identity key', 500, { multiline: false });
  }
  checkText(a.assertedBy, 'the name of the person asserting the relationship', 200, { multiline: false });
  checkText(a.locator, 'the source passage supporting the relationship', 300, { multiline: false });
  checkText(a.reason, 'the reason for the relationship', 5000);
  if (!own(UNCERTAINTY, a.uncertainty)) fail('Choose the uncertainty of the relationship.');
  if (a.context !== null) {
    checkPin(a.context, 'relationship context');
    if (!samePin(a.context, revision.context.readingContext)) fail('A relationship must name the context version its reading used.');
  }
  if (typeof a.recordedAt !== 'string' || !Number.isFinite(Date.parse(a.recordedAt))) fail('Invalid relationship time.');
  if (a.identity !== 'self_declared' || a.status !== 'proposed') fail('Relationships are self-declared proposals.');
}

export function addAssertionReview(state, input, now = new Date().toISOString()) {
  if (!(state.assertions || []).some(a => a.id === input.assertionId)) fail('Choose a recorded relationship to review.');
  const review = { id: crypto.randomUUID(), assertionId: input.assertionId, reviewer: clean(input.reviewer), role: input.role, decision: input.decision, reason: clean(input.reason), recordedAt: now, identity: 'self_declared' };
  checkAssertionReview(review, new Set([input.assertionId]));
  return review;
}

function checkAssertionReview(r, assertionIds) {
  if (!r || typeof r !== 'object' || typeof r.id !== 'string' || !r.id || r.id.length > 200 || !assertionIds.has(r.assertionId)) fail('Invalid relationship review.');
  checkText(r.reviewer, 'the reviewer name or handle', 200, { multiline: false });
  if (!['reviewer', 'mentor'].includes(r.role)) fail('Choose a review role.');
  if (!['accepted', 'disputed', 'needs_review'].includes(r.decision)) fail('Invalid relationship review decision.');
  checkText(r.reason, 'the evidence checked', 5000);
  if (typeof r.recordedAt !== 'string' || !Number.isFinite(Date.parse(r.recordedAt)) || r.identity !== 'self_declared') fail('Invalid relationship review.');
}

// Same rule as reading status: any dispute stays visible; no majority wins.
export function assertionStatus(state, assertionId) {
  const decisions = (state.assertionReviews || []).filter(r => r.assertionId === assertionId).map(r => r.decision);
  if (!decisions.length) return 'pending';
  if (decisions.includes('accepted') && decisions.includes('disputed')) return 'conflicting_reviews';
  if (decisions.includes('disputed')) return 'disputed';
  if (decisions.includes('needs_review')) return 'needs_review';
  return 'accepted';
}

// Used by receipt verification; eventIds guards IDs across all event kinds.
export function validateRecordFacets(input, eventIds) {
  const revisions = new Map(input.revisions.map(r => [r.id, r]));
  const assertions = input.assertions ?? [], reviews = input.assertionReviews ?? [];
  if (!Array.isArray(assertions) || assertions.length > 2000 || !Array.isArray(reviews) || reviews.length > 2000) fail('Invalid relationship records.');
  const assertionIds = new Set();
  for (const a of assertions) {
    checkAssertion(a, revisions);
    if (eventIds.has(a.id)) fail('Two saved entries share an ID.');
    eventIds.add(a.id);
    assertionIds.add(a.id);
  }
  for (const r of reviews) {
    checkAssertionReview(r, assertionIds);
    if (eventIds.has(r.id)) fail('Two saved entries share an ID.');
    eventIds.add(r.id);
  }
}

// A CSV index refers to the pinned definition by ID, version and hash; it never
// repeats the definition text. The JSON review record carries the definitions.
const CSV_COLUMNS = ['record_id', 'reading_number', 'reading_id', 'continues_reading_id', 'contributor', 'observed_at', 'review_status', 'reviews', 'mentor_reviews', 'uncertainty', 'source_url', 'source_file', 'source_sha256', 'ia_identifier', 'locator', 'context_ref', 'context_id', 'context_version', 'context_sha256', 'context_bytes', 'context_name', 'context_definition_in_record', 'applied_lens_operations', 'people_organizations', 'places_jurisdictions', 'subjects_objects', 'events', 'typed_dates', 'formats'];

export function csvCell(value) {
  let text = value === null || value === undefined ? '' : String(value);
  // Spreadsheet formula prefixes are neutralized; the JSON record keeps exact values.
  if (/^[\s]*[=+\-@]/.test(text) || /^[\t\r]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}

export function readingsCsv(state, statusOf) {
  const rows = [CSV_COLUMNS];
  const carried = new Set((state.contextDefinitions || []).map(d => d.id + '@' + d.version + '#' + d.sha256));
  const join = list => list.join(' | ');
  for (const r of state.revisions) {
    const c = r.context || {}, f = c.facets || {}, ref = c.readingContext, reviews = state.reviews.filter(v => v.revisionId === r.id);
    const entities = group => (f.entities || []).filter(e => e.group === group).map(e => e.label + (e.identityKey ? ' [' + e.identityKey + ']' : ''));
    rows.push([
      state.id, r.number, r.id, r.parentId || '', r.reading.contributor, r.observedAt, statusOf(state, r.id), reviews.length,
      reviews.filter(v => v.role === 'mentor').length, r.reading.uncertainty, c.sourceUrl || '', c.sourceFile || '',
      r.sourceImage?.sha256 || '', c.iaIdentifier || '', c.locator || '',
      ref ? ref.id + '@' + ref.version + '#sha256:' + ref.sha256 : '', ref?.id || '', ref?.version || '', ref?.sha256 || '', ref?.bytes || '', ref?.name || '',
      ref ? (carried.has(ref.id + '@' + ref.version + '#' + ref.sha256) ? 'yes' : 'not included') : '',
      ref ? join(ref.appliedOperations.map(o => o.op + '=' + o.value)) : '',
      join(entities('people_organizations')), join(entities('places_jurisdictions')), join(entities('subjects_objects')), join(entities('events')),
      join((f.dates || []).map(d => DATE_KINDS[d.kind] + ': ' + d.value)), join((f.formats || []).map(x => x.value + ' (' + x.basis + ')')),
    ]);
  }
  return rows.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
