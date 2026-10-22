"""Check static local links and module dependencies; no network or source downloads.
Usage: python3 scripts/check-site.py [dist-directory]
Does not verify a live host's MIME headers, permissions or external URLs.
"""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import json, re, sys

class References(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
    def handle_starttag(self, tag, attrs):
        for key, value in attrs:
            if value and ((key == 'href' and tag in ('a', 'link')) or
                          (key == 'src' and tag in ('script', 'img', 'iframe'))):
                self.links.append(value)

def check(root):
    root = Path(root).resolve()
    if not root.is_dir():
        raise ValueError('Choose an existing static site directory')
    checked, problems = 0, []
    for source in sorted(root.glob('*')):
        refs = []
        if source.suffix == '.html':
            parser = References()
            parser.feed(source.read_text(encoding='utf-8'))
            refs = parser.links
        elif source.suffix in ('.js', '.mjs'):
            # Literal relative imports only; computed imports need browser tests.
            refs = re.findall(r'''(?:from\s*|import\s*\(\s*|import\s*)['"](\.[^'"]+)['"]''', source.read_text(encoding='utf-8'))
        for ref in refs:
            url = urlsplit(ref)
            if url.scheme or url.netloc or not url.path:
                continue
            checked += 1
            target = (source.parent / unquote(url.path)).resolve()
            if not target.is_relative_to(root) or not target.is_file():
                problems.append({'page': source.name, 'reference': ref,
                                 'problem': 'Missing local file or reference outside served directory'})
    return {'localReferencesChecked': checked, 'problems': problems,
            'scope': 'Static local files only; no live host, external URL or computed-import verification'}

if __name__ == '__main__':
    result = check(sys.argv[1] if len(sys.argv) > 1 else Path(__file__).resolve().parents[1] / 'dist')
    print(json.dumps(result, indent=2))
    sys.exit(bool(result['problems']))
