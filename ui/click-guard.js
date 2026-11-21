// A pointer already applied its change to a day; the click that browsers send after it must not apply
// it a second time. Touch clicks can come late and with any `detail`, so this matches by day and time
// instead of relying on either. A click with no preceding pointer action (the keyboard) always passes.
const WINDOW_MS = 800;

export function createClickGuard({ now = () => performance.now() } = {}) {
  let handled = null;
  return {
    handledByPointer(key) { handled = { key, at: now() }; },
    shouldIgnoreClick(key) {
      const recent = handled && handled.key === key && now() - handled.at < WINDOW_MS;
      handled = null;
      return Boolean(recent);
    },
  };
}
