import { CheckIcon, CopyIcon, XIcon } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("copied");
      toast.success("Copied to clipboard");
    } catch {
      setStatus("failed");
      toast.error("Copy failed");
    }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setStatus("idle"), 1500);
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
        "flex size-6 cursor-pointer items-center justify-center rounded text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
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
  );
}
