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
// Mobile drops that address chart entirely: 5 columns, no hex header or row
// labels, and only the codepoints the font actually has, since a sparse block
// on a phone would otherwise be mostly empty slots. See `compact`/`present`.
//
// Big blocks (CJK Unified Ideographs is 15k+ cells) are ROW-VIRTUALIZED so only
// visible rows are in the DOM. The hover magnifier is driven imperatively via
// event delegation + a ref, moving the cursor writes directly to the popover's
// style/text without a React state update, so the grid never re-renders while
// you hover.

type Range = [number, number];

// Row stride for a code chart: 16 cells, indexed by the low hex nibble. On a
// phone 16 square cells leave each one too small to read, so the row drops to
// 5 and the hex address column/header go away, the grid stops being a
// canonical code chart there and is simply a glyph browser, with each cell's
// codepoint still available via its title, aria-label, and the magnifier.
const COLS_DESKTOP = 16;
const COLS_MOBILE = 5;
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
// the surrogate range), never rendered as a character even if present in cmap.
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
  // its rows inside this same scroller, matching how the list's FontGrid
  // scrolls, instead of nesting its own overflow container.
  scrollRef: RefObject<HTMLDivElement | null>;
  // A codepoint (within this block) to scroll to and briefly ring, set by the
  // sidebar glyph search. Null when nothing is targeted.
  highlightCp: number | null;
  // Called with a codepoint when a cell is activated (click / Enter / Space) so
  // the panel can copy the character and flash confirmation.
  onCopy: (cp: number) => void;
}) {
  const compact = useIsMobile();
  const COLS = compact ? COLS_MOBILE : COLS_DESKTOP;
  // The leading address column is desktop-only; on mobile its width goes to the
  // cells. The track is dropped entirely (not zeroed) to match the label cell
  // no longer being rendered, so the cells stay aligned with the header.
  const labelW = compact ? 0 : LABEL_W;
  const gridCols = labelW
    ? `${labelW}px repeat(${COLS}, minmax(0, 1fr))`
    : `repeat(${COLS}, minmax(0, 1fr))`;

  // Desktop keeps the canonical code chart: every codepoint in the block gets a
  // cell (absent ones drawn muted) so rows align on the U+xxx0 boundary. Mobile
  // has already given up the address apparatus, and on a phone a sparse block
  // is mostly empty slots, so it packs only the present codepoints instead. The
  // grid is then indexed by position in this list rather than by address, which
  // is why every layout/navigation derivation below branches on `compact`.
  const present = useMemo(() => {
    if (!compact) return null;
    const cps: number[] = [];
    for (let cp = block.start; cp <= block.end; cp++) {
      if (isRenderable(cp) && hasCodepoint(ranges, cp)) cps.push(cp);
    }
    return cps;
  }, [compact, block.start, block.end, ranges]);

  // Pad the leading row so the first codepoint sits under its true hex column.
  // Blocks are 16-aligned in Unicode, so lead is 0, but the guard is cheap.
  // Packed mode has no address to align to, so it never pads.
  const lead = compact ? 0 : block.start % COLS;
  const total = present ? present.length : lead + (block.end - block.start + 1);
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
  // biome-ignore lint/correctness/useExhaustiveDependencies: cellSize is the trigger, not read in the body, a size change must re-run measurement.
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

  // Activating a present cell (click or Enter/Space) copies its character; a
  // click also re-points the roving cell so a later Tab re-entry lands there.
  const onClick = (e: React.MouseEvent) => {
    const cp = cpOf(e);
    if (cp != null) {
      rovingCpRef.current = cp;
      forceRender((n) => n + 1); // move tabIndex=0 to the clicked cell
      onCopy(cp);
    }
  };
  // Container-level keyboard delegation (one handler for the whole grid, like
  // the mouse handlers): Enter/Space copy the focused cell; Arrow/Home/End move
  // the roving cell across the block's present glyphs. preventDefault fires only
  // on keys we actually handle.
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

  // Scroll a searched codepoint's row into view, derived the same way the
  // render loop lays rows out: by position in the present list when packed,
  // otherwise from the block start (+ the leading pad).
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
  // The grid is a single tab stop: exactly one present cell carries tabIndex=0
  // (the "roving" cell), every other cell -1, so Tab enters the block once and
  // the next Tab leaves it. The roving codepoint lives in a REF (read during
  // render for each cell's tabIndex) so moving it doesn't force per-cell state;
  // arrow keys re-point it and re-render the container once. Because big blocks
  // are row-virtualized, the target row may be unmounted: we scrollToIndex it
  // and stash the codepoint in pendingFocusRef, then focus it once the button
  // exists (the render after scroll, retried via rAF as rows mount).
  const rovingCpRef = useRef<number | null>(null);
  const pendingFocusRef = useRef<number | null>(null);
  // Bumping this re-renders the container so cells re-read rovingCpRef for their
  // tabIndex. Not per-cell state, one counter for the whole grid.
  const [, forceRender] = useState(0);

  // First present, renderable codepoint in the block: the default roving cell.
  const firstPresentCp = useMemo(() => {
    for (let cp = block.start; cp <= block.end; cp++) {
      if (isRenderable(cp) && hasCodepoint(ranges, cp)) return cp;
    }
    return null;
  }, [block.start, block.end, ranges]);

  // The cell that should own tabIndex=0 right now: the roving ref if it still
  // points at a present cell, else the block's first present cell.
  const rovingCp =
    rovingCpRef.current != null &&
    rovingCpRef.current >= block.start &&
    rovingCpRef.current <= block.end &&
    isRenderable(rovingCpRef.current) &&
    hasCodepoint(ranges, rovingCpRef.current)
      ? rovingCpRef.current
      : firstPresentCp;

  // Which row a codepoint sits in. Packed mode indexes by position in the
  // present list; the address-aligned chart by the codepoint's own offset.
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

  // Move focus to a codepoint, scrolling its row in first if it isn't mounted.
  const focusCp = useCallback(
    (cp: number) => {
      rovingCpRef.current = cp;
      forceRender((n) => n + 1); // re-render so tabIndex follows the roving cell
      const btn = cellButton(cp);
      if (btn) {
        btn.focus();
        return;
      }
      // Row not mounted: bring it into view and focus once it renders.
      pendingFocusRef.current = cp;
      rowVirtualizer.scrollToIndex(rowOf(cp), { align: "center" });
    },
    [rowVirtualizer, cellButton, rowOf]
  );

  // Resolve pending focus once its row has mounted (retry across a few frames
  // while the virtualizer settles the scroll and renders the row).
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

  // Next present, renderable codepoint from `cp` in `dir` (+1/-1) direction,
  // skipping absent/non-renderable slots so focus never lands on an empty cell.
  // `step` is a distance in grid cells (1 for left/right, COLS for up/down).
  // Packed mode has no gaps, so a step is just a move of `step` places in the
  // present list, which keeps up/down landing in the same column.
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

  // One present glyph's cell. Shared by both layouts: the packed (mobile) grid
  // and the address-aligned (desktop) one differ only in which codepoint lands
  // in which slot, not in how a cell looks or behaves.
  const glyphCell = (cp: number) => (
    <button
      type="button"
      key={cp}
      data-cp={cp}
      // Roving tabindex: only the active cell is tabbable, so the block is a
      // single tab stop. Read from the ref during render; focusCp re-renders
      // when the roving cell moves.
      tabIndex={cp === rovingCp ? 0 : -1}
      title={`U+${hex(cp)}: click to copy`}
      aria-label={`U+${hex(cp)} ${String.fromCodePoint(cp)}, copy character`}
      className={cn(
        "flex items-center justify-center border-primary bg-card leading-none outline-none hover:border focus-visible:border-2 focus-visible:border-primary",
        highlightCp === cp && "animate-pulse border-2 border-primary"
      )}
      // Glyph fills ~1/2 of the (square) cell, so it scales with the measured
      // cell size instead of a fixed font-size.
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
                // Packed (mobile): the cell is the idx-th present codepoint,
                // with a blank only past the end of the last row.
                if (present) {
                  const packedCp = present[idx];
                  if (packedCp === undefined)
                    return <div key={`tail:${idx}`} className="bg-card" />;
                  return glyphCell(packedCp);
                }
                // Leading pad cells (before the block's first codepoint).
                if (idx < lead)
                  return <div key={`pad:${idx}`} className="bg-card" />;
                const cp = block.start + idx - lead;
                if (cp > block.end)
                  return <div key={`tail:${idx}`} className="bg-card" />;
                return isRenderable(cp) && hasCodepoint(ranges, cp) ? (
                  glyphCell(cp)
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
  // toast if the clipboard write is blocked, insecure context / denied).
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
    <div className="w-full min-w-0 pb-48 md:pb-0">
      <div className="mb-8 flex items-baseline justify-between gap-3">
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
      {/* Header row of column labels, desktop only, matches BlockGrid. */}
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
