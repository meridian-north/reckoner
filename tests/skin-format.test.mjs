import test from 'node:test';
import assert from 'node:assert/strict';
import {readSkin, validateSkin, EXAMPLE_SKIN} from '../dist/skin-format.js';
const fixture = () => structuredClone(EXAMPLE_SKIN);
test('portable skin roundtrip copies only appearance preferences', () => {
  const skin = fixture(), restored = readSkin(JSON.stringify(skin));
  assert.deepEqual(restored, skin); skin.palette.accent = '#000000';
  assert.equal(restored.palette.accent, '#8b2424');
});
test('executable content, URLs and source-filter fields are refused', () => {
  for (const key of ['script','css','html','logoUrl','sourceFilter','approval']) {
    const skin = fixture(); skin[key] = 'untrusted'; assert.throws(() => validateSkin(skin), /fields/);
  }
  const skin = fixture(); skin.palette.accent = 'url(https://example.com)'; assert.throws(() => validateSkin(skin), /colors/);
});
test('skin file byte budget includes multibyte text', () => {
  assert.throws(() => readSkin('界'.repeat(6000)), /16 KB/);
});
test('low contrast and unsupported destinations or fonts refuse', () => {
  const skin = fixture(); skin.palette.ink = skin.palette.paper; assert.throws(() => validateSkin(skin), /contrast/);
  for (const update of [{repositories:['https://example.com']},{repositories:['internet-archive','internet-archive']},{font:'remote-font'}]) assert.throws(() => validateSkin({...fixture(),...update}));
});
test('accessors and prototype-like unexpected keys are rejected without execution', () => {
  const skin = fixture(); Object.defineProperty(skin,'name',{enumerable:true,get(){throw Error('should not run');}}); assert.throws(() => validateSkin(skin), /accessors/);
  assert.throws(() => readSkin(JSON.stringify(fixture()).replace('"schema":','"__proto__":{},"schema":')), /fields/);
});
