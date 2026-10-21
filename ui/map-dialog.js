import { t, translateDOM } from '../i18n.js';
import { escapeHtml } from '../views/view-utils.js';

// Native dialogs keep focus within the decision and restore it to its opener.
export function openMapDialog({ title, body, submitLabel, onSubmit, onClose = () => {}, closeOnNavigation = false }) {
  const opener = document.activeElement;
  const dialog = document.createElement('dialog');
  dialog.className = 'map-dialog';
  dialog.setAttribute('aria-labelledby', 'mapDialogTitle');
  dialog.innerHTML = `<form><h2 id="mapDialogTitle">${escapeHtml(t(title))}</h2>${body}
    <div class="modal-actions"><button type="button" data-cancel>${escapeHtml(t('Cancel'))}</button>
    <button type="submit" class="btn primary">${escapeHtml(t(submitLabel))}</button></div></form>`;
  dialog.querySelector('[data-cancel]').onclick = () => dialog.close();
  dialog.querySelector('form').onsubmit = event => {
    event.preventDefault();
    onSubmit(dialog);
  };
  const dismissOnNavigation = () => { if (dialog.open) dialog.close(); };
  if (closeOnNavigation) {
    window.addEventListener('hashchange', dismissOnNavigation);
    window.addEventListener('popstate', dismissOnNavigation);
  }
  dialog.addEventListener('close', () => {
    if (closeOnNavigation) {
      window.removeEventListener('hashchange', dismissOnNavigation);
      window.removeEventListener('popstate', dismissOnNavigation);
    }
    dialog.remove(); onClose(); if (opener?.isConnected) opener.focus();
  }, { once: true });
  document.body.append(dialog);
  translateDOM(dialog);
  dialog.showModal();
  return dialog;
}
