import type { FontRecord } from "./types";

// Emoji fonts (Noto Color Emoji / Noto Emoji) have no linguistic sample; Google
// Fonts previews them with a fixed emoji string, so we do the same.
const EMOJI_SAMPLE = "🥰💀✌️🌴🐢🐐🍄⚽🍻👑📸😬👀🚨🏡🕊️🏆😻🌟🧿🍀🎨🍜";

// Default specimen text, like Google Fonts: Article 18 of the Universal
// Declaration of Human Rights, shown in a language the font actually supports.
// Falls back to the Latin (English) line.
const UDHR_ART18 = {
  latin:
    "Everyone has the right to freedom of thought, conscience and religion.",
  cyrillic: "Каждый человек имеет право на свободу мысли, совести и религии.",
  greek:
    "Καθένας έχει το δικαίωμα της ελευθερίας της σκέψης, της συνείδησης και της θρησκείας.",
  arabic: "لكل شخص الحق في حرية التفكير والضمير والدين.",
  hebrew: "כל אדם זכאי לחירות המחשבה, המצפון והדת.",
  thai: "ทุกคนมีสิทธิในอิสรภาพแห่งความคิด มโนธรรม และศาสนา",
  devanagari: "प्रत्येक व्यक्ति को विचार, अंतरात्मा और धर्म की स्वतंत्रता का अधिकार है।",
  // Chinese has distinct Simplified vs Traditional wording; Google Fonts splits
  // these via the chinese-simplified / -traditional / -hongkong subsets.
  chineseSimplified: "人人有思想、良心和宗教自由的权利。",
  chineseTraditional: "人人有思想、良心和宗教自由的權利。",
  japanese: "すべての人は、思想、良心及び宗教の自由についての権利を有する。",
  korean: "모든 사람은 사상, 양심 및 종교의 자유에 대한 권리를 가진다.",
} as const;

// A font's primaryScript (ISO 15924) -> the hardcoded sample text for that
// script. Only used as a fallback; the harvested `font.specimen` covers far more
// scripts. Latin and any script not listed fall through to the Latin default.
const SCRIPT_SPECIMEN: Record<string, string> = {
  Hant: UDHR_ART18.chineseTraditional,
  Hans: UDHR_ART18.chineseSimplified,
  Jpan: UDHR_ART18.japanese,
  Kore: UDHR_ART18.korean,
  Arab: UDHR_ART18.arabic,
  Hebr: UDHR_ART18.hebrew,
  Thai: UDHR_ART18.thai,
  Deva: UDHR_ART18.devanagari,
  Grek: UDHR_ART18.greek,
  Cyrl: UDHR_ART18.cyrillic,
};

// The sample sentence to preview a font with. Prefer the harvested native-script
// sample (gflanguages, ~156 scripts). Otherwise fall back by the font's PRIMARY
// script, not its subset list: Latin faces like Inter/Roboto also cover Greek
// or Hebrew, but Google Fonts (and we) specimen them in Latin, so only a font
// whose primary script is non-Latin gets a non-Latin sample.
export function specimenFor(font: FontRecord): string {
  // An empty string is a deliberate blank preview (icon fonts like AllKin that
  // Google shows blank); only null falls through to the script/UDHR default.
  if (font.specimen != null) return font.specimen;
  // Emoji-only fonts (their sole non-menu subset is "emoji") preview as emoji.
  const nonMenu = font.subsets.filter((s) => s !== "menu");
  if (nonMenu.length === 1 && nonMenu[0] === "emoji") return EMOJI_SAMPLE;
  const primary = font.primaryScript;
  return (primary && SCRIPT_SPECIMEN[primary]) || UDHR_ART18.latin;
}
