export const SKIN_SCHEMA = 'reckoner.appearance.v0.1';
export const MAX_SKIN_BYTES = 16384;
const keys = ['schema', 'id', 'version', 'name', 'author', 'license', 'palette', 'font', 'density', 'repositories'];
const colors = ['ink', 'paper', 'muted', 'line', 'soft', 'accent', 'focus'];
export const REPOSITORIES = Object.freeze(['internet-archive', 'open-library', 'library-of-congress']);
function need(ok, message) { if (!ok) throw Error(message); }
function exact(value, expected) {
  need(value && typeof value === 'object' && !Array.isArray(value), 'Expected a skin object.');
  const own = Reflect.ownKeys(value);
  need(own.length === expected.length && own.every(k => expected.includes(k)), 'Unexpected or missing skin fields.');
  for (const k of own) need(Object.hasOwn(Object.getOwnPropertyDescriptor(value, k), 'value'), 'Skin accessors are not allowed.');
}
function text(value, max, label) {
  need(typeof value === 'string' && value.trim().length > 0 && value.length <= max && !/[\u0000-\u001f\u007f]/.test(value), 'Invalid ' + label + '.');
  return value;
}
function luminance(hex) {
  const values = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4);
  return values.reduce((a, x, i) => a + x * [.2126, .7152, .0722][i], 0);
}
export function contrast(a, b) { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
export function validateSkin(input) {
  exact(input, keys);
  need(input.schema === SKIN_SCHEMA, 'Unsupported skin format.');
  need(typeof input.id === 'string' && /^[a-z][a-z0-9-]{0,47}$/.test(input.id), 'Invalid skin identifier.');
  need(Number.isSafeInteger(input.version) && input.version > 0 && input.version <= 100000, 'Invalid skin version.');
  text(input.name, 80, 'skin name'); text(input.author, 120, 'creator'); text(input.license, 120, 'license');
  exact(input.palette, colors);
  for (const color of colors) need(typeof input.palette[color] === 'string' && /^#[a-f0-9]{6}$/i.test(input.palette[color]), 'Use six-digit colors only.');
  need(['system', 'serif'].includes(input.font), 'Choose a built-in font.');
  need(['comfortable', 'compact'].includes(input.density), 'Choose a supported spacing.');
  need(Array.isArray(input.repositories) && input.repositories.length <= REPOSITORIES.length && input.repositories.every(x => REPOSITORIES.includes(x)) && new Set(input.repositories).size === input.repositories.length, 'Choose supported repositories without duplicates.');
  const p = input.palette;
  for (const [a, b, min] of [[p.ink, p.paper, 4.5], [p.muted, p.paper, 4.5], [p.accent, p.paper, 4.5], ['#ffffff', p.accent, 4.5], [p.focus, p.paper, 3], [p.ink, '#ffffff', 4.5], [p.ink, p.soft, 4.5], [p.muted, p.soft, 4.5], [p.accent, p.soft, 4.5], [p.focus, '#ffffff', 3]]) {
    need(contrast(a, b) >= min, 'Skin colors need stronger contrast.');
  }
  // Copy only the documented fields. No CSS, HTML, scripts, URLs or source filters.
  return {schema: input.schema, id: input.id, version: input.version, name: input.name, author: input.author, license: input.license, palette: Object.fromEntries(colors.map(k => [k, input.palette[k].toLowerCase()])), font: input.font, density: input.density, repositories: [...input.repositories]};
}
export function readSkin(text) {
  need(typeof text === 'string' && new TextEncoder().encode(text).byteLength <= MAX_SKIN_BYTES, 'Skin file exceeds 16 KB.');
  return validateSkin(JSON.parse(text));
}
export const EXAMPLE_SKIN = Object.freeze({schema: SKIN_SCHEMA, id: 'archive-companion', version: 1, name: 'Archive companion', author: 'John Reed · Garrison Node', license: 'MIT', palette: {ink:'#242424',paper:'#fafafa',muted:'#555555',line:'#c9c9c9',soft:'#ededed',accent:'#8b2424',focus:'#005fcc'}, font:'system', density:'comfortable', repositories:[...REPOSITORIES]});
