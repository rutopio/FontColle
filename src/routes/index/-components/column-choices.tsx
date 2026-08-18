import { CheckIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useRef } from "react";
import { COL_CHOICES } from "@/components/font-grid";
import { useProximityHover } from "@/hooks/use-proximity-hover";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * The column cap list, matching the Select popup's proximity hover: the
 * highlight is one shared block that springs between rows as the pointer
 * approaches, rather than a per-row background that pops on and off. The
 * checked row keeps its own layer underneath so the two never fight.
 */
export function ColumnChoices({
  current,
  onSelect,
}: {
  current: number;
  onSelect: (n: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    activeIndex,
    setActiveIndex,
    itemRects,
    handlers,
    registerItem,
    sessionRef,
  } = useProximityHover(containerRef);

  // COL_CHOICES is a readonly tuple of literals, so widen before searching.
  const checkedIndex = (COL_CHOICES as readonly number[]).indexOf(current);
  const activeRect = activeIndex != null ? itemRects[activeIndex] : undefined;
  const checkedRect = useMemo(
    () => (checkedIndex !== -1 ? itemRects[checkedIndex] : undefined),
    [checkedIndex, itemRects]
  );

  return (
    <div
      ref={containerRef}
      // The pointer handlers drive the shared highlight, so the wrapper needs a
      // role. `menu` over `listbox`: the rows are real buttons that act on
      // click, not options in a value set.
      role="menu"
      aria-label="Maximum columns"
      className="relative flex flex-col gap-0.5"
      onMouseMove={handlers.onMouseMove}
      onMouseEnter={handlers.onMouseEnter}
      onMouseLeave={() => {
        handlers.onMouseLeave();
        setActiveIndex(null);
      }}
    >
      <AnimatePresence>
        {checkedRect && (
          <motion.div
            className="pointer-events-none absolute rounded-md bg-accent"
            initial={false}
            animate={{
              top: checkedRect.top,
              left: checkedRect.left,
              width: checkedRect.width,
              height: checkedRect.height,
              opacity: 1,
            }}
            exit={{ opacity: 0, transition: spring.moderate.exit }}
            transition={{ ...spring.moderate, opacity: { duration: 0.08 } }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeRect && (
          <motion.div
            key={sessionRef.current}
            className="pointer-events-none absolute rounded-md bg-accent/50"
            initial={{
              opacity: 0,
              top: activeRect.top,
              left: activeRect.left,
              width: activeRect.width,
              height: activeRect.height,
            }}
            animate={{
              opacity: 1,
              top: activeRect.top,
              left: activeRect.left,
              width: activeRect.width,
              height: activeRect.height,
            }}
            exit={{ opacity: 0, transition: spring.fast.exit }}
            transition={{ ...spring.fast, opacity: { duration: 0.08 } }}
          />
        )}
      </AnimatePresence>

      {COL_CHOICES.map((n, index) => {
        const on = n === current;
        return (
          <button
            key={n}
            type="button"
            ref={(node) => registerItem(index, node)}
            data-proximity-index={index}
            role="menuitemradio"
            aria-checked={on}
            onClick={() => onSelect(n)}
            onFocus={(e) => {
              if ((e.target as HTMLElement).matches(":focus-visible"))
                setActiveIndex(index);
            }}
            // "Col." is a visual abbreviation; speech gets the word.
            aria-label={`Maximum ${n} ${n === 1 ? "column" : "columns"}`}
            className={cn(
              "relative z-10 flex h-8 items-center gap-2.5 rounded-md px-2.5 text-left text-sm outline-none transition-colors duration-80",
              on ? "font-medium text-accent-foreground" : "text-foreground"
            )}
          >
            <span className="text-muted-foreground">Max</span>
            <span className="font-mono tabular-nums">{n}</span>
            <span className="text-muted-foreground">Col.</span>
            <CheckIcon
              className={cn(
                "size-4 shrink-0 text-primary",
                on ? "visible" : "invisible"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
