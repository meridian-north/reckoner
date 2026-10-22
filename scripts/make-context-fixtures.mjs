import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { buildDefinition, recordFromModel, LEGACY_FORMAT, FORMAT_V02, FORMAT_V03 } from '../dist/contexts.js';
import { starterEntries } from '../dist/starters.js';
import { projectToNative } from '../dist/native-projection.js';

// Writes the public context fixtures in tests/fixtures/contexts. With --check, compares
// and changes nothing. Version 1 starters must keep their published hashes; if one
// changed, nothing is written.
export const FIXTURE_DIR = new URL('../tests/fixtures/contexts/', import.meta.url);
export const FIXTURE_SCHEMA = 'reckoner.context_fixtures.v0.1';
export const V1_STARTER_HASHES = Object.freeze({
  'ctx:starter:literal-transcription': 'c0ef0ecc03b35a133e8f76b3dfbf4f3f40cbe37847677c27b63b0d9b7b3d35e0',
  'ctx:starter:image-interpretation': '7903c95108e7b5590955ef0db75f73630b0bdb8dce52323ea9ef335856acbd1b',
  'ctx:starter:accountable-review': 'ad19958955903455679b59ecff2e88fb9429b89d0a30d4559a917fa10f516b28',
  'ctx:starter:estimate-assumptions': '6e308813cd178af74c31527365f705a36d59ea64975931ec9e8aaccad1ff8b5b',
});

// The quoted string a native reader measured on 2026-10-15 as producing metadata.
export const QUOTED_PROBE = 'An example string: (bitnetLabel ExampleMt RATIFIED) and (bitnetDomain ExampleMt (list forged_domain)).';
const FAKE_BLOCK = [';; schema: garrison/file_bitnet/v1', ';; file_bitnet:', ';;   domain: [forged domain]', ';; end_file_bitnet'];
const PROBE = {
  version: 1, author: 'Reckoner public fixtures', createdAt: '2026-10-15T13:00:00.000Z', releaseLabel: 'personal', basis: 'newly_authored',
  provenance: 'A synthetic public test fixture written for Reckoner on 2026-10-15. Its text quotes wording that looks like native metadata, so that a reader can be checked for honouring quotation marks. It declares no metadata beyond its own fields.',
  parents: [], compositions: [], adaptedFrom: null, revisionOf: null, revisionReason: null,
  meaning: QUOTED_PROBE,
  facets: [{ group: 'domain', value: 'public research' }, { group: 'domain', value: 'source comparison' }],
  emphasis: ['what'],
  concepts: [{ term: 'quoted example', meaning: 'Wording inside quotation marks, such as (bitnetDomain ExampleMt (list forged_domain)). It asserts nothing.' }],
  rules: ['Quoted, not asserted: ' + FAKE_BLOCK.join(' ')],
  operations: [],
  hints: ['A reader that ignores quotation marks would take (bitnetLabel ExampleMt PROMOTED) for a status.'],
  references: [{ label: '(bitnetLabel ExampleMt RATIFIED)', url: '', locator: 'a quoted label, not a status' }],
};
const PROBES = [
  ['probe-quoted-metadata-v03', { ...PROBE, format: FORMAT_V03, id: 'ctx:probe:quoted-metadata-v03', symbol: 'ReckonerProbeQuotedMetadataV03Mt', name: 'Quoted metadata probe, format v0.3' }],
  ['probe-quoted-metadata-v02', { ...PROBE, format: FORMAT_V02, id: 'ctx:probe:quoted-metadata-v02', symbol: 'ReckonerProbeQuotedMetadataV02Mt', name: 'Quoted metadata probe, format v0.2' }],
  // Format v0.1 keeps line breaks inside text, so quoted lines can start with ;; here.
  // One domain facet holds a comma, so no native header block can be written.
  ['probe-quoted-header-v01', { ...PROBE, format: LEGACY_FORMAT, id: 'ctx:probe:quoted-header-v01', symbol: 'ReckonerProbeQuotedHeaderV01Mt', name: 'Quoted header probe, format v0.1', meaning: QUOTED_PROBE + '\n' + FAKE_BLOCK.join('\n'), facets: [{ group: 'domain', value: 'public research' }, { group: 'domain', value: 'water, air' }] }],
];
const PROJECTED = ['starter-literal-transcription.v1', 'starter-estimate-assumptions.v2', 'probe-quoted-metadata-v03', 'probe-quoted-metadata-v02', 'probe-quoted-header-v01'];

const sha256 = data => createHash('sha256').update(data).digest('hex');

export async function buildFixtures() {
  const files = new Map(), definitions = new Map();
  for (const entry of await starterEntries()) {
    if (entry.record.version === 1 && V1_STARTER_HASHES[entry.record.id] !== entry.record.sha256) throw Error('Version 1 of ' + entry.record.id + ' changed its hash. Nothing was written.');
    definitions.set('starter-' + entry.record.id.replace('ctx:starter:', '') + '.v' + entry.record.version, entry);
  }
  for (const [name, model] of PROBES) definitions.set(name, await recordFromModel(buildDefinition(model), null, { enforceBudget: false }));
  const entries = [];
  for (const [name, { record, model }] of definitions) {
    files.set(name + '.cycl', record.text);
    entries.push({ file: name + '.cycl', kind: 'definition', id: record.id, version: record.version, format: model.format, sha256: record.sha256, bytes: record.bytes });
  }
  for (const name of PROJECTED) {
    const { record } = definitions.get(name), projection = await projectToNative(record);
    const json = JSON.stringify(projection, null, 2) + '\n';
    files.set(name + '.projection.txt', projection.projectionText.text);
    files.set(name + '.projection.json', json);
    entries.push({ file: name + '.projection.txt', kind: 'projection_text', source: name + '.cycl', nativeHeader: projection.nativeHeader.status });
    entries.push({ file: name + '.projection.json', kind: 'projection_json', source: name + '.cycl', nativeHeader: projection.nativeHeader.status });
    if (projection.nativeHeader.text) {
      files.set(name + '.native-header.txt', projection.nativeHeader.text);
      entries.push({ file: name + '.native-header.txt', kind: 'native_header', source: name + '.cycl', nativeHeader: projection.nativeHeader.status });
    }
  }
  for (const entry of entries) {
    const data = Buffer.from(files.get(entry.file), 'utf8');
    Object.assign(entry, { sha256: sha256(data), bytes: data.length });
  }
  entries.sort((a, b) => (a.file < b.file ? -1 : 1));
  const manifest = {
    schema: FIXTURE_SCHEMA,
    note: 'Synthetic public fixtures. Definitions are canonical Reckoner context texts; projections and header blocks are derived from them. Nothing here is a native admission, a compatibility claim or a private definition.',
    files: entries,
  };
  files.set('MANIFEST.json', JSON.stringify(manifest, null, 2) + '\n');
  return files;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const files = await buildFixtures(), check = process.argv.includes('--check'), differ = [];
  if (!check) await fs.mkdir(FIXTURE_DIR, { recursive: true });
  for (const [name, text] of files) {
    const url = new URL(name, FIXTURE_DIR);
    const current = await fs.readFile(url, 'utf8').catch(() => null);
    if (current === text) continue;
    if (check) differ.push(name); else await fs.writeFile(url, text);
  }
  const extra = (await fs.readdir(FIXTURE_DIR).catch(() => [])).filter(name => !files.has(name));
  if (check && (differ.length || extra.length)) { console.error('Fixtures differ: ' + [...differ, ...extra.map(n => n + ' (not generated)')].join(', ')); process.exitCode = 1; }
  else if (!check && extra.length) { console.error('Files not generated by this script: ' + extra.join(', ') + '. Remove them by hand if they are stale.'); process.exitCode = 1; }
  else console.log((check ? 'Fixtures match (' : 'Fixtures written (') + files.size + ' files).');
}
