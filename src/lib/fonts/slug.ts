// URL slug for a font family. The detail URL is aligned to the family name
// (e.g. "Google Sans Code" -> "Google_Sans_Code"), not the repo dir, so it
// mirrors what Google Fonts shows — but with underscores instead of plus signs.
// Family names are all [A-Za-z0-9 ], so replacing spaces is the only transform.
export function fontSlug(name: string): string {
  return name.replace(/ /g, "_");
}

// Normalize a slug for lookup: spaces and underscores are interchangeable and
// matching is case-insensitive, so /specimen/Inter and /specimen/inter resolve
// to the same family.
export function slugKey(slug: string): string {
  return slug.replace(/_/g, " ").toLowerCase();
}
