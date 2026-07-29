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
  const check = vi.fn((probe: string) => ready.has(probe));
  const load = vi.fn(() => Promise.resolve([]));

  const fonts = {
    check,
    load,
    addEventListener: (_type: string, cb: () => void) => listeners.add(cb),
    removeEventListener: (_type: string, cb: () => void) =>
      listeners.delete(cb),
  };

  return {
    fonts,
    check,
    load,
    listenerCount: () => listeners.size,
    /** Mark a family loaded and fire loadingdone, as the browser would. */
    finish(name: string) {
      ready.add(`16px "${name}"`);
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
      __loaderInternals.subscribeFamily(`Family ${i}`, () => {});
    }
    expect(env.listenerCount()).toBe(1);
  });

  it("notifies only the subscribers of the family that finished", () => {
    const onInter = vi.fn();
    const onRoboto = vi.fn();
    __loaderInternals.subscribeFamily("Inter", onInter);
    __loaderInternals.subscribeFamily("Roboto", onRoboto);

    env.finish("Inter");

    expect(onInter).toHaveBeenCalledTimes(1);
    expect(onRoboto).not.toHaveBeenCalled();
    expect(__loaderInternals.isReady("Inter")).toBe(true);
    expect(__loaderInternals.isReady("Roboto")).toBe(false);
  });

  it("checks each family once per event, not once per subscriber", () => {
    for (let i = 0; i < 20; i++) {
      __loaderInternals.subscribeFamily("Inter", () => {});
    }
    env.check.mockClear();

    env.finish("Inter");

    // One check for the single pending family, regardless of subscriber count.
    expect(env.check).toHaveBeenCalledTimes(1);
  });

  it("stops re-checking a family once it is known ready", () => {
    __loaderInternals.subscribeFamily("Inter", () => {});
    env.finish("Inter");
    env.check.mockClear();

    env.finish("Inter");

    expect(env.check).not.toHaveBeenCalled();
  });

  it("resolves immediately when the family is already loaded", () => {
    env.finish("Inter"); // ready before anyone subscribes
    const onInter = vi.fn();
    __loaderInternals.subscribeFamily("Inter", onInter);

    expect(__loaderInternals.isReady("Inter")).toBe(true);
    expect(env.load).not.toHaveBeenCalled();
  });

  it("unsubscribing drops the watcher so it is not notified later", () => {
    const onInter = vi.fn();
    const unsubscribe = __loaderInternals.subscribeFamily("Inter", onInter);
    expect(__loaderInternals.watcherCount("Inter")).toBe(1);

    unsubscribe();
    expect(__loaderInternals.watcherCount("Inter")).toBe(0);
    expect(__loaderInternals.familyCount()).toBe(0);

    env.finish("Inter");
    expect(onInter).not.toHaveBeenCalled();
  });

  it("marks the family ready when load() rejects, so text is never stuck hidden", async () => {
    env.load.mockReturnValueOnce(Promise.reject(new Error("network")));
    const onInter = vi.fn();
    __loaderInternals.subscribeFamily("Inter", onInter);

    await vi.waitFor(() =>
      expect(__loaderInternals.isReady("Inter")).toBe(true)
    );
    expect(onInter).toHaveBeenCalledTimes(1);
  });
});
