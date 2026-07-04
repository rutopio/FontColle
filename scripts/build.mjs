// Production build wrapper.
//
// `vite build` runs the full pipeline (client + SSR + TanStack Start prerender)
// but never exits: the @cloudflare/vite-plugin spins up a miniflare preview
// server whose bindings can leave the event loop alive after the build resolves.
// All artifacts are written by then, so we force a clean exit. (Same reason as
// TypeSpan's build wrapper — do not revert to plain `vite build`.)
process.env.NODE_ENV ??= "production";

const { createBuilder } = await import("vite");

const builder = await createBuilder();
await builder.buildApp();
process.exit(0);
