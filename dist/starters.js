import { buildDefinition, recordFromModel, pinOf, LEGACY_FORMAT, FORMAT_V03 } from './contexts.js';

// Newly written starter examples. They are not endorsed by Internet Archive and
// are not promoted for Garrison Node production use. Change one only by
// shipping a new version: a stored copy with the same version must keep its hash.
export const STARTER_IDS = Object.freeze({
  literal: 'ctx:starter:literal-transcription',
  image: 'ctx:starter:image-interpretation',
  review: 'ctx:starter:accountable-review',
  estimates: 'ctx:starter:estimate-assumptions',
});

const PROVENANCE = 'Newly written in October 2026 as a starter example for the public Reckoner form, without access to private Garrison Node definitions and without OpenCyc content. Not endorsed by Internet Archive and not promoted for Garrison Node production use. Adapt it, derive a narrower context from it, or write your own.';
// Version 1 stays in format v0.1 so its published hashes never change.
const common = { format: LEGACY_FORMAT, version: 1, author: 'Reckoner starter examples', createdAt: '2026-10-15T00:00:00.000Z', releaseLabel: 'starter_example', provenance: PROVENANCE, compositions: [], adaptedFrom: null, revisionOf: null, revisionReason: null };
// Version 2 says the same things in format v0.3, fixed here so its hashes never change
// either. Each names version 1 by hash; neither version relabels the other.
const SECOND = { format: FORMAT_V03, version: 2, createdAt: '2026-10-15T12:00:00.000Z', basis: 'revision' };
const SECOND_REASON = 'Rewritten in format reckoner.context.cycl.v0.3, the native-aligned public format: native six-section order, one assertion per line, and filing and discovery facets in the section 1 header. The meaning, facets, concepts, rules, view settings, hints and references are unchanged from version 1, which keeps its own bytes, hash and reviews.';

const LITERAL = {
  ...common, id: STARTER_IDS.literal, symbol: 'ReckonerStarterLiteralTranscriptionMt', name: 'Literal transcription', basis: 'newly_authored', parents: [],
  meaning: 'Record exactly what the source shows, character for character, so that another person comparing your reading with the same copy reaches the same text. Keep spelling, punctuation, capitalization, abbreviations and line breaks as they appear, even when they look wrong today. A literal reading may correct a machine reading, but never the author: errors in the source stay in the transcription and are discussed in the reason. Anything that cannot be read with confidence is marked rather than guessed.',
  facets: [{ group: 'work', value: 'transcription' }, { group: 'media', value: 'image' }, { group: 'media', value: 'pdf' }, { group: 'media', value: 'print' }, { group: 'media', value: 'handwriting' }],
  emphasis: ['what', 'where'],
  concepts: [
    { term: 'literal reading', meaning: 'The characters the source shows, in their order, without modernizing or correcting them.' },
    { term: 'machine reading', meaning: 'Text produced by OCR or another automatic process. It is evidence to check, not a source.' },
    { term: 'uncertain reading', meaning: 'A reading the copy supports only in part. Say what else the characters could be.' },
    { term: 'illegible', meaning: 'Characters that cannot be read from the available copy. Say where they are and, if possible, how many.' },
  ],
  rules: [
    'Keep the source spelling, punctuation and capitalization, even when they differ from current usage.',
    'Change only what differs between the machine reading and the source copy.',
    'Mark every uncertain or illegible passage and say why. Never fill a gap from memory or expectation.',
    'Keep line breaks and end-of-line hyphens when a later check could depend on them.',
    'Put explanations in the reason for the reading, never inside the transcription itself.',
  ],
  operations: [{ op: 'readingTextSizePx', value: 17 }, { op: 'readingLineSpacingPercent', value: 190 }],
  hints: [
    'OCR often confuses similar shapes: 1, l and I; 0 and O; rn and m; cl and d; and ligatures such as ﬁ and ﬂ.',
    'A misread digit in a date or amount changes the meaning. Check each digit against the copy.',
    'Faint or broken type can look like punctuation. Compare it with the same letter elsewhere on the page.',
  ],
  references: [{ label: 'Reckoner worked example: a notice date (synthetic)', url: '', locator: 'Try a worked example' }],
};

const IMAGE = {
  ...common, id: STARTER_IDS.image, symbol: 'ReckonerStarterImageInterpretationMt', name: 'Image interpretation', basis: 'newly_authored', parents: [],
  meaning: 'Describe what an image shows separately from what you conclude from it. Viewing changes such as zoom, brightness and contrast help a person see; they add no information to the source. Detail that appears only after sharpening, deblurring or other processing is a lead to check against the original, not a confirmed reading. Each statement about the image names the copy and the region it comes from.',
  facets: [{ group: 'work', value: 'image interpretation' }, { group: 'media', value: 'image' }, { group: 'media', value: 'photograph' }, { group: 'media', value: 'map' }],
  emphasis: ['what', 'where', 'how'],
  concepts: [
    { term: 'original copy', meaning: 'The image file as received, identified by its SHA-256 hash.' },
    { term: 'viewing adjustment', meaning: 'A display change, such as zoom, brightness, contrast or background, that leaves the file bytes unchanged.' },
    { term: 'derivative copy', meaning: 'A processed copy made with another tool. Record the tool, its settings and both file hashes.' },
    { term: 'observation', meaning: 'What is visible in a stated region of a stated copy.' },
    { term: 'interpretation', meaning: 'A conclusion drawn from one or more observations, with the reasoning that connects them.' },
  ],
  rules: [
    'Name the image region for each observation, such as page, line or quadrant.',
    'Record observations before interpretations, in separate sentences.',
    'Treat detail visible only in a processed copy as uncertain until the original supports it.',
    'Record viewing adjustments with the reading, and never describe them as changes to the source.',
  ],
  operations: [{ op: 'imageZoomPercent', value: 150 }, { op: 'imageContrastPercent', value: 130 }, { op: 'surroundingBackgroundPercent', value: 60 }],
  hints: [
    'High contrast can turn stains, show-through and paper texture into apparent marks.',
    'Compression artifacts can look like thin strokes beside sharp edges.',
    'Matching pixel dimensions do not prove that two copies are aligned.',
  ],
  references: [],
};

const REVIEW = {
  ...common, id: STARTER_IDS.review, symbol: 'ReckonerStarterAccountableReviewMt', name: 'Accountable review', basis: 'newly_authored', parents: [],
  meaning: 'Review a saved reading so that another person can repeat your check and see why you reached your decision. A review names the exact reading and source location examined, what was checked, what was not checked, and what remains uncertain. Agreement and disagreement are both kept. A review records a decision by a self-declared person; it does not by itself make a reading true or institutionally approved.',
  facets: [{ group: 'work', value: 'review' }, { group: 'work', value: 'mentoring' }, { group: 'audience', value: 'readers' }, { group: 'audience', value: 'mentors' }],
  emphasis: ['who', 'what', 'where', 'how'],
  concepts: [
    { term: 'repeatable check', meaning: 'Steps another person can follow with the same source to reach, or test, the same decision.' },
    { term: 'evidence checked', meaning: 'The source passages, copies and tools actually examined.' },
    { term: 'not checked', meaning: 'Relevant material that was not examined. Stating it is part of the review.' },
    { term: 'disagreement', meaning: 'A recorded difference between reviews. Keep it visible rather than settling it silently.' },
  ],
  rules: [
    'Name the saved reading and the source location you examined.',
    'Describe each check precisely enough for another person to repeat it.',
    'List relevant material you did not inspect.',
    'Keep quoted source wording separate from your explanation.',
    'Do not treat a majority, a role, or your own earlier review as proof.',
  ],
  operations: [],
  hints: [
    '"Accepted" means the reading matches the evidence you checked, not that every question is settled.',
    'A mentor explains how to make the check, not only what the answer is.',
  ],
  references: [{ label: 'Reckoner contributing guide', url: '', locator: 'CONTRIBUTING.md' }],
};

const ESTIMATES = {
  ...common, id: STARTER_IDS.estimates, symbol: 'ReckonerStarterEstimateAssumptionsMt', name: 'Estimates and their assumptions', basis: 'derived_narrower',
  meaning: 'A narrower form of accountable review for reports that contain estimates. An estimate is read together with the assumptions that produce it, such as capacity, production level, period and method. Readings and reviews keep the qualifying words that mark a figure as estimated, theoretical or a maximum, and keep different scenarios apart. A cited source that has not been inspected is marked as not inspected.',
  facets: [{ group: 'work', value: 'review' }, { group: 'domain', value: 'technical reports' }, { group: 'domain', value: 'environmental reports' }, { group: 'media', value: 'pdf' }],
  emphasis: ['what', 'why', 'how'],
  concepts: [
    { term: 'estimate', meaning: 'A figure calculated from stated assumptions rather than measured directly.' },
    { term: 'qualifying words', meaning: 'Words such as maximum, theoretical, approximately or estimated that limit what a figure claims.' },
    { term: 'scenario', meaning: 'One set of assumptions that produces one estimate. Different scenarios can give different figures.' },
    { term: 'not independently inspected', meaning: 'A cited source known only through the report that cites it.' },
  ],
  rules: [
    'Quote qualifying words together with the figure they qualify.',
    'Record which assumptions belong to which scenario before comparing figures.',
    'Never describe an estimate as a measurement.',
    'Mark each cited source as inspected or not inspected.',
  ],
  operations: [],
  hints: [
    'Footnotes often hold the assumptions. Read them before comparing figures.',
    'Units and periods, such as per day or per year, can differ between scenarios in one report.',
  ],
  references: [{ label: 'Real-report exercise in this form: EPA-hosted Anniston expert report', url: 'https://semspub.epa.gov/work/04/10744553.pdf', locator: 'pages 51 and 61' }],
};

let built = null;

// Returns verified {record, model} entries, every version 1 and then every version 2.
// The hashes depend only on these texts; each narrower starter pins the broader
// starter of its own version.
export async function starterEntries() {
  built ??= (async () => {
    const make = model => recordFromModel(buildDefinition(model), null, { enforceBudget: false });
    const parentPin = entry => [{ symbol: entry.model.symbol, ...pinOf(entry.record) }];
    const literal = await make(LITERAL), image = await make(IMAGE), review = await make(REVIEW);
    const estimates = await make({ ...ESTIMATES, parents: parentPin(review) });
    const second = (source, first, extra = {}) => make({ ...source, ...SECOND, revisionOf: pinOf(first.record), revisionReason: SECOND_REASON, ...extra });
    const literal2 = await second(LITERAL, literal), image2 = await second(IMAGE, image), review2 = await second(REVIEW, review);
    const estimates2 = await second(ESTIMATES, estimates, { parents: parentPin(review2), revisionReason: SECOND_REASON + ' Its broader context is version 2 of Accountable review, pinned by hash.' });
    return [literal, image, review, estimates, literal2, image2, review2, estimates2];
  })();
  return structuredClone(await built);
}

// The newest version of one starter, by its STARTER_IDS name.
export const latestStarter = (entries, name) => entries.filter(e => e.record.id === STARTER_IDS[name]).reduce((a, b) => (!a || b.record.version > a.record.version ? b : a), null);
