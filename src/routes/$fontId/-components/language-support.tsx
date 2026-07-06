import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { languageLabel, scriptLabel, splitLanguages } from "@/lib/fonts/labels";
import type { FontRecord } from "@/lib/fonts/types";
import { Panel } from "./panel";

// Read-only writing-system + language support (todo: language-support task).
// Scripts render as pills; languages default to the major set (>=5M speakers)
// with a "show all" expander for the long tail, matching the GF website.
export function LanguageSupport({ font }: { font: FontRecord }) {
  const [showAll, setShowAll] = useState(false);
  const { major, minor } = useMemo(
    () => splitLanguages(font.languages),
    [font.languages]
  );
  const shown = showAll ? [...major, ...minor] : major;

  return (
    <div className="grid gap-4 md:grid-cols-2">
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
          <div className="flex flex-wrap gap-1.5">
            {shown.map((id) => (
              <Badge key={id} variant="outline">
                {languageLabel(id)}
              </Badge>
            ))}
          </div>
          {minor.length > 0 && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="mt-2 font-mono text-muted-foreground text-xs hover:text-foreground"
            >
              {showAll ? "Show fewer" : `Show all ${font.languages.length}`}
            </button>
          )}
        </Panel>
      )}
    </div>
  );
}
