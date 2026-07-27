// The name and description live in site-meta.ts, which is import-free so the
// build scripts can read it too, and are re-exported here for app code.
import { SITE_NAME } from "./site-meta";

export { SITE_DESCRIPTION, SITE_NAME } from "./site-meta";

export function pageTitle(page?: string): string {
  return page ? `${page} - ${SITE_NAME}` : SITE_NAME;
}

// Empty when VITE_SITE_URL is unset, so the SEO tags that need an absolute URL
// degrade to nothing rather than emit a wrong domain.
export const SITE_URL = (import.meta.env.VITE_SITE_URL ?? "")
  .toString()
  .replace(/\/+$/, "");

/** undefined when SITE_URL is unset, so callers omit the tag entirely. */
export function absoluteUrl(path: string): string | undefined {
  if (!SITE_URL) return undefined;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
