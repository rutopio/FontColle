import { HeartIcon } from "@phosphor-icons/react";
import { usePreview } from "@/lib/preview/context";
import { cn } from "@/lib/utils";

export function FavoritesFirstSection() {
  const { favFirst, setFavFirst } = usePreview();

  return (
    <button
      type="button"
      onClick={() => setFavFirst(!favFirst)}
      aria-pressed={favFirst}
      className={cn(
        "flex items-center justify-between gap-2.5 rounded-md border px-2.5 py-2 transition-[color,background-color,border-color,transform] duration-fast ease-snap hover:border-foreground active:scale-[0.97]",
        favFirst ? "border-primary bg-muted" : "border-input"
      )}
    >
      <span className="flex items-center gap-1.5 text-xs">
        <HeartIcon
          className="size-3.5 shrink-0"
          weight={favFirst ? "fill" : "regular"}
        />
        Show favorites on top
      </span>
      <span className="text-2xs text-muted-foreground">
        {favFirst ? "On" : "Off"}
      </span>
    </button>
  );
}
