# Contributing

This repository contains a working browser-local prototype, not a centralized submission or verified-review service. Test the form, report problems, or suggest improvements. Documented findings may be attached as review-record JSON files to a public issue after you check that they contain only material appropriate to share publicly.

Start with one small, checkable finding. No coding or cryptocurrency wallet is required.

1. Provide the original publisher and document title.
2. Link each Archive item and exact source file. Include a page or section locator.
3. Quote the literal passages separately from your explanation.
4. Describe the discrepancy without replacing or silently correcting source text.
5. Identify unknowns, uncertain readings, and any checks you have not performed.
6. Choose the public name or GitHub handle you want credited.

A reviewer should select the exact saved reading, identify the evidence checked, and choose accepted, disputed, or needs review. A reading with no review remains pending. To propose a correction, continue from that reading and save a new revision; earlier text and reviews remain intact. Multiple contributors and reviewers may receive separate attribution.

Mentors can choose the mentor role when reviewing and explain a check someone else can repeat. This guidance stays with the reviewed reading and receives separate mentoring credit. Export your saved review record, pass a copy to another contributor, and merge their returned copy into the original. Keep the source file alongside the record: source files are not embedded in the export.

For a practical first-use exercise with a reader and mentor, use [USER_TESTING.txt](USER_TESTING.txt). We welcome reports of confusing steps as well as software defects. Automated checks and agent reviews do not replace tests with people.

## Attach a saved review record

Attaching a record is optional. **Check privacy and sharing permission before you drag or select a file.** GitHub uploads attachments immediately, before you submit the issue; files uploaded to a public repository can be accessed without signing in. Inspect the JSON for private names, contact details, source context, comments and model responses. If it contains sensitive material, do not upload it; describe a safe finding instead. See [GitHub attachment guidance](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/attaching-files).

1. In Reckoner, choose **Save review record** to export the JSON. Keep its bytes and `.json` extension unchanged; renaming the extension is unnecessary.
2. Open a **Public-record finding** issue. In **Saved review record (optional)**, drag the checked JSON into the text box or use its attachment control. Wait for the attachment link to appear.
3. In **Source records**, provide the original publisher, source URL, exact filename and page or section locator. Include the source SHA-256 from the record when available so a reviewer can check the same bytes.
4. Keep full source images, PDFs and other originals out of issue attachments. Provide a permitted source link and exact locator. If needed, use the bounded crop exporter only for a small image you are authorized to share; inspect it before attaching. Keep full originals separately.
5. Preview the finding and submit when ready. An issue attachment requests review; it does not establish approval, accuracy, authenticated identity or admission through a receiving policy.

Keep private information and internal implementation out of public issues. Describe a suspected security or privacy problem initially by email to meridian.north@pm.me, without publishing sensitive details.

The proposed pilot does not guarantee admission into Garrison Node feedstock. A separate validation process governs admission. No upload volume, hash, or timestamp establishes accuracy or authenticated identity by itself.


## Credit is separate from admission

Use a name, organization label or handle you are entitled to use. These labels are self-declared. A hash of a name is neither verified identity nor reliable anonymization; do not hash someone else’s personal information and treat that as permission to publish it. An optional signing-key feature is not implemented here; if added, it would establish key continuity, not legal ownership or a verified person.

A public issue or sidecar requests review. It is not an accepted database record. Source bytes, proposed changes, evidence reviews and a recipient’s admission decision must remain distinct. Local **reviewed** status does not authorize a host to ingest a contribution. Multiple agreeing handles do not prove independent reviewers. Creator record-making and exporting do not require an institution’s preapproval; recipient acceptance is a separate decision.

Submit references and the minimum permitted evidence. Do not submit stolen files, credentials, private personal records, unlawful content or material you lack authority to share. A declared rights basis, hash or peer vote does not verify permission. If permission or content is uncertain, retain the original privately and ask the intended host how to proceed without sending the questionable payload. GitHub attachment handling is outside this app’s control.

A future hosted receiving service needs a bounded, quarantined intake, duplicate/rate controls, evidence and permission review, explicit admission authority, abuse reporting and a correction/removal process. None of that is supplied by a static GitHub Pages site. Do not automatically execute attachments, follow submitted URLs, call models, ingest records or publish personal-data fingerprints merely because a schema or digest validates. Shared moderation and key-based identity remain proposed.
