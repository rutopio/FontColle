import { InfoIcon } from "@phosphor-icons/react";
import { useAbout } from "@/lib/about/context";

// Opens the About dialog (components/about-dialog) from the icon rail's footer,
// styled to match the rail's other footer controls: icon over a small label on
// desktop, bare icon in the mobile top bar. It toggles context state rather than
// navigating, so the page underneath and its rail are untouched.
export function AboutLink({
  variant = "rail",
}: {
  // "rail" is the desktop icon-over-label tile; "bar" is the compact mobile
  // top-bar icon button (no label).
  variant?: "rail" | "bar";
}) {
  const { open, setOpen } = useAbout();
  const bar = variant === "bar";

  return (
    <nav aria-label="About" className={bar ? undefined : "flex flex-col gap-1"}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="About FontColle"
        aria-haspopup="dialog"
        aria-expanded={open}
        className={
          bar
            ? "group/rail-btn flex size-9 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-sidebar-accent/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring aria-expanded:text-foreground"
            : "group/rail-btn relative flex cursor-pointer flex-col items-center gap-1 rounded-md py-2 text-muted-foreground outline-none transition-colors hover:bg-sidebar-accent/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring aria-expanded:bg-black/10 aria-expanded:text-foreground dark:aria-expanded:bg-white/12"
        }
      >
        {/* Phosphor weight is a prop, not CSS, so hover-swaps the icon:
            the base icon hides on hover and the duotone twin shows. */}
        <InfoIcon className="size-5 group-hover/rail-btn:hidden" />
        <InfoIcon
          className="hidden size-5 group-hover/rail-btn:block"
          weight="duotone"
        />
        {!bar && <span className="text-[10px] leading-none">About</span>}
      </button>
    </nav>
  );
}
