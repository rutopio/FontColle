import { type CSSProperties, useState } from "react";

// ALWAYS a real text field, never a button that swaps into one on click.
// Mounting the input on click means resolving the click point to a character
// offset to seed the caret, which returns null whenever the point misses the
// text node (a truncated line, the row's padding, keyboard activation), and
// still gives up drag-select, double-click-a-word, IME composition and undo.
export function EditableSpecimen({
  text,
  style,
  onEditText,
  ariaLabel,
  className,
}: {
  // The RESOLVED specimen: the shared preview string when the user has typed
  // one, else the family's own default.
  text: string;
  style: CSSProperties;
  onEditText: (value: string) => void;
  ariaLabel: string;
  className: string;
}) {
  // While focused the field owns its value, so typing survives the round-trip
  // through shared state. Two things would otherwise fight the user mid-word:
  // the shared text is stored trimmed, so a trailing space would vanish as it
  // was typed, and an emptied field falls back to the family's default, so
  // clearing the line would refill it.
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <input
      type="text"
      value={draft ?? text}
      onChange={(e) => {
        setDraft(e.target.value);
        onEditText(e.target.value.trim());
      }}
      // Hands control back to the shared text.
      onFocus={(e) => setDraft(e.target.value)}
      onBlur={() => setDraft(null)}
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
