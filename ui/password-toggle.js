import { setTranslatedAttribute } from '../i18n.js';

const EYE = '<svg class="password-eye" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_OFF = '<svg class="password-eye-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/><path d="M4 4l16 16"/></svg>';

// The input markup is passed in so each form keeps its own name, autocomplete and length rules.
export function passwordInput(inputHtml) {
  return `<span class="password-input">${inputHtml}<button type="button" class="password-toggle" data-password-toggle aria-pressed="false" aria-label="Show password" data-i18n-aria-label="Show password">${EYE}${EYE_OFF}</button></span>`;
}

export function setPasswordVisible(input, button, visible) {
  input.type = visible ? 'text' : 'password';
  button.setAttribute('aria-pressed', String(visible));
  setTranslatedAttribute(button, 'aria-label', visible ? 'Hide password' : 'Show password');
}

export function mountPasswordToggles(root) {
  root.querySelectorAll('[data-password-toggle]').forEach(button => {
    const input = button.parentElement.querySelector('input');
    button.addEventListener('click', () => {
      setPasswordVisible(input, button, input.type === 'password');
    });
  });
}

// Before the form is sent or cleared, mask every password again.
export function hidePasswords(root) {
  root.querySelectorAll('[data-password-toggle]').forEach(button => {
    setPasswordVisible(button.parentElement.querySelector('input'), button, false);
  });
}
