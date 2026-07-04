// Loads a Google Font family stylesheet on demand via the CSS2 API. We only
// need the font files for preview; downloads redirect to Google (see todo §6).

const loaded = new Set<string>();

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

function encodeFamily(family: string) {
  return family.trim().replace(/\s+/g, "+");
}

function appendLink(href: string) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}
