import test from 'node:test';
import assert from 'node:assert/strict';
import { validationMessage } from '../ui/field-errors.js';
import { authErrorFields } from '../auth/service.js';

test('field validation describes the actual failure and preserves password whitespace', () => {
  assert.equal(validationMessage({ validity: { typeMismatch: true }, type: 'email' }), 'Enter a valid email address, for example name@example.com.');
  assert.equal(validationMessage({ validity: { badInput: true } }), 'Enter a valid number.');
  assert.equal(validationMessage({ validity: { stepMismatch: true }, id: 'tempInput' }), 'Use at most two decimal places.');
  assert.equal(validationMessage({ validity: { rangeOverflow: true }, name: 'age' }), 'Enter an age from 10 to 60.');
  assert.equal(validationMessage({ required: true, value: ' ', type: 'text' }), 'Fill in this field.');
  assert.notEqual(validationMessage({ required: true, value: ' ', type: 'password' }), 'Fill in this field.');
});
test('auth errors mark relevant inputs; connectivity, session and rate errors do not blame a field', () => {
  assert.deepEqual(authErrorFields({ code: 'INVALID_EMAIL_OR_PASSWORD' }), ['email', 'password']);
  assert.deepEqual(authErrorFields({ code: 'OTP_EXPIRED' }), ['otp']);
  assert.deepEqual(authErrorFields({ code: 'PASSWORD_TOO_SHORT' }), ['password']);
  for (const error of [{ status: 429 }, { code: 'SESSION_NOT_AVAILABLE' }, { message: 'Network error' }]) assert.deepEqual(authErrorFields(error), []);
});
