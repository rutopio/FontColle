export const SITE_NAME = "FontColle";

/** Readers guess at "Colle"; spell the intended sound out. */
export const SITE_NAME_PRONUNCIATION = "font-koh-lay";

export const SITE_DESCRIPTION =
  "FontColle is an enhanced Google Fonts Collection that filters by what " +
  "type actually does: OpenType features, variable axes, weight and width " +
  "steps, writing systems, and color vs. monochrome. Save the ones you like.";

/**
 * The About panel names the pronunciation inline, styled apart from the prose,
 * so it renders as nodes rather than one string. Search engines and social
 * cards keep SITE_DESCRIPTION clean — the gloss lives only here.
 */
export const ABOUT_DESCRIPTION_REST = SITE_DESCRIPTION.slice(
  SITE_NAME.length
).trimStart();
