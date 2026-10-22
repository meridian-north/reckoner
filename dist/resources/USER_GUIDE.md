# Reckoner: record an interpretation, let others check it

The browser demo opens the first of 14 synthetic examples automatically on a first visit. Use Next example and Previous to browse, or New file for your own source. Existing saved work is preserved.

## Current private workspace

The header offers **New file**, **Open saved review**, **Examples**, **Save to file** and one **More** menu. On narrow screens, New file and Open saved review move into More; on the narrowest screens Save to file moves there too. New file creates a separate browser workspace; it does not delete the previous one. Browser Back can return to that workspace. Exported backups remain the durable recovery copy.

Use **Choose source file** in the source area, or drop one supported file there. JPEG, PNG, WebP and PDF are limited to 20 MB. UTF-8 TXT, HTML, HTM and XML are limited to 200 KB. Text is displayed literally: HTML scripts, images, links and XML entity references do not execute or fetch. HTML/XML are not rendered as live webpages. Unsupported, binary or invalid UTF-8 inputs are refused. Original source bytes remain separate from the review bundle.

The source is your reference. The right-hand baseline is **Machine says** for a synthetic OCR exercise or adopted hOCR word, **Source passage to check** for a text source, or **Reading or claim to check** for other local evidence. Enter the exact passage or claim being checked, then your interpretation, reason and name. Give a page, region or line location under **Source & context** if the task has not supplied one. Choose **Save reading**; a second person can review that saved proposal under **Decisions & history**. An unchanged reading can be a valid outcome. Reckoner does not perform OCR recognition, decide truth or confer court acceptance.

Saved baseline text is read-only when it belongs to a saved reading of the current source/location. Opening a different source retains prior revisions and preserves the earlier draft for recovery, but starts blank document details and reading. Earlier history must not lock the new source’s empty field.

**Examples** opens a separate practice tab. Fourteen synthetic exercises cover OCR confusions, joins, layout, attribution and refusal cases. Previous/Next browses them without replacing the real-work tab. Find an optional **Example explanation · AI-written** under More → Tools & guidance; it is a suggested reading, not a human ruling. More → **Open a review pack** opens prepared batches with their own source files and questions. Choose its contents list (MODULE.json), then the extracted source folder or a matching file. The review-pack page also links directly to the fourteen bundled synthetic examples without a download or picker. Each pack task opens a separate workspace. See PRACTICE_DATA_MODULES.md for bounds, external source lists and the older installed-example format.

**More** is a compact list of occasional actions. Full guidance and recovery controls are in **More → Tools & guidance**, a dialog that closes with Escape or Close. A successful backup import closes the dialog and focuses the restored reading; cancellation or refusal leaves it open. Escape or clicking outside closes it. Use **Decisions & history** for review. Readings, contributor credit, declared AI assistance and reviewer decisions are separate records; names are self-declared.

A module may label its baseline **Supplied machine reading (unverified)**. This describes the module author’s claim; Reckoner has not run recognition or verified that claim. A saved entry credits the proposed interpretation. A separate review records a decision about that particular saved reading.

## Save and find your backup

**Your files · save & reopen** is under **More → Tools & guidance**. Choose **Download complete backup** for the single JSON file that preserves saved readings, credit, reviews and creator history. Its filename includes the document title, local export timestamp, reading/review counts and a short record ID. Names and counts in filenames are convenience labels; the imported contents are checked separately.

After export, the panel shows the exact requested filename. Finish any browser Save dialog. Check the browser Downloads list; use Show in Finder / Show in folder if offered. The page cannot confirm a normal browser download reached disk or search your folders. Browser-saved work is not a disk backup.

Choose **Open backup in new workspace** to open a separate tab without replacing the current draft. In that tab, choose **Choose backup file in this workspace**, find your downloaded JSON, and inspect the title, contributor labels and saved reading/review counts in the import confirmation. You may see two confirmations: first check the backup title and counts; if this browser has no retained checkpoint for the record, a second message asks whether to remember its first-observed starting fingerprint. Neither approves the reading or authenticates its contributor. Cancel leaves the current workspace unchanged. Keep previous backups. Open JSON through this webform; double-clicking the downloaded file may instead open your computer’s text editor. A new workspace isolates the browser draft, but creator-history checkpoints for the same record remain shared on the same browser origin; this is not a way to bypass stale-history checks.

Source image and hOCR bytes remain separate. The bundled synthetic practice image is restored automatically only when its exact saved fingerprint and size match; no source-host URL is contacted. Other sources still require reopening their original files. After importing, open Decisions & history and replay the saved steps. Reopen the exact source files for matching highlights. This file-navigation change does not establish identity, factual correctness, mentor independence or host acceptance.

If the selected backup is an older valid copy and this browser retains newer history, an extra prompt offers to open that verified latest local history. The selected download and earlier revisions remain unchanged. The preview identifies the latest retained copy. Decline leaves the draft unchanged; a divergent branch is still refused.

## First review, step by step

1. Choose **Examples** in the header (also available on narrow screens), then compare the highlighted notice date with its supplied machine reading. This exercise is synthetic.
2. In **What do you read?**, change only the meeting date from **14 June 1912** to **17 June 1912** if that is your reading; keep the surrounding text. Clicking the source highlight selects the disputed digits. The original baseline remains available for comparison.
3. Add **Why?** and **Your name**. Declare AI assistance, no assistance, or unknown before saving a new reading. Optional contribution details hold uncertainty. Earlier undeclared readings remain unchanged. Explain what someone else should check; names are self-declared.
4. Choose **Save reading**. On wider screens Save has its own row below the scrolling fields. It cannot cover an input. After a successful save, the panel returns to the two readings. On narrow screens the form flows down the page.
5. Choose **Save to file**, finish any browser dialog and check the downloaded file. Open that backup in a fresh workspace and inspect **Decisions & history** to replay it. Matching bundled practice sources restore locally; other sources must be reselected from your files.

**One file to keep and exchange:** use **Save to file** for the complete contribution history. Its JSON bundle contains the latest receipt and exact earlier snapshots, so the same file supports review and recovery. **Export contribution receipt** exports only the latest readable receipt; it is optional, not another file you must maintain. Original image and hOCR files remain separate. Developers and maintainers can follow the [five-minute contribution-file check](CONTRIBUTION_FILE.md) without opening the webform.

Names, roles and contribution counts are self-declared. They do not verify identity, expertise or the accuracy of a decision.

## Review a highlighted hOCR word

Open your local page image with **Open file**, then choose its matching **Open hOCR** file. Reckoner does not fetch the image named inside hOCR. The exact image hash and original pixel dimensions must match before highlights are used. Page and word identifiers must be unambiguous; duplicate page IDs, page/word ID collisions and oversized identities are refused. Keep any repaired hOCR as a separate derivative. Current limits are 2 MiB of hOCR, 100 pages and 20,000 words; the first 2,000 words per page have image buttons and all words remain available in the selector.

Click a highlight, or Tab to the highlight group and use arrow keys, Home or End to move focus. Enter or Space opens that word. Inspect the enlarged source passage, enter your proposed reading, reason, uncertainty and contributor name, then choose **Save reading**. **Next / skip word** leaves an untouched word without creating a revision or review. Once you change the reading, reason, uncertainty, AI assistance, method or locator, navigation refuses to overwrite that unfinished work.

**Export contribution receipt** produces readable saved revisions, source/hOCR pins, reasons, contributor credit, separately recorded model runs, mentor reviews and disputes. **Save to file** retains the fuller creator-history transport and checkpoints. Keep both source files separately. On a fresh workspace, open the contribution JSON through header **Open saved review**, then reopen the exact image and hOCR to restore its highlight. A device already retaining creator history for that record requires its history backup instead of a standalone receipt.

Under **Source matching and limits**, **Export saved proposal as hOCR** creates a separate word-level derivative. It preserves word boxes and original engine confidence, but removes inline character geometry and formatting. It is a proposal; it does not update the source host. This is currently a single-word workflow, not split/merge or deletion editing.

Opening a different source preserves the prior draft locally before clearing current document details and reading text. Saved revisions remain unchanged. If preservation fails, the source change is refused. Export independent backups before clearing browser data.

Practice begins with the machine reading and no pre-filled reason or confidence judgment. Its optional explanation is labeled AI-written. Practice uses bundled synthetic material; it does not contact source hosts.

## More than one passage on a page

The hOCR passage list pairs words with saved proposals. Amber means not worked; green means a proposal was saved, not that the host approved it. Each saved card says unreviewed or local review accepted; local acceptance still does not establish institutional authority. A disputed or needs-review decision keeps the passage unresolved. Saved cards collapse; disputed and needs-review cards open. Ordinary uninspected OCR candidates are neutral and collapsed, rather than presented as confirmed problems. Use Expand all, Collapse saved, or Next unresolved. Selecting a saved word restores its proposal and reason; unfinished edits must be saved before changing words.

For large pages, the card list shows the first 50 words plus saved passages. The selector and navigation still reach all parsed words. Ordinary OCR words are candidates for inspection, not automatically reported errors. This list is separate from the catalogue of reported source problems.

Whole-page view follows the loaded image’s aspect ratio on desktop. Read highlighted passage switches back to the enlarged region with the page overview beside it. Drag the divider between the page overview and enlarged passage to give either more room. Keyboard users can Tab to the divider and use Left/Right arrows (Shift for larger changes); Home or a double-click resets the split, and End expands the overview. Viewing changes do not alter original bytes.

## Ask someone to check your work

1. Give a collaborator your exported JSON and the same source file, where sharing is permitted.
2. If necessary, choose **More → Tools & guidance → More tools / full form**. Under **Open / more actions**, they choose **Open saved work**, select the exact saved reading under **3. Decisions & history**, and enter their reviewer name and evidence checked.
After a successful reading save, the review selector follows that saved revision when the review-reason field is empty. If a review reason is already being drafted, its selected target is retained. Always check the selected reading before recording a decision.

3. They may choose **Mentor · explain and guide** to teach a repeatable check. They select a review decision, including disagreement where appropriate, and choose **Record review**.
4. They export their copy. In your original workspace, open **More → Tools & guidance**, expand **Open / more actions**, choose **Merge another copy** and open that file.
5. Read the guidance and disagreement. Use the history controls to inspect saved steps. A recorded conclusion can select a reading or leave the matter unresolved; it does not erase earlier disagreement.

Merge works for copies of the same record with a shared saved reading. It does not combine unrelated records. Exchanging files is not live synchronization.

## Work through the small court demo

When the separately supplied court demo ZIP is available, unzip it locally and read its README. It contains two page images and their preserved machine extractions from *United States v. Spearin*, 248 U.S. 132 (1918), a construction-contract case. The ZIP is separate from the application; no full private workload inventory is included.

1. Choose **Check a file or reading**, then **Open file** to select `pages/demo-001.png` (printed page 134) or `demo-002.png` (printed page 136).
2. Use **Load text** to select the matching file in `machine-text`. Keep that original extraction unchanged.
3. In **2. Source & context**, enter the case title including **Spearin**, the GovInfo source URL from the task notes and the printed page. Return to **1. Compare & read**. Starting **Start step-by-step review guide** now selects the court-specific guide.
4. Inspect the indicated fraction or citation. Record only a change you can support, with a reason and uncertainty. The AI-selected task is a lead, not a completed human correction.
5. Choose **Save reading** in the sidebar, then **More → Save to file**, and **Decisions & history** when ready for a second check. Export again after recording a review.
6. Under **More → Tools & guidance → Open / more actions**, choose **Open saved work** and reopen the downloaded JSON. In **Decisions & history**, expand **Read full reason** and **Read full mentor guidance**. Step through the saved history. Reopen the local page image when you want to compare visually; it is not embedded in the JSON.

All practice materials can be read locally after download. No source-host download is needed to repeat the exercise. Label AI-written reasons or mentor examples as AI assistance; do not credit an independent human check that has not happened.

## Work through a real report

Open **Introduction & examples**, then choose **Work through a real report**. Open the linked official EPA-hosted Anniston expert report if the preview is unavailable, and inspect pages 61 and 51.

The exercise compares calculations using different annual production assumptions: 53 million versus 4 million pounds. The figures of 12.76 and about 0.93 pounds per day are theoretical loss estimates under those assumptions, **not measured emissions**. Explain the difference and its limits in your own words before saving. Do not invent an OCR error or claim that Reckoner discovered the historical evidence. This exercise does not establish expert qualifications or legal admissibility.

## Keep the source and the viewing lens

Choose **Reading & image tools** to open the tools drawer. Use image zoom, brightness, contrast and surrounding background to inspect the source. Saving a reading records these image-view settings and its source reference. OCR text size and line spacing are comfort controls for the current view; those adjustments are not saved in the image-view record. Neither kind of adjustment changes source bytes or establishes new facts.

Choose **Close tools ◂** or the tools opener to close the drawer. Escape closes the tools first; another Escape can close the introduction. Open dialogs and text editing outside those panels retain their own Escape handling. The introduction starts collapsed to leave room for comparison. On narrow screens the controls flow to fit the available width.

For an externally enhanced image, retain the original and processed copy. Record the tool/version, operations in order, settings, purpose and checks against the original. The comparison controls can attach the processed copy and measure its hash. Matching dimensions do not establish alignment, and sharpening or deblurring may introduce misleading detail. Reckoner does not perform those enhancements itself.

**Keep source files separately.** Images and PDFs are not embedded in the exported review record. Retain any enhanced copies too. Reopen the matching files when resuming visual comparison.

## Use a reading context

Under **4. Contexts**, start with an example or choose **Create a context**. Write the meaning, terms and checks you want a reader to use. Save a version, then select that exact version for a reading. If it declares viewing settings, choose **Apply its view settings** only when you want them applied.

A context is identified by its name, version and hash; the full definition matters. Earlier versions remain separate. A name alone does not guarantee that a person or model remembers the intended meaning. Export your contexts and keep the definitions carried by your review record. Mentor checks and personal blessings are separate from institutional approval. The form does not run model checks.

## Begin with a search

Choose **Where do I begin? Keep search notes** when you need help finding a source. Choose what you want to find, name your search, enter your name or handle, and choose **Start search notes**. Under **Add a note**, choose **What are you adding?**, fill in the details, and choose **Save this note**. Record clues, attempted searches and what you observed. Planned searches, requested link openings and observed results are different states. A service error is not evidence that no item exists.

Record a possible candidate and choose **Prepare a separate document review** beside its address. Preparation creates a link; it does not open a window. Then click **Open your separate review workspace** to open the new review. If your browser blocks the new tab, copy that link and open it manually.

The prepared link represents the saved snapshot of your search notes from preparation time. Later changes to the search notes do not update that link; prepare another review when you want those changes included. The review carries that trail and selected source address; it starts without verified source bytes, OCR or review decisions. Open and inspect the source yourself. Context selection is separate.

The summary counts recorded entries and distinct self-declared handle labels from the creator and note authors. Counting trims surrounding spaces and ignores letter case, so “Reader” and “ reader ” share one label. Unknown or unnamed author markers are reported separately, not counted as named people. These counts cover this saved set of search notes only and do not verify identities.

Choose **Save readable search notes** for a text report with the summary and recorded details. Keep the JSON from **Save search notes** to reopen your work and check its digest; the text report is for reading, not reopening.

Export the search notes before closing its tab: its draft is kept in that tab. Export the review separately. Search links open destinations you choose; this is not a merged search engine or proof of an item's absence. If a popout is blocked, use an explicit fallback link where shown or open the destination separately. Browser settings and host embedding restrictions can affect previews and popouts.

## Save, reopen and recover

Use **Save as…** for JSON, text, CSV index or PDF. A supported browser lets you choose a destination for JSON and text; otherwise use its download settings or move the downloaded file. PDF uses the browser's print dialog. The CSV is an index, not a replacement for the JSON record and source files.

Browser drafts are convenient, not a backup. Clearing site data can remove them. If the review form reports another tab changed stored work, use Download draft recovery to keep your current unsaved review and pending text before closing or reloading; ordinary creator export can refuse during a conflict. Context-library export is separate: use its own export controls where available and inspect the other saved copy separately. Ordinary draft and context-library writes use optimistic change detection, so use one editing tab per shared workspace or context library. Creator-history commits separately use Web Locks and an IndexedDB transaction; that does not make history and the ordinary draft one atomic commit. No conflict is merged automatically.

If recovery is offered, download the preserved bytes before choosing replacement. Separate review openings retain earlier draft snapshots, which can grow device storage. There is no automatic cleanup or complete workspace archive browser. Download preserved draft recovery offers a bounded catalog of separately preserved displaced-draft copies; it does not list every workspace or all earlier browser-storage copies. Export regularly. Records have size and entry limits: if you reach one, retain your export and begin a separate linked record instead of discarding history.

## Optional model help and archive handoff

Under **Advanced tools · optional model handoff**, prepare and inspect the exact text before copying or exporting it to your chosen local or cloud model. The form makes no model API request. An image is not included. Model output remains a suggestion until you explicitly use and review it. Preserved decisions can be inspected without a model; a fresh model call may differ.

Internet Archive handoff preparation gives you a checklist and service links. It does not automatically upload, establish permission or confirm preservation. Use the service only where you have the necessary permission, then check its actual result.

A record's hash helps detect changed bytes. It does not prove truth, identity, lawful permission or a trusted timestamp. Reckoner is developed by John Reed and Garrison Node as an independent contribution. Internet Archive has not endorsed or adopted it.

## Record an Archive attempt or metadata error

Preparing an Archive checklist adds a local preparation note. Under **Archive activity and error notes**, select the earlier preparation and record what you did or saw: an attempted submission, an error, an item link, an existing-item check, or a reason to retry. Before retrying after an error, inspect the service for an existing item yourself. The form does not perform that check or verify the result for you.

For a metadata problem, choose **A metadata change did not work as expected**. Record what you expected, what happened, steps to repeat it, the intended fields, what you saw before, and what you intended afterward. These are your observations, not an Archive API log. Choose **Record activity note**; earlier entries stay intact. **Save readable activity notes** exports a text report. Export the JSON review record too, and keep the handoff checklist and permitted source files separately. Receipt links, names and outcomes remain self-declared.

## Help and downloaded copies

Choose **Help / downloads** for the public guide, FAQ, presentation and source bundle. The source bundle includes an offline downloads page with local guide, FAQ and presentation files. That page intentionally omits another copy of the ZIP and its website download-hash list, so the bundle does not contain itself. These are public contribution materials, not your personal saved review or a private engine. Export your own JSON record separately and retain source files beside it.

Earlier JSON review records remain readable; Archive activity is optional. A receipt without activity notes does not gain invented service events when reopened.

## Creator history and recovery (private candidate, October 16)

On current browsers providing Web Locks over HTTPS or localhost, saving a proposed reading, review or conclusion retains a creator-history snapshot on this browser. It does not require an institution’s approval. The creator label is self-declared; people receiving your work decide independently whether to use it.

Save review record, and JSON in Choose location and save, export a history bundle containing exact receipt snapshots, their hash links and the exported readings-index CSV bytes. The index is not a native WAL.CSV. Source image/PDF bytes remain separate: keep them alongside the bundle. Text/PDF reports and standalone CSV downloads are views, not complete history backups.

Open saved work accepts these bundles and earlier standalone receipts. A device with a retained checkpoint checks the original genesis and requires that its known tip remain in an incoming descendant. Older copies, replacement genesis and other branches cannot replace that checkpoint. To combine collaborators’ different readings, use Merge; its incoming history evidence is retained separately on this browser. Export the resulting review to checkpoint the merged state.

On a new device, an internally consistent bundle cannot establish authenticated identity or whether a newer version exists. The first-open confirmation asks whether to retain that first observed genesis and tip. Keep a separately retained trusted copy/checkpoint if those comparisons matter. The local checkpoint is separate from the imported file but is not tamper-proof: clearing or maliciously changing all browser storage defeats that local reference. Hashes are not signatures, blockchain anchors, proof of truth or proof of absence of a later state.

If a browser draft is missing or older after interruption, Recover saved creator history restores the latest locally committed creator save for the current record, after confirmation. Ordinary unsaved draft changes remain separate. Export unsaved work before replacing it. Immutable prior versions are retained; there is no automatic pruning. Storage quota failure leaves the previous committed checkpoint intact and reports the problem rather than claiming a new save. At 100 history entries or other size limits, keep existing exports and seek a reviewed continuation; no silent reset is performed.

Cancelling a location chooser or a failed file close does not advance the checkpoint. If the file was saved but local checkpoint confirmation fails, keep that file and reopen it to recover. Browser download fallback can confirm only that a download was requested, not that a file reached disk.

Creator-history commits use an exclusive same-origin Web Lock shared by cooperating tabs, including the final checkpoint check and writes. Without Web Locks, saves fail closed with the draft preserved; there is no optimistic-only commit fallback. This coordinates this tool’s tabs, not arbitrary scripts or malicious storage writers. Incoming merge histories are retained as separate local evidence; they are not carried as additional creator chains in the resulting exported bundle. Preserve each collaborator’s original bundle as well as the merged export.

### Recover unsaved work when device storage is full

Download draft recovery captures the current draft and pending text controls without requiring a saved revision, a creator checkpoint or available browser storage. It does not alter retained history. The file is explicitly unsealed unsaved work, not a verified receipt, signature or creator-history backup. It can contain private text: keep it private. Original source bytes and file-input selections are excluded.

Use Open saved work to reopen it. The tool checks the recovery shape, an 8 MB import limit and the ordinary saved-draft validation, then asks explicitly before restoring an UNSAVED draft. Retained creator checkpoints are unchanged. Review pending fields and save a new revision when ready. Recovery does not make an old or edited draft the accepted creator history.

For already saved readings, the normal JSON history download may still be requested if validated history preparation succeeded but local storage writes fail with a recognized quota/security/unavailable-storage error. The message explicitly says the local checkpoint is UNCONFIRMED. Keep that exported bundle and reopen it when storage works. Missing serialization support, changed workspace, checkpoint conflicts and hash/verification failures do not receive this fallback. A successful download request still cannot confirm delivery to disk.

### Multiple tabs and stale drafts

Each browser draft retains the creator checkpoint it was based on, including an explicit empty base before the first creator save. Saving or exporting does not silently adopt a newer checkpoint from another tab. A stale draft—even after reload—must not replace later saved entries. Download draft recovery first to keep unsaved text; then explicitly recover/reopen the latest history, or merge the exact latest retained bundle before saving a new reading. Merging an older or alternate bundle preserves its evidence but does not refresh a stale creator base.

Explicit recovery, latest-bundle import or latest-bundle merge can refresh that base under the record’s Web Lock. Before replacing a shared browser draft changed by another tab, its exact bytes are preserved in an additive local recovery key and read back; another change during preservation or unavailable backup storage refuses adoption. Cancellation leaves the old base and guard unchanged. Creator-history retention and ordinary browser-draft persistence are separate: if only the history was retained, the message says the browser draft was not replaced and directs you to recovery.

The 100-entry protocol limit is not a promise that browser storage can hold 100 saves. Creator history now uses IndexedDB with shared content-addressed snapshot bytes and immutable version manifests, rather than duplicating every earlier snapshot in each local version. Quota can still stop saves before the protocol limit, depending on unique snapshot size and browser policy. Preserve portable bundles, unsaved-draft recovery files and source copies on your chosen drive. There is no automatic pruning. More space-efficient storage remains future work.

### History storage and legacy migration

Creator saves require IndexedDB and Web Locks. Existing legacy history is verified and copied additively; its original localStorage keys remain unchanged. A changed legacy head after migration causes a visible conflict: preserve both branches and exported drafts before reconciliation. Cooperating current-version tabs share a serialized checkpoint; an older application can still continue its separate legacy branch, which cannot overwrite the IndexedDB history. No automatic deletion or pruning is performed.

Browser drafts and separately retained incoming merge evidence still use localStorage. New displaced-draft backups use a separately catalogued IndexedDB store; older localStorage copies remain untouched. Keeping legacy copies can leave that storage full even when IndexedDB has room. The tool preserves its draft-conflict guard; if a displaced draft cannot be backed up, adoption refuses. Download draft recovery remains the escape for unsaved text. IndexedDB is not a backup or a promise of persistence, and no fixed save count is guaranteed.

### Read-only branch rescue and displaced drafts

Download retained history only verifies and exports the currently retained IndexedDB branch without a creator-save event, checkpoint adoption or reconciliation. It remains available when an older application has changed the legacy checkpoint. Preserve that separate legacy branch too. No source image bytes are included and a download request does not confirm delivery to disk.

When explicit recovery must preserve a displaced browser draft, the IndexedDB backend uses a separate additive opaque backup. Exact UTF-8 bytes and their SHA-256 are checked before the ordinary draft guard rechecks its baseline. Failure or a concurrent change refuses adoption. This backup is not a creator-history entry; normal draft writes and merge-evidence retention still use localStorage. No old history or draft backup is deleted automatically.

To retrieve an opaque preserved draft after reopening the tool, choose Download preserved draft recovery. The first request lists at most 1,000 local backup metadata entries by date, byte count and hash prefix without reading their content. Choose a copy, then request the download. Its exact stored UTF-8 bytes and hash are verified, and the ordinary draft is exported in the supported UNSAVED recovery format. Open saved work can reopen that file after confirmation; downloading changes no workspace or creator checkpoint. Labels do not authenticate an author. The bounded catalog never prunes automatically; keep recovery copies private.

Recovery controls are grouped under the collapsed Recovery & preserved copies caret beside Open saved work. Open it only when needed. Its controls download unsaved work, export a retained branch, recover the latest saved history, or select a preserved draft copy. Enter or Space toggles the native caret; Escape from a recovery button closes it and returns focus to the caret. A select control keeps its native Escape behavior. Open saved work is inside Open / more actions; the persistent save and backup controls remain available.

During an asynchronous proposal, review, conclusion or JSON export, Saving… replaces earlier success text and the relevant save controls are temporarily unavailable. Inputs remain editable; changed workspace checks still apply. Completion or refusal restores the controls and reports the actual result. A new review or conclusion reason typed while its earlier version saves is kept as unsaved text. A read-only request does not migrate old history; if only earlier browser-storage history exists, use explicit recovery or the ordinary export workflow when appropriate.

If the history commit finishes after you have made newer edits or switched workspaces, the committed snapshot is retained separately and the active newer draft is left intact. The message distinguishes that partial outcome from saving the current draft. Download draft recovery before reopening or merging retained history. A JSON location save with no intervening edit records its new checkpoint in the ordinary draft; a draft write failure is reported separately. PDF save opens the browser print path and does not claim completed file delivery.


### Keep both a retained checkpoint and newer unsaved edits

If a save reports that history was retained but newer edits remain unsaved, another immediate save can refuse because the draft still has its older creator base. There is no automatic merge. First copy the newer text somewhere private or choose Download draft recovery and verify that you kept the file. Then choose Recover saved creator history to load the committed checkpoint, reapply the newer text, and save a new reading with its reason. Keep the recovery file until you have checked both readings. Opening the recovery file alone restores an UNSAVED draft; it does not automatically merge its text into the newer retained checkpoint.

Retaining every version has a cost. In one synthetic Chromium 50-save run, observed save time grew from about 147 milliseconds to 15.2 seconds as full receipts grew. This is an example workload, not a guaranteed count or speed. Wait for the actual outcome message; download private recovery copies before closing if it reports a partial result. Conflict and recovery guidance remains visible after the busy state clears.


## Small correction submissions — private candidate workflow

The reported-problem list is a set of source leads, not verified corrections. Its upstream open/closed labels do not establish our evidence status. Read the report and source, identify the exact filename/version and page or passage, and record what you checked. Unknown source pins stay unknown until you establish them. Local catalogue edits are not automatically shared with other users. Import shows the entry count, size and sample titles before replacement. Confirmed replacement first preserves and verifies the previously saved catalogue; if storage is unavailable, replacement stops. Expand **Recover a replaced catalogue** to restore a preserved copy. Restoring also preserves the catalogue being replaced. Copies exclude unsaved form drafts and remain only on this browser origin; clearing browser data can remove them. Export metadata for a separate backup.

Use **Prepare a small correction sidecar** from the reported-issues page for a text-only submission. Record the original OCR passage, proposed reading, reason, uncertainty, self-declared contributor and assistance label. Inspect the exact JSON before downloading. This separate format is limited to 64 KiB and does not embed source documents; the full review-history export is a different format. Reopen checks canonical content against its digest while preserving the current form draft. An unkeyed digest is not a signature or approval.

The optional crop tool is an isolated private prototype at `correction-crop.html`, pending acceptance. Choose a permitted local PNG page raster and a previously exported text sidecar. The page preview outlines the region selected by X/Y/Width/Height; keyboard arrows adjust the number fields. Page zoom and text-size controls change only the view. Inspect the resulting small crop and provenance before downloading. Crop packets are limited to 100 KiB, including a PNG no larger than 64 KiB; the original page is not embedded. Inputs and pixel limits are detailed in CROP_PROTOTYPE_LIMITS.txt. Multi-gigabyte documents require a separately prepared page raster; this tool does not load them directly.

Crop provenance identifies the selected page-raster bytes, not automatically the original Archive document. A crop envelope detects canonical-content changes; contributor identity, permissions and whether a crop really came from its asserted source remain unverified. Legacy unwrapped crop packets show a missing-provenance-digest warning and are not silently converted. Keep the text sidecar, crop and original source separately. Nothing is uploaded or submitted by either exporter. Any GitHub report is a separate contributor action; any Archive ingestion needs a separately coordinated process. Never share private records or credentials.


### Guided review and source worklists (private candidate)

Use **Start step-by-step review guide** to read the workflow at your own pace. Next, Previous and Close change only the guide. They do not populate, save or submit a review. The margin example is an AI-written explanation of a real source check; its original scan is kept outside the code package. Inspect your permitted original yourself.

Under Reported problems, open the source-sorted worklist viewer and choose a local metadata JSON file. Filter by source, review type and evidence bucket. Imported labels are assertions in that list, not verification by the viewer. Acquisition gaps are gaps in verified holdings; they do not by themselves prove missing publisher files or OCR defects. No original files, automatic retries or uploads are included.


### File problems beyond OCR

From Reported problems, choose **Describe a download, file-opening or reading problem**. No Archive identifier or OCR passage is required. Identify the file and version (or UNKNOWN), method/tool version and settings, expected result, actual observation, checked evidence and uncertainty. Choose a problem category without treating it as a verified diagnosis. An unsupported reader, wrong file type, access restriction and incomplete download are different possibilities.

Prepare and inspect a bounded JSON report before downloading it. Reopening checks its content digest without filling or overwriting the current draft. Editing the draft withdraws the prepared download. This report has no source bytes, automatic retry, repair, upload, signature or trusted identity claim. Inspect metadata for private information before sharing.


### Experimental local contribution history (private review only)

Under Reported problems, expand **Experimental local contribution history**. The standalone workbench accepts a complete review receipt, file-problem report or text correction packet. It keeps the exact selected bytes in a private downloadable archive alongside an experimental WAL. It does not accept an existing creator-history bundle as a substitute for one of these supported packet types.

Choose local-only inspection, select the packet, provide your declared creator label, history ID, unique save ID, purpose and actual preparation method, then inspect. Review the inert text and trust labels before downloading the archive. The raw WAL CSV is exact evidence and may contain formula-like text: do not open it in a formula-evaluating spreadsheet. The archive carries full contribution packets, not source images or documents.

Reopen a downloaded archive on a fresh page to check self-consistency. For a trusted comparison, supply both genesis and current-tip hashes retained independently; the archive's own displayed hashes do not establish independence. Appending requires those checkpoints, a unique save ID, a newly selected packet and acknowledgment that you kept the prior archive. Earlier exact packets and prior WALs are carried. A mismatched pin, altered artifact, unsupported packet or byte limit refuses the operation.

Files stay in page memory until download; closing or reloading loses undownloaded work. This workbench does not write browser storage or send files anywhere. It cannot detect personal data or establish legal permission. Identity is UNAUTHENTICATED, rights NOT_VERIFIED and admission NOT_PERFORMED. This experimental exchange format is not a native GN WAL, a signature, a blockchain anchor or proof of institutional acceptance.


### Add a source-specific report without editing JSON

In the local catalogue, expand **Add a new source-specific report**. Enter the source reference, file/version, affected page or region, what needs checking and your declared reporter label. Hash and upstream issue URL are optional; missing values are not verification. The new report starts **unverified**, with a recorded initial report event. Older entries, decisions and sidecar references stay unchanged. No source is fetched or uploaded.

Creating a new report uses catalogue v2, which permits an absent upstream issue URL. Existing v1 imports remain v1 until this deliberate operation; older v1-only tools may reject the new format. Exports stay within the same compact 2 MiB metadata limit as import. Keep an earlier copy when exchanging with an older tool.

## Save an unresolved discussion

In Advanced tools, record AI assistance as a model suggestion. Enter your name or handle under Contribution details, and the source URL and passage locator under Source & context. Choose **Save discussion only** to preserve a question or expert-request draft without inventing a correction.

This option requires a recorded model discussion. It refuses unsaved reading or reason text so that work cannot silently be omitted. It creates no reading, review, expert response or accepted conclusion. Records already containing readings or decisions use **Save review record**. Keep source files separately and verify the downloaded history bundle by reopening it.

## Practice and workload queues

Choose **Practice queue** to browse three bundled, AI-written synthetic tasks with Next, Previous and Skip. Opening a task uses a separate local practice workspace and the bundled image; it makes no source-host request. Save/download work before closing the review tab. Skip does not score or review a task. Session skip choices are not shared or permanent.

In **Choose a reported problem**, select **Start queue** for one unreviewed catalogue report at a time. Next/Previous retain unsaved status/sidecar form inputs in this queue tab; Skip leaves the evidence state unchanged. Return to skipped items to revisit them. Preparing a separate review copies metadata only and does not download the source or overwrite the default review workspace. Unsaved queue form inputs are not included in catalogue exports.

**Missing-download list** opens the source worklist with the unresolved-acquisition bucket selected after importing a permitted worklist. It is separate from held-file human review. References are metadata, not a retry instruction. No coordinated host claims, shared cooldowns, source ZIP packs, bulk downloads or global workload assignment are implemented. The catalogue accepts up to 500 reports; the separate source worklist accepts up to 20,000 metadata rows.

## Keyboard, reading comfort and accessibility limits

Use **Reading & image tools** to reveal labelled text-size and line-spacing sliders and image controls. Focus scan and Focus reading give a panel more room; Escape returns to split view when an editing field or another open layer is not handling it. Long panels and full-reason text areas can still scroll. Persistent actions reduce trips to the top; this is not a promise that every task fits on one screen.

In Safari, Option-Tab can move through webpage controls when ordinary Tab skips some controls under the current browser/keyboard preferences. Tabs also support their arrow-key navigation. The guide moves focus to its heading; Escape closes it and returns to its opener. Continue from a saved reading returns focus to Compare & read. These are scoped observed behaviors, not a claim of universal screen-reader support.

Native Safari import, save, download, reload, guide focus, Continue focus and accessible control labels have been checked on macOS/Safari 26.5.2 in a private test window. A later native Safari synthetic check also retained a mentor needs-review decision through export, fresh-origin reopen and replay; a separate matching-file hOCR check restored its highlight and refused altered hOCR bytes. VoiceOver spoken output remains unverified; the maintainer waived listening as a release gate for this edition. Report any blocked task with the browser, OS, assistive technology and exact steps, without including private document contents.

## Cap a review context for BitNet

Under **4. Contexts**, open the byte-budget details and choose **Measure a BitNet token budget in a separate tab**. Load the exact tokenizer JSON and configuration from the linked pinned official model revision. No context text is sent to that site or any model. Paste the full definition and dependencies, along with the rendered instructions/source before and after it. Include runtime chat formatting and special-token strings; they are not supplied automatically. Set answer and safety reserves, then choose **Measure budget**. The page shows tokens, whitespace-separated words, Unicode characters and UTF-8 bytes. **Download checked handoff** is enabled only for a measured fit; changing inputs invalidates it. Oversized text remains intact. This caps the checked handoff, not the main context library’s separate byte-storage policy. It does not run BitNet or prove comprehension.

Tokenization can merge text across boundaries. The checker’s full supplied-prompt count, total remaining budget and fit verdict apply to that exact rendered text. Counts for a definition on its own or the joined surrounding text are diagnostic component counts; the displayed definition allowance is explicitly approximate. They do not replace the whole-prompt gate.
