import { HeartIcon } from "@phosphor-icons/react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useFavorites } from "@/lib/fonts/favorites";
import { cn } from "@/lib/utils";

// Shared rail-button chrome, so the two modes look identical.
const BTN =
  "group/rail-btn relative flex cursor-pointer flex-col items-center gap-1 rounded-md py-2 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring";
const ON = "bg-black/10 text-sidebar-accent-foreground dark:bg-white/12";
const OFF =
  "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground";

// The heart, with a hover-swapped duotone twin (Phosphor weight is a prop, not
// CSS). `active` fills it; the duotone twin shows on hover. `red` tints the
// filled heart red — used in the detail toggle, where "favorited" is shown by
// the heart itself (like the card/row), not by a button background.
function HeartLabel({ active, red }: { active: boolean; red?: boolean }) {
  return (
    <>
      <HeartIcon
        className={cn(
          "size-5 group-hover/rail-btn:hidden",
          red && active && "text-red-500"
        )}
        weight={active ? "fill" : "regular"}
      />
      <HeartIcon
        className={cn(
          "hidden size-5 group-hover/rail-btn:block",
          red && active && "text-red-500"
        )}
        weight="duotone"
      />
      <span className="text-[10px] leading-none">Favorite</span>
    </>
  );
}

// The rail-footer Favorite control. Its meaning depends on the page:
//  - List page (no `fontId`): a link that toggles the favorites-only view
//    (`?fav=1`) — "show my hearted fonts".
//  - Detail page (`fontId` given): a toggle that hearts/un-hearts THIS font,
//    mirroring the card/row heart, so you can favorite from the detail view.
// Favorites live in localStorage (device-local); the view flag lives in the URL.
export function FavoriteToggle({ fontId }: { fontId?: string }) {
  if (fontId) return <FavoriteMark fontId={fontId} />;
  return <FavoriteViewLink />;
}

// Detail-page mode: heart this specific font.
function FavoriteMark({ fontId }: { fontId: string }) {
  const { favorites, toggle } = useFavorites();
  const on = favorites.includes(fontId);
  return (
    <nav aria-label="Favorite" className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => toggle(fontId)}
        aria-pressed={on}
        aria-label={on ? "Remove from favorites" : "Add to favorites"}
        // Neutral chrome always (no ON background): this is a toggle, so the
        // favorited state is carried by the red filled heart, not a highlight.
        className={cn(BTN, OFF)}
      >
        <HeartLabel active={on} red />
      </button>
    </nav>
  );
}

// List-page mode: toggle the favorites-only view.
function FavoriteViewLink() {
  // Route-agnostic search read: this sits in the global AppSidebar, shown on
  // both the list and detail routes, so it can't use a strict route hook.
  const fav = useRouterState({
    select: (s) => s.location.search.fav === "1",
  });
  return (
    <nav aria-label="Favorites" className="flex flex-col gap-1">
      <Link
        to="/"
        // Toggle: drop the param when leaving favorites, set it when entering.
        // Keep the rest of the search so an active sort/filter survives.
        search={(prev) => ({ ...prev, fav: fav ? undefined : "1" })}
        aria-pressed={fav}
        aria-label={fav ? "Show all fonts" : "Show favorite fonts"}
        className={cn(BTN, fav ? ON : OFF)}
      >
        <HeartLabel active={fav} />
      </Link>
    </nav>
  );
}
