import { createFileRoute, notFound, redirect } from "@tanstack/react-router";

// Redirect legacy /$fontId URLs.
export const Route = createFileRoute("/$fontId")({
  beforeLoad: ({ params }) => {
    // Dot in slug = static file, not a font.
    if (params.fontId.includes(".")) throw notFound();

    throw redirect({
      to: "/$tab/$fontId",
      params: { tab: "instances", fontId: params.fontId },
      replace: true,
      // 301 permanent redirect.
      statusCode: 301,
    });
  },
});
