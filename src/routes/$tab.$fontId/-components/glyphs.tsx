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
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { hasCodepoint } from "@/lib/fonts/glyph-coverage";
import type { FontRecord } from "@/lib/fonts/types";
import { BMP_BLOCKS, type UnicodeBlock } from "@/lib/fonts/unicode-blocks";
import { cn } from "@/lib/utils";

// GLYPHS view: one Unicode block at a time, showing only the codepoints the
// font actually contains (from its cmap; see glyph-coverage.ts). The block list
// lives in the sidebar (GlyphsSidebar); this panel lays the active block out as
// a 16-column grid (one column per low hex nibble, so rows align on the U+xxx0
// boundary like a code chart). Present codepoints render their glyph; codepoints
// the font lacks are drawn as muted empty slots, so the hex layout stays aligned
// while it's still obvious which characters the font covers.
//
// Big blocks (CJK Unified Ideographs is 15k+ cells) are ROW-VIRTUALIZED so only
// visible rows are in the DOM. The hover magnifier is driven imperatively via
// event delegation + a ref — moving the cursor writes directly to the popover's
// style/text without a React state update, so the grid never re-renders while
// you hover.

type Range = [number, number];

// Row stride for a code chart: 16 cells, indexed by the low hex nibble. On a
// phone 16 square cells leave each one too small to read, so the row halves to
// 8 and the hex address column/header are dropped — the grid stops being a
// canonical code chart there and is simply a glyph browser, with each cell's
// codepoint still available via its title, aria-label, and the magnifier.
const COLS_DESKTOP = 16;
const COLS_MOBILE = 8;
// Width (px) of the leading row-label column (the U+xxx0 prefix). Fixed so the
// square cell size can be derived from the container width.
const LABEL_W = 44;
// Gap between grid tracks (Tailwind gap-px).
const GAP = 1;
// Fallback row height before the container width is measured.
const ROW_FALLBACK = 40;

function hex(cp: number): string {
  return cp.toString(16).toUpperCase().padStart(4, "0");
}

// Codepoints that have no visible glyph of their own (controls, separators, and
// the surrogate range) — never rendered as a character even if present in cmap.
function isRenderable(cp: number): boolean {
  // C0/C1 controls and DEL.
  if (cp < 0x20 || (cp >= 0x7f && cp <= 0x9f)) return false;
  // Surrogate halves are not valid scalar values.
  if (cp >= 0xd800 && cp <= 0xdfff) return false;
  return true;
}

function BlockGrid({
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
  // The page's shared ScrollArea viewport (from Column). The grid virtualizes
  // its rows inside this same scroller — matching how the list's FontGrid
  // scrolls — instead of nesting its own overflow container.
  scrollRef: RefObject<HTMLDivElement | null>;
  // A codepoint (within this block) to scroll to and briefly ring, set by the
  // sidebar glyph search. Null when nothing is targeted.
  highlightCp: number | null;
  // Called with a codepoint when a cell is activated (click / Enter / Space) so
  // the panel can copy the character and flash confirmation.
  onCopy: (cp: number) => void;
}) {
  const COLS = useIsMobile() ? COLS_MOBILE : COLS_DESKTOP;
  // The leading address column is desktop-only; on mobile its width goes to the
  // cells. The track is dropped entirely (not zeroed) to match the label cell
  // no longer being rendered, so the cells stay aligned with the header.
  const labelW = COLS === COLS_DESKTOP ? LABEL_W : 0;
  const gridCols = labelW
    ? `${labelW}px repeat(${COLS}, minmax(0, 1fr))`
    : `repeat(${COLS}, minmax(0, 1fr))`;
  // Pad the leading row so the first codepoint sits under its true hex column.
  // Blocks are 16-aligned in Unicode, so lead is 0, but the guard is cheap.
  const lead = block.start % COLS;
  const total = lead + (block.end - block.start + 1);
  const rowCount = Math.ceil(total / COLS);

  // The grid sits below the block title within the shared scroller, so the
  // virtualizer needs its offset from the scroll container's top (scrollMargin)
  // to place absolutely-positioned rows correctly. Measured after layout.
  const gridRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  // Square cell size (px): derive from the container width so each cell is as
  // tall as it is wide. Kept in sync with the container via a ResizeObserver.
  const [cellSize, setCellSize] = useState(ROW_FALLBACK);
  useLayoutEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const measure = () => {
      if (scrollRef.current) setScrollMargin(el.offsetTop);
      // The flexible columns share the width left after the label column (0 on
      // mobile, where it isn't rendered) and the gaps between tracks; a cell is
      // that width / COLS, and the row is that tall (square). Halving COLS on
      // mobile and dropping the label column both grow the cell.
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
  // Re-measure the virtualizer when the square cell size changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: cellSize is the trigger, not read in the body — a size change must re-run measurement.
  useLayoutEffect(() => {
    rowVirtualizer.measure();
  }, [cellSize, rowVirtualizer]);

  // Imperative magnifier: a single popover node, positioned/filled directly on
  // pointer events so hovering never triggers a React re-render of the grid.
  const popRef = useRef<HTMLDivElement>(null);
  const popGlyphRef = useRef<HTMLDivElement>(null);
  const popLabelRef = useRef<HTMLSpanElement>(null);

  // Resolve the cell under an event to its codepoint (or null for gaps/labels).
  const cpOf = (e: React.MouseEvent): number | null => {
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-cp]");
    if (!el) return null;
    return Number(el.dataset.cp);
  };

  const showAt = (cp: number, x: number, y: number) => {
    const pop = popRef.current;
    if (!pop) return;
    if (popGlyphRef.current)
      popGlyphRef.current.textContent = String.fromCodePoint(cp);
    if (popLabelRef.current) popLabelRef.current.textContent = `U+${hex(cp)}`;
    // Show first so it has measurable dimensions, then flip toward whichever
    // side has room: below/right of the cursor by default, but above/left
    // when the popover would overflow the viewport edge (e.g. hovering a cell
    // near the bottom after scrolling down). 16px gap from the cursor, 8px
    // min margin from the edge.
    pop.style.display = "flex";
    const CURSOR_GAP = 16;
    const MARGIN = 8;
    const { offsetWidth: w, offsetHeight: h } = pop;
    const left =
      x + CURSOR_GAP + w + MARGIN > window.innerWidth
        ? x - CURSOR_GAP - w
        : x + CURSOR_GAP;
    const top =
      y + CURSOR_GAP + h + MARGIN > window.innerHeight
        ? y - CURSOR_GAP - h
        : y + CURSOR_GAP;
    pop.style.left = `${Math.max(MARGIN, left)}px`;
    pop.style.top = `${Math.max(MARGIN, top)}px`;
  };
  const hide = () => {
    if (popRef.current) popRef.current.style.display = "none";
  };

  const onMove = (e: React.MouseEvent) => {
    const cp = cpOf(e);
    if (cp == null) hide();
    else showAt(cp, e.clientX, e.clientY);
  };

  // Keyboard parity for the hover magnifier: show it centered on the focused
  // cell so a keyboard user gets the same enlarged preview as a mouse user.
  const onFocus = (e: React.FocusEvent) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-cp]");
    if (!el) return;
    const cp = Number(el.dataset.cp);
    const r = el.getBoundingClientRect();
    showAt(cp, r.left + r.width / 2, r.bottom);
  };

  // Activating a present cell (click or Enter/Space) copies its character.
  const onClick = (e: React.MouseEvent) => {
    const cp = cpOf(e);
    if (cp != null) onCopy(cp);
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-cp]");
    if (!el) return;
    e.preventDefault();
    onCopy(Number(el.dataset.cp));
  };

  // Scroll a searched codepoint's row into view. The virtualizer measures rows
  // from the block start (+ the leading pad), so the row index is derived the
  // same way the render loop lays them out.
  useEffect(() => {
    if (highlightCp == null) return;
    if (highlightCp < block.start || highlightCp > block.end) return;
    const rowIndex = Math.floor((lead + highlightCp - block.start) / COLS);
    rowVirtualizer.scrollToIndex(rowIndex, { align: "center" });
  }, [highlightCp, block.start, block.end, lead, rowVirtualizer, COLS]);

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
      {/* biome-ignore lint/a11y/noStaticElementInteractions: delegated
          handlers; the interactive targets are the focusable per-cell buttons. */}
      <div
        ref={gridRef}
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
                  Desktop only — on mobile the address column is dropped so the
                  8 cells get the full width; a cell's codepoint is still on its
                  title/aria-label and in the magnifier. */}
              {COLS === COLS_DESKTOP && (
                <div className="flex items-center justify-end pr-2 font-mono text-[10px] text-muted-foreground">
                  {hex(block.start + rowStart - lead).slice(0, 3)}x
                </div>
              )}
              {Array.from({ length: COLS }, (_, c) => {
                const idx = rowStart + c;
                // Leading pad cells (before the block's first codepoint).
                if (idx < lead)
                  return <div key={`pad:${idx}`} className="bg-card" />;
                const cp = block.start + idx - lead;
                if (cp > block.end)
                  return <div key={`tail:${idx}`} className="bg-card" />;
                const present = isRenderable(cp) && hasCodepoint(ranges, cp);
                return present ? (
                  <button
                    type="button"
                    key={cp}
                    data-cp={cp}
                    title={`U+${hex(cp)} — click to copy`}
                    aria-label={`U+${hex(cp)} ${String.fromCodePoint(cp)}, copy character`}
                    className={cn(
                      "flex items-center justify-center border-primary bg-card leading-none outline-none hover:border focus-visible:border-2 focus-visible:border-primary",
                      highlightCp === cp &&
                        "animate-pulse border-2 border-primary"
                    )}
                    // Glyph fills ~1/2 of the (square) cell, so it scales with
                    // the measured cell size instead of a fixed font-size.
                    style={{ ...style, fontSize: cellSize * 0.4 }}
                  >
                    {String.fromCodePoint(cp)}
                  </button>
                ) : (
                  // Absent (or non-renderable) codepoint: a muted empty slot
                  // keeps the hex columns aligned.
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
        className="pointer-events-none fixed z-50 flex-col items-center gap-1 rounded-lg border bg-popover p-3 shadow-lg"
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

export function GlyphsPanel({
  font,
  fontLoaded,
  blockName,
  ranges,
  loading,
  scrollRef,
  highlightCp,
}: {
  font: FontRecord;
  fontLoaded: boolean;
  blockName: string;
  ranges: Range[];
  loading: boolean;
  scrollRef: RefObject<HTMLDivElement | null>;
  highlightCp: number | null;
}) {
  const active = useMemo(
    () => BMP_BLOCKS.find((b) => b.name === blockName) ?? BMP_BLOCKS[0],
    [blockName]
  );

  // Copy the character to the clipboard and confirm with a toast (or an error
  // toast if the clipboard write is blocked — insecure context / denied).
  const onCopy = useCallback(async (cp: number) => {
    try {
      await navigator.clipboard.writeText(String.fromCodePoint(cp));
      toast.success(`Copied U+${hex(cp)}`, {
        description: String.fromCodePoint(cp),
      });
    } catch {
      toast.error("Copy failed");
    }
  }, []);

  // Always fall back to Adobe Blank (empty glyphs), never NotDef, so a stray
  // absent cell stays blank. While the font loads we are already on Blank, the
  // same look, so no special-casing needed.
  const glyphStyle: CSSProperties = {
    fontFamily: `"${font.name}", "Adobe Blank"`,
  };
  // fontLoaded is accepted so the panel re-renders once the face is ready and
  // the browser repaints real glyphs over the blank ones.
  void fontLoaded;

  return (
    <div className="w-full min-w-0">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="font-semibold text-2xl">{active.name}</h2>
        <span className="font-mono text-muted-foreground text-xs">
          U+{hex(active.start)}–U+{hex(active.end)}
        </span>
      </div>
      {loading ? (
        <GlyphGridSkeleton />
      ) : (
        <BlockGrid
          key={active.name}
          block={active}
          ranges={ranges}
          style={glyphStyle}
          scrollRef={scrollRef}
          highlightCp={highlightCp}
          onCopy={onCopy}
        />
      )}
    </div>
  );
}

// Loading placeholder for the glyph chart: the same column count and square
// cells as BlockGrid (leading address column + header on desktop), so the real
// grid swaps in without a layout shift. role=status + aria-busy announce the
// pending state; the individual cells are decorative.
function GlyphGridSkeleton() {
  const COLS = useIsMobile() ? COLS_MOBILE : COLS_DESKTOP;
  const labelW = COLS === COLS_DESKTOP ? LABEL_W : 0;
  const gridCols = labelW
    ? `${labelW}px repeat(${COLS}, minmax(0, 1fr))`
    : `repeat(${COLS}, minmax(0, 1fr))`;
  const ROWS = 8;

  return (
    <div role="status" aria-busy="true" aria-label="Loading glyphs">
      {/* Header row of column labels, desktop only — matches BlockGrid. */}
      {COLS === COLS_DESKTOP && (
        <div
          className="grid gap-px pb-1"
          style={{ gridTemplateColumns: gridCols }}
        >
          <div />
          {Array.from({ length: COLS }, (_, c) => (
            <Skeleton
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length static placeholder grid, no reordering.
              key={`skeleton-col:${c}`}
              className="mx-auto h-2.5 w-2.5 rounded-sm"
            />
          ))}
        </div>
      )}
      {Array.from({ length: ROWS }, (_, r) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length static placeholder grid, no reordering.
          key={`skeleton-row:${r}`}
          className="grid gap-px"
          style={{ gridTemplateColumns: gridCols }}
        >
          {labelW ? <div /> : null}
          {Array.from({ length: COLS }, (_, c) => (
            <Skeleton
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length static placeholder grid, no reordering.
              key={`skeleton-cell:${r}:${c}`}
              className="aspect-square rounded-sm"
            />
          ))}
        </div>
      ))}
    </div>
  );
}
