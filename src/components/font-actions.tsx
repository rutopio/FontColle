import { GoogleLogoIcon, HeartIcon } from "@phosphor-icons/react";
import { HoverBoldIcon } from "@/components/hover-bold-icon";
import { repoHostIcon } from "@/components/repo-host-icon";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { FontRecord } from "@/lib/fonts/types";
import { cn } from "@/lib/utils";

// Identical between FontCard and FontRow, so it lives here once.
export function FontActions({
  font,
  isFavorite,
  onToggleFavorite,
  reserveRepoSlot = false,
}: {
  font: FontRecord;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  // Rows share one continuous right edge, so a dropped button pulls the heart
  // and Google icon rightward and breaks the column. Cards each align to their
  // own edge and need no placeholder.
  reserveRepoSlot?: boolean;
}) {
  return (
    <div className="flex shrink-0 items-center gap-4">
      <Tooltip>
        <TooltipTrigger
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onToggleFavorite(font.id);
          }}
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          className="-m-2 p-2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <HoverBoldIcon
            // Keyed so hearting remounts the icon and replays the pop.
            key={isFavorite ? "on" : "off"}
            icon={HeartIcon}
            weight={isFavorite ? "fill" : "regular"}
            className={cn(
              "size-5",
              isFavorite && "animate-heart-pop text-red-500"
            )}
          />
        </TooltipTrigger>
        <TooltipContent>
          {isFavorite ? "Remove from favorites" : "Add to favorites"}
        </TooltipContent>
      </Tooltip>
      {/* A button, not an <a>: the whole card is already a <Link> (an
        <a>), and <a> can't nest <a> (hydration error). Open Google Fonts
        in a new tab and stop the click from triggering card navigation. */}
      <Tooltip>
        <TooltipTrigger
          type="button"
          onClick={(e) => {
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
        </TooltipTrigger>
        <TooltipContent>View on Google Fonts</TooltipContent>
      </Tooltip>
      {/* Only when the family has a known upstream repo. A button, not an
        <a>, for the same nested-<a> reason as the download button. */}
      {font.repositoryUrl && (
        <Tooltip>
          <TooltipTrigger
            type="button"
            onClick={(e) => {
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
          </TooltipTrigger>
          <TooltipContent>View source repository</TooltipContent>
        </Tooltip>
      )}
      {/* Placeholder for a family with no repo. size-5 matches the icon the
          real button renders; the button's -m-2 p-2 cancels out, so its
          footprint in this flex row is exactly the icon's box. aria-hidden and
          empty: it reserves space without announcing a control that isn't
          there. */}
      {!font.repositoryUrl && reserveRepoSlot && (
        <span aria-hidden className="size-5 shrink-0" />
      )}
    </div>
  );
}
