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

export function ErrorState({
  onRetry,
  title = "Something went wrong",
  description = ["We could not load the fonts just now.", "Please try again."],
}: {
  onRetry?: () => void;
  title?: string;
  description?: string[];
}) {
  return (
    <main className="flex min-h-full w-full flex-col items-center justify-center bg-background p-6">
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
