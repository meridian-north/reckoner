// Run before the module scripts so the source, draft key and example navigation
// agree on the initial route. Never replace a saved review with teaching data.
(() => {
  const url = new URL(location.href);
  if (url.search || url.hash || !/\/(?:index\.html)?$/.test(url.pathname)) return;
  try {
    const storage = localStorage;
    const raw = storage.getItem('garrison-cairn-workspace-v01');
    if (raw !== null) {
      const saved = JSON.parse(raw);
      if (!saved || saved.schema !== 'garrison.cairn.receipt.v0.1' ||
          !saved.context || !saved.draft || saved.sourceImage || saved.activeRevisionId) return;
      const collections = ['revisions', 'reviews', 'connections', 'modelRuns', 'resolutions',
        'contextDefinitions', 'contextEvents', 'assertions', 'assertionReviews'];
      if (collections.some(key => saved[key] !== undefined &&
          (!Array.isArray(saved[key]) || saved[key].length))) return;
      if (Object.values(saved.context).some(value => value !== '')) return;
      if (Object.entries(saved.draft).some(([key, value]) =>
          key === 'uncertainty' ? value !== 'not_assessed' : value !== '')) return;
    }
    const last = storage.getItem('reckoner-last-review-url-v1');
    if (last) {
      const previous = new URL(last);
      const task = previous.searchParams.get('practice');
      const session = previous.searchParams.get('practiceSession');
      if (previous.origin !== url.origin || previous.pathname !== new URL('index.html', url).pathname ||
          previous.hash || [...previous.searchParams.keys()].some(key => !['practice', 'practiceSession'].includes(key)) ||
          !/^[a-z-]+$/.test(task || '') || !/^[a-f0-9-]{36}$/.test(session || '') ||
          storage.getItem('reckoner-practice:' + task + ':' + session) === null) return;
      history.replaceState(history.state, '', previous.href);
      return;
    }
    url.pathname = new URL('index.html', url).pathname;
    url.searchParams.set('practice', 'notice-date');
    url.searchParams.set('practiceSession', crypto.randomUUID());
    history.replaceState(history.state, '', url.href);
  } catch {
    // Unreadable or unavailable storage must keep the recovery/manual-open path.
  }
})();
