import { HouseIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

// The site-wide Not Found screen, shown for unmatched routes and for a missing
// font on the detail route. Deliberately standalone — no filter sidebar or rail,
// like the detail License view — so it centers a single Empty state with a way
// back home. Fills the viewport height so the Empty state sits centered.
export function NotFound({
  title = "Page not found",
  description = "The page you're looking for doesn't exist or may have moved.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <main className="flex min-h-svh w-full flex-col items-center justify-center p-6">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <MagnifyingGlassIcon />
          </EmptyMedia>
          <EmptyTitle>{title}</EmptyTitle>
          <EmptyDescription>{description}</EmptyDescription>
        </EmptyHeader>
        <Button render={<Link to="/" />}>
          <HouseIcon />
          Back to all fonts
        </Button>
      </Empty>
    </main>
  );
}
