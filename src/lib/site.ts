import { SITE_NAME } from "./site-meta";

export {
  ABOUT_DESCRIPTION_REST,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_NAME_PRONUNCIATION,
} from "./site-meta";

export const REPO_URL = "https://github.com/rutopio/FontColle";

export function pageTitle(page?: string): string {
  return page ? `${page} - ${SITE_NAME}` : SITE_NAME;
}

export const SITE_URL = (import.meta.env.VITE_SITE_URL ?? "")
  .toString()
  .replace(/\/+$/, "");

export function absoluteUrl(path: string): string | undefined {
  if (!SITE_URL) return undefined;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
