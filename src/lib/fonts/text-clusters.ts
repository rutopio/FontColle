/**
 * Grapheme cluster regex shared between glyph-index (offline coverage check)
 * and loader (runtime paint check). A lone combining mark has no advance of its
 * own, so it can only be measured as part of its cluster.
 */
export const CLUSTER_RE = /\P{M}\p{M}*|\p{M}+/gu;
