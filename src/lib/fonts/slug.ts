/** Normalizes a URL slug to a catalog lookup key (case-insensitive URLs). */
export function slugKey(slug: string): string {
  return slug.toLowerCase();
}
