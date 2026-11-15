import { setText } from '../i18n.js';
import { getElementById } from "../core.js";

const DEFAULT_MESSAGE_DURATION_MS = 2200;
const ACTION_MESSAGE_DURATION_MS = 10000; // long enough to notice and change your mind

let toastTimer = null;
let toastFrame = null;

/** Hides the current message immediately, including persistent tool hints. */
export function hideMessage() {
  const toast = getElementById("toast");
  if (!toast) return;

  clearTimeout(toastTimer);
  toastTimer = null;
  if (toastFrame !== null) cancelAnimationFrame(toastFrame);
  toastFrame = null;
  toast.classList.remove("show", "persistent-toast", "action-toast", "toast-inline");
  toast.classList.add("hidden");
}

/** Shows a temporary message banner. Used for blocked actions and validation errors. */
export function showMessage(text, duration = DEFAULT_MESSAGE_DURATION_MS) {
  if (!String(text).trim()) { hideMessage(); return; }
  const toast = getElementById("toast");
  if (!toast) return;

  clearTimeout(toastTimer);
  if (toastFrame !== null) cancelAnimationFrame(toastFrame);
  setText(toast, text);
  toast.classList.remove("persistent-toast", "action-toast", "toast-inline");
  toast.classList.remove("hidden");
  toastFrame = requestAnimationFrame(() => { toastFrame = null; toast.classList.add("show"); });

  if (duration != null) toastTimer = setTimeout(hideMessage, duration);
}

/** Shows a message with one button (for example Undo). Running the action closes the message. */
export function showActionMessage(text, { label, onAction, duration = ACTION_MESSAGE_DURATION_MS }) {
  const toast = getElementById("toast");
  if (!toast) return;

  clearTimeout(toastTimer);
  if (toastFrame !== null) cancelAnimationFrame(toastFrame);
  const message = document.createElement('span');
  setText(message, text);
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'toast-action toast-action-primary';
  setText(button, label);
  button.addEventListener('click', () => { hideMessage(); onAction(); });
  // A previous plain message left its own key on the toast; translating the page again would overwrite the children with it.
  toast.removeAttribute?.('data-i18n');
  toast.replaceChildren(message, button);
  toast.classList.remove("persistent-toast");
  toast.classList.add("action-toast", "toast-inline"); // one short message and one button fit on one row
  toast.classList.remove("hidden");
  toastFrame = requestAnimationFrame(() => { toastFrame = null; toast.classList.add("show"); });
  toastTimer = setTimeout(hideMessage, duration);
}
