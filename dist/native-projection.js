import { readAssertions, sha256Hex, utf8Bytes, canonicalJson, lifecycleSummary, PROJECTION_MARK, FORMAT_NOTES } from './contexts.js';

// An explicit, versioned metadata view of one public definition in the native
// six-section order. It is derived, never a definition. It copies no author text:
// a reader that matches assertions without honouring quotation marks takes quoted
// wording for metadata, so author text stays in the source definition, pinned by
// hash, and appears here only as a source line, a size and a SHA-256. The one
// stated exception is the file_bitnet header block, which carries the authored
// domain facets that the native list syntax can hold exactly.

export const NATIVE_PROJECTION_SCHEMA = 'reckoner.native_projection.v0.2';
export const NATIVE_HEADER_SCHEMA = 'garrison/file_bitnet/v1';
export const NATIVE_SECTIONS = Object.freeze([
  'Header comment, with schema and provenance or filing metadata',
  'Identity and inheritance, with 5W1H emphasis',
  'Active concepts',
  'Rules',
  'Disambiguation hints',
  'Doctrine references',
]);
export const CONVENTION_SOURCE = 'Native six-section order and file_bitnet header syntax as reported on 2026-10-15 from read-only checks of the native process, summarized in CONTEXT_FORMAT.md. A reported convention, not verified compatibility. This mapping uses public field names only.';

// [native section, mapping, kind]. "declared": the native convention names this kind of
// content for that section. "public_extension": a public field with no declared native
// counterpart, placed where it reads best.
export const FIELD_MAP = Object.freeze({
  contextFormat: [1, 'schema', 'declared'],
  contextAuthor: [1, 'provenance: author (self-declared)', 'declared'],
  contextCreatedAt: [1, 'provenance: created', 'declared'],
  contextReleaseLabel: [1, 'filing: public release label (not an admission state)', 'declared'],
  provenanceBasis: [1, 'provenance: basis', 'declared'],
  provenanceStatement: [1, 'provenance: statement', 'declared'],
  adaptedFrom: [1, 'provenance: adapted from (pinned)', 'declared'],
  revisionOf: [1, 'provenance: revision of (pinned)', 'declared'],
  revisionReason: [1, 'provenance: reason for the revision', 'declared'],
  contextFacet: [1, 'filing and discovery facet', 'declared'],
  isa: [2, 'identity: microtheory declaration', 'declared'],
  contextId: [2, 'identity: public context ID', 'declared'],
  contextVersion: [2, 'identity: version', 'declared'],
  contextName: [2, 'identity: name', 'declared'],
  comment: [2, 'identity: full meaning', 'declared'],
  genlMt: [2, 'inheritance: broader context', 'declared'],
  parentPin: [2, 'inheritance: pinned version and hash of the broader context', 'declared'],
  composesWith: [2, 'composition (public extension)', 'public_extension'],
  compositionPin: [2, 'composition: pinned version and hash (public extension)', 'public_extension'],
  fiveWOneHEmphasis: [2, '5W1H emphasis', 'declared'],
  activeConcept: [3, 'active concept', 'declared'],
  contextRule: [4, 'rule', 'declared'],
  lensOperation: [4, 'bounded display setting (public extension; never executed)', 'public_extension'],
  disambiguationHint: [5, 'disambiguation hint', 'declared'],
  contextReference: [6, 'doctrine reference: public label, link and location', 'declared'],
});

// String arguments, by position after the subject, that hold values the parser has
// already checked against a closed vocabulary or pattern. Every other string is
// author text and is never copied.
const CHECKED_STRINGS = Object.freeze({
  contextFormat: [0], contextId: [0], contextCreatedAt: [0], contextReleaseLabel: [0], provenanceBasis: [0],
  adaptedFrom: [0, 2], revisionOf: [0, 2], parentPin: [1, 3], compositionPin: [1, 3],
  contextFacet: [0], fiveWOneHEmphasis: [0], lensOperation: [0],
});
// A copied value must also be one inert token: no spaces, quotes, brackets or semicolons.
const INERT = /^[A-Za-z0-9][A-Za-z0-9:._@#+-]*$/;

// The native header list is split on commas and trimmed, with no quoting or escapes.
// A value is written only when that reading returns it unchanged and it holds nothing
// that could close the list, start a comment or open an assertion.
const NATIVE_LIST_VALUE = /^[\p{L}\p{N}](?:[\p{L}\p{M}\p{N} .-]*[\p{L}\p{M}\p{N}.])?$/u;
export const nativeListValue = value => typeof value === 'string' && [...value].length <= 80 && NATIVE_LIST_VALUE.test(value);
const headerBlock = values => [';; schema: ' + NATIVE_HEADER_SCHEMA, ';; file_bitnet:', ';;   domain: [' + values.join(', ') + ']', ';; end_file_bitnet'];

// Only authored domain facets map to a native header key, and only all together:
// if one cannot be written exactly, no block is written and the definition keeps them all.
export function nativeHeaderFor(facets) {
  const domain = facets.filter(f => f.group === 'domain').map(f => f.value);
  const refused = domain.filter(value => !nativeListValue(value)).length;
  const status = !domain.length ? 'not_emitted' : refused ? 'unsupported' : 'emitted';
  return { status, values: status === 'emitted' ? domain : [], domainFacets: domain.length, refused, unmappedFacetGroups: [...new Set(facets.filter(f => f.group !== 'domain').map(f => f.group))], lines: status === 'emitted' ? headerBlock(domain) : [] };
}

const HEADER_NOTES = Object.freeze({
  emitted: 'Written from the authored domain facets only, in definition order. No other key is written, and nothing is taken from the author, the release label or quoted text.',
  not_emitted: 'This version declares no domain facet, so no native header block is written. Absent fields are omitted, not filled.',
  unsupported: 'At least one domain facet holds a character that the native list syntax cannot carry exactly. No block is written. The public definition keeps every facet as written; nothing was normalized, shortened or split.',
});
const HEADER_LINES = Object.freeze({
  not_emitted: ';;; No native header block. This version declares no domain facet.',
  unsupported: ';;; No native header block. A domain facet holds a character that the native list syntax cannot carry exactly, and the definition keeps it as written.',
});

// Stated rather than filled: the public form cannot supply these.
export const UNSUPPORTED = Object.freeze([
  ['native header keys other than domain', 'not_emitted', 'Only authored domain facets are written, in the file_bitnet block. No other header key is emitted or inferred: no ownership, status or authority is taken from the self-declared author or from any other field.'],
  ['native BitNet predicates and scoring', 'not_emitted', 'BitNet flags are measurements kept outside definitions, and none has run. See the context sidecar.'],
  ['native institutional admission', 'not_established', 'The public form neither grants nor infers it.'],
  ['native model admission or promotion', 'not_established', 'Promotion or ratification claims recorded elsewhere are reported separately and are not admission.'],
  ['production status or authority', 'not_inferred', 'Nothing is inferred from a release label, a review, a claim or quoted text.'],
  ['other native metadata formats', 'not_produced', 'Directory-level stubs, per-file contract wrappers and cascade cards are distinct formats. None is produced here, and the file_bitnet block proves nothing about them.'],
  ['author text', 'not_copied', 'It stays in the source definition, pinned by hash, so quoted wording cannot be read as metadata here. Each field gives its source line, size and SHA-256 instead.'],
  ['native fields or rules beyond the declared public fields', 'not_provided', 'Only public fields are mapped; nothing is invented to fill native fields.'],
].map(([item, status, reason]) => Object.freeze({ item, status, reason })));

export const READER_BOUNDARY = Object.freeze({
  authorText: 'not_copied',
  nativeReaderInput: 'Only projectionText, or nativeHeader.text on its own. The file_bitnet block is the only native syntax either holds, and the JSON around them holds no author text either.',
  notForQuoteUnawareReaders: Object.freeze(['source definitions', 'context packages', 'receipts and their exports', 'context sidecars', 'projections with schema reckoner.native_projection.v0.1']),
  reason: 'A reader that matches assertions or header lines without honouring quotation marks can take quoted author text for metadata. Every file in the list above holds author text. This projection holds only checked values, line numbers, sizes, hashes and the domain facets that pass the native list check.',
});

const lineLabel = ([start, end]) => (start === end ? 'line ' + start : 'lines ' + start + ' to ' + end);
const renderArg = x => (x.type === 'author_text' ? 'author text of ' + x.bytes + ' bytes, SHA-256 ' + x.sha256 : String(x.value));

async function describeArgs(a) {
  const out = [], checked = CHECKED_STRINGS[a.predicate] || [];
  for (const [n, x] of a.args.slice(1).entries()) {
    if (x.type === 'int') out.push({ type: 'number', value: x.value });
    else if (x.type === 'sym' && INERT.test(x.value)) out.push({ type: 'constant', value: x.value });
    else if (x.type === 'str' && checked.includes(n) && INERT.test(x.value)) out.push({ type: 'checked_text', value: x.value });
    else out.push({ type: 'author_text', bytes: utf8Bytes(String(x.value)), sha256: await sha256Hex(String(x.value)) });
  }
  return out;
}

export async function projectToNative(record, events = []) {
  const { model, assertions } = readAssertions(record.text);
  const sha256 = await sha256Hex(record.text), bytes = utf8Bytes(record.text);
  if (sha256 !== record.sha256 || bytes !== record.bytes || model.id !== record.id || model.version !== record.version) throw Error('The definition text does not match its recorded hash, size or identity. Nothing was projected.');
  const sections = NATIVE_SECTIONS.map((name, i) => ({ number: i + 1, name, assertions: [] }));
  for (const a of assertions) {
    const [section, mapping, kind] = FIELD_MAP[a.predicate];
    sections[section - 1].assertions.push({ predicate: a.predicate, sourceLines: [a.line, a.endLine], mapping, kind, args: await describeArgs(a) });
  }
  const headerMetadata = sections[0].assertions.map(a => ({ field: a.mapping, args: a.args, source: { predicate: a.predicate, lines: a.sourceLines, definitionSha256: sha256 } }));
  const facetAssertions = assertions.filter(a => a.predicate === 'contextFacet');
  const header = nativeHeaderFor(facetAssertions.map(a => ({ group: a.args[1].value, value: a.args[2].value })));
  const domainFacets = [];
  for (const a of facetAssertions.filter(f => f.args[1].value === 'domain')) {
    const value = a.args[2].value;
    domainFacets.push({ line: a.line, bytes: utf8Bytes(value), sha256: await sha256Hex(value), representable: nativeListValue(value) });
  }
  const life = lifecycleSummary(events, record);
  const text = [
    PROJECTION_MARK + ', schema ' + NATIVE_PROJECTION_SCHEMA,
    ';;; A derived metadata view of one public definition. It is not a definition and cannot be imported or relabelled.',
    ';;; It copies no author text. Each field gives its source line, size and SHA-256 instead, except that authored domain facets the native list syntax carries exactly are written in the file_bitnet block.',
    ';;; Derived from ' + record.id + ' version ' + record.version + ', constant ' + model.symbol + ', format ' + model.format + ', SHA-256 ' + sha256 + ', ' + bytes + ' bytes.',
    ';;; Review is public and self-declared. Native institutional and model admission are not established. Production status is not inferred.',
    ...sections.flatMap((s, i) => [';;; Section ' + s.number + '. ' + s.name, ...(i === 0 ? (header.status === 'emitted' ? header.lines : [HEADER_LINES[header.status]]) : []), ...s.assertions.map(a => ';;; ' + lineLabel(a.sourceLines) + ' ' + a.predicate + ' = ' + a.args.map(renderArg).join(' | '))]),
    ';;; The public form does not provide ' + UNSUPPORTED.map(u => u.item).join('; ') + '.',
  ].join('\n') + '\n';
  const body = {
    schema: NATIVE_PROJECTION_SCHEMA,
    conventionSource: CONVENTION_SOURCE,
    source: { id: record.id, version: record.version, constant: model.symbol, format: model.format, formatNote: FORMAT_NOTES[model.format], sha256, bytes },
    readerBoundary: READER_BOUNDARY,
    sectionOrder: [...NATIVE_SECTIONS],
    sections,
    headerMetadata,
    nativeHeader: {
      syntax: NATIVE_HEADER_SCHEMA + ' comment block',
      status: header.status,
      fields: header.status === 'emitted' ? { domain: header.values } : {},
      domainFacets,
      unmappedFacetGroups: header.unmappedFacetGroups,
      text: header.status === 'emitted' ? header.lines.join('\n') + '\n' : null,
      note: HEADER_NOTES[header.status],
    },
    review: {
      public: { identity: 'self_declared', proposed: true, humanBlessings: life.blessed.length, declines: life.declined.length, mentorChecks: life.checks.length, withdrawn: life.revoked },
      modelEvidence: life.gates.length ? 'recorded_elsewhere_not_verified' : 'not_run',
      claims: { promotion: life.promotions.length ? 'recorded_elsewhere_not_verified' : 'none', ratification: life.ratifications.length ? 'recorded_elsewhere_not_verified' : 'none' },
      nativeAdmission: { institutional: 'not_established', model: 'not_established' },
      note: 'Public review is personal and self-declared. It is not native institutional or model admission, and claims recorded elsewhere are not admission.',
    },
    releaseLabel: { value: model.releaseLabel, meaning: model.releaseLabel === 'starter_example' ? 'A public starter example. Not a production definition.' : 'A personal public context. Not released and not admitted.' },
    productionStatus: 'not_inferred',
    unsupported: UNSUPPORTED.map(u => ({ ...u })),
    compatibility: { claim: 'none', note: 'Sections follow the reported native order, a convention rather than verified compatibility. Parsing a projection or a definition does not establish compatibility, and a reader that ignores quotation marks can misread any file that holds author text. Native confirmation of this projection is pending.' },
    projectionText: { text, sha256: await sha256Hex(text), bytes: utf8Bytes(text) },
  };
  return { ...body, integrity: { algorithm: 'SHA-256', canonicalization: 'Recursively sorted JSON keys; array order preserved; compact JSON', bodySha256: await sha256Hex(canonicalJson(body)) } };
}
