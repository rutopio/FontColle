import { Link } from "@tanstack/react-router";
import { LogoIcon } from "@/components/logo-icon";

// The stacked mark + wordmark that heads the standalone screens (NotFound,
// ErrorState). Those pages render without the sidebar or rail, so this keeps the
// brand — and a way home — present off the main app. The in-app logos
// (app-sidebar, filter-layout) are deliberately not this component: they sit in
// chrome at different sizes with their own hover treatment.
export function BrandMark() {
  return (
    <Link
      to="/"
      aria-label="FontColle home"
      className="group/brand mb-8 flex flex-wrap items-center gap-2 text-primary"
    >
      <LogoIcon className="size-10 transition-[stroke-width] group-hover/brand:[stroke-width:2]" />
      <span className="translate-y-1 font-mono text-2xl tracking-tight transition-all group-hover/brand:font-bold">
        FontColle
      </span>
    </Link>
  );
}
