import { setText } from '../i18n.js';
import { qs } from "../core.js";

const DEFAULT_MESSAGE_DURATION_MS = 2200;

let toastTimer = null;
let toastFrame = null;

/** Hides the current message immediately, including persistent tool hints. */
export function hideMessage() {
  const toast = qs("toast");
  if (!toast) return;

  clearTimeout(toastTimer);
  toastTimer = null;
  if (toastFrame !== null) cancelAnimationFrame(toastFrame);
  toastFrame = null;
  toast.classList.remove("show", "persistent-toast", "action-toast");
  toast.classList.add("hidden");
}

/** Shows a temporary message banner. Used for blocked actions and validation errors. */
export function showMessage(text, duration = DEFAULT_MESSAGE_DURATION_MS) {
  if (!String(text).trim()) { hideMessage(); return; }
  const toast = qs("toast");
  if (!toast) return;

  clearTimeout(toastTimer);
  if (toastFrame !== null) cancelAnimationFrame(toastFrame);
  setText(toast, text);
  toast.classList.remove("persistent-toast", "action-toast");
  toast.classList.remove("hidden");
  toastFrame = requestAnimationFrame(() => { toastFrame = null; toast.classList.add("show"); });

  if (duration != null) toastTimer = setTimeout(hideMessage, duration);
}
