import type { FontRecord } from "./types";

// Emoji fonts (Noto Color Emoji / Noto Emoji) have no linguistic sample; Google
// Fonts previews them with a fixed emoji string, so we do the same.
const EMOJI_SAMPLE = "🥰💀✌️🌴🐢🐐🍄⚽🍻👑📸😬👀🚨🏡🕊️🏆😻🌟🧿🍀🎨🍜";

// The Latin fallback preamble, like Google Fonts: the opening of the Universal
// Declaration of Human Rights, in English.
//
// This is the only single-sentence fallback we need. Every non-Latin font
// carries a harvested native-script `font.specimen` (gflanguages, ~153 scripts),
// so it never falls back here -- verified: zero non-Latin fonts reach this. Only
// Latin faces, whose gflanguages sample_text is empty, are served from here.
const UDHR_PREAMBLE_LATIN = "Whereas recognition of the inherent dignity";

// The three UDHR passages the Tester seeds as Heading 1 / 2 / 3 for a Latin
// fallback font: the gflanguages `sample_text.styles / specimen_21 / specimen_16`
// strings verbatim -- exactly what Google Fonts opens an English specimen with.
// The smaller the type size, the more text the tier carries, so h3 is longest.
// Only Latin fallback fonts reach these; a font with harvested specimenTiers
// seeds those native-script passages instead (see below).
const UDHR_TIERS_LATIN = [
  "Whereas recognition of the inherent dignity",
  "No one shall be subjected to arbitrary arrest, detention or exile.\nEveryone is entitled in full equality to a fair and public hearing by an independent and impartial tribunal, in the determination of his rights and obligations and of any criminal charge against him.\nNo one shall be subjected to arbitrary interference with his privacy, family, home or correspondence, nor to attacks upon his honour and reputation. Everyone has the right to the protection of the law against such interference or attacks.",
  "Everyone has the right to freedom of thought, conscience and religion; this right includes freedom to change his religion or belief, and freedom, either alone or in community with others and in public or private, to manifest his religion or belief in teaching, practice, worship and observance.\nEveryone has the right to freedom of opinion and expression; this right includes freedom to hold opinions without interference and to seek, receive and impart information and ideas through any media and regardless of frontiers.\nEveryone has the right to rest and leisure, including reasonable limitation of working hours and periodic holidays with pay.",
] as const;

// The sample sentence to preview a font with. Prefer the harvested native-script
// sample (gflanguages, ~153 scripts), which every non-Latin font carries.
// Everything else -- Latin faces, whose gflanguages sample_text is empty -- gets
// the Latin UDHR line. (Latin faces like Inter/Roboto may also cover Greek or
// Hebrew, but Google Fonts specimens them in Latin, and so do we.)
export function specimenFor(font: FontRecord): string {
  // An empty string is a deliberate blank preview (icon fonts like AllKin that
  // Google shows blank); only null falls through to the Latin default.
  if (font.specimen != null) return font.specimen;
  // Emoji-only fonts (their sole non-menu subset is "emoji") preview as emoji.
  const nonMenu = font.subsets.filter((s) => s !== "menu");
  if (nonMenu.length === 1 && nonMenu[0] === "emoji") return EMOJI_SAMPLE;
  return UDHR_PREAMBLE_LATIN;
}

// The Tester's opening document, seeded the way Google Fonts' specimen page
// opens. A non-Latin font ships three native-script tiers (gflanguages
// specimen_48/_36/_32, whatever the script -- Ethiopic, Tamil, Khmer...), which
// seed Heading 1 / 2 / 3 as a flowing passage. A Latin fallback font, which has
// no harvested sample, expands into the three UDHR tiers instead. An emoji or
// deliberately-blank font seeds a single line.
export function specimenLinesFor(font: FontRecord): string[] {
  const single = specimenFor(font);
  // Emoji / blank fonts have no passage -> one line.
  if (single === "" || single === EMOJI_SAMPLE) return [single];
  // A non-Latin font's own three tiers, deduped (upstream repeats a tier for a
  // couple of scripts, and three identical headings is the thing this avoids).
  const tiers = font.specimenTiers;
  if (tiers && tiers.length > 0) {
    const lines: string[] = [];
    for (const line of tiers) {
      if (line && !lines.includes(line)) lines.push(line);
    }
    if (lines.length > 0) return lines;
  }
  // Latin fallback (no harvested tiers) -> the English UDHR tiers.
  if (single === UDHR_PREAMBLE_LATIN) return [...UDHR_TIERS_LATIN];
  // A harvested single sentence with no tiers (rare) seeds that one line.
  return [single];
}
