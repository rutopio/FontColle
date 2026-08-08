import { useCallback, useSyncExternalStore } from "react";

const loaded = new Set<string>();
const loadedWeights = new Map<string, Set<number>>();

/**
 * The fallback follows the notdef toggle alone, never load state: missing glyphs
 * are hidden by default, and only an explicit opt-in boxes them as notdef.
 */
export function previewFontFamily(name: string, showNotdef = false): string {
  const fallback = showNotdef ? "Adobe NotDef" : "Adobe Blank";
  return `"${name}", "${fallback}", sans-serif`;
}

const readyFamilies = new Set<string>();
const watchers = new Map<string, Set<() => void>>();
let listening = false;

const DEFAULT_PROBE_TEXT = " ";

interface Probe {
  name: string;
  weight: number;
  text: string;
}

function keyFor(name: string, weight: number, text: string) {
  return `${weight}\u0000${name}\u0000${text}`;
}

const probes = new Map<string, Probe>();

function probeFor(name: string, weight: number) {
  return `${weight} 16px "${name}"`;
}

function hasFaces(name: string) {
  for (const face of document.fonts) {
    if (face.family === name) return true;
  }
  return false;
}

/** Whether fonts.check reports all faces needed for `text` are loaded. */
function canPaint(name: string, weight: number, text: string) {
  return hasFaces(name) && document.fonts.check(probeFor(name, weight), text);
}

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

const pursuing = new Set<string>();
const GIVE_UP_MS = 3000;
const RETRY_MS = 100;

function pursue(key: string, probe: Probe) {
  if (pursuing.has(key)) return;
  pursuing.add(key);

  const { name, weight, text } = probe;
  const deadline = Date.now() + GIVE_UP_MS;

  const attempt = () => {
    if (readyFamilies.has(key)) return;
    if (!watchers.has(key)) {
      pursuing.delete(key);
      return;
    }
    if (canPaint(name, weight, text)) {
      markReady(key);
      return;
    }
    if (Date.now() >= deadline) {
      markReady(key);
      return;
    }
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

/** True while `name` still has an unresolved gap-face pass. */
export function useGapSettling(name: string): boolean {
  return useSyncExternalStore(
    subscribeGapSettled,
    () => isGapSettling(name),
    () => false
  );
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
  return useSyncExternalStore(subscribe, getSnapshot, () => true);
}

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

export function ensureFontRangeLoaded(
  family: string,
  axes: { tag: string; min: number | null; max: number | null }[],
  hasItalic = false
) {
  if (typeof document === "undefined") return;
  const key = `range:${family}`;
  if (loaded.has(key)) return;
  loaded.add(key);

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

// A lone combining mark has no advance of its own, so it can only be measured as
// part of its cluster. Fallback is per-cluster too: if the family misses the mark,
// the browser re-renders the whole cluster (base included) in the fallback font.
const CLUSTER_RE = /\P{M}\p{M}*|\p{M}+/gu;

/** Compares rendered widths against NotDef to detect truly missing glyphs. */
function unpaintableCharacters(family: string, text: string): string[] {
  const el = document.createElement("span");
  el.setAttribute("aria-hidden", "true");
  el.style.cssText =
    "position:absolute;left:-9999px;top:0;font-size:100px;white-space:pre";
  document.body.appendChild(el);
  try {
    const widthIn = (fontFamily: string, unit: string) => {
      el.style.fontFamily = fontFamily;
      el.textContent = unit;
      return el.getBoundingClientRect().width;
    };
    const missing = new Set<string>();
    for (const unit of new Set(text.match(CLUSTER_RE) ?? [])) {
      // Probe through the fallback, the way the preview itself paints: measuring
      // the family alone would let a system font supply the mark and hide the gap.
      const notdef = widthIn('"Adobe NotDef"', unit);
      const withFamily = widthIn(`"${family}", "Adobe NotDef"`, unit);
      if (Math.abs(withFamily - notdef) < 0.5) missing.add(unit);
    }
    return [...missing];
  } finally {
    el.remove();
  }
}

const requestedText = new Set<string>();

function familyDescriptors(family: string) {
  for (const face of document.fonts) {
    if (face.family !== family || face.style !== "normal") continue;
    return { weight: face.weight, stretch: face.stretch };
  }
  return null;
}

function parseFaces(css: string): { weight: string; url: string }[] {
  const out: { weight: string; url: string }[] = [];
  for (const block of css.split("@font-face")) {
    const url = /src:\s*url\((https:\/\/[^)]+)\)/.exec(block)?.[1];
    if (!url) continue;
    out.push({
      weight: /font-weight:\s*([^;]+);/.exec(block)?.[1]?.trim() ?? "400",
      url,
    });
  }
  return out;
}

function familyWeightRange(family: string): [number, number] | null {
  const range = familyDescriptors(family)?.weight;
  const parts = range?.trim().split(/\s+/).map(Number);
  if (!parts || parts.some(Number.isNaN)) return null;
  if (parts.length === 1) return [parts[0], parts[0]];
  return [parts[0], parts[1]];
}

/**
 * Registers supplemental faces with matching weight/stretch descriptors,
 * because linking the stylesheet alone loses to the variable family's broader range.
 */
async function addGapFace(family: string, chars: string) {
  const descriptors = familyDescriptors(family);
  const weights = familyWeightRange(family);
  const axis =
    weights && weights[0] !== weights[1]
      ? `:wght@${weights[0]}..${weights[1]}`
      : "";
  const res = await fetch(
    `https://fonts.googleapis.com/css2?family=${encodeFamily(family)}${axis}&text=${encodeURIComponent(chars)}`
  );
  if (!res.ok) return;
  const faces = parseFaces(await res.text());
  if (faces.length === 0) return;

  // `chars` may hold whole clusters, so this walks every codepoint in them: the
  // face has to claim the combining marks as well, not just the base letters.
  const wanted = new Set<number>();
  for (const c of chars) wanted.add(c.codePointAt(0) as number);
  const unicodeRange = [...wanted]
    .map((cp) => `U+${cp.toString(16)}`)
    .join(",");

  await Promise.all(
    faces.map(async ({ weight, url }) => {
      const face = new FontFace(family, `url(${url})`, {
        unicodeRange,
        weight,
        stretch: descriptors?.stretch ?? "100%",
        display: "block",
      });
      document.fonts.add(await face.load());
    })
  );
}

// A family whose gap pass has not settled yet still paints partial text, so the
// preview keeps it hidden until then. `fonts.check` cannot stand in for this: it
// answers "is loading pending", not "does this family cover the text", and returns
// true even for a family that does not exist.
const settling = new Map<string, number>();
const settleWatchers = new Set<() => void>();

function notifySettled() {
  for (const cb of settleWatchers) cb();
}

function beginSettling(family: string) {
  settling.set(family, (settling.get(family) ?? 0) + 1);
}

function endSettling(family: string) {
  const next = (settling.get(family) ?? 1) - 1;
  if (next > 0) settling.set(family, next);
  else settling.delete(family);
  notifySettled();
}

export function subscribeGapSettled(onChange: () => void): () => void {
  settleWatchers.add(onChange);
  return () => settleWatchers.delete(onChange);
}

export function isGapSettling(family: string): boolean {
  return settling.has(family);
}

/** Fills in characters the family covers but the CDN's default subsets omit. */
export function ensureTextSubsetLoaded(
  family: string,
  text: string
): () => void {
  if (typeof document === "undefined" || !document.fonts || !text) {
    return () => {};
  }

  let cancelled = false;
  // Held from the outset, not from the first measurement: the probe below resolves
  // a few frames in, and a paint before that would show partially covered text.
  // Released exactly once, whichever path finishes first.
  beginSettling(family);
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    endSettling(family);
  };

  /** Confirm candidates twice (a frame apart) to avoid race with late faces. */
  const confirm = (candidates: string[]) => {
    requestAnimationFrame(() => {
      if (cancelled) return release();
      const stillMissing = unpaintableCharacters(
        family,
        candidates.join("")
      ).filter((ch) => {
        const key = `${family} ${ch}`;
        if (requestedText.has(key)) return false;
        requestedText.add(key);
        return true;
      });
      if (stillMissing.length === 0) return release();
      addGapFace(family, stillMissing.join(""))
        .catch(() => {})
        .finally(release);
    });
  };

  const attempt = () => {
    if (cancelled || !hasFaces(family)) return;
    const candidates = unpaintableCharacters(family, text).filter(
      (ch) => !requestedText.has(`${family} ${ch}`)
    );
    if (candidates.length > 0) confirm(candidates);
    else release();
  };

  const measureWhenSettled = () => {
    if (cancelled || !hasFaces(family)) return;
    document.fonts
      .load(probeFor(family, 400), text)
      .catch(() => {})
      .then(() => attempt());
  };
  // A family whose faces never arrive would otherwise hold the skeleton forever.
  const giveUp = setTimeout(release, GIVE_UP_MS);
  measureWhenSettled();
  document.fonts.addEventListener("loadingdone", measureWhenSettled);
  return () => {
    cancelled = true;
    clearTimeout(giveUp);
    release();
    document.fonts.removeEventListener("loadingdone", measureWhenSettled);
  };
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
