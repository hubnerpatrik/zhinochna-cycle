import { t } from '../i18n.js';
import { setOverlayPosition } from './layout-classes.js';
import { MAX_SELECTOR_LENGTH, MAX_LABEL_LENGTH } from '../feedback-model.js';
import { createFeedbackRequest } from '../feedback-transport.js';
import { feedbackPanelHtml } from './feedback-view.js';
import metadata from '../package.json';
import { prepareFeedbackImage } from '../feedback-image.js';

let conceal = () => {};
export const concealFeedback = () => conceal();

// Anchors describe controls, never field values or selected health observations.
export function feedbackSelector(element) {
  const parts = [];
  for (let node = element; node && node !== document.body; node = node.parentElement) {
    if (node.id) { parts.unshift(`#${CSS.escape(node.id)}`); break; }
    const index = [...node.parentElement.children].indexOf(node) + 1;
    parts.unshift(`${node.tagName.toLowerCase()}:nth-child(${index})`);
  }
  return parts.join(' > ').slice(0, MAX_SELECTOR_LENGTH);
}

export function setupFeedback({ auth, app, transport, description }) {
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'feedback-launch btn';
  button.innerHTML = '<span aria-hidden="true">🐞</span> <span data-i18n>Feedback</span>';
  button.setAttribute('aria-label', t('Report a bug'));
  app.append(button);
  const panel = document.createElement('dialog');
  panel.className = 'feedback-panel';
  panel.setAttribute('aria-labelledby', 'feedbackTitle');
  app.append(panel);
  const hint = document.createElement('div');
  hint.className = 'feedback-pick-hint'; hint.hidden = true; hint.setAttribute('role', 'status');
  hint.textContent = t('Tap the problem area. Use × or Escape to cancel.');
  app.append(hint);
  const pins = document.createElement('div'); pins.className = 'feedback-pins'; app.append(pins);
  // Escape the app's stacking context so CSS modal backdrops cannot cover us.
  // Native modal dialogs additionally make outside controls inert, so place
  // reporting controls inside those dialogs without closing their drafts.
  function placeControls() {
    const dialogs = [...document.querySelectorAll('dialog[open]')].filter(dialog => dialog !== panel);
    const host = dialogs.at(-1) || document.body;
    [button, hint, pins].forEach(control => {
      if (control.parentElement !== host) host.append(control);
    });
  }
  new MutationObserver(placeControls).observe(document.body, {
    childList: true, subtree: true, attributes: true, attributeFilter: ['open'],
  });
  placeControls();
  let threads = [], admin = false, picking = false, draft = null, selected = null, busy = false, filter = 'open';
  let draftText = '', replyText = '', replyId = null, error = '', loading = false, generation = 0;
  let draftImage = '', replyImage = '', imageLoading = false, imageGeneration = 0;
  const request = createFeedbackRequest(auth, transport);
  const screen = () => location.hash.split('?')[0] || '#/menu';
  function cancelPick() {
    picking = false; hint.hidden = true; document.body.classList.remove('feedback-picking');
    button.querySelector('span').textContent = '🐞'; button.setAttribute('aria-label', t('Report a bug'));
  }
  function open() { if (!panel.open) panel.showModal(); render(); }
  function close() { panel.close(); button.focus(); }
  function showThread(threadId) {
    selected = threadId;
    replyText = '';
    replyId = null;
    replyImage = '';
    imageGeneration++;
    imageLoading = false;
    render();
  }
  conceal = () => {
    generation++; cancelPick(); panel.close(); pins.replaceChildren();
    threads = []; admin = false; selected = null; panel.replaceChildren();
    draft = null; draftText = ''; replyText = ''; draftImage = ''; replyImage = ''; imageGeneration++; imageLoading = false;
  };
  async function refresh() {
    if (loading || busy) return;
    loading = true; error = ''; threads = []; admin = false; pins.replaceChildren(); render();
    const epoch = generation;
    try {
      const result = await request('GET');
      if (epoch !== generation) return;
      threads = result.threads; admin = result.admin === true;
    } catch { if (epoch === generation) error = t('Feedback could not be loaded. Try again.'); }
    finally { loading = false; if (epoch === generation) { render(); positionPins(); } }
  }
  async function save(input) {
    if (busy) return;
    busy = true; error = ''; render();
    const epoch = generation;
    try {
      const result = await request('POST', input);
      if (epoch !== generation) return;
      threads = [result.thread, ...threads.filter(item => item.id !== result.thread.id)];
      selected = result.thread.id; draft = null; draftText = ''; replyText = ''; replyId = null;
      draftImage = ''; replyImage = ''; imageGeneration++;
    } catch { if (epoch === generation) error = t('Not sent. Your text is kept here; check your connection and retry.'); }
    finally { busy = false; if (epoch === generation) { render(); positionPins(); } }
  }
  function render() {
    if (!panel.open) return;
    const thread = threads.find(item => item.id === selected);
    const shown = threads.filter(item => filter === 'all' || (filter === 'resolved' ? item.resolved : !item.resolved));
    panel.innerHTML = feedbackPanelHtml({
      description, admin, busy, loading, error, draft, draftText, draftImage,
      thread, replyText, replyImage, imageLoading, shown,
    });
    bindPanelEvents(thread);
  }

  function bindPanelEvents(thread) {
    panel.querySelector('[data-close]').onclick = close;
    panel.querySelector('[data-refresh]').onclick = refresh;
    panel.querySelector('[data-new]').onclick = () => {
      imageGeneration++; imageLoading = false;
      panel.close(); picking = true; hint.hidden = false; document.body.classList.add('feedback-picking');
      button.querySelector('span').textContent = '×'; button.setAttribute('aria-label', t('Cancel'));
    };
    panel.querySelector('[data-discard]')?.addEventListener('click', () => { draft = null; draftText = ''; draftImage = ''; imageGeneration++; imageLoading = false; render(); });
    panel.querySelector('[data-back]')?.addEventListener('click', () => showThread(null));
    const compose = panel.querySelector('[data-compose]');
    compose?.querySelector('textarea').addEventListener('input', event => { draftText = event.target.value; draft.id = crypto.randomUUID(); });
    compose?.addEventListener('submit', event => { event.preventDefault(); if (!imageLoading && draftText.trim()) void save({ ...draft, text: draftText, ...(draftImage ? { image: draftImage } : {}) }); });
    const reply = panel.querySelector('[data-reply]');
    reply?.querySelector('textarea').addEventListener('input', event => { replyText = event.target.value; replyId = null; });
    reply?.addEventListener('submit', event => {
      event.preventDefault(); if (imageLoading || !replyText.trim()) return;
      replyId ||= crypto.randomUUID(); void save({ action: 'reply', id: selected, messageId: replyId, text: replyText, ...(replyImage ? { image: replyImage } : {}) });
    });
    panel.querySelector('[data-image]')?.addEventListener('change', async event => {
      const file = event.target.files[0]; if (!file) return;
      const epoch = ++imageGeneration; const composing = Boolean(draft);
      imageLoading = true; error = ''; render();
      try {
        const image = await prepareFeedbackImage(file);
        if (epoch !== imageGeneration) return;
        if (composing) { draftImage = image; draft.id = crypto.randomUUID(); }
        else { replyImage = image; replyId = null; }
      } catch (err) { if (epoch === imageGeneration) error = t(err.message); }
      finally { if (epoch === imageGeneration) { imageLoading = false; render(); } }
    });
    panel.querySelector('[data-remove-image]')?.addEventListener('click', () => {
      if (draft) { draftImage = ''; draft.id = crypto.randomUUID(); }
      else { replyImage = ''; replyId = null; }
      render();
    });
    panel.querySelector('[data-resolve]')?.addEventListener('click', () => { if (admin === true) void save({ action: 'resolve', id: selected, resolved: !thread.resolved }); });
    const select = panel.querySelector('[data-filter]');
    if (select) { select.value = filter; select.onchange = () => { filter = select.value; render(); }; }
    panel.querySelectorAll('[data-thread]').forEach(node => { node.onclick = () => showThread(node.dataset.thread); });
  }
  function positionPins() {
    pins.replaceChildren();
    if (document.body.classList.contains('auth-locked')) return;
    threads.filter(thread => !thread.resolved && thread.anchor.screen === screen()).forEach((thread, index) => {
      let target;
      try { target = document.querySelector(thread.anchor.selector); } catch { return; }
      if (!target || !target.getClientRects().length) return;
      const rect = target.getBoundingClientRect();
      const pinLeft = rect.left + rect.width * thread.anchor.x;
      const pinTop = rect.top + rect.height * thread.anchor.y;
      if (pinLeft < 0 || pinLeft > innerWidth || pinTop < 0 || pinTop > innerHeight) return;
      const pin = document.createElement('button'); pin.type = 'button'; pin.className = 'feedback-pin';
      pin.textContent = String(index + 1); pin.setAttribute('aria-label', `${t('Feedback')}: ${thread.anchor.label}`);
      setOverlayPosition(pin, `feedback-pin-${index}`, { left: pinLeft, top: pinTop });
      pin.onclick = () => { selected = thread.id; draft = null; open(); };
      pins.append(pin);
    });
  }
  button.onclick = () => { if (picking) cancelPick(); open(); void refresh(); };
  document.addEventListener('keydown', event => {
    if (picking && event.key === 'Escape') {
      event.preventDefault(); event.stopImmediatePropagation(); cancelPick(); open();
    }
  }, true);
  document.addEventListener('pointerdown', event => {
    if (picking && !button.contains(event.target)) { event.preventDefault(); event.stopImmediatePropagation(); }
  }, true);
  document.addEventListener('click', event => {
    if (!picking || button.contains(event.target)) return;
    event.preventDefault(); event.stopImmediatePropagation();
    const element = event.target.closest('button, input, select, textarea, canvas, label, h1, h2, h3, p, [id]') || event.target;
    const rect = element.getBoundingClientRect();
    const label = (element.hasAttribute('data-i18n') ? element.textContent.trim() : '') || element.getAttribute('data-i18n-aria-label') || element.id || element.tagName;
    draftImage = ''; draftText = '';
    draft = { action: 'create', id: crypto.randomUUID(), anchor: {
      screen: screen(), selector: feedbackSelector(element), label: label.slice(0, MAX_LABEL_LENGTH),
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / (rect.width || 1))),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / (rect.height || 1))),
      version: metadata.version, viewport: `${innerWidth}x${innerHeight}`,
    } };
    selected = null; cancelPick(); open(); panel.querySelector('textarea')?.focus();
  }, true);
  let scheduled = false;
  function schedulePins() {
    if (scheduled) return; scheduled = true;
    requestAnimationFrame(() => { scheduled = false; positionPins(); });
  }
  window.addEventListener('resize', schedulePins);
  window.addEventListener('scroll', schedulePins, true);
  window.addEventListener('hashchange', () => { cancelPick(); schedulePins(); });
  // Observe app rendering but not our own pin updates.
  new MutationObserver(records => {
    if (records.some(record => !pins.contains(record.target) && record.target !== pins && !panel.contains(record.target))) schedulePins();
  }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'open'] });
  void refresh();
}
