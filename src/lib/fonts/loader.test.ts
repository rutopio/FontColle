import { describe, expect, it } from "vitest";
import { previewFontFamily } from "./loader";

// previewFontFamily is the pure fallback-chain builder (loader.ts:11-24). The
// DOM link-injection functions and the useFontLoaded hook are not exercised
// here — they need the CSS Font Loading API and React, out of scope for a pure
// unit test. Only the documented fallback stacks are asserted.
describe("previewFontFamily", () => {
  it("uses Adobe NotDef when the family has loaded (default)", () => {
    // Loaded -> genuine missing glyphs should show a visible .notdef box.
    expect(previewFontFamily("Inter")).toBe(
      '"Inter", "Adobe NotDef", sans-serif'
    );
    expect(previewFontFamily("Inter", true)).toBe(
      '"Inter", "Adobe NotDef", sans-serif'
    );
  });

  it("uses Adobe Blank while the family is still loading", () => {
    // Not loaded -> render every codepoint blank instead of flashing NotDef boxes.
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
