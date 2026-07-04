import { Link } from "@tanstack/react-router";

// Persistent title bar shown on both the list and detail pages so the top of
// the layout stays stable when navigating between them.
export function SiteHeader() {
  return (
    <header className="flex flex-col gap-1">
      <Link to="/" className="w-fit font-semibold text-2xl">
        Font Finder
      </Link>
      <p className="text-muted-foreground text-sm">
        Filter Google Fonts by real OpenType features and variable axes.
      </p>
    </header>
  );
}
