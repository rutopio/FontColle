// Loads a Google Font family stylesheet on demand via the CSS2 API. We only
// need the font files for preview; downloads redirect to Google Fonts.

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
    const settle = () => {
      if (!cancelled) setReady(document.fonts.check(probe));
    };

    if (document.fonts.check(probe)) {
      setReady(true);
      return;
    }
    setReady(false);
    // Kick a direct load, but don't rely on its resolution alone: the @font-face
    // that actually renders this family is injected by ensureFontLoaded /
    // ensureFontRangeLoaded as a <link>, which registers into document.fonts a
    // beat later. A load(probe) fired before that link is parsed can resolve
    // with check() still false, leaving the preview stuck on Adobe Blank with
    // nothing to re-check it. Listening for `loadingdone` re-checks every time a
    // font finishes — including the family's own link — so the preview flips to
    // ready as soon as the real cut lands, whenever that link arrives.
    document.fonts
      .load(probe)
      .then(settle)
      .catch(() => {
        // Don't get stuck on Blank if the direct load rejects outright; show
        // the family (NotDef boxes for any genuinely missing glyph).
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
 * `weights` are the concrete weight values we want to preview (from the
 * family's named instances). We request exactly those so each weight button
 * maps to a real cut, requesting a made-up axis tuple 404s and silently falls
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
 * Load a family as a VARIABLE file: request the *full* range of every axis it
 * declares (wght/wdth/opsz plus custom tags like MORF/GRAD) so both the
 * detail-page tester and the list's sidebar sliders can move across the whole
 * space. Requesting the ranges is what guarantees css2 serves the variable
 * file — the bare `?family=<name>` form yields a static instance instead.
 * Tags must be listed lowercase-before-uppercase, alphabetical within each
 * group (see axisSortKey).
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

  // Every axis with a real range, not just the registered lowercase ones. css2
  // accepts custom uppercase tags too (verified against MORF/EDPT/EHLT), and
  // asking for them is what makes the variable file explicit: a family whose
  // only axes are custom (Kablammo/MORF, Nabla/EDPT+EHLT, 13 in the catalog)
  // would otherwise fall through to the bare `?family=<name>` form, the exact
  // request css2 answers with a static single-instance face.
  //
  // css2 requires tags sorted lowercase-before-uppercase, each group
  // alphabetical, so sort on that key rather than a plain localeCompare.
  const variableAxes = axes
    .filter(
      (a) => /^[a-zA-Z]{4}$/.test(a.tag) && a.min != null && a.max != null
    )
    .sort((a, b) => axisSortKey(a.tag).localeCompare(axisSortKey(b.tag)));

  // css2 wants the `ital` dimension expressed as a tuple prefix: with an italic
  // cut we request both ital=0 (upright) and ital=1 so the tester can switch.
  // Albert Sans-style families expose italic as a separate VF file, which css2
  // still serves under ital=1. Tags must be listed alphabetically; `ital` sorts
  // before the lowercase axes, so it leads the tuple.
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
      const tags = variableAxes.map((a) => a.tag).join(",");
      const ranges = variableAxes.map((a) => `${a.min}..${a.max}`).join(",");
      spec = `${spec}:${tags}@${ranges}`;
    }
  }
  // The plain `?family=<name>` form is a fallback ONLY, never appended
  // alongside: css2 answers it with a static single-instance face (font-weight:
  // 400, no axis ranges) under the same family name. Appended unconditionally it
  // came second and won the cascade, so the browser rendered a file with no axes
  // and font-variation-settings had nothing to act on — the sidebar's opsz/wght
  // sliders moved nothing in the list, while the detail tester (which never
  // loaded that second sheet) worked.
  //
  // It still has to exist: a few catalog entries are marked variable but have no
  // such axis upstream (Capriola), or the family was retired, and css2 answers
  // the range spec with 400. Waiting for the error keeps the static face out of
  // the cascade in the normal case while still rendering *something* there.
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
// Prefixing the case makes one localeCompare produce that order.
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
