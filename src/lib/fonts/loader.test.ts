import { describe, expect, it } from "vitest";
import { previewFontFamily } from "./loader";

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
