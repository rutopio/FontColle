import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

// The search input shared by the facet / feature / language filter sections:
// a magnifier icon over a full-width `type="search"` box. Only the placeholder
// and aria label vary between sections.
export function SearchBox({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  // Accessible name for the input, e.g. "Search OpenType features".
  label: string;
}) {
  return (
    <div className="relative">
      <MagnifyingGlassIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="w-full rounded-md border bg-transparent py-1.5 pr-2 pl-8 text-sm outline-none focus:border-foreground"
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
