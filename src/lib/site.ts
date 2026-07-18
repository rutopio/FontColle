// Site-wide metadata defaults, shared by the root head and per-page overrides.
export const SITE_NAME = "FontColle";

export const SITE_DESCRIPTION =
  "A Google Fonts alternative that filters by real OpenType features, variable " +
  "axes, weight, writing systems, and color, preview any weight and save favorites.";

/** Compose a page title as "Page - FontColle"; bare name for the home page. */
export function pageTitle(page?: string): string {
  return page ? `${page} - ${SITE_NAME}` : SITE_NAME;
}

// Production origin (no trailing slash), from VITE_SITE_URL. Empty when unset:
// SEO features that need absolute URLs (canonical, og:url, sitemap, JSON-LD)
// degrade gracefully rather than emit a wrong domain. Set it in .env for prod.
export const SITE_URL = (import.meta.env.VITE_SITE_URL ?? "")
  .toString()
  .replace(/\/+$/, "");

/** Absolute URL for a site-relative path, or undefined when SITE_URL is unset
 *  (so callers can omit the tag instead of emitting a relative/wrong one). */
export function absoluteUrl(path: string): string | undefined {
  if (!SITE_URL) return undefined;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
