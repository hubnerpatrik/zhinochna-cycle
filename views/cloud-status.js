import { setText, translateDOM } from "../i18n.js";
import { serializeBackup, backupFilename } from "../backup.js";

const messages = {
  loading: "Loading your cloud maps…",
  saved: "Saved to your account",
  saving: "Saving to your account…",
  pending: "Changes saved on this device. Waiting to sync…",
  error: "Cloud sync failed. Your changes remain on this device. Retry when connected.",
  conflict: "Maps changed on another device. Download your local backup, then load the cloud version.",
  "local-conflict": "Maps changed in another tab. Download your local backup, then reload.",
  "too-large": "Your maps exceed the cloud storage limit. Download a backup and reduce their size.",
};

export function setupCloudStatus(cloud) {
  const panel = document.getElementById("cloudStatusPanel");
  const message = panel.querySelector("[data-cloud-message]");
  const retry = panel.querySelector("[data-cloud-retry]");
  const reload = panel.querySelector("[data-cloud-reload]");
  const backup = panel.querySelector("[data-cloud-backup]");
  const download = () => {
    const url = URL.createObjectURL(new Blob([serializeBackup(cloud.snapshot())], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = backupFilename();
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const render = state => {
    setText(message, messages[state] || messages.error);
    panel.dataset.warning = ["error", "conflict", "local-conflict", "too-large"].includes(state);
    retry.hidden = !["error", "pending", "too-large"].includes(state);
    reload.hidden = !["conflict", "local-conflict"].includes(state);
    backup.hidden = panel.dataset.warning !== "true";
  };
  cloud.onStatus = render;
  render(cloud.statusValue || "loading");
  translateDOM(panel);
  backup.onclick = download;
  retry.onclick = () => { void cloud.check(); };
  reload.onclick = async () => {
    reload.disabled = true;
    try {
      download();
      await cloud.loadCloud();
      location.reload();
    } catch { setText(message, messages.error); }
    finally { reload.disabled = false; }
  };
}
