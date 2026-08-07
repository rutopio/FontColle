const POPSTATE_TIMEOUT_MS = 300;

export function backWithViewTransition(back: () => void): void {
  if (
    typeof document === "undefined" ||
    !("startViewTransition" in document) ||
    typeof document.startViewTransition !== "function"
  ) {
    back();
    return;
  }

  document.startViewTransition(() => {
    back();
    return new Promise<void>((resolve) => {
      let timer: ReturnType<typeof setTimeout>;
      const done = () => {
        window.removeEventListener("popstate", onPop);
        clearTimeout(timer);
        resolve();
      };
      const onPop = () =>
        requestAnimationFrame(() => requestAnimationFrame(done));
      window.addEventListener("popstate", onPop, { once: true });
      timer = setTimeout(done, POPSTATE_TIMEOUT_MS);
    });
  });
}
