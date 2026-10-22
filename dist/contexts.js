// Public reading contexts (lenses). The canonical definition is a readable
// CycL subset that is parsed, never executed. Lists, facets and indexes are
// projections of that text; its UTF-8 bytes and SHA-256 identify a version.

// v0.1 keeps its original section order and exact bytes. v0.2 follows the native
// six-section order and keeps each assertion on one line. v0.3 also moves filing
// and discovery facets into the section 1 header. New versions use v0.3; an
// earlier version is never re-serialized or relabelled.
export const LEGACY_FORMAT = 'reckoner.context.cycl.v0.1';
export const FORMAT_V02 = 'reckoner.context.cycl.v0.2';
export const FORMAT_V03 = 'reckoner.context.cycl.v0.3';
export const CURRENT_FORMAT = FORMAT_V03;
export const CONTEXT_FORMATS = Object.freeze([LEGACY_FORMAT, FORMAT_V02, CURRENT_FORMAT]);
export const CONTEXT_FORMAT = CURRENT_FORMAT;
export const FORMAT_NOTES = Object.freeze({
  [LEGACY_FORMAT]: 'the earlier public section order, with identity before the header',
  [FORMAT_V02]: 'the native six-section order, with facets after identity in section 2',
  [CURRENT_FORMAT]: 'the native six-section order, with filing and discovery facets in the section 1 header',
});
const FORMAT_LIST = CONTEXT_FORMATS.slice(0, -1).join(', ') + ' and ' + CONTEXT_FORMATS.at(-1);
export const PROJECTION_MARK = ';;; Reckoner native-aligned projection';
export const PACKAGE_SCHEMA = 'reckoner.context_package.v0.1';
export const LIBRARY_SCHEMA = 'reckoner.context_library.v0.1';
export const SIDECAR_SCHEMA = 'reckoner.context_sidecar.v0.1';
export const BITNET_FLAG_SCHEMA = 'reckoner.bitnet_flags.v0.1';
export const HARD_MAX_DEFINITION_BYTES = 65536;
export const MIN_BYTE_BUDGET = 256;
export const MAX_PACKAGE_BYTES = 2 * 1024 * 1024;
export const LIBRARY_LIMITS = Object.freeze({ definitions: 300, events: 3000 });
const MAX_VERSION = 100000;

const ID = /^ctx:[a-z0-9][a-z0-9:._-]{2,120}$/;
const SYMBOL = /^[A-Za-z][A-Za-z0-9_-]{0,99}$/;
const HASH = /^[a-f0-9]{64}$/;
const ISO_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const CONTROL = /[\u0000-\u0008\u000b-\u001f\u007f]/;
const BIDI = /[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/;

export const FACET_GROUPS = Object.freeze({ work: 'Kind of work', media: 'Media or format', domain: 'Subject area', audience: 'Audience', language: 'Language', other: 'Other' });
export const FIVE_W_ONE_H = Object.freeze(['who', 'what', 'when', 'where', 'why', 'how']);
export const RELEASE_LABELS = Object.freeze({ personal: 'Personal context', starter_example: 'Starter example' });
export const PROVENANCE_BASES = Object.freeze({ newly_authored: 'Newly written', derived_narrower: 'Derived as a narrower context', adapted_copy: 'Adapted from another context', revision: 'Revision of an earlier version' });
// The only operations a lens may request. Each is a bounded display setting.
export const LENS_OPERATIONS = Object.freeze({
  imageZoomPercent: Object.freeze({ min: 50, max: 300, label: 'Image zoom (%)' }),
  imageBrightnessPercent: Object.freeze({ min: 50, max: 200, label: 'Image brightness (%)' }),
  imageContrastPercent: Object.freeze({ min: 50, max: 250, label: 'Image contrast (%)' }),
  surroundingBackgroundPercent: Object.freeze({ min: 10, max: 100, label: 'Surrounding background (%)' }),
  readingTextSizePx: Object.freeze({ min: 12, max: 32, label: 'Reading text size (px)' }),
  readingLineSpacingPercent: Object.freeze({ min: 120, max: 240, label: 'Reading line spacing (%)' }),
});
export const EVENT_TYPES = Object.freeze({ blessing: 'Human blessing', mentor_check: 'Mentor or reviewer check', revocation: 'Withdrawal', gate_evidence: 'Model check evidence', promotion: 'Promotion claim for a model', ratification: 'Independent ratification claim' });
// The browser may record only these. Model evidence, promotion and ratification arrive from elsewhere.
export const BROWSER_EVENT_TYPES = Object.freeze(['blessing', 'mentor_check', 'revocation']);
export const BITNET_FLAGS = Object.freeze(['scoring', 'comprehension', 'suitability', 'verification']);

function fail(message) { throw Error(message); }
const capitalized = text => text[0].toUpperCase() + text.slice(1);
export const formatBytes = n => Number(n).toLocaleString('en-US');

function wellFormed(value) {
  if (typeof value.isWellFormed === 'function') return value.isWellFormed();
  for (let i = 0; i < value.length; i++) {
    const c = value.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) { const n = value.charCodeAt(i + 1); if (!(n >= 0xdc00 && n <= 0xdfff)) return false; i++; }
    else if (c >= 0xdc00 && c <= 0xdfff) return false;
  }
  return true;
}

export function checkText(value, label, max, { multiline = true, optional = false } = {}) {
  if (typeof value !== 'string') fail('Add ' + label + '.');
  if (!value) { if (optional) return; fail('Add ' + label + '.'); }
  if (value !== value.trim()) fail('Remove spaces at the start or end of ' + label + '.');
  if (value.length > max) fail('Keep ' + label + ' to ' + formatBytes(max) + ' characters or fewer.');
  if (value.includes('\r') || CONTROL.test(value) || !wellFormed(value)) fail(capitalized(label) + ' contains a control character or invalid Unicode.');
  if (!multiline && (/[\n\u2028\u2029]/.test(value) || BIDI.test(value))) fail(capitalized(label) + ' must be one line without text-direction override characters.');
}

export function checkUrl(value, label) {
  if (value === '') return;
  checkText(value, label, 2000, { multiline: false });
  let url;
  try { url = new URL(value); } catch { fail(capitalized(label) + ' must be a complete http or https link.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) fail(capitalized(label) + ' must be an http or https link without embedded login details.');
}

export function checkTime(value, label) {
  if (typeof value !== 'string' || !ISO_TIME.test(value) || !Number.isFinite(Date.parse(value))) fail('Invalid ' + label + ': use an ISO 8601 UTC time.');
}

export function checkPin(pin, label = 'context reference') {
  if (!pin || typeof pin !== 'object' || !ID.test(pin.id) || !Number.isSafeInteger(pin.version) || pin.version < 1 || pin.version > MAX_VERSION || !HASH.test(pin.sha256)) fail('Invalid ' + label + ': it needs a context ID, version and SHA-256 hash.');
}

export const definitionKey = d => d.id + '@' + d.version;
export const pinnedKey = d => d.id + '@' + d.version + '#sha256:' + d.sha256;
export const pinOf = d => ({ id: d.id, version: d.version, sha256: d.sha256 });
export const samePin = (a, b) => !!a && !!b && a.id === b.id && a.version === b.version && a.sha256 === b.sha256;
export const modelFingerprint = m => m.id + '@' + m.version + (m.weightsSha256 ? '#weights:' + m.weightsSha256 : '');
const samePerson = (a, b) => a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();
export const utf8Bytes = text => new TextEncoder().encode(text).byteLength;

export function canonicalJson(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonicalJson(value[k])).join(',') + '}';
}

export async function sha256Hex(value) {
  const data = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', data))].map(x => x.toString(16).padStart(2, '0')).join('');
}

// Identity and naming

export function newContextId() { return 'ctx:' + crypto.randomUUID(); }

// A readable CycL constant tied to the context ID, stable across its versions.
export function contextSymbol(name, id) {
  const words = String(name).normalize('NFKD').replace(/[^\x00-\x7f]/g, '').split(/[^A-Za-z0-9]+/).filter(Boolean);
  let base = words.map(w => w[0].toUpperCase() + w.slice(1)).join('').slice(0, 40);
  if (!/^[A-Za-z]/.test(base)) base = 'Context' + base;
  const suffix = id.replace(/^ctx:/, '').replace(/[^a-z0-9]/g, '').slice(0, 8);
  return base + '_' + suffix + 'Mt';
}

// Policy: an optional byte budget, measured in UTF-8 bytes and never met by truncation.

export function normalizePolicy(policy) {
  const budget = policy?.definitionByteBudget ?? null;
  if (budget !== null && (!Number.isSafeInteger(budget) || budget < MIN_BYTE_BUDGET || budget > HARD_MAX_DEFINITION_BYTES)) fail('Choose a byte budget from ' + formatBytes(MIN_BYTE_BUDGET) + ' to ' + formatBytes(HARD_MAX_DEFINITION_BYTES) + ' bytes, or leave it empty.');
  return { definitionByteBudget: budget };
}

export function policyFingerprint(policy) {
  return canonicalJson({ formats: CONTEXT_FORMATS, hardMaxBytes: HARD_MAX_DEFINITION_BYTES, definitionByteBudget: policy?.definitionByteBudget ?? null });
}

export function byteBudgetStatus(bytes, policy) {
  const budget = policy?.definitionByteBudget ?? null;
  if (bytes > HARD_MAX_DEFINITION_BYTES) return { ok: false, budget, message: 'This definition measures ' + formatBytes(bytes) + ' bytes (UTF-8), above the ' + formatBytes(HARD_MAX_DEFINITION_BYTES) + '-byte maximum. Nothing was shortened. Shorten the wording yourself or split it into narrower contexts.' };
  if (budget !== null && bytes > budget) return { ok: false, budget, message: 'This definition measures ' + formatBytes(bytes) + ' bytes (UTF-8), above your configured budget of ' + formatBytes(budget) + ' bytes. Nothing was shortened. Shorten the wording yourself, move detail into a narrower context, or change the budget.' };
  return { ok: true, budget, message: formatBytes(bytes) + ' bytes (UTF-8)' + (budget !== null ? ' of a ' + formatBytes(budget) + '-byte budget' : '') };
}

export function checkByteBudget(bytes, policy) {
  const result = byteBudgetStatus(bytes, policy);
  if (!result.ok) fail(result.message);
  return result;
}

// Model

function checkSymbolPin(pin, self, label) {
  checkPin(pin, label);
  if (!SYMBOL.test(pin.symbol) || pin.symbol === 'Microtheory' || pin.symbol === self) fail('Invalid ' + label + ' constant.');
}

export function checkOperations(operations) {
  if (!Array.isArray(operations) || operations.length > Object.keys(LENS_OPERATIONS).length) fail('Invalid lens operation list.');
  const seen = new Set();
  for (const operation of operations) {
    const spec = LENS_OPERATIONS[operation?.op];
    if (!spec || !Object.hasOwn(LENS_OPERATIONS, operation.op)) fail('Unsupported lens operation "' + String(operation?.op).slice(0, 80) + '". Only the listed display settings can be applied; nothing else is executed.');
    if (seen.has(operation.op)) fail('Each lens operation may appear once.');
    if (!Number.isSafeInteger(operation.value) || operation.value < spec.min || operation.value > spec.max) fail(spec.label + ' must be a whole number from ' + spec.min + ' to ' + spec.max + '.');
    seen.add(operation.op);
  }
}

const OP_ORDER = Object.keys(LENS_OPERATIONS);
const GROUP_ORDER = Object.keys(FACET_GROUPS);
const byPin = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : a.version - b.version);
const byFacet = (a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group) || (a.value < b.value ? -1 : a.value > b.value ? 1 : 0);
const byOperation = (a, b) => OP_ORDER.indexOf(a.op) - OP_ORDER.indexOf(b.op);

export function validateModel(m) {
  if (!m || typeof m !== 'object') fail('Invalid context definition.');
  if (!CONTEXT_FORMATS.includes(m.format)) fail('Unsupported context format. This form reads ' + FORMAT_LIST + '.');
  if (!SYMBOL.test(m.symbol) || m.symbol === 'Microtheory') fail('Invalid context constant name.');
  if (!ID.test(m.id)) fail('Invalid context ID.');
  if (!Number.isSafeInteger(m.version) || m.version < 1 || m.version > MAX_VERSION) fail('Invalid context version.');
  checkText(m.name, 'a context name', 120, { multiline: false });
  for (const [list, label, max] of [[m.parents, 'broader context', 20], [m.compositions, 'composed context', 20]]) {
    if (!Array.isArray(list) || list.length > max) fail('Too many ' + label + ' links.');
    const ids = new Set();
    for (const pin of list) {
      checkSymbolPin(pin, m.symbol, label);
      if (pin.id === m.id) fail('A context cannot be narrower than, or composed of, itself.');
      if (ids.has(pin.id)) fail('Each ' + label + ' may be linked once.');
      ids.add(pin.id);
    }
  }
  if (m.parents.some(p => m.compositions.some(c => c.id === p.id))) fail('A context cannot be both a broader context and a composed context.');
  checkText(m.author, 'the author name or handle', 200, { multiline: false });
  checkTime(m.createdAt, 'creation time');
  if (!Object.hasOwn(RELEASE_LABELS, m.releaseLabel)) fail('Invalid release label.');
  if (!Object.hasOwn(PROVENANCE_BASES, m.basis)) fail('Invalid provenance basis.');
  checkText(m.provenance, 'where this definition comes from', 5000);
  if (m.adaptedFrom !== null) checkPin(m.adaptedFrom, 'adapted-from reference');
  if (m.revisionOf !== null) checkPin(m.revisionOf, 'earlier version reference');
  if (m.revisionReason !== null) checkText(m.revisionReason, 'the reason for this revision', 5000);
  if ((m.version > 1) !== (m.basis === 'revision')) fail('Only a revision has a version above 1, and every revision has one.');
  if (m.basis === 'revision' && (!m.revisionOf || m.revisionOf.id !== m.id || m.revisionOf.version !== m.version - 1 || m.revisionReason === null)) fail('A revision must name the immediately earlier version of the same context, its hash, and the reason for the change.');
  if (m.basis !== 'revision' && (m.revisionOf !== null || m.revisionReason !== null)) fail('Only a revision may name an earlier version.');
  if ((m.basis === 'adapted_copy') !== (m.adaptedFrom !== null)) fail('An adapted context must name the context it was adapted from, and only an adapted context may do so.');
  if (m.adaptedFrom && m.adaptedFrom.id === m.id) fail('An adapted context needs its own ID.');
  if (m.basis === 'derived_narrower' && !m.parents.length) fail('A narrower context needs a broader context.');
  checkText(m.meaning, 'the full meaning', 30000);
  if (!Array.isArray(m.facets) || m.facets.length > 100) fail('Too many facets.');
  const facetKeys = new Set();
  for (const facet of m.facets) {
    if (!facet || !Object.hasOwn(FACET_GROUPS, facet.group)) fail('Unknown facet group.');
    checkText(facet.value, 'a facet value', 80, { multiline: false });
    const key = facet.group + '\u0000' + facet.value;
    if (facetKeys.has(key)) fail('Each facet may appear once.');
    facetKeys.add(key);
  }
  if (!Array.isArray(m.emphasis) || m.emphasis.some(x => !FIVE_W_ONE_H.includes(x)) || new Set(m.emphasis).size !== m.emphasis.length) fail('Invalid 5W1H emphasis.');
  if (!Array.isArray(m.concepts) || m.concepts.length > 200) fail('Too many active concepts.');
  const terms = new Set();
  for (const concept of m.concepts) {
    checkText(concept?.term, 'a concept term', 200, { multiline: false });
    checkText(concept.meaning, 'the meaning of "' + concept.term + '"', 5000);
    if (terms.has(concept.term)) fail('The concept "' + concept.term + '" is defined twice.');
    terms.add(concept.term);
  }
  for (const [list, label] of [[m.rules, 'a rule'], [m.hints, 'a disambiguation hint']]) {
    if (!Array.isArray(list) || list.length > 200) fail('Too many entries for ' + label + '.');
    for (const item of list) checkText(item, label, 5000);
  }
  checkOperations(m.operations);
  if (!Array.isArray(m.references) || m.references.length > 100) fail('Too many references.');
  for (const reference of m.references) {
    checkText(reference?.label, 'a reference label', 300, { multiline: false });
    checkUrl(reference.url, 'a reference link');
    checkText(reference.locator, 'a reference location', 300, { multiline: false, optional: true });
  }
  return m;
}

const clean = value => (typeof value === 'string' ? value.replace(/\r\n?/g, '\n').trim() : value);

// Builds a model from form input. Facets are deduplicated; everything else keeps authored order.
export function buildDefinition(input) {
  const pin = p => ({ symbol: p.symbol, id: p.id, version: p.version, sha256: p.sha256 });
  const ref = p => (p ? { id: p.id, version: p.version, sha256: p.sha256 } : null);
  const facets = [];
  for (const f of input.facets || []) {
    const facet = { group: f.group, value: clean(f.value) };
    if (!facets.some(x => x.group === facet.group && x.value === facet.value)) facets.push(facet);
  }
  const model = {
    format: input.format ?? CURRENT_FORMAT, symbol: input.symbol, id: input.id, version: input.version,
    name: clean(input.name), parents: (input.parents || []).map(pin).sort(byPin),
    compositions: (input.compositions || []).map(pin).sort(byPin),
    author: clean(input.author), createdAt: input.createdAt,
    releaseLabel: input.releaseLabel || 'personal', basis: input.basis,
    provenance: clean(input.provenance), adaptedFrom: ref(input.adaptedFrom),
    revisionOf: ref(input.revisionOf), revisionReason: clean(input.revisionReason) || null,
    meaning: clean(input.meaning), facets: facets.sort(byFacet),
    emphasis: FIVE_W_ONE_H.filter(x => (input.emphasis || []).includes(x)),
    concepts: (input.concepts || []).map(c => ({ term: clean(c.term), meaning: clean(c.meaning) })),
    rules: (input.rules || []).map(clean),
    operations: (input.operations || []).map(o => ({ op: o.op, value: o.value })).sort(byOperation),
    hints: (input.hints || []).map(clean),
    references: (input.references || []).map(r => ({ label: clean(r.label), url: clean(r.url || ''), locator: clean(r.locator || '') })),
  };
  return validateModel(model);
}

// Canonical text

// v0.1 keeps line breaks inside text as written; v0.2 and later write them as \n.
const quote = (value, format) => {
  const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return '"' + (format === LEGACY_FORMAT ? escaped : escaped.replace(/\n/g, '\\n')) + '"';
};

const SECTION_TITLES = Object.freeze({
  [LEGACY_FORMAT]: Object.freeze(['Identity and inheritance', 'Header provenance', 'Active concepts', 'Rules', 'Disambiguation hints', 'References']),
  [FORMAT_V02]: Object.freeze(['Header: schema and provenance', 'Identity and inheritance, with 5W1H emphasis', 'Active concepts', 'Rules', 'Disambiguation hints', 'Doctrine references']),
  [CURRENT_FORMAT]: Object.freeze(['Header: schema, provenance and filing facets', 'Identity and inheritance, with 5W1H emphasis', 'Active concepts', 'Rules', 'Disambiguation hints', 'Doctrine references']),
});
export const sectionTitles = format => SECTION_TITLES[format];

export function serializeDefinition(m) {
  const S = m.symbol, q = value => quote(value, m.format), titles = SECTION_TITLES[m.format];
  const section = n => ';;; Section ' + n + '. ' + titles[n - 1];
  const schema = [`(contextFormat ${S} ${q(m.format)})`];
  const identity = [`(isa ${S} Microtheory)`, `(contextId ${S} ${q(m.id)})`, `(contextVersion ${S} ${m.version})`, `(contextName ${S} ${q(m.name)})`];
  const inheritance = [];
  for (const p of [...m.parents].sort(byPin)) inheritance.push(`(genlMt ${S} ${p.symbol})`, `(parentPin ${S} ${p.symbol} ${q(p.id)} ${p.version} ${q(p.sha256)})`);
  for (const c of [...m.compositions].sort(byPin)) inheritance.push(`(composesWith ${S} ${c.symbol})`, `(compositionPin ${S} ${c.symbol} ${q(c.id)} ${c.version} ${q(c.sha256)})`);
  const provenance = [`(contextAuthor ${S} ${q(m.author)})`, `(contextCreatedAt ${S} ${q(m.createdAt)})`, `(contextReleaseLabel ${S} ${q(m.releaseLabel)})`, `(provenanceBasis ${S} ${q(m.basis)})`, `(provenanceStatement ${S} ${q(m.provenance)})`];
  if (m.adaptedFrom) provenance.push(`(adaptedFrom ${S} ${q(m.adaptedFrom.id)} ${m.adaptedFrom.version} ${q(m.adaptedFrom.sha256)})`);
  if (m.revisionOf) provenance.push(`(revisionOf ${S} ${q(m.revisionOf.id)} ${m.revisionOf.version} ${q(m.revisionOf.sha256)})`, `(revisionReason ${S} ${q(m.revisionReason)})`);
  const meaning = [`(comment ${S} ${q(m.meaning)})`];
  const facets = [...m.facets].sort(byFacet).map(f => `(contextFacet ${S} ${q(f.group)} ${q(f.value)})`);
  const emphasis = FIVE_W_ONE_H.filter(x => m.emphasis.includes(x)).map(w => `(fiveWOneHEmphasis ${S} ${q(w)})`);
  const out = [';;; Reckoner public context definition', ';;; Readable CycL subset: declarative assertions only. Nothing in this file is executed.'];
  if (m.format === LEGACY_FORMAT) out.push(section(1), ...schema, ...identity, ...inheritance, section(2), ...provenance, ...meaning, ...facets, ...emphasis);
  else if (m.format === FORMAT_V02) out.push(section(1), ...schema, ...provenance, section(2), ...identity, ...meaning, ...inheritance, ...facets, ...emphasis);
  else out.push(section(1), ...schema, ...provenance, ...facets, section(2), ...identity, ...meaning, ...inheritance, ...emphasis);
  out.push(section(3), ...m.concepts.map(c => `(activeConcept ${S} ${q(c.term)} ${q(c.meaning)})`));
  out.push(section(4), ...m.rules.map(r => `(contextRule ${S} ${q(r)})`), ...[...m.operations].sort(byOperation).map(o => `(lensOperation ${S} ${q(o.op)} ${o.value})`));
  out.push(section(5), ...m.hints.map(h => `(disambiguationHint ${S} ${q(h)})`));
  out.push(section(6), ...m.references.map(r => `(contextReference ${S} ${q(r.label)} ${q(r.url)} ${q(r.locator)})`));
  return out.join('\n') + '\n';
}

// Strict parser: a flat token scan with no evaluation and no nesting.

const SIGNATURES = Object.freeze({
  contextFormat: ['str'], isa: ['sym'], contextId: ['str'], contextVersion: ['int'], contextName: ['str'],
  genlMt: ['sym'], parentPin: ['sym', 'str', 'int', 'str'], composesWith: ['sym'], compositionPin: ['sym', 'str', 'int', 'str'],
  contextAuthor: ['str'], contextCreatedAt: ['str'], contextReleaseLabel: ['str'], provenanceBasis: ['str'],
  provenanceStatement: ['str'], adaptedFrom: ['str', 'int', 'str'], revisionOf: ['str', 'int', 'str'], revisionReason: ['str'],
  comment: ['str'], contextFacet: ['str', 'str'], fiveWOneHEmphasis: ['str'], activeConcept: ['str', 'str'],
  contextRule: ['str'], lensOperation: ['str', 'int'], disambiguationHint: ['str'], contextReference: ['str', 'str', 'str'],
});
const SINGLE = ['contextFormat', 'isa', 'contextId', 'contextVersion', 'contextName', 'contextAuthor', 'contextCreatedAt', 'contextReleaseLabel', 'provenanceBasis', 'provenanceStatement', 'adaptedFrom', 'revisionOf', 'revisionReason', 'comment'];
const REQUIRED = ['contextFormat', 'isa', 'contextId', 'contextVersion', 'contextName', 'contextAuthor', 'contextCreatedAt', 'contextReleaseLabel', 'provenanceBasis', 'provenanceStatement', 'comment'];
const TYPE_NAMES = { str: 'quoted string', int: 'whole number', sym: 'constant name' };

function tokenize(text) {
  const tokens = [];
  let i = 0, line = 1;
  const at = message => fail('Line ' + line + ': ' + message);
  while (i < text.length) {
    const c = text[i];
    if (c === '\n') { line++; i++; continue; }
    if (c === ' ' || c === '\t') { i++; continue; }
    if (c === '\r') at('carriage returns are not allowed; use LF line endings.');
    if (c === ';') { while (i < text.length && text[i] !== '\n') i++; continue; }
    if (c === '(' || c === ')') { tokens.push({ t: c, line }); i++; continue; }
    if (c === '"') {
      const start = line;
      let value = '', escapedNewline = false, literalNewline = false;
      i++;
      for (;;) {
        if (i >= text.length) fail('Line ' + start + ': unterminated string.');
        const d = text[i];
        if (d === '"') { i++; break; }
        if (d === '\\') {
          const e = text[i + 1];
          if (e === 'n') { value += '\n'; escapedNewline = true; i += 2; continue; }
          if (e !== '"' && e !== '\\') at('only \\\\ and \\" escapes, and \\n from format v0.2 on, are supported inside strings.');
          value += e; i += 2; continue;
        }
        if (d === '\n') { line++; literalNewline = true; }
        else if (d === '\r' || (d < ' ' && d !== '\t') || d === '\u007f') at('control character inside a string.');
        value += d; i++;
      }
      tokens.push({ t: 'str', v: value, line: start, escapedNewline, literalNewline });
      continue;
    }
    let j = i;
    while (j < text.length && !' \t\n\r();"'.includes(text[j])) j++;
    const word = text.slice(i, j);
    if (/^(0|[1-9][0-9]{0,8})$/.test(word)) tokens.push({ t: 'int', v: Number(word), line });
    else if (SYMBOL.test(word)) tokens.push({ t: 'sym', v: word, line });
    else if (word.startsWith('#$')) at('write constants without the #$ prefix in this format.');
    else at('unrecognized token "' + word.slice(0, 40) + '".');
    i = j;
  }
  return tokens;
}

function assertionsOf(tokens) {
  const assertions = [];
  let k = 0;
  while (k < tokens.length) {
    const open = tokens[k];
    if (open.t !== '(') fail('Line ' + open.line + ': expected "(" to start an assertion.');
    k++;
    const items = [];
    while (k < tokens.length && tokens[k].t !== ')') {
      if (tokens[k].t === '(') fail('Line ' + tokens[k].line + ': nested lists are not part of this format.');
      items.push(tokens[k++]);
    }
    if (k >= tokens.length) fail('Line ' + open.line + ': missing ")".');
    const close = tokens[k++];
    if (!items.length || items[0].t !== 'sym') fail('Line ' + open.line + ': each assertion starts with a predicate name.');
    if (assertions.length >= 2000) fail('The definition has too many assertions.');
    assertions.push({ predicate: items[0].v, args: items.slice(1), line: open.line, endLine: close.line });
  }
  return assertions;
}

function sameSymbols(linked, pinned) {
  return linked.length === pinned.length && new Set(linked).size === linked.length && [...linked].sort().join(' ') === [...pinned].sort().join(' ');
}

export function parseDefinition(text) {
  if (typeof text !== 'string') fail('A context definition must be text.');
  if (utf8Bytes(text) > HARD_MAX_DEFINITION_BYTES) fail('This definition is larger than the ' + formatBytes(HARD_MAX_DEFINITION_BYTES) + '-byte maximum. Nothing was read.');
  if (text.charCodeAt(0) === 0xfeff) fail('Remove the byte-order mark at the start of the definition.');
  if (!wellFormed(text)) fail('The definition contains invalid Unicode.');
  if (text.startsWith(PROJECTION_MARK)) fail('This is a native-aligned projection, not a definition. Open its source definition instead; a projection cannot be imported or relabelled.');
  const assertions = assertionsOf(tokenize(text));
  if (!assertions.length) fail('The definition contains no assertions.');
  const self = assertions[0].args[0];
  if (!self || self.t !== 'sym') fail('Line ' + assertions[0].line + ': the first assertion must name the context constant.');
  const m = { format: null, symbol: self.v, id: null, version: null, name: null, parents: [], compositions: [], author: null, createdAt: null, releaseLabel: null, basis: null, provenance: null, adaptedFrom: null, revisionOf: null, revisionReason: null, meaning: null, facets: [], emphasis: [], concepts: [], rules: [], operations: [], hints: [], references: [] };
  const seen = new Set(), linkedParents = [], linkedCompositions = [];
  for (const a of assertions) {
    const signature = Object.hasOwn(SIGNATURES, a.predicate) ? SIGNATURES[a.predicate] : null;
    if (!signature) fail('Line ' + a.line + ': unsupported assertion "' + a.predicate.slice(0, 60) + '". This format accepts only its declared vocabulary, and nothing is executed.');
    if (a.args.length !== signature.length + 1) fail('Line ' + a.line + ': ' + a.predicate + ' takes ' + (signature.length + 1) + ' arguments.');
    const [subject, ...rest] = a.args;
    if (subject.t !== 'sym' || subject.v !== m.symbol) fail('Line ' + a.line + ': every assertion must describe ' + m.symbol + '.');
    rest.forEach((arg, n) => { if (arg.t !== signature[n]) fail('Line ' + a.line + ': argument ' + (n + 2) + ' of ' + a.predicate + ' must be a ' + TYPE_NAMES[signature[n]] + '.'); });
    if (SINGLE.includes(a.predicate)) {
      if (seen.has(a.predicate)) fail('Line ' + a.line + ': ' + a.predicate + ' may appear only once.');
      seen.add(a.predicate);
    }
    const v = rest.map(x => x.v);
    switch (a.predicate) {
      case 'contextFormat': m.format = v[0]; break;
      case 'isa': if (v[0] !== 'Microtheory') fail('Line ' + a.line + ': declare the context with (isa ' + m.symbol + ' Microtheory).'); break;
      case 'contextId': m.id = v[0]; break;
      case 'contextVersion': m.version = v[0]; break;
      case 'contextName': m.name = v[0]; break;
      case 'genlMt': linkedParents.push(v[0]); break;
      case 'parentPin': m.parents.push({ symbol: v[0], id: v[1], version: v[2], sha256: v[3] }); break;
      case 'composesWith': linkedCompositions.push(v[0]); break;
      case 'compositionPin': m.compositions.push({ symbol: v[0], id: v[1], version: v[2], sha256: v[3] }); break;
      case 'contextAuthor': m.author = v[0]; break;
      case 'contextCreatedAt': m.createdAt = v[0]; break;
      case 'contextReleaseLabel': m.releaseLabel = v[0]; break;
      case 'provenanceBasis': m.basis = v[0]; break;
      case 'provenanceStatement': m.provenance = v[0]; break;
      case 'adaptedFrom': m.adaptedFrom = { id: v[0], version: v[1], sha256: v[2] }; break;
      case 'revisionOf': m.revisionOf = { id: v[0], version: v[1], sha256: v[2] }; break;
      case 'revisionReason': m.revisionReason = v[0]; break;
      case 'comment': m.meaning = v[0]; break;
      case 'contextFacet': m.facets.push({ group: v[0], value: v[1] }); break;
      case 'fiveWOneHEmphasis': m.emphasis.push(v[0]); break;
      case 'activeConcept': m.concepts.push({ term: v[0], meaning: v[1] }); break;
      case 'contextRule': m.rules.push(v[0]); break;
      case 'lensOperation': m.operations.push({ op: v[0], value: v[1] }); break;
      case 'disambiguationHint': m.hints.push(v[0]); break;
      case 'contextReference': m.references.push({ label: v[0], url: v[1], locator: v[2] }); break;
    }
  }
  for (const predicate of REQUIRED) if (!seen.has(predicate)) fail('The definition is missing ' + predicate + '.');
  if (!CONTEXT_FORMATS.includes(m.format)) fail('Unsupported context format "' + String(m.format).slice(0, 60) + '". This form reads ' + FORMAT_LIST + '.');
  const strings = assertions.flatMap(a => a.args).filter(x => x.t === 'str');
  const escaped = strings.find(x => x.escapedNewline), literal = strings.find(x => x.literalNewline);
  if (m.format === LEGACY_FORMAT && escaped) fail('Line ' + escaped.line + ': the \\n escape is not part of ' + LEGACY_FORMAT + ', which keeps line breaks inside text as written.');
  if (m.format !== LEGACY_FORMAT && literal) fail('Line ' + literal.line + ': ' + m.format + ' keeps each assertion on one line; write a line break inside text as \\n.');
  if (!sameSymbols(linkedParents, m.parents.map(p => p.symbol))) fail('Each genlMt broader context needs exactly one parentPin with its ID, version and hash.');
  if (!sameSymbols(linkedCompositions, m.compositions.map(c => c.symbol))) fail('Each composesWith context needs exactly one compositionPin with its ID, version and hash.');
  validateModel(m);
  const expected = serializeDefinition(m);
  if (expected !== text) {
    const a = text.split('\n'), b = expected.split('\n');
    let n = 0;
    while (n < a.length && n < b.length && a[n] === b[n]) n++;
    fail('Line ' + (n + 1) + ': the definition is not in canonical form, so its bytes and hash would change. Expected: ' + (b[n] ?? '(end of file)').slice(0, 160));
  }
  return m;
}

// A valid definition's assertions with their source line spans, for derived projections.
export function readAssertions(text) {
  const model = parseDefinition(text);
  const assertions = assertionsOf(tokenize(text)).map(a => ({ predicate: a.predicate, args: a.args.map(x => ({ type: x.t, value: x.v })), line: a.line, endLine: a.endLine }));
  return { model, assertions };
}

// Records: {id, version, sha256, bytes, text}. The hash covers the exact UTF-8 bytes of text.

export async function recordFromModel(model, policy, { enforceBudget = true } = {}) {
  const text = serializeDefinition(validateModel(model));
  const bytes = utf8Bytes(text);
  if (enforceBudget) checkByteBudget(bytes, policy); else if (bytes > HARD_MAX_DEFINITION_BYTES) checkByteBudget(bytes, null);
  return { record: { id: model.id, version: model.version, sha256: await sha256Hex(text), bytes, text }, model };
}

export async function recordFromText(text, policy, { enforceBudget = true } = {}) {
  const model = parseDefinition(text);
  const bytes = utf8Bytes(text);
  if (enforceBudget) checkByteBudget(bytes, policy);
  return { record: { id: model.id, version: model.version, sha256: await sha256Hex(text), bytes, text }, model };
}

export async function verifyRecord(record, policy, options) {
  if (!record || typeof record !== 'object' || typeof record.text !== 'string') fail('Invalid context definition record.');
  const fresh = await recordFromText(record.text, policy, options);
  if (record.id !== fresh.record.id || record.version !== fresh.record.version || record.sha256 !== fresh.record.sha256 || record.bytes !== fresh.record.bytes) fail('Context ' + String(record.id).slice(0, 140) + '@' + record.version + ': the stated hash, size or identity does not match its definition text.');
  return fresh;
}

export const portableRecord = r => ({ id: r.id, version: r.version, sha256: r.sha256, bytes: r.bytes, text: r.text });

// Drafting new versions from form input. The caller adds the result to a library.

// Synchronous so an editor can measure exact bytes before saving. newId keeps
// the ID fixed while editing; a timestamp has a fixed length, so the size holds.
export function draftModel({ mode, base = null, form, parents = [], compositions = [], newId = null, now = new Date().toISOString() }) {
  if (!['new', 'derive', 'revise', 'adapt'].includes(mode)) fail('Choose how to create the context.');
  if (mode !== 'new' && !base) fail('Choose the context to start from.');
  if (base?.model.releaseLabel === 'starter_example' && mode === 'revise') fail('Starter examples cannot be revised here. Derive a narrower context or start a new one from it.');
  const pin = ({ record, model }) => ({ symbol: model.symbol, id: record.id, version: record.version, sha256: record.sha256 });
  let parentList = parents.map(pin);
  if (mode === 'derive' && !parentList.some(p => p.id === base.record.id)) parentList = [pin(base), ...parentList];
  const id = mode === 'revise' ? base.record.id : (newId || newContextId());
  if (!ID.test(id)) fail('Invalid context ID.');
  const name = clean(form.name);
  if (typeof name !== 'string' || !name) fail('Add a context name.');
  const model = buildDefinition({
    symbol: mode === 'revise' ? base.model.symbol : contextSymbol(name, id),
    id, version: mode === 'revise' ? base.record.version + 1 : 1,
    name, parents: parentList, compositions: compositions.map(pin),
    author: form.author, createdAt: now, releaseLabel: 'personal', format: CURRENT_FORMAT,
    basis: { new: 'newly_authored', derive: 'derived_narrower', revise: 'revision', adapt: 'adapted_copy' }[mode],
    provenance: form.provenance,
    adaptedFrom: mode === 'adapt' ? pinOf(base.record) : null,
    revisionOf: mode === 'revise' ? pinOf(base.record) : null,
    revisionReason: mode === 'revise' ? (clean(form.revisionReason) || fail('Explain the reason for this revision. Earlier versions and their reviews stay unchanged.')) : null,
    meaning: form.meaning, facets: form.facets, emphasis: form.emphasis, concepts: form.concepts,
    rules: form.rules, operations: form.operations, hints: form.hints, references: form.references,
  });
  return model;
}

export async function draftContext(options) { return recordFromModel(draftModel(options), options.policy); }

// Lifecycle events. Blessings and checks are self-declared; model evidence is never produced here.

function checkModelIdentity(model) {
  if (!model || typeof model !== 'object') fail('Model evidence needs a model identity.');
  checkText(model.id, 'the model name', 200, { multiline: false });
  checkText(model.version, 'the model version', 200, { multiline: false });
  if (model.weightsSha256 !== null && model.weightsSha256 !== undefined && !HASH.test(model.weightsSha256)) fail('A weights fingerprint must be a SHA-256 hash.');
}

export function validateContextEvent(e) {
  if (!e || typeof e !== 'object' || Array.isArray(e)) fail('Invalid context review record.');
  if (typeof e.id !== 'string' || !e.id || e.id.length > 200) fail('Invalid context review record ID.');
  if (!Object.hasOwn(EVENT_TYPES, e.type)) fail('Unknown context review record type.');
  checkPin({ id: e.contextId, version: e.version, sha256: e.sha256 }, 'reviewed context version');
  checkTime(e.recordedAt, 'review time');
  checkText(e.recordedBy, 'the name or handle of the person recording it', 200, { multiline: false });
  if (e.identity !== 'self_declared') fail('Context review identities are self-declared.');
  switch (e.type) {
    case 'blessing':
      if (!['blessed', 'declined'].includes(e.decision)) fail('Choose bless or decline.');
      checkText(e.reason, 'the reason for the decision', 10000);
      break;
    case 'mentor_check':
      if (!['mentor', 'reviewer'].includes(e.role)) fail('Choose a review role.');
      if (!['accepted', 'disputed', 'needs_review'].includes(e.decision)) fail('Invalid check decision.');
      checkText(e.check, 'the repeatable check', 10000);
      if (!e.passage || typeof e.passage !== 'object') fail('Record the source passage used for the check.');
      checkText(e.passage.locator, 'the source passage location', 500, { multiline: false });
      for (const key of ['recordId', 'revisionId']) if (e.passage[key] !== null && e.passage[key] !== undefined && (typeof e.passage[key] !== 'string' || !e.passage[key] || e.passage[key].length > 200)) fail('Invalid source passage reference.');
      if (e.passage.sourceUrl !== null && e.passage.sourceUrl !== undefined) checkUrl(e.passage.sourceUrl, 'the source link');
      if (e.passage.sourceSha256 !== null && e.passage.sourceSha256 !== undefined && !HASH.test(e.passage.sourceSha256)) fail('Invalid source passage hash.');
      break;
    case 'revocation':
      checkText(e.reason, 'the reason for withdrawing this version', 10000);
      break;
    case 'gate_evidence':
      checkModelIdentity(e.model);
      if (!e.probe || typeof e.probe !== 'object') fail('Model evidence needs a probe identity.');
      checkText(e.probe.id, 'the probe name', 200, { multiline: false });
      checkText(e.probe.version, 'the probe version', 200, { multiline: false });
      if (!['pass', 'fail', 'inconclusive'].includes(e.result)) fail('Model evidence needs a measured result.');
      checkTime(e.measuredAt, 'measurement time');
      if (!e.evidence || !HASH.test(e.evidence.sha256)) fail('Model evidence must reference its evidence file by SHA-256.');
      checkText(e.evidence.locator, 'the evidence location', 2000, { multiline: false });
      if (e.authority !== 'external_measurement') fail('Model evidence must be marked as an external measurement.');
      break;
    case 'promotion':
      checkModelIdentity(e.model);
      if (typeof e.gateEvidenceId !== 'string' || !e.gateEvidenceId) fail('A promotion claim must cite its model evidence.');
      if (e.authority !== 'native_registry_claim') fail('A promotion must be marked as a claim from the native registry.');
      break;
    case 'ratification':
      checkModelIdentity(e.model);
      if (typeof e.gateEvidenceId !== 'string' || !e.gateEvidenceId || typeof e.promotionId !== 'string' || !e.promotionId) fail('A ratification claim must cite a promotion and its own model evidence.');
      if (e.authority !== 'independent_ratification_claim') fail('A ratification must be marked as an independent claim.');
      break;
  }
  return e;
}

// Promotion needs a blessing and passing evidence for the same bytes and model;
// ratification needs a different person and a separate passing measurement.
export function checkEventPrerequisites(events) {
  const byId = new Map(events.map(e => [e.id, e]));
  for (const e of events) {
    if (e.type === 'promotion') {
      const gate = byId.get(e.gateEvidenceId);
      if (!gate || gate.type !== 'gate_evidence' || gate.sha256 !== e.sha256 || gate.result !== 'pass' || modelFingerprint(gate.model) !== modelFingerprint(e.model)) fail('A promotion claim needs passing model evidence for the same definition hash and model. Nothing was imported.');
      if (!events.some(b => b.type === 'blessing' && b.decision === 'blessed' && b.sha256 === e.sha256)) fail('A promotion claim needs a human blessing of the same definition hash. Nothing was imported.');
    }
    if (e.type === 'ratification') {
      const promotion = byId.get(e.promotionId), gate = byId.get(e.gateEvidenceId);
      if (!promotion || promotion.type !== 'promotion' || promotion.sha256 !== e.sha256 || modelFingerprint(promotion.model) !== modelFingerprint(e.model)) fail('A ratification claim needs a promotion for the same definition hash and model. Nothing was imported.');
      const first = byId.get(promotion.gateEvidenceId);
      if (!gate || gate.type !== 'gate_evidence' || gate.id === promotion.gateEvidenceId || gate.sha256 !== e.sha256 || gate.result !== 'pass' || modelFingerprint(gate.model) !== modelFingerprint(e.model)) fail('Independent ratification needs its own passing model evidence for the same definition hash and model. Nothing was imported.');
      if (samePerson(e.recordedBy, promotion.recordedBy) || (first && samePerson(gate.recordedBy, first.recordedBy))) fail('Independent ratification must come from a different person and a separate measurement. Nothing was imported.');
    }
  }
}

export function contextEvent(type, record, fields, now = new Date().toISOString()) {
  if (!BROWSER_EVENT_TYPES.includes(type)) fail('This form records blessings, checks and withdrawals only. Model checks are not run here.');
  const event = { id: crypto.randomUUID(), type, contextId: record.id, version: record.version, sha256: record.sha256, recordedAt: now, recordedBy: clean(fields.recordedBy), identity: 'self_declared' };
  if (type === 'blessing') Object.assign(event, { decision: fields.decision, reason: clean(fields.reason) });
  if (type === 'mentor_check') {
    const passage = { locator: clean(fields.passage?.locator) };
    for (const key of ['recordId', 'revisionId', 'sourceUrl', 'sourceSha256']) if (fields.passage?.[key]) passage[key] = fields.passage[key];
    Object.assign(event, { role: fields.role, decision: fields.decision, check: clean(fields.check), passage });
  }
  if (type === 'revocation') event.reason = clean(fields.reason);
  return validateContextEvent(event);
}

export function lifecycleSummary(events, record, { model = null } = {}) {
  const own = events.filter(e => e.sha256 === record.sha256 && e.contextId === record.id && e.version === record.version);
  const fingerprint = model ? modelFingerprint(model) : null;
  const pick = type => own.filter(e => e.type === type);
  const gates = pick('gate_evidence'), promotions = pick('promotion'), ratifications = pick('ratification');
  const forModel = list => (fingerprint ? list.filter(e => modelFingerprint(e.model) === fingerprint) : list);
  const modelGates = forModel(gates);
  return {
    proposed: true,
    blessed: pick('blessing').filter(e => e.decision === 'blessed'),
    declined: pick('blessing').filter(e => e.decision === 'declined'),
    checks: pick('mentor_check'),
    revocations: pick('revocation'),
    revoked: pick('revocation').length > 0,
    gates, promotions, ratifications,
    modelGate: fingerprint ? (modelGates.length ? modelGates.at(-1).result + '_recorded_elsewhere' : 'not_run') : null,
    promotedFor: [...new Set(promotions.map(e => modelFingerprint(e.model)))],
    ratifiedFor: [...new Set(ratifications.map(e => modelFingerprint(e.model)))],
    institutionalApproval: 'none',
  };
}

// Reviews never carry over between versions; this reports what earlier versions hold.
export function earlierVersionReviews(events, record) {
  const counts = new Map();
  for (const e of events) {
    if (e.contextId !== record.id || e.version >= record.version) continue;
    const entry = counts.get(e.version) || { version: e.version, sha256: e.sha256, blessings: 0, checks: 0, modelEvidence: 0 };
    if (e.type === 'blessing' && e.decision === 'blessed') entry.blessings++;
    if (e.type === 'mentor_check') entry.checks++;
    if (e.type === 'gate_evidence') entry.modelEvidence++;
    counts.set(e.version, entry);
  }
  return [...counts.values()].sort((a, b) => a.version - b.version);
}

// Libraries: definitions plus self-declared review events, held on one device.

export function emptyLibrary() { return { schema: LIBRARY_SCHEMA, definitions: [], events: [], policy: { definitionByteBudget: null } }; }

// lookup(pin) returns {record, model} or null. Each node memoizes the context IDs
// reachable from it, so a repeated ID is found on every path, not only the first.
function walk(starts, lookup) {
  const order = [], missing = [], below = new Map(), visiting = new Set();
  const cycle = entry => fail('Context "' + entry.model.name + '" would depend on itself through its broader or composed contexts. Cycles are refused; nothing was changed.');
  const visit = entry => {
    const key = pinnedKey(entry.record);
    if (below.has(key)) return below.get(key);
    if (visiting.has(key)) cycle(entry);
    visiting.add(key);
    const ids = new Set();
    for (const pin of [...entry.model.parents, ...entry.model.compositions]) {
      const found = lookup(pin);
      if (found) for (const id of visit(found)) ids.add(id);
      else {
        ids.add(pin.id);
        if (!missing.some(m => samePin(m, pin))) missing.push(pinOf(pin));
      }
    }
    if (ids.has(entry.record.id)) cycle(entry);
    ids.add(entry.record.id);
    visiting.delete(key);
    below.set(key, ids);
    order.push(entry);
    return ids;
  };
  for (const start of starts) visit(start);
  return { order, missing };
}

// Ancestors first, then the start. Missing broader contexts are reported, never substituted.
export const cascade = (start, lookup) => walk([start], lookup);

// The latest version of each context defines the current inheritance graph; it must stay acyclic.
function checkLatestGraph(entries) {
  const latest = new Map();
  for (const entry of entries) if (!latest.has(entry.record.id) || latest.get(entry.record.id).record.version < entry.record.version) latest.set(entry.record.id, entry);
  const state = new Map();
  const visit = id => {
    if (state.get(id) === 'done') return;
    if (state.get(id) === 'active') fail('These contexts would form a cycle of broader contexts. Cycles are refused; nothing was changed.');
    state.set(id, 'active');
    const entry = latest.get(id);
    if (entry) for (const pin of [...entry.model.parents, ...entry.model.compositions]) visit(pin.id);
    state.set(id, 'done');
  };
  for (const id of latest.keys()) visit(id);
}

export function libraryLookup(entries) {
  const byPinned = new Map(entries.map(e => [pinnedKey(e.record), e]));
  return pin => byPinned.get(pinnedKey(pin)) || null;
}

// Atomic: returns a new library or throws without touching the input.
// entries: verified [{record, model}] already in the library (avoids re-hashing).
export async function mergeIntoLibrary(library, entries, incoming, { policy = library.policy, enforceBudget = true, origin = 'imported', now = new Date().toISOString() } = {}) {
  const definitions = incoming.definitions || [], events = incoming.events || [];
  if (!Array.isArray(definitions) || !Array.isArray(events)) fail('Invalid context file contents.');
  const merged = new Map(entries.map(e => [definitionKey(e.record), e]));
  const added = { definitions: 0, events: 0 }, fresh = [];
  for (const candidate of definitions) {
    const verified = await verifyRecord(candidate, policy, { enforceBudget });
    const key = definitionKey(verified.record), existing = merged.get(key);
    if (existing) {
      if (existing.record.sha256 !== verified.record.sha256) fail('Context ' + key + ' already exists with different content. Two different texts cannot share an ID and version; nothing was imported. Derive or adapt a new context instead.');
      continue;
    }
    merged.set(key, verified);
    fresh.push(verified);
    added.definitions++;
  }
  const all = [...merged.values()];
  if (all.length > LIBRARY_LIMITS.definitions) fail('Your context library would exceed ' + LIBRARY_LIMITS.definitions + ' definitions. Nothing was imported.');
  const symbolOwner = new Map(), idSymbol = new Map();
  for (const entry of all) {
    const owner = symbolOwner.get(entry.model.symbol), symbol = idSymbol.get(entry.record.id);
    if (owner && owner !== entry.record.id) fail('Two different contexts use the constant name ' + entry.model.symbol + '. Nothing was imported.');
    if (symbol && symbol !== entry.model.symbol) fail('Versions of ' + entry.record.id + ' use different constant names. Nothing was imported.');
    symbolOwner.set(entry.model.symbol, entry.record.id);
    idSymbol.set(entry.record.id, entry.model.symbol);
  }
  // A newly added definition can complete a cycle through an existing one, so check every chain.
  walk(all, libraryLookup(all));
  checkLatestGraph(all);
  const eventMap = new Map(library.events.map(e => [e.id, e]));
  for (const event of events) {
    validateContextEvent(event);
    const existing = eventMap.get(event.id);
    if (existing) {
      if (canonicalJson(existing) !== canonicalJson(event)) fail('A context review record has the same ID but different contents. Nothing was imported.');
      continue;
    }
    const target = merged.get(event.contextId + '@' + event.version);
    if (!target || target.record.sha256 !== event.sha256) fail('A context review record refers to a definition that is not included. Nothing was imported.');
    eventMap.set(event.id, structuredClone(event));
    added.events++;
  }
  const allEvents = [...eventMap.values()];
  if (allEvents.length > LIBRARY_LIMITS.events) fail('Your context library would exceed ' + LIBRARY_LIMITS.events + ' review records. Nothing was imported.');
  checkEventPrerequisites(allEvents);
  const stored = new Map(library.definitions.map(d => [definitionKey(d), d]));
  for (const entry of fresh) stored.set(definitionKey(entry.record), { ...portableRecord(entry.record), origin, addedAt: now });
  return {
    library: { schema: LIBRARY_SCHEMA, definitions: [...stored.values()], events: allEvents, policy: normalizePolicy(policy) },
    entries: all, added,
  };
}

// Verifies a stored library (or throws so the caller can preserve the raw data).
export async function loadLibrary(raw, starterEntries = []) {
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!parsed || parsed.schema !== LIBRARY_SCHEMA || !Array.isArray(parsed.definitions) || !Array.isArray(parsed.events)) fail('This is not a supported context library.');
  const policy = normalizePolicy(parsed.policy);
  const base = { ...emptyLibrary(), policy };
  const result = await mergeIntoLibrary(base, starterEntries, { definitions: parsed.definitions, events: parsed.events }, { policy, enforceBudget: false, origin: 'stored' });
  result.library.definitions = parsed.definitions.map(d => ({ ...portableRecord(d), origin: d.origin || 'stored', addedAt: d.addedAt || null }));
  return result;
}

// Packages: portable exchange files. Exporting does not release or publish a context.

const PACKAGE_SCOPE = Object.freeze({
  release: 'A file for exchange. Exporting does not publish, release or submit a context.',
  review: 'Blessings and checks are self-declared by the people named. They are not institutional approval.',
  models: 'This form does not run model checks. Model evidence, promotion and ratification records come from elsewhere and are not verified by this form.',
  authority: 'No institutional approval or Garrison Node promotion is established by this file. The native Garrison Node registry remains authoritative for its own use.',
});

export async function sealPackage(records, events, now = new Date().toISOString()) {
  // Read with the strict parser: a pattern over raw text could match quoted author text.
  const formatOf = text => { try { return parseDefinition(text).format; } catch { return 'unknown'; } };
  const formats = [...new Set(records.map(r => formatOf(r.text)))].sort();
  const body = { schema: PACKAGE_SCHEMA, formats, exportedAt: now, definitions: records.map(portableRecord), events: structuredClone(events), scope: PACKAGE_SCOPE };
  return { ...body, integrity: { algorithm: 'SHA-256', canonicalization: 'Recursively sorted JSON keys; array order preserved; compact JSON', bodySha256: await sha256Hex(canonicalJson(body)) } };
}

export async function openPackage(text) {
  if (typeof text !== 'string' || utf8Bytes(text) > MAX_PACKAGE_BYTES) fail('Choose a context file under 2 MB.');
  let input;
  try { input = JSON.parse(text); } catch { fail('This context file is not valid JSON.'); }
  if (!input || input.schema !== PACKAGE_SCHEMA || !Array.isArray(input.definitions) || !Array.isArray(input.events) || !input.integrity) fail('This is not a supported context package.');
  const { integrity, ...body } = input;
  if (integrity.algorithm !== 'SHA-256' || await sha256Hex(canonicalJson(body)) !== integrity.bodySha256) fail('Context package integrity check failed. The file may have changed; nothing was imported.');
  if (input.definitions.length > LIBRARY_LIMITS.definitions || input.events.length > LIBRARY_LIMITS.events) fail('This context package exceeds the import limits. Nothing was imported.');
  return { definitions: input.definitions, events: input.events };
}

// Reads either a package (JSON) or a single canonical definition text. Atomic.
export async function importContextFile(text, library, entries) {
  if (typeof text !== 'string' || utf8Bytes(text) > MAX_PACKAGE_BYTES) fail('Choose a context file under 2 MB.');
  if (text.trimStart().startsWith('{')) {
    const contents = await openPackage(text);
    return { kind: 'package', ...(await mergeIntoLibrary(library, entries, contents, { policy: library.policy })) };
  }
  const { record } = await recordFromText(text, library.policy);
  return { kind: 'definition', ...(await mergeIntoLibrary(library, entries, { definitions: [record], events: [] }, { policy: library.policy })) };
}

// Sidecars: derived projections, designed for BitNet flags without claiming any inference ran.

export function contextSidecar({ entry, events, policy, lookup }) {
  const { order, missing } = cascade(entry, lookup);
  const life = lifecycleSummary(events, entry.record);
  const flags = { schema: BITNET_FLAG_SCHEMA };
  for (const flag of BITNET_FLAGS) {
    const evidence = life.gates.filter(g => g.probe.id === 'bitnet.' + flag);
    flags[flag] = evidence.length
      ? { status: 'evidence_recorded_elsewhere_not_verified_here', evidence: evidence.map(g => ({ eventId: g.id, result: g.result, model: g.model, probe: g.probe, evidenceSha256: g.evidence.sha256, measuredAt: g.measuredAt })) }
      : { status: flag === 'suitability' ? 'unknown' : 'not_run', evidence: [] };
  }
  const budget = policy?.definitionByteBudget ?? null;
  return {
    schema: SIDECAR_SCHEMA,
    note: 'Derived from the canonical definition. This sidecar is a projection, not a source of truth; regenerate it rather than editing it.',
    definition: { format: entry.model.format, id: entry.record.id, version: entry.record.version, sha256: entry.record.sha256, bytes: entry.record.bytes, name: entry.model.name, releaseLabel: entry.model.releaseLabel },
    cascade: order.map(e => ({ id: e.record.id, version: e.record.version, sha256: e.record.sha256, bytes: e.record.bytes })),
    cascadeBytes: order.reduce((sum, e) => sum + e.record.bytes, 0),
    missingBroaderContexts: missing.map(pinOf),
    byteBudget: { unit: 'UTF-8 bytes', measuredBytes: entry.record.bytes, configuredBytes: budget, withinBudget: budget === null ? null : entry.record.bytes <= budget },
    tokenOrWeightConstraints: 'not_measured',
    designedFor: ['bitnet_flags'],
    compatibilityLabel: 'Designed for BitNet flags. This is a compatibility label, not a measured BitNet inference; no inference has run for this sidecar.',
    bitnetFlags: flags,
    lifecycle: {
      proposed: true, humanBlessings: life.blessed.length, declines: life.declined.length, mentorChecks: life.checks.length,
      withdrawn: life.revoked, modelChecks: life.gates.length ? 'evidence_recorded_elsewhere_not_verified_here' : 'not_run',
      promotion: life.promotions.length ? 'claims_recorded_elsewhere_not_verified_here' : 'not_promoted',
      ratification: life.ratifications.length ? 'claims_recorded_elsewhere_not_verified_here' : 'not_ratified',
      institutionalApproval: 'none',
    },
  };
}

// Reading references: what a saved reading records about the context it used.

const READING_KEYS = ['id', 'version', 'sha256', 'bytes', 'name', 'appliedOperations', 'appliedAt'];

export function validateReadingContext(ref) {
  if (!ref || typeof ref !== 'object' || Array.isArray(ref)) fail('Invalid reading context.');
  if (Object.keys(ref).some(k => !READING_KEYS.includes(k))) fail('Invalid reading context fields.');
  checkPin(ref, 'reading context');
  if (!Number.isSafeInteger(ref.bytes) || ref.bytes < 1 || ref.bytes > HARD_MAX_DEFINITION_BYTES) fail('Invalid reading context size.');
  checkText(ref.name, 'the reading context name', 120, { multiline: false });
  checkOperations(ref.appliedOperations);
  if (ref.appliedAt !== null) checkTime(ref.appliedAt, 'lens application time');
  if (!ref.appliedOperations.length !== (ref.appliedAt === null)) fail('Applied lens operations need the time they were applied.');
  return ref;
}

export function readingContextRef(entry) {
  return { id: entry.record.id, version: entry.record.version, sha256: entry.record.sha256, bytes: entry.record.bytes, name: entry.model.name, appliedOperations: [], appliedAt: null };
}

// Validates the pinned definitions and review records carried inside a review record.
export async function verifyRecordContexts(definitions, events) {
  if (!Array.isArray(definitions) || definitions.length > 200) fail('Invalid context definitions in this record.');
  if (!Array.isArray(events) || events.length > 2000) fail('Invalid context review records in this record.');
  const entries = [], keys = new Set();
  for (const definition of definitions) {
    const verified = await verifyRecord(definition, null, { enforceBudget: false });
    const key = definitionKey(verified.record);
    if (keys.has(key)) fail('This record carries two definitions for ' + key + '.');
    keys.add(key);
    entries.push(verified);
  }
  walk(entries, libraryLookup(entries));
  const ids = new Set();
  for (const event of events) {
    validateContextEvent(event);
    if (ids.has(event.id)) fail('This record repeats a context review record ID.');
    ids.add(event.id);
    if (!entries.some(e => e.record.id === event.contextId && e.record.version === event.version && e.record.sha256 === event.sha256)) fail('A context review record in this record refers to a definition it does not carry.');
  }
  checkEventPrerequisites(events);
  return entries;
}
