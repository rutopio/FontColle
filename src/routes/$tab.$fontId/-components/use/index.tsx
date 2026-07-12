import type { FontRecord } from "@/lib/fonts/types";
import { BunnyMethod } from "./bunny-fonts";
import { FontsourceMethod } from "./fontsource";
import { GoogleFontsMethod } from "./google-fonts";
import { fallbackFor } from "./shared";

// The Use tab: three ways to put this family on a page, side by side.
//   1. Google Fonts API — a hosted <link> (like the GF embed panel).
//   2. Fontsource — self-hosted npm/CDN package (like fontsource.org's install page).
//   3. Bunny Fonts — a GDPR-friendly, privacy-first Google Fonts drop-in.
// Every snippet is derived from the family's real weights/variability, so it
// matches what this specific font actually ships.
export function UsePanel({ font }: { font: FontRecord }) {
  const cssFamily = `"${font.name}", ${fallbackFor(font.class)}`;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <GoogleFontsMethod font={font} cssFamily={cssFamily} />
      <FontsourceMethod font={font} />
      <BunnyMethod font={font} />
    </div>
  );
}
