import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// A slider's numeric readout that doubles as a manual input: a dotted underline
// hints it's editable, and clicking swaps it for a borderless underlined field
// (no spinner box) plus a dropdown of presets. Commits on blur, Enter or a
// preset pick, clamped to [min, max]; Escape cancels.
export function EditableValue({
  value,
  min,
  max,
  suffix,
  presets,
  onChange,
  ariaLabel,
}: {
  value: number;
  min: number;
  max: number;
  suffix?: string;
  presets?: number[];
  onChange: (v: number) => void;
  ariaLabel: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const anchorRef = useRef<HTMLSpanElement>(null);
  // Fixed-position coords for the portalled dropdown, measured off the anchor.
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(
    null
  );

  const commit = (raw: string) => {
    const n = Number(raw);
    if (Number.isFinite(n) && raw.trim() !== "")
      onChange(Math.min(max, Math.max(min, n)));
    setEditing(false);
  };

  // Only presets within range, so a picked value never gets clamped away.
  const options = (presets ?? []).filter((p) => p >= min && p <= max);

  // The dropdown is portalled to <body> so it escapes the axis row's
  // overflow-hidden slider wrapper (which would otherwise clip it). Position it
  // under the anchor with fixed coords, remeasured whenever the editor opens.
  useLayoutEffect(() => {
    if (!editing || !anchorRef.current) return;
    const measure = () => {
      const r = anchorRef.current?.getBoundingClientRect();
      if (r) setMenuPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    };
    measure();
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [editing]);

  if (editing) {
    return (
      <span
        ref={anchorRef}
        className="relative inline-flex items-baseline font-mono text-foreground text-xs"
      >
        <input
          type="text"
          inputMode="decimal"
          value={draft}
          size={1}
          // biome-ignore lint/a11y/noAutofocus: focus the field the user just opened.
          autoFocus
          aria-label={ariaLabel}
          onChange={(e) => setDraft(e.target.value)}
          // Delay so a preset mousedown commits before blur closes the field.
          onBlur={() => setTimeout(() => setEditing(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit(draft);
            if (e.key === "Escape") setEditing(false);
          }}
          className="w-[4ch] border-transparent border-b bg-transparent text-right outline-none hover:border-muted-foreground focus:border-foreground"
        />
        {suffix}
        {options.length > 0 &&
          menuPos &&
          createPortal(
            <ul
              style={{
                position: "fixed",
                top: menuPos.top,
                right: menuPos.right,
              }}
              className="z-50 max-h-56 min-w-16 overflow-auto rounded-md border bg-popover py-1 font-mono text-popover-foreground text-xs shadow-md"
            >
              {options.map((p) => (
                <li key={p}>
                  <button
                    type="button"
                    // mousedown fires before the input's blur, so the value commits.
                    onMouseDown={(e) => {
                      e.preventDefault();
                      commit(String(p));
                    }}
                    className="block w-full px-3 py-1 text-right hover:bg-muted"
                  >
                    {p}
                    {suffix}
                  </button>
                </li>
              ))}
            </ul>,
            document.body
          )}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(String(value));
        setEditing(true);
      }}
      aria-label={`${ariaLabel} (click to edit)`}
      className="cursor-text font-mono text-muted-foreground text-xs underline decoration-dotted underline-offset-2 transition-colors hover:text-foreground"
    >
      {value}
      {suffix}
    </button>
  );
}
