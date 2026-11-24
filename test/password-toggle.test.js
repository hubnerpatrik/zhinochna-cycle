import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setPasswordVisible } from '../ui/password-toggle.js';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

function fakeButton() {
  const attributes = new Map();
  return {
    attributes,
    setAttribute(name, value) { attributes.set(name, String(value)); },
    getAttribute(name) { return attributes.get(name) ?? null; },
  };
}

test('the eye button shows the password and a second press hides it again', () => {
  const input = { type: 'password' };
  const button = fakeButton();
  setPasswordVisible(input, button, true);
  assert.equal(input.type, 'text');
  assert.equal(button.getAttribute('aria-pressed'), 'true');
  assert.equal(button.getAttribute('data-i18n-aria-label'), 'Hide password');
  setPasswordVisible(input, button, false);
  assert.equal(input.type, 'password');
  assert.equal(button.getAttribute('aria-pressed'), 'false');
  assert.equal(button.getAttribute('data-i18n-aria-label'), 'Show password');
});

test('every password field on the auth card gets its own show/hide button outside the label', () => {
  const auth = read('views/auth.js');
  assert.match(auth, /passwordInput\(/);
  assert.match(auth, /mountPasswordToggles\(/);
  const toggle = read('ui/password-toggle.js');
  assert.match(toggle, /type="button"[^>]*data-password-toggle/);
  assert.match(toggle, /aria-pressed="false"/);
});

test('the show and hide labels are translated', () => {
  const auth = read('i18n/auth.js');
  assert.match(auth, /'Show password': \['[^']+', '[^']+', '[^']+'\]/);
  assert.match(auth, /'Hide password': \['[^']+', '[^']+', '[^']+'\]/);
});

test('field errors sit below the password wrapper, not inside it', () => {
  assert.match(read('ui/field-errors.js'), /closest\('\.time-picker, \.password-input'\)/);
});
