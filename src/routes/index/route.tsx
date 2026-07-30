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
  // Only the first-page slice (Worker per-request size limits).
  loader: async () => ({ firstPage: await fetchFirstPage() }),
  head: () => {
    const canonical = absoluteUrl("/");
    if (!canonical) return {};
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

function isDefaultView(search: FilterSearch): boolean {
  if (search.sort || search.fav) return false;
  // activeFilterCount excludes q; check it separately.
  if (search.q) return false;
  return activeFilterCount(searchToFilter(search)) === 0;
}

// Client-side fetch to stay under Worker limits.
function App() {
  const search = Route.useSearch();
  const { firstPage } = Route.useLoaderData();
  const { data: fonts, isError } = useQuery(catalogQueryOptions());
  if (isError) throw new Error("Failed to load the font catalog.");
  if (!fonts) {
    return isDefaultView(search) ? (
      <FirstPagePending firstPage={firstPage} />
    ) : (
      <ListPending />
    );
  }
  return <Catalog fonts={fonts} />;
}
