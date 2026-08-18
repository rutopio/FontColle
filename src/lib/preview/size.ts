import { LEADING_DEFAULT, SIZE_DEFAULT } from "./context";

// Each view has its own baseline; the slider offsets both by the same delta.
const CARD_TEXT_BASE = 24; // text-2xl
const ROW_TEXT_BASE = 30; // text-3xl

export const cardTextSize = (size: number) =>
  Math.max(1, CARD_TEXT_BASE + (size - SIZE_DEFAULT));

export const rowTextSize = (size: number) =>
  Math.max(1, ROW_TEXT_BASE + (size - SIZE_DEFAULT));

// Minimum heights / virtualizer estimates. Grows with size, never shrinks.
const CARD_BASE = 288;
const LINE_BASE = 128;

const CARD_LINES = 3;
const CARD_LEADING = 1.375; // leading-snug
const LINE_LEADING = 1.25; // leading-tight

export const cardLeading = (leading: number) =>
  (CARD_LEADING * leading) / LEADING_DEFAULT;

export const rowLeading = (leading: number) =>
  (LINE_LEADING * leading) / LEADING_DEFAULT;

const grow = (base: number, perPx: number, size: number) =>
  Math.round(base + Math.max(0, size - SIZE_DEFAULT) * perPx);

export const cardHeight = (size: number) =>
  grow(CARD_BASE, CARD_LINES * CARD_LEADING, size);

export const rowHeight = (size: number) => grow(LINE_BASE, LINE_LEADING, size);
