import { SquaresFourIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useState } from "react";
import { SearchBox } from "@/components/filter/search-box";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { CoveredBlock } from "@/lib/fonts/glyph-coverage";
import { EASE_OUT, MOTION_S } from "@/lib/motion";
import { useScrollReset } from "@/lib/use-scroll-reset";
import { cn } from "@/lib/utils";

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
  onSearch: (query: string) => boolean;
  searchMiss: boolean;
  onDismiss?: () => void;
}) {
  const viewportRef = useScrollReset<HTMLDivElement>();
  const [query, setQuery] = useState("");

  return (
    <aside className="flex h-full w-full min-w-0 flex-col text-foreground">
      <ScrollArea fade viewportRef={viewportRef} className="min-h-0 flex-1">
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
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (onSearch(query)) onDismiss?.();
            }}
          >
            <SearchBox
              size="sm"
              value={query}
              onChange={setQuery}
              placeholder="Character or U+XXXX"
              label="Search glyphs by character or codepoint"
              aria-invalid={searchMiss || undefined}
              inputClassName={cn(
                "focus:border-input focus-visible:ring-2 focus-visible:ring-ring",
                searchMiss && "border-destructive"
              )}
            />
            {searchMiss && (
              <p className="mt-1 text-[10px] text-destructive">
                This font doesn't cover that character.
              </p>
            )}
          </form>
          {loading ? (
            <p className="shimmer text-muted-foreground text-xs">Loading…</p>
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
                      "flex min-h-11 items-center justify-between gap-2 rounded px-2 py-1 text-left text-xs transition-colors md:min-h-8",
                      on
                        ? "bg-accent font-medium text-accent-foreground"
                        : "hover:bg-accent/50 hover:text-foreground"
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
