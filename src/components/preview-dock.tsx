import { ArrowUpIcon, XIcon } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { RAIL_HEADER_BTN, RAIL_HEADER_CELL } from "@/components/rail-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePreview } from "@/lib/preview/context";

// Keystrokes echo instantly via local state, but the push to the shared context
// is debounced, so a burst of typing coalesces into one repaint of the grid.
const PREVIEW_DEBOUNCE_MS = 150;

function PreviewField() {
  const { text, setText } = usePreview();
  const [draft, setDraft] = useState(text);
  // No unmount cleanup: a timer that outlives the field just commits the final
  // keystrokes, which is what the debounce would have done anyway.
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Adopt outside changes to the shared text by comparing against the last-seen
  // context value during render. Not a key-remount: our own commits change
  // `text` too, and remounting mid-typing would drop focus.
  const [prevText, setPrevText] = useState(text);
  if (text !== prevText) {
    setPrevText(text);
    setDraft(text);
  }

  const commit = (value: string) => {
    setDraft(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setText(value), PREVIEW_DEBOUNCE_MS);
  };

  return (
    <>
      <Input
        // The cards preview this text with dir="auto", so the field feeding
        // them must derive direction the same way, or typing Arabic would sit
        // LTR here while every preview below flips.
        dir="auto"
        value={draft}
        onChange={(e) => commit(e.target.value)}
        placeholder="Type to preview across all fonts…"
        className="h-9 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0"
        aria-label="Preview text"
      />
      {draft && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            // Or an in-flight commit resurrects the cleared text.
            clearTimeout(timer.current);
            setDraft("");
            setText("");
          }}
          aria-label="Clear preview text"
          className="shrink-0 rounded-full"
        >
          <XIcon className="size-4" />
        </Button>
      )}
    </>
  );
}

// The whole footer bar as one input. `onScrollTop` adds a button that scrolls
// the font list back to the top.
export function PreviewBar({ onScrollTop }: { onScrollTop?: () => void }) {
  return (
    <div className="flex flex-1 items-center gap-2">
      <PreviewField />
      {/* The same tile the list and detail headers put Favorite and Add in (see
          RAIL_HEADER_CELL), so all three read as one control repeated at the
          corners of the page rather than three near-misses. */}
      {onScrollTop && (
        <div className={RAIL_HEADER_CELL}>
          <button
            type="button"
            onClick={onScrollTop}
            aria-label="Scroll to top"
            className={RAIL_HEADER_BTN}
          >
            {/* Phosphor weight is a prop, not CSS, so hover-swaps the icon:
                the base icon hides on hover and the bold twin shows. The group
                is the cell's, so the swap fires anywhere in it. */}
            <ArrowUpIcon className="size-5 group-hover/rail-btn:hidden" />
            <ArrowUpIcon
              className="hidden size-5 group-hover/rail-btn:block"
              weight="bold"
            />
            <span className="max-w-full truncate text-[10px] leading-none">
              Top
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
