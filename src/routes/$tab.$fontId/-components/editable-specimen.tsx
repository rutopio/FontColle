import { type CSSProperties, useState } from "react";

export function EditableSpecimen({
  text,
  style,
  onEditText,
  ariaLabel,
  className,
}: {
  text: string;
  style: CSSProperties;
  onEditText: (value: string) => void;
  ariaLabel: string;
  className: string;
}) {
  // While focused, owns its value to avoid trim/default conflicts mid-typing.
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <input
      type="text"
      value={draft ?? text}
      onChange={(e) => {
        setDraft(e.target.value);
        onEditText(e.target.value.trim());
      }}
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
