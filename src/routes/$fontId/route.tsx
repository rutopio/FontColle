import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { TAB_SLUGS } from "@/lib/fonts/last-tab";

const TAB_SLUG_SET: ReadonlySet<string> = new Set(TAB_SLUGS);

export const Route = createFileRoute("/$fontId")({
  beforeLoad: ({ params }) => {
    if (params.fontId.includes(".")) throw notFound();
    if (TAB_SLUG_SET.has(params.fontId)) throw notFound();

    throw redirect({
      to: "/$tab/$fontId",
      params: { tab: "instances", fontId: params.fontId },
      replace: true,
      statusCode: 301,
    });
  },
});
