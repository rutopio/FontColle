import type { FontRecord } from "./types";

// Emoji fonts have no linguistic sample; Google Fonts uses a fixed string too.
const EMOJI_SAMPLE = "🥰💀✌️🌴🐢🐐🍄⚽🍻👑📸😬👀🚨🏡🕊️🏆😻🌟🧿🍀🎨🍜";

// The Latin fallback, like Google Fonts: the UDHR opening, in English. Only
// Latin faces reach it — every non-Latin font carries a harvested native-script
// `font.specimen` (gflanguages, ~153 scripts), while their sample_text is empty.
const UDHR_PREAMBLE_LATIN = "Whereas recognition of the inherent dignity";

// The gflanguages `sample_text.styles / specimen_21 / specimen_16` strings
// verbatim, seeding Heading 1/2/3. The smaller the type size, the more text the
// tier carries, so h3 is longest.
const UDHR_TIERS_LATIN = [
  "Whereas recognition of the inherent dignity",
  "No one shall be subjected to arbitrary arrest, detention or exile.\nEveryone is entitled in full equality to a fair and public hearing by an independent and impartial tribunal, in the determination of his rights and obligations and of any criminal charge against him.\nNo one shall be subjected to arbitrary interference with his privacy, family, home or correspondence, nor to attacks upon his honour and reputation. Everyone has the right to the protection of the law against such interference or attacks.",
  "Everyone has the right to freedom of thought, conscience and religion; this right includes freedom to change his religion or belief, and freedom, either alone or in community with others and in public or private, to manifest his religion or belief in teaching, practice, worship and observance.\nEveryone has the right to freedom of opinion and expression; this right includes freedom to hold opinions without interference and to seek, receive and impart information and ideas through any media and regardless of frontiers.\nEveryone has the right to rest and leisure, including reasonable limitation of working hours and periodic holidays with pay.",
] as const;

// A Latin face that also covers Greek or Hebrew still specimens in Latin, as
// it does on Google Fonts.
export function specimenFor(font: FontRecord): string {
  // An empty string is a deliberate blank preview, for a face with no
  // meaningful sample; only null falls through to the Latin default.
  if (font.specimen != null) return font.specimen;
  const nonMenu = font.subsets.filter((s) => s !== "menu");
  if (nonMenu.length === 1 && nonMenu[0] === "emoji") return EMOJI_SAMPLE;
  return UDHR_PREAMBLE_LATIN;
}

// The Tester's opening document: three native-script tiers where the font has
// them, the UDHR tiers for a Latin fallback, one line for emoji/blank.
export function specimenLinesFor(font: FontRecord): string[] {
  const single = specimenFor(font);
  if (single === "" || single === EMOJI_SAMPLE) return [single];
  // Deduped: upstream repeats a tier for a couple of scripts, which would
  // otherwise render as three identical headings.
  const tiers = font.specimenTiers;
  if (tiers && tiers.length > 0) {
    const lines: string[] = [];
    for (const line of tiers) {
      if (line && !lines.includes(line)) lines.push(line);
    }
    if (lines.length > 0) return lines;
  }
  if (single === UDHR_PREAMBLE_LATIN) return [...UDHR_TIERS_LATIN];
  return [single];
}
