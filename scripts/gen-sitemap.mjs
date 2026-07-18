// Generates public/sitemap.xml from the font catalog at build time.
//
// The ~2000 per-font pages are this site's long-tail; without a sitemap they're
// effectively invisible to crawlers. One <url> for the home page plus one per
// published family, pointing at its canonical specimen tab (matching the
// canonical tag in the detail route head).
//
// Needs an absolute origin. When VITE_SITE_URL is unset we skip generation
// rather than emit a sitemap full of relative or wrong-domain URLs — the build
// still succeeds, just without a sitemap until a production domain is set.

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

// Kept in sync with src/lib/site.ts (that module reads import.meta.env, so it
// can't be imported from a plain node script). llms.txt reuses the same summary.
const SITE_NAME = "FontColle";
const SITE_DESCRIPTION =
  "A Google Fonts alternative that filters by real OpenType features, variable " +
  "axes, weight, writing systems, and color — preview any weight and save favorites.";

// Mirror src/lib/fonts/slug.ts fontSlug: spaces -> underscores (case kept).
const fontSlug = (name) => name.replace(/ /g, "_");

// A font's last-modified date as a W3C-valid YYYY-MM-DD, or undefined when the
// record carries no usable date. Prefer the reharvest timestamp (modifiedMs,
// epoch ms); fall back to dateAdded (present for every published family).
const lastmodOf = (f) => {
  if (typeof f.modifiedMs === "number" && Number.isFinite(f.modifiedMs)) {
    return new Date(f.modifiedMs).toISOString().slice(0, 10);
  }
  if (
    typeof f.dateAdded === "string" &&
    /^\d{4}-\d{2}-\d{2}/.test(f.dateAdded)
  ) {
    return f.dateAdded.slice(0, 10);
  }
  return undefined;
};

const xmlEscape = (s) =>
  s.replace(
    /[<>&'"]/g,
    (c) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        "'": "&apos;",
        '"': "&quot;",
      })[c]
  );

export async function genSitemap() {
  const siteUrl = (process.env.VITE_SITE_URL ?? "").replace(/\/+$/, "");
  if (!siteUrl) {
    console.log("[sitemap] VITE_SITE_URL unset — skipping sitemap generation.");
    return;
  }

  const raw = await readFile(path.join(ROOT, "src/data/fonts.json"), "utf8");
  const data = JSON.parse(raw);
  const fonts = Array.isArray(data) ? data : (data.fonts ?? []);

  const published = fonts.filter((f) => f?.name);

  // Per-font <url> entries, each with a <lastmod> derived from real data. The
  // home page's lastmod is the max across all fonts (the catalog's freshness),
  // omitted if no font has a usable date.
  const fontEntries = published.map((f) => ({
    loc: `${siteUrl}/specimen/${fontSlug(f.name)}`,
    lastmod: lastmodOf(f),
  }));
  const maxLastmod = fontEntries.reduce(
    (max, e) => (e.lastmod && e.lastmod > max ? e.lastmod : max),
    ""
  );
  const entries = [
    { loc: `${siteUrl}/`, lastmod: maxLastmod || undefined },
    ...fontEntries,
  ];

  const body = entries
    .map(
      (e) =>
        `  <url><loc>${xmlEscape(e.loc)}</loc>${
          e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ""
        }</url>`
    )
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;

  await writeFile(path.join(ROOT, "public/sitemap.xml"), xml, "utf8");

  // Point robots.txt at the sitemap (idempotent: rewrite the Sitemap line).
  const robotsPath = path.join(ROOT, "public/robots.txt");
  let robots = await readFile(robotsPath, "utf8");
  robots = robots.replace(/\n?Sitemap:.*\n?$/i, "\n").trimEnd();
  robots += `\n\nSitemap: ${siteUrl}/sitemap.xml\n`;
  await writeFile(robotsPath, robots, "utf8");

  // Emit public/llms.txt (llms.txt convention: H1 name, blockquote summary,
  // then sections) so LLM agents can discover the machine-readable catalog and
  // the per-font URL scheme without scraping the UI. Gated on siteUrl like the
  // sitemap; rewritten wholesale each build so it stays idempotent.
  const llms = `# ${SITE_NAME}

> ${SITE_DESCRIPTION}

${SITE_NAME} is a web app for browsing and comparing open-source Google Fonts families, with filtering by real OpenType features, variable axes, weight, writing systems, and color.

## Data

- [Full catalog](${siteUrl}/catalog.json): the complete catalog as a machine-readable JSON array of font records (FontRecord[]). No authentication required.
- [Sitemap](${siteUrl}/sitemap.xml): enumerates every page, including one canonical URL per font family.

## Per-font pages

Each family has a canonical specimen page at \`${siteUrl}/specimen/<id>\`, where \`<id>\` is the family name with spaces replaced by underscores (e.g. \`${siteUrl}/specimen/Roboto_Slab\`).

## Notes

- This site hosts no font files. All downloads redirect to Google Fonts; ${SITE_NAME} is a discovery and comparison layer over the Google Fonts catalog.
`;
  await writeFile(path.join(ROOT, "public/llms.txt"), llms, "utf8");

  console.log(`[sitemap] wrote ${entries.length} URLs to public/sitemap.xml`);
  console.log("[sitemap] wrote public/llms.txt");
}

// Allow running standalone: `node scripts/gen-sitemap.mjs`.
if (import.meta.url === `file://${process.argv[1]}`) {
  await genSitemap();
}
