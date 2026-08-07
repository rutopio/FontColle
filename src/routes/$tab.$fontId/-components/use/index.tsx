import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import type { FontRecord } from "@/lib/fonts/types";
import { BunnyMethod } from "./bunny-fonts";
import { FontsourceMethod } from "./fontsource";
import { GoogleFontsMethod } from "./google-fonts";
import { fallbackFor } from "./shared";

export const USE_METHODS = ["google", "fontsource", "bunny"] as const;
export type UseMethod = (typeof USE_METHODS)[number];

// Outside ScrollArea (scroll-fade mask) and needs its own Tabs root (panels are siblings).
export function UseMethodTabs({
  method,
  onMethodChange,
}: {
  method: UseMethod;
  onMethodChange: (value: UseMethod) => void;
}) {
  return (
    <Tabs
      value={method}
      onValueChange={(value) => onMethodChange(value as UseMethod)}
    >
      <TabsList>
        <TabsTab value="google">Google Fonts</TabsTab>
        <TabsTab value="fontsource">Fontsource</TabsTab>
        <TabsTab value="bunny">Bunny Fonts</TabsTab>
      </TabsList>
    </Tabs>
  );
}

export function UsePanel({
  font,
  axisState,
  italic,
  method,
}: {
  font: FontRecord;
  axisState: Record<string, number>;
  italic: boolean;
  method: UseMethod;
}) {
  const cssFamily = `"${font.name}", ${fallbackFor(font.category)}`;

  return (
    <Tabs value={method}>
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
