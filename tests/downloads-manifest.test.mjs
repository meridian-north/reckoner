// The downloads page lists every resource with hashes that match the bytes
// served. A downloaded bundle carries neither the attendee copy nor this list.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';

const root = new URL('../', import.meta.url), resources = new URL('dist/resources/', root), manifestUrl = new URL('ASSET_MANIFEST.json', resources);
const inBundle = !fs.existsSync(manifestUrl) && fs.existsSync(new URL('BUNDLE_MANIFEST.json', root));

test('every downloadable resource is listed once, with the bytes and hash of the file served', t => {
  if (inBundle) { t.skip('downloaded bundle: the attendee copy and its manifest are not part of the bundle'); return; }
  const manifest = JSON.parse(fs.readFileSync(manifestUrl, 'utf8'));
  const listed = manifest.files.map(entry => entry.file);
  assert.equal(new Set(listed).size, listed.length);
  assert.deepEqual(fs.readdirSync(resources).filter(name => name !== 'ASSET_MANIFEST.json').sort(), [...listed].sort());
  for (const entry of manifest.files) {
    const data = fs.readFileSync(new URL(entry.file, resources));
    assert.equal(data.length, entry.bytes, entry.file);
    assert.equal(createHash('sha256').update(data).digest('hex'), entry.sha256, entry.file);
  }
  const page = fs.readFileSync(new URL('dist/downloads.html', root), 'utf8');
  for (const file of listed) assert.ok(page.includes('href="resources/' + file + '"'), 'downloads page lacks ' + file);
});

test('downloaded guide, FAQ and adoption proposal match the reviewed source documents',()=>{for(const name of ['USER_GUIDE.md','PUBLIC_SAFE_FAQ.md','ADOPTION_PROPOSAL.md'])assert.deepEqual(fs.readFileSync(new URL('dist/resources/'+name,root)),fs.readFileSync(new URL(name,root)),name);});
