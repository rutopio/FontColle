// URL slug for a font family: its `family_dir` (the repo directory name, e.g.
// "Google Sans Code" -> "googlesanscode"). This is the DB's unique key, it's
// lowercase with no spaces or underscores, and case-insensitive by nature, so
// it makes a stable, collision-free URL segment. `font.id` already holds the
// family_dir, so callers pass that straight in; this helper documents the intent.
export function fontSlug(id: string): string {
  return id;
}

// Normalize a slug for lookup. family_dir is already lowercase, but lowercasing
// here keeps /instances/Inter and /instances/inter resolving to the same family.
export function slugKey(slug: string): string {
  return slug.toLowerCase();
}
