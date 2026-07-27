import { useVirtualizer } from "@tanstack/react-virtual";
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
import { cn } from "@/lib/utils";

// A Unicode block as a code chart: 16 columns aligned on U+xxx0 at lg and up,
// a packed 5-column browser below that. Rows are virtualized (CJK Unified
// Ideographs is 15k+ cells) and the hover magnifier is driven imperatively, so
// the grid never re-renders while you hover.

export type Range = [number, number];

// The cutoff is lg, not md: at md the detail sidebar has just come back and
// taken ~24.5rem, squeezing a 16-wide chart hardest.
export const COLS_DESKTOP = 16;
export const COLS_MOBILE = 5;
export const LABEL_W = 44;
const GAP = 1;
const ROW_FALLBACK = 40;

export function hex(cp: number): string {
  return cp.toString(16).toUpperCase().padStart(4, "0");
}

// Controls, DEL and surrogate halves have no glyph of their own, so they are
// never drawn as characters even when cmap covers them.
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
  // The page's shared ScrollArea viewport: the grid virtualizes inside this
  // rather than nesting its own overflow container.
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

  // Wide gives every codepoint a cell, absent ones muted, so rows align on
  // U+xxx0. Compact packs only present ones and indexes by position rather
  // than address — hence the `compact` branches throughout.
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

  // The grid sits below the block title inside a shared scroller, so the
  // virtualizer needs scrollMargin to place absolute rows correctly.
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

  // A single popover node, positioned and filled directly on pointer events so
  // hovering never re-renders the grid.
  const popRef = useRef<HTMLDivElement>(null);
  const popGlyphRef = useRef<HTMLDivElement>(null);
  const popLabelRef = useRef<HTMLSpanElement>(null);

  const cpOf = (e: React.MouseEvent): number | null => {
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-cp]");
    if (!el) return null;
    return Number(el.dataset.cp);
  };

  // Cached: measuring inside showAt would read offsetWidth after writing
  // textContent, forcing a synchronous reflow on every pointer move. The box
  // never changes size, so one measurement serves every cell.
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
    // translate3d, not left/top: those are layout properties, so following the
    // cursor through them would re-run layout on every move.
    pop.style.transform = `translate3d(${Math.max(MARGIN, left)}px, ${Math.max(MARGIN, top)}px, 0)`;
  };
  const hide = () => {
    if (popRef.current) popRef.current.style.display = "none";
  };

  const onMove = (e: React.MouseEvent) => {
    const cp = cpOf(e);
    if (cp == null) hide();
    else showAt(cp, e.clientX, e.clientY);
  };

  // Keyboard parity for the hover magnifier.
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
    e.preventDefault(); // handled navigation key: stop the scroller stealing it
    if (target != null) focusCp(target);
  };

  useEffect(() => {
    if (highlightCp == null) return;
    if (highlightCp < block.start || highlightCp > block.end) return;
    let rowIndex: number;
    if (present) {
      const i = present.indexOf(highlightCp);
      if (i < 0) return; // packed grid omits absent codepoints entirely
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

  // --- Roving tabindex (keyboard grid navigation) -------------------------
  // The grid is a single tab stop: exactly one present cell carries tabIndex=0,
  // every other -1. The roving codepoint lives in a REF, read during render for
  // each cell's tabIndex, so moving it re-renders the container once rather
  // than forcing per-cell state. Row virtualization means the target row may be
  // unmounted, so focusCp scrolls to it and stashes the codepoint in
  // pendingFocusRef, focusing once the button exists.
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
      forceRender((n) => n + 1); // re-render so tabIndex follows the roving cell
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

  // Retried across a few frames while the virtualizer settles and renders.
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

  // Skips absent slots, so focus never lands on an empty cell. `step` is a
  // distance in grid cells (1 left/right, COLS up/down); packed mode has no
  // gaps, so it moves that many places in the present list instead, which keeps
  // up/down in the same column.
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

  const glyphCell = (cp: number) => (
    <button
      type="button"
      key={cp}
      data-cp={cp}
      tabIndex={cp === rovingCp ? 0 : -1}
      title={`U+${hex(cp)}: click to copy`}
      aria-label={`U+${hex(cp)} ${String.fromCodePoint(cp)}, copy character`}
      className={cn(
        "flex items-center justify-center border-primary bg-card leading-none outline-none hover:border focus-visible:border-2 focus-visible:border-primary",
        highlightCp === cp && "animate-pulse border-2 border-primary"
      )}
      style={{ ...style, fontSize: cellSize * 0.4 }}
    >
      {String.fromCodePoint(cp)}
    </button>
  );

  return (
    <>
      {/* Column header row: the low hex nibble 0..F, kept above the rows. Only
          at 16 wide, where every row spans a full decade so a cell's nibble is
          its column. Mobile drops the whole address apparatus (this header and
          the per-row labels) in favour of bigger cells. */}
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
              className="font-mono text-[10px] text-muted-foreground"
            >
              {label}
            </div>
          ))}
        </div>
      )}

      {/* Virtualized rows, scrolled by the shared Column viewport. Only visible
          rows are in the DOM. Mouse handlers live here (event delegation), so a
          15k-cell block still has 2 handlers total, not 30k. */}
      {/* role="grid" would require every row to exist in the accessibility
          tree, but virtualization unmounts off-screen rows, so aria-rowcount
          on a grid whose rows come and go would be a lie the AT can't verify.
          Honest choice: a labelled group of roving-tabindex buttons. One tab
          stop (see rovingCp), arrow keys move focus, the per-cell aria-labels
          carry each codepoint. */}
      {/* biome-ignore lint/a11y/useSemanticElements: <fieldset> carries form
          semantics; this is a focus-managed glyph grid, role="group" is the
          honest fit. */}
      <div
        ref={gridRef}
        role="group"
        aria-label={`${block.name} glyphs, arrow keys to move, Enter to copy`}
        style={{
          height: rowVirtualizer.getTotalSize(),
          position: "relative",
        }}
        onMouseMove={onMove}
        onMouseLeave={hide}
        onClick={onClick}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        onBlur={hide}
      >
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
              {/* Row label: the U+xxx0 prefix naming this row's hex decade.
                  Desktop only, on mobile the address column is dropped so the
                  8 cells get the full width; a cell's codepoint is still on its
                  title/aria-label and in the magnifier. */}
              {COLS === COLS_DESKTOP && (
                <div className="flex items-center justify-end pr-2 font-mono text-[10px] text-muted-foreground">
                  {hex(block.start + rowStart - lead).slice(0, 3)}x
                </div>
              )}
              {Array.from({ length: COLS }, (_, c) => {
                const idx = rowStart + c;
                if (present) {
                  const packedCp = present[idx];
                  if (packedCp === undefined)
                    return <div key={`tail:${idx}`} className="bg-card" />;
                  return glyphCell(packedCp);
                }
                if (idx < lead)
                  return <div key={`pad:${idx}`} className="bg-card" />;
                const cp = block.start + idx - lead;
                if (cp > block.end)
                  return <div key={`tail:${idx}`} className="bg-card" />;
                return isRenderable(cp) && hasCodepoint(ranges, cp) ? (
                  glyphCell(cp)
                ) : (
                  // A muted empty slot keeps the hex columns aligned.
                  <div key={cp} title={`U+${hex(cp)}`} className="bg-muted" />
                );
              })}
            </div>
          );
        })}
      </div>

      {/* The single, imperatively-driven magnifier. Hidden until a cell is
          hovered; position/content set directly on pointer move (no re-render). */}
      <div
        ref={popRef}
        style={{ display: "none" }}
        // top-0 left-0 is the reference point showAt's translate3d works from.
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
