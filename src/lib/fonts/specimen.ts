import type { FontRecord } from "./types";

// Emoji fonts (Noto Color Emoji / Noto Emoji) have no linguistic sample; Google
// Fonts previews them with a fixed emoji string, so we do the same.
const EMOJI_SAMPLE = "🥰💀✌️🌴🐢🐐🍄⚽🍻👑📸😬👀🚨🏡🕊️🏆😻🌟🧿🍀🎨🍜";

// Default specimen text, like Google Fonts: the opening of the Universal
// Declaration of Human Rights preamble, shown in a language the font actually
// supports. Falls back to the Latin (English) line.
//
// These are the gflanguages `sample_text.styles` strings verbatim -- the same
// field the harvester reads (langcov._sample_string), so a font served by the
// fallback below reads identically to one served by harvested `font.specimen`.
// Google Fonts shows this same preamble line on its specimen pages.
const UDHR_PREAMBLE = {
  latin: "Whereas recognition of the inherent dignity",
  cyrillic: "Принимая во внимание, что признание достоинства,",
  greek: "Όλοι οι άνθρωποι γεννιούνται ελεύθεροι και",
  arabic: "لمّا كان الاعتراف بالكرامة المتأصلة في جميع",
  hebrew: "כל בני אדם נולדו בני חורין ושווים בערכם ובזכויותיהם",
  thai: "โดยที่การไม่นำพาและการหมิ่นในคุณค่าของสิทธิมนุษยชน",
  devanagari: "चूंकि मानव परिवार के सभी सदस्यों के जन्मजात गौरव और समान",
  // Chinese has distinct Simplified vs Traditional wording; Google Fonts splits
  // these via the chinese-simplified / -traditional / -hongkong subsets.
  chineseSimplified:
    "鉴于对人类家庭所有成员的固有尊严及其平等的和不移的权利的承认,乃是世界自由、正义与和平的基础",
  chineseTraditional:
    "鑑於對人類家庭所有成員的固有尊嚴及其平等的和不移的權利的承認，乃是世界自由、正義與和平的基礎",
  japanese:
    "人類社会のすべての構成員の固有の尊厳と平等で譲ることのできない権利とを承認することは",
  korean: "모든 인류 구성원의 천부의 존엄성과 동등하고 양도할 수 없는 권리를 인정하는",
} as const;

// A font's primaryScript (ISO 15924) -> the hardcoded sample text for that
// script. Only used as a fallback; the harvested `font.specimen` covers far more
// scripts. Latin and any script not listed fall through to the Latin default.
const SCRIPT_SPECIMEN: Record<string, string> = {
  Hant: UDHR_PREAMBLE.chineseTraditional,
  Hans: UDHR_PREAMBLE.chineseSimplified,
  Jpan: UDHR_PREAMBLE.japanese,
  Kore: UDHR_PREAMBLE.korean,
  Arab: UDHR_PREAMBLE.arabic,
  Hebr: UDHR_PREAMBLE.hebrew,
  Thai: UDHR_PREAMBLE.thai,
  Deva: UDHR_PREAMBLE.devanagari,
  Grek: UDHR_PREAMBLE.greek,
  Cyrl: UDHR_PREAMBLE.cyrillic,
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
  return (primary && SCRIPT_SPECIMEN[primary]) || UDHR_PREAMBLE.latin;
}
