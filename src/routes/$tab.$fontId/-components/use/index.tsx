import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import type { FontRecord } from "@/lib/fonts/types";
import { BunnyMethod } from "./bunny-fonts";
import { FontsourceMethod } from "./fontsource";
import { GoogleFontsMethod } from "./google-fonts";
import { fallbackFor } from "./shared";

export function UsePanel({
  font,
  axisState,
  italic,
}: {
  font: FontRecord;
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
