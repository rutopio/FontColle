import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import type { FontRecord } from "@/lib/fonts/types";
import { BunnyMethod } from "./bunny-fonts";
import { FontsourceMethod } from "./fontsource";
import { GoogleFontsMethod } from "./google-fonts";
import { fallbackFor } from "./shared";

// The Use tab: three ways to put this family on a page, selected one at a time
// via a tab switcher (rather than all three side by side).
//   1. Google Fonts API, a hosted <link> (like the GF embed panel).
//   2. Fontsource, self-hosted npm/CDN package (like fontsource.org's install page).
//   3. Bunny Fonts, a GDPR-friendly, privacy-first Google Fonts drop-in.
// Every snippet is derived from the family's real weights/variability, so it
// matches what this specific font actually ships. Each method keeps its own
// Panel header (the tab labels are short names), and switching methods unmounts
// the inactive ones, a method's internal picks reset when revisited, which is
// fine since switching methods usually means changing approach.
export function UsePanel({
  font,
  axisState,
  italic,
}: {
  font: FontRecord;
  // Live axis values + italic from the Specimen sidebar, so the Google Fonts
  // method can offer a "Match current preview" shortcut.
  axisState: Record<string, number>;
  italic: boolean;
}) {
  const cssFamily = `"${font.name}", ${fallbackFor(font.category)}`;

  return (
    <Tabs defaultValue="google">
      <TabsList className="mb-4">
        <TabsTab value="google">Google Fonts</TabsTab>
        <TabsTab value="fontsource">Fontsource</TabsTab>
        <TabsTab value="bunny">Bunny Fonts</TabsTab>
      </TabsList>
      <TabsPanel value="google">
        <GoogleFontsMethod
          font={font}
          cssFamily={cssFamily}
          previewAxes={axisState}
          previewItalic={italic}
        />
      </TabsPanel>
      <TabsPanel value="fontsource">
        <FontsourceMethod font={font} />
      </TabsPanel>
      <TabsPanel value="bunny">
        <BunnyMethod font={font} />
      </TabsPanel>
    </Tabs>
  );
}
