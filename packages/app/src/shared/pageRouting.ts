// Page selection: this app has no router. `resolvePage()` reads either a `?page=` query param
// or the last path segment (GitHub Pages serves this app under a subpath, e.g.
// `/dyel-visualizer/team`, and locally-hosted deep links land here too). `siteRootPath()` is the
// inverse: given the current location, it strips off whatever known page path was matched so
// in-app links can navigate back to the true site root regardless of how deep the current page's
// path is — plain dot-relative hrefs (`href="."`) break for multi-segment paths like
// `/team/summary` because the browser resolves them based on path depth/trailing-slash, not the
// app's actual root.

export const KNOWN_PAGES = new Set([
  'conjugate',
  'index',
  'validator',
  'pipeline-validation',
  'team',
  'coach',
  'team-summary',
]);

// Checked before the single-segment fallback in both resolvePage() and siteRootPath(): matched by
// suffix (not equality) because GitHub Pages serves this app under a subpath (e.g.
// /dyel-visualizer/team/summary), and /team/summary's last segment ("summary") isn't itself in
// KNOWN_PAGES.
const TEAM_SUMMARY_SUFFIX = '/team/summary';

export function resolvePage(): string | null {
  const queryPage = new URLSearchParams(window.location.search).get('page');
  if (queryPage) {
    return queryPage;
  }
  if (window.location.pathname.replace(/\/$/, '').endsWith(TEAM_SUMMARY_SUFFIX)) {
    return 'team-summary';
  }
  const lastSegment = window.location.pathname.split('/').filter(Boolean).pop() ?? '';
  return KNOWN_PAGES.has(lastSegment) ? lastSegment : null;
}

export function siteRootPath(): string {
  const path = window.location.pathname.replace(/\/$/, '');
  if (path.endsWith(TEAM_SUMMARY_SUFFIX)) {
    return `${path.slice(0, -TEAM_SUMMARY_SUFFIX.length)}/`;
  }
  const lastSegment = path.split('/').filter(Boolean).pop() ?? '';
  if (KNOWN_PAGES.has(lastSegment)) {
    return `${path.slice(0, -(lastSegment.length + 1))}/`;
  }
  return `${path}/`;
}
