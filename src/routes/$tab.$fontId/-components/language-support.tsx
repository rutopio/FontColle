import { CaretDownIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { Fragment, useId, useMemo, useState } from "react";
import { Separator } from "@/components/ui/separator";
import { groupLanguagesByRegion, languageLabel } from "@/lib/fonts/labels";
import type { FontRecord } from "@/lib/fonts/types";
import { EASE_OUT, MOTION_S } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { Panel } from "./panel";

// Read-only language support: languages grouped by continent into accordions
// (Africa/Americas/Asia/Europe/Oceania), matching how the Google Fonts
// specimen lists them. A language spoken on several continents is listed under
// each, so the per-region counts sum to more than the panel's total; the panel
// header keeps showing the true number of distinct languages.
// Writing systems live in the specs row on the detail tab.
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
  // Names the collapsed region so aria-expanded has something to point at.
  const panelId = useId();

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-2 py-2.5 text-left text-sm"
      >
        <CaretDownIcon
          aria-hidden="true"
          className={cn("size-3.5 transition-transform", !open && "-rotate-90")}
        />
        <span className="font-medium">{region}</span>
        <span className="font-mono text-muted-foreground text-xs">
          {ids.length}
        </span>
      </button>
      {/* Motion collapses the region open/closed by animating height auto <-> 0;
          overflow-hidden clips the content while it slides. The id sits on this
          always-mounted wrapper rather than the motion child, so the button's
          aria-controls still resolves while the region is collapsed. */}
      <div id={panelId}>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: MOTION_S.base, ease: EASE_OUT }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-4 gap-x-3 gap-y-1 pb-3 text-sm">
                {ids.map((id) => (
                  <span key={id} className="truncate">
                    {languageLabel(id)}
                  </span>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
