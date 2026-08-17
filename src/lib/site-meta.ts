export const SITE_NAME = "FontFridge";

/**
 * Browser-chrome colours, matching --background in styles.css. Light is the
 * default: dark applies only when the user has explicitly turned it on, never
 * from prefers-color-scheme. Kept here (a dependency-free module) so both the
 * blocking theme script in __root.tsx and the runtime toggle share one source.
 */
export const THEME_COLOR_LIGHT = "#ffffff";
export const THEME_COLOR_DARK = "#0a0a0a";

export const SITE_DESCRIPTION =
  "FontFridge is an enhanced Google Fonts Collection that filters by what " +
  "type actually does: OpenType features, variable axes, weight and width " +
  "steps, writing systems, and color vs. monochrome. Save the ones you like.";
