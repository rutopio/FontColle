import { SquaresFourIcon } from "@phosphor-icons/react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { CoveredBlock } from "@/lib/fonts/glyph-coverage";
import { useScrollReset } from "@/lib/use-scroll-reset";
import { cn } from "@/lib/utils";

// Glyphs-view side panel: the Unicode blocks the font actually covers, one
// button each with its present-glyph count. Selecting a block sets the page's
// active block, which the Glyphs grid reads. Mirrors DetailSidebar's
// aside/ScrollArea shell so it slots into the same FilterLayout sidebar the
// Sample view uses.
export function GlyphsSidebar({
  blocks,
  loading,
  active,
  onSelect,
}: {
  blocks: CoveredBlock[];
  loading: boolean;
  active: string;
  onSelect: (name: string) => void;
}) {
  // Always open at the top; don't let router scroll restoration carry the
  // sidebar's position across navigation.
  const viewportRef = useScrollReset<HTMLDivElement>();

  return (
    <aside className="flex h-full w-full min-w-0 flex-col text-sidebar-foreground">
      <ScrollArea viewportRef={viewportRef} className="min-h-0 flex-1">
        <div className="flex flex-col gap-4 p-4">
          <h2 className="flex items-center gap-1.5 font-medium text-primary text-sm uppercase">
            <SquaresFourIcon className="size-4" />
            Unicode blocks
          </h2>
          {loading ? (
            <p className="text-muted-foreground text-xs">Loading…</p>
          ) : blocks.length === 0 ? (
            <p className="text-muted-foreground text-xs">No glyph coverage.</p>
          ) : (
            <div className="flex flex-col gap-0.5">
              {blocks.map(({ block, count }) => {
                const on = block.name === active;
                return (
                  <button
                    key={block.name}
                    type="button"
                    onClick={() => onSelect(block.name)}
                    aria-pressed={on}
                    className={cn(
                      "flex items-baseline justify-between gap-2 rounded px-2 py-1 text-left text-xs transition-colors",
                      on
                        ? "bg-black/10 font-medium text-foreground dark:bg-white/12"
                        : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
                    )}
                  >
                    <span className="truncate">{block.name}</span>
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
