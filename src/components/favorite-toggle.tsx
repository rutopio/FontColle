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
// filled heart red, used in the detail toggle, where "favorited" is shown by
// the heart itself (like the card/row), not by a button background. `bar` drops
// the text label for the compact mobile top bar. `label` is the caption: the
// list page says "Favorite" (enter the favorites view), the detail page says
// "Add" (heart this font).
function HeartLabel({
  active,
  red,
  bar,
  label,
}: {
  active: boolean;
  red?: boolean;
  bar?: boolean;
  label: string;
}) {
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
      {!bar && <span className="text-[10px] leading-none">{label}</span>}
    </>
  );
}

// Compact icon-button chrome for the mobile top bar (no tile, no label).
const BAR_BTN =
  "group/rail-btn flex size-9 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-sidebar-accent/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring";

// The rail-footer Favorite control. Its meaning depends on the page:
//  - List page (no `fontId`): a link that toggles the favorites-only view
//    (`?fav=1`), "show my hearted fonts".
//  - Detail page (`fontId` given): a toggle that hearts/un-hearts THIS font,
//    mirroring the card/row heart, so you can favorite from the detail view.
// Favorites live in localStorage (device-local); the view flag lives in the URL.
export function FavoriteToggle({
  fontId,
  variant = "rail",
}: {
  fontId?: string;
  // "rail" is the desktop icon-over-label tile; "bar" is the compact mobile
  // top-bar icon button.
  variant?: "rail" | "bar";
}) {
  if (fontId) return <FavoriteMark fontId={fontId} bar={variant === "bar"} />;
  return <FavoriteViewLink bar={variant === "bar"} />;
}

// Detail-page mode: heart this specific font.
function FavoriteMark({ fontId, bar }: { fontId: string; bar?: boolean }) {
  const { favorites, toggle } = useFavorites();
  const on = favorites.includes(fontId);
  return (
    <nav
      aria-label="Favorite"
      className={bar ? undefined : "flex flex-col gap-1"}
    >
      <button
        type="button"
        onClick={() => toggle(fontId)}
        aria-pressed={on}
        aria-label={on ? "Remove from favorites" : "Add to favorites"}
        // Neutral chrome always (no ON background): this is a toggle, so the
        // favorited state is carried by the red filled heart, not a highlight.
        className={bar ? BAR_BTN : cn(BTN, OFF)}
      >
        <HeartLabel active={on} bar={bar} label="Add" red />
      </button>
    </nav>
  );
}

// List-page mode: toggle the favorites-only view.
function FavoriteViewLink({ bar }: { bar?: boolean }) {
  // Route-agnostic search read: this sits in the global AppSidebar, shown on
  // both the list and detail routes, so it can't use a strict route hook.
  const fav = useRouterState({
    select: (s) => s.location.search.fav === "1",
  });
  return (
    <nav
      aria-label="Favorites"
      className={bar ? undefined : "flex flex-col gap-1"}
    >
      <Link
        to="/"
        // Toggle: drop the param when leaving favorites, set it when entering.
        // Keep the rest of the search so an active sort/filter survives.
        search={(prev) => ({ ...prev, fav: fav ? undefined : "1" })}
        aria-pressed={fav}
        aria-label={fav ? "Show all fonts" : "Show favorite fonts"}
        className={
          bar ? cn(BAR_BTN, fav && "text-red-500") : cn(BTN, fav ? ON : OFF)
        }
      >
        <HeartLabel active={fav} bar={bar} label="Favorite" />
      </Link>
    </nav>
  );
}
