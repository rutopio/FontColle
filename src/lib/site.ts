// Site-wide metadata defaults, shared by the root head and per-page overrides.
export const SITE_NAME = "FontColle";

export const SITE_DESCRIPTION =
  "A Google Fonts alternative that filters by real OpenType features, variable " +
  "axes, weight, writing systems, and color — preview any weight and save favorites.";

/** Compose a page title as "Page - FontColle"; bare name for the home page. */
export function pageTitle(page?: string): string {
  return page ? `${page} - ${SITE_NAME}` : SITE_NAME;
}
