import { recordFromText, policyFingerprint, pinnedKey, pinOf, cascade, byteBudgetStatus, lifecycleSummary } from './contexts.js';

// Named lenses resolve to an exact ID, version and content hash. A validated
// parse is cached under that full key plus the policy in force. Withdrawal,
// ancestors, budget and model evidence are checked on every resolution.

export const RECHECK_REASONS = Object.freeze({
  unknown: 'No context with that name or reference is available here. Open the context file that defines it.',
  ambiguous: 'More than one context version matches. Choose an exact version.',
  changed: 'The stored text does not match the pinned hash, so it must be checked again before use.',
  changed_broader: 'A broader context it depends on does not match its pinned hash.',
  missing_broader: 'A broader or composed context it depends on is not available. Open it first; nothing is substituted.',
  cycle: 'Its broader contexts form a cycle.',
  revoked: 'This version has been withdrawn.',
  revoked_broader: 'A broader context it depends on has been withdrawn.',
  over_budget: 'It exceeds the configured byte budget.',
  model_check_not_current: 'No current model check evidence exists for this model, so the context cannot be relied on for model use.',
});

export class LensCache {
  #entries = new Map();
  constructor() { this.stats = { hits: 0, misses: 0 }; }
  get size() { return this.#entries.size; }
  clear() { this.#entries.clear(); }
  // Returns {model, cacheHit} or {changed: true}. A hit requires the exact
  // validated text and the same policy fingerprint.
  async validate(stored, policy) {
    const key = pinnedKey(stored), fingerprint = policyFingerprint(policy), cached = this.#entries.get(key);
    if (cached && cached.text === stored.text && cached.fingerprint === fingerprint) {
      this.stats.hits++;
      return { model: cached.model, cacheHit: true };
    }
    this.stats.misses++;
    this.#entries.delete(key);
    let fresh;
    try { fresh = await recordFromText(stored.text, policy, { enforceBudget: false }); } catch { return { changed: true }; }
    if (fresh.record.sha256 !== stored.sha256 || fresh.record.id !== stored.id || fresh.record.version !== stored.version) return { changed: true };
    this.#entries.set(key, { text: stored.text, model: fresh.model, fingerprint });
    return { model: fresh.model, cacheHit: false };
  }
}

// Derived indexes: projections of validated definitions, never edited directly.
export function deriveIndexes(entries) {
  const byName = new Map(), byFacet = new Map(), byId = new Map(), dependents = new Map();
  const add = (map, key, value) => { const list = map.get(key) || []; if (!list.includes(value)) list.push(value); map.set(key, list); };
  for (const { record, model } of entries) {
    const key = pinnedKey(record);
    add(byName, model.name, key);
    add(byId, record.id, key);
    for (const facet of model.facets) add(byFacet, facet.group + ': ' + facet.value, key);
    for (const pin of [...model.parents, ...model.compositions]) add(dependents, pinnedKey(pin), key);
  }
  return { byName, byFacet, byId, dependents };
}

const recheck = (reason, details = {}) => ({ status: 'recheck', reason, message: details.message || RECHECK_REASONS[reason], ...details });
const findExact = (definitions, pin) => definitions.find(d => d.id === pin.id && d.version === pin.version && d.sha256 === pin.sha256) || null;

// store: {definitions: [{id, version, sha256, bytes, text}], events, policy, index}
// query: {name} | {id, version} | {id, version, sha256}; options: {model} for model use.
export async function resolveLens(cache, store, query, { model = null } = {}) {
  const definitions = store.definitions, policy = store.policy, events = store.events || [];
  let pin, resolvedFrom;
  if (typeof query?.name === 'string') {
    const keys = store.index.byName.get(query.name) || [];
    if (!keys.length) return recheck('unknown');
    if (keys.length > 1) return recheck('ambiguous', { candidates: keys });
    pin = definitions.find(d => pinnedKey(d) === keys[0]);
    if (!pin) return recheck('unknown');
    resolvedFrom = 'name';
  } else if (query?.sha256 === undefined) {
    const matches = definitions.filter(d => d.id === query?.id && d.version === query?.version);
    if (!matches.length) return recheck('unknown');
    if (new Set(matches.map(d => d.sha256)).size > 1) return recheck('ambiguous', { candidates: matches.map(pinnedKey) });
    pin = matches[0];
    resolvedFrom = 'id_version';
  } else {
    pin = query;
    resolvedFrom = 'pinned_hash';
  }
  const stored = findExact(definitions, pin);
  if (!stored) return definitions.some(d => d.id === pin.id && d.version === pin.version) ? recheck('changed') : recheck('unknown');
  const startKey = pinnedKey(stored), validated = new Map(), queue = [stored];
  let cacheHit = false;
  while (queue.length) {
    const item = queue.pop(), key = pinnedKey(item);
    if (validated.has(key)) continue;
    const result = await cache.validate(item, policy);
    if (result.changed) return recheck(key === startKey ? 'changed' : 'changed_broader', { at: pinOf(item) });
    if (key === startKey) cacheHit = result.cacheHit;
    validated.set(key, { record: { id: item.id, version: item.version, sha256: item.sha256, bytes: item.bytes, text: item.text }, model: result.model });
    for (const link of [...result.model.parents, ...result.model.compositions]) {
      const found = findExact(definitions, link);
      if (found) queue.push(found);
    }
  }
  let order, missing;
  try { ({ order, missing } = cascade(validated.get(startKey), link => validated.get(pinnedKey(link)) || null)); }
  catch (error) { return recheck('cycle', { message: error.message }); }
  if (missing.length) return recheck('missing_broader', { missing });
  for (const entry of order) {
    if (lifecycleSummary(events, entry.record).revoked) return recheck(pinnedKey(entry.record) === startKey ? 'revoked' : 'revoked_broader', { at: pinOf(entry.record) });
    const budget = byteBudgetStatus(entry.record.bytes, policy);
    if (!budget.ok) return recheck('over_budget', { at: pinOf(entry.record), message: '"' + entry.model.name + '": ' + budget.message });
  }
  const entry = validated.get(startKey);
  if (model) {
    const life = lifecycleSummary(events, entry.record, { model });
    if (life.modelGate !== 'pass_recorded_elsewhere') return recheck('model_check_not_current', { modelGate: life.modelGate });
  }
  return { status: 'ok', entry, cascade: order, cacheHit, resolvedFrom, pin: pinOf(entry.record) };
}
