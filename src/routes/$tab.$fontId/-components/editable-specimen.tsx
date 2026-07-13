import { type CSSProperties, useState } from "react";

// A specimen line that doubles as a text field. Idle it's a button showing the
// current text; clicking swaps in an input/textarea seeded with that text and
// pushes every keystroke (trimmed) to `onEditText`, so all specimen surfaces
// update live. Escape closes the editor. In the single-line input plain Enter
// commits; in the multiline textarea Enter keeps inserting newlines, so
// Cmd/Ctrl+Enter commits instead (blur also exits either way).
//
// `multiline` picks a textarea (the type tester, which wraps) over an input
// (instance rows, one line). `buttonClassName` / `fieldClassName` let each
// caller keep its own sizing and underline treatment.
export function EditableSpecimen({
  text,
  style,
  onEditText,
  ariaLabel,
  multiline = false,
  buttonClassName,
  fieldClassName,
}: {
  text: string;
  style: CSSProperties;
  onEditText: (value: string) => void;
  ariaLabel: string;
  multiline?: boolean;
  buttonClassName: string;
  fieldClassName: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  if (editing) {
    const shared = {
      dir: "auto" as const,
      value: draft,
      "aria-label": ariaLabel,
      autoFocus: true,
      onChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
      ) => {
        setDraft(e.target.value);
        onEditText(e.target.value.trim());
      },
      onBlur: () => setEditing(false),
      style,
      className: fieldClassName,
    };
    return multiline ? (
      <textarea
        {...shared}
        rows={1}
        onKeyDown={(e) => {
          if (e.key === "Escape") setEditing(false);
          // Enter still inserts a newline; Cmd/Ctrl+Enter commits (exits edit).
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            setEditing(false);
          }
        }}
      />
    ) : (
      <input
        {...shared}
        type="text"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === "Escape") setEditing(false);
        }}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(text);
        setEditing(true);
      }}
      aria-label={ariaLabel}
      dir="auto"
      style={style}
      className={buttonClassName}
    >
      {text}
    </button>
  );
}
