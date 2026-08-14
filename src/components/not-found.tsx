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

export function NotFound({
  title = "Page not found",
  description = [
    "The page you are looking for does not exist",
    "or may have moved.",
  ],
}: {
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
        <Button nativeButton={false} role="link" render={<Link to="/" />}>
          <HouseIcon />
          Back to all fonts
        </Button>
      </Empty>
    </main>
  );
}
