import { ArrowClockwiseIcon, HouseIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

// The site-wide error screen, shown when a route loader throws (e.g. the static
// catalog fails to load). Mirrors NotFound's standalone centered Empty layout,
// same BrandMark and no sidebar/rail, but leads with a Retry button (re-runs the
// failed loader) alongside the way home.
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
          <BrandMark />
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
          <Button
            variant="outline"
            nativeButton={false}
            role="link"
            render={<Link to="/" />}
          >
            <HouseIcon />
            All fonts
          </Button>
        </div>
      </Empty>
    </main>
  );
}
