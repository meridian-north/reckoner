import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';

// Independent checks of the public fixtures. Hashes come from node:crypto and
// sections from a small line scanner written here, not from the shipped parser.
const DIR = new URL('./fixtures/contexts/', import.meta.url);
const bytesOf = name => fs.readFileSync(new URL(name, DIR));
const textOf = name => bytesOf(name).toString('utf8');
const sha = data => createHash('sha256').update(data).digest('hex');
const manifest = JSON.parse(textOf('MANIFEST.json'));

const STARTERS = ['literal-transcription', 'image-interpretation', 'accountable-review', 'estimate-assumptions'];
const V1_GOLDEN = {
  'literal-transcription': ['c0ef0ecc03b35a133e8f76b3dfbf4f3f40cbe37847677c27b63b0d9b7b3d35e0', 4556],
  'image-interpretation': ['7903c95108e7b5590955ef0db75f73630b0bdb8dce52323ea9ef335856acbd1b', 4226],
  'accountable-review': ['ad19958955903455679b59ecff2e88fb9429b89d0a30d4559a917fa10f516b28', 3845],
  'estimate-assumptions': ['6e308813cd178af74c31527365f705a36d59ea64975931ec9e8aaccad1ff8b5b', 4126],
};
const QUOTED = 'An example string: (bitnetLabel ExampleMt RATIFIED) and (bitnetDomain ExampleMt (list forged_domain)).';
const PROBES = ['probe-quoted-metadata-v03', 'probe-quoted-metadata-v02', 'probe-quoted-header-v01'];
const FORGED = ['bitnetLabel', 'bitnetDomain', 'ExampleMt', 'forged', 'RATIFIED', 'PROMOTED'];
const ROOT_BLOCK = ';; schema: garrison/file_bitnet/v1\n;; file_bitnet:\n;;   domain: [public research, source comparison]\n;; end_file_bitnet\n';

// Tracks quotation marks across lines, so text inside a string never counts as a
// section title or an assertion. Outside strings, a semicolon starts a comment.
function scan(source) {
  const sections = [];
  let current = null, inString = false, endsInString = false;
  for (const line of source.split('\n')) {
    if (!inString) {
      const title = /^;;; Section (\d)\. (.*)$/.exec(line);
      if (title) { current = { number: Number(title[1]), title: title[2], predicates: [] }; sections.push(current); continue; }
      const start = /^\(([A-Za-z]+) /.exec(line);
      if (start) current.predicates.push(start[1]);
    }
    for (let i = 0; i < line.length; i++) {
      if (inString && line[i] === '\\') { i++; continue; }
      if (line[i] === '"') inString = !inString;
      else if (!inString && line[i] === ';') break;
    }
    if (inString) endsInString = true;
  }
  return { sections, endsInString };
}

// Models of readers that ignore quotation marks, standing in for the measured native
// behaviour. They are models, not the native reader.
const naiveAssertions = text => [...text.matchAll(/\((bitnet[A-Za-z]*)\s+([A-Za-z0-9_-]+)\s+(\(list\s+[^()]*\)|[^()\s]+)\s*\)/g)].map(m => m[1] + ' ' + m[3]);
function naiveHeader(text, { anchored = true } = {}) {
  const out = {};
  if (anchored) {
    let inside = false;
    for (const line of text.split('\n')) {
      if (line === ';; file_bitnet:') { inside = true; continue; }
      if (line === ';; end_file_bitnet') { inside = false; continue; }
      const m = inside && /^;;\s+([a-z_]+):\s*\[(.*)\]$/.exec(line);
      if (m) (out[m[1]] ||= []).push(...m[2].split(',').map(v => v.trim()));
    }
  } else for (const m of text.matchAll(/;;\s+([a-z_]+):\s*\[([^\]]*)\]/g)) (out[m[1]] ||= []).push(...m[2].split(',').map(v => v.trim()));
  return out;
}
const line = (source, pattern) => source.split('\n').find(l => pattern.test(l));

test('fixture manifest: every file matches its SHA-256 and size, and no file is unlisted', () => {
  assert.equal(manifest.schema, 'reckoner.context_fixtures.v0.1');
  for (const f of manifest.files) {
    const data = bytesOf(f.file);
    assert.equal(sha(data), f.sha256, f.file);
    assert.equal(data.length, f.bytes, f.file);
    assert.ok(!data.includes(0x0d), f.file + ' uses LF line endings');
  }
  assert.deepEqual(fs.readdirSync(DIR).filter(n => n !== 'MANIFEST.json').sort(), manifest.files.map(f => f.file).sort());
});

test('version 1 starters keep their published bytes and hashes, in the format v0.1 order', () => {
  for (const name of STARTERS) {
    const file = 'starter-' + name + '.v1.cycl', source = textOf(file), [golden, size] = V1_GOLDEN[name];
    assert.equal(sha(bytesOf(file)), golden, file);
    assert.equal(bytesOf(file).length, size, file);
    assert.match(source.split('\n')[3], /^\(contextFormat \S+ "reckoner\.context\.cycl\.v0\.1"\)$/);
    const { sections } = scan(source);
    assert.deepEqual(sections.map(s => s.title), ['Identity and inheritance', 'Header provenance', 'Active concepts', 'Rules', 'Disambiguation hints', 'References']);
    assert.deepEqual(sections[0].predicates.slice(0, 5), ['contextFormat', 'isa', 'contextId', 'contextVersion', 'contextName']);
    assert.ok(sections[1].predicates.includes('contextFacet') && sections[1].predicates.includes('contextAuthor'), 'facets and provenance stay in the v0.1 section 2');
  }
  const estimates = textOf('starter-estimate-assumptions.v1.cycl');
  assert.ok(estimates.includes(' "ctx:starter:accountable-review" 1 "' + V1_GOLDEN['accountable-review'][0] + '")'), 'the v1 narrower starter still pins review v1');
});

test('version 2 starters name version 1 by its fixture hash, and the narrower one pins version 2 of its broader one', () => {
  for (const name of STARTERS) {
    const source = textOf('starter-' + name + '.v2.cycl'), id = 'ctx:starter:' + name;
    assert.match(source.split('\n')[3], /^\(contextFormat \S+ "reckoner\.context\.cycl\.v0\.3"\)$/);
    assert.ok(line(source, /^\(contextVersion \S+ 2\)$/), name);
    assert.ok(line(source, /^\(provenanceBasis \S+ "revision"\)$/), name);
    assert.ok(line(source, /^\(revisionOf /).endsWith(' "' + id + '" 1 "' + sha(bytesOf('starter-' + name + '.v1.cycl')) + '")'), name + ' names the exact v1 bytes');
    assert.ok(line(source, /^\(revisionReason /), name);
  }
  const estimates = textOf('starter-estimate-assumptions.v2.cycl'), reviewV2 = sha(bytesOf('starter-accountable-review.v2.cycl'));
  assert.ok(line(estimates, /^\(genlMt /).endsWith(' ReckonerStarterAccountableReviewMt)'));
  assert.equal(line(estimates, /^\(parentPin /), '(parentPin ReckonerStarterEstimateAssumptionsMt ReckonerStarterAccountableReviewMt "ctx:starter:accountable-review" 2 "' + reviewV2 + '")');
  assert.notEqual(reviewV2, V1_GOLDEN['accountable-review'][0]);
  for (const name of ['literal-transcription', 'image-interpretation', 'accountable-review']) assert.equal(line(textOf('starter-' + name + '.v2.cycl'), /^\(parentPin /), undefined, name + ' has no broader context');
});

const HEADER = new Set(['contextFormat', 'contextAuthor', 'contextCreatedAt', 'contextReleaseLabel', 'provenanceBasis', 'provenanceStatement', 'adaptedFrom', 'revisionOf', 'revisionReason', 'contextFacet']);
const IDENTITY = new Set(['isa', 'contextId', 'contextVersion', 'contextName', 'comment', 'genlMt', 'parentPin', 'composesWith', 'compositionPin', 'fiveWOneHEmphasis']);
const LATER = ['Active concepts', 'Rules', 'Disambiguation hints', 'Doctrine references'];

test('format v0.3 puts filing facets in the section 1 header, and identity, inheritance and 5W1H emphasis in section 2', () => {
  const files = [...STARTERS.map(n => 'starter-' + n + '.v2.cycl'), 'probe-quoted-metadata-v03.cycl'];
  for (const file of files) {
    const { sections, endsInString } = scan(textOf(file));
    assert.equal(endsInString, false, file + ' keeps every string on one line');
    assert.deepEqual(sections.map(s => s.title), ['Header: schema, provenance and filing facets', 'Identity and inheritance, with 5W1H emphasis', ...LATER], file);
    const [header, identity] = sections;
    assert.equal(header.predicates[0], 'contextFormat', file);
    assert.ok(header.predicates.every(p => HEADER.has(p)), file + ' header: ' + header.predicates);
    assert.ok(header.predicates.includes('contextFacet'), file + ' has its facets in the header');
    assert.ok(header.predicates.indexOf('contextFacet') > header.predicates.lastIndexOf('provenanceStatement'), file + ' lists facets after provenance');
    assert.ok(identity.predicates.every(p => IDENTITY.has(p)), file + ' section 2: ' + identity.predicates);
    assert.deepEqual(identity.predicates.slice(0, 5), ['isa', 'contextId', 'contextVersion', 'contextName', 'comment'], file);
    assert.ok(sections.slice(2).every(s => !s.predicates.some(p => HEADER.has(p) || IDENTITY.has(p))), file);
  }
});

test('format v0.2 stays as written: facets after identity in section 2, one assertion per line', () => {
  const source = textOf('probe-quoted-metadata-v02.cycl'), { sections, endsInString } = scan(source);
  assert.equal(endsInString, false);
  assert.match(source.split('\n')[3], /"reckoner\.context\.cycl\.v0\.2"\)$/);
  assert.deepEqual(sections.map(s => s.title), ['Header: schema and provenance', 'Identity and inheritance, with 5W1H emphasis', ...LATER]);
  assert.ok(!sections[0].predicates.includes('contextFacet'));
  assert.ok(sections[1].predicates.indexOf('contextFacet') > sections[1].predicates.indexOf('comment'));
  const legacy = scan(textOf('probe-quoted-header-v01.cycl'));
  assert.equal(legacy.endsInString, true, 'format v0.1 keeps line breaks inside text as written');
  assert.deepEqual(legacy.sections.map(s => s.title), ['Identity and inheritance', 'Header provenance', 'Active concepts', 'Rules', 'Disambiguation hints', 'References']);
});

test('the file_bitnet block is exact, written only from domain facets, and read back unchanged by a comma-split reader', () => {
  assert.equal(textOf('probe-quoted-metadata-v03.native-header.txt'), ROOT_BLOCK);
  assert.equal(textOf('probe-quoted-metadata-v02.native-header.txt'), ROOT_BLOCK);
  assert.deepEqual(naiveHeader(ROOT_BLOCK), { domain: ['public research', 'source comparison'] });
  assert.deepEqual(naiveHeader(textOf('starter-estimate-assumptions.v2.native-header.txt')), { domain: ['environmental reports', 'technical reports'] });
  for (const f of manifest.files.filter(f => f.kind === 'projection_text')) {
    const text = textOf(f.file), lines = text.split('\n');
    const native = lines.filter(l => l.startsWith(';;') && !l.startsWith(';;;'));
    const json = JSON.parse(textOf(f.file.replace('.txt', '.json')));
    if (f.nativeHeader === 'emitted') {
      const at = lines.indexOf(';; schema: garrison/file_bitnet/v1');
      assert.match(lines[at - 1], /^;;; Section 1\. /, f.file + ': the block opens section 1');
      assert.equal(native.join('\n') + '\n', textOf(f.file.replace('.projection.txt', '.native-header.txt')), f.file);
      assert.deepEqual(Object.keys(naiveHeader(text)), ['domain'], f.file + ': no key but domain');
      assert.deepEqual(naiveHeader(text), json.nativeHeader.fields, f.file);
    } else {
      assert.deepEqual(native, [], f.file + ': no native syntax without a complete block');
      assert.deepEqual(json.nativeHeader.fields, {}, f.file);
      assert.equal(json.nativeHeader.text, null, f.file);
    }
  }
});

test('quoted author text never reaches a projection, so a quoted example becomes no status, domain or authority', () => {
  for (const probe of PROBES) {
    const source = textOf(probe + '.cycl');
    assert.ok(source.includes(QUOTED), probe + ' keeps the quoted string exactly');
    assert.ok(naiveAssertions(source).includes('bitnetLabel RATIFIED') && naiveAssertions(source).includes('bitnetDomain (list forged_domain)'), probe + ': a reader that ignores quotes misreads the source (modelled hazard)');
    for (const kind of ['.projection.txt', '.projection.json']) {
      const out = textOf(probe + kind);
      assert.deepEqual(naiveAssertions(out), [], probe + kind);
      for (const token of FORGED) assert.ok(!out.includes(token), probe + kind + ' contains ' + token);
      assert.ok(!(naiveHeader(out, { anchored: false }).domain || []).includes('forged domain'), probe + kind);
    }
    const text = textOf(probe + '.projection.txt');
    assert.ok(!/[()"]/.test(text), probe + ': the projection text holds no parentheses or quotation marks');
  }
  assert.deepEqual(naiveHeader(textOf('probe-quoted-header-v01.cycl')), { domain: ['forged domain'] }, 'format v0.1 can start a quoted line with ;; (modelled hazard)');
  assert.deepEqual(naiveHeader(textOf('probe-quoted-header-v01.projection.txt')), {});
  assert.deepEqual(naiveHeader(textOf('probe-quoted-metadata-v03.cycl'), { anchored: false }), { domain: ['forged domain'] }, 'an unanchored reader finds quoted header text mid-line (modelled hazard)');
  assert.deepEqual(naiveHeader(textOf('probe-quoted-metadata-v03.projection.txt'), { anchored: false }), { domain: ['public research', 'source comparison'] });
});

test('a domain facet the native list cannot carry exactly blocks the whole header block, and the definition keeps it', () => {
  const source = textOf('probe-quoted-header-v01.cycl'), json = JSON.parse(textOf('probe-quoted-header-v01.projection.json'));
  assert.ok(source.includes('(contextFacet ReckonerProbeQuotedHeaderV01Mt "domain" "water, air")'));
  assert.equal(json.nativeHeader.status, 'unsupported');
  assert.deepEqual(json.nativeHeader.domainFacets.map(d => d.representable), [true, false]);
  assert.equal(json.nativeHeader.domainFacets[1].sha256, sha('water, air'));
  assert.ok(!textOf('probe-quoted-header-v01.projection.txt').includes('water'));
  assert.ok(!textOf('probe-quoted-header-v01.projection.txt').includes('public research'), 'not partially written');
});

test('fixtures match what the shipped modules produce', async () => {
  const { buildFixtures } = await import('../scripts/make-context-fixtures.mjs');
  const files = await buildFixtures();
  assert.deepEqual([...files.keys()].sort(), [...manifest.files.map(f => f.file), 'MANIFEST.json'].sort());
  for (const [name, text] of files) assert.equal(textOf(name), text, name);
});

test('the shipped reader honours quotation marks and refuses BitNet assertions outside them', async () => {
  const C = await import('../dist/contexts.js');
  for (const probe of ['probe-quoted-metadata-v03', 'probe-quoted-metadata-v02']) {
    const { model, assertions } = C.readAssertions(textOf(probe + '.cycl'));
    assert.equal(model.meaning, QUOTED);
    assert.ok(!assertions.some(a => a.predicate.startsWith('bitnet')));
    assert.deepEqual(model.facets.map(f => f.value), ['public research', 'source comparison']);
  }
  const source = textOf('probe-quoted-metadata-v03.cycl');
  const asserted = source.replace(/\n;;; Section 2\./, '\n(bitnetLabel ReckonerProbeQuotedMetadataV03Mt RATIFIED)\n;;; Section 2.');
  assert.notEqual(asserted, source);
  assert.throws(() => C.parseDefinition(asserted), /unsupported assertion "bitnetLabel"/);
});
