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
import { Input } from "@/components/ui/input";
import { Tooltip } from "@/components/ui/tooltip";
import { usePreview } from "@/lib/preview/context";

const PREVIEW_DEBOUNCE_MS = 150;

/**
 * Releases the coverage filter. Narrowing to fonts that can render the preview
 * text is the resting state, so the button is what lets the excluded fonts back
 * in — pressed means the .notdef boxes are allowed to show, which is what the
 * icon draws.
 *
 * Carries no hover class of its own: the surrounding HeaderButtonGroup slides a
 * shared background between the bar's buttons, and a per-button hover:bg would
 * paint a second one underneath it.
 */
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
  /** List page only: the detail page shows one font, so there is nothing to narrow. */
  coverageToggle?: boolean;
}) {
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

  const clear = () => {
    clearTimeout(timer.current);
    setDraft("");
    setText("");
  };

  // Fixed indices, so the highlight keeps tracking the right button as the
  // clear/coverage pair mounts and unmounts with the field's content. The hook
  // measures registered items only, and tolerates the gaps this leaves.
  return (
    <div className="flex flex-1 items-center gap-2">
      <Input
        dir="auto"
        value={draft}
        onChange={(e) => commit(e.target.value)}
        placeholder="Type to preview across all fonts…"
        className="h-9 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0"
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
