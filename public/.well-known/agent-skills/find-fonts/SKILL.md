---
name: find-fonts
description: Find and compare open-source Google Fonts families by style, OpenType features, variable axes, writing system, and subjective mood, using FontColle's static JSON catalog.
version: 1.0.0
---

# Find fonts with FontColle

FontColle publishes a catalog of open-source Google Fonts families as static JSON.
No authentication, no rate limit. Use it to answer questions like "a playful
variable sans", "a high-contrast serif that supports Devanagari", or "a monospace
with slashed zero".

## Data sources

- `https://fontcolle.com/catalog-slim.json` — **start here.** JSON array of every
  published family, projected to the fields queries filter and rank on (~2 MB;
  fits a large context window).
- `https://fontcolle.com/catalog.json` — full `FontRecord[]` (~13 MB). Use only
  when the slim catalog lacks a field you need (per-axis ranges, named instances,
  per-family language lists, about/version prose).
- `https://fontcolle.com/catalog/{id}.json` — one full family record. `{id}` is
  the lowercased family name with spaces removed, e.g. `robotoslab`.
- `https://fontcolle.com/designer-index.json` — `{id, name, designer}[]`.
- `https://fontcolle.com/openapi.json` — OpenAPI 3.1 description of the above.
- `https://fontcolle.com/llms.txt` — field-by-field guide and tag vocabulary.

## How to answer a query

1. Fetch `/catalog-slim.json` once.
2. Filter by hard constraints: `category`/`class` (style), `subsets` (writing
   system), `isVariable`, `axes` (variable axes), `features` (OpenType tags),
   `weights`.
3. Rank subjective "feel" with the `tags` object — that is what makes mood
   queries ("joyful", "elegant", "technical") answerable.
4. For a chosen family, fetch `/catalog/{id}.json` for the full record
   (specimen, contrast, metrics, version history, about prose).
5. Link users to `https://fontcolle.com/{id}` for the human page.

See `/llms.txt` for the complete field tables and a worked style-query example.
