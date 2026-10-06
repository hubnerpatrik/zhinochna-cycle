import { t } from '../i18n.js';
import { escapeHtml as esc } from '../views/view-utils.js';
import { validateFeedback } from '../feedback-model.js';
import { feedbackMessageHtml, feedbackResolutionHtml } from './feedback-thread.js';
import metadata from '../package.json';

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
  return parts.join(' > ').slice(0, 1000);
}

export function setupFeedback({ auth, app }) {
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
  let threads = [], admin = false, picking = false, draft = null, selected = null, busy = false, filter = 'open';
  let draftText = '', replyText = '', replyId = null, error = '', loading = false, generation = 0;
  const screen = () => location.hash.split('?')[0] || '#/menu';
  async function request(method, body) {
    const token = await auth.token();
    const response = await fetch('/api/feedback', {
      method, cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(20000),
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(validateFeedback(body)) } : {}),
    });
    if (!response.ok) throw new Error('Request failed');
    return response.json();
  }
  function cancelPick() {
    picking = false; hint.hidden = true; document.body.classList.remove('feedback-picking');
    button.querySelector('span').textContent = '🐞'; button.setAttribute('aria-label', t('Report a bug'));
  }
  function open() { if (!panel.open) panel.showModal(); render(); }
  function close() { panel.close(); button.focus(); }
  conceal = () => {
    generation++; cancelPick(); panel.close(); pins.replaceChildren();
    threads = []; admin = false; selected = null; panel.replaceChildren();
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
    } catch { if (epoch === generation) error = t('Not sent. Your text is kept here; check your connection and retry.'); }
    finally { busy = false; if (epoch === generation) { render(); positionPins(); } }
  }
  function render() {
    if (!panel.open) return;
    const thread = threads.find(item => item.id === selected);
    const shown = threads.filter(item => filter === 'all' || (filter === 'resolved' ? item.resolved : !item.resolved));
    panel.innerHTML = `<header><h2 id="feedbackTitle">${esc(t('Feedback'))}</h2><button type="button" data-close aria-label="${esc(t('Close'))}">×</button></header>
      <p class="feedback-intro">${esc(t(admin ? 'Shared inbox · latest 200 reports' : 'Your reports are shared with app support.'))}</p>
      <div class="feedback-toolbar"><button type="button" data-new ${busy ? 'disabled' : ''}>${esc(t('Point to a problem'))}</button>
      <button type="button" data-refresh ${loading || busy ? 'disabled' : ''}>${esc(t('Refresh'))}</button></div>
      <p role="status" class="feedback-status">${esc(error || (loading ? t('Loading…') : ''))}</p>
      ${draft ? `<form data-compose><h3>${esc(t('New comment'))}</h3><p>${esc(draft.anchor.label || draft.anchor.screen)}</p>
        <label>${esc(t('Describe the problem'))}<textarea maxlength="4000" required ${busy ? 'disabled' : ''}>${esc(draftText)}</textarea></label>
        <button type="submit" ${busy ? 'disabled' : ''}>${esc(t(busy ? 'Sending…' : 'Send comment'))}</button>
        <button type="button" data-discard ${busy ? 'disabled' : ''}>${esc(t('Cancel'))}</button></form>` : ''}
      ${thread && !draft ? `<section class="feedback-thread"><button type="button" data-back>${esc(t(admin ? 'All reports' : 'My reports'))}</button>
        <h3>${esc(thread.anchor.label || thread.anchor.screen)}</h3><p>${esc(thread.anchor.screen)} · v${esc(thread.anchor.version)} · ${esc(thread.anchor.viewport)}</p>
        <p>${esc(t(thread.resolved ? 'Resolved' : 'Open'))}</p>
        ${thread.messages.map(feedbackMessageHtml).join('')}
        <form data-reply><label>${esc(t('Reply'))}<textarea maxlength="4000" required ${busy ? 'disabled' : ''}>${esc(replyText)}</textarea></label>
        <button type="submit" ${busy ? 'disabled' : ''}>${esc(t(busy ? 'Sending…' : 'Send reply'))}</button></form>
        ${feedbackResolutionHtml(thread, admin, busy)}</section>` : ''}
      ${!draft && !thread ? `<label>${esc(t('Filter'))}<select data-filter><option value="open">${esc(t('Open'))}</option><option value="resolved">${esc(t('Resolved'))}</option><option value="all">${esc(t(admin ? 'All reports' : 'My reports'))}</option></select></label>
        <div class="feedback-list">${shown.length ? shown.map(item => `<button type="button" data-thread="${esc(item.id)}"><strong>${esc(item.anchor.label || item.anchor.screen)}</strong><span>${esc(item.messages[0].text.slice(0, 130))}</span><small>${esc(t(item.resolved ? 'Resolved' : 'Open'))} · ${item.messages.length}</small></button>`).join('') : `<p>${esc(t('No reports in this view.'))}</p>`}</div>` : ''}`;
    panel.querySelector('[data-close]').onclick = close;
    panel.querySelector('[data-refresh]').onclick = refresh;
    panel.querySelector('[data-new]').onclick = () => {
      panel.close(); picking = true; hint.hidden = false; document.body.classList.add('feedback-picking');
      button.querySelector('span').textContent = '×'; button.setAttribute('aria-label', t('Cancel'));
    };
    panel.querySelector('[data-discard]')?.addEventListener('click', () => { draft = null; draftText = ''; render(); });
    panel.querySelector('[data-back]')?.addEventListener('click', () => { selected = null; replyText = ''; replyId = null; render(); });
    const compose = panel.querySelector('[data-compose]');
    compose?.querySelector('textarea').addEventListener('input', e => { draftText = e.target.value; draft.id = crypto.randomUUID(); });
    compose?.addEventListener('submit', e => { e.preventDefault(); if (draftText.trim()) void save({ ...draft, text: draftText }); });
    const reply = panel.querySelector('[data-reply]');
    reply?.querySelector('textarea').addEventListener('input', e => { replyText = e.target.value; replyId = null; });
    reply?.addEventListener('submit', e => {
      e.preventDefault(); if (!replyText.trim()) return;
      replyId ||= crypto.randomUUID(); void save({ action: 'reply', id: selected, messageId: replyId, text: replyText });
    });
    panel.querySelector('[data-resolve]')?.addEventListener('click', () => { if (admin === true) void save({ action: 'resolve', id: selected, resolved: !thread.resolved }); });
    const select = panel.querySelector('[data-filter]');
    if (select) { select.value = filter; select.onchange = () => { filter = select.value; render(); }; }
    panel.querySelectorAll('[data-thread]').forEach(node => { node.onclick = () => { selected = node.dataset.thread; replyText = ''; replyId = null; render(); }; });
  }
  function positionPins() {
    pins.replaceChildren();
    if (document.body.classList.contains('auth-locked')) return;
    threads.filter(thread => !thread.resolved && thread.anchor.screen === screen()).forEach((thread, index) => {
      let target;
      try { target = document.querySelector(thread.anchor.selector); } catch { return; }
      if (!target || !target.getClientRects().length) return;
      const rect = target.getBoundingClientRect();
      const x = rect.left + rect.width * thread.anchor.x, y = rect.top + rect.height * thread.anchor.y;
      if (x < 0 || x > innerWidth || y < 0 || y > innerHeight) return;
      const pin = document.createElement('button'); pin.type = 'button'; pin.className = 'feedback-pin';
      pin.textContent = String(index + 1); pin.setAttribute('aria-label', `${t('Feedback')}: ${thread.anchor.label}`);
      pin.style.left = `${x}px`; pin.style.top = `${y}px`;
      pin.onclick = () => { selected = thread.id; draft = null; open(); };
      pins.append(pin);
    });
  }
  button.onclick = () => { if (picking) cancelPick(); open(); void refresh(); };
  document.addEventListener('keydown', e => { if (picking && e.key === 'Escape') { cancelPick(); open(); } });
  document.addEventListener('pointerdown', e => {
    if (picking && !button.contains(e.target)) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
  document.addEventListener('click', e => {
    if (!picking || button.contains(e.target)) return;
    e.preventDefault(); e.stopImmediatePropagation();
    const element = e.target.closest('button, input, select, textarea, canvas, label, h1, h2, h3, p, [id]') || e.target;
    const rect = element.getBoundingClientRect();
    const label = (element.hasAttribute('data-i18n') ? element.textContent.trim() : '') || element.getAttribute('data-i18n-aria-label') || element.id || element.tagName;
    draft = { action: 'create', id: crypto.randomUUID(), anchor: {
      screen: screen(), selector: feedbackSelector(element), label: label.slice(0, 100),
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / (rect.width || 1))),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / (rect.height || 1))),
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
  }).observe(app, { childList: true, subtree: true });
  void refresh();
}
