import { CheckIcon, CopyIcon, XIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { highlight } from "@/lib/code/highlight";
import { cn } from "@/lib/utils";

export function CodeBlock({
  code,
  lang,
  className,
}: {
  code: string;
  lang?: string;
  className?: string;
}) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (status === "idle") return;
    const t = setTimeout(() => setStatus("idle"), 1500);
    return () => clearTimeout(t);
  }, [status]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setStatus("copied");
      toast.success(lang ? `Copied ${lang} snippet` : "Copied to clipboard");
    } catch {
      setStatus("failed");
      toast.error("Copy failed");
    }
  };

  return (
    <div
      className={cn(
        "group/code overflow-hidden rounded-md border bg-muted/40",
        className
      )}
    >
      <div className="flex items-center justify-between border-b bg-muted/60 py-1 pr-1 pl-3">
        <span className="select-none font-mono text-3xs text-muted-foreground/70 uppercase tracking-wide">
          {lang}
        </span>
        <button
          type="button"
          onClick={copy}
          aria-label={
            status === "copied"
              ? "Copied"
              : status === "failed"
                ? "Copy failed"
                : "Copy code"
          }
          className="flex size-6 cursor-pointer items-center justify-center rounded text-muted-foreground opacity-0 outline-none transition-opacity hover:bg-accent hover:text-accent-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring group-hover/code:opacity-100"
        >
          {status === "copied" ? (
            <CheckIcon
              key="copied"
              className="size-3.5 animate-copy-pop text-emerald-500"
              weight="bold"
            />
          ) : status === "failed" ? (
            <XIcon
              key="failed"
              className="size-3.5 animate-copy-pop text-destructive"
              weight="bold"
            />
          ) : (
            <CopyIcon className="size-3.5" />
          )}
        </button>
      </div>
      <pre className="whitespace-pre-wrap break-all p-3 font-mono text-xs leading-relaxed">
        <code>
          {highlight(code, lang).map((tok, i) =>
            tok.cls ? (
              // biome-ignore lint/suspicious/noArrayIndexKey: stable token list
              <span key={i} className={`tok-${tok.cls}`}>
                {tok.text}
              </span>
            ) : (
              // biome-ignore lint/suspicious/noArrayIndexKey: stable token list
              <span key={i}>{tok.text}</span>
            )
          )}
        </code>
      </pre>
    </div>
  );
}
