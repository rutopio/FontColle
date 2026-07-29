import { Link } from "@tanstack/react-router";
import { LogoIcon } from "@/components/logo-icon";

export function BrandMark() {
  return (
    <Link
      to="/"
      aria-label="FontColle home"
      className="group/brand mb-8 flex flex-wrap items-center gap-2 text-primary"
    >
      <LogoIcon className="size-10 transition-[stroke-width] group-hover/brand:[stroke-width:2]" />
      <span className="translate-y-1 font-mono text-2xl tracking-tight group-hover/brand:font-bold">
        FontColle
      </span>
    </Link>
  );
}
