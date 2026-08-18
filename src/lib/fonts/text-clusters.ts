/** Grapheme cluster regex (combining marks measured with their base). */
export const CLUSTER_RE = /\P{M}\p{M}*|\p{M}+/gu;
