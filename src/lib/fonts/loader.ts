import { useCallback, useSyncExternalStore } from "react";

const loaded = new Set<string>();
const loadedWeights = new Map<string, Set<number>>();

/** Adobe Blank hides glyphs while loading; Adobe NotDef shows genuinely missing ones. */
export function previewFontFamily(name: string, isLoaded = true): string {
  const fallback = isLoaded ? "Adobe NotDef" : "Adobe Blank";
  return `"${name}", "${fallback}", sans-serif`;
}

const readyFamilies = new Set<string>();
const watchers = new Map<string, Set<() => void>>();
let listening = false;

/**
 * The default probe text. check()/load() default to a single space, which only
 * ever exercises the latin face.
 */
const DEFAULT_PROBE_TEXT = " ";

interface Probe {
  name: string;
  weight: number;
  text: string;
}

/** Key parts are NUL-joined and text goes last, so any preview text is safe. */
function keyFor(name: string, weight: number, text: string) {
  return `${weight}\u0000${name}\u0000${text}`;
}

/** Descriptors by key, so readiness never has to parse a key back apart. */
const probes = new Map<string, Probe>();

function probeFor(name: string, weight: number) {
  return `${weight} 16px "${name}"`;
}

/** check() says "renderable" even without @font-face; require registered faces first. */
function hasFaces(name: string) {
  for (const face of document.fonts) {
    if (face.family === name) return true;
  }
  return false;
}

/**
 * Whether the family can paint `text` right now.
 *
 * The text argument is the whole point: a css2 stylesheet splits one family
 * across many unicode-range faces (latin, latin-ext, vietnamese, cyrillic, and
 * dozens more for CJK), and check() only reports on the faces the given text
 * actually needs. Probing with the default single space answered for the latin
 * face alone, so a family went "loaded" — flipping the chain from Adobe Blank
 * to Adobe NotDef — while the subsets covering the rest of the sentence were
 * still downloading, and those characters painted as NotDef boxes until they
 * arrived. Characters no face covers do not block: check() has nothing to wait
 * for, so genuinely missing glyphs still resolve to NotDef, as intended.
 */
function canPaint(name: string, weight: number, text: string) {
  return hasFaces(name) && document.fonts.check(probeFor(name, weight), text);
}

/**
 * Memoized canPaint for keys not yet known ready, so getSnapshot stays cheap
 * and a re-probe (new preview text) does not paint one frame of Adobe Blank
 * over text whose faces are already loaded. Dropped whenever fonts finish.
 */
const paintCache = new Map<string, boolean>();

function isReady(key: string, probe: Probe): boolean {
  if (readyFamilies.has(key)) return true;
  const cached = paintCache.get(key);
  if (cached !== undefined) return cached;
  const painted = canPaint(probe.name, probe.weight, probe.text);
  paintCache.set(key, painted);
  if (painted) readyFamilies.add(key);
  return painted;
}

/** Single document.fonts listener shared app-wide. */
function onLoadingDone() {
  paintCache.clear();
  for (const [key, callbacks] of watchers) {
    if (readyFamilies.has(key)) continue;
    const probe = probes.get(key);
    if (!probe) continue;
    if (!canPaint(probe.name, probe.weight, probe.text)) continue;
    readyFamilies.add(key);
    for (const cb of callbacks) cb();
  }
}

function markReady(key: string) {
  if (readyFamilies.has(key)) return;
  readyFamilies.add(key);
  pursuing.delete(key);
  for (const cb of watchers.get(key) ?? []) cb();
}

/** Keys with a retry in flight, so N rows of one family share one chase. */
const pursuing = new Set<string>();

/** Max skeleton wait before showing fallback text. */
const GIVE_UP_MS = 3000;
const RETRY_MS = 100;

/** Retries until the face can paint or the deadline passes. */
function pursue(key: string, probe: Probe) {
  if (pursuing.has(key)) return;
  pursuing.add(key);

  const { name, weight, text } = probe;
  const deadline = Date.now() + GIVE_UP_MS;

  const attempt = () => {
    if (readyFamilies.has(key)) return;
    // Nobody is watching this key any more (rows scrolled away).
    if (!watchers.has(key)) {
      pursuing.delete(key);
      return;
    }
    if (canPaint(name, weight, text)) {
      markReady(key);
      return;
    }
    if (Date.now() >= deadline) {
      // Out of time: let the text through rather than hold the skeleton.
      markReady(key);
      return;
    }
    // Passing the text also narrows the request to the subsets it needs.
    document.fonts
      .load(probeFor(name, weight), text)
      .then(() => {
        if (canPaint(name, weight, text)) markReady(key);
        else setTimeout(attempt, RETRY_MS);
      })
      .catch(() => markReady(key));
  };

  attempt();
}

function subscribeFamily(
  name: string,
  weight: number,
  onChange: () => void,
  text: string = DEFAULT_PROBE_TEXT
) {
  if (typeof document === "undefined" || !document.fonts) return () => {};

  const key = keyFor(name, weight, text);
  const probe: Probe = { name, weight, text };
  probes.set(key, probe);
  const callbacks = watchers.get(key) ?? new Set<() => void>();
  callbacks.add(onChange);
  watchers.set(key, callbacks);

  if (!listening) {
    listening = true;
    document.fonts.addEventListener("loadingdone", onLoadingDone);
  }

  if (!readyFamilies.has(key)) {
    if (canPaint(name, weight, text)) markReady(key);
    else pursue(key, probe);
  }

  return () => {
    const set = watchers.get(key);
    if (!set) return;
    set.delete(onChange);
    if (set.size === 0) {
      watchers.delete(key);
      probes.delete(key);
    }
  };
}

export function useFontLoaded(
  name: string,
  weight = 400,
  text: string = DEFAULT_PROBE_TEXT
): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => subscribeFamily(name, weight, onChange, text),
    [name, weight, text]
  );
  const getSnapshot = useCallback(
    () => isReady(keyFor(name, weight, text), { name, weight, text }),
    [name, weight, text]
  );
  // Server has no document.fonts; render the loaded chain to avoid a hydration flip.
  return useSyncExternalStore(subscribe, getSnapshot, () => true);
}

/** Internals exposed for tests. */
export const __loaderInternals = {
  subscribeFamily,
  isReady: (name: string, weight = 400, text = DEFAULT_PROBE_TEXT) =>
    readyFamilies.has(keyFor(name, weight, text)),
  watcherCount: (name: string, weight = 400, text = DEFAULT_PROBE_TEXT) =>
    watchers.get(keyFor(name, weight, text))?.size ?? 0,
  familyCount: () => watchers.size,
  reset() {
    if (listening && typeof document !== "undefined" && document.fonts) {
      document.fonts.removeEventListener("loadingdone", onLoadingDone);
    }
    listening = false;
    readyFamilies.clear();
    watchers.clear();
    probes.clear();
    paintCache.clear();
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
