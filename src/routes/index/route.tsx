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
  // ONLY the first-page slice, never the full catalog: the Worker must not
  // parse it (Error 1102), and the client fetches it via catalogQueryOptions.
  // The slice is what lets a default `/` visit's SSR HTML carry real font
  // cards and /instances/ links for crawlers and non-JS fetchers.
  loader: async () => ({ firstPage: await fetchFirstPage() }),
  head: () => {
    // Filter/sort params are views of one catalog, not distinct pages.
    const canonical = absoluteUrl("/");
    if (!canonical) return {};
    // A SearchAction, so engines can offer a sitelinks search box into the
    // catalog. The query template uses the real text-search param `q`.
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

// Only the bare `/` may SSR the unfiltered first-page slice: under a filtered
// or sorted URL that slice isn't what the page should show.
function isDefaultView(search: FilterSearch): boolean {
  if (search.sort || search.fav) return false;
  // activeFilterCount deliberately excludes the text query, so `q` needs its
  // own check or a search URL would SSR the unfiltered slice.
  if (search.q) return false;
  return activeFilterCount(searchToFilter(search)) === 0;
}

// Fetched on the CLIENT, which is what keeps the home page under the Worker's
// per-request limits (Error 1102).
function App() {
  const search = Route.useSearch();
  const { firstPage } = Route.useLoaderData();
  const { data: fonts, isError } = useQuery(catalogQueryOptions());
  if (isError) throw new Error("Failed to load the font catalog.");
  // This tree is identical server-side and on the first client render, so the
  // swap to Catalog carries no hydration mismatch.
  if (!fonts) {
    return isDefaultView(search) ? (
      <FirstPagePending firstPage={firstPage} />
    ) : (
      <ListPending />
    );
  }
  return <Catalog fonts={fonts} />;
}
