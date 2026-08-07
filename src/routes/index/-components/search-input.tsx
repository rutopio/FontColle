import {
  ArrowElbowDownLeftIcon,
  MagnifyingGlassIcon,
} from "@phosphor-icons/react";
import { useCallback, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 200;

export interface SearchSuggestion {
  id: string;
  name: string;
}

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
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);
  const listId = useId();

  const [prevQuery, setPrevQuery] = useState(query);
  if (query !== prevQuery) {
    setPrevQuery(query);
    setDraft(query);
  }

  useMountEffect(() => () => clearTimeout(debounceRef.current));

  const flush = useCallback(
    (value: string) => {
      clearTimeout(debounceRef.current);
      onQueryChange(value);
    },
    [onQueryChange]
  );

  const commit = (value: string) => {
    setDraft(value);
    setActive(-1);
    if (!composing.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => onQueryChange(value), DEBOUNCE_MS);
    }
  };

  const showList = open && draft.trim().length > 0 && suggestions.length > 0;
  const activeId = active >= 0 ? `${listId}-${active}` : undefined;

  const pick = (index: number) => {
    const hit = suggestions[index] ?? suggestions[0];
    if (hit) onPick(hit.id);
  };

  const enterTarget = active >= 0 ? active : 0;

  return (
    <div className="relative min-w-0 flex-1 bg-background md:w-(--panel-width) md:flex-none">
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
          flush(e.currentTarget.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            if (showList) {
              e.preventDefault();
              setOpen(false);
              return;
            }
            if (draft) {
              e.preventDefault();
              setDraft("");
              setActive(-1);
              flush("");
              e.currentTarget.blur();
            }
            return;
          }
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
          if (e.key === "Enter") {
            if (suggestions.length > 0) {
              e.preventDefault();
              pick(active);
              setOpen(false);
              return;
            }
            flush(draft);
          }
        }}
        placeholder="Search family or designer"
        aria-label="Search fonts by family or designer"
        className={cn("h-9 pl-8", !draft && "md:pr-8")}
      />
      {!draft && (
        <Kbd className="absolute top-1/2 right-2.5 hidden -translate-y-1/2 md:inline-flex">
          /
        </Kbd>
      )}
      {showList && (
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
                e.preventDefault();
                onPick(s.id);
                setOpen(false);
              }}
              onMouseEnter={() => setActive(i)}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5",
                i === active ? "bg-muted" : "hover:bg-muted/60"
              )}
            >
              <span className="min-w-0 flex-1 truncate">{s.name}</span>
              {i === enterTarget && (
                <Kbd aria-hidden="true" className="bg-background/80">
                  <ArrowElbowDownLeftIcon />
                </Kbd>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
