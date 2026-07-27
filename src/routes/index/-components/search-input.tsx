import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

export interface SearchSuggestion {
  id: string;
  name: string;
}

// Local draft state plus an IME composition guard, so typing 注音/拼音
// assembles a character before it reaches the filter: committing every
// keystroke to the URL would interrupt composition.
//
// The field is also a combobox. The dropdown is a plain absolute panel, not a
// Popover, so focus never leaves the input, and the active row is tracked with
// aria-activedescendant for screen readers.
export function SearchInput({
  query,
  onQueryChange,
  suggestions,
  onPick,
  inputRef,
}: {
  query: string;
  onQueryChange: (query: string) => void;
  suggestions: SearchSuggestion[];
  onPick: (id: string) => void;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  const [draft, setDraft] = useState(query);
  const composing = useRef(false);
  // -1 is "none yet", where Enter falls back to the top match.
  const [active, setActive] = useState(-1);
  // Separate from "has suggestions", so tabbing away hides the panel even
  // mid-query. A row's click fires before blur, so the pick still lands.
  const [open, setOpen] = useState(false);
  const listId = useId();

  // Adopt outside changes (a reset) by comparing the last-seen prop during
  // render. Not a key-remount: our own commits round-trip through `query` too,
  // and remounting mid-typing would drop focus and break IME composition.
  const [prevQuery, setPrevQuery] = useState(query);
  if (query !== prevQuery) {
    setPrevQuery(query);
    setDraft(query);
  }

  const commit = (value: string) => {
    setDraft(value);
    setActive(-1);
    if (!composing.current) onQueryChange(value);
  };

  const showList = open && draft.trim().length > 0 && suggestions.length > 0;
  const activeId = active >= 0 ? `${listId}-${active}` : undefined;

  const pick = (index: number) => {
    const hit = suggestions[index] ?? suggestions[0];
    if (hit) onPick(hit.id);
  };

  return (
    <div className="relative min-w-0 flex-1 md:max-w-72 xl:max-w-96">
      <MagnifyingGlassIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        type="search"
        value={draft}
        role="combobox"
        aria-expanded={showList}
        aria-controls={showList ? listId : undefined}
        aria-activedescendant={showList ? activeId : undefined}
        aria-autocomplete="list"
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onChange={(e) => commit(e.target.value)}
        onCompositionStart={() => {
          composing.current = true;
        }}
        onCompositionEnd={(e) => {
          composing.current = false;
          onQueryChange(e.currentTarget.value);
        }}
        onKeyDown={(e) => {
          // Blur after clearing, so a second Escape isn't swallowed.
          if (e.key === "Escape") {
            if (showList) {
              e.preventDefault();
              setOpen(false);
              return;
            }
            if (draft) {
              e.preventDefault();
              commit("");
              e.currentTarget.blur();
            }
            return;
          }
          // Ignored mid-composition, so the IME keeps its own arrows.
          if (composing.current) return;
          if (showList && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
            e.preventDefault();
            const n = suggestions.length;
            setActive((i) => {
              const from = i < 0 ? (e.key === "ArrowDown" ? -1 : 0) : i;
              return e.key === "ArrowDown"
                ? (from + 1) % n
                : (from - 1 + n) % n;
            });
            return;
          }
          // Ignored mid-composition, so the IME's own Enter isn't hijacked.
          if (e.key === "Enter" && suggestions.length > 0) {
            e.preventDefault();
            pick(active);
            setOpen(false);
          }
        }}
        placeholder="Search family or designer"
        aria-label="Search fonts by family or designer"
        // pr-8 reserves room for the "/" badge, so it tracks the badge's own md
        // gate: below md there is no badge and the query gets the width back.
        className={cn("h-9 pl-8", !draft && "md:pr-8")}
      />
      {/* Advertises the "/"-to-focus shortcut. Hidden once the field has text,
          where it would crowd the query and the native clear button, and below
          md, which is the phone layout (same 768px cutoff as useIsMobile and
          the sidebar): there is no physical keyboard to press "/" on, so the
          hint is dead weight taking room from a narrow field. */}
      {!draft && (
        <Kbd className="absolute top-1/2 right-2.5 hidden -translate-y-1/2 md:inline-flex">
          /
        </Kbd>
      )}
      {/* Autocomplete panel. Absolutely positioned under the field so focus
          stays in the input (a Popover would move it). mousedown, not click, so
          the pick fires before the input's blur closes the list. */}
      {showList && (
        // div, not ul/li: the combobox pattern wants role=listbox/option, which
        // the a11y lint rejects on ul/li. Options are tabIndex=-1, focus
        // staying in the input.
        <div
          id={listId}
          role="listbox"
          aria-label="Matching fonts"
          className="absolute top-full right-0 left-0 z-50 mt-1.5 max-h-72 overflow-auto rounded-lg bg-popover p-1 text-sm shadow-md ring-1 ring-foreground/10"
        >
          {suggestions.map((s, i) => (
            <div
              key={s.id}
              id={`${listId}-${i}`}
              role="option"
              tabIndex={-1}
              aria-selected={i === active}
              onMouseDown={(e) => {
                // Keep focus in the input.
                e.preventDefault();
                onPick(s.id);
                setOpen(false);
              }}
              onMouseEnter={() => setActive(i)}
              className={cn(
                "cursor-pointer truncate rounded-md px-2.5 py-1.5",
                i === active ? "bg-muted" : "hover:bg-muted/60"
              )}
            >
              {s.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
