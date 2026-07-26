// Dev-only breakpoint readout: shows which Tailwind screen the viewport is
// currently in. Stripped from production by the import.meta.env.PROD guard,
// which Vite statically replaces, so the whole component folds away at build
// time instead of shipping and returning null at runtime.
//
// Bottom-right, offset to clear the two things already in that corner, both of
// which only exist when this badge does:
//   * TanStack Devtools anchors its trigger bottom-right (see __root), so the
//     badge sits a row above it rather than on top of it.
//   * On mobile the FAB stack (filter / links / controls drawers) owns right-4
//     at z-40 and lifts with the preview dock. Those are md:hidden, so the
//     badge shifts left of that column only below md, and returns to the
//     corner from md up where the FABs are gone.
//
// pointer-events-none so it can never swallow a click meant for either.
//
// Breakpoints are Tailwind v4's defaults plus --breakpoint-3xl (120rem/1920px),
// which styles.css adds so the container keeps widening past 2xl. Keep this list
// in sync with that theme block — a missing step makes the badge under-report,
// showing the step below it across two screens.
// Note useIsMobile() keys off 768px, which is `md` — the badge reading `sm` or
// narrower means that hook reports mobile.
export function ScreenSize() {
  if (import.meta.env.PROD) {
    return null;
  }

  return (
    <output
      aria-hidden
      style={{ bottom: "calc(4.5rem + env(safe-area-inset-bottom))" }}
      className="pointer-events-none fixed right-22 z-50 flex h-8 min-w-8 items-center justify-center rounded-full bg-gray-800 px-2 font-mono text-white text-xs md:right-4"
    >
      <span className="block sm:hidden">xs</span>
      <span className="hidden sm:block md:hidden">sm</span>
      <span className="hidden md:block lg:hidden">md</span>
      <span className="hidden lg:block xl:hidden">lg</span>
      <span className="hidden xl:block 2xl:hidden">xl</span>
      <span className="hidden 2xl:block 3xl:hidden">2xl</span>
      <span className="hidden 3xl:block">3xl</span>
    </output>
  );
}
