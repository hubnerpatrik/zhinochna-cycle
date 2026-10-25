import { t } from '../i18n.js';
import { escapeHtml } from '../views/view-utils.js';
import { MAX_MESSAGE_LENGTH } from '../feedback-model.js';
import { feedbackMessageHtml, feedbackResolutionHtml } from './feedback-thread.js';

const MESSAGE_PREVIEW_LENGTH = 130;

function imagePicker(image, busy, imageLoading) {
  return `<div class="feedback-image-picker"><label>${escapeHtml(t('Attach screenshot'))}<input type="file" data-image accept="image/jpeg,image/png,image/webp" ${busy || imageLoading ? 'disabled' : ''}></label>
      <small>${escapeHtml(t('JPG, PNG or WebP · up to 10 MB. Check the preview before sending.'))}</small>
      ${image ? `<img class="feedback-attachment" src="${escapeHtml(image)}" alt="${escapeHtml(t('Screenshot'))}"><button type="button" data-remove-image ${busy ? 'disabled' : ''}>${escapeHtml(t('Remove screenshot'))}</button>` : ''}</div>`;
}

export function feedbackPanelHtml({
  description, admin, busy, loading, error, draft, draftText, draftImage,
  thread, replyText, replyImage, imageLoading, shown,
}) {
  return `<header><h2 id="feedbackTitle">${escapeHtml(t('Feedback'))}</h2><button type="button" data-close aria-label="${escapeHtml(t('Close'))}">×</button></header>
      <p class="feedback-intro">${escapeHtml(t(description || (admin ? 'Shared inbox · latest 200 reports' : 'Your reports are shared with app support.')))}</p>
      <div class="feedback-toolbar"><button type="button" data-new ${busy ? 'disabled' : ''}>${escapeHtml(t('Point to a problem'))}</button>
      <button type="button" data-refresh ${loading || busy ? 'disabled' : ''}>${escapeHtml(t('Refresh'))}</button></div>
      <p role="status" class="feedback-status">${escapeHtml(error || (loading ? t('Loading…') : ''))}</p>
      ${draft ? `<form data-compose><h3>${escapeHtml(t('New comment'))}</h3><p>${escapeHtml(draft.anchor.label || draft.anchor.screen)}</p>
        <label>${escapeHtml(t('Describe the problem'))}<textarea maxlength="${MAX_MESSAGE_LENGTH}" required ${busy ? 'disabled' : ''}>${escapeHtml(draftText)}</textarea></label>
        ${imagePicker(draftImage, busy, imageLoading)}
        <button type="submit" ${busy || imageLoading ? 'disabled' : ''}>${escapeHtml(t(busy ? 'Sending…' : 'Send comment'))}</button>
        <button type="button" data-discard ${busy ? 'disabled' : ''}>${escapeHtml(t('Cancel'))}</button></form>` : ''}
      ${thread && !draft ? `<section class="feedback-thread"><button type="button" data-back>${escapeHtml(t(admin ? 'All reports' : 'My reports'))}</button>
        <h3>${escapeHtml(thread.anchor.label || thread.anchor.screen)}</h3><p>${escapeHtml(thread.anchor.screen)} · v${escapeHtml(thread.anchor.version)} · ${escapeHtml(thread.anchor.viewport)}</p>
        <p>${escapeHtml(t(thread.resolved ? 'Resolved' : 'Open'))}</p>
        ${feedbackResolutionHtml(thread, admin, busy)}
        ${thread.messages.map(feedbackMessageHtml).join('')}
        <form data-reply><label>${escapeHtml(t('Reply'))}<textarea maxlength="${MAX_MESSAGE_LENGTH}" required ${busy ? 'disabled' : ''}>${escapeHtml(replyText)}</textarea></label>
        ${imagePicker(replyImage, busy, imageLoading)}
        <button type="submit" ${busy || imageLoading ? 'disabled' : ''}>${escapeHtml(t(busy ? 'Sending…' : 'Send reply'))}</button></form>
        </section>` : ''}
      ${!draft && !thread ? `<label>${escapeHtml(t('Filter'))}<select data-filter><option value="open">${escapeHtml(t('Open'))}</option><option value="resolved">${escapeHtml(t('Resolved'))}</option><option value="all">${escapeHtml(t(admin ? 'All reports' : 'My reports'))}</option></select></label>
        <div class="feedback-list">${shown.length ? shown.map(item => `<button type="button" data-thread="${escapeHtml(item.id)}"><strong>${escapeHtml(item.anchor.label || item.anchor.screen)}</strong><span>${escapeHtml(item.messages[0].text.slice(0, MESSAGE_PREVIEW_LENGTH))}</span><small>${escapeHtml(t(item.resolved ? 'Resolved' : 'Open'))} · ${item.messages.length}</small></button>`).join('') : `<p>${escapeHtml(t('No reports in this view.'))}</p>`}</div>` : ''}`;
}
