import type { FontRecord } from "./types";

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
  chinese: "人人有思想、良心和宗教自由的权利。",
  japanese: "すべての人は、思想、良心及び宗教の自由についての権利を有する。",
  korean: "모든 사람은 사상, 양심 및 종교의 자유에 대한 권리를 가진다.",
} as const;

// Pick by the font's subsets, non-Latin scripts first so a font built for one
// of them specimens in its own script rather than a Latin fallback it may not
// even cover well.
export function specimenFor(font: FontRecord): string {
  const has = (s: string) => font.subsets.includes(s);

  if (font.subsets.some((s) => s.startsWith("chinese"))) {
    return UDHR_ART18.chinese;
  }
  if (has("japanese")) return UDHR_ART18.japanese;
  if (has("korean")) return UDHR_ART18.korean;
  if (has("arabic")) return UDHR_ART18.arabic;
  if (has("hebrew")) return UDHR_ART18.hebrew;
  if (has("thai")) return UDHR_ART18.thai;
  if (has("devanagari")) return UDHR_ART18.devanagari;
  if (has("greek")) return UDHR_ART18.greek;
  if (has("cyrillic")) return UDHR_ART18.cyrillic;
  return UDHR_ART18.latin;
}
