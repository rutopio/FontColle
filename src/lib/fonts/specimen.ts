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
  korean:
    "모든 인류 구성원의 천부의 존엄성과 동등하고 양도할 수 없는 권리를 인정하는",
} as const;

// The three specimen lines Google Fonts shows at its heading sizes, per script.
// These are the gflanguages `sample_text.specimen_48 / _36 / _32` strings
// verbatim -- the same fields Google's own specimen page renders at those
// sizes, so each line is the official UDHR translation already sized for its
// tier (shorter for the larger heading). Only the Tester's seed reads
// these; the single-sentence previews elsewhere use UDHR_PREAMBLE.
const UDHR_TIERS = {
  latin: [
    "Whereas a common understanding of these rights and freedoms is",
    "No one shall be held in slavery or servitude; slavery and the slave trade shall be prohibited in all their forms.",
    "Everyone has the right to an effective remedy by the competent national tribunals for acts violating the fundamental rights granted him by the constitution or by law.",
  ],
  cyrillic: [
    "принимая во внимание, что народы Объединенных Наций подтвердили",
    "Никто не должен содержаться в рабстве или в подневольном состоянии; рабство и работорговля запрещаются во всех их видах.",
    "Каждый человек имеет право на социальный и международный порядок, при котором права и свободы, изложенные в настоящей Декларации, могут быть полностью осуществлены.",
  ],
  greek: [
    "Όλοι οι άνθρωποι γεννιούνται ελεύθεροι και ίσοι στην",
    "Όλοι οι άνθρωποι γεννιούνται ελεύθεροι και ίσοι στην αξιοπρέπεια και τα δικαιώματα. Είναι προικισμένοι με λογική και συνείδηση, και οφείλουν να συμπεριφέρονται μεταξύ τους με πνεύμα αδελφοσύνης.",
    "Όλοι οι άνθρωποι γεννιούνται ελεύθεροι και ίσοι στην αξιοπρέπεια και τα δικαιώματα. Είναι προικισμένοι με λογική και συνείδηση, και οφείλουν να συμπεριφέρονται μεταξύ τους με πνεύμα αδελφοσύνης.",
  ],
  arabic: [
    "ولما كانت الدول الأعضاء قد تعهدت بالتعاون مع الأمم المتحدة على",
    "يولد جميع الناس أحرارًا متساوين في الكرامة والحقوق. وقد وهبوا عقلاً وضميرًا وعليهم أن يعامل بعضهم بعضًا بروح الإخاء.",
    "كل الناس سواسية أمام القانون ولهم الحق في التمتع بحماية متكافئة عنه دون أية تفرقة، كما أن لهم جميعاً الحق في حماية متساوية ضد أي تمييز يُخل بهذا الإعلان وضد أي تحريض على تمييز كهذا.",
  ],
  hebrew: [
    "לא יהיה אדם נתון לעינויים, ולא ליחס או לעונש אכזריים, בלתי אנושיים",
    "כל אחד זכאי לתקנה יעילה מטעם בחי הדין הלאומיים המוסמכים נגד מעשים המפירים את זכויות היסוד שניתנו לו על פי החוקה והחוקים",
    "כל אדם זכאי, מתוך שויון גמור עם זולתו, למשפט הוגן ופומבי של ביתדין כלתי תלוי וללא משוא פנים בשעה שבאים לקבוע זכויותיו וחובותיו ולברר כל אשמה פלילית שהובאה נגדו",
  ],
  thai: [
    "การไม่นำพาและการหมิ่นในคุณค่าของสิทธิมนุษยชน ยังผลให้มีการกระทำอันป่าเถื่อน",
    "โดยที่เป็นการจำเป็นที่สิทธิมนุษยชนควรได้รับความคุ้มครองโดยหลักนิติธรรม ถ้าจะไม่บังคับให้คนต้องหันเข้าหาการลุกขึ้นต่อต้านทรราชและการกดขี่เป็นวิถีทางสุดท้าย",
    "ทุกคนย่อมมีสิทธิในความเสมอภาคอย่างเต็มที่ในการได้รับการพิจารณาคดีที่เป็นธรรมและเปิดเผยจากศาลที่อิสระและไม่ลำเอียง ในการพิจารณากำหนดสิทธิและหน้าที่ของตนและข้อกล่าวหาอาญาใดต่อตน",
  ],
  devanagari: [
    "चूंकि संयुक्त राष्ट्रों के सदस्य देशों की जनताओं ने बुनियादी मानव अधिकारों में, मानव व्यक्तित्व के",
    "सभी को संविधान या क़ानून द्वारा प्राप्त बुनियादी अधिकारों का अतिक्रमण करने वाले कार्यों के विरुद्ध समुचित राष्ट्रीय अदालतों की कारगर सहायता पाने का हक़ है ।",
    "सभी को पूर्णतः समान रूप से हक़ है कि उनके अधिकारों और कर्तव्यों के निश्चय करने के मामले में और उन पर आरोपित फौज़दारी के किसी मामले में उनकी सुनवाई न्यायोचित और सार्वजनिक रूप से निरपेक्ष एवं निष्पक्ष अदालत द्वारा हो ।",
  ],
  chineseSimplified: [
    "法律之前人人平等,并有权享受法律的平等保护,不受任何歧视。人人有权享受平等保护,以免受违反本宣言的任何歧视行为以及煽动这种歧视的任何行为之害",
    "鉴于对人类家庭所有成员的固有尊严及其平等的和不移的权利的承认,乃是世界自由、正义与和平的基础, 鉴于对人权的无视和侮蔑已发展为野蛮暴行,这些暴行玷污了人类的良心,而一个人人享有言论和信仰自由并免予恐惧和匮乏的世界的来临,已被宣布为普通人民的最高愿望,",
    "鉴于对人类家庭所有成员的固有尊严及其平等的和不移的权利的承认,乃是世界自由、正义与和平的基础, 鉴于对人权的无视和侮蔑已发展为野蛮暴行,这些暴行玷污了人类的良心,而一个人人享有言论和信仰自由并免予恐惧和匮乏的世界的来临,已被宣布为普通人民的最高愿望, 鉴于为使人类不致迫不得已铤而走险对暴政和压迫进行反叛,有必要使人权受法治的保护,",
  ],
  chineseTraditional: [
    "法律之前人人平等，並有權享受法律的平等保護，不受任何歧視。人人有權享受平等保護，以免受違反本宣言的任何歧視行為以及煽動這種歧視的任何行為之害",
    "鑑於對人類家庭所有成員的固有尊嚴及其平等的和不移的權利的承認，乃是世界自由、正義與和平的基礎， 鑑於對人權的無視和侮蔑已發展為野蠻暴行，這些暴行沾污了人類的良心，而一個人人享有言論和信仰自由並免予恐懼和匱乏的世界的來臨，已被宣布為普通人民的最高願望，",
    "鑑於對人類家庭所有成員的固有尊嚴及其平等的和不移的權利的承認，乃是世界自由、正義與和平的基礎， 鑑於對人權的無視和侮蔑已發展為野蠻暴行，這些暴行沾污了人類的良心，而一個人人享有言論和信仰自由並免予恐懼和匱乏的世界的來臨，已被宣布為普通人民的最高願望， 鑑於為使人類不致迫不得已鋌而走險對暴政和壓迫進行反叛，有必要使人權受法治的保護，",
  ],
  japanese: [
    "社会の各個人及び各機関が、この世界人権宣言を常に念頭に置きながら、加盟国自身の人民の間にも、また、加盟国の管轄下にある地域の人民の間にも",
    "すべて人は、人種、皮膚の色、性、言語、宗教、政治上その他の意見、国民的もしくは社会的出身、財産、門地その他の地位又はこれに類するいかなる自由による差別をも受けることなく、この宣言に掲げるすべての権利と自由とを享有することができる。",
    "社会の各個人及び各機関が、この世界人権宣言を常に念頭に置きながら、加盟国自身の人民の間にも、また、加盟国の管轄下にある地域の人民の間にも、これらの権利と自由との尊重を指導及び教育によって促進すること並びにそれらの普遍的措置によって確保することに努力するように、すべての人民とすべての国とが達成すべき共通の基準として、この人権宣言を公布する。",
  ],
  korean: [
    "국제연합의 모든 사람들은 그 헌장에서 기본적 인권, 인간의 존엄과 가치, 그리고 남녀의 동등한 권리에 대한 신념을",
    "모든 사람은 인종, 피부색, 성, 언어, 종교, 정치적 또는 기타의 견해, 민족적 또는 사회적 출신, 재산, 출생 또는 기타의 신분과 같은 어떠한 종류의 차별이 없이, 이 선언에 규정된 모든 권리와 자유를 향유할 자격이 있다.",
    "모든 사람은 사상, 양심 및 종교의 자유에 대한 권리를 가진다. 이러한 권리는 종교 또는 신념을 변경할 자유와, 단독으로 또는 다른 사람과 공동으로 그리고 공적으로 또는 사적으로 선교, 행사, 예배 및 의식에 의하여 자신의 종교나 신념을 표명하는 자유를 포함한다.",
  ],
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

// Same keying as SCRIPT_SPECIMEN, for the three-tier Tester seed.
const SCRIPT_TIERS: Record<string, readonly string[]> = {
  Hant: UDHR_TIERS.chineseTraditional,
  Hans: UDHR_TIERS.chineseSimplified,
  Jpan: UDHR_TIERS.japanese,
  Kore: UDHR_TIERS.korean,
  Arab: UDHR_TIERS.arabic,
  Hebr: UDHR_TIERS.hebrew,
  Thai: UDHR_TIERS.thai,
  Deva: UDHR_TIERS.devanagari,
  Grek: UDHR_TIERS.greek,
  Cyrl: UDHR_TIERS.cyrillic,
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

// The Tester's opening document: three lines seeded as Heading 1 / 2 / 3,
// the way Google Fonts' specimen page opens. Each line is that tier's own UDHR
// passage in the font's script, already sized for its heading (the h1 line is
// the shortest), so the stack reads as a specimen rather than one sentence
// repeated at three sizes.
//
// An emoji or deliberately-blank font has no passage, so it seeds a single
// line. Duplicates are dropped: a couple of scripts repeat a string across
// tiers upstream, and three identical headings is the thing this avoids.
export function specimenLinesFor(font: FontRecord): string[] {
  // Reuse specimenFor's blank/emoji handling rather than restating it.
  const single = specimenFor(font);
  if (single === "" || single === EMOJI_SAMPLE) return [single];

  const primary = font.primaryScript;
  const tiers = (primary && SCRIPT_TIERS[primary]) || UDHR_TIERS.latin;

  const lines: string[] = [];
  for (const line of tiers) {
    if (line && !lines.includes(line)) lines.push(line);
  }
  // Every script ships all three tiers, but never seed an empty document if
  // that ever stops being true.
  return lines.length > 0 ? lines : [single];
}
