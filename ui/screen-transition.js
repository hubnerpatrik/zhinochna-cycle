// Screens that are replaced outright. A dialog over a page (create-map) and the first-run
// profile setup are not "moving" between screens, so they never animate.
const PLAIN_SCREENS = new Set(['menu', 'my-profile', 'my-maps', 'active-map']);

// The browser runs the update only after it paints the old screen. If no frame comes
// (background tab, frozen page) the new screen must still appear.
const STALL_MS = 250;

const surface = error => queueMicrotask(() => { throw error; });

// Runs `update` (which swaps the screen) inside a View Transition when the browser supports it
// and the person has not asked for less motion. Otherwise it runs at once, as before.
export function changeScreen({
  from, to, update, doc = document, reducedMotion = () => false, reportError = surface, stallMs = STALL_MS,
}) {
  const animate = from !== to && PLAIN_SCREENS.has(from) && PLAIN_SCREENS.has(to)
    && typeof doc.startViewTransition === 'function' && !reducedMotion();
  if (!animate) { update(); return; }
  let ran = false;
  const once = () => { if (ran) return; ran = true; update(); };
  const stalled = setTimeout(() => { try { once(); } catch (error) { reportError(error); } }, stallMs);
  const transition = doc.startViewTransition(() => { clearTimeout(stalled); once(); });
  // A skipped transition (hidden tab, newer navigation) still ran the update; only a real error matters.
  transition.ready?.catch?.(() => {});
  transition.finished?.catch?.(() => {});
  transition.updateCallbackDone?.catch?.(reportError);
}
