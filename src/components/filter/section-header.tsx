import { ArrowsDownUpIcon, type Icon, XIcon } from "@phosphor-icons/react";

// Per-section pill ordering: by font count (default) or alphabetically.
export type SortMode = "count" | "alpha";

// Shared small button used in section headers: a compact, monospaced action.
export function HeaderButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex items-center gap-1 rounded-md px-2 py-1 font-mono text-muted-foreground text-xs transition-colors hover:bg-muted hover:text-foreground dark:hover:bg-muted/50"
    >
      {children}
    </button>
  );
}

// A count/alpha sort toggle for a pill section header. Rendered only when the
// section has more than one value (nothing to reorder otherwise).
export function SortToggle({
  sort,
  onToggle,
}: {
  sort: SortMode;
  onToggle: () => void;
}) {
  return (
    <HeaderButton
      onClick={onToggle}
      label={`Sort by ${sort === "count" ? "count" : "name"}, click to change`}
    >
      <ArrowsDownUpIcon className="size-3" />
      {sort === "count" ? "123" : "A–Z"}
    </HeaderButton>
  );
}

// A section header with a title and a right-side action that flips between a
// Reset button (when values are selected) and a SortToggle (when not).
export function SectionHeader({
  title,
  icon: Icon,
  hasSelection,
  onReset,
  canSort,
  sort,
  onToggleSort,
}: {
  title: string;
  icon: Icon;
  hasSelection: boolean;
  onReset: () => void;
  canSort: boolean;
  sort: SortMode;
  onToggleSort: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h2 className="flex items-center gap-1.5 font-medium text-primary text-sm uppercase tracking-wide">
        <Icon className="size-4" />
        {title}
      </h2>
      {hasSelection ? (
        <HeaderButton onClick={onReset} label={`Reset ${title}`}>
          <XIcon className="size-3" />
          Reset
        </HeaderButton>
      ) : (
        canSort && <SortToggle sort={sort} onToggle={onToggleSort} />
      )}
    </div>
  );
}
