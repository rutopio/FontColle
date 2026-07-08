import { CaretDownIcon } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  groupLanguagesByRegion,
  languageLabel,
  scriptLabel,
} from "@/lib/fonts/labels";
import type { FontRecord } from "@/lib/fonts/types";
import { cn } from "@/lib/utils";
import { Panel } from "./panel";

// Read-only writing-system + language support. Scripts render as pills;
// languages are grouped by continent into accordions (Africa/Americas/Asia/
// Europe/Oceania), matching how the Google Fonts specimen lists them.
export function LanguageSupport({ font }: { font: FontRecord }) {
  const regions = useMemo(
    () => groupLanguagesByRegion(font.languages),
    [font.languages]
  );

  return (
    <div className="grid gap-4 md:grid-cols-1">
      {font.scripts.length > 0 && (
        <Panel label="Writing systems" count={font.scripts.length}>
          <div className="flex flex-wrap gap-1.5">
            {font.scripts.map((s) => (
              <Badge key={s} variant="secondary">
                {scriptLabel(s)}
              </Badge>
            ))}
          </div>
        </Panel>
      )}
      {font.languages.length > 0 && (
        <Panel label="Languages" count={font.languages.length}>
          <div className="flex flex-col">
            {regions.map(({ region, ids }, i) => (
              <RegionAccordion
                key={region}
                region={region}
                ids={ids}
                defaultOpen={i === 0}
              />
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

function RegionAccordion({
  region,
  ids,
  defaultOpen,
}: {
  region: string;
  ids: string[];
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-border border-t first:border-t-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 py-2.5 text-left text-sm"
      >
        <CaretDownIcon
          className={cn("size-3.5 transition-transform", !open && "-rotate-90")}
        />
        <span className="font-medium">{region}</span>
        <span className="font-mono text-muted-foreground text-xs">
          {ids.length}
        </span>
      </button>
      {/* Animate open/closed by transitioning grid rows 0fr -> 1fr; the inner
          wrapper clips the collapsed content. */}
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="grid grid-cols-4 gap-x-3 gap-y-1 pb-3 text-sm">
            {ids.map((id) => (
              <span key={id} className="truncate text-muted-foreground">
                {languageLabel(id)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
