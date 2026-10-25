import { t } from '../i18n.js';
import { setOverlayPosition } from './layout-classes.js';

const VIEWPORT_GAP = 8;
const EXPORT_FORMATS = [['pdf', 'PDF'], ['xlsx', 'Excel (.xlsx)'], ['json', 'JSON']];

export function exportMenuPosition(triggerBounds, menuSize, viewportSize) {
  const { width, height } = menuSize;
  return {
    left: Math.max(VIEWPORT_GAP, Math.min(triggerBounds.left, viewportSize.width - width - VIEWPORT_GAP)),
    top: Math.max(VIEWPORT_GAP, triggerBounds.bottom + height + VIEWPORT_GAP <= viewportSize.height
      ? triggerBounds.bottom + VIEWPORT_GAP : triggerBounds.top - height - VIEWPORT_GAP),
  };
}

let dismissActiveMenu = null;
export function closeExportMenu() { dismissActiveMenu?.(); }

export function openExportMenu(trigger, onExport) {
  const isAlreadyOpen = trigger.getAttribute('aria-expanded') === 'true';
  closeExportMenu();
  if (isAlreadyOpen) return;
  const menu = document.createElement('div');
  menu.className = 'map-export-popover';
  menu.setAttribute('popover', 'auto');
  menu.setAttribute('role', 'group');
  menu.setAttribute('aria-label', t('Export'));
  const positionMenu = () => {
    const viewport = document.documentElement;
    setOverlayPosition(menu, 'export-menu', exportMenuPosition(
      trigger.getBoundingClientRect(),
      { width: menu.offsetWidth, height: menu.offsetHeight },
      { width: viewport.clientWidth, height: viewport.clientHeight },
    ));
  };
  const dismiss = () => {
    window.removeEventListener('resize', positionMenu);
    window.removeEventListener('scroll', positionMenu, true);
    trigger.setAttribute('aria-expanded', 'false');
    trigger.removeAttribute('aria-controls');
    menu.remove();
    if (dismissActiveMenu === dismiss) dismissActiveMenu = null;
  };
  dismissActiveMenu = dismiss;
  menu.id = 'mapExportMenu';
  trigger.setAttribute('aria-controls', menu.id);
  trigger.setAttribute('aria-expanded', 'true');
  EXPORT_FORMATS.forEach(([format, label]) => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'btn secondary'; button.textContent = label;
    button.onclick = async () => {
      dismiss();
      trigger.disabled = true;
      try { await onExport(format); }
      finally { trigger.disabled = false; if (trigger.isConnected) trigger.focus(); }
    };
    menu.append(button);
  });
  menu.addEventListener('toggle', event => {
    if (event.newState === 'closed' && dismissActiveMenu === dismiss) { dismiss(); if (trigger.isConnected) trigger.focus(); }
  });
  document.body.append(menu);
  menu.showPopover();
  positionMenu();
  window.addEventListener('resize', positionMenu);
  window.addEventListener('scroll', positionMenu, true);
  menu.querySelector('button').focus();
}
