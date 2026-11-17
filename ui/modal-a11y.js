// Dialog semantics, focus handling and Escape for the observation editors (div.modal sheets).

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

/** Index Tab/Shift+Tab should move focus to, or null when the browser's own move stays inside the editor. */
export function trapFocusIndex(count, index, shift) {
  if (count === 0) return null;
  if (index === -1) return shift ? count - 1 : 0;
  if (!shift && index === count - 1) return 0;
  if (shift && index === 0) return count - 1;
  return null;
}

/** Names the editor after its heading and makes everything behind it inert. */
export function markModalOpen(modal, page) {
  const heading = modal.querySelector?.("h2");
  modal.setAttribute?.("role", "dialog");
  modal.setAttribute?.("aria-modal", "true");
  if (heading) {
    heading.id ||= `${modal.id}Title`;
    modal.setAttribute?.("aria-labelledby", heading.id);
  }
  page?.setAttribute?.("inert", "");
}

export function markModalClosed(page) {
  page?.removeAttribute?.("inert");
}

let returnFocusTo = null;

export function rememberFocus() {
  const active = globalThis.document?.activeElement;
  if (returnFocusTo) return;
  if (active && active !== globalThis.document.body) returnFocusTo = active;
}

/** The control that had focus when the editor opened, if any. */
export const openingControl = () => returnFocusTo;

/** Puts focus inside the editor so keyboard and screen-reader users land in it. */
export function focusModal(modal) {
  const card = modal.querySelector?.(":scope > .modal-card");
  if (!card) return;
  card.tabIndex = -1;
  card.focus?.({ preventScroll: true });
}

export function restoreFocus() {
  const target = returnFocusTo;
  returnFocusTo = null;
  if (target?.isConnected) target.focus?.({ preventScroll: true });
}

/** One listener for all editors: Escape closes the open one, Tab stays inside it. */
let keyboardInstalled = false;
export function installModalKeyboard(doc = globalThis.document) {
  if (keyboardInstalled) return;
  keyboardInstalled = true;
  doc.addEventListener("keydown", event => {
    const open = doc.querySelector(".modal.show");
    if (!open || event.defaultPrevented) return;
    if (event.key === "Escape") {
      event.preventDefault();
      // The same path as tapping the backdrop, so each editor runs its own close handler.
      open.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      return;
    }
    if (event.key !== "Tab") return;
    const items = [...open.querySelectorAll(FOCUSABLE)].filter(item => item.offsetParent !== null);
    const target = trapFocusIndex(items.length, items.indexOf(doc.activeElement), event.shiftKey);
    if (target == null) return;
    event.preventDefault();
    items[target].focus();
  });
}
