import { DownloadSimpleIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  buildPresetsFile,
  type FilterPreset,
  type ImportMode,
  MAX_PRESETS,
  parsePresetsFile,
  usePresets,
} from "@/lib/fonts/presets";
import { cn } from "@/lib/utils";

const TRIGGER =
  "flex min-h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-input border-dashed px-2.5 py-2 text-muted-foreground text-xs transition-colors hover:border-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 md:min-h-8 md:py-1";

function download(presets: FilterPreset[]) {
  const json = JSON.stringify(buildPresetsFile(presets), null, 2);
  const url = URL.createObjectURL(
    new Blob([json], { type: "application/json" })
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `font-fridge-presets-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

export function PresetsTransfer() {
  const { presets, importPresets, restoreAll } = usePresets();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ImportMode>("merge");

  const onExport = () => {
    download(presets);
    toast.success("Presets exported", {
      description: plural(presets.length, "preset", "presets"),
    });
  };

  const onFile = async (file: File) => {
    let incoming: FilterPreset[] | null = null;
    try {
      incoming = parsePresetsFile(JSON.parse(await file.text()));
    } catch {
      incoming = null;
    }
    if (!incoming) {
      toast.error("Could not import that file", {
        description: "Pick a presets file exported from FontFridge.",
      });
      return;
    }
    const before = presets;
    const { added, removed, duplicate, dropped, total } = importPresets(
      incoming,
      mode
    );
    setOpen(false);
    const parts = [`${added} added`];
    if (removed > 0) parts.push(`${removed} removed`);
    if (duplicate > 0) parts.push(`${duplicate} already saved`);
    if (dropped > 0) parts.push(`${dropped} over the ${MAX_PRESETS} limit`);
    toast.success(plural(total, "preset", "presets"), {
      description: parts.join(", "),
      action: { label: "Undo", onClick: () => restoreAll(before) },
    });
  };

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={onExport}
        disabled={presets.length === 0}
        className={TRIGGER}
      >
        <DownloadSimpleIcon className="size-3.5 shrink-0" />
        Export
      </button>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger className={TRIGGER}>
          <UploadSimpleIcon className="size-3.5 shrink-0" />
          Import
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64">
          <PopoverHeader>
            <PopoverTitle>Import presets</PopoverTitle>
            <PopoverDescription>
              Reads a presets file exported from FontFridge. Presets you already
              have are skipped, and at most {MAX_PRESETS} are kept.
            </PopoverDescription>
          </PopoverHeader>

          <label className="flex cursor-pointer items-start gap-2 text-xs">
            <input
              type="checkbox"
              checked={mode === "replace"}
              onChange={(e) => setMode(e.target.checked ? "replace" : "merge")}
              className="mt-0.5 size-3.5 shrink-0 accent-primary"
            />
            <span className="flex flex-col gap-0.5">
              <span className="text-foreground">Replace existing presets</span>
              <span className="text-muted-foreground">
                {mode === "replace"
                  ? `Discards your current ${plural(presets.length, "preset", "presets")}.`
                  : "Off: the file is merged into what you already have."}
              </span>
            </span>
          </label>

          <input
            ref={inputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void onFile(file);
            }}
          />
          <div className="flex justify-end gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              type="button"
              onClick={() => inputRef.current?.click()}
              className={cn(mode === "replace" && "bg-destructive/80")}
            >
              Choose file
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
