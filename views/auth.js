import { escapeHtml } from "./view-utils.js";
import { getLanguage, setLanguage, setText, translateDOM } from "../i18n.js";

const screens = {
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

export function renderAuthView(root, { mode, email = "", message = "", error = false, onSubmit, onMode, onRetry }) {
  const [title, description, action] = screens[mode] || screens["sign-in"];
  const hasForm = ["sign-in", "sign-up", "forgot-password", "reset-password", "verify-email", "resend-code"].includes(mode);
  const emailField = hasForm && mode !== "reset-password";
  const passwordField = ["sign-in", "sign-up", "reset-password"].includes(mode);
  root.innerHTML = `
    <div class="auth-language">
      <select data-auth-language aria-label="Language" data-i18n-aria-label="Language">
        <option value="en" lang="en">EN</option><option value="uk" lang="uk">UA</option><option value="cs" lang="cs">CZ</option><option value="sk" lang="sk">SK</option>
      </select>
    </div>
    <section class="auth-card" aria-labelledby="authTitle">
      <p class="auth-brand">MARTA ZHINOCHNA STM</p>
      <h1 id="authTitle" tabindex="-1" data-i18n>${escapeHtml(title)}</h1>
      <p class="auth-description" data-i18n>${escapeHtml(description)}</p>
      ${hasForm ? `<form class="auth-form">
        ${mode === "sign-up" ? `<label class="auth-field"><span data-i18n>Name</span><input name="name" autocomplete="name" maxlength="100" required></label>` : ""}
        ${emailField ? `<label class="auth-field"><span data-i18n>Email</span><input name="email" type="email" autocomplete="email" maxlength="254" value="${escapeHtml(email)}" required></label>` : ""}
        ${mode === "verify-email" ? '<label class="auth-field"><span data-i18n>Verification code</span><input name="otp" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]+" maxlength="16" spellcheck="false" required></label>' : ""}
        ${passwordField ? `<label class="auth-field"><span data-i18n>Password</span><input name="password" type="password" autocomplete="${mode === "sign-in" ? "current-password" : "new-password"}" ${mode === "sign-in" ? "" : 'minlength="8"'} maxlength="128" required></label>` : ""}
        ${mode === "sign-up" || mode === "reset-password" ? `<label class="auth-field"><span data-i18n>Confirm password</span><input name="confirmPassword" type="password" autocomplete="new-password" minlength="8" maxlength="128" required></label>` : ""}
        <button type="submit" class="btn primary" data-i18n>${escapeHtml(action)}</button>
      </form>` : ""}
      ${mode === "error" ? '<button class="btn primary" type="button" data-retry data-i18n>Try again</button>' : ""}
      <p class="auth-feedback" role="status" aria-live="polite" data-error="${error}"></p>
      <div class="auth-links">
        ${mode === "verify-email" ? '<button type="button" class="auth-link" data-auth-mode="resend-code" data-i18n>Send a new code</button>' : ""}
        ${mode === "resend-code" ? '<button type="button" class="auth-link" data-auth-mode="verify-email" data-i18n>I already have a code</button>' : ""}
        ${mode === "sign-in" ? '<button type="button" class="auth-link" data-auth-mode="sign-up" data-i18n>Create account</button><button type="button" class="auth-link" data-auth-mode="forgot-password" data-i18n>Forgot your password?</button><button type="button" class="auth-link" data-auth-mode="verify-email" data-i18n>Verify your email</button>' : ""}
        ${hasForm && mode !== "sign-in" ? '<button type="button" class="auth-link" data-auth-mode="sign-in" data-i18n>Back to sign in</button>' : ""}
      </div>
      ${mode === "sign-in" || mode === "sign-up" ? '<p class="auth-note" data-i18n>Your maps sync with your account. A local copy is kept on this device.</p>' : ""}
    </section>`;
  setText(root.querySelector(".auth-feedback"), message);
  translateDOM(root);
  const language = root.querySelector("[data-auth-language]");
  language.value = getLanguage();
  language.onchange = () => setLanguage(language.value);
  root.querySelectorAll("[data-auth-mode]").forEach(button => {
    button.onclick = () => onMode(button.dataset.authMode, root.querySelector('[name="email"]')?.value);
  });
  root.querySelector("[data-retry]")?.addEventListener("click", onRetry);
  const form = root.querySelector("form");
  form?.addEventListener("submit", async event => {
    event.preventDefault();
    if (form.getAttribute("aria-busy") === "true") return;
    const values = Object.fromEntries(new FormData(form));
    if (values.confirmPassword !== undefined && values.password !== values.confirmPassword) {
      setText(root.querySelector(".auth-feedback"), "Passwords do not match.");
      root.querySelector(".auth-feedback").dataset.error = "true";
      return;
    }
    form.setAttribute("aria-busy", "true");
    const controls = root.querySelectorAll("input, button");
    controls.forEach(control => { control.disabled = true; });
    try { await onSubmit(mode, values); }
    finally {
      form.removeAttribute("aria-busy");
      controls.forEach(control => { control.disabled = false; });
      form.querySelectorAll('input[type="password"], input[name="otp"]').forEach(input => { input.value = ""; });
    }
  });
}
