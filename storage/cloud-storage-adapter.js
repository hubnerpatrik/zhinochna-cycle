import { LocalStorageAdapter } from "./local-storage-adapter.js";
import { isPlainObject, normalizeApplicationData } from "../data-validation.js";

const REQUEST_TIMEOUT_MS = 20_000;
const SAVE_DEBOUNCE_MS = 600;
const HTTP_BAD_REQUEST = 400;
const HTTP_CONFLICT = 409;
const HTTP_PAYLOAD_TOO_LARGE = 413;

const createBlankState = () => normalizeApplicationData({ profile: { setupCompleted: false }, maps: {}, activeMapId: null }, { strict: true });
const cloneJsonData = value => JSON.parse(JSON.stringify(value));

export function createCloudTransport(auth, fetcher = fetch) {
  return async (method, body) => {
    const token = await auth.token();
    const response = await fetcher("/api/state", {
      // Protected previews also need the hosting provider's same-origin cookie.
      // The API still authenticates the account exclusively through the JWT.
      method, cache: "no-store", credentials: "same-origin", signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) throw Object.assign(new Error("Cloud request failed"), { status: response.status });
    const result = await response.json();
    if (!Number.isSafeInteger(result.version) || result.version < 0) throw new Error("Invalid cloud response");
    return result;
  };
}

// One atomic local envelope contains both the latest data and an unacknowledged
// request. Reload/retry reuses its mutation ID, including after a lost response.
export class CloudStorageAdapter {
  constructor({ userId, storage = globalThis.localStorage, request, onStatus = () => {},
    schedule = (callback, delay) => globalThis.setTimeout(callback, delay) }) {
    this.storage = storage;
    this.key = `cycle-account:${encodeURIComponent(userId)}:cloud-v1`;
    this.legacy = new LocalStorageAdapter(storage, `cycle-account:${encodeURIComponent(userId)}:`);
    this.request = request;
    this.onStatus = onStatus;
    this.schedule = schedule;
    this.recoveryKey = `${this.key}:recovery`;
    this.removeLegacyRecoveryCopies();
    this.raw = storage.getItem(this.key);
    this.envelope = this.raw ? this.readEnvelope(this.raw) : null;
    this.stopped = false;
    this.blocked = false;
    this.running = null;
  }

  // A cached envelope that no longer validates must never keep the account
  // from opening: keep the original as the recovery copy, salvage what still
  // validates as an unsynced edit, or fall back to the cloud version.
  readEnvelope(raw) {
    let envelope = null;
    try { envelope = JSON.parse(raw); } catch { /* Unreadable cache. */ }
    if (!isPlainObject(envelope) || !Number.isSafeInteger(envelope.version) || envelope.version < 0) {
      this.retainRecoveryCopy(raw);
      return null;
    }
    try {
      normalizeApplicationData(envelope.data, { strict: true });
      return envelope;
    } catch {
      this.retainRecoveryCopy(raw);
      try {
        const data = normalizeApplicationData(envelope.data);
        normalizeApplicationData(data, { strict: true });
        return { version: envelope.version, dirty: true, pending: null, data };
      } catch { return null; }
    }
  }

  // Older versions kept one recovery copy per conflict under random keys; each
  // can be as large as the account state, so they could fill browser storage.
  removeLegacyRecoveryCopies() {
    const legacyPrefix = `${this.recoveryKey}:`;
    const legacyKeys = [];
    for (let index = 0; index < (this.storage.length ?? 0); index++) {
      const key = this.storage.key(index);
      if (key?.startsWith(legacyPrefix)) legacyKeys.push(key);
    }
    legacyKeys.forEach(key => this.storage.removeItem(key));
  }

  // Only the latest recovery copy is kept.
  retainRecoveryCopy(raw) {
    this.removeLegacyRecoveryCopies();
    try { this.storage.setItem(this.recoveryKey, raw); }
    catch { /* The user is offered a backup download before data is replaced. */ }
  }

  status(value) { this.statusValue = value; this.onStatus(value); }

  commit(envelope) {
    if (this.storage.getItem(this.key) !== this.raw) {
      this.blocked = true;
      this.status("local-conflict");
      throw new Error("Maps changed in another tab. Reload before editing.");
    }
    const raw = JSON.stringify(envelope);
    this.storage.setItem(this.key, raw);
    this.raw = raw;
    this.envelope = envelope;
  }

  async initialize() {
    this.status("loading");
    if (!this.envelope) {
      const profile = this.legacy.read("profile");
      const maps = this.legacy.read("maps");
      if (profile || maps) {
        this.commit({ version: 0, dirty: true, pending: null, data: normalizeApplicationData({
          profile: profile ? JSON.parse(profile) : { setupCompleted: false },
          maps: maps ? JSON.parse(maps) : {}, activeMapId: this.legacy.read("activeMapId"),
        }, { strict: true }) });
      }
    }
    try {
      const remote = await this.request("GET");
      if (this.envelope?.dirty || this.envelope?.pending) await this.flush();
      else {
        if (this.envelope && remote.version < this.envelope.version) { this.blocked = true; this.status("conflict"); return; }
        this.commit({ version: remote.version, dirty: false, pending: null,
          data: remote.data ? normalizeApplicationData(remote.data, { strict: true }) : createBlankState() });
        this.status("saved");
      }
    } catch (error) {
      if (!this.envelope) throw error;
      if (!this.blocked) this.status("error");
    }
  }

  read(key) {
    if (key === "activeMapId") return this.envelope.data.activeMapId;
    if (["profile", "maps"].includes(key)) return JSON.stringify(this.envelope.data[key]);
    return null;
  }

  remove() { /* Legacy migration keys are never used by this adapter. */ }

  saveState(data) {
    if (this.stopped || this.blocked) throw new Error("Reload cloud data before editing.");
    this.commit({ ...this.envelope, data: cloneJsonData(data), dirty: true });
    this.status("pending");
    clearTimeout(this.timer);
    this.timer = this.schedule(() => { void this.flush(); }, SAVE_DEBOUNCE_MS);
  }

  clear() { this.saveState(createBlankState()); }
  hasPending() { return Boolean(this.envelope?.dirty || this.envelope?.pending); }
  snapshot() { return cloneJsonData(this.envelope.data); }

  flush() {
    if (this.running) return this.running;
    this.running = this.drain().finally(() => { this.running = null; });
    return this.running;
  }

  async drain() {
    try {
      while (!this.stopped && !this.blocked && this.hasPending()) {
        if (!this.envelope.pending) {
          this.commit({ ...this.envelope, pending: {
            version: this.envelope.version, mutationId: crypto.randomUUID(), data: cloneJsonData(this.envelope.data),
          } });
        }
        const sent = this.envelope.pending;
        this.status("saving");
        const acknowledgement = await this.request("PUT", sent);
        if (this.stopped) return;
        if (acknowledgement.mutationId !== sent.mutationId || acknowledgement.version !== sent.version + 1) throw new Error("Invalid acknowledgement");
        this.commit({ ...this.envelope, version: acknowledgement.version, pending: null,
          dirty: JSON.stringify(this.envelope.data) !== JSON.stringify(sent.data) });
      }
      if (!this.stopped && !this.blocked) this.status("saved");
    } catch (error) {
      if (error.status === HTTP_CONFLICT) { this.blocked = true; this.status("conflict"); }
      else if (!this.stopped && !this.blocked) {
        const rejected = error.status === HTTP_PAYLOAD_TOO_LARGE || error.status === HTTP_BAD_REQUEST;
        if (rejected) {
          // A rejected request was not committed. Let a later edit replace it;
          // ambiguous network failures must retain the original ID.
          try { this.commit({ ...this.envelope, pending: null, dirty: true }); }
          catch { if (!this.blocked) this.status("error"); return; }
        }
        this.status(error.status === HTTP_PAYLOAD_TOO_LARGE ? "too-large"
          : error.status === HTTP_BAD_REQUEST ? "invalid" : "error");
      }
    }
  }

  async check() {
    if (this.stopped || this.blocked || this.running) return;
    if (this.hasPending()) { await this.flush(); return; }
    try {
      const remote = await this.request("GET");
      if (this.stopped || this.hasPending() || this.running) return;
      if (remote.version !== this.envelope.version) { this.blocked = true; this.status("conflict"); }
      else this.status("saved");
    } catch { if (!this.stopped && !this.blocked) this.status("error"); }
  }

  async loadCloud() {
    if (this.running) await this.running;
    // A second tab may have queued newer local changes. Reload it without erasing them.
    if (this.storage.getItem(this.key) !== this.raw) return;
    const remote = await this.request("GET");
    // Retain a recovery copy before the explicit switch to the cloud version.
    this.retainRecoveryCopy(this.raw);
    this.commit({ version: remote.version, dirty: false, pending: null,
      data: remote.data ? normalizeApplicationData(remote.data, { strict: true }) : createBlankState() });
  }

  stop() { this.stopped = true; clearTimeout(this.timer); }
}
