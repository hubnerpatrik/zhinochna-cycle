import { LocalStorageAdapter } from "./local-storage-adapter.js";
import { normalizeApplicationData } from "../data-validation.js";

const blank = () => normalizeApplicationData({ profile: { setupCompleted: false }, maps: {}, activeMapId: null }, { strict: true });
const copy = value => JSON.parse(JSON.stringify(value));

export function createCloudTransport(auth, fetcher = fetch) {
  return async (method, body) => {
    const token = await auth.token();
    const response = await fetcher("/api/state", {
      method, cache: "no-store", credentials: "omit", signal: AbortSignal.timeout(20000),
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
    this.raw = storage.getItem(this.key);
    this.envelope = this.raw ? JSON.parse(this.raw) : null;
    if (this.envelope) {
      if (!Number.isSafeInteger(this.envelope.version) || this.envelope.version < 0) throw new Error("Invalid local cloud state");
      normalizeApplicationData(this.envelope.data, { strict: true });
    }
    this.stopped = false;
    this.blocked = false;
    this.running = null;
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
          data: remote.data ? normalizeApplicationData(remote.data, { strict: true }) : blank() });
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
    this.commit({ ...this.envelope, data: copy(data), dirty: true });
    this.status("pending");
    clearTimeout(this.timer);
    this.timer = this.schedule(() => { void this.flush(); }, 600);
  }

  clear() { this.saveState(blank()); }
  hasPending() { return Boolean(this.envelope?.dirty || this.envelope?.pending); }
  snapshot() { return copy(this.envelope.data); }

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
            version: this.envelope.version, mutationId: crypto.randomUUID(), data: copy(this.envelope.data),
          } });
        }
        const sent = this.envelope.pending;
        this.status("saving");
        const ack = await this.request("PUT", sent);
        if (this.stopped) return;
        if (ack.mutationId !== sent.mutationId || ack.version !== sent.version + 1) throw new Error("Invalid acknowledgement");
        this.commit({ ...this.envelope, version: ack.version, pending: null,
          dirty: JSON.stringify(this.envelope.data) !== JSON.stringify(sent.data) });
      }
      if (!this.stopped && !this.blocked) this.status("saved");
    } catch (error) {
      if (error.status === 409) { this.blocked = true; this.status("conflict"); }
      else if (!this.stopped && !this.blocked) {
        if (error.status === 413) {
          // A rejected oversized request was not committed. Let a smaller edit
          // replace it; ambiguous network failures must retain the original ID.
          try { this.commit({ ...this.envelope, pending: null, dirty: true }); }
          catch { if (!this.blocked) this.status("error"); return; }
        }
        this.status(error.status === 413 ? "too-large" : "error");
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
    this.storage.setItem(`${this.key}:recovery:${crypto.randomUUID()}`, this.raw);
    this.commit({ version: remote.version, dirty: false, pending: null,
      data: remote.data ? normalizeApplicationData(remote.data, { strict: true }) : blank() });
  }

  stop() { this.stopped = true; clearTimeout(this.timer); }
}
