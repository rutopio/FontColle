import { createFileRoute, notFound, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/$fontId")({
  beforeLoad: ({ params }) => {
    // Dot in slug = static file request, not a font id.
    if (params.fontId.includes(".")) throw notFound();

    throw redirect({
      to: "/$tab/$fontId",
      params: { tab: "instances", fontId: params.fontId },
      replace: true,
      statusCode: 301,
    });
  },
});
