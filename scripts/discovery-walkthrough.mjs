// Real-browser checks for "Where do I begin?" discovery paths and the separate
// reviews they open, plus storage failures, shared-storage conflicts and the
// clipboard deadline. Optional developer check, separate from `npm test`.
// Synthetic data only. Every browser context is new, and every request that
// leaves the local server is aborted and listed, so nothing is searched,
// fetched or uploaded elsewhere. Needs Playwright and Chromium, as
// scripts/browser-walkthrough.mjs does.
// Usage: node scripts/discovery-walkthrough.mjs [output directory]
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { STATIC_TYPES } from './static-types.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const DIST = path.join(ROOT, 'dist');
const OUT = path.resolve(process.argv[2] || path.join(ROOT, '.build', 'discovery-walkthrough'));
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

const results = [], problems = [], blocked = [];
let shot = 0;
class UnsupportedBrowserKeyboard extends Error {}
async function step(name, fn) {
  try { const detail = await fn(); results.push({ step: name, verdict: 'PASS', detail: detail ?? null }); console.log('PASS', name, detail ? '· ' + detail : ''); }
  catch (error) { const verdict = error instanceof UnsupportedBrowserKeyboard ? 'SKIP' : 'FAIL'; results.push({ step: name, verdict, detail: error.message }); console.log(verdict, name, '·', error.message); }
}
const check = (condition, message) => { if (!condition) throw Error(message); };
const canonical = v => (v === null || typeof v !== 'object' ? JSON.stringify(v) : Array.isArray(v) ? '[' + v.map(canonical).join(',') + ']' : '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canonical(v[k])).join(',') + '}');
const sha256 = text => createHash('sha256').update(text).digest('hex');

const { chromium } = await loadPlaywright();
await fs.mkdir(OUT, { recursive: true });
const server = await serve();
const origin = 'http://127.0.0.1:' + server.address().port;
const url = file => origin + '/' + file;
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

function watch(page) {
  page.on('dialog', dialog => dialog.accept());
  page.on('pageerror', error => problems.push({ kind: 'pageerror', page: page.url(), text: error.message }));
  page.on('console', message => { if (message.type() === 'error') problems.push({ kind: 'console', page: page.url(), text: message.text() }); });
}
// A new, empty browser profile for each scenario; requests leaving the local server are refused.
async function isolated(options = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true, ...options });
  await context.route('**/*', route => {
    const target = route.request().url();
    if (target.startsWith(origin + '/')) return route.continue();
    blocked.push(target);
    return route.abort();
  });
  context.on('page', watch);
  return context;
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
const local = (page, key) => page.evaluate(k => localStorage.getItem(k), key);
const session = (page, key) => page.evaluate(k => sessionStorage.getItem(k), key);
const value = (page, selector) => page.$eval(selector, n => n.value);
const saveState = page => page.textContent('#save-state');
async function tabTo(page, test, arg, { back = false, max = 80 } = {}) {
  for (let i = 0; i < max; i++) {
    if (await page.evaluate(test, arg)) return i;
    await page.keyboard.press(back ? 'Shift+Tab' : 'Tab');
  }
  throw Error('Keyboard focus never reached the target (' + String(arg) + ').');
}
const focusedId = id => document.activeElement?.id === id;

// Synthetic discovery data. The .invalid names never resolve, and the router refuses them anyway.
const SYN = {
  title: 'Synthetic notice search', by: 'Reader D',
  clue: 'A notice dated in 1912 mentioned a mill on the river (synthetic).',
  query: 'mill notice 1912', destination: 'Synthetic library catalogue', attemptUrl: 'https://catalogue.invalid/search?q=mill+notice+1912',
  candidateUrl: 'https://source.invalid/notice-1912.pdf', locator: 'page 2, lines 4 to 6',
};
const DEFAULT_KEY = 'garrison-cairn-workspace-v01';
const LITERAL_V2 = '1f922aed03a439166eb08dedbddafddfcd6fd694f1e1ebe43385d00849d7fd56';
const CORRUPT = '  {"broken":\n';
const CORRUPT_PATH = '{"schema":"reckoner.discovery_path.v0.1","events":[';

async function openDiscovery(context) { const page = await context.newPage(); await page.goto(url('discovery.html')); await page.waitForSelector('#goal option', { state: 'attached' }); return page; }
async function startPath(page, title = SYN.title, by = SYN.by) {
  await page.selectOption('#goal', 'science');
  await page.fill('#title', title);
  await page.fill('#by', by);
  await page.click('#start button');
  await page.waitForFunction(() => !document.querySelector('#work').hidden);
}
async function addStep(page, kind, fields) {
  await page.selectOption('#kind', kind);
  await page.waitForSelector('#fields [data-field]');
  for (const [name, entry] of Object.entries(fields)) {
    const selector = '#f-' + name;
    if ((await page.$eval(selector, n => n.tagName)) === 'SELECT') await page.selectOption(selector, typeof entry === 'number' ? { index: entry } : entry);
    else await page.fill(selector, entry);
  }
  const before = await page.$$eval('#history > li', n => n.length);
  await page.click('#add button:has-text("Save this note")');
  await page.waitForFunction(n => document.querySelectorAll('#history > li').length === n + 1, before);
}
async function importPath(page, text) {
  await page.setInputFiles('#import', { name: 'discovery-path.json', mimeType: 'application/json', buffer: Buffer.from(text) });
  await page.waitForFunction(() => /Digest checked/.test(document.querySelector('#status').textContent));
}
async function openCandidate(context, page) {
  const previous=await page.locator('#history a:has-text("Open your separate review workspace")').count();
  await page.click('#history button:has-text("Prepare a separate document review")');
  await page.waitForFunction(n=>[...document.querySelectorAll('#history a')].filter(a=>a.textContent==='Open your separate review workspace').length>n,previous);
  const link=page.locator('#history a:has-text("Open your separate review workspace")').last();
  await link.waitFor();
  const [review] = await Promise.all([context.waitForEvent('page'), link.click()]);
  await review.waitForLoadState('domcontentloaded');
  await review.waitForFunction(() => document.querySelector('#sourceUrl')?.value && document.querySelector('#save-state')?.textContent);
  return review;
}
const handoffBase = page => 'reckoner-discovery-review:' + new URL(page.url()).searchParams.get('discovery');
const workspaceKeys = (page, base) => page.evaluate(b => Object.keys(localStorage).filter(k => k.startsWith(b + ':workspace:')), base);
async function saveReading(page, text, { context = null } = {}) {
  await page.click('#tab-reading');
  await page.fill('#original', 'SYNTHETIC OCR: ' + text);
  await page.fill('#proposed', 'SYNTHETIC PROPOSED: ' + text);
  await page.fill('#contributor', SYN.by);
  await page.fill('#reason', 'Synthetic comparison for the browser check.');
  if (context) {
    await page.click('#reading-context-panel summary');
    const key = await page.$eval('#reading-context-select', (s, name) => [...s.options].find(o => o.textContent.startsWith(name))?.value, context);
    check(key, 'no reading context option ' + context);
    await page.selectOption('#reading-context-select', key);
    await page.waitForFunction(name => document.querySelector('#reading-context-badge').textContent.includes(name), context);
  }
  const before = Number(await page.textContent('#revision-count'));
  await page.click('#save-revision');
  await page.waitForFunction(n => document.querySelector('#revision-count').textContent === String(n + 1), before);
}
// The worked-example button sits in the introduction, which may start collapsed;
// the compact layout then offers the same loader as Try an example.
const loadExample = async page => { await page.waitForSelector('#load-example', { state: 'attached' }); await page.click((await page.isVisible('#load-example')) ? '#load-example' : '#quick-example'); };
// The view sliders may sit in a closed tools drawer; open it the way a reader would.
const showViewTools = async page => { if (await page.isHidden('#view-adjustments') && await page.$('#toggle-view-tools')) await page.click('#toggle-view-tools'); };
async function defaultDraft(context, text) {
  const page = await context.newPage();
  await page.goto(url('index.html'));
  await page.waitForSelector('#load-example', { state: 'attached' });
  await page.fill('#original', text);
  await page.waitForFunction(([k, t]) => (localStorage.getItem(k) || '').includes(t), [DEFAULT_KEY, text]);
  return { page, bytes: await local(page, DEFAULT_KEY) };
}

let pathText, exported, review, defaultBytes;
const main = await isolated();

await step('1. The discovery page loads locally with its six starting points', async () => {
  const page = await openDiscovery(main);
  const goals = await page.$$eval('#goal option', o => o.length);
  check(goals === 6, 'starting points: ' + goals);
  check((await page.textContent('#status')) === 'Choose what you want to find below.', 'unexpected status');
  await capture(page, 'discovery-start');
  return goals + ' starting points; nothing requested outside the local server';
});

await step('2. Record a synthetic clue, a planned search and a candidate; export the path with its digest', async () => {
  const page = main.pages()[0];
  await startPath(page);
  await addStep(page, 'clue', { text: SYN.clue, confidence: 'uncertain_memory' });
  await addStep(page, 'attempt', { query: SYN.query, destination: SYN.destination, url: SYN.attemptUrl, parentAttemptId: 0, stage: 'planned', reason: 'Synthetic first search.' });
  await addStep(page, 'candidate', { attemptId: 0, url: SYN.candidateUrl, locator: SYN.locator, match: 'possible', reason: 'Synthetic candidate; not inspected.' });
  check(await page.isVisible('#history button:has-text("Prepare a separate document review: ' + SYN.candidateUrl + '")'), 'no review button for the candidate');
  const file = await download(page, () => page.click('#export'));
  pathText = file.text;
  const packet = JSON.parse(pathText);
  check(packet.schema === 'reckoner.discovery_exchange.v0.1' && packet.body.events.length === 3, 'unexpected export');
  check(packet.integrity.bodySha256 === sha256(canonical(packet.body)) && pathText === canonical(packet), 'digest or canonical form wrong');
  check(packet.body.events.every(e => e.kind !== 'attempt' || e.stage === 'planned'), 'an attempt was recorded as opened');
  await capture(page, 'discovery-path');
  return file.name + ' · 3 events · digest ' + packet.integrity.bodySha256.slice(0, 12) + '…';
});

await step('3. A default review draft exists in the same profile before the handoff', async () => {
  const draft = await defaultDraft(main, 'DEFAULT DRAFT ORIGINAL (synthetic)');
  defaultBytes = draft.bytes;
  check(defaultBytes.includes('DEFAULT DRAFT ORIGINAL'), 'default draft not saved');
  return defaultBytes.length + ' bytes under ' + DEFAULT_KEY;
});

await step('4. The candidate opens a separate review: source URL, locator and exact packet carried; OCR, image hash and approval blank; default draft untouched', async () => {
  const page = main.pages()[0];
  review = await openCandidate(main, page);
  check(/^[a-f0-9-]{36}$/.test(new URL(review.url()).searchParams.get('discovery')), 'review URL lacks a handoff ID');
  check(await value(review, '#sourceUrl') === SYN.candidateUrl && await value(review, '#locator') === SYN.locator && await value(review, '#title') === SYN.title, 'source fields not carried');
  check(await review.$eval('#discovery-trail pre', n => n.textContent) === pathText, 'carried packet differs from the exported path');
  const intake = JSON.parse(await local(review, handoffBase(review) + ':intake'));
  check(intake.discoveryTrail.packet === pathText, 'stored handoff packet differs');
  check(await value(review, '#original') === '' && await value(review, '#proposed') === '', 'OCR not blank');
  check(await review.textContent('#revision-count') === '0' && await review.isHidden('#scan-image'), 'review has readings or an image');
  check(/Draft saved on this device/.test(await saveState(review)), 'save state: ' + await saveState(review));
  check(await local(review, DEFAULT_KEY) === defaultBytes, 'default draft changed');
  check(await value(main.pages()[1], '#original') === 'DEFAULT DRAFT ORIGINAL (synthetic)', 'default tab lost its draft');
  check(/Separate review prepared/.test(await page.textContent('#status')), 'discovery status not updated');
  await capture(review, 'separate-review');
  return 'packet ' + pathText.length + ' bytes carried exactly; default draft bytes unchanged';
});

await step('5. The separate review saves a reading with the version 2 starter context and exports the exact packet', async () => {
  await saveReading(review, 'Notice dated 1912.', { context: 'Literal transcription v2' });
  const file = await download(review, () => review.click('#export-cairn'));
  exported = file;
  const record = JSON.parse(file.text);
  check(record.context.discoveryTrail.packet === pathText && record.revisions[0].context.discoveryTrail.packet === pathText, 'packet not carried into the record');
  check(record.context.sourceUrl === SYN.candidateUrl && record.context.locator === SYN.locator, 'source fields lost');
  check(record.revisions[0].context.readingContext.sha256 === LITERAL_V2 && record.contextDefinitions.some(d => d.sha256 === LITERAL_V2), 'version 2 context not pinned');
  check(record.reviews.length === 0 && record.sourceImage === null, 'unexpected review or image');
  check(await local(review, DEFAULT_KEY) === defaultBytes, 'default draft changed');
  return file.name + ' · literal transcription v2 pinned · no review, no image';
});

await step('6. A fresh profile reopens the exported review with its discovery packet and pinned context', async () => {
  const context = await isolated(), page = await context.newPage();
  await page.goto(url('index.html'));
  await page.setInputFiles('#import-file', { name: exported.name, mimeType: 'application/json', buffer: Buffer.from(exported.text) });
  await page.waitForFunction(t => document.querySelector('#title').value === t, SYN.title);
  check(await page.$eval('#discovery-trail pre', n => n.textContent) === pathText, 'packet changed on reopen');
  check(await value(page, '#sourceUrl') === SYN.candidateUrl && await value(page, '#locator') === SYN.locator, 'source fields changed on reopen');
  check((await page.textContent('#reading-context-badge')).includes('Literal transcription v2') && await page.textContent('#revision-count') === '1', 'context or reading lost');
  await capture(page, 'reopened-review');
  await context.close();
  return 'packet, source URL, locator and v2 context restored';
});

await step('7. With new tabs blocked, discovery offers a working link; a review without a context still saves and exports', async () => {
  const context = await isolated();
  // A browser that blocks a new window returns nothing; it never throws. Every attempt is recorded.
  await context.addInitScript(() => { window.automaticOpens = []; window.open = (...args) => { window.automaticOpens.push(String(args[0])); return null; }; });
  const page = await openDiscovery(context);
  await importPath(page, pathText);
  const pagesBefore = context.pages().length;
  await page.click('#history button:has-text("Prepare a separate document review")');
  await page.waitForSelector('#history a:has-text("Open your separate review workspace")');
  check(context.pages().length === pagesBefore && await page.evaluate(() => window.automaticOpens.length) === 0, 'preparing the review tried to open a window by itself');
  const href = await page.$eval('#history a:has-text("Open your separate review workspace")', a => a.href);
  check(new URL(href).pathname.endsWith('/index.html') && /^[a-f0-9-]{36}$/.test(new URL(href).searchParams.get('discovery')), 'fallback link wrong: ' + href);
  await capture(page, 'blocked-popup-fallback');
  await page.$eval('#history a:has-text("Open your separate review workspace")',a=>a.addEventListener('click',event=>event.preventDefault()));
  await page.click('#history a:has-text("Open your separate review workspace")');
  check(context.pages().length===pagesBefore,'simulated browser-blocked link unexpectedly opened');
  const opened=await context.newPage();await opened.goto(href);
  await opened.waitForFunction(() => document.querySelector('#sourceUrl')?.value);
  check(await value(opened, '#sourceUrl') === SYN.candidateUrl, 'fallback review lacks the source');
  await saveReading(opened, 'No context chosen.');
  const record = JSON.parse((await download(opened, () => opened.click('#export-cairn'))).text);
  check(!record.revisions[0].context.readingContext && !record.contextDefinitions, 'a context appeared although none was chosen');
  const home = await context.newPage();
  await home.goto(url('index.html'));
  await home.click('header button:has-text("Search libraries")');
  await home.waitForSelector('header a:has-text("Open search in a tab")', { state: 'visible' });
  check(await home.evaluate(() => document.activeElement?.textContent) === 'Open search in a tab', 'search fallback not focused');
  const [search] = await Promise.all([context.waitForEvent('page'), home.click('header a:has-text("Open search in a tab")')]);
  await search.waitForSelector('#query');
  await search.fill('#query', 'synthetic mill notice');
  const hosts = await search.$$eval('#destinations a', links => links.map(a => new URL(a.href).hostname));
  check(hosts.join() === 'archive.org,openlibrary.org,www.loc.gov', 'search destinations: ' + hosts);
  check(await home.evaluate(() => window.automaticOpens.length) === 1, 'the search button should make exactly one window request');
  await context.close();
  return 'discovery made no window request; its link opened the review; optional context stays optional; the blocked search window fell back to a focused link';
});

await step('8. Malformed or unfilled discovery links open an isolated empty review and leave the default draft alone', async () => {
  const context = await isolated();
  const draft = await defaultDraft(context, 'DEFAULT DRAFT FOR LINK CHECKS');
  const notes = [];
  for (const [query, expected] of [['?discovery=bad', /Search notes link could not be loaded/], ['?discovery=', /Search notes link could not be loaded/], ['?discovery=../escape', /Search notes link could not be loaded/], ['?discovery=12345678-1234-1234-1234-123456789abc', /Search notes could not be opened/]]) {
    const page = await context.newPage();
    await page.goto(url('index.html') + query);
    await page.waitForFunction(() => /Search notes/.test(document.querySelector('#save-state').textContent));
    const state = await saveState(page);
    check(expected.test(state), query + ': ' + state);
    check(await value(page, '#original') === '' && await value(page, '#sourceUrl') === '', query + ': workspace not empty');
    check(await local(page, DEFAULT_KEY) === draft.bytes, query + ': default draft changed');
    notes.push(query.replace('?discovery=', '') || '(empty)');
    await page.close();
  }
  const page = await openDiscovery(context);
  await importPath(page, pathText);
  const tampered = pathText.replace('Synthetic candidate; not inspected.', 'Synthetic candidate; inspected.');
  await page.setInputFiles('#import', { name: 'tampered.json', mimeType: 'application/json', buffer: Buffer.from(tampered) });
  await page.waitForFunction(() => /digest mismatch/i.test(document.querySelector('#status').textContent));
  check(await page.$$eval('#history > li', n => n.length) === 3, 'tampered file changed the open path');
  await capture(page, 'tampered-path-refused');
  await context.close();
  return 'refused: ' + notes.join(', ') + '; tampered path file refused';
});

await step('9. Keyboard only: start a path, record a search and a candidate, open its separate review', async () => {
  // Calibrate native-select automation against an ordinary browser control. Never
  // replace the application's keyboard interaction with selectOption and call it
  // a keyboard pass. The app scenario remains a FAIL when this control works.
  const controlContext = await isolated();
  let nativeArrowWorks = false;
  try {
    const control = await controlContext.newPage();
    await control.setContent('<label>Native select control<select id="native-key-control"><option value="first">First</option><option value="second">Second</option></select></label>');
    await control.locator('#native-key-control').focus();
    await control.keyboard.press('ArrowDown');
    try { await control.waitForFunction(() => document.querySelector('#native-key-control').value === 'second', null, { timeout: 1000 }); nativeArrowWorks = true; } catch {}
  } finally { await controlContext.close(); }
  if (!nativeArrowWorks) throw new UnsupportedBrowserKeyboard('Plain native select also ignores automated ArrowDown in this browser runtime. Keyboard-only scenario not executed; no application keyboard pass claimed. Native browser/assistive-technology acceptance remains separate.');

  const context = await isolated(), page = await openDiscovery(context);
  await tabTo(page, focusedId, 'goal');
  check(await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle) !== 'none', 'no visible focus indicator');
  const adviceBefore = await page.textContent('#advice');
  await page.keyboard.press('ArrowDown');
  check(await value(page, '#goal') === 'phrase' && await page.textContent('#advice') !== adviceBefore, 'arrow key did not change the starting point');
  await tabTo(page, focusedId, 'title'); await page.keyboard.type('Keyboard path');
  await tabTo(page, focusedId, 'by'); await page.keyboard.type('Keyboard Reader');
  await page.keyboard.press('Tab');
  check(await page.evaluate(() => document.activeElement.textContent) === 'Start search notes', 'focus order skips the start button');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => !document.querySelector('#work').hidden);
  await tabTo(page, focusedId, 'kind');
  await page.keyboard.press('ArrowDown');
  await page.waitForSelector('#f-query');
  for (const [id, text] of [['f-query', 'keyboard query'], ['f-destination', 'Synthetic library'], ['f-url', 'https://catalogue.invalid/keyboard'], ['f-reason', 'Keyboard search.']]) { await tabTo(page, focusedId, id); await page.keyboard.type(text); }
  await tabTo(page, () => document.activeElement?.textContent === 'Save this note');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelectorAll('#history > li').length === 1);
  await tabTo(page, focusedId, 'kind', { back: true });
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown');
  await page.waitForSelector('#f-locator');
  for (const [id, text] of [['f-url', 'https://source.invalid/keyboard.pdf'], ['f-locator', 'page 1'], ['f-reason', 'Keyboard candidate.']]) { await tabTo(page, focusedId, id); await page.keyboard.type(text); }
  await tabTo(page, () => document.activeElement?.textContent === 'Save this note');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelectorAll('#history > li').length === 2);
  await tabTo(page, () => document.activeElement?.textContent?.startsWith('Prepare a separate document review'));
  await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.activeElement?.textContent==='Open your separate review workspace');
  const [opened] = await Promise.all([context.waitForEvent('page'), page.keyboard.press('Enter')]);
  await opened.waitForFunction(() => document.querySelector('#sourceUrl')?.value);
  check(await value(opened, '#sourceUrl') === 'https://source.invalid/keyboard.pdf', 'keyboard review lacks its source');
  await tabTo(opened, () => document.activeElement?.parentElement?.id === 'discovery-trail');
  await opened.keyboard.press('Enter');
  check(await opened.$eval('#discovery-trail', d => d.open), 'discovery trail did not open from the keyboard');
  await capture(page, 'keyboard-path');
  await context.close();
  return 'path, search, candidate and review opened with Tab, arrows and Enter; focus indicator visible';
});

await step('10. The worked example image loads; zoom, brightness, contrast, background, text size and spacing respond to keys', async () => {
  const context = await isolated(), page = await context.newPage();
  await page.goto(url('index.html'));
  await loadExample(page);
  await page.waitForFunction(() => document.querySelector('#title').value.startsWith('Worked example') && !document.querySelector('#scan-image').hidden && document.querySelector('#scan-image').naturalWidth > 0);
  await showViewTools(page);
  await page.click('#view-adjustments > summary');
  const press = async (selector, key, times) => { await page.focus(selector); for (let i = 0; i < times; i++) await page.keyboard.press(key); return Number(await value(page, selector)); };
  const brightness = await press('#view-brightness', 'ArrowRight', 4), contrast = await press('#view-contrast', 'ArrowLeft', 3), background = await press('#view-background', 'ArrowRight', 2);
  const filter = await page.$eval('#scan-image', n => n.style.filter);
  check(brightness === 104 && contrast === 97 && filter === 'brightness(104%) contrast(97%)', 'filter: ' + filter);
  check(await page.textContent('#background-value') === background + '%', 'background output not updated');
  const zoomed = await press('#image-zoom', 'ArrowRight', 2);
  check(await page.$eval('#zoom-level', n => n.value) === zoomed + '%', 'zoom output not updated');
  await page.focus('#zoom-in'); await page.keyboard.press('Enter');
  check(await page.$eval('#zoom-level', n => n.value) === (zoomed + 25) + '%', 'zoom button did not respond to Enter');
  await page.click('details:has(#reading-size) > summary');
  const size = await press('#reading-size', 'ArrowRight', 3), spacing = await press('#reading-spacing', 'ArrowRight', 5);
  const style = await page.$eval('#original', n => [n.style.fontSize, n.style.lineHeight]);
  check(style[0] === size + 'px' && Number(style[1]) === spacing / 100, 'reading style: ' + style);
  await capture(page, 'image-and-sliders');
  await context.close();
  return 'brightness ' + brightness + '%, contrast ' + contrast + '%, background ' + background + '%, zoom ' + (zoomed + 25) + '%, text ' + size + ' px, spacing ' + spacing + '%';
});

await step('11. A corrupt default draft survives three reloads; new work never overwrites it; the recovery copy is exact', async () => {
  const context = await isolated(), page = await context.newPage();
  await page.goto(url('index.html'));
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [DEFAULT_KEY, CORRUPT]);
  for (let i = 1; i <= 3; i++) {
    await page.reload();
    await page.waitForFunction(() => /Original saved data preserved/.test(document.querySelector('#save-state').textContent));
    await page.fill('#proposed', 'New work after reload ' + i);
    check(await local(page, DEFAULT_KEY) === CORRUPT, 'reload ' + i + ' changed the preserved bytes');
  }
  const file = await download(page, () => page.click('button:has-text("Download recovery copy")'));
  check(file.text === CORRUPT, 'recovery copy differs');
  await capture(page, 'corrupt-default-draft');
  await context.close();
  return 'preserved across 3 reloads; recovery copy byte-identical';
});

await step('12. A corrupt discovery draft survives three reloads; its recovery copy is exact', async () => {
  const context = await isolated(), page = await openDiscovery(context);
  await page.evaluate(v => sessionStorage.setItem('reckoner-discovery-draft-v01', v), CORRUPT_PATH);
  for (let i = 1; i <= 3; i++) {
    await page.reload();
    await page.waitForFunction(() => /could not be read safely/.test(document.querySelector('#status').textContent));
    check(await page.isVisible('#recover') && await session(page, 'reckoner-discovery-draft-v01') === CORRUPT_PATH, 'reload ' + i + ' lost the preserved bytes');
  }
  const file = await download(page, () => page.click('#recover'));
  check(file.text === CORRUPT_PATH, 'recovery copy differs');
  await context.close();
  return 'preserved across 3 reloads; recovery copy byte-identical';
});

await step('13. A separate review whose saved copy is corrupt keeps it across three reloads and does not move its resume pointer', async () => {
  const context = await isolated(), page = await openDiscovery(context);
  await importPath(page, pathText);
  const opened = await openCandidate(context, page), base = handoffBase(opened);
  await opened.waitForFunction(k => sessionStorage.getItem(k), base + ':tab');
  const prior = await session(opened, base + ':tab');
  await opened.evaluate(([k, v]) => localStorage.setItem(k, v), [prior, CORRUPT]);
  for (let i = 1; i <= 3; i++) {
    await opened.reload();
    await opened.waitForFunction(() => /Original saved data preserved/.test(document.querySelector('#save-state').textContent));
    check(await session(opened, base + ':tab') === prior && await local(opened, prior) === CORRUPT, 'reload ' + i + ' moved the pointer or changed the bytes');
    check((await workspaceKeys(opened, base)).length === 1, 'reload ' + i + ' wrote another workspace');
  }
  await capture(opened, 'corrupt-separate-review');
  await context.close();
  return 'pointer and corrupt bytes unchanged across 3 reloads; no new workspace written';
});

await step('14. A storage quota refusal keeps the previous resume pointer and saved copy; the work stays exportable', async () => {
  const context = await isolated();
  await context.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, text) {
      if (String(key).includes(':workspace:') && window.sessionStorage.getItem('synthetic-quota') === 'on') throw new DOMException('Synthetic quota refusal', 'QuotaExceededError');
      return original.call(this, key, text);
    };
  });
  const page = await openDiscovery(context);
  await importPath(page, pathText);
  const opened = await openCandidate(context, page), base = handoffBase(opened);
  await saveReading(opened, 'Saved before the quota refusal.');
  const prior = await session(opened, base + ':tab'), priorBytes = await local(opened, prior);
  check(JSON.parse(priorBytes).revisions.length === 1, 'first reading not saved');
  await opened.evaluate(() => sessionStorage.setItem('synthetic-quota', 'on'));
  await opened.reload();
  await opened.waitForFunction(() => /Device storage unavailable/.test(document.querySelector('#save-state').textContent));
  check(await opened.textContent('#revision-count') === '1', 'previous work did not resume');
  await saveReading(opened, 'Saved while storage refuses.');
  check(/Device storage unavailable/.test(await saveState(opened)), 'refusal not shown after saving');
  check(await session(opened, base + ':tab') === prior && await local(opened, prior) === priorBytes && (await workspaceKeys(opened, base)).length === 1, 'pointer moved or saved copy changed');
  const record = JSON.parse((await download(opened, () => opened.click('#export-cairn'))).text);
  check(record.revisions.length === 2 && record.revisions[1].reading.proposed.includes('Saved while storage refuses.'), 'export lacks the in-memory reading');
  await capture(opened, 'quota-refusal');
  await opened.evaluate(() => sessionStorage.removeItem('synthetic-quota'));
  await opened.reload();
  await opened.waitForFunction(() => /Draft saved on this device/.test(document.querySelector('#save-state').textContent));
  const next = await session(opened, base + ':tab');
  check(next !== prior && await local(opened, prior) === priorBytes && await opened.textContent('#revision-count') === '1', 'resume after refusal wrong');
  await context.close();
  return 'pointer kept during refusal; export carried 2 readings; resumed from the saved copy afterwards';
});

await step('15. Two tabs on one saved draft: the stale tab is told about the conflict, cannot save or export over the other tab\'s work, and keeps its edit in a draft recovery file', async () => {
  const context = await isolated(), a = await context.newPage();
  await a.goto(url('index.html'));
  await loadExample(a);
  await a.waitForFunction(() => document.querySelector('#title').value.startsWith('Worked example'));
  await a.fill('#contributor', 'Reader A');
  await a.click('#save-revision');
  await a.waitForFunction(() => document.querySelector('#revision-count').textContent === '1');
  const b = await context.newPage();
  await b.goto(url('index.html'));
  await b.waitForFunction(() => document.querySelector('#revision-count').textContent === '1');
  const afterOpen = await saveState(a);
  await a.fill('#proposed', 'A CHANGE (synthetic)');
  const stateA = await saveState(a), bytesA = await local(a, DEFAULT_KEY);
  check(!/Another tab changed/.test(stateA) && bytesA.includes('A CHANGE'), 'first tab could not save after a second tab opened: ' + stateA + ' (before edit: ' + afterOpen + ')');
  await b.fill('#proposed', 'B CHANGE (synthetic)');
  await b.waitForFunction(() => /Another tab changed this saved work/.test(document.querySelector('#save-state').textContent));
  check(await local(b, DEFAULT_KEY) === bytesA, 'stale tab overwrote the other tab');
  // Ruling: during a foreign draft conflict the stale tab's save and ordinary export fail closed.
  // Retained checkpoint from legacy localStorage keys and, when present, the IndexedDB history store.
  const head = page => page.evaluate(async () => {
    const legacy = Object.keys(localStorage).filter(k => k.startsWith('reckoner-creator-history:head:')).sort().map(k => k + '=' + localStorage.getItem(k));
    const dbs = indexedDB.databases ? await indexedDB.databases() : [];
    if (!dbs.some(d => d.name === 'reckoner-creator-history-v2')) return legacy.join('\n');
    const d = await new Promise((res, rej) => { const r = indexedDB.open('reckoner-creator-history-v2'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const rows = await new Promise((res, rej) => { if (!d.objectStoreNames.contains('heads')) return res([]); const tx = d.transaction('heads', 'readonly'), st = tx.objectStore('heads'), k = st.getAllKeys(), v = st.getAll(); tx.oncomplete = () => res(k.result.map((key, i) => [key, v.result[i]])); tx.onerror = () => rej(tx.error); });
    d.close(); return [...legacy, ...rows.filter(([, v]) => v !== null).map(([k, v]) => 'idb:' + k + '=' + v).sort()].join('\n');
  });
  const headBefore = await head(b);
  check(headBefore.length > 0, 'no retained checkpoint found after tab A saved; the checkpoint comparison would be vacuous');
  await b.click('#save-revision');
  await b.waitForFunction(() => !document.querySelector('#save-error').hidden || document.querySelector('#revision-count').textContent !== '1', null, { timeout: 10000 });
  check(await b.textContent('#revision-count') === '1' && !/^Saved on this device/.test(await b.textContent('#toast')), 'stale tab saved over the other tab or claimed a save');
  const anyDownload = b.waitForEvent('download', { timeout: 4000 }).then(() => true, () => false);
  await b.click('#export-cairn');
  const exported = await anyDownload;
  check(!exported, 'stale tab exported despite the conflict');
  check(await local(b, DEFAULT_KEY) === bytesA && await head(b) === headBefore, 'tab A stored bytes or the accepted history checkpoint changed');
  // Recovery controls may sit in a collapsed disclosure; open it explicitly through its caret.
  const caret = b.locator('summary', { hasText: 'Recovery & preserved copies' });
  if (await caret.count() && !(await caret.evaluate(s => s.parentElement.open))) await caret.click();
  const recovery = await download(b, () => b.click('button:has-text("Download draft recovery")'));
  check(JSON.parse(recovery.text).schema === 'reckoner.draft-recovery.v1' && recovery.text.includes('B CHANGE (synthetic)'), 'draft recovery lacks the stale tab\'s pending edit');
  await capture(b, 'storage-conflict');
  const device = await isolated(), reopened = await device.newPage();
  await reopened.goto(url('index.html'));
  await reopened.setInputFiles('#import-file', { name: recovery.name, mimeType: 'application/json', buffer: Buffer.from(recovery.text) });
  await reopened.waitForFunction(() => document.querySelector('#toast').textContent);
  const notice = await reopened.textContent('#toast');
  check(/unsaved/i.test(notice) && !/verified|authenticat/i.test(notice) && await reopened.inputValue('#proposed') === 'B CHANGE (synthetic)' && !(await head(reopened)), 'recovery did not reopen as an unsaved draft without history or identity claims: ' + notice);
  await device.close();
  await context.close();
  return 'conflict shown; stale save and export refused; other tab\'s bytes and history checkpoint kept; draft recovery reopened as unsaved elsewhere';
});

await step('16. Two tabs adding contexts: the stale tab is told, the stored library keeps the other tab\'s context, and the stale tab can export its own', async () => {
  const context = await isolated(), pages = [await context.newPage(), await context.newPage()];
  for (const page of pages) { await page.goto(url('index.html')); await page.click('#tab-contexts'); await page.waitForSelector('.context-item'); }
  const create = async (page, name) => {
    await page.click('#context-new');
    await page.fill('#ctx-name', name);
    await page.fill('#ctx-meaning', 'Synthetic meaning for ' + name + '.');
    await page.fill('#ctx-author', 'Reader ' + name.at(-1));
    await page.fill('#ctx-provenance', 'Written for the browser check.');
    await page.click('#ctx-save');
    await page.waitForFunction(n => document.querySelector('#context-detail h2')?.textContent === n, name);
  };
  await create(pages[0], 'Tab context A');
  await create(pages[1], 'Tab context B');
  const status = await pages[1].textContent('#context-library-status');
  const stored = await local(pages[1], 'reckoner-context-library-v01');
  check(/Another tab changed this saved work/.test(status) && /Export your contexts/.test(status), 'no conflict message: ' + status);
  check(stored.includes('Tab context A') && !stored.includes('Tab context B'), 'stored library wrong');
  const pkg = JSON.parse((await download(pages[1], () => pages[1].click('#context-export-library'))).text);
  check(pkg.definitions.some(d => d.text.includes('Tab context B')), 'stale tab export lacks its context');
  await capture(pages[1], 'library-conflict');
  await context.close();
  return 'conflict shown; stored library kept tab A; tab B exported its own context';
});

await step('17. Clipboard: a write that misses the deadline restores the controls without claiming success, and its late finish changes nothing', async () => {
  const context = await isolated();
  await context.addInitScript(() => {
    const slow = { writeText: text => new Promise(resolve => setTimeout(() => { window.lateClipboard = text; resolve(); }, 8000)) };
    Object.defineProperty(navigator, 'clipboard', { configurable: true, get: () => slow });
  });
  const page = await context.newPage();
  await page.goto(url('index.html'));
  await page.fill('#original', 'CLIPBOARD SYNTHETIC 原文');
  const started = Date.now();
  await page.click('button:has-text("Copy original OCR")');
  check(await page.$$eval('.copy-passage-controls button', list => list.every(b => b.disabled)), 'controls not disabled while waiting');
  await page.waitForFunction(() => [...document.querySelectorAll('.copy-passage-controls button')].every(b => !b.disabled), null, { timeout: 9000 });
  const waited = Date.now() - started, status = await page.$eval('.copy-passage-controls [role=status]', n => n.textContent);
  check(/did not respond in time/.test(status) && !/^Copied/.test(status), 'status: ' + status);
  const selection = await page.evaluate(() => [document.activeElement.id, document.activeElement.selectionStart, document.activeElement.selectionEnd, document.activeElement.value.length]);
  check(selection[0] === 'original' && selection[1] === 0 && selection[2] === selection[3], 'text not selected for manual copy: ' + selection);
  await page.waitForFunction(() => window.lateClipboard, null, { timeout: 9000 });
  await page.waitForTimeout(300);
  check(await page.$eval('.copy-passage-controls [role=status]', n => n.textContent) === status, 'late finish changed the message');
  await capture(page, 'clipboard-timeout');
  await context.close();
  const granted = await isolated({ permissions: ['clipboard-read', 'clipboard-write'] }), copy = await granted.newPage();
  await copy.goto(url('index.html'));
  await copy.fill('#proposed', 'COPY ME 原文 exactly');
  await copy.click('button:has-text("Copy proposed reading")');
  await copy.waitForFunction(() => [...document.querySelectorAll('.copy-passage-controls [role=status]')].some(n => /^Copied/.test(n.textContent)));
  const pasted = await copy.evaluate(() => navigator.clipboard.readText());
  check(pasted === 'COPY ME 原文 exactly', 'clipboard holds ' + JSON.stringify(pasted));
  await granted.close();
  return 'controls back after ' + Math.round(waited / 100) / 10 + ' s with no success claim; late write left the message unchanged; normal copy exact';
});

await step('18. At phone width, the discovery page and a separate review with its carried packet fit without horizontal scrolling', async () => {
  const context = await isolated({ viewport: { width: 390, height: 844 } }), page = await openDiscovery(context);
  await importPath(page, pathText);
  const overflow = target => target.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(await overflow(page) <= 0, 'discovery page overflows by ' + await overflow(page) + ' px');
  const opened = await openCandidate(context, page);
  await opened.click('#discovery-trail summary');
  check(await overflow(opened) <= 0, 'separate review overflows by ' + await overflow(opened) + ' px');
  await capture(opened, 'phone-separate-review');
  await context.close();
  return 'no horizontal overflow at 390 px';
});

// Each reload of a separate review writes a new saved copy and keeps the earlier ones,
// and each opening writes a new handoff. Nothing removes them; this step measures it.
await step('19. Measured: reloads of a separate review keep the first saved copy and add one per reload; openings add one handoff each', async () => {
  const context = await isolated(), page = await openDiscovery(context);
  await importPath(page, pathText);
  const opened = await openCandidate(context, page), base = handoffBase(opened);
  await opened.waitForFunction(k => sessionStorage.getItem(k), base + ':tab');
  const first = await session(opened, base + ':tab'), firstBytes = await local(opened, first);
  for (let i = 0; i < 3; i++) { await opened.reload(); await opened.waitForFunction(() => /Draft saved on this device/.test(document.querySelector('#save-state').textContent)); }
  const keys = await workspaceKeys(opened, base);
  const characters = await opened.evaluate(list => list.reduce((n, k) => n + localStorage.getItem(k).length, 0), keys);
  check(await local(opened, first) === firstBytes, 'the first saved copy changed or was removed');
  await openCandidate(context, page);
  const handoffs = await page.evaluate(() => Object.keys(localStorage).filter(k => k.endsWith(':intake')).length);
  await context.close();
  return keys.length + ' saved copies after 3 reloads (' + characters + ' characters in all); ' + handoffs + ' handoffs after 2 openings; none removed';
});

await step('20. Delayed preparation waits without opening tabs; direct link opens after verification and default draft stays intact',async()=>{
 const context=await isolated(),page=await openDiscovery(context);await importPath(page,pathText);
 await page.evaluate(()=>{localStorage.setItem('garrison-cairn-workspace-v01','SYNTHETIC default preservation sentinel');const digest=crypto.subtle.digest.bind(crypto.subtle);crypto.subtle.digest=async(...args)=>{await new Promise(r=>setTimeout(r,800));return digest(...args);};});
 const before=context.pages().length;await page.click('#history button:has-text("Prepare a separate document review")');
 check(context.pages().length===before,'preparation opened a popup');check(await page.locator('#history a:has-text("Open your separate review workspace")').count()===0,'link shown before digest');
 const link=page.locator('#history a:has-text("Open your separate review workspace")').last();await link.waitFor();
 const [opened]=await Promise.all([context.waitForEvent('page'),link.click()]);await opened.waitForFunction(()=>document.querySelector('#sourceUrl')?.value);
 check(await local(page,DEFAULT_KEY)==='SYNTHETIC default preservation sentinel','default draft changed');await context.close();return 'deferred digest followed by explicit anchor click; no preparation popup';
});
await step('21. Failed intake storage shows no link and retains discovery draft',async()=>{
 const context=await isolated(),page=await openDiscovery(context);await importPath(page,pathText);const before=await session(page,'reckoner-discovery-draft-v01');
 await page.evaluate(()=>{const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(String(k).endsWith(':intake'))throw new DOMException('Synthetic quota','QuotaExceededError');return set.call(this,k,v);};});
 await page.click('#history button:has-text("Prepare a separate document review")');await page.waitForFunction(()=>!document.querySelector('#history button').disabled);
 check(await page.locator('#history a:has-text("Open your separate review workspace")').count()===0,'usable link shown after failed storage');check(await session(page,'reckoner-discovery-draft-v01')===before,'discovery draft changed');await context.close();return 'storage refusal retained draft and supplied no link';
});
await step('22. Unfinished edits during delayed preparation refuse stale handoff; repeated prepare produces immutable separate snapshots',async()=>{
 const context=await isolated(),page=await openDiscovery(context);await importPath(page,pathText);
 await page.evaluate(()=>{const digest=crypto.subtle.digest.bind(crypto.subtle);crypto.subtle.digest=async(...args)=>{await new Promise(r=>setTimeout(r,500));return digest(...args);};});
 await page.click('#history button:has-text("Prepare a separate document review")');await page.fill('#actor','Edited while hashing');await page.waitForFunction(()=>/unfinished fields changed/.test(document.querySelector('#status').textContent));
 check(await page.locator('#history a:has-text("Open your separate review workspace")').count()===0,'stale preparation supplied a link');
 await page.click('#history button:has-text("Prepare a separate document review")');await page.locator('#history a:has-text("Open your separate review workspace")').waitFor();const first=await page.locator('#history a:has-text("Open your separate review workspace")').getAttribute('href');
 await page.click('#history button:has-text("Prepare a separate document review")');await page.waitForFunction(()=>[...document.querySelectorAll('#history a')].filter(a=>a.textContent==='Open your separate review workspace').length===2);
 const links=await page.locator('#history a:has-text("Open your separate review workspace")').evaluateAll(xs=>xs.map(x=>x.href));check(links.length===2&&links[0]===first&&links[0]!==links[1],'repeated preparation changed existing link or reused destination');await context.close();return 'edits reject stale preparation; repeated links retain distinct immutable handoffs';
});

await step('23. No uncaught page errors and no request left the local server; console errors are listed', async () => {
  const errors = problems.filter(p => p.kind === 'pageerror');
  check(!errors.length, errors.map(p => p.text).join(' | '));
  check(!blocked.length, 'requests that tried to leave the local server: ' + blocked.join(', '));
  const consoleErrors = problems.filter(p => p.kind === 'console');
  return 'external requests: 0 · console errors: ' + (consoleErrors.length ? consoleErrors.length + ' (' + [...new Set(consoleErrors.map(p => p.text))].join(' | ') + ')' : 'none');
});

await browser.close();
server.close();
const summary = { checkedAt: new Date().toISOString(), passed: results.filter(r => r.verdict === 'PASS').length, failed: results.filter(r => r.verdict === 'FAIL').length, skipped: results.filter(r => r.verdict === 'SKIP').length, results, problems, blockedRequests: blocked };
await fs.writeFile(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ passed: summary.passed, failed: summary.failed, skipped: summary.skipped, output: OUT }));
process.exitCode = summary.failed ? 1 : 0;
