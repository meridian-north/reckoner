import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { STATIC_TYPES } from '../scripts/static-types.mjs';

// The walkthrough servers serve dist/ with this table. An unmapped extension is
// served as application/octet-stream, which browsers refuse for module scripts.
test('the walkthrough servers give every dist file a type, and every module a JavaScript type', () => {
  const root=new URL('../dist/', import.meta.url);
  const files=fs.readdirSync(root,{withFileTypes:true}).flatMap(entry=>entry.isFile()?[entry.name]:entry.isDirectory()&&entry.name==='resources'?fs.readdirSync(new URL('resources/',root)).map(name=>'resources/'+name):assert.fail('Unexpected dist entry: '+entry.name));
  const missing = files.map(f => (f.match(/\.[a-z0-9]+$/i) || [''])[0]).filter(ext => !Object.hasOwn(STATIC_TYPES, ext));
  assert.deepEqual([...new Set(missing)], []);
  const imported = new Set();
  for (const file of files.filter(f => /\.(m?js|html)$/.test(f))) {
    const text = fs.readFileSync(new URL('../dist/' + file, import.meta.url), 'utf8');
    for (const m of text.matchAll(/(?:from\s+|import\s*\(\s*|<script[^>]*\bsrc=)["'](?:\.\/)?([^"'\/]+\.m?js)["']/g)) imported.add(m[1]);
  }
  assert.ok(imported.has('discovery.mjs') && imported.has('discovery-ui.mjs'), 'module references found: ' + [...imported].join(', '));
  for (const name of imported) assert.match(STATIC_TYPES[name.match(/\.m?js$/)[0]], /^text\/javascript/, name);
});
