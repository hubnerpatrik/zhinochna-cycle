import { t } from '../i18n.js';
import { escapeHtml } from '../views/view-utils.js';
import { isStoredProfilePhoto } from '../profile-photo.js';
import { isFeedbackImage } from '../feedback-image.js';

export function feedbackMessageHtml(message) {
  const name = message.authorName || t(message.author === 'Support' ? 'Support' : 'User');
  const photo = message.authorPhoto && isStoredProfilePhoto(message.authorPhoto)
    ? `<img class="feedback-avatar" src="${escapeHtml(message.authorPhoto)}" alt="">`
    : `<span class="feedback-avatar feedback-avatar-placeholder" aria-hidden="true">${escapeHtml(Array.from(name)[0] || '?')}</span>`;
  const attachment = isFeedbackImage(message.image) ? `<a href="${escapeHtml(message.image)}" download="feedback.jpg"><img class="feedback-attachment" src="${escapeHtml(message.image)}" alt="${escapeHtml(t('Screenshot'))}"></a>` : '';
  return `<article><div class="feedback-message-author">${photo}<div><strong>${escapeHtml(name)}</strong> <time>${escapeHtml(new Date(message.at).toLocaleString())}</time></div></div><p>${escapeHtml(message.text)}</p>${attachment}</article>`;
}

export function feedbackResolutionHtml(thread, admin, busy) {
  return admin === true ? `<button type="button" data-resolve="${thread.resolved ? 'reopen' : 'resolve'}" ${busy ? 'disabled' : ''}>${escapeHtml(t(thread.resolved ? 'Reopen report' : 'Mark resolved'))}</button>` : '';
}

