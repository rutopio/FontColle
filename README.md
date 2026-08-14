<div align="center">

# FontFridge

▌　[https://font.chingru.com](https://font.chingru.com)　▐

[![FontFridge](/cover.png)](https://font.chingru.com)

FontFridge is an enhanced Google Fonts collection that filters OpenType features, variable-font axes, weight/width steps, writing systems, languages, and color vs. monochrome. Preview any weight or named instance live, edit the specimen text inline, and save favorites.

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=flat&logo=python&logoColor=white)
![React 19](https://img.shields.io/badge/React_19-61DAFB?style=flat&logo=react&logoColor=black)
![TanStack Start](https://img.shields.io/badge/TanStack_Start-FF4154?style=flat&logo=react&logoColor=white)
![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS_v4-06B6D4?style=flat&logo=tailwindcss&logoColor=white)
![Vite 8](https://img.shields.io/badge/Vite_8-646CFF?style=flat&logo=vite&logoColor=white)


Host on ![Cloudflare Workers](https://img.shields.io/badge/Cloudflare_Workers-F38020?style=flat&logo=cloudflare&logoColor=white)


[![Daily incremental harvest](https://github.com/rutopio/font-fridge/actions/workflows/daily-harvest.yml/badge.svg)](https://github.com/rutopio/font-fridge/actions/workflows/daily-harvest.yml)
[![Full harvest](https://github.com/rutopio/font-fridge/actions/workflows/full-harvest.yml/badge.svg)](https://github.com/rutopio/font-fridge/actions/workflows/full-harvest.yml)


</div>

File-based routing on Cloudflare Workers, with a **static JSON catalog** built from `src/data/fonts.json` and served as CDN-cached assets, with no database (see [docs/data-pipeline.md](docs/data-pipeline.md)). A **Python harvester** (`scripts/harvester`) builds the dataset from the [Google Fonts](https://fonts.google.com) catalog and [`gflanguages`](https://github.com/googlefonts/lang).

## Development

```bash
pnpm install
pnpm pull:data    # fetch the data assets from R2 (first clone only)
pnpm dev          # vite dev server on :3000
```

`pnpm pull:data` needs a `CLOUDFLARE_API_TOKEN` with R2 read on the `fontcolle-assets` bucket, which only the maintainers have: see [docs/data-pipeline.md](docs/data-pipeline.md). **Outside contributors skip it** — `pnpm build` falls back to a committed 30-family sample, so `pnpm build && pnpm dev` runs with no Cloudflare account or API key. Details, and how to harvest more families, in [Running without R2 access](docs/data-pipeline.md#running-without-r2-access).

`pnpm check` runs Biome (with `--write`) then `tsc --noEmit`; run it before committing. `pnpm build` produces the Workers bundle in `dist/`.

| Script        | What it does                                              |
| ------------- | --------------------------------------------------------- |
| `pnpm dev`    | Local dev server                                          |
| `pnpm build`  | Production build (`scripts/build.mjs` wraps `vite build`) |
| `pnpm check`  | Biome fix + typecheck                                     |
| `pnpm test`   | Vitest                                                    |
| `pnpm gen:og` | Render per-font Open Graph images to `public/og/`         |

The font data is read-only, identical for every visitor, and refreshed once a day, so the app serves it as static JSON rather than querying a database. `pnpm build` slices `src/data/fonts.json` into the files the site fetches (`scripts/gen-catalog.mjs`), so a plain `pnpm dev` / `pnpm build` needs no database setup.

## Data pipeline

The dataset (harvest → R2 storage → build → deploy) is documented separately:

- **[docs/data-pipeline.md](docs/data-pipeline.md)** — where the data lives, running without R2 access, building the dataset, bootstrapping from scratch, and the daily incremental CI update.
- **[src/data/README.md](src/data/README.md)** — provenance of each data file and each `fonts.json` field.

The short version: `fonts.json` (~21 MB) and the manifest pointer live in R2, not git; the daily workflow harvests only what changed, publishes to R2, and fires a Cloudflare Deploy Hook — a data-only day makes zero commits. Forks with no R2 access build against a committed 30-family sample.

## Open Graph images

Each published family has a share card at `public/og/<id>.png` with the family name set **in its own typeface** (traced to a path at build time via the [CSS2 API](https://developers.google.com/fonts/docs/css2) + [opentype.js](https://github.com/opentypejs/opentype.js), rasterized with [resvg](https://github.com/yisibl/resvg-js)). `pnpm gen:og` renders them all (`--force` re-renders existing; `--ids=<file>` restricts to a subset). The per-font route wires `og:image`; the daily workflow re-renders only changed families and pushes them to R2 as per-object deltas over the base tarball.

## Contribution

Contributions are welcome. Run `pnpm check` before opening a PR.

Font metadata errors (wrong tags, missing languages, bad axis ranges) are best reported as an issue, most trace back to the harvester, not the UI.

## License

MIT, covering this project's own code and metadata index only.

The fonts listed in this project are not distributed here; every font file and download links out to Google Fonts. Each font remains under its own license ([SIL Open Font License](https://openfontlicense.org), [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0), [Ubuntu Font License](https://ubuntu.com/legal/font-licence), etc.) as declared by its original authors and foundries. Check a family's license before using it.

---

<div align="center">

Made by [ChingRu](https://chingru.com) - hello[AT]chingru.com

</div>

[![FontFridge](/logo.png)](https://font.chingru.com)
