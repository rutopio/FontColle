import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy bare font URL (/roboto). The detail views now live under a tab
// segment (/specimen/roboto, /glyphs/roboto, ...), so send the old path to
// the default Specimen view. Kept so shared/bookmarked links don't 404.
export const Route = createFileRoute("/$fontId")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/$tab/$fontId",
      params: { tab: "specimen", fontId: params.fontId },
      replace: true,
      // Permanent move: the bare /$fontId path is retired in favour of the
      // tabbed URL, so tell crawlers to transfer ranking and stop re-crawling
      // the old path. 301 (not the default 307) is correct for a permanent URL
      // change. `statusCode` is the current option; `code` is deprecated.
      statusCode: 301,
    });
  },
});
