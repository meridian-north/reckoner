"""Package only explicitly approved contribution files; never traverse private trees."""
from pathlib import Path
import hashlib
import json
import zipfile

ROOT = Path(__file__).resolve().parents[1]
FILES = (
    'dist/example-walkthrough.js', 'dist/example-walkthrough.css', 'tests/example-walkthrough.test.mjs',
    'dist/demo-startup.js', 'tests/demo-startup.test.mjs', 'tests/source-review-packs.test.mjs',
    'dist/data-module.js', 'dist/data-module.html', 'dist/data-module-ui.js', 'dist/module-intake.js', 'tests/data-module.test.mjs', 'tests/data-module-lifecycle.test.mjs', 'tests/module-intake.test.mjs', 'scripts/data-module-walkthrough.cjs', 'scripts/compact-reading-walkthrough.cjs', 'PRACTICE_DATA_MODULES.md', 'dist/reading-first.js', 'dist/text-source.js', 'tests/text-source.test.mjs', 'tests/source-preflight.test.mjs', 'scripts/source-preflight-walkthrough.cjs', 'dist/source-reading-lock.js', 'tests/source-reading-lock.test.mjs', 'dist/practice-source-pins.js', 'dist/practice-queue-entry.js', 'tests/practice-queue-entry.test.mjs', 'scripts/practice-batch-walkthrough.mjs',
    'dist/practice-hyphen-join.svg', 'dist/practice-hyphen-glyph.svg', 'dist/practice-proper-name.svg', 'dist/practice-fragment-join.svg', 'dist/practice-historic-spelling.svg', 'dist/practice-sidebar-reflow.svg', 'dist/practice-column-order.svg', 'dist/practice-note-attribution.svg', 'dist/practice-intentional-hyphen.svg', 'dist/practice-ambiguous-layout.svg', 'dist/practice-quote-normalization.svg',
    'scripts/local-hocr-format-check.mjs',
    'scripts/context-token-budget-walkthrough.mjs',
    'dist/context-token-budget.js', 'dist/context-token-budget-ui.js', 'dist/context-token-budget.html', 'dist/hf-tokenizers-0.2.0.mjs', 'dist/HF_TOKENIZERS_LICENSE.txt', 'dist/HF_TOKENIZERS_PROVENANCE.json', 'tests/context-token-budget.test.mjs',
    'dist/contribution-strand.js', 'tests/contribution-strand.test.mjs',
    'scripts/file-problem-walkthrough.mjs', 'CHANGELOG.txt', 'EXPERIMENTAL_PREVIEW.txt', 'scripts/verify-contribution.mjs', 'tests/verify-contribution.test.mjs',
    'CONTRIBUTION_JSON.txt', 'schemas/contribution-receipt.schema.json',
    'CONTRIBUTION_FILE.md', 'scripts/make-synthetic-contribution.mjs', 'tests/contribution-file.test.mjs',
    'examples/synthetic-contribution/contribution.history.json', 'examples/synthetic-contribution/latest-receipt.json', 'examples/synthetic-contribution/HASHES.json',
    'scripts/hocr-export-check.mjs', 'scripts/compact-layout-check.mjs', 'scripts/local-hocr-walkthrough.mjs', 'scripts/practice-judgment-check.mjs',
    '.gitignore', 'package.json', 'NOTICE', 'SUPPORT.md', 'SECURITY.md', 'PUBLIC_SAFE_FAQ.md',
    '.github/ISSUE_TEMPLATE/config.yml', '.github/ISSUE_TEMPLATE/finding.yml', '.github/ISSUE_TEMPLATE/ocr.yml', '.github/ISSUE_TEMPLATE/suggestion.yml',
    'dist/contribution-wal-bundle.js', 'dist/contribution-wal-ui.js', 'dist/contribution-wal.html', 'tests/contribution-wal-ui.test.mjs', 'scripts/contribution-wal-walkthrough.mjs',
    'dist/contribution-wal.js', 'tests/contribution-wal.test.mjs', 'PUBLIC_CONTRIBUTION_WAL.txt',
    'dist/file-problem.js', 'dist/file-problem-ui.js', 'dist/file-problem.html', 'tests/file-problem.test.mjs',
    'scripts/check-site.py',
    'scripts/catalogue-walkthrough.mjs',
    'tests/hocr-adoption.test.mjs', 'scripts/hocr-form-walkthrough.mjs', 'HOCR_COMPATIBILITY.txt', 'dist/hocr-export.js', 'dist/hocr-ui.js', 'dist/hocr.js', 'scripts/hocr-parser-check.mjs', 'dist/passage-loupe.js', 'dist/task-passage.js', 'dist/guided-review.js', 'dist/practice-tasks.js', 'dist/practice-queue.js', 'dist/practice-queue.html', 'tests/practice-tasks.test.mjs',
    'dist/source-worklist.js', 'dist/source-worklist-ui.js', 'dist/source-worklist.html', 'tests/source-worklist.test.mjs',
    'CROP_PROTOTYPE_LIMITS.txt', 'dist/correction-crop.js', 'dist/correction-crop-ui.js', 'dist/correction-crop.html', 'tests/correction-crop.test.mjs',
    'dist/correction-sidecar.js', 'dist/correction-ui.js', 'dist/correction.html', 'tests/correction-sidecar.test.mjs',
    'CLONING_AND_LIMITS.txt',
    'dist/ocr-catalogue-store.js', 'tests/ocr-catalogue-store.test.mjs',
    'OCR_CATALOGUE_GUIDE.txt',
    'scripts/cache-permitted-source.py', 'tests/cache-permitted-source.test.py',
    'dist/ocr-catalogue.js', 'dist/ocr-catalogue-ui.js', 'dist/reported-issues.html', 'dist/reported-issues.js', 'dist/reported-issues-ui.js', 'tests/reported-issues.test.mjs', 'tests/ocr-catalogue.test.mjs',
    'dist/page-map.js', 'dist/page-map.css', 'tests/page-map.test.mjs',
    'dist/reason-details.js', 'tests/reason-details.test.mjs',
    'tests/creator-history-stale-tab.test.mjs', 'dist/history-idb.mjs', 'tests/history-idb.test.mjs', 'tests/history-idb-backend.test.mjs', 'tests/recovery-disclosure.test.mjs', 'tests/pending-save.test.mjs',
    'dist/draft-recovery.mjs', 'tests/draft-recovery.test.mjs',
    'dist/creator-history.mjs', 'dist/creator-history-store.mjs', 'tests/creator-history-store.test.mjs', 'tests/creator-history-wiring.test.mjs', 'tests/history-locks.mjs',
    'scripts/handoff-walkthrough.mjs',
    'dist/archive-activity.js', 'dist/archive-activity-ui.js', 'tests/archive-activity.test.mjs', 'tests/archive-record-log.test.mjs', 'tests/note-labels.test.mjs',
    'dist/storage-guard.js', 'tests/storage-guard.test.mjs',
    'dist/discovery-bridge.js', 'dist/discovery-link.js', 'dist/discovery-ui.mjs', 'dist/discovery.html', 'dist/discovery.mjs', 'tests/discovery-boot.test.mjs', 'tests/discovery-bridge.test.mjs', 'tests/discovery-link.test.mjs', 'tests/discovery-summary.test.mjs',
    'dist/appearance.js', 'dist/archive-companion.css', 'dist/copy-passage.js', 'dist/library-search.html', 'dist/library-search.js', 'dist/skin-format.js', 'dist/skin-gallery.html', 'dist/skin-gallery.js', 'tests/appearance-wiring.test.mjs', 'tests/copy-passage.test.mjs', 'tests/skin-format.test.mjs',
    'dist/downloads.html', 'scripts/package-downloads.html', 'scripts/refresh-downloads.py', 'tests/downloads-manifest.test.mjs',
    'dist/resources/ADOPTION_PROPOSAL.md', 'dist/resources/USER_GUIDE.md', 'dist/resources/PUBLIC_SAFE_FAQ.md',
    'dist/resources/Reckoner_Introduction.pdf', 'dist/resources/Reckoner_Introduction.pptx',
    'tests/package-parity.test.mjs',
    'dist/practice-source.js', 'tests/practice-source.test.mjs', 'dist/backup-files.js', 'tests/backup-files.test.mjs', 'scripts/backup-files-walkthrough.mjs', 'dist/index.html', 'dist/style.css', 'dist/compact-workspace.css', 'dist/compact-workspace.js', 'dist/app.js', 'dist/core.js',
    'dist/archive.js', 'dist/branding.js', 'dist/collaboration.js', 'dist/enhancements.js',
    'dist/limits.js', 'dist/recovery.js', 'dist/search.js', 'dist/save.js', 'dist/example.svg',
    'dist/contexts.js', 'dist/starters.js', 'dist/lens-cache.js', 'dist/facets.js', 'dist/context-ui.js',
    'dist/native-projection.js',
    'LICENSE', 'README.md', 'CONTRIBUTING.md', 'ADOPTION_PROPOSAL.md',
    'USER_TESTING.txt', 'USER_GUIDE.md', 'docs/introduction.pdf', 'docs/introduction.pptx',
    'tests/core.test.mjs', 'tests/compact-workspace.test.mjs', 'tests/compact-layering.test.mjs', 'tests/continue-focus.test.mjs', 'tests/browser-harness.mjs', 'tests/browser-wiring.test.mjs', 'tests/contexts.test.mjs',
    'tests/review-repros.test.mjs', 'tests/native-alignment.test.mjs',
    'MT_COMPATIBILITY.md', 'CONTEXT_FORMAT.md', 'AGENTS.md', 'CLAUDE.md', '.gitattributes',
    'scripts/package-release.py', 'scripts/sync-docs.mjs', 'scripts/browser-walkthrough.mjs',
    'scripts/make-context-fixtures.mjs', 'scripts/discovery-walkthrough.mjs', 'scripts/static-types.mjs',
    'tests/static-types.test.mjs', 'tests/model-response-race.test.mjs', 'tests/discussion-save.test.mjs',
)
# Public fixtures, named one by one. MANIFEST.json must list exactly these.
FIXTURE_DIR = 'tests/fixtures/contexts/'
FIXTURES = (
    'probe-quoted-header-v01.cycl',
    'probe-quoted-header-v01.projection.json',
    'probe-quoted-header-v01.projection.txt',
    'probe-quoted-metadata-v02.cycl',
    'probe-quoted-metadata-v02.native-header.txt',
    'probe-quoted-metadata-v02.projection.json',
    'probe-quoted-metadata-v02.projection.txt',
    'probe-quoted-metadata-v03.cycl',
    'probe-quoted-metadata-v03.native-header.txt',
    'probe-quoted-metadata-v03.projection.json',
    'probe-quoted-metadata-v03.projection.txt',
    'starter-accountable-review.v1.cycl',
    'starter-accountable-review.v2.cycl',
    'starter-estimate-assumptions.v1.cycl',
    'starter-estimate-assumptions.v2.cycl',
    'starter-estimate-assumptions.v2.native-header.txt',
    'starter-estimate-assumptions.v2.projection.json',
    'starter-estimate-assumptions.v2.projection.txt',
    'starter-image-interpretation.v1.cycl',
    'starter-image-interpretation.v2.cycl',
    'starter-literal-transcription.v1.cycl',
    'starter-literal-transcription.v1.projection.json',
    'starter-literal-transcription.v1.projection.txt',
    'starter-literal-transcription.v2.cycl',
)
FILES += (FIXTURE_DIR + 'MANIFEST.json',) + tuple(FIXTURE_DIR + name for name in FIXTURES)

def package(destination):
    listed = json.loads((ROOT / FIXTURE_DIR / 'MANIFEST.json').read_text(encoding='utf-8'))['files']
    if sorted(entry['file'] for entry in listed) != sorted(FIXTURES):
        raise ValueError('The fixture allowlist and MANIFEST.json list different files.')
    content = {}
    for name in FILES:
        path = ROOT / name
        if path.is_symlink() or not path.is_file():
            raise ValueError('Missing regular contribution file: ' + name)
        content[name] = path.read_bytes()
    # The downloaded edition uses an authored, byte-exact page alias. It does
    # not recursively offer its own ZIP or depend on a self-hashing asset list.
    content['dist/downloads.html'] = content['scripts/package-downloads.html']
    manifest = {
        'format': 'garrison.contribution_bundle.v0.1',
        'scope': 'Independent contribution interface and materials; no institutional endorsement.',
        'projections': [{'path': 'dist/downloads.html', 'sourcePath': 'scripts/package-downloads.html',
                         'operation': 'byte_exact_alias',
                         'sha256': hashlib.sha256(content['dist/downloads.html']).hexdigest()}],
        'files': [{'path': name, 'bytes': len(data),
                   'sha256': hashlib.sha256(data).hexdigest()}
                  for name, data in content.items()],
    }
    content['BUNDLE_MANIFEST.json'] = (json.dumps(manifest, indent=2) + '\n').encode()
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_suffix('.tmp')
    try:
        with zipfile.ZipFile(temporary, 'w', compression=zipfile.ZIP_DEFLATED) as bundle:
            for name, data in content.items():
                entry = zipfile.ZipInfo('reckoner/' + name, date_time=(2026, 1, 1, 0, 0, 0))
                entry.compress_type = zipfile.ZIP_DEFLATED
                entry.external_attr = 0o100644 << 16
                bundle.writestr(entry, data)
        with zipfile.ZipFile(temporary) as bundle:
            if bundle.testzip() is not None:
                raise ValueError('Archive integrity check failed.')
            for name, data in content.items():
                if bundle.read('reckoner/' + name) != data:
                    raise ValueError('Packaged bytes differ: ' + name)
        temporary.replace(destination)
    finally:
        temporary.unlink(missing_ok=True)
    print(json.dumps({'bundle': str(destination), 'files': len(content),
                      'sha256': hashlib.sha256(destination.read_bytes()).hexdigest()}))

if __name__ == '__main__':
    package(ROOT / '.build' / 'Reckoner_Contribution_Review.zip')
