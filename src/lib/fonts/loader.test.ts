import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __loaderInternals, previewFontFamily } from "./loader";

describe("previewFontFamily", () => {
  it("uses Adobe NotDef when the family has loaded (default)", () => {
    expect(previewFontFamily("Inter")).toBe(
      '"Inter", "Adobe NotDef", sans-serif'
    );
    expect(previewFontFamily("Inter", true)).toBe(
      '"Inter", "Adobe NotDef", sans-serif'
    );
  });

  it("uses Adobe Blank while the family is still loading", () => {
    expect(previewFontFamily("Roboto", false)).toBe(
      '"Roboto", "Adobe Blank", sans-serif'
    );
  });

  it("quotes the family name so multi-word names stay one token", () => {
    expect(previewFontFamily("Noto Sans JP")).toBe(
      '"Noto Sans JP", "Adobe NotDef", sans-serif'
    );
  });

  it("always ends with sans-serif as the last resort", () => {
    expect(previewFontFamily("X", true).endsWith(", sans-serif")).toBe(true);
    expect(previewFontFamily("X", false).endsWith(", sans-serif")).toBe(true);
  });
});

/** Minimal document.fonts stand-in: the subscription logic only needs check(),
 *  load() and the loadingdone event, so no DOM environment is required. */
function stubFontFaceSet() {
  const ready = new Set<string>();
  const listeners = new Set<() => void>();
  // Registered @font-face rules, which the loader requires before it trusts
  // check() — see hasFaces().
  const faces = new Set<{ family: string }>();
  const check = vi.fn((probe: string) => ready.has(probe));
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
    /** The family's @font-face rules have registered but not yet downloaded —
     *  what a css2 <link> gives you before the file arrives. */
    register(name: string) {
      faces.add({ family: name });
    },
    /** Mark one weight of a family loaded and fire loadingdone, as the browser
     *  would. Weight-specific: check() is asked about the exact face a row
     *  renders, so finishing 400 must not report 700 as ready. Registers the
     *  face too, since a loaded family necessarily has one. */
    finish(name: string, weight = 400) {
      faces.add({ family: name });
      ready.add(`${weight} 16px "${name}"`);
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
    const unsubscribe = __loaderInternals.subscribeFamily("Inter", 400, onInter);
    expect(__loaderInternals.watcherCount("Inter")).toBe(1);

    unsubscribe();
    expect(__loaderInternals.watcherCount("Inter")).toBe(0);
    expect(__loaderInternals.familyCount()).toBe(0);

    env.finish("Inter");
    expect(onInter).not.toHaveBeenCalled();
  });

  /* The NotDef flash. check() means "renderable without loading anything new",
     which is true for a family with no @font-face at all — it resolves to a
     system font. Mid-fling a row subscribes before its css2 <link> registers,
     so the row went ready instantly, dropped the skeleton, and sat on the
     NotDef chain while the real font had not started downloading. */
  it("stays pending for a family whose faces have not registered yet", () => {
    const onInter = vi.fn();
    // No register()/finish(): nothing for this family exists in document.fonts,
    // and the bare check() stub would still have to be consulted.
    env.check.mockReturnValue(true);

    __loaderInternals.subscribeFamily("Inter", 400, onInter);

    // Synchronously still pending — the retry has not had a chance to run.
    expect(__loaderInternals.isReady("Inter")).toBe(false);
    expect(onInter).not.toHaveBeenCalled();
  });

  /* A skeleton that never resolves is worse than a brief fallback, so the
     chase gives up after a deadline and lets the text through. */
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

      // The css2 <link> lands a moment later, as it does mid-fling.
      await vi.advanceTimersByTimeAsync(150);
      env.register("Inter");
      env.check.mockImplementation((probe: string) =>
        probe === '400 16px "Inter"'
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

  /* A row needing 700 must not go ready because an earlier row's 400 arrived.
     It would swap its skeleton for text the real face cannot paint yet, with
     the chain already on NotDef. */
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
