// Loads a Google Font family stylesheet on demand via the CSS2 API. We only
// need the font files for preview; downloads redirect to Google (see todo §6).

import { useEffect, useState } from "react";

const loaded = new Set<string>();
// Which concrete weights we've already requested per static family, so a later
// weight switch appends the missing cut instead of being skipped by the guard.
const loadedWeights = new Map<string, Set<number>>();

/**
 * Preview font-family chain. The second slot switches on load state so the two
 * "missing glyph" cases look different:
 * - `isLoaded === false` (family still downloading): fall back to Adobe Blank,
 *   which renders every codepoint empty, so the preview stays blank instead of
 *   flashing NotDef boxes for the whole string.
 * - `isLoaded === true` (family ready): fall back to Adobe NotDef, so a genuine
 *   missing glyph shows as a visible .notdef box.
 * sans-serif is the last resort if neither fallback face is available.
 */
export function previewFontFamily(name: string, isLoaded = true): string {
  const fallback = isLoaded ? "Adobe NotDef" : "Adobe Blank";
  return `"${name}", "${fallback}", sans-serif`;
}

/**
 * Track whether a preview family's web font has actually loaded, so callers can
 * pick the right fallback (Blank while loading, NotDef once ready). Uses the
 * CSS Font Loading API; assumes loaded during SSR / when unsupported.
 */
export function useFontLoaded(name: string): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined" || !document.fonts) {
      setReady(true);
      return;
    }
    let cancelled = false;
    // `check` needs a size+family; a nominal 16px is enough to query the set.
    const probe = `16px "${name}"`;
    if (document.fonts.check(probe)) {
      setReady(true);
      return;
    }
    setReady(false);
    document.fonts
      .load(probe)
      .then(() => {
        if (!cancelled) setReady(document.fonts.check(probe));
      })
      .catch(() => {
        if (!cancelled) setReady(true); // don't get stuck on Blank if load errors
      });
    return () => {
      cancelled = true;
    };
  }, [name]);

  return ready;
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

  // Only request weights we haven't already loaded for this family. Without this
  // the per-family guard would skip a later weight switch, so the new cut never
  // arrives and the browser stays on the previously loaded weight.
  const seen = loadedWeights.get(family) ?? new Set<number>();
  const missing = [...new Set(weights.filter((w) => w > 0))]
    .filter((w) => !seen.has(w))
    .sort((a, b) => a - b);

  // Nothing new to fetch, and the family (or a prior weight) is already loaded.
  if (!missing.length && (loaded.has(family) || seen.size > 0)) return;

  loaded.add(family);
  for (const w of missing) seen.add(w);
  loadedWeights.set(family, seen);

  const uniq = [...seen].sort((a, b) => a - b);
  const spec =
    uniq.length > 0
      ? `${encodeFamily(family)}:wght@${uniq.join(";")}`
      : encodeFamily(family);

  appendLink(`https://fonts.googleapis.com/css2?family=${spec}&display=block`);
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
  axes: { tag: string; min: number | null; max: number | null }[],
  hasItalic = false
) {
  if (typeof document === "undefined") return;
  const key = `range:${family}`;
  if (loaded.has(key)) return;
  loaded.add(key);

  const registered = axes
    .filter((a) => /^[a-z]{4}$/.test(a.tag) && a.min != null && a.max != null)
    .sort((a, b) => a.tag.localeCompare(b.tag));

  // css2 wants the `ital` dimension expressed as a tuple prefix: with an italic
  // cut we request both ital=0 (upright) and ital=1 so the tester can switch.
  // Albert Sans-style families expose italic as a separate VF file, which css2
  // still serves under ital=1. Tags must be listed alphabetically; `ital` sorts
  // before the lowercase axes, so it leads the tuple.
  let spec = encodeFamily(family);
  if (hasItalic || registered.length) {
    const dims = [
      ...(hasItalic ? [{ tag: "ital", values: "0;1" }] : []),
      ...registered.map((a) => ({ tag: a.tag, values: `${a.min}..${a.max}` })),
    ];
    if (hasItalic) {
      // With ital present, every dimension becomes a tuple axis: css2 needs a
      // cartesian list. Build `ital,<tags>@<t0>,<r0>...` by pairing ital's two
      // states with the full axis ranges.
      const tags = dims.map((d) => d.tag).join(",");
      const upright = dims
        .map((d) => (d.tag === "ital" ? "0" : d.values))
        .join(",");
      const italic = dims
        .map((d) => (d.tag === "ital" ? "1" : d.values))
        .join(",");
      spec = `${spec}:${tags}@${upright};${italic}`;
    } else {
      const tags = registered.map((a) => a.tag).join(",");
      const ranges = registered.map((a) => `${a.min}..${a.max}`).join(",");
      spec = `${spec}:${tags}@${ranges}`;
    }
  }
  appendLink(`https://fonts.googleapis.com/css2?family=${spec}&display=block`);
  // Plain fallback in case the range spec is rejected for some family.
  appendLink(
    `https://fonts.googleapis.com/css2?family=${encodeFamily(family)}&display=block`
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
