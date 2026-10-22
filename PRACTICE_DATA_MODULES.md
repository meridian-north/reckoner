# Practice data modules

Reckoner currently contains 14 AI-written synthetic exercises. They illustrate repair categories recovered from early Reckoner work; they are not facsimiles of historical documents, independent human rulings, or demonstrations of automatic detection.

## Open a batch with its own files

More → Open a data-module queue opens the generic `reckoner.data-module.v1` importer. Choose MODULE.json, then the extracted folder (including its sources subfolder), or choose the matching file for the current item. Previous/Next browse up to 200 tasks. Open review creates a fresh separate workspace each time; earlier drafts remain intact. Keep the queue tab open until the source handoff completes.

The importer checks declared size and SHA-256 before handing a selected source to the review tab. Its task title, question, supplied baseline, location, baseline kind and reuse declaration travel with the saved review. Human name, reason and decision are not filled in. “Supplied machine reading (unverified)” is an author-supplied description, not a claim that Reckoner performed OCR. Image regions are normalized [x,y,width,height]; their correspondence still needs checking.

Supported source types are PNG, JPEG, WebP, PDF and literal UTF-8 TXT/HTML/XML. Text markup is displayed rather than executed. Limits: 1 MiB manifest, 200 tasks, 1000 selected folder entries totaling 100 MiB; each image/PDF at most 20 MiB, each text source at most 200 KB. ZIP extraction is manual. Source bytes remain separate from the exported review/history backup and must be reselected after reopening. Fingerprints establish byte continuity, not truth, identity or reuse permission.

External credential-free HTTPS source references are optional. Import makes no source-host requests: the user must follow a reference and download a permitted source separately. Unknown hashes/sizes are allowed only for external references and labelled unverified; supplied expected values must match. File-type, encoding, size or fingerprint failures refuse the handoff.

The older `ocr.source-worklist.v1` catalogue is still available at source-worklist.html. It describes acquisition and review prospects and can link exactly matching installed exercises. It is a separate metadata format, not a generic source-file package. The earlier 14-exercise SVG package uses this installed-example format; it should not be mistaken for a generic-module import.

A generic manifest has exactly schema, id, title, reuseStatement and items. Each item contains id, title, question, locator, baseline, baselineKind (`source-text`, `supplied-machine` or `claim`), region (image box or null), and source with path, url, sha256 and bytes. Local source paths are relative and require exact fingerprints and sizes. External references may use null for unknown expected values. IDs are unique within a module. See the synthetic browser walkthrough for a complete generated fixture and save/export/reopen/replay check.

## Submit another cure

A proposed cure should include: exact source and reuse basis; page/region or text location; before and proposed after; reason and uncertainty; contributor, declared AI assistance and reviewers separately; and a negative or ambiguous case. No submission is an accepted rule merely because it parses, hashes or receives agreement. Keep the original and contrary reviews available.

## Current boundary

Practice fixtures are supplied under the repository's MIT license and contain no historical or personal source documents. Public-source examples still need exact source/version and reuse review before distribution. Actual personal/family/KPD data and derivatives do not belong in a contribution package, GitHub or public chains. Proton distribution is a separate operator-approved step; preparation creates no sharing authority.
