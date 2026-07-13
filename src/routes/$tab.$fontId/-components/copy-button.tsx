import { CheckIcon, CopyIcon, XIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// A copy-to-clipboard button that flips to a green check for ~1.5s on success,
// or a red X for the same window if the clipboard write fails (insecure context
// / denied permission), rather than lying about success with a silent no-op.
export function CopyButton({
  text,
  label = "Copy",
  className,
}: {
  text: string;
  label?: string;
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
      await navigator.clipboard.writeText(text);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={
        status === "copied"
          ? "Copied"
          : status === "failed"
            ? "Copy failed"
            : label
      }
      className={cn(
        "flex size-6 cursor-pointer items-center justify-center rounded text-muted-foreground outline-none transition-colors hover:bg-black/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring dark:hover:bg-white/12",
        className
      )}
    >
      {status === "copied" ? (
        <CheckIcon className="size-3.5 text-emerald-500" weight="bold" />
      ) : status === "failed" ? (
        <XIcon className="size-3.5 text-red-500" weight="bold" />
      ) : (
        <CopyIcon className="size-3.5" />
      )}
    </button>
  );
}
