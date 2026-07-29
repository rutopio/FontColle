import { useCallback, useSyncExternalStore } from "react";

const loaded = new Set<string>();
const loadedWeights = new Map<string, Set<number>>();

/** Adobe Blank hides glyphs while loading; Adobe NotDef shows genuinely missing ones. */
export function previewFontFamily(name: string, isLoaded = true): string {
  const fallback = isLoaded ? "Adobe NotDef" : "Adobe Blank";
  return `"${name}", "${fallback}", sans-serif`;
}

/** Families known ready, so check() runs once per family instead of once per subscriber. */
const readyFamilies = new Set<string>();
const watchers = new Map<string, Set<() => void>>();
let listening = false;

/** Keyed by family *and* weight, so a row needing 700 is not reported ready by
 *  an earlier row's 400: check() only answers "can some face of this family
 *  render". The list previews at a single weight today, but the detail page
 *  does not, and the cost is one Set entry per weight. */
function keyFor(name: string, weight: number) {
  return `${name}@${weight}`;
}

function probeFor(name: string, weight: number) {
  return `${weight} 16px "${name}"`;
}

/** check() means "renderable without loading anything new", which is true for
 *  a family that has NO @font-face at all — it just resolves to a system font.
 *  Mid-fling a row subscribes before its css2 <link> has registered any rules,
 *  so check() said yes, the skeleton swapped to text, and the chain was already
 *  on NotDef while the real font had not begun downloading: the boxes that
 *  flashed before the real face appeared. Requiring a registered face for the
 *  family keeps the row on Adobe Blank until there is something real to wait
 *  for. */
function hasFaces(name: string) {
  for (const face of document.fonts) {
    if (face.family === name) return true;
  }
  return false;
}

function canPaint(name: string, weight: number) {
  return hasFaces(name) && document.fonts.check(probeFor(name, weight));
}

/** One document.fonts listener for the whole app: a per-row listener makes every
 *  loadingdone event O(rows), and each check() forces a style flush mid-scroll. */
function onLoadingDone() {
  for (const [key, callbacks] of watchers) {
    if (readyFamilies.has(key)) continue;
    const { name, weight } = parseKey(key);
    if (!canPaint(name, weight)) continue;
    readyFamilies.add(key);
    for (const cb of callbacks) cb();
  }
}

function parseKey(key: string) {
  const at = key.lastIndexOf("@");
  return { name: key.slice(0, at), weight: Number(key.slice(at + 1)) };
}

function markReady(key: string) {
  if (readyFamilies.has(key)) return;
  readyFamilies.add(key);
  pursuing.delete(key);
  for (const cb of watchers.get(key) ?? []) cb();
}

/** Keys with a retry in flight, so N rows of one family share one chase. */
const pursuing = new Set<string>();

/** How long a row may sit on the skeleton before it gives up and shows text.
 *  A stuck skeleton is worse than a brief fallback: the row would otherwise
 *  stay blank forever if the stylesheet 404s or the face never registers. */
const GIVE_UP_MS = 3000;
const RETRY_MS = 100;

/** load() resolves immediately — with an empty list — for a family that has no
 *  @font-face yet, so a single call cannot settle a row that subscribed before
 *  its css2 <link> registered. loadingdone does not help either: it may have
 *  already fired for that stylesheet. So keep asking, the way font-face
 *  observers do, until the face can paint or the deadline passes. */
function pursue(key: string, name: string, weight: number) {
  if (pursuing.has(key)) return;
  pursuing.add(key);

  const deadline = Date.now() + GIVE_UP_MS;

  const attempt = () => {
    if (readyFamilies.has(key)) return;
    // Nobody is watching this key any more (rows scrolled away).
    if (!watchers.has(key)) {
      pursuing.delete(key);
      return;
    }
    if (canPaint(name, weight)) {
      markReady(key);
      return;
    }
    if (Date.now() >= deadline) {
      // Out of time: let the text through rather than hold the skeleton.
      markReady(key);
      return;
    }
    // Re-issue load(): once the faces exist this is what actually starts them.
    document.fonts
      .load(probeFor(name, weight))
      .then(() => {
        if (canPaint(name, weight)) markReady(key);
        else setTimeout(attempt, RETRY_MS);
      })
      .catch(() => markReady(key));
  };

  attempt();
}

function subscribeFamily(name: string, weight: number, onChange: () => void) {
  if (typeof document === "undefined" || !document.fonts) return () => {};

  const key = keyFor(name, weight);
  const callbacks = watchers.get(key) ?? new Set<() => void>();
  callbacks.add(onChange);
  watchers.set(key, callbacks);

  if (!listening) {
    listening = true;
    document.fonts.addEventListener("loadingdone", onLoadingDone);
  }

  if (!readyFamilies.has(key)) {
    if (canPaint(name, weight)) markReady(key);
    else pursue(key, name, weight);
  }

  return () => {
    const set = watchers.get(key);
    if (!set) return;
    set.delete(onChange);
    if (set.size === 0) watchers.delete(key);
  };
}

export function useFontLoaded(name: string, weight = 400): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => subscribeFamily(name, weight, onChange),
    [name, weight]
  );
  const getSnapshot = useCallback(
    () => readyFamilies.has(keyFor(name, weight)),
    [name, weight]
  );
  // Server has no document.fonts; render the loaded chain to avoid a hydration flip.
  return useSyncExternalStore(subscribe, getSnapshot, () => true);
}

/** Internals exposed for tests: the subscription bookkeeping is the part that
 *  regressed, and it is verifiable without a DOM. */
export const __loaderInternals = {
  subscribeFamily,
  isReady: (name: string, weight = 400) =>
    readyFamilies.has(keyFor(name, weight)),
  watcherCount: (name: string, weight = 400) =>
    watchers.get(keyFor(name, weight))?.size ?? 0,
  familyCount: () => watchers.size,
  reset() {
    if (listening && typeof document !== "undefined" && document.fonts) {
      document.fonts.removeEventListener("loadingdone", onLoadingDone);
    }
    listening = false;
    readyFamilies.clear();
    watchers.clear();
    pursuing.clear();
    loaded.clear();
    loadedWeights.clear();
  },
};

export function ensureFontLoaded(family: string, weights: number[]) {
  if (typeof document === "undefined") return;

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

/** Request full axis ranges so css2 serves the variable file, not a static instance. */
export function ensureFontRangeLoaded(
  family: string,
  axes: { tag: string; min: number | null; max: number | null }[],
  hasItalic = false
) {
  if (typeof document === "undefined") return;
  const key = `range:${family}`;
  if (loaded.has(key)) return;
  loaded.add(key);

  // css2 requires lowercase tags before uppercase, then alphabetical.
  const variableAxes = axes
    .filter(
      (a) => /^[a-zA-Z]{4}$/.test(a.tag) && a.min != null && a.max != null
    )
    .sort((a, b) => axisSortKey(a.tag).localeCompare(axisSortKey(b.tag)));

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

function axisSortKey(tag: string): string {
  return `${/^[a-z]/.test(tag) ? "0" : "1"}${tag}`;
}

function appendLink(href: string, onError?: () => void) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  if (onError) link.addEventListener("error", onError, { once: true });
  document.head.appendChild(link);
}
