import { XIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePreview } from "@/lib/preview/context";

// Floating dock fixed at the bottom-center of the viewport. Holds the shared
// preview text so it stays reachable on both the list and detail pages while
// scrolling. The safe-area inset (below the bottom-4 gap) keeps it above the
// home indicator on notched devices.
export function PreviewDock() {
  const { text, setText } = usePreview();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 pb-[env(safe-area-inset-bottom)]">
      <div className="pointer-events-auto flex w-full max-w-xl items-center gap-2 rounded-full border bg-card/95 p-1.5 pl-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type to preview across all fonts…"
          className="h-9 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0"
          aria-label="Preview text"
        />
        {text && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setText("")}
            aria-label="Clear preview text"
            className="shrink-0 rounded-full text-muted-foreground"
          >
            <XIcon className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
