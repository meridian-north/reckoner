// Escape closes only the topmost layer, and closing a layer returns focus to
// its opener without scrolling the page the reader scrolled beneath it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { initCompactWorkspace } from '../dist/compact-workspace.js';
import { app, fixture } from './browser-harness.mjs';

function page() {
  const nodes = new Map(), listeners = [], focused = [];
  class El {
    constructor(id) { this.id = id; this.children = []; this.events = {}; this.attrs = {}; this.hidden = false; this.value = ''; }
    append(...items) { for (const n of items) { n.parent = this; this.children.push(n); } }
    setAttribute(k, v) { this.attrs[k] = v; }
    addEventListener(k, fn) { (this.events[k] ??= []).push(fn); }
    click() { for (const fn of this.events.click || []) fn({}); }
    focus(options) { focused.push({ node: this, options }); }
    closest() { return this.group; }
    querySelector() { return this.children.find(x => x.tag === 'button'); }
  }
  const get = id => { if (!nodes.has(id)) nodes.set(id, new El(id)); return nodes.get(id); };
  get('reading-size').group = get('reading-controls');
  get('page-map-panel').hidden = true;
  const doc = { body: new El('body'), getElementById: get, querySelector: () => get('view-options'), createElement: tag => { const n = new El(); n.tag = tag; return n; }, addEventListener: (type, fn, capture) => listeners.push({ type, fn, capture }) };
  return { doc, get, listeners, focused };
}
const escape = (listeners, extra = {}) => { const event = { key: 'Escape', defaultPrevented: false, target: null, preventDefault() { this.defaultPrevented = true; }, ...extra }; for (const l of listeners.filter(l => l.type === 'keydown')) l.fn(event); return event; };

test('the layer handler listens in the capture phase, so it runs before page-level Escape shortcuts', () => {
  const p = page(); initCompactWorkspace(p.doc);
  const keydown = p.listeners.filter(l => l.type === 'keydown');
  assert.equal(keydown.length, 1);
  assert.equal(keydown[0].capture, true);
});

test('closing the drawer or the introduction returns focus to its opener without scrolling', () => {
  const p = page(), ui = initCompactWorkspace(p.doc);
  ui.setOpen(true); escape(p.listeners);
  assert.equal(p.focused.at(-1).node, ui.button);
  assert.deepEqual(p.focused.at(-1).options, { preventScroll: true });
  ui.setOpen(true); ui.setOpen(false);
  assert.deepEqual(p.focused.at(-1).options, { preventScroll: true });
  p.get('intro').hidden = false; const event = escape(p.listeners);
  assert.equal(event.defaultPrevented, true);
  assert.equal(p.get('intro').hidden, true);
  assert.equal(p.focused.at(-1).node, p.get('toggle-intro'));
  assert.deepEqual(p.focused.at(-1).options, { preventScroll: true });
});

test('page-level Escape returns to split view only when no layer consumed it and no dialog is open', async () => {
  const h = await app(JSON.stringify(fixture()));
  const pressed = []; h.get('split-view').setAttribute = (name, value) => { if (name === 'aria-pressed') pressed.push(value); };
  const press = extra => { for (const fn of h.docListeners.keydown) fn({ key: 'Escape', defaultPrevented: false, target: { closest: () => null }, ...extra }); };
  press({ defaultPrevented: true });
  assert.deepEqual(pressed, [], 'a consumed Escape also changed the layout');
  for (const id of ['save-location', 'settings']) { h.get(id).open = true; press(); h.get(id).open = false; }
  assert.deepEqual(pressed, [], 'Escape over an open dialog also changed the layout');
  press({ target: { closest: selector => (selector.startsWith('input') ? {} : null) } });
  assert.deepEqual(pressed, [], 'Escape typed in a field changed the layout');
  press();
  assert.deepEqual(pressed, ['true']);
});

test('the introduction toggle keeps one name and shows its state with a caret', async () => {
  const h = await app(JSON.stringify(fixture()));
  h.get('intro').hidden = true;
  h.get('toggle-intro').onclick();
  assert.equal(h.get('toggle-intro').textContent, '▾ Introduction & examples');
  h.get('toggle-intro').onclick();
  assert.equal(h.get('toggle-intro').textContent, '▸ Introduction & examples');
});
