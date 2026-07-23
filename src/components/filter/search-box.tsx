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

// A magnifier icon over a full-width `type="search"` box, shared by the filter
// sections (facet / feature / language) and the glyphs sidebar. It stays a raw
// <input> rather than the shadcn <Input>: those callers want a lighter, icon-led
// search field, not the primitive's form-field chrome (rounded-lg, ring-3).
//
// `size` swaps the icon geometry and left padding; `sm` is the tighter sidebar
// build. `text-base` on mobile stops iOS Safari zooming on focus; the desktop
// size drops to text-sm/text-xs via the size variant. Any other native input
// prop (onKeyDown, aria-invalid, ...) passes straight through, and
// `inputClassName` layers on top for per-caller focus/state styling.
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
  // Accessible name for the input, e.g. "Search OpenType features".
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

// The no-results state for a searchable section: an icon, a title and
// description, and a button that clears the query. Title/description copy is
// per-section (features vs languages vs facets), so both are passed in.
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
