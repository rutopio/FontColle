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
    });
  },
});
