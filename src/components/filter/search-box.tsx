import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";

// text-base on mobile prevents iOS Safari zoom-on-focus.
const SIZES = {
  md: { icon: "left-2.5 size-4", pad: "py-1.5 pl-8 sm:text-sm" },
  sm: { icon: "left-2 size-3.5", pad: "h-8 pl-7 sm:text-xs" },
} as const;

export function SearchBox({
  value,
  onChange,
  placeholder,
  label,
  size = "md",
  inputClassName,
  ...inputProps
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  size?: keyof typeof SIZES;
  inputClassName?: string;
} & Omit<
  ComponentProps<"input">,
  "value" | "onChange" | "placeholder" | "size" | "className"
>) {
  const s = SIZES[size];
  return (
    <div className="relative">
      <MagnifyingGlassIcon
        className={cn(
          "pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground",
          s.icon
        )}
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className={cn(
          "w-full rounded-md border bg-transparent pr-2 text-base outline-none focus:border-foreground",
          s.pad,
          inputClassName
        )}
        {...inputProps}
      />
    </div>
  );
}

export function NoMatches({
  title,
  description,
  onClear,
}: {
  title: string;
  description: React.ReactNode;
  onClear: () => void;
}) {
  return (
    <Empty className="py-8">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <MagnifyingGlassIcon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      <Button variant="outline" onClick={onClear}>
        Clear search
      </Button>
    </Empty>
  );
}
