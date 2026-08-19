import { DownloadSimpleIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { buildFontsCsv, csvFileName } from "@/lib/fonts/export-csv";
import type { FontRecord } from "@/lib/fonts/types";

export function ExportResultsButton({ fonts }: { fonts: FontRecord[] }) {
  const onExport = () => {
    if (fonts.length === 0) return;
    const url = URL.createObjectURL(
      new Blob([buildFontsCsv(fonts)], { type: "text/csv;charset=utf-8" })
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = csvFileName();
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Results exported", {
      description: `${fonts.length} ${fonts.length === 1 ? "font" : "fonts"} as CSV`,
    });
  };

  return (
    <button
      type="button"
      onClick={onExport}
      className="flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-input border-dashed px-2.5 py-2 text-muted-foreground text-xs transition-colors hover:border-foreground hover:text-foreground md:min-h-8 md:py-1"
    >
      <DownloadSimpleIcon className="size-3.5 shrink-0" />
      Export Results
    </button>
  );
}
