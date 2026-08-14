import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export function EditableValue({
  value,
  min,
  max,
  suffix,
  presets,
  defaultValue,
  onChange,
  ariaLabel,
}: {
  value: number;
  min: number;
  max: number;
  suffix?: string;
  presets?: number[];
  /** Marked in the preset menu as the value this control starts at. */
  defaultValue?: number;
  onChange: (v: number) => void;
  ariaLabel: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(
    null
  );

  const commit = (raw: string) => {
    const n = Number(raw);
    if (Number.isFinite(n) && raw.trim() !== "")
      onChange(Math.min(max, Math.max(min, n)));
    setEditing(false);
  };

  const options = (presets ?? []).filter((p) => p >= min && p <= max);

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
                    onMouseDown={(e) => {
                      e.preventDefault();
                      commit(String(p));
                    }}
                    className={cn(
                      "block w-full px-3 py-1 text-right hover:bg-muted",
                      p === defaultValue && "font-bold text-foreground"
                    )}
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
