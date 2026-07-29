import { ArrowUpIcon, XIcon } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { RAIL_HEADER_BTN, RAIL_HEADER_CELL } from "@/components/rail-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePreview } from "@/lib/preview/context";

const PREVIEW_DEBOUNCE_MS = 150;

function PreviewField() {
  const { text, setText } = usePreview();
  const [draft, setDraft] = useState(text);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Sync external changes without remounting (which would drop focus).
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

export function PreviewBar({ onScrollTop }: { onScrollTop?: () => void }) {
  return (
    <div className="flex flex-1 items-center gap-2">
      <PreviewField />
      {onScrollTop && (
        <div className={RAIL_HEADER_CELL}>
          <button
            type="button"
            onClick={onScrollTop}
            aria-label="Scroll to top"
            className={RAIL_HEADER_BTN}
          >
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
