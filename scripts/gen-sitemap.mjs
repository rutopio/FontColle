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

// Mirror src/lib/fonts/slug.ts fontSlug: spaces -> underscores (case kept).
const fontSlug = (name) => name.replace(/ /g, "_");

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

  const urls = [
    `${siteUrl}/`,
    ...fonts
      .filter((f) => f?.name)
      .map((f) => `${siteUrl}/specimen/${fontSlug(f.name)}`),
  ];

  const body = urls
    .map((u) => `  <url><loc>${xmlEscape(u)}</loc></url>`)
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;

  await writeFile(path.join(ROOT, "public/sitemap.xml"), xml, "utf8");

  // Point robots.txt at the sitemap (idempotent: rewrite the Sitemap line).
  const robotsPath = path.join(ROOT, "public/robots.txt");
  let robots = await readFile(robotsPath, "utf8");
  robots = robots.replace(/\n?Sitemap:.*\n?$/i, "\n").trimEnd();
  robots += `\n\nSitemap: ${siteUrl}/sitemap.xml\n`;
  await writeFile(robotsPath, robots, "utf8");

  console.log(`[sitemap] wrote ${urls.length} URLs to public/sitemap.xml`);
}

// Allow running standalone: `node scripts/gen-sitemap.mjs`.
if (import.meta.url === `file://${process.argv[1]}`) {
  await genSitemap();
}
