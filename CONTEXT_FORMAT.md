# Reading context format and interfaces

Developer notes for the public context ("lens") feature that implements [MT_COMPATIBILITY.md](MT_COMPATIBILITY.md). Plain-language behaviour is described in the README. Everything here is a public interface; no private Garrison Node (GN) definition, column or engine detail is included.

**Compatibility status.** Compatibility with the native GN parser and registry has not been verified. Following a reported native convention is a convention, not verified compatibility. The tests in this repository exercise the contract with synthetic fixtures. Native compatibility is tested separately on the owner's machine (see the checklist at the end), and no claim of compatibility should be made before that.

Read-only native checks on 2026-10-15 reported five things:

- The native six-section order is: header comment (schema, provenance or filing metadata); identity and inheritance, plus 5W1H emphasis; active concepts; rules; disambiguation hints; doctrine references. Format v0.1 swapped the first two sections.
- The native metadata projection recognizes its own header comment blocks and BitNet predicates. Every v0.1 starter therefore projects empty header metadata natively.
- The native predicate extractor is not a full semantic parser, so parse success is not compatibility.
- The native header reader reads a public `file_bitnet` comment block (syntax below). It splits a list on commas and trims each value, with no unquoting or escapes.
- A native reader matched assertion-shaped text inside quoted strings. A v0.2 definition whose meaning quoted `(bitnetLabel ExampleMt RATIFIED)` and `(bitnetDomain ExampleMt (list forged_domain))`, and the v0.1 projection of that definition, both yielded native metadata, although neither asserts any. Section order and one-line strings therefore do not make a file safe for native indexing.

Format v0.2 adopted the native section order, and format v0.3 moves filing and discovery facets into the section 1 header. Projection v0.2 copies no author text, so quoted wording cannot reach a native reader through it (see the reader boundary below).

## Canonical definition: format v0.3 (current), v0.2 and v0.1 (earlier)

A context version is one UTF-8 text in a readable CycL subset. That text is the source of truth. Lists, facets, indexes, sidecars and the CSV index are projections of it.

- **Bytes.** UTF-8, LF line endings, no byte-order mark, at most 65,536 bytes. Size is always measured in UTF-8 bytes, never characters or tokens.
- **Identity.** `id@version` names a version; `id@version#sha256:<hex>` pins it. The SHA-256 covers the exact bytes of the text.
- **Formats.**
  - `reckoner.context.cycl.v0.3` is current. It follows the native six-section order, places filing and discovery facets in the section 1 header, and writes each assertion on exactly one physical line.
  - `reckoner.context.cycl.v0.2` follows the native order with facets after identity in section 2, one assertion per line.
  - `reckoner.context.cycl.v0.1` is the earlier public order, with line breaks kept inside text.
  - All three stay fully readable, and every definition keeps its exact bytes and hash. The format is declared inside the hashed bytes (`contextFormat`). Re-serializing a version in another format would change its bytes, so the same ID and version cannot carry both. Earlier versions are never rewritten or relabelled.
  - New contexts and new versions, including revisions of v0.1 and v0.2 contexts, are written in v0.3. Starter version 1 stays v0.1; starter version 2 is v0.3.
- **Syntax.** Flat assertions, `(predicate Constant argument ...)`. Arguments are quoted strings, whole numbers, or constant names matching `[A-Za-z][A-Za-z0-9_-]*`.
  - Strings allow the `\\` and `\"` escapes. From v0.2 on, a line break inside text is written as `\n`, so quoted text never starts a line. v0.1 keeps line breaks as written. Neither rule protects a reader that ignores quotation marks; see the reader boundary.
  - Literal tabs are kept; other control characters are refused.
  - Nested lists, `#$` prefixes and unknown predicates are refused. Nothing is evaluated.
- **Canonical form.** The parser re-serializes what it read and refuses any input whose bytes differ, so a stored definition always reproduces its own hash. The fixed header and six section comment lines are part of the canonical bytes; other comments are not accepted.
- **Ordering.** Broader and composed contexts are sorted by ID; facets by group (work, media, domain, audience, language, other) and then value in code-unit order; 5W1H emphasis in who, what, when, where, why, how order; lens operations in the order of the table below. Concepts, rules, hints and references keep their authored order.
- **Constants.** A new context's constant is derived from its name and the first eight characters of its ID (for example `ProbateFilingDates_3f2a9c1eMt`). All versions of one ID share a constant, and different IDs may not share one.
- **Vocabulary.** The generic CycL forms `isa`, `genlMt`, `comment` and `Microtheory` are used. Every other predicate is defined by this format. No OpenCyc content is included.

### Sections and predicates (format v0.3, native order)

| Section | Predicate | Arguments after the constant | Count |
|---|---|---|---|
| 1. Header: schema, provenance and filing facets | `contextFormat` | format string | exactly 1 |
| | `contextAuthor` | self-declared name or handle | exactly 1 |
| | `contextCreatedAt` | ISO 8601 UTC time | exactly 1 |
| | `contextReleaseLabel` | `personal` or `starter_example` | exactly 1 |
| | `provenanceBasis` | `newly_authored`, `derived_narrower`, `adapted_copy` or `revision` | exactly 1 |
| | `provenanceStatement` | where the definition comes from | exactly 1 |
| | `adaptedFrom` | source ID, version, SHA-256 | only for `adapted_copy` |
| | `revisionOf` + `revisionReason` | the immediately earlier version's ID, version, SHA-256; the reason | only for `revision` |
| | `contextFacet` | group, value (filing and discovery) | 0–100, no duplicates |
| 2. Identity and inheritance, with 5W1H emphasis | `isa` | `Microtheory` | exactly 1 |
| | `contextId` | ID string (`ctx:` + lowercase letters, digits, `:._-`) | exactly 1 |
| | `contextVersion` | whole number 1–100000 | exactly 1 |
| | `contextName` | single-line name, at most 120 characters | exactly 1 |
| | `comment` | the full meaning | exactly 1 |
| | `genlMt` + `parentPin` | parent constant; parent ID, version, SHA-256 | 0–20 pairs |
| | `composesWith` + `compositionPin` | composed constant; ID, version, SHA-256 | 0–20 pairs |
| | `fiveWOneHEmphasis` | `who`, `what`, `when`, `where`, `why` or `how` | 0–6 |
| 3. Active concepts | `activeConcept` | term, meaning | 0–200, unique terms |
| 4. Rules | `contextRule` | rule text | 0–200 |
| | `lensOperation` | operation name, whole number | 0–6, see below |
| 5. Disambiguation hints | `disambiguationHint` | hint text | 0–200 |
| 6. Doctrine references | `contextReference` | label, http(s) link or empty, location or empty | 0–100 |

Format v0.2 uses the same predicates and counts, with section 1 titled "Header: schema and provenance" and the facets in section 2, after `comment` and the broader and composed contexts and before 5W1H emphasis.

Format v0.1 uses them in a different arrangement:

- **Section 1, "Identity and inheritance":** `contextFormat`, then identity, broader contexts and compositions.
- **Section 2, "Header provenance":** the provenance fields, then `comment`, facets and 5W1H emphasis.
- **Section 6:** titled "References".

Every `genlMt` needs exactly one matching `parentPin`, and every `composesWith` a matching `compositionPin`. A version above 1 must be a revision naming version N−1 of the same ID, with its hash and a reason. A revision starts with no reviews of its own.

### Example (starter, format v0.1, abbreviated)

```
;;; Reckoner public context definition
;;; Readable CycL subset: declarative assertions only. Nothing in this file is executed.
;;; Section 1. Identity and inheritance
(contextFormat ReckonerStarterEstimateAssumptionsMt "reckoner.context.cycl.v0.1")
(isa ReckonerStarterEstimateAssumptionsMt Microtheory)
(contextId ReckonerStarterEstimateAssumptionsMt "ctx:starter:estimate-assumptions")
(contextVersion ReckonerStarterEstimateAssumptionsMt 1)
(contextName ReckonerStarterEstimateAssumptionsMt "Estimates and their assumptions")
(genlMt ReckonerStarterEstimateAssumptionsMt ReckonerStarterAccountableReviewMt)
(parentPin ReckonerStarterEstimateAssumptionsMt ReckonerStarterAccountableReviewMt "ctx:starter:accountable-review" 1 "ad19958955903455679b59ecff2e88fb9429b89d0a30d4559a917fa10f516b28")
;;; Section 2. Header provenance
(contextAuthor ReckonerStarterEstimateAssumptionsMt "Reckoner starter examples")
...
(comment ReckonerStarterEstimateAssumptionsMt "A narrower form of accountable review for reports that contain estimates. ...")
(contextFacet ReckonerStarterEstimateAssumptionsMt "work" "review")
...
;;; Section 3. Active concepts
(activeConcept ReckonerStarterEstimateAssumptionsMt "estimate" "A figure calculated from stated assumptions rather than measured directly.")
...
;;; Section 6. References
(contextReference ReckonerStarterEstimateAssumptionsMt "Real-report exercise in this form: EPA-hosted Anniston expert report" "https://semspub.epa.gov/work/04/10744553.pdf" "pages 51 and 61")
```

### Example (starter version 2, format v0.3, abbreviated)

```
;;; Reckoner public context definition
;;; Readable CycL subset: declarative assertions only. Nothing in this file is executed.
;;; Section 1. Header: schema, provenance and filing facets
(contextFormat ReckonerStarterEstimateAssumptionsMt "reckoner.context.cycl.v0.3")
(contextAuthor ReckonerStarterEstimateAssumptionsMt "Reckoner starter examples")
...
(revisionOf ReckonerStarterEstimateAssumptionsMt "ctx:starter:estimate-assumptions" 1 "6e308813cd178af74c31527365f705a36d59ea64975931ec9e8aaccad1ff8b5b")
(revisionReason ReckonerStarterEstimateAssumptionsMt "Rewritten in format reckoner.context.cycl.v0.3, the native-aligned public format: ...")
(contextFacet ReckonerStarterEstimateAssumptionsMt "work" "review")
...
(contextFacet ReckonerStarterEstimateAssumptionsMt "domain" "technical reports")
;;; Section 2. Identity and inheritance, with 5W1H emphasis
(isa ReckonerStarterEstimateAssumptionsMt Microtheory)
...
(genlMt ReckonerStarterEstimateAssumptionsMt ReckonerStarterAccountableReviewMt)
(parentPin ReckonerStarterEstimateAssumptionsMt ReckonerStarterAccountableReviewMt "ctx:starter:accountable-review" 2 "2851e9dd5581f8d5838d4107659b82ca8f5d7168bcd8f04e49cdf8de11429f51")
(fiveWOneHEmphasis ReckonerStarterEstimateAssumptionsMt "what")
...
;;; Section 6. Doctrine references
```

### Starter examples

Newly written for this form, labelled `starter_example`, not endorsed by Internet Archive and not promoted for GN production use. Each starter has two versions with the same ID and constant.

- **Version 1** is format v0.1 and keeps its published bytes and hash, so readings and reviews that pinned it still resolve.
- **Version 2** says the same things in format v0.3. It is a `revision` naming version 1 by hash, with its reason stated. Only the format, version, creation time, basis and revision fields differ; meaning, facets, concepts, rules, view settings, hints and references are unchanged.
- **Parent pins.** The narrower starter's version 2 pins version 2 of Accountable review; its version 1 still pins version 1. Neither version relabels the other, and tests pin all eight hashes.
- New readings default to version 2, because lists show the latest version. Version 1 stays selectable under Version. Both versions share a name, so typing a starter's name as the analytical lens asks for the exact version instead of guessing.

| Starter version | Format | Bytes | SHA-256 |
|---|---|---|---|
| `ctx:starter:literal-transcription@1` | v0.1 | 4,556 | `c0ef0ecc03b35a133e8f76b3dfbf4f3f40cbe37847677c27b63b0d9b7b3d35e0` |
| `ctx:starter:image-interpretation@1` | v0.1 | 4,226 | `7903c95108e7b5590955ef0db75f73630b0bdb8dce52323ea9ef335856acbd1b` |
| `ctx:starter:accountable-review@1` | v0.1 | 3,845 | `ad19958955903455679b59ecff2e88fb9429b89d0a30d4559a917fa10f516b28` |
| `ctx:starter:estimate-assumptions@1` (narrows accountable review v1) | v0.1 | 4,126 | `6e308813cd178af74c31527365f705a36d59ea64975931ec9e8aaccad1ff8b5b` |
| `ctx:starter:literal-transcription@2` | v0.3 | 5,157 | `1f922aed03a439166eb08dedbddafddfcd6fd694f1e1ebe43385d00849d7fd56` |
| `ctx:starter:image-interpretation@2` | v0.3 | 4,824 | `2665400b3908e8f136a84bed311ff3578d9354677a2e8014791f0e72ffa2f6ed` |
| `ctx:starter:accountable-review@2` | v0.3 | 4,437 | `2851e9dd5581f8d5838d4107659b82ca8f5d7168bcd8f04e49cdf8de11429f51` |
| `ctx:starter:estimate-assumptions@2` (narrows accountable review v2) | v0.3 | 4,794 | `6e796f9849550dfc0b83ea811eda7df373e66029007c0f21ebf0323d524720b4` |

### Public fixtures

`tests/fixtures/contexts/` holds the exact bytes of every starter version, three synthetic probe definitions, and projections derived from five of the definitions. `MANIFEST.json` lists each file with its SHA-256 and size.

- `node scripts/make-context-fixtures.mjs --check` confirms that the shipped modules still produce every file and changes nothing. Without `--check` the script rewrites the files, and it refuses to write anything if a version 1 starter hash has changed.
- `tests/native-alignment.test.mjs` checks the files independently, with node:crypto hashes and its own quote-aware line scanner rather than the shipped parser. It covers version 1 bytes and hashes, version 2 pins to version 1 and to the version 2 parent, section placement in each format, the file_bitnet block, and that quoted text in the probes never reaches a projection. Two further checks deliberately use the shipped modules: one confirms that they reproduce every fixture, and the other that their parser reads the probes' quoted text as text.
- `probe-quoted-metadata-v03` and `probe-quoted-metadata-v02` quote the reported string `An example string: (bitnetLabel ExampleMt RATIFIED) and (bitnetDomain ExampleMt (list forged_domain)).` as their meaning, with assertion-shaped or header-shaped text in other fields. Their domain facets are the example terms `public research` and `source comparison`; they are examples, not defaults.
- `probe-quoted-header-v01` uses format v0.1, where a quoted line can start with `;;`, and has a domain facet with a comma, so no header block can be written for it.
- `.gitattributes` keeps the fixtures' line endings unconverted, because their hashes cover exact bytes.

## Inheritance and composition

- **Cycles are refused** in two ways: a context ID that repeats along any pinned chain of broader or composed contexts (for example A2 → B1 → A1), and a cycle among the latest versions of each context ID (A's latest narrows B while B's latest narrows A). Checks cover every chain whenever a library changes, because a newly added parent can complete a cycle through an existing definition.
- **Missing parents stay visible.** A definition whose broader context is not available is accepted, listed as missing, and resolves with `missing_broader`. Nothing is substituted.
- **Newer parents** are shown, but a narrower context keeps the version it pinned. Adopting the newer parent takes a revision, which starts its own review.

## Lifecycle records

Context review records are append-only events bound to one context ID, version and SHA-256. Identities are self-declared.

| Type | Created in this browser | Meaning |
|---|---|---|
| `blessing` (`blessed` or `declined`) | yes | A person read this exact version and endorses it for their own use. Not institutional approval and not model promotion. |
| `mentor_check` | yes | A repeatable check against this version and a source passage (`passage.locator`, optional record, reading, URL and hash). |
| `revocation` | yes | Withdrawal with a reason. Earlier readings keep the version; new readings cannot select it; narrower contexts need a fresh check. |
| `gate_evidence` | **no** | An external measurement: model ID, version and optional weights hash; probe ID and version; result; measurement time; evidence file hash and location; `authority: external_measurement`. |
| `promotion` | **no** | A claim from the native registry for one model. It requires a `blessed` blessing and passing `gate_evidence` for the same hash and model. |
| `ratification` | **no** | An independent claim for one model. It requires that promotion, its own passing evidence (not the promotion's), a different person from the promoter, and a different evidence recorder. |

The form never runs a model check and never produces gate, promotion or ratification records. Imported ones are shown as recorded elsewhere and not verified here. With no evidence, model checks read **not run**. Evidence binds to the definition hash and the model fingerprint (`id@version` plus weights hash when given), so a new version or a different model has no checks. There is no record type for institutional approval: the form shows **none**, and a receiving institution's service would record it. The native GN registry remains authoritative for GN use; this form never writes to it.

## Named lens resolution and cache

`resolveLens(cache, store, query, {model})` in `dist/lens-cache.js` accepts `{name}`, `{id, version}` or `{id, version, sha256}`.

- A friendly name resolves through a derived index from exact names (no case folding or fuzzy matching) to full pinned keys. Zero matches return `unknown`; several matching versions or texts return `ambiguous`.
- The validated parse is cached under the pinned key, together with the exact text and a policy fingerprint (format, hard maximum, configured budget). A hit requires the same text and policy; otherwise the text is re-hashed and re-parsed.
- On **every** resolution, regardless of the cache: stored text against the pinned hash (`changed`), broader and composed contexts (`missing_broader`, `changed_broader`, `cycle`), withdrawal (`revoked`, `revoked_broader`) and byte budget (`over_budget`). For model use, current passing evidence for that model (`model_check_not_current`). Personal human use passes no model and needs no model evidence.
- A model's memory of a context name is never evidence. The model handoff sends the complete pinned definition text and states that no model check was run.

## Byte budget

An optional `definitionByteBudget` (256–65,536 UTF-8 bytes) is kept with the context library. It is a setting of this form, not a measured model limit; a native card's own budget is a local setting that this form neither reads nor implies. Over-budget definitions are never truncated. They cannot be saved, imported from a context file, or chosen for a new reading; definitions already carried in a review record are preserved and flagged. The editor shows the exact measured size before saving.

## Declarative lens operations

The only operations a definition may declare. Each is a bounded display setting that never alters source bytes. The form applies them only when the reader chooses **Apply its view settings**, and records them with the reading as `appliedOperations` with `appliedAt`. A name such as "High contrast" implies nothing.

| Operation | Range |
|---|---|
| `imageZoomPercent` | 50–300 |
| `imageBrightnessPercent` | 50–200 |
| `imageContrastPercent` | 50–250 |
| `surroundingBackgroundPercent` | 10–100 |
| `readingTextSizePx` | 12–32 |
| `readingLineSpacingPercent` | 120–240 |

## Context packages: `reckoner.context_package.v0.1`

```
{ schema, format, exportedAt, definitions: [{id, version, sha256, bytes, text}], events: [...], scope: {...},
  integrity: {algorithm: "SHA-256", canonicalization, bodySha256} }
```

`formats` lists the definition formats a package carries, read with the strict parser rather than a pattern over raw text. Packages from the previous build carried a single informational `format` field instead and still import. The body digest uses the same canonical JSON as review records. Import is atomic. A whole package is refused when it is over 2 MB, is malformed, fails integrity, holds non-canonical text, a hash or size mismatch, the same ID and version with different text, a cycle, a constant clash, an event that binds to a definition absent from the package and library, an unmet promotion or ratification prerequisite, or the configured budget. A single canonical definition text (`.cycl.txt`) can also be opened. Exporting creates a file only: it does not publish, release or submit anything.

## Device library

Stored in `localStorage` under `reckoner-context-library-v01` with schema `reckoner.context_library.v0.1`. It holds definitions (with `origin` and `addedAt`), events and policy, up to 300 definitions and 3,000 events. Starter examples, both versions, are built in and not stored. The library is written only after an explicit library action. If it cannot be read safely, its data is preserved, a recovery download is offered, and nothing overwrites it until the person chooses replacement.

## Review record extensions

The receipt schema remains `garrison.cairn.receipt.v0.1`. These optional collections appear in a receipt body only when used, so a record without contexts exports exactly as before:

- `contextDefinitions`: portable definition records carried by the record. This is the closure of every version a reading or a check made in this record relies on. At most 200; each is parsed and hash-checked on import.
- `contextEvents`: review records for those versions. Bindings and prerequisites are checked on import.
- `assertions` and `assertionReviews`: attributed relationships between source facet entries, and their reviews.

Within each reading's `context`:

- `readingContext`: `{id, version, sha256, bytes, name, appliedOperations, appliedAt}`. A reading may name a definition the record does not carry; it then stays visibly missing.
- `facets`: `{entities, dates, formats}` with stable `f:` entry IDs and `addedBy`/`addedAt` attribution.
  - Entity groups: `people_organizations`, `places_jurisdictions`, `subjects_objects`, `events`. Each entry has a basis (`stated_in_source` requires a passage location) and an optional identity key.
  - Date kinds: `source_event`, `edition`, `upload`, `observation`, `other`, each kept separately with its value as stated (`UNKNOWN` allowed explicitly) and a basis.
  - Formats: `measured_content_signature` (read from file bytes: PDF, PNG, JPEG, WebP or SVG) or `declared`. A format is never inferred from a file name.
- `iaIdentifier`: an Internet Archive item identifier, when known.

Reviews of a reading that used a context carry `context: {id, version, sha256}`, which must match the reading. Relationship assertions record the subject and object entries (or an external identity key), relation, who asserted it, the source passage, reason, uncertainty, the reading's context version, time and `status: proposed`. Their review status follows the reading rule: any dispute stays visible.

Facet filtering is exact. Readings reachable only through a `same_as` relationship are listed separately with that relationship's review status. File type and date are facets, not identity keys.

## Sidecar: `reckoner.context_sidecar.v0.1`

A derived projection for one version and its cascade. It is never a source of truth.

- Identity, cascade versions and total bytes, missing broader contexts, and measured bytes against the configured budget.
- `tokenOrWeightConstraints: "not_measured"`.
- `designedFor: ["bitnet_flags"]` and a compatibility label stating that no inference has run.
- `bitnetFlags` (schema `reckoner.bitnet_flags.v0.1`): `scoring`, `comprehension` and `verification` are `not_run`, and `suitability` is `unknown`. Only gate evidence with probe ID `bitnet.<flag>` changes a flag, to `evidence_recorded_elsewhere_not_verified_here` with references.
- A lifecycle summary.

## Readings index CSV

One row per saved reading. The context is cited as `id@version#sha256:<hex>`, with its ID, version, hash, bytes and name, and whether the record carries the definition. The definition text is never repeated. Cells are quoted per RFC 4180 with CRLF line endings. Cells that begin with `=`, `+`, `-`, `@`, tab or carriage return are prefixed with `'` so spreadsheets do not run them as formulas; the JSON record keeps the exact values. This CSV is a convenience index. It is not WAL.CSV, not a registered GN schema, and not evidence of approval.

## Native alignment and metadata projection: `reckoner.native_projection.v0.2`

`projectToNative(record, events)` in `dist/native-projection.js` produces an explicit, versioned metadata view of one public definition in the native six-section order. It works on every public format. It is derived and never a definition. **Download native metadata projection** in a context's technical details saves it.

- **No author text.** Names, meanings, provenance statements, revision reasons, facet values, concepts, rules, hints, references and the self-declared author are never copied. Each appears as its source line, UTF-8 size and SHA-256, so the mapping can be checked against the source without repeating it. The only values copied are checked values from closed vocabularies or patterns: format, ID, version, constants, pins and hashes, timestamps, release label, provenance basis, facet group, 5W1H words, and lens operation names and numbers. Each must also be a single token without spaces, quotation marks, brackets or semicolons. The one stated exception is the file_bitnet block below.
- **Source kept separately.** The output names the source ID, version, constant, format, SHA-256 and size, but not its text. The source travels as its own definition file or package. A projection never replaces, rewrites or relabels its source.
- **Every assertion mapped once.** The table below places each public predicate in a native section. Each entry carries its source line span.
- **Header metadata.** Section 1's fields come only from declared public predicates, each with its predicate, source lines and source hash.
- **Kind of mapping.** "Declared" means the native convention names that kind of content for the section. "Public extension" means a public field with no declared native counterpart, placed where it reads best.
- **Review and admission are separate.** Public review is personal and self-declared (blessings, declines, mentor checks, withdrawal). Model evidence and promotion or ratification claims are reported as recorded elsewhere and not verified. Native institutional and model admission are always `not_established`, and production status is always `not_inferred`. A release label is described for what it is: a starter example is not a production definition.
- **Nothing invented.** Items the public form cannot supply are listed with a status rather than filled. Not emitted: native header keys other than domain, and native BitNet predicates and scoring. Not established: native institutional admission, and native model admission or promotion. Not inferred: production status or authority. Not produced: other native metadata formats. Not copied: author text. Not provided: any native field or rule beyond the declared public fields.
- **Distinct native formats.** The file_bitnet comment block is one native format. Directory-level stubs, per-file contract wrappers and cascade cards are distinct formats. The projection produces none of them, and its block proves nothing about them.
- **Text rendering.** The projection text begins with a fixed mark, and the public parser refuses it as a definition, so it cannot be imported or relabelled. Every line is a comment. Apart from the file_bitnet block, each line starts with `;;;`, and the text contains no parentheses or quotation marks at all.
- **Determinism.** Output is deterministic, with no timestamps, and the JSON body carries a SHA-256 integrity digest.

| Public predicate | Native section | Kind |
|---|---|---|
| `contextFormat` | 1 Header (schema) | declared |
| `contextAuthor`, `contextCreatedAt`, `provenanceBasis`, `provenanceStatement`, `adaptedFrom`, `revisionOf`, `revisionReason` | 1 Header (provenance) | declared |
| `contextReleaseLabel` | 1 Header (filing; not an admission state) | declared |
| `contextFacet` | 1 Header (filing and discovery facet) | declared |
| `isa`, `contextId`, `contextVersion`, `contextName`, `comment` | 2 Identity | declared |
| `genlMt`, `parentPin` | 2 Inheritance | declared |
| `fiveWOneHEmphasis` | 2 (5W1H emphasis) | declared |
| `composesWith`, `compositionPin` | 2 | public extension |
| `activeConcept` | 3 Active concepts | declared |
| `contextRule` | 4 Rules | declared |
| `lensOperation` | 4 (bounded display setting, never executed) | public extension |
| `disambiguationHint` | 5 Disambiguation hints | declared |
| `contextReference` | 6 Doctrine references | declared |

### The file_bitnet header block

Section 1 of the projection text opens with the only native syntax the projection emits, when it can be written exactly:

```
;; schema: garrison/file_bitnet/v1
;; file_bitnet:
;;   domain: [public research, source comparison]
;; end_file_bitnet
```

- **Domain facets only.** Authored domain facets are mapped, in definition order, to the `domain` key. No other key is emitted or inferred. Nothing about ownership, status or authority comes from the self-declared author, the release label, a review or quoted text. There is no BitNet scoring, model admission or production authority.
- **Absent fields are omitted.** A definition without domain facets gets no block (`not_emitted`).
- **Exact or not at all.** The native list is split on commas and trimmed, with no unquoting or escapes. A value is written only if it starts with a letter or digit; holds only letters, combining marks, digits, spaces, periods and hyphens; ends with a letter, mark, digit or period; and has at most 80 characters. If any domain facet fails, no block is written (`unsupported`). The definition keeps every facet as written, and nothing is normalized, shortened or split.
- **In the JSON.** `nativeHeader` gives the status, the fields, each domain facet's source line, size, hash and whether it can be represented, the facet groups with no native key, and the block text on its own.
- **Projection only.** The block is never written into a definition, and no earlier bytes change.

### Reader boundary

A reader that matches assertions or header lines without honouring quotation marks can take quoted author text for metadata. A native reader showed this on 2026-10-15. The probe fixtures reproduce it against two models of such a reader. Reckoner does not censor or rewrite author text to avoid it, and does not change native readers. Instead:

- **Only the metadata projection is for a native reader:** its projection text, or the block in `nativeHeader.text` on its own. Neither holds author text, beyond domain facets that pass the list check.
- **Never give a quote-unaware reader** a source definition, a context package, a receipt or its exports, a context sidecar, or a projection with schema `reckoner.native_projection.v0.1`, which copied author text. Each holds author text as written.
- **Reckoner's own reader** tokenizes strings before it matches anything, accepts only its declared predicates and refuses the rest. A definition can therefore never carry a BitNet assertion outside quoted text. Package format lists are read with that parser.
- **Proposal, not adopted.** If the native side later wants to index public definitions directly, it needs a quote-aware reader. Such a reader tokenizes strings first: a string runs to the next unescaped quotation mark, and its only escapes are `\\`, `\"` and, from v0.2, `\n`. It matches predicates only as the first token after an opening parenthesis outside strings. The probe fixtures can serve as its acceptance tests. It would be a separately versioned native change; nothing here changes a native reader.

## Native compatibility checklist (owner's machine)

1. Parse each definition in `tests/fixtures/contexts` (formats v0.1, v0.2 and v0.3) with the native GN parser, and record the result for every predicate above. Parse success alone is not compatibility.
2. Confirm that v0.3's section order and titles match the native convention, including filing facets in section 1.
3. Run the native header reader on each `.native-header.txt` and `.projection.txt` fixture. Expected results:
   - The v0.3 and v0.2 probes give domain `public research`, `source comparison`.
   - Estimates version 2 gives `environmental reports`, `technical reports`.
   - Literal transcription version 1 and the v0.1 probe give nothing.
4. Run the native assertion reader on each `.projection.txt` and `.projection.json` fixture. Expected: no metadata. On the probe definitions it should reproduce the reported hazard, which is why definitions are outside the reader boundary.
5. Check whether the native tools expect `#$` constants, an `in-microtheory` header, or other forms this subset omits or refuses.
6. If a native tool rewrites a definition, confirm whether the bytes, and therefore the SHA-256, survive a round trip.
7. Decide which public fields map to native registry fields, without exporting private columns or definitions.
8. Exercise gate evidence import with a real native measurement record before any model status is shown as anything other than not run.
