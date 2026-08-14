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
  buildFavoritesFile,
  type ImportMode,
  parseFavoritesFile,
  useFavorites,
} from "@/lib/fonts/favorites";
import { cn } from "@/lib/utils";

const TRIGGER =
  "flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-input border-dashed px-2.5 py-2 text-muted-foreground text-xs transition-colors hover:border-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 md:min-h-8 md:py-1";

function fileName(): string {
  const date = new Date().toISOString().slice(0, 10);
  return `font-fridge-favorites-${date}.json`;
}

function download(favorites: string[]) {
  const json = JSON.stringify(buildFavoritesFile(favorites), null, 2);
  const url = URL.createObjectURL(
    new Blob([json], { type: "application/json" })
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName();
  a.click();
  URL.revokeObjectURL(url);
}

export function FavoritesTransfer({ knownIds }: { knownIds: Set<string> }) {
  const { favorites, importFavorites, restore } = useFavorites();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ImportMode>("merge");

  const onExport = () => {
    download(favorites);
    toast.success("Favorites exported", {
      description: `${favorites.length} ${favorites.length === 1 ? "font" : "fonts"}`,
    });
  };

  const onFile = async (file: File) => {
    let incoming: string[] | null = null;
    try {
      incoming = parseFavoritesFile(JSON.parse(await file.text()));
    } catch {
      incoming = null;
    }
    if (!incoming) {
      toast.error("Could not import that file", {
        description: "Pick a favorites file exported from FontFridge.",
      });
      return;
    }
    const before = favorites;
    const { added, removed, skipped, total } = importFavorites(
      incoming,
      mode,
      knownIds
    );
    setOpen(false);
    const parts = [`${added} added`];
    if (removed > 0) parts.push(`${removed} removed`);
    if (skipped > 0) parts.push(`${skipped} no longer in the catalog`);
    toast.success(`${total} ${total === 1 ? "favorite" : "favorites"}`, {
      description: parts.join(", "),
      action: { label: "Undo", onClick: () => restore(before) },
    });
  };

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <button
        type="button"
        onClick={onExport}
        disabled={favorites.length === 0}
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
            <PopoverTitle>Import favorites</PopoverTitle>
            <PopoverDescription>
              Reads a favorites file exported from FontFridge. Fonts no longer
              in the catalog are skipped.
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
              <span className="text-foreground">
                Replace existing favorites
              </span>
              <span className="text-muted-foreground">
                {mode === "replace"
                  ? `Discards your current ${favorites.length} ${favorites.length === 1 ? "favorite" : "favorites"}.`
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
