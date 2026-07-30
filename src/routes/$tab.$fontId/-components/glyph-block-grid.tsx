import { useVirtualizer } from "@tanstack/react-virtual";
import { AnimatePresence, motion } from "motion/react";
import type { CSSProperties, RefObject } from "react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useGlyphCompact } from "@/hooks/use-mobile";
import { hasCodepoint } from "@/lib/fonts/glyph-coverage";
import type { UnicodeBlock } from "@/lib/fonts/unicode-blocks";
import { spring } from "@/lib/springs";
import { cn } from "@/lib/utils";

export type Range = [number, number];

export const COLS_DESKTOP = 16;
export const COLS_MOBILE = 5;
export const LABEL_W = 44;
const GAP = 1;
const ROW_FALLBACK = 40;

export function hex(cp: number): string {
  return cp.toString(16).toUpperCase().padStart(4, "0");
}

function isRenderable(cp: number): boolean {
  if (cp < 0x20 || (cp >= 0x7f && cp <= 0x9f)) return false;
  if (cp >= 0xd800 && cp <= 0xdfff) return false;
  return true;
}

export function BlockGrid({
  block,
  ranges,
  style,
  scrollRef,
  highlightCp,
  onCopy,
}: {
  block: UnicodeBlock;
  ranges: Range[];
  style: CSSProperties;
  scrollRef: RefObject<HTMLDivElement | null>;
  highlightCp: number | null;
  onCopy: (cp: number) => void;
}) {
  const compact = useGlyphCompact();
  const COLS = compact ? COLS_MOBILE : COLS_DESKTOP;
  const labelW = compact ? 0 : LABEL_W;
  const gridCols = labelW
    ? `${labelW}px repeat(${COLS}, minmax(0, 1fr))`
    : `repeat(${COLS}, minmax(0, 1fr))`;

  const present = useMemo(() => {
    if (!compact) return null;
    const cps: number[] = [];
    for (let cp = block.start; cp <= block.end; cp++) {
      if (isRenderable(cp) && hasCodepoint(ranges, cp)) cps.push(cp);
    }
    return cps;
  }, [compact, block.start, block.end, ranges]);

  const lead = compact ? 0 : block.start % COLS;
  const total = present ? present.length : lead + (block.end - block.start + 1);
  const rowCount = Math.ceil(total / COLS);

  const gridRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  const [cellSize, setCellSize] = useState(ROW_FALLBACK);
  useLayoutEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const measure = () => {
      if (scrollRef.current) setScrollMargin(el.offsetTop);
      const gaps = labelW ? COLS + 1 : COLS - 1;
      const w = el.clientWidth - labelW - gaps * GAP;
      if (w > 0) setCellSize(w / COLS);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [scrollRef, COLS, labelW]);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => cellSize,
    overscan: 6,
    scrollMargin,
  });
  // biome-ignore lint/correctness/useExhaustiveDependencies: cellSize is the trigger, not read in the body, a size change must re-run measurement.
  useLayoutEffect(() => {
    rowVirtualizer.measure();
  }, [cellSize, rowVirtualizer]);

  const popRef = useRef<HTMLDivElement>(null);
  const popGlyphRef = useRef<HTMLDivElement>(null);
  const popLabelRef = useRef<HTMLSpanElement>(null);

  const cpOf = (e: React.MouseEvent): number | null => {
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-cp]");
    if (!el) return null;
    return Number(el.dataset.cp);
  };

  const popBox = useRef<{ w: number; h: number } | null>(null);

  const showAt = (cp: number, x: number, y: number) => {
    const pop = popRef.current;
    if (!pop) return;
    if (popGlyphRef.current)
      popGlyphRef.current.textContent = String.fromCodePoint(cp);
    if (popLabelRef.current) popLabelRef.current.textContent = `U+${hex(cp)}`;
    const CURSOR_GAP = 16;
    const MARGIN = 8;
    if (pop.style.display === "none") {
      pop.style.display = "flex";
      popBox.current = { w: pop.offsetWidth, h: pop.offsetHeight };
    }
    const { w, h } = popBox.current ?? { w: 0, h: 0 };
    const left =
      x + CURSOR_GAP + w + MARGIN > window.innerWidth
        ? x - CURSOR_GAP - w
        : x + CURSOR_GAP;
    const top =
      y + CURSOR_GAP + h + MARGIN > window.innerHeight
        ? y - CURSOR_GAP - h
        : y + CURSOR_GAP;
    pop.style.transform = `translate3d(${Math.max(MARGIN, left)}px, ${Math.max(MARGIN, top)}px, 0)`;
  };
  const hide = () => {
    if (popRef.current) popRef.current.style.display = "none";
  };

  /* Proximity hover: one shared highlight that slides between cells instead of
     a per-cell :hover. Only present glyphs get one; empty pads and
     missing-glyph cells are skipped so the highlight never lands on a
     non-interactive square. */
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const sessionRef = useRef(0);

  /* Columns are derived arithmetically — the horizontal pitch is exactly
     `cellSize + GAP` (the grid's `gap-px`). Rows are not: `cellSize` is the
     pre-measurement estimate, and the virtualizer settles on a slightly
     different real height, so deriving `top` from it drifts a fraction of a
     pixel per row and visibly misaligns deep into a block. Take the row's
     start/size from the virtualizer, which measured it, and subtract
     `scrollMargin` to match the coordinate space each row is placed in. */
  const hoverRow =
    hoverIdx == null
      ? null
      : rowVirtualizer
          .getVirtualItems()
          .find((vrow) => vrow.index === Math.floor(hoverIdx / COLS));
  const hoverRect =
    hoverIdx == null || !hoverRow
      ? null
      : {
          left:
            labelW + (labelW ? GAP : 0) + (hoverIdx % COLS) * (cellSize + GAP),
          top: hoverRow.start - scrollMargin,
          width: cellSize,
          height: hoverRow.size,
        };

  const onMove = (e: React.MouseEvent) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-cp]");
    if (!el) {
      hide();
      setHoverIdx(null);
      return;
    }
    setHoverIdx(Number(el.dataset.idx));
    showAt(Number(el.dataset.cp), e.clientX, e.clientY);
  };

  const onGridLeave = () => {
    hide();
    setHoverIdx(null);
  };

  const onFocus = (e: React.FocusEvent) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-cp]");
    if (!el) return;
    const cp = Number(el.dataset.cp);
    const r = el.getBoundingClientRect();
    showAt(cp, r.left + r.width / 2, r.bottom);
  };

  const onClick = (e: React.MouseEvent) => {
    const cp = cpOf(e);
    if (cp != null) {
      rovingCpRef.current = cp;
      forceRender((n) => n + 1); // move tabIndex=0 to the clicked cell
      onCopy(cp);
    }
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-cp]");
    if (!el) return;
    const cp = Number(el.dataset.cp);
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onCopy(cp);
      return;
    }
    let target: number | null = null;
    switch (e.key) {
      case "ArrowRight":
        target = nextPresent(cp, 1, 1);
        break;
      case "ArrowLeft":
        target = nextPresent(cp, -1, 1);
        break;
      case "ArrowDown":
        target = nextPresent(cp, 1, COLS);
        break;
      case "ArrowUp":
        target = nextPresent(cp, -1, COLS);
        break;
      case "Home":
        target = firstPresentCp;
        break;
      case "End":
        target = nextPresent(block.end + 1, -1, 1);
        break;
      default:
        return;
    }
    e.preventDefault();
    if (target != null) focusCp(target);
  };

  useEffect(() => {
    if (highlightCp == null) return;
    if (highlightCp < block.start || highlightCp > block.end) return;
    let rowIndex: number;
    if (present) {
      const i = present.indexOf(highlightCp);
      if (i < 0) return;
      rowIndex = Math.floor(i / COLS);
    } else {
      rowIndex = Math.floor((lead + highlightCp - block.start) / COLS);
    }
    rowVirtualizer.scrollToIndex(rowIndex, { align: "center" });
  }, [
    highlightCp,
    block.start,
    block.end,
    lead,
    present,
    rowVirtualizer,
    COLS,
  ]);

  const rovingCpRef = useRef<number | null>(null);
  const pendingFocusRef = useRef<number | null>(null);
  const [, forceRender] = useState(0);

  const firstPresentCp = useMemo(() => {
    for (let cp = block.start; cp <= block.end; cp++) {
      if (isRenderable(cp) && hasCodepoint(ranges, cp)) return cp;
    }
    return null;
  }, [block.start, block.end, ranges]);

  const rovingCp =
    rovingCpRef.current != null &&
    rovingCpRef.current >= block.start &&
    rovingCpRef.current <= block.end &&
    isRenderable(rovingCpRef.current) &&
    hasCodepoint(ranges, rovingCpRef.current)
      ? rovingCpRef.current
      : firstPresentCp;

  const rowOf = useCallback(
    (cp: number) => {
      if (present) {
        const i = present.indexOf(cp);
        return i < 0 ? 0 : Math.floor(i / COLS);
      }
      return Math.floor((lead + cp - block.start) / COLS);
    },
    [present, lead, block.start, COLS]
  );
  const cellButton = useCallback(
    (cp: number) =>
      gridRef.current?.querySelector<HTMLButtonElement>(
        `button[data-cp="${cp}"]`
      ) ?? null,
    []
  );

  const focusCp = useCallback(
    (cp: number) => {
      rovingCpRef.current = cp;
      forceRender((n) => n + 1);
      const btn = cellButton(cp);
      if (btn) {
        btn.focus();
        return;
      }
      pendingFocusRef.current = cp;
      rowVirtualizer.scrollToIndex(rowOf(cp), { align: "center" });
    },
    [rowVirtualizer, cellButton, rowOf]
  );

  useEffect(() => {
    const cp = pendingFocusRef.current;
    if (cp == null) return;
    let frame = 0;
    let tries = 0;
    const tick = () => {
      const btn = cellButton(cp);
      if (btn) {
        btn.focus();
        pendingFocusRef.current = null;
        return;
      }
      if (tries++ < 20) frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  });

  const nextPresent = (
    cp: number,
    dir: number,
    step: number
  ): number | null => {
    if (present) {
      const i = present.indexOf(cp);
      if (i < 0) return null;
      return present[i + dir * step] ?? null;
    }
    for (
      let n = cp + dir * step;
      n >= block.start && n <= block.end;
      n += dir
    ) {
      if (isRenderable(n) && hasCodepoint(ranges, n)) return n;
    }
    return null;
  };

  const glyphCell = (cp: number, idx: number) => (
    <button
      type="button"
      key={cp}
      data-cp={cp}
      data-idx={idx}
      tabIndex={cp === rovingCp ? 0 : -1}
      title={`U+${hex(cp)}: click to copy`}
      aria-label={`U+${hex(cp)} ${String.fromCodePoint(cp)}, copy character`}
      className={cn(
        // Keeps its own bg-card, unchanged on hover, so nothing pops a frame
        // ahead of the spring; the highlight layers above it instead.
        "relative z-10 flex items-center justify-center border-primary bg-card leading-none outline-none focus-visible:border-2 focus-visible:border-primary",
        highlightCp === cp && "animate-pulse border-2 border-primary"
      )}
      style={{ ...style, fontSize: cellSize * 0.4 }}
    >
      {String.fromCodePoint(cp)}
    </button>
  );

  return (
    <>
      {COLS === COLS_DESKTOP && (
        <div
          className="grid gap-px pb-1 text-center"
          style={{
            gridTemplateColumns: gridCols,
          }}
        >
          <div />
          {Array.from({ length: COLS }, (_, c) =>
            c.toString(16).toUpperCase()
          ).map((label) => (
            <div
              key={`col:${label}`}
              className="font-mono text-3xs text-muted-foreground"
            >
              {label}
            </div>
          ))}
        </div>
      )}

      {/* biome-ignore lint/a11y/useSemanticElements: focus-managed glyph grid, role="group" is the honest fit. */}
      <div
        ref={gridRef}
        role="group"
        aria-label={`${block.name} glyphs, arrow keys to move, Enter to copy`}
        style={{
          height: rowVirtualizer.getTotalSize(),
          position: "relative",
        }}
        onMouseEnter={() => {
          // A new hover session fades the highlight in; moves within the same
          // session keep the key stable so it slides instead of re-fading.
          sessionRef.current += 1;
        }}
        onMouseMove={onMove}
        onMouseLeave={onGridLeave}
        onClick={onClick}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        onBlur={hide}
      >
        <AnimatePresence>
          {hoverRect && (
            <motion.div
              key={sessionRef.current}
              /* Layers above the cells rather than behind them: the cells paint
                 an opaque bg-card and the gaps between them are transparent
                 down to the page, so a highlight behind would be hidden and a
                 row-level background would erase the grid lines. A translucent
                 fill reads the same and keeps the glyph legible. */
              className="pointer-events-none absolute z-20 rounded-lg bg-accent/60"
              initial={{ opacity: 0, ...hoverRect }}
              animate={{ opacity: 1, ...hoverRect }}
              exit={{ opacity: 0, transition: spring.fast.exit }}
              transition={{ ...spring.fast, opacity: { duration: 0.08 } }}
            />
          )}
        </AnimatePresence>

        {rowVirtualizer.getVirtualItems().map((vrow) => {
          const rowStart = vrow.index * COLS; // grid index of this row's col 0
          return (
            <div
              key={vrow.key}
              className="grid gap-px text-center"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: cellSize,
                gridTemplateColumns: gridCols,
                transform: `translateY(${vrow.start - scrollMargin}px)`,
              }}
            >
              {COLS === COLS_DESKTOP && (
                <div className="flex items-center justify-end pr-2 font-mono text-3xs text-muted-foreground">
                  {hex(block.start + rowStart - lead).slice(0, 3)}x
                </div>
              )}
              {Array.from({ length: COLS }, (_, c) => {
                const idx = rowStart + c;
                if (present) {
                  const packedCp = present[idx];
                  if (packedCp === undefined)
                    return <div key={`tail:${idx}`} className="bg-card" />;
                  return glyphCell(packedCp, idx);
                }
                if (idx < lead)
                  return <div key={`pad:${idx}`} className="bg-card" />;
                const cp = block.start + idx - lead;
                if (cp > block.end)
                  return <div key={`tail:${idx}`} className="bg-card" />;
                return isRenderable(cp) && hasCodepoint(ranges, cp) ? (
                  glyphCell(cp, idx)
                ) : (
                  <div key={cp} title={`U+${hex(cp)}`} className="bg-muted" />
                );
              })}
            </div>
          );
        })}
      </div>

      <div
        ref={popRef}
        style={{ display: "none" }}
        className="pointer-events-none fixed top-0 left-0 z-50 flex-col items-center gap-1 rounded-lg border bg-popover p-3 shadow-lg"
      >
        <div
          ref={popGlyphRef}
          className="flex size-56 items-center justify-center text-[10rem] leading-none"
          style={style}
        />
        <span
          ref={popLabelRef}
          className="font-mono text-muted-foreground text-xs"
        />
      </div>
    </>
  );
}
