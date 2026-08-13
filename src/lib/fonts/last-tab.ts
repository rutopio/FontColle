import { useLocalStorageState } from "@/hooks/use-local-storage-state";

/** Detail-view slugs, in rail order. The rail builds its tabs from these. */
export const TAB_SLUGS = [
  "instances",
  "paragraph",
  "glyphs",
  "detail",
  "designer",
  "use",
  "license",
] as const;

export type TabSlug = (typeof TAB_SLUGS)[number];

const KEY = "font-colle.detail-tab";
const DEFAULT_TAB: TabSlug = "instances";

const isTabSlug = (raw: string): raw is TabSlug =>
  (TAB_SLUGS as readonly string[]).includes(raw);

/**
 * The detail tab the user last opened, so returning to a detail page from the
 * list reopens the same view instead of resetting to Instances. Unknown or
 * stale slugs (renamed tabs, hand-edited storage) fall back to the default.
 */
export function useLastDetailTab(): [TabSlug, (slug: TabSlug) => void] {
  const [raw, setRaw] = useLocalStorageState(KEY, DEFAULT_TAB);
  return [isTabSlug(raw) ? raw : DEFAULT_TAB, setRaw];
}
