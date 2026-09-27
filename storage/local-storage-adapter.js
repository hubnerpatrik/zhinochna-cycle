export const LEGACY_STORAGE_KEY = "cycleData";
export const PROFILE_STORAGE_KEY = "profile";
export const MAPS_STORAGE_KEY = "maps";
export const ACTIVE_MAP_ID_STORAGE_KEY = "activeMapId";

const CURRENT_KEYS = [PROFILE_STORAGE_KEY, MAPS_STORAGE_KEY, ACTIVE_MAP_ID_STORAGE_KEY];
let defaultNamespace = "";
let persistenceFactory;

export function configurePersistence(factory) { persistenceFactory = factory; }
export function createPersistence() { return persistenceFactory ? persistenceFactory() : new LocalStorageAdapter(); }

// Set once, after a verified session and before importing the application store.
export function useAccountStorage(userId) {
  if (typeof userId !== "string" || !userId.trim()) throw new Error("An account is required.");
  defaultNamespace = `cycle-account:${encodeURIComponent(userId)}:`;
}

export class LocalStorageAdapter {
  constructor(storage = globalThis.localStorage, namespace = defaultNamespace) {
    if (!storage) throw new Error("Browser storage is unavailable.");
    this.storage = storage;
    this.namespace = namespace;
  }

  read(key) {
    return this.storage.getItem(this.namespace + key);
  }

  remove(key) {
    this.storage.removeItem(this.namespace + key);
  }

  saveState({ profile, maps, activeMapId }) {
    const previous = Object.fromEntries(CURRENT_KEYS.map(key => [key, this.read(key)]));

    try {
      this.storage.setItem(this.namespace + PROFILE_STORAGE_KEY, JSON.stringify(profile));
      this.storage.setItem(this.namespace + MAPS_STORAGE_KEY, JSON.stringify(maps));
      if (activeMapId) this.storage.setItem(this.namespace + ACTIVE_MAP_ID_STORAGE_KEY, activeMapId);
      else this.remove(ACTIVE_MAP_ID_STORAGE_KEY);
    } catch (error) {
      this._restore(previous);
      throw new Error("Application data could not be saved.", { cause: error });
    }
  }

  clear() {
    [...CURRENT_KEYS, LEGACY_STORAGE_KEY].forEach(key => this.remove(key));
  }

  _restore(values) {
    Object.entries(values).forEach(([key, value]) => {
      try {
        if (value === null) this.remove(key);
        else this.storage.setItem(this.namespace + key, value);
      } catch {
        // Best-effort rollback if the storage provider itself is failing.
      }
    });
  }
}
