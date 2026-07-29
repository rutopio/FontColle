import { CheckIcon, CopyIcon, XIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Flips to a red X when the clipboard write fails (insecure context, denied
// permission) rather than lying about success with a silent no-op.
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
      toast.success("Copied to clipboard");
    } catch {
      setStatus("failed");
      toast.error("Copy failed");
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
        "flex size-6 cursor-pointer items-center justify-center rounded text-muted-foreground outline-none transition-colors hover:bg-black/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring dark:hover:bg-white/12",
        className
      )}
    >
      {/* Keyed on status so the check/x remounts and replays the pop; the idle
          copy icon stays still (no key/animation) so it doesn't pop on reset. */}
      {status === "copied" ? (
        <CheckIcon
          key="copied"
          className="size-3.5 animate-copy-pop text-emerald-500"
          weight="bold"
        />
      ) : status === "failed" ? (
        <XIcon
          key="failed"
          className="size-3.5 animate-copy-pop text-red-500"
          weight="bold"
        />
      ) : (
        <CopyIcon className="size-3.5" />
      )}
    </button>
  );
}
