import { MagnifyingGlassIcon, SquaresFourIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { CoveredBlock } from "@/lib/fonts/glyph-coverage";
import { EASE_OUT, MOTION_S } from "@/lib/motion";
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
  onSearch,
  searchMiss,
  onDismiss,
}: {
  blocks: CoveredBlock[];
  loading: boolean;
  active: string;
  onSelect: (name: string) => void;
  // Jump to the block/cell for a character or "U+XXXX" query. Returns whether
  // the query resolved to a covered glyph.
  onSearch: (query: string) => boolean;
  // True when the last search found no covered glyph, so the field can flag it.
  searchMiss: boolean;
  // Close the surrounding mobile drawer after a block or search jump, so the
  // grid you just asked for is visible instead of sitting behind the sheet.
  // Omitted in the desktop sidebar, which is always on screen.
  onDismiss?: () => void;
}) {
  // Always open at the top; don't let router scroll restoration carry the
  // sidebar's position across navigation.
  const viewportRef = useScrollReset<HTMLDivElement>();
  const [query, setQuery] = useState("");

  return (
    <aside className="flex h-full w-full min-w-0 flex-col text-sidebar-foreground">
      <ScrollArea viewportRef={viewportRef} className="min-h-0 flex-1">
        {/* Matches DetailSidebar (and the list's FilterSidebar): the panel
            fades and rises when the rail switches to this tab. */}
        <motion.div
          className="flex flex-col gap-4 p-4"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: MOTION_S.fast, ease: EASE_OUT }}
        >
          <h2 className="flex items-center gap-1.5 font-medium text-primary text-sm uppercase">
            <SquaresFourIcon className="size-4" />
            Unicode blocks
          </h2>
          {/* Character search: type a character or a "U+XXXX" code to jump to its
              block and highlight the cell. */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              // Only close on a hit; a miss keeps the drawer up so the
              // "doesn't cover that character" message stays visible.
              if (onSearch(query)) onDismiss?.();
            }}
          >
            <div className="relative">
              <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Character or U+XXXX"
                aria-label="Search glyphs by character or codepoint"
                aria-invalid={searchMiss || undefined}
                className={cn(
                  "h-8 w-full rounded-md border bg-transparent pr-2 pl-7 text-xs outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                  searchMiss && "border-red-500"
                )}
              />
            </div>
            {searchMiss && (
              <p className="mt-1 text-[10px] text-red-500">
                This font doesn't cover that character.
              </p>
            )}
          </form>
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
                    onClick={() => {
                      onSelect(block.name);
                      onDismiss?.();
                    }}
                    aria-pressed={on}
                    className={cn(
                      // min-h-11 (44px) meets the pointer-target guidance on
                      // touch, where this list lives in a drawer; the desktop
                      // sidebar keeps the tighter 8-unit row.
                      "flex min-h-11 items-center justify-between gap-2 rounded px-2 py-1 text-left text-xs transition-colors md:min-h-8",
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
        </motion.div>
      </ScrollArea>
    </aside>
  );
}
