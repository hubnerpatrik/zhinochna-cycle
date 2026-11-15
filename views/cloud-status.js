import { downloadFile } from '../browser-download.js';
import { setText, translateDOM } from "../i18n.js";
import { serializeBackup, backupFilename } from "../backup.js";

const BACKUP_URL_LIFETIME_MS = 1000;
const STATUS_MESSAGES = {
  loading: "Loading your cloud maps…",
  saved: "Saved to your account",
  saving: "Saving to your account…",
  pending: "Changes saved on this device. Waiting to sync…",
  error: "Cloud sync failed. Your changes remain on this device. Retry when connected.",
  conflict: "Maps changed on another device. Download your local backup, then load the cloud version.",
  "local-conflict": "Maps changed in another tab. Download your local backup, then reload.",
  "too-large": "Your maps exceed the cloud storage limit. Download a backup and reduce their size.",
  invalid: "Your account did not accept these maps. Download a backup and report the problem.",
};
const WARNING_STATES = ["error", "conflict", "local-conflict", "too-large", "invalid"];
const RETRY_STATES = ["error", "pending", "too-large", "invalid"];

export function setupCloudStatus(cloud) {
  const panel = document.getElementById("cloudStatusPanel");
  const message = panel.querySelector("[data-cloud-message]");
  const retry = panel.querySelector("[data-cloud-retry]");
  const reload = panel.querySelector("[data-cloud-reload]");
  const backup = panel.querySelector("[data-cloud-backup]");
  const download = () => {
    downloadFile(serializeBackup(cloud.snapshot()), 'application/json', backupFilename(), {
      urlLifetimeMs: BACKUP_URL_LIFETIME_MS,
      attachToDocument: false,
    });
  };
  const render = state => {
    setText(message, STATUS_MESSAGES[state] || STATUS_MESSAGES.error);
    panel.dataset.warning = WARNING_STATES.includes(state);
    retry.hidden = !RETRY_STATES.includes(state);
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
    } catch { setText(message, STATUS_MESSAGES.error); }
    finally { reload.disabled = false; }
  };
}
