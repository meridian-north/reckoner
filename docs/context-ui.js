import { CONTEXT_FORMAT, FACET_GROUPS, FIVE_W_ONE_H, LENS_OPERATIONS, PROVENANCE_BASES, MAX_PACKAGE_BYTES, formatBytes, emptyLibrary, loadLibrary, mergeIntoLibrary, importContextFile, sealPackage, draftModel, draftContext, serializeDefinition, parseDefinition, utf8Bytes, byteBudgetStatus, normalizePolicy, cascade, pinnedKey, pinOf, samePin, portableRecord, readingContextRef, lifecycleSummary, earlierVersionReviews, contextEvent, contextSidecar, modelFingerprint, newContextId, checkOperations } from './contexts.js';
import { ENTITY_GROUPS, ENTITY_BASES, DATE_KINDS, DATE_BASES, FORMAT_BASES, RELATIONS, UNCERTAINTY, addFacet, removeFacet, sniffFormat, facetIndex, filterReadings, addAssertion, addAssertionReview, assertionStatus, readingsCsv } from './facets.js';
import { starterEntries, latestStarter } from './starters.js';
import { LensCache, resolveLens, deriveIndexes } from './lens-cache.js';
import { checkCapacity, status as readingStatus } from './core.js';
import { currentReading } from './collaboration.js';
import { CURRENT_FORMAT, FORMAT_NOTES } from './contexts.js';
import { projectToNative, nativeHeaderFor } from './native-projection.js';

// Browser wiring for reading contexts, source facets and relationships.
// Everything the page provides (elements, storage, dialogs, downloads) is
// passed in by app.js, so this module never reaches for browser globals.
export const LIBRARY_KEY = 'reckoner-context-library-v01';
const FACET_CHOICES = Object.freeze({ work: ['transcription', 'image interpretation', 'review', 'mentoring', 'translation', 'data extraction', 'cataloguing'], media: ['image', 'pdf', 'text', 'print', 'handwriting', 'photograph', 'map'] });
const PINNED = /^(ctx:[a-z0-9][a-z0-9:._-]{2,120})@(\d{1,6})#sha256:([a-f0-9]{64})$/;

export async function createContextUI(host) {
  const { $, make, storage, notify, getState, persist, collect, showPanel, confirm, download, append, applyOperations, prependBanner } = host;
  const cache = new LensCache();
  const starters = await starterEntries();
  const parsedCarried = new Map();
  let library, entries, recoveryRaw = null, selectedKey = null, editor = null, measured = null, draftStatus = null, statusTicket = 0, selectionTicket = 0, selectionPending = false, lastAuthor = '';
  const editorChoices = { parents: [], compositions: [], facets: [], emphasis: [], operations: {} };
  let libraryMutation = Promise.resolve(), pendingLibraryMutations = 0;
  function updateLibrary(task) {
    pendingLibraryMutations++;
    const result = libraryMutation.then(async () => {
      const next = await task(); library = next.library; entries = next.entries; return next;
    });
    libraryMutation = result.catch(() => {});
    return result.finally(() => { pendingLibraryMutations--; });
  }


  // Small element helpers. All untrusted text is set as textContent.
  const el = (tag, text, cls) => { const node = make(tag); if (text !== undefined) node.textContent = text; if (cls) node.className = cls; return node; };
  const option = (value, label) => { const node = make('option'); node.value = value; node.textContent = label; return node; };
  const button = (label, onClick, cls = 'quiet compact') => { const node = el('button', label, cls); node.type = 'button'; node.onclick = onClick; return node; };
  const field = (label, control) => { const node = el('label', label); node.append(control); return node; };
  const control = (tag, id, props = {}) => { const node = make(tag); node.id = id; Object.assign(node, props); return node; };
  const choose = (id, pairs) => { const node = control('select', id); for (const [value, label] of pairs) node.append(option(value, label)); return node; };
  const shortHash = sha => sha.slice(0, 12) + '…';
  const releaseText = model => (model.releaseLabel === 'starter_example' ? 'Starter example' : 'Personal context');
  const describeVersion = e => e.model.name + ' v' + e.record.version;
  const headerNote = h => 'Native header block: ' + ({ emitted: 'written for ' + h.values.length + ' domain facet(s).', not_emitted: 'not written, because this version declares no domain facet.', unsupported: 'not written. ' + h.refused + ' of ' + h.domainFacets + ' domain facet(s) use characters that the native list syntax cannot carry exactly, such as commas, brackets, colons or quotation marks. The definition keeps every facet as written.' })[h.status];
  const status = message => { $('context-library-status').textContent = message; };
  const fileBase = record => record.id.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') + '-v' + record.version;
  const validHttp = value => { try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password; } catch { return false; } };

  // Library: verified definitions plus self-declared review records, kept on this device.
  let stored = null;
  try { stored = storage.get(LIBRARY_KEY); } catch {}
  if (stored) {
    try { ({ library, entries } = await loadLibrary(stored, starters)); }
    catch (error) {
      recoveryRaw = stored; library = emptyLibrary(); entries = [...starters];
      const banner = el('section', undefined, 'tracker');
      banner.setAttribute('role', 'alert');
      banner.append(el('p', 'Your saved contexts could not be opened safely (' + error.message + '). The stored data is preserved and will not be overwritten until you choose to replace it.'),
        button('Download context recovery copy', () => download(recoveryRaw, 'application/json', 'reckoner-contexts-recovery.json'), ''),
        button('Replace stored contexts with this session’s contexts', () => { if (!confirm('Replace the preserved context data on this device? Download its recovery copy first if you want to keep it.')) return; recoveryRaw = null; status(saveLibrary().trim() || 'Stored contexts replaced with the contexts in this session.'); banner.remove(); }, 'quiet'));
      prependBanner(banner);
    }
  } else { library = emptyLibrary(); entries = [...starters]; }

  // Written only after an explicit library action, never while loading or persisting a draft.
  // Returns '' once stored, or a sentence saying why the change stays in this session only.
  function saveLibrary() {
    if (recoveryRaw !== null) return ' This change is kept for this session only: your earlier saved contexts are preserved and were not overwritten. Download the recovery copy, then choose Replace to keep new contexts on this device.';
    try { storage.set(LIBRARY_KEY, JSON.stringify(library)); return ''; }
    catch (error) { return error.code === 'STORAGE_CONFLICT' ? ' '+error.message+' Export your contexts to retain this session’s changes.' : ' Device storage is unavailable or full, so this change is kept for this session only. Export your contexts to keep them.'; }
  }

  // Definitions carried in the current record were hash-verified when it was opened.
  function carriedEntries() {
    const result = [];
    for (const definition of getState().contextDefinitions || []) {
      const key = pinnedKey(definition);
      let model = parsedCarried.get(key);
      if (!model) { try { model = parseDefinition(definition.text); parsedCarried.set(key, model); } catch { continue; } }
      result.push({ record: portableRecord(definition), model });
    }
    return result;
  }
  function allEntries() {
    const seen = new Set(), result = [];
    for (const entry of [...entries, ...carriedEntries()]) { const key = pinnedKey(entry.record); if (!seen.has(key)) { seen.add(key); result.push(entry); } }
    return result;
  }
  const inLibrary = record => entries.some(e => pinnedKey(e.record) === pinnedKey(record));
  function lookup(pin) { const key = pinnedKey(pin); return allEntries().find(e => pinnedKey(e.record) === key) || null; }
  function events() {
    const map = new Map();
    for (const event of [...library.events, ...(getState().contextEvents || [])]) if (!map.has(event.id)) map.set(event.id, event);
    return [...map.values()];
  }
  function store() {
    const all = allEntries();
    return { definitions: all.map(e => e.record), events: events(), policy: library.policy, index: deriveIndexes(all) };
  }
  function safeCascade(entry) {
    try { return { ...cascade(entry, lookup), cycle: null }; }
    catch (error) { return { order: [entry], missing: [], cycle: error.message }; }
  }
  const byName = (a, b) => (a.model.name < b.model.name ? -1 : a.model.name > b.model.name ? 1 : a.record.version - b.record.version);

  function lifecycleLine(life, model) {
    return [model.releaseLabel === 'starter_example' ? 'Starter example' : 'Proposed personal context',
      life.blessed.length ? 'human blessing (self-declared): ' + life.blessed.length : 'no human blessing yet',
      'mentor or reviewer checks: ' + life.checks.length,
      'model checks: ' + (life.gates.length ? 'evidence recorded elsewhere, not verified here' : 'not run'),
      life.promotions.length ? 'promotion claims recorded elsewhere' : 'not promoted for any model',
      'no institutional approval'].join(' · ') + (life.revoked ? ' · WITHDRAWN' : '');
  }

  // Keeps the record self-contained: every definition a reading or check relies on, with its ancestors and reviews.
  function syncRecord() {
    const state = getState();
    const pins = [...state.revisions.map(r => r.context?.readingContext), state.context.readingContext].filter(Boolean);
    for (const event of library.events) if (event.type === 'mentor_check' && event.passage?.recordId === state.id) pins.push({ id: event.contextId, version: event.version, sha256: event.sha256 });
    const needed = new Map();
    for (const pin of pins) {
      const entry = lookup(pin);
      if (!entry) continue;
      for (const item of safeCascade(entry).order) needed.set(pinnedKey(item.record), portableRecord(item.record));
    }
    const definitions = [...needed.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : a.version - b.version));
    const hashes = new Set(definitions.map(d => d.sha256)), carried = new Map();
    for (const event of [...(state.contextEvents || []), ...library.events]) if (hashes.has(event.sha256) && !carried.has(event.id)) carried.set(event.id, event);
    const next = { ...state, contextDefinitions: definitions, contextEvents: [...carried.values()] };
    try { checkCapacity(next); } catch (error) { notify(error.message); return false; }
    state.contextDefinitions = next.contextDefinitions;
    state.contextEvents = next.contextEvents;
    return true;
  }

  // After a record is opened or merged, its contexts join the library unless they conflict.
  async function absorbRecord() {
    const state = getState(), incoming = { definitions: state.contextDefinitions || [], events: state.contextEvents || [] };
    if (!incoming.definitions.length && !incoming.events.length) return;
    try {
      const result = await updateLibrary(() => mergeIntoLibrary(library, entries, incoming, { policy: library.policy, enforceBudget: false, origin: 'record' }));
      if (result.added.definitions || result.added.events) {
        
        const note = saveLibrary();
        status('This record carried ' + result.added.definitions + ' context definition(s) and ' + result.added.events + ' context review record(s) that are now in your library.' + note);
      }
    } catch (error) { status('Contexts in this record stay with the record but were not added to your library. ' + error.message); }
  }

  // Reading context selection

  async function refreshDraftStatus() {
    const state = getState(), ref = state.context.readingContext, ticket = ++statusTicket;
    if (!ref) { draftStatus = null; return; }
    const result = await resolveLens(cache, store(), pinOf(ref));
    if (ticket === statusTicket && getState() === state && samePin(state.context.readingContext, ref)) draftStatus = { key: pinnedKey(ref), result };
  }

  async function selectForDraft(value) {
    const state = getState(), ticket = ++selectionTicket, requestedLibrary = library, previousRef = state.context.readingContext;
    selectionPending = !!value;
    if (!value) {
      delete state.context.readingContext;
      draftStatus = null; syncRecord(); persist(); renderReading();
      return true;
    }
    const match = PINNED.exec(value);
    if (!match) { selectionPending = false; return false; }
    const result = await resolveLens(cache, store(), { id: match[1], version: Number(match[2]), sha256: match[3] });
    if (ticket !== selectionTicket) return false;
    selectionPending = false;
    if (getState() !== state || library !== requestedLibrary || state.context.readingContext !== previousRef) return false;
    if (result.status !== 'ok') { notify('This context needs a fresh check before a new reading can use it. ' + result.message); renderReading(); return false; }
    state.context.readingContext = readingContextRef(result.entry);
    draftStatus = { key: pinnedKey(result.entry.record), result };
    if (!syncRecord()) { delete state.context.readingContext; draftStatus = null; }
    persist(); renderReading();
    if (state.context.readingContext) notify('Reading context selected: ' + describeVersion(result.entry) + '. Its exact version is saved with your next reading.');
    return !!state.context.readingContext;
  }

  function renderReading() {
    const state = getState(), ref = state.context.readingContext, select = $('reading-context-select');
    select.replaceChildren(option('', 'No context selected'));
    const listed = [...entries].sort(byName);
    for (const entry of listed) select.append(option(pinnedKey(entry.record), describeVersion(entry) + ' · ' + releaseText(entry.model).toLowerCase() + ' · ' + formatBytes(entry.record.bytes) + ' bytes'));
    if (ref && !listed.some(e => samePin(e.record, ref))) select.append(option(pinnedKey(ref), ref.name + ' v' + ref.version + ' · from this record' + (lookup(ref) ? '' : ' · definition not available')));
    select.value = ref ? pinnedKey(ref) : '';
    $('reading-context-badge').textContent = ref ? '· ' + ref.name + ' v' + ref.version : '· none selected';
    const summary = $('reading-context-summary');
    summary.replaceChildren();
    $('reading-context-apply').hidden = true;
    if (!ref) { summary.append(el('p', 'No context selected. A reading without a context is still valid.', 'helper')); return; }
    const entry = lookup(ref);
    summary.append(el('p', ref.id + '@' + ref.version + ' · SHA-256 ' + ref.sha256 + ' · ' + formatBytes(ref.bytes) + ' bytes (UTF-8)', 'meta hash'));
    if (!entry) { summary.append(el('p', 'The definition of this version is not in this record or your library. Open the context file that defines it; nothing is substituted.', 'warning')); return; }
    const check = draftStatus?.key === pinnedKey(ref) ? draftStatus.result : null;
    if (check?.status === 'recheck') summary.append(el('p', 'Needs a fresh check before a new reading is saved with it: ' + check.message, 'warning'));
    summary.append(el('p', entry.model.meaning, 'meaning'));
    const chain = safeCascade(entry);
    if (chain.order.length > 1) summary.append(el('p', 'Reads within: ' + chain.order.map(describeVersion).join(' → '), 'meta'));
    summary.append(el('p', lifecycleLine(lifecycleSummary(events(), entry.record), entry.model), 'meta'));
    const previous = currentReading(state)?.context?.readingContext;
    if (previous && !samePin(previous, ref)) summary.append(el('p', 'Your last saved reading used ' + previous.name + ' v' + previous.version + '. Its reviews and checks apply to that version only; a reading saved with this one starts its own review.', 'warning'));
    if (entry.model.operations.length) {
      $('reading-context-apply').hidden = false;
      summary.append(el('p', 'View settings it can apply: ' + entry.model.operations.map(o => LENS_OPERATIONS[o.op].label + ' ' + o.value).join(', ') + '. ' + (ref.appliedOperations.length ? 'Applied ' + ref.appliedAt + '; recorded with your next reading.' : 'Not applied.'), 'meta'));
    }
  }

  function prepareForSave() {
    if (selectionPending || pendingLibraryMutations) throw Error('Wait for the selected context or library check, or choose none before saving.');
    const state = getState(), ref = state.context.readingContext;
    const sync = () => { if (!syncRecord()) throw Error('The context definitions could not be added to this record. Export it and start a linked record.'); };
    if (!ref) { sync(); return; }
    const requestedLibrary = library, carried = JSON.stringify({ definitions: state.contextDefinitions, events: events() });
    return (async () => {
      const result = await resolveLens(cache, store(), pinOf(ref));
      if (getState() !== state || state.context.readingContext !== ref || library !== requestedLibrary || carried !== JSON.stringify({ definitions: state.contextDefinitions, events: events() }) || selectionPending) throw Error('The workspace or context checks changed while saving. Check the selected context and save again.');
      draftStatus = { key: pinnedKey(ref), result };
      if (result.status !== 'ok') throw Error('The selected reading context needs a fresh check: ' + result.message + ' Choose another context or none.');
      sync();
    })();
  }

  // Source facets

  function facetAction(kind, input, clear) {
    const state = getState();
    try {
      for(const id of clear){$(id).removeAttribute('aria-invalid');$(id).removeAttribute('aria-describedby');}
      $('facet-status').setAttribute('role','status');
      collect();
      const { facets } = addFacet(state.context.facets, kind, { ...input, addedBy: state.draft.contributor });
      checkCapacity({ ...state, context: { ...state.context, facets } });
      state.context.facets = facets;
      for (const id of clear) $(id).value = '';
      persist(); renderFacets();
      $('facet-status').textContent = 'Added to this draft. Save a reading to keep it in the history.';
    } catch (error) {
      $('facet-status').textContent = error.message;
      $('facet-status').setAttribute('role','alert');
      const required={entities:'facet-label',dates:'date-value',formats:'declared-format'}[kind];
      const first=required&&!$(required).value.trim()?required:null;
      if(!state.draft.contributor.trim()){notify(error.message);showPanel('reading');$('contributor').focus();}
      else if(first){const field=$(first);field.setAttribute('aria-invalid','true');field.setAttribute('aria-describedby','facet-status');field.insertAdjacentElement('afterend',$('facet-status'));field.focus();}
    }
  }

  function removeEntry(id) {
    const state = getState(), next = removeFacet(state.context.facets, id);
    if (!next.entities.length && !next.dates.length && !next.formats.length) delete state.context.facets;
    else state.context.facets = next;
    persist(); renderFacets();
    $('facet-status').textContent = 'Removed from this draft. Saved readings keep their entries.';
  }

  function renderFacets() {
    const state = getState(), facets = state.context.facets || {}, list = $('facet-list');
    list.replaceChildren();
    const groups = [
      ...Object.entries(ENTITY_GROUPS).map(([group, label]) => [label, (facets.entities || []).filter(e => e.group === group), e => e.label + ' · ' + ENTITY_BASES[e.basis] + (e.locator ? ' · ' + e.locator : '') + (e.identityKey ? ' · identity key ' + e.identityKey : '') + ' · recorded by ' + e.addedBy]),
      ['Typed dates', facets.dates || [], d => DATE_KINDS[d.kind] + ': ' + d.value + ' · ' + DATE_BASES[d.basis] + (d.locator ? ' · ' + d.locator : '') + ' · recorded by ' + d.addedBy],
      ['File formats', facets.formats || [], f => f.value + ' · ' + FORMAT_BASES[f.basis] + ' · recorded by ' + f.addedBy],
    ];
    for (const [label, items, describe] of groups) {
      const box = el('div', undefined, 'facet-group');
      box.append(el('h3', label));
      if (!items.length) box.append(el('p', 'Not recorded', 'helper'));
      for (const item of items) { const row = el('p', describe(item), 'facet-entry'); row.append(' ', button('Remove', () => removeEntry(item.id))); box.append(row); }
      list.append(box);
    }
    const kinds = new Set((facets.dates || []).map(d => d.kind));
    const absent = ['source_event', 'edition', 'upload', 'observation'].filter(k => !kinds.has(k)).map(k => DATE_KINDS[k].toLowerCase());
    if (absent.length) list.append(el('p', 'Not recorded: ' + absent.join(', ') + '. Each date type stays separate, and an unrecorded date stays unknown.', 'helper'));
    const current = measured && measured.sha256 === state.sourceImage?.sha256;
    $('measured-format').textContent = current ? (measured.signature ? 'Measured content signature: ' + measured.signature + ', read from the file bytes.' : 'The file bytes match no known signature. Declare a format or leave it unknown.') : 'Open a local file to measure its content signature. A file name is never used.';
    $('record-measured-format').hidden = !(current && measured.signature);
  }

  // Record views in Decisions & history: facet filter and relationships

  function renderAssertionEntries() {
    const state = getState(), revision = state.revisions.find(r => r.id === $('assertion-reading').value);
    const entities = revision?.context?.facets?.entities || [];
    for (const [id, blank] of [['assertion-subject', null], ['assertion-object', 'No second entry: use an identity key below']]) {
      const select = $(id), previous = select.value;
      select.replaceChildren();
      if (blank) select.append(option('', blank));
      for (const e of entities) select.append(option(e.id, ENTITY_GROUPS[e.group] + ': ' + e.label));
      select.value = entities.some(e => e.id === previous) ? previous : blank ? '' : entities[0]?.id || '';
    }
  }

  function renderFilterResults() {
    const state = getState(), key = $('facet-filter').value, box = $('facet-filter-results');
    box.replaceChildren();
    if (!key) return;
    const result = filterReadings(state, key);
    const describe = id => { const r = state.revisions.find(x => x.id === id); return 'Reading ' + r.number + ' (' + r.id.slice(0, 8) + ') · ' + r.reading.contributor + ' · ' + readingStatus(state, r.id).replaceAll('_', ' '); };
    box.append(el('h3', 'Exact matches: ' + result.exact.length));
    for (const id of result.exact) box.append(el('p', describe(id)));
    if (result.linked.length) {
      box.append(el('h3', 'Linked only through a recorded relationship'));
      for (const link of result.linked) box.append(el('p', describe(link.revisionId) + ' · via relationship ' + link.assertionId.slice(0, 8) + ', ' + link.status.replaceAll('_', ' '), 'meta'));
    }
    if (result.relationships.length) box.append(el('p', result.relationships.length + ' recorded relationship(s) involve this entry: ' + result.relationships.map(r => '"' + RELATIONS[r.relation] + '", review status ' + r.status.replaceAll('_', ' ')).join('; ') + '.', 'helper'));
    box.append(el('p', 'An exact text match only. A shared label does not establish that two entries refer to the same thing.', 'helper'));
  }

  function renderRecordViews() {
    const state = getState(), filter = $('facet-filter'), chosen = filter.value, index = facetIndex(state);
    filter.replaceChildren(option('', 'Choose a facet'));
    for (const item of index) filter.append(option(item.key, item.label + ' (' + item.revisionIds.length + ')'));
    filter.value = index.some(i => i.key === chosen) ? chosen : '';
    renderFilterResults();
    const readings = $('assertion-reading'), was = readings.value;
    readings.replaceChildren();
    for (const r of state.revisions) readings.append(option(r.id, 'Reading ' + r.number + ' · ' + r.reading.contributor + ' · ' + r.id.slice(0, 8)));
    readings.value = state.revisions.some(r => r.id === was) ? was : state.activeRevisionId || state.revisions.at(-1)?.id || '';
    renderAssertionEntries();
    const list = $('assertion-list');
    list.replaceChildren();
    const target = (a) => (a.object.entryId ? '"' + a.object.label + '"' : 'identity key ' + a.object.externalKey);
    for (const a of [...(state.assertions || [])].reverse()) {
      const box = el('div', undefined, 'connection');
      box.append(el('p', '"' + a.subject.label + '" ' + RELATIONS[a.relation] + ' ' + target(a)),
        el('p', 'Asserted by ' + a.assertedBy + ' · source passage: ' + a.locator + ' · ' + UNCERTAINTY[a.uncertainty].toLowerCase() + ' · context ' + (a.context ? a.context.id + '@' + a.context.version : 'none recorded'), 'meta'),
        el('p', a.reason),
        el('p', 'Status: ' + assertionStatus(state, a.id).replaceAll('_', ' ') + '. A proposal, not a verified fact.', 'meta'));
      for (const v of (state.assertionReviews || []).filter(v => v.assertionId === a.id)) box.append(el('p', v.decision.replaceAll('_', ' ') + ' · ' + v.role + ' · ' + v.reviewer + ': ' + v.reason, 'review-record'));
      list.append(box);
    }
    const review = $('assertion-review-target'), previous = review.value;
    review.replaceChildren();
    for (const a of state.assertions || []) review.append(option(a.id, '"' + a.subject.label + '" ' + RELATIONS[a.relation] + ' ' + target(a) + ' · ' + a.id.slice(0, 8)));
    review.value = (state.assertions || []).some(a => a.id === previous) ? previous : state.assertions?.at(-1)?.id || '';
  }

  // Context library tab

  function describeLink(pin) {
    const found = lookup(pin);
    if (!found) return 'Missing: ' + pin.id + '@' + pin.version + ' (SHA-256 ' + shortHash(pin.sha256) + '). It is not in your library or this record; nothing is substituted.';
    const newer = allEntries().filter(e => e.record.id === pin.id && e.record.version > pin.version).map(e => e.record.version);
    const life = lifecycleSummary(events(), found.record);
    return describeVersion(found) + (life.revoked ? ' · withdrawn' : '') + (newer.length ? ' · a newer version (v' + Math.max(...newer) + ') exists; this context still uses v' + pin.version + '. Revising it to adopt the newer version starts a fresh review.' : '');
  }

  async function recordEvent(type, entry, fields) {
    try {
      const event = contextEvent(type, entry.record, fields);
      const result = await updateLibrary(() => mergeIntoLibrary(library, entries, { definitions: [portableRecord(entry.record)], events: [event] }, { policy: library.policy, enforceBudget: false, origin: 'record' }));
      
      const note = saveLibrary();
      syncRecord(); persist();
      if (type === 'revocation') await refreshDraftStatus();
      renderLibrary(); renderReading();
      status({ blessing: 'Blessing recorded for this exact version. It is self-declared and does not carry over to other versions.', mentor_check: 'Check recorded against this exact version and source passage.', revocation: 'Version withdrawn. Readings that used it keep it; new readings cannot select it.' }[type] + note);
    } catch (error) { status(error.message); notify(error.message); }
  }

  function lifecycleSection(entry) {
    const { record, model } = entry, all = events(), life = lifecycleSummary(all, record), state = getState();
    const section = el('div');
    section.append(el('h3', 'Review and status'));
    const personal = el('div', undefined, 'lifecycle');
    personal.append(el('h4', 'Personal and mentor review (self-declared)'),
      el('p', 'Proposed: yes. ' + (model.releaseLabel === 'starter_example' ? 'Shipped as a starter example.' : 'A personal context; it has not been released.')),
      el('p', 'Human blessing: ' + (life.blessed.length ? life.blessed.map(e => e.recordedBy).join(', ') : 'none yet') + (life.declined.length ? '. Declined by: ' + life.declined.map(e => e.recordedBy).join(', ') : '') + '.'));
    for (const e of [...life.blessed, ...life.declined]) personal.append(el('p', e.decision + ' · ' + e.recordedBy + ' · ' + e.recordedAt + '\n' + e.reason, 'review-record'));
    personal.append(el('p', 'Mentor and reviewer checks: ' + (life.checks.length || 'none yet') + '.'));
    for (const e of life.checks) personal.append(el('p', e.decision.replaceAll('_', ' ') + ' · ' + e.role + ' · ' + e.recordedBy + ' · ' + e.recordedAt + '\nPassage: ' + e.passage.locator + (e.passage.revisionId ? ' (reading ' + e.passage.revisionId.slice(0, 8) + ')' : '') + '\n' + e.check, 'review-record'));
    for (const e of life.revocations) personal.append(el('p', 'Withdrawn by ' + e.recordedBy + ' · ' + e.recordedAt + ': ' + e.reason, 'warning'));
    const earlier = earlierVersionReviews(all, record);
    if (earlier.length) personal.append(el('p', 'Earlier versions keep their own reviews, which do not carry over: ' + earlier.map(x => 'v' + x.version + ' has ' + x.blessings + ' blessing(s) and ' + x.checks + ' check(s)').join('; ') + '.', 'helper'));
    const models = el('div', undefined, 'lifecycle');
    models.append(el('h4', 'Model checks and promotion'),
      el('p', life.gates.length ? 'Model check evidence recorded elsewhere. This form did not run or verify it:' : 'Model checks: not run. This form runs no model checks, and no evidence is attached.'));
    for (const g of life.gates) models.append(el('p', modelFingerprint(g.model) + ' · probe ' + g.probe.id + ' ' + g.probe.version + ' · ' + g.result + ' · measured ' + g.measuredAt + ' · evidence SHA-256 ' + shortHash(g.evidence.sha256), 'meta'));
    models.append(el('p', 'Promotion for a model: ' + (life.promotions.length ? 'claims recorded elsewhere for ' + life.promotedFor.join(', ') + ', not verified here' : 'not promoted') + '. Independent ratification: ' + (life.ratifications.length ? 'claims recorded elsewhere for ' + life.ratifiedFor.join(', ') + ', not verified here' : 'not ratified') + '.'),
      el('p', 'Model evidence binds to these exact definition bytes and one model version. A new version or a different model starts with no checks. The native Garrison Node registry remains authoritative for its own use; this form never writes to it.', 'helper'),
      el('p', 'Designed for BitNet flags: scoring not run, comprehension not run, suitability unknown, verification not run. A compatibility label, not a measured inference.', 'helper'));
    const institution = el('div', undefined, 'lifecycle');
    institution.append(el('h4', 'Institutional approval'), el('p', 'None. A receiving institution’s own service would record approval; nothing in this form grants it.'));
    section.append(personal, models, institution);

    const blessName = control('input', 'ctx-bless-name', { maxLength: 200, value: state.draft.contributor || '' });
    const blessDecision = choose('ctx-bless-decision', [['blessed', 'Bless this version for my use'], ['declined', 'Decline this version']]);
    const blessReason = control('textarea', 'ctx-bless-reason', { rows: 2 });
    const bless = el('details', undefined, 'disclosure');
    bless.append(el('summary', 'Record a human blessing (self-declared)'), el('p', 'A blessing says you read this exact version and endorse it for your own use. It is not institutional approval or model promotion, and it does not carry over to other versions.', 'helper'),
      field('Your name or handle', blessName), field('Decision', blessDecision), field('Reason', blessReason),
      button('Record blessing', () => recordEvent('blessing', entry, { recordedBy: blessName.value, decision: blessDecision.value, reason: blessReason.value }), 'quiet'));

    const checkName = control('input', 'ctx-check-name', { maxLength: 200, value: state.draft.contributor || '' });
    const checkRole = choose('ctx-check-role', [['mentor', 'Mentor · explain and guide'], ['reviewer', 'Reviewer']]);
    const checkDecision = choose('ctx-check-decision', [['accepted', 'Works as described for this passage'], ['needs_review', 'Needs further review'], ['disputed', 'Disputed for this passage']]);
    const checkText = control('textarea', 'ctx-check-text', { rows: 3, placeholder: 'Steps another person can repeat with the same source and this version.' });
    const checkPassage = choose('ctx-check-passage', [['', 'Describe a passage below'], ...state.revisions.map(r => [r.id, 'Reading ' + r.number + ' · ' + (r.context.locator || 'no location') + ' · ' + r.id.slice(0, 8)])]);
    checkPassage.value = state.revisions.some(r => r.id === state.activeRevisionId) ? state.activeRevisionId : '';
    const checkLocator = control('input', 'ctx-check-locator', { maxLength: 500, placeholder: 'Page, paragraph or region, when no saved reading is chosen' });
    const check = el('details', undefined, 'disclosure');
    check.append(el('summary', 'Record a mentor or reviewer check'), el('p', 'Apply this exact version to a source passage and describe a check another person can repeat. The check stays with this version.', 'helper'),
      field('Your name or handle', checkName), field('Role', checkRole), field('Decision', checkDecision), field('Repeatable check', checkText), field('Source passage', checkPassage), field('Passage location', checkLocator),
      button('Record check', () => {
        const live = getState(), revision = live.revisions.find(r => r.id === checkPassage.value);
        const passage = revision ? { locator: revision.context.locator || checkLocator.value, recordId: live.id, revisionId: revision.id, sourceUrl: validHttp(revision.context.sourceUrl) ? revision.context.sourceUrl : undefined, sourceSha256: revision.sourceImage?.sha256 || undefined } : { locator: checkLocator.value, recordId: live.id };
        recordEvent('mentor_check', entry, { recordedBy: checkName.value, role: checkRole.value, decision: checkDecision.value, check: checkText.value, passage });
      }, 'quiet'));

    const withdrawName = control('input', 'ctx-withdraw-name', { maxLength: 200, value: state.draft.contributor || '' });
    const withdrawReason = control('textarea', 'ctx-withdraw-reason', { rows: 2 });
    const withdraw = el('details', undefined, 'disclosure');
    withdraw.append(el('summary', 'Withdraw this version'), el('p', 'Withdrawal is recorded with your name and reason. Readings that used this version keep it; new readings cannot select it, and narrower contexts that depend on it need a fresh check.', 'helper'),
      field('Your name or handle', withdrawName), field('Reason', withdrawReason),
      button('Withdraw version ' + record.version, () => { if (confirm('Withdraw ' + describeVersion(entry) + '? This is recorded and cannot be undone here.')) recordEvent('revocation', entry, { recordedBy: withdrawName.value, reason: withdrawReason.value }); }, 'quiet'));
    section.append(bless, check, withdraw);
    return section;
  }

  function renderDetail() {
    const box = $('context-detail'), all = allEntries(), entry = all.find(e => pinnedKey(e.record) === selectedKey);
    box.replaceChildren();
    if (!entry) { box.append(el('p', 'Choose a context to read its meaning, versions and reviews.', 'empty')); return; }
    const { record, model } = entry, chain = safeCascade(entry);
    const versions = all.filter(e => e.record.id === record.id).sort((a, b) => a.record.version - b.record.version);
    const latest = versions.at(-1);
    box.append(el('p', 'CONTEXT', 'eyebrow'), el('h2', model.name),
      el('p', releaseText(model) + (model.releaseLabel === 'starter_example' ? ' · newly written for this form; not endorsed by Internet Archive or promoted for Garrison Node production use' : ' · stays on this device until you export it; not released') + (inLibrary(record) ? '' : ' · carried in the current record, not in your library'), 'meta'));
    const versionSelect = choose('context-version-select', versions.map(v => [pinnedKey(v.record), 'Version ' + v.record.version + ' · ' + v.model.createdAt.slice(0, 10) + ' · ' + shortHash(v.record.sha256)]));
    versionSelect.value = selectedKey;
    versionSelect.onchange = () => { selectedKey = versionSelect.value; renderDetail(); };
    box.append(field('Version', versionSelect));
    const budget = byteBudgetStatus(record.bytes, library.policy);
    box.append(el('p', 'ID ' + record.id + ' · version ' + record.version + (record.version < latest.record.version ? ' · a newer version exists' : ''), 'meta'),
      el('p', 'SHA-256 ' + record.sha256, 'meta hash'),
      el('p', 'Format: ' + model.format + ', ' + FORMAT_NOTES[model.format] + (model.format === CURRENT_FORMAT ? '.' : '. Its bytes and hash stay as written; a new version uses the current format.'), 'meta'),
      el('p', 'Size: ' + budget.message, budget.ok ? 'meta' : 'warning'));
    if (chain.order.length > 1) box.append(el('p', 'With its broader contexts: ' + formatBytes(chain.order.reduce((sum, e) => sum + e.record.bytes, 0)) + ' bytes across ' + chain.order.length + ' definitions.', 'meta'));
    box.append(el('h3', 'Meaning'), el('p', model.meaning, 'meaning'), el('h3', 'Where it comes from'),
      el('p', 'Author (self-declared): ' + model.author + ' · created ' + model.createdAt + ' · ' + PROVENANCE_BASES[model.basis]), el('p', model.provenance));
    if (model.revisionOf) box.append(el('p', 'Revises version ' + model.revisionOf.version + ' (SHA-256 ' + shortHash(model.revisionOf.sha256) + '). Reason: ' + model.revisionReason));
    if (model.adaptedFrom) box.append(el('p', 'Adapted from ' + describeLink(model.adaptedFrom)));
    box.append(el('h3', 'Broader contexts'));
    if (!model.parents.length) box.append(el('p', 'None. This context does not narrow another one.', 'helper'));
    for (const pin of model.parents) box.append(el('p', describeLink(pin)));
    if (model.compositions.length) { box.append(el('h3', 'Also uses')); for (const pin of model.compositions) box.append(el('p', describeLink(pin))); }
    if (chain.cycle) box.append(el('p', chain.cycle, 'warning'));
    if (chain.order.length > 1) box.append(el('p', 'Reads within: ' + chain.order.map(describeVersion).join(' → '), 'meta'));
    if (chain.missing.length) box.append(el('p', 'Missing broader contexts: ' + chain.missing.map(p => p.id + '@' + p.version).join(', ') + '. Nothing is substituted; open the files that define them.', 'warning'));
    const dependents = all.filter(e => [...e.model.parents, ...e.model.compositions].some(p => samePin(p, record)));
    box.append(el('h3', 'Narrower contexts that depend on this version'));
    if (!dependents.length) box.append(el('p', 'None here.', 'helper'));
    for (const d of dependents) box.append(el('p', describeVersion(d)));
    const listing = (title, items) => { if (!items.length) return; box.append(el('h3', title)); const ul = el('ul'); for (const item of items) ul.append(el('li', item)); box.append(ul); };
    listing('Facets', model.facets.map(f => FACET_GROUPS[f.group] + ': ' + f.value));
    listing('5W1H emphasis', model.emphasis);
    listing('Active concepts', model.concepts.map(c => c.term + ': ' + c.meaning));
    listing('Rules', model.rules);
    listing('View settings it can apply', model.operations.map(o => LENS_OPERATIONS[o.op].label + ': ' + o.value));
    listing('Disambiguation hints', model.hints);
    listing('References', model.references.map(r => [r.label, r.url, r.locator].filter(Boolean).join(' · ')));
    box.append(lifecycleSection(entry));
    let sidecar = null;
    try { sidecar = contextSidecar({ entry, events: events(), policy: library.policy, lookup }); } catch {}
    const actions = el('div', undefined, 'actions wrap');
    actions.append(button('Use for the current reading', async () => { if (await selectForDraft(pinnedKey(record))) showPanel('reading'); }, 'compact'),
      button('Derive a narrower context', () => openEditor('derive', entry)));
    if (record.version === latest.record.version && model.releaseLabel !== 'starter_example' && inLibrary(record)) actions.append(button('Revise (new version)', () => openEditor('revise', entry)));
    actions.append(button('Start a new context from this', () => openEditor('adapt', entry)),
      button('Export this context', () => exportPackage([entry], fileBase(record))),
      button('Download definition text', () => download(record.text, 'text/plain;charset=utf-8', fileBase(record) + '.cycl.txt')));
    if (sidecar) actions.append(button('Download sidecar', () => download(JSON.stringify(sidecar, null, 2), 'application/json', fileBase(record) + '.sidecar.json')));
    box.append(el('h3', 'Use and share'), actions);
    const tech = el('details', undefined, 'developer-details');
    tech.append(el('summary', 'Microtheory and CycL details'),
      el('p', 'In Garrison Node terms this context is a microtheory, constant ' + model.symbol + '. Its canonical definition below is a readable CycL subset (' + model.format + '); every list on this page is a projection of that text. Compatibility with the native Garrison Node parser has not been verified here.'),
      el('pre', record.text, 'definition-text'),
      el('p', 'Sidecar (derived; not a source of truth):', 'helper'), el('pre', sidecar ? JSON.stringify(sidecar, null, 2) : 'Unavailable: a broader context is missing or cyclic.', 'definition-text'),
      el('p', 'Lens cache: ' + cache.size + ' validated definition(s) under ID, version, hash and policy · ' + cache.stats.hits + ' hits · ' + cache.stats.misses + ' misses. Withdrawal, ancestors and budget are rechecked on every use.', 'helper'),
      el('p', 'A native metadata projection lists where each of this exact version\'s public fields falls in the native six-section order, by source line. It copies no author text, only checked values, sizes and hashes, so quoted wording cannot be read as metadata. Domain facets that the native list syntax carries exactly are written in a file_bitnet header block. It claims no native compatibility and establishes no admission.', 'helper'),
      el('p', headerNote(nativeHeaderFor(model.facets)), 'helper'),
      button('Download native metadata projection', async () => {
        try {
          const projection = await projectToNative(record, events());
          download(JSON.stringify(projection, null, 2), 'application/json', fileBase(record) + '.native-projection.json');
          status('Native metadata projection saved. It copies no author text and claims no compatibility or admission.');
        } catch (error) { status(error.message); }
      }));
    box.append(tech);
  }

  function renderLibrary() {
    const list = $('context-list'), all = allEntries(), index = deriveIndexes(all);
    const search = String($('context-search').value || '').trim().toLocaleLowerCase();
    const facetSelect = $('context-facet-filter'), facet = facetSelect.value;
    facetSelect.replaceChildren(option('', 'All facets'));
    for (const key of [...index.byFacet.keys()].sort()) facetSelect.append(option(key, key));
    facetSelect.value = index.byFacet.has(facet) ? facet : '';
    const groups = new Map();
    for (const entry of all) groups.set(entry.record.id, [...(groups.get(entry.record.id) || []), entry]);
    const rows = [...groups.values()].map(v => v.sort((a, b) => b.record.version - a.record.version)).sort((a, b) => byName(a[0], b[0]));
    list.replaceChildren();
    let shown = 0;
    for (const versions of rows) {
      const latest = versions[0], keys = index.byFacet.get(facetSelect.value) || [];
      if (search && !versions.some(v => v.model.name.toLocaleLowerCase().includes(search))) continue;
      if (facetSelect.value && !versions.some(v => keys.includes(pinnedKey(v.record)))) continue;
      const selected = versions.some(v => pinnedKey(v.record) === selectedKey);
      const life = lifecycleSummary(events(), latest.record);
      const item = button('', () => { selectedKey = pinnedKey(latest.record); renderLibrary(); $('context-detail').focus(); }, 'context-item' + (selected ? ' selected' : ''));
      item.setAttribute('aria-pressed', String(selected));
      item.append(el('strong', latest.model.name), el('span', ' v' + latest.record.version + (versions.length > 1 ? ' (' + versions.length + ' versions)' : '') + ' · ' + releaseText(latest.model) + ' · ' + formatBytes(latest.record.bytes) + ' bytes' + (latest.model.parents.length ? ' · narrower' : '') + (life.revoked ? ' · withdrawn' : '') + (inLibrary(latest.record) ? '' : ' · from this record')));
      list.append(item);
      shown++;
    }
    if (!shown) list.append(el('p', 'No contexts match.', 'empty'));
    $('context-budget').value = library.policy.definitionByteBudget ?? '';
    renderDetail();
  }

  async function exportPackage(starts, name) {
    const needed = new Map();
    for (const start of starts) for (const e of safeCascade(start).order) needed.set(pinnedKey(e.record), e.record);
    const records = [...needed.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : a.version - b.version));
    const hashes = new Set(records.map(r => r.sha256)), included = events().filter(e => hashes.has(e.sha256));
    const pkg = await sealPackage(records, included);
    download(JSON.stringify(pkg, null, 2), 'application/json', name + '.context-package.json');
    status('Exported ' + records.length + ' definition(s) with their broader contexts and ' + included.length + ' review record(s). The file is for exchange; nothing was published or released.');
  }

  // Editor

  function choiceRow(target, entry, checked, disabledReason) {
    const label = el('label', undefined, 'choice'), box = make('input');
    box.type = 'checkbox'; box.value = pinnedKey(entry.record); box.checked = checked; box.disabled = !!disabledReason;
    box.onchange = updateEditorSize;
    label.append(box, el('span', describeVersion(entry) + ' · ' + releaseText(entry.model).toLowerCase() + (disabledReason ? ' · ' + disabledReason : '')));
    target.push({ box, entry });
    return label;
  }

  function renderEditorChoices() {
    const own = editor.mode === 'revise' ? editor.base.record.id : null;
    const pinned = editor.mode === 'revise' || editor.mode === 'adapt' ? editor.base.model : { parents: editor.mode === 'derive' ? [pinOf(editor.base.record)] : [], compositions: [] };
    const all = allEntries().filter(e => e.record.id !== own);
    const latest = new Map();
    for (const e of all) if (!latest.has(e.record.id) || latest.get(e.record.id).record.version < e.record.version) latest.set(e.record.id, e);
    for (const [listId, kind, pins] of [['ctx-parent-list', 'parents', pinned.parents], ['ctx-composition-list', 'compositions', pinned.compositions]]) {
      const target = $(listId);
      target.replaceChildren();
      editorChoices[kind] = [];
      const shown = [...latest.values(), ...all.filter(e => pins.some(p => samePin(p, e.record)) && latest.get(e.record.id) !== e)].sort(byName);
      for (const entry of shown) {
        const life = lifecycleSummary(events(), entry.record), budget = byteBudgetStatus(entry.record.bytes, library.policy);
        target.append(choiceRow(editorChoices[kind], entry, pins.some(p => samePin(p, entry.record)), life.revoked ? 'withdrawn' : budget.ok ? null : 'over the byte budget'));
      }
      if (!shown.length) target.append(el('p', 'No other contexts yet.', 'helper'));
    }
    const model = editor.mode === 'revise' || editor.mode === 'adapt' ? editor.base.model : null;
    for (const choice of editorChoices.facets) choice.box.checked = !!model?.facets.some(f => f.group === choice.group && f.value === choice.value);
    for (const choice of editorChoices.emphasis) choice.box.checked = !!model?.emphasis.includes(choice.value);
    $('ctx-facets-other').value = model ? model.facets.filter(f => !(FACET_CHOICES[f.group] || []).includes(f.value)).map(f => f.group + ': ' + f.value).join('\n') : '';
    for (const [op, input] of Object.entries(editorChoices.operations)) input.value = model?.operations.find(o => o.op === op)?.value ?? '';
  }

  function openEditor(mode, base = null) {
    const model = mode === 'revise' || mode === 'adapt' ? base.model : null;
    if (model && [...model.rules, ...model.hints, ...model.concepts.map(c => c.meaning)].some(t => t.includes('\n'))) { status('This definition has entries that span several lines. This form edits one entry per line, so revise its definition text and open it as a file instead.'); return; }
    editor = { mode, base, newId: mode === 'revise' ? null : newContextId() };
    $('context-editor').hidden = false;
    $('context-editor-heading').textContent = { new: 'Create a context', derive: 'Derive a narrower context from ' + (base && describeVersion(base)), revise: 'Revise ' + (base && base.model.name) + ' as version ' + (base && base.record.version + 1), adapt: 'Start a new context from ' + (base && describeVersion(base)) }[mode];
    $('context-editor-intro').textContent = { new: 'Write the meaning in your own words. Facets, concepts and rules are optional, and nothing is shortened to fit.', derive: 'The new context reads within its broader context, pinned to that exact version and hash. Describe only what is narrower here.', revise: 'A revision is a new version with its own hash. Version ' + (base && base.record.version) + ' and its reviews stay unchanged; the new version starts with no reviews.', adapt: 'A copy with its own ID. It records where it was adapted from and starts with no reviews.' }[mode];
    if (base && base.model.format !== CURRENT_FORMAT) $('context-editor-intro').textContent += ' The new definition is written in the current format, ' + CURRENT_FORMAT + ', with filing facets in the header; ' + describeVersion(base) + ' keeps its original bytes and hash.';
    $('ctx-name').value = model ? (mode === 'adapt' ? (model.name + ' (adapted)').slice(0, 120) : model.name) : '';
    $('ctx-meaning').value = model?.meaning || '';
    $('ctx-author').value = getState().draft.contributor || lastAuthor;
    $('ctx-provenance').value = mode === 'revise' ? model.provenance : mode === 'adapt' ? 'Adapted from ' + describeVersion(base) + '.' : mode === 'derive' ? 'Narrows ' + describeVersion(base) + '.' : '';
    $('ctx-concepts').value = model ? model.concepts.map(c => c.term + ': ' + c.meaning).join('\n') : '';
    $('ctx-rules').value = model ? model.rules.join('\n') : '';
    $('ctx-hints').value = model ? model.hints.join('\n') : '';
    $('ctx-references').value = model ? model.references.map(r => [r.label, r.url, r.locator].join(' | ')).join('\n') : '';
    $('ctx-reason').value = '';
    $('ctx-reason-label').hidden = mode !== 'revise';
    $('ctx-error').hidden = true;
    $('ctx-preview-text').textContent = '';
    renderEditorChoices();
    updateEditorSize();
    showPanel('contexts');
    $('ctx-name').focus();
  }

  function closeEditor() { editor = null; $('context-editor').hidden = true; }

  function collectEditor() {
    const lines = id => String($(id).value || '').split('\n').map(x => x.trim()).filter(Boolean);
    const split = (line, message) => { const at = line.indexOf(':'); if (at < 1) throw Error(message); return [line.slice(0, at).trim(), line.slice(at + 1).trim()]; };
    const facets = editorChoices.facets.filter(c => c.box.checked).map(c => ({ group: c.group, value: c.value }));
    for (const line of lines('ctx-facets-other')) {
      const [group, value] = split(line, 'Write each additional facet as group: value.');
      const key = group.toLowerCase();
      if (!Object.hasOwn(FACET_GROUPS, key)) throw Error('Unknown facet group "' + group.slice(0, 40) + '". Use one of: ' + Object.keys(FACET_GROUPS).join(', ') + '.');
      facets.push({ group: key, value });
    }
    const concepts = lines('ctx-concepts').map(line => { const [term, meaning] = split(line, 'Write each active concept as term: meaning.'); return { term, meaning }; });
    const references = lines('ctx-references').map(line => {
      const parts = line.split('|').map(x => x.trim());
      if (parts.length > 3) throw Error('Write each reference as label | link | location.');
      return { label: parts[0] || '', url: parts[1] || '', locator: parts[2] || '' };
    });
    const operations = [];
    for (const [op, input] of Object.entries(editorChoices.operations)) { const raw = String(input.value ?? '').trim(); if (raw !== '') operations.push({ op, value: Number(raw) }); }
    checkOperations(operations);
    return {
      form: { name: $('ctx-name').value, meaning: $('ctx-meaning').value, author: $('ctx-author').value, provenance: $('ctx-provenance').value, facets, emphasis: editorChoices.emphasis.filter(c => c.box.checked).map(c => c.value), concepts, rules: lines('ctx-rules'), hints: lines('ctx-hints'), references, operations, revisionReason: $('ctx-reason').value },
      parents: editorChoices.parents.filter(c => c.box.checked).map(c => c.entry),
      compositions: editorChoices.compositions.filter(c => c.box.checked).map(c => c.entry),
    };
  }

  function updateEditorSize() {
    if (!editor) return;
    try {
      const { form, parents, compositions } = collectEditor();
      const text = serializeDefinition(draftModel({ mode: editor.mode, base: editor.base, form, parents, compositions, newId: editor.newId }));
      const budget = byteBudgetStatus(utf8Bytes(text), library.policy);
      $('ctx-size').textContent = budget.ok ? 'Measured definition size: ' + budget.message + '.' : budget.message + ' Saving is refused until it fits.';
    } catch (error) { $('ctx-size').textContent = 'The measured size appears when the required fields are complete. ' + error.message; }
  }

  async function saveEditor() {
    try {
      if (!editor) return;
      const { form, parents, compositions } = collectEditor();
      const draft = await draftContext({ mode: editor.mode, base: editor.base, form, parents, compositions, newId: editor.newId, policy: library.policy });
      const result = await updateLibrary(() => mergeIntoLibrary(library, entries, { definitions: [draft.record], events: [] }, { policy: library.policy, enforceBudget: true, origin: 'created' }));
      
      const note = saveLibrary();
      lastAuthor = draft.model.author;
      selectedKey = pinnedKey(draft.record);
      closeEditor(); renderLibrary(); renderReading();
      status('Saved ' + describeVersion(draft) + ' · ' + formatBytes(draft.record.bytes) + ' bytes · SHA-256 ' + shortHash(draft.record.sha256) + '. It is a proposed personal context, and no reviews carry over to it.' + note);
      $('context-detail').focus();
    } catch (error) { $('ctx-error').hidden = false; $('ctx-error').textContent = 'Not saved. ' + error.message; }
  }

  // One-time wiring of static controls.
  const fill = (id, table) => { const node = $(id); node.replaceChildren(); for (const [value, label] of Object.entries(table)) node.append(option(value, label)); };
  fill('facet-group', ENTITY_GROUPS); fill('facet-basis', ENTITY_BASES); fill('date-kind', DATE_KINDS); fill('date-basis', DATE_BASES);
  fill('assertion-relation', RELATIONS); fill('assertion-uncertainty', UNCERTAINTY);
  const facetBox = $('ctx-facet-choices');
  facetBox.replaceChildren();
  for (const [group, values] of Object.entries(FACET_CHOICES)) for (const value of values) {
    const label = el('label', undefined, 'choice'), box = make('input');
    box.type = 'checkbox'; box.onchange = updateEditorSize;
    label.append(box, el('span', FACET_GROUPS[group] + ': ' + value));
    editorChoices.facets.push({ box, group, value });
    facetBox.append(label);
  }
  const emphasisBox = $('ctx-emphasis');
  emphasisBox.replaceChildren();
  for (const value of FIVE_W_ONE_H) {
    const label = el('label', undefined, 'choice'), box = make('input');
    box.type = 'checkbox'; box.onchange = updateEditorSize;
    label.append(box, el('span', value));
    editorChoices.emphasis.push({ box, value });
    emphasisBox.append(label);
  }
  const operationBox = $('ctx-operations');
  operationBox.replaceChildren();
  for (const [op, spec] of Object.entries(LENS_OPERATIONS)) {
    const input = control('input', 'ctx-op-' + op, { type: 'number', min: String(spec.min), max: String(spec.max), step: '1', placeholder: 'Not set (' + spec.min + '–' + spec.max + ')' });
    input.addEventListener('input', updateEditorSize);
    editorChoices.operations[op] = input;
    operationBox.append(field(spec.label, input));
  }
  for (const id of ['ctx-name', 'ctx-meaning', 'ctx-author', 'ctx-provenance', 'ctx-facets-other', 'ctx-concepts', 'ctx-rules', 'ctx-hints', 'ctx-references', 'ctx-reason']) $(id).addEventListener('input', updateEditorSize);

  $('reading-context-select').onchange = () => selectForDraft($('reading-context-select').value);
  $('reading-context-apply').onclick = () => {
    const state = getState(), ref = state.context.readingContext, entry = ref && lookup(ref);
    if (!entry || !entry.model.operations.length) return;
    checkOperations(entry.model.operations);
    applyOperations(entry.model.operations);
    state.context.readingContext = { ...ref, appliedOperations: structuredClone(entry.model.operations), appliedAt: new Date().toISOString() };
    persist(); renderReading();
    notify('View settings applied from the context and recorded with your next reading. Source bytes are unchanged.');
  };
  $('reading-context-open').onclick = () => {
    const ref = getState().context.readingContext;
    if (ref && lookup(ref)) selectedKey = pinnedKey(ref);
    showPanel('contexts'); renderLibrary();
  };
  $('add-facet').onclick = () => facetAction('entities', { group: $('facet-group').value, label: $('facet-label').value, basis: $('facet-basis').value, locator: $('facet-locator').value, identityKey: $('facet-identity').value }, ['facet-label', 'facet-locator', 'facet-identity']);
  $('add-date').onclick = () => facetAction('dates', { kind: $('date-kind').value, value: $('date-value').value, basis: $('date-basis').value, locator: $('date-locator').value }, ['date-value', 'date-locator']);
  $('add-format').onclick = () => facetAction('formats', { value: $('declared-format').value, basis: 'declared' }, ['declared-format']);
  $('record-measured-format').onclick = () => { if (measured?.signature && measured.sha256 === getState().sourceImage?.sha256) facetAction('formats', { value: measured.signature, basis: 'measured_content_signature' }, []); };
  $('facet-filter').onchange = renderFilterResults;
  $('assertion-reading').onchange = renderAssertionEntries;
  $('add-assertion').onclick = () => {
    const state = getState();
    try {
      const record = addAssertion(state, { revisionId: $('assertion-reading').value, subjectId: $('assertion-subject').value, relation: $('assertion-relation').value, objectId: $('assertion-object').value || null, externalKey: $('assertion-external').value, assertedBy: $('assertion-by').value, locator: $('assertion-locator').value, reason: $('assertion-reason').value, uncertainty: $('assertion-uncertainty').value });
      if (!append('assertions', record)) return;
      persist(); renderRecordViews();
      for (const id of ['assertion-external', 'assertion-locator', 'assertion-reason']) $(id).value = '';
      notify('Relationship recorded as a proposal with your attribution. It is not independently verified.');
    } catch (error) { notify(error.message); }
  };
  $('save-assertion-review').onclick = () => {
    try {
      const review = addAssertionReview(getState(), { assertionId: $('assertion-review-target').value, reviewer: $('assertion-reviewer').value, role: $('assertion-review-role').value, decision: $('assertion-decision').value, reason: $('assertion-review-reason').value });
      if (!append('assertionReviews', review)) return;
      persist(); renderRecordViews();
      $('assertion-review-reason').value = '';
      notify('Relationship review recorded. Disagreement stays visible.');
    } catch (error) { notify(error.message); }
  };
  $('context-new').onclick = () => openEditor('new');
  $('ctx-cancel').onclick = () => { closeEditor(); status('Nothing was saved.'); };
  $('ctx-save').onclick = saveEditor;
  $('ctx-preview').onclick = () => {
    try {
      const { form, parents, compositions } = collectEditor();
      const text = serializeDefinition(draftModel({ mode: editor.mode, base: editor.base, form, parents, compositions, newId: editor.newId }));
      $('ctx-preview-text').textContent = text;
      $('ctx-preview-panel').open = true;
      $('ctx-error').hidden = true;
    } catch (error) { $('ctx-error').hidden = false; $('ctx-error').textContent = error.message; }
  };
  $('context-search').addEventListener('input', renderLibrary);
  $('context-facet-filter').onchange = renderLibrary;
  $('context-import-button').onclick = () => $('context-import-file').click();
  $('context-import-file').onchange = async event => {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    try {
      if (file.size > MAX_PACKAGE_BYTES) throw Error('Choose a context file under 2 MB.');
      const before = new Set(entries.map(e => pinnedKey(e.record)));
      const text = await file.text();
      const result = await updateLibrary(() => importContextFile(text, library, entries));
      
      const note = saveLibrary();
      const added = entries.find(e => !before.has(pinnedKey(e.record)));
      if (added) selectedKey = pinnedKey(added.record);
      await refreshDraftStatus(); renderLibrary(); renderReading();
      status('Opened ' + file.name + ': ' + result.added.definitions + ' new definition(s) and ' + result.added.events + ' review record(s). Hashes and structure verified; names and reviews remain self-declared.' + note);
    } catch (error) { status('Nothing was imported. ' + error.message); }
  };
  $('context-export-library').onclick = async () => {
    const personal = entries.filter(e => e.model.releaseLabel !== 'starter_example');
    if (!personal.length) { status('You have no personal contexts yet. Starter examples ship with the form.'); return; }
    await exportPackage(personal, 'reckoner-contexts');
  };
  $('context-budget-apply').onclick = async () => {
    try {
      const raw = String($('context-budget').value ?? '').trim();
      const policy = normalizePolicy({ definitionByteBudget: raw === '' ? null : Number(raw) });
      await updateLibrary(async () => ({ library: { ...library, policy }, entries }));
      const note = saveLibrary();
      await refreshDraftStatus();
      renderLibrary(); renderReading();
      const budget = library.policy.definitionByteBudget;
      status((budget === null ? 'No byte budget: each definition may use up to 65,536 bytes.' : 'Byte budget set to ' + formatBytes(budget) + ' UTF-8 bytes. Larger definitions stay unchanged but cannot be saved or chosen for new readings.') + note);
    } catch (error) { status(error.message); }
  };

  // A typed lens name resolves through the derived name index to one exact version, or asks for a choice.
  async function matchLensName() {
    const out = $('lens-name-match'), name = String($('lens').value || '').trim();
    out.replaceChildren();
    if (!name) return;
    const result = await resolveLens(cache, store(), { name });
    if (String($('lens').value || '').trim() !== name) return;
    out.replaceChildren();
    if (result.status === 'ok') out.append(el('span', 'Matches the context ' + describeVersion(result.entry) + ' (SHA-256 ' + shortHash(result.entry.record.sha256) + '). '), button('Use this exact version for the reading', () => selectForDraft(pinnedKey(result.entry.record))));
    else if (result.reason === 'ambiguous') out.append(el('span', 'Several context versions have exactly this name. Choose the exact version under Reading context.'));
    else if (result.reason === 'unknown') out.append(el('span', 'No context in your library has exactly this name. It stays a free-text note.'));
    else out.append(el('span', 'A context has this name but needs a fresh check: ' + result.message));
  }
  $('lens').addEventListener('input', () => { matchLensName().catch(() => {}); });

  function render() {
    renderReading(); renderFacets(); renderRecordViews(); renderLibrary();
    refreshDraftStatus().then(() => renderReading()).catch(() => {});
    matchLensName().catch(() => {});
  }

  return {
    render, renderReading, renderFacets, renderRecordViews, renderLibrary, syncRecord, absorbRecord, prepareForSave,
    noteSource(buffer, sha256) { measured = { signature: sniffFormat(buffer), sha256 }; renderFacets(); },
    readingsCsv: () => readingsCsv(getState(), readingStatus),
    describeRef(ref) {
      const entry = lookup(ref), carried = (getState().contextDefinitions || []).some(d => samePin(d, ref));
      const withdrawn = [library.events, getState().contextEvents || []].some(list => list.some(e => e.type === 'revocation' && e.sha256 === ref.sha256 && e.contextId === ref.id && e.version === ref.version));
      return 'Reading context: ' + ref.name + ' v' + ref.version + ' · SHA-256 ' + shortHash(ref.sha256) + ' · ' + (carried ? 'definition carried in this record' : entry ? 'definition in your library, not yet carried' : 'definition not available') + (withdrawn ? ' · withdrawn since' : '') + (ref.appliedOperations.length ? ' · view settings applied' : '');
    },
    handoffDefinition() {
      const ref = getState().context.readingContext, entry = ref && lookup(ref);
      return entry ? { id: entry.record.id, version: entry.record.version, sha256: entry.record.sha256, text: entry.record.text } : null;
    },
    // Used by the real-report walkthrough to start from a starter context.
    preselect(target, name) {
      const entry = latestStarter(starters, name);
      if (!entry) return false;
      const { order } = cascade(entry, pin => starters.find(s => samePin(s.record, pin)) || null);
      if (order.some(e => !byteBudgetStatus(e.record.bytes, library.policy).ok || lifecycleSummary(library.events, e.record).revoked)) return false;
      target.context.readingContext = readingContextRef(entry);
      target.contextDefinitions = order.map(e => portableRecord(e.record));
      target.contextEvents = library.events.filter(e => order.some(o => o.record.sha256 === e.sha256));
      return true;
    },
  };
}
