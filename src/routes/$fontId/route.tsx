import { createFileRoute, notFound, redirect } from "@tanstack/react-router";

// The retired bare font URL (/roboto), kept so old shared links don't 404.
export const Route = createFileRoute("/$fontId")({
  beforeLoad: ({ params }) => {
    // This route matches EVERY single-segment path, so a root file that failed
    // to deploy (/llms.txt, /sitemap.xml) would 301 to /instances/<file> and
    // 404 there, hiding the real problem. A slug never contains a dot, so a
    // dot means "not a font": 404 honestly.
    if (params.fontId.includes(".")) throw notFound();

    throw redirect({
      to: "/$tab/$fontId",
      params: { tab: "instances", fontId: params.fontId },
      replace: true,
      // 301, not the default 307: a permanent move, so crawlers transfer
      // ranking and stop re-crawling. `code` is the deprecated spelling.
      statusCode: 301,
    });
  },
});
