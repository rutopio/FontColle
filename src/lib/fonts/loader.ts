// Loads a Google Font family stylesheet on demand via the CSS2 API. We only
// need the font files for preview; downloads redirect to Google (see todo §6).

import { useEffect, useState } from "react";

const loaded = new Set<string>();

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
  if (loaded.has(family)) return;
  loaded.add(family);

  const uniq = [...new Set(weights.filter((w) => w > 0))].sort((a, b) => a - b);
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
