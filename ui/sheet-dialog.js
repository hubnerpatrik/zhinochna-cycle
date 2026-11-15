// Turns a native <dialog> into a phone bottom sheet: bottom-anchored, grabber, drag down to close.
// On wider screens the dialog keeps its normal centred look (the sheet styles only apply on phones).
import { PHONE_LAYOUT_QUERY } from '../core.js';
import { addSheetGrip, bindSheetDismiss } from './sheet.js';

export function makeSheetDialog(dialog, titleSelector) {
  if (!dialog) return;
  dialog.classList.add('sheet-dialog');
  addSheetGrip(dialog, titleSelector);
  bindSheetDismiss(dialog, {
    requestClose: () => dialog.close(),
    isOpen: () => dialog.open,
    isPhone: () => window.matchMedia(PHONE_LAYOUT_QUERY).matches,
    reducedMotion: () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  });
}
