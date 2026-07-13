import { XIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePreview } from "@/lib/preview/context";
import { useDebouncedValue } from "@/lib/use-debounced-value";

// The shared preview-text field: type here to preview the string across every
// font. The Column footer bar supplies the chrome, so the field itself is
// borderless and fills its container.
//
// The field echoes keystrokes instantly via local state, but the value pushed to
// the shared context (which repaints every visible card's specimen) is debounced
// so a burst of typing coalesces into one repaint of the grid instead of one per
// keystroke.
const PREVIEW_DEBOUNCE_MS = 150;

function PreviewField() {
  const { text, setText } = usePreview();
  const [draft, setDraft] = useState(text);
  const debounced = useDebouncedValue(draft, PREVIEW_DEBOUNCE_MS);

  // Commit the settled draft to the shared context (skip when it already equals
  // the current context text).
  // biome-ignore lint/correctness/useExhaustiveDependencies: only the debounced value drives the commit; text/setText are read to compare, not to trigger.
  useEffect(() => {
    if (debounced !== text) setText(debounced);
  }, [debounced]);

  // Keep the field in sync when the text changes from outside (e.g. Clear, or a
  // value restored from localStorage on mount).
  useEffect(() => {
    setDraft(text);
  }, [text]);

  return (
    <>
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Type to preview across all fonts…"
        className="h-9 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0"
        aria-label="Preview text"
      />
      {draft && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setDraft("");
            setText("");
          }}
          aria-label="Clear preview text"
          className="shrink-0 rounded-full text-muted-foreground"
        >
          <XIcon className="size-4" />
        </Button>
      )}
    </>
  );
}

// Full-width preview field for a page's bottom bar (Column footer): the whole
// bar is the input. Both the list and the detail page mount one, so the shared
// preview text stays reachable while scrolling on either.
export function PreviewBar() {
  return (
    <div className="flex flex-1 items-center gap-2">
      <PreviewField />
    </div>
  );
}
