import { HouseIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

// The site-wide Not Found screen, shown for unmatched routes and for a missing
// font on the detail route. Deliberately standalone, no filter sidebar or rail,
// like the detail License view, so it centers a single Empty state with a way
// back home. The FontColle mark + wordmark stand in for the generic empty icon,
// keeping the brand present off the main app.
export function NotFound({
  title = "Page not found",
  // Each string renders as its own line, so both sentences read as separate
  // lines instead of wrapping mid-sentence.
  description = [
    "The page you're looking for doesn't exist",
    "or may have moved.",
  ],
}: {
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
        <Button nativeButton={false} role="link" render={<Link to="/" />}>
          <HouseIcon />
          Back to all fonts
        </Button>
      </Empty>
    </main>
  );
}
