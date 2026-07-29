// Dev-only breakpoint readout. The import.meta.env.PROD guard is statically
// replaced by Vite, so the whole component folds away at build time.
//
// Offset bottom-right to clear the Devtools trigger and, below md, the FAB
// stack that owns that column.
//
// Keep the steps in sync with the theme block in styles.css, which adds
// --breakpoint-3xl on top of Tailwind's defaults: a missing step makes the
// badge under-report, showing the step below it across two screens.
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
      <span className="3xl:hidden hidden 2xl:block">2xl</span>
      <span className="3xl:block hidden">3xl</span>
    </output>
  );
}
