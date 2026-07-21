// Instance-count buckets: how many named instances (styles) a family ships.
import type { FontRecord } from "@/lib/fonts/types";

/** Inclusive [min, max] instance count. */
export type InstanceRange = [number, number];

// Catalog domain. Every published family ships at least one instance, and the
// largest superfamilies reach the low 70s.
export const INSTANCE_MIN = 1;
export const INSTANCE_MAX = 74;

// The selectable buckets, in display order. They partition the catalog: every
// family lands in exactly one, and the four together cover the whole domain.
// Edges follow the real distribution -- over half the catalog ships a single
// style, so that gets its own bucket rather than being folded into a "few".
export const INSTANCE_BUCKETS: { id: string; label: string; range: InstanceRange }[] =
  [
    { id: "1", label: "1", range: [1, 1] },
    { id: "2-9", label: "2-9", range: [2, 9] },
    { id: "10-18", label: "10-18", range: [10, 18] },
    // Open-ended top bucket. INSTANCE_MAX is today's ceiling; using it (rather
    // than Infinity) keeps the stored range finite and URL-friendly, and a
    // future harvest with more instances would only need this constant bumped.
    { id: "19+", label: ">18", range: [19, INSTANCE_MAX] },
  ];

/** How many named instances a family ships. */
export const instanceCount = (font: FontRecord): number =>
  font.instances?.length ?? 0;

/** Does a family fall inside the selected range. */
export const instanceInRange = (font: FontRecord, r: InstanceRange): boolean => {
  const n = instanceCount(font);
  return n >= r[0] && n <= r[1];
};

/** The bucket a stored range corresponds to, or null when it matches none.
 *  Used to light up the right button from the URL. */
export const instanceBucketOf = (r: InstanceRange | undefined): string | null =>
  r
    ? (INSTANCE_BUCKETS.find(
        (b) => b.range[0] === r[0] && b.range[1] === r[1]
      )?.id ?? null)
    : null;

/** A bucket id -> its range, for applying a click. */
export const instanceRangeOf = (id: string): InstanceRange | undefined =>
  INSTANCE_BUCKETS.find((b) => b.id === id)?.range;
