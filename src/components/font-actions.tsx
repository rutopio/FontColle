import { GoogleLogoIcon, HeartIcon } from "@phosphor-icons/react";
import { HoverBoldIcon } from "@/components/hover-bold-icon";
import { repoHostIcon } from "@/components/repo-host-icon";
import { Tooltip } from "@/components/ui/tooltip";
import type { FontRecord } from "@/lib/fonts/types";
import { cn } from "@/lib/utils";

// Matches the real control order: favorite, Google Fonts, repository.
const STATIC_SLOTS = ["favorite", "specimen", "repo"];

export function FontActions({
  font,
  isFavorite,
  onToggleFavorite,
  reserveRepoSlot = false,
  static: isStatic = false,
}: {
  font: FontRecord;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  reserveRepoSlot?: boolean;
  /**
   * Loading-skeleton mode: render same-sized blanks instead of the real
   * controls. Each icon here is a HoverBoldIcon, i.e. two full inline SVGs
   * (regular + bold) for the hover crossfade, and the pending list renders
   * every card twice (grid and row, one hidden by CSS). That put ~290 SVGs in
   * the SSR payload for controls nobody can click yet -- 12ms of render on a
   * 10ms CPU budget. Geometry matches the real row so nothing shifts.
   */
  static?: boolean;
}) {
  if (isStatic) {
    const slots =
      font.repositoryUrl || reserveRepoSlot
        ? STATIC_SLOTS
        : STATIC_SLOTS.slice(0, 2);
    return (
      <div aria-hidden className="flex shrink-0 items-center gap-4">
        {slots.map((slot) => (
          <span key={slot} className="size-5 shrink-0" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-4">
      <Tooltip
        content={isFavorite ? "Remove from favorites" : "Add to favorites"}
      >
        <button
          type="button"
          onClick={(e: React.MouseEvent) => {
            e.preventDefault();
            onToggleFavorite(font.id);
          }}
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          className="-m-2 p-2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <HoverBoldIcon
            key={isFavorite ? "on" : "off"}
            icon={HeartIcon}
            weight={isFavorite ? "fill" : "regular"}
            className={cn(
              "size-5",
              isFavorite && "animate-heart-pop text-red-500"
            )}
          />
        </button>
      </Tooltip>
      {/* Buttons, not links: the card is already a <Link> and nested <a> is invalid. */}
      <Tooltip content="View on Google Fonts">
        <button
          type="button"
          onClick={(e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            window.open(
              `https://fonts.google.com/specimen/${font.name.replace(/\s+/g, "+")}`,
              "_blank",
              "noreferrer"
            );
          }}
          aria-label="View on Google Fonts"
          className="-m-2 p-2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <HoverBoldIcon icon={GoogleLogoIcon} className="size-5" />
        </button>
      </Tooltip>
      {font.repositoryUrl && (
        <Tooltip content="View source repository">
          <button
            type="button"
            onClick={(e: React.MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              window.open(font.repositoryUrl as string, "_blank", "noreferrer");
            }}
            aria-label="View source repository"
            className="-m-2 p-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <HoverBoldIcon
              icon={repoHostIcon(font.repositoryUrl)}
              className="size-5"
            />
          </button>
        </Tooltip>
      )}
      {!font.repositoryUrl && reserveRepoSlot && (
        <span aria-hidden className="size-5 shrink-0" />
      )}
    </div>
  );
}
