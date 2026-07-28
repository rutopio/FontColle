// Runs a history.back() inside a View Transition, so leaving the detail page
// crossfades the way arriving at it does.
//
// The router applies this itself for Link and navigate() when they carry
// `viewTransition`, but back() goes straight to the History API and never
// reaches that wrapper.
//
// The await matters: back() only *schedules* the navigation, so a callback
// that returned immediately would let the browser snapshot the old DOM as both
// the "old" and "new" state and animate nothing. Resolving on popstate holds
// the transition open until the new route has actually rendered. The timeout is
// the escape hatch for the case where no popstate arrives (a blocked or
// cancelled navigation), so the promise can never strand the transition.
//
// Feature-detected the same way router-core does it: browsers without the API
// just run `back` and get the plain swap, so nothing here is load-bearing.
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
      // popstate fires when history changes, before React has re-rendered the
      // new route. Resolving there would snapshot the old DOM as the "new"
      // state, so hand back a frame first and let the commit land.
      const onPop = () =>
        requestAnimationFrame(() => requestAnimationFrame(done));
      window.addEventListener("popstate", onPop, { once: true });
      timer = setTimeout(done, POPSTATE_TIMEOUT_MS);
    });
  });
}
