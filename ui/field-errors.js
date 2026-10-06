import { setText } from '../i18n.js';
const errors = new WeakMap();
const installed = new WeakSet();
let nextError = 0;

export function validationMessage(input) {
  const v = input.validity || {};
  if (v.badInput) return 'Enter a valid number.';
  if (v.valueMissing || (input.required && input.type !== 'password' && !input.value.trim())) return 'Fill in this field.';
  if (v.typeMismatch && input.type === 'email') return 'Enter a valid email address, for example name@example.com.';
  if (v.tooShort) return 'Use at least 8 characters for your password.';
  if (v.tooLong) return 'This text is too long.';
  if (v.rangeUnderflow || v.rangeOverflow) return input.name === 'age' ? 'Enter an age from 10 to 60.' : 'This value is outside the allowed range.';
  if (v.patternMismatch) return input.name === 'otp' ? 'Enter the numeric verification code.' : input.inputMode === 'numeric' && input.placeholder === 'HH:MM' ? 'Enter a time from 00:00 to 23:59.' : 'Check the format of this value.';
  if (v.stepMismatch) return input.id === 'tempInput' ? 'Use at most two decimal places.' : input.name === 'age' ? 'Enter a whole number.' : 'Enter a value using the allowed step.';
  if (v.customError) return input.validationMessage;
  return 'Check this value and try again.';
}
export function clearFieldError(input) {
  const error = errors.get(input);
  if (!error) return;
  error.message.remove();
  const described = (input.getAttribute('aria-describedby') || '').split(/\s+/).filter(id => id && id !== error.message.id);
  if (described.length) input.setAttribute('aria-describedby', described.join(' '));
  else input.removeAttribute('aria-describedby');
  if (error.invalid == null) input.removeAttribute('aria-invalid');
  else input.setAttribute('aria-invalid', error.invalid);
  input.classList.remove('field-invalid', 'field-shake');
  errors.delete(input);
}
export function showFieldError(input, text, { focus = false, constraint = false, animate = true } = {}) {
  if (!input) return;
  let error = errors.get(input);
  if (!error) {
    const message = document.createElement('span');
    message.className = 'field-error'; message.id = `field-error-${++nextError}`;
    message.setAttribute('aria-live', 'polite');
    (input.closest('.time-picker') || input).after(message);
    error = { message, invalid: input.getAttribute('aria-invalid') };
    errors.set(input, error);
    input.setAttribute('aria-describedby', [input.getAttribute('aria-describedby'), message.id].filter(Boolean).join(' '));
  }
  error.constraint = constraint;
  setText(error.message, text);
  input.setAttribute('aria-invalid', 'true');
  input.classList.add('field-invalid');
  if (animate) {
    input.classList.remove('field-shake'); void input.offsetWidth; input.classList.add('field-shake');
  }
  if (focus) input.focus();
}
export function clearFieldErrors(root) {
  root?.querySelectorAll?.('.field-invalid').forEach(clearFieldError);
}
export function initializeFieldErrors(root = document) {
  if (installed.has(root)) return;
  installed.add(root);
  let firstInvalid = null;
  root.addEventListener('invalid', event => {
    event.preventDefault();
    showFieldError(event.target, validationMessage(event.target), { constraint: true });
    if (!firstInvalid) {
      firstInvalid = event.target;
      queueMicrotask(() => { if (firstInvalid?.isConnected) firstInvalid.focus(); firstInvalid = null; });
    }
  }, true);
  root.addEventListener('submit', event => {
    const invalid = [...event.target.querySelectorAll('input[required], textarea[required]')]
      .filter(input => !input.disabled && input.type !== 'password' && !input.value.trim());
    if (!invalid.length) return;
    event.preventDefault(); event.stopImmediatePropagation();
    invalid.forEach(input => showFieldError(input, 'Fill in this field.', { constraint: true })); invalid[0].focus();
  }, true);
  const changed = event => {
    const input = event.target, error = errors.get(input);
    if (!error) return;
    if (error.constraint && (input.validity?.valid === false || (input.required && input.type !== 'password' && !input.value.trim()))) {
      showFieldError(input, validationMessage(input), { constraint: true, animate: false });
    } else clearFieldError(input);
  };
  root.addEventListener('input', changed); root.addEventListener('change', changed);
  root.addEventListener('reset', event => clearFieldErrors(event.target));
  root.addEventListener('animationend', event => { if (event.animationName === 'field-shake') event.target.classList.remove('field-shake'); });
}
