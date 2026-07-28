import { SquaresFourIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useState } from "react";
import { SearchBox } from "@/components/filter/search-box";
import type { CoveredBlock } from "@/lib/fonts/glyph-coverage";
import { EASE_OUT, MOTION_S } from "@/lib/motion";
import { cn } from "@/lib/utils";

// The Glyphs tab's block list, formerly the glyphs sidebar. Mirrors
// PreviewControls: the same narrow stack, rendered in the body's own controls
// column on desktop and in the mobile drawer below that.
export function BlockPicker({
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
  // Returns whether the query resolved to a covered glyph.
  onSearch: (query: string) => boolean;
  searchMiss: boolean;
  // Omitted in the desktop column, which is always on screen.
  onDismiss?: () => void;
}) {
  const [query, setQuery] = useState("");

  return (
    <motion.div
      className="flex flex-col gap-4"
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
          // A miss keeps the drawer up, so its message stays visible.
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
            "focus:border-input focus-visible:ring-2 focus-visible:ring-sidebar-ring",
            searchMiss && "border-red-500"
          )}
        />
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
                  // min-h-11 meets the touch pointer-target guidance, where
                  // this list lives in a drawer; desktop keeps the tighter row.
                  "flex min-h-11 items-center justify-between gap-2 rounded px-2 py-1 text-left text-xs transition-colors md:min-h-8",
                  on
                    ? "bg-black/10 font-medium text-foreground dark:bg-white/12"
                    : "hover:bg-sidebar-accent/50 hover:text-foreground"
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
  );
}
