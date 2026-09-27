import { initializeLanguage } from "./i18n.js";
import { configuredAuth } from "./auth/client.js";
import { authErrorMessage, isEmailUnverified, readAuthCallback, verifiedUser } from "./auth/service.js";
import { configurePersistence, useAccountStorage } from "./storage/local-storage-adapter.js";
import { CloudStorageAdapter, createCloudTransport } from "./storage/cloud-storage-adapter.js";
import { setupCloudStatus } from "./views/cloud-status.js";
import { renderAuthView } from "./views/auth.js";

const root = document.getElementById("authRoot");
const app = document.getElementById("trackerApp");
const callback = readAuthCallback(location.href);
let resetToken = callback.token;
let activeUserId = null;
let pendingCheck = false;
let signingOut = false;
let rememberedEmail = "";
let mode = "sign-in";
let auth;
let channel;
let expiryTimer;
let sessionEpoch = 0;
let mapModeBeforeLock = false;
let cloud;
let cloudReady;
let cloudUserId;

initializeLanguage();
try { auth = configuredAuth(location.origin); } catch { auth = null; }
try { channel = new BroadcastChannel("cycle-account-session"); } catch { /* Focus checks still work. */ }

function concealApp() {
  if (!app.classList.contains("hidden")) mapModeBeforeLock = document.body.classList.contains("mobile-map-active");
  app.classList.add("hidden");
  app.inert = true;
  document.body.classList.add("auth-locked");
  document.body.classList.remove("mobile-map-active");
}

function show(modeName, message = "", error = false) {
  mode = modeName;
  concealApp();
  root.classList.remove("hidden");
  renderAuthView(root, {
    mode, email: rememberedEmail, message, error,
    onMode: (next, email) => {
      if (email !== undefined) rememberedEmail = email.trim();
      if (activeUserId) { location.replace("/"); return; }
      history.replaceState(null, "", `/#/${next}`);
      show(next);
    },
    onRetry: () => signingOut ? signOut() : checkSession(),
    onSubmit: submit,
  });
}

function restartSession() {
  // A full reload discards the previous account's store, drafts and event handlers.
  concealApp();
  cloud?.stop();
  location.replace("/");
}

async function enter(session, epoch = sessionEpoch) {
  if (signingOut || epoch !== sessionEpoch) return;
  const user = verifiedUser(session);
  if (!user) {
    if (activeUserId) { restartSession(); return; }
    if (session?.user && !session.user.emailVerified) {
      rememberedEmail = session.user.email || "";
      // Keep unverified sessions out of the tracker and allow another account to sign in.
      await auth.signOut();
      show("verify-email");
    } else {
      const requested = location.hash.replace(/^#\//, "");
      show(["sign-up", "forgot-password", "verify-email", "resend-code"].includes(requested) ? requested : "sign-in");
    }
    return;
  }
  if (activeUserId && activeUserId !== user.id) { restartSession(); return; }
  if (!activeUserId) {
    useAccountStorage(user.id);
    if (cloudUserId && cloudUserId !== user.id) { restartSession(); return; }
    if (!cloudReady) {
      cloudUserId = user.id;
      cloud = new CloudStorageAdapter({ userId: user.id, request: createCloudTransport(auth) });
      setupCloudStatus(cloud);
      cloudReady = cloud.initialize().catch(error => { cloudReady = null; throw error; });
    }
    await cloudReady;
    if (signingOut || epoch !== sessionEpoch) return;
    configurePersistence(() => cloud);
    // The store is constructed only after selecting the verified account's namespace.
    const { startApplication } = await import("./app.js");
    if (signingOut || epoch !== sessionEpoch) return;
    activeUserId = user.id;
    app.classList.remove("hidden");
    app.inert = false;
    document.body.classList.remove("auth-locked");
    startApplication();
    mapModeBeforeLock = document.body.classList.contains("mobile-map-active");
    document.getElementById("accountEmail").textContent = user.email || "";
    document.getElementById("signOutBtn").onclick = signOut;
  }
  clearTimeout(expiryTimer);
  const untilExpiry = new Date(session.session.expiresAt).getTime() - Date.now();
  expiryTimer = setTimeout(() => { concealApp(); void checkSession(); }, Math.min(untilExpiry, 2147483647));
  root.classList.add("hidden");
  document.body.classList.remove("auth-locked");
  document.body.classList.toggle("mobile-map-active", mapModeBeforeLock);
  app.inert = false;
  app.classList.remove("hidden");
}

async function checkSession() {
  if (!auth || pendingCheck || signingOut) return;
  pendingCheck = true;
  const epoch = sessionEpoch;
  try { await enter(await auth.session(), epoch); }
  catch { if (!signingOut && epoch === sessionEpoch) show("error"); }
  finally { pendingCheck = false; }
}

async function signOut() {
  signingOut = true;
  sessionEpoch++;
  clearTimeout(expiryTimer);
  show("loading");
  try {
    await cloud?.flush();
    cloud?.stop();
    await auth.signOut();
    channel?.postMessage("changed");
    restartSession();
  } catch { show("error"); }
}

async function submit(action, values) {
  rememberedEmail = values.email?.trim() || rememberedEmail;
  try {
    if (action === "sign-in") {
      await auth.signIn({ email: rememberedEmail, password: values.password });
      channel?.postMessage("changed");
      await enter(await auth.session());
    } else if (action === "sign-up") {
      await auth.signUp({ name: values.name.trim(), email: rememberedEmail, password: values.password });
      const session = await auth.session();
      if (verifiedUser(session)) await enter(session);
      else {
        if (session?.user) await auth.signOut();
        history.replaceState(null, "", "/#/verify-email");
        show("verify-email", "Enter the verification code from your email.");
      }
    } else if (action === "forgot-password") {
      await auth.requestReset(rememberedEmail);
      show("forgot-password", "If an account exists for this email, a reset link will arrive shortly.");
    } else if (action === "reset-password") {
      if (!resetToken) { show("forgot-password", "This link is invalid or expired. Request a new one.", true); return; }
      await auth.resetPassword(resetToken, values.password);
      resetToken = "";
      history.replaceState(null, "", "/#/sign-in");
      show("sign-in", "Your password has been updated. Sign in with your new password.");
    } else if (action === "verify-email") {
      await auth.verifyEmailCode(rememberedEmail, values.otp.trim());
      history.replaceState(null, "", "/#/sign-in");
      // Verification may or may not create a session. Only a checked session opens the app.
      const session = await auth.session();
      if (verifiedUser(session)) {
        channel?.postMessage("changed");
        await enter(session);
      } else show("sign-in", "Your email is verified. Sign in with your password.");
    } else if (action === "resend-code") {
      await auth.requestVerificationCode(rememberedEmail);
      history.replaceState(null, "", "/#/verify-email");
      show("verify-email", "If verification is needed, a new code will arrive in your email shortly.");
    }
  } catch (error) {
    if (isEmailUnverified(error)) history.replaceState(null, "", "/#/verify-email");
    show(isEmailUnverified(error) ? "verify-email" : action, authErrorMessage(error), true);
  }
}

// Recheck on return and across tabs. Never store session tokens or passwords locally.
channel?.addEventListener("message", () => {
  if (activeUserId) restartSession();
  else if (!["reset-password", "sign-up", "forgot-password"].includes(mode)) void checkSession();
});
document.addEventListener("visibilitychange", () => {
  if (activeUserId && document.visibilityState === "hidden") concealApp();
  else if (activeUserId && document.visibilityState === "visible") void checkSession();
});
window.addEventListener("pageshow", event => { if (event.persisted) restartSession(); });
window.addEventListener("pagehide", () => { concealApp(); cloud?.stop(); });
window.addEventListener("beforeunload", event => {
  if (cloud?.hasPending() && !signingOut) { event.preventDefault(); event.returnValue = ""; }
});
window.addEventListener("online", () => { if (activeUserId && !signingOut) void cloud?.check(); });
setInterval(() => {
  if (activeUserId && !signingOut && document.visibilityState === "visible") void cloud?.check();
}, 45000);
setInterval(() => { if (activeUserId && document.visibilityState === "visible") void checkSession(); }, 60000);

if (!auth) show("configuration");
else if (callback.reset) {
  // Retain the token only in memory, keeping it out of URLs and referrers afterwards.
  history.replaceState(null, "", "/#/reset-password");
  show(resetToken && !callback.error ? "reset-password" : "forgot-password",
    resetToken && !callback.error ? "" : "This link is invalid or expired. Request a new one.", callback.error || !resetToken);
} else if (callback.error) {
  history.replaceState(null, "", "/#/sign-in");
  show("sign-in", "This link is invalid or expired. Request a new one.", true);
} else {
  show("loading");
  void checkSession();
}
