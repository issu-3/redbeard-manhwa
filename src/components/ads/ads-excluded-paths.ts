// Owner decision (2026-11-11): the global ad scripts (Adsterra
// pop-under + social bar, Monetag site tag) must NOT run on the auth
// pages or anywhere in the admin panel — the pop-under hijacked
// clicks on the login form. Everywhere else they run as before.
//
// Note: this gates injection at page load. A script already loaded
// earlier in the same browser session cannot be unloaded by
// third-party code, so the protection is exact for sessions that
// start on an excluded page (the usual admin/login entry pattern).
const ADS_EXCLUDED_PATHS = ['/login', '/register'];

export function isAdsExcludedPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return ADS_EXCLUDED_PATHS.includes(pathname) || pathname.startsWith('/admin');
}
