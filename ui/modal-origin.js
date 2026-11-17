import { applyLayoutClass } from './layout-classes.js';

/**
 * Where a desktop dialog should grow from: the centre of the control that opened it, as an offset
 * from the dialog card's top-left corner. Null when nothing opened it (the card grows from its centre).
 */
export function modalOrigin({ trigger, card }) {
  if (!trigger || !card) return null;
  return {
    x: Math.round(trigger.left + trigger.width / 2 - card.left),
    y: Math.round(trigger.top + trigger.height / 2 - card.top),
  };
}

/** Marks the card so it scales up from the opening control instead of its centre (wide screens only). */
export function growFromTrigger(modal, trigger, { isPhone, reducedMotion }) {
  const card = modal.querySelector?.(':scope > .modal-card');
  if (!card) return;
  const origin = isPhone() || reducedMotion() || !trigger?.isConnected ? null
    : modalOrigin({ trigger: trigger.getBoundingClientRect(), card: { left: card.offsetLeft, top: card.offsetTop } });
  // Moving to the start state must not itself animate, so transitions are off while it is set.
  card.classList.add('origin-settling');
  card.classList.toggle('has-origin', Boolean(origin));
  if (origin) applyLayoutClass(card, 'modal-origin', { '--modal-origin-x': origin.x, '--modal-origin-y': origin.y });
  // Settle the style the card grows from before .show is added, so the transition starts there.
  void getComputedStyle(card).transform;
  card.classList.remove('origin-settling');
}
