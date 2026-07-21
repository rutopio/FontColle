import { type CSSProperties, useState } from "react";

// A specimen line that is always a real text field, never a button that swaps
// into one. Every keystroke goes to `onEditText`, so all specimen surfaces
// update live.
//
// It used to render an idle <button> and only mount the <input> on click,
// resolving the click's viewport point to a character offset
// (caretPositionFromPoint / caretRangeFromPoint) to seed the caret. That mapping
// was the fragile part: it silently returned null whenever the point missed the
// button's own text node — the common case for a truncated line, a click in the
// row's padding, or keyboard activation — and it could never support the things
// a field gets for free anyway (drag-select, double-click a word, IME
// composition, native undo). Rendering the input directly hands all of that to
// the browser and deletes the geometry entirely.
export function EditableSpecimen({
  text,
  style,
  onEditText,
  ariaLabel,
  className,
}: {
  // The text to show. This is the *resolved* specimen: the shared preview
  // string when the user has typed one, else the family's own default.
  text: string;
  style: CSSProperties;
  onEditText: (value: string) => void;
  ariaLabel: string;
  className: string;
}) {
  // While this field has focus it owns its value, so what the user typed
  // survives the round-trip through shared state. Two things would otherwise
  // fight them mid-word: the shared text is stored trimmed (a trailing space
  // would vanish as it was typed), and an emptied field falls back to the
  // family's default specimen (clearing the line would refill it).
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <input
      type="text"
      value={draft ?? text}
      onChange={(e) => {
        setDraft(e.target.value);
        onEditText(e.target.value.trim());
      }}
      // Hand control back to the shared text: blurring re-syncs this row with
      // whatever every other row is showing.
      onFocus={(e) => setDraft(e.target.value)}
      onBlur={() => setDraft(null)}
      // Escape gives up focus; there is no separate edit mode to close.
      onKeyDown={(e) => {
        if (e.key === "Escape") e.currentTarget.blur();
      }}
      aria-label={ariaLabel}
      dir="auto"
      style={style}
      className={className}
    />
  );
}
