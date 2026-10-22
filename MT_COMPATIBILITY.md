# Public context and mentoring compatibility contract

This is a public-interface contract, not the private GN microtheory corpus or engine. The standalone form must remain useful without an LLM. New user contexts and explicitly released starter contexts are the public boundary; existing private definitions must not be copied.

## Canonical meaning and derived views

Preserve a context's full authored meaning, source/provenance, author, version and content hash. Use a readable CycL subset as the canonical portable definition. Its six sections are identity/inheritance, header provenance, active concepts, rules, disambiguation hints and references. UI lists, facets and indexes are projections of that definition, not a second independently authored source of truth. Support importing and exporting the definition without executing code.

Section order, as reported from a read-only native review on 2026-10-15, runs: header comment (schema, provenance or filing metadata); identity and inheritance with 5W1H emphasis; active concepts; rules; disambiguation hints; doctrine references. Public format v0.2 follows that order. Format v0.1 definitions keep their original order, bytes and hashes; a later version is written in the current format and never relabels earlier bytes. A versioned projection adapter maps public fields to these sections with source references and lists what it cannot supply. It claims no native compatibility, admission or production status.

Update, 2026-10-15: public format v0.3 also places filing and discovery facets in the section 1 header, while identity, inheritance and 5W1H emphasis stay in section 2. Format v0.1 and v0.2 definitions keep their order, bytes and hashes. Each starter example keeps version 1 in format v0.1 and adds a version 2 in format v0.3 that names version 1 by hash; the narrower starter's version 2 pins version 2 of its broader starter. Projection v0.2 copies no author text. It writes authored domain facets in the reported public file_bitnet header syntax only when they can be carried exactly, and omits absent fields.

Convention and verified compatibility are different things. Following a reported native convention, such as the section order or the header syntax, is a convention. Compatibility is verified only for a specific artifact that the native side has run through its own reader, with the result recorded. A read-only native check on 2026-10-15 found that a reader that ignores quotation marks takes quoted author text for metadata. Section order and one-line strings therefore do not make a file safe for native indexing, and only the metadata projection, which holds no author text, is meant for a native reader. Nothing here claims native compatibility, admission or production status.

Record parent relationships, composition links, multi-valued facets and 5W1H emphasis. Facets belong to the definition; do not force one category or invent facts from filenames. Unknown and not checked remain explicit. Parentage must be acyclic, and missing parents must be visible rather than silently substituted. Similarity can suggest overlap; a person decides whether to combine contexts.

## Lifecycle and authority

Preserve these distinct concepts: proposed, human blessed, model gated, promoted for a particular model, and independently ratified for that model. Blessed is not promoted; a first model gate is not independent ratification. Gate evidence binds to current definition bytes and the model identity/version or weights fingerprint and probe version. Definition or model changes invalidate applicable gate evidence. A gate measures; it does not rewrite the definition.

The browser may support personal context use and self-declared human review immediately. It must not call that institutional approval or GN model promotion. Model checks remain not run until real evidence exists. A model connection is optional, and no mock response may satisfy a gate. A future trusted aggregator is a separate authority boundary. The current native GN registry and its promotion tools remain authoritative for private GN consumption; this interface never writes them directly.

Mentors record a repeatable check against an exact context version and source passage. Keep earlier definitions and reviews after edits, preserve disagreement, and show where a narrower context depends on a broader one. Any rewrite must retain before/after versions and the reason, followed by fresh review rather than inherited approval.

## Public starter contexts and user creation

Provide newly authored starter examples for literal transcription, image interpretation and accountable review. Label them as starter examples, not IA-endorsed or GN production-promoted definitions. Users can create their own, derive a narrower context, select a version, and attach it to a saved reading. Do not automatically release personal contexts. Export records must preserve the selected definition/version/hash and evidence links, without exposing private GN columns or definitions.

Public CycL exports must be tested locally against the existing GN parsing conventions before any claim of compatibility. The cloud implementation can test this contract with fixtures; actual native GN compatibility is verified separately on the owner's Mac. Do not reproduce the retired draft-folder promotion workflow as the current native process.

## IA discovery facets and relationships

Support plural people/organizations, places/jurisdictions, subjects/objects and events, plus file format and typed dates. Preserve source/event date, edition date, upload date and observation date separately. An IA item identifier, filename, source URL, passage locator and measured hash are identity/evidence keys when available; file type and date are facets, not unique identity keys. Joins require explicit keys or attributed relationship assertions. Do not automatically equate similar names or treat a subject label as a verified fact.

Capture who asserted each relationship, the source passage and reason, the context version used, uncertainty and review status. Source commentary stays distinct from original source content. A user cannot append files to someone else's IA item without permission; a separate linked contribution item is an available proposed workflow, subject to IA permissions and terms.

## Acceptance tasks

1. Create a context, choose multiple facets, preserve full meaning, export it, reopen it, and recover identical canonical definition bytes and hash.
2. Derive a narrower context and inspect its parent. Refuse cycles and expose missing parents.
3. Attach a context version to a reading; a mentor records a repeatable check. Editing the context preserves the old reading, prior context and mentor review.
4. Show proposed/personal review separately from trusted approval and model promotion. Not-run gates remain not run. Changed definition/model bytes cannot reuse old gate evidence.
5. Filter plural source facets without guessing identities, dates or jurisdictions. Show explicit relationship evidence and preserve disputes.
6. Reject malformed, oversized or conflicting context imports atomically. Render untrusted text safely. Existing receipt exports and the current 42-test suite must continue working.
7. Use the real-report walkthrough with a selected context and export/reopen its complete review package. No LLM or paid account is required.

No upload, public release, model call, GN production admission or blockchain anchoring is authorized by this contract alone.

## Named lens cache and BitNet readiness

Public sidecars may be described as designed for BitNet flags. Unperformed scoring, comprehension, suitability or verification must remain not run or unknown, never fabricated pass flags. Preserve schema/version and evidence references for any future measured result. A compatibility label is not a measured BitNet inference.

Display a definition's measured UTF-8 byte count. Honor an explicitly configured byte budget without truncating meaning or treating characters/tokens as bytes. Model-specific token or weight constraints require their own measured contract and are not inferred from a byte count.

A named lens resolves through a canonical definition ID, version and content hash. Cache a validated parsed definition under that full key. Resolve a friendly name to that key through a derived index, not an unversioned name-only lookup. Unknown names, ambiguous names, content changes, missing parents or incompatible gates require a fresh check. Cache reuse must not bypass revocation or changed policy/model evidence. A CSV reference can point to the definition without repeating all its prose, but portable export must include or locate the exact pinned definition.

The deterministic form may execute only explicitly supported declarative lens operations with known parameter bounds, and must record the applied operations/settings with the reading. Never execute arbitrary uploaded code or infer executable behavior from a profile name. Model contextual memory is not verified cache evidence; optional model use requires the applicable definition and gate evidence to be available and current.
