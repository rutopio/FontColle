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

function probeFor(name: string) {
  return `16px "${name}"`;
}

/** One document.fonts listener for the whole app: a per-row listener makes every
 *  loadingdone event O(rows), and each check() forces a style flush mid-scroll. */
function onLoadingDone() {
  for (const [name, callbacks] of watchers) {
    if (readyFamilies.has(name)) continue;
    if (!document.fonts.check(probeFor(name))) continue;
    readyFamilies.add(name);
    for (const cb of callbacks) cb();
  }
}

function markReady(name: string) {
  if (readyFamilies.has(name)) return;
  readyFamilies.add(name);
  for (const cb of watchers.get(name) ?? []) cb();
}

function subscribeFamily(name: string, onChange: () => void) {
  if (typeof document === "undefined" || !document.fonts) return () => {};

  const callbacks = watchers.get(name) ?? new Set<() => void>();
  callbacks.add(onChange);
  watchers.set(name, callbacks);

  if (!listening) {
    listening = true;
    document.fonts.addEventListener("loadingdone", onLoadingDone);
  }

  if (!readyFamilies.has(name)) {
    if (document.fonts.check(probeFor(name))) {
      markReady(name);
    } else {
      // load() can resolve before check() turns true if the @font-face link registers late.
      document.fonts
        .load(probeFor(name))
        .then(() => {
          if (document.fonts.check(probeFor(name))) markReady(name);
        })
        .catch(() => markReady(name));
    }
  }

  return () => {
    const set = watchers.get(name);
    if (!set) return;
    set.delete(onChange);
    if (set.size === 0) watchers.delete(name);
  };
}

export function useFontLoaded(name: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => subscribeFamily(name, onChange),
    [name]
  );
  const getSnapshot = useCallback(() => readyFamilies.has(name), [name]);
  // Server has no document.fonts; render the loaded chain to avoid a hydration flip.
  return useSyncExternalStore(subscribe, getSnapshot, () => true);
}

/** Internals exposed for tests: the subscription bookkeeping is the part that
 *  regressed, and it is verifiable without a DOM. */
export const __loaderInternals = {
  subscribeFamily,
  isReady: (name: string) => readyFamilies.has(name),
  watcherCount: (name: string) => watchers.get(name)?.size ?? 0,
  familyCount: () => watchers.size,
  reset() {
    if (listening && typeof document !== "undefined" && document.fonts) {
      document.fonts.removeEventListener("loadingdone", onLoadingDone);
    }
    listening = false;
    readyFamilies.clear();
    watchers.clear();
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
