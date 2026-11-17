// Screens that are replaced outright. A dialog over a page (create-map) and the first-run
// profile setup are not "moving" between screens, so they never animate.
const PLAIN_SCREENS = new Set(['menu', 'my-profile', 'my-maps', 'active-map']);

// Left to right, as the tabs are laid out: Home, Active Map, Maps, Profile.
const SCREEN_ORDER = ['menu', 'active-map', 'my-maps', 'my-profile'];

/** 1 when `to` is further right in the tab bar than `from` (forward), -1 for back, 0 for the same screen. */
export function screenDirection(from, to) {
  return Math.sign(SCREEN_ORDER.indexOf(to) - SCREEN_ORDER.indexOf(from));
}

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
  // The stylesheet slides the old screen out and the new one in according to this class.
  const marker = doc.documentElement?.classList;
  const classes = screenDirection(from, to) > 0 ? 'screen-forward' : 'screen-back';
  marker?.add(classes);
  const clear = () => marker?.remove('screen-forward', 'screen-back');
  const transition = doc.startViewTransition(() => { clearTimeout(stalled); once(); });
  Promise.resolve(transition.finished).then(clear, clear);
  // A skipped transition (hidden tab, newer navigation) still ran the update; only a real error matters.
  transition.ready?.catch?.(() => {});
  transition.finished?.catch?.(() => {});
  transition.updateCallbackDone?.catch?.(reportError);
}
