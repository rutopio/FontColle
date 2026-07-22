import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { catalogQueryOptions } from "@/lib/fonts/catalog";
import {
  activeFilterCount,
  type FilterSearch,
  parseFilterSearch,
  searchToFilter,
} from "@/lib/fonts/filter";
import { fetchFirstPage } from "@/lib/fonts/first-page";
import { absoluteUrl, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";
import { Catalog } from "./-components/catalog";
import { FirstPagePending, ListPending } from "./-components/list-pending";

export const Route = createFileRoute("/")({
  component: App,
  validateSearch: (raw): FilterSearch => parseFilterSearch(raw),
  // Returns ONLY the first-page slice (~24 records, a few tens of KB), never the
  // full catalog, the Worker must not parse the 14 MB catalog (Error 1102). The
  // full catalog still loads client-side via catalogQueryOptions. This slice is
  // what lets a default `/` visit's SSR HTML carry real font cards + /instances/
  // links for crawlers and non-JS fetchers (see the first-page render in App).
  loader: async () => ({ firstPage: await fetchFirstPage() }),
  head: () => {
    // Filter/sort params are transient views of the same catalog, not distinct
    // pages, so the canonical is the bare list. og:url matches.
    const canonical = absoluteUrl("/");
    if (!canonical) return {};
    // WebSite structured data with a SearchAction, so engines can offer a
    // sitelinks search box straight into the catalog. The query template uses
    // the real text-search param `q` (see filterToSearch in filter/state.ts).
    // Emitted only with an absolute origin, like the canonical tag above.
    const jsonLd = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      url: canonical,
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${absoluteUrl("/?q=")}{search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    });
    return {
      meta: [{ property: "og:url", content: canonical }],
      links: [{ rel: "canonical", href: canonical }],
      scripts: [{ type: "application/ld+json", children: jsonLd }],
    };
  },
});

// True when the URL carries no filter, query, sort deviation, or favorites view,
// i.e. the bare `/` catalog. Only then is it correct to SSR the unfiltered
// first-page slice: under a filtered/sorted/fav URL that slice wouldn't match
// what the page should show, so those keep the skeleton-only pending state.
function isDefaultView(search: FilterSearch): boolean {
  if (search.sort || search.fav) return false;
  // activeFilterCount deliberately excludes the text query (see describe.ts /
  // tasks/todo.md 3.1), so check `q` explicitly or a search URL would SSR the
  // unfiltered first-page slice.
  if (search.q) return false;
  return activeFilterCount(searchToFilter(search)) === 0;
}

// Fetches the static catalog on the client (see catalogQueryOptions). While it
// loads we show a skeleton (or, on the default `/` view, the loader's first-page
// slice as real cards); on success the real Catalog view swaps in. Fetching the
// full catalog on the client instead of in a Worker loader is what keeps the
// home page under the Worker's per-request limits (Error 1102, tasks/todo.md P0).
function App() {
  const search = Route.useSearch();
  const { firstPage } = Route.useLoaderData();
  const { data: fonts, isError } = useQuery(catalogQueryOptions());
  if (isError) throw new Error("Failed to load the font catalog.");
  // While the full catalog loads: on a default `/` visit render the loader's
  // first-page slice as real cards (so crawlers/no-JS see ~24 font links), with
  // skeletons filling the rest. On any filtered/sorted URL keep the plain
  // skeleton, SSR-ing unfiltered content under a filtered URL would be wrong.
  // This pending tree is identical server-side and on the first client render
  // (the loader data is the same, favorites hydrate to [] as today), so the swap
  // to Catalog on catalog-load matches today's skeleton->content swap with no
  // hydration mismatch.
  if (!fonts) {
    return isDefaultView(search) ? (
      <FirstPagePending firstPage={firstPage} />
    ) : (
      <ListPending />
    );
  }
  return <Catalog fonts={fonts} />;
}
