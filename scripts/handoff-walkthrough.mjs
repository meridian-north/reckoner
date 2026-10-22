// Real-browser checks of the two handoffs that wait on a hash: preparing a
// separate review from search notes, and recording a model response.
// Optional developer check, separate from `npm test`. Synthetic data only;
// every request that leaves the local server is refused and listed.
//
// Two steps need Chromium's pop-up blocker, which Playwright normally turns
// off and the headless shell lacks. They run in the full Chromium build
// (Playwright's "chromium" channel, or CHROMIUM_PATH) with the blocker back
// on, and only after a control shows it is active: a window opened straight
// from a click must open, and one requested 6 s after a click must be
// refused. If the control fails, those steps are reported as SKIP.
// Usage: node scripts/handoff-walkthrough.mjs [output directory]
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { STATIC_TYPES } from './static-types.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const DIST = path.join(ROOT, 'dist');
const OUT = path.resolve(process.argv[2] || path.join(ROOT, '.build', 'handoff-walkthrough'));

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
      response.writeHead(200, { 'content-type': STATIC_TYPES[path.extname(file)] || 'application/octet-stream' });
      response.end(body);
    } catch { response.writeHead(404); response.end('Not found'); }
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

class Skip extends Error {}
const results = [], problems = [], blocked = [];
let shot = 0;
async function step(name, fn) {
  try { const detail = await fn(); results.push({ step: name, verdict: 'PASS', detail: detail ?? null }); console.log('PASS', name, detail ? '· ' + detail : ''); }
  catch (error) { const verdict = error instanceof Skip ? 'SKIP' : 'FAIL'; results.push({ step: name, verdict, detail: error.message }); console.log(verdict, name, '·', error.message); }
}
const check = (condition, message) => { if (!condition) throw Error(message); };

const { chromium } = await loadPlaywright();
await fs.mkdir(OUT, { recursive: true });
const server = await serve();
const origin = 'http://127.0.0.1:' + server.address().port;
const url = file => origin + '/' + file;
const plain = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
let guarded = null, guardedNote = '';
try { guarded = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : { channel: 'chromium' }), ignoreDefaultArgs: ['--disable-popup-blocking'] }); }
catch (error) { guardedNote = 'the full Chromium build could not start (' + error.message.split('\n')[0] + ')'; }

function watch(page) {
  page.on('dialog', dialog => dialog.accept());
  page.on('pageerror', error => problems.push({ kind: 'pageerror', page: page.url(), text: error.message }));
  page.on('console', message => { if (message.type() === 'error') problems.push({ kind: 'console', page: page.url(), text: message.text() }); });
}
async function isolated(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
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
const local = (page, key) => page.evaluate(k => localStorage.getItem(k), key);
// Slows every SHA-256 in the page. The handoffs hash before they finish; nothing else is changed.
const slowHash = (page, ms) => page.evaluate(delay => { const digest = crypto.subtle.digest.bind(crypto.subtle); crypto.subtle.digest = async (...args) => { await new Promise(r => setTimeout(r, delay)); return digest(...args); }; }, ms);
// Records every window the page asks for, without changing what happens to it.
const countWindowRequests = context => context.addInitScript(() => { const open = window.open; window.windowRequests = []; window.open = function (...args) { window.windowRequests.push(String(args[0])); return open.apply(this, args); }; });
const reviewLinks = page => page.locator('#history a:has-text("Open your separate review workspace")');
const PREPARE = '#history button:has-text("Prepare a separate document review")';
const CANDIDATE = 'https://source.invalid/handoff-check.pdf';

// Search notes with one planned search and one possible source. The .invalid names never resolve.
async function notesWithCandidate(context) {
  const page = await context.newPage();
  await page.goto(url('discovery.html'));
  await page.selectOption('#goal', 'science');
  await page.fill('#title', 'Handoff checks');
  await page.fill('#by', 'Reader H');
  await page.click('#start button');
  await page.waitForFunction(() => !document.querySelector('#work').hidden);
  await page.selectOption('#kind', 'attempt');
  await page.fill('#f-query', 'synthetic query');
  await page.fill('#f-destination', 'Synthetic library');
  await page.fill('#f-url', 'https://catalogue.invalid/search');
  await page.fill('#f-reason', 'Synthetic search.');
  await page.click('#add button:has-text("Save this note")');
  await page.waitForFunction(() => document.querySelectorAll('#history > li').length === 1);
  await page.selectOption('#kind', 'candidate');
  await page.waitForSelector('#f-locator');
  await page.fill('#f-url', CANDIDATE);
  await page.fill('#f-locator', 'page 3');
  await page.fill('#f-reason', 'Synthetic candidate.');
  await page.click('#add button:has-text("Save this note")');
  await page.waitForFunction(() => document.querySelectorAll('#history > li').length === 2);
  return page;
}

let blockerActive = false;
await step('1. Control: in the full Chromium build, a window opened straight from a click opens and one requested 6 s later is refused', async () => {
  if (!guarded) throw new Skip(guardedNote + '; the blocker-dependent steps 2 and 3 are not run');
  const context = await isolated(guarded), page = await context.newPage();
  await page.goto(url('discovery.html'));
  await page.evaluate(target => {
    const add = (id, open) => { const b = document.createElement('button'); b.id = id; b.textContent = id; b.onclick = open; document.body.prepend(b); };
    add('control-now', () => { window.open(target, '_blank'); });
    add('control-late', () => { setTimeout(() => window.open(target, '_blank'), 6000); });
  }, url('index.html'));
  const count = () => context.pages().length, start = count();
  await page.click('#control-now'); await page.waitForTimeout(1500);
  const now = count() - start;
  await page.click('#control-late'); await page.waitForTimeout(7500);
  const late = count() - start - now;
  await context.close();
  if (now !== 1 || late !== 0) throw new Skip('this browser ' + (now !== 1 ? 'did not open a window straight from a click' : 'did not refuse the late window') + ', so its pop-up blocker cannot be relied on; steps 2 and 3 are not run');
  blockerActive = true;
  return 'immediate window opened; late window refused; blocker active';
});

await step('2. With the blocker on, a review prepared behind a 6.5 s hash still opens from its link, and preparing asks for no window', async () => {
  if (!blockerActive) throw new Skip('needs the control in step 1');
  const context = await isolated(guarded);
  await countWindowRequests(context);
  const page = await notesWithCandidate(context);
  await slowHash(page, 6500);
  const before = context.pages().length, started = Date.now();
  await page.click(PREPARE);
  await reviewLinks(page).last().waitFor({ timeout: 40000 });
  const waited = Date.now() - started;
  check(context.pages().length === before && await page.evaluate(() => window.windowRequests.length) === 0, 'preparing the review asked for a window by itself');
  await capture(page, 'prepared-after-slow-hash');
  const [opened] = await Promise.all([context.waitForEvent('page', { timeout: 5000 }), reviewLinks(page).last().click()]);
  await opened.waitForFunction(source => document.querySelector('#sourceUrl')?.value === source, CANDIDATE);
  await context.close();
  return 'link ready after ' + (waited / 1000).toFixed(1) + ' s; clicking it opened the review';
});

await step('3. With the blocker on, Prepare and Open work from the keyboard alone', async () => {
  if (!blockerActive) throw new Skip('needs the control in step 1');
  const context = await isolated(guarded);
  await countWindowRequests(context);
  const page = await notesWithCandidate(context), before = context.pages().length;
  await page.focus(PREPARE);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.activeElement?.textContent === 'Open your separate review workspace');
  check(context.pages().length === before && await page.evaluate(() => window.windowRequests.length) === 0, 'preparing the review asked for a window by itself');
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
  check(outline !== 'none', 'the focused link has no visible outline');
  const [opened] = await Promise.all([context.waitForEvent('page', { timeout: 5000 }), page.keyboard.press('Enter')]);
  await opened.waitForFunction(() => document.querySelector('#sourceUrl')?.value);
  await context.close();
  return 'focus moved to the link with a visible outline; Enter opened the review';
});

await step('4. A prepared snapshot never changes; its link is withdrawn from the page when the notes change', async () => {
  const context = await isolated(plain), page = await notesWithCandidate(context);
  await page.click(PREPARE);
  await reviewLinks(page).last().waitFor();
  const href = new URL(await reviewLinks(page).last().getAttribute('href'), origin).href;
  const key = 'reckoner-discovery-review:' + new URL(href).searchParams.get('discovery') + ':intake';
  const snapshot = await local(page, key);
  await page.selectOption('#kind', 'clue');
  await page.fill('#f-text', 'A later clue.');
  await page.selectOption('#f-confidence', 'uncertain_memory');
  await page.click('#add button:has-text("Save this note")');
  await page.waitForFunction(() => document.querySelectorAll('#history > li').length === 3);
  check(await reviewLinks(page).count() === 0, 'a prepared link stayed on the page after the notes changed');
  check(await local(page, key) === snapshot, 'the stored snapshot changed');
  const old = await context.newPage();
  await old.goto(href);
  await old.waitForFunction(() => document.querySelector('#discovery-trail pre'));
  const notes = JSON.parse(await old.$eval('#discovery-trail pre', n => n.textContent)).body.events.length;
  check(notes === 2, 'the earlier link carried ' + notes + ' notes');
  await context.close();
  return 'link withdrawn on change; its address still opens the 2-note snapshot it was prepared from';
});

await step('5. A note saved during a slow hash refuses the stale handoff and stores nothing', async () => {
  const context = await isolated(plain), page = await notesWithCandidate(context);
  await slowHash(page, 1500);
  await page.click(PREPARE);
  await page.selectOption('#kind', 'clue');
  await page.fill('#f-text', 'Clue saved while hashing.');
  await page.selectOption('#f-confidence', 'uncertain_memory');
  await page.click('#add button:has-text("Save this note")');
  await page.waitForFunction(() => /changed while preparing/.test(document.querySelector('#status').textContent), null, { timeout: 10000 });
  check(await reviewLinks(page).count() === 0, 'a stale link appeared');
  check(await page.evaluate(() => Object.keys(localStorage).filter(k => k.endsWith(':intake')).length) === 0, 'a stale handoff was stored');
  await context.close();
  return 'refused with a message; no link and no stored handoff';
});

// The worked-example button sits in the introduction, which may start collapsed;
// the compact layout then offers the same loader as Try an example.
const loadExample = async page => { await page.waitForSelector('#load-example', { state: 'attached' }); await page.click((await page.isVisible('#load-example')) ? '#load-example' : '#quick-example'); };
async function modelHandoff(context) {
  const page = await context.newPage();
  await page.goto(url('index.html'));
  await loadExample(page);
  await page.waitForFunction(() => document.querySelector('#title').value.startsWith('Worked example'));
  await page.click('details.advanced-tools:has(#prepare-prompt) > summary');
  await page.click('#prepare-prompt');
  await page.waitForFunction(() => document.querySelector('#model-prompt').value.length > 0);
  await page.fill('#model-provider', 'Synthetic provider');
  await page.fill('#model-name', 'Synthetic model 0.1');
  await page.fill('#model-response', 'Synthetic response text.');
  return page;
}
const modelRuns = page => page.evaluate(() => { try { return (JSON.parse(localStorage.getItem('garrison-cairn-workspace-v01')).modelRuns || []).length; } catch { return -1; } });

await step('6. A model response still hashing when the workspace is replaced does not attach to the new workspace', async () => {
  const context = await isolated(plain), page = await modelHandoff(context);
  await slowHash(page, 2000);
  await page.click('#record-model-response');
  check(await page.$eval('#record-model-response', b => b.disabled), 'the record button stayed enabled while hashing');
  await page.locator('.task-more > summary').click();
  await page.click('#new-workspace');
  await page.waitForFunction(() => /changed while recording/.test(document.querySelector('#toast').textContent), null, { timeout: 10000 });
  check(await modelRuns(page) === 0, 'the response attached to the new workspace');
  check(!(await page.$eval('#record-model-response', b => b.disabled)), 'the record button stayed disabled');
  await capture(page, 'model-response-refused');
  await context.close();
  return 'refused with a message; the new workspace has no model runs; button enabled again';
});

await step('7. Editing a model response while it hashes refuses it; recording again records it once', async () => {
  const context = await isolated(plain), page = await modelHandoff(context);
  await slowHash(page, 1500);
  await page.click('#record-model-response');
  await page.fill('#model-response', 'Synthetic response text, edited.');
  await page.waitForFunction(() => /changed while recording/.test(document.querySelector('#toast').textContent), null, { timeout: 10000 });
  check(await modelRuns(page) === 0, 'the edited response attached');
  await page.click('#record-model-response');
  await page.waitForFunction(() => /Model suggestion recorded/.test(document.querySelector('#toast').textContent), null, { timeout: 10000 });
  check(await modelRuns(page) === 1, 'expected exactly one model run');
  await context.close();
  return 'the edit refused the first attempt; the second recorded once';
});

await step('8. No uncaught page errors and no request left the local server; console errors are listed', async () => {
  const errors = problems.filter(p => p.kind === 'pageerror');
  check(!errors.length, errors.map(p => p.text).join(' | '));
  check(!blocked.length, 'requests that tried to leave the local server: ' + blocked.join(', '));
  const consoleErrors = problems.filter(p => p.kind === 'console');
  return 'external requests: 0 · console errors: ' + (consoleErrors.length ? consoleErrors.length + ' (' + [...new Set(consoleErrors.map(p => p.text))].join(' | ') + ')' : 'none');
});

await plain.close();
if (guarded) await guarded.close();
server.close();
const count = verdict => results.filter(r => r.verdict === verdict).length;
const summary = { checkedAt: new Date().toISOString(), passed: count('PASS'), failed: count('FAIL'), skipped: count('SKIP'), results, problems, blockedRequests: blocked };
await fs.writeFile(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ passed: summary.passed, failed: summary.failed, skipped: summary.skipped, output: OUT }));
process.exitCode = summary.failed ? 1 : 0;
