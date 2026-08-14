import { SIZE_DEFAULT } from "./context";

/**
 * The list's two views were typeset at different sizes before the size control
 * existed — cards at text-2xl, rows at text-3xl. The slider reports one number,
 * so each view keeps its own baseline and the slider shifts both by the same
 * amount; at SIZE_DEFAULT the list looks exactly as it did.
 */
export const CARD_TEXT_BASE = 24; // text-2xl
export const ROW_TEXT_BASE = 30; // text-3xl

export const cardTextSize = (size: number) =>
  Math.max(1, CARD_TEXT_BASE + (size - SIZE_DEFAULT));

export const rowTextSize = (size: number) =>
  Math.max(1, ROW_TEXT_BASE + (size - SIZE_DEFAULT));

/**
 * Card and row heights. The list is virtualized against these numbers, so the
 * card/row must apply exactly what the virtualizer estimates or the rows
 * misalign — hence one shared source. The baselines (h-72 / h-32) hold at
 * SIZE_DEFAULT; larger text grows the box, smaller text does not shrink it, so
 * the surrounding chrome keeps its usual breathing room.
 */
const CARD_BASE = 288;
const LINE_BASE = 128;

const CARD_LINES = 3;
const CARD_LEADING = 1.375; // leading-snug
const LINE_LEADING = 1.25; // leading-tight

const grow = (base: number, perPx: number, size: number) =>
  Math.round(base + Math.max(0, size - SIZE_DEFAULT) * perPx);

export const cardHeight = (size: number) =>
  grow(CARD_BASE, CARD_LINES * CARD_LEADING, size);

export const rowHeight = (size: number) => grow(LINE_BASE, LINE_LEADING, size);
