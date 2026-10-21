import { t } from '../i18n.js';

let active = null;
export function closeExportMenu() { active?.(); }

export function openExportMenu(trigger, onExport) {
  const same = trigger.getAttribute('aria-expanded') === 'true';
  closeExportMenu();
  if (same) return;
  const menu = document.createElement('div');
  menu.className = 'map-export-popover';
  menu.setAttribute('popover', 'auto');
  menu.setAttribute('role', 'group');
  menu.setAttribute('aria-label', t('Export'));
  const place = () => {
    const rect = trigger.getBoundingClientRect();
    const width = menu.offsetWidth, height = menu.offsetHeight;
    const viewport = document.documentElement;
    menu.style.left = `${Math.max(8, Math.min(rect.left, viewport.clientWidth - width - 8))}px`;
    menu.style.top = `${Math.max(8, rect.bottom + height + 8 <= viewport.clientHeight ? rect.bottom + 8 : rect.top - height - 8)}px`;
  };
  const dismiss = () => {
    window.removeEventListener('resize', place);
    window.removeEventListener('scroll', place, true);
    trigger.setAttribute('aria-expanded', 'false');
    trigger.removeAttribute('aria-controls');
    menu.remove();
    if (active === dismiss) active = null;
  };
  active = dismiss;
  menu.id = 'mapExportMenu';
  trigger.setAttribute('aria-controls', menu.id);
  trigger.setAttribute('aria-expanded', 'true');
  for (const [format, label] of [['pdf', 'PDF'], ['xlsx', 'Excel (.xlsx)'], ['json', 'JSON']]) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'btn secondary'; button.textContent = label;
    button.onclick = async () => {
      dismiss();
      trigger.disabled = true;
      try { await onExport(format); }
      finally { trigger.disabled = false; if (trigger.isConnected) trigger.focus(); }
    };
    menu.append(button);
  }
  menu.addEventListener('toggle', event => {
    if (event.newState === 'closed' && active === dismiss) { dismiss(); if (trigger.isConnected) trigger.focus(); }
  });
  document.body.append(menu);
  menu.showPopover();
  place();
  window.addEventListener('resize', place);
  window.addEventListener('scroll', place, true);
  menu.querySelector('button').focus();
}
