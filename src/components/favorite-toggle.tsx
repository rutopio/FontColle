import { HeartIcon } from "@phosphor-icons/react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  RAIL_BAR_BTN,
  RAIL_BTN,
  RAIL_BTN_OFF,
  RAIL_BTN_ON,
  RAIL_HEADER_BTN,
} from "@/components/rail-button";
import { useFavorites } from "@/lib/fonts/favorites";
import { cn } from "@/lib/utils";

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
        // Keyed on the favorited state so hearting remounts the icon and
        // replays the pop, matching the card/row heart in font-actions. Only
        // the `red` (detail-page) mode pops: there the heart IS the state, so
        // it earns the beat. The list-page link uses the heart as a view
        // switch, where a celebration would be claiming something happened to
        // a font that did not.
        key={red && active ? "on" : "off"}
        className={cn(
          "size-5 group-hover/rail-btn:hidden",
          red && active && "animate-heart-pop text-red-500"
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
      {/* max-w-full + truncate: in the header variant this sits in a
          fixed-width cell, and a caption wider than it would otherwise stretch
          the cell past its neighbours'. */}
      {!bar && (
        <span className="max-w-full truncate text-[10px] leading-none">
          {label}
        </span>
      )}
    </>
  );
}

// The Favorite control. Its meaning depends on the page:
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
  // top-bar icon button; "header" is the same captioned tile as "rail", set in
  // a column header's end cell — the list page's Favorite and the detail
  // page's Add both use it, mirroring the preview field's Top button.
  variant?: "rail" | "bar" | "header";
}) {
  const chrome =
    variant === "rail"
      ? RAIL_BTN
      : variant === "bar"
        ? RAIL_BAR_BTN
        : RAIL_HEADER_BTN;
  // Only the mobile bar drops the caption; it has no room for one.
  const bare = variant === "bar";
  // Which variants say "on" with a red filled heart rather than a tile
  // background: the two that have no tile of their own to fill. The header's
  // hover tint belongs to the cell around it (like the Top button it sits
  // beside), so a background here would fight that rather than read as state.
  const red = variant !== "rail";
  // The header variant sits in a cell that owns the hover tint (and the group
  // the icon swap watches), so it must not carry a hover of its own to stack
  // on top of it. Every other variant hovers itself.
  const hover = variant === "header" ? undefined : RAIL_BTN_OFF;
  if (fontId)
    return (
      <FavoriteMark fontId={fontId} bare={bare} hover={hover} chrome={chrome} />
    );
  return (
    <FavoriteViewLink bare={bare} red={red} hover={hover} chrome={chrome} />
  );
}

// Detail-page mode: heart this specific font.
function FavoriteMark({
  fontId,
  bare,
  hover,
  chrome,
}: {
  fontId: string;
  bare?: boolean;
  // The hover chrome, or undefined where the cell around it owns that.
  hover?: string;
  chrome: string;
}) {
  const { favorites, toggle } = useFavorites();
  const on = favorites.includes(fontId);
  return (
    <nav
      aria-label="Favorite"
      className={bare ? undefined : "flex flex-col gap-1"}
    >
      <button
        type="button"
        onClick={() => toggle(fontId)}
        aria-pressed={on}
        aria-label={on ? "Remove from favorites" : "Add to favorites"}
        // Neutral chrome always (no ON background): this is a toggle, so the
        // favorited state is carried by the red filled heart, not a highlight.
        className={cn(chrome, hover)}
      >
        <HeartLabel active={on} bar={bare} label="Add" red />
      </button>
    </nav>
  );
}

// List-page mode: toggle the favorites-only view.
function FavoriteViewLink({
  bare,
  red,
  hover,
  chrome,
}: {
  bare?: boolean;
  // Show the active view with a red filled heart instead of a tile background.
  red?: boolean;
  // The hover chrome, or undefined where the cell around it owns that.
  hover?: string;
  chrome: string;
}) {
  // Route-agnostic search read: this sits in the global AppSidebar, shown on
  // both the list and detail routes, so it can't use a strict route hook.
  const fav = useRouterState({
    select: (s) => s.location.search.fav === "1",
  });
  return (
    <nav
      aria-label="Favorites"
      className={bare ? undefined : "flex flex-col gap-1"}
    >
      <Link
        to="/"
        // Toggle: drop the param when leaving favorites, set it when entering.
        // Keep the rest of the search so an active sort/filter survives.
        search={(prev) => ({ ...prev, fav: fav ? undefined : "1" })}
        // This is an <a> (role="link"), not a button: role="link" does not allow
        // aria-pressed, so a screen reader would drop the state and Lighthouse
        // flags it. aria-current is the link equivalent, marking this as the
        // view you're currently in.
        aria-current={fav ? "page" : undefined}
        aria-label={fav ? "Show all fonts" : "Show favorite fonts"}
        // The rail tile shows the active view with a background, which carries
        // its own hover; the others say it in red and take `hover` separately,
        // which is unset for the header variant because the cell around it
        // lights up instead, the way the Top button beside it does.
        className={cn(
          chrome,
          red ? cn(fav && "text-red-500", hover) : fav ? RAIL_BTN_ON : hover
        )}
      >
        {/* No `red` here despite the red text above: that flag also fires the
            heart-pop, which belongs to hearting a font, not to switching which
            view you are looking at. The colour comes from the className, which
            the icons inherit. */}
        <HeartLabel active={fav} bar={bare} label="Favorite" />
      </Link>
    </nav>
  );
}
