// Loads a Google Font family stylesheet on demand via the CSS2 API. We only
// need the font files for preview; downloads redirect to Google (see todo §6).

const loaded = new Set<string>();

/**
 * Inject a <link> to the Google Fonts CSS2 stylesheet for a family.
 * Requests the full variable range when the family is variable so any weight /
 * axis value can be previewed (pain point 4).
 */
export function ensureFontLoaded(family: string, isVariable: boolean) {
  if (typeof document === "undefined") return;
  const key = family;
  if (loaded.has(key)) return;
  loaded.add(key);

  const spec = isVariable
    ? // ask for the widest common axis range; Google clamps to what exists
      `${encodeFamily(family)}:ital,opsz,wght@0,6..144,1..1000`
    : encodeFamily(family);

  // Primary request; if the variable spec 404s the browser just skips it, so
  // we also queue a plain fallback that always resolves.
  appendLink(`https://fonts.googleapis.com/css2?family=${spec}&display=swap`);
  if (isVariable) {
    appendLink(
      `https://fonts.googleapis.com/css2?family=${encodeFamily(family)}&display=swap`
    );
  }
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
