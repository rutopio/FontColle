import { createFileRoute, notFound, redirect } from "@tanstack/react-router";

// Legacy bare font URL (/roboto). The detail views now live under a tab
// segment (/instances/roboto, /glyphs/roboto, ...), so send the old path to
// the default Instances view. Kept so shared/bookmarked links don't 404.
export const Route = createFileRoute("/$fontId")({
  beforeLoad: ({ params }) => {
    // This route matches every single-segment path, so a root file that failed
    // to deploy (/llms.txt, /sitemap.xml) would be redirected to
    // /instances/<file> instead of 404ing — a 301 to a 404, which hides the
    // real problem. A slug is a family_dir (lowercase, no dots, see
    // lib/fonts/slug.ts), so a dot means "not a font": 404 honestly.
    if (params.fontId.includes(".")) throw notFound();

    throw redirect({
      to: "/$tab/$fontId",
      params: { tab: "instances", fontId: params.fontId },
      replace: true,
      // Permanent move: the bare /$fontId path is retired in favour of the
      // tabbed URL, so tell crawlers to transfer ranking and stop re-crawling
      // the old path. 301 (not the default 307) is correct for a permanent URL
      // change. `statusCode` is the current option; `code` is deprecated.
      statusCode: 301,
    });
  },
});
