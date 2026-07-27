// Loads a Google Font family stylesheet on demand via the CSS2 API.

import { useEffect, useState } from "react";

const loaded = new Set<string>();
// Concrete weights already requested per static family, so a later weight
// switch appends the missing cut instead of being skipped by the guard.
const loadedWeights = new Map<string, Set<number>>();

/**
 * Preview font-family chain. The fallback switches on load state so the two
 * "missing glyph" cases look different: Adobe Blank renders every codepoint
 * empty, keeping the preview blank while the family downloads instead of
 * flashing NotDef boxes; Adobe NotDef then shows genuinely missing glyphs.
 */
export function previewFontFamily(name: string, isLoaded = true): string {
  const fallback = isLoaded ? "Adobe NotDef" : "Adobe Blank";
  return `"${name}", "${fallback}", sans-serif`;
}

/**
 * Whether a preview family's web font has loaded, so callers can pick the right
 * fallback. Assumes loaded during SSR / when the Font Loading API is missing.
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
    const settle = () => {
      if (!cancelled) setReady(document.fonts.check(probe));
    };

    if (document.fonts.check(probe)) {
      setReady(true);
      return;
    }
    setReady(false);
    // Don't rely on load()'s resolution alone: the @font-face is injected as a
    // <link>, which registers into document.fonts a beat later, so a load()
    // fired before that can resolve with check() still false and strand the
    // preview on Adobe Blank. `loadingdone` re-checks whenever the link lands.
    document.fonts
      .load(probe)
      .then(settle)
      .catch(() => {
        // Don't get stuck on Blank if the direct load rejects outright.
        if (!cancelled) setReady(true);
      });
    document.fonts.addEventListener("loadingdone", settle);
    return () => {
      cancelled = true;
      document.fonts.removeEventListener("loadingdone", settle);
    };
  }, [name]);

  return ready;
}

/**
 * Inject a <link> to the Google Fonts CSS2 stylesheet for a family.
 *
 * `weights` must be concrete values from the family's named instances: a
 * made-up axis tuple 404s and silently falls back to one default weight, so
 * every requested cut would render identically.
 */
export function ensureFontLoaded(family: string, weights: number[]) {
  if (typeof document === "undefined") return;

  // Only the weights not already loaded: the per-family guard alone would skip
  // a later weight switch, leaving the browser on the cut it already has.
  const seen = loadedWeights.get(family) ?? new Set<number>();
  const missing = [...new Set(weights.filter((w) => w > 0))]
    .filter((w) => !seen.has(w))
    .sort((a, b) => a - b);

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
 * Load a family as a VARIABLE file: request the *full* range of every axis it
 * declares, so the tester and the sidebar sliders can move across the whole
 * space. Requesting the ranges is what guarantees css2 serves the variable
 * file — the bare `?family=<name>` form yields a static instance instead.
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

  // Custom uppercase tags count too (verified against MORF/EDPT/EHLT): 13
  // catalog families have only custom axes, and skipping those would drop them
  // to the bare `?family=<name>` form and its static single-instance face.
  // css2 requires tags sorted lowercase-before-uppercase, each group
  // alphabetical, hence axisSortKey rather than a plain localeCompare.
  const variableAxes = axes
    .filter(
      (a) => /^[a-zA-Z]{4}$/.test(a.tag) && a.min != null && a.max != null
    )
    .sort((a, b) => axisSortKey(a.tag).localeCompare(axisSortKey(b.tag)));

  // css2 wants `ital` as a tuple prefix: request both ital=0 and ital=1 so the
  // tester can switch. `ital` sorts before the lowercase axes, so it leads.
  let spec = encodeFamily(family);
  if (hasItalic || variableAxes.length) {
    const dims = [
      ...(hasItalic ? [{ tag: "ital", values: "0;1" }] : []),
      ...variableAxes.map((a) => ({
        tag: a.tag,
        values: `${a.min}..${a.max}`,
      })),
    ];
    if (hasItalic) {
      // With ital present every dimension becomes a tuple axis, so css2 needs
      // a cartesian list: pair ital's two states with the full axis ranges.
      const tags = dims.map((d) => d.tag).join(",");
      const upright = dims
        .map((d) => (d.tag === "ital" ? "0" : d.values))
        .join(",");
      const italic = dims
        .map((d) => (d.tag === "ital" ? "1" : d.values))
        .join(",");
      spec = `${spec}:${tags}@${upright};${italic}`;
    } else {
      const tags = variableAxes.map((a) => a.tag).join(",");
      const ranges = variableAxes.map((a) => `${a.min}..${a.max}`).join(",");
      spec = `${spec}:${tags}@${ranges}`;
    }
  }
  // The plain `?family=<name>` form is an on-error fallback ONLY, never
  // appended alongside: css2 answers it with a static single-instance face
  // under the same family name, which would win the cascade and leave
  // font-variation-settings with no axes to act on.
  //
  // It still has to exist: a few entries are marked variable but have no axes
  // upstream (Capriola), or were retired, and css2 rejects the range spec.
  appendLink(
    `https://fonts.googleapis.com/css2?family=${spec}&display=block`,
    () =>
      appendLink(
        `https://fonts.googleapis.com/css2?family=${encodeFamily(family)}&display=block`
      )
  );
}

function encodeFamily(family: string) {
  return family.trim().replace(/\s+/g, "+");
}

// css2 rejects a spec whose axis tags aren't sorted lowercase-first, then
// alphabetically within each case group ("opsz,wght,GRAD", never "GRAD,opsz").
function axisSortKey(tag: string): string {
  return `${/^[a-z]/.test(tag) ? "0" : "1"}${tag}`;
}

function appendLink(href: string, onError?: () => void) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  // A stylesheet <link> fires `error` when the response isn't usable CSS, which
  // is how a rejected axis spec (css2 400s it) reaches us.
  if (onError) link.addEventListener("error", onError, { once: true });
  document.head.appendChild(link);
}
