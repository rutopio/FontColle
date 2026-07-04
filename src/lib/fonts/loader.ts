// Loads a Google Font family stylesheet on demand via the CSS2 API. We only
// need the font files for preview; downloads redirect to Google (see todo §6).

const loaded = new Set<string>();

/**
 * Preview font-family chain: the family, then Adobe NotDef so any codepoint the
 * family lacks renders as a visible .notdef box (registered in styles.css),
 * then sans-serif as a last resort.
 */
export function previewFontFamily(name: string): string {
  return `"${name}", "Adobe NotDef", sans-serif`;
}

/**
 * Inject a <link> to the Google Fonts CSS2 stylesheet for a family.
 *
 * `weights` are the concrete weight values we want to preview (from the
 * family's named instances). We request exactly those so each weight button
 * maps to a real cut — requesting a made-up axis tuple 404s and silently falls
 * back to a single default weight, which is why 100–400 looked identical.
 */
export function ensureFontLoaded(family: string, weights: number[]) {
  if (typeof document === "undefined") return;
  if (loaded.has(family)) return;
  loaded.add(family);

  const uniq = [...new Set(weights.filter((w) => w > 0))].sort((a, b) => a - b);
  const spec =
    uniq.length > 0
      ? `${encodeFamily(family)}:wght@${uniq.join(";")}`
      : encodeFamily(family);

  appendLink(`https://fonts.googleapis.com/css2?family=${spec}&display=swap`);
}

/**
 * Load a family for the detail-page tester: request the *full* range of each
 * registered axis (wght/wdth/opsz/…) so sliders can move across the whole space.
 * css2 needs the axes listed alphabetically with lowercase-before-uppercase
 * tags; we only send registered lowercase axes it accepts (custom axes like GRAD
 * still animate via font-variation-settings on the variable file css2 returns).
 */
export function ensureFontRangeLoaded(
  family: string,
  axes: { tag: string; min: number | null; max: number | null }[]
) {
  if (typeof document === "undefined") return;
  const key = `range:${family}`;
  if (loaded.has(key)) return;
  loaded.add(key);

  const registered = axes
    .filter((a) => /^[a-z]{4}$/.test(a.tag) && a.min != null && a.max != null)
    .sort((a, b) => a.tag.localeCompare(b.tag));

  let spec = encodeFamily(family);
  if (registered.length) {
    const tags = registered.map((a) => a.tag).join(",");
    const ranges = registered.map((a) => `${a.min}..${a.max}`).join(",");
    spec = `${spec}:${tags}@${ranges}`;
  }
  appendLink(`https://fonts.googleapis.com/css2?family=${spec}&display=swap`);
  // Plain fallback in case the range spec is rejected for some family.
  appendLink(
    `https://fonts.googleapis.com/css2?family=${encodeFamily(family)}&display=swap`
  );
}

function encodeFamily(family: string) {
  return family.trim().replace(/\s+/g, "+");
}

function appendLink(href: string) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}
