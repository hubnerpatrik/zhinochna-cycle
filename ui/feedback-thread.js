import { t } from '../i18n.js';
import { escapeHtml as esc } from '../views/view-utils.js';
import { isStoredProfilePhoto } from '../profile-photo.js';

export function feedbackMessageHtml(message) {
  const name = message.authorName || t(message.author === 'Support' ? 'Support' : 'User');
  const photo = message.authorPhoto && isStoredProfilePhoto(message.authorPhoto)
    ? `<img class="feedback-avatar" src="${esc(message.authorPhoto)}" alt="">`
    : `<span class="feedback-avatar feedback-avatar-placeholder" aria-hidden="true">${esc(Array.from(name)[0] || '?')}</span>`;
  return `<article><div class="feedback-message-author">${photo}<div><strong>${esc(name)}</strong> <time>${esc(new Date(message.at).toLocaleString())}</time></div></div><p>${esc(message.text)}</p></article>`;
}

export function feedbackResolutionHtml(thread, admin, busy) {
  return admin === true ? `<button type="button" data-resolve="${thread.resolved ? 'reopen' : 'resolve'}" ${busy ? 'disabled' : ''}>${esc(t(thread.resolved ? 'Reopen report' : 'Mark resolved'))}</button>` : '';
}

