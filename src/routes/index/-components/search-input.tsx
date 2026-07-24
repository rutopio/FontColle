import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

// Local draft state + IME composition guard so typing 注音/拼音 assembles a
// character before it reaches the filter. Committing every keystroke to the URL
// interrupts composition; we only commit once the IME finishes (or on plain
// input for non-IME text).
export function SearchInput({
  query,
  onQueryChange,
  inputRef,
}: {
  query: string;
  onQueryChange: (query: string) => void;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  const [draft, setDraft] = useState(query);
  const composing = useRef(false);

  // Keep the draft in sync when the query changes from outside (e.g. reset),
  // by comparing against the last-seen prop during render. Not a key-remount:
  // our own commits also round-trip through `query`, and remounting mid-typing
  // would drop focus and break IME composition.
  const [prevQuery, setPrevQuery] = useState(query);
  if (query !== prevQuery) {
    setPrevQuery(query);
    setDraft(query);
  }

  const commit = (value: string) => {
    setDraft(value);
    if (!composing.current) onQueryChange(value);
  };

  return (
    <div className="relative min-w-0 flex-1 md:max-w-72 xl:max-w-96">
      <MagnifyingGlassIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        type="search"
        value={draft}
        onChange={(e) => commit(e.target.value)}
        onCompositionStart={() => {
          composing.current = true;
        }}
        onCompositionEnd={(e) => {
          composing.current = false;
          onQueryChange(e.currentTarget.value);
        }}
        onKeyDown={(e) => {
          // Escape clears the search (matching the "/"-to-focus shortcut), then
          // blurs so a second Escape isn't swallowed.
          if (e.key === "Escape" && draft) {
            e.preventDefault();
            commit("");
            e.currentTarget.blur();
          }
        }}
        placeholder="Search family or designer"
        aria-label="Search fonts by family or designer"
        // pr-8 only reserves room for the "/" badge, so it tracks the badge's
        // own md gate: below md there is no badge and the query gets the full
        // width back.
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
    </div>
  );
}
