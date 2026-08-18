import { ArrowUpIcon, XIcon } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import {
  HeaderButtonGroup,
  HeaderButtonGroupItem,
} from "@/components/header-button-group";
import { NotdefIcon } from "@/components/notdef-icon";
import {
  RAIL_BTN_ON,
  RAIL_HEADER_BTN,
  RAIL_HEADER_CELL,
} from "@/components/rail-button";
import { Tooltip } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePreview } from "@/lib/preview/context";

const PREVIEW_DEBOUNCE_MS = 150;

const PLACEHOLDER =
  "Type to preview and filter fonts that support these characters…";
const PLACEHOLDER_SHORT = "Type to preview";

function ShowUncoveredToggle() {
  const { coverOnly, setCoverOnly } = usePreview();
  const pressed = !coverOnly;
  const label = pressed
    ? "Showing every font, including missing characters"
    : "Show every font, including missing characters";
  return (
    <Tooltip content={label}>
      <button
        type="button"
        onClick={() => setCoverOnly(pressed)}
        aria-pressed={pressed}
        aria-label={label}
        className={`${RAIL_HEADER_BTN} ${pressed ? RAIL_BTN_ON : ""}`}
      >
        <NotdefIcon className="size-4" active={pressed} />
      </button>
    </Tooltip>
  );
}

export function PreviewBar({
  onScrollTop,
  coverageToggle = false,
}: {
  onScrollTop?: () => void;
  coverageToggle?: boolean;
}) {
  const { text, setText } = usePreview();
  const isMobile = useIsMobile();
  const [draft, setDraft] = useState(text);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

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

  const clear = () => {
    clearTimeout(timer.current);
    setDraft("");
    setText("");
  };

  return (
    <div className="flex flex-1 items-end gap-2">
      <textarea
        dir="auto"
        rows={1}
        value={draft}
        onChange={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.preventDefault();
        }}
        placeholder={isMobile ? PLACEHOLDER_SHORT : PLACEHOLDER}
        className="field-sizing-content max-h-[calc(10*1.5rem+0.75rem)] min-h-9 w-full min-w-0 flex-1 resize-none rounded-lg border-0 bg-transparent px-2.5 py-1.5 text-base leading-6 outline-none placeholder:text-muted-foreground md:text-sm"
        aria-label="Preview text"
      />
      <HeaderButtonGroup className="relative flex items-center gap-1">
        {draft && (
          <HeaderButtonGroupItem index={0} className={RAIL_HEADER_CELL}>
            <button
              type="button"
              onClick={clear}
              aria-label="Clear preview text"
              className={RAIL_HEADER_BTN}
            >
              <XIcon className="size-4" />
            </button>
          </HeaderButtonGroupItem>
        )}
        {draft && coverageToggle && (
          <HeaderButtonGroupItem index={1} className={RAIL_HEADER_CELL}>
            <ShowUncoveredToggle />
          </HeaderButtonGroupItem>
        )}
        {onScrollTop && (
          <HeaderButtonGroupItem index={2} className={RAIL_HEADER_CELL}>
            <button
              type="button"
              onClick={onScrollTop}
              aria-label="Scroll to top"
              className={RAIL_HEADER_BTN}
            >
              <ArrowUpIcon className="size-5" />
            </button>
          </HeaderButtonGroupItem>
        )}
      </HeaderButtonGroup>
    </div>
  );
}
