# Proposal for a human review and mentoring pilot

The proposed workflow begins with a source, a reading or claim to check, the contributor’s interpretation and reason, then save and separate review. OCR and hOCR remain supported; bounded literal text and selected local images allow broader evidence review. Portable data modules can prepare a queue of permitted tasks, with each review in a separate workspace. These local capabilities do not establish institutional integration, permitted redistribution or verified judgments.

John Reed and Garrison Node invite Internet Archive and interested institutions to critique and improve Reckoner, an independent document review form. This is a proposed contribution, not an approved Internet Archive service or an assertion that Internet Archive lacks comparable work.

## A useful agent-and-human contribution

Automation helps find the work. Human judgment makes the contribution worth keeping. An agent or reader may identify a possible problem; a person checks the original, gives a precise reason, and invites a mentor to explain a repeatable second check. Reopening the saved record demonstrates that attribution, full reasons, guidance and disagreement remain available to the next reader. AI-written demonstration guidance stays labeled and does not establish that a human performed the check.

The host receives a proposed, source-linked contribution rather than an automatic rewrite or a duplicate collection. Any submission is a separate contributor action under the host’s agreed process. Adoption, usefulness at scale and reduced staff effort are pilot questions to measure, not established outcomes. The current form runs no autonomous agent and provides no hosted moderation service.

## Fit with an existing open-source OCR workflow

The proposed contribution complements Tesseract and hOCR. A contributor opens an existing local image and matching hOCR, selects a highlighted word, checks the enlarged source passage, explains a proposal and saves credited work. A readable JSON attachment preserves the source/hOCR pins, original and proposed readings, reasons, uncertainty, separate self-declared AI assistance and mentor decisions. The original bytes remain separate and unchanged. An optional hOCR derivative represents one selected proposal, not an automatically accepted rewrite.

The JSON format and its structural schema are documented in the repository. They are not an Internet Archive derivative specification or ingestion agreement. A maintainer can inspect the record manually; attachment conventions, automated intake and institutional acceptance would require a separate agreement and testing. The optional experimental WAL is supplementary, not required for a reader to use the core review loop. Advanced context tools remain secondary.

The immediate pilot question is whether a compact, source-linked contribution reduces the effort of evaluating a reader’s judgment while preserving acknowledgment and teachable disagreement. Measure successful task completion, source/region correspondence, understandable credit, reproducible mentor checks and maintainer evaluation time. Do not infer factual accuracy, paid employment or institutional benefit from software test counts.

## What people would do

A reader compares supplied machine text with a source image or document, records a proposed reading and its evidence, and saves a portable review record. A reviewer checks that exact saved reading. A mentor explains how another person can repeat the check. Earlier readings, reasons and disagreement remain visible, including when someone records a conclusion.

The purpose is to make human judgment and teaching useful, reusable and attributable. Counts describe recorded contributions and self-declared handles; they do not measure intelligence, authenticate people or establish the truth of a conclusion. No LLM is needed. Optional copy/export handoff lets a contributor consult a model separately and review its suggestions.

## Recognition for work people already do

People already spend time locating a file, checking an unexpected result, resolving a confusing passage and teaching someone else how to check it. The pilot would preserve that useful effort instead of letting it disappear after one person solves the immediate problem. A reader can see the finding, the reason, the mentor’s guidance and the self-declared contributor credit in an exchanged record.

The analogy is the respect earned through useful, inspectable contributions to a community reference project such as Wikipedia. This is an analogy, not an affiliation, an imported reputation score or a claim that contributors have been verified. Attribution and preserved guidance are present features; a shared reputation system, community governance and authenticated reviewer credentials remain future work.

Participation does not promise wages, employment, income or institutional endorsement. Any later paid mentoring arrangement would need its own sponsor and terms. Recognition should remain attached to useful evidence, including a carefully documented unresolved question or a correction to an earlier finding; it should not depend only on volume, agreement or a popularity score.

## Beyond an OCR correction

A contributor may instead document an acquisition gap, an integrity concern, an unsupported reader or format, a rendering problem or unexpected text extraction. The bounded file-problem report records the method, expected result, observation, evidence and uncertainty without requiring OCR text or embedding original bytes. A failure to open or download a file does not establish its cause. Acquisition-gap reports should invite inspection of existing receipts rather than mass retries; shared claim coordination and source-wide cooldown enforcement are not implemented in the standalone tool.

## Our contribution

We offer the standalone browser-local interface, portable review records, tests, examples, documentation and an editable introduction deck. The form reviews supplied OCR; it does not perform OCR recognition. Contributors keep the original source files separately from exported review records.

Institutions can adapt the display name and use bounded declarative skins for colors, built-in fonts, spacing and preferred approved search destinations. These settings change appearance and destination order, not evidence, permissions or approval rules. An institution can evaluate and host its own edition; a local branding preview does not establish authorization to use that institution's identity. The public interface remains separate from Garrison Node's private development and production data structures.

We ask for critique, improvements, developer acknowledgment and a discussion of a useful pilot. We would welcome a visible “Developed by John Reed and Garrison Node” credit in an institutional edition. The repository's license governs redistribution. Requested visible credit and collaboration are stated openly rather than presented as a license requirement or an existing institutional agreement.

## Optional collection reading guides

A collection groups items. An optional reading guide can help contributors interpret the terms and evidence they encounter across those items. In Reckoner, a guide can be written as a named reading context; developers call this a microtheory. It supplies guidance for a check, without changing the collection or its source documents.

For example, a pilot involving historical technical reports could offer a guide called **Reading a technical estimate**, with these instructions:

- Preserve the report's terms, abbreviations and units; explain an expansion only when the document supports it.
- Record the report date, edition, passage and operating conditions that qualify a statement.
- Distinguish an estimate, a design-capacity calculation and a measured result.
- Cite the passage or footnote supporting an interpretation, and say which underlying references remain uninspected.
- Preserve uncertainty and competing readings; ask a mentor to explain a check another reader can repeat.

The present form lets a contributor create or import a reading context, select it for an individual reading, and save its exact version and hash with that reading. Contributors can exchange the carried definition and record checks of that version. A revised guide has a new version; earlier readings keep their original reference. These features work at the individual review-record level.

**Proposed collection integration:** Internet Archive or another host could choose whether to attach, discover or recommend guides alongside a collection, and how a steward and contributors would maintain them together. Automatic collection attachment, a shared guide directory and authenticated curator approval are not implemented. Competing guides should remain identifiable rather than silently replacing one another. A contributor's suggestion or self-declared mentor check is separate from a collection steward's or institution's approval; the current form establishes no such institutional authority.

## A small, checkable pilot

Choose one collection and a limited set of passages that participants may lawfully share. Identify the collection steward and who will review findings. Use the short guide and the reader-and-mentor exercise to observe these tasks:

- **First saved finding.** Can a reader identify a passage, distinguish the supplied machine text from a proposal, state uncertainty and save a reading with a checkable reason? Record the point of confusion and whether help was needed.
- **Reopening and exchange.** Can the reader export and reopen the record with the same source file? After exchanging and merging a collaborator's copy, check that both readings, attribution, reasons and any disagreement remain attached to the intended work.
- **Repeatable mentoring.** Can another reader explain a mentor's guidance in their own words and repeat the described check against the source? Record unresolved questions rather than assuming that a mentor label establishes correctness.
- **Access and blocked tasks.** Try the intended devices, keyboard workflow and assistive technologies. Record the blocked control, expected behavior, actual behavior and assistance needed. A blocked task is useful evidence for improvement.
- **Archive handoff notes.** If the pilot includes a permitted service submission, can the contributor distinguish preparing a checklist from attempting a submission, inspect an existing item before retrying, and record what the service showed without claiming the form verified it?

These are observations to gather, not reported pilot results. Agree where findings should go, who handles disputes, what contributor credit means and how a mistake can be corrected. The current form supplies file exchange and local notes, not a central moderated submission service. Decide together whether to adopt, improve, extend or stop the pilot, describing only the scope actually tested and accepted.

## Preservation and service boundaries

The form prepares a local Archive handoff checklist with source information and a user-declared sharing basis. The contributor completes any submission at the Archive service. Preparation does not prove permission, submission, successful preservation or endorsement.

Archive activity notes preserve a local preparation snapshot and later self-declared submission attempts, errors, receipt links, existing-item checks and retry reasons. Metadata-error reports can record expected and actual behavior, reproduction steps, intended fields, an observed before value and an intended after value. Readable export and review-record JSON preserve these notes; earlier entries remain intact through the form.

These are contributor observations, not verified service receipts or Archive API logs. The form does not automatically upload, retry, change service metadata, determine rights or verify preservation. Receiving-side trusted identities, authenticated institutional approval and a production adapter are not supplied by these notes.

Before introducing a hosted or shared service, agree on retention, attribution, review responsibilities and what goes to outside services. The present form makes no model API request. Inspect copied model prompts and exported records before sharing them.

## Sustainability

The contribution interface is useful without a paid service. John Reed and Garrison Node welcome separate discussions about hosting, installation, institutional integration, training, support or sponsored maintenance. No such service is required to use the present form, and no arrangement or price is implied here. The private development boundary remains separate from the contribution.

## The immediate request

Please review the form and short introduction, suggest a suitable collection or workflow, and tell us whether a small reader-and-mentor pilot would be useful. We welcome specific critiques and improvements. If appropriate, we would appreciate inclusion in an attendee resource list or follow-up message. Speaking access and distribution remain subject to the organizer's agreement.
