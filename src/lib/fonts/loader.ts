import { useCallback, useSyncExternalStore } from "react";

const loaded = new Set<string>();
const loadedWeights = new Map<string, Set<number>>();

/**
 * Adobe Blank hides glyphs while loading; Adobe NotDef shows genuinely missing
 * ones.
 *
 * `hideMissing` keeps Blank in place even once the family has loaded. Use it
 * when every listed font is already known to cover the text — the coverage
 * filter guarantees that — because then a NotDef box can only ever mean a
 * supplemental face is still in flight, and flashing one is pure noise. With
 * the filter off, NotDef is real information and must stay.
 */
export function previewFontFamily(
  name: string,
  isLoaded = true,
  hideMissing = false
): string {
  const fallback = isLoaded && !hideMissing ? "Adobe NotDef" : "Adobe Blank";
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

/**
 * Characters of `text` the family cannot currently paint.
 *
 * Measured, not derived from `unicode-range`. A descriptor is a claim about
 * what a face serves, not a guarantee of what is inside it: Google's latin
 * subset for Noto Sans declares U+2000-206F yet ships only 232 codepoints, so
 * U+2021 DOUBLE DAGGER is "covered" by a face that has no such glyph. Reading
 * the descriptors — like document.fonts.check(), which does the same — reports
 * that character as fine while it paints as a NotDef box.
 *
 * Comparing rendered widths catches both shapes of the problem at once: the
 * character no face claims (U+2E4B) and the character a face claims but lacks
 * (U+2021). Anything that measures the same as the NotDef fallback alone is
 * not being painted by the family.
 */
function unpaintableCharacters(family: string, text: string): string[] {
  const el = document.createElement("span");
  el.setAttribute("aria-hidden", "true");
  el.style.cssText =
    "position:absolute;left:-9999px;top:0;font-size:100px;white-space:pre";
  document.body.appendChild(el);
  try {
    const widthIn = (fontFamily: string, ch: string) => {
      el.style.fontFamily = fontFamily;
      el.textContent = ch;
      return el.getBoundingClientRect().width;
    };
    const missing = new Set<string>();
    for (const ch of new Set(text)) {
      const notdef = widthIn('"Adobe NotDef"', ch);
      const withFamily = widthIn(`"${family}", "Adobe NotDef"`, ch);
      // Equal widths mean the family contributed nothing and NotDef painted it.
      if (Math.abs(withFamily - notdef) < 0.5) missing.add(ch);
    }
    return [...missing];
  } finally {
    el.remove();
  }
}

/** Families already asked for a given supplemental character. */
const requestedText = new Set<string>();

/** The weight/stretch the family's existing upright faces advertise. */
function familyDescriptors(family: string) {
  for (const face of document.fonts) {
    if (face.family !== family || face.style !== "normal") continue;
    return { weight: face.weight, stretch: face.stretch };
  }
  return null;
}

/** Every `font-weight` + `src: url(...)` pair in a css2 response, in order. */
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

/** The weight range a family's own faces advertise, e.g. "100 900". */
function familyWeightRange(family: string): [number, number] | null {
  const range = familyDescriptors(family)?.weight;
  const parts = range?.trim().split(/\s+/).map(Number);
  if (!parts || parts.some(Number.isNaN)) return null;
  if (parts.length === 1) return [parts[0], parts[0]];
  return [parts[0], parts[1]];
}

/**
 * Registers the supplemental faces itself rather than linking the stylesheet.
 *
 * Linking would not work: the browser only uses a face whose weight/stretch
 * descriptors match what is being asked for, and a face declared for a single
 * weight loses to a variable family whose own faces span `100 900` /
 * `62.5% 100%` — the character keeps resolving past it to Adobe NotDef.
 * Re-declaring each returned file with its own weight, and the family's
 * stretch, makes it match. Verified: a "Noto Sans", "Adobe NotDef" chain
 * measures the 48px NotDef box before this runs and the 24px glyph after.
 */
async function addGapFace(family: string, chars: string) {
  const descriptors = familyDescriptors(family);
  const weights = familyWeightRange(family);
  // Ask across the family's own weight range, so the gap character responds to
  // the weight slider like every other character. Modern browsers get back a
  // single variable face; older ones are served one static face per step, and
  // registering each at its own weight handles both.
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

  const unicodeRange = [...chars]
    .map((c) => `U+${(c.codePointAt(0) as number).toString(16)}`)
    .join(",");

  await Promise.all(
    faces.map(async ({ weight, url }) => {
      const face = new FontFace(family, `url(${url})`, {
        unicodeRange,
        // Declare exactly what came back. Widening a static face to the whole
        // range would make it match but still paint its one instance, leaving
        // the character frozen while the rest of the text changes weight.
        weight,
        stretch: descriptors?.stretch ?? "100%",
        display: "block",
      });
      document.fonts.add(await face.load());
    })
  );
}

/**
 * Fills in characters the family has but the CDN is not currently serving.
 *
 * Google slices each family into `unicode-range` faces, and a character can go
 * missing two ways: no face claims its block at all (U+2E4B TRIPLE DAGGER), or
 * a face claims the block but the file omits the glyph (U+2021 DOUBLE DAGGER,
 * inside the latin face's declared U+2000-206F). Either way it paints as a
 * NotDef box. Asking css2 for `text=<chars>` returns a face covering exactly
 * those characters, which the browser then prefers.
 *
 * Callers must pass only characters the font genuinely has — css2 answers a
 * request for a character the family lacks with an HTML error page — so this is
 * gated on the coverage index upstream.
 */
export function ensureTextSubsetLoaded(
  family: string,
  text: string
): () => void {
  if (typeof document === "undefined" || !document.fonts || !text) {
    return () => {};
  }

  let cancelled = false;

  /**
   * A character measures as NotDef both when the family truly lacks it and
   * when its face is merely still downloading, and load() resolving is not
   * proof the glyphs can paint yet. Confirm a candidate twice, a frame apart,
   * before spending a request on it: a late face lands in between and the
   * second measurement clears it, while a genuinely absent glyph never does.
   */
  const confirm = (candidates: string[]) => {
    requestAnimationFrame(() => {
      if (cancelled) return;
      const stillMissing = unpaintableCharacters(
        family,
        candidates.join("")
      ).filter((ch) => {
        const key = `${family} ${ch}`;
        if (requestedText.has(key)) return false;
        requestedText.add(key);
        return true;
      });
      if (stillMissing.length === 0) return;
      addGapFace(family, stillMissing.join("")).catch(() => {
        // The CDN cannot subset these characters for this family; the NotDef
        // box is then the honest result.
      });
    });
  };

  const attempt = () => {
    if (cancelled || !hasFaces(family)) return;
    const candidates = unpaintableCharacters(family, text).filter(
      (ch) => !requestedText.has(`${family} ${ch}`)
    );
    if (candidates.length > 0) confirm(candidates);
  };

  // The family's <link> may not have landed yet, so re-measure as stylesheets
  // arrive; load() settles the faces this text needs before each pass.
  const measureWhenSettled = () => {
    if (cancelled || !hasFaces(family)) return;
    document.fonts
      .load(probeFor(family, 400), text)
      .catch(() => {})
      .then(() => attempt());
  };
  measureWhenSettled();
  document.fonts.addEventListener("loadingdone", measureWhenSettled);
  return () => {
    cancelled = true;
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
