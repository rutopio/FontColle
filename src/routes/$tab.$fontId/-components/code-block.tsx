import { CheckIcon, CopyIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// A copyable code snippet for the Use tab. Renders the code monospace with a
// hovering copy button that flips to a check for ~1.5s after a successful copy.
// `lang` is a faint corner label (e.g. "html", "css", "bash") so the reader can
// tell what each block is at a glance.
export function CodeBlock({
  code,
  lang,
  className,
}: {
  code: string;
  lang?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  // Reset the copied state so a second copy re-triggers the check flash.
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      // Clipboard may be unavailable (insecure context / denied permission);
      // leave the button in its idle state rather than lying about success.
    }
  };

  return (
    <div
      className={cn(
        "group/code overflow-hidden rounded-md border bg-muted/40",
        className
      )}
    >
      {/* First row: the language label in small caps, with the copy button
          tucked to its right. A hairline separates it from the code below. */}
      <div className="flex items-center justify-between border-b bg-muted/60 py-1 pr-1 pl-3">
        <span className="select-none font-mono text-[10px] text-muted-foreground/70 uppercase tracking-wide">
          {lang}
        </span>
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? "Copied" : "Copy code"}
          className="flex size-6 cursor-pointer items-center justify-center rounded text-muted-foreground opacity-0 outline-none transition-opacity hover:bg-black/10 hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-sidebar-ring group-hover/code:opacity-100 dark:hover:bg-white/12"
        >
          {copied ? (
            <CheckIcon className="size-3.5 text-emerald-500" weight="bold" />
          ) : (
            <CopyIcon className="size-3.5" />
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}
