// End-to-end walkthrough of reading contexts in a real Chromium browser.
// Optional developer check, separate from `npm test`. It needs Playwright and a
// Chromium build; set PLAYWRIGHT_MODULE to the playwright package directory if
// it is not resolvable, and CHROMIUM_PATH to use a specific executable.
// It serves dist/ on 127.0.0.1 only, uses synthetic data, and sends nothing
// anywhere else (the real-report step's embedded EPA preview may be blocked).
// Asynchronous race regressions are covered by tests/review-repros.test.mjs, not here.
// Usage: node scripts/browser-walkthrough.mjs [output directory]
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import * as C from '../dist/contexts.js';
import { STATIC_TYPES } from './static-types.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const DIST = path.join(ROOT, 'dist');
const OUT = path.resolve(process.argv[2] || path.join(ROOT, '.build', 'browser-walkthrough'));
const TYPES = STATIC_TYPES;

async function loadPlaywright() {
  if (process.env.PLAYWRIGHT_MODULE) return createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE);
  try { return await import('playwright'); } catch { throw Error('Playwright is not installed. Set PLAYWRIGHT_MODULE to its package directory.'); }
}

function serve() {
  const server = http.createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      const file = path.resolve(DIST, '.' + (pathname === '/' ? '/index.html' : pathname));
      if (!file.startsWith(DIST + path.sep)) throw Error('outside dist');
      const body = await fs.readFile(file);
      response.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
      response.end(body);
    } catch { response.writeHead(404); response.end('Not found'); }
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

// 1x1 PNG, used to show that a format is measured from content bytes.
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360f8cf000000040001f61738550000000049454e44ae426082', 'hex');

const results = [];
let shot = 0;
async function step(name, fn) {
  try { const detail = await fn(); results.push({ step: name, verdict: 'PASS', detail: detail ?? null }); console.log('PASS', name, detail ? '· ' + detail : ''); }
  catch (error) { results.push({ step: name, verdict: 'FAIL', detail: error.message }); console.log('FAIL', name, '·', error.message); }
}
const check = (condition, message) => { if (!condition) throw Error(message); };

const { chromium } = await loadPlaywright();
await fs.mkdir(OUT, { recursive: true });
const server = await serve();
const base = 'http://127.0.0.1:' + server.address().port + '/index.html';
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const problems = [];

async function open(viewport = { width: 1360, height: 1000 }) {
  const context = await browser.newContext({ viewport, acceptDownloads: true });
  const page = await context.newPage();
  page.on('dialog', dialog => dialog.accept());
  page.on('pageerror', error => problems.push({ kind: 'pageerror', text: error.message }));
  page.on('console', message => { if (message.type() === 'error') problems.push({ kind: 'console', text: message.text() }); });
  await page.goto(base);
  await page.waitForSelector('#load-example', { state: 'attached' });
  return { context, page };
}
async function capture(page, name) { const file = path.join(OUT, String(++shot).padStart(2, '0') + '-' + name + '.png'); await page.screenshot({ path: file, fullPage: false }); return file; }
async function download(page, action) {
  const [file] = await Promise.all([page.waitForEvent('download'), action()]);
  return { name: file.suggestedFilename(), text: newestReceipt(await fs.readFile(await file.path(), 'utf8')) };
}
// Save review record now downloads a creator-history bundle. Steps that inspect the
// exported record read the receipt bound to its newest entry; any other download is
// returned unchanged. A bundle without that exact snapshot fails the step.
function newestReceipt(text) {
  let bundle; try { bundle = JSON.parse(text); } catch { return text; }
  if (bundle?.schema !== 'reckoner.creator-history-bundle.v1') return text;
  const tip = JSON.parse(bundle.history).entries.at(-1).body.receipt;
  const snapshot = bundle.snapshots.find(s => s.sha256 === tip.sha256);
  if (!snapshot) throw Error('history bundle lacks its newest receipt snapshot');
  const bytes = Buffer.from(snapshot.base64, 'base64');
  if (bytes.length !== tip.bytes || createHash('sha256').update(bytes).digest('hex') !== tip.sha256) throw Error('newest receipt snapshot does not match its pin');
  return bytes.toString('utf8');
}
const showIntro = async page => { if (await page.isHidden('#intro')) await page.click('#toggle-intro'); };
// The introduction starts collapsed in the compact layout; these steps only need it out of the way.
const hideIntro = async page => { if (await page.isVisible('#intro')) await page.click('#toggle-intro'); };
const detail = page => page.textContent('#context-detail');

const { context: first, page } = await open();
let receipt, packageText, receiptText;

await step('1. Page loads with four tabs and starter contexts', async () => {
  const tabs = await page.$$eval('.tab', t => t.map(x => x.textContent.trim()));
  check(tabs.length === 4 && tabs[3] === '4. Contexts', 'tabs: ' + tabs.join(' | '));
  await hideIntro(page);
  await page.click('#tab-contexts');
  const items = await page.$$eval('.context-item', t => t.map(x => x.textContent));
  check(items.length === 4 && items.every(t => t.includes('Starter example') && t.includes(' v2 (2 versions)')), 'starters: ' + items.join(' | '));
  return items.length + ' starters listed, each at version 2 with version 1 kept';
});

await step('2. Create a personal context with plural facets and full meaning', async () => {
  await page.click('#context-new');
  await page.fill('#ctx-name', 'Probate filing dates');
  await page.fill('#ctx-meaning', 'Read each filing date exactly as the clerk stamped it, including "approximate" marks.\nKeep original month names: 原文 stays as written.');
  await page.fill('#ctx-author', 'Reader A');
  await page.fill('#ctx-provenance', 'My own notes from a county archive course.');
  for (const label of ['Kind of work: transcription', 'Media or format: pdf', 'Media or format: handwriting']) await page.check('#ctx-facet-choices label:has-text("' + label + '") input');
  await page.fill('#ctx-facets-other', 'domain: probate records\naudience: volunteers');
  for (const w of ['who', 'when']) await page.check('#ctx-emphasis label:has-text("' + w + '") input');
  await page.fill('#ctx-concepts', 'filing date: the date in the clerk stamp\nrecorded date: the date entered in the register');
  await page.fill('#ctx-rules', 'Never normalize month names.\nKeep both dates when they differ.');
  await page.fill('#ctx-op-readingTextSizePx', '18');
  const size = await page.textContent('#ctx-size');
  check(/Measured definition size: [\d,]+ bytes \(UTF-8\)/.test(size), size);
  await capture(page, 'editor-create');
  await page.click('#ctx-save');
  await page.waitForFunction(() => document.querySelector('#context-detail h2')?.textContent === 'Probate filing dates');
  const text = await detail(page);
  check(text.includes('Personal context') && text.includes('Size: ') && text.includes('Model checks: not run'), 'detail lacks status lines');
  check(text.includes('Format: reckoner.context.cycl.v0.3, the native six-section order, with filing and discovery facets in the section 1 header.'), 'new context is not in format v0.3');
  check(size.includes((await page.textContent('#context-detail')).match(/Size: ([\d,]+) bytes/)[1]), 'editor size ' + size + ' differs from saved size');
  await capture(page, 'context-created');
  return size.replace('Measured definition size: ', '');
});

await step('3. Derive a narrower context; the parent is pinned and shown', async () => {
  await page.click('#context-detail >> text=Derive a narrower context');
  await page.fill('#ctx-name', 'Probate stamp corrections');
  await page.fill('#ctx-meaning', 'Corrections written over a stamp are read separately from the stamp.');
  await page.fill('#ctx-author', 'Reader A');
  await page.click('#ctx-save');
  await page.waitForFunction(() => document.querySelector('#context-detail h2')?.textContent === 'Probate stamp corrections');
  const text = await detail(page);
  check(text.includes('Probate filing dates v1') && text.includes('Reads within: Probate filing dates v1 → Probate stamp corrections v1'), 'parent not shown');
  return 'Reads within: Probate filing dates v1 → Probate stamp corrections v1';
});

await step('4. Revise the parent: a reason is required; v1 stays; the child still pins v1', async () => {
  await page.click('.context-item:has-text("Probate filing dates")');
  await page.click('#context-detail >> text=Revise (new version)');
  await page.click('#ctx-save');
  check((await page.textContent('#ctx-error')).includes('reason'), 'missing reason accepted');
  await page.fill('#ctx-author', 'Reader A');
  await page.fill('#ctx-reason', 'Add the register date rule.');
  await page.fill('#ctx-rules', 'Never normalize month names.\nKeep both dates when they differ.\nNote the register page.');
  await page.click('#ctx-save');
  await page.waitForFunction(() => /Revises version 1/.test(document.querySelector('#context-detail')?.textContent || ''));
  const versions = await page.$$eval('#context-version-select option', o => o.map(x => x.textContent));
  check(versions.length === 2, 'versions: ' + versions.join(' | '));
  await page.click('.context-item:has-text("Probate stamp corrections")');
  check((await detail(page)).includes('a newer version (v2) exists; this context still uses v1'), 'child does not show the newer parent');
  return versions.join(' | ');
});

await step('5. A byte budget refuses an oversized definition without shortening it', async () => {
  await page.click('#context-budget-panel summary');
  await page.fill('#context-budget', '400');
  await page.click('#context-budget-apply');
  await page.click('#context-new');
  await page.fill('#ctx-name', 'Too long');
  await page.fill('#ctx-meaning', 'x'.repeat(600));
  await page.fill('#ctx-author', 'Reader A');
  await page.fill('#ctx-provenance', 'Test.');
  const size = await page.textContent('#ctx-size');
  await page.click('#ctx-save');
  const error = await page.textContent('#ctx-error');
  check(/configured budget of 400 bytes/.test(error) && /Nothing was shortened/.test(error), error);
  check((await page.inputValue('#ctx-meaning')).length === 600, 'meaning was altered');
  await page.click('#ctx-cancel');
  await page.fill('#context-budget', '');
  await page.click('#context-budget-apply');
  return size;
});

await step('6. Worked example: choose a starter context, apply its declared view settings, save', async () => {
  await page.click('#tab-reading');
  await showIntro(page);
  await page.click('#load-example');
  await page.waitForFunction(() => document.querySelector('#title')?.value.startsWith('Worked example'));
  await page.click('#reading-context-panel summary');
  const key = await page.$eval('#reading-context-select', s => [...s.options].find(o => o.textContent.startsWith('Literal transcription v2')).value);
  await page.selectOption('#reading-context-select', key);
  await page.waitForFunction(() => document.querySelector('#reading-context-badge').textContent.includes('Literal transcription v2'));
  await page.click('#reading-context-apply');
  check(await page.inputValue('#reading-size') === '17', 'reading size not applied');
  await page.fill('#contributor', 'Reader A');
  await capture(page, 'reading-context-selected');
  await page.click('#save-revision');
  await page.waitForFunction(() => document.querySelector('#revision-count').textContent === '1');
  const history = await page.textContent('#history-list');
  check(history.includes('Reading context: Literal transcription v2') && history.includes('definition carried in this record') && history.includes('view settings applied'), 'history lacks the pinned context');
  return 'reading text size 17 applied and recorded';
});

await step('7. A mentor review binds to the exact context version', async () => {
  await page.click('#tab-history');
  await page.fill('#reviewer', 'Mentor M');
  await page.selectOption('#review-role', 'mentor');
  await page.selectOption('#decision', 'needs_review');
  await page.fill('#review-reason', 'Check the final digit of the date against the stamp on line 2.');
  await page.click('#save-review');
  // History persistence is asynchronous (IndexedDB); wait for the review outcome before reading the list.
  await page.waitForFunction(() => /Review recorded|not saved|unavailable|changed/i.test(document.querySelector('#toast').textContent), null, { timeout: 10000 });
  const history = await page.textContent('#history-list');
  check(history.includes('context ctx:starter:literal-transcription@2'), 'review lacks the context binding');
  return 'review records ctx:starter:literal-transcription@2';
});

await step('8. Contexts tab: self-declared blessing and a mentor check against the saved passage', async () => {
  await page.click('#tab-contexts');
  await page.click('.context-item:has-text("Literal transcription")');
  await page.click('#context-detail >> text=Record a human blessing (self-declared)');
  await page.fill('#ctx-bless-reason', 'I read this exact version and use it for my transcriptions.');
  await page.click('#context-detail >> text=Record blessing');
  await page.waitForFunction(() => /Human blessing: Reader A/.test(document.querySelector('#context-detail').textContent));
  await page.click('#context-detail >> text=Record a mentor or reviewer check');
  await page.fill('#ctx-check-name', 'Mentor M');
  await page.fill('#ctx-check-text', 'Open the example image, zoom to line 2 and compare the final digit with the 4 in 1912.');
  await page.click('#context-detail >> text=Record check');
  await page.waitForFunction(() => /Mentor and reviewer checks: 1/.test(document.querySelector('#context-detail').textContent));
  const text = await detail(page);
  check(text.includes('Model checks: not run') && text.includes('Promotion for a model: not promoted') && text.includes('Institutional approval') && text.includes('None. A receiving institution'), 'lifecycle groups missing');
  await capture(page, 'lifecycle');
  return 'blessing and check recorded; model checks not run; no institutional approval';
});

await step('9. Plural facets with typed dates and a measured format, then a second reading', async () => {
  await page.click('#tab-reading');
  await page.setInputFiles('#source-image', { name: 'synthetic-notice.png', mimeType: 'image/png', buffer: PNG });
  await page.click('#tab-context');
  await page.click('#facets-panel summary');
  await page.waitForFunction(() => /image\/png/.test(document.querySelector('#measured-format').textContent));
  await page.click('#record-measured-format');
  for (const [label, locator] of [['Council clerk', 'line 9'], ['The clerk', 'line 2']]) {
    await page.selectOption('#facet-group', 'people_organizations');
    await page.fill('#facet-label', label);
    await page.selectOption('#facet-basis', 'stated_in_source');
    await page.fill('#facet-locator', locator);
    await page.click('#add-facet');
  }
  await page.selectOption('#facet-group', 'places_jurisdictions');
  await page.fill('#facet-label', 'Synthetic County');
  await page.selectOption('#facet-basis', 'contributor_inference');
  await page.click('#add-facet');
  await page.selectOption('#date-kind', 'source_event');
  await page.fill('#date-value', '4 June 1912');
  await page.selectOption('#date-basis', 'stated_in_source');
  await page.fill('#date-locator', 'signature line');
  await page.click('#add-date');
  await page.selectOption('#date-kind', 'upload');
  await page.fill('#date-value', 'UNKNOWN');
  await page.selectOption('#date-basis', 'unknown');
  await page.click('#add-date');
  const list = await page.textContent('#facet-list');
  check(list.includes('Council clerk') && list.includes('Upload date: UNKNOWN') && list.includes('image/png · Measured from file content') && list.includes('Not recorded: edition date, observation date'), 'facet list incomplete');
  await capture(page, 'facets');
  await page.click('#tab-reading');
  await page.fill('#reason', 'The scan reads 17 June. Facets recorded for the notice.');
  await page.click('#save-revision');
  await page.waitForFunction(() => document.querySelector('#revision-count').textContent === '2');
  return 'entities, typed dates and measured image/png recorded';
});

await step('10. An attributed relationship, a dispute, and a facet filter that keeps joins separate', async () => {
  await page.click('#tab-history');
  const reading2 = await page.$eval('#assertion-reading', s => [...s.options].find(o => o.textContent.startsWith('Reading 2')).value);
  await page.selectOption('#assertion-reading', reading2);
  const subject = await page.$eval('#assertion-subject', s => [...s.options].find(o => o.textContent.endsWith('Council clerk')).value);
  const object = await page.$eval('#assertion-object', s => [...s.options].find(o => o.textContent.endsWith('The clerk')).value);
  await page.selectOption('#assertion-subject', subject);
  await page.selectOption('#assertion-relation', 'same_as');
  await page.selectOption('#assertion-object', object);
  await page.fill('#assertion-locator', 'lines 2 and 9');
  await page.fill('#assertion-reason', 'The notice names the same office twice.');
  await page.selectOption('#assertion-uncertainty', 'uncertain');
  await page.fill('#assertion-by', 'Reader A');
  await page.click('#add-assertion');
  await page.click('#history aside details:has-text("Review a relationship") summary');
  await page.fill('#assertion-reviewer', 'Reader B');
  await page.selectOption('#assertion-decision', 'disputed');
  await page.fill('#assertion-review-reason', 'Two different clerks are possible in 1912.');
  await page.click('#save-assertion-review');
  check((await page.textContent('#assertion-list')).includes('Status: disputed'), 'dispute not shown');
  // A third reading keeps only "The clerk", so it is linked only through the relationship.
  await page.click('#tab-context');
  await page.click('#facet-list p:has-text("Council clerk") button');
  await page.click('#tab-reading');
  await page.fill('#reason', 'Third pass keeps only the short form of the office.');
  await page.click('#save-revision');
  await page.waitForFunction(() => document.querySelector('#revision-count').textContent === '3');
  await page.click('#tab-history');
  await page.click('#facet-filter-panel summary');
  const facet = await page.$eval('#facet-filter', s => [...s.options].find(o => o.textContent.startsWith('People and organizations: Council clerk')).value);
  await page.selectOption('#facet-filter', facet);
  const results = await page.textContent('#facet-filter-results');
  check(results.includes('Exact matches: 1') && results.includes('Linked only through a recorded relationship') && results.includes('disputed'), results);
  await capture(page, 'facet-filter');
  return 'exact 1; linked reading shown separately with its disputed status';
});

await step('11. Export the review record; it carries pinned definitions and review records', async () => {
  const file = await download(page, () => page.click('#export-cairn'));
  receiptText = file.text;
  receipt = JSON.parse(file.text);
  const literal = receipt.contextDefinitions?.find(d => d.id === 'ctx:starter:literal-transcription');
  check(literal && literal.version === 2 && literal.sha256 === '1f922aed03a439166eb08dedbddafddfcd6fd694f1e1ebe43385d00849d7fd56', 'definition missing or changed');
  check(receipt.contextEvents.some(e => e.type === 'blessing') && receipt.contextEvents.some(e => e.type === 'mentor_check'), 'review records missing');
  check(receipt.assertions.length === 1 && receipt.assertionReviews[0].decision === 'disputed', 'relationship missing');
  check(receipt.reviews[0].context?.id === 'ctx:starter:literal-transcription', 'review binding missing');
  return file.name + ' · ' + receipt.contextDefinitions.length + ' definition(s), ' + receipt.contextEvents.length + ' context review record(s)';
});

await step('12. Save as CSV cites the context by ID, version and hash only', async () => {
  await page.locator('.task-more > summary').click();
  await page.click('#export-save-as');
  await page.selectOption('#save-format', 'csv');
  const file = await download(page, () => page.click('#download-save-copy'));
  check(file.name.endsWith('.csv'), file.name);
  check(file.text.includes('ctx:starter:literal-transcription@2#sha256:1f922aed') && !file.text.includes('character for character'), 'CSV repeats definition text or lacks the reference');
  return file.name + ' · ' + (file.text.trim().split('\r\n').length - 1) + ' reading rows';
});

await step('13. Export my contexts as a package', async () => {
  await page.click('#tab-contexts');
  const file = await download(page, () => page.click('#context-export-library'));
  packageText = file.text;
  const pkg = JSON.parse(file.text);
  check(pkg.schema === 'reckoner.context_package.v0.1' && pkg.definitions.length === 3, 'definitions: ' + pkg.definitions.length);
  return file.name + ' · ' + pkg.definitions.map(d => d.id.slice(0, 12) + '…@' + d.version).join(', ');
});

const { context: second, page: fresh } = await open();
await step('14. A fresh browser profile reopens the package with identical bytes and hashes', async () => {
  const original = JSON.parse(packageText);
  await fresh.click('#tab-contexts');
  await fresh.setInputFiles('#context-import-file', { name: 'contexts.json', mimeType: 'application/json', buffer: Buffer.from(packageText) });
  await fresh.waitForFunction(() => /Opened contexts.json/.test(document.querySelector('#context-library-status').textContent));
  const stored = JSON.parse(await fresh.evaluate(() => localStorage.getItem('reckoner-context-library-v01')));
  for (const definition of original.definitions) {
    const copy = stored.definitions.find(d => d.id === definition.id && d.version === definition.version);
    check(copy && copy.text === definition.text && copy.sha256 === definition.sha256 && copy.sha256 === await C.sha256Hex(copy.text), 'mismatch for ' + definition.id);
  }
  return original.definitions.length + ' definitions byte-identical';
});

await step('15. The fresh profile reopens the review record with its contexts and reviews', async () => {
  await fresh.click('#tab-reading');
  await fresh.setInputFiles('#import-file', { name: 'record.json', mimeType: 'application/json', buffer: Buffer.from(receiptText) });
  await fresh.waitForFunction(() => document.querySelector('#revision-count').textContent === '3');
  await fresh.click('#tab-history');
  const history = await fresh.textContent('#history-list');
  check(history.includes('Reading context: Literal transcription v2') && history.includes('context ctx:starter:literal-transcription@2'), 'reopened history lacks contexts');
  await fresh.click('#tab-contexts');
  await fresh.click('.context-item:has-text("Literal transcription")');
  check((await fresh.textContent('#context-detail')).includes('Human blessing: Reader A'), 'blessing not carried');
  return 'readings, review binding and blessing restored';
});

await step('16. Cyclic, malformed and executable-looking files are refused and nothing changes', async () => {
  const form = name => ({ name, author: 'Synthetic', provenance: 'Synthetic.', meaning: 'Synthetic.', facets: [], emphasis: [], concepts: [], rules: [], operations: [], hints: [], references: [] });
  const a1 = await C.draftContext({ mode: 'new', form: form('Cycle A'), policy: null });
  const b1 = await C.draftContext({ mode: 'derive', base: a1, form: form('Cycle B'), policy: null });
  const a2 = await C.draftContext({ mode: 'revise', base: a1, form: { ...form('Cycle A'), revisionReason: 'Make a cycle.' }, parents: [b1], policy: null });
  const cyclic = JSON.stringify(await C.sealPackage([a1.record, b1.record, a2.record], []));
  const evalText = a1.record.text.replace(/^;;; Section 6\. .*$/m, line => '(eval ' + a1.model.symbol + ' "x")\n' + line);
  check(evalText !== a1.record.text && evalText.includes('(eval '), 'the executable-looking line was not inserted');
  const before = await fresh.evaluate(() => localStorage.getItem('reckoner-context-library-v01'));
  const messages = [];
  for (const [name, text] of [['cycle.json', cyclic], ['broken.json', '{"schema":'], ['eval.cycl', evalText]]) {
    await fresh.setInputFiles('#context-import-file', { name, mimeType: 'text/plain', buffer: Buffer.from(text) });
    await fresh.waitForFunction(n => document.querySelector('#context-library-status').textContent.startsWith('Nothing was imported') && document.querySelector('#context-library-status').dataset.seen !== n, name);
    messages.push((await fresh.textContent('#context-library-status')).slice(0, 90));
    await fresh.evaluate(n => { document.querySelector('#context-library-status').dataset.seen = n; document.querySelector('#context-library-status').textContent = ''; }, name);
  }
  check(before === await fresh.evaluate(() => localStorage.getItem('reckoner-context-library-v01')), 'library changed');
  return messages.join(' / ');
});

await step('17. Real-report walkthrough opens with the narrower starter context; export and reopen', async () => {
  await page.click('#tab-reading');
  await showIntro(page);
  await page.click('#load-real-example');
  await page.waitForFunction(() => document.querySelector('#reading-context-badge').textContent.includes('Estimates and their assumptions v2'));
  await page.fill('#contributor', 'Reader A');
  await page.fill('#reason', 'Page 61 says maximum theoretical; page 51 separates design capacity from the lower-production scenario. The 1971 memo was not inspected.');
  await page.click('#save-revision');
  await page.waitForFunction(() => document.querySelector('#revision-count').textContent === '1');
  const file = await download(page, () => page.click('#export-cairn'));
  const record = JSON.parse(file.text);
  check(record.contextDefinitions.map(d => d.id).join() === 'ctx:starter:accountable-review,ctx:starter:estimate-assumptions', 'definitions: ' + record.contextDefinitions.map(d => d.id));
  check(record.revisions[0].context.readingContext.sha256 === '6e796f9849550dfc0b83ea811eda7df373e66029007c0f21ebf0323d524720b4', 'reading not pinned');
  check(record.contextDefinitions.every(d => d.version === 2), 'the version 2 child must carry the version 2 parent');
  await fresh.click('#tab-reading');
  await fresh.setInputFiles('#import-file', { name: 'real-report.json', mimeType: 'application/json', buffer: Buffer.from(file.text) });
  await fresh.waitForFunction(() => document.querySelector('#title').value.startsWith('Anniston expert report'));
  check((await fresh.textContent('#reading-context-badge')).includes('Estimates and their assumptions v2'), 'reopened draft lacks the context');
  await capture(fresh, 'real-report-reopened');
  return file.name + ' reopened with its pinned context';
});

await step('18. Keyboard: arrow keys reach the Contexts tab', async () => {
  await page.focus('#tab-history');
  await page.keyboard.press('ArrowRight');
  check(await page.getAttribute('#tab-contexts', 'aria-selected') === 'true' && await page.evaluate(() => document.activeElement.id) === 'tab-contexts', 'tab not reached');
  return 'ArrowRight moves from tab 3 to tab 4';
});

await step('19. Metadata projections copy no author text; v1 keeps its hash; the domain block is exact; projection text cannot be imported', async () => {
  await fresh.click('#tab-contexts');
  await fresh.click('.context-item:has-text("Literal transcription")');
  check((await detail(fresh)).includes('Format: reckoner.context.cycl.v0.3, the native six-section order, with filing and discovery facets in the section 1 header.'), 'v2 format not shown');
  await fresh.selectOption('#context-version-select', 'ctx:starter:literal-transcription@1#sha256:c0ef0ecc03b35a133e8f76b3dfbf4f3f40cbe37847677c27b63b0d9b7b3d35e0');
  check((await detail(fresh)).includes('Format: reckoner.context.cycl.v0.1, the earlier public section order, with identity before the header. Its bytes and hash stay as written'), 'v1 format not shown');
  await fresh.click('#context-detail details.developer-details > summary');
  check((await detail(fresh)).includes('Native header block: not written, because this version declares no domain facet.'), 'header status not shown');
  const file = await download(fresh, () => fresh.click('#context-detail >> text=Download native metadata projection'));
  const projection = JSON.parse(file.text);
  check(projection.schema === 'reckoner.native_projection.v0.2' && projection.source.sha256 === 'c0ef0ecc03b35a133e8f76b3dfbf4f3f40cbe37847677c27b63b0d9b7b3d35e0' && projection.source.format === 'reckoner.context.cycl.v0.1', 'source hash or format not kept');
  check(!/[()"]/.test(projection.projectionText.text) && !file.text.includes('character for character'), 'author text copied');
  check(projection.review.nativeAdmission.institutional === 'not_established' && projection.review.nativeAdmission.model === 'not_established' && projection.productionStatus === 'not_inferred' && projection.nativeHeader.status === 'not_emitted', 'admission, production status or header inferred');
  await fresh.setInputFiles('#context-import-file', { name: 'projection.cycl.txt', mimeType: 'text/plain', buffer: Buffer.from(projection.projectionText.text) });
  await fresh.waitForFunction(() => /Nothing was imported.*projection, not a definition/.test(document.querySelector('#context-library-status').textContent));
  await fresh.click('.context-item:has-text("Estimates and their assumptions")');
  await fresh.click('#context-detail details.developer-details > summary');
  check((await detail(fresh)).includes('Native header block: written for 2 domain facet(s).'), 'domain block status not shown');
  const estimates = JSON.parse((await download(fresh, () => fresh.click('#context-detail >> text=Download native metadata projection'))).text);
  check(estimates.source.sha256 === '6e796f9849550dfc0b83ea811eda7df373e66029007c0f21ebf0323d524720b4' && estimates.nativeHeader.text === ';; schema: garrison/file_bitnet/v1\n;; file_bitnet:\n;;   domain: [environmental reports, technical reports]\n;; end_file_bitnet\n', 'domain block wrong');
  await capture(fresh, 'native-projection');
  return file.name + ' and estimates v2 · no author text · domain block exact · projection text refused as a definition';
});

const { context: phone, page: small } = await open({ width: 390, height: 844 });
await step('20. Phone width: Contexts tab and reading context fit without horizontal scrolling', async () => {
  await hideIntro(small);
  await small.click('#tab-contexts');
  await small.click('.context-item:has-text("Estimates and their assumptions")');
  const overflow = await small.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  await capture(small, 'phone-contexts');
  check(overflow <= 0, 'horizontal overflow ' + overflow + 'px');
  return 'no horizontal overflow at 390 px';
});

// "Continue from this reading" is pressed inside the History panel, which the switch
// to the Reading panel hides. Keyboard focus must land on the Reading tab rather than
// fall to the page, and the record's Archive notes and the sections below the panels
// must stay. Keyboard only, at desktop and phone widths.
await step('21. Keyboard: Continue from an earlier reading moves focus to the Reading tab; Archive notes and the sections below stay', async () => {
  const seen = [];
  for (const [label, viewport] of [['desktop', { width: 1360, height: 1000 }], ['phone', { width: 390, height: 844 }]]) {
    const { context, page: p } = await open(viewport);
    const prompts = []; p.on('dialog', d => prompts.push(d.message()));
    const stored = () => p.evaluate(() => JSON.parse(localStorage.getItem('garrison-cairn-workspace-v01')));
    await p.click('#quick-example');
    await p.waitForFunction(() => document.querySelector('#title')?.value.startsWith('Worked example'));
    await p.fill('#contributor', 'Reader A');
    await p.click('#save-revision');
    await p.waitForFunction(() => document.querySelector('#revision-count').textContent === '1');
    await p.fill('#proposed', 'PUBLIC NOTICE\nThe council will meet on 17 June 1912.\nThe clerk shall keep the original record.');
    await p.fill('#reason', 'A second synthetic reading.');
    await p.click('#save-revision');
    await p.waitForFunction(() => document.querySelector('#revision-count').textContent === '2');
    await p.click('#tab-context');
    await p.click('details:has(#prepare-archive-handoff) > summary');
    await p.selectOption('#archive-route', 'file_upload');
    await p.selectOption('#archive-rights', 'permission');
    await p.fill('#archive-rights-evidence', 'Synthetic permission for the browser check');
    await p.fill('#archive-preparer', 'Reader A');
    await p.check('#archive-public-check');
    await p.click('#prepare-archive-handoff');
    await p.waitForSelector('#archive-handoff-actions:not([hidden])');
    await p.click('#archive-activity > summary');
    await p.selectOption('#archive-note-kind', 'error');
    await p.fill('#archive-note-actor', 'Reader A');
    await p.fill('#archive-note-text', 'Synthetic service error before continuing.');
    await p.click('#save-archive-note');
    await p.waitForFunction(() => /Note recorded/.test(document.querySelector('#archive-activity-status').textContent));
    const before = await stored(), older = before.revisions[0], notes = before.context.archiveActivity.events.map(e => e.kind).join();
    check(before.activeRevisionId !== older.id && notes === 'prepared,error', label + ': setup did not leave the newer reading active with two notes');
    await p.click('#tab-history');
    // The history lists the newest reading first, so the last button continues from the oldest.
    await p.locator('#history-list button:has-text("Continue from this reading")').last().focus();
    await p.keyboard.press('Enter');
    await p.waitForFunction(id => JSON.parse(localStorage.getItem('garrison-cairn-workspace-v01')).activeRevisionId !== id, before.activeRevisionId);
    const after = await p.evaluate(() => {
      const a = document.activeElement, tab = document.querySelector('#tab-reading').getBoundingClientRect();
      const shown = selector => { const n = document.querySelector(selector); return !!n && n.getClientRects().length > 0 && getComputedStyle(n).visibility !== 'hidden'; };
      return { focus: a === document.body ? 'body' : (a.id ? '#' + a.id : a.tagName.toLowerCase()), selected: document.querySelector('#tab-reading').getAttribute('aria-selected'),
        panel: document.querySelector('.panel.active')?.id, tabOnScreen: tab.top >= 0 && tab.bottom <= innerHeight, proposed: document.querySelector('#proposed').value,
        history: document.querySelector('#archive-activity-history').textContent,
        hiddenSections: ['#archive-activity', 'details.advanced-tools:has(#prepare-prompt)', 'section.closing', '#next-steps', '#walkthrough'].filter(s => !shown(s)) };
    });
    const now = await stored();
    check(now.activeRevisionId === older.id && after.proposed === older.reading.proposed, label + ': the older reading was not restored');
    check(after.focus === '#tab-reading' && after.selected === 'true' && after.panel === 'reading', label + ': focus fell to ' + after.focus + ' (panel ' + after.panel + ')');
    check(after.tabOnScreen, label + ': the Reading tab is off screen after Continue');
    check(!prompts.length, label + ': Continue asked to replace an unsaved draft: ' + prompts.join(' | '));
    const kept = (now.context.archiveActivity?.events || []).map(e => e.kind).join();
    check(kept === notes && after.history.includes('Synthetic service error before continuing.'), label + ': Archive notes changed after Continue: ' + (kept || 'none'));
    check(!after.hiddenSections.length, label + ': sections hidden after Continue: ' + after.hiddenSections.join(', '));
    await p.keyboard.press('Tab');
    const next = await p.evaluate(() => { const a = document.activeElement; return { id: a.id || a.tagName.toLowerCase(), inReading: !!a.closest('#reading') }; });
    check(next.inReading, label + ': the next Tab left the Reading panel for ' + next.id);
    if (label === 'phone') await capture(p, 'phone-after-continue');
    seen.push(label + ': focus ' + after.focus + ', next Tab #' + next.id + ', notes ' + notes + ' kept, sections shown');
    await context.close();
  }
  return seen.join(' · ');
});

await step('22. No uncaught page errors; console errors are listed', async () => {
  const errors = problems.filter(p => p.kind === 'pageerror');
  check(!errors.length, errors.map(e => e.text).join(' | '));
  return problems.length ? problems.length + ' console message(s): ' + [...new Set(problems.map(p => p.text.slice(0, 100)))].join(' | ') : 'none';
});

await first.close(); await second.close(); await phone.close();
await browser.close();
server.close();
const summary = { browser: 'Chromium (Playwright)', when: new Date().toISOString(), passed: results.filter(r => r.verdict === 'PASS').length, failed: results.filter(r => r.verdict === 'FAIL').length, results, problems };
await fs.writeFile(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ passed: summary.passed, failed: summary.failed, output: OUT }));
process.exitCode = summary.failed ? 1 : 0;
