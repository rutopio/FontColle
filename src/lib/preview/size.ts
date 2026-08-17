import { LEADING_DEFAULT, SIZE_DEFAULT } from "./context";

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
 * Card and row *minimum* heights, and the virtualizer's size estimate — hence
 * one shared source. Preview text wraps freely, so a card/row may end up taller
 * than this; the virtualizer measures the real height and only falls back to
 * these numbers before measurement. The baselines (h-72 / h-32) hold at
 * SIZE_DEFAULT; larger text grows the box, smaller text does not shrink it, so
 * the surrounding chrome keeps its usual breathing room.
 */
const CARD_BASE = 288;
const LINE_BASE = 128;

const CARD_LINES = 3;
const CARD_LEADING = 1.375; // leading-snug
const LINE_LEADING = 1.25; // leading-tight

/**
 * The leading control is a percentage of each view's own baseline, mirroring
 * how the size control offsets two different text bases: at LEADING_DEFAULT
 * both views keep the leading they were typeset with.
 */
export const cardLeading = (leading: number) =>
  (CARD_LEADING * leading) / LEADING_DEFAULT;

export const rowLeading = (leading: number) =>
  (LINE_LEADING * leading) / LEADING_DEFAULT;

const grow = (base: number, perPx: number, size: number) =>
  Math.round(base + Math.max(0, size - SIZE_DEFAULT) * perPx);

export const cardHeight = (size: number) =>
  grow(CARD_BASE, CARD_LINES * CARD_LEADING, size);

export const rowHeight = (size: number) => grow(LINE_BASE, LINE_LEADING, size);
