"""Rebuild the attendee copy of the review bundle in dist/resources and its
entry in ASSET_MANIFEST.json. With --check, change nothing: report whether
the copy and every manifest entry match a fresh build and the files present.
Run in the repository; a downloaded bundle carries neither file."""
from pathlib import Path
import hashlib
import json
import runpy
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
RESOURCES = ROOT / 'dist' / 'resources'
MANIFEST = RESOURCES / 'ASSET_MANIFEST.json'
BUNDLE = 'Reckoner_Contribution_Review.zip'


def replace_bytes(path, data):
    temporary = path.with_name(path.name + '.tmp')
    try:
        temporary.write_bytes(data)
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)


def main(check):
    if not MANIFEST.is_file():
        raise SystemExit('No dist/resources/ASSET_MANIFEST.json here. Run this in the repository, not in a downloaded bundle.')
    doc_problems = []
    for name in ('USER_GUIDE.md', 'PUBLIC_SAFE_FAQ.md', 'ADOPTION_PROPOSAL.md'):
        source = (ROOT / name).read_bytes()
        target = RESOURCES / name
        if not target.is_file() or target.read_bytes() != source:
            if check:
                doc_problems.append(name + ' resource differs from authoritative root document')
            else:
                replace_bytes(target, source)
    package = runpy.run_path(str(ROOT / 'scripts' / 'package-release.py'))['package']
    (ROOT / '.build').mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(dir=ROOT / '.build') as folder:
        built = Path(folder) / BUNDLE
        package(built)
        fresh = built.read_bytes()
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    problems, entries = doc_problems, []
    present = (RESOURCES / BUNDLE).read_bytes() if (RESOURCES / BUNDLE).is_file() else None
    if present != fresh:
        problems.append(BUNDLE + ' differs from a fresh build')
    for entry in manifest['files']:
        data = fresh if entry['file'] == BUNDLE else (RESOURCES / entry['file']).read_bytes()
        pin = {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
        if entry['bytes'] != pin['bytes'] or entry['sha256'] != pin['sha256']:
            problems.append(entry['file'] + ' has a stale manifest entry')
        entries.append({**entry, **pin})
    listed = {entry['file'] for entry in manifest['files']}
    unlisted = sorted(p.name for p in RESOURCES.iterdir() if p.is_file() and p.name not in listed and p != MANIFEST)
    if unlisted:
        problems.append('not listed in the manifest: ' + ', '.join(unlisted))
    if check:
        print(json.dumps({'current': not problems, 'problems': problems, 'bundleSha256': hashlib.sha256(fresh).hexdigest()}))
        return 1 if problems else 0
    if unlisted:
        raise SystemExit('List these resources in ASSET_MANIFEST.json first: ' + ', '.join(unlisted))
    replace_bytes(RESOURCES / BUNDLE, fresh)
    replace_bytes(MANIFEST, (json.dumps({**manifest, 'files': entries}, indent=2) + '\n').encode())
    print(json.dumps({'refreshed': BUNDLE, 'bytes': len(fresh), 'sha256': hashlib.sha256(fresh).hexdigest(),
                      'next': 'node scripts/sync-docs.mjs'}))
    return 0


if __name__ == '__main__':
    sys.exit(main('--check' in sys.argv[1:]))
