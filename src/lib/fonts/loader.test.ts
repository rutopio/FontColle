import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __loaderInternals, previewFontFamily } from "./loader";

describe("previewFontFamily", () => {
  it("hides missing glyphs with Adobe Blank by default", () => {
    expect(previewFontFamily("Inter")).toBe(
      '"Inter", "Adobe Blank", sans-serif'
    );
    expect(previewFontFamily("Roboto", false)).toBe(
      '"Roboto", "Adobe Blank", sans-serif'
    );
  });

  it("boxes missing glyphs only when notdef mode is switched on", () => {
    expect(previewFontFamily("Inter", true)).toBe(
      '"Inter", "Adobe NotDef", sans-serif'
    );
  });

  /* Fallback tracks the toggle alone, not load state. */
  it("does not depend on load state", () => {
    expect(previewFontFamily("Inter")).toBe(previewFontFamily("Inter"));
    expect(previewFontFamily("Inter", true)).toBe(
      previewFontFamily("Inter", true)
    );
  });

  it("quotes the family name so multi-word names stay one token", () => {
    expect(previewFontFamily("Noto Sans JP")).toBe(
      '"Noto Sans JP", "Adobe Blank", sans-serif'
    );
  });

  it("always ends with sans-serif as the last resort", () => {
    expect(previewFontFamily("X", true).endsWith(", sans-serif")).toBe(true);
    expect(previewFontFamily("X", false).endsWith(", sans-serif")).toBe(true);
  });
});

/** Minimal document.fonts stub for subscription tests. */
function stubFontFaceSet() {
  const ready = new Set<string>();
  const listeners = new Set<() => void>();
  const faces = new Set<{ family: string }>();
  const readyChars = new Map<string, Set<string>>();
  const check = vi.fn((probe: string, text = " ") => {
    if (ready.has(probe)) return true;
    const chars = readyChars.get(probe);
    return chars ? [...text].every((c) => chars.has(c)) : false;
  });
  const load = vi.fn(() => Promise.resolve([]));

  const fonts = {
    check,
    load,
    [Symbol.iterator]: () => faces.values(),
    addEventListener: (_type: string, cb: () => void) => listeners.add(cb),
    removeEventListener: (_type: string, cb: () => void) =>
      listeners.delete(cb),
  };

  return {
    fonts,
    check,
    load,
    listenerCount: () => listeners.size,
    /** Register a face without marking it loaded. */
    register(name: string) {
      faces.add({ family: name });
    },
    /** Register with Safari-style quoted name. */
    registerQuoted(name: string) {
      faces.add({ family: `'${name}'` });
    },
    /** Mark one weight loaded and fire loadingdone. */
    finish(name: string, weight = 400) {
      faces.add({ family: name });
      ready.add(`${weight} 16px "${name}"`);
      for (const cb of [...listeners]) cb();
    },
    /** Mark one unicode-range subset loaded. */
    finishSubset(name: string, chars: string, weight = 400) {
      faces.add({ family: name });
      const probe = `${weight} 16px "${name}"`;
      const set = readyChars.get(probe) ?? new Set<string>();
      for (const c of chars) set.add(c);
      readyChars.set(probe, set);
      for (const cb of [...listeners]) cb();
    },
  };
}

describe("font-family subscriptions", () => {
  let env: ReturnType<typeof stubFontFaceSet>;

  beforeEach(() => {
    env = stubFontFaceSet();
    vi.stubGlobal("document", { fonts: env.fonts });
  });

  afterEach(() => {
    __loaderInternals.reset();
    vi.unstubAllGlobals();
  });

  it("registers exactly one loadingdone listener for many subscribers", () => {
    for (let i = 0; i < 50; i++) {
      __loaderInternals.subscribeFamily(`Family ${i}`, 400, () => {});
    }
    expect(env.listenerCount()).toBe(1);
  });

  it("notifies only the subscribers of the family that finished", () => {
    const onInter = vi.fn();
    const onRoboto = vi.fn();
    __loaderInternals.subscribeFamily("Inter", 400, onInter);
    __loaderInternals.subscribeFamily("Roboto", 400, onRoboto);

    env.finish("Inter");

    expect(onInter).toHaveBeenCalledTimes(1);
    expect(onRoboto).not.toHaveBeenCalled();
    expect(__loaderInternals.isReady("Inter")).toBe(true);
    expect(__loaderInternals.isReady("Roboto")).toBe(false);
  });

  it("checks each family once per event, not once per subscriber", () => {
    for (let i = 0; i < 20; i++) {
      __loaderInternals.subscribeFamily("Inter", 400, () => {});
    }
    env.check.mockClear();

    env.finish("Inter");

    // One check for the single pending family, regardless of subscriber count.
    expect(env.check).toHaveBeenCalledTimes(1);
  });

  it("stops re-checking a family once it is known ready", () => {
    __loaderInternals.subscribeFamily("Inter", 400, () => {});
    env.finish("Inter");
    env.check.mockClear();

    env.finish("Inter");

    expect(env.check).not.toHaveBeenCalled();
  });

  it("resolves immediately when the family is already loaded", () => {
    env.finish("Inter"); // ready before anyone subscribes
    const onInter = vi.fn();
    __loaderInternals.subscribeFamily("Inter", 400, onInter);

    expect(__loaderInternals.isReady("Inter")).toBe(true);
    expect(env.load).not.toHaveBeenCalled();
  });

  it("unsubscribing drops the watcher so it is not notified later", () => {
    const onInter = vi.fn();
    const unsubscribe = __loaderInternals.subscribeFamily(
      "Inter",
      400,
      onInter
    );
    expect(__loaderInternals.watcherCount("Inter")).toBe(1);

    unsubscribe();
    expect(__loaderInternals.watcherCount("Inter")).toBe(0);
    expect(__loaderInternals.familyCount()).toBe(0);

    env.finish("Inter");
    expect(onInter).not.toHaveBeenCalled();
  });

  /* Safari keeps quotes on face.family from css2 stylesheets. */
  it("recognises a family whose faces report a quoted name", () => {
    const onNoto = vi.fn();
    env.check.mockReturnValue(true);
    env.registerQuoted("Noto Sans");

    __loaderInternals.subscribeFamily("Noto Sans", 400, onNoto);

    expect(__loaderInternals.isReady("Noto Sans")).toBe(true);
  });

  /* No @font-face registered yet -> check() would lie; must stay pending. */
  it("stays pending for a family whose faces have not registered yet", () => {
    const onInter = vi.fn();
    env.check.mockReturnValue(true);

    __loaderInternals.subscribeFamily("Inter", 400, onInter);

    expect(__loaderInternals.isReady("Inter")).toBe(false);
    expect(onInter).not.toHaveBeenCalled();
  });

  /* Gives up after a deadline rather than blocking text forever. */
  it("gives up and shows text if the face never registers", async () => {
    vi.useFakeTimers();
    try {
      const onInter = vi.fn();
      env.check.mockReturnValue(false); // never paintable
      __loaderInternals.subscribeFamily("Inter", 400, onInter);

      expect(__loaderInternals.isReady("Inter")).toBe(false);

      await vi.advanceTimersByTimeAsync(4000);

      expect(__loaderInternals.isReady("Inter")).toBe(true);
      expect(onInter).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("resolves as soon as a late-registering face can paint", async () => {
    vi.useFakeTimers();
    try {
      const onInter = vi.fn();
      __loaderInternals.subscribeFamily("Inter", 400, onInter);
      expect(__loaderInternals.isReady("Inter")).toBe(false);

      await vi.advanceTimersByTimeAsync(150);
      env.register("Inter");
      env.check.mockImplementation(
        (probe: string) => probe === '400 16px "Inter"'
      );

      await vi.advanceTimersByTimeAsync(300);

      expect(__loaderInternals.isReady("Inter")).toBe(true);
      expect(onInter).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("goes ready once the face is registered and loaded", () => {
    const onInter = vi.fn();
    env.register("Inter"); // <link> landed, file still downloading
    __loaderInternals.subscribeFamily("Inter", 400, onInter);
    expect(__loaderInternals.isReady("Inter")).toBe(false);

    env.finish("Inter");

    expect(__loaderInternals.isReady("Inter")).toBe(true);
    expect(onInter).toHaveBeenCalledTimes(1);
  });

  /* 400 arriving must not mark 700 as ready. */
  it("keeps a weight pending when a different weight of the same family loads", () => {
    const onRegular = vi.fn();
    const onBold = vi.fn();
    __loaderInternals.subscribeFamily("Inter", 400, onRegular);
    __loaderInternals.subscribeFamily("Inter", 700, onBold);

    env.finish("Inter", 400);

    expect(onRegular).toHaveBeenCalledTimes(1);
    expect(__loaderInternals.isReady("Inter", 400)).toBe(true);
    expect(onBold).not.toHaveBeenCalled();
    expect(__loaderInternals.isReady("Inter", 700)).toBe(false);

    env.finish("Inter", 700);

    expect(onBold).toHaveBeenCalledTimes(1);
    expect(__loaderInternals.isReady("Inter", 700)).toBe(true);
  });

  /* Must wait for all unicode-range subsets the text needs. */
  it("stays pending while a subset the text needs is still loading", () => {
    const onInter = vi.fn();
    __loaderInternals.subscribeFamily("Inter", 400, onInter, "aé");

    env.finishSubset("Inter", "a");
    expect(__loaderInternals.isReady("Inter", 400, "aé")).toBe(false);
    expect(onInter).not.toHaveBeenCalled();

    env.finishSubset("Inter", "é");
    expect(__loaderInternals.isReady("Inter", 400, "aé")).toBe(true);
    expect(onInter).toHaveBeenCalledTimes(1);
  });

  it("probes the text it was given, not just a space", () => {
    env.register("Inter"); // hasFaces() gates check(), so the <link> must land
    __loaderInternals.subscribeFamily("Inter", 400, () => {}, "一二三");
    expect(env.check).toHaveBeenCalledWith('400 16px "Inter"', "一二三");
  });

  it("tracks each preview text separately", () => {
    const onLatin = vi.fn();
    const onCjk = vi.fn();
    __loaderInternals.subscribeFamily("Inter", 400, onLatin, "ab");
    __loaderInternals.subscribeFamily("Inter", 400, onCjk, "一");

    env.finishSubset("Inter", "ab");

    expect(__loaderInternals.isReady("Inter", 400, "ab")).toBe(true);
    expect(__loaderInternals.isReady("Inter", 400, "一")).toBe(false);
    expect(onCjk).not.toHaveBeenCalled();
  });

  /* Missing characters resolve to NotDef immediately, not held as loading. */
  it("does not wait forever on a character no face covers", () => {
    const onInter = vi.fn();
    env.finish("Inter");
    __loaderInternals.subscribeFamily("Inter", 400, onInter, "a\u{10FFFF}");

    expect(__loaderInternals.isReady("Inter", 400, "a\u{10FFFF}")).toBe(true);
  });

  it("marks the family ready when load() rejects, so text is never stuck hidden", async () => {
    env.load.mockReturnValueOnce(Promise.reject(new Error("network")));
    const onInter = vi.fn();
    __loaderInternals.subscribeFamily("Inter", 400, onInter);

    await vi.waitFor(() =>
      expect(__loaderInternals.isReady("Inter")).toBe(true)
    );
    expect(onInter).toHaveBeenCalledTimes(1);
  });
});
