import { ArrowClockwiseIcon, HouseIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { LogoIcon } from "@/components/logo-icon";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

// The site-wide error screen, shown when a route loader throws (e.g. getAllFonts
// fails or a D1 query errors). Mirrors NotFound's standalone centered Empty
// layout — same brand mark, no sidebar/rail — but leads with a Retry button
// (re-runs the failed loader) alongside the way home.
export function ErrorState({
  onRetry,
  title = "Something went wrong",
  description = ["We couldn't load the fonts just now.", "Please try again."],
}: {
  // Re-run the failed loader. Wired to the router's reset in the errorComponent.
  onRetry?: () => void;
  title?: string;
  description?: string[];
}) {
  return (
    <main className="flex min-h-full w-full flex-col items-center justify-center p-6">
      <Empty>
        <EmptyHeader>
          <Link
            to="/"
            aria-label="FontColle home"
            className="mb-8 flex flex-col items-center gap-1.5 text-primary"
          >
            <LogoIcon className="size-10" />
            <span className="font-mono text-sm">FontColle</span>
          </Link>
          <EmptyTitle>{title}</EmptyTitle>
          <EmptyDescription>
            {description.map((line) => (
              <span key={line} className="block text-balance">
                {line}
              </span>
            ))}
          </EmptyDescription>
        </EmptyHeader>
        <div className="flex items-center gap-2">
          {onRetry && (
            <Button onClick={onRetry}>
              <ArrowClockwiseIcon />
              Try again
            </Button>
          )}
          <Button variant="outline" render={<Link to="/" />}>
            <HouseIcon />
            All fonts
          </Button>
        </div>
      </Empty>
    </main>
  );
}
