// Plain site metadata strings, with no imports and no import.meta.env access.
// Split out of site.ts on purpose: scripts/gen-sitemap.mjs runs under bare node
// (before vite build, via build.mjs), where import.meta.env does not exist, so
// it cannot import site.ts. Node's type stripping lets that script import this
// module directly, replacing the copy it used to hand-mirror. Keep this file
// free of imports and env access so both sides can read it.

export const SITE_NAME = "FontColle";

export const SITE_DESCRIPTION =
  "FontColle is an enhanced Google Fonts Collection that filters by what " +
  "type actually does: OpenType features, variable axes, weight and width " +
  "steps, writing systems, and color vs. monochrome. Save the ones you like.";
