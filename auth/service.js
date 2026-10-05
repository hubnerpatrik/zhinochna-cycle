// UI-independent auth actions. Passwords and reset tokens are never persisted.
export function verifiedUser(session) {
  const user = session?.user;
  const expiresAt = new Date(session?.session?.expiresAt).getTime();
  return typeof user?.id === "string" && user.id.trim() && user.emailVerified === true
    && expiresAt > Date.now() ? user : null;
}

export function readAuthCallback(href) {
  const url = new URL(href);
  return {
    reset: url.searchParams.get("auth") === "reset-password",
    token: url.searchParams.get("token") || "",
    error: url.searchParams.has("error"),
  };
}

export function authErrorMessage(error) {
  if (error?.code === "SESSION_NOT_AVAILABLE") return "Sign-in could not be kept in this browser. Allow cookies for this site and try again.";
  // The Neon SDK normalizes INVALID_CALLBACK_URL to feature_not_supported,
  // while retaining this fixed provider message. Match only known constants.
  if (["INVALID_CALLBACK_URL", "INVALID_ORIGIN", "INVALID_REDIRECT_URL", "INVALID_REDIRECT_TO"].includes(error?.code)
    || ["Invalid callbackURL", "Invalid origin", "Invalid redirectURL", "Invalid redirectTo"].includes(error?.message)) {
    return "This app address is not allowed by the sign-in service. Please contact the app administrator.";
  }
  if (["INVALID_OTP", "OTP_EXPIRED"].includes(error?.code)
    || ["Invalid OTP", "OTP expired"].includes(error?.message)) return "The verification code is incorrect or expired. Try again or request a new code.";
  if (error?.code === "TOO_MANY_ATTEMPTS" || error?.message === "Too many attempts") return "Too many incorrect codes. Request a new code.";
  if (error?.status === 429) return "Too many attempts. Please wait and try again.";
  if (isEmailUnverified(error)) return "Verify your email before signing in.";
  if (["INVALID_EMAIL_OR_PASSWORD", "INVALID_PASSWORD", "invalid_credentials"].includes(error?.code)) return "The email or password is incorrect.";
  if (["INVALID_TOKEN", "TOKEN_EXPIRED"].includes(error?.code)) return "This link is invalid or expired. Request a new one.";
  if (error?.code === "PASSWORD_TOO_SHORT") return "Use at least 8 characters for your password.";
  // Do not display raw provider responses, credentials, or user enumeration errors.
  return "The request could not be completed. Check your connection and try again.";
}

export function isEmailUnverified(error) {
  return ["EMAIL_NOT_VERIFIED", "email_not_confirmed"].includes(error?.code);
}

export function authErrorFields(error) {
  if (['INVALID_EMAIL_OR_PASSWORD', 'INVALID_PASSWORD', 'invalid_credentials'].includes(error?.code)) return ['email', 'password'];
  if (error?.code === 'PASSWORD_TOO_SHORT') return ['password'];
  if (['INVALID_OTP', 'OTP_EXPIRED'].includes(error?.code) || ['Invalid OTP', 'OTP expired'].includes(error?.message)) return ['otp'];
  return [];
}

export function createAuthService(client, origin) {
  const callbackURL = new URL("/", origin).href;
  const redirectTo = new URL("/?auth=reset-password", origin).href;
  async function unwrap(promise) {
    const result = await promise;
    if (result?.error) throw result.error;
    return result?.data ?? null;
  }
  return {
    token: async () => {
      // SDK 0.5 shares the get-session cache with /token. Force the token
      // request so a cached session object cannot masquerade as a JWT response.
      const result = await unwrap(client.token({ fetchOptions: { headers: { "X-Force-Fetch": "true" }, timeout: 15000 } }));
      if (typeof result?.token !== "string" || !result.token) throw new Error("Unauthorized");
      return result.token;
    },
    session: async ({ required = false } = {}) => {
      const session = await unwrap(client.getSession({
        query: { disableCookieCache: true },
        fetchOptions: { headers: { "X-Force-Fetch": "true" }, timeout: 15000 },
      }));
      // A successful sign-in response does not prove the browser retained its cookie.
      if (required && !verifiedUser(session) && session?.user?.emailVerified !== false) {
        throw Object.assign(new Error("Session unavailable after sign-in"), { code: "SESSION_NOT_AVAILABLE" });
      }
      return session;
    },
    signIn: ({ email, password }) => unwrap(client.signIn.email({ email, password })),
    signUp: ({ name, email, password }) => unwrap(client.signUp.email({ name, email, password, callbackURL })),
    signOut: () => unwrap(client.signOut()),
    requestReset: email => unwrap(client.requestPasswordReset({ email, redirectTo })),
    resetPassword: (token, newPassword) => unwrap(client.resetPassword({ token, newPassword })),
    requestVerificationCode: email => unwrap(client.emailOtp.sendVerificationOtp({ email, type: "email-verification" })),
    verifyEmailCode: async (email, otp) => {
      const result = await unwrap(client.emailOtp.verifyEmail({ email, otp }));
      if (result?.status !== true) throw new Error("Email verification did not succeed");
      return result;
    },
  };
}
