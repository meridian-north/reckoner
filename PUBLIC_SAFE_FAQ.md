# Reckoner questions and answers

## What does Reckoner do?

It helps you compare a source with a reading or claim, explain a proposed interpretation, and save a record another person can check. Earlier readings, reviews and disagreement stay visible. Search notes help you record what you tried before choosing a source.

## Do I need a language model?

No. People can compare, explain, review, mentor and exchange records without one. Optional copy/export handoff lets you consult your own model separately; the form makes no model API request.

## Does it recognize text from an image?

No. Supply the OCR or other machine reading you want to check. The form displays your source beside that text and a proposed reading. Its worked notice-date example is synthetic; the real-report exercise is a teaching reconstruction with stated limits.

## How do people and mentors receive credit?

Saved readings and reviews retain names or handles and reasons. A mentor can explain a repeatable check and receive separate mentoring acknowledgment. Counts describe entries and self-declared handles in that record, not verified people, expertise or intelligence. Contribution does not promise payment. In search notes, the summary counts the creator and note authors by self-declared handle label, trimming spaces and ignoring letter case. Unknown or unnamed author markers are reported separately. These are labels in one saved record, not verified people.

## Does an accepted review mean institutional approval?

No. A local review records what a person checked and decided. It does not establish institutional admission, verified reviewer authority or factual certainty. Disagreement remains visible, and a conclusion can remain unresolved.

## What should I save?

For a resumable backup, choose **More → Save to file**. For a readable portable correction record, choose **More → Export contribution receipt**. Keep the original source files and any enhanced copies separately. They are not embedded in the record. Reopen matching files to resume visual comparison. Text and PDF are readable reports; the main form’s readings CSV is an index. The downloads page offers application materials; it does not export your personal review. The bundle’s offline downloads page intentionally omits the ZIP itself. Use **Save readable search notes** for a text report, and keep the JSON from **Save search notes** for reopening and digest checking. Browser drafts are not backups, and search notes should be exported before closing their tab.

## What are contexts and viewing lenses?

A reading context records terms, meaning and checks for a particular task. Select its exact version; the full definition and hash matter, not just its name. Open **Reading & image tools** for image adjustments and reading comfort. Saved image-view settings include brightness and contrast. OCR text size and line spacing are comfort controls for the current view, not persisted image settings. These controls change your view, not source facts. Record external enhancement methods and retain the original for comparison.

## Can I use a local or cloud model I prefer?

You can inspect, copy or export the prepared text to a model you choose. Compatibility and useful behavior depend on that model; a larger input window does not guarantee understanding or rule enforcement. The image is not included. Preserve useful output as a suggestion and review it yourself. Recorded review steps can be inspected again; fresh model output may differ.

## What does the hash prove?

It helps check whether recorded bytes changed. It does not prove truth, identity, lawful permission or a trusted timestamp. Replaying saved decisions is different from guaranteeing an identical new computation or model response.

## Is this an Internet Archive service, and does it upload files?

It is an independent contribution developed by John Reed and Garrison Node. Internet Archive has not endorsed or adopted it. The form prepares a checklist and links to Archive services. **Archive activity and error notes** records your attempted submissions, errors, links, existing-item checks and retry reasons. Metadata-error notes can export what you expected, what happened, reproduction steps, the before value and intended after value. These are self-declared observations; the form does not automatically upload, change metadata through an API or confirm preservation. Submit only where you have the necessary permission and check the service's actual result. Exporting a record is not submitting it.

## What does it cost, and what remains private?

No paid service or model account is required for the present form. Optional model providers may charge under your own arrangement. Separate hosting, integration, training or support can be discussed. The contribution interface and Garrison Node's private development remain separate; no private engine access is needed to use the form.

## How can I help or suggest an extension?

Start with one small finding: identify the source and passage, describe what happened, and explain the check someone can repeat. Share exported records only after inspecting their contents and permissions. Suggestions about usability are welcome. For a capability not implemented here, we welcome discussion and will label it as proposed rather than describe it as a working feature.

### What does creator history prove?

It checks exact saved receipt/CSV snapshot bytes and their links to a genesis and previous save. A separately retained local checkpoint helps detect older copies or other branches. It does not authenticate a person, prove factual accuracy, establish a trusted timestamp, or prove that no newer copy exists elsewhere. Recipient adoption is a separate decision; personal saves require no institutional approval.

### What should I keep, and what if a save fails?

Keep the JSON history bundle and its original source files. The main form’s text/PDF reports and standalone readings CSV are views, not complete history backups. The separate experimental WAL workbench has its own evidence CSV and private archive; its limits are described below. A cancelled location chooser or failed file close does not advance the local checkpoint. Recover saved creator history opens the last locally committed snapshot after confirmation. Current browsers on HTTPS or localhost must provide Web Locks for history commits; without that capability, saves fail closed and the draft remains available. Browser download fallback reports a request, not confirmed delivery to disk.

### Can I rescue unsaved text if browser storage is full?

Yes. Download draft recovery captures current unsaved draft and pending text fields without changing creator history. Keep it private and reopen it through Open saved work; it remains explicitly UNSAVED and does not replace retained checkpoints. Source image/PDF bytes are separate. A validated history bundle may also be downloaded after recognized local storage-write failure, with an explicit UNCONFIRMED-checkpoint warning. Trust conflicts, tampering and missing serialization support do not receive that fallback.

### What if I have two tabs open?

Each draft keeps its original creator base. A later save in another tab makes the older draft stale; it cannot silently discard that later saved work. Download unsaved-draft recovery, then explicitly recover/reopen or merge the latest retained bundle. Shared draft replacement first preserves the displaced bytes, and cancellation does not adopt a new base. Browser storage capacity may stop saves before the 100-entry protocol limit; keep portable backups and source files.

### Does the new storage guarantee 100 saves?

No. IndexedDB shares identical history snapshots across immutable versions to reduce duplication, but browser quotas, unique receipt growth and storage eviction still apply. Legacy history is copied without deleting old keys. Drafts and incoming merge evidence still use localStorage; new displaced-draft backups use a separate IndexedDB catalog and may reach its quota separately. Preserve portable history bundles, draft recovery and source files on your chosen drive. A legacy writer changing its checkpoint after migration triggers a conflict instead of silently replacing current history.

### Can I export retained history during a legacy checkpoint conflict?

Yes. Download retained history only verifies the stored IndexedDB branch and requests its export without saving, adopting a checkpoint or reconciling branches. New writes and adoption remain blocked until the conflict is resolved separately. During explicit draft recovery, the IndexedDB backend preserves displaced draft bytes in an additive verified backup; all baseline checks still apply.

Use Download preserved draft recovery to choose a retained opaque local copy after reload. It verifies the stored bytes and exports the normal UNSAVED recovery format for Open saved work. This is an explicit download, not automatic restoration or authenticated authorship. The catalog is bounded and no backup is deleted automatically.

Recovery controls are grouped under the collapsed Recovery & preserved copies caret beside Open saved work. Open it only when needed. Its controls download unsaved work, export a retained branch, recover the latest saved history, or select a preserved draft copy. Enter or Space toggles the native caret; Escape from a recovery button closes it and returns focus to the caret. A select control keeps its native Escape behavior. Open saved work is inside Open / more actions; the persistent save and backup controls remain available.

During an asynchronous proposal, review, conclusion or JSON export, Saving… replaces earlier success text and the relevant save controls are temporarily unavailable. Inputs remain editable; changed workspace checks still apply. Completion or refusal restores the controls and reports the actual result. A new review or conclusion reason typed while its earlier version saves is kept as unsaved text. A read-only request does not migrate old history; if only earlier browser-storage history exists, use explicit recovery or the ordinary export workflow when appropriate.

If the history commit finishes after you have made newer edits or switched workspaces, the committed snapshot is retained separately and the active newer draft is left intact. The message distinguishes that partial outcome from saving the current draft. Download draft recovery before reopening or merging retained history. A JSON location save with no intervening edit records its new checkpoint in the ordinary draft; a draft write failure is reported separately. PDF save opens the browser print path and does not claim completed file delivery.


### Keep both a retained checkpoint and newer unsaved edits

If a save reports that history was retained but newer edits remain unsaved, another immediate save can refuse because the draft still has its older creator base. There is no automatic merge. First copy the newer text somewhere private or choose Download draft recovery and verify that you kept the file. Then choose Recover saved creator history to load the committed checkpoint, reapply the newer text, and save a new reading with its reason. Keep the recovery file until you have checked both readings. Opening the recovery file alone restores an UNSAVED draft; it does not automatically merge its text into the newer retained checkpoint.

Retaining every version has a cost. In one synthetic Chromium 50-save run, observed save time grew from about 147 milliseconds to 15.2 seconds as full receipts grew. This is an example workload, not a guaranteed count or speed. Wait for the actual outcome message; download private recovery copies before closing if it reports a partial result. Conflict and recovery guidance remains visible after the busy state clears.

### How can an agent and a human help a host?

An agent or another reader may flag a possible problem. A person checks the original, records a precise finding and reason, and asks a mentor for a repeatable second check. Saved attribution, guidance and disagreement help the next reader follow the work. The form runs no agent itself. AI-written examples stay labeled and do not establish a human check. Submission is a separate action under the host's agreed process; the host decides whether to adopt it. Benefits at scale remain a pilot question.

### Can I recover a replaced catalogue?

Confirmed imports show entry count, size and sample titles, then preserve and verify the previous saved catalogue before replacement. Expand Recover a replaced catalogue to restore a copy; restoring also preserves the catalogue being replaced. Quota or stale-tab conflicts stop replacement. Copies exclude unsaved drafts and remain on that browser origin; export metadata separately before clearing browser data. Local status labels are self-declared, separate from upstream issue status and institutional approval. No shared moderated queue is provided.

### What is the experimental WAL workbench?

A separate local workbench accepts supported full JSON contribution packets and prepares a private archive carrying exact packet bytes and an experimental hash-linked WAL. Reopen checks self-consistency; append requires both independently retained genesis and tip checkpoints, preserving earlier exact WALs and packets. Source documents remain separate. The page uploads nothing and writes no browser storage. Identity is UNAUTHENTICATED, rights NOT_VERIFIED and admission NOT_PERFORMED. It is not a native GN writer, signature, blockchain anchor, privacy detector or permission verifier. Inspect through the inert text view; raw evidence CSV may contain formula-like text and should not be opened in a formula-evaluating spreadsheet.

### Does the optional source cache establish permission?

No. The local operator utility requires a declared permission basis, evidence and an explicit byte budget before copying outside Git. It preserves exact bytes and verifies readback while refusing corrupt or conflicting targets. It does not download, repair, publish or verify rights. Evaluate each source's permission and privacy restrictions separately.

### How do I save without returning to the top?

Choose Save reading below the reading fields. On wider screens its row stays outside the scrolling fields; on narrow screens the form flows down the page. Header Save to file exports the complete history, and Decisions & history opens review and replay. Saving locally and downloading a backup are separate steps. Check Downloads for the requested JSON file; the app cannot confirm disk delivery. Open saved review is in the header or More on narrow screens. Additional merge and readable-report actions remain under More. Keep source files separately.

### Is full screen-reader support verified?

Not yet. Scoped native Safari keyboard and accessibility-tree checks have passed; complete VoiceOver announcements and an independent human assistive-technology session remain unverified. Use the reading-size and spacing controls for comfort, and report the precise blocked task without private source contents.

## Can a batch contain its own sources?

Yes. A `reckoner.data-module.v1` manifest supplies questions, baselines and source references. Select its extracted source folder or a matching file. Reckoner checks stated size and fingerprint, then opens a separate review workspace with no human name, reason or decision supplied. Original sources stay separate from exported history. Up to 200 tasks are supported; images/PDFs are limited to 20 MiB and UTF-8 TXT/HTML/XML to 200 KB. HTML/XML is displayed literally rather than executed. ZIP extraction is manual. External source references are user-opened links; importing does not download them. Declared reuse permission and reading kind remain unverified.
