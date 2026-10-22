# Reckoner

Experimental Alpha for testers and contributors. Record an interpretation. Let others check it. Feedback, reproducible bug reports and contributions are welcome. Keep original source files and exported review histories independently. See [known limits](EXPERIMENTAL_PREVIEW.txt).

**[Open Reckoner — 14 live examples](https://meridian-north.github.io/reckoner/)**. A first visit opens Example 1 automatically; use **Next example** and **Previous** to browse. Returning saved work is preserved. Choose **New file** to start your own review.

Start with the [quick-start guide](USER_GUIDE.md) for a first review, file sharing, and saving your work.

A document review form developed by John Reed and Garrison Node / Meridian North. Compare a source with a reading or claim, record interpretations and decisions, and replay the saved path to resolution. The core workflow needs no LLM.

## Microtheories, reviewer recognition and Archive.org

A **microtheory** is an explicit, named and versioned context for a review: the terms, assumptions and checks that explain how a source should be read. Reckoner calls these **reading contexts**. For example, a wildlife-illustration context could distinguish the printed species name, a modern identification and the reviewer’s uncertainty. Each saved reading pins the exact context version, so another reader can understand and challenge the interpretation.

Reviewers and mentors can build **evidence of contribution** through attributed readings, reasons and subsequent checks. An optional experimental contribution log—illustratively named `somereviewer.wal.csv`—links exact JSON review artifacts in a hash chain. Keep the accompanying JSON archive and independently retained checkpoints: those let a verifier detect changes or rollback relative to the retained state. A CSV filename or a self-consistent chain alone does not authenticate a person, prove the latest version or establish correctness. The present exporter uses `private-experimental-WAL.csv`; reviewer-named files and a shared recognition programme are a proposed convention. Recognition should reflect useful, reproducible work and independent review, not raw save counts; no automated reputation score or official volunteer recognition is provided.

Together, contexts, source references and facets can help contributors organize review work around people, species, places, dates, subjects and collections. Archive.org item identifiers, exact filenames and page/passage locations connect a proposed reading to the relevant source, while acquisition gaps remain separate from interpretation problems. These portable records could help Archive.org contributors and collection stewards find, compare and evaluate proposed descriptions or corrections. **This Alpha does not change Archive.org files, metadata or collections, and has no automatic Archive.org submission or admission service.** Any adoption or integration requires agreement and review by the receiving organization. Internet Archive has not endorsed Reckoner.

## Primary review workflow

Open a local page image and matching hOCR, select a highlighted word, compare its enlarged source passage, explain your reading, add credit, save and continue. Keyboard users can move between highlights with arrow keys. Use **Save to file** in the header (or **More → Save to file** on a narrow screen) as the complete, recoverable contribution file: its existing JSON history bundle preserves exact receipt snapshots and checkpoints. **More → Export contribution receipt** is a readable view of the latest receipt. Keep original source bytes separately. Start with the [single contribution file guide and synthetic example](CONTRIBUTION_FILE.md); see [the receipt contract](CONTRIBUTION_JSON.txt) for format details and the optional experimental WAL bridge.

Compatibility evidence includes a local court-page image with Tesseract 5.5.3 hOCR: 354 words, strict XML derivative validation, source-byte preservation and save/export/reopen highlight restoration in Chromium. This does not establish compatibility with every Archive item, institutional acceptance, or completed Safari/VoiceOver and human usability acceptance.

## Working features

“Review record” is the default name for saved work. Users can choose another name in Settings. Developers may refer to the portable evidence structure as a cairn.

- Local PNG/JPEG/WebP images and PDFs (20 MiB), and literal UTF-8 TXT/HTML/XML sources (200 KB), with SHA-256 file digests. Markup is displayed rather than executed.
- Bounded data modules containing source references, task questions and supplied readings, with separate review workspaces and no automatic source-host fetch. See [practice modules](PRACTICE_DATA_MODULES.md).
- Direct document links, with a separate source-tab fallback when hosts block embedding.
- Explicit source-search query previews and user-opened links to Google, Bing, DuckDuckGo, and Internet Archive. Editing the query clears previously prepared links.
- Local Internet Archive handoff preparation: source identity, user-declared sharing basis, checklist export, and a link to the web-capture or file-upload service. Preparation does not submit, upload, or establish preservation success.
- Step-by-step replay of saved readings and reviews, with the decision state at each step.
- OCR text loading, a proposed reading, and a word-level comparison.
- Saved readings kept as separate snapshots with parent revision links.
- Attributed, revision-specific reviews, including visible disagreement.
- Mentoring reviews with preserved explanations and guidance. Mentor handles and mentoring reviews are counted separately without adding duplicate people to the overall handle count.
- 5W1H source context, source versus operational reasons, and lens/lexicon labels.
- Proposed typed connections to other cairns.
- Portable JSON receipts, SHA-256 integrity checking, import, and local draft persistence.
- Configurable display name and accent with default developer attribution.
- Text and print/PDF reports, per-cairn handle/activity counts, compact focus views, and popout workspaces.
- Optional copy/export model handoff and separately recorded model suggestions. No model is required.
- Reading contexts (also called lenses): create your own, start from newly written starter examples, derive narrower contexts, revise with earlier versions kept, and attach an exact context version to each saved reading.
- Self-declared blessings and repeatable mentor checks for an exact context version, shown separately from model checks (not run), promotion for a model, and institutional approval (none).
- Plural source facets (people and organizations, places and jurisdictions, subjects and objects, events), typed dates, measured or declared file formats, and attributed relationships that others can dispute.
- A readings index CSV that cites each reading's context by ID, version and hash.
- A local reported-problem catalogue with explicit evidence states, source/version gaps and correction-sidecar references; imported reports are not verified findings.
- Catalogue import previews, stale-tab conflict refusal, and preserved saved copies before replacement or restore. Browser-local copies are not external backups.
- Separate bounded reports for download, access, file-opening and interpretation problems, without requiring OCR text.
- An optional operator-only permitted-source cache utility: exact local copies, explicit byte budget and recorded permission assertion, outside Git. It performs no downloads or rights verification.

The notice-date example is synthetic. The separate real-report exercise links to an official EPA source; AI-written teaching examples are labeled and do not stand in for a human source check. The app reviews supplied OCR and does not run OCR recognition.

Human contributors check sources, propose readings, and explain their evidence. Reviewers can identify a review as mentoring and explain how another contributor can repeat the check. These self-declared roles preserve teaching and acknowledgment; they do not certify qualifications, guarantee correctness, or promise payment.

## Working together by exchanging files

Save a reading, export the review record, and give a copy to a collaborator. They can open that copy, continue from a saved reading, and record their own proposal or review. Exchange the exported records again and use **Merge another copy** to bring their saved entries into your workspace.

The merge requires the same record identity and a shared saved reading. Separate branches remain separate; reviews point to the exact reading reviewed. Reimporting the same entries does not add to contributor counts. If the same entry ID has different contents, the merge rejects the file without changing the local record. Independently started records cannot be combined through this operation.

Use **Document a conclusion** to record the selected reading, the evidence, and who reached that conclusion, or to leave the matter explicitly unresolved. Earlier disagreement stays visible. A conclusion records the readings and reviews considered at that time; later additions may require another review. It establishes neither institutional approval nor factual certainty.

Replay respects the dependencies between readings, reviews, and conclusions. Device timestamps can disagree, so replay order is not a guarantee of chronological order across computers. Contributor counts describe self-declared handles in the exchanged record, not verified people or all activity elsewhere.

This is file exchange, not live synchronization. Keep backups and the original source files. Inspect the exported content before sharing it, since the record includes source context, readings, contributor names, and reasons.

## Run

Serve `dist/` over localhost HTTP or HTTPS. No build step is required. For example: `python3 -m http.server 8769 --bind 127.0.0.1 --directory dist`.

Run all tests with `node --test tests/*.test.mjs`. Node 24.19.0 was exercised on macOS and XPS/Linux; other runtimes and Windows remain unqualified. The extracted download does not include an npm project manifest. The wiring tests drive the app's handlers in a simulated page; they are not a browser test.

To exercise the interface in a real browser, run `node scripts/browser-walkthrough.mjs` with Playwright and Chromium available (set `PLAYWRIGHT_MODULE` to the playwright package directory if it is not resolvable). It serves `dist/` on 127.0.0.1, uses synthetic data, and writes screenshots and `summary.json` to `.build/browser-walkthrough/`. Passing it shows the form works in that browser; it does not replace testing with people or with assistive technology. `node scripts/discovery-walkthrough.mjs` does the same for search notes and the separate reviews they open, damaged or refused storage, two tabs saving the same work, and the clipboard deadline. Each scenario runs in a new synthetic browser profile, and every request that leaves the local server is refused and listed.

To prepare a local downloadable review bundle, run `python3 scripts/package-release.py`. It writes `.build/Reckoner_Contribution_Review.zip` from an explicit file list and includes file hashes, the presentation, contribution instructions, and the usability exercise. It does not upload or publish anything. Hashes detect byte changes; they do not authenticate the developer or establish institutional approval.

The downloads page offers a copy of that bundle from `dist/resources/`, listed with its hashes in `dist/resources/ASSET_MANIFEST.json`. After changing any bundled file, run `python3 scripts/refresh-downloads.py` to rebuild the copy and its manifest entry, then `node scripts/sync-docs.mjs`. `python3 scripts/refresh-downloads.py --check` changes nothing and reports whether the copy and the manifest match a fresh build. The bundle itself never contains this copy or its manifest.

## Choosing a save location

Use **Save as…** to select JSON, readable text, or PDF. Browsers with a file-location chooser let you select the destination for JSON and text. Other browsers use their download settings: enable asking where each download should go, or move the downloaded file to your chosen folder. PDF uses the browser's print/save dialog. Cancelling a chooser leaves the workspace unchanged; a failed write is reported rather than silently falling back to another location.

The form cannot silently select a drive or directory. Keep original source files separately alongside the exported review records, and reopen them when resuming comparison.

## Integration boundary

This standalone public interface contains none of the private Reckoner implementation or registered production WAL writers. Reading contexts follow the public contract in [MT_COMPATIBILITY.md](MT_COMPATIBILITY.md); this interface never writes to the native Garrison Node registry. Its receipt schema is `garrison.cairn.receipt.v0.1`, a proposed public exchange format. It is not WAL.CSV and does not establish feedstock compatibility or admission. A separately validated adapter must map to a specific registered schema.

## Current limits

Records stay in browser local storage until exported. Images are not embedded or persisted, and reopening the page requires reopening the image. Clearing site data removes the local draft. Export and retain both receipt and source image for backup.

If a saved draft cannot be opened safely, the app preserves its original stored data and offers a recovery download. New work will not overwrite that stored draft until you explicitly choose replacement. Recovery preserves the data for inspection; it does not guarantee that a damaged record can be repaired.

The exchange limit is 2 MB per JSON record, with limits of 500 readings, 2,000 reviews, 2,000 connections, 200 model suggestions, 500 conclusions, 200 carried context definitions, 2,000 context review records, 2,000 relationships, and 2,000 relationship reviews. A context definition is at most 65,536 UTF-8 bytes. The device context library holds up to 300 definitions and 3,000 context review records, and context files must be under 2 MB. Contexts stay in browser local storage until exported. Saving or merging past those limits is rejected before the saved history changes. Export before reaching the limit, then start a separate record and link it to the earlier one. Source files remain separate from the JSON.

Names and reviewer roles are self-declared. Digests can detect changes to a receipt body but do not authenticate its creator or prove source accuracy. This version has no central submission queue, trusted reviewer identities, server synchronization, conflict-resolution authority, signatures, blockchain anchoring, or oracle endpoint.

The receipt preserves review disagreement. It does not treat a majority, an accepted local review, or a contributor name as production authorization.

## Institutional branding and adoption

An institution can adapt and host this interface under the included MIT license, preserving its license notice. The current default footer credits John Reed and Garrison Node. Display name and colors can change without exposing the private engine. The branding dialog is a device-local preview; a deployed edition should configure institutional branding in its source.

For a deployed edition, edit `dist/branding.js`: `name`, `recordLabel`, and the six-digit hex `accent`. New workspaces use those defaults; existing device-local workspace settings remain in place. Host the complete `dist/` directory over HTTPS. The developer credit remains in the interface and the MIT notice must accompany distributions. This display configuration does not establish institutional authorization or endorsement.

This Alpha configuration exposes its repository and feedback links. This display setting does not itself publish a repository, submit a review or change access permissions.

Internet Archive has not endorsed or adopted this prototype. Use its name or logo as operator branding only with authorization. We invite feedback, improvements, and discussion of a shared contribution workflow. See [the adoption proposal](ADOPTION_PROPOSAL.md) for a reader-and-mentor pilot, the requested developer credit, and optional support discussions.

For feedback, institutional adoption, paid hosting or integration inquiries, contact John Reed at meridian.north@pm.me.

The interface uses local system fonts. Source image and OCR data do not upload to a service through this app.

## Guided review and viewing lenses

“Walk through your first review” explains comparison, reasoning, mentoring, and export. “Work through a real report” opens the official EPA-hosted Anniston expert report and provides a short passage and checks for pages 61 and 51. Users must inspect the source and supply their own reason before saving. It is a teaching reconstruction, not a claim that Reckoner discovered historical evidence or establishes admissibility. The external PDF preview depends on the host and browser; the source link remains available.

Image controls provide zoom, brightness, contrast, and surrounding background. OCR controls adjust text size and line spacing. They do not modify source bytes. When a reading is saved, `context.imageView` preserves the viewing lens with its source reference, ordered CSS filters, tool/version, and settings; the revision supplies the contributor and timestamp. Earlier revisions retain their lens. Reopening a receipt without its image preserves that saved lens for export.

External enhancement notes belong in `context.imageEnhancement`: identify sharpening, deblurring, deskewing or other operations, tool/version, exact ordered settings, original and derivative hashes, and checks against the original. These notes are self-declared. The comparison panel can open an enhanced PNG/JPEG/WebP, measure its hash, and attach structured method details to the draft without replacing the original. Saving preserves the attachment in the revision. A reveal slider compares copies with matching pixel dimensions; dimensions alone do not establish alignment. The saved viewing lens records the derivative hash and reveal percentage, which restore when matching files are reopened. Changing the original requires detaching incompatible enhanced copies from the draft; earlier saved readings retain their evidence. Imports reject malformed attachment records and original-hash mismatches, even when the receipt digest has been recomputed. Reopening the enhanced copy lets users compare its bytes with a recorded derivative hash. This version does not perform sharpening/deblurring or independently verify a declared processing method. Keep both source and derivative files separately.

## Reading contexts

A reading context, which some people call a lens, is a named and versioned statement of how a passage should be read: what its terms mean, the rules it applies, and what a reader should check. Contexts are optional, and personal use needs no model or account.

- **Start.** Under 4. Contexts, open a starter example or create your own. The starters are literal transcription, image interpretation, accountable review, and the narrower "estimates and their assumptions". They are newly written for this form, are not endorsed by Internet Archive, and are not promoted for Garrison Node production use.
- **Write the full meaning.** A context records its meaning, author, where it comes from, plural facets, 5W1H emphasis, concepts, rules, disambiguation hints and references. The editor shows its measured size in UTF-8 bytes. An optional byte budget refuses oversized definitions, and nothing is shortened automatically.
- **Narrow or revise.** Derive a narrower context to read within a broader one, pinned to that version and hash. Revising creates a new version with a stated reason. Earlier versions and their reviews stay unchanged, and a new version starts with no reviews. Cycles are refused, and missing broader contexts are shown rather than substituted.
- **Use one for a reading.** Under Reading context in Compare & read, choose an exact version. Saving records its ID, version and hash with the reading, and reviews of that reading record the same version. A context can declare a few bounded view settings, such as text size or contrast. They apply only when you choose Apply its view settings, are recorded with the reading, and never change source bytes. Typing a context's exact name as the analytical lens offers that exact version; ambiguous or unknown names are not guessed.
- **Review a context.** Record a self-declared blessing for your own use, or a mentor check: a repeatable check against an exact version and a source passage. These appear separately from model checks, which this form never runs and which read not run. They also appear separately from promotion for a model and from institutional approval, which is none.
- **Exchange.** Export contexts as a package file and open it on another device; definitions reopen with identical bytes and hashes. Review records carry the definitions their readings use. Exporting creates a file; it does not publish or release anything.

New definitions are written in format v0.3, which follows the native six-section order and keeps filing and discovery facets in the header. Earlier v0.1 and v0.2 definitions keep their exact bytes and hashes. Each starter example has a version 1 in format v0.1, with its published hash unchanged, and a version 2 that says the same things in format v0.3. New readings default to version 2; readings that pinned version 1 keep it.

A context's technical details can save a native metadata projection. It maps the public fields to the native sections by source line and copies no author text. Authored domain facets appear in a file_bitnet header block only when the native list syntax can carry them exactly. Source definitions, context packages and review records hold author text as written, so they are not for native readers that ignore quotation marks. The projection claims no native compatibility, admission or production status.

The canonical definition format, lifecycle rules, named-lens cache, sidecars designed for BitNet flags, projection adapter, and package schema are documented in [CONTEXT_FORMAT.md](CONTEXT_FORMAT.md). Compatibility with the native Garrison Node parser has not been verified; it is tested separately.

## Source facets and relationships

Under Source & context, record people and organizations, places and jurisdictions, subjects and objects, and events as the source states them. Give each a basis, a passage location, and optionally an identity key you checked. Typed dates keep source or event date, edition date, upload date and observation date separate; record UNKNOWN explicitly. A file format is measured from the opened file's bytes or declared, and is never inferred from a file name. Entries are saved with the next reading and attributed to the contributor.

Similar names are never merged, and a file type or date never identifies a source. To link entries, record a relationship under Decisions & history: who asserted it, the supporting passage, the reason, uncertainty, and the context version used. Others can accept or dispute it, and disagreement stays visible. Filtering saved readings by facet lists exact matches first; readings linked only through a relationship are listed separately with its review status.

**Save as… → Readings index (CSV)** lists each saved reading with its context's ID, version and hash, without repeating the definition. It is a convenience index for spreadsheets. It is not WAL.CSV, not a registered Garrison Node schema, and not evidence of approval. Keep the JSON review record for the definitions and the integrity check.

## Receiving institution review

An institution may add a submission and approval service. The receiving service must validate the exact submission and record an authorized decision before accepting a change. A CSV file cannot enforce approval itself. The current browser reviews are self-declared, not authenticated institutional admission. No Garrison WAL consumer or production WAL exporter is included in this standalone interface; that integration remains private development work. Users need only see “Submitted for review”, “Approved”, or “Needs another check” when such a service is implemented.

## Appearance and library search

Settings offers the original workspace, an independent archive companion, and a user-supplied skin. Browse or contribute a skin opens the local gallery. Skins are bounded declarative JSON with creator/version/license, color tokens, built-in fonts, spacing and preferred approved repositories. They contain no scripts, external assets or permission changes. Preferences are stored separately from review records; self-declared creator/license information is not authenticated. Public contribution links remain held until release.

Search libraries opens a separate local panel (or a fallback tab). It previews three destination URLs and opens only the library the user chooses. A skin's repository list orders those destinations; it neither hides alternatives nor changes search coverage. The panel exports up to300 manually requested link openings, not verified results. These are not merged search results or proof of an item's absence. The separate **Where do I begin?** page records clues, search attempts, candidate sources, and mentor comments. Export its search notes file for a durable copy. Selecting a candidate can open a separate document review with the exact search notes attached; it does not import OCR, verify the source, or approve a reading. Session storage and retained browser drafts are conveniences, not backups. Internet Archive upload-result verification remains future work.

## Archive activity notes

The local checklist now records a bounded preparation snapshot in the optional review context field `archiveActivity`. Users can append self-declared submission attempts, errors, receipt links, existing-item checks and retry plans. Attempts and retries refer to an earlier preparation. Nothing automatically uploads, retries, calls an Archive API, verifies a service response or determines permission.

Metadata-error entries preserve expected/actual behavior, reproduction, intended changed fields, the observed before value and intended after value. Readable text export and the review-record JSON preserve these notes. The history is append-only through the form; imports validate its declared schema, preparation references, safe Archive URLs, maximum 200 events and 256 KiB UTF-8 history budget, in addition to the receipt's overall limit. No authenticated identity or institutional approval follows from these entries. Older receipts without the optional field retain their earlier exchange shape.

The notes belong to the review record, not to one reading. Recording a note does not require saving a new reading before **Save review record**, and continuing from an earlier saved reading keeps every note. Merging another copy of the same record keeps both copies' notes: a note already present is not repeated, a note ID with different contents refuses the whole merge, each note follows the preparation it names and otherwise notes run by time, so both merge directions give one order. The combined notes must stay within 200 notes and 256 KiB, or nothing is merged. Each saved reading keeps the exact context it was saved with, including any notes captured at that time.

## Additional browser handoff checks

Run `node scripts/handoff-walkthrough.mjs` with Playwright and Chromium available to check delayed preparation, keyboard access, immutable links, save conflicts, and model-response ownership. The script first measures whether its popup blocker is active; dependent checks are reported as skipped if that control fails. Review skipped checks and console output separately from passing checks.

### Creator-owned history (experimental integration)

Deliberate proposal, review and conclusion saves retain exact receipt snapshots in a hash-linked creator history. JSON exports now carry the complete history companion and the current readings-index CSV snapshot; source image/PDF bytes remain separate. Reopen checks retained genesis/tip references, and an explicit recovery button restores the last locally committed creator save. Legacy standalone receipts can still be opened when they do not bypass existing retained history for that record.

History commits require same-origin Web Locks, available in current supported browsers on HTTPS or localhost. Unsupported environments fail closed with the draft preserved; no optimistic-only commit fallback is used. Retained browser checkpoints are independent of the imported file, but not tamper-proof against a malicious writer or erased browser storage. First-time imports establish only a first observed reference, not identity, latest external version, truth, signatures or blockchain anchoring. Text/PDF and standalone CSV are report views, not complete history backups. See USER_GUIDE.md for limits, cancellation, recovery and merge-evidence scope.

Storage failure recovery: Download draft recovery exports current unsaved work independently of creator checkpoints and can be reopened with strict draft validation. Recognized local storage-write failure may permit an already validated portable history download with an explicit UNCONFIRMED-checkpoint warning; trust conflicts and verification failures never downgrade to that fallback. Neither recovery files nor browser download requests claim authenticated history or delivery to disk.

Multi-tab protection binds each draft to its persisted creator base rather than silently refreshing it from global storage. Stale tabs/reloads refuse before creator commit; saved-entry retention is checked independently. Explicit recovery/import/latest-bundle merge adopts under a record lock only after preserving displaced draft bytes. Browser quota may be reached well before 100 entries because versions currently retain full immutable bundles; portable backups and draft recovery remain essential. Content-addressed storage optimization is deferred.

For clone validation commands, tested platforms and explicit limits, see [CLONING_AND_LIMITS.txt](CLONING_AND_LIMITS.txt).


## Open-source tool and optional managed services

Reckoner is the standalone open-source tool, distributed under LICENSE. It remains usable without purchasing a managed service. A separate paid service may use Reckoner as a component and offer hosting, coordination, integration, training or support. Those services do not imply that Reckoner itself is proprietary or requires a subscription. Preserve applicable license notices and attribution when redistributing it. Shared probe claims, publisher-wide rate limits and coordinated retries are not implemented in this standalone browser-local edition.

For a read-only receipt check without opening the webform, run `node scripts/verify-contribution.mjs contribution.json`. See CONTRIBUTION_JSON.txt for optional external file-hash comparison and the checks this does not perform.
