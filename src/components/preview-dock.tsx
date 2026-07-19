import { ArrowUpIcon, XIcon } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePreview } from "@/lib/preview/context";

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
  // Pending debounced commit, scheduled from onChange. A timer that outlives
  // the field just commits the final keystrokes — the same thing the debounce
  // would have done — so no unmount cleanup is needed.
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Adopt outside changes to the shared text (Clear on the other page, the
  // value restored from localStorage after mount) by comparing against the
  // last-seen context value during render. Not a key-remount: our own commits
  // also change `text`, and remounting mid-typing would drop focus.
  const [prevText, setPrevText] = useState(text);
  if (text !== prevText) {
    setPrevText(text);
    setDraft(text);
  }

  // Echo the keystroke instantly; push to the shared context once typing
  // settles for the debounce window.
  const commit = (value: string) => {
    setDraft(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setText(value), PREVIEW_DEBOUNCE_MS);
  };

  return (
    <>
      <Input
        // The cards and rows preview this text with dir="auto", so the field
        // feeding them has to derive direction the same way: typing Arabic or
        // Hebrew here should read right-to-left as you type, not sit LTR while
        // every preview below flips.
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
            // Cancel any in-flight commit so it can't resurrect cleared text.
            clearTimeout(timer.current);
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
//
// `onScrollTop`, when supplied (the list page), adds a divider-separated square
// button on the far right that scrolls the main font list back to the top.
export function PreviewBar({ onScrollTop }: { onScrollTop?: () => void }) {
  return (
    <div className="flex flex-1 items-center gap-2">
      <PreviewField />
      {onScrollTop && (
        <div className="group -mr-4 flex h-16 shrink-0 cursor-pointer items-center justify-center border-border border-l px-3 transition-colors hover:bg-secondary">
          <button
            type="button"
            onClick={onScrollTop}
            aria-label="Scroll to top"
            className="flex cursor-pointer flex-col items-center gap-1 rounded-md px-2 py-2 text-muted-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring group-hover:text-foreground"
          >
            {/* Phosphor weight is a prop, not CSS, so hover-swaps the icon:
                the base icon hides on hover and the bold twin shows. */}
            <ArrowUpIcon className="size-5 group-hover:hidden" />
            <ArrowUpIcon
              className="hidden size-5 group-hover:block"
              weight="bold"
            />
            <span className="text-[10px] leading-none">Top</span>
          </button>
        </div>
      )}
    </div>
  );
}
