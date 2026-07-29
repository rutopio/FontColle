import type { FontRecord } from "@/lib/fonts/types";

export type InstanceRange = [number, number];

export const INSTANCE_MIN = 1;
export const INSTANCE_MAX = 74;

export const INSTANCE_BUCKETS: {
  id: string;
  label: string;
  range: InstanceRange;
}[] = [
  { id: "1", label: "1", range: [1, 1] },
  { id: "2-9", label: "2-9", range: [2, 9] },
  { id: "10-18", label: "10-18", range: [10, 18] },
  { id: "19+", label: ">18", range: [19, INSTANCE_MAX] },
];

export const instanceCount = (font: FontRecord): number =>
  font.instances?.length ?? 0;

export const instanceInRange = (
  font: FontRecord,
  r: InstanceRange
): boolean => {
  const n = instanceCount(font);
  return n >= r[0] && n <= r[1];
};

export const instanceBucketOf = (
  r: InstanceRange | undefined
): string | null =>
  r
    ? (INSTANCE_BUCKETS.find((b) => b.range[0] === r[0] && b.range[1] === r[1])
        ?.id ?? null)
    : null;

export const instanceRangeOf = (id: string): InstanceRange | undefined =>
  INSTANCE_BUCKETS.find((b) => b.id === id)?.range;
