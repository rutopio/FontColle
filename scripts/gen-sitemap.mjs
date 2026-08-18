import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { SITE_DESCRIPTION, SITE_NAME } from "../src/lib/site-meta.ts";

const ROOT = path.resolve(import.meta.dirname, "..");

const fontSlug = (name) => name.replace(/ /g, "_");

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

const vocab = (fonts, pick) => {
  const seen = new Set();
  for (const f of fonts) {
    const v = pick(f);
    if (Array.isArray(v)) for (const x of v) x != null && seen.add(x);
    else if (v != null) seen.add(v);
  }
  return [...seen].sort();
};

const classificationsBySection = (fonts) => {
  const bySection = new Map();
  for (const path of vocab(fonts, (f) => Object.keys(f.tags ?? {}))) {
    const [, section, subtag] = path.split("/");
    if (!section || !subtag) continue;
    if (!bySection.has(section)) bySection.set(section, []);
    bySection.get(section).push(subtag);
  }
  return bySection;
};

function buildLlmsTxt(siteUrl, fonts) {
  const categories = vocab(fonts, (f) => f.category);
  const licenses = vocab(fonts, (f) => f.license);
  const scripts = vocab(fonts, (f) => f.scripts);
  const features = vocab(fonts, (f) => f.features);
  const facets = vocab(fonts, (f) => f.facets);
  const axes = vocab(fonts, (f) => (f.axes ?? []).map((a) => a.tag));
  const colorTables = vocab(fonts, (f) => f.colorTables);
  const weights = vocab(fonts, (f) => f.weights);
  const widths = vocab(fonts, (f) => f.widthClass);
  const sections = classificationsBySection(fonts);
  const scored = fonts.filter((f) => Object.keys(f.tags ?? {}).length).length;

  const REGISTERED_AXES = ["wght", "wdth", "opsz", "slnt", "ital", "GRAD"];
  const customAxes = axes.filter((a) => !REGISTERED_AXES.includes(a));

  const sectionLine = ([name, subtags]) =>
    `- **${name}**: ${subtags.map((s) => `\`${s}\``).join(" ")}`;
  const code = (xs) => xs.map((x) => `\`${x}\``).join(" ");

  return `# ${SITE_NAME}

> ${SITE_DESCRIPTION}

${SITE_NAME} is a web app for browsing and comparing ${fonts.length.toLocaleString("en-US")} open-source Google Fonts families. Every family carries harvested font-binary data (axes, features, metrics) plus Google's own classification scores, so questions like "a playful variable sans" or "a high-contrast serif that supports Devanagari" are answerable from the data alone.

## Data

- [Slim catalog](${siteUrl}/catalog-slim.json) (~2 MB): **start here.** A JSON array of every published family, projected to the fields queries actually filter and rank on. Fits in a large context window.
- [Full catalog](${siteUrl}/catalog.json) (~13 MB): the complete \`FontRecord[]\`, adding per-axis ranges, named instances, per-family language lists, and about/version prose. Use only when the slim catalog lacks a field you need.
- [Per-font record](${siteUrl}/catalog/<id>.json): one full \`FontRecord\`, e.g. \`/catalog/roboto_slab.json\`. Here \`<id>\` is the lowercased family name with spaces removed.
- [Designer index](${siteUrl}/designer-index.json): \`{id, name, designer}[]\`, for grouping families by designer.
- [Sitemap](${siteUrl}/sitemap.xml): one canonical URL per font family.

No authentication, no rate limit.

## Answering a style question

The \`tags\` object is what makes subjective queries answerable. Worked example, **"a variable sans that feels joyful"**:

\`\`\`js
const fonts = await (await fetch("${siteUrl}/catalog-slim.json")).json();
fonts
  .filter(f => f.isVariable && f.category === "Sans")
  .map(f => ({ f, score: (f.tags["/Expressive/Happy"] ?? 0) + (f.tags["/Expressive/Playful"] ?? 0) }))
  .sort((a, b) => b.score - a.score)
  .slice(0, 10);
\`\`\`

Then link the user to \`${siteUrl}/instances/<Family_Name>\` for each result, and to the equivalent filtered list (see "Linking to a filtered list").

## Slim catalog fields

| Field | Type | Notes |
|---|---|---|
| \`id\` | string | Catalog slug, lowercased, spaces removed |
| \`name\` | string | Family name as Google publishes it |
| \`designer\` | string \\| null | May list several designers, comma-separated |
| \`category\` | string | ${code(categories)}. Letterform only — advance width is the separate Spacing dimension below |
| \`apiCategory\` | string | Google's own coarser category (\`SANS_SERIF\` \`MONOSPACE\`, …). Backs Spacing for the families the classification CSV has not reached |
| \`license\` | string | ${licenses.map((l) => `\`${l}\``).join(" \\| ")} |
| \`isVariable\` | boolean | True when the family ships a variable font |
| \`isMonospace\` | boolean | From the post table's \`isFixedPitch\`. Unreliable for finding monospace families (wrong in both directions) — use the Spacing dimension instead |
| \`isNoto\` | boolean | Part of the Noto superfamily |
| \`weights\` | number[] | Standard weight steps present: ${weights.join(", ")} |
| \`widthClass\` | number | OS/2 usWidthClass, ${widths[0]} (narrowest) – ${widths.at(-1)} |
| \`unitsPerEm\` | number | Em size; needed to turn the raw metrics below into ratios |
| \`axes\` | string[] | Variable axis tags. Registered: ${code(REGISTERED_AXES)}. Plus ${customAxes.length} custom axes (${code(customAxes.slice(0, 4))}, …) |
| \`features\` | string[] | OpenType feature tags, e.g. ${code(["liga", "smcp", "ss01"])}. ${features.length} distinct across the catalog |
| \`facets\` | string[] | Plain-language derived tags, see below |
| \`subsets\` | string[] | Google Fonts subsets, e.g. ${code(["latin", "latin-ext", "cyrillic"])} |
| \`scripts\` | string[] | ISO 15924 codes with real cmap coverage. More precise than \`subsets\` |
| \`colorTables\` | string[] | Color tables present: ${code(colorTables)}. Empty means monochrome |
| \`glyphCount\` | number | Glyphs in the primary font file |
| \`fileSize\` | number | Bytes of the primary font file |
| \`contrast\` | number \\| null | Thick/thin stroke ratio at regular weight. ~1.0 is monolinear; 4+ is a high-contrast Didone |
| \`xHeight\` \`capHeight\` \`avgCharWidth\` | number | Raw font units. Divide by \`unitsPerEm\` for the comparable ratio |
| \`popularityRank\` \`trendingRank\` | number \\| null | 1 = most popular / most trending. \`null\` = unranked |
| \`dateAdded\` | string | ISO date the family joined Google Fonts |
| \`repositoryUrl\` | string \\| null | Upstream source repo |
| \`vendorId\` | string | OS/2 achVendID, the foundry code |
| \`tags\` | object | Classification scores, see below |

### \`tags\` — classification scores (the style vocabulary)

Google's own classification of each family, as \`{"/Section/Subtag": score}\` where **score is 0–100**. An absent key means 0. The site's UI treats **>= 50** as "this font is that thing"; for ranking, use the raw scores. ${scored.toLocaleString("en-US")} of ${fonts.length.toLocaleString("en-US")} families are scored.

${[...sections].map(sectionLine).join("\n")}

The **Expressive** section is the one subjective queries want. Mapping plain words to tags: *joyful / fun* → \`Happy\` + \`Playful\`; *serious / corporate* → \`Business\` + \`Competent\`; *elegant / luxury* → \`Sophisticated\` + \`Fancy\`; *retro* → \`Vintage\`; *kids* → \`Childlike\` + \`Cute\`; *sci-fi* → \`Futuristic\` + \`Techno\`. **Quality** scores are craft ratings, not style.

### \`facets\` — derived plain-language tags

Boolean membership tags derived from axes, features, and subsets:

${code(facets)}

## Every filterable dimension

The site's own filter UI exposes exactly these, and all are computable from the slim catalog.

| Dimension | Values | Combine |
|---|---|---|
| Text query | matches family name and designer | — |
| Category | ${code(categories)} (letterform only) | OR |
| Spacing | \`proportional\` \\| \`mono\` | radio |
| Facet | the \`facets\` list above | AND |
| OpenType feature | any of ${features.length} tags (${code(["liga", "smcp", "ss01", "zero"])}, …) | AND |
| Variable axis | ${code(REGISTERED_AXES)} + ${customAxes.length} custom | AND |
| Weight | ${weights.join(" ")} | OR |
| Width | ${widths.join(" ")} (usWidthClass) | OR |
| Writing system | ${scripts.length} ISO 15924 codes: ${code(scripts)} | AND |
| Language | ~2,000 ids like \`en_Latn\`, \`zh_Hant\` (full catalog's per-family \`languages\`) | AND |
| Color | \`color\` \\| \`monochrome\` | radio |
| Color format | ${code(colorTables)} | AND |
| Classification | any \`/Section/Subtag\` path above; matches when score >= 50 | OR |
| Designer | any name in \`designer\` | OR |
| Vendor | \`vendorId\` foundry codes | OR |
| License | ${code(licenses)} | OR |
| Repository host | \`github\` \`gitlab\` \`sourcehut\` \`none\` | OR |
| Repo updated | \`3m\` \`6m\` \`1y\` \`3y\` \`cold\` (over 3y) \`unknown\` (not tracked), from the last commit on the family's own upstream repo | OR |
| Repo status | \`live\` \`archived\` | radio |
| Source | \`noto\` \\| \`others\` | radio |
| Italic | \`italic\` \\| \`upright\` | radio |
| Units per em | \`1000\` \`2048\` and ~35 other values | OR |
| Hinting | hinted \\| unhinted | radio |
| x-height ratio | 0.10–0.90 (\`xHeight / unitsPerEm\`) | range |
| Cap-height ratio | 0.20–1.10 (\`capHeight / unitsPerEm\`) | range |
| Line-height ratio | 0.90–2.50 (ascender − descender + gap, over em) | range |
| Avg width ratio | 0.20–1.20 (\`avgCharWidth / unitsPerEm\`) | range |
| Contrast | 1.0–8.5 (\`contrast\`) | range |
| File size | 16 KB – 64 MB (\`fileSize\`) | range |

Sort keys: \`popularity\` (default) \`trending\` \`name-asc\` \`name-desc\` \`creator-asc\` \`creator-desc\` \`date-newest\` \`date-oldest\` \`glyphs-most\` \`glyphs-fewest\` \`axes-most\` \`axes-fewest\`.

## Linking to a filtered list

Filters live in the URL of \`${siteUrl}/\`, so a query can be handed back to the user as a link. List params join with \`_\`; \`lang\` and \`dsr\` join with \`,\`.

| Param | Dimension | Example |
|---|---|---|
| \`q\` | text query | \`q=roboto\` |
| \`class\` | class | \`class=Sans_Serif\` |
| \`spacing\` | spacing | \`spacing=mono\` |
| \`facet\` | facets | \`facet=variable_small-caps\` |
| \`feature\` | features | \`feature=liga_zero\` |
| \`axis\` | axes | \`axis=wght_opsz\` |
| \`weight\` \`width\` | weight / width steps | \`weight=700_900\` |
| \`script\` | writing systems | \`script=Latn_Grek\` |
| \`lang\` | languages | \`lang=en_Latn,ja_Jpan\` |
| \`color\` \`cfmt\` | color / color formats | \`color=color\`, \`cfmt=COLR\` |
| \`cls\` | classification paths, \`/\` written as \`.\` | \`cls=Expressive.Playful_Sans.Rounded\` |
| \`dsr\` \`vnd\` \`lic\` | designer / vendor / license | \`lic=OFL\` |
| \`repo\` \`activity\` \`repoStatus\` \`flag\` \`ital\` \`upm\` \`hint\` | repo host / repo updated / repo status / source / italic / upm / hinting | \`activity=3m_6m\`, \`repoStatus=live\`, \`ital=upright\`, \`hint=1\` |
| \`mxh\` \`mch\` \`mlh\` \`maw\` \`mct\` \`mfs\` | metric ranges, \`lo-hi\` | \`mxh=0.45-0.55\`, \`mct=3-8.5\` |

Sort order is a per-device preference kept in \`localStorage\`, not a URL parameter, so a shared link carries the filters but not the sender's ordering.

So the worked example above links to:
\`${siteUrl}/?class=Sans&facet=variable&cls=Expressive.Playful_Expressive.Happy\`

## Per-font pages

Each family has a canonical instances page at \`${siteUrl}/instances/<name>\`, where \`<name>\` is the family name with spaces replaced by underscores, original casing kept (e.g. \`${siteUrl}/instances/Roboto_Slab\`). Note this differs from the catalog \`id\`, which is lowercased with spaces removed.

## Notes

- This site hosts no font files. All downloads redirect to Google Fonts; ${SITE_NAME} is a discovery and comparison layer over the Google Fonts catalog.
- Every family is open-source and free for commercial use, under ${licenses.join(", ")}.
- Data is regenerated from the upstream Google Fonts repo and the font binaries themselves.
`;
}

export async function genSitemap() {
  const siteUrl = (process.env.VITE_SITE_URL ?? "").replace(/\/+$/, "");
  if (!siteUrl) {
    console.log("[sitemap] VITE_SITE_URL unset, skipping sitemap generation.");
    return;
  }

  const raw = await readFile(path.join(ROOT, "src/data/fonts.json"), "utf8");
  const data = JSON.parse(raw);
  const fonts = Array.isArray(data) ? data : (data.fonts ?? []);

  const published = fonts.filter((f) => f?.name && (f.isPublished ?? true));

  const fontEntries = published.map((f) => ({
    loc: `${siteUrl}/instances/${fontSlug(f.name)}`,
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

  const robotsPath = path.join(ROOT, "public/robots.txt");
  let robots = await readFile(robotsPath, "utf8");
  robots = robots.replace(/\n?Sitemap:.*\n?$/i, "\n").trimEnd();
  robots += `\n\nSitemap: ${siteUrl}/sitemap.xml\n`;
  await writeFile(robotsPath, robots, "utf8");

  await writeFile(
    path.join(ROOT, "public/llms.txt"),
    buildLlmsTxt(siteUrl, published),
    "utf8"
  );

  console.log(`[sitemap] wrote ${entries.length} URLs to public/sitemap.xml`);
  console.log("[sitemap] wrote public/llms.txt");
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await genSitemap();
}
