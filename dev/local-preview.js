import { configurePersistence, LocalStorageAdapter } from "../storage/local-storage-adapter.js";

export const DEVELOPMENT_NAMESPACE = "cycle-development:";

export async function startLocalPreview({ app, root }) {
  // Select isolated local persistence before the application constructs its store.
  configurePersistence(() => new LocalStorageAdapter(globalThis.localStorage, DEVELOPMENT_NAMESPACE));
  const { startApplication } = await import("../app.js");
  document.getElementById("accountEmail").textContent = "Local development · data saved in this browser";
  document.getElementById("signOutBtn").remove();
  document.getElementById("cloudStatusPanel").remove();
  root.classList.add("hidden");
  app.classList.remove("hidden");
  app.inert = false;
  document.body.classList.remove("auth-locked");
  startApplication();
}
