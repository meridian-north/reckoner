import { SCHEMA, makeState, seal, verifyReceipt } from './core.js';

export async function restoreDraft(raw) {
  if (!raw) return makeState();
  const candidate = JSON.parse(raw);
  if (!candidate || candidate.schema !== SCHEMA || !candidate.draft || !candidate.branding) throw Error('Incomplete or unsupported saved workspace.');
  for (const key of ['original','proposed','contributor','uncertainty','reason']) {
    if (typeof candidate.draft[key] !== 'string') throw Error('Invalid saved draft.');
  }
  for (const key of ['name','recordLabel','accent']) {
    if (candidate.branding[key] !== undefined && typeof candidate.branding[key] !== 'string') throw Error('Invalid saved appearance.');
  }
  await verifyReceipt(await seal(candidate));
  return { ...makeState(), ...candidate };
}
