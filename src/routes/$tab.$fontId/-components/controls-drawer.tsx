import { SlidersHorizontalIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

// Mobile-only (<768px) access to the detail sidebar controls. The desktop
// two-level sidebar collapses to an unreachable Sheet on mobile (see
// app-sidebar), so on the Specimen/Glyphs tabs — the only ones with sidebar
// controls (size/axes/features, Unicode blocks) — this floating button opens a
// bottom drawer holding the very same panel. Hidden on desktop and on tabs with
// no controls; the page decides when to render it.
export function ControlsDrawer({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={title}
        style={{ bottom: "calc(5rem + env(safe-area-inset-bottom))" }}
        className="fixed right-4 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg outline-none transition-transform focus-visible:ring-2 focus-visible:ring-sidebar-ring active:scale-95 md:hidden"
      >
        <SlidersHorizontalIcon className="size-6" weight="fill" />
      </button>

      <SheetContent
        side="bottom"
        className="h-[85dvh]! gap-0 overflow-hidden p-0"
      >
        <div className="flex items-center gap-2 border-border border-b px-4 py-3">
          <SlidersHorizontalIcon
            className="size-4 text-primary"
            weight="fill"
          />
          <SheetTitle>{title}</SheetTitle>
        </div>
        <div className="min-h-0 flex-1">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
