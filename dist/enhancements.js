const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const text = (value, max = 10000) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;


// Validate prior v1 records without rewriting their bytes or optional legacy fields.
export function validateImageView(context, source) {
  if (context.imageView === undefined || context.imageView === '') return;
  if (typeof context.imageView !== 'string') throw Error('Invalid saved viewing lens.');
  let view;try{view=JSON.parse(context.imageView);}catch{throw Error('Invalid saved viewing lens JSON.');}
  if (!view || typeof view!=='object' || Array.isArray(view) || view.tool!=='Reckoner CSS viewing lens' || String(view.version)!=='1') throw Error('Unsupported saved viewing lens.');
  for (const [key,min,max] of [['brightnessPercent',50,200],['contrastPercent',50,250],['zoomPercent',50,300],['surroundingBackgroundPercent',10,100]]) {
    // Older v1 records may omit settings later added to the UI; the viewer defaults them.
    if (view[key]!==undefined && (!Number.isFinite(view[key]) || view[key]<min || view[key]>max)) throw Error('Invalid saved viewing lens bounds.');
  }
  const knownHash=view.sourceSha256!==undefined && view.sourceSha256!=='UNKNOWN';
  if (knownHash && (!hash(view.sourceSha256) || view.sourceSha256!==source?.sha256)) throw Error('Viewing lens source mismatch.');
  const url=context.sourceUrl||source?.sourceUrl;
  if (!knownHash && view.sourceUrl!==undefined && view.sourceUrl!=='UNKNOWN' && (typeof view.sourceUrl!=='string' || view.sourceUrl!==url)) throw Error('Viewing lens source URL mismatch.');
  if (view.sourceBytesModified!==undefined && view.sourceBytesModified!==false) throw Error('Unsupported viewing lens byte-modification claim.');
  if (view.enhancedComparison!==undefined && view.enhancedComparison!==null) {
    const c=view.enhancedComparison;
    if (!c || typeof c!=='object' || !knownHash || !hash(c.derivativeSha256) || !Number.isFinite(c.revealPercent) || c.revealPercent<0 || c.revealPercent>100 || !Array.isArray(context.imageEnhancements) || !context.imageEnhancements.some(r=>r?.derivative?.sha256===c.derivativeSha256 && r.originalSha256===source?.sha256)) throw Error('Viewing lens derivative is not attached to this original.');
  }
}

// These records describe measured file relationships and declared processing,
// not the accuracy of details apparently recovered by an enhancement tool.
export function validateEnhancements(context, source) {
  validateImageView(context, source);
  const records = context.imageEnhancements;
  if (records === undefined) return;
  if (!Array.isArray(records) || records.length > 50) throw Error('Invalid enhancement list.');
  const ids = new Set();
  for (const record of records) {
    if (!record || !text(record.id, 200) || ids.has(record.id) ||
        !hash(record.originalSha256) || record.originalSha256 !== source?.sha256 ||
        !text(record.tool, 200) || !text(record.toolVersion, 200) ||
        !text(record.operations) || !text(record.settings) || !text(record.reason) ||
        !text(record.contributor, 200) || !text(record.recordedAt, 100) ||
        !Number.isFinite(Date.parse(record.recordedAt)) ||
        !['uncertain', 'not_assessed'].includes(record.recoveredDetailConfidence) ||
        record.processingClaim !== 'user_declared' ||
        record.originalBytesModified !== false ||
        !record.derivative || !hash(record.derivative.sha256) ||
        !text(record.derivative.name, 500) ||
        !['image/png', 'image/jpeg', 'image/webp'].includes(record.derivative.mime) ||
        !Number.isSafeInteger(record.derivative.size) || record.derivative.size <= 0 ||
        record.derivative.size > 20 * 1024 * 1024) {
      throw Error('Invalid enhancement record or original source mismatch.');
    }
    ids.add(record.id);
  }
}

export function enhancementRecord(source, derivative, details) {
  if (!hash(source?.sha256)) throw Error('Open a local original file first so its bytes can be hashed.');
  const required = ['tool', 'toolVersion', 'operations', 'settings', 'contributor', 'reason'];
  const missing = required.filter(key => !text(details[key], ['tool', 'toolVersion', 'contributor'].includes(key) ? 200 : 10000));
  if (missing.length) throw Error('Add enhancement details: ' + missing.join(', ') + '. Use UNKNOWN explicitly where the tool does not provide a value.');
  const record = {
    id: crypto.randomUUID(), originalSha256: source.sha256,
    derivative: structuredClone(derivative),
    tool: details.tool?.trim(), toolVersion: details.toolVersion?.trim(),
    operations: details.operations?.trim(), settings: details.settings?.trim(),
    contributor: details.contributor?.trim(), reason: details.reason?.trim(),
    recordedAt: new Date().toISOString(),
    recoveredDetailConfidence: 'not_assessed', processingClaim: 'user_declared',
    originalBytesModified: false,
  };
  validateEnhancements({imageEnhancements: [record]}, source);
  return record;
}
