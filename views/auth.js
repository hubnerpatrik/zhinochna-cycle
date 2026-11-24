import { AUTH_NAME_MAX_LENGTH, EMAIL_MAX_LENGTH, VERIFICATION_CODE_MAX_LENGTH, PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH } from '../form-limits.js';
import { escapeHtml } from "./view-utils.js";
import { mountLanguagePicker, setText, translateDOM } from "../i18n.js";
import { showFieldError, initializeFieldErrors } from '../ui/field-errors.js';
import { passwordInput, mountPasswordToggles, hidePasswords } from '../ui/password-toggle.js';

const AUTH_SCREENS = {
  "sign-in": ["Welcome back", "Sign in to your account.", "Sign in"],
  "sign-up": ["Create your account", "Use your email address to get started.", "Create account"],
  "forgot-password": ["Forgot your password?", "We will send you a link to choose a new password.", "Send reset link"],
  "reset-password": ["Choose a new password", "Use at least 8 characters for your password.", "Save new password"],
  "verify-email": ["Verify your email", "Enter the verification code from your email.", "Verify code"],
  "resend-code": ["Send a new code", "Enter the email address you used to create your account.", "Send verification code"],
  "error": ["Unable to connect", "The request could not be completed. Check your connection and try again.", "Try again"],
  "configuration": ["Sign-in is not configured", "Please contact the app administrator.", ""],
  "loading": ["Checking your session…", "", ""],
};

export function renderAuthView(root, { mode, email = "", message = "", error = false, fieldErrors = [], onSubmit, onMode, onRetry }) {
  initializeFieldErrors();
  const [title, description, action] = AUTH_SCREENS[mode] || AUTH_SCREENS["sign-in"];
  const hasForm = ["sign-in", "sign-up", "forgot-password", "reset-password", "verify-email", "resend-code"].includes(mode);
  const emailField = hasForm && mode !== "reset-password";
  const passwordField = ["sign-in", "sign-up", "reset-password"].includes(mode);
  root.innerHTML = `
    <div class="auth-language"><details class="language-picker"></details></div>
    <section class="auth-card" aria-labelledby="authTitle">
      <p class="auth-brand">MARTA ZHINOCHNA STM</p>
      <h1 id="authTitle" tabindex="-1" data-i18n>${escapeHtml(title)}</h1>
      <p class="auth-description" data-i18n>${escapeHtml(description)}</p>
      ${hasForm ? `<form class="auth-form">
        ${mode === "sign-up" ? `<label class="auth-field"><span data-i18n>Name</span><input name="name" autocomplete="name" maxlength="${AUTH_NAME_MAX_LENGTH}" required></label>` : ""}
        ${emailField ? `<label class="auth-field"><span data-i18n>Email</span><input name="email" type="email" autocomplete="email" maxlength="${EMAIL_MAX_LENGTH}" value="${escapeHtml(email)}" required></label>` : ""}
        ${mode === "verify-email" ? `<label class="auth-field"><span data-i18n>Verification code</span><input name="otp" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]+" maxlength="${VERIFICATION_CODE_MAX_LENGTH}" spellcheck="false" required></label>` : ""}
        ${passwordField ? `<div class="auth-field"><label for="authPassword" data-i18n>Password</label>${passwordInput(`<input id="authPassword" name="password" type="password" autocomplete="${mode === "sign-in" ? "current-password" : "new-password"}" ${mode === "sign-in" ? "" : `minlength="${PASSWORD_MIN_LENGTH}"`} maxlength="${PASSWORD_MAX_LENGTH}" required>`)}</div>` : ""}
        ${mode === "sign-up" || mode === "reset-password" ? `<div class="auth-field"><label for="authConfirmPassword" data-i18n>Confirm password</label>${passwordInput(`<input id="authConfirmPassword" name="confirmPassword" type="password" autocomplete="new-password" minlength="${PASSWORD_MIN_LENGTH}" maxlength="${PASSWORD_MAX_LENGTH}" required>`)}</div>` : ""}
        <button type="submit" class="btn primary" data-i18n>${escapeHtml(action)}</button>
      </form>` : ""}
      ${mode === "error" ? '<button class="btn primary" type="button" data-retry data-i18n>Try again</button>' : ""}
      <p class="auth-feedback" role="status" aria-live="polite" data-error="${error}"></p>
      <div class="auth-links">
        ${mode === "verify-email" ? '<button type="button" class="auth-link" data-auth-mode="resend-code" data-i18n>Send a new code</button>' : ""}
        ${mode === "resend-code" ? '<button type="button" class="auth-link" data-auth-mode="verify-email" data-i18n>I already have a code</button>' : ""}
        ${mode === "sign-in" ? '<button type="button" class="auth-link" data-auth-mode="sign-up" data-i18n>Create account</button><button type="button" class="auth-link" data-auth-mode="forgot-password" data-i18n>Forgot your password?</button><button type="button" class="auth-link" data-auth-mode="verify-email" data-i18n>Verify your email</button>' : ""}
        ${hasForm && mode !== "sign-in" ? '<button type="button" class="auth-link" data-auth-mode="sign-in" data-i18n>Back to sign in</button>' : ""}
        ${mode === "sign-in" || mode === "sign-up" ? '<button type="button" class="auth-link" data-auth-mode="welcome" data-i18n>Back to home</button>' : ""}
      </div>
      ${mode === "sign-in" || mode === "sign-up" ? '<p class="auth-note" data-i18n>Your maps sync with your account. A local copy is kept on this device.</p>' : ""}
    </section>`;
  setText(root.querySelector(".auth-feedback"), message);
  translateDOM(root);
  mountLanguagePicker(root.querySelector(".language-picker"));
  mountPasswordToggles(root);
  root.querySelectorAll("[data-auth-mode]").forEach(button => {
    button.onclick = () => onMode(button.dataset.authMode, root.querySelector('[name="email"]')?.value);
  });
  root.querySelector("[data-retry]")?.addEventListener("click", onRetry);
  const form = root.querySelector("form");
  const invalidFields = fieldErrors.map(name => ['email', 'password', 'otp'].includes(name) ? form?.querySelector(`[name="${name}"]`) : null).filter(Boolean);
  if (error && invalidFields.length) {
    setText(root.querySelector('.auth-feedback'), '');
    invalidFields.forEach(input => showFieldError(input, message)); invalidFields[0].focus();
  }
  form?.addEventListener("submit", async event => {
    event.preventDefault();
    if (form.getAttribute("aria-busy") === "true") return;
    const values = Object.fromEntries(new FormData(form));
    if (values.confirmPassword !== undefined && values.password !== values.confirmPassword) {
      showFieldError(form.querySelector('[name="confirmPassword"]'), 'Passwords do not match.', { focus: true });
      return;
    }
    form.setAttribute("aria-busy", "true");
    const controls = root.querySelectorAll("input, button");
    controls.forEach(control => { control.disabled = true; });
    try { await onSubmit(mode, values); }
    finally {
      form.removeAttribute("aria-busy");
      controls.forEach(control => { control.disabled = false; });
      hidePasswords(form);
      form.querySelectorAll('input[type="password"], input[name="otp"]').forEach(input => { input.value = ""; });
    }
  });
}
