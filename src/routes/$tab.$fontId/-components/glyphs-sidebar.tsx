import { SquaresFourIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { SearchBox } from "@/components/filter/search-box";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useProximityHover,
  useRegisterProximityItem,
} from "@/hooks/use-proximity-hover";
import { useScrollReset } from "@/hooks/use-scroll-reset";
import type { CoveredBlock } from "@/lib/fonts/glyph-coverage";
import { EASE_OUT, MOTION_S, spring } from "@/lib/motion";
import { cn } from "@/lib/utils";

function BlockButton({
  block,
  count,
  on,
  onClick,
  proximityIndex,
  registerItem,
}: {
  block: CoveredBlock["block"];
  count: number;
  on: boolean;
  onClick: () => void;
  proximityIndex: number;
  registerItem: (index: number, element: HTMLElement | null) => void;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  useRegisterProximityItem(registerItem, proximityIndex, btnRef);

  return (
    <button
      ref={btnRef}
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "relative flex min-h-11 items-center justify-between gap-2 rounded px-2 py-1 text-left text-xs transition-colors md:min-h-8",
        on
          ? "bg-accent font-medium text-accent-foreground"
          : "hover:text-foreground"
      )}
    >
      <span className="truncate">{block.name}</span>
      <span className="shrink-0 font-mono text-3xs text-muted-foreground">
        {count}
      </span>
    </button>
  );
}

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
  const listRef = useRef<HTMLElement>(null);
  const {
    activeIndex,
    sessionRef,
    handlers,
    registerItem,
    itemRects,
    isMeasured,
  } = useProximityHover(listRef);

  const hoverRect =
    isMeasured && activeIndex !== null ? itemRects[activeIndex] : null;

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
              <p className="mt-1 text-3xs text-destructive">
                This font doesn't cover that character.
              </p>
            )}
          </form>
          {loading ? (
            <p className="shimmer text-muted-foreground text-xs">Loading…</p>
          ) : blocks.length === 0 ? (
            <p className="text-muted-foreground text-xs">No glyph coverage.</p>
          ) : (
            <nav
              ref={listRef}
              aria-label="Unicode blocks"
              onMouseMove={handlers.onMouseMove}
              onMouseEnter={handlers.onMouseEnter}
              onMouseLeave={handlers.onMouseLeave}
              className="relative flex flex-col gap-0.5"
            >
              <AnimatePresence>
                {hoverRect && (
                  <motion.div
                    key={sessionRef.current}
                    className="pointer-events-none absolute rounded bg-accent/50"
                    initial={{
                      opacity: 0,
                      top: hoverRect.top,
                      left: hoverRect.left,
                      width: hoverRect.width,
                      height: hoverRect.height,
                    }}
                    animate={{
                      opacity: 1,
                      top: hoverRect.top,
                      left: hoverRect.left,
                      width: hoverRect.width,
                      height: hoverRect.height,
                    }}
                    exit={{ opacity: 0, transition: spring.fast.exit }}
                    transition={{ ...spring.fast, opacity: { duration: 0.08 } }}
                  />
                )}
              </AnimatePresence>

              {blocks.map(({ block, count }, index) => (
                <BlockButton
                  key={block.name}
                  block={block}
                  count={count}
                  on={block.name === active}
                  onClick={() => {
                    onSelect(block.name);
                    onDismiss?.();
                  }}
                  proximityIndex={index}
                  registerItem={registerItem}
                />
              ))}
            </nav>
          )}
        </motion.div>
      </ScrollArea>
    </aside>
  );
}
