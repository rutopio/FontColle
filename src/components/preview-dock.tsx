import { XIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePreview } from "@/lib/preview/context";

// The shared preview-text field: type here to preview the string across every
// font. The Column footer bar supplies the chrome, so the field itself is
// borderless and fills its container.
function PreviewField() {
  const { text, setText } = usePreview();
  return (
    <>
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type to preview across all fonts…"
        className="h-9 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0"
        aria-label="Preview text"
      />
      {text && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setText("")}
          aria-label="Clear preview text"
          className="shrink-0 rounded-full text-muted-foreground"
        >
          <XIcon className="size-4" />
        </Button>
      )}
    </>
  );
}

// Full-width preview field for a page's bottom bar (Column footer): the whole
// bar is the input. Both the list and the detail page mount one, so the shared
// preview text stays reachable while scrolling on either.
export function PreviewBar() {
  return (
    <div className="flex flex-1 items-center gap-2">
      <PreviewField />
    </div>
  );
}
