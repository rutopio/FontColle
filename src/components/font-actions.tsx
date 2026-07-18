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

// The card/row action cluster: favorite toggle, Google Fonts link, and (when
// known) the upstream repo link. Byte-identical between FontCard and FontRow,
// so it lives here once. Layout stays in each component; only these buttons
// move. The -m-2 p-2 wrapping preserves the enlarged tap target.
export function FontActions({
  font,
  isFavorite,
  onToggleFavorite,
}: {
  font: FontRecord;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
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
            // Key on the favorited state so hearting remounts the icon and
            // replays the pop; the class only applies when favorited, so
            // un-hearting doesn't animate.
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
    </div>
  );
}
