import { CaretDownIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { Fragment, useMemo, useState } from "react";
import { Separator } from "@/components/ui/separator";
import { groupLanguagesByRegion, languageLabel } from "@/lib/fonts/labels";
import type { FontRecord } from "@/lib/fonts/types";
import { cn } from "@/lib/utils";
import { Panel } from "./panel";

// Read-only language support: languages grouped by continent into accordions
// (Africa/Americas/Asia/Europe/Oceania), matching how the Google Fonts
// specimen lists them. Writing systems live in the specs row on the detail tab.
export function LanguageSupport({ font }: { font: FontRecord }) {
  const regions = useMemo(
    () => groupLanguagesByRegion(font.languages),
    [font.languages]
  );

  return (
    <Panel label="Languages" count={font.languages.length}>
      <div className="flex flex-col">
        {regions.map(({ region, ids }, i) => (
          <Fragment key={region}>
            {i > 0 && <Separator />}
            <RegionAccordion region={region} ids={ids} defaultOpen={false} />
          </Fragment>
        ))}
      </div>
    </Panel>
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
    <div>
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
      {/* Motion collapses the region open/closed by animating height auto <-> 0;
          overflow-hidden clips the content while it slides. */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-4 gap-x-3 gap-y-1 pb-3 text-sm">
              {ids.map((id) => (
                <span key={id} className="truncate text-muted-foreground">
                  {languageLabel(id)}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
