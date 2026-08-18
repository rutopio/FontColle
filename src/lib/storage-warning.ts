import { toast } from "sonner";

// Warn once when localStorage writes fail (private browsing / full quota).
let warned = false;

function warnStorageUnavailable() {
  if (warned) return;
  warned = true;
  toast.error("Changes won't be saved on this device", {
    description:
      "Private browsing or full storage. Favorites, presets, and preview settings are lost when you reload.",
    id: "storage-unavailable",
    duration: 8000,
  });
}

/** Runs a localStorage write, warning once if the browser refuses it. */
export function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    warnStorageUnavailable();
  }
}
