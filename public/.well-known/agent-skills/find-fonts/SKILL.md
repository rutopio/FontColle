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

## Choose an access mode first

**This catalog has 1942 families. The slim file is ~2 MB (~580k tokens) and
does NOT fit in a typical context window.** Pick the mode that matches your
environment:

- **You can run code (fetch + filter):** use `/catalog-slim.json` and filter it
  programmatically (jq, JS, Python). Do not paste the whole file into context.
- **You can only read data into context:** do NOT fetch the slim file. Fetch one
  pre-sharded **facet slice** (below) — each is tens of KB and fits in context.

## Data sources

- `https://fontcolle.com/catalog/facets/index.json` — **read this first if you
  read data into context.** Lists every pre-sharded slice by `class`
  (Sans/Serif/Display/…), non-Latin `subset` (writing system), and `flag`
  (variable/monospace/color), each with a `count` and `href`. Fetch the one
  slice that matches your hardest constraint (e.g. the `devanagari` subset slice
  is ~14k tokens), then filter and rank within it.
- `https://fontcolle.com/catalog-slim.json` — every published family projected
  to the fields queries filter and rank on (~2 MB). Use only if you can filter
  it with code.
- `https://fontcolle.com/catalog.json` — full `FontRecord[]` (~13 MB). Use only
  when a slice/slim lacks a field you need (per-axis ranges, named instances,
  per-family language lists, about/version prose).
- `https://fontcolle.com/catalog/{id}.json` — one full family record. `{id}` is
  the lowercased family name with spaces removed, e.g. `robotoslab`.
- `https://fontcolle.com/designer-index.json` — `{id, name, designer}[]`.
- `https://fontcolle.com/openapi.json` — OpenAPI 3.1 description of the above.
- `https://fontcolle.com/llms.txt` — field-by-field guide and tag vocabulary.

## How to answer a query

1. Get the candidate set: fetch the facet slice for your hardest constraint
   (writing system → `subset`, style → `class`, variable/mono/color → `flag`),
   or `/catalog-slim.json` if you can filter with code.
2. Narrow by the remaining hard constraints: `class` (letterform), `subsets`
   (writing system), `isVariable`, `axes` (variable axes), `features` (OpenType
   tags), `weights`. To combine two facet slices, intersect them on `id`.
   For **monospace**, do not trust `isMonospace` (the `isFixedPitch` bit is
   wrong in both directions): a family is monospaced when it scores
   `/Monospace/Monospace` in `tags`, or its `apiCategory` is `MONOSPACE`.
   Monospace is not a `class` — Roboto Mono is `Sans`, Courier Prime is `Slab`.
3. Rank subjective "feel" with the `tags` object — that is what makes mood
   queries ("joyful", "elegant", "technical") answerable.
4. For a chosen family, fetch `/catalog/{id}.json` for the full record
   (specimen, contrast, metrics, version history, about prose).
5. Link users to `https://fontcolle.com/{id}` for the human page.

See `/llms.txt` for the complete field tables and a worked style-query example.
