import { useCallback, useSyncExternalStore } from "react";
import { CLUSTER_RE } from "./text-clusters";

const loaded = new Set<string>();
const loadedWeights = new Map<string, Set<number>>();
const loadedItalic = new Set<string>();

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

// WebKit keeps quotes around font-family values; Blink strips them.
function sameFamily(faceFamily: string, name: string) {
  return faceFamily.replace(/^['"]|['"]$/g, "") === name;
}

function hasFaces(name: string) {
  for (const face of document.fonts) {
    if (sameFamily(face.family, name)) return true;
  }
  return false;
}

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
    loadedItalic.clear();
  },
};

export function ensureFontLoaded(
  family: string,
  weights: number[],
  hasItalic = false
) {
  if (typeof document === "undefined") return;

  const seen = loadedWeights.get(family) ?? new Set<number>();
  const missing = [...new Set(weights.filter((w) => w > 0))]
    .filter((w) => !seen.has(w))
    .sort((a, b) => a - b);

  const italicMissing = hasItalic && !loadedItalic.has(family);

  if (
    !missing.length &&
    !italicMissing &&
    (loaded.has(family) || seen.size > 0)
  )
    return;

  loaded.add(family);
  for (const w of missing) seen.add(w);
  loadedWeights.set(family, seen);
  if (hasItalic) loadedItalic.add(family);

  const uniq = [...seen].sort((a, b) => a - b);
  let spec: string;
  if (hasItalic && uniq.length > 0) {
    const tuples = [
      ...uniq.map((w) => `0,${w}`),
      ...uniq.map((w) => `1,${w}`),
    ].join(";");
    spec = `${encodeFamily(family)}:ital,wght@${tuples}`;
  } else if (hasItalic) {
    spec = `${encodeFamily(family)}:ital@0;1`;
  } else if (uniq.length > 0) {
    spec = `${encodeFamily(family)}:wght@${uniq.join(";")}`;
  } else {
    spec = encodeFamily(family);
  }

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
    if (!sameFamily(face.family, family) || face.style !== "normal") continue;
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

function subscribeGapSettled(onChange: () => void): () => void {
  settleWatchers.add(onChange);
  return () => settleWatchers.delete(onChange);
}

function isGapSettling(family: string): boolean {
  return settling.has(family);
}

export function ensureTextSubsetLoaded(
  family: string,
  text: string
): () => void {
  if (typeof document === "undefined" || !document.fonts || !text) {
    return () => {};
  }

  let cancelled = false;
  beginSettling(family);
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    endSettling(family);
  };

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
