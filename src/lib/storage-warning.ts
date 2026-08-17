import { toast } from "sonner";

/**
 * Favorites, presets and the preview settings all live in localStorage, and a
 * write there can fail for reasons the user never sees: private browsing, a
 * full quota, or storage blocked by the browser. Swallowing it silently means
 * the UI confirms the change and the next reload throws it away — so tell the
 * user once that nothing is being kept.
 *
 * One shared id, and a module-level latch so a burst of failing writes (every
 * favorite toggle, every slider drag) cannot stack or re-fire the toast.
 */
let warned = false;

export function warnStorageUnavailable() {
  if (warned) return;
  warned = true;
  toast.error("Changes won't be saved on this device", {
    description:
      "Private browsing or full storage — favorites, presets and preview settings are lost when you reload.",
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
